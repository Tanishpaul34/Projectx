const { fetchNewReviews, postReplyToReview } = require('../src/services/gbpService');
const { analyzeReviewAndDraftResponse } = require('../src/services/aiService');

let mockSelect, mockEq, mockSingle, mockInsert, mockFrom;

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => ({
      from: (table) => {
        if (!mockFrom) return {};
        return mockFrom(table);
      }
    }))
  };
});

jest.mock('../src/services/gbpService', () => ({
  fetchNewReviews: jest.fn(),
  postReplyToReview: jest.fn()
}));

jest.mock('../src/services/aiService', () => ({
  analyzeReviewAndDraftResponse: jest.fn()
}));

const { processReviews } = require('../src/worker');

describe('Worker - processReviews', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup console mocks to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockSingle = jest.fn();
    mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn();

    mockFrom = jest.fn((table) => {
      if (table === 'profiles') {
        return { select: mockSelect };
      }
      if (table === 'reviews') {
        return { select: mockSelect, insert: mockInsert };
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return early when profiles fetch returns an error', async () => {
    mockSelect.mockResolvedValueOnce({ error: new Error('Database error') });

    await processReviews();

    expect(console.error).toHaveBeenCalledWith('Error fetching profiles:', expect.any(Error));
    expect(fetchNewReviews).not.toHaveBeenCalled();
  });

  it('should return early when no profiles are found', async () => {
    mockSelect.mockResolvedValueOnce({ data: [] });

    await processReviews();

    expect(console.log).toHaveBeenCalledWith('No profiles found to process reviews for.');
    expect(fetchNewReviews).not.toHaveBeenCalled();
  });

  it('should skip a review when it already exists in the database', async () => {
    const profiles = [{ id: 'user1', brand_voice: 'friendly', approval_mode: 'Manual' }];
    mockSelect.mockResolvedValueOnce({ data: profiles }); // For profiles

    fetchNewReviews.mockResolvedValueOnce([
      { google_review_id: 'rev1', review_text: 'Great!' }
    ]);

    mockSingle.mockResolvedValueOnce({ data: { id: 'existing_id' } }); // For reviews

    await processReviews();

    expect(console.log).toHaveBeenCalledWith('Review rev1 already exists. Skipping.');
    expect(analyzeReviewAndDraftResponse).not.toHaveBeenCalled();
  });

  it('should process a new review for a profile with approval_mode not "Fully Autonomous" (Pending)', async () => {
    const profiles = [{ id: 'user1', brand_voice: 'friendly', approval_mode: 'Manual' }];
    mockSelect.mockResolvedValueOnce({ data: profiles }); // For profiles

    const review = { google_review_id: 'rev2', review_text: 'Nice!', reviewer_name: 'John', rating: 5 };
    fetchNewReviews.mockResolvedValueOnce([review]);

    mockSingle.mockResolvedValueOnce({ data: null }); // Review doesn't exist

    const analysis = {
      sentiment: 'Positive',
      sentiment_score: 0.9,
      key_topics: ['service'],
      urgency: 'Low',
      drafted_response: 'Thanks!'
    };
    analyzeReviewAndDraftResponse.mockResolvedValueOnce(analysis);

    mockInsert.mockResolvedValueOnce({ error: null });

    await processReviews();

    expect(analyzeReviewAndDraftResponse).toHaveBeenCalledWith('Nice!', 'friendly');
    expect(postReplyToReview).not.toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user1',
      google_review_id: 'rev2',
      review_text: 'Nice!',
      reviewer_name: 'John',
      rating: 5,
      sentiment: 'Positive',
      sentiment_score: 0.9,
      key_topics: ['service'],
      urgency: 'Low',
      ai_suggested_response: 'Thanks!',
      status: 'Pending'
    });
    expect(console.log).toHaveBeenCalledWith('Successfully saved and processed review rev2. Status: Pending');
  });

  it('should process a new review for a profile with "Fully Autonomous" and posting succeeds (Posted)', async () => {
    const profiles = [{ id: 'user1', brand_voice: 'friendly', approval_mode: 'Fully Autonomous' }];
    mockSelect.mockResolvedValueOnce({ data: profiles }); // For profiles

    const review = { google_review_id: 'rev3', review_text: 'Awesome!', reviewer_name: 'Jane', rating: 5 };
    fetchNewReviews.mockResolvedValueOnce([review]);

    mockSingle.mockResolvedValueOnce({ data: null }); // Review doesn't exist

    const analysis = { drafted_response: 'Thank you very much!' };
    analyzeReviewAndDraftResponse.mockResolvedValueOnce(analysis);

    postReplyToReview.mockResolvedValueOnce({ success: true });
    mockInsert.mockResolvedValueOnce({ error: null });

    await processReviews();

    expect(postReplyToReview).toHaveBeenCalledWith('rev3', 'Thank you very much!');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'Posted'
    }));
    expect(console.log).toHaveBeenCalledWith('Successfully saved and processed review rev3. Status: Posted');
  });

  it('should process a new review for a profile with "Fully Autonomous" and posting fails (Pending)', async () => {
    const profiles = [{ id: 'user1', brand_voice: 'friendly', approval_mode: 'Fully Autonomous' }];
    mockSelect.mockResolvedValueOnce({ data: profiles }); // For profiles

    const review = { google_review_id: 'rev4', review_text: 'Okay', reviewer_name: 'Bob', rating: 3 };
    fetchNewReviews.mockResolvedValueOnce([review]);

    mockSingle.mockResolvedValueOnce({ data: null }); // Review doesn't exist

    analyzeReviewAndDraftResponse.mockResolvedValueOnce({ drafted_response: 'Thanks.' });

    postReplyToReview.mockResolvedValueOnce({ success: false }); // Fails
    mockInsert.mockResolvedValueOnce({ error: null });

    await processReviews();

    expect(postReplyToReview).toHaveBeenCalledWith('rev4', 'Thanks.');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'Pending'
    }));
  });

  it('should handle errors during the review insertion', async () => {
    const profiles = [{ id: 'user1', brand_voice: 'friendly', approval_mode: 'Manual' }];
    mockSelect.mockResolvedValueOnce({ data: profiles }); // For profiles

    const review = { google_review_id: 'rev5', review_text: 'Bad', reviewer_name: 'Alice', rating: 1 };
    fetchNewReviews.mockResolvedValueOnce([review]);

    mockSingle.mockResolvedValueOnce({ data: null }); // Review doesn't exist
    analyzeReviewAndDraftResponse.mockResolvedValueOnce({});

    const insertError = new Error('Insert failed');
    mockInsert.mockResolvedValueOnce({ error: insertError });

    await processReviews();

    expect(console.error).toHaveBeenCalledWith('Error saving review rev5:', insertError);
  });

  it('should catch general exceptions in the main try-catch block', async () => {
    const testError = new Error('Unexpected exception');
    mockSelect.mockRejectedValueOnce(testError); // Make it throw

    await processReviews();

    expect(console.error).toHaveBeenCalledWith('Error in review processing job:', testError);
  });
});

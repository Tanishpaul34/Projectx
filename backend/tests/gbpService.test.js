const { fetchNewReviews, postReplyToReview } = require('../src/services/gbpService');

describe('GBP Service', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('fetchNewReviews', () => {
    it('should fetch and return mock reviews', async () => {
      // Create a promise for the function call
      const fetchPromise = fetchNewReviews();

      // Fast-forward timers by 1000ms to skip the delay
      jest.advanceTimersByTime(1000);

      const reviews = await fetchPromise;

      expect(reviews).toBeDefined();
      expect(Array.isArray(reviews)).toBe(true);
      expect(reviews.length).toBe(2);

      // Verify the structure of the first review
      expect(reviews[0]).toHaveProperty('google_review_id');
      expect(reviews[0]).toHaveProperty('reviewer_name', 'Alex Johnson');
      expect(reviews[0]).toHaveProperty('rating', 5);
      expect(reviews[0]).toHaveProperty('review_text', 'Absolutely fantastic service! The neon signs they installed look amazing in our shop.');
      expect(reviews[0]).toHaveProperty('created_at');

      // Verify the structure of the second review
      expect(reviews[1]).toHaveProperty('google_review_id');
      expect(reviews[1]).toHaveProperty('reviewer_name', 'Sam Smith');
      expect(reviews[1]).toHaveProperty('rating', 2);
      expect(reviews[1]).toHaveProperty('review_text', 'Took way too long to get a response. Product is okay but customer service needs work.');
      expect(reviews[1]).toHaveProperty('created_at');

      // Verify google_review_id starts with mock_gbp_
      expect(reviews[0].google_review_id).toMatch(/^mock_gbp_\d+_1$/);
      expect(reviews[1].google_review_id).toMatch(/^mock_gbp_\d+_2$/);
    });
  });

  describe('postReplyToReview', () => {
    it('should successfully post a reply to a review', async () => {
      const mockReviewId = 'mock_gbp_12345_1';
      const mockReplyText = 'Thank you for the review!';

      const postPromise = postReplyToReview(mockReviewId, mockReplyText);

      // Fast-forward timers by 500ms to skip the delay
      jest.advanceTimersByTime(500);

      const result = await postPromise;

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('posted_at');
    });
  });
});

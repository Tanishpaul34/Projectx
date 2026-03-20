const { fetchNewReviews, postReplyToReview } = require('../src/services/gbpService');
const { analyzeReviewAndDraftResponse } = require('../src/services/aiService');

// Define mock functions outside but start with "mock" to bypass Jest's restriction
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockSingle = jest.fn().mockReturnThis();
const mockInsert = jest.fn().mockReturnThis();

const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  insert: mockInsert
});

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => ({
      from: mockFrom
    }))
  };
});
jest.mock('../src/services/gbpService');
jest.mock('../src/services/aiService');

const { processReviews } = require('../src/worker');

describe('Worker - processReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log an error and return early if fetching profiles fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Database connection failed');

    // Setup the mock to return an error when fetching profiles
    mockSelect.mockResolvedValueOnce({
      data: null,
      error: mockError
    });

    await processReviews();

    // Verify it attempted to fetch profiles
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockSelect).toHaveBeenCalledWith('id, brand_voice, approval_mode');

    // Verify it logged the error
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching profiles:', mockError);

    // Verify it returned early (did not call fetchNewReviews)
    expect(fetchNewReviews).not.toHaveBeenCalled();
  });
});

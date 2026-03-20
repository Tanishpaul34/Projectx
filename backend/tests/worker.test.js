const { processReviews } = require('../src/worker');
const { createClient } = require('@supabase/supabase-js');
const { fetchNewReviews } = require('../src/services/gbpService');

jest.mock('@supabase/supabase-js', () => {
  const mSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn(),
  };
  return {
    createClient: jest.fn(() => mSupabase),
  };
});

jest.mock('../src/services/gbpService', () => ({
  fetchNewReviews: jest.fn(),
  postReplyToReview: jest.fn(),
}));

jest.mock('../src/services/aiService', () => ({
  analyzeReviewAndDraftResponse: jest.fn(),
}));

describe('worker processReviews', () => {
  let consoleLogSpy;
  let supabase;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    supabase = createClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should return early if no profiles are found (empty array)', async () => {
    supabase.select.mockResolvedValueOnce({ data: [], error: null });

    await processReviews();

    expect(consoleLogSpy).toHaveBeenCalledWith('No profiles found to process reviews for.');
    expect(fetchNewReviews).not.toHaveBeenCalled();
  });

  it('should return early if profiles is null', async () => {
    supabase.select.mockResolvedValueOnce({ data: null, error: null });

    await processReviews();

    expect(consoleLogSpy).toHaveBeenCalledWith('No profiles found to process reviews for.');
    expect(fetchNewReviews).not.toHaveBeenCalled();
  });
});

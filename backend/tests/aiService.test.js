const { GoogleGenerativeAI } = require('@google/generative-ai');

// Mock the module before requiring the service
jest.mock('@google/generative-ai');

describe('aiService', () => {
  let analyzeReviewAndDraftResponse;

  beforeAll(() => {
    // Set up the mocked class to return a mocked instance
    GoogleGenerativeAI.mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue(new Error('API failure'))
        })
      };
    });

    // Require the service AFTER the mock is set up
    analyzeReviewAndDraftResponse = require('../src/services/aiService').analyzeReviewAndDraftResponse;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return fallback data when Gemini API throws an error', async () => {
    // Spy on console.error to prevent it from cluttering the test output
    // and to verify it is called
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await analyzeReviewAndDraftResponse('This is a terrible place!');

    expect(result).toEqual({
      sentiment: "Neutral",
      sentiment_score: 50,
      key_topics: ["General"],
      urgency: "Medium",
      drafted_response: "Thank you for your feedback. We appreciate you taking the time to share your experience."
    });

    // Verify the error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error analyzing review with Gemini:", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});

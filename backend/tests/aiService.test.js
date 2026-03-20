jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn().mockReturnValue({
    generateContent: mockGenerateContent
  });
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel
    })),
    mockGenerateContent,
    mockGetGenerativeModel
  };
});

const { mockGenerateContent } = require('@google/generative-ai');
const { analyzeReviewAndDraftResponse } = require('../src/services/aiService');

describe('aiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Supress console.error in tests to keep output clean
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  const expectedParsedData = {
    sentiment: "Positive",
    sentiment_score: 90,
    key_topics: ["Customer Service"],
    urgency: "Low",
    drafted_response: "Thanks!"
  };

  const expectedFallback = {
    sentiment: "Neutral",
    sentiment_score: 50,
    key_topics: ["General"],
    urgency: "Medium",
    drafted_response: "Thank you for your feedback. We appreciate you taking the time to share your experience."
  };

  const mockResponse = (text) => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => text
      }
    });
  };

  it('should return parsed JSON successfully from raw JSON string', async () => {
    mockResponse(JSON.stringify(expectedParsedData));

    const result = await analyzeReviewAndDraftResponse('Great service!');
    expect(result).toEqual(expectedParsedData);
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('should parse JSON successfully from ```json markdown blocks', async () => {
    const text = `\`\`\`json
${JSON.stringify(expectedParsedData)}
\`\`\``;
    mockResponse(text);

    const result = await analyzeReviewAndDraftResponse('Great service!');
    expect(result).toEqual(expectedParsedData);
  });

  it('should parse JSON successfully from generic ``` markdown blocks', async () => {
    const text = `\`\`\`
${JSON.stringify(expectedParsedData)}
\`\`\``;
    mockResponse(text);

    const result = await analyzeReviewAndDraftResponse('Great service!');
    expect(result).toEqual(expectedParsedData);
  });

  it('should return fallback data if generateContent throws an error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Error'));

    const result = await analyzeReviewAndDraftResponse('Great service!');
    expect(result).toEqual(expectedFallback);
  });

  it('should return fallback data if JSON.parse fails', async () => {
    mockResponse('invalid json string');

    const result = await analyzeReviewAndDraftResponse('Great service!');
    expect(result).toEqual(expectedFallback);
  });
});

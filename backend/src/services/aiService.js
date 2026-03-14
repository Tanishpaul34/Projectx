const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analyzeReviewAndDraftResponse = async (reviewText, brandVoice = 'Professional') => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are the AI manager for a business. A customer left this review: "${reviewText}".
      Analyze the review and provide a JSON response with the following keys:
      - sentiment: The sentiment of the review (Strictly either "Positive", "Negative", or "Neutral").
      - sentiment_score: A number from 0 to 100 representing how positive the review is (0 is extremely negative, 100 is extremely positive).
      - key_topics: An array of key topics mentioned in the review (e.g., ["Customer Service", "Pricing"]).
      - urgency: The urgency of replying to this review (Strictly either "High", "Medium", or "Low"). High urgency is usually for very negative reviews or reviews demanding immediate attention.

      Then, write a professional, empathetic response in a "${brandVoice}" tone.
      If the review is negative, apologize and offer to move the conversation to email or phone.
      Add the drafted response to the JSON under the key "drafted_response".

      Respond ONLY with valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Attempt to extract JSON if the model added markdown blocks
    let jsonStr = responseText;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }

    const parsedData = JSON.parse(jsonStr);
    return parsedData;
  } catch (error) {
    console.error("Error analyzing review with Gemini:", error);
    // Fallback data in case of error
    return {
      sentiment: "Neutral",
      sentiment_score: 50,
      key_topics: ["General"],
      urgency: "Medium",
      drafted_response: "Thank you for your feedback. We appreciate you taking the time to share your experience."
    };
  }
};

module.exports = {
  analyzeReviewAndDraftResponse
};

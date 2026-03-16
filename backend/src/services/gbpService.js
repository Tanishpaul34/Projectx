// Mock Fetcher for Google Business Profile Reviews
const fetchNewReviews = async () => {
  console.log("Mocking GBP review fetch...");
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulated incoming review payload
  const mockReviews = [
    {
      google_review_id: `mock_gbp_${Date.now()}_1`,
      reviewer_name: "Alex Johnson",
      rating: 5,
      review_text: "Absolutely fantastic service! The neon signs they installed look amazing in our shop.",
      created_at: new Date().toISOString()
    },
    {
      google_review_id: `mock_gbp_${Date.now()}_2`,
      reviewer_name: "Sam Smith",
      rating: 2,
      review_text: "Took way too long to get a response. Product is okay but customer service needs work.",
      created_at: new Date().toISOString()
    }
  ];

  return mockReviews;
};

// Mock poster for Google Business Profile Reply
const postReplyToReview = async (googleReviewId, replyText) => {
  console.log(`Mocking posting reply to GBP for review ${googleReviewId}...`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`Reply posted: "${replyText}"`);
  return { success: true, posted_at: new Date().toISOString() };
};

module.exports = {
  fetchNewReviews,
  postReplyToReview
};

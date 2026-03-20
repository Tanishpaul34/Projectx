const { fetchNewReviews, postReplyToReview } = require('./services/gbpService');
const { analyzeReviewAndDraftResponse } = require('./services/aiService');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const processReviews = async () => {
  console.log('Running background job to process reviews...');
  try {
    // 1. Fetch businesses/users that have active profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, brand_voice, approval_mode');

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found to process reviews for.');
      return;
    }

    // 2. Fetch new reviews for each business
    for (const profile of profiles) {
      console.log(`Processing reviews for user: ${profile.id}`);
      const newReviews = await fetchNewReviews();

      for (const review of newReviews) {
        // Check if review already exists
        const { data: existingReview, error: existingError } = await supabase
          .from('reviews')
          .select('id')
          .eq('google_review_id', review.google_review_id)
          .single();

        if (existingReview) {
          console.log(`Review ${review.google_review_id} already exists. Skipping.`);
          continue;
        }

        console.log(`Analyzing review ${review.google_review_id}...`);

        // 3. Analyze sentiment and generate a response
        const analysis = await analyzeReviewAndDraftResponse(review.review_text, profile.brand_voice);

        // Determine if we should post autonomously
        let status = 'Pending';
        if (profile.approval_mode === 'Fully Autonomous') {
          // Attempt to post the reply
          const postResult = await postReplyToReview(review.google_review_id, analysis.drafted_response);
          if (postResult.success) {
            status = 'Posted';
          }
        }

        // 4. Save review and AI analysis to database
        const { error: insertError } = await supabase
          .from('reviews')
          .insert({
            user_id: profile.id,
            google_review_id: review.google_review_id,
            review_text: review.review_text,
            reviewer_name: review.reviewer_name,
            rating: review.rating,
            sentiment: analysis.sentiment,
            sentiment_score: analysis.sentiment_score,
            key_topics: analysis.key_topics,
            urgency: analysis.urgency,
            ai_suggested_response: analysis.drafted_response,
            status: status
          });

        if (insertError) {
          console.error(`Error saving review ${review.google_review_id}:`, insertError);
        } else {
          console.log(`Successfully saved and processed review ${review.google_review_id}. Status: ${status}`);
        }
      }
    }

    console.log('Finished processing reviews.');
  } catch (err) {
    console.error('Error in review processing job:', err);
  }
};

// Run the job every 30 minutes
// cron.schedule('*/30 * * * *', processReviews);

module.exports = {
  processReviews
};

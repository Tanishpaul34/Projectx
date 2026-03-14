const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { postReplyToReview } = require('../services/gbpService');

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'anon_key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Fetch reviews for a specific user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post a response to a review
router.post('/post/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { replyText } = req.body;

    if (!reviewId || !replyText) {
      return res.status(400).json({ error: 'Review ID and replyText are required' });
    }

    // Call GBP API to post the reply
    const postResult = await postReplyToReview(reviewId, replyText);

    if (postResult.success) {
      // Update database status
      const { data, error } = await supabase
        .from('reviews')
        .update({ status: 'Posted', ai_suggested_response: replyText })
        .eq('id', reviewId)
        .select();

      if (error) {
        console.error('Error updating review status in Supabase:', error);
        return res.status(500).json({ error: 'Failed to update review status' });
      }

      res.json({ message: 'Response posted successfully', review: data[0] });
    } else {
      res.status(500).json({ error: 'Failed to post reply to GBP' });
    }

  } catch (error) {
    console.error('Error posting review response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

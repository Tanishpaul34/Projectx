const request = require('supertest');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { postReplyToReview } = require('../src/services/gbpService');

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

jest.mock('../src/services/gbpService', () => ({
  postReplyToReview: jest.fn()
}));

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis()
};

createClient.mockReturnValue(mockSupabase);

const reviewsRouter = require('../src/routes/reviews');

const app = express();
app.use(express.json());
// Add a route that lets us hit the handler without a userId param
app.use('/api/reviews-direct', (req, res, next) => {
  // We can just invoke the first route handler directly if we can extract it, but it's simpler to test like this:
  // We simulate missing userId by just having an empty params object directly mapped to the router's logic
  // A better way to test line 16:
  req.params = { userId: '' };
  reviewsRouter.stack[0].handle(req, res, next);
});

app.use('/api/reviews', reviewsRouter);

describe('Reviews API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('GET /:userId', () => {
    it('should return 400 if userId is empty', async () => {
      // By using our direct mount, we force req.params.userId = ''
      const res = await request(app).get('/api/reviews-direct');
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ error: 'User ID is required' });
    });

    it('should return 500 when Supabase fetch fails', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: new Error('Supabase error')
      });

      const res = await request(app).get('/api/reviews/user123');

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ error: 'Failed to fetch reviews' });
      expect(console.error).toHaveBeenCalledWith('Error fetching reviews:', expect.any(Error));
    });

    it('should return 200 and data when Supabase fetch succeeds', async () => {
      const mockReviews = [{ id: 1, text: 'Great!' }];
      mockSupabase.order.mockResolvedValue({
        data: mockReviews,
        error: null
      });

      const res = await request(app).get('/api/reviews/user123');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockReviews);
    });

    it('should return 500 on internal server error', async () => {
      mockSupabase.from.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const res = await request(app).get('/api/reviews/user123');

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
      expect(console.error).toHaveBeenCalledWith('Error fetching reviews:', expect.any(Error));
    });
  });

  describe('POST /post/:reviewId', () => {
    it('should return 400 if replyText is missing', async () => {
      const res = await request(app).post('/api/reviews/post/review123').send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ error: 'Review ID and replyText are required' });
    });

    it('should return 500 if GBP API fails', async () => {
      postReplyToReview.mockResolvedValue({ success: false });

      const res = await request(app).post('/api/reviews/post/review123').send({ replyText: 'Thanks!' });
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ error: 'Failed to post reply to GBP' });
    });

    it('should return 500 if updating Supabase fails after posting to GBP', async () => {
      postReplyToReview.mockResolvedValue({ success: true });

      mockSupabase.select.mockResolvedValue({
        data: null,
        error: new Error('Supabase update error')
      });

      const res = await request(app).post('/api/reviews/post/review123').send({ replyText: 'Thanks!' });
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ error: 'Failed to update review status' });
      expect(console.error).toHaveBeenCalledWith('Error updating review status in Supabase:', expect.any(Error));
    });

    it('should return 200 on successful review post and Supabase update', async () => {
      postReplyToReview.mockResolvedValue({ success: true });

      const mockData = [{ id: 'review123', status: 'Posted', ai_suggested_response: 'Thanks!' }];
      mockSupabase.select.mockResolvedValue({ data: mockData, error: null });

      const res = await request(app).post('/api/reviews/post/review123').send({ replyText: 'Thanks!' });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ message: 'Response posted successfully', review: mockData[0] });
    });

    it('should return 500 on internal server error', async () => {
      postReplyToReview.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const res = await request(app).post('/api/reviews/post/review123').send({ replyText: 'Thanks!' });

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
      expect(console.error).toHaveBeenCalledWith('Error posting review response:', expect.any(Error));
    });
  });
});

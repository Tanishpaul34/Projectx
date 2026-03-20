const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../src/services/gbpService', () => ({
  postReplyToReview: jest.fn()
}));

jest.mock('@supabase/supabase-js', () => {
  const mChain = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    update: jest.fn()
  };
  return {
    createClient: jest.fn(() => ({
      from: jest.fn(() => mChain)
    })),
    _mChain: mChain
  };
});

const { _mChain } = require('@supabase/supabase-js');
const { postReplyToReview } = require('../src/services/gbpService');
const reviewsRouter = require('../src/routes/reviews');

const app = express();
app.use(express.json());
app.use('/api/reviews', reviewsRouter);

describe('Reviews API', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the chain methods to return the chain itself by default
    _mChain.select.mockReturnThis();
    _mChain.eq.mockReturnThis();
    _mChain.order.mockReturnThis();
    _mChain.update.mockReturnThis();
  });

  describe('GET /:userId', () => {
    it('should fetch reviews for a user', async () => {
      const mockData = [{ id: 1, text: 'Great!' }];
      _mChain.order.mockResolvedValue({ data: mockData, error: null });

      const res = await request(app).get('/api/reviews/user123');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockData);
      expect(_mChain.select).toHaveBeenCalledWith('*');
      expect(_mChain.eq).toHaveBeenCalledWith('user_id', 'user123');
      expect(_mChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return 500 if Supabase returns an error', async () => {
      _mChain.order.mockResolvedValue({ data: null, error: { message: 'db error' } });

      const res = await request(app).get('/api/reviews/user123');

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual('Failed to fetch reviews');
    });

    it('should return 500 if an exception is thrown', async () => {
      _mChain.order.mockRejectedValue(new Error('Unexpected error'));

      const res = await request(app).get('/api/reviews/user123');

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual('Internal server error');
    });
  });

  describe('POST /post/:reviewId', () => {
    it('should return 400 if replyText is missing', async () => {
      const res = await request(app).post('/api/reviews/post/review123').send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Review ID and replyText are required');
    });

    it('should post a response and update the database', async () => {
      postReplyToReview.mockResolvedValue({ success: true });
      const mockUpdatedData = [{ id: 'review123', status: 'Posted', ai_suggested_response: 'Thanks!' }];
      _mChain.select.mockResolvedValue({ data: mockUpdatedData, error: null });

      const res = await request(app)
        .post('/api/reviews/post/review123')
        .send({ replyText: 'Thanks!' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Response posted successfully');
      expect(res.body.review).toEqual(mockUpdatedData[0]);

      expect(postReplyToReview).toHaveBeenCalledWith('review123', 'Thanks!');
      expect(_mChain.update).toHaveBeenCalledWith({ status: 'Posted', ai_suggested_response: 'Thanks!' });
      expect(_mChain.eq).toHaveBeenCalledWith('id', 'review123');
    });

    it('should return 500 if GBP API fails', async () => {
      postReplyToReview.mockResolvedValue({ success: false });

      const res = await request(app)
        .post('/api/reviews/post/review123')
        .send({ replyText: 'Thanks!' });

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual('Failed to post reply to GBP');
    });

    it('should return 500 if Supabase update fails', async () => {
      postReplyToReview.mockResolvedValue({ success: true });
      _mChain.select.mockResolvedValue({ data: null, error: { message: 'db error' } });

      const res = await request(app)
        .post('/api/reviews/post/review123')
        .send({ replyText: 'Thanks!' });

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual('Failed to update review status');
    });

    it('should return 500 if an exception is thrown', async () => {
      postReplyToReview.mockRejectedValue(new Error('Unexpected error'));

      const res = await request(app)
        .post('/api/reviews/post/review123')
        .send({ replyText: 'Thanks!' });

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual('Internal server error');
    });
  });
});

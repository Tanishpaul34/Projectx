const request = require('supertest');
const express = require('express');

// Create mock objects for Supabase chaining
const mockOrder = jest.fn();
const mockEqGet = jest.fn().mockReturnValue({ order: mockOrder });
const mockSelectGet = jest.fn().mockReturnValue({ eq: mockEqGet });

const mockSelectPost = jest.fn();
const mockEqPost = jest.fn().mockReturnValue({ select: mockSelectPost });
const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqPost });

const mockFrom = jest.fn().mockReturnValue({
  select: mockSelectGet,
  update: mockUpdate,
});

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => ({
      from: mockFrom
    })),
  };
});

// Mock the GBP service
jest.mock('../src/services/gbpService', () => ({
  postReplyToReview: jest.fn(),
}));

const reviewsRouter = require('../src/routes/reviews');
const { postReplyToReview } = require('../src/services/gbpService');

const app = express();
app.use(express.json());
app.use('/api/reviews', reviewsRouter);

describe('Reviews API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/reviews/:userId', () => {
    it('should return 200 and data if fetching reviews succeeds', async () => {
      mockOrder.mockResolvedValueOnce({ data: [{ id: 1, text: 'Great!' }], error: null });
      const res = await request(app).get('/api/reviews/123');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([{ id: 1, text: 'Great!' }]);
    });

    it('should return 500 if fetching reviews fails', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: new Error('DB Error') });
      const res = await request(app).get('/api/reviews/123');
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual('Failed to fetch reviews');
    });
  });

  describe('POST /api/reviews/post/:reviewId', () => {
    it('should return 400 if replyText is missing', async () => {
      const res = await request(app)
        .post('/api/reviews/post/123')
        .send({}); // missing replyText

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Review ID and replyText are required');
    });

    it('should return 500 when postReplyToReview fails', async () => {
      // Setup the mock to return success: false
      postReplyToReview.mockResolvedValueOnce({ success: false });

      const res = await request(app)
        .post('/api/reviews/post/123')
        .send({ replyText: 'Thank you for your review!' });

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual('Failed to post reply to GBP');
      expect(postReplyToReview).toHaveBeenCalledWith('123', 'Thank you for your review!');
    });

    it('should return 200 and success message when postReplyToReview succeeds', async () => {
      postReplyToReview.mockResolvedValueOnce({ success: true });
      mockSelectPost.mockResolvedValueOnce({ data: [{ id: '123', status: 'Posted', ai_suggested_response: 'Thank you!' }], error: null });

      const res = await request(app)
        .post('/api/reviews/post/123')
        .send({ replyText: 'Thank you!' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Response posted successfully');
      expect(res.body.review).toEqual({ id: '123', status: 'Posted', ai_suggested_response: 'Thank you!' });
      expect(postReplyToReview).toHaveBeenCalledWith('123', 'Thank you!');
    });

    it('should return 500 if Supabase update fails after successful GBP post', async () => {
      postReplyToReview.mockResolvedValueOnce({ success: true });
      mockSelectPost.mockResolvedValueOnce({ data: null, error: new Error('Update failed') });

      const res = await request(app)
        .post('/api/reviews/post/123')
        .send({ replyText: 'Thank you!' });

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual('Failed to update review status');
    });
  });
});

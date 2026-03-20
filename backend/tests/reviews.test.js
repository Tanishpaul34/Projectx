const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(),
      update: jest.fn()
    }))
  }))
}));

jest.mock('../src/services/gbpService', () => ({
  postReplyToReview: jest.fn()
}));

const reviewsRouter = require('../src/routes/reviews');

const app = express();
app.use(express.json());
app.use('/reviews', reviewsRouter);

// Add a route to test the missing reviewId (this simulates what would happen if the router was called with an empty reviewId)
// We have to explicitly match /reviews/post/ without ID and call the exact same handler since express routing won't match an empty param
const postReplyHandler = reviewsRouter.stack.find(
  r => r.route && r.route.path === '/post/:reviewId' && r.route.methods.post
).route.stack[0].handle;

app.post('/test/reviews/post', postReplyHandler);

describe('Reviews API', () => {
  describe('POST /reviews/post/:reviewId', () => {
    it('should return 400 if replyText is missing', async () => {
      const res = await request(app)
        .post('/reviews/post/123')
        .send({}); // Missing replyText

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Review ID and replyText are required');
    });

    it('should return 400 if replyText is empty', async () => {
      const res = await request(app)
        .post('/reviews/post/123')
        .send({ replyText: '' }); // Empty replyText

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Review ID and replyText are required');
    });

    it('should return 400 if reviewId is missing', async () => {
      const res = await request(app)
        .post('/test/reviews/post') // Hits the handler directly where req.params.reviewId is undefined
        .send({ replyText: 'Thank you for the review!' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Review ID and replyText are required');
    });
  });
});

const request = require('supertest');
const express = require('express');
const reviewRoutes = require('../src/routes/reviews');

// Set up a mock express app
const app = express();
app.use(express.json());
app.use('/api/reviews', reviewRoutes);

describe('Reviews API', () => {
  describe('GET /api/reviews/:userId?', () => {
    it('should return 400 if userId is missing', async () => {
      const res = await request(app).get('/api/reviews/');
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('User ID is required');
    });
  });
});

const request = require('supertest');
const express = require('express');
const reviewsRouter = require('../src/routes/reviews');

// Mock supabase client locally so we can intercept calls in tests
jest.mock('@supabase/supabase-js', () => {
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockOrder = jest.fn();
  const mockFrom = jest.fn(() => ({
    select: mockSelect,
    update: jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn() })) }))
  }));
  const mockGetUser = jest.fn();

  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ order: mockOrder });

  return {
    createClient: jest.fn(() => ({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })),
    _mockGetUser: mockGetUser,
    _mockOrder: mockOrder,
    _mockSelect: mockSelect,
    _mockEq: mockEq,
    _mockFrom: mockFrom
  };
});

// Have to mock the middleware's internally created client as well, or we can mock auth.js directly
jest.mock('../src/middleware/auth', () => ({
  authenticateUser: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];

    if (token === 'valid_token_user_123') {
      req.user = { id: '123' };
      return next();
    } else if (token === 'valid_token_user_456') {
      req.user = { id: '456' };
      return next();
    }

    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}));

jest.mock('../src/services/gbpService', () => ({
    postReplyToReview: jest.fn(() => Promise.resolve({ success: true }))
}));

const { _mockOrder } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use('/api/reviews', reviewsRouter);

describe('Reviews API GET /:userId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if Authorization header is missing', async () => {
    const res = await request(app).get('/api/reviews/123');
    expect(res.statusCode).toEqual(401);
    expect(res.body.error).toEqual('Missing or invalid authorization header');
  });

  it('should return 401 if token is invalid', async () => {
    const res = await request(app)
        .get('/api/reviews/123')
        .set('Authorization', 'Bearer invalid_token');

    expect(res.statusCode).toEqual(401);
    expect(res.body.error).toEqual('Invalid or expired token');
  });

  it('should return 403 if authenticated user tries to access another user\'s reviews', async () => {
    const res = await request(app)
        .get('/api/reviews/123')
        .set('Authorization', 'Bearer valid_token_user_456');

    expect(res.statusCode).toEqual(403);
    expect(res.body.error).toEqual('Forbidden: You can only access your own reviews');
  });

  it('should return 200 and reviews if valid token and matching userId', async () => {
    _mockOrder.mockResolvedValueOnce({
      data: [{ id: 1, text: 'Great!' }],
      error: null
    });

    const res = await request(app)
        .get('/api/reviews/123')
        .set('Authorization', 'Bearer valid_token_user_123');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([{ id: 1, text: 'Great!' }]);
  });
});

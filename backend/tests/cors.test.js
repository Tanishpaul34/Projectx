process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'anon_key';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const request = require('supertest');
const app = require('../src/index');

describe('CORS Configuration', () => {
  it('should restrict Access-Control-Allow-Origin', async () => {
    // Make a request to a non-existent route to avoid triggering the DB
    const res = await request(app)
      .get('/non-existent-route-for-testing-cors')
      .set('Origin', 'http://malicious.com');

    // Make sure it doesn't allow all origins
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
    // In our implementation, it should match the FRONTEND_URL env var
    // since we set origin: process.env.FRONTEND_URL
    expect(res.headers['access-control-allow-origin']).toBe(process.env.FRONTEND_URL);
  });
});

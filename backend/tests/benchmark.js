// Set dummy env variables
process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy';

// Mock dependencies
const mockAnalyze = require('jest-mock').fn();
const mockFetch = require('jest-mock').fn();
const mockPost = require('jest-mock').fn();

const mSupabase = {
  from: require('jest-mock').fn().mockReturnThis(),
  select: require('jest-mock').fn().mockReturnThis(),
  eq: require('jest-mock').fn().mockReturnThis(),
  single: require('jest-mock').fn().mockReturnThis(),
  insert: require('jest-mock').fn().mockReturnThis(),
};

const mockCreateClient = require('jest-mock').fn(() => mSupabase);

const mockAiService = { analyzeReviewAndDraftResponse: mockAnalyze };
const mockGbpService = { fetchNewReviews: mockFetch, postReplyToReview: mockPost };
const mockSupabaseJs = { createClient: mockCreateClient };

// Hack to mock required modules in CommonJS
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === './services/aiService') return mockAiService;
  if (arguments[0] === './services/gbpService') return mockGbpService;
  if (arguments[0] === '@supabase/supabase-js') return mockSupabaseJs;
  return originalRequire.apply(this, arguments);
};

const { processReviews } = require('../src/worker');

async function runBenchmark() {
  mSupabase.from.mockImplementation((table) => {
    if (table === 'profiles') {
      return {
        select: () => Promise.resolve({ data: [{ id: '1', brand_voice: 'Professional', approval_mode: 'Fully Autonomous' }] })
      };
    }
    if (table === 'reviews') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null }) // no existing review
          })
        }),
        insert: () => Promise.resolve({ error: null })
      };
    }
  });

  const generateReviews = (count) => {
    return Array.from({ length: count }).map((_, i) => ({
      google_review_id: `id_${i}`,
      review_text: 'text',
      reviewer_name: 'name',
      rating: 5
    }));
  };

  mockFetch.mockResolvedValue(generateReviews(10));

  mockAnalyze.mockImplementation(async () => {
    await new Promise(r => setTimeout(r, 50)); // simulate 50ms AI delay
    return {
      sentiment: 'Positive',
      sentiment_score: 90,
      key_topics: ['Service'],
      urgency: 'Low',
      drafted_response: 'Thanks!'
    };
  });

  mockPost.mockImplementation(async () => {
    await new Promise(r => setTimeout(r, 20)); // simulate 20ms posting delay
    return { success: true };
  });

  console.log("Starting benchmark for 10 reviews...");
  const start = Date.now();
  await processReviews();
  const end = Date.now();

  console.log(`Benchmark completed in ${end - start} ms`);
}

runBenchmark().catch(console.error);

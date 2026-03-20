import { render, screen, waitFor } from '@testing-library/react';
import Reviews from '../page';

// Mock the createClient module
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
  })),
}));

// We also need to mock Next.js's navigation, etc if needed by any imported components,
// though right now page.tsx seems standalone enough for tests.

describe('Reviews Page Error Handling', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Spy on console.error but let it be silent in the test runner output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('handles backend returning non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<Reviews />);

    // Wait for the effect to finish and the loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText('Loading reviews...')).not.toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch reviews from backend');
    expect(screen.getByText('No reviews found. The background worker will fetch them automatically.')).toBeInTheDocument();
  });

  it('handles fetch rejecting with an error (e.g., network failure)', async () => {
    const error = new Error('Network failure');
    (global.fetch as jest.Mock).mockRejectedValueOnce(error);

    render(<Reviews />);

    // Wait for the effect to finish and the loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText('Loading reviews...')).not.toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching reviews:', error);
    expect(screen.getByText('No reviews found. The background worker will fetch them automatically.')).toBeInTheDocument();
  });
});

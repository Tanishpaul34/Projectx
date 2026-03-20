import { render, screen, waitFor } from '@testing-library/react';
import Reviews from './page';
import { createClient } from '@/utils/supabase/client';

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

describe('Reviews Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders empty state when no reviews are found', async () => {
    // Mock user
    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-123' } } }),
      },
    });

    // Mock fetch response for reviews
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [], // Empty reviews array
    });

    render(<Reviews />);

    // First it should show loading state
    expect(screen.getByText('Loading reviews...')).toBeInTheDocument();

    // Then it should show the empty state message
    await waitFor(() => {
      expect(screen.getByText('No reviews found. The background worker will fetch them automatically.')).toBeInTheDocument();
    });

    // Verify fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/reviews/test-user-123'));
  });
});

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Reviews from './page';
import { createClient } from '@/utils/supabase/client';

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

describe('Reviews Page', () => {
  let mockGetUser: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup Supabase auth mock
    mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } });
    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    });

    // Setup window.alert mock
    window.alert = jest.fn();
  });

  it('shows loading state initially', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });

    render(<Reviews />);
    expect(screen.getByText('Loading reviews...')).toBeInTheDocument();

    // Wait for loading to finish so we don't have unhandled promises
    await waitFor(() => {
      expect(screen.queryByText('Loading reviews...')).not.toBeInTheDocument();
    });
  });

  it('renders "No reviews found" when the list is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });

    render(<Reviews />);

    await waitFor(() => {
      expect(screen.getByText('No reviews found. The background worker will fetch them automatically.')).toBeInTheDocument();
    });
  });

  it('renders a list of reviews when data is successfully fetched', async () => {
    const mockReviews = [
      {
        id: 'review-1',
        reviewer_name: 'Alice',
        rating: 5,
        created_at: '2023-10-01T12:00:00Z',
        sentiment: 'Positive',
        review_text: 'Great product!',
        key_topics: ['quality', 'service'],
        ai_suggested_response: 'Thank you for the kind words!',
        status: 'Pending',
      },
      {
        id: 'review-2',
        reviewer_name: 'Bob',
        rating: 2,
        created_at: '2023-10-02T12:00:00Z',
        sentiment: 'Negative',
        review_text: 'Not what I expected.',
        key_topics: ['shipping'],
        ai_suggested_response: 'We are sorry to hear that.',
        status: 'Posted',
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReviews,
    });

    render(<Reviews />);

    // Wait for the reviews to be rendered
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.getByText('Rating: 5/5')).toBeInTheDocument();
    expect(screen.getByText('Positive')).toBeInTheDocument();
    expect(screen.getByText(/"Great product!"/)).toBeInTheDocument();
    expect(screen.getByText('#quality')).toBeInTheDocument();
    expect(screen.getByText('#service')).toBeInTheDocument();
    expect(screen.getByText('Status: Pending')).toBeInTheDocument();

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Rating: 2/5')).toBeInTheDocument();
    expect(screen.getByText('Negative')).toBeInTheDocument();
    expect(screen.getByText(/"Not what I expected."/)).toBeInTheDocument();
    expect(screen.getByText('#shipping')).toBeInTheDocument();
    expect(screen.getByText('Status: Posted')).toBeInTheDocument();
  });

  it('handles fetch error gracefully', async () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<Reviews />);

    await waitFor(() => {
      expect(screen.getByText('No reviews found. The background worker will fetch them automatically.')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching reviews:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('handles non-ok fetch response gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<Reviews />);

    await waitFor(() => {
      expect(screen.getByText('No reviews found. The background worker will fetch them automatically.')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch reviews from backend');
    consoleSpy.mockRestore();
  });

  it('allows sending a response for a pending review and updates its status', async () => {
    const mockReview = {
      id: 'review-1',
      reviewer_name: 'Alice',
      rating: 5,
      created_at: '2023-10-01T12:00:00Z',
      sentiment: 'Positive',
      review_text: 'Great product!',
      key_topics: [],
      ai_suggested_response: 'Thank you for the kind words!',
      status: 'Pending',
    };

    const updatedReview = {
      ...mockReview,
      status: 'Posted',
      ai_suggested_response: 'Thanks for your amazing feedback!',
    };

    // First fetch for getting the reviews
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockReview],
    });

    render(<Reviews />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Mock fetch for the POST request
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ review: updatedReview }),
    });

    const textarea = document.getElementById(`response-${mockReview.id}`) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();

    // Change the text before submitting (optional, but tests textarea interaction)
    fireEvent.change(textarea, { target: { value: 'Thanks for your amazing feedback!' } });

    const sendButton = screen.getByRole('button', { name: /Send Response/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/reviews/post/${mockReview.id}`),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ replyText: 'Thanks for your amazing feedback!' }),
        })
      );
    });

    // The status should update to Posted
    await waitFor(() => {
      expect(screen.getByText('Status: Posted')).toBeInTheDocument();
    });

    expect(window.alert).toHaveBeenCalledWith('Response posted successfully!');

    // The button should be removed because status is Posted
    expect(screen.queryByRole('button', { name: /Send Response/i })).not.toBeInTheDocument();

    // The textarea should be readOnly
    expect(textarea).toHaveAttribute('readOnly');
  });

  it('handles error when posting a response fails (non-ok response)', async () => {
    const mockReview = {
      id: 'review-1',
      reviewer_name: 'Alice',
      rating: 5,
      created_at: '2023-10-01T12:00:00Z',
      sentiment: 'Positive',
      review_text: 'Great product!',
      key_topics: [],
      ai_suggested_response: 'Thank you!',
      status: 'Pending',
    };

    // First fetch for getting the reviews
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockReview],
    });

    render(<Reviews />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Mock fetch for the POST request failing
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    const sendButton = screen.getByRole('button', { name: /Send Response/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to post response');
    });

    // The status should remain Pending
    expect(screen.getByText('Status: Pending')).toBeInTheDocument();
  });

  it('handles network error when posting a response', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mockReview = {
      id: 'review-1',
      reviewer_name: 'Alice',
      rating: 5,
      created_at: '2023-10-01T12:00:00Z',
      sentiment: 'Positive',
      review_text: 'Great product!',
      key_topics: [],
      ai_suggested_response: 'Thank you!',
      status: 'Pending',
    };

    // First fetch for getting the reviews
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockReview],
    });

    render(<Reviews />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Mock fetch for the POST request throwing an error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

    const sendButton = screen.getByRole('button', { name: /Send Response/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error posting response:', expect.any(Error));
    });

    expect(window.alert).toHaveBeenCalledWith('Error posting response');

    consoleSpy.mockRestore();
  });

  it('does not send response if textarea is empty', async () => {
    const mockReview = {
      id: 'review-1',
      reviewer_name: 'Alice',
      rating: 5,
      created_at: '2023-10-01T12:00:00Z',
      sentiment: 'Positive',
      review_text: 'Great product!',
      key_topics: [],
      ai_suggested_response: '',
      status: 'Pending',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockReview],
    });

    render(<Reviews />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Clear out the textarea completely
    const textarea = document.getElementById(`response-${mockReview.id}`) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '' } });

    // Click send
    const sendButton = screen.getByRole('button', { name: /Send Response/i });
    fireEvent.click(sendButton);

    // fetch should have only been called once for the initial load
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

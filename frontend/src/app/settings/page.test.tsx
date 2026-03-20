import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Settings from './page';

// Mock the Supabase client
vi.mock('@/utils/supabase/client', () => {
  return {
    createClient: vi.fn(),
  };
});

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles error when saving settings fails', async () => {
    const { createClient } = await import('@/utils/supabase/client');

    // Set up the mock for this specific test
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: new Error('Database error') });
    const mockSelectEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { brand_voice: 'Professional', approval_mode: 'Manual Approval' },
      })
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user123' } },
        }),
      },
      from: vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockSelectEq
            }),
            update: vi.fn().mockReturnValue({
              eq: mockUpdateEq,
            }),
          };
        }
        return {};
      }),
    });

    render(<Settings />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    // Click the save button
    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    // Verify console.error and alert were called
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Error saving settings:', expect.any(Error));
      expect(window.alert).toHaveBeenCalledWith('Failed to save settings');
    });
  });
});

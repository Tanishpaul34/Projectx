import { render, screen, waitFor } from '@testing-library/react';
import Settings from './page';
import { createClient } from '@/utils/supabase/client';

// Mock the Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

describe('Settings Component', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('renders with default values when profile is null/undefined', async () => {
    // Mock user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });

    // Mock profile as null
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });

    render(<Settings />);

    // Wait for the loading state to clear
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings.../i)).not.toBeInTheDocument();
    });

    // Check if the default values are selected
    // The Professional radio is associated with a label correctly wrapping it
    // but Manual Approval might not be directly selectable via getByLabelText if the label wraps multiple elements without direct association
    const professionalRadio = screen.getByDisplayValue('Professional') as HTMLInputElement;
    const manualApprovalRadio = screen.getByDisplayValue('Manual Approval') as HTMLInputElement;

    expect(professionalRadio).toBeChecked();
    expect(manualApprovalRadio).toBeChecked();
  });
});

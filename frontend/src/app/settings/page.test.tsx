import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './page';

// Mock Supabase client
const mockGetUser = jest.fn();
const mockSingle = jest.fn();
const mockEqSelect = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEqSelect }));
const mockEqUpdate = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEqUpdate }));

const mockFrom = jest.fn((table: string) => {
  if (table === 'profiles') {
    return {
      select: mockSelect,
      update: mockUpdate,
    };
  }
  return {};
});

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

describe('Settings Page', () => {
  const mockUser = { id: 'test-user-id' };
  const mockProfile = {
    brand_voice: 'Friendly',
    approval_mode: 'Fully Autonomous',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    console.error = jest.fn();
  });

  it('shows loading state initially', () => {
    // Setup mock to not resolve immediately
    mockGetUser.mockReturnValue(new Promise(() => {}));
    render(<Settings />);
    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('fetches and renders user settings successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({ data: mockProfile });

    render(<Settings />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    // Check if fetched values are selected
    // Note: the inputs don't have matching ids to the labels, so we query by value for radios
    const friendlyRadio = screen.getByDisplayValue('Friendly') as HTMLInputElement;
    expect(friendlyRadio).toBeChecked();

    const fullyAutonomousRadio = screen.getByDisplayValue('Fully Autonomous') as HTMLInputElement;
    expect(fullyAutonomousRadio).toBeChecked();

    // Verify the API calls
    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockSelect).toHaveBeenCalledWith('brand_voice, approval_mode');
    expect(mockEqSelect).toHaveBeenCalledWith('id', mockUser.id);
  });

  it('handles saving settings successfully', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({ data: mockProfile });
    mockEqUpdate.mockResolvedValue({ error: null });

    render(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    // Change settings
    await user.click(screen.getByDisplayValue('Gen-Z'));
    await user.click(screen.getByDisplayValue('Manual Approval'));

    // Save
    await user.click(screen.getByRole('button', { name: /save configuration/i }));

    expect(mockUpdate).toHaveBeenCalledWith({
      brand_voice: 'Gen-Z',
      approval_mode: 'Manual Approval',
    });
    expect(mockEqUpdate).toHaveBeenCalledWith('id', mockUser.id);
    expect(window.alert).toHaveBeenCalledWith('Settings saved successfully!');
  });

  it('handles error when saving settings fails', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({ data: mockProfile });
    const mockError = new Error('Database error');
    mockEqUpdate.mockResolvedValue({ error: mockError });

    render(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    // Save
    await user.click(screen.getByRole('button', { name: /save configuration/i }));

    expect(mockUpdate).toHaveBeenCalledWith({
      brand_voice: 'Friendly',
      approval_mode: 'Fully Autonomous',
    });
    expect(mockEqUpdate).toHaveBeenCalledWith('id', mockUser.id);
    expect(console.error).toHaveBeenCalledWith('Error saving settings:', mockError);
    expect(window.alert).toHaveBeenCalledWith('Failed to save settings');
  });

  it('does not attempt to save if user is not loaded', async () => {
    const user = userEvent.setup();
    // User fetch fails or returns no user
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    // Try to save
    await user.click(screen.getByRole('button', { name: /save configuration/i }));

    // Update should not be called
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
  });
});

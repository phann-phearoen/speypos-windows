import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OrderHistoryManagement } from './OrderHistoryManagement';

const mocks = vi.hoisted(() => ({
  mockGetOpenShifts: vi.fn(),
  mockCloseShift: vi.fn(),
  mockGetShiftsByDate: vi.fn(),
  mockGetStaff: vi.fn(),
  mockGetOrdersByShift: vi.fn(),
  mockGetOrdersByShiftAndStaff: vi.fn(),
  mockSyncOrders: vi.fn(),
  mockToast: vi.fn(),
  mockTranslation: vi.fn(),
  mockGetCloudSyncEnabled: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  shiftApi: {
    getOpenShifts: (...args: any[]) => mocks.mockGetOpenShifts(...args),
    closeShift: (...args: any[]) => mocks.mockCloseShift(...args),
    getShiftsByDate: (...args: any[]) => mocks.mockGetShiftsByDate(...args),
  },
  orderApi: {
    getOrdersByShift: (...args: any[]) => mocks.mockGetOrdersByShift(...args),
    getOrdersByShiftAndStaff: (...args: any[]) => mocks.mockGetOrdersByShiftAndStaff(...args),
  },
  staffApi: {
    getStaff: (...args: any[]) => mocks.mockGetStaff(...args),
  },
  syncApi: {
    syncOrders: (...args: any[]) => mocks.mockSyncOrders(...args),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => mocks.mockTranslation(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.mockToast }),
}));

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({ getCloudSyncEnabled: mocks.mockGetCloudSyncEnabled }),
}));

vi.mock('@/lib/currency', () => ({
  useCurrency: () => ({ formatPrice: (value: number) => `KHR ${value}` }),
}));

vi.mock('@/lib/datetime', () => ({
  useDateTime: () => ({
    formatDate: () => 'Jul 27, 2026',
    formatTime: () => '09:00',
    formatTimeRange: () => '09:00 - ongoing',
    formatDateString: (value: string) => value,
    formatLongDate: () => 'July 27, 2026',
    getTodayDateString: () => '2026-07-27',
    getDateString: () => '2026-07-27',
  }),
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

beforeEach(() => {
  vi.clearAllMocks();

  mocks.mockTranslation.mockReturnValue({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        'admin.orderHistory.title': 'Order History',
        'admin.orderHistory.description': 'History',
        'admin.orderHistory.activeShift': 'Current Active Shift',
        'admin.orderHistory.multipleOpenShifts': '{{count}} Open Shifts Detected',
        'admin.orderHistory.closeShift': 'Close Shift',
        'admin.orderHistory.closeShiftSuccess': 'Shift closed successfully',
        'admin.orderHistory.closeShiftNoLongerOpen': 'Shift was already no longer open. The list has been refreshed.',
        'admin.orderHistory.closeShiftDeliveryFailed': 'Shift closed, but close notification delivery failed.',
        'admin.orderHistory.closeOrphanedHint': 'Close outdated shifts to prevent order conflicts.',
        'admin.orderHistory.selectDateShift': 'Select Date / Shift',
        'admin.orderHistory.pickDate': 'Pick date',
        'admin.orderHistory.shiftsOn': 'Shifts on',
        'admin.orderHistory.ongoing': 'ongoing',
        'admin.orderHistory.outdated': 'From Previous Day',
        'common.loading': 'Loading',
        'common.unknown': 'Unknown',
        'toast.success': 'Success',
        'toast.error': 'Error',
      };
      return dictionary[key] ?? key;
    },
  });

  mocks.mockGetCloudSyncEnabled.mockReturnValue(true);
  mocks.mockGetStaff.mockResolvedValue({ data: [], error: null });
  mocks.mockGetOrdersByShift.mockResolvedValue({ data: [], error: null });
  mocks.mockGetOrdersByShiftAndStaff.mockResolvedValue({ data: [], error: null });
  mocks.mockSyncOrders.mockResolvedValue({ error: null });
  mocks.mockGetShiftsByDate.mockResolvedValue({ data: [], error: null });
});

test('admin close shift surfaces synchronous delivery failure after a successful close', async () => {
  mocks.mockGetOpenShifts
    .mockResolvedValueOnce({
      data: [
        {
          id: 'shift-1',
          staff_id: 'staff-1',
          staff: { name: 'Alice' },
          started_at: 1,
          date: '2026-07-26',
          status: 'open',
        },
      ],
      error: null,
    })
    .mockResolvedValueOnce({ data: [], error: null });
  mocks.mockCloseShift.mockResolvedValue({
    data: {
      id: 'shift-1',
      status: 'closed',
      close_delivery: { status: 'failed', message: 'Telegram failed' },
    },
    error: null,
    errorCode: null,
  });

  render(<OrderHistoryManagement />);

  fireEvent.click(await screen.findByRole('button', { name: /close shift/i }));

  await waitFor(() => {
    expect(mocks.mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Telegram failed',
        variant: 'destructive',
      })
    );
  });

  await waitFor(() => {
    expect(screen.queryByRole('button', { name: /close shift/i })).not.toBeInTheDocument();
  });
});

test('admin close shift refreshes stale state when the backend says the shift is no longer open', async () => {
  mocks.mockGetOpenShifts
    .mockResolvedValueOnce({
      data: [
        {
          id: 'shift-1',
          staff_id: 'staff-1',
          staff: { name: 'Alice' },
          started_at: 1,
          date: '2026-07-26',
          status: 'open',
        },
      ],
      error: null,
    })
    .mockResolvedValueOnce({ data: [], error: null });
  mocks.mockCloseShift.mockResolvedValue({
    data: null,
    error: 'Shift is no longer active.',
    errorCode: 'SHIFT_NOT_OPEN',
  });

  render(<OrderHistoryManagement />);

  fireEvent.click(await screen.findByRole('button', { name: /close shift/i }));

  await waitFor(() => {
    expect(mocks.mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Success',
        description: 'Shift was already no longer open. The list has been refreshed.',
      })
    );
  });

  await waitFor(() => {
    expect(screen.queryByRole('button', { name: /close shift/i })).not.toBeInTheDocument();
  });
});

test('admin close shift treats stale business-day message without errorCode as already closed', async () => {
  mocks.mockGetOpenShifts
    .mockResolvedValueOnce({
      data: [
        {
          id: 'shift-1',
          staff_id: 'staff-1',
          staff: { name: 'Alice' },
          started_at: 1,
          date: '2026-07-26',
          status: 'open',
        },
      ],
      error: null,
    })
    .mockResolvedValueOnce({ data: [], error: null });
  mocks.mockCloseShift.mockResolvedValue({
    data: null,
    error: 'Shift belongs to a previous business day and can no longer be used.',
    errorCode: null,
  });

  render(<OrderHistoryManagement />);

  fireEvent.click(await screen.findByRole('button', { name: /close shift/i }));

  await waitFor(() => {
    expect(mocks.mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Success',
        description: 'Shift was already no longer open. The list has been refreshed.',
      })
    );
  });

  await waitFor(() => {
    expect(screen.queryByRole('button', { name: /close shift/i })).not.toBeInTheDocument();
  });
});
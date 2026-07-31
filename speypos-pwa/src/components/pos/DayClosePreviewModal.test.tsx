import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DayClosePreviewModal } from './DayClosePreviewModal';

const mocks = vi.hoisted(() => ({
  mockGetCloseDayPreview: vi.fn(),
  mockCloseDay: vi.fn(),
  mockTranslation: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  shiftApi: {
    getCloseDayPreview: (...args: any[]) => mocks.mockGetCloseDayPreview(...args),
    closeDay: (...args: any[]) => mocks.mockCloseDay(...args),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => mocks.mockTranslation(),
}));

vi.mock('@/lib/currency', () => ({
  useCurrency: () => ({ format: (value: number) => `KHR ${value}` }),
}));

vi.mock('@/lib/datetime', () => ({
  useDateTime: () => ({ formatTime: () => '09:00' }),
  formatDateString: (value: string) => value,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h1>{children}</h1>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: any) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: any) => <div>{children}</div>,
  CollapsibleContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

beforeEach(() => {
  vi.clearAllMocks();

  mocks.mockTranslation.mockReturnValue({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        'shift.dayClose.title': 'Close Day Summary',
        'shift.dayClose.loading': 'Loading day summary...',
        'shift.dayClose.noShifts': 'No shifts to close',
        'shift.dayClose.businessDate': 'Business Date',
        'shift.dayClose.shifts': 'Shifts',
        'shift.dayClose.shiftNum': 'Shift {{num}}',
        'shift.dayClose.closing': 'Closing...',
        'shift.dayClose.confirm': 'Confirm Close Day',
        'shift.closePreview.noOrders': 'No orders in this shift',
        'admin.orderHistory.orders': 'Orders',
        'admin.orderHistory.items': 'Items',
        'admin.orderHistory.revenue': 'Revenue',
        'admin.orderHistory.statusVoided': 'Voided',
        'common.cancel': 'Cancel',
        'common.unknown': 'Unknown',
        'order.items': 'items',
      };
      return dictionary[key] ?? key;
    },
  });

  mocks.mockGetCloseDayPreview.mockResolvedValue({
    data: {
      businessDate: '2026-07-27',
      shifts: [
        {
          id: 'shift-1',
          status: 'closed',
          staff: { name: 'Alice' },
          orders: [],
        },
      ],
    },
    error: null,
    errorCode: null,
  });
});

test('treats DAY_ALREADY_CLOSED as terminal success and calls onSuccess', async () => {
  const onComplete = vi.fn();
  const onClose = vi.fn();

  mocks.mockCloseDay.mockResolvedValue({
    data: null,
    error: 'Business day 2026-07-27 is already closed.',
    errorCode: 'DAY_ALREADY_CLOSED',
  });

  render(
    <DayClosePreviewModal open={true} onClose={onClose} onComplete={onComplete} targetDate="2026-07-27" />
  );

  fireEvent.click(await screen.findByRole('button', { name: /confirm close day/i }));

  await waitFor(() => {
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'already-closed',
        businessDate: '2026-07-27',
      })
    );
  });
});

test('keeps DAY_NOT_READY visible as a blocking error and does not call onSuccess', async () => {
  const onComplete = vi.fn();
  const onClose = vi.fn();

  mocks.mockCloseDay.mockResolvedValue({
    data: null,
    error: 'Business day 2026-07-27 cannot be closed until all shifts are closed.',
    errorCode: 'DAY_NOT_READY',
  });

  render(
    <DayClosePreviewModal open={true} onClose={onClose} onComplete={onComplete} targetDate="2026-07-27" />
  );

  fireEvent.click(await screen.findByRole('button', { name: /confirm close day/i }));

  await waitFor(() => {
    expect(screen.getByText('Business day 2026-07-27 cannot be closed until all shifts are closed.')).toBeInTheDocument();
  });

  expect(onComplete).not.toHaveBeenCalled();
});

test('shows the actual business date in the preview modal', async () => {
  const onComplete = vi.fn();
  const onClose = vi.fn();

  render(
    <DayClosePreviewModal open={true} onClose={onClose} onComplete={onComplete} targetDate="2026-07-27" />
  );

  await waitFor(() => {
    expect(screen.getAllByText('2026-07-27').length).toBeGreaterThan(0);
  }, { timeout: 3000 });
});
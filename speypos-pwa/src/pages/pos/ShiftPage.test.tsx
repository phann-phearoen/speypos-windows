import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShiftPage from './ShiftPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseShift = vi.fn();
const mockRefreshPendingActions = vi.fn();
const mockGetBrandName = vi.fn();
const mockTranslation = vi.fn();

const mockGetStaff = vi.fn();
const mockGetPreviousDayStatus = vi.fn();
const mockOpenShiftApi = vi.fn();
const mockDayClosePreviewModal = vi.fn();
const mockDayCloseResultModal = vi.fn();

vi.mock('@/contexts/ShiftContext', () => ({
  useShift: () => mockUseShift(),
}));

vi.mock('@/contexts/PendingActionsContext', () => ({
  usePendingActions: () => ({
    refresh: mockRefreshPendingActions,
  }),
}));

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    getBrandName: mockGetBrandName,
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => mockTranslation(),
}));

vi.mock('@/lib/api', () => ({
  staffApi: {
    getStaff: (...args: any[]) => mockGetStaff(...args),
  },
  shiftApi: {
    getPreviousDayStatus: (...args: any[]) => mockGetPreviousDayStatus(...args),
    openShift: (...args: any[]) => mockOpenShiftApi(...args),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/components/pos/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('@/components/StoreBrand', () => ({
  StoreBrand: () => <div data-testid="store-brand" />,
}));

vi.mock('@/components/pos/DayClosePreviewModal', () => ({
  DayClosePreviewModal: (props: any) => {
    mockDayClosePreviewModal(props);
    if (!props.open) {
      return null;
    }

    return (
      <div data-testid="day-close-preview-modal">
        <button
          type="button"
          onClick={() =>
            props.onComplete({
              status: 'closed',
              businessDate: '2026-07-27',
              business_day_status: 'CLOSED',
              response: {
                businessDate: '2026-07-27',
                shiftSummaries: [],
                combinedSummary: {
                  totalOrders: 0,
                  totalRevenue: 0,
                  totalItems: 0,
                  revenueByPaymentType: {},
                  grandTotalItems: 0,
                  voidedOrders: 0,
                  voidedAmount: 0,
                  voidedItems: 0,
                  netRevenue: 0,
                },
                business_day_id: 'business-day-1',
                business_day_status: 'CLOSED',
              },
            })
          }
        >
          complete day close
        </button>
      </div>
    );
  },
}));
vi.mock('@/components/pos/DayCloseResultModal', () => ({
  DayCloseResultModal: (props: any) => {
    mockDayCloseResultModal(props);
    if (!props.open) {
      return null;
    }

    return (
      <div data-testid="day-close-result-modal">
        <div>{props.result?.businessDate}</div>
        <button type="button" onClick={props.onClose}>
          close result
        </button>
      </div>
    );
  },
}));
vi.mock('@/components/pos/StaleShiftsModal', () => ({
  StaleShiftsModal: () => null,
}));

function setupBaseMocks() {
  mockUseShift.mockReturnValue({
    openShift: vi.fn(),
    currentShift: null,
    currentStaff: null,
    detectActiveShift: vi.fn().mockResolvedValue(null),
  });

  mockRefreshPendingActions.mockResolvedValue(undefined);
  mockGetBrandName.mockReturnValue('SpeyPOS');

  const dictionary: Record<string, string> = {
    'shift.welcomeTo': 'Welcome to {{brand}}',
    'shift.selectProfile': 'Select your profile to start a shift',
    'shift.selectStaff': 'Select Staff Member',
    'shift.checkingActiveShift': 'Checking for active shift...',
    'shift.noActiveStaff': 'No active staff members found.',
    'shift.openShift': 'Open Shift',
    'shift.openingShift': 'Opening Shift...',
    'shift.openShiftExists': 'An open shift already exists.',
    'shift.manageShifts': 'Manage Shifts',
    'shift.closeDay': 'Close Day',
    'shift.closeDayHint': 'Close all shifts for the business day',
    'shift.closeDayReminder': 'Please close the day if no shifts remain for the day.',
    'shift.dayClose.success': 'Day Closed Successfully',
    'shift.dayClose.successDesc': 'All shifts have been closed and reports sent',
    'shift.closeStaleFirstHint': 'Close stale shifts first, then close the business day.',
    'shift.closeStaleShifts': 'Close Stale Shifts',
  };

  mockTranslation.mockReturnValue({
    t: (key: string) => dictionary[key] ?? key,
  });

  mockGetStaff.mockResolvedValue({
    data: [
      { id: 'staff-1', name: 'Alice', role: 'staff', status: 'active' },
    ],
    error: null,
  });

  mockOpenShiftApi.mockResolvedValue({ data: null, error: 'OPEN_SHIFT_EXISTS' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
  setupBaseMocks();
});

function renderShiftPageWithState(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/pos/shift', state }]}>
      <ShiftPage />
    </MemoryRouter>
  );
}

test('F1: shows active Close Day style and reminder when 2+ shifts are closed', async () => {
  mockGetPreviousDayStatus.mockResolvedValue({
    data: { hasPreviousDay: false, todayClosedShiftsCount: 2 },
    error: null,
  });

  renderShiftPageWithState();

  const closeDayButton = await screen.findByRole('button', { name: /close day/i });
  expect(closeDayButton.className).toContain('bg-amber-500');
  expect(screen.getByText('Please close the day if no shifts remain for the day.')).toBeInTheDocument();
});

test('F2: does not show reminder when fewer than 2 shifts are closed', async () => {
  mockGetPreviousDayStatus.mockResolvedValue({
    data: { hasPreviousDay: false, todayClosedShiftsCount: 1 },
    error: null,
  });

  renderShiftPageWithState();

  await screen.findByRole('button', { name: /close day/i });
  expect(screen.queryByText('Please close the day if no shifts remain for the day.')).not.toBeInTheDocument();
});

test('F3: applies immediate pulse animation after shift-close navigation state', async () => {
  mockGetPreviousDayStatus.mockResolvedValue({
    data: { hasPreviousDay: false, todayClosedShiftsCount: 2 },
    error: null,
  });

  renderShiftPageWithState({ justClosedShiftAt: Date.now() });

  const closeDayButton = await screen.findByRole('button', { name: /close day/i });
  await waitFor(() => {
    expect(closeDayButton.className).toContain('animate-pulse');
  });
});

test('F4: Close Day section remains visible even after Open Shift error', async () => {
  mockGetPreviousDayStatus.mockResolvedValue({
    data: { hasPreviousDay: false, todayClosedShiftsCount: 2 },
    error: null,
  });

  renderShiftPageWithState();

  const staffButton = await screen.findByRole('button', { name: /alice/i });
  fireEvent.click(staffButton);

  const openShiftButton = screen.getByRole('button', { name: /open shift/i });
  fireEvent.click(openShiftButton);

  await waitFor(() => {
    expect(screen.getByText('An open shift already exists.')).toBeInTheDocument();
  });

  expect(screen.getByRole('button', { name: /close day/i })).toBeInTheDocument();
});

test('F5: shows Close Stale Shifts action in previous-day blocked banner', async () => {
  mockGetPreviousDayStatus.mockResolvedValue({
    data: { hasPreviousDay: true, previousDate: '2026-07-27', isClosed: false, todayClosedShiftsCount: 0 },
    error: null,
  });

  renderShiftPageWithState();

  expect(await screen.findByRole('button', { name: /close stale shifts/i })).toBeInTheDocument();
});

test('F6: shows stale-first guidance when previous day is blocked', async () => {
  mockGetPreviousDayStatus.mockResolvedValue({
    data: { hasPreviousDay: true, previousDate: '2026-07-27', isClosed: false, todayClosedShiftsCount: 0 },
    error: null,
  });

  renderShiftPageWithState();

  expect(
    await screen.findByText('Close stale shifts first, then close the business day.')
  ).toBeInTheDocument();
});

test('F7: lifecycle invalidation state keeps user on shift page without bouncing to order', async () => {
  const detectActiveShift = vi.fn().mockResolvedValue({
    shift: {
      id: 'shift-1',
      staff_id: 'staff-1',
      date: '2026-07-30',
      started_at: Date.now(),
      ended_at: null,
      status: 'open',
    },
    staff: { id: 'staff-1', name: 'Alice', role: 'staff', status: 'active' },
    orphaned: [],
  });
  const openShift = vi.fn();

  mockUseShift.mockReturnValue({
    openShift,
    currentShift: null,
    currentStaff: null,
    detectActiveShift,
  });
  mockGetPreviousDayStatus.mockResolvedValue({
    data: { hasPreviousDay: false, todayClosedShiftsCount: 0 },
    error: null,
  });

  renderShiftPageWithState({
    lifecycleError: 'Shift belongs to a previous business day and can no longer be used.',
    invalidatedAt: Date.now(),
  });

  await screen.findByRole('button', { name: /alice/i });

  expect(detectActiveShift).not.toHaveBeenCalled();
  expect(openShift).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalledWith(
    expect.stringContaining('/pos/order'),
    expect.anything()
  );
});

test('F8: disables Close Day after a successful close and opens the result modal', async () => {
  mockGetPreviousDayStatus.mockResolvedValue({
    data: { hasPreviousDay: false, todayClosedShiftsCount: 2 },
    error: null,
  });

  renderShiftPageWithState();

  const closeDayButton = await screen.findByRole('button', { name: /close day/i });
  fireEvent.click(closeDayButton);

  fireEvent.click(await screen.findByRole('button', { name: /complete day close/i }));

  expect(await screen.findByTestId('day-close-result-modal')).toBeInTheDocument();
  expect(screen.getByText('2026-07-27')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /close day/i })).toBeDisabled();
});

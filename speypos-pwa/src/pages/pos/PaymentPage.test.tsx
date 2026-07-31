import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PaymentPage from './PaymentPage';

const mocks = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseShift: vi.fn(),
  mockUseConnectionStatus: vi.fn(),
  mockUpdateToPaying: vi.fn(),
  mockUpdateToCompleted: vi.fn(),
  mockOpenShiftFlow: vi.fn(),
  mockToast: vi.fn(),
  mockInvalidateCurrentShift: vi.fn(),
  mockFormat: vi.fn((value: number) => `KHR ${value}`),
  mockNormalizeInput: vi.fn((value: number) => value),
  mockToDisplayValue: vi.fn((value: number) => String(value)),
  mockGetMinorUnit: vi.fn(() => 0),
  mockGenerateQuickAmounts: vi.fn(() => []),
  mockTranslation: vi.fn(),
  mockCreateOrder: vi.fn(),
  mockPayOrder: vi.fn(),
  mockPrintReceipt: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.mockNavigate,
  };
});

vi.mock('@/contexts/ShiftContext', () => ({
  useShift: () => mocks.mockUseShift(),
}));

vi.mock('@/hooks/useApi', () => ({
  useConnectionStatus: () => mocks.mockUseConnectionStatus(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mocks.mockToast }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: mocks.mockToast,
}));

vi.mock('@/hooks/useShiftCloseFlow', () => ({
  useShiftCloseFlow: () => ({
    openClosePreview: mocks.mockOpenShiftFlow,
  }),
}));

vi.mock('@/hooks/useDisplaySession', () => ({
  useDisplaySession: () => ({
    updateToPaying: mocks.mockUpdateToPaying,
    updateToCompleted: mocks.mockUpdateToCompleted,
  }),
}));

vi.mock('@/lib/currency', () => ({
  useCurrency: () => ({
    format: mocks.mockFormat,
    normalizeInput: mocks.mockNormalizeInput,
    toDisplayValue: mocks.mockToDisplayValue,
    symbol: 'KHR',
    getMinorUnit: mocks.mockGetMinorUnit,
    generateQuickAmounts: mocks.mockGenerateQuickAmounts,
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => mocks.mockTranslation(),
}));

vi.mock('@/lib/api', () => ({
  orderApi: {
    createOrder: (...args: any[]) => mocks.mockCreateOrder(...args),
    payOrder: (...args: any[]) => mocks.mockPayOrder(...args),
    printReceipt: (...args: any[]) => mocks.mockPrintReceipt(...args),
    voidOrder: vi.fn(),
  },
}));

vi.mock('@/components/pos/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('@/components/pos/ShiftCloseFlowModal', () => ({
  ShiftCloseFlowModal: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();

  mocks.mockUseShift.mockReturnValue({
    currentShift: { id: 'shift-1' },
    currentStaff: { id: 'staff-1' },
    isLoading: false,
    invalidateCurrentShift: mocks.mockInvalidateCurrentShift,
  });
  mocks.mockUseConnectionStatus.mockReturnValue({ isConnected: true });
  mocks.mockUpdateToPaying.mockResolvedValue(undefined);
  mocks.mockUpdateToCompleted.mockResolvedValue(undefined);
  mocks.mockOpenShiftFlow.mockReturnValue(undefined);
  mocks.mockGenerateQuickAmounts.mockReturnValue([]);

  mocks.mockTranslation.mockReturnValue({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        'payment.backToOrder': 'Back to Order',
        'payment.cash': 'Cash',
        'payment.qrCode': 'QR Code',
        'payment.amountDue': 'Amount Due',
        'payment.confirm': 'Confirm Payment',
        'payment.orderSummary': 'Order Summary',
        'payment.received': 'Received',
        'payment.change': 'Change',
        'payment.exact': 'Exact',
        'payment.payNow': 'Pay Now',
        'payment.offlineMode': 'Offline Mode',
      };
      return dictionary[key] ?? key;
    },
  });

  mocks.mockCreateOrder.mockResolvedValue({
    data: { id: 'order-1' },
    error: null,
    errorCode: null,
  });
  mocks.mockPayOrder.mockResolvedValue({
    data: { id: 'order-1' },
    error: null,
    errorCode: null,
  });
  mocks.mockPrintReceipt.mockResolvedValue({
    data: null,
    error: null,
  });
});

function renderPaymentPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/pos/payment',
          search: '?shiftId=shift-1',
          state: {
            orderItems: [
              {
                menu_item_id: 'menu-1',
                quantity: 1,
                unit_price: 2500,
                customizations: [],
                toppings: [],
              },
            ],
            orderTotal: 2500,
            customerType: 'dine-in',
          },
        },
      ]}
    >
      <PaymentPage />
    </MemoryRouter>
  );
}

test('payment completion navigates without waiting on receipt printing', async () => {
  renderPaymentPage();

  const confirmButton = screen.getByRole('button', { name: /confirm payment/i });
  fireEvent.click(confirmButton);

  await waitFor(() => {
    expect(mocks.mockPayOrder).toHaveBeenCalledWith('order-1', {
      payment_type: 'cash',
      amount: 2500,
      received_cash: 2500,
      change: 0,
    });
  });

  await waitFor(() => {
    expect(mocks.mockUpdateToCompleted).toHaveBeenCalled();
    expect(mocks.mockNavigate).toHaveBeenCalledWith(
      '/pos/complete?shiftId=shift-1&orderId=order-1',
      expect.objectContaining({
        state: expect.objectContaining({
          orderId: 'order-1',
          total: 2500,
          received: 2500,
          change: 0,
          paymentType: 'cash',
        }),
      })
    );
  });

  expect(mocks.mockPrintReceipt).not.toHaveBeenCalled();
});

test('payment lifecycle failure invalidates the current shift and does not navigate', async () => {
  mocks.mockCreateOrder.mockResolvedValue({
    data: null,
    error: 'Orders can only be created for an open shift.',
    errorCode: 'SHIFT_NOT_OPEN',
  });

  renderPaymentPage();

  const confirmButton = screen.getByRole('button', { name: /confirm payment/i });
  fireEvent.click(confirmButton);

  await waitFor(() => {
    expect(mocks.mockInvalidateCurrentShift).toHaveBeenCalledWith(
      'Orders can only be created for an open shift.'
    );
  });

  expect(mocks.mockNavigate).not.toHaveBeenCalledWith(
    expect.stringContaining('/pos/complete'),
    expect.anything()
  );
});

test('SHIFT_NOT_CURRENT_BUSINESS_DAY redirects to shift page with lifecycle invalidation', async () => {
  mocks.mockCreateOrder.mockResolvedValue({
    data: null,
    error: 'Shift belongs to a previous business day and can no longer be used.',
    errorCode: 'SHIFT_NOT_CURRENT_BUSINESS_DAY',
  });

  renderPaymentPage();

  const confirmButton = screen.getByRole('button', { name: /confirm payment/i });
  fireEvent.click(confirmButton);

  await waitFor(() => {
    expect(mocks.mockInvalidateCurrentShift).toHaveBeenCalledWith(
      'Shift belongs to a previous business day and can no longer be used.'
    );
  });

  await waitFor(() => {
    expect(mocks.mockNavigate).toHaveBeenCalledWith(
      '/pos/shift',
      expect.objectContaining({
        replace: true,
        state: expect.objectContaining({
          lifecycleError: 'Shift belongs to a previous business day and can no longer be used.',
        }),
      })
    );
  });
});

test('stale business-day message redirects to shift page even without errorCode', async () => {
  mocks.mockCreateOrder.mockResolvedValue({
    data: null,
    error: 'Shift belongs to a previous business day and can no longer be used.',
    errorCode: null,
  });

  renderPaymentPage();

  const confirmButton = screen.getByRole('button', { name: /confirm payment/i });
  fireEvent.click(confirmButton);

  await waitFor(() => {
    expect(mocks.mockInvalidateCurrentShift).toHaveBeenCalledWith(
      'Shift belongs to a previous business day and can no longer be used.'
    );
  });

  await waitFor(() => {
    expect(mocks.mockNavigate).toHaveBeenCalledWith(
      '/pos/shift',
      expect.objectContaining({ replace: true })
    );
  });

  expect(mocks.mockNavigate).not.toHaveBeenCalledWith(
    expect.stringContaining('/pos/complete'),
    expect.anything()
  );
});
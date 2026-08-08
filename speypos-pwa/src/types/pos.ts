// Core POS Types

export interface MenuCategory {
  id: string;
  name: string;
  image_url?: string;
  sort_order?: number;
  cup_size_id?: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  category_ids?: string[];
  cup_size_id?: string | null;
}

export interface CupSize {
  id: string;
  size: string;
  unit: string;
  created_at?: number;
  updated_at?: number;
}

// Legacy customization type (kept for order items)
export interface Customization {
  id: string;
  name: string;
  price: number;
  group?: string;
  option_type?: string | null;
  value?: string;
  cup_size_id?: string | null;
}

// New customization option group (from DB)
export interface CustomizationOptionGroup {
  id: string;
  name: string;
  selection_type: 'single' | 'multiple';
  required: boolean;
  sort_order: number;
  default_option_id?: string;
  created_at?: number;
  updated_at?: number;
}

// New customization option (from DB)
export interface CustomizationOption {
  id: string;
  customization_group_id: string;
  label: string;
  cup_size_id?: string | null;
  price_delta: number; // in cents
  sort_order: number;
  created_at?: number;
  updated_at?: number;
}

// Menu item to customization group mapping
export interface MenuItemCustomizationGroup {
  id: string;
  menu_item_id: string;
  customization_group_id: string;
}

// Topping Group (e.g., "Add-ons", "Extra Syrup")
export interface ToppingGroup {
  id: string;
  name: string;
  required: boolean;
  sort_order: number;
  created_at?: number;
  updated_at?: number;
}

// Topping Option (e.g., "Extra Shot" at $0.50/qty)
export interface ToppingOption {
  id: string;
  topping_group_id: string;
  label: string;
  unit_label: string;
  unit_price: number;
  min_quantity: number;
  max_quantity: number | null;
  step_quantity: number;
  sort_order: number;
  created_at?: number;
  updated_at?: number;
}

// Menu item to topping group mapping
export interface MenuItemToppingGroup {
  id: string;
  menu_item_id: string;
  topping_group_id: string;
}

// Menu category to topping group mapping
export interface MenuCategoryToppingGroup {
  id: string;
  menu_category_id: string;
  topping_group_id: string;
}

// Order item topping snapshot
export interface OrderItemTopping {
  topping_option_id: string;
  name: string;
  unit_label: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  customizations: Customization[];
  toppings: OrderItemTopping[];
  subtotal: number;
}

export interface Order {
  id?: string;
  order_number?: number;
  shift_id: string;
  staff_id: string;
  customer_type?: 'dine-in' | 'take-away';
  items: OrderItem[];
  total: number;
  total_amount?: number; // API returns this in cents
  total_items?: number; // API returns total item count
  status: 'pending' | 'completed' | 'cancelled' | 'voided';
  created_at?: number; // Unix timestamp in milliseconds
  cloud_sync_at?: string | null;
  void_reason?: 'mistake' | 'staff_consumption' | 'other';
  void_note?: string;
  voided_at?: number;
  voided_by?: string;
  authorized_by?: string;
  authorized_by_staff?: { id: string; name: string | null } | null;
}

export interface TotpStatus {
  enrolled: boolean;
  enrolled_at: number | null;
}

export interface TotpEnrollment {
  otpauth_url: string;
  qr_data_url: string;
  secret: string;
}

export interface AuthorizationGrantRequest {
  admin_staff_id: string;
  code: string;
  action: string;
  resource_type: string;
  resource_id: string;
  requested_by_staff_id: string;
  reason?: string;
}

export interface AuthorizationGrantResponse {
  granted: boolean;
  expires_at: number;
}

export interface Staff {
  id: string;
  name: string;
  password?: string;
  role: 'admin' | 'staff';
  status: 'active' | 'inactive';
  created_at?: number;
  updated_at?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  staff: Staff | null;
  isAdmin: boolean;
}

export interface MenuItemCategoryMap {
  id: string;
  menu_item_id: string;
  menu_category_id: string;
}

export interface MenuItemCupSizeMap {
  id: string;
  menu_item_id: string;
  cup_size_id: string;
}

// Menu category to customization group mapping
export interface MenuCategoryCustomizationGroup {
  id: string;
  menu_category_id: string;
  customization_group_id: string;
}

export interface MenuCategoryCupSizeMap {
  id: string;
  menu_category_id: string;
  cup_size_id: string;
}

export interface Shift {
  id: string;
  staff_id: string;
  staff_name?: string;
  date: string;
  started_at: number;
  ended_at?: number;
  status: 'open' | 'closed';
  business_day_id?: string | null;
  business_day_status?: BusinessDayStatus | null;
  staff?: Staff;
}

export type BusinessDayStatus = 'OPEN' | 'CLOSING' | 'CLOSED';

export interface BusinessDay {
  id: string;
  store_id: string;
  business_date: string;
  status: BusinessDayStatus;
  opened_at: number;
  closed_at?: number | null;
  opened_by_staff_id?: string | null;
  closed_by_staff_id?: string | null;
  close_report_ref?: string | null;
}

// Day close preview response
export interface DayClosePreviewResponse {
  businessDate: string;
  business_day_id?: string | null;
  business_day_status?: BusinessDayStatus | null;
  shifts: DayCloseShiftSummary[];
  cupSizeSummary: CupSizeSummary[];
}

export interface CupSizeSummary {
  id: string | null;
  name: string;
  quantity: number;
}

export type DayCloseStatusReason = 'DAY_ALREADY_CLOSED' | 'DAY_NOT_READY' | 'NO_SHIFTS' | null;

export interface DayCloseStatusResponse {
  businessDate: string;
  business_day_id: string | null;
  business_day_status: BusinessDayStatus;
  totalShifts: number;
  openShiftsCount: number;
  isCloseable: boolean;
  reason: DayCloseStatusReason;
}

export interface DayCloseShiftReport {
  shift: Shift;
  totalOrders: number;
  totalRevenue: number;
  totalItems: number;
  revenueByPaymentType: Record<string, number>;
  cupSizeSummary: CupSizeSummary[];
  voidedOrders: number;
  voidedAmount: number;
  voidedItems: number;
  netRevenue: number;
}

export interface DayCloseCombinedSummary {
  totalOrders: number;
  totalRevenue: number;
  totalItems: number;
  revenueByPaymentType: Record<string, number>;
  cupSizeSummary: CupSizeSummary[];
  grandTotalItems: number;
  voidedOrders: number;
  voidedAmount: number;
  voidedItems: number;
  netRevenue: number;
}

export interface DayCloseResponse {
  businessDate: string;
  shiftSummaries: DayCloseShiftReport[];
  combinedSummary: DayCloseCombinedSummary;
  business_day_id?: string | null;
  business_day_status?: BusinessDayStatus | null;
}

export type DayCloseCompletionStatus = 'closed' | 'already-closed';

export interface DayCloseCompletion {
  status: DayCloseCompletionStatus;
  businessDate: string;
  business_day_status?: BusinessDayStatus | null;
  response?: DayCloseResponse | null;
  message?: string;
}

export interface DayCloseShiftSummary {
  id: string;
  status: string;
  staff?: Staff;
  started_at?: number;
  ended_at?: number;
  orders: Order[];
  cupSizeSummary: CupSizeSummary[];
}

export interface ShiftSalesReport {
  shift: Shift;
  totalOrders: number;
  totalRevenue: number;
  totalItems: number;
  revenueByPaymentType: Record<string, number>;
  cupSizeSummary: CupSizeSummary[];
  voidedOrders: number;
  voidedAmount: number;
  voidedItems: number;
  netRevenue: number;
}

export interface Payment {
  payment_type: 'cash';
  amount: number;
  received_cash: number;
  change: number;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface PendingActionsStatus {
  hasUnprintedOrders: boolean;
  unprintedOrdersCount: number;
  hasUnreportedOrders: boolean;
  unreportedOrdersCount: number;
  hasUnreportedShifts: boolean;
  unreportedShiftsCount: number;
}

export interface PreviousDayStatus {
  hasPreviousDay: boolean;
  previousDate?: string;
  previous_business_day_id?: string;
  previous_business_day_status?: BusinessDayStatus;
  isClosed?: boolean;
  closedAt?: number | null;
  todayClosedShiftsCount: number;
  isEnforced?: boolean;
  enforcementStartDate?: string | null;
}

export interface Setting {
  id: string;
  key: string;
  value: any;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
}

// Telegram Intent configuration
export interface TelegramIntent {
  intent: 'ORDER_TRACKER' | 'SHIFT_TRACKER';
  enabled: boolean;
  chat_id: string | null;
}

// Extended order type for Order History display
export interface OrderWithDetails extends Order {
  staff_name?: string;
  payment?: Payment;
}

// UI State Types
export type POSScreen = 'shift' | 'order' | 'payment' | 'complete';

// UI-local customization types (used in CustomizationModal for demo)
export interface UICustomizationOption {
  id: string;
  name: string;
  price: number;
  group: string;
  isDefault?: boolean;
  cup_size_id?: string | null;
}

export interface CustomizationGroup {
  id?: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  default_option_id?: string;
  options: UICustomizationOption[];
}

// Customer Display API response types
export type DisplayScreenState = 'IDLE' | 'ORDERING' | 'PAYING' | 'COMPLETED';

export interface DisplayOrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  customizations: Array<{ name: string; price: number }>;
  subtotal: number;
}

export interface CustomerDisplayState {
  state: DisplayScreenState;
  items?: DisplayOrderItem[];
  total?: number;
  received_cash?: number;
  change?: number;
  payment_type?: 'cash' | 'qr';
}

// Receipt printing configuration
export interface ReceiptCopyConfig {
  variant: string;
  count: number;
}

// Versioned Settings Wrappers (v1)
export interface ReceiptCopiesSettingV1 {
  version: 1;
  copies: ReceiptCopyConfig[];
}

// Payment Profile (Store-level QR payment configuration)
export interface PaymentQrConfig {
  enabled: boolean;
  image_url: string | null;
}

export interface PaymentProfileV1 {
  version: 1;
  qr: PaymentQrConfig;
}

export interface TelegramIntentsSettingV1 {
  version: 1;
  intents: TelegramIntent[];
}

// Store entity (owns currency, language, timezone)
export interface Store {
  id: string;
  name: string;
  language: string;
  currency: string;
  timezone: string;
  brand_name?: string;
  logo_url?: string;
  address?: string;
  payment_profile?: PaymentProfileV1;
  created_at?: number;
  updated_at?: number;
}

export interface CloudSyncSettingV1 {
  version: 1;
  enabled: boolean;
  api_key: string;
  base_url: string;
}

export interface StoreUpdate {
  name?: string;
  language?: string;
  currency?: string;
  timezone?: string;
  brand_name?: string;
  logo_url?: string;
  address?: string;
  payment_profile?: PaymentProfileV1;
}

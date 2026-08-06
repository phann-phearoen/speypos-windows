import { getDb } from '../database.js';
import { randomUUID } from 'crypto';
import { logger } from '../../utils/logger.js';
import { getNowInStoreTime, getStoreDateFromUtcDate } from '../../services/time.service.js';

function createShiftLifecycleError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function withSqliteBusyRetry(operation, { maxRetries = 2 } = {}) {
  let attempt = 0;

  while (true) {
    try {
      return operation();
    } catch (error) {
      const isLockError = error?.code === 'SQLITE_BUSY' || error?.code === 'SQLITE_LOCKED';
      if (!isLockError || attempt >= maxRetries) {
        throw error;
      }
      attempt += 1;
    }
  }
}

/**
 * Retrieves all shifts from the database.
 * @returns {Array<object>} A list of all shifts.
 */
export function getAllShifts(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM Shift';
  const params = [];
  const conditions = [];

  if (filters.date) {
    conditions.push('date = ?');
    params.push(filters.date);
  }

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  if (filters.business_day_id) {
    conditions.push('business_day_id = ?');
    params.push(filters.business_day_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY started_at ASC';
  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Retrieves a single shift by its ID.
 * @param {string} id - The ID of the shift.
 * @returns {object} The shift object or undefined if not found.
 */
export function getShiftById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM Shift WHERE id = ?');
  return stmt.get(id);
}

/**
 * Resolves the active shift for the store-local current business date.
 * If multiple rows are open for the same date, the most recently started shift is used.
 * @returns {object | undefined}
 */
export function getActiveShiftForNow() {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const stmt = db.prepare(
    `SELECT *
     FROM Shift
     WHERE status = 'open' AND date = ?
     ORDER BY started_at DESC, id DESC
     LIMIT 1`
  );
  return stmt.get(todayStoreDate);
}

/**
 * Returns true when the shift exists and is closed.
 * @param {string} shiftId
 * @returns {boolean}
 */
export function isShiftClosed(shiftId) {
  const shift = getShiftById(shiftId);
  return !!shift && shift.status === 'closed';
}

/**
 * Creates a new shift.
 * @param {object} shiftData - The data for the new shift.
 * @returns {object} The newly created shift.
 */
export function createShift(shiftData) {
  const db = getDb();
  const { id, status, started_at, ended_at, date, business_day_id = null } = shiftData;
  const stmt = db.prepare(
    `INSERT INTO Shift (id, status, started_at, ended_at, date, business_day_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  stmt.run(id, status, started_at, ended_at, date, business_day_id);
  return getShiftById(id);
}

/**
 * Updates an existing shift with partial data.
 * @param {string} id - The ID of the shift to update.
 * @param {object} shiftData - An object containing the fields to update.
 * @returns {object} The updated shift.
 */
export function updateShift(id, shiftData) {
  const db = getDb();

  const fields = Object.keys(shiftData);
  const values = Object.values(shiftData);

  if (fields.length === 0) {
    return getShiftById(id);
  }

  const setClause = fields.map((field) => `${field} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE Shift SET ${setClause} WHERE id = ?`);

  stmt.run(...values, id);
  return getShiftById(id);
}

/**
 * Deletes a shift.
 * @param {string} id - The ID of the shift to delete.
 * @returns {import('better-sqlite3').RunResult} The result of the delete operation.
 */
export function deleteShift(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM Shift WHERE id = ?');
  return stmt.run(id);
}

/**
 * Creates a new shift and assigns a staff member to it in a single transaction.
 * @param {string} staffId The ID of the staff member opening the shift.
 * @param {object} shiftData The data for the new shift (e.g., date).
 * @returns {object} The newly created shift object.
 */
export function openShiftForStaff(staffId, shiftContext = {}) {
  const db = getDb();
  const { utcDate, todayStoreDate } = getNowInStoreTime();
  const started_at = utcDate.getTime(); // Store pure UTC timestamp
  const date = shiftContext.businessDate || todayStoreDate; // Use the store's 'YYYY-MM-DD'
  const businessDayId = shiftContext.business_day_id || null;

  const transaction = db.transaction(() => {
    // 1. Create the Shift
    const shiftId = randomUUID();
    const createShiftStmt = db.prepare(
      `INSERT INTO Shift (id, status, started_at, ended_at, date, business_day_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    createShiftStmt.run(shiftId, 'open', started_at, null, date, businessDayId);

    // 2. Create the StaffShift mapping
    const createMapStmt = db.prepare(
      'INSERT INTO StaffShift (id, shift_id, staff_id) VALUES (?, ?, ?)'
    );
    createMapStmt.run(randomUUID(), shiftId, staffId);

    return shiftId;
  });

  const newShiftId = transaction();
  return getShiftById(newShiftId);
}

/**
 * Atomically closes stale open shifts, verifies no open shift exists for the target date,
 * and opens a new shift for staff.
 */
export function openShiftForStaffGuarded({
  staffId,
  businessDate,
  businessDayId = null,
  nowUtcMillis = Date.now(),
  maxRetries = 2,
} = {}) {
  const db = getDb();

  if (!staffId) {
    throw new Error('staffId is required');
  }

  if (!businessDate) {
    throw new Error('businessDate is required');
  }

  const transaction = db.transaction(() => {
    const closeOrphansResult = db
      .prepare(
        `UPDATE Shift
         SET status = 'closed', ended_at = ?
         WHERE status = 'open' AND date <> ?`
      )
      .run(nowUtcMillis, businessDate);

    const existingOpen = db
      .prepare(
        `SELECT id
         FROM Shift
         WHERE status = 'open' AND date = ?
         ORDER BY started_at DESC, id DESC
         LIMIT 1`
      )
      .get(businessDate);

    if (existingOpen) {
      throw createShiftLifecycleError(
        'OPEN_SHIFT_EXISTS',
        `An open shift already exists for business date ${businessDate}.`,
        {
          status: 409,
          existingShiftId: existingOpen.id,
          businessDate,
        }
      );
    }

    const shiftId = randomUUID();
    db.prepare(
      `INSERT INTO Shift (id, status, started_at, ended_at, date, business_day_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(shiftId, 'open', nowUtcMillis, null, businessDate, businessDayId);

    db.prepare('INSERT INTO StaffShift (id, shift_id, staff_id) VALUES (?, ?, ?)').run(
      randomUUID(),
      shiftId,
      staffId
    );

    return {
      shiftId,
      orphanClosedCount: closeOrphansResult.changes || 0,
    };
  });

  const result = withSqliteBusyRetry(() => transaction(), { maxRetries });
  return {
    shift: getShiftById(result.shiftId),
    orphanClosedCount: result.orphanClosedCount,
  };
}

/**
 * Finds all closed shifts that have not been reported to Telegram yet.
 * @returns {Array<object>} A list of unreported shifts.
 */
export function findUnreportedForTelegram() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM Shift WHERE telegram_reported_at IS NULL AND status = ?');
  return stmt.all('closed');
}

/**
 * Finds closed/unreported shifts eligible for telegram retry.
 * When requireClosedBusinessDay is true, only shifts tied to CLOSED business days
 * (or legacy DayClose rows for pre-link data) are returned.
 */
export function findUnreportedForTelegramEligible({ requireClosedBusinessDay = false } = {}) {
  const db = getDb();

  if (!requireClosedBusinessDay) {
    return findUnreportedForTelegram();
  }

  const stmt = db.prepare(
    `SELECT s.*
     FROM Shift s
     LEFT JOIN BusinessDay bd ON bd.id = s.business_day_id
     LEFT JOIN DayClose dc ON dc.date = s.date
     WHERE s.telegram_reported_at IS NULL
       AND s.status = 'closed'
       AND (
         (s.business_day_id IS NOT NULL AND bd.status = 'CLOSED')
         OR
         (s.business_day_id IS NULL AND dc.date IS NOT NULL)
       )`
  );

  return stmt.all();
}

/**
 * Marks a shift as reported to Telegram by setting the current timestamp.
 * @param {string} id - The ID of the shift to update.
 * @returns {object} The updated shift.
 */
export function markAsTelegramReported(id) {
  const db = getDb();
  const stmt = db.prepare('UPDATE Shift SET telegram_reported_at = unixepoch() WHERE id = ?');
  stmt.run(id);
  return getShiftById(id);
}

function getCupSizeSummaryForShift(shiftId) {
  const db = getDb();
  const rows = db.prepare(
    `WITH shift_items AS (
       SELECT oi.id AS order_item_id, oi.menu_item_id, oi.quantity
       FROM OrderItem oi
       JOIN "Order" o ON o.id = oi.order_id
       WHERE o.shift_id = ? AND o.status = 'completed'
     ),
     canonical_cup AS (
       SELECT order_item_id, cup_size_id, cup_size_label
       FROM (
         SELECT
           oc.order_item_id,
           cs.id AS cup_size_id,
           cs.size || ' ' || cs.unit AS cup_size_label,
           ROW_NUMBER() OVER (PARTITION BY oc.order_item_id ORDER BY oc.rowid DESC, oc.id DESC) AS row_number
         FROM OrderCustomization oc
         JOIN CupSize cs ON cs.id = oc.value
         WHERE oc.option_type = 'cup_size'
       )
       WHERE row_number = 1
     ),
     item_map_cup AS (
       SELECT order_item_id, cup_size_id, cup_size_label
       FROM (
         SELECT
           si.order_item_id,
           cs.id AS cup_size_id,
           cs.size || ' ' || cs.unit AS cup_size_label,
           ROW_NUMBER() OVER (
             PARTITION BY si.order_item_id
             ORDER BY cs.created_at ASC, micm.id ASC, cs.id ASC
           ) AS row_number
         FROM shift_items si
         JOIN MenuItemCupSizeMap micm ON micm.menu_item_id = si.menu_item_id
         JOIN CupSize cs ON cs.id = micm.cup_size_id
       )
       WHERE row_number = 1
     ),
     category_map_cup AS (
       SELECT order_item_id, cup_size_id, cup_size_label
       FROM (
         SELECT
           si.order_item_id,
           cs.id AS cup_size_id,
           cs.size || ' ' || cs.unit AS cup_size_label,
           ROW_NUMBER() OVER (
             PARTITION BY si.order_item_id
             ORDER BY micm.menu_category_id ASC, cs.created_at ASC, mccsm.id ASC, cs.id ASC
           ) AS row_number
         FROM shift_items si
         JOIN MenuItemCategoryMap micm ON micm.menu_item_id = si.menu_item_id
         JOIN MenuCategoryCupSizeMap mccsm ON mccsm.menu_category_id = micm.menu_category_id
         JOIN CupSize cs ON cs.id = mccsm.cup_size_id
       )
       WHERE row_number = 1
     ),
     resolved_cup_sizes AS (
       SELECT
         COALESCE(canonical_cup.cup_size_id, item_map_cup.cup_size_id, category_map_cup.cup_size_id) AS cup_size_id,
         COALESCE(canonical_cup.cup_size_label, item_map_cup.cup_size_label, category_map_cup.cup_size_label, 'Unknown') AS name,
         shift_items.quantity
       FROM shift_items
       LEFT JOIN canonical_cup ON canonical_cup.order_item_id = shift_items.order_item_id
       LEFT JOIN item_map_cup ON item_map_cup.order_item_id = shift_items.order_item_id
       LEFT JOIN category_map_cup ON category_map_cup.order_item_id = shift_items.order_item_id
     )
     SELECT cup_size_id, name, SUM(quantity) AS quantity
     FROM resolved_cup_sizes
     GROUP BY cup_size_id, name
     ORDER BY
       CASE WHEN cup_size_id IS NULL THEN 1 ELSE 0 END,
       CAST(name AS REAL) ASC,
       name ASC`
  ).all(shiftId);

  return rows.map((row) => ({
    id: row.cup_size_id || null,
    name: row.name,
    quantity: row.quantity,
  }));
}

/**
 * Generates a sales report for a given shift.
 * @param {string} shiftId - The ID of the shift.
 * @returns {object} An object containing the report data.
 */
export function getShiftSalesReport(shiftId) {
  const db = getDb();

  // 1. Get the shift details
  const shift = getShiftById(shiftId);
  if (!shift) {
    // In a real app, you might throw an error, but returning null is also an option
    // if the controller is prepared to handle it.
    logger.warn(`Shift with ID ${shiftId} not found when generating sales report.`);
    return null;
  }

  // 2. Get all completed orders for the shift to calculate revenue
  const ordersStmt = db.prepare(`
    SELECT o.status, o.total_amount, o.total_items, p.payment_type
    FROM "Order" o
    LEFT JOIN Payment p ON o.id = p.order_id
    WHERE o.shift_id = ? AND o.status IN ('completed', 'voided')
  `);
  const orders = ordersStmt.all(shiftId);

  const completedOrders = orders.filter((order) => order.status === 'completed');
  const voidedOrders = orders.filter((order) => order.status === 'voided');

  // 3. Calculate totals
  const totalOrders = completedOrders.length;
  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const totalItems = completedOrders.reduce((sum, order) => sum + order.total_items, 0);

  const voidedAmount = voidedOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const voidedItems = voidedOrders.reduce((sum, order) => sum + order.total_items, 0);
  const netRevenue = totalRevenue - voidedAmount;

  // 4. Calculate revenue by payment type (completed orders only)
  const revenueByPaymentType = completedOrders.reduce((acc, order) => {
    const type = order.payment_type || 'unknown';
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += order.total_amount;
    return acc;
  }, {});

  const cupSizeSummary = getCupSizeSummaryForShift(shiftId);

  return {
    shift,
    totalOrders,
    totalRevenue,
    totalItems,
    revenueByPaymentType,
    cupSizeSummary,
    voidedOrders: voidedOrders.length,
    voidedAmount,
    voidedItems,
    netRevenue,
  };
}

// ─── DayClose helpers ────────────────────────────────────────────────────────

export function insertDayClose(date) {
  const db = getDb();
  const result = db
    .prepare('INSERT OR IGNORE INTO DayClose (date, closed_at) VALUES (?, ?)')
    .run(date, Date.now());
  return result.changes > 0;
}

export function getDayClose(date) {
  const db = getDb();
  return db.prepare('SELECT * FROM DayClose WHERE date = ?').get(date) || null;
}

export function getLastBusinessDateBefore(date) {
  const db = getDb();
  const row = db
    .prepare('SELECT MAX(date) as date FROM Shift WHERE date < ?')
    .get(date);
  return row?.date || null;
}

export function getClosedShiftsCountForDate(date) {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM Shift WHERE date = ? AND status = 'closed'")
    .get(date);
  return row?.count || 0;
}

/**
 * Returns the store-date from which previous-day close enforcement should start.
 * Day-0 enforcement uses the migration day itself as the start.
 * @returns {string|null}
 */
export function getDayCloseEnforcementStartDate() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT applied_at
       FROM _migrations
       WHERE name IN ('003_day_closes.sql', '004_backfill_day_closes.sql')
       ORDER BY version ASC
       LIMIT 1`
    )
    .get();

  if (!row?.applied_at) {
    return null;
  }

  const appliedAtUtc = new Date(row.applied_at);
  return getStoreDateFromUtcDate(appliedAtUtc);
}

import { randomUUID } from 'crypto';
import { getDb } from '../database.js';

const DEFAULT_STORE_ID = 'default';

export const BUSINESS_DAY_STATUS = Object.freeze({
  OPEN: 'OPEN',
  CLOSING: 'CLOSING',
  CLOSED: 'CLOSED',
});

export function getBusinessDayById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM BusinessDay WHERE id = ?').get(id) || null;
}

export function getByBusinessDate(storeId = DEFAULT_STORE_ID, businessDate) {
  const db = getDb();
  return (
    db
      .prepare('SELECT * FROM BusinessDay WHERE store_id = ? AND business_date = ?')
      .get(storeId, businessDate) || null
  );
}

/**
 * Creates an OPEN business day, returning an existing row if a concurrent insert won.
 * This gives us idempotent behavior for callers that race to create the same day.
 */
export function createOpenDay({
  storeId = DEFAULT_STORE_ID,
  businessDate,
  openedAt = Date.now(),
  openedByStaffId = null,
  now = Date.now(),
} = {}) {
  const db = getDb();

  if (!businessDate) {
    throw new Error('businessDate is required');
  }

  const id = randomUUID();

  try {
    db.prepare(
      `INSERT INTO BusinessDay (
        id,
        store_id,
        business_date,
        status,
        opened_at,
        closed_at,
        opened_by_staff_id,
        closed_by_staff_id,
        close_report_ref,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      storeId,
      businessDate,
      BUSINESS_DAY_STATUS.OPEN,
      openedAt,
      null,
      openedByStaffId,
      null,
      null,
      now,
      null
    );

    return getBusinessDayById(id);
  } catch (error) {
    // UNIQUE(store_id, business_date) conflict -> a concurrent writer already created it.
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return getByBusinessDate(storeId, businessDate);
    }
    throw error;
  }
}

export function transitionStatus(
  dayId,
  fromStatus,
  toStatus,
  { closedAt = null, closedByStaffId = null, closeReportRef = null, now = Date.now() } = {}
) {
  const db = getDb();

  const result = db
    .prepare(
      `UPDATE BusinessDay
       SET
         status = ?,
         closed_at = CASE WHEN ? IS NULL THEN closed_at ELSE ? END,
         closed_by_staff_id = CASE WHEN ? IS NULL THEN closed_by_staff_id ELSE ? END,
         close_report_ref = CASE WHEN ? IS NULL THEN close_report_ref ELSE ? END,
         updated_at = ?
       WHERE id = ? AND status = ?`
    )
    .run(
      toStatus,
      closedAt,
      closedAt,
      closedByStaffId,
      closedByStaffId,
      closeReportRef,
      closeReportRef,
      now,
      dayId,
      fromStatus
    );

  if (result.changes === 0) {
    return null;
  }

  return getBusinessDayById(dayId);
}

export function getPreviousBusinessDay(storeId = DEFAULT_STORE_ID, businessDate) {
  const db = getDb();
  return (
    db
      .prepare(
        `SELECT *
         FROM BusinessDay
         WHERE store_id = ? AND business_date < ?
         ORDER BY business_date DESC
         LIMIT 1`
      )
      .get(storeId, businessDate) || null
  );
}

export function listByRange(
  storeId = DEFAULT_STORE_ID,
  { startDate, endDate, status, limit } = {}
) {
  const db = getDb();

  let query = 'SELECT * FROM BusinessDay WHERE store_id = ?';
  const params = [storeId];

  if (startDate) {
    query += ' AND business_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND business_date <= ?';
    params.push(endDate);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY business_date ASC';

  if (Number.isInteger(limit) && limit > 0) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  return db.prepare(query).all(...params);
}

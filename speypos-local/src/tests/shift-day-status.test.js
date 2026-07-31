import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';

let initializeDatabase;
let closeDatabase;
let getDb;
let openShift;
let getPreviousDayStatus;
let getNowInStoreTime;
let originalBusinessDayEnabled;

const staffId = 'test-staff-1';

function addDays(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

function insertShift(db, { date, status = 'closed' }) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO Shift (id, status, started_at, ended_at, date, telegram_reported_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), status, now - 60000, status === 'closed' ? now : null, date, null);
}

function setMigrationAppliedAt(db, isoDateTime) {
  db.prepare(
    `UPDATE _migrations
     SET applied_at = ?
     WHERE name IN ('003_day_closes.sql', '004_backfill_day_closes.sql')`
  ).run(isoDateTime);
}

before(async () => {
  originalBusinessDayEnabled = process.env.BUSINESS_DAY_ENABLED;
  process.env.BUSINESS_DAY_ENABLED = 'false';

  process.env.PORT = process.env.PORT || '8080';
  process.env.PRINTER_NAME = process.env.PRINTER_NAME || 'TEST_PRINTER';
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TEST_TOKEN';
  process.env.DB_PATH = process.env.DB_PATH || `data/test-shift-day-${Date.now()}.db`;

  ({ initializeDatabase, closeDatabase, getDb } = await import('../storage/database.js'));
  ({ openShift, getPreviousDayStatus } = await import('../controllers/shift.controller.js'));
  ({ getNowInStoreTime } = await import('../services/time.service.js'));

  initializeDatabase();
});

after(() => {
  closeDatabase();
  if (originalBusinessDayEnabled === undefined) {
    delete process.env.BUSINESS_DAY_ENABLED;
  } else {
    process.env.BUSINESS_DAY_ENABLED = originalBusinessDayEnabled;
  }
});

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM DayClose;');
  db.exec('DELETE FROM StaffShift;');
  db.exec('DELETE FROM Shift;');
  db.exec('DELETE FROM Staff;');

  db.prepare(
    `INSERT INTO Staff (id, name, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(staffId, 'Test Staff', 'pw', 'staff', 'active', Date.now(), null);
});

test('B1: getPreviousDayStatus returns todayClosedShiftsCount when 2 shifts are closed today', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();

  insertShift(db, { date: todayStoreDate, status: 'closed' });
  insertShift(db, { date: todayStoreDate, status: 'closed' });

  const res = makeRes();
  getPreviousDayStatus({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.todayClosedShiftsCount, 2);
});

test('B2: day-0 enforcement blocks previous day without DayClose', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const previousDate = addDays(todayStoreDate, -1);

  insertShift(db, { date: previousDate, status: 'closed' });

  // Move migration timestamp for legacy metadata; day-0 enforcement should still apply.
  const futureAppliedAt = `${addDays(todayStoreDate, 5)}T00:00:00.000Z`;
  setMigrationAppliedAt(db, futureAppliedAt);

  const statusRes = makeRes();
  getPreviousDayStatus({}, statusRes);

  assert.equal(statusRes.statusCode, 200);
  assert.equal(statusRes.body.previousDate, previousDate);
  assert.equal(statusRes.body.isEnforced, true);
  assert.equal(statusRes.body.isClosed, false);

  const openReq = { body: { staff_id: staffId } };
  const openRes = makeRes();
  openShift(openReq, openRes);

  assert.equal(openRes.statusCode, 409);
  assert.equal(openRes.body.error, 'PREVIOUS_DAY_NOT_CLOSED');
  assert.equal(openRes.body.previousDate, previousDate);
});

test('B3: enforced previous day without DayClose blocks opening shift', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const previousDate = addDays(todayStoreDate, -1);

  insertShift(db, { date: previousDate, status: 'closed' });

  // Force enforcement start to yesterday by applying migration 2 days ago.
  const pastAppliedAt = `${addDays(todayStoreDate, -2)}T00:00:00.000Z`;
  setMigrationAppliedAt(db, pastAppliedAt);

  const statusRes = makeRes();
  getPreviousDayStatus({}, statusRes);

  assert.equal(statusRes.statusCode, 200);
  assert.equal(statusRes.body.isEnforced, true);
  assert.equal(statusRes.body.isClosed, false);

  const openReq = { body: { staff_id: staffId } };
  const openRes = makeRes();
  openShift(openReq, openRes);

  assert.equal(openRes.statusCode, 409);
  assert.equal(openRes.body.error, 'PREVIOUS_DAY_NOT_CLOSED');
  assert.equal(openRes.body.previousDate, previousDate);
});

test('B4: enforced previous day with DayClose allows opening shift', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const previousDate = addDays(todayStoreDate, -1);

  insertShift(db, { date: previousDate, status: 'closed' });

  // Enforcement active
  const pastAppliedAt = `${addDays(todayStoreDate, -2)}T00:00:00.000Z`;
  setMigrationAppliedAt(db, pastAppliedAt);

  db.prepare('INSERT INTO DayClose (date, closed_at) VALUES (?, ?)').run(previousDate, Date.now());

  const openReq = { body: { staff_id: staffId } };
  const openRes = makeRes();
  openShift(openReq, openRes);

  assert.equal(openRes.statusCode, 201);
  assert.equal(openRes.body.staff_id, staffId);
});
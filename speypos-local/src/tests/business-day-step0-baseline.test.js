import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let initializeSettings;
let openShift;
let getPreviousDayStatus;
let closeDay;
let getDayCloseReview;
let getDayCloseStatus;
let getNowInStoreTime;
let contracts;

const dbPath = `data/test-business-day-step0-${Date.now()}.db`;
const staffId = 'test-staff-step0';

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
  const shiftId = randomUUID();
  db.prepare(
    `INSERT INTO Shift (id, status, started_at, ended_at, date, telegram_reported_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(shiftId, status, now - 60000, status === 'closed' ? now : null, date, null);

  db.prepare(
    `INSERT INTO StaffShift (id, shift_id, staff_id)
     VALUES (?, ?, ?)`
  ).run(randomUUID(), shiftId, staffId);

  return shiftId;
}

function setMigrationAppliedAt(db, isoDateTime) {
  db.prepare(
    `UPDATE _migrations
     SET applied_at = ?
     WHERE name IN ('003_day_closes.sql', '004_backfill_day_closes.sql')`
  ).run(isoDateTime);
}

async function cleanupDbFiles() {
  await fs.rm(dbPath, { force: true });
  await fs.rm(`${dbPath}-wal`, { force: true });
  await fs.rm(`${dbPath}-shm`, { force: true });
}

function projectPreviousDayStatus(res) {
  return {
    statusCode: res.statusCode,
    body: {
      hasPreviousDay: res.body?.hasPreviousDay,
      todayClosedShiftsCount: res.body?.todayClosedShiftsCount,
      hasEnforcementStartDate:
        typeof res.body?.enforcementStartDate === 'string' || res.body?.enforcementStartDate === null,
    },
  };
}

function projectOpenShiftBlocked(res) {
  return {
    statusCode: res.statusCode,
    body: {
      error: res.body?.error,
      hasPreviousDate: typeof res.body?.previousDate === 'string',
    },
  };
}

function projectOpenShiftAllowed(res) {
  return {
    statusCode: res.statusCode,
    body: {
      hasId: typeof res.body?.id === 'string',
      status: res.body?.status,
      hasDate: typeof res.body?.date === 'string',
      hasStaffId: typeof res.body?.staff_id === 'string',
      hasStaffObject: !!res.body?.staff && typeof res.body.staff === 'object',
    },
  };
}

function projectCloseDayHappyPath(res) {
  return {
    statusCode: res.statusCode,
    body: {
      hasBusinessDate: typeof res.body?.businessDate === 'string',
      hasShiftSummaries: Array.isArray(res.body?.shiftSummaries),
      hasCombinedSummary: !!res.body?.combinedSummary && typeof res.body.combinedSummary === 'object',
    },
  };
}

function projectCloseDayBlocked(res) {
  return {
    statusCode: res.statusCode,
    body: {
      error: res.body?.error,
    },
  };
}

before(async () => {
  process.env.PORT = process.env.PORT || '8080';
  process.env.PRINTER_NAME = process.env.PRINTER_NAME || 'TEST_PRINTER';
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TEST_TOKEN';
  process.env.DB_PATH = dbPath;

  ({ initializeDatabase, closeDatabase, getDb } = await import('../storage/database.js'));
  ({ initializeSettings } = await import('../services/settings.service.js'));
  ({ openShift, getPreviousDayStatus, closeDay, getDayCloseReview, getDayCloseStatus } = await import('../controllers/shift.controller.js'));
  ({ getNowInStoreTime } = await import('../services/time.service.js'));

  const contractRaw = await fs.readFile(
    new URL('./fixtures/contracts/business-day-step0.contract.json', import.meta.url),
    'utf-8'
  );
  contracts = JSON.parse(contractRaw);

  initializeDatabase();
  initializeSettings();
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
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
  ).run(staffId, 'Step0 Staff', 'pw', 'staff', 'active', Date.now(), null);
});

test('Step0 contract: previous-day status with no history', () => {
  const res = makeRes();
  getPreviousDayStatus({}, res);

  assert.deepEqual(projectPreviousDayStatus(res), contracts.previousDayStatusNoHistory);
});

test('Step0 contract: open shift blocked when previous business day is unclosed and enforced', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const previousDate = addDays(todayStoreDate, -1);

  insertShift(db, { date: previousDate, status: 'closed' });
  const pastAppliedAt = `${addDays(todayStoreDate, -2)}T00:00:00.000Z`;
  setMigrationAppliedAt(db, pastAppliedAt);

  const req = { body: { staff_id: staffId } };
  const res = makeRes();
  openShift(req, res);

  assert.deepEqual(projectOpenShiftBlocked(res), contracts.openShiftBlockedByUnclosedPreviousDay);
});

test('Step0 contract: open shift succeeds when previous business day is closed', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const previousDate = addDays(todayStoreDate, -1);

  insertShift(db, { date: previousDate, status: 'closed' });
  const pastAppliedAt = `${addDays(todayStoreDate, -2)}T00:00:00.000Z`;
  setMigrationAppliedAt(db, pastAppliedAt);
  db.prepare('INSERT INTO DayClose (date, closed_at) VALUES (?, ?)').run(previousDate, Date.now());

  const req = { body: { staff_id: staffId } };
  const res = makeRes();
  openShift(req, res);

  assert.deepEqual(projectOpenShiftAllowed(res), contracts.openShiftAllowedWhenPreviousDayClosed);
});

test('Step0 contract: close day happy path', async () => {
  const db = getDb();
  const targetDate = '2026-07-25';

  insertShift(db, { date: targetDate, status: 'closed' });
  insertShift(db, { date: targetDate, status: 'closed' });

  const req = { query: { date: targetDate } };
  const res = makeRes();
  await closeDay(req, res);

  assert.deepEqual(projectCloseDayHappyPath(res), contracts.closeDayHappyPath);
});

test('Step0 contract: close day blocked when a shift remains open', async () => {
  const db = getDb();
  const targetDate = '2026-07-26';

  insertShift(db, { date: targetDate, status: 'closed' });
  insertShift(db, { date: targetDate, status: 'open' });

  const req = { query: { date: targetDate } };
  const res = makeRes();
  await closeDay(req, res);

  assert.deepEqual(projectCloseDayBlocked(res), contracts.closeDayBlockedWhenOpenShiftExists);
});

test('Step0: day-close preview returns CLOSED status when legacy day is already closed', async () => {
  const db = getDb();
  const targetDate = '2026-07-27';

  insertShift(db, { date: targetDate, status: 'closed' });
  db.prepare('INSERT INTO DayClose (date, closed_at) VALUES (?, ?)').run(targetDate, Date.now());

  const req = { query: { date: targetDate } };
  const res = makeRes();
  await getDayCloseReview(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.businessDate, targetDate);
  assert.equal(res.body.business_day_status, 'CLOSED');
  assert.equal(res.body.business_day_id, null);
});

test('Step0: close day conflict includes CLOSED business_day_status in legacy mode', async () => {
  const db = getDb();
  const targetDate = '2026-07-28';

  insertShift(db, { date: targetDate, status: 'closed' });
  db.prepare('INSERT INTO DayClose (date, closed_at) VALUES (?, ?)').run(targetDate, Date.now());

  const req = { query: { date: targetDate } };
  const res = makeRes();
  await closeDay(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, 'DAY_ALREADY_CLOSED');
  assert.equal(res.body.business_day_status, 'CLOSED');
  assert.equal(res.body.business_day_id, null);
});

test('Step0: close-day-status returns definitive CLOSED status in legacy mode', () => {
  const db = getDb();
  const targetDate = '2026-07-29';

  insertShift(db, { date: targetDate, status: 'closed' });
  db.prepare('INSERT INTO DayClose (date, closed_at) VALUES (?, ?)').run(targetDate, Date.now());

  const req = { query: { date: targetDate } };
  const res = makeRes();
  getDayCloseStatus(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.businessDate, targetDate);
  assert.equal(res.body.business_day_status, 'CLOSED');
  assert.equal(res.body.business_day_id, null);
  assert.equal(res.body.isCloseable, false);
  assert.equal(res.body.reason, 'DAY_ALREADY_CLOSED');
});

test('Step0: close-day-status returns DAY_NOT_READY when open shifts exist', () => {
  const db = getDb();
  const targetDate = '2026-07-30';

  insertShift(db, { date: targetDate, status: 'closed' });
  insertShift(db, { date: targetDate, status: 'open' });

  const req = { query: { date: targetDate } };
  const res = makeRes();
  getDayCloseStatus(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.businessDate, targetDate);
  assert.equal(res.body.business_day_status, 'OPEN');
  assert.equal(res.body.isCloseable, false);
  assert.equal(res.body.reason, 'DAY_NOT_READY');
  assert.equal(res.body.openShiftsCount, 1);
});

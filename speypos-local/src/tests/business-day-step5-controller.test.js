import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let initializeSettings;
let openShift;
let closeDay;
let getPreviousDayStatus;

const dbPath = `data/test-business-day-step5-${Date.now()}.db`;
const staffId = 'test-staff-step5';

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
    `INSERT INTO Shift (id, status, started_at, ended_at, date, telegram_reported_at, business_day_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), status, now - 60000, status === 'closed' ? now : null, date, null, null);
}

function insertBusinessDay(db, { id, date, status, closedAt = null }) {
  const now = Date.now();
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
  ).run(id, 'default', date, status, now - 5000, closedAt, null, null, null, now, null);
}

async function cleanupDbFiles() {
  await fs.rm(dbPath, { force: true });
  await fs.rm(`${dbPath}-wal`, { force: true });
  await fs.rm(`${dbPath}-shm`, { force: true });
}

before(async () => {
  process.env.PORT = process.env.PORT || '8080';
  process.env.PRINTER_NAME = process.env.PRINTER_NAME || 'TEST_PRINTER';
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TEST_TOKEN';
  process.env.DB_PATH = dbPath;
  process.env.BUSINESS_DAY_ENABLED = 'true';

  ({ initializeDatabase, closeDatabase, getDb } = await import('../storage/database.js'));
  ({ initializeSettings } = await import('../services/settings.service.js'));
  ({ openShift, closeDay, getPreviousDayStatus } = await import('../controllers/shift.controller.js'));

  initializeDatabase();
  initializeSettings();
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
  process.env.BUSINESS_DAY_ENABLED = 'false';
});

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM DayClose;');
  db.exec('DELETE FROM StaffShift;');
  db.exec('DELETE FROM Shift;');
  db.exec('DELETE FROM BusinessDay;');
  db.exec('DELETE FROM Staff;');

  db.prepare(
    `INSERT INTO Staff (id, name, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(staffId, 'Step5 Staff', 'pw', 'staff', 'active', Date.now(), null);
});

test('Step5: openShift returns optional semantic fields in compatibility mode', () => {
  const req = { body: { staff_id: staffId } };
  const res = makeRes();

  openShift(req, res);

  assert.equal(res.statusCode, 201);
  assert.ok(typeof res.body.business_day_id === 'string');
  assert.equal(res.body.business_day_status, 'OPEN');
});

test('Step5: closeDay is idempotent with deterministic conflict when already closed', async () => {
  const db = getDb();
  const targetDate = '2026-07-29';

  insertShift(db, { date: targetDate, status: 'closed' });
  insertShift(db, { date: targetDate, status: 'closed' });

  const req = { query: { date: targetDate } };

  const firstRes = makeRes();
  await closeDay(req, firstRes);
  assert.equal(firstRes.statusCode, 200);
  assert.ok(typeof firstRes.body.business_day_id === 'string');
  assert.equal(firstRes.body.business_day_status, 'CLOSED');

  const secondRes = makeRes();
  await closeDay(req, secondRes);
  assert.equal(secondRes.statusCode, 409);
  assert.equal(secondRes.body.error, 'DAY_ALREADY_CLOSED');
  assert.equal(secondRes.body.business_day_status, 'CLOSED');
});

test('Step5: getPreviousDayStatus uses BusinessDay semantics when enabled', () => {
  const db = getDb();
  insertBusinessDay(db, {
    id: 'bd-prev-open',
    date: '2026-07-28',
    status: 'OPEN',
    closedAt: null,
  });

  const res = makeRes();
  getPreviousDayStatus({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.hasPreviousDay, true);
  assert.equal(res.body.previousDate, '2026-07-28');
  assert.equal(res.body.previous_business_day_id, 'bd-prev-open');
  assert.equal(res.body.previous_business_day_status, 'OPEN');
  assert.equal(res.body.isClosed, false);
});

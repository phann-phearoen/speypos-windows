import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

let initializeDatabase;
let closeDatabase;
let getDb;
let service;
let getNowInStoreTime;

const dbPath = `data/test-business-day-service-${Date.now()}.db`;

function insertShift(db, { date, status = 'closed', startedAt = Date.now() - 1000, endedAt = Date.now() }) {
  db.prepare(
    `INSERT INTO Shift (id, status, started_at, ended_at, date, telegram_reported_at, business_day_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), status, startedAt, status === 'closed' ? endedAt : null, date, null, null);
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

  ({ initializeDatabase, closeDatabase, getDb } = await import('../storage/database.js'));
  service = await import('../services/business-day.service.js');
  ({ getNowInStoreTime } = await import('../services/time.service.js'));

  initializeDatabase();
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
});

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM DayClose;');
  db.exec('DELETE FROM Shift;');
  db.exec('DELETE FROM BusinessDay;');
  process.env.BUSINESS_DAY_ENABLED = 'false';
});

test('flag OFF: getDayCloseContext returns shifts without BusinessDay lookup', () => {
  const db = getDb();
  insertShift(db, { date: '2026-07-29', status: 'closed' });

  const context = service.getDayCloseContext({ targetDate: '2026-07-29' });
  assert.equal(context.businessDate, '2026-07-29');
  assert.equal(context.shiftsForDate.length, 1);
  assert.equal(context.businessDay, null);
});

test('flag ON: resolveOrCreateTodayOpenDay creates OPEN BusinessDay', () => {
  process.env.BUSINESS_DAY_ENABLED = 'true';

  const result = service.resolveOrCreateTodayOpenDay({ targetDate: '2026-07-29', openedByStaffId: null });
  assert.equal(result.businessDate, '2026-07-29');
  assert.equal(result.businessDay?.status, 'OPEN');

  const db = getDb();
  const rows = db
    .prepare('SELECT COUNT(*) AS count FROM BusinessDay WHERE store_id = ? AND business_date = ?')
    .get('default', '2026-07-29');
  assert.equal(rows.count, 1);
});

test('flag ON: assertPreviousDayClosed throws when previous day is not CLOSED', () => {
  process.env.BUSINESS_DAY_ENABLED = 'true';

  const db = getDb();
  db.prepare(
    `INSERT INTO BusinessDay (
      id, store_id, business_date, status, opened_at, closed_at,
      opened_by_staff_id, closed_by_staff_id, close_report_ref, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), 'default', '2026-07-28', 'OPEN', Date.now() - 5000, null, null, null, null, Date.now(), null);

  assert.throws(
    () => service.assertPreviousDayClosed('2026-07-29'),
    (error) => error.code === 'PREVIOUS_DAY_NOT_CLOSED' && error.previousDate === '2026-07-28'
  );
});

test('flag ON: assertDayCloseReady creates missing BusinessDay when shifts are all closed', () => {
  process.env.BUSINESS_DAY_ENABLED = 'true';

  const db = getDb();
  insertShift(db, { date: '2026-07-27', status: 'closed', startedAt: 1000, endedAt: 2000 });
  insertShift(db, { date: '2026-07-27', status: 'closed', startedAt: 3000, endedAt: 4000 });

  const day = service.assertDayCloseReady({
    businessDate: '2026-07-27',
    shiftsForDate: db.prepare('SELECT * FROM Shift WHERE date = ?').all('2026-07-27'),
  });

  assert.equal(day?.status, 'OPEN');
  assert.equal(day?.opened_at, 1000);
});

test('flag ON: assertDayCloseReady rejects when any shift is open', () => {
  process.env.BUSINESS_DAY_ENABLED = 'true';

  const db = getDb();
  insertShift(db, { date: '2026-07-26', status: 'closed' });
  insertShift(db, { date: '2026-07-26', status: 'open' });

  assert.throws(
    () =>
      service.assertDayCloseReady({
        businessDate: '2026-07-26',
        shiftsForDate: db.prepare('SELECT * FROM Shift WHERE date = ?').all('2026-07-26'),
      }),
    (error) => error.code === 'DAY_NOT_READY'
  );
});

test('flag ON: closeBusinessDayTransactionally closes BusinessDay and mirrors DayClose', () => {
  process.env.BUSINESS_DAY_ENABLED = 'true';

  const db = getDb();
  insertShift(db, { date: '2026-07-25', status: 'closed' });
  insertShift(db, { date: '2026-07-25', status: 'closed' });
  db.prepare(
    `INSERT INTO BusinessDay (
      id, store_id, business_date, status, opened_at, closed_at,
      opened_by_staff_id, closed_by_staff_id, close_report_ref, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run('bd-1', 'default', '2026-07-25', 'OPEN', 1000, null, null, null, null, 1000, null);

  const result = service.closeBusinessDayTransactionally({
    businessDate: '2026-07-25',
    closedByStaffId: null,
    closeReportRef: 'report-1',
  });

  assert.equal(result.businessDay?.status, 'CLOSED');
  assert.equal(result.businessDay?.close_report_ref, 'report-1');

  const dayCloseRow = db.prepare('SELECT * FROM DayClose WHERE date = ?').get('2026-07-25');
  assert.ok(dayCloseRow);
});

test('Step6: openShiftTransactionally rejects when open shift already exists for business date', () => {
  process.env.BUSINESS_DAY_ENABLED = 'true';

  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();

  insertShift(db, { date: todayStoreDate, status: 'open' });

  assert.throws(
    () =>
      service.openShiftTransactionally({
        staffId: 'staff-1',
        businessDate: todayStoreDate,
      }),
    (error) => error.code === 'OPEN_SHIFT_EXISTS'
  );
});

test('Step6: closeBusinessDayTransactionally enforces readiness inside transaction', () => {
  process.env.BUSINESS_DAY_ENABLED = 'true';

  const db = getDb();
  insertShift(db, { date: '2026-07-30', status: 'closed' });
  insertShift(db, { date: '2026-07-30', status: 'open' });

  assert.throws(
    () => service.closeBusinessDayTransactionally({ businessDate: '2026-07-30' }),
    (error) => error.code === 'DAY_NOT_READY'
  );
});

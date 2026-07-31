import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let queueShiftCloseCloudFlush;
let getOutboxEventByDedupeKey;
let getUnreportedShifts;
let dispatchOutboxEvent;

const dbPath = `data/test-business-day-step7-outbox-${Date.now()}.db`;

function insertBusinessDay(db, { id, date, status }) {
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
  ).run(
    id,
    'default',
    date,
    status,
    now - 10000,
    status === 'CLOSED' ? now : null,
    null,
    null,
    null,
    now,
    null
  );
}

function insertShift(db, { id, date, businessDayId = null, reportedAt = null }) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO Shift (id, status, started_at, ended_at, date, telegram_reported_at, business_day_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, 'closed', now - 50000, now - 1000, date, reportedAt, businessDayId);
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
  ({ queueShiftCloseCloudFlush } = await import('../services/outbox.service.js'));
  ({ getOutboxEventByDedupeKey } = await import('../storage/repositories/outbox.repo.js'));
  ({ getUnreportedShifts } = await import('../services/recovery.service.js'));
  ({ dispatchOutboxEvent } = await import('../services/outbox.dispatchers.js'));

  initializeDatabase();
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
  process.env.BUSINESS_DAY_ENABLED = 'false';
});

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM OutboxEvent;');
  db.exec('DELETE FROM DayClose;');
  db.exec('DELETE FROM Shift;');
  db.exec('DELETE FROM BusinessDay;');
  process.env.BUSINESS_DAY_ENABLED = 'false';
});

test('Step7: queueShiftCloseCloudFlush includes business day metadata', async () => {
  await queueShiftCloseCloudFlush({
    shiftId: 'shift-step7-meta',
    businessDayId: 'bd-step7-meta',
    businessDate: '2026-07-30',
  });

  const event = getOutboxEventByDedupeKey('shift-step7-meta:cloud.flush');
  assert.ok(event);
  assert.equal(event.event_type, 'cloud.flush');
  assert.equal(event.payload.shift_id, 'shift-step7-meta');
  assert.equal(event.payload.business_day_id, 'bd-step7-meta');
  assert.equal(event.payload.business_date, '2026-07-30');
});

test('Step7: queueShiftCloseCloudFlush keeps legacy string call compatibility', async () => {
  await queueShiftCloseCloudFlush('shift-step7-legacy');

  const event = getOutboxEventByDedupeKey('shift-step7-legacy:cloud.flush');
  assert.ok(event);
  assert.equal(event.payload.shift_id, 'shift-step7-legacy');
  assert.equal(event.payload.business_day_id, null);
  assert.equal(event.payload.business_date, null);
});

test('Step7: recovery scan only returns shifts from closed business days when semantic mode is enabled', () => {
  process.env.BUSINESS_DAY_ENABLED = 'true';
  const db = getDb();

  insertBusinessDay(db, { id: 'bd-open', date: '2026-07-31', status: 'OPEN' });
  insertBusinessDay(db, { id: 'bd-closed', date: '2026-08-01', status: 'CLOSED' });

  insertShift(db, { id: 'shift-open-day', date: '2026-07-31', businessDayId: 'bd-open' });
  insertShift(db, { id: 'shift-closed-day', date: '2026-08-01', businessDayId: 'bd-closed' });

  // Legacy/unlinked closed day remains eligible if DayClose exists.
  insertShift(db, { id: 'shift-legacy-closed', date: '2026-08-02', businessDayId: null });
  db.prepare('INSERT INTO DayClose (date, closed_at) VALUES (?, ?)').run('2026-08-02', Date.now());

  const result = getUnreportedShifts();
  const ids = result.records.map((row) => row.id).sort();

  assert.equal(result.count, 2);
  assert.deepEqual(ids, ['shift-closed-day', 'shift-legacy-closed']);
});

test('Step7: dispatcher skips cloud flush while business day is still open', async () => {
  process.env.BUSINESS_DAY_ENABLED = 'true';
  const db = getDb();

  insertBusinessDay(db, { id: 'bd-open-dispatch', date: '2026-08-03', status: 'OPEN' });

  await assert.doesNotReject(async () => {
    await dispatchOutboxEvent({
      event_type: 'cloud.flush',
      payload: {
        shift_id: 'shift-not-needed-because-skipped',
        business_day_id: 'bd-open-dispatch',
      },
    });
  });
});

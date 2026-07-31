import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';

const staffId = 'test-staff-1';

let initializeDatabase;
let closeDatabase;
let initializeSettings;
let getDb;
let getOutboxConfig;
let getOutboxMode;
let enqueueEvent;
let enqueueEvents;
let claimDueBatch;
let markRetry;
let markSucceeded;
let getOutboxStats;

const dbPath = `data/test-outbox-${Date.now()}.db`;

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
  ({ initializeSettings, getOutboxConfig, getOutboxMode } = await import('../services/settings.service.js'));
  ({
    enqueueEvent,
    enqueueEvents,
    claimDueBatch,
    markRetry,
    markSucceeded,
    getOutboxStats,
  } = await import('../storage/repositories/outbox.repo.js'));

  initializeDatabase();
  initializeSettings();

  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO Staff (id, name, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(staffId, 'Test Staff', 'pw', 'staff', 'active', Date.now(), null);
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
});

test('outbox.config default is seeded and readable', () => {
  const config = getOutboxConfig();

  assert.equal(getOutboxMode(), 'outbox_async');
  assert.equal(config.version, 1);
  assert.equal(config.batch_size, 20);
  assert.equal(config.poll_interval_ms, 1000);
  assert.equal(config.lease_ms, 30000);
  assert.equal(config.max_attempts, 10);
});

test('outbox events dedupe, claim, retry, and succeed through repository primitives', () => {
  const first = enqueueEvent({
    aggregate_type: 'order',
    aggregate_id: 'order-1',
    event_type: 'receipt.print',
    dedupe_key: 'order-1:receipt.print',
    payload: { order_id: 'order-1', variant: 'INTERNAL' },
    max_attempts: 5,
  });

  const duplicate = enqueueEvent({
    aggregate_type: 'order',
    aggregate_id: 'order-1',
    event_type: 'receipt.print',
    dedupe_key: 'order-1:receipt.print',
    payload: { order_id: 'order-1', variant: 'INTERNAL' },
  });

  assert.equal(first.id, duplicate.id);
  assert.equal(getOutboxStats().total, 1);
  assert.equal(getOutboxStats().pending, 1);
  assert.equal(getOutboxStats().due, 1);

  const claimed = claimDueBatch({ workerId: 'worker-a', limit: 10, leaseMs: 30000 });
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0].status, 'processing');
  assert.equal(claimed[0].attempts, 1);

  const retried = markRetry(claimed[0].id, 'printer unavailable', Date.now() - 1);
  assert.equal(retried.status, 'retry');
  assert.equal(retried.last_error, 'printer unavailable');

  const reclaimed = claimDueBatch({ workerId: 'worker-b', limit: 10, leaseMs: 30000 });
  assert.equal(reclaimed.length, 1);
  assert.equal(reclaimed[0].attempts, 2);
  assert.equal(reclaimed[0].locked_by, 'worker-b');

  const succeeded = markSucceeded(reclaimed[0].id);
  assert.equal(succeeded.status, 'succeeded');
  assert.equal(getOutboxStats().succeeded, 1);
});

test('enqueueEvents inserts multiple unique items in one call', () => {
  const events = enqueueEvents([
    {
      aggregate_type: 'shift',
      aggregate_id: 'shift-1',
      event_type: 'telegram.shift',
      dedupe_key: 'shift-1:telegram.shift',
      payload: { shift_id: 'shift-1' },
    },
    {
      aggregate_type: 'shift',
      aggregate_id: 'shift-1',
      event_type: 'cloud.flush',
      dedupe_key: 'shift-1:cloud.flush',
      payload: { shift_id: 'shift-1' },
    },
  ]);

  assert.equal(events.length, 2);
  assert.equal(getOutboxStats().total >= 3, true);
});
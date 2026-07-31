import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

let initializeDatabase;
let closeDatabase;
let getDb;
let initializeSettings;
let getOrderById;
let getShiftById;
let runMaintenance;
let settingsRepo;

const dbPath = `data/test-maintenance-${Date.now()}.db`;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000;

async function cleanupDbFiles() {
  await fs.rm(dbPath, { force: true });
  await fs.rm(`${dbPath}-wal`, { force: true });
  await fs.rm(`${dbPath}-shm`, { force: true });
}

before(async () => {
  process.env.DB_PATH = dbPath;

  ({ initializeDatabase, closeDatabase, getDb } = await import('../storage/database.js'));
  ({ initializeSettings } = await import('../services/settings.service.js'));
  ({ getOrderById } = await import('../storage/repositories/order.repo.js'));
  ({ getShiftById } = await import('../storage/repositories/shift.repo.js'));
  ({ runMaintenance } = await import('../services/maintenance.service.js'));
  settingsRepo = await import('../storage/repositories/settings.repo.js');

  initializeDatabase();
  initializeSettings();

  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO Staff (id, name, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('staff-1', 'Test Staff', 'password', 'admin', 'active', Date.now());
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
});

test('automatic maintenance purges old data and keeps recent data', async (t) => {
  const db = getDb();
  const now = Date.now();
  const oldDate = now - (THREE_DAYS_MS + 1000); // 3 days + 1 second ago
  const recentDate = now - (THREE_DAYS_MS - 60000); // 3 days - 1 minute ago (recent)

  // 1. Seed Old Data
  const oldShiftId = randomUUID();
  db.prepare('INSERT INTO Shift (id, status, started_at, ended_at, date) VALUES (?, ?, ?, ?, ?)')
    .run(oldShiftId, 'closed', oldDate - 1000, oldDate, '2026-06-01');

  const oldOrderId = randomUUID();
  db.prepare('INSERT INTO "Order" (id, shift_id, staff_id, status, total_amount, total_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(oldOrderId, oldShiftId, 'staff-1', 'completed', 1000, 1, oldDate);

  // 2. Seed Recent Data
  const recentShiftId = randomUUID();
  db.prepare('INSERT INTO Shift (id, status, started_at, ended_at, date) VALUES (?, ?, ?, ?, ?)')
    .run(recentShiftId, 'open', recentDate, null, '2026-06-17');

  const recentOrderId = randomUUID();
  db.prepare('INSERT INTO "Order" (id, shift_id, staff_id, status, total_amount, total_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(recentOrderId, recentShiftId, 'staff-1', 'pending', 500, 1, recentDate);

  // 3. Set last_run_at to 31 days ago to ensure it runs
  settingsRepo.upsertSetting({
    key: 'maintenance.last_run_at',
    value: String(now - THIRTY_ONE_DAYS_MS),
    value_type: 'number',
    category: 'System'
  });

  // 4. Run Maintenance
  await runMaintenance();

  // 5. Verify Results
  const deletedOrder = getOrderById(oldOrderId);
  const keptOrder = getOrderById(recentOrderId);
  const deletedShift = getShiftById(oldShiftId);
  const keptShift = getShiftById(recentShiftId);

  assert.equal(deletedOrder, undefined, 'Old order should be deleted');
  assert.ok(keptOrder, 'Recent order should be kept');
  assert.equal(deletedShift, undefined, 'Old empty shift should be deleted');
  assert.ok(keptShift, 'Recent shift should be kept');

  const lastRunAt = db.prepare("SELECT value FROM Settings WHERE key = 'maintenance.last_run_at'").get().value;
  assert.ok(Number(lastRunAt) >= now, 'last_run_at should be updated to a recent timestamp');
});

test('maintenance does not run if interval has not passed', async (t) => {
  const db = getDb();
  const now = Date.now();
  
  // Set last_run_at to 1 hour ago
  settingsRepo.upsertSetting({
    key: 'maintenance.last_run_at',
    value: String(now - 3600000),
    value_type: 'number',
    category: 'System'
  });

  // Seed an old order that would be deleted if maintenance ran
  const oldDate = now - (THREE_DAYS_MS + 100000);
  const oldOrderId = randomUUID();
  const someShiftId = randomUUID();
  db.prepare('INSERT INTO Shift (id, status, started_at, ended_at, date) VALUES (?, ?, ?, ?, ?)')
    .run(someShiftId, 'closed', oldDate - 1000, oldDate, '2026-06-02');

  db.prepare('INSERT INTO "Order" (id, shift_id, staff_id, status, total_amount, total_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(oldOrderId, someShiftId, 'staff-1', 'completed', 1000, 1, oldDate);

  await runMaintenance();

  const order = getOrderById(oldOrderId);
  assert.ok(order, 'Old order should NOT be deleted because maintenance interval was not reached');
});

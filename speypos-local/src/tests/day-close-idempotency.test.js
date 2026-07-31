import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let initializeSettings;
let closeDay;

const dbPath = `data/test-day-close-idempotency-${Date.now()}.db`;

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

function insertClosedShift(db, { date }) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO Shift (id, status, started_at, ended_at, date, telegram_reported_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), 'closed', now - 60000, now, date, null);
}

function insertOpenShift(db, { date }) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO Shift (id, status, started_at, ended_at, date, telegram_reported_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), 'open', now - 60000, null, date, null);
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
  ({ initializeSettings } = await import('../services/settings.service.js'));
  ({ closeDay } = await import('../controllers/shift.controller.js'));

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
});

test('closeDay should reject repeated close for the same business date', async () => {
  const db = getDb();
  const targetDate = '2026-07-25';

  insertClosedShift(db, { date: targetDate });
  insertClosedShift(db, { date: targetDate });

  const req = { query: { date: targetDate } };

  const firstRes = makeRes();
  await closeDay(req, firstRes);
  assert.equal(firstRes.statusCode, 200);

  const secondRes = makeRes();
  await closeDay(req, secondRes);

  // Desired behavior: repeat close for same date should be rejected.
  assert.equal(secondRes.statusCode, 409);
});

test('closeDay should reject while any shift for the business date remains open', async () => {
  const db = getDb();
  const targetDate = '2026-07-26';

  insertClosedShift(db, { date: targetDate });
  insertOpenShift(db, { date: targetDate });

  const req = { query: { date: targetDate } };
  const res = makeRes();

  await closeDay(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, 'DAY_NOT_READY');
});

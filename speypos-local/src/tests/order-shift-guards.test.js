import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let createOrder;
let createMenuItem;
let getNowInStoreTime;

const dbPath = `data/test-order-shift-guards-${Date.now()}.db`;
const staffId = 'test-staff-order-shift-guards';
const menuItemId = 'menu-order-shift-guards';

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
  };
}

function addDays(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function insertShift(db, { id, status, date }) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO Shift (id, status, started_at, ended_at, date, telegram_reported_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, status, now - 60000, status === 'closed' ? now : null, date, null);
}

function buildCreateOrderReq(shiftId) {
  return {
    body: {
      shift_id: shiftId,
      staff_id: staffId,
      customer_type: 'dine-in',
      items: [
        {
          menu_item_id: menuItemId,
          quantity: 1,
          unit_price: 2500,
          customizations: [],
          toppings: [],
        },
      ],
    },
  };
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
  ({ createOrder } = await import('../controllers/order.controller.js'));
  ({ createMenuItem } = await import('../storage/repositories/menu-item.repo.js'));
  ({ getNowInStoreTime } = await import('../services/time.service.js'));

  initializeDatabase();

  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO Staff (id, name, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(staffId, 'Order Guard Staff', 'pw', 'staff', 'active', Date.now(), null);

  createMenuItem({
    id: menuItemId,
    name: 'Test Drink',
    image_url: null,
    price: 2500,
    created_at: Date.now(),
  });
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
});

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM "Order";');
  db.exec('DELETE FROM StaffShift;');
  db.exec('DELETE FROM Shift;');
});

test('createOrder should succeed for an open shift on current store date', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const openShiftId = randomUUID();

  insertShift(db, { id: openShiftId, status: 'open', date: todayStoreDate });

  const req = buildCreateOrderReq(openShiftId);
  const res = makeRes();
  createOrder(req, res);

  assert.equal(res.statusCode, 201);
});

test('createOrder should reject creating an order for a closed shift', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const closedShiftId = randomUUID();

  insertShift(db, { id: closedShiftId, status: 'closed', date: todayStoreDate });

  const req = buildCreateOrderReq(closedShiftId);
  const res = makeRes();
  createOrder(req, res);

  // Desired behavior: closed shifts must not accept new orders.
  assert.equal(res.statusCode, 409);
});

test('createOrder should reject creating an order for an open shift from a previous business date', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const previousDate = addDays(todayStoreDate, -1);
  const staleOpenShiftId = randomUUID();

  insertShift(db, { id: staleOpenShiftId, status: 'open', date: previousDate });

  const req = buildCreateOrderReq(staleOpenShiftId);
  const res = makeRes();
  createOrder(req, res);

  // Desired behavior: stale-date shifts must not accept new orders.
  assert.equal(res.statusCode, 409);
});

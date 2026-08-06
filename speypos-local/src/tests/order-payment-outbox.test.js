import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let createPayment;
let createOrder;
let createMenuItem;
let getOutboxStats;
let getNowInStoreTime;

const dbPath = `data/test-payment-outbox-${Date.now()}.db`;
const staffId = 'test-staff-payment';

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

async function cleanupDbFiles() {
  await fs.rm(dbPath, { force: true });
  await fs.rm(`${dbPath}-wal`, { force: true });
  await fs.rm(`${dbPath}-shm`, { force: true });
}

before(async () => {
  process.env.PORT = process.env.PORT || '8080';
  process.env.PRINTER_NAME = process.env.PRINTER_NAME || 'CONSOLE';
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TEST_TOKEN';
  process.env.DB_PATH = dbPath;

  ({ initializeDatabase, closeDatabase, getDb } = await import('../storage/database.js'));
  ({ createPayment } = await import('../controllers/order.controller.js'));
  ({ createOrder } = await import('../storage/repositories/order.repo.js'));
  ({ createMenuItem } = await import('../storage/repositories/menu-item.repo.js'));
  ({ getOutboxStats } = await import('../storage/repositories/outbox.repo.js'));
  ({ getNowInStoreTime } = await import('../services/time.service.js'));

  initializeDatabase();

  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO Staff (id, name, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(staffId, 'Payment Staff', 'pw', 'staff', 'active', Date.now(), null);

  const { todayStoreDate } = getNowInStoreTime();
  db.prepare(
    `INSERT OR IGNORE INTO Shift (id, status, started_at, ended_at, date, telegram_reported_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run('shift-payment-1', 'open', Date.now(), null, todayStoreDate, null);

  createMenuItem({
    id: 'menu-payment-1',
    name: 'Smoke Latte',
    image_url: null,
    price: 2500,
    created_at: Date.now(),
  });
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
});

test('payment completion enqueues receipt, telegram, and cloud outbox jobs', async () => {
  const order = createOrder({
    shift_id: 'shift-payment-1',
    staff_id: staffId,
    customer_type: 'dine-in',
    items: [
      {
        menu_item_id: 'menu-payment-1',
        quantity: 1,
        unit_price: 2500,
        customizations: [],
        toppings: [],
      },
    ],
  });

  const req = {
    params: { id: order.id },
    body: {
      payment_type: 'cash',
      amount: 2500,
      received_cash: 2500,
      change: 0,
    },
  };
  const res = makeRes();

  await createPayment(req, res);
  await Promise.resolve();

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.id, order.id);
  assert.equal(res.body.status, 'completed');

  const stats = getOutboxStats();
  assert.equal(stats.pending, 3);
  assert.equal(stats.due, 3);
});
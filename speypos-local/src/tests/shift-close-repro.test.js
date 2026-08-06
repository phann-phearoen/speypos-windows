import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let initializeSettings;
let updateShift;
let createOrder;
let createMenuItem;
let getNowInStoreTime;
let getShiftById;
let getShiftSalesReport;
let getAllOrders;
let getOutboxEventByDedupeKey;

const dbPath = `data/test-shift-close-repro-${Date.now()}.db`;
const staffId = 'test-staff-shift-close-repro';
const menuItemId = 'menu-shift-close-repro';

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
  db.prepare(
    `INSERT INTO StaffShift (id, shift_id, staff_id)
     VALUES (?, ?, ?)`
  ).run(randomUUID(), id, staffId);
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
  ({ initializeSettings } = await import('../services/settings.service.js'));
  ({ updateShift } = await import('../controllers/shift.controller.js'));
  ({ createOrder, getAllOrders } = await import('../storage/repositories/order.repo.js'));
  ({ createMenuItem } = await import('../storage/repositories/menu-item.repo.js'));
  ({ getNowInStoreTime } = await import('../services/time.service.js'));
  ({ getShiftById, getShiftSalesReport } = await import('../storage/repositories/shift.repo.js'));
  ({ getOutboxEventByDedupeKey } = await import('../storage/repositories/outbox.repo.js'));

  initializeDatabase();
  initializeSettings();

  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO Staff (id, name, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(staffId, 'Repro Staff', 'pw', 'staff', 'active', Date.now(), null);

  createMenuItem({
    id: menuItemId,
    name: 'Repro Drink',
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

test('direct repository order writes are blocked once a shift is closed', async () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const shiftId = randomUUID();

  insertShift(db, { id: shiftId, status: 'open', date: todayStoreDate });

  const firstOrder = createOrder(buildCreateOrderReq(shiftId).body);
  assert.equal(firstOrder.order_number, 1);

  const closeReq = { params: { id: shiftId }, body: { status: 'closed' } };
  const closeRes = makeRes();
  await updateShift(closeReq, closeRes);

  assert.equal(closeRes.statusCode, 200);
  assert.equal(closeRes.body.status, 'closed');
  assert.equal(closeRes.body.close_delivery?.status, 'completed');
  assert.equal(closeRes.body.cloud_sync?.status, 'queued');

  const shiftReport = getShiftSalesReport(shiftId);
  assert.ok(shiftReport);

  const reportedShift = getShiftById(shiftId);
  assert.ok(reportedShift.telegram_reported_at, 'shift should be marked as Telegram-reported');
  assert.equal(reportedShift.status, 'closed');

  const telegramEvent = getOutboxEventByDedupeKey(`${shiftId}:telegram.shift`);
  const cloudFlushEvent = getOutboxEventByDedupeKey(`${shiftId}:cloud.flush`);
  assert.equal(telegramEvent, null);
  assert.ok(cloudFlushEvent, 'cloud flush should still be queued for async processing');
  assert.equal(cloudFlushEvent.payload.shift_id, shiftId);
  assert.equal(cloudFlushEvent.payload.business_day_id, null);
  assert.equal(cloudFlushEvent.payload.business_date, todayStoreDate);

  assert.throws(
    () => createOrder(buildCreateOrderReq(shiftId).body),
    (error) => error?.code === 'SHIFT_NOT_OPEN'
  );

  const allOrders = getAllOrders({ shift_id: shiftId });
  assert.equal(allOrders.length, 1);
});

test('direct repository order writes are blocked for an open shift from a previous business day', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const previousDate = addDays(todayStoreDate, -1);
  const shiftId = randomUUID();

  insertShift(db, { id: shiftId, status: 'open', date: previousDate });

  assert.throws(
    () => createOrder(buildCreateOrderReq(shiftId).body),
    (error) => error?.code === 'SHIFT_NOT_CURRENT_BUSINESS_DAY'
  );

  const allOrders = getAllOrders({ shift_id: shiftId });
  assert.equal(allOrders.length, 0);
});

test('shift report resolves cup sizes by canonical customization, item map, category map, then Unknown', () => {
  const db = getDb();
  const { todayStoreDate } = getNowInStoreTime();
  const shiftId = randomUUID();
  const categoryId = randomUUID();
  const canonicalCupId = randomUUID();
  const itemCupId = randomUUID();
  const categoryCupId = randomUUID();
  const now = Date.now();

  insertShift(db, { id: shiftId, status: 'open', date: todayStoreDate });
  db.prepare('INSERT INTO MenuCategory (id, name, image_url, sort_order, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(categoryId, 'Cup Report Category', null, 0, now);

  const cupSizes = [
    [canonicalCupId, '12', 'oz'],
    [itemCupId, '16', 'oz'],
    [categoryCupId, '20', 'oz'],
  ];
  const insertCupSize = db.prepare(
    'INSERT INTO CupSize (id, size, unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  );
  for (const [id, size, unit] of cupSizes) {
    insertCupSize.run(id, size, unit, now, null);
  }

  const menuItemIds = Array.from({ length: 4 }, () => randomUUID());
  const insertMenuItem = db.prepare(
    'INSERT INTO MenuItem (id, name, image_url, price, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const [index, id] of menuItemIds.entries()) {
    insertMenuItem.run(id, `Cup Report Item ${index}`, null, 2500, 0, now, null);
  }

  db.prepare('INSERT INTO MenuItemCupSizeMap (id, menu_item_id, cup_size_id) VALUES (?, ?, ?)')
    .run(randomUUID(), menuItemIds[0], itemCupId);
  db.prepare('INSERT INTO MenuItemCupSizeMap (id, menu_item_id, cup_size_id) VALUES (?, ?, ?)')
    .run(randomUUID(), menuItemIds[1], itemCupId);
  db.prepare('INSERT INTO MenuItemCategoryMap (id, menu_item_id, menu_category_id) VALUES (?, ?, ?)')
    .run(randomUUID(), menuItemIds[2], categoryId);
  db.prepare('INSERT INTO MenuCategoryCupSizeMap (id, menu_category_id, cup_size_id) VALUES (?, ?, ?)')
    .run(randomUUID(), categoryId, categoryCupId);

  const insertOrder = db.prepare(
    `INSERT INTO "Order" (id, shift_id, staff_id, status, customer_type, total_amount, total_items, created_at)
     VALUES (?, ?, ?, 'completed', 'dine-in', ?, ?, ?)`
  );
  const insertOrderItem = db.prepare(
    'INSERT INTO OrderItem (id, order_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
  );
  const quantities = [2, 3, 4, 5];
  const orderItemIds = [];
  for (const [index, menuItemId] of menuItemIds.entries()) {
    const orderId = randomUUID();
    const orderItemId = randomUUID();
    insertOrder.run(orderId, shiftId, staffId, 2500 * quantities[index], quantities[index], now + index);
    insertOrderItem.run(orderItemId, orderId, menuItemId, quantities[index], 2500);
    orderItemIds.push(orderItemId);
  }
  db.prepare(
    'INSERT INTO OrderCustomization (id, order_item_id, name, option_type, value, price) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), orderItemIds[0], '12 oz', 'cup_size', canonicalCupId, 0);

  const report = getShiftSalesReport(shiftId);

  assert.deepEqual(report.cupSizeSummary, [
    { id: null, name: 'Unknown', quantity: 5 },
    { id: categoryCupId, name: '20 oz', quantity: 4 },
    { id: itemCupId, name: '16 oz', quantity: 3 },
    { id: canonicalCupId, name: '12 oz', quantity: 2 },
  ]);
});

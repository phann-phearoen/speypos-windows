import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let normalizeOrderPayload;
let createGroup;
let createOption;
let createCupSize;

const dbPath = `data/test-order-cup-size-canonicalization-${Date.now()}.db`;

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
  ({ normalizeOrderPayload } = await import('../controllers/order.controller.js'));
  ({ create: createGroup } = await import('../storage/repositories/customization-option-group.repo.js'));
  ({ create: createOption } = await import('../storage/repositories/customization-option.repo.js'));
  ({ createCupSize } = await import('../storage/repositories/cup-size.repo.js'));

  initializeDatabase();
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
});

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM CustomizationOption;');
  db.exec('DELETE FROM CustomizationOptionGroup;');
  db.exec('DELETE FROM CupSize;');
});

function createBaseGroup() {
  return createGroup({
    name: `Group ${Date.now()}`,
    selection_type: 'single',
    required: false,
    sort_order: 0,
    default_option_id: null,
  });
}

test('normalizes option-driven cup size to a single canonical cup_size customization row', () => {
  const group = createBaseGroup();
  const cup = createCupSize({ size: 'Large', unit: 'oz' });
  const option = createOption({
    customization_group_id: group.id,
    label: 'Upsize Large',
    cup_size_id: cup.id,
    price_delta: 75,
    sort_order: 0,
  });

  const payload = {
    shift_id: 'shift-1',
    staff_id: 'staff-1',
    items: [
      {
        menu_item_id: 'item-1',
        quantity: 1,
        unit_price: 500,
        customizations: [
          {
            name: 'Size',
            option_type: 'customization_option',
            value: option.id,
            price: 75,
          },
        ],
      },
    ],
  };

  const normalized = normalizeOrderPayload(payload);
  const normalizedCustomizations = normalized.items[0].customizations;

  assert.equal(normalizedCustomizations.length, 2);
  assert.equal(normalizedCustomizations[0].option_type, 'cup_size');
  assert.equal(normalizedCustomizations[0].value, cup.id);
  assert.equal(normalizedCustomizations[0].name, 'Large (oz)');

  assert.equal(normalizedCustomizations[1].option_type, 'customization_option');
  assert.equal(normalizedCustomizations[1].value, option.id);
  assert.equal(normalizedCustomizations[1].name, 'Upsize Large');
});

test('legacy cup_size customization is replaced by canonical snapshot and not duplicated', () => {
  const group = createBaseGroup();
  const cup = createCupSize({ size: 'Medium', unit: 'oz' });
  const option = createOption({
    customization_group_id: group.id,
    label: 'Medium Upgrade',
    cup_size_id: null,
    price_delta: 50,
    sort_order: 0,
  });

  const payload = {
    shift_id: 'shift-1',
    staff_id: 'staff-1',
    items: [
      {
        menu_item_id: 'item-1',
        quantity: 1,
        unit_price: 400,
        customizations: [
          {
            name: 'Cup Size',
            option_type: 'cup_size',
            value: cup.id,
            price: 0,
          },
          {
            name: 'Size',
            option_type: 'customization_option',
            value: option.id,
            price: 50,
          },
        ],
      },
    ],
  };

  const normalized = normalizeOrderPayload(payload);
  const normalizedCustomizations = normalized.items[0].customizations;
  const cupSizeRows = normalizedCustomizations.filter((c) => c.option_type === 'cup_size');

  assert.equal(cupSizeRows.length, 1);
  assert.equal(cupSizeRows[0].value, cup.id);
  assert.equal(cupSizeRows[0].name, 'Medium (oz)');
});

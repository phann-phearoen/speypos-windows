import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let createGroup;
let createOption;
let getById;
let updateOption;
let createCupSize;
let deleteCupSize;

const dbPath = `data/test-customization-option-cup-size-${Date.now()}.db`;

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
  ({ create: createGroup } = await import('../storage/repositories/customization-option-group.repo.js'));
  ({ create: createOption, getById, update: updateOption } = await import('../storage/repositories/customization-option.repo.js'));
  ({ createCupSize, deleteCupSize } = await import('../storage/repositories/cup-size.repo.js'));

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
    name: `Size Group ${Date.now()}`,
    selection_type: 'single',
    required: false,
    sort_order: 0,
    default_option_id: null,
  });
}

test('creates option with cup_size_id', () => {
  const group = createBaseGroup();
  const cup = createCupSize({ size: 'Large', unit: 'oz' });

  const option = createOption({
    customization_group_id: group.id,
    label: 'Upsize',
    cup_size_id: cup.id,
    price_delta: 50,
    sort_order: 0,
  });

  assert.equal(option.cup_size_id, cup.id);
});

test('updates option cup_size_id to null', () => {
  const group = createBaseGroup();
  const cup = createCupSize({ size: 'Medium', unit: 'oz' });

  const created = createOption({
    customization_group_id: group.id,
    label: 'Medium Upgrade',
    cup_size_id: cup.id,
    price_delta: 25,
    sort_order: 0,
  });

  const updated = updateOption(created.id, { cup_size_id: null });
  assert.equal(updated.cup_size_id, null);
});

test('rejects invalid cup_size_id foreign key', () => {
  const group = createBaseGroup();

  assert.throws(
    () => {
      createOption({
        customization_group_id: group.id,
        label: 'Invalid Upsize',
        cup_size_id: 'missing-cup-size-id',
        price_delta: 100,
        sort_order: 0,
      });
    },
    (error) => error && error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY'
  );
});

test('deleting cup size nulls linked customization option cup_size_id', () => {
  const group = createBaseGroup();
  const cup = createCupSize({ size: 'Small', unit: 'oz' });

  const option = createOption({
    customization_group_id: group.id,
    label: 'Small Cup',
    cup_size_id: cup.id,
    price_delta: 0,
    sort_order: 0,
  });

  deleteCupSize(cup.id);

  const refreshed = getById(option.id);
  assert.equal(refreshed.cup_size_id, null);
});

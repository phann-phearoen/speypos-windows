import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let cupSizeService;
let createMenuItem;
let createMenuCategory;

const dbPath = `data/test-cup-size-service-${Date.now()}.db`;

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
  cupSizeService = await import('../services/cup-size.service.js');
  ({ createMenuItem } = await import('../storage/repositories/menu-item.repo.js'));
  ({ createMenuCategory } = await import('../storage/repositories/menu-category.repo.js'));

  initializeDatabase();
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
});

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM MenuItemCupSizeMap;');
  db.exec('DELETE FROM MenuCategoryCupSizeMap;');
  db.exec('DELETE FROM CupSize;');
  db.exec('DELETE FROM MenuItemCategoryMap;');
  db.exec('DELETE FROM MenuItem;');
  db.exec('DELETE FROM MenuCategory;');
});

test('creates and lists cup sizes', () => {
  const created = cupSizeService.createCupSize({ size: 'Small', unit: 'oz' });
  assert.ok(created.id);
  assert.equal(created.size, 'Small');
  assert.equal(created.unit, 'oz');

  const all = cupSizeService.getCupSizes();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, created.id);
});

test('updates and deletes a cup size', () => {
  const created = cupSizeService.createCupSize({ size: '18', unit: 'oz' });

  const updated = cupSizeService.updateCupSize(created.id, { size: '20', unit: 'oz' });
  assert.equal(updated.size, '20');
  assert.equal(updated.unit, 'oz');

  const deleted = cupSizeService.deleteCupSize(created.id);
  assert.equal(deleted.changes, 1);
  assert.equal(cupSizeService.getCupSizeById(created.id), undefined);
});

test('category cup size applies when item has no item-level mapping', () => {
  const category = createMenuCategory({
    id: 'cat-1',
    name: 'Coffee',
    image_url: null,
    sort_order: 0,
    created_at: Date.now(),
  });

  const item = createMenuItem({
    id: 'item-1',
    name: 'Latte',
    image_url: null,
    price: 300,
    created_at: Date.now(),
  });

  const small = cupSizeService.createCupSize({ size: 'Small', unit: 'oz' });
  const medium = cupSizeService.createCupSize({ size: 'Medium', unit: 'oz' });

  cupSizeService.createMenuCategoryCupSizeMap({ menu_category_id: category.id, cup_size_id: small.id });
  cupSizeService.createMenuCategoryCupSizeMap({ menu_category_id: category.id, cup_size_id: medium.id });

  const effective = cupSizeService.getEffectiveCupSizeIdsForItem(item.id, [category.id]);
  assert.deepEqual(effective, [medium.id]);
  assert.equal(cupSizeService.getMenuCategoryCupSizeMaps({ menu_category_id: category.id }).length, 1);
});

test('item cup sizes override category cup sizes when present', () => {
  const category = createMenuCategory({
    id: 'cat-1',
    name: 'Coffee',
    image_url: null,
    sort_order: 0,
    created_at: Date.now(),
  });

  const item = createMenuItem({
    id: 'item-1',
    name: 'Latte',
    image_url: null,
    price: 300,
    created_at: Date.now(),
  });

  const small = cupSizeService.createCupSize({ size: 'Small', unit: 'oz' });
  const large = cupSizeService.createCupSize({ size: 'Large', unit: 'oz' });

  cupSizeService.createMenuCategoryCupSizeMap({ menu_category_id: category.id, cup_size_id: small.id });
  cupSizeService.createMenuItemCupSizeMap({ menu_item_id: item.id, cup_size_id: large.id });

  const effective = cupSizeService.getEffectiveCupSizeIdsForItem(item.id, [category.id]);
  assert.deepEqual(effective, [large.id]);
});

test('item cup-size assignment replaces the previous assignment', () => {
  const item = createMenuItem({
    id: 'item-1',
    name: 'Latte',
    image_url: null,
    price: 300,
    created_at: Date.now(),
  });
  const small = cupSizeService.createCupSize({ size: 'Small', unit: 'oz' });
  const large = cupSizeService.createCupSize({ size: 'Large', unit: 'oz' });

  cupSizeService.createMenuItemCupSizeMap({ menu_item_id: item.id, cup_size_id: small.id });
  cupSizeService.createMenuItemCupSizeMap({ menu_item_id: item.id, cup_size_id: large.id });

  const mappings = cupSizeService.getMenuItemCupSizeMaps({ menu_item_id: item.id });
  assert.deepEqual(mappings.map((mapping) => mapping.cup_size_id), [large.id]);
});

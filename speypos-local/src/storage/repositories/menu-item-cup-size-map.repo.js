import { randomUUID } from 'crypto';
import { getDb } from '../database.js';

export function createMap(mapData) {
  const db = getDb();
  const { menu_item_id, cup_size_id } = mapData;
  const replaceMap = db.transaction(() => {
    const existing = db
      .prepare('SELECT * FROM MenuItemCupSizeMap WHERE menu_item_id = ?')
      .get(menu_item_id);

    if (existing?.cup_size_id === cup_size_id) {
      return existing;
    }

    db.prepare('DELETE FROM MenuItemCupSizeMap WHERE menu_item_id = ?').run(menu_item_id);

    const id = randomUUID();
    db.prepare('INSERT INTO MenuItemCupSizeMap (id, menu_item_id, cup_size_id) VALUES (?, ?, ?)').run(
      id,
      menu_item_id,
      cup_size_id
    );
    return db.prepare('SELECT * FROM MenuItemCupSizeMap WHERE id = ?').get(id);
  });

  return replaceMap();
}

export function remove(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM MenuItemCupSizeMap WHERE id = ?');
  return stmt.run(id);
}

export function getMaps(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM MenuItemCupSizeMap';
  const params = [];
  const conditions = [];

  if (filters.menu_item_id) {
    conditions.push('menu_item_id = ?');
    params.push(filters.menu_item_id);
  }
  if (filters.cup_size_id) {
    conditions.push('cup_size_id = ?');
    params.push(filters.cup_size_id);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

export function getMappingsByItemIds(itemIds) {
  if (!itemIds || itemIds.length === 0) {
    return [];
  }

  const db = getDb();
  const placeholders = itemIds.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM MenuItemCupSizeMap WHERE menu_item_id IN (${placeholders})`);
  return stmt.all(...itemIds);
}

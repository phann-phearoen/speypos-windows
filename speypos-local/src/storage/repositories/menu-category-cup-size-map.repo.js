import { randomUUID } from 'crypto';
import { getDb } from '../database.js';

export function createMap(mapData) {
  const db = getDb();
  const { menu_category_id, cup_size_id } = mapData;
  const id = randomUUID();
  const stmt = db.prepare('INSERT INTO MenuCategoryCupSizeMap (id, menu_category_id, cup_size_id) VALUES (?, ?, ?)');
  stmt.run(id, menu_category_id, cup_size_id);
  return db.prepare('SELECT * FROM MenuCategoryCupSizeMap WHERE id = ?').get(id);
}

export function remove(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM MenuCategoryCupSizeMap WHERE id = ?');
  return stmt.run(id);
}

export function getMaps(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM MenuCategoryCupSizeMap';
  const params = [];
  const conditions = [];

  if (filters.menu_category_id) {
    conditions.push('menu_category_id = ?');
    params.push(filters.menu_category_id);
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

export function getMappingsByCategoryIds(categoryIds) {
  if (!categoryIds || categoryIds.length === 0) {
    return [];
  }

  const db = getDb();
  const placeholders = categoryIds.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM MenuCategoryCupSizeMap WHERE menu_category_id IN (${placeholders})`);
  return stmt.all(...categoryIds);
}

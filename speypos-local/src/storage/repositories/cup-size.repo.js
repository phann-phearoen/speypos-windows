import { randomUUID } from 'crypto';
import { getDb } from '../database.js';

export function getAllCupSizes() {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT * FROM CupSize
     ORDER BY
       CASE WHEN CAST(size AS REAL) > 0 THEN 0 ELSE 1 END,
       CAST(size AS REAL) ASC,
       size ASC,
       unit ASC`
  );
  return stmt.all();
}

export function getCupSizeById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM CupSize WHERE id = ?');
  return stmt.get(id);
}

export function getCupSizesByIds(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const db = getDb();
  const placeholders = ids.map(() => '?').join(', ');
  const stmt = db.prepare(`SELECT * FROM CupSize WHERE id IN (${placeholders})`);
  return stmt.all(...ids);
}

export function createCupSize(data) {
  const db = getDb();
  const { size, unit } = data;
  const id = randomUUID();
  const created_at = Date.now();

  const stmt = db.prepare('INSERT INTO CupSize (id, size, unit, created_at) VALUES (?, ?, ?, ?)');
  stmt.run(id, size, unit, created_at);
  return getCupSizeById(id);
}

export function updateCupSize(id, data) {
  const db = getDb();
  const updateData = {
    ...data,
    updated_at: Date.now(),
  };
  const fields = Object.keys(updateData);
  const values = Object.values(updateData);

  if (fields.length === 0) {
    return getCupSizeById(id);
  }

  const setClause = fields.map((field) => `${field} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE CupSize SET ${setClause} WHERE id = ?`);
  stmt.run(...values, id);

  return getCupSizeById(id);
}

export function deleteCupSize(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM CupSize WHERE id = ?');
  return stmt.run(id);
}

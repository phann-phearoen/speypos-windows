import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function parseDbPath() {
  const arg = process.argv.find((entry) => entry.startsWith('--db='));
  if (arg) {
    return arg.slice('--db='.length);
  }

  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  const posDb = path.resolve('data/pos.db');
  if (fs.existsSync(posDb)) {
    return posDb;
  }

  return path.resolve('data/speypos.db');
}

function row(db, sql) {
  return db.prepare(sql).get();
}

function hasColumn(db, tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((col) => col.name === columnName);
}

function hasTable(db, tableName) {
  const found = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  return !!found;
}

const dbPath = parseDbPath();
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found: ${dbPath}`);
  console.error('Provide a valid path with --db=<path> or set DB_PATH in environment.');
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

try {
  if (!hasTable(db, 'BusinessDay') || !hasColumn(db, 'Shift', 'business_day_id')) {
    console.error('Schema is not ready for Step 2 validation.');
    console.error('Expected table/column missing: BusinessDay and/or Shift.business_day_id.');
    console.error('Run app migrations first, then re-run this validator.');
    process.exit(1);
  }

  const totalShift = row(db, 'SELECT COUNT(*) AS count FROM Shift').count;
  const linkedShift = row(db, 'SELECT COUNT(*) AS count FROM Shift WHERE business_day_id IS NOT NULL').count;
  const distinctShiftDates = row(db, 'SELECT COUNT(DISTINCT date) AS count FROM Shift').count;
  const totalBusinessDay = row(db, 'SELECT COUNT(*) AS count FROM BusinessDay').count;
  const duplicateBusinessDayKeys = row(
    db,
    `SELECT COUNT(*) AS count
     FROM (
       SELECT store_id, business_date
       FROM BusinessDay
       GROUP BY store_id, business_date
       HAVING COUNT(*) > 1
     ) t`
  ).count;
  const brokenShiftLinks = row(
    db,
    `SELECT COUNT(*) AS count
     FROM Shift s
     LEFT JOIN BusinessDay bd ON bd.id = s.business_day_id
     WHERE s.business_day_id IS NOT NULL AND bd.id IS NULL`
  ).count;

  const summary = {
    dbPath,
    totalShift,
    linkedShift,
    unlinkedShift: totalShift - linkedShift,
    distinctShiftDates,
    totalBusinessDay,
    duplicateBusinessDayKeys,
    brokenShiftLinks,
  };

  console.log('BusinessDay Backfill Validation');
  console.log(JSON.stringify(summary, null, 2));

  const failures = [];

  if (totalShift > 0 && linkedShift !== totalShift) {
    failures.push('Not all Shift rows are linked to BusinessDay.');
  }

  if (brokenShiftLinks > 0) {
    failures.push('Some Shift.business_day_id values reference missing BusinessDay rows.');
  }

  if (duplicateBusinessDayKeys > 0) {
    failures.push('Duplicate (store_id, business_date) rows found in BusinessDay.');
  }

  if (totalBusinessDay < distinctShiftDates) {
    failures.push('BusinessDay rows are fewer than distinct Shift dates.');
  }

  if (failures.length > 0) {
    console.error('Validation failed:');
    for (const message of failures) {
      console.error(`- ${message}`);
    }
    process.exit(1);
  }

  console.log('Validation passed.');
} finally {
  db.close();
}

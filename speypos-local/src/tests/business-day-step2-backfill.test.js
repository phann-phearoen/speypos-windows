import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const migrationDir = path.resolve(projectRoot, 'src/storage/migrations');

const dbPath = path.resolve(projectRoot, `data/test-business-day-step2-${Date.now()}.db`);
const cleanupTargets = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];

function readMigration(fileName) {
  return fs.readFile(path.join(migrationDir, fileName), 'utf-8');
}

function insertShift(db, { date, status, startedAt, endedAt }) {
  db.prepare(
    `INSERT INTO Shift (id, status, started_at, ended_at, date, telegram_reported_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), status, startedAt, endedAt, date, null);
}

after(async () => {
  for (const target of cleanupTargets) {
    await fs.rm(target, { force: true });
  }
});

test('Step2 migration backfills BusinessDay and links Shift rows', async () => {
  const db = new Database(dbPath);

  try {
    const preBackfillMigrations = [
      '001_initial_schema.sql',
      '002_order_number_per_shift.sql',
      '003_day_closes.sql',
      '004_backfill_day_closes.sql',
      '005_outbox_events.sql',
      '006_business_day_semanticization.sql',
    ];

    for (const file of preBackfillMigrations) {
      db.exec(await readMigration(file));
    }

    const closedDate = '2026-07-27';
    const openDate = '2026-07-28';

    insertShift(db, {
      date: closedDate,
      status: 'closed',
      startedAt: 1000,
      endedAt: 2000,
    });
    insertShift(db, {
      date: closedDate,
      status: 'closed',
      startedAt: 1500,
      endedAt: 2500,
    });
    insertShift(db, {
      date: openDate,
      status: 'open',
      startedAt: 3000,
      endedAt: null,
    });

    db.prepare('INSERT INTO DayClose (date, closed_at) VALUES (?, ?)').run(closedDate, 9999);

    db.exec(await readMigration('007_backfill_business_days.sql'));

    const businessDays = db
      .prepare(
        `SELECT store_id, business_date, status, opened_at, closed_at
         FROM BusinessDay
         ORDER BY business_date ASC`
      )
      .all();

    assert.equal(businessDays.length, 2);
    assert.deepEqual(businessDays[0], {
      store_id: 'default',
      business_date: closedDate,
      status: 'CLOSED',
      opened_at: 1000,
      closed_at: 9999,
    });
    assert.deepEqual(businessDays[1], {
      store_id: 'default',
      business_date: openDate,
      status: 'OPEN',
      opened_at: 3000,
      closed_at: null,
    });

    const unlinkedShiftCount = db
      .prepare('SELECT COUNT(*) AS count FROM Shift WHERE business_day_id IS NULL')
      .get().count;
    assert.equal(unlinkedShiftCount, 0);

    const mismatchedLinks = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM Shift s
         JOIN BusinessDay bd ON bd.id = s.business_day_id
         WHERE s.date != bd.business_date`
      )
      .get().count;
    assert.equal(mismatchedLinks, 0);
  } finally {
    db.close();
  }
});

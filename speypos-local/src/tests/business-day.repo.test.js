import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';

let initializeDatabase;
let closeDatabase;
let getDb;
let repo;

const dbPath = `data/test-business-day-repo-${Date.now()}.db`;

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
  repo = await import('../storage/repositories/business-day.repo.js');

  initializeDatabase();
});

after(async () => {
  closeDatabase();
  await cleanupDbFiles();
});

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM BusinessDay;');
});

test('createOpenDay creates row and getByBusinessDate returns it', () => {
  const created = repo.createOpenDay({ businessDate: '2026-07-29', openedAt: 1000, now: 2000 });

  assert.ok(created?.id);
  assert.equal(created.store_id, 'default');
  assert.equal(created.business_date, '2026-07-29');
  assert.equal(created.status, repo.BUSINESS_DAY_STATUS.OPEN);
  assert.equal(created.opened_at, 1000);
  assert.equal(created.created_at, 2000);

  const fetched = repo.getByBusinessDate('default', '2026-07-29');
  assert.equal(fetched?.id, created.id);
});

test('createOpenDay is idempotent for duplicate store/date', () => {
  const first = repo.createOpenDay({ businessDate: '2026-07-29' });
  const second = repo.createOpenDay({ businessDate: '2026-07-29' });

  assert.ok(first?.id);
  assert.equal(second?.id, first.id);

  const db = getDb();
  const row = db
    .prepare('SELECT COUNT(*) AS count FROM BusinessDay WHERE store_id = ? AND business_date = ?')
    .get('default', '2026-07-29');
  assert.equal(row.count, 1);
});

test('transitionStatus updates only when fromStatus matches', () => {
  const db = getDb();
  db.prepare(
    `INSERT INTO Staff (id, name, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run('staff-1', 'Step3 Staff', 'pw', 'staff', 'active', Date.now(), null);

  const created = repo.createOpenDay({ businessDate: '2026-07-29' });

  const noUpdate = repo.transitionStatus(
    created.id,
    repo.BUSINESS_DAY_STATUS.CLOSED,
    repo.BUSINESS_DAY_STATUS.CLOSING
  );
  assert.equal(noUpdate, null);

  const closing = repo.transitionStatus(
    created.id,
    repo.BUSINESS_DAY_STATUS.OPEN,
    repo.BUSINESS_DAY_STATUS.CLOSING,
    { now: 3000 }
  );
  assert.equal(closing?.status, repo.BUSINESS_DAY_STATUS.CLOSING);
  assert.equal(closing?.updated_at, 3000);

  const closed = repo.transitionStatus(
    created.id,
    repo.BUSINESS_DAY_STATUS.CLOSING,
    repo.BUSINESS_DAY_STATUS.CLOSED,
    { closedAt: 4000, closedByStaffId: 'staff-1', closeReportRef: 'report-123', now: 5000 }
  );

  assert.equal(closed?.status, repo.BUSINESS_DAY_STATUS.CLOSED);
  assert.equal(closed?.closed_at, 4000);
  assert.equal(closed?.closed_by_staff_id, 'staff-1');
  assert.equal(closed?.close_report_ref, 'report-123');
  assert.equal(closed?.updated_at, 5000);
});

test('getPreviousBusinessDay returns nearest prior day', () => {
  repo.createOpenDay({ businessDate: '2026-07-27' });
  repo.createOpenDay({ businessDate: '2026-07-28' });
  repo.createOpenDay({ businessDate: '2026-07-29' });

  const previous = repo.getPreviousBusinessDay('default', '2026-07-29');
  assert.equal(previous?.business_date, '2026-07-28');

  const none = repo.getPreviousBusinessDay('default', '2026-07-27');
  assert.equal(none, null);
});

test('listByRange supports date range, status filter, and limit', () => {
  const d1 = repo.createOpenDay({ businessDate: '2026-07-27' });
  const d2 = repo.createOpenDay({ businessDate: '2026-07-28' });
  const d3 = repo.createOpenDay({ businessDate: '2026-07-29' });

  repo.transitionStatus(d2.id, repo.BUSINESS_DAY_STATUS.OPEN, repo.BUSINESS_DAY_STATUS.CLOSED, {
    closedAt: 5000,
  });

  const ranged = repo.listByRange('default', {
    startDate: '2026-07-28',
    endDate: '2026-07-29',
  });
  assert.deepEqual(
    ranged.map((x) => x.business_date),
    ['2026-07-28', '2026-07-29']
  );

  const closedOnly = repo.listByRange('default', { status: repo.BUSINESS_DAY_STATUS.CLOSED });
  assert.deepEqual(closedOnly.map((x) => x.business_date), ['2026-07-28']);

  const limited = repo.listByRange('default', { limit: 2 });
  assert.equal(limited.length, 2);
  assert.deepEqual(
    limited.map((x) => x.business_date),
    ['2026-07-27', '2026-07-28']
  );

  assert.ok(d1 && d2 && d3);
});

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';

let getDb;
let totpService;
let staffTotpRepo;
let grantRepo;
let voidOrder;
let secretCrypto;
let AUTHORIZATION_ACTIONS;
let GRANT_TTL_MS;
let authenticator;

const dbPath = `data/test-totp-authorization-${Date.now()}.db`;

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
  };
}

function insertStaff(db, { id, name, role, status = 'active' }) {
  db.prepare(
    `INSERT INTO Staff (id, name, password, role, status, created_at) VALUES (?, ?, 'x', ?, ?, ?)`
  ).run(id, name, role, status, Date.now());
}

function insertShift(db, id) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO Shift (id, status, started_at, date) VALUES (?, 'open', ?, ?)`
  ).run(id, now, new Date(now).toISOString().slice(0, 10));
}

function insertOrder(db, { id, shiftId, staffId, status = 'completed' }) {
  db.prepare(
    `INSERT INTO "Order" (id, shift_id, staff_id, status, total_amount, total_items, created_at)
     VALUES (?, ?, ?, ?, 1000, 1, ?)`
  ).run(id, shiftId, staffId, status, Date.now());
}

before(async () => {
  process.env.PORT = process.env.PORT || '8080';
  process.env.PRINTER_NAME = process.env.PRINTER_NAME || 'TEST_PRINTER';
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TEST_TOKEN';
  process.env.DB_PATH = dbPath;

  const database = await import('../storage/database.js');
  getDb = database.getDb;
  database.initializeDatabase();

  totpService = await import('../services/totp.service.js');
  staffTotpRepo = await import('../storage/repositories/staff-totp.repo.js');
  grantRepo = await import('../storage/repositories/authorization-grant.repo.js');
  secretCrypto = await import('../utils/secret-crypto.js');
  ({ AUTHORIZATION_ACTIONS, GRANT_TTL_MS } = await import('../constants/authorization.constants.js'));
  ({ voidOrder } = await import('../controllers/order.controller.js'));
  ({ authenticator } = await import('otplib'));
});

after(async () => {
  await fs.rm(dbPath, { force: true });
  await fs.rm(`${dbPath}-wal`, { force: true });
  await fs.rm(`${dbPath}-shm`, { force: true });
});

test('secret-crypto: encrypt/decrypt round-trips', () => {
  const original = 'JBSWY3DPEHPK3PXP';
  const encrypted = secretCrypto.encryptSecret(original);
  assert.notEqual(encrypted, original);
  assert.equal(secretCrypto.decryptSecret(encrypted), original);
});

test('totp.service: verifyCode accepts a freshly generated code and rejects garbage', () => {
  const secret = totpService.generateSecret();
  const token = authenticator.generate(secret);

  const step = totpService.verifyCode(secret, token);
  assert.notEqual(step, null);
  assert.equal(totpService.verifyCode(secret, '000000'), null);
  assert.equal(totpService.verifyCode(secret, 'abcdef'), null);
});

test('staff-totp.repo: upsertSecret/getSecret/getStatus round-trip and re-enroll invalidates old secret', () => {
  const staffId = randomUUID();
  const db = getDb();
  insertStaff(db, { id: staffId, name: 'Admin One', role: 'admin' });

  assert.deepEqual(staffTotpRepo.getStatus(staffId), { enrolled: false, enrolled_at: null });

  staffTotpRepo.upsertSecret(staffId, 'SECRETONE');
  assert.equal(staffTotpRepo.getSecret(staffId), 'SECRETONE');
  assert.equal(staffTotpRepo.getStatus(staffId).enrolled, true);

  staffTotpRepo.upsertSecret(staffId, 'SECRETTWO');
  assert.equal(staffTotpRepo.getSecret(staffId), 'SECRETTWO');
});

test('authorization-grant.repo: replay is rejected, and grants are resource-scoped + single-use', () => {
  const adminId = randomUUID();
  const staffId = randomUUID();
  const db = getDb();
  insertStaff(db, { id: adminId, name: 'Admin Two', role: 'admin' });
  insertStaff(db, { id: staffId, name: 'Staff One', role: 'staff' });

  const grant = grantRepo.createGrant({
    action: AUTHORIZATION_ACTIONS.ORDER_VOID,
    resourceType: 'order',
    resourceId: 'order-1',
    adminStaffId: adminId,
    requestedByStaffId: staffId,
    codeStep: 123456,
  });

  assert.ok(grantRepo.findByAdminAndStep(adminId, 123456), 'replay lookup should find the grant');

  const found = grantRepo.findUnconsumedGrant({
    action: AUTHORIZATION_ACTIONS.ORDER_VOID,
    resourceType: 'order',
    resourceId: 'order-1',
    ttlMs: GRANT_TTL_MS,
  });
  assert.equal(found.id, grant.id);

  grantRepo.consumeGrant(grant.id);
  const foundAfterConsume = grantRepo.findUnconsumedGrant({
    action: AUTHORIZATION_ACTIONS.ORDER_VOID,
    resourceType: 'order',
    resourceId: 'order-1',
    ttlMs: GRANT_TTL_MS,
  });
  assert.equal(foundAfterConsume, undefined);
});

test('voidOrder: admin role voids directly without any grant', async () => {
  const db = getDb();
  const adminId = randomUUID();
  const shiftId = randomUUID();
  const orderId = randomUUID();
  insertStaff(db, { id: adminId, name: 'Admin Direct', role: 'admin' });
  insertShift(db, shiftId);
  insertOrder(db, { id: orderId, shiftId, staffId: adminId });

  const req = {
    params: { id: orderId },
    headers: { 'x-user-role': 'admin' },
    body: { void_reason: 'mistake', voided_by: adminId },
  };
  const res = makeRes();
  await voidOrder(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'voided');
});

test('voidOrder: staff role without a grant is rejected, succeeds with a valid grant, and cannot reuse it', async () => {
  const db = getDb();
  const adminId = randomUUID();
  const staffId = randomUUID();
  const shiftId = randomUUID();
  const orderId = randomUUID();
  insertStaff(db, { id: adminId, name: 'Admin Grant', role: 'admin' });
  insertStaff(db, { id: staffId, name: 'Staff Grant', role: 'staff' });
  insertShift(db, shiftId);
  insertOrder(db, { id: orderId, shiftId, staffId });

  const baseReq = {
    params: { id: orderId },
    headers: { 'x-user-role': 'staff' },
    body: { void_reason: 'mistake', voided_by: staffId },
  };

  const denied = makeRes();
  await voidOrder({ ...baseReq }, denied);
  assert.equal(denied.statusCode, 403);

  grantRepo.createGrant({
    action: AUTHORIZATION_ACTIONS.ORDER_VOID,
    resourceType: 'order',
    resourceId: orderId,
    adminStaffId: adminId,
    requestedByStaffId: staffId,
    codeStep: 999999,
  });

  const granted = makeRes();
  await voidOrder({ ...baseReq }, granted);
  assert.equal(granted.statusCode, 200);
  assert.equal(granted.body.status, 'voided');
  assert.equal(granted.body.authorized_by, adminId);
});

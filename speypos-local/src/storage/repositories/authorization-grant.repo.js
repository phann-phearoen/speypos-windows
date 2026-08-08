import { getDb } from '../database.js';
import { randomUUID } from 'crypto';

/**
 * Looks up a prior grant issued for this exact (admin, time-step) pair, for replay rejection.
 */
export function findByAdminAndStep(adminStaffId, codeStep) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM AuthorizationGrant WHERE admin_staff_id = ? AND code_step = ?')
    .get(adminStaffId, codeStep);
}

/**
 * Records a one-time authorization grant after a code has been verified.
 */
export function createGrant({ action, resourceType, resourceId, adminStaffId, requestedByStaffId, codeStep, reason }) {
  const db = getDb();
  const id = randomUUID();
  const created_at = Date.now();

  db.prepare(
    `INSERT INTO AuthorizationGrant
      (id, action, resource_type, resource_id, admin_staff_id, requested_by_staff_id, code_step, reason, created_at, consumed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
  ).run(id, action, resourceType, resourceId, adminStaffId, requestedByStaffId, codeStep, reason || null, created_at);

  return db.prepare('SELECT * FROM AuthorizationGrant WHERE id = ?').get(id);
}

/**
 * Finds the most recent unconsumed, unexpired grant for a specific action + resource.
 */
export function findUnconsumedGrant({ action, resourceType, resourceId, ttlMs }) {
  const db = getDb();
  const notBefore = Date.now() - ttlMs;

  return db
    .prepare(
      `SELECT * FROM AuthorizationGrant
       WHERE action = ? AND resource_type = ? AND resource_id = ?
         AND consumed_at IS NULL AND created_at >= ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(action, resourceType, resourceId, notBefore);
}

/**
 * Marks a grant as spent so it cannot authorize a second mutation.
 */
export function consumeGrant(id) {
  const db = getDb();
  db.prepare('UPDATE AuthorizationGrant SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL').run(Date.now(), id);
}

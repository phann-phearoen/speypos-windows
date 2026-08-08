import { getDb } from '../database.js';
import { encryptSecret, decryptSecret } from '../../utils/secret-crypto.js';

/**
 * Stores (or replaces) an admin's TOTP secret, encrypted at rest.
 * Replacing the secret invalidates any previously enrolled authenticator entry.
 * @param {string} staffId
 * @param {string} plainSecret
 */
export function upsertSecret(staffId, plainSecret) {
  const db = getDb();
  const now = Date.now();
  const secret_encrypted = encryptSecret(plainSecret);

  db.prepare(
    `INSERT INTO StaffTotpSecret (staff_id, secret_encrypted, enrolled_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(staff_id) DO UPDATE SET secret_encrypted = excluded.secret_encrypted, updated_at = excluded.updated_at`
  ).run(staffId, secret_encrypted, now, now);
}

/**
 * Retrieves the decrypted secret for a staff member, or null if not enrolled.
 * @param {string} staffId
 * @returns {string | null}
 */
export function getSecret(staffId) {
  const db = getDb();
  const row = db.prepare('SELECT secret_encrypted FROM StaffTotpSecret WHERE staff_id = ?').get(staffId);
  return row ? decryptSecret(row.secret_encrypted) : null;
}

/**
 * Enrollment status only; never exposes the secret itself.
 * @param {string} staffId
 */
export function getStatus(staffId) {
  const db = getDb();
  const row = db.prepare('SELECT enrolled_at FROM StaffTotpSecret WHERE staff_id = ?').get(staffId);
  return { enrolled: !!row, enrolled_at: row?.enrolled_at ?? null };
}

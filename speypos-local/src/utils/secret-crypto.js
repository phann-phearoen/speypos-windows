import crypto from 'crypto';
import { getDb } from '../storage/database.js';

const ALGORITHM = 'aes-256-gcm';
const MASTER_KEY_ROW = 'totp_master_key';

// Lazily generated once per install and stored outside the publicly-readable Settings table.
function getOrCreateMasterKey() {
  const db = getDb();
  const row = db.prepare('SELECT value FROM AppSecret WHERE key = ?').get(MASTER_KEY_ROW);
  if (row) {
    return Buffer.from(row.value, 'hex');
  }

  const key = crypto.randomBytes(32);
  db.prepare('INSERT INTO AppSecret (key, value) VALUES (?, ?)').run(MASTER_KEY_ROW, key.toString('hex'));
  return key;
}

/**
 * Encrypts a plain-text secret (e.g. a TOTP secret) for storage at rest.
 * @param {string} plainText
 * @returns {string} "iv:authTag:ciphertext" hex-encoded.
 */
export function encryptSecret(plainText) {
  const key = getOrCreateMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((buf) => buf.toString('hex')).join(':');
}

/**
 * Decrypts a value produced by encryptSecret.
 * @param {string} payload
 * @returns {string}
 */
export function decryptSecret(payload) {
  const key = getOrCreateMasterKey();
  const [ivHex, authTagHex, dataHex] = payload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

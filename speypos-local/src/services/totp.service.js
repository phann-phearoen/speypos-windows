import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { TOTP_WINDOW_STEPS } from '../constants/authorization.constants.js';

const STEP_SECONDS = 30;

// Allow +/- TOTP_WINDOW_STEPS of clock drift between the server and the authenticator app.
authenticator.options = { window: TOTP_WINDOW_STEPS };

export function generateSecret() {
  return authenticator.generateSecret();
}

/**
 * Builds the otpauth:// URI and a scannable QR code data URL for enrollment.
 * Callers must only surface this once; the secret cannot be retrieved again afterward.
 */
export async function getEnrollmentQr(secret, accountLabel, issuer = 'SpeyPOS') {
  const otpauth_url = authenticator.keyuri(accountLabel, issuer, secret);
  const qr_data_url = await QRCode.toDataURL(otpauth_url);
  return { otpauth_url, qr_data_url };
}

/**
 * Verifies a 6-digit code against a secret, allowing +/- TOTP_WINDOW_STEPS clock drift.
 * @returns {number | null} The matched time-step (for replay tracking), or null if invalid.
 */
export function verifyCode(secret, code) {
  const token = String(code || '');
  if (!/^\d{6}$/.test(token)) {
    return null;
  }

  const delta = authenticator.checkDelta(token, secret);
  if (delta === null || delta === undefined) {
    return null;
  }

  return Math.floor(Date.now() / 1000 / STEP_SECONDS) + delta;
}


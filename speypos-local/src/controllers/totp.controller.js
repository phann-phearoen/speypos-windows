import { getStaffById } from '../storage/repositories/staff.repo.js';
import * as staffTotpRepo from '../storage/repositories/staff-totp.repo.js';
import * as grantRepo from '../storage/repositories/authorization-grant.repo.js';
import * as totpService from '../services/totp.service.js';
import { GRANT_TTL_MS } from '../constants/authorization.constants.js';
import { logger } from '../utils/logger.js';

/**
 * Enrolls (or re-enrolls) an admin's authenticator. The plain secret/QR is only ever
 * returned in this response; it cannot be retrieved again afterward.
 */
export async function enroll(req, res) {
  try {
    const { staff_id } = req.body;
    if (!staff_id) {
      return res.status(400).json({ error: 'Missing required field: staff_id' });
    }

    const staff = getStaffById(staff_id);
    if (!staff || staff.role !== 'admin') {
      return res.status(404).json({ error: 'Admin staff member not found' });
    }

    const secret = totpService.generateSecret();
    staffTotpRepo.upsertSecret(staff_id, secret);
    const { otpauth_url, qr_data_url } = await totpService.getEnrollmentQr(secret, staff.name);

    res.status(200).json({ otpauth_url, qr_data_url, secret });
  } catch (error) {
    logger.error('Failed to enroll TOTP authenticator', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export function getStatus(req, res) {
  try {
    const { staffId } = req.params;
    res.status(200).json(staffTotpRepo.getStatus(staffId));
  } catch (error) {
    logger.error('Failed to get TOTP status', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Staff pathway: spends one authorizing admin's current code to grant a single
 * action against a specific resource (e.g. voiding one order).
 */
export function verify(req, res) {
  try {
    const {
      admin_staff_id,
      code,
      action,
      resource_type,
      resource_id,
      requested_by_staff_id,
      reason,
    } = req.body;

    if (!admin_staff_id || !code || !action || !resource_type || !resource_id || !requested_by_staff_id) {
      return res.status(400).json({ error: 'Missing required fields for authorization' });
    }

    const admin = getStaffById(admin_staff_id);
    if (!admin || admin.role !== 'admin' || admin.status !== 'active') {
      return res.status(404).json({ error: 'Authorizing admin not found or inactive' });
    }

    const secret = staffTotpRepo.getSecret(admin_staff_id);
    if (!secret) {
      return res.status(400).json({ error: 'This admin has not set up an authenticator yet' });
    }

    const codeStep = totpService.verifyCode(secret, code);
    if (codeStep === null) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    if (grantRepo.findByAdminAndStep(admin_staff_id, codeStep)) {
      return res.status(409).json({ error: 'This code has already been used' });
    }

    const grant = grantRepo.createGrant({
      action,
      resourceType: resource_type,
      resourceId: resource_id,
      adminStaffId: admin_staff_id,
      requestedByStaffId: requested_by_staff_id,
      codeStep,
      reason,
    });

    res.status(200).json({ granted: true, expires_at: grant.created_at + GRANT_TTL_MS });
  } catch (error) {
    logger.error('Failed to verify authorization code', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

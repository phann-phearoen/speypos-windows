import { Router } from 'express';
import { enroll, getStatus, verify } from '../controllers/totp.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { MAX_VERIFY_ATTEMPTS, VERIFY_ATTEMPT_WINDOW_MS } from '../constants/authorization.constants.js';

const router = Router();

const verifyRateLimiter = createRateLimiter({
  windowMs: VERIFY_ATTEMPT_WINDOW_MS,
  max: MAX_VERIFY_ATTEMPTS,
  keyFn: (req) => req.body?.admin_staff_id,
});

// POST /api/totp/enroll - an admin (re-)enrolls their own authenticator
router.post('/totp/enroll', isAdmin, enroll);

// GET /api/totp/status/:staffId - enrollment status only, never the secret
router.get('/totp/status/:staffId', isAdmin, getStatus);

// POST /api/totp/verify - staff pathway: spend one admin's code to grant a single action
router.post('/totp/verify', verifyRateLimiter, verify);

export default router;

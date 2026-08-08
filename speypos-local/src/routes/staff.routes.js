import { Router } from 'express';
import {
  getStaffMembers,
  getStaffMember,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
} from '../controllers/staff.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Reads are public: the Shift Page needs the staff list before any session/role exists.
// Write and delete operations remain admin-only.
router.get('/staff', getStaffMembers);
router.get('/staff/:id', getStaffMember);
router.post('/staff', isAdmin, createStaffMember);
router.patch('/staff/:id', isAdmin, updateStaffMember);
router.delete('/staff/:id', isAdmin, deleteStaffMember);

export default router;

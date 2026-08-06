import { Router } from 'express';
import {
  getShifts,
  getShift,
  getShiftSalesReport,
  getOpenShifts,
  createShift,
  updateShift,
  deleteShift,
  openShift,
  closeDay,
  getDayCloseReview,
  getDayCloseStatus,
  getPreviousDayStatus,
} from '../controllers/shift.controller.js';

const router = Router();

// Business logic endpoints
router.post('/shifts/open', openShift);
router.get('/shift/close-day', getDayCloseReview);
router.get('/shift/close-day-status', getDayCloseStatus);
router.post('/shift/close-day', closeDay);
router.get('/shift/day-status/previous', getPreviousDayStatus);

// Standard CRUD endpoints
router.get('/shift', getShifts);
router.get('/shift/open', getOpenShifts);
router.get('/shift/:id/report', getShiftSalesReport);
router.get('/shift/:id', getShift);
router.post('/shift', createShift);
router.patch('/shift/:id', updateShift);
router.delete('/shift/:id', deleteShift);

export default router;
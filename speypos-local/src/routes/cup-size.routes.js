import { Router } from 'express';
import { createCupSize, deleteCupSize, getCupSize, getCupSizes, updateCupSize } from '../controllers/cup-size.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/cup-size', getCupSizes);
router.get('/cup-size/:id', getCupSize);
router.post('/cup-size', isAdmin, createCupSize);
router.patch('/cup-size/:id', isAdmin, updateCupSize);
router.delete('/cup-size/:id', isAdmin, deleteCupSize);

export default router;

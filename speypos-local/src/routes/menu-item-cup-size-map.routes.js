import { Router } from 'express';
import { createMap, deleteMap, getMaps } from '../controllers/menu-item-cup-size-map.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/menu-item-cup-size-map', getMaps);
router.post('/menu-item-cup-size-map', isAdmin, createMap);
router.delete('/menu-item-cup-size-map/:id', isAdmin, deleteMap);

export default router;

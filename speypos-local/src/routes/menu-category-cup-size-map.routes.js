import { Router } from 'express';
import { createMap, deleteMap, getMaps } from '../controllers/menu-category-cup-size-map.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/menu-category-cup-size-map', getMaps);
router.post('/menu-category-cup-size-map', isAdmin, createMap);
router.delete('/menu-category-cup-size-map/:id', isAdmin, deleteMap);

export default router;

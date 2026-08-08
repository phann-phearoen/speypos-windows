import { Router } from 'express';
import {
  getMaps,
  createMap,
  deleteMap,
} from '../controllers/menu-item-category-map.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/menu-item-category-map', getMaps);
router.post('/menu-item-category-map', isAdmin, createMap);
router.delete('/menu-item-category-map/:id', isAdmin, deleteMap);

export default router;

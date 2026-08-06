import * as cupSizeService from '../services/cup-size.service.js';
import { logger } from '../utils/logger.js';

export async function getMaps(req, res) {
  try {
    const result = cupSizeService.getMenuCategoryCupSizeMaps(req.query);
    res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function createMap(req, res) {
  try {
    const { menu_category_id, cup_size_id } = req.body;
    if (!menu_category_id || !cup_size_id) {
      return res.status(400).json({ error: 'Missing required fields: menu_category_id, cup_size_id' });
    }
    const result = cupSizeService.createMenuCategoryCupSizeMap({ menu_category_id, cup_size_id });
    res.status(201).json(result);
  } catch (error) {
    logger.error(error);
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Mapping already exists' });
    }
    if (error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ error: 'Invalid menu_category_id or cup_size_id' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function deleteMap(req, res) {
  try {
    const result = cupSizeService.deleteMenuCategoryCupSizeMap(req.params.id);
    if (result.changes > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Mapping not found' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

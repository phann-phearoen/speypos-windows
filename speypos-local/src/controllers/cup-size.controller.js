import * as cupSizeService from '../services/cup-size.service.js';
import { logger } from '../utils/logger.js';

export async function getCupSizes(req, res) {
  try {
    const result = cupSizeService.getCupSizes();
    res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function getCupSize(req, res) {
  try {
    const result = cupSizeService.getCupSizeById(req.params.id);
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ error: 'Cup size not found' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function createCupSize(req, res) {
  try {
    const { size, unit } = req.body;
    if (!size || !unit) {
      return res.status(400).json({ error: 'Missing required fields: size, unit' });
    }

    const result = cupSizeService.createCupSize({ size, unit });
    res.status(201).json(result);
  } catch (error) {
    logger.error(error);
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Duplicate cup size' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function updateCupSize(req, res) {
  try {
    const existing = cupSizeService.getCupSizeById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Cup size not found' });
    }

    const result = cupSizeService.updateCupSize(req.params.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function deleteCupSize(req, res) {
  try {
    const result = cupSizeService.deleteCupSize(req.params.id);
    if (result.changes > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Cup size not found' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

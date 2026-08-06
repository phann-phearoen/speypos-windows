import * as repo from '../storage/repositories/customization-option.repo.js';
import { logger } from '../utils/logger.js';

export async function getOptions(req, res) {
  try {
    const result = repo.getAll(req.query);
    res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function getOption(req, res) {
  try {
    const result = repo.getById(req.params.id);
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ error: 'Option not found' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function createOption(req, res) {
  try {
    const { customization_group_id, label, cup_size_id, price_delta = 0, sort_order = 0 } = req.body;
    if (!customization_group_id || !label) {
      return res.status(400).json({ error: 'Missing required fields: customization_group_id, label' });
    }
    const result = repo.create({
      customization_group_id,
      label,
      cup_size_id: typeof cup_size_id === 'string' ? (cup_size_id.trim() || null) : null,
      price_delta,
      sort_order,
    });
    res.status(201).json(result);
  } catch (error) {
    logger.error(error);
    if (error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ error: 'Invalid cup_size_id or customization_group_id' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function updateOption(req, res) {
  try {
    const existing = repo.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Option not found' });
    }
    const patch = { ...req.body };
    if (Object.hasOwn(req.body, 'cup_size_id')) {
      patch.cup_size_id = typeof req.body.cup_size_id === 'string'
        ? (req.body.cup_size_id.trim() || null)
        : null;
    }
    const result = repo.update(req.params.id, patch);
    res.status(200).json(result);
  } catch (error) {
    logger.error(error);
    if (error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ error: 'Invalid cup_size_id' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function deleteOption(req, res) {
  try {
    const result = repo.remove(req.params.id);
    if (result.changes > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Option not found' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

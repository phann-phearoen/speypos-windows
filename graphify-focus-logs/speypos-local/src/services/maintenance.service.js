import { logger } from '../utils/logger.js';
import { getDb } from '../storage/database.js';
import * as settingsService from './settings.service.js';
import * as orderRepo from '../storage/repositories/order.repo.js';
import * as shiftRepo from '../storage/repositories/shift.repo.js';
import { serializeOrder } from '../serializers/order.serializer.js';
import { uploadOrdersBatch } from './cloudIngest.service.js';
import fs from 'fs';
import path from 'path';
import { paths } from '../config/paths.js';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Runs automatic data maintenance:
 * 1. Checks if the monthly interval has passed.
 * 2. Attempts a final sync for data older than 3 days.
 * 3. Purges data and logs older than 30 days.
 * 4. Optimizes the database.
 */
export async function runMaintenance() {
  const now = Date.now();
  const lastRunAt = settingsService.getNumber('maintenance.last_run_at') || 0;
  const intervalDays = settingsService.getNumber('maintenance.retention_interval_days') || 30;
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

  if (now - lastRunAt < intervalMs) {
    logger.debug('Maintenance: Skipping run, interval not reached.');
    return;
  }

  logger.info('Maintenance: Starting monthly automatic data deletion...');

  try {
    const cutoffDate = now - THREE_DAYS_MS;

    // 1. Final Sync Attempt for old unsynced orders
    await performFinalSyncAttempt(cutoffDate);

    // 2. Data Purge
    const deletedCount = purgeOldData(cutoffDate);
    logger.info(`Maintenance: Purged ${deletedCount.orders} orders and ${deletedCount.shifts} empty shifts.`);

    // 3. Log Cleanup
    const deletedLogs = purgeOldLogs(now - THIRTY_DAYS_MS);
    logger.info(`Maintenance: Purged ${deletedLogs} old log files.`);

    // 4. Database Optimization
    optimizeDatabase();

    // 5. Update last run timestamp
    settingsService.set({
      key: 'maintenance.last_run_at',
      value: now,
      value_type: 'number',
      category: 'System'
    });

    logger.info('Maintenance: Automatic maintenance completed successfully.');
  } catch (error) {
    logger.error('Maintenance: Maintenance task failed.', { error: error.message, stack: error.stack });
  }
}

/**
 * Attempts to sync all finalized orders older than 3 days that haven't been synced yet.
 */
async function performFinalSyncAttempt(cutoffDate) {
  logger.info('Maintenance: Attempting final sync for orders older than 3 days...');

  const db = getDb();
  // Get all unique shifts for unsynced finalized orders older than cutoff
  const shiftsWithUnsynced = db.prepare(`
    SELECT DISTINCT shift_id
    FROM "Order"
    WHERE cloud_sync_at IS NULL
      AND created_at < ?
      AND status IN ('completed', 'voided')
  `).all(cutoffDate);

  for (const row of shiftsWithUnsynced) {
    const shiftId = row.shift_id;
    const shift = shiftRepo.getShiftById(shiftId);
    if (!shift) continue;

    const orders = orderRepo.getFinalizedUnsyncedByShift(shiftId);
    // Filter to only those older than cutoff
    const oldOrders = orders.filter(o => o.created_at < cutoffDate);

    if (oldOrders.length === 0) continue;

    logger.info(`Maintenance: Syncing ${oldOrders.length} orders for shift ${shiftId}...`);

    try {
      const serializedOrders = oldOrders.map(o => serializeOrder(o)).filter(Boolean);
      const result = await uploadOrdersBatch({
        shift,
        orders: serializedOrders,
        source: 'maintenance_purge'
      });

      if (result.success) {
        orderRepo.markOrdersSynced(serializedOrders.map(o => o.id));
        logger.info(`Maintenance: Successfully synced orders for shift ${shiftId}.`);
      } else {
        logger.warn(`Maintenance: Final sync attempt failed for shift ${shiftId}. Deleting anyway.`);
      }
    } catch (error) {
      logger.error(`Maintenance: Error during final sync for shift ${shiftId}.`, { error: error.message });
    }
  }
}

/**
 * Deletes orders older than the cutoff date and removes shifts that are now empty.
 */
function purgeOldData(cutoffDate) {
  const db = getDb();

  return db.transaction(() => {
    // 1. Delete orders (cascades will handle sub-tables)
    const orderStmt = db.prepare('DELETE FROM "Order" WHERE created_at < ?');
    const orderResult = orderStmt.run(cutoffDate);

    // 2. Delete OutboxEvents older than 30 days (standard cleanup)
    const outboxStmt = db.prepare("DELETE FROM OutboxEvent WHERE status IN ('succeeded', 'dead') AND created_at < ?");
    outboxStmt.run(Date.now() - THIRTY_DAYS_MS);

    // 3. Delete shifts that have no more orders and are older than cutoff
    // We check ended_at for shifts to ensure we don't delete the current open one (which has no ended_at)
    const shiftStmt = db.prepare(`
      DELETE FROM Shift
      WHERE ended_at < ?
        AND id NOT IN (SELECT DISTINCT shift_id FROM "Order")
    `);
    const shiftResult = shiftStmt.run(cutoffDate);

    return {
      orders: orderResult.changes,
      shifts: shiftResult.changes
    };
  })();
}

/**
 * Deletes log files older than the retention period.
 */
function purgeOldLogs(cutoffDate) {
  const logsDir = paths.logs;
  if (!fs.existsSync(logsDir)) return 0;

  let count = 0;
  try {
    const files = fs.readdirSync(logsDir);
    for (const file of files) {
      if (!file.endsWith('.log')) continue;

      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < cutoffDate) {
        fs.unlinkSync(filePath);
        count++;
      }
    }
  } catch (error) {
    logger.error('Maintenance: Failed to clean up logs.', { error: error.message });
  }
  return count;
}

/**
 * Performs database vacuum to reclaim disk space.
 */
function optimizeDatabase() {
  logger.info('Maintenance: Optimizing database (VACUUM)...');
  const db = getDb();
  try {
    db.pragma('vacuum');
    logger.info('Maintenance: Database optimization complete.');
  } catch (error) {
    logger.error('Maintenance: VACUUM failed.', { error: error.message });
  }
}

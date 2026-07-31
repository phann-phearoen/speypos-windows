import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { renderReceiptToEscPosBuffer } from './canvasReceiptRenderer.js';
import { sendEscPosBuffer } from './escposTransport.js';
import * as orderRepo from '../storage/repositories/order.repo.js';
import * as settingsService from '../services/settings.service.js';
import { ORDER_STATUS } from '../constants/order.constants.js';

/**
 * Prints a receipt for a given order based on settings.
 * Fetches `receipt.copies` from settings to determine how many copies and which variants to print.
 * Checks if the receipt has already been printed to prevent duplicates.
 * For explicit user-triggered reprints, pass `allowReprint: true` to bypass this guard.
 *
 * Uses Canvas → ESC/POS raster for printing.
 *
 * @param {object} order - The full order object.
 * @param {{ allowReprint?: boolean }} [options]
 */
const printerName = env.printerName || 'CONSOLE';

export async function printReceipt(order, options = {}) {
  const { allowReprint = false } = options;

  if (order.printed_at && !allowReprint) {
    logger.warn(`Receipt for order ${order.id} has already been printed. Skipping.`);
    return;
  }

  if (order.printed_at && allowReprint) {
    logger.info(`Reprint requested for order ${order.id}. Bypassing printed_at guard.`);
  }

  const { items } = order;
  if (!items || items.length === 0) {
    logger.warn(`Order ${order} has no items or data is malformed. Skipping print.`);
    return;
  }

  if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status)) {
    logger.warn(`Order ${order.id} is not printable in status ${order.status}. Skipping.`);
    return;
  }

  const isVoided = order.status === ORDER_STATUS.VOIDED;
  const copiesConfig = settingsService.getJSON('receipt.copies');
  const copies = isVoided
    ? [{ variant: 'VOID', count: 1 }]
    : copiesConfig?.copies || [{ variant: 'INTERNAL', count: 1 }];

  logger.info(`Starting print job for order ID: ${order.id}.`, { status: order.status });

  try {
    logger.info(`Printing ${copies.length} variants for order ${order.id}`, {
      copies,
      engine: 'canvas',
    });

    let allCopiesSucceeded = true;

    for (const copy of copies) {
      const { variant, count } = copy;

      if (printerName === 'CONSOLE') {
        logger.info(`[CONSOLE] Dry-run print for variant ${variant} of order ${order.id}.`);
        continue;
      }

      // Render once, send N copies — buffer is reused for all copies.
      logger.info(`[canvas] Rendering ESC/POS buffer for variant ${variant}, order ${order.id}.`);
      const escPosBuffer = renderReceiptToEscPosBuffer(order, variant);

      for (let i = 0; i < count; i++) {
        logger.info(
          `[canvas] Sending copy ${i + 1}/${count} of variant ${variant} for order ${order.id}.`
        );
        try {
          await sendEscPosBuffer(printerName, escPosBuffer);
        } catch (err) {
          allCopiesSucceeded = false;
          logger.error(
            `[canvas] ESC/POS send failed for copy ${i + 1}/${count}: ${err.message}`
          );
        }
      }
    }

    if (allCopiesSucceeded) {
      // Mark as printed only after ALL copies are successfully sent/logged
      orderRepo.markAsPrinted(order.id);
      logger.info(`Print job for order ${order.id} completed and marked as printed.`);
    } else {
      logger.error(`Print job for order ${order.id} partially or fully failed. Not marking as printed.`);
      throw new Error('One or more receipt copies failed to print.');
    }
  } catch (error) {
    logger.error(`Failed print job for order ${order.id}`, {
      error: error.message,
    });
    // Do not mark as printed if there was an error.
    // Re-throw the error so the caller knows the operation failed.
    throw error;
  }
}

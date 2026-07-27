import { logger } from '../utils/logger.js';
import * as orderRepo from '../storage/repositories/order.repo.js';
import * as shiftRepo from '../storage/repositories/shift.repo.js';
import { serializeOrder } from '../serializers/order.serializer.js';
import { printReceipt } from '../printer/printerService.js';
import { sendOrderNotification, sendShiftCloseNotification } from './telegram.service.js';
import { uploadOrdersBatch } from './cloudIngest.service.js';
import { ORDER_STATUS } from '../constants/order.constants.js';
import { getOutboxConfig } from './settings.service.js';

export function isOutboxRetryAttempt(event) {
  return Number(event?.attempts || 0) > 1;
}

function getOrderOrThrow(orderId) {
  const order = orderRepo.getOrderById(orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }
  return serializeOrder(order);
}

function getShiftOrThrow(shiftId) {
  const shift = shiftRepo.getShiftById(shiftId);
  if (!shift) {
    throw new Error(`Shift ${shiftId} not found`);
  }
  return shift;
}

async function dispatchReceiptPrint(event) {
  const order = getOrderOrThrow(event.payload.order_id);
  if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status)) {
    logger.info(`Skipping receipt print for order ${order.id} in status ${order.status}.`);
    return;
  }
  await printReceipt(order, { allowReprint: false });
}

async function dispatchOrderTelegram(event) {
  const order = getOrderOrThrow(event.payload.order_id);
  await sendOrderNotification(order, { isRetry: isOutboxRetryAttempt(event) });
}

async function dispatchShiftTelegram(event) {
  const shift = getShiftOrThrow(event.payload.shift_id);
  const report = shiftRepo.getShiftSalesReport(shift.id);
  if (!report) {
    throw new Error(`Shift report for ${shift.id} could not be generated`);
  }
  await sendShiftCloseNotification(report, { isRetry: isOutboxRetryAttempt(event) });
}

async function dispatchCloudMiniBatch(event) {
  const config = getOutboxConfig();
  const shift = getShiftOrThrow(event.payload.shift_id);

  if (shift.status !== 'open') {
    logger.info(`Skipping cloud mini-batch for shift ${shift.id} because it is not open.`);
    return;
  }

  if (!config || !Number.isInteger(config.batch_size)) {
    throw new Error('Outbox config missing batch size');
  }

  const unsyncedCount = orderRepo.countFinalizedUnsyncedByShift(shift.id);
  if (unsyncedCount < config.batch_size) {
    logger.info(`Skipping cloud mini-batch for shift ${shift.id}; below threshold.`);
    return;
  }

  const orders = orderRepo.getFinalizedUnsyncedByShift(shift.id, { limit: config.batch_size });
  const serializedOrders = orders.map((order) => serializeOrder(order)).filter(Boolean);
  const result = await uploadOrdersBatch({ shift, orders: serializedOrders, source: 'outbox' });

  if (!result.success) {
    throw new Error(result.reason || 'Cloud mini-batch upload failed');
  }

  orderRepo.markOrdersSynced(serializedOrders.map((order) => order.id));
}

async function dispatchCloudFlush(event) {
  const shift = getShiftOrThrow(event.payload.shift_id);
  const config = getOutboxConfig();

  if (!config || !Number.isInteger(config.batch_size)) {
    throw new Error('Outbox config missing batch size');
  }

  if (shift.status !== 'closed') {
    logger.info(`Skipping cloud flush for shift ${shift.id} because it is not closed.`);
    return;
  }

  while (true) {
    const orders = orderRepo.getFinalizedUnsyncedByShift(shift.id, { limit: config.batch_size });
    if (!orders.length) {
      return;
    }

    const serializedOrders = orders.map((order) => serializeOrder(order)).filter(Boolean);
    const result = await uploadOrdersBatch({ shift, orders: serializedOrders, source: 'outbox' });

    if (!result.success) {
      throw new Error(result.reason || 'Cloud flush upload failed');
    }

    orderRepo.markOrdersSynced(serializedOrders.map((order) => order.id));
  }
}

export async function dispatchOutboxEvent(event) {
  switch (event.event_type) {
    case 'receipt.print':
      return dispatchReceiptPrint(event);
    case 'telegram.order':
      return dispatchOrderTelegram(event);
    case 'telegram.shift':
      return dispatchShiftTelegram(event);
    case 'cloud.mini_batch':
      return dispatchCloudMiniBatch(event);
    case 'cloud.flush':
      return dispatchCloudFlush(event);
    default:
      logger.warn(`Unknown outbox event type: ${event.event_type}`);
  }
}

import { enqueueEvents } from '../storage/repositories/outbox.repo.js';

function buildOrderEvents(order) {
  return [
    {
      aggregate_type: 'order',
      aggregate_id: order.id,
      event_type: 'receipt.print',
      dedupe_key: `${order.id}:receipt.print`,
      payload: { order_id: order.id },
    },
    {
      aggregate_type: 'order',
      aggregate_id: order.id,
      event_type: 'telegram.order',
      dedupe_key: `${order.id}:telegram.order`,
      payload: { order_id: order.id },
    },
    {
      aggregate_type: 'shift',
      aggregate_id: order.shift_id,
      event_type: 'cloud.mini_batch',
      dedupe_key: `${order.shift_id}:cloud.mini_batch:${order.id}`,
      payload: { shift_id: order.shift_id, order_id: order.id },
    },
  ];
}

function buildVoidEvents(order) {
  return [
    {
      aggregate_type: 'order',
      aggregate_id: order.id,
      event_type: 'receipt.print',
      dedupe_key: `${order.id}:void.receipt.print`,
      payload: { order_id: order.id, voided: true },
    },
    {
      aggregate_type: 'order',
      aggregate_id: order.id,
      event_type: 'telegram.order',
      dedupe_key: `${order.id}:void.telegram.order`,
      payload: { order_id: order.id, voided: true },
    },
    {
      aggregate_type: 'shift',
      aggregate_id: order.shift_id,
      event_type: 'cloud.mini_batch',
      dedupe_key: `${order.shift_id}:void.cloud.mini_batch:${order.id}`,
      payload: { shift_id: order.shift_id, order_id: order.id, voided: true },
    },
  ];
}

function buildShiftCloseEvents(shiftId) {
  return [
    {
      aggregate_type: 'shift',
      aggregate_id: shiftId,
      event_type: 'telegram.shift',
      dedupe_key: `${shiftId}:telegram.shift`,
      payload: { shift_id: shiftId },
    },
    {
      aggregate_type: 'shift',
      aggregate_id: shiftId,
      event_type: 'cloud.flush',
      dedupe_key: `${shiftId}:cloud.flush`,
      payload: { shift_id: shiftId },
    },
  ];
}

export function queueOrderSideEffects(order) {
  return Promise.resolve(enqueueEvents(buildOrderEvents(order)));
}

export function queueVoidSideEffects(order) {
  return Promise.resolve(enqueueEvents(buildVoidEvents(order)));
}

export function queueShiftCloseSideEffects(shiftId) {
  return Promise.resolve(enqueueEvents(buildShiftCloseEvents(shiftId)));
}

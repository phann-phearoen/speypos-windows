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

function buildShiftCloseCloudEvents({ shiftId, businessDayId = null, businessDate = null }) {
  return [
    {
      aggregate_type: 'shift',
      aggregate_id: shiftId,
      event_type: 'cloud.flush',
      dedupe_key: `${shiftId}:cloud.flush`,
      payload: {
        shift_id: shiftId,
        business_day_id: businessDayId,
        business_date: businessDate,
      },
    },
  ];
}

export function queueOrderSideEffects(order) {
  return Promise.resolve(enqueueEvents(buildOrderEvents(order)));
}

export function queueVoidSideEffects(order) {
  return Promise.resolve(enqueueEvents(buildVoidEvents(order)));
}

export function queueShiftCloseCloudFlush(input) {
  const normalized =
    typeof input === 'string'
      ? { shiftId: input, businessDayId: null, businessDate: null }
      : {
          shiftId: input?.shiftId,
          businessDayId: input?.businessDayId ?? null,
          businessDate: input?.businessDate ?? null,
        };

  if (!normalized.shiftId) {
    throw new Error('shiftId is required for queueShiftCloseCloudFlush');
  }

  return Promise.resolve(enqueueEvents(buildShiftCloseCloudEvents(normalized)));
}

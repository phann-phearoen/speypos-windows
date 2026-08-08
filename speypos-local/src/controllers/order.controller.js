import * as orderRepo from '../storage/repositories/order.repo.js';
import * as paymentRepo from '../storage/repositories/payment.repo.js';
import * as shiftRepo from '../storage/repositories/shift.repo.js';
import * as customizationOptionRepo from '../storage/repositories/customization-option.repo.js';
import * as cupSizeRepo from '../storage/repositories/cup-size.repo.js';
import { printReceipt } from '../printer/printerService.js';
import { logger } from '../utils/logger.js';
import { serializeOrder } from '../serializers/order.serializer.js';
import { ORDER_STATUS, ORDER_VOID_REASONS } from '../constants/order.constants.js';
import { queueOrderSideEffects, queueVoidSideEffects } from '../services/outbox.service.js';
import * as grantRepo from '../storage/repositories/authorization-grant.repo.js';
import { AUTHORIZATION_ACTIONS, GRANT_TTL_MS } from '../constants/authorization.constants.js';

export function normalizeOrderPayload(rawPayload) {
  const inputItems = Array.isArray(rawPayload?.items) ? rawPayload.items : [];

  const optionIds = [];
  for (const item of inputItems) {
    const customizations = Array.isArray(item?.customizations) ? item.customizations : [];
    for (const cust of customizations) {
      if (cust?.option_type === 'customization_option' && typeof cust?.value === 'string' && cust.value) {
        optionIds.push(cust.value);
      }
    }
  }

  const uniqueOptionIds = Array.from(new Set(optionIds));
  const options = customizationOptionRepo.getByIds(uniqueOptionIds);
  const optionById = new Map(options.map((opt) => [opt.id, opt]));

  const resolvedCupSizeIds = [];
  const perItemResolved = inputItems.map((item) => {
    const customizations = Array.isArray(item?.customizations) ? item.customizations : [];
    let legacyCupSizeId = null;
    const optionDrivenCupSizeIds = [];

    for (const cust of customizations) {
      if (cust?.option_type === 'cup_size' && typeof cust?.value === 'string' && cust.value) {
        legacyCupSizeId = cust.value;
      }
      if (cust?.option_type === 'customization_option' && typeof cust?.value === 'string' && cust.value) {
        const option = optionById.get(cust.value);
        if (option?.cup_size_id) {
          optionDrivenCupSizeIds.push(option.cup_size_id);
        }
      }
    }

    const resolvedCupSizeId = optionDrivenCupSizeIds.at(-1) || legacyCupSizeId || null;
    if (resolvedCupSizeId) {
      resolvedCupSizeIds.push(resolvedCupSizeId);
    }

    return {
      customizations,
      resolvedCupSizeId,
    };
  });

  const uniqueCupSizeIds = Array.from(new Set(resolvedCupSizeIds));
  const cupSizes = cupSizeRepo.getCupSizesByIds(uniqueCupSizeIds);
  const cupSizeById = new Map(cupSizes.map((cupSize) => [cupSize.id, cupSize]));

  const normalizedItems = inputItems.map((item, index) => {
    const { customizations, resolvedCupSizeId } = perItemResolved[index];

    const normalizedCustomizations = [];
    for (const cust of customizations) {
      if (cust?.option_type === 'cup_size') {
        continue;
      }

      if (cust?.option_type === 'customization_option' && typeof cust?.value === 'string' && cust.value) {
        const option = optionById.get(cust.value);
        normalizedCustomizations.push({
          name: option?.label || cust.name,
          option_type: 'customization_option',
          value: cust.value,
          price: cust.price,
        });
        continue;
      }

      normalizedCustomizations.push(cust);
    }

    if (resolvedCupSizeId) {
      const cupSize = cupSizeById.get(resolvedCupSizeId);
      const cupSizeName = cupSize ? `${cupSize.size} (${cupSize.unit})` : 'Cup Size';
      normalizedCustomizations.unshift({
        name: cupSizeName,
        option_type: 'cup_size',
        value: resolvedCupSizeId,
        price: 0,
      });
    }

    return {
      ...item,
      customizations: normalizedCustomizations,
    };
  });

  return {
    ...rawPayload,
    items: normalizedItems,
  };
}

function toCreateOrderLifecycleErrorResponse(error) {
  switch (error?.code) {
    case 'SHIFT_NOT_FOUND':
      return {
        status: 404,
        body: {
          error: error.code,
          message: error.message,
          shift_id: error.shift_id,
        },
      };
    case 'SHIFT_NOT_OPEN':
      return {
        status: 409,
        body: {
          error: error.code,
          message: error.message,
          shift_id: error.shift_id,
          shift_status: error.shift_status,
        },
      };
    case 'SHIFT_NOT_CURRENT_BUSINESS_DAY':
      return {
        status: 409,
        body: {
          error: error.code,
          message: error.message,
          shift_id: error.shift_id,
          shift_date: error.shift_date,
          today_store_date: error.today_store_date,
        },
      };
    default:
      return null;
  }
}

/**
 * Handles the request to get all orders.
 */
export function getOrders(req, res) {
  try {
    const { shift_id, staff_id } = req.query;
    const filters = {};
    if (shift_id) {
      filters.shift_id = shift_id;
    }
    if (staff_id) {
      filters.staff_id = staff_id;
    }
    const orders = orderRepo.getAllOrders(filters);
    const serializedOrders = orders.map(serializeOrder);
    res.status(200).json(serializedOrders);
  } catch (error) {
    logger.error('Failed to get orders', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to get a single order by its ID.
 */
export function getOrder(req, res) {
  try {
    const { id } = req.params;
    const order = orderRepo.getOrderById(id);
    if (order) {
      res.status(200).json(serializeOrder(order));
    } else {
      res.status(404).json({ error: `Order with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to get order', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a new order.
 */
export function createOrder(req, res) {
  try {
    const { shift_id, staff_id, items } = req.body;
    if (!shift_id || !staff_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: shift_id, staff_id, and a non-empty items array',
      });
    }

    const normalizedPayload = normalizeOrderPayload(req.body);
    const newOrder = orderRepo.createOrder(normalizedPayload);
    res.status(201).json(serializeOrder(newOrder));
  } catch (error) {
    const lifecycleError = toCreateOrderLifecycleErrorResponse(error);
    if (lifecycleError) {
      return res.status(lifecycleError.status).json(lifecycleError.body);
    }

    logger.error('Failed to create order', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a payment for an order.
 */
export async function createPayment(req, res) {
  try {
    const { id } = req.params;
    const { payment_type, amount } = req.body;

    if (!payment_type || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: payment_type and amount' });
    }

    const order = orderRepo.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: `Order with ID ${id} not found` });
    }
    if (order.status !== ORDER_STATUS.PENDING) {
      return res
        .status(409)
        .json({ error: `Order is not in 'pending' state. Current status: ${order.status}` });
    }

    const updatedOrder = serializeOrder(paymentRepo.createPaymentForOrder(id, req.body));
    queueOrderSideEffects(updatedOrder).catch((err) => {
      logger.error(`Failed to enqueue outbox events for order ${updatedOrder.id}`, {
        error: err.message,
      });
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    logger.error(`Failed to create payment for order ${req.params.id}`, {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to print a receipt for an order.
 */
export async function printOrderReceipt(req, res) {
  try {
    const { id } = req.params;
    const shouldReprint = Boolean(req.body?.reprint || req.body?.force_reprint);
    const order = orderRepo.getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: `Order with ID ${id} not found` });
    }

    // Allow printing for completed or voided orders. Others are blocked.
    if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.VOIDED].includes(order.status)) {
      return res.status(409).json({
        error: `Cannot print receipt for an order that is not completed or voided. Current status: ${order.status}`,
      });
    }

    const fullOrder = serializeOrder(order);
    await printReceipt(fullOrder, { allowReprint: shouldReprint });

    // After a successful print, trigger a retry pass for any other pending print jobs.
    recoveryService.retryUnprintedOrders();

    res.status(200).json({ message: 'Receipt has been sent to the printer.' });
  } catch (error) {
    logger.error(`Failed to print receipt for order ${req.params.id}`, {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Marks an order as voided with a reason and optional note.
 */
export async function voidOrder(req, res) {
  try {
    const { id } = req.params;
    const { void_reason, void_note, voided_by } = req.body;

    if (!void_reason || !ORDER_VOID_REASONS.includes(void_reason)) {
      return res.status(400).json({
        error: `void_reason is required and must be one of: ${ORDER_VOID_REASONS.join(', ')}`,
      });
    }

    const order = orderRepo.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: `Order with ID ${id} not found` });
    }

    if (order.status === ORDER_STATUS.VOIDED) {
      return res.status(409).json({ error: 'Order is already voided.' });
    }

    // Admins may void directly; staff must spend a one-time grant issued for this exact order.
    let authorized_by = null;
    if (req.headers['x-user-role'] !== 'admin') {
      const grant = grantRepo.findUnconsumedGrant({
        action: AUTHORIZATION_ACTIONS.ORDER_VOID,
        resourceType: 'order',
        resourceId: id,
        ttlMs: GRANT_TTL_MS,
      });
      if (!grant) {
        return res.status(403).json({ error: 'A valid admin authorization is required to void this order.' });
      }
      grantRepo.consumeGrant(grant.id);
      authorized_by = grant.admin_staff_id;
    }

    const updatedOrder = serializeOrder(
      orderRepo.voidOrder(id, { void_reason, void_note, voided_by, authorized_by })
    );
    queueVoidSideEffects(updatedOrder).catch((err) => {
      logger.error(`Failed to enqueue outbox events for voided order ${updatedOrder.id}`, {
        error: err.message,
      });
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    logger.error(`Failed to void order ${req.params.id}`, {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  createPayment,
  printOrderReceipt,
  voidOrder,
} from '../controllers/order.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/orders - Get all orders
router.get('/orders', getOrders);

// GET /api/orders/:id - Get a single order by ID
router.get('/orders/:id', getOrder);

// POST /api/orders - Create a new order
router.post('/orders', createOrder);

// POST /api/orders/:id/pay - Create a payment for an order
router.post('/orders/:id/pay', createPayment);

// POST /api/orders/:id/print - Print a receipt for an order
router.post('/orders/:id/print', printOrderReceipt);

// PATCH /api/orders/:id/void - Void an order
// Interim: admin-only until the one-time staff permission (TOTP) grant replaces this gate.
router.patch('/orders/:id/void', isAdmin, voidOrder);

export default router;

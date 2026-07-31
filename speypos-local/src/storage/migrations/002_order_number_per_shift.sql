ALTER TABLE "Order" ADD COLUMN order_number INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_shift_order_number_unique
ON "Order" (shift_id, order_number);
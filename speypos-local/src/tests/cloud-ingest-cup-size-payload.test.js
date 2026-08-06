import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderEvent } from '../services/cloudIngest.service.js';

test('buildOrderEvent includes canonical cup size snapshot in item payload', () => {
  const event = buildOrderEvent(
    {
      id: 'order-1',
      shift_id: 'shift-1',
      staff_id: 'staff-1',
      status: 'completed',
      total_amount: 450,
      total_items: 1,
      created_at: Date.now(),
      items: [
        {
          id: 'item-1',
          menu_item_id: 'menu-1',
          menu_item_name: 'Iced Latte',
          quantity: 1,
          unit_price: 450,
          customizations: [
            {
              id: 'cust-cup',
              name: 'Large (oz)',
              option_type: 'cup_size',
              value: 'cup-large-id',
              price: 0,
            },
            {
              id: 'cust-opt',
              name: 'Upsize Large',
              option_type: 'customization_option',
              value: 'option-upsize-id',
              price: 50,
            },
          ],
          toppings: [],
        },
      ],
      payments: [],
    },
    'USD'
  );

  assert.equal(event.event_type, 'ORDER_CREATED');
  assert.equal(event.payload.items.length, 1);
  assert.deepEqual(event.payload.items[0].cup_size, {
    id: 'cup-large-id',
    name: 'Large (oz)',
  });
});

test('buildOrderEvent emits null cup_size when canonical customization is absent', () => {
  const event = buildOrderEvent(
    {
      id: 'order-2',
      shift_id: 'shift-2',
      staff_id: 'staff-2',
      status: 'completed',
      total_amount: 300,
      total_items: 1,
      created_at: Date.now(),
      items: [
        {
          id: 'item-2',
          menu_item_id: 'menu-2',
          menu_item_name: 'Americano',
          quantity: 1,
          unit_price: 300,
          customizations: [
            {
              id: 'cust-opt',
              name: 'No Sugar',
              option_type: 'customization_option',
              value: 'option-no-sugar',
              price: 0,
            },
          ],
          toppings: [],
        },
      ],
      payments: [],
    },
    'USD'
  );

  assert.equal(event.payload.items[0].cup_size, null);
});

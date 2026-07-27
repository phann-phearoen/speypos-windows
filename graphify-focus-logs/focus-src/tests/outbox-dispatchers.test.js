import test, { before } from 'node:test';
import assert from 'node:assert/strict';

let isOutboxRetryAttempt;

before(async () => {
  process.env.PORT = process.env.PORT || '8080';
  process.env.PRINTER_NAME = process.env.PRINTER_NAME || 'CONSOLE';
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TEST_TOKEN';
  process.env.DB_PATH = process.env.DB_PATH || `data/test-outbox-dispatchers-${Date.now()}.db`;

  ({ isOutboxRetryAttempt } = await import('../services/outbox.dispatchers.js'));
});

test('outbox retry indicator is false on first attempt', () => {
  assert.equal(isOutboxRetryAttempt({ attempts: 1 }), false);
  assert.equal(isOutboxRetryAttempt({ attempts: 0 }), false);
  assert.equal(isOutboxRetryAttempt({}), false);
});

test('outbox retry indicator is true from second attempt onward', () => {
  assert.equal(isOutboxRetryAttempt({ attempts: 2 }), true);
  assert.equal(isOutboxRetryAttempt({ attempts: 3 }), true);
});

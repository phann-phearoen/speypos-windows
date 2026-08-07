import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCloudEventBatchSource,
  CLOUD_EVENT_BATCH_SOURCE,
} from '../services/cloudIngest.service.js';

test('Cloud event-batch source enum matches the documented API contract', () => {
  assert.deepEqual(Object.values(CLOUD_EVENT_BATCH_SOURCE).sort(), [
    'day_close',
    'manual',
    'shift_close',
  ]);
});

test('Cloud event-batch source validator rejects internal workflow labels', () => {
  for (const source of ['outbox', 'maintenance_purge']) {
    assert.throws(
      () => assertCloudEventBatchSource(source),
      (error) => error.code === 'invalid_event_batch_source'
    );
  }
});
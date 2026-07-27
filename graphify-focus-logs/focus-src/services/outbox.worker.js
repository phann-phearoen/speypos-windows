import { logger } from '../utils/logger.js';
import { getErrorDetails } from '../utils/error-details.js';
import { getOutboxConfig } from './settings.service.js';
import {
  claimDueBatch,
  markDead,
  markRetry,
  markSucceeded,
  releaseStaleLocks,
} from '../storage/repositories/outbox.repo.js';
import { dispatchOutboxEvent } from './outbox.dispatchers.js';

let workerTimer = null;
let isRunning = false;

function computeBackoffMs(attempts, pollIntervalMs) {
  const base = Math.max(pollIntervalMs, 1000);
  const exponent = Math.min(Math.max(attempts - 1, 0), 6);
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(base * 2 ** exponent + jitter, 5 * 60 * 1000);
}

async function processBatch() {
  const config = getOutboxConfig();
  if (!config || config.mode === 'legacy_sync') {
    return;
  }

  const workerId = `worker-${process.pid}`;
  const claimed = claimDueBatch({
    workerId,
    limit: config.batch_size,
    leaseMs: config.lease_ms,
  });

  for (const event of claimed) {
    try {
      await dispatchOutboxEvent(event);
      markSucceeded(event.id);
    } catch (error) {
      const details = getErrorDetails(error);
      const attempts = event.attempts || 0;
      const nextAttemptAt = Date.now() + computeBackoffMs(attempts, config.poll_interval_ms);
      if (attempts >= config.max_attempts) {
        markDead(event.id, error.message);
      } else {
        markRetry(event.id, error.message, nextAttemptAt);
      }
      logger.warn('Outbox event dispatch failed', {
        eventId: event.id,
        eventType: event.event_type,
        attempts,
        ...details,
      });
    }
  }
}

async function tick() {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const config = getOutboxConfig();
    if (!config || config.mode === 'legacy_sync') {
      return;
    }

    releaseStaleLocks({ leaseMs: config.lease_ms });
    await processBatch();
  } catch (error) {
    const details = getErrorDetails(error);
    logger.error('Outbox worker tick failed', details);
  } finally {
    isRunning = false;
  }
}

export function startOutboxWorker() {
  const config = getOutboxConfig();
  if (!config || config.mode === 'legacy_sync') {
    logger.info('Outbox worker disabled in legacy_sync mode.');
    return;
  }

  if (workerTimer) {
    return;
  }

  logger.info('Starting outbox worker.', {
    mode: config.mode,
    batchSize: config.batch_size,
    pollIntervalMs: config.poll_interval_ms,
  });

  void tick();
  workerTimer = setInterval(() => {
    void tick();
  }, config.poll_interval_ms);
}

export function stopOutboxWorker() {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    logger.info('Outbox worker stopped.');
  }
}

export async function runOutboxWorkerOnce() {
  await tick();
}

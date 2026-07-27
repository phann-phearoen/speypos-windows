import { randomUUID } from 'crypto';
import { getDb } from '../database.js';

const OUTBOX_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  RETRY: 'retry',
  SUCCEEDED: 'succeeded',
  DEAD: 'dead',
};

function nowMs() {
  return Date.now();
}

function toPayloadJson(payload) {
  return typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
}

function fromRow(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    payload: row.payload_json ? JSON.parse(row.payload_json) : null,
  };
}

function assertEventShape(event) {
  const required = ['aggregate_type', 'aggregate_id', 'event_type', 'dedupe_key'];
  for (const key of required) {
    if (!event?.[key] || String(event[key]).trim().length === 0) {
      throw new Error(`Outbox event missing required field: ${key}`);
    }
  }
}

export function enqueueEvent(event, db = getDb()) {
  assertEventShape(event);

  const now = nowMs();
  const payloadJson = toPayloadJson(event.payload ?? event.payload_json ?? {});
  const maxAttempts = Number.isInteger(event.max_attempts) && event.max_attempts > 0 ? event.max_attempts : 10;
  const nextAttemptAt = event.next_attempt_at ?? null;

  const insertStmt = db.prepare(
    `INSERT INTO OutboxEvent (
      id,
      aggregate_type,
      aggregate_id,
      event_type,
      dedupe_key,
      payload_json,
      status,
      attempts,
      max_attempts,
      next_attempt_at,
      locked_at,
      locked_by,
      last_error,
      created_at,
      updated_at,
      succeeded_at,
      dead_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(dedupe_key) DO NOTHING`
  );

  insertStmt.run(
    event.id || randomUUID(),
    event.aggregate_type,
    event.aggregate_id,
    event.event_type,
    event.dedupe_key,
    payloadJson,
    OUTBOX_STATUSES.PENDING,
    0,
    maxAttempts,
    nextAttemptAt,
    null,
    null,
    null,
    now,
    now,
    null,
    null
  );

  return getOutboxEventByDedupeKey(event.dedupe_key, db);
}

export function enqueueEvents(events = [], db = getDb()) {
  return events.map((event) => enqueueEvent(event, db));
}

export function getOutboxEventById(id, db = getDb()) {
  return fromRow(db.prepare('SELECT * FROM OutboxEvent WHERE id = ?').get(id));
}

export function getOutboxEventByDedupeKey(dedupeKey, db = getDb()) {
  return fromRow(db.prepare('SELECT * FROM OutboxEvent WHERE dedupe_key = ?').get(dedupeKey));
}

export function claimDueBatch({ workerId, limit = 10, now = nowMs(), leaseMs = 30000 } = {}, db = getDb()) {
  const leaseCutoff = now - leaseMs;

  const transaction = db.transaction(() => {
    const rows = db
      .prepare(
        `SELECT *
         FROM OutboxEvent
         WHERE status IN (?, ?)
           AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
           AND (locked_at IS NULL OR locked_at < ?)
         ORDER BY COALESCE(next_attempt_at, created_at) ASC, created_at ASC, id ASC
         LIMIT ?`
      )
      .all(OUTBOX_STATUSES.PENDING, OUTBOX_STATUSES.RETRY, now, leaseCutoff, limit);

    if (!rows.length) {
      return [];
    }

    const claimStmt = db.prepare(
      `UPDATE OutboxEvent
       SET status = ?,
           attempts = attempts + 1,
           locked_at = ?,
           locked_by = ?,
           updated_at = ?
       WHERE id = ?
         AND status IN (?, ?)
         AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
         AND (locked_at IS NULL OR locked_at < ?)`
    );

    const claimed = [];
    for (const row of rows) {
      const result = claimStmt.run(
        OUTBOX_STATUSES.PROCESSING,
        now,
        workerId || 'worker',
        now,
        row.id,
        OUTBOX_STATUSES.PENDING,
        OUTBOX_STATUSES.RETRY,
        now,
        leaseCutoff
      );

      if (result.changes > 0) {
        claimed.push(getOutboxEventById(row.id, db));
      }
    }

    return claimed;
  });

  return transaction();
}

export function markSucceeded(id, db = getDb()) {
  const now = nowMs();
  db.prepare(
    `UPDATE OutboxEvent
     SET status = ?,
         locked_at = NULL,
         locked_by = NULL,
         last_error = NULL,
         next_attempt_at = NULL,
         succeeded_at = ?,
         updated_at = ?
     WHERE id = ?`
  ).run(OUTBOX_STATUSES.SUCCEEDED, now, now, id);
  return getOutboxEventById(id, db);
}

export function markRetry(id, errorMessage, nextAttemptAt, db = getDb()) {
  const now = nowMs();
  db.prepare(
    `UPDATE OutboxEvent
     SET status = ?,
         locked_at = NULL,
         locked_by = NULL,
         last_error = ?,
         next_attempt_at = ?,
         updated_at = ?
     WHERE id = ?`
  ).run(OUTBOX_STATUSES.RETRY, errorMessage || null, nextAttemptAt ?? null, now, id);
  return getOutboxEventById(id, db);
}

export function markDead(id, errorMessage, db = getDb()) {
  const now = nowMs();
  db.prepare(
    `UPDATE OutboxEvent
     SET status = ?,
         locked_at = NULL,
         locked_by = NULL,
         last_error = ?,
         dead_at = ?,
         updated_at = ?
     WHERE id = ?`
  ).run(OUTBOX_STATUSES.DEAD, errorMessage || null, now, now, id);
  return getOutboxEventById(id, db);
}

export function releaseStaleLocks({ leaseMs = 30000, now = nowMs() } = {}, db = getDb()) {
  const cutoff = now - leaseMs;
  const result = db.prepare(
    `UPDATE OutboxEvent
     SET status = CASE WHEN status = ? THEN ? ELSE status END,
         locked_at = NULL,
         locked_by = NULL,
         next_attempt_at = CASE
           WHEN next_attempt_at IS NULL OR next_attempt_at < ? THEN ?
           ELSE next_attempt_at
         END,
         updated_at = ?
     WHERE status = ?
       AND locked_at IS NOT NULL
       AND locked_at < ?`
  ).run(
    OUTBOX_STATUSES.PROCESSING,
    OUTBOX_STATUSES.RETRY,
    now,
    now,
    now,
    OUTBOX_STATUSES.PROCESSING,
    cutoff
  );

  return result.changes;
}

export function getOutboxStats(db = getDb()) {
  const now = nowMs();
  const rows = db.prepare(
    `SELECT status, COUNT(*) AS count, MIN(created_at) AS oldest_created_at
     FROM OutboxEvent
     GROUP BY status`
  ).all();

  const stats = {
    total: 0,
    pending: 0,
    processing: 0,
    retry: 0,
    succeeded: 0,
    dead: 0,
    due: 0,
    oldest_pending_age_ms: 0,
  };

  for (const row of rows) {
    const count = row.count || 0;
    stats.total += count;
    if (row.status in stats) {
      stats[row.status] = count;
    }
  }

  const pendingOldest = db.prepare(
    `SELECT MIN(created_at) AS oldest_created_at
     FROM OutboxEvent
     WHERE status IN (?, ?)`
  ).get(OUTBOX_STATUSES.PENDING, OUTBOX_STATUSES.RETRY);

  if (pendingOldest?.oldest_created_at) {
    stats.oldest_pending_age_ms = now - pendingOldest.oldest_created_at;
  }

  const dueRow = db.prepare(
    `SELECT COUNT(*) AS count
     FROM OutboxEvent
     WHERE status IN (?, ?)
       AND (next_attempt_at IS NULL OR next_attempt_at <= ?)`
  ).get(OUTBOX_STATUSES.PENDING, OUTBOX_STATUSES.RETRY, now);
  stats.due = dueRow?.count || 0;

  return stats;
}

export { OUTBOX_STATUSES };
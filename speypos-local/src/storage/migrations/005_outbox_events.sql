CREATE TABLE IF NOT EXISTS OutboxEvent (
  id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 10,
  next_attempt_at INTEGER,
  locked_at INTEGER,
  locked_by TEXT,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  succeeded_at INTEGER,
  dead_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_outbox_event_status_next_attempt
  ON OutboxEvent(status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_outbox_event_locked_at
  ON OutboxEvent(status, locked_at);

CREATE INDEX IF NOT EXISTS idx_outbox_event_aggregate
  ON OutboxEvent(aggregate_type, aggregate_id);
CREATE TABLE IF NOT EXISTS BusinessDay (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'default',
  business_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSING', 'CLOSED')),
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  opened_by_staff_id TEXT,
  closed_by_staff_id TEXT,
  close_report_ref TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  UNIQUE (store_id, business_date),
  FOREIGN KEY (opened_by_staff_id) REFERENCES Staff(id),
  FOREIGN KEY (closed_by_staff_id) REFERENCES Staff(id)
);

ALTER TABLE Shift ADD COLUMN business_day_id TEXT;

CREATE INDEX IF NOT EXISTS idx_shift_business_day_id
  ON Shift (business_day_id);

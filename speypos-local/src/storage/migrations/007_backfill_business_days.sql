-- Backfill BusinessDay rows from historical Shift dates.
-- Rule:
-- - CLOSED when DayClose exists for the date
-- - OPEN otherwise
-- - opened_at is min(Shift.started_at) for the date
-- - closed_at comes from DayClose.closed_at when present

INSERT OR IGNORE INTO BusinessDay (
  id,
  store_id,
  business_date,
  status,
  opened_at,
  closed_at,
  opened_by_staff_id,
  closed_by_staff_id,
  close_report_ref,
  created_at,
  updated_at
)
SELECT
  'bd-default-' || REPLACE(s.date, '-', ''),
  'default',
  s.date,
  CASE WHEN dc.date IS NOT NULL THEN 'CLOSED' ELSE 'OPEN' END,
  MIN(s.started_at),
  dc.closed_at,
  NULL,
  NULL,
  NULL,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  NULL
FROM Shift s
LEFT JOIN DayClose dc ON dc.date = s.date
GROUP BY s.date, dc.date, dc.closed_at;

-- Fill Shift.business_day_id for historical rows.
UPDATE Shift
SET business_day_id = (
  SELECT bd.id
  FROM BusinessDay bd
  WHERE bd.store_id = 'default' AND bd.business_date = Shift.date
)
WHERE business_day_id IS NULL;

CREATE TABLE IF NOT EXISTS DayClose (
    date TEXT PRIMARY KEY,
    closed_at INTEGER NOT NULL
);

-- Backfill: any existing date where every shift is already closed is treated as a closed day.
-- Handles data that pre-dates this table. Uses MAX(ended_at) as the close timestamp.
INSERT OR IGNORE INTO DayClose (date, closed_at)
SELECT
    date,
    COALESCE(MAX(ended_at), MAX(started_at))
FROM Shift
WHERE date NOT IN (
    SELECT DISTINCT date FROM Shift WHERE status = 'open'
)
GROUP BY date;

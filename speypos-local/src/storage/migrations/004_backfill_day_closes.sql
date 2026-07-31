-- Backfill DayClose for existing installs where 003_day_closes.sql was already applied
-- without the backfill INSERT. Any date where all shifts are closed is treated as a
-- properly closed business day. Dates with open shifts are left unrecorded so the
-- frontend can still flag them.
INSERT OR IGNORE INTO DayClose (date, closed_at)
SELECT
    date,
    COALESCE(MAX(ended_at), MAX(started_at))
FROM Shift
WHERE date NOT IN (
    SELECT DISTINCT date FROM Shift WHERE status = 'open'
)
GROUP BY date;

# Data Maintenance & Automatic Deletion

SpeyPOS Local includes an automatic maintenance service to ensure optimal performance and manage local storage limits.

## Monthly Automatic Deletion

The system performs a "Monthly Wipe" of historical data to keep the local database lean and responsive.

### Behavior Summary
- **Frequency:** Every 30 days.
- **Retention Policy:** 
    - Data older than **3 days** is eligible for deletion.
    - This creates a rolling window where at least 3 days of data are always present, but data older than that is purged once a month.
- **Safety Protocol:**
    - Before deleting any order, the system attempts a final cloud sync if the order hasn't been synced yet.
    - If the sync attempt fails, the data is **still deleted** to prioritize local system health and disk space.
- **Scope of Deletion:**
    - **Orders:** All order data (items, payments, customizations) older than 3 days.
    - **Shifts:** Any shift record that no longer contains orders and is older than 3 days.
    - **Logs:** Daily log files older than 30 days are permanently deleted.
    - **Outbox:** Successfully processed or permanently failed outbox events older than 30 days.

### Database Optimization (VACUUM)
After data is purged, the system executes a SQLite `VACUUM` command. This process:
1. Rebuilds the database file.
2. Reclaims unused disk space.
3. Defragments the file for faster access.

*Note: During the VACUUM process, the database may be briefly locked.*

## Internal Configuration
These settings are managed internally and are not exposed to the user interface:
- `maintenance.last_run_at`: Timestamp of the last maintenance cycle.
- `maintenance.retention_interval_days`: Default is `30`.

## Implementation Details
The maintenance logic is located in `src/services/maintenance.service.js` and is triggered during system initialization via `src/system/lifecycle.js`.

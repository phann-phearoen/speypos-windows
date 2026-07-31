# BusinessDay Semanticization Roadmap

## Purpose

This roadmap converts business day handling from implicit date-based behavior to an explicit BusinessDay lifecycle model.

Current state:
- A business day is inferred mainly from Shift.date.
- DayClose is created only when day close succeeds.
- Previous-day enforcement logic is spread across date checks and derived queries.

Target state:
- BusinessDay is a first-class entity with explicit lifecycle state.
- Shift belongs to BusinessDay by foreign key.
- Gate logic reads BusinessDay state directly.

---

## Target Model

BusinessDay statuses:
- OPEN
- CLOSING
- CLOSED

BusinessDay invariants:
- Exactly one BusinessDay per store + business_date.
- OPEN and CLOSING days can accept only valid transitions.
- CLOSED day is immutable except by explicit admin reopen flow (optional later phase).

Shift invariants:
- Every shift references business_day_id.
- Shift.date remains temporary compatibility data during migration window.

---

## Execution Principles

- Ship in small, reversible increments.
- Keep backward compatibility until all layers are migrated.
- Add contract and regression tests at each phase.
- Use feature flags for behavior switching when needed.

Recommended feature flags:
- businessDay.enabled
- businessDay.strictGate
- businessDay.requireFk

---

## Step-by-Step Plan

## Step 0 - Baseline and Safety Net

Goal:
- Freeze current behavior and add coverage before structural changes.

Tasks:
- Add baseline tests for:
  - open shift with/without previous day close
  - close day happy path
  - close day when open shifts exist
  - previous-day status endpoint behavior
- Capture API contract snapshots for shift/day endpoints.

Deliverables:
- Test fixtures for shifts across multiple dates.
- Contract snapshots checked into test assets.

Exit criteria:
- Current branch passes full backend and client tests.

Rollback:
- Not needed; test-only step.

---

## Step 1 - Schema Introduction (Non-Breaking)

Goal:
- Introduce BusinessDay table and nullable relation from Shift.

Tasks:
- Add migration to create BusinessDay table:
  - id TEXT PK
  - store_id TEXT NOT NULL DEFAULT 'default'
  - business_date TEXT NOT NULL
  - status TEXT NOT NULL CHECK status IN ('OPEN','CLOSING','CLOSED')
  - opened_at INTEGER NOT NULL
  - closed_at INTEGER
  - opened_by_staff_id TEXT
  - closed_by_staff_id TEXT
  - close_report_ref TEXT
  - created_at INTEGER NOT NULL
  - updated_at INTEGER
  - UNIQUE(store_id, business_date)
- Add nullable Shift.business_day_id column.
- Add index on Shift(business_day_id).

Deliverables:
- New migration file(s) in storage/migrations.

Exit criteria:
- App boots and old APIs behave exactly as before.

Rollback:
- Revert migration before release or restore DB snapshot.

---

## Step 2 - Data Backfill

Goal:
- Populate BusinessDay from existing data with deterministic rules.

Tasks:
- Backfill one BusinessDay row per distinct Shift.date.
- Derive status:
  - CLOSED if DayClose exists for date.
  - OPEN otherwise.
- Set opened_at as MIN(Shift.started_at) for that date.
- Set closed_at from DayClose.closed_at when available.
- Fill Shift.business_day_id by joining on Shift.date.

Deliverables:
- Backfill migration script.
- Validation script for row count and FK fill rate.

Exit criteria:
- 100% shifts with non-null business_day_id in migrated datasets.
- No duplicate BusinessDay for same store_id + business_date.

Rollback:
- Re-run from backup snapshot.

---

## Step 3 - Repository Layer Addition (Dual Read/Write)

Goal:
- Add BusinessDay repository without changing endpoint behavior yet.

Tasks:
- Create business-day repository module with:
  - getByBusinessDate(storeId, date)
  - createOpenDay(...)
  - transitionStatus(dayId, fromStatus, toStatus, metadata)
  - getPreviousBusinessDay(storeId, date)
  - listByRange(...)
- Update shift repository APIs to accept business_day_id where relevant.
- Keep legacy date-based queries as fallback.

Deliverables:
- New repository file and tests.

Exit criteria:
- Repository tests cover transitions and race-safe create flow.

Rollback:
- Keep old repository code paths as default until flag switch.

---

## Step 4 - Service Layer Refactor

Goal:
- Move lifecycle orchestration into BusinessDay-aware service logic.

Tasks:
- Add business-day service:
  - resolveOrCreateTodayOpenDay
  - assertPreviousDayClosed
  - assertDayCloseReady
  - closeBusinessDayTransactionally
- Refactor shift/day services to call business-day service first.
- Keep producing legacy response fields for compatibility.

Deliverables:
- Service-level tests for state transitions and guard logic.

Exit criteria:
- All old behavior preserved with flag OFF.
- New semantic behavior verified with flag ON in test suite.

Rollback:
- Feature flag off.

---

## Step 5 - Controller/API Integration (Compatibility Mode)

Goal:
- Keep existing endpoints but route logic through BusinessDay services.

Tasks:
- Update handlers:
  - POST /shifts/open
  - GET /shift/day-status/previous
  - GET /shift/close-day
  - POST /shift/close-day
- Ensure idempotency:
  - close-day returns deterministic conflict response if already closed.
- Extend responses with optional semantic fields:
  - business_day_id
  - business_day_status

Deliverables:
- Controller integration tests.
- API docs update draft.

Exit criteria:
- Existing clients still work without changes.

Rollback:
- Feature flag off.

---

## Step 6 - Transaction and Concurrency Hardening

Goal:
- Eliminate race conditions around opening/closing day.

Tasks:
- Wrap open-shift and close-day flows in DB transactions.
- Enforce optimistic transition checks:
  - OPEN -> CLOSING -> CLOSED only.
- Add uniqueness and lock retry handling for concurrent open attempts.

Deliverables:
- Concurrency tests (simulated parallel requests).

Exit criteria:
- No duplicate business day creation under concurrent load.
- No double-close side effects.

Rollback:
- Keep guarded old flow path behind flag.

---

## Step 7 - Outbox/Sync and Notification Alignment

Goal:
- Align async workflows with semantic BusinessDay states.

Tasks:
- Attach business_day_id metadata to outbox shift-close events.
- Ensure close-day events are emitted only after CLOSED transition commits.
- Update recovery/retry tools to inspect business-day state.

Deliverables:
- Updated event payload contracts.
- Retry behavior tests.

Exit criteria:
- No orphaned notifications for failed closes.

Rollback:
- Continue sending legacy payload fields in parallel.

---

## Step 8 - Client-Side Contract Adoption

Goal:
- Make client display and gates consume semantic fields directly.

Tasks:
- Update POS type contracts with BusinessDay model.
- Update hooks/providers for:
  - opening shift eligibility
  - previous day banner/warnings
  - close-day readiness and status
- Keep fallback to legacy fields during transition.

Deliverables:
- Client state tests and critical flow E2E tests.

Exit criteria:
- Client works with semantic fields enabled.
- No regression in shift open/close UX.

Rollback:
- Client fallback to legacy fields.

---

## Step 9 - API Versioning and Documentation

Goal:
- Formalize the semantic contract.

Tasks:
- Add API doc section for BusinessDay resources and fields.
- Optionally add new endpoints:
  - GET /business-day/current
  - GET /business-day/:date
  - POST /business-day/:date/reopen (optional policy)
- Mark legacy fields as deprecated with timeline.

Deliverables:
- Updated api docs and migration notes for clients.

Exit criteria:
- Consumers have clear migration path and dates.

Rollback:
- Preserve old endpoints and fields until final removal.

---

## Step 10 - Strict Mode and Legacy Path Removal

Goal:
- Complete semanticization and remove ambiguity.

Tasks:
- Enable businessDay.strictGate by default.
- Make Shift.business_day_id NOT NULL.
- Remove legacy DayClose-dependent gate branches.
- Retain DayClose as optional read model only, or retire it after final migration.

Deliverables:
- Final schema migration.
- Cleanup PR removing dead code.

Exit criteria:
- All lifecycle logic references BusinessDay first-class state.
- Legacy fallback no longer used.

Rollback:
- Roll back strictGate flag and defer NOT NULL migration if needed.

---

## Step 11 - Observability and Production Guardrails

Goal:
- Make failures visible and operationally recoverable.

Tasks:
- Add metrics:
  - business_day_open_total
  - business_day_close_total
  - business_day_close_conflict_total
  - previous_day_gate_reject_total
- Add structured logs with business_day_id and transition info.
- Add admin diagnostics endpoint/report for day-state anomalies.

Deliverables:
- Dashboard and alert rules.

Exit criteria:
- Alerts fire on abnormal state transition failures.

Rollback:
- Not applicable; additive monitoring.

---

## Step 12 - Post-Migration Validation and Data Audit

Goal:
- Prove model integrity after rollout.

Tasks:
- Run consistency checks:
  - every shift has business_day_id
  - business_date on day matches shift.date (during compatibility window)
  - CLOSED day has no open shifts
- Execute sampled financial reconciliation between pre/post reports.

Deliverables:
- Audit report and sign-off checklist.

Exit criteria:
- Data integrity checks pass for production snapshots.

Rollback:
- If mismatch detected, disable strictGate and run repair script.

---

## Suggested PR Breakdown

PR-1:
- Step 0 + Step 1

PR-2:
- Step 2 + validation tooling

PR-3:
- Step 3 repositories

PR-4:
- Step 4 services

PR-5:
- Step 5 controllers + compatibility responses

PR-6:
- Step 6 concurrency hardening

PR-7:
- Step 7 outbox/sync alignment

PR-8:
- Step 8 client updates

PR-9:
- Step 9 docs/versioning

PR-10:
- Step 10 strict mode cleanup

PR-11:
- Step 11 and Step 12 operational validation

---

## Testing Matrix (Minimum)

Backend:
- Unit: repository transitions, service gate rules.
- Integration: open/close endpoints across multiple dates.
- Concurrency: parallel open shift, repeated close-day requests.
- Migration: upgrade from real pre-semantic DB snapshots.

Client:
- Type contract tests for new BusinessDay fields.
- Hook/provider tests for gate and status rendering.
- E2E: open shift -> close shifts -> close day -> next day open.

Operational:
- Restart/crash recovery mid-close flow.
- Outbox retry after close-day notification failure.

---

## Risks and Mitigations

Risk:
- Mixed old/new semantics during rollout.

Mitigation:
- Dual-read/write period + strict feature-flag gating.

Risk:
- Timezone boundary errors.

Mitigation:
- Keep server-side store-time authority for date derivation.

Risk:
- Duplicate day records under concurrent requests.

Mitigation:
- Unique constraint + transactional create + retry-safe code.

Risk:
- Client mismatch to new fields.

Mitigation:
- Backward-compatible response payload until full client rollout.

---

## Definition of Done

The semanticization is complete when all conditions are true:
- BusinessDay is the authoritative lifecycle entity.
- All shift/day gates rely on BusinessDay status transitions.
- Shift rows require business_day_id.
- Client uses semantic fields by default.
- Legacy fallback logic is removed or archived.
- Monitoring confirms stable production behavior.

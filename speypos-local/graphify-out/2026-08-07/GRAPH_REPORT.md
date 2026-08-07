# Graph Report - speypos-local  (2026-07-31)

## Corpus Check
- 167 files · ~670,465 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 748 nodes · 1674 edges · 56 communities (55 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d98750e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_logger.js|logger.js]]
- [[_COMMUNITY_outbox.dispatchers.js|outbox.dispatchers.js]]
- [[_COMMUNITY_shift.controller.js|shift.controller.js]]
- [[_COMMUNITY_settings.service.js|settings.service.js]]
- [[_COMMUNITY_getDb|getDb]]
- [[_COMMUNITY_settings.validator.js|settings.validator.js]]
- [[_COMMUNITY_customization-option-group.repo.js|customization-option-group.repo.js]]
- [[_COMMUNITY_syncManager.js|syncManager.js]]
- [[_COMMUNITY_canvasReceiptRenderer.js|canvasReceiptRenderer.js]]
- [[_COMMUNITY_BusinessDay Semanticization Roadmap|BusinessDay Semanticization Roadmap]]
- [[_COMMUNITY_test-canvas-receipt.js|test-canvas-receipt.js]]
- [[_COMMUNITY_menu-item.controller.js|menu-item.controller.js]]
- [[_COMMUNITY_business-day.service.js|business-day.service.js]]
- [[_COMMUNITY_order.repo.js|order.repo.js]]
- [[_COMMUNITY_dump.js|dump.js]]
- [[_COMMUNITY_shift.repo.js|shift.repo.js]]
- [[_COMMUNITY_httpServer.js|httpServer.js]]
- [[_COMMUNITY_staff.repo.js|staff.repo.js]]
- [[_COMMUNITY_auth.middleware.js|auth.middleware.js]]
- [[_COMMUNITY_business-day-step2-backfill.test.js|business-day-step2-backfill.test.js]]
- [[_COMMUNITY_SpeyPOS|SpeyPOS]]
- [[_COMMUNITY_customization-option.routes.js|customization-option.routes.js]]
- [[_COMMUNITY_customization-option-group.routes.js|customization-option-group.routes.js]]
- [[_COMMUNITY_staff.routes.js|staff.routes.js]]
- [[_COMMUNITY_topping-group.routes.js|topping-group.routes.js]]
- [[_COMMUNITY_topping-option.routes.js|topping-option.routes.js]]
- [[_COMMUNITY_business-day.repo.js|business-day.repo.js]]
- [[_COMMUNITY_Data Maintenance & Automatic Deletion|Data Maintenance & Automatic Deletion]]
- [[_COMMUNITY_menu-category-topping-group.routes.js|menu-category-topping-group.routes.js]]
- [[_COMMUNITY_menu-item-customization-group.routes.js|menu-item-customization-group.routes.js]]
- [[_COMMUNITY_menu-item-topping-group.routes.js|menu-item-topping-group.routes.js]]
- [[_COMMUNITY_staff-shift.controller.js|staff-shift.controller.js]]
- [[_COMMUNITY_customization-option.repo.js|customization-option.repo.js]]
- [[_COMMUNITY_menu-category.repo.js|menu-category.repo.js]]
- [[_COMMUNITY_topping-option.repo.js|topping-option.repo.js]]
- [[_COMMUNITY_fix-order-totals.js|fix-order-totals.js]]
- [[_COMMUNITY_Architecture|Architecture]]
- [[_COMMUNITY_.prettierrc.json|.prettierrc.json]]
- [[_COMMUNITY_Data Flow|Data Flow]]
- [[_COMMUNITY_Database Migrations|Database Migrations]]
- [[_COMMUNITY_menu-category-topping-group.repo.js|menu-category-topping-group.repo.js]]
- [[_COMMUNITY_cloud-sync|cloud-sync.md]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 143 edges
2. `logger` - 49 edges
3. `BusinessDay Semanticization Roadmap` - 22 edges
4. `serializeOrder()` - 21 edges
5. `isAdmin()` - 17 edges
6. `initialize()` - 14 edges
7. `uploadOrdersBatch()` - 13 edges
8. `paths` - 12 edges
9. `getNowInStoreTime()` - 12 edges
10. `getShiftById()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `main()` --indirect_call--> `row()`  [INFERRED]
  data/seed-scripts/dump.js → scripts/validate-business-day-backfill.js
- `getNowInStoreTime()` --calls--> `format()`  [INFERRED]
  src/services/time.service.js → src/services/money.service.js
- `getStoreDateFromUtcDate()` --calls--> `format()`  [INFERRED]
  src/services/time.service.js → src/services/money.service.js
- `performInitialSetup()` --calls--> `getDb()`  [EXTRACTED]
  src/services/setup.service.js → src/storage/database.js
- `getPreviousBusinessDay()` --calls--> `getDb()`  [EXTRACTED]
  src/storage/repositories/business-day.repo.js → src/storage/database.js

## Import Cycles
- 4-file cycle: `src/controllers/setup.controller.js -> src/system/lifecycle.js -> src/server/httpServer.js -> src/routes/setup.routes.js -> src/controllers/setup.controller.js`
- 4-file cycle: `src/controllers/system.controller.js -> src/system/lifecycle.js -> src/server/httpServer.js -> src/routes/system.routes.js -> src/controllers/system.controller.js`

## Communities (56 total, 1 thin omitted)

### Community 0 - "logger.js"
Cohesion: 0.05
Nodes (47): dbDir, dbPath, __dirname, __filename, paths, projectRoot, UPLOAD_TYPES, getPendingActionsStatus() (+39 more)

### Community 1 - "outbox.dispatchers.js"
Cohesion: 0.09
Nodes (39): __dirname, env, syncMiniBatchSize, ORDER_STATUS, ORDER_VOID_REASONS, createOrder(), createPayment(), getOrder() (+31 more)

### Community 2 - "shift.controller.js"
Cohesion: 0.13
Nodes (35): addBusinessDayFieldsToShift(), addBusinessDayFieldsToShiftList(), closeDay(), createShift(), deleteShift(), getDayCloseReview(), getOpenShifts(), getPreviousDayStatus() (+27 more)

### Community 3 - "settings.service.js"
Cohesion: 0.10
Nodes (36): formatItem(), formatOrderForDisplay(), format(), computeBackoffMs(), processBatch(), runOutboxWorkerOnce(), startOutboxWorker(), tick() (+28 more)

### Community 4 - "getDb"
Cohesion: 0.10
Nodes (29): getDb(), getAllInventory(), updateStock(), createMap(), getMaps(), remove(), createMap(), getMaps() (+21 more)

### Community 5 - "settings.validator.js"
Cohesion: 0.14
Nodes (24): SUPPORTED_INTENTS, getAllSettings(), getSetting(), upsertSetting(), router, normalizeBaseUrl(), performHandshake(), assertAllowedKeys() (+16 more)

### Community 6 - "customization-option-group.repo.js"
Cohesion: 0.13
Nodes (23): createMenuCategory(), deleteMenuCategory(), getMenuCategories(), getMenuCategory(), updateMenuCategory(), router, serializeCategories(), serializeCategory() (+15 more)

### Community 7 - "syncManager.js"
Cohesion: 0.17
Nodes (20): manualSyncShift(), router, buildOrderEvent(), currencyMetadata, getConfig(), postJson(), toIso(), toMajor() (+12 more)

### Community 8 - "canvasReceiptRenderer.js"
Cohesion: 0.15
Nodes (23): buildEscPosBuffer(), buildVariantLine(), calculateReceiptHeight(), canvasTo1bitRaster(), COL_PRODUCT_W, __dirname, drawHorizontalLine(), drawReceiptContent() (+15 more)

### Community 9 - "BusinessDay Semanticization Roadmap"
Cohesion: 0.09
Nodes (22): BusinessDay Semanticization Roadmap, Definition of Done, Execution Principles, Purpose, Risks and Mitigations, Step 0 - Baseline and Safety Net, Step 10 - Strict Mode and Legacy Path Removal, Step 11 - Observability and Production Guardrails (+14 more)

### Community 10 - "test-canvas-receipt.js"
Cohesion: 0.13
Nodes (22): args, buffer, buildVariantLine(), calculateHeight(), canvas, __dirname, drawCentered(), drawHLine() (+14 more)

### Community 11 - "menu-item.controller.js"
Cohesion: 0.16
Nodes (16): createMap(), deleteMap(), getMaps(), createMenuItem(), deleteMenuItem(), getMenuItem(), getMenuItems(), updateMenuItem() (+8 more)

### Community 12 - "business-day.service.js"
Cohesion: 0.20
Nodes (15): assertDayCloseReady(), assertPreviousDayClosed(), closeBusinessDayTransactionally(), createLifecycleError(), getDayCloseContext(), isBusinessDayEnabled(), resolveOrCreateTodayOpenDay(), withSqliteBusyRetry() (+7 more)

### Community 13 - "order.repo.js"
Cohesion: 0.15
Nodes (17): assertCanCreateOrderForShift(), countFinalizedUnsyncedByShift(), createOrder(), createShiftLifecycleError(), findActiveOrder(), findUnprinted(), findUnreportedForTelegram(), getAllOrders() (+9 more)

### Community 14 - "dump.js"
Cohesion: 0.15
Nodes (10): SEEDABLE_TABLES, checkTableExists(), getAllTableNames(), getArg(), main(), getArg(), main(), db (+2 more)

### Community 15 - "shift.repo.js"
Cohesion: 0.18
Nodes (16): getStoreDateFromUtcDate(), createShift(), deleteShift(), findUnreportedForTelegram(), findUnreportedForTelegramEligible(), getActiveShiftForNow(), getAllShifts(), getDayCloseEnforcementStartDate() (+8 more)

### Community 16 - "httpServer.js"
Cohesion: 0.17
Nodes (10): MediaController, router, router, router, router, router, router, app (+2 more)

### Community 17 - "staff.repo.js"
Cohesion: 0.24
Nodes (10): login(), router, createStaff(), deleteStaff(), getAllStaff(), getStaffById(), getStaffByNameForAuth(), updateStaff() (+2 more)

### Community 18 - "auth.middleware.js"
Cohesion: 0.23
Nodes (8): createMap(), deleteMap(), getMaps(), UploadController, isAdmin(), router, router, router

### Community 20 - "business-day-step2-backfill.test.js"
Cohesion: 0.22
Nodes (6): cleanupTargets, dbPath, __dirname, __filename, migrationDir, projectRoot

### Community 21 - "SpeyPOS"
Cohesion: 0.25
Nodes (7): Core Principles, Development Environment (macOS / Windows), Development vs. Production, Getting Started, Production Environment (Windows 10), Project Structure, SpeyPOS

### Community 22 - "customization-option.routes.js"
Cohesion: 0.43
Nodes (6): createOption(), deleteOption(), getOption(), getOptions(), updateOption(), router

### Community 23 - "customization-option-group.routes.js"
Cohesion: 0.43
Nodes (6): createGroup(), deleteGroup(), getGroup(), getGroups(), updateGroup(), router

### Community 24 - "staff.routes.js"
Cohesion: 0.43
Nodes (6): createStaffMember(), deleteStaffMember(), getStaffMember(), getStaffMembers(), updateStaffMember(), router

### Community 25 - "topping-group.routes.js"
Cohesion: 0.43
Nodes (6): createGroup(), deleteGroup(), getGroup(), getGroups(), updateGroup(), router

### Community 26 - "topping-option.routes.js"
Cohesion: 0.43
Nodes (6): createOption(), deleteOption(), getOption(), getOptions(), updateOption(), router

### Community 27 - "business-day.repo.js"
Cohesion: 0.36
Nodes (7): BUSINESS_DAY_STATUS, createOpenDay(), getBusinessDayById(), getByBusinessDate(), getPreviousBusinessDay(), listByRange(), transitionStatus()

### Community 28 - "Data Maintenance & Automatic Deletion"
Cohesion: 0.29
Nodes (6): Behavior Summary, Data Maintenance & Automatic Deletion, Database Optimization (VACUUM), Implementation Details, Internal Configuration, Monthly Automatic Deletion

### Community 29 - "menu-category-topping-group.routes.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 30 - "menu-item-customization-group.routes.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 31 - "menu-item-topping-group.routes.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 32 - "staff-shift.controller.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 33 - "customization-option.repo.js"
Cohesion: 0.47
Nodes (5): create(), getAll(), getById(), remove(), update()

### Community 34 - "menu-category.repo.js"
Cohesion: 0.47
Nodes (5): createMenuCategory(), deleteMenuCategory(), getAllMenuCategories(), getMenuCategoryById(), updateMenuCategory()

### Community 35 - "topping-option.repo.js"
Cohesion: 0.47
Nodes (5): create(), getAll(), getById(), remove(), update()

### Community 38 - "fix-order-totals.js"
Cohesion: 0.70
Nodes (4): buildAddOnTotals(), getArgValue(), hasFlag(), main()

### Community 39 - "Architecture"
Cohesion: 0.40
Nodes (4): Architecture, Component Responsibilities, Guiding Principles, System Components

### Community 40 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 44 - "Data Flow"
Cohesion: 0.50
Nodes (3): 1. Creating an Order, 2. Background Cloud Sync (Mini-Batch + Shift Flush), Data Flow

### Community 45 - "Database Migrations"
Cohesion: 0.50
Nodes (3): Database Migrations, How to Add a New Migration, Storage Layer

### Community 46 - "menu-category-topping-group.repo.js"
Cohesion: 0.50
Nodes (3): createMap(), getMaps(), remove()

## Knowledge Gaps
- **94 isolated node(s):** `singleQuote`, `trailingComma`, `printWidth`, `semi`, `__filename` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `logger.js`, `outbox.dispatchers.js`, `customization-option.repo.js`, `menu-category.repo.js`, `settings.service.js`, `shift.controller.js`, `customization-option-group.repo.js`, `topping-option.repo.js`, `menu-item.controller.js`, `business-day.service.js`, `order.repo.js`, `menu-category-topping-group.repo.js`, `shift.repo.js`, `staff.repo.js`, `business-day.repo.js`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Why does `logger` connect `logger.js` to `outbox.dispatchers.js`, `shift.controller.js`, `settings.service.js`, `settings.validator.js`, `customization-option-group.repo.js`, `syncManager.js`, `canvasReceiptRenderer.js`, `menu-item.controller.js`, `shift.repo.js`, `httpServer.js`, `staff.repo.js`, `auth.middleware.js`, `customization-option.routes.js`, `customization-option-group.routes.js`, `staff.routes.js`, `topping-group.routes.js`, `topping-option.routes.js`, `menu-category-topping-group.routes.js`, `menu-item-customization-group.routes.js`, `menu-item-topping-group.routes.js`, `staff-shift.controller.js`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `paths` connect `logger.js` to `fix-order-totals.js`, `httpServer.js`, `dump.js`, `syncManager.js`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `singleQuote`, `trailingComma`, `printWidth` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `logger.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `outbox.dispatchers.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09333333333333334 - nodes in this community are weakly interconnected._
- **Should `shift.controller.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12624584717607973 - nodes in this community are weakly interconnected._
# Graph Report - speypos-local  (2026-08-07)

## Corpus Check
- 177 files · ~590,580 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 866 nodes · 1888 edges · 71 communities (68 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dce2bfa7`
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
- [[_COMMUNITY_business-day-step0-baseline.test.js|business-day-step0-baseline.test.js]]
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
- [[_COMMUNITY_shift-close-repro.test.js|shift-close-repro.test.js]]
- [[_COMMUNITY_fix-order-totals.js|fix-order-totals.js]]
- [[_COMMUNITY_Architecture|Architecture]]
- [[_COMMUNITY_.prettierrc.json|.prettierrc.json]]
- [[_COMMUNITY_day-close-idempotency.test.js|day-close-idempotency.test.js]]
- [[_COMMUNITY_shift-day-status.test.js|shift-day-status.test.js]]
- [[_COMMUNITY_Data Flow|Data Flow]]
- [[_COMMUNITY_Database Migrations|Database Migrations]]
- [[_COMMUNITY_menu-category-topping-group.repo.js|menu-category-topping-group.repo.js]]
- [[_COMMUNITY_business-day.service.test.js|business-day.service.test.js]]
- [[_COMMUNITY_cloud-sync|cloud-sync.md]]
- [[_COMMUNITY_upload.controller.js|upload.controller.js]]
- [[_COMMUNITY_display.controller.js|display.controller.js]]
- [[_COMMUNITY_cup-size.repo.js|cup-size.repo.js]]
- [[_COMMUNITY_menu-category-cup-size-map.routes.js|menu-category-cup-size-map.routes.js]]
- [[_COMMUNITY_menu-item-category-map.controller.js|menu-item-category-map.controller.js]]
- [[_COMMUNITY_menu-item-cup-size-map.routes.js|menu-item-cup-size-map.routes.js]]
- [[_COMMUNITY_menu-item.repo.js|menu-item.repo.js]]
- [[_COMMUNITY_menu-category-cup-size-map.repo.js|menu-category-cup-size-map.repo.js]]
- [[_COMMUNITY_settings.repo.js|settings.repo.js]]
- [[_COMMUNITY_menu-item-customization-group.repo.js|menu-item-customization-group.repo.js]]
- [[_COMMUNITY_menu-item-topping-group.repo.js|menu-item-topping-group.repo.js]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 162 edges
2. `logger` - 52 edges
3. `randomUUID()` - 31 edges
4. `BusinessDay Semanticization Roadmap` - 22 edges
5. `scripts` - 21 edges
6. `serializeOrder()` - 21 edges
7. `isAdmin()` - 20 edges
8. `initialize()` - 14 edges
9. `uploadOrdersBatch()` - 13 edges
10. `paths` - 12 edges

## Surprising Connections (you probably didn't know these)
- `main()` --indirect_call--> `row()`  [INFERRED]
  data/seed-scripts/dump.js → scripts/validate-business-day-backfill.js
- `insertShift()` --calls--> `randomUUID()`  [INFERRED]
  src/tests/business-day-step0-baseline.test.js → src/index.js
- `insertShift()` --calls--> `randomUUID()`  [INFERRED]
  src/tests/business-day-step2-backfill.test.js → src/index.js
- `insertShift()` --calls--> `randomUUID()`  [INFERRED]
  src/tests/business-day-step5-controller.test.js → src/index.js
- `insertShift()` --calls--> `randomUUID()`  [INFERRED]
  src/tests/shift-close-repro.test.js → src/index.js

## Import Cycles
- 4-file cycle: `src/controllers/setup.controller.js -> src/system/lifecycle.js -> src/server/httpServer.js -> src/routes/setup.routes.js -> src/controllers/setup.controller.js`
- 4-file cycle: `src/controllers/system.controller.js -> src/system/lifecycle.js -> src/server/httpServer.js -> src/routes/system.routes.js -> src/controllers/system.controller.js`

## Communities (71 total, 3 thin omitted)

### Community 0 - "logger.js"
Cohesion: 0.05
Nodes (47): getPendingActionsStatus(), getSetupStatus(), main(), formatItem(), formatOrderForDisplay(), getSetupStatus(), healthCheck(), startServer() (+39 more)

### Community 1 - "outbox.dispatchers.js"
Cohesion: 0.16
Nodes (22): ORDER_VOID_REASONS, createOrder(), createPayment(), getOrder(), getOrders(), normalizeOrderPayload(), printOrderReceipt(), toCreateOrderLifecycleErrorResponse() (+14 more)

### Community 2 - "shift.controller.js"
Cohesion: 0.18
Nodes (27): addBusinessDayFieldsToShift(), addBusinessDayFieldsToShiftList(), closeDay(), createShift(), deleteShift(), getDayCloseReview(), getDayCloseStatus(), getOpenShifts() (+19 more)

### Community 3 - "settings.service.js"
Cohesion: 0.08
Nodes (54): printReceipt(), buildOrderEvent(), currencyMetadata, getConfig(), postJson(), toIso(), toMajor(), uploadOrdersBatch() (+46 more)

### Community 4 - "getDb"
Cohesion: 0.16
Nodes (10): paths, initializeDatabase(), runMigrations(), getAllInventory(), updateStock(), createOrder(), findUnprintedOrders(), markOrderAsPrinted() (+2 more)

### Community 5 - "settings.validator.js"
Cohesion: 0.13
Nodes (25): SUPPORTED_INTENTS, getAllSettings(), getSetting(), upsertSetting(), router, normalizeBaseUrl(), performHandshake(), selectCanonicalStoreIdentity() (+17 more)

### Community 6 - "customization-option-group.repo.js"
Cohesion: 0.13
Nodes (23): createMenuCategory(), deleteMenuCategory(), getMenuCategories(), getMenuCategory(), updateMenuCategory(), router, serializeCategories(), serializeCategory() (+15 more)

### Community 7 - "syncManager.js"
Cohesion: 0.30
Nodes (12): manualSyncShift(), readQueue(), writeQueue(), enqueueFlushForShift(), enqueueOrdersForShift(), enqueueShiftJob(), handleFlushJob(), handleMiniBatchJob() (+4 more)

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
Cohesion: 0.40
Nodes (8): createMenuItem(), deleteMenuItem(), getMenuItem(), getMenuItems(), updateMenuItem(), router, serializeManyMenuItems(), serializeMenuItem()

### Community 12 - "business-day.service.js"
Cohesion: 0.38
Nodes (8): assertDayCloseReady(), assertPreviousDayClosed(), closeBusinessDayTransactionally(), createLifecycleError(), getDayCloseContext(), isBusinessDayEnabled(), resolveOrCreateTodayOpenDay(), withSqliteBusyRetry()

### Community 13 - "order.repo.js"
Cohesion: 0.13
Nodes (27): getDb(), createMenuItemCategoryMap(), deleteMenuItemCategoryMap(), getMappingsByItemIds(), getMenuItemCategoryMaps(), createMap(), getMappingsByItemIds(), getMaps() (+19 more)

### Community 14 - "dump.js"
Cohesion: 0.15
Nodes (10): SEEDABLE_TABLES, checkTableExists(), getAllTableNames(), getArg(), main(), getArg(), main(), db (+2 more)

### Community 15 - "shift.repo.js"
Cohesion: 0.15
Nodes (19): getStoreDateFromUtcDate(), assertCanCreateOrderForShift(), createShiftLifecycleError(), createShift(), deleteShift(), findUnreportedForTelegram(), findUnreportedForTelegramEligible(), getActiveShiftForNow() (+11 more)

### Community 16 - "httpServer.js"
Cohesion: 0.14
Nodes (14): UploadController, isAdmin(), router, router, router, router, router, router (+6 more)

### Community 17 - "staff.repo.js"
Cohesion: 0.15
Nodes (16): login(), createStaffMember(), deleteStaffMember(), getStaffMember(), getStaffMembers(), updateStaffMember(), router, router (+8 more)

### Community 18 - "auth.middleware.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 20 - "business-day-step2-backfill.test.js"
Cohesion: 0.22
Nodes (7): cleanupTargets, dbPath, __dirname, __filename, insertShift(), migrationDir, projectRoot

### Community 21 - "SpeyPOS"
Cohesion: 0.25
Nodes (7): Core Principles, Development Environment (macOS / Windows), Development vs. Production, Getting Started, Production Environment (Windows 10), Project Structure, SpeyPOS

### Community 22 - "customization-option.routes.js"
Cohesion: 0.20
Nodes (12): createOption(), deleteOption(), getOption(), getOptions(), updateOption(), router, create(), getAll() (+4 more)

### Community 23 - "customization-option-group.routes.js"
Cohesion: 0.43
Nodes (6): createGroup(), deleteGroup(), getGroup(), getGroups(), updateGroup(), router

### Community 24 - "staff.routes.js"
Cohesion: 0.04
Nodes (45): author, dependencies, better-sqlite3, child_process, cors, date-fns-tz, dotenv, express (+37 more)

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
Cohesion: 0.25
Nodes (7): __dirname, env, syncMiniBatchSize, sendEscPosBuffer(), devFormat, logger, prodFormat

### Community 34 - "menu-category.repo.js"
Cohesion: 0.47
Nodes (5): createMenuCategory(), deleteMenuCategory(), getAllMenuCategories(), getMenuCategoryById(), updateMenuCategory()

### Community 35 - "topping-option.repo.js"
Cohesion: 0.47
Nodes (5): create(), getAll(), getById(), remove(), update()

### Community 37 - "shift-close-repro.test.js"
Cohesion: 0.11
Nodes (3): insertShift(), insertShift(), insertShift()

### Community 38 - "fix-order-totals.js"
Cohesion: 0.70
Nodes (4): buildAddOnTotals(), getArgValue(), hasFlag(), main()

### Community 39 - "Architecture"
Cohesion: 0.40
Nodes (4): Architecture, Component Responsibilities, Guiding Principles, System Components

### Community 40 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 42 - "day-close-idempotency.test.js"
Cohesion: 0.12
Nodes (10): randomUUID(), createMap(), getMaps(), remove(), createMap(), getMaps(), remove(), insertShift() (+2 more)

### Community 43 - "shift-day-status.test.js"
Cohesion: 0.20
Nodes (7): dbDir, dbPath, __dirname, __filename, projectRoot, MediaController, UPLOAD_TYPES

### Community 44 - "Data Flow"
Cohesion: 0.50
Nodes (3): 1. Creating an Order, 2. Background Cloud Sync (Mini-Batch + Shift Flush), Data Flow

### Community 45 - "Database Migrations"
Cohesion: 0.50
Nodes (3): Database Migrations, How to Add a New Migration, Storage Layer

### Community 46 - "menu-category-topping-group.repo.js"
Cohesion: 0.36
Nodes (7): ORDER_STATUS, getUnprintedOrders(), getUnreportedOrders(), getUnreportedShifts(), isBusinessDayEnabled(), retryUnprintedOrders(), retryUnreportedTelegrams()

### Community 48 - "business-day.service.test.js"
Cohesion: 0.43
Nodes (6): createCupSize(), deleteCupSize(), getCupSize(), getCupSizes(), updateCupSize(), router

### Community 56 - "upload.controller.js"
Cohesion: 0.25
Nodes (4): ALLOWED_MIMETYPES, storage, upload, UPLOAD_TYPES

### Community 58 - "cup-size.repo.js"
Cohesion: 0.38
Nodes (6): createCupSize(), deleteCupSize(), getAllCupSizes(), getCupSizeById(), getCupSizesByIds(), updateCupSize()

### Community 59 - "menu-category-cup-size-map.routes.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 60 - "menu-item-category-map.controller.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 61 - "menu-item-cup-size-map.routes.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 62 - "menu-item.repo.js"
Cohesion: 0.47
Nodes (5): createMenuItem(), deleteMenuItem(), getAllMenuItems(), getMenuItemById(), updateMenuItem()

### Community 63 - "menu-category-cup-size-map.repo.js"
Cohesion: 0.40
Nodes (4): createMap(), getMappingsByCategoryIds(), getMaps(), remove()

### Community 64 - "settings.repo.js"
Cohesion: 0.50
Nodes (4): deleteSetting(), getAllSettings(), getSettingByKey(), upsertSetting()

### Community 65 - "menu-item-customization-group.repo.js"
Cohesion: 0.50
Nodes (3): createMap(), getMaps(), remove()

### Community 66 - "menu-item-topping-group.repo.js"
Cohesion: 0.50
Nodes (3): createMap(), getMaps(), remove()

## Knowledge Gaps
- **136 isolated node(s):** `singleQuote`, `trailingComma`, `printWidth`, `semi`, `name` (+131 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `order.repo.js` to `logger.js`, `outbox.dispatchers.js`, `shift.controller.js`, `settings.service.js`, `getDb`, `customization-option-group.repo.js`, `business-day.service.js`, `shift.repo.js`, `staff.repo.js`, `customization-option.routes.js`, `business-day.repo.js`, `menu-category.repo.js`, `topping-option.repo.js`, `day-close-idempotency.test.js`, `cup-size.repo.js`, `menu-item.repo.js`, `menu-category-cup-size-map.repo.js`, `settings.repo.js`, `menu-item-customization-group.repo.js`, `menu-item-topping-group.repo.js`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Why does `logger` connect `customization-option.repo.js` to `logger.js`, `outbox.dispatchers.js`, `shift.controller.js`, `settings.service.js`, `getDb`, `settings.validator.js`, `customization-option-group.repo.js`, `syncManager.js`, `canvasReceiptRenderer.js`, `menu-item.controller.js`, `shift.repo.js`, `httpServer.js`, `staff.repo.js`, `auth.middleware.js`, `customization-option.routes.js`, `customization-option-group.routes.js`, `topping-group.routes.js`, `topping-option.routes.js`, `menu-category-topping-group.routes.js`, `menu-item-customization-group.routes.js`, `menu-item-topping-group.routes.js`, `staff-shift.controller.js`, `shift-day-status.test.js`, `menu-category-topping-group.repo.js`, `business-day.service.test.js`, `upload.controller.js`, `display.controller.js`, `menu-category-cup-size-map.routes.js`, `menu-item-category-map.controller.js`, `menu-item-cup-size-map.routes.js`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `randomUUID()` connect `day-close-idempotency.test.js` to `logger.js`, `shift.controller.js`, `settings.service.js`, `customization-option-group.repo.js`, `syncManager.js`, `menu-item.controller.js`, `order.repo.js`, `staff.repo.js`, `business-day-step0-baseline.test.js`, `business-day-step2-backfill.test.js`, `customization-option.routes.js`, `business-day.repo.js`, `staff-shift.controller.js`, `topping-option.repo.js`, `shift-close-repro.test.js`, `cup-size.repo.js`, `menu-item-category-map.controller.js`, `menu-category-cup-size-map.repo.js`, `settings.repo.js`, `menu-item-customization-group.repo.js`, `menu-item-topping-group.repo.js`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `randomUUID()` (e.g. with `createMenuCategory()` and `createMap()`) actually correct?**
  _`randomUUID()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `trailingComma`, `printWidth` to the rest of the system?**
  _136 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `logger.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05456095481670929 - nodes in this community are weakly interconnected._
- **Should `settings.service.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07886904761904762 - nodes in this community are weakly interconnected._
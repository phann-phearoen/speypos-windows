# Graph Report - .  (2026-07-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 562 nodes · 1424 edges · 43 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d9535f41`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_lifecycle.js|lifecycle.js]]
- [[_COMMUNITY_logger.js|logger.js]]
- [[_COMMUNITY_outbox.dispatchers.js|outbox.dispatchers.js]]
- [[_COMMUNITY_shift.controller.js|shift.controller.js]]
- [[_COMMUNITY_customization-option-group.repo.js|customization-option-group.repo.js]]
- [[_COMMUNITY_settings.validator.js|settings.validator.js]]
- [[_COMMUNITY_getDb|getDb]]
- [[_COMMUNITY_syncManager.js|syncManager.js]]
- [[_COMMUNITY_canvasReceiptRenderer.js|canvasReceiptRenderer.js]]
- [[_COMMUNITY_outbox.worker.js|outbox.worker.js]]
- [[_COMMUNITY_telegram.service.js|telegram.service.js]]
- [[_COMMUNITY_shift.repo.js|shift.repo.js]]
- [[_COMMUNITY_menu-item.controller.js|menu-item.controller.js]]
- [[_COMMUNITY_httpServer.js|httpServer.js]]
- [[_COMMUNITY_database.js|database.js]]
- [[_COMMUNITY_menu-category-topping-group.routes.js|menu-category-topping-group.routes.js]]
- [[_COMMUNITY_customization-option.routes.js|customization-option.routes.js]]
- [[_COMMUNITY_customization-option-group.routes.js|customization-option-group.routes.js]]
- [[_COMMUNITY_menu-category.controller.js|menu-category.controller.js]]
- [[_COMMUNITY_staff.routes.js|staff.routes.js]]
- [[_COMMUNITY_topping-option.routes.js|topping-option.routes.js]]
- [[_COMMUNITY_store.repo.js|store.repo.js]]
- [[_COMMUNITY_auth.middleware.js|auth.middleware.js]]
- [[_COMMUNITY_menu-item-category-map.controller.js|menu-item-category-map.controller.js]]
- [[_COMMUNITY_menu-item-customization-group.routes.js|menu-item-customization-group.routes.js]]
- [[_COMMUNITY_menu-item-topping-group.routes.js|menu-item-topping-group.routes.js]]
- [[_COMMUNITY_staff-shift.controller.js|staff-shift.controller.js]]
- [[_COMMUNITY_customization-option.repo.js|customization-option.repo.js]]
- [[_COMMUNITY_menu-category.repo.js|menu-category.repo.js]]
- [[_COMMUNITY_menu-item.repo.js|menu-item.repo.js]]
- [[_COMMUNITY_topping-option.repo.js|topping-option.repo.js]]
- [[_COMMUNITY_settings.repo.js|settings.repo.js]]
- [[_COMMUNITY_menu-category-topping-group.repo.js|menu-category-topping-group.repo.js]]
- [[_COMMUNITY_menu-item-category-map.repo.js|menu-item-category-map.repo.js]]
- [[_COMMUNITY_menu-item-customization-group.repo.js|menu-item-customization-group.repo.js]]
- [[_COMMUNITY_orders.repo.js|orders.repo.js]]
- [[_COMMUNITY_shifts.repo.js|shifts.repo.js]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 132 edges
2. `logger` - 49 edges
3. `serializeOrder()` - 21 edges
4. `isAdmin()` - 17 edges
5. `initialize()` - 14 edges
6. `uploadOrdersBatch()` - 13 edges
7. `drawReceiptContent()` - 10 edges
8. `renderReceiptToEscPosBuffer()` - 10 edges
9. `processBatch()` - 10 edges
10. `getOutboxConfig()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `performInitialSetup()` --calls--> `getDb()`  [EXTRACTED]
  services/setup.service.js → storage/database.js
- `initialize()` --indirect_call--> `processSyncQueue()`  [INFERRED]
  system/lifecycle.js → sync/syncManager.js
- `getOrders()` --indirect_call--> `serializeOrder()`  [INFERRED]
  controllers/order.controller.js → serializers/order.serializer.js
- `updateShift()` --calls--> `queueShiftCloseSideEffects()`  [EXTRACTED]
  controllers/shift.controller.js → services/outbox.service.js
- `updateShift()` --calls--> `getNowInStoreTime()`  [EXTRACTED]
  controllers/shift.controller.js → services/time.service.js

## Import Cycles
- 4-file cycle: `controllers/setup.controller.js -> system/lifecycle.js -> server/httpServer.js -> routes/setup.routes.js -> controllers/setup.controller.js`
- 4-file cycle: `controllers/system.controller.js -> system/lifecycle.js -> server/httpServer.js -> routes/system.routes.js -> controllers/system.controller.js`

## Communities (43 total, 0 thin omitted)

### Community 0 - "lifecycle.js"
Cohesion: 0.06
Nodes (45): getPendingActionsStatus(), getSetupStatus(), main(), formatItem(), formatOrderForDisplay(), getSetupStatus(), healthCheck(), startServer() (+37 more)

### Community 1 - "logger.js"
Cohesion: 0.06
Nodes (28): __dirname, env, syncMiniBatchSize, dbDir, dbPath, __dirname, __filename, projectRoot (+20 more)

### Community 2 - "outbox.dispatchers.js"
Cohesion: 0.16
Nodes (25): ORDER_VOID_REASONS, createOrder(), createPayment(), getOrder(), getOrders(), printOrderReceipt(), voidOrder(), printReceipt() (+17 more)

### Community 3 - "shift.controller.js"
Cohesion: 0.14
Nodes (23): login(), closeDay(), createShift(), deleteShift(), getDayCloseReview(), getOpenShifts(), getShift(), getShifts() (+15 more)

### Community 4 - "customization-option-group.repo.js"
Cohesion: 0.13
Nodes (23): createGroup(), deleteGroup(), getGroup(), getGroups(), updateGroup(), router, serializeCategories(), serializeCategory() (+15 more)

### Community 5 - "settings.validator.js"
Cohesion: 0.15
Nodes (23): getAllSettings(), getSetting(), upsertSetting(), router, normalizeBaseUrl(), performHandshake(), assertAllowedKeys(), assertBoolean() (+15 more)

### Community 6 - "getDb"
Cohesion: 0.16
Nodes (22): getDb(), createMap(), getMaps(), remove(), createMap(), getMaps(), remove(), countFinalizedUnsyncedByShift() (+14 more)

### Community 7 - "syncManager.js"
Cohesion: 0.17
Nodes (20): manualSyncShift(), router, buildOrderEvent(), currencyMetadata, getConfig(), postJson(), toIso(), toMajor() (+12 more)

### Community 8 - "canvasReceiptRenderer.js"
Cohesion: 0.15
Nodes (23): buildEscPosBuffer(), buildVariantLine(), calculateReceiptHeight(), canvasTo1bitRaster(), COL_PRODUCT_W, __dirname, drawHorizontalLine(), drawReceiptContent() (+15 more)

### Community 9 - "outbox.worker.js"
Cohesion: 0.20
Nodes (21): computeBackoffMs(), processBatch(), runOutboxWorkerOnce(), startOutboxWorker(), tick(), getOutboxConfig(), assertEventShape(), claimDueBatch() (+13 more)

### Community 10 - "telegram.service.js"
Cohesion: 0.22
Nodes (16): SUPPORTED_INTENTS, generateDayCloseReport(), _getDayCloseContext(), getReviewDataForDayClose(), formatDayCloseMessage(), formatOrderIdentifier(), formatOrderMessage(), formatShiftCloseMessage() (+8 more)

### Community 11 - "shift.repo.js"
Cohesion: 0.17
Nodes (19): getPreviousDayStatus(), format(), getNowInStoreTime(), getStoreDateFromUtcDate(), createShift(), deleteShift(), findUnreportedForTelegram(), getActiveShiftForNow() (+11 more)

### Community 12 - "menu-item.controller.js"
Cohesion: 0.36
Nodes (9): createMenuItem(), deleteMenuItem(), getMenuItem(), getMenuItems(), updateMenuItem(), router, serializeManyMenuItems(), serializeMenuItem() (+1 more)

### Community 13 - "httpServer.js"
Cohesion: 0.21
Nodes (8): router, router, router, router, router, app, connections, corsOptions

### Community 14 - "database.js"
Cohesion: 0.24
Nodes (7): paths, initializeDatabase(), runMigrations(), getAllInventory(), updateStock(), createStaffShiftMap(), deleteStaffShiftMap()

### Community 15 - "menu-category-topping-group.routes.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 16 - "customization-option.routes.js"
Cohesion: 0.43
Nodes (6): createOption(), deleteOption(), getOption(), getOptions(), updateOption(), router

### Community 17 - "customization-option-group.routes.js"
Cohesion: 0.43
Nodes (6): createGroup(), deleteGroup(), getGroup(), getGroups(), updateGroup(), router

### Community 18 - "menu-category.controller.js"
Cohesion: 0.43
Nodes (6): createMenuCategory(), deleteMenuCategory(), getMenuCategories(), getMenuCategory(), updateMenuCategory(), router

### Community 19 - "staff.routes.js"
Cohesion: 0.43
Nodes (6): createStaffMember(), deleteStaffMember(), getStaffMember(), getStaffMembers(), updateStaffMember(), router

### Community 20 - "topping-option.routes.js"
Cohesion: 0.43
Nodes (6): createOption(), deleteOption(), getOption(), getOptions(), updateOption(), router

### Community 21 - "store.repo.js"
Cohesion: 0.50
Nodes (6): create(), getStore(), normalizeStoreRecord(), parsePaymentProfile(), serializePaymentProfile(), update()

### Community 22 - "auth.middleware.js"
Cohesion: 0.31
Nodes (6): createMap(), deleteMap(), getMaps(), isAdmin(), router, router

### Community 23 - "menu-item-category-map.controller.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 24 - "menu-item-customization-group.routes.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 25 - "menu-item-topping-group.routes.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 26 - "staff-shift.controller.js"
Cohesion: 0.53
Nodes (4): createMap(), deleteMap(), getMaps(), router

### Community 27 - "customization-option.repo.js"
Cohesion: 0.47
Nodes (5): create(), getAll(), getById(), remove(), update()

### Community 28 - "menu-category.repo.js"
Cohesion: 0.47
Nodes (5): createMenuCategory(), deleteMenuCategory(), getAllMenuCategories(), getMenuCategoryById(), updateMenuCategory()

### Community 29 - "menu-item.repo.js"
Cohesion: 0.47
Nodes (5): createMenuItem(), deleteMenuItem(), getAllMenuItems(), getMenuItemById(), updateMenuItem()

### Community 30 - "topping-option.repo.js"
Cohesion: 0.47
Nodes (5): create(), getAll(), getById(), remove(), update()

### Community 31 - "settings.repo.js"
Cohesion: 0.50
Nodes (4): deleteSetting(), getAllSettings(), getSettingByKey(), upsertSetting()

### Community 33 - "menu-category-topping-group.repo.js"
Cohesion: 0.50
Nodes (3): createMap(), getMaps(), remove()

### Community 34 - "menu-item-category-map.repo.js"
Cohesion: 0.50
Nodes (3): createMenuItemCategoryMap(), deleteMenuItemCategoryMap(), getMenuItemCategoryMaps()

### Community 35 - "menu-item-customization-group.repo.js"
Cohesion: 0.50
Nodes (3): createMap(), getMaps(), remove()

### Community 36 - "orders.repo.js"
Cohesion: 0.50
Nodes (3): createOrder(), findUnprintedOrders(), markOrderAsPrinted()

### Community 37 - "shifts.repo.js"
Cohesion: 0.50
Nodes (3): closeShift(), findOpenShift(), openShift()

## Knowledge Gaps
- **34 isolated node(s):** `__dirname`, `syncMiniBatchSize`, `__filename`, `__dirname`, `projectRoot` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `lifecycle.js`, `outbox.dispatchers.js`, `shift.controller.js`, `customization-option-group.repo.js`, `outbox.worker.js`, `shift.repo.js`, `menu-item.controller.js`, `database.js`, `store.repo.js`, `customization-option.repo.js`, `menu-category.repo.js`, `menu-item.repo.js`, `topping-option.repo.js`, `settings.repo.js`, `menu-category-topping-group.repo.js`, `menu-item-category-map.repo.js`, `menu-item-customization-group.repo.js`, `orders.repo.js`, `shifts.repo.js`?**
  _High betweenness centrality (0.277) - this node is a cross-community bridge._
- **Why does `logger` connect `logger.js` to `lifecycle.js`, `outbox.dispatchers.js`, `shift.controller.js`, `customization-option-group.repo.js`, `settings.validator.js`, `syncManager.js`, `canvasReceiptRenderer.js`, `outbox.worker.js`, `telegram.service.js`, `shift.repo.js`, `menu-item.controller.js`, `httpServer.js`, `database.js`, `menu-category-topping-group.routes.js`, `customization-option.routes.js`, `customization-option-group.routes.js`, `menu-category.controller.js`, `staff.routes.js`, `topping-option.routes.js`, `auth.middleware.js`, `menu-item-category-map.controller.js`, `menu-item-customization-group.routes.js`, `menu-item-topping-group.routes.js`, `staff-shift.controller.js`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **Why does `serializeOrder()` connect `outbox.dispatchers.js` to `lifecycle.js`, `logger.js`, `getDb`, `syncManager.js`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `initialize()` (e.g. with `runMaintenance()` and `processSyncQueue()`) actually correct?**
  _`initialize()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `__dirname`, `syncMiniBatchSize`, `__filename` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lifecycle.js` be split into smaller, more focused modules?**
  _Cohesion score 0.057692307692307696 - nodes in this community are weakly interconnected._
- **Should `logger.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05957767722473605 - nodes in this community are weakly interconnected._
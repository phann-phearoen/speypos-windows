# Graph Report - .  (2026-07-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 62 nodes · 119 edges · 8 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d9535f41`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_syncManager.js|syncManager.js]]
- [[_COMMUNITY_maintenance.service.js|maintenance.service.js]]
- [[_COMMUNITY_outbox.service.js|outbox.service.js]]
- [[_COMMUNITY_env.js|env.js]]
- [[_COMMUNITY_paths.js|paths.js]]
- [[_COMMUNITY_logger.js|logger.js]]
- [[_COMMUNITY_recovery.service.js|recovery.service.js]]
- [[_COMMUNITY_outbox.worker.js|outbox.worker.js]]

## God Nodes (most connected - your core abstractions)
1. `runMaintenance()` - 7 edges
2. `processSyncQueue()` - 7 edges
3. `logger` - 7 edges
4. `enqueueShiftJob()` - 6 edges
5. `tick()` - 5 edges
6. `getErrorDetails()` - 5 edges
7. `env` - 4 edges
8. `paths` - 4 edges
9. `processBatch()` - 4 edges
10. `startOutboxWorker()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `initialize()` --indirect_call--> `runMaintenance()`  [INFERRED]
  system/lifecycle.js → services/maintenance.service.js
- `initialize()` --indirect_call--> `processSyncQueue()`  [INFERRED]
  system/lifecycle.js → sync/syncManager.js
- `processBatch()` --calls--> `getErrorDetails()`  [EXTRACTED]
  services/outbox.worker.js → utils/error-details.js
- `tick()` --calls--> `getErrorDetails()`  [EXTRACTED]
  services/outbox.worker.js → utils/error-details.js
- `initialize()` --calls--> `startOutboxWorker()`  [EXTRACTED]
  system/lifecycle.js → services/outbox.worker.js

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "syncManager.js"
Cohesion: 0.33
Nodes (11): readQueue(), writeQueue(), enqueueFlushForShift(), enqueueOrdersForShift(), enqueueShiftJob(), handleFlushJob(), handleMiniBatchJob(), JOB_TYPES (+3 more)

### Community 1 - "maintenance.service.js"
Cohesion: 0.60
Nodes (5): optimizeDatabase(), performFinalSyncAttempt(), purgeOldData(), purgeOldLogs(), runMaintenance()

### Community 2 - "outbox.service.js"
Cohesion: 0.43
Nodes (6): buildOrderEvents(), buildShiftCloseEvents(), buildVoidEvents(), queueOrderSideEffects(), queueShiftCloseSideEffects(), queueVoidSideEffects()

### Community 3 - "env.js"
Cohesion: 0.33
Nodes (3): __dirname, env, syncMiniBatchSize

### Community 4 - "paths.js"
Cohesion: 0.33
Nodes (5): dbDir, dbPath, __dirname, __filename, projectRoot

### Community 5 - "logger.js"
Cohesion: 0.47
Nodes (4): paths, devFormat, logger, prodFormat

### Community 6 - "recovery.service.js"
Cohesion: 0.53
Nodes (5): getUnprintedOrders(), getUnreportedOrders(), getUnreportedShifts(), retryUnprintedOrders(), retryUnreportedTelegrams()

### Community 7 - "outbox.worker.js"
Cohesion: 0.31
Nodes (10): computeBackoffMs(), processBatch(), runOutboxWorkerOnce(), startOutboxWorker(), stopOutboxWorker(), tick(), initialize(), shutdown() (+2 more)

## Knowledge Gaps
- **10 isolated node(s):** `__dirname`, `syncMiniBatchSize`, `__filename`, `__dirname`, `projectRoot` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `logger.js` to `syncManager.js`, `maintenance.service.js`, `recovery.service.js`, `outbox.worker.js`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `runMaintenance()` connect `maintenance.service.js` to `outbox.worker.js`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `processSyncQueue()` connect `syncManager.js` to `outbox.worker.js`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `processSyncQueue()` (e.g. with `enqueueShiftJob()` and `initialize()`) actually correct?**
  _`processSyncQueue()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `__dirname`, `syncMiniBatchSize`, `__filename` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
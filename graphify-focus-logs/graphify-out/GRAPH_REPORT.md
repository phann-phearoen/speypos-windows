# Graph Report - graphify-focus-logs  (2026-07-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 26 nodes · 40 edges · 4 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d9535f41`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_maintenance.service.js|maintenance.service.js]]
- [[_COMMUNITY_env.js|env.js]]
- [[_COMMUNITY_paths.js|paths.js]]
- [[_COMMUNITY_logger.js|logger.js]]

## God Nodes (most connected - your core abstractions)
1. `runMaintenance()` - 7 edges
2. `env` - 3 edges
3. `paths` - 3 edges
4. `logger` - 3 edges
5. `performFinalSyncAttempt()` - 2 edges
6. `purgeOldData()` - 2 edges
7. `purgeOldLogs()` - 2 edges
8. `optimizeDatabase()` - 2 edges
9. `initialize()` - 2 edges
10. `__dirname` - 1 edges

## Surprising Connections (you probably didn't know these)
- `initialize()` --indirect_call--> `runMaintenance()`  [INFERRED]
  speypos-local/src/system/lifecycle.js → speypos-local/src/services/maintenance.service.js

## Import Cycles
- None detected.

## Communities (4 total, 0 thin omitted)

### Community 0 - "maintenance.service.js"
Cohesion: 0.36
Nodes (7): optimizeDatabase(), performFinalSyncAttempt(), purgeOldData(), purgeOldLogs(), runMaintenance(), initialize(), logger

### Community 1 - "env.js"
Cohesion: 0.33
Nodes (3): __dirname, env, syncMiniBatchSize

### Community 2 - "paths.js"
Cohesion: 0.33
Nodes (5): dbDir, dbPath, __dirname, __filename, projectRoot

### Community 3 - "logger.js"
Cohesion: 0.50
Nodes (3): paths, devFormat, prodFormat

## Knowledge Gaps
- **9 isolated node(s):** `__dirname`, `syncMiniBatchSize`, `__filename`, `__dirname`, `projectRoot` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `__dirname`, `syncMiniBatchSize`, `__filename` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
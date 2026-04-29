# Foundation Closeout And Doc Checkpoint

Date: 2026-04-24
Status: active checkpoint

## Short Verdict

Foundation is not done.

The system has real runtime, source, archive, extraction, router, and synthesis proof. The remaining gap is closing the operating loop:

source -> archive/artifact -> candidate/atom -> synthesized item -> routed decision/task/question/contradiction/action -> resolution

Strategy Hub should not be treated as the next product surface until the Foundation loop is closed enough to trust.

## Right Docs To Review

Use these in order:

1. `docs/rebuild/current-state.md`
   - the short done/open/next read
2. `docs/rebuild/current-plan.md`
   - the canonical rebuild order and Definition of Done
3. `docs/rebuild/owners-closeout.md`
   - the active blocker behind the strategy-input package / `SOURCE-014`
4. `docs/rebuild/intelligence-pipeline.md`
   - how sources, extraction, synthesis, action routing, and hubs connect
5. `docs/rebuild/doc-cleanup-plan.md`
   - how to stop handoffs/audits from becoming competing doctrine
6. `docs/source-registry.md`
   - source contracts and source status

Everything else is evidence unless promoted into one of those docs or the DB-backed backlog/decision layer.

## Current Live Snapshot

- `npm run foundation:verify` is green via scheduled worker runs.
- Foundation jobs: `19` total, `6` scheduled, `13` manual, `0` due.
- Scheduled and live:
  - `foundation-verify`
  - `shared-comms-coverage`
  - `gmail-sync-current`
  - `missive-sync-current`
  - read-only deal-review jobs
- Still manual/risky:
  - `meeting-notes-sync-current`
  - `drive-corpus-inventory-bite`
  - `video-link-inventory-bite`
  - `gmail-extract-latest`
  - `missive-extract-latest`
  - `meeting-transcripts-extract-backlog`
  - `shared-comms-intelligence-bite`
- Extraction targets: `9` total, `2` active, `2` scheduled, `1` blocked, `0` recent item failures.
- Drive corpus proof: `60` items inventoried, `31` folders queued, `0` failures.
- LLM runtime: `7` credentials, `10` routes, subscription route works, but recent OpenClaw timeout failures mean miner/synthesis proof is not fully stable.

## Doc Surface Snapshot

- `docs/` total: `157` files
- `docs/handoffs/`: `78` files
- `docs/audits/`: `10` files
- `docs/source-notes/`: `11` files
- `docs/rebuild/`: `9` files
- `docs/strategy/`: `9` files

This is not automatically bad. The issue is classification:

- active truth
- source note
- evidence
- superseded evidence
- needs promotion
- duplicate/cleanup candidate

## Backlog Enrichment From This Checkpoint

Added missing backlog seed cards:

- `ACTION-ROUTER-001`
  - route synthesized intelligence into governed decisions, tasks, questions, contradictions, ignore/snooze, or owner-bound actions
- `VIDEO-001`
  - wrap video-link inventory in extraction target/cursor/lease/run accounting before repeated runs
- `LOOM-001`
  - validate a small authorized Loom extraction path before bulk ingestion

Existing cards that remain central:

- `SOURCE-014`
  - strategy-input package remains blocked by the strategy-used Owners slice
- `EXTRACTION-TEAM-001`
  - supervised extraction/miner runtime
- `SYNTHESIS-ENGINE-001`
  - continuous synthesis layer
- `SYNTHESIS-FACTS-001`
  - source-backed KPI/finance/strategy/fact grounding
- `HUB-INTEL-001`
  - hub value routing for mined corpus assets
- `DRIVE-CORPUS-001`
  - Drive crawler/organizer
- `SKOOL-001`
  - Skool supervised corpus source
- `SOURCE-016`
  - marketing source map by brand lane

## One-By-One Review Order

Review surfaces in this order:

1. Strategy packet / `SOURCE-014`
   - confirm the visible package state matches the Owners dependency
2. Owners package
   - close FUB parity, attribution lineage, data-quality enforcement, finance boundary
3. Runtime and job registry
   - every built routine is scheduled, explicitly manual, or marked risk
4. Extraction control
   - current-day sync, backfill lane, corpus lane, item retry, cursor state
5. Intelligence pipeline
   - archive -> extraction -> synthesis -> action routing
6. Source registry
   - readable vs signed-off vs blocked sources
7. Doc cleanup
   - classify handoffs/audits and promote durable truth
8. Marketing / connector map
   - SocialPilot, Google marketing, Meta, GHL, DataForSEO, YouTube, GA4/GSC, brand lanes
9. Drive / Skool / Loom / video corpus
   - inventory first, extractor proof second, no blind scraping
10. Strategy Hub
   - only after the Foundation loop can route source-backed intelligence into operating ledgers

## Next Build Recommendation

Do not move to Strategy Hub UI yet.

Build Foundation closeout:

1. Action Router v1 schema and rules
2. paced miner v1 for extraction supply
3. video-link inventory target wrapping
4. doc/source review pass using `current-state.md` as the front door


# SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001

Status: Closed under `synthesis-router-freshness-trigger-v1`

Last updated: 2026-05-26

## Purpose

Make the Foundation intelligence spine honest and automatic after source work runs.

When a source archive or extractor runs after the last synthesis refresh, the system must not quietly look current. It should either trigger a bounded synthesis refresh or show a clear stale/blocked state until the brain layer catches up.

## Current Finding

On 2026-05-25, Gmail and Missive archive syncs succeeded around 4:00 PM ET, but candidate extraction jobs failed and the synthesis spine still showed a 2:43 PM ET run. The Dev Data Pool looked like email had run recently while synthesis had not.

Actual state:

- `gmail-sync-current` and `missive-sync-current` archived fresh source data.
- `gmail-extract-latest` and `missive-extract-latest` failed because direct OpenAI Responses API fallback is blocked by spend policy.
- `intelligence-synthesis-spine-refresh` is scheduled daily, not triggered after every extractor/sync completion.
- The Dev page now exposes this as `Needs repair` / `Needs refresh` instead of silently showing healthy timestamps.

## Required Behavior

1. Every source archive/extractor run records a source-family freshness watermark.
2. Synthesis compares its latest successful run against upstream source-family watermarks.
3. If an upstream run is newer than synthesis, UI/API shows stale/needs-refresh.
4. If candidate extraction failed, synthesis shows blocked-by-extractor instead of pretending fresh source content was synthesized.
5. The worker should run synthesis through a bounded debounce after successful extractor batches, then run Action Router proposals after synthesis succeeds.
6. No destination ledger writes happen without human approval.

## Not Next

- Do not enable broad paid-model extraction by bypassing spend policy.
- Do not mark Gmail/Missive/Slack/meetings as God Mode until their source-family maturity gates pass.
- Do not use Git markdown reports as runtime state.
- Do not auto-promote synthesized items into backlog, decisions, or tasks.

## Proof

Focused proof should create or simulate:

- newer upstream source run + older synthesis run => stale state visible
- failed extractor + newer archive sync => blocked-by-extractor visible
- successful extractor + synthesis refresh => stale clears
- synthesis success => Action Router proposal job can follow
- no backlog, decision, external, or Git report writes from the freshness trigger itself

## V1 Runtime Slice

- Source-family watermarks are derived from the durable `foundation_job_runs` ledger, not from markdown reports.
- Completed archive/extractor/synthesis/action-router jobs get `metadata.synthesisFreshness` patched onto their Foundation job run.
- The default behavior is no-spend mark-only mode. `SYNTHESIS_FRESHNESS_TRIGGER_AUTORUN=true` is required before the runner can automatically invoke the synthesis/action-router follow-up jobs.
- `scripts/process-synthesis-router-freshness-trigger-check.mjs` owns the deterministic dogfood proof for stale, blocked, refreshed, and action-router-due states, and also reads the live Foundation job ledger to prove runtime metadata is actually being patched.

Closeout proof lives in `docs/_archive/handoffs/2026-05-26-synthesis-router-freshness-trigger-v1-closeout.md`. The live proof on 2026-05-26 reports `waiting_for_extractor`, not fake freshness, because source-family activity exists ahead of extractor/synthesis readiness.

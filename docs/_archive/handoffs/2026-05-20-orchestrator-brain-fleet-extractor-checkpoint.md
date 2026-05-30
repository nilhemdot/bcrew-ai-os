# Orchestrator Checkpoint — Brain Fleet, Extractor, and Foundation Green

Date: 2026-05-20

## Purpose

Preserve the May 20 main-session orchestration decisions so the next builder/orchestrator chat does not rely on stale chat memory.

## Current Truth

- Raw System Health is healthy.
- Deep-audit findings closure gate is healthy.
- `main` is clean/synced with `origin/main` at the checkpoint.
- Control-plane truth is not yet 100% clean:
  - `process:current-sprint-active-card-gate-check` is red because live active blocker is `STRATEGY-003` while the gate still expects older approved sprint/order metadata and richer active-card repo fields.
  - `process:foundation-plan-reconcile-check` is blocked because plan/current-state truth is stale against the May 20 live Current Sprint.

## Operating Decision

Order for Builder One:

1. Clean Foundation/control-plane truth to literal green.
2. Build the minimal Brain Fleet layer.
3. Build extractor v1 on top of Brain Fleet.
4. Run bounded extraction proofs.
5. Scale overnight extraction only after proof and stop controls.
6. Return to Strategy Hub/`STRATEGY-003` after Foundation/extraction proof unless a hard dependency appears.

## Brain Fleet Doctrine

BCrew AIOS should not depend on OpenClaw as the system architecture.

Correct stack:

```text
Foundation OS -> Brain Fleet / LLM Router -> Provider Adapters -> Agents / Workers
```

Definitions:

- Foundation OS owns source truth, memory, permissions, backlog, jobs, audits, evidence, ledgers, and provenance.
- Brain Fleet owns provider/model/speed/routing/capacity decisions.
- Agents are service roles for people/workflows: Steve assistant, Nick Sales Director, Harlan operator, research worker, extractor worker, etc.

Provider posture:

- Codex/OpenAI is the likely primary coding/system brain.
- Gemini is the likely video/long-context extraction brain.
- Claude remains useful for review/deep synthesis, but should not be the backbone.
- OpenClaw remains an adapter only; current OpenClaw route is limited to `openai-codex/gpt-5.4` and should not constrain AIOS.

Policy boundary:

- Do not build a hidden subscription/account rotation farm.
- Do build owner-bound, workload-bound, probed, logged, quota-guarded capacity lanes.
- API/cloud routes remain fallback for production-critical or unsupported automation.

## Backlog Work Captured

Created or updated live backlog rows:

- `FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001`
- `BRAIN-FLEET-FOUNDATION-001`
- `BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001`
- `CODEX-DIRECT-SUBSCRIPTION-ROUTE-001`
- `GEMINI-VIDEO-BRAIN-ROUTE-001`
- `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001`
- `OPENCLAW-ADAPTER-BOUNDARY-001`
- `BRAIN-FLEET-QUOTA-LEDGER-001`
- `AGENT-BRAIN-FOUNDATION-SEPARATION-001`
- `EXTRACTOR-BRAIN-FLEET-PROOF-001`
- `YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001`
- `SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001`
- `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`
- `EXTRACTOR-OVERNIGHT-RUN-GUARD-001`

Enriched existing rows:

- `BUILD-INTEL-EXTRACTION-IMPLEMENTATION`
- `SKOOL-WORKER-001`
- `MYICRO-TRAINING-001`

## Extraction Guardrails

Proof mode first:

- One approved public YouTube item.
- One exact approved Skool lesson.
- One exact approved MyICOR/myICRO lesson.

Each proof must produce:

- approved source item record
- transcript captured or generated
- source artifact stored
- provenance/source links
- atoms
- summary/training notes
- Build Intel review queue route
- duplicate/staleness guard
- skipped/error reasons

Blocked during proof:

- broad crawl
- uncontrolled downloads
- external writes
- credential mutation
- paid/private source extraction without source-specific approval

Overnight scale only after proof:

- YouTube last-20 per approved creator is acceptable after one proof passes.
- Skool should start with one approved course before three courses.
- MyICOR should start with one approved module/course before broad sweep.
- Stop on auth failure, rate limits, transcript failure spike, route failure, duplicate explosion, or source-boundary violation.

## Next Review Need

After this checkpoint, review open backlog truth and rank the next 10-20 cards. The current expected top order is control-plane cleanup, Brain Fleet minimum viable routes, extractor proof, then extraction scale and Strategy Hub.

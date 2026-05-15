# NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001 Plan

## What

Triage the first scheduled nightly deep audit baseline from `docs/handoffs/nightly-deep-audit-2026-05-14.md` and its JSON companion.

The card classifies the 50 P0 findings and nearby P1 follow-ups into:

- already addressed by shipped work,
- covered by an existing scoped card,
- needs a new backlog card,
- duplicate/noise or historical-only.

It writes one concise handoff report and updates live backlog only for actionable gaps.

## Why

The nightly auditor is useful only if its findings become governed work instead of another noisy report. Steve asked for the rebuild to stay tight and for Foundation priorities to come from evidence. This triage converts the baseline audit into a sprint-ready queue without letting the audit auto-mutate backlog or drive random patching.

## Acceptance Criteria

- The triage report exists at `docs/handoffs/2026-05-15-nightly-deep-audit-p0-triage.md`.
- Every P0 group in the 2026-05-14 audit is classified as addressed, covered, new-card, or duplicate/noise.
- Any new actionable P0/P1 gaps are added to or enriched in live backlog with clear owner, priority, next action, and proof language.
- Existing done cards are not reopened just because an older baseline report mentions the same risk.
- The report explicitly confirms whether Server Monolith Closeout remains the right next sprint.
- The card remains report-only: no product features, no hub work, no source extraction, no provider spend, and no auto-fixes.

## Definition Of Done

- `NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001` is live in backlog and closed under `nightly-deep-audit-p0-triage-v1`.
- This plan and approval file exist and validate.
- A durable Plan Critic pass row exists at 9.8+.
- The handoff report cites the audit source and the backlog decisions.
- `backlog:hygiene` is healthy after any backlog adds/enrichment.
- The Current Sprint board shows the card in Done This Sprint before server route split work proceeds.

## Details

Existing code to reuse:

- `docs/handoffs/nightly-deep-audit-2026-05-14.md`
- `docs/handoffs/nightly-deep-audit-2026-05-14.json`
- live `backlog_items`
- `getBacklogItemsByIds`, `createBacklogItem`, `updateBacklogItem`
- `backlog:hygiene`

Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `AGENTS.md`, and the existing current plan/current state notes around nightly audit, monolith cleanup, route budgets, and server split work.

Existing scripts to reuse: `npm run backlog:hygiene -- --json`, `npm run foundation:verify -- --json-summary` if the final closeout touches verifier-backed process truth, and a thin DB readback command for live backlog/current sprint proof.

Live backlog and Current Sprint truth to reuse: the triage reads the existing done/scoped state for `CURRENT-SPRINT-DYNAMIC-TRUTH-001`, `PROCESS-CHECK-APPLY-BOUNDARY-001`, `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`, `FOUNDATION-FULL-DIAGNOSTICS-PERF-001`, `SOURCE-OF-TRUTH-PERF-BUDGET-001`, `VERIFIER-MONOLITH-SPLIT-CONTINUE-002`, and `FOUNDATION-DB-MONOLITH-SPLIT-002` before adding anything new.

The triage is intentionally not a full code audit. The nightly audit already produced the findings. This card decides how those findings map into the governed backlog.

The report should note important post-audit state changes, including that `/api/foundation-hub`, `/api/source-of-truth`, Plan Critic architectural dogfood, full diagnostics performance, and initial frontend/verifier/db split slices already shipped after the baseline.

Behavior proof is not substring-only proof. Reject substring-only proof explicitly. The proof calls the actual function path through live backlog reads and writes, performs a DB round-trip by reading the created/enriched cards back, and runs the real `backlog:hygiene` process path. A source-substring or report marker check is not enough and should be rejected as weak evidence. The dogfood case recreates the weak behavior where a report exists but no live backlog items or classifications exist.

Gate decision tree: this is a focused process/data card. Static checks alone are not enough because the work mutates live backlog rows. Full `process:foundation-ship` is not required for the triage closeout unless verifier/server/package files are changed. The focused gate is `npm run backlog:hygiene -- --json` plus DB readback of the triage card and the added/enriched cards. If this card later changes `server.js`, `scripts/foundation-verify.mjs`, `package.json`, or Foundation runtime modules, the gate escalates to full `process:foundation-ship`.

Operator value: Steve gets a useful morning workflow where a nightly audit becomes a ranked, governed queue instead of a scary wall of findings. This unlocks faster and higher-quality sprint selection because Codex can say which findings are already fixed, which are real next work, and which are parked.

Speed target: keep the focused proof thin and fast, under 2 minutes. This triage must not become another heavy audit run.

## Risks

- Risk: the audit creates too many duplicate cards.
  - Response: query live backlog first and enrich existing work when it already covers the finding.
- Risk: the report treats the baseline as current truth even though overnight work fixed some items.
  - Response: classify addressed/covered items explicitly.
- Risk: triage becomes a substitute for implementation.
  - Response: close with the next sprint order and move directly into the first server split card.
- Risk: proof becomes a list of claims.
  - Response: `backlog:hygiene` must pass after live backlog changes, and the report must name exact card IDs.
- Risk: the triage classifies a real blocker incorrectly.
  - Repair path: reopen or revise the triage card, add the missed finding as a backlog card, and do not proceed to server route splitting until the missed P0 is classified.
- Risk: live backlog writes fail or hygiene finds weak cards.
  - Repair path: leave the card in Building Now, revise the weak backlog fields, and rerun the focused proof until it fails closed or passes honestly.

## Tests

```bash
npm run backlog:hygiene -- --json
node --input-type=module -e "import {initFoundationDb,getBacklogItemsByIds,closeFoundationDb} from './lib/foundation-db.js'; await initFoundationDb(); const rows=await getBacklogItemsByIds(['NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001']); console.log(JSON.stringify(rows,null,2)); await closeFoundationDb();"
```

Dogfood proof: the card recreates the failure class where a large audit report sits in `docs/handoffs/` without backlog action. The report must account for every P0 group and `backlog:hygiene` must remain healthy after creating/enriching cards.

## Not Next

- Do not implement audit findings in this card.
- Do not start hub/Marketing/Sales/Ops feature work.
- Do not run Build Intel extraction or paid-source auth.
- Do not auto-close or auto-create cards from future audits without Steve/Codex review.
- Do not treat the 2026-05-14 baseline as current code truth after later shipped fixes.

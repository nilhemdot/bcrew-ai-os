# DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001 Plan

## What

Close the May 19 deep-merge audit routing gap.

Closeout key: `deep-audit-findings-closure-gate-v1`.

## Why

The deep audit ran for real and found 13 P1/P2 findings. That work cannot sit in an audit report where Steve has to remember it. Every finding needs live backlog truth: done with proof, scoped with owner and next action, or explicitly covered by a follow-up.

This is a tight V1 audit-control card. It does not fix every finding. It makes the audit actionable and advances the overnight sprint to the first remaining P1 fix.

Not next:

- Do not implement the audit findings inside this card.
- Do not start `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001` inside this card.
- Do not call scoped findings fixed; scoped means live owner, threshold, and next action.
- Do not mutate external systems, private providers, credentials, Drive permissions, or source data.
- Do not start Value Builder or lower-priority feature work before the P1 renderer split.

## Definition Of Done

- The gate reads `docs/audits/2026-05-19-foundation-deep-merge-audit.json`.
- All 13 findings have route records keyed by finding id and occurrence path.
- All six P1 findings and seven P2 findings route to live backlog cards.
- Done routes require done backlog lane and a closeout record.
- Scoped routes require a live backlog card with owner and next action.
- Follow-up routes can name already-shipped coverage plus the remaining scoped card.
- Dogfood proves missing routes fail closed and duplicate finding ids route by occurrence path.
- On closeout, Current Sprint advances to `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`.

## Acceptance Criteria

- Focused proof passes with `npm run process:deep-audit-findings-closure-gate-check -- --close-card --json`.
- Route summary reports:
  - `auditFindingCount=13`
  - `p1RoutedCount=6`
  - `p2RoutedCount=7`
  - `missingRouteCount=0`
- `DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001` closes under `deep-audit-findings-closure-gate-v1`.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, fanout, and ship gate pass.

## Details

Root invariant: a deep audit finding is not handled until it becomes live task truth or shipped proof. The check should prove that invariant through the actual audit JSON, live backlog cards, closeout records, Current Sprint state, and the focused function path. Reject substring-only proof: a report mention, string match, or markdown checklist cannot satisfy the gate unless the live backlog/closeout/Current Sprint behavior also proves the route.

The route contract lives in `lib/deep-audit-findings-closure-gate.js`.

The current route decisions are:

- `active-vs-historical-verifier-mixing` -> done via `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`.
- `foundation-client-current-state-monolith` -> scoped via `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`.
- `foundation-hub-route-monolith` -> done via `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`.
- `hardcoded-foundation-ui-current-summary` -> done via `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001`.
- both `hardcoded-source-count-baseline` findings -> done via `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`.
- `admin-deal-policy-date-duplication` -> scoped via `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`.
- `approval-threshold-raw-literal` -> scoped via `APPROVAL-THRESHOLD-REGISTRY-001`.
- `build-closeout-code-owned-data` -> scoped via `BUILD-CLOSEOUT-DATA-SOURCE-001`, with prior registry extract coverage noted.
- `build-log-request-time-git-and-duplication` -> scoped via `BUILD-LOG-API-CACHE-AND-SLIM-001`.
- `fixed-build-intel-commit-baseline` -> scoped via `BUILD-INTEL-SNAPSHOT-BASELINE-001`.
- `focused-check-active-sprint-id-assumption` -> scoped via `FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001`, with prior historical-mode coverage noted.
- `foundation-dom-rebuild-risk` -> scoped via `FOUNDATION-CSS-SURFACE-DECOUPLE-001`, with DOM budget coverage noted.

## Reuse Existing Work

Existing code:

- `scripts/process-audit-finding-to-backlog-router-check.mjs`
- `lib/current-sprint-active-card-gate.js`
- `lib/foundation-current-sprint-store.js`
- `lib/process-write-guard.js`
- `lib/process-plan-critic.js`

Existing docs:

- `docs/audits/2026-05-19-foundation-deep-merge-audit.md`
- `docs/audits/2026-05-19-foundation-deep-merge-audit.json`
- `docs/process/audit-finding-to-backlog-router-001-plan.md`
- `docs/process/current-sprint-active-card-gate-001-plan.md`

Existing cards:

- `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
- `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`
- `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001`
- `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`
- `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`
- `BUILD-LOG-API-CACHE-AND-SLIM-001`
- `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`
- `APPROVAL-THRESHOLD-REGISTRY-001`
- `BUILD-INTEL-SNAPSHOT-BASELINE-001`
- `BUILD-CLOSEOUT-DATA-SOURCE-001`
- `FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001`
- `FOUNDATION-CSS-SURFACE-DECOUPLE-001`

## Operator Value

Steve can go to bed without audit findings being lost in a report. The useful operator behavior is a real workflow: System Health can stay green because the audit debt is no longer hidden, Current Sprint shows the next P1 repair, and the live backlog separates already-shipped coverage from open scoped work. This unlocks faster overnight execution with quality because a builder can continue from the next card instead of rediscovering the audit report.

## Speed Bound

The focused gate must stay fast enough to run by default, under 2 minutes on the local repo. It reads one local audit JSON/markdown pair, live backlog rows for the routed cards, closeout registry metadata, and Current Sprint state. It does not run an LLM review, endpoint crawl, provider call, browser session, or external fetch.

## Risks

- Risk: the card becomes another report.
  - Mitigation: the proof fails unless every finding resolves to live backlog truth.
- Risk: the card pretends scoped work is fixed.
  - Mitigation: route status separates done from scoped and keeps the P1 renderer split as the next active blocker.
- Risk: duplicate finding ids route ambiguously.
  - Mitigation: route matching uses finding id plus the first reference path.
- Risk: this card starts fixing findings.
  - Mitigation: no product/refactor changes; only routing, proof, sprint closeout, and Current Sprint advancement.

## Tests

- Static gate: `node --check lib/deep-audit-findings-closure-gate.js scripts/process-deep-audit-findings-closure-gate-check.mjs`.
- Focused gate: `npm run process:deep-audit-findings-closure-gate-check -- --close-card --json`.
- Full gate: System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, `process:ship-check`, `process:fanout-check`, and `process:foundation-ship`.
- Dogfood rejects missing routes and proves duplicate route matching uses occurrence path.

## Gate Decision Tree

Blast radius is full because this card mutates live backlog and Current Sprint state.

Use static syntax first, then focused behavior proof, then full Foundation gates:

- static: module/script syntax
- focused: audit route proof and live sprint advancement
- full: `foundation:verify` and `process:foundation-ship`

## Gate Decision

Full Foundation gate. This card closes a P0 audit-control card and changes Current Sprint truth.

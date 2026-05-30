# AUDIT-FINDING-TO-BACKLOG-ROUTER-001 Plan

## What

Build a narrow V1 router that reads report-only audit findings and proves every actionable red/yellow recommendation is tied to live work truth.

The allowed outcomes are:

- existing live backlog card
- new scoped backlog card created by this explicit router apply path
- stale/obsolete with proof
- approval-required blocker
- watch-only threshold item

The focused proof uses the May 18 archived nightly deep audit and a current May 19 deterministic audit snapshot. It also includes dogfood where a synthetic missing card-shaped recommendation fails until it is routed into a scoped card.

## Why

Foundation audits are only useful if findings create governed motion. A report that says "fix CARD-001" while no live backlog card exists becomes another hidden queue Steve has to rediscover.

This card upgrades the auditor workflow without weakening the existing report-only boundary. Scheduled audit jobs still do not create backlog cards, auto-fix code, start autonomous development, or mutate sprint state. Only this explicit process check can scope missing cards, and only with `--apply`.

Operator value: Steve gets an audit surface he can trust as an execution queue. Red/yellow audit findings either point to a real card with an owner and next action or they fail the gate, so he does not have to manually translate report noise into builder work.

## Acceptance Criteria

- `AUDIT-FINDING-TO-BACKLOG-ROUTER-001` exists in live backlog and closes under `audit-finding-to-backlog-router-v1`.
- The router reads May 18 archived audit findings and the current May 19 deterministic audit snapshot.
- Every actionable audit finding routes to an existing live card, new scoped card, stale proof, approval requirement, or watch threshold.
- If a red/yellow finding names a card-shaped ID that is not live backlog truth, the focused proof fails until it is scoped or explicitly classified.
- The May 18/19 missing recommendations are scoped as live backlog cards with owner, priority, summary, why-it-matters, and next action.
- Scheduled audit generators remain report-only and do not auto-create backlog items.
- Current Sprint advances to `FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001` after this closes.

## Definition Of Done

- `lib/audit-finding-to-backlog-router.js` owns the routing rules and dogfood proof.
- `scripts/process-audit-finding-to-backlog-router-check.mjs` is registered in `package.json`.
- The explicit apply proof creates/scopes missing audit cards and closes this card.
- The closeout handoff exists at `docs/_archive/handoffs/2026-05-19-audit-finding-to-backlog-router-closeout.md`.
- Verifier coverage and build closeout registry know this closeout.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass before push.

## Details

Existing code, docs, scripts, and live truth reused:

- `lib/code-quality-nightly-audit.js` and `lib/nightly-deep-audit-upgrade.js`
- `docs/handoffs/nightly-deep-audit-2026-05-18.json` and archived companion JSON
- `docs/handoffs/2026-05-15-nightly-deep-audit-p0-triage.md`
- `lib/foundation-db.js` live backlog, Plan Critic, Current Sprint, and snapshot helpers
- `process:code-quality-nightly-audit-check`, `process:nightly-deep-audit-upgrade-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`

The router does not replace the auditor. It consumes existing finding fields such as `cardId`, `proposedCard`, severity, status, title, owner, and evidence. The May 18 archived audit currently names missing card-shaped follow-ups around admin policy source contracts, approval threshold registry, Build Intel search/snapshot posture, Build Log payload, and Current State client extraction. Those should become scoped backlog truth, not disappear into the report.

Behavior proof must call the actual router and live DB readback path. Substring checks alone are not accepted. The dogfood must fail a synthetic missing-card recommendation, then pass when the same recommendation is routed as a new scoped card. The real proof must read live backlog after apply and prove no missing route IDs or unresolved named card IDs remain.

Gate decision tree: full gate. This card touches package scripts, process docs, live backlog, Current Sprint, closeout registry, and verifier coverage. Static `node --check` is required, focused proof is `npm run process:audit-finding-to-backlog-router-check -- --apply --close-card --json`, and full ship proof is `process:foundation-ship`.

## Risks

- Risk: the router becomes quiet auto-backlog mutation from scheduled audits.
  - Response: scheduled audit modules keep `reportOnly`, `writesBacklog: false`, and `autoCreatesBacklog: false`; only the explicit process check writes under `--apply`.
- Risk: the card implements audit findings instead of routing them.
  - Response: new cards are scoped only, with next action and proof language; implementation happens in later sprint cards.
- Risk: old audits reopen already shipped cards.
  - Response: done cards count as existing live card routes. A stale finding needs proof, not a forced reopen.
- Risk: duplicate or thin cards get created.
  - Response: query live backlog first, use known May 18/19 definitions, and run `backlog:hygiene`.
- Risk: source/extraction activation starts before cleanup finishes.
  - Response: Current Sprint advances only to endpoint metric freshness after this card closes.

## Tests

```bash
node --check lib/audit-finding-to-backlog-router.js scripts/process-audit-finding-to-backlog-router-check.mjs lib/foundation-verifier-health-live-summary.js
npm run process:audit-finding-to-backlog-router-check -- --apply --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=AUDIT-FINDING-TO-BACKLOG-ROUTER-001 --planApprovalRef=docs/process/approvals/AUDIT-FINDING-TO-BACKLOG-ROUTER-001.json --closeoutKey=audit-finding-to-backlog-router-v1 --commitRef=HEAD
```

Not next:

- Do not auto-create cards from scheduled audits.
- Do not implement endpoint, doc, file-size, source, or extraction work in this card.
- Do not run live Gmail, meeting-notes, meeting-transcript, auth-required, paid, provider, external-write, Drive mutation, or Agent Feedback send lanes.
- Do not launch parallel builders.

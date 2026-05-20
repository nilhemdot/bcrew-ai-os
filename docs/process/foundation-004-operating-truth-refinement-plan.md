# FOUNDATION-004 Operating Truth Refinement Plan

## What

Close `FOUNDATION-004` by promoting durable business rules from Freedom, Owners, finance, ClickUp, and FUB validation notes into one operating-truth layer and one Freedom rebuild blueprint.

This card changes repo truth only. It does not mutate source spreadsheets, ClickUp, FUB, finance systems, Drive permissions, credentials, provider config, or external systems.

## Why

The sheet validations found real business rules that should not remain scattered across source notes, closeout handoffs, and chat memory:

- Freedom is current process map and spreadsheet-era planning logic, not final system-owned truth.
- Owners is the deal / finance ledger.
- Owners Lists mirror is not a write surface.
- FUB is CRM evidence, not final deal ledger truth.
- ClickUp is workflow/accountability, not finance truth.
- Ops self-validation fields are claims, not verified truth.
- `<unspecified>` is attribution quarantine, not final truth.

The system needs those rules in a durable interpretation layer before `DATA-001`, `OPS-003`, `ENGINE-001`, and later source-backed dashboard rebuilds.

## Acceptance Criteria

- `docs/strategy/operating-truths.md` cites the signed-off source IDs behind the rules.
- Operating truths separate strategy meaning, source-note evidence, and backlog-owned gaps.
- Operating truths explicitly demote Freedom from final rebuilt truth.
- Operating truths protect the `SRC-OWNERS-LISTS-001` source boundary and Owners Dashboard Lists mirror.
- Operating truths separate Owners, FUB, ClickUp, and finance roles.
- Operating truths define ops self-validation fields as claims, not verified truth.
- Operating truths define `<unspecified>` as quarantine, not final attribution truth.
- `docs/rebuild/freedom-rebuild-blueprint.md` exists and names the seven target layers:
  - team member source
  - production roster source
  - community source
  - deal-ledger economics source
  - BHAG assumptions source
  - engine calculation layer
  - dashboard read layer
- Freedom, Owners, and ClickUp source notes point durable interpretation back to operating truths and the rebuild blueprint without deleting source evidence.
- Current Sprint advances to `DATA-001` after closeout.

## Definition Of Done

- `process:foundation-004-check` passes with `--apply --close-card --json`.
- System Health remains raw green.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `foundation-004-operating-truth-refinement-v1`.
- Main is clean and pushed.

## Details

Existing code reused:

- `lib/source-contracts.js`
- `lib/source-contract-registry-table.js`
- `lib/source-of-truth-payload.js`
- `lib/foundation-db.js`
- `lib/process-plan-critic.js`

Existing docs reused:

- `docs/strategy/operating-truths.md`
- `docs/source-notes/freedom-sheet.md`
- `docs/source-notes/owners-dashboard.md`
- `docs/source-notes/clickup.md`
- `docs/source-notes/follow-up-boss.md`
- `docs/source-notes/bhag-builder-lists.md`
- `docs/source-registry.md`

Existing scripts reused:

- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/foundation-verify.mjs`
- `scripts/process-foundation-ship.mjs`

The focused proof reads local repo files and local PostgreSQL `source_contract_registry` metadata only. It does not print live sheet values, source rows, private content, emails, Drive file details, ClickUp task payloads, FUB records, or finance records.

## Behavioral Proof

Dogfood proof rejects the exact false-greens this card must block:

- missing required source IDs,
- treating Freedom as final rebuilt source truth,
- treating Owners Dashboard Lists mirror as a write surface,
- treating ClickUp as final finance or payout truth,
- treating ops self-validation fields as verified truth,
- treating `<unspecified>` as final attribution truth,
- missing Freedom rebuild target layers.

Live proof runs actual function/process paths: `buildFoundation004Status()`, `buildFoundation004DogfoodProof()`, `validatePlanApprovalFile()`, `evaluatePlanCriticPlan()`, `getActiveFoundationCurrentSprint()`, `getBacklogItemsByIds()`, `getPlanCriticRunsByCardIds()`, and local PostgreSQL `source_contract_registry` reads. It checks the real operating-truth doc, rebuild blueprint, source-note cross references, signed/current source registry rows, Plan Critic pass, approval integrity, closeout registry, package script, Current Sprint ownership, and done-card coverage.

The proof rejects substring-only verifier theatre. Text markers can support the document boundary checks, but the card is not accepted by substring-only proof: the process must pass the dogfood false-green rejections, DB source-registry checks, approval-integrity check, Plan Critic function path, Current Sprint API path, closeout registry lookup, and package-script registration together.

## Tests

- `node --check lib/foundation-004-operating-truth-refinement.js scripts/process-foundation-004-check.mjs`
- `npm run process:foundation-004-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=FOUNDATION-004 --planApprovalRef=docs/process/approvals/FOUNDATION-004.json --closeoutKey=foundation-004-operating-truth-refinement-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=FOUNDATION-004 --closeoutKey=foundation-004-operating-truth-refinement-v1`
- `npm run process:foundation-ship -- --card=FOUNDATION-004 --planApprovalRef=docs/process/approvals/FOUNDATION-004.json --closeoutKey=foundation-004-operating-truth-refinement-v1 --commitRef=HEAD`

Gate decision tree: static docs are not enough because this changes source-role semantics, Current Sprint progression, closeout coverage, and downstream rebuild rules. Focused proof is `process:foundation-004-check`. Full verification is required because the blast radius touches operating strategy docs, source notes, package scripts, closeout registry, and `foundation:verify`.

Operator value: Steve can rely on one durable operating-truth page and one Freedom rebuild blueprint instead of expecting future agents to reread source-note history and chat context.

Speed bound: the focused proof is local repo text plus source-registry metadata and should run under 2 minutes.

## Risks

- Risk: this turns into live source repair. Mitigation: this card is repo-truth refinement only; source-system writes are out of scope.
- Risk: source notes lose evidence while trimming interpretation. Mitigation: this card cross-links promoted meaning but does not delete validation evidence.
- Risk: the operating-truth doc hardcodes live values. Mitigation: it cites source IDs and stores meaning, not live metrics.
- Risk: future builders treat the blueprint as completed implementation. Mitigation: the blueprint names backlog-owned gaps and not-next boundaries.

Rollback or repair path: if focused proof fails, do not close the card or advance to `DATA-001`. Fix the exact failed invariant and rerun `process:foundation-004-check`. If later health shows a workflow failure, repair workflow health first; do not classify broken workflow health as green.

## Not Next

- Do not mutate source spreadsheets, Google Drive permissions, ClickUp tasks, FUB records, or finance ledgers.
- Do not run live extraction, paid/provider/browser-auth work, or broad private source reads.
- Do not send email or external messages.
- Do not mutate credentials, OAuth scopes, provider config, or source access.
- Do not turn Freedom Sheet current process notes into final rebuilt source truth.
- Do not treat Owners Dashboard Lists mirror as a write surface.
- Do not treat ClickUp as final finance, deal economics, commission, split, or bonus payout truth.
- Do not hardcode live values in strategy docs.
- Do not run `MEETING-VAULT-ACL-001 Phase B` or mutate Drive permissions.

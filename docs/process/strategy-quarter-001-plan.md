# STRATEGY-QUARTER-001 Plan

## What

Build the canonical source-backed Strategy Quarter input layer.

Closeout key: `strategy-quarter-input-layer-v1`.

V1 creates local PostgreSQL-backed quarter records for:

- quarter theme
- critical number
- department targets
- unresolved strategic issues
- open decisions and open questions
- prework refs
- weekly review / follow-up outputs
- Strategy Quarter source facts under `SRC-STRATEGY-QUARTER-001`

## Why

Strategic Execution now has source-backed goal truth, operating truth, business atoms, strategic issues, action routes, Scoper outputs, and planning queues. It still needs one canonical quarter context so those signals do not collapse back into a markdown quarterly-priorities doc or a loose dashboard readout.

Steve should be able to see the current quarter context, update the theme/critical number from Strategy Hub, and trust that the quarter context is local source truth with provenance.

## Definition Of Done

- `strategy_quarter_contexts`, `strategy_quarter_targets`, and `strategy_quarter_review_outputs` exist and are populated for the current Benson Crew quarter.
- `SRC-STRATEGY-QUARTER-001` is upgraded from proposed/not-connected to a signed-off current-reality source contract.
- Strategy Hub v2 reads the quarter context in `/api/strategic-execution/v2`.
- Strategy Hub exposes an owner/admin write path for theme, critical number, planning status, and owner note.
- Strategy Quarter facts are written into the source fact ledger as `source_snapshot` facts with `strategy_quarter_*` subtypes.
- Prior-quarter quarterly-priorities markdown may be imported as evidence, but it is not presented as current-quarter signed-off truth when the quarter dates do not match.
- Current Sprint advances to `STRATEGY-003` after clean proof.

## Acceptance Criteria

- Focused proof creates/updates local DB records only under explicit `--close-card`.
- Focused proof rejects missing quarter context, wrong source ID, missing theme/critical-number fields, missing Strategy source provenance, missing targets, and missing source facts.
- Source contract registry is synced after the source contract update.
- Strategy Hub API includes `quarterContext`.
- Strategy Hub UI renders the quarter context and owner/admin save form.
- No external writes, sends, Drive permission changes, provider calls, browser automation, or extraction runs happen.
- Plan Critic score must pass at 9.8+ before close-card writes.

## Details

Root invariant: Strategy Quarter context is not canonical because it appears in a doc. It is canonical only when the quarter has a local DB record, source ID, provenance, write path, source facts, and Strategy Hub visibility.

Benson Crew quarter rule:

- Q1 = February-April
- Q2 = May-July
- Q3 = August-October
- Q4 = November-January

On May 20, 2026, the current quarter is Q2 2026. The existing `docs/strategy/quarterly-priorities.md` still says Q1 2026. V1 must preserve that document as evidence and mark it as prior-quarter evidence if it does not match the current quarter.

Behavior owner:

- `lib/strategy-quarter-input-layer.js`

Runtime integration:

- `lib/strategy-shared-comms-routes.js`
- `public/strategic-execution.js`

Proof owner:

- `scripts/process-strategy-quarter-check.mjs`

The source fact ledger uses existing `intelligence_synthesis_facts` shape. V1 does not mutate the global fact-type enum. It writes `source_snapshot` facts with metadata subtypes:

- `strategy_quarter_theme`
- `strategy_quarter_critical_number`
- `strategy_quarter_department_target`
- `strategy_quarter_review_output`

Behavior proof is through actual function, API, and process paths, not substring-only verifier theatre:

- Function path: `upsertStrategyQuarterSeed()`, `getStrategyQuarterSnapshot()`, `buildStrategyQuarterSourceFacts()`, and `evaluateStrategyQuarterSnapshot()` create and evaluate real local DB-backed quarter records.
- API route path: `/api/strategic-execution/v2` includes the same `quarterContext` object that Strategy Hub renders, and `/api/strategic-execution/quarter-context` is the owner/admin write path.
- Round-trip path: owner/admin edits save to `strategy_quarter_contexts`, then the next Strategy Hub payload reads those records back.
- Dogfood path: focused proof rejects synthetic weak fixtures with wrong source ID, missing theme, missing Strategy source provenance, missing targets, and missing source facts.
- No substring-only proof: source markers can prove wiring exists, but they are not sufficient to close the card without the function/process snapshot checks passing.

## Reuse Existing Work

Existing code:

- `lib/strategy-shared-comms-routes.js`
- `public/strategic-execution.js`
- `lib/strategy-planning-workflow.js`
- `lib/strategic-intel-loop.js`
- `lib/decision-008-accountability-doctrine.js`
- `lib/intel-scoper.js`
- `lib/intelligence-synthesis-facts.js`
- `lib/source-contract-registry-table.js`

Existing DB ledgers:

- `intelligence_strategic_issues`
- `intelligence_action_routes`
- `decisions`
- `open_questions`
- `intelligence_synthesis_facts`
- `source_contract_registry`

Existing docs:

- `docs/strategy/quarterly-priorities.md`
- `docs/strategy/strategic-issues.md`
- `docs/process/strategic-intel-001-plan.md`
- `docs/process/decision-008-plan.md`
- `docs/process/intel-scoper-001-plan.md`
- `docs/process/strategy-004-planning-workflow-plan.md`
- `docs/process/strategy-009-package-ux-plan.md`

## Operator Value

Steve gets one current-quarter context surface that is source-backed, editable through the Strategy Hub, and connected to strategic issues, decisions, questions, targets, and follow-up routing. This gives `STRATEGY-003` a real input layer instead of forcing it to invent quarter truth.

Useful operator behavior unlocked: Steve can open Strategy Hub, see whether Q2 2026 has an owner-confirmed theme and critical number, update those fields in the real workflow, and know downstream Strategy work is reading source-backed quarter records instead of stale markdown.

## Risks

- Risk: stale Q1 markdown is treated as current Q2 truth.
  - Mitigation: the module computes the Benson Crew quarter from date and records prior-quarter docs as evidence only when they do not match.
- Risk: this card grows into full Strategic Execution workspace build.
  - Mitigation: `STRATEGY-003` owns the deeper quarterly priorities workspace. V1 only builds input-layer truth and visibility.
- Risk: a process check mutates local DB without explicit intent.
  - Mitigation: DB writes require `--close-card`.
- Risk: source facts archive unrelated strategy facts.
  - Mitigation: source facts are scoped to `SRC-STRATEGY-QUARTER-001`.
- Risk: UI save path becomes external write.
  - Mitigation: Strategy Hub form writes only local PostgreSQL quarter records.

## Gate Decision

Blast radius is full because this touches local PostgreSQL schema/rows, a source contract, Strategy Hub API/UI, source facts, Current Sprint advancement, package scripts, and the closeout registry.

Gate choice:

- Static gate: `node --check` for the module, route file, frontend file, and process proof script.
- Focused gate: `process:strategy-quarter-check` proves the Strategy Quarter function/process behavior and close-card DB writes.
- Full gate: System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship`.

The focused gate is thin and proportional: it seeds one current-quarter record set, exports bounded source facts, and should run under a few minutes. The full gate is reserved for closeout and ship, not every local edit.

If proof fails or behavior regresses, repair path is to leave `STRATEGY-QUARTER-001` open, keep `STRATEGY-003` blocked, and fix the failing function/API/process path before closing. If the quarter source facts are bad, archive or overwrite only `SRC-STRATEGY-QUARTER-001` facts through the focused process path; do not patch Strategy Hub around bad data.

## Tests

- `node --check lib/strategy-quarter-input-layer.js lib/strategy-shared-comms-routes.js public/strategic-execution.js scripts/process-strategy-quarter-check.mjs`
- `npm run process:strategy-quarter-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=STRATEGY-QUARTER-001 --planApprovalRef=docs/process/approvals/STRATEGY-QUARTER-001.json --closeoutKey=strategy-quarter-input-layer-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=STRATEGY-QUARTER-001 --closeoutKey=strategy-quarter-input-layer-v1`
- `npm run process:foundation-ship -- --card=STRATEGY-QUARTER-001 --planApprovalRef=docs/process/approvals/STRATEGY-QUARTER-001.json --closeoutKey=strategy-quarter-input-layer-v1 --commitRef=HEAD`

## Not Next

- No Drive extraction or Drive permission mutation.
- No browser automation, provider/model calls, paid-source work, or broad private extraction.
- No sends, messages, credential rotation, provider config mutation, or external system writes.
- No auto-applied decisions or action routes.
- No full `STRATEGY-003` quarterly workspace expansion inside this card.

# INTEL-SCOPER-001 Plan

## What

Build the v1 gap-resolving Strategic Intelligence Scoper.

Closeout key: `intel-scoper-v1`.

## Why

`STRATEGIC-INTEL-001` created source-backed strategic issues, and `DECISION-008` proved one issue can become an owner-bound open question plus proposed decision. The next gap is turning the rest of the issue ledger into usable scoped follow-up without recreating old-system report piles.

Steve's operating rule is that gold from audits, old-system reviews, and conversations must not stay trapped in chat or markdown. The Scoper turns a strategic issue into a structured answer to: what is already answered, what is partial, what is still missing, who likely owns it, what is the smallest next step, and what must not happen automatically.

## Definition Of Done

- `intelligence_scoper_outputs` exists as the durable proposal-only Scoper output ledger.
- At least five strategic issues have human-readable scoper outputs.
- Each output classifies the issue as `already_answered`, `partially_answered`, `real_gap`, `stale_or_test`, `needs_human_context`, or `blocked_approval_required`.
- Each output preserves issue ID, source IDs, fact refs, atom refs, chunk refs, synthesized item refs, route refs, decision refs, open question refs, and proof refs when available.
- Each output includes gap statements, smallest next steps, blocked auto-actions, owner, confidence, and proposed follow-up ID.
- DECISION-008 proposed decision/open-question refs appear in the Scoper sample so the loop starts from live accountability truth.
- Scoper output remains proposal-only: no auto-created backlog cards, no applied decisions, no sprint opening, no external writes, no provider calls, no extraction.
- `intelligence_strategic_issue_events` receives `scoped` events for the outputs.
- Current Sprint advances to `DATA-003` after clean proof.

## Acceptance Criteria

- Focused proof creates schema/output rows only under explicit `--close-card`.
- Focused proof reads only existing local DB truth: `intelligence_strategic_issues`, `intelligence_strategic_issue_events`, `intelligence_action_routes`, `intelligence_atoms`, `decisions`, and `open_questions`.
- Focused proof verifies a five-row human sample exists.
- Focused proof verifies every output has source refs, proof refs, smallest next steps, and blocked auto-action boundaries.
- Focused proof verifies at least one output includes DECISION-008 proposed decision and open question refs.
- Focused dogfood rejects weak source evidence and mutating/autonomous output shapes.
- Plan Critic score must pass at 9.8+ before close-card writes.
- Required proof command: `npm run process:intel-scoper-check -- --close-card --json`.

## Details

Add `lib/intel-scoper.js` as the behavior owner.

Add `scripts/process-intel-scoper-check.mjs` as the focused proof and closeout path.

Root invariant: a Scoper output is useful only if it turns an evidence-backed strategic issue into a bounded proposal with provenance and human approval boundaries. A report paragraph, chat claim, or auto-created backlog card does not count.

The v1 source chain is:

`intelligence_strategic_issues -> intelligence_action_routes / decisions / open_questions / atoms -> intelligence_scoper_outputs -> DATA-003`

The proof path is function/process based:

- `buildIntelScoperOutput()` classifies a strategic issue from source-backed evidence.
- `buildIntelScoperOutputs()` produces the five-row sample.
- `applyIntelScoperProofState()` creates the output ledger rows and scoped issue events under `--close-card`.
- `evaluateIntelScoperSnapshot()` reloads live DB output rows and verifies proposal-only, evidence-bound behavior.
- `buildIntelScoperDogfoodProof()` rejects weak or mutating fixtures.

The Scoper deliberately does not create backlog cards. It creates `proposed_card_id` values and proposed next steps that can be reviewed, approved, rejected, snoozed, or promoted through the existing backlog/action-route path later.

## Reuse Existing Work

Existing code to reuse:

- `lib/strategic-intel-loop.js`
- `lib/decision-008-accountability-doctrine.js`
- `lib/intelligence-action-router.js`
- `lib/intelligence-atoms.js`
- `lib/research-inbox.js`
- `lib/implementation-intelligence.js`
- `lib/process-plan-critic.js`
- `lib/process-write-guard.js`
- `lib/approval-integrity.js`
- `lib/foundation-build-log.js`

Existing docs to reuse:

- `docs/process/strategic-intel-001-plan.md`
- `docs/process/decision-008-plan.md`
- `docs/process/internal-scoper-001-plan.md`
- `docs/specs/2026-04-28-strategic-intelligence-loop.md`
- `docs/audits/2026-05-19-old-system-research-team-harvest.md`
- `docs/handoffs/2026-05-19-strategic-intel-loop-closeout.md`
- `docs/handoffs/2026-05-19-decision-008-accountability-doctrine-closeout.md`

Existing tables to reuse:

- `intelligence_strategic_issues`
- `intelligence_strategic_issue_events`
- `intelligence_action_routes`
- `intelligence_atoms`
- `intelligence_retrieval_chunks`
- `decisions`
- `open_questions`

Existing cards to reuse:

- `STRATEGIC-INTEL-001`
- `DECISION-008`
- `INTERNAL-SCOPER-001`
- `DATA-003`
- `OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001`

Existing scripts to reuse:

- `process:strategic-intel-check`
- `process:decision-008-check`
- `process:implementation-intelligence-check`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `backlog:hygiene`
- `foundation:verify`
- `process:foundation-ship`

Live backlog and Current Sprint truth:

- live backlog card `INTEL-SCOPER-001` is the active work item
- live backlog card `DATA-003` is the next card
- Current Sprint `FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19` is the sprint truth

## Operator Value

Steve gets the missing bridge between surfaced intelligence and useful action. The Scoper can say, in plain English, which issues are already partly handled, which are real gaps, which need owner context, and what tiny next step should happen without pretending the system has permission to act.

## Risks

- Autonomous-agent risk: the Scoper could start creating work or applying decisions.
  - Mitigation: v1 is proposal-only, DB-local, and records blocked auto-actions on every output.
- False-intelligence risk: the Scoper could scope from loose prose.
  - Mitigation: proof requires source/proof refs and dogfoods weak source evidence as degraded.
- Report-pile risk: outputs could become another table nobody uses.
  - Mitigation: Current Sprint advances to `DATA-003`, and outputs include proposed IDs, owners, smallest next steps, and issue events.
- Scope-creep risk: this could become DATA-003, Strategy UI, or a provider/LLM scoper.
  - Mitigation: no UI, no DATA-003 build, no LLM/provider/browser/source extraction.
- Write-boundary risk: a process check could mutate live DB without explicit intent.
  - Mitigation: schema/output/sprint writes require `--close-card`.

Rollback/repair:

- If scoper classification is wrong, fix `buildIntelScoperOutput()` and rerun the focused proof. Output IDs are deterministic by issue/status/closeout key.
- If source evidence is weak, leave the output `stale_or_test` or `needs_human_context`; do not auto-create a backlog card.
- If sprint advancement drifts, rerun `process:intel-scoper-check -- --close-card --json` after fixing Current Sprint metadata.

## Tests

Static proof:

```bash
node --check lib/intel-scoper.js scripts/process-intel-scoper-check.mjs
```

Focused proof:

```bash
npm run process:intel-scoper-check -- --close-card --json
```

Behavior proof:

- `buildIntelScoperOutput()` classifies answered/partial/gap/stale/context states.
- `buildIntelScoperOutputs()` returns a bounded five-row sample.
- `evaluateIntelScoperSnapshot()` proves live DB rows, source refs, proof refs, next steps, and blocked auto-action boundaries.
- `buildIntelScoperDogfoodProof()` rejects weak and mutating output shapes.

Full gates:

```bash
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=INTEL-SCOPER-001 --planApprovalRef=docs/process/approvals/INTEL-SCOPER-001.json --closeoutKey=intel-scoper-v1 --commitRef=HEAD
```

Speed:

- Focused proof is DB-local and bounded to five outputs.
- Target runtime is under 2 minutes.
- No extraction, browser automation, provider/model calls, media processing, or old-system code execution.

## Not Next

- No auto-created backlog cards.
- No applied or locked decisions.
- No Strategy Hub UI.
- No DATA-003 build.
- No LLM/provider/browser/auth/private extraction lanes.
- No old-agent runtime or Director agents.
- No external writes, sends, credential mutation, provider config mutation, or Drive permission mutation.

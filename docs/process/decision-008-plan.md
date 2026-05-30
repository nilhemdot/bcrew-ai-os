# DECISION-008 Plan

## What

Build the v1 accountability-doctrine loop that promotes a source-backed strategic issue into owner-bound follow-through.

Closeout key: `decision-008-accountability-doctrine-v1`.

## Why

`STRATEGIC-INTEL-001` created `intelligence_strategic_issues`, but unresolved issues still need an accountable next step. Steve specifically does not want important business answers buried in docs, reports, or chat. This card proves the next link in the chain: strategic issue -> route -> owner question -> proposed decision -> resolution feedback.

## Definition Of Done

- `DECISION-008` reads from `intelligence_strategic_issues`.
- At least one route-linked strategic issue is promoted into an owner-bound `open_questions` row.
- The same issue gets a `decisions` row with `status = proposed`; no decision is locked or applied by this card.
- The issue preserves issue ID, route ID, source IDs, fact refs, atom refs, chunk refs, and synthesized item refs.
- `intelligence_strategic_issue_events` receives a `resolution_feedback` event for the promoted issue.
- The source issue remains `resolution_status = route_pending` until human approval applies, rejects, snoozes, or resolves it.
- `INTEL-SCOPER-001` is pinned to these outputs so the Scoper starts from issue/route/source truth instead of loose backlog text.
- Current Sprint advances to `INTEL-SCOPER-001` after clean proof.

## Acceptance Criteria

- Focused proof rejects missing issue refs, missing route refs, missing source evidence, locked decisions, and missing resolution feedback.
- Focused proof writes internal DB rows only under explicit `--close-card`.
- Focused proof proves the proposed decision is proposed-only and not locked/applied.
- Focused proof proves the owner question remains open.
- Focused proof proves `resolution_feedback` writes back to the strategic issue ledger.
- Plan Critic score must pass at 9.8+; if it returns revise, the plan must be repaired before any close-card write.
- Required proof command: `npm run process:decision-008-check -- --close-card --json`.

## Details

Add `lib/decision-008-accountability-doctrine.js` as the behavior owner.

Add `scripts/process-decision-008-check.mjs` as the focused proof and closeout path.

Root invariant: a strategic issue is not accountable because it appears in a report. It becomes accountable only when it has an owner-bound route, preserved evidence refs, an open question or proposed decision, and feedback back into `intelligence_strategic_issues`.

The v1 source chain is:

`intelligence_strategic_issues -> intelligence_action_routes -> open_questions / proposed decisions -> intelligence_strategic_issue_events`

The behavior proof is not substring-only. `process:decision-008-check` calls the real function path:

- `buildDecision008CandidateRows()` reads live DB rows from the issue and route tables.
- `buildDecision008ProposedDecision()` and `buildDecision008OpenQuestion()` build the proposed-only outputs.
- `applyDecision008ProofState()` performs the guarded DB round-trip under `--close-card`.
- `evaluateDecision008Snapshot()` reloads the live DB and verifies actual rows and event feedback.
- `buildDecision008DogfoodProof()` rejects weak synthetic fixtures for missing route, missing source refs, locked decision output, and missing feedback.

No substring-only or marker-only proof is acceptable for `DECISION-008`.

The card uses a route-linked issue created by `STRATEGIC-INTEL-001`. V1 is intentionally bounded:

- one proof issue
- one owner-bound open question
- one proposed-only decision
- one resolution feedback event
- no Scoper implementation
- no Strategy Hub UI
- no external actions

The promoted issue remains review-controlled. The system can show that the issue has an accountability path, but it cannot claim the answer is final doctrine until a separate approved apply path locks/applies the decision.

## Reuse Existing Work

Existing code to reuse:

- `lib/strategic-intel-loop.js`
- `lib/action-route-promotion-workflow.js`
- `lib/intelligence-action-router.js`
- `lib/foundation-decision-store.js`
- `lib/process-plan-critic.js`
- `lib/process-write-guard.js`
- `lib/approval-integrity.js`
- `lib/foundation-build-log.js`

Existing docs to reuse:

- `docs/process/strategic-intel-001-plan.md`
- `docs/specs/2026-04-28-strategic-intelligence-loop.md`
- `docs/_archive/handoffs/2026-05-19-strategic-intel-loop-closeout.md`
- `docs/rebuild/current-plan.md`

Existing tables to reuse:

- `intelligence_strategic_issues`
- `intelligence_strategic_issue_events`
- `intelligence_action_routes`
- `decisions`
- `open_questions`

Existing cards to reuse:

- `STRATEGIC-INTEL-001`
- `ACTION-ROUTER-001`
- `DECISION-004`
- `INTEL-SCOPER-001`

Existing scripts to reuse:

- `process:strategic-intel-check`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `backlog:hygiene`
- `foundation:verify`
- `process:foundation-ship`

Live backlog and Current Sprint truth:

- live backlog card `DECISION-008` is the active work item
- live backlog card `INTEL-SCOPER-001` is the next card
- Current Sprint `FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19` is the sprint truth

## Operator Value

Steve gets proof that the intelligence loop does not stop at “interesting issue found.” The system creates a reviewable accountability artifact with owner, evidence, route, and follow-through state.

## Risks

- False doctrine risk: the system could turn a proposed answer into locked truth.
  - Mitigation: all decision output is `status = proposed`; no locked/applied decision is created by this card.
- Broken provenance risk: issue evidence could get lost when promoting to decision/question.
  - Mitigation: focused proof requires issue ID, route ID, source IDs, fact refs, atom refs, chunk refs, synthesized item refs, and feedback event.
- Old report-pile risk: the issue could be documented but not routed.
  - Mitigation: closeout requires DB-backed open question, proposed decision, and `resolution_feedback`, not just markdown.
- Scope creep risk: this card could become Scoper, UI, or Director-agent work.
  - Mitigation: Scoper/UI/Director work is explicitly not next.
- Write-boundary risk: a process check could mutate live DB without explicit intent.
  - Mitigation: DB writes require `--close-card`.

Rollback/repair:

- If the proposed decision or open question is wrong, rerun the focused proof after fixing the candidate builder; rows are deterministic by issue/route.
- If the feedback event is wrong, update the event writer and rerun `process:decision-008-check -- --close-card --json`.
- If Scoper dependency drifts, update Current Sprint/backlog truth before closing.

## Tests

Static proof:

```bash
node --check lib/decision-008-accountability-doctrine.js scripts/process-decision-008-check.mjs
```

Focused proof:

```bash
npm run process:decision-008-check -- --close-card --json
```

Behavior proof:

- `buildDecision008CandidateRows()` reads issue/route/source truth.
- `buildDecision008ProposedDecision()` creates proposed-only decision payload.
- `buildDecision008OpenQuestion()` creates owner-bound open question payload.
- `evaluateDecision008Snapshot()` proves the accountability loop.
- `buildDecision008DogfoodProof()` rejects weak fixtures.

Full gates:

```bash
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DECISION-008 --planApprovalRef=docs/process/approvals/DECISION-008.json --closeoutKey=decision-008-accountability-doctrine-v1 --commitRef=HEAD
```

Speed:

- Focused proof is DB-local and bounded.
- The focused proof is thin and targeted to run under 2 minutes so it is fast enough to use by default.
- No extraction, browser automation, provider/model call, media processing, or old-system code execution.

## Not Next

- No locked decisions.
- No applied doctrine.
- No Scoper implementation.
- No Strategy Hub UI.
- No department Director agent.
- No old agent runtime.
- No broad source extraction.
- No provider/model calls.
- No private broad extraction.
- No external writes, sends, credential mutation, provider config mutation, or Drive permission mutation.

# STRATEGIC-INTEL-001 Plan

## What

Build the v1 continuous Strategic Intelligence loop as a governed source-backed issue ledger.

Closeout key: `strategic-intel-loop-v1`.

## Why

Steve wants the system to surface real strategic issues continuously instead of burying useful signals in reports, chat memory, old-system docs, or dashboard snapshots.

The old system had a useful pattern: scout signal -> director synthesis -> scoper -> action. The failure mode was agent sprawl, report piles, and weak downstream accountability. This card rebuilds the useful part through current Foundation truth only.

## Definition Of Done

- `intelligence_strategic_issues` exists as the stable issue ledger.
- `intelligence_strategic_issue_events` exists as the feedback/history ledger.
- At least five strategic issues are seeded from current strategy-eligible `intelligence_synthesized_items`.
- Every issue has lifecycle status, owner, urgency, impact, confidence, staleness, source IDs, fact refs, atom refs, chunk refs, synthesized item refs, and resurface rule.
- Weekly operating targets are encoded: `>= 5` surfaced/week, `>= 3` scoped/week, `>= 2` resolved-to-applied/week, and median manual investigation <= 30 minutes/issue.
- Resolution feedback is represented by issue events and issue status fields so `DECISION-008` can write back when decisions/routes are approved, rejected, snoozed, applied, or resolved.
- `INTEL-SCOPER-001` stays blocked behind this issue ledger/schema contract.
- Current Sprint advances to `DECISION-008` after clean proof.

## Acceptance Criteria

- Focused proof creates the schema only under explicit `--close-card`.
- Focused proof seeds strategic issues from existing DB truth only; it does not run extraction, old agents, browser automation, provider/model calls, or broad source reads.
- Focused proof verifies at least five surfaced issues this week.
- Focused proof verifies every issue has scoring fields: urgency, impact, confidence, and staleness.
- Focused proof verifies every issue has source-backed evidence refs and synthesized item refs.
- Focused proof verifies every issue records that it blocks/enables `INTEL-SCOPER-001`.
- Focused dogfood rejects missing source refs, missing scoring, and missing resolved-to-applied target.
- Required proof command: `npm run process:strategic-intel-check -- --close-card --json`.

## Details

Add `lib/strategic-intel-loop.js` as the behavior owner.

Add `scripts/process-strategic-intel-check.mjs` as the focused proof and closeout path.

Root invariant: Strategic Intelligence is healthy only when current intelligence tables produce a durable issue ledger that can carry lifecycle, scoring, evidence, routing, Scoper dependency, and resolution feedback. A markdown spec or old-system report does not count as live strategic intelligence.

The v1 source chain is:

`intelligence_synthesized_items -> intelligence_strategic_issues -> intelligence_strategic_issue_events -> DECISION-008 / INTEL-SCOPER-001`

The card uses these current evidence tables:

- `intelligence_synthesized_items`
- `intelligence_action_routes`
- `intelligence_atoms`
- `intelligence_synthesis_facts`
- `intelligence_retrieval_chunks`

Selection rule for v1:

- use strategy-eligible synthesized items where `metadata.strategyHubEligible`, `attributes.strategyHubEligible`, `metadata.routeScope`, or `attributes.routeScope` marks strategy
- include archived strategy-eligible synthesized items as source-backed historical evidence when the active set is too small, while preserving staleness/watch scoring so archived evidence is not presented as fresh certainty
- prefer source-backed records with more sources, fact refs, atom refs, and chunk refs
- do not infer from chat-only claims or old-system docs unless those claims were already promoted into current source-backed tables

Scoring is deterministic in v1:

- urgency: route presence, blocker/risk/security/cash/deadline language, or owner-decision wording
- impact: multi-source evidence, high fact count, and strategy/revenue/source/system terms
- confidence: source count, fact count, and chunk count
- staleness: item update age

Resolution feedback contract:

- issue status and `resolution_status` carry the operating state
- `intelligence_strategic_issue_events` records surfaced, scoped, route-linked, feedback, snooze, reject, stale, and resurface events
- downstream cards must write back to the issue ledger instead of creating disconnected decisions/backlog items

## Reuse Existing Work

Existing code to reuse:

- `lib/intelligence-synthesis.js`
- `lib/intelligence-action-router.js`
- `lib/intelligence-retrieval.js`
- `lib/foundation-db.js`
- `lib/process-plan-critic.js`
- `lib/process-write-guard.js`
- `lib/approval-integrity.js`
- `lib/foundation-build-log.js`

Existing docs to reuse:

- `docs/specs/2026-04-28-strategic-intelligence-loop.md`
- `docs/_archive/audits/2026-05-19-legacy-system-audit.md`
- `docs/_archive/audits/2026-05-19-old-system-research-team-harvest.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Existing cards to reuse:

- `STRATEGIC-INTEL-001`
- `DECISION-008`
- `INTEL-SCOPER-001`
- `DATA-003`
- `OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001`
- `LEGACY-SYSTEM-AUDIT-001`

## Operator Value

Steve gets a real Strategic Intelligence substrate: source-backed issues with ownership, scoring, lifecycle, and feedback. That lets the next cards promote issues into accountable decisions and scoped work without reverting to old report piles.

## Risks

- False intelligence risk: strategic issues could become model vibes or chat claims.
  - Mitigation: seed only from current source-backed intelligence tables and require source/fact/atom/chunk refs.
- Old-system sprawl risk: rebuilding Directors or scouts too early could recreate the old failure mode.
  - Mitigation: no old agents, broad extraction, browser automation, or Director agents in this card.
- Fake resolution risk: resolved-to-applied targets could be faked to pass a metric.
  - Mitigation: proof encodes the target and measures actual resolved/applied issue status separately; it does not fabricate applied decisions.
- Write-boundary risk: a process check could mutate live DB without explicit intent.
  - Mitigation: schema/seed/sprint writes require `--close-card`.

Rollback/repair:

- If strategic issue rows are wrong, re-run the focused proof after fixing scoring/selection. Upserts are deterministic by synthesized item ID.
- If schema fields are missing, add fields in `lib/strategic-intel-loop.js`, rerun focused proof, then rerun full gates.
- If DECISION/Scoper dependency is missing, update backlog and Current Sprint truth before closing.

## Tests

Static proof:

```bash
node --check lib/strategic-intel-loop.js scripts/process-strategic-intel-check.mjs
```

Focused proof:

```bash
npm run process:strategic-intel-check -- --close-card --json
```

Behavior proof:

- `ensureStrategicIntelSchema()` owns the schema.
- `queryStrategicIssueCandidates()` reads current strategy-eligible synthesized items.
- `buildStrategicIssueFromSynthesizedItem()` maps source evidence into issue fields.
- `upsertStrategicIssues()` records issues and surfacing events.
- `evaluateStrategicIntelSnapshot()` proves schema, evidence refs, scoring, weekly targets, and feedback event history.
- `buildStrategicIntelDogfoodProof()` rejects weak fixtures.

Full gates:

```bash
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=STRATEGIC-INTEL-001 --planApprovalRef=docs/process/approvals/STRATEGIC-INTEL-001.json --closeoutKey=strategic-intel-loop-v1 --commitRef=HEAD
```

Speed:

- Focused proof is DB-local and bounded.
- The focused proof is fast and proportional, targeting under 2 minutes on the local Foundation workspace so it is usable by default during the sprint.
- No extraction, browser automation, provider/model call, media processing, or old-system code execution.

## Not Next

- No Strategy UI polish.
- No Scoper implementation.
- No Agent Factory.
- No department Director agents.
- No broad source extraction.
- No old-agent runtime.
- No provider/model calls.
- No private broad extraction.
- No external writes, sends, credential mutation, provider config mutation, or Drive permission mutation.

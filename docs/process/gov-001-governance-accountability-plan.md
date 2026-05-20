# GOV-001 Plan - Governance Accountability

## What

Build the V1 Governance Accountability packet inside Strategy Hub v2.

The card turns existing source-backed strategy inputs into a read-only governance operating loop: source readiness, meeting sequence, cadence checks, drift queue, structured outputs, and follow-through guardrails.

## Why

The system should not only document strategy. It should help Steve and leadership run the operating cadence with evidence, owners, next actions, and visible drift.

STRATEGY-001 created Business Atoms as reusable planning signals. GOV-001 uses those atoms as governance input, but it does not auto-apply decisions, create work, send messages, score people, or mutate external systems.

The useful operator behavior is simple: Steve can open Strategy Hub > Governance and see what the room needs, what sequence to follow, what source-backed drift needs attention, what outputs are pending, and what guardrails prevent accidental automation.

## Acceptance Criteria

- Strategy Hub v2 payload includes `governanceAccountability`.
- Governance snapshot includes source readiness, sequence steps, cadence checks, drift items, positive signals, structured outputs, and no-auto-apply guardrails.
- Drift items carry owner, source proof, severity, and next action.
- Structured outputs carry output type, owner, status, source proof, and next action.
- The Strategy Hub UI includes a Governance section and Overview preview.
- Dogfood proof rejects missing source proof, ownerless outputs, missing sequence, and auto-apply guardrail drift.
- Current Sprint advances to `DECISION-004` only after focused proof, System Health, repeated-failure gate, backlog hygiene, foundation verify, ship check, fanout, and foundation ship pass.

## Definition Of Done

- `npm run process:gov-001-check -- --close-card --json` is healthy and writes the closeout.
- `GOV-001` is marked done in live Backlog and Current Sprint.
- `DECISION-004` is the active blocker in Current Sprint.
- Strategy Hub > Governance renders read-only accountability packet data from existing source-backed systems.
- `process:foundation-ship` passes and main is pushed clean.

## Details

The governance packet uses existing work:

- Strategy goal truth
- Strategy operating truth
- Action Router review routes
- Strategy meeting-ready packet
- Strategy planning workflow
- Business Atoms

V1 outputs are not a new write engine. They are a structured packet:

- **Prepare room:** source readiness and degraded-source warnings.
- **Run sequence:** agenda steps and proof.
- **Capture outputs:** decision/task/question route records that already require human approval.
- **Surface drift:** source-backed goal drift and Business Atom drift.
- **Follow through:** pending output pressure and ownerless-output visibility.

Behavior proof must be functional. The proof rejects substring-only checks: the focused process check builds the same governance snapshot used by the Strategy Hub API route, validates the actual function path for owner/source/next-action invariants, validates UI/API wiring, validates Plan Critic and approval, and dogfoods the known failure modes.

Gate decision tree uses static, focused, and full based on blast radius. This is a full Foundation gate card because it changes Strategy Hub payload behavior, UI navigation/rendering, focused process proof, live Backlog, Current Sprint, package scripts, verifier coverage, and closeout registry. The focused proof runs first, then System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, ship check, fanout, and `process:foundation-ship`.

## Reuse Existing Work

- Existing code: `lib/strategy-001-business-atoms.js`, `lib/strategy-hub-meeting-ready.js`, `lib/strategy-planning-workflow.js`, `lib/strategy-shared-comms-routes.js`, `lib/intelligence-action-router.js`, `public/strategic-execution.js`.
- Existing docs: `docs/process/strategy-001-business-atoms-framework-plan.md`, `docs/process/strategy-hub-meeting-ready-001-plan.md`, `docs/process/strategy-004-planning-workflow-plan.md`, `docs/strategy/governance.md`.
- Existing scripts: `process:strategy-001-check`, `process:strategy-hub-meeting-ready-check`, `process:strategy-004-check`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Existing data: `business_atoms`, `atom_hits`, Strategy goal truth, Strategy operating truth, Action Router routes, retrieval/planning evidence.
- Existing gates: Plan Critic, System Health, repeated-failure action gate, backlog hygiene, foundation verify, ship check, fanout, foundation ship.
- Existing live backlog truth and Current Sprint stay authoritative for task status and the active blocker.
- Existing policy: human approval required before action routes apply.

## Risks

- The card could become an autonomous governance agent. V1 prevents that with read-only payloads and no-auto-apply guardrails.
- The card could score people or departments without an approved people-intelligence model. V1 only surfaces source-backed drift and owner queues.
- The card could create duplicate decision/task systems. V1 only reads the existing Action Router output queue.
- The card could become UI-only. V1 includes a functional snapshot builder and dogfood proof.

If proof fails, keep `GOV-001` active, fix the focused invariant that failed, rerun `npm run process:gov-001-check -- --close-card --json`, and then rerun full gates. If governance ever starts auto-applying work from this view, revert that behavior and keep the existing Action Router human-approval path.

## Tests

- `node --check lib/gov-001-governance-accountability.js scripts/process-gov-001-check.mjs lib/strategy-shared-comms-routes.js public/strategic-execution.js server.js`
- `npm run process:gov-001-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=GOV-001 --planApprovalRef=docs/process/approvals/GOV-001.json --closeoutKey=gov-001-governance-accountability-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=GOV-001 --closeoutKey=gov-001-governance-accountability-v1`
- `npm run process:foundation-ship -- --card=GOV-001 --planApprovalRef=docs/process/approvals/GOV-001.json --closeoutKey=gov-001-governance-accountability-v1 --commitRef=HEAD`

Speed bound: the focused proof is fast and proportional. It reads local repo files, local PostgreSQL snapshots, and the existing Strategy Hub API/function path; it should stay under 2 minutes before full gates. It does not call providers, run browser automation, send messages, or mutate external systems.

## Not Next

- Do not create an autonomous governance agent.
- Do not auto-apply decisions, create backlog items, send messages, mutate calendars, or score people.
- Do not run browser automation, paid/provider access, broad private extraction, credential changes, Drive permission mutation, or external writes.
- Do not redesign Strategy Hub beyond the bounded Governance Accountability view.
- Do not build DECISION-004 inside this card.

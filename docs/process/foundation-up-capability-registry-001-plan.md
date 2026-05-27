# FOUNDATION-UP-CAPABILITY-REGISTRY-001 Plan

## What

Create the Foundation-up provider/tool capability registry before agents or workers can claim/use tools like Fal, ElevenLabs, Canva, and terminal workers.

The V1 registry records for each capability:

- capability ID, provider, tool kind, and owner
- env refs by name only, never secret values
- permission class and default fail-closed status
- cost policy and budget owner
- audit log/transcript requirements
- callable path or future callable path
- proof command
- approval boundary
- agent binding status

Tight V1 scope: pure registry contract, evaluator, dogfood proof, focused proof, verifier coverage, closeout registry, and current plan/state updates. This card calls no provider, spends no credits, launches no terminal worker, mutates no external system, and grants no agent runtime authority.

Not next: do not build Harlan, Crewbert, Fal, ElevenLabs, Canva, terminal-worker, extraction, source-crawl, model-call, or provider runtime features in this card. Do not turn registration rows into runtime approval.

## Why

The old agent capability registry says agents must not claim abilities without declared proof. The next risk is tool sprawl: Fal, ElevenLabs, Canva, terminal workers, and future provider tools can become Harlan-only or hub-only side systems if Foundation does not own the capability contract first.

Useful operator behavior: Steve can ask "can an agent use this tool yet?" and get one Foundation-backed answer that names the owner, env refs, permission class, cost posture, audit log, callable path, proof, approval boundary, and blocked/approved status.

## Acceptance Criteria

- `lib/foundation-up-capability-registry.js` defines the registry contract, evaluator, report renderer, and dogfood proof.
- Registry rows exist for Fal image generation, ElevenLabs voice, Canva read metadata, and local terminal worker.
- Each provider/tool row names env refs or explicit local-only posture, permission class, cost policy, audit log, callable path, owner, proof command, and approval boundary.
- Provider calls, paid spend, external writes, terminal worker launches, hidden subagents, and secret value storage/printing stay false.
- Agent bindings exist but remain blocked pending separate approval.
- Dogfood rejects missing env refs, missing audit logs, premature provider approval, hidden workers, destructive terminal command allowlists, live side effects, and secret leaks.
- `lib/foundation-runtime-reliability-verifier.js` includes behavior coverage and dogfood for the new registry.
- `scripts/process-foundation-up-capability-registry-check.mjs` proves live backlog, Plan Critic, Current Sprint, approval, verifier coverage, package script, closeout registry, current plan/state, and file budgets.
- Full `foundation:verify` and full `process:foundation-ship` pass before push.

## Definition Of Done

Done means `FOUNDATION-UP-CAPABILITY-REGISTRY-001` is live `done`, the closeout key is `foundation-up-capability-registry-v1`, Current Sprint rolls to `MEMORY-002` in `scoping`, and Recent Builds exposes the closeout after commit.

Command-proven done requires:

- `node --check lib/foundation-up-capability-registry.js lib/foundation-runtime-reliability-verifier.js scripts/process-foundation-up-capability-registry-check.mjs scripts/foundation-verify.mjs`
- `npm run process:foundation-up-capability-registry-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=FOUNDATION-UP-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UP-CAPABILITY-REGISTRY-001.json --closeoutKey=foundation-up-capability-registry-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=FOUNDATION-UP-CAPABILITY-REGISTRY-001 --closeoutKey=foundation-up-capability-registry-v1`
- `npm run process:foundation-ship -- --card=FOUNDATION-UP-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UP-CAPABILITY-REGISTRY-001.json --closeoutKey=foundation-up-capability-registry-v1 --commitRef=HEAD`

## Details

Existing work to reuse:

- `AGENT-CAPABILITY-REGISTRY-001` for agent-side read-only capability claim rules.
- `CANVA-CLIENT-001` for the existing read-only Canva client primitive and rotation-safe env posture.
- `EXTRACTION-PARALLEL-WORKER-PROTOCOL-001` for visible worker/worktree/branch/wrap-report discipline.
- `FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001` for useful-agent fail-closed runtime gates.
- `HARLAN-TERMINAL-RUNTIME-001` and `FAL-IMAGE-ITERATION-TOOL-001` as future consumer cards, not runtime approval in this card.

Implementation files:

- `lib/foundation-up-capability-registry.js`
- `scripts/process-foundation-up-capability-registry-check.mjs`
- `scripts/foundation-verify.mjs`
- `lib/foundation-runtime-reliability-verifier.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `lib/foundation-build-closeout-agent-runtime-records.js`
- `docs/process/foundation-up-capability-registry-001-plan.md`
- `docs/process/approvals/FOUNDATION-UP-CAPABILITY-REGISTRY-001.json`
- `docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-foundation-up-capability-registry-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

Verifier/check posture: `scripts/process-foundation-up-capability-registry-check.mjs` is read-only by default. Live backlog, Plan Critic, and Current Sprint writes require explicit `--apply` or `--close-card` posture through `process-write-guard.js`; no-flag writes are blocked, and verifier/check paths fail closed instead of repairing live state.

Split plan / no new responsibility plan: this touches `scripts/foundation-verify.mjs`, `lib/foundation-runtime-reliability-verifier.js`, and `docs/rebuild/current-plan.md`, which are above the preferred 1,500-line hand-written budget. The change adds a thin verifier/check row, a one-line current-progress baseline for `FOUNDATION-UP-CAPABILITY-REGISTRY-001`/`MEMORY-002`, and a short top-of-doc status update only; it does not add new broad responsibility to any over-budget file. Any further verifier or plan expansion should move into a dedicated module/doc section instead of growing these files.

Coordination: this is active sprint scope in the main session. The main session owns the shared Foundation files for this card; no side/hub builder, hidden subagent, or parallel worker is editing these shared files.

## Risks

- Risk: registry rows are mistaken for approval to call tools. Mitigation: every row exposes `runtimeUseApprovedByThisCard: false`, blocked agent bindings, zero cost cap, and dogfood for premature approval.
- Risk: secrets leak into repo truth. Mitigation: env refs must be `env:NAME` references only; secret-like values fail dogfood.
- Risk: terminal worker becomes hidden execution. Mitigation: local terminal worker stays future/dry-run only and requires visible chat/worktree/branch ownership plus denied destructive commands.
- Risk: Canva read primitive turns into write/export/design authority. Mitigation: Canva row is read metadata only and agent binding remains blocked pending separate approval.
- Rollback/repair path: if focused proof, verifier coverage, or full ship regresses, leave the card in `executing` or return it with the failing invariant, remove the closeout/current-plan claim from the branch, and repair the pure registry before re-running `--close-card`.

## Tests

Gate decision tree: full gate is required because this changes a Foundation runtime capability module, package script, verifier coverage, closeout records, live sprint/backlog state, and current rebuild docs. Static proof is `node --check`; focused proof is `process:foundation-up-capability-registry-check`; final proof is `process:foundation-ship`.

Behavior proof is actual function path, not substring proof: `evaluateFoundationUpCapabilityRegistry()` validates the real rows and `buildFoundationUpCapabilityRegistryDogfoodProof()` mutates fixtures to recreate missing fields, early approval, hidden worker, destructive terminal, live side-effect, and secret-leak failures.

Speed and file-size budget: module and focused proof stay under 1,500 lines each, approval JSON stays under 50 lines, handoff stays under 100 lines, focused proof should run under 2 minutes, and full ship must stay inside the existing ship target.

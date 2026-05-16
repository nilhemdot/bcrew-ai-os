# PROCESS-WIP-PROTOCOL-001 Plan

## What

Build a narrow Work-In-Progress protocol guard for `PROCESS-WIP-PROTOCOL-001` so side builds and hub chats cannot slip shared Foundation files past the active sprint without explicit main-session coordination.

## Why

Steve needs hub work to keep moving without corrupting Foundation. Canva, Marketing Video Lab, Harlan, Fal, and other side lanes can be useful, but their work becomes dangerous when it quietly adds shared route, package, auth, security, or process files while another sprint owns Foundation. The useful operator value is speed with confidence: hub chats can keep building inside their lane, and shared files stop at the main session instead of becoming surprise commits.

## Acceptance Criteria

- The protocol names shared stop-and-coordinate paths such as `server.js`, `package.json`, `package-lock.json`, `lib/security-access.js`, `lib/app-auth.js`, Foundation DB/process modules, Foundation verifier/check scripts, and `docs/process/`.
- The protocol names hub lane paths that can be reviewed through the existing hub-work handoff flow, including Sales, Ops, Strategy, Marketing, Canva, Harlan, and Fal-owned files.
- Plan Critic architectural rules call the actual protocol function path and reject a synthetic off-scope Marketing/Canva-style plan that touches shared files without main-session coordination.
- Plan Critic architectural rules reject a synthetic Harlan/Fal tool plan that touches shared security or server files without coordination.
- A coordinated shared-file plan passes the WIP rule only when it names main-session approval, the requested shared files, focused proof, and full ship gate.
- A hub-owned-only plan stays allowed so Sales/Ops/Marketing/Harlan chats can keep working in bounded lanes.
- Dogfood proof recreates the failure from this week: a side chat creates useful code but needs `server.js`, `package.json`, or security route wiring and tries to proceed without Foundation review.
- The focused proof is read-only and report-only. It validates behavior and current sprint state without writing live backlog, sprint, DB, source, or files.

## Definition Of Done

- `lib/process-wip-protocol.js` owns deterministic path classification, shared-file coordination checks, and dogfood fixtures.
- `lib/plan-critic-architectural-rules.js` integrates the WIP evaluator and exposes a `process_wip_shared_file_coordination_required` finding.
- `lib/process-plan-critic.js` synthetic architecture proof includes WIP bad-plan and coordinated-plan cases.
- `scripts/process-wip-protocol-check.mjs` validates approval, durable Plan Critic row, Current Sprint state, package script, module behavior, Plan Critic integration, and read-only proof posture.
- `package.json` exposes `process:process-wip-protocol-check`.
- `docs/process/approvals/PROCESS-WIP-PROTOCOL-001.json` validates at 9.8+.
- `docs/handoffs/2026-05-16-process-wip-protocol-closeout.md` records closeout proof and limits.
- Recent Work has a v2 closeout record under `process-wip-protocol-v1`.

## Details

Reuse existing code, existing docs, existing scripts, Current Sprint, live backlog truth, Plan Critic architecture rules, the hub file ownership matrix, and `process:hub-work-check`. This card does not invent another agent or broad reviewer. It is code that classifies file paths and plan language, then fails closed only for the risky combination: side/hub work plus shared Foundation files plus missing coordination.

The gate decision tree is full because this card touches process docs, Plan Critic rules, package scripts, Current Sprint state, and Foundation closeout records. Static syntax checks run first, the focused proof runs through `npm run process:process-wip-protocol-check -- --json`, and full `process:foundation-ship` runs before push because the blast radius includes Plan Critic and protected process files.

The protocol deliberately does not block hub-owned files by default. A Marketing chat can work on `public/marketing.js` and `lib/marketing-*.js` in a plan-first lane. It must stop when it needs `server.js`, `package.json`, `lib/security-access.js`, `lib/app-auth.js`, Foundation DB, process scripts, verifier paths, or shared source contracts.

## Risks

Risk is over-blocking valid work. Repair path is fail closed, revise the plan with explicit main-session coordination or scope the shared route work into a Foundation card, then rerun the focused proof.

Risk is under-blocking surprise shared-file work. Dogfood proof recreates side-chat shared route/security/package edits without approval and proves Plan Critic rejects them.

Risk is process drag. The evaluator is deterministic, fast, and proportional; hub-owned-only plans remain allowed.

## Tests

- `npm run process:process-wip-protocol-check -- --json`
- `npm run process:plan-critic-architectural-rules-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=PROCESS-WIP-PROTOCOL-001 --planApprovalRef=docs/process/approvals/PROCESS-WIP-PROTOCOL-001.json --closeoutKey=process-wip-protocol-v1`
- `npm run process:fanout-check -- --card=PROCESS-WIP-PROTOCOL-001 --closeoutKey=process-wip-protocol-v1`
- `npm run process:foundation-ship -- --card=PROCESS-WIP-PROTOCOL-001 --planApprovalRef=docs/process/approvals/PROCESS-WIP-PROTOCOL-001.json --closeoutKey=process-wip-protocol-v1 --commitRef=HEAD`

## Not Next

- Do not build Canva features.
- Do not build Marketing Video Lab routes.
- Do not build Fal image editing.
- Do not build Harlan terminal runtime.
- Do not add hub feature work.
- Do not add autonomous dev.
- Do not change external auth, paid-source extraction, Skool, myICOR, YouTube, Drive permissions, or `MEETING-VAULT-ACL-001 Phase B`.
- Do not weaken hub-work protocol or bypass `process:hub-work-check`.

# HUB-001 Plan

## What

Build a lightweight Hub Work Coordination rail so Sales, Ops, Strategy, and future hub chats can keep building while Foundation/process work continues in the main session.

## Why

Hub work should not be treated as part of Foundation, but it does depend on Foundation. Hubs read source contracts, auth, APIs, backlog truth, and proof gates from Foundation. The Sales GLS work proved the gap: useful hub changes can happen in a live meeting, but without a checkpoint they can become orphan code, touch shared files, or race the main Foundation sprint.

## Acceptance Criteria

- A durable hub-work protocol explains that Foundation is the substrate/control plane and hubs are product/workflow layers that tap Foundation through governed APIs and source contracts.
- A file ownership matrix names hub-owned files, Foundation-owned files, and shared stop-and-coordinate files.
- A reusable hub handoff template exists for Sales/Ops/Strategy chats to send back before merge.
- A short prompt template exists for Steve to paste into hub chats before they start building.
- `process:hub-work-check` validates hub, card, changed files, proof commands, and handoff requirements.
- Dogfood proof calls the real validator function path and catches the exact failure we just saw: hub chat edits shared/Foundation/process files or tries to push without card/proof/handoff.
- Dogfood proof rejects substring-only proof. The check must validate structured manifests, ownership classification, and backlog card existence through live backlog/API-backed data, not marker text.
- This sprint closes only `HUB-001`; it does not build hub features.

## Definition Of Done

- Current Sprint opens visibly with `HUB-001` in Scoping, then moves through Sprint Ready, Building Now, and Done This Sprint.
- Plan Critic pass row exists at 9.8 or higher before implementation.
- `docs/process/hub-work-protocol.md`, `docs/process/hub-file-ownership-matrix.json`, `docs/process/hub-chat-prompt-template.md`, and `docs/process/hub-handoff-template.md` exist.
- `lib/hub-work-check.js` and `scripts/process-hub-work-check.mjs` implement the real validation path.
- `npm run process:hub-work-check -- --json` passes with positive and negative dogfood cases.
- If the focused gate fails, the repair path is to leave `HUB-001` in Building Now, fix the specific validator/doc/proof regression, and rerun the focused gate before any ship gate.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.

## Details

Reuse existing code, existing docs, existing scripts, live backlog, and Current Sprint truth:

- Existing backlog truth from `backlog_items` and `getFoundationSnapshot()`.
- Existing process pattern from `process:ship-check`, `process:fanout-check`, and focused process checks.
- Existing protected-path knowledge from `lib/process-git-hooks.js`.
- Existing Sales/Ops/Strategy routes and source-contract boundaries.
- Existing closeout discipline under `docs/handoffs/` and `lib/foundation-build-closeout-records.js`.

The check should be deterministic code, not an agent. A hub chat can draft a plan with an LLM, but the gate that decides whether the file set is allowed should be code.

Gate decision tree: static syntax checks plus focused process proof first, then full `process:foundation-ship` because this card touches protected Foundation process docs, package scripts, closeout records, and a new process check. The focused gate should be fast and stay under 10 seconds for normal hub manifests so Steve can use it during live Sales/Ops/Strategy work without bypass pressure.

The workflow should be:

1. Steve opens a hub chat with the prompt template.
2. The hub chat names the hub, card, target files, proof command, and files it must not touch.
3. If the plan touches shared or Foundation-owned files, the hub chat stops and brings the plan to the main session.
4. Hub chat builds only inside the declared ownership lane.
5. Before merge, hub chat returns the handoff template.
6. Main session runs `process:hub-work-check`, focused proof, and the appropriate ship gate before commit/push.

Operator value: Steve can keep a Sales/Ops/Strategy chat open for live feedback and still know whether that chat is safe to build in parallel. The main session gets a compact manifest to review instead of reconstructing a second chat's file ownership from memory.

## Risks

- Too much process would kill live meeting speed. Keep the hub flow lighter than Foundation sprint flow.
- Too little process repeats today's issue. The gate must fail when card/proof/handoff/ownership is missing.
- Some legitimate hub changes touch shared files like `server.js`. The right behavior is not automatic rejection forever; it is stop-and-coordinate with main session ownership.
- A prompt template alone is not enough. The code check must dogfood failure cases.

## Tests

- `npm run process:hub-work-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:ship-check -- --card=HUB-001 --planApprovalRef=docs/process/approvals/HUB-001.json --closeoutKey=hub-work-coordination-v1`
- `npm run process:fanout-check -- --card=HUB-001 --closeoutKey=hub-work-coordination-v1`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=HUB-001 --planApprovalRef=docs/process/approvals/HUB-001.json --closeoutKey=hub-work-coordination-v1 --commitRef=HEAD`

## Not Next

- Do not build Sales Hub features.
- Do not build Ops Hub features.
- Do not build Strategy Hub feature work.
- Do not change ClickUp, FUB, Google, Skool, YouTube, or paid-auth extraction.
- Do not add autonomous dev.
- Do not split another Foundation monolith in this sprint.

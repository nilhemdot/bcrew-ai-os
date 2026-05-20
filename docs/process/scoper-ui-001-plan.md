# SCOPER-UI-001 Plan

## What

Render gap-resolving Scoper output in Strategy Hub v2.

`SCOPER-UI-001` adds a structured Scoper review panel to the existing Planning Workflow section and links related Scoper output into Strategy route cards. The UI reads existing `intelligence_scoper_outputs` rows through the Strategy Hub payload and shows meeting-readable sections:

- verified / already answered
- partial evidence
- actual gaps
- owner suggestion
- next steps
- clickable evidence pointers
- blocked auto-actions

Closeout key: `scoper-ui-v1`.

## Why

`INTEL-SCOPER-001` shipped the backend Scoper ledger, but Steve still needs the output visible during live Strategy review. Raw JSON or buried DB rows do not help the team decide what is already answered, what is partial, what remains a real gap, who should own it, and what the smallest next action is.

This card turns the existing Scoper outputs into a usable review surface without creating backlog cards automatically or applying actions.

## Definition Of Done

- Strategy Hub v2 payload includes a `planningWorkflow.scoperUi` object built from existing `intelligence_scoper_outputs`.
- The Scoper UI payload has output count, status counts, source IDs, route refs, normalized outputs, evidence pointers, draft review actions, and non-mutation flags.
- Strategy Hub Planning Workflow renders a Scoper Outputs panel with collapsible sections for verified answers, partial evidence, actual gaps, owner suggestion, and next steps.
- Strategy route cards show related Scoper output when route refs connect them.
- Evidence refs render as links or review anchors instead of raw JSON.
- Next-step rows link into the existing review route path; no backlog card is auto-created.
- Focused proof dogfoods a valid Scoper output and rejects proofless or mutating Scoper output.
- Current Sprint marks `SCOPER-UI-001` done and advances active blocker to `SOURCE-001`.
- Focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.

## Acceptance Criteria

- `buildScoperUiSnapshot()` returns at least one real output from live `intelligence_scoper_outputs` and records `outputCount`, status counts, source IDs, and route refs.
- Every output has a meeting-readable title, summary, owner, confidence, status, and proposed card ID.
- Every output renders the five required section keys: `verified`, `partial`, `gaps`, `owner`, and `next_steps`.
- Every output has at least one clickable evidence pointer with a source, fact, atom, chunk, decision, open question, issue, or route ref.
- Every output has a draft review action that opens the existing route review path instead of creating or applying work.
- Dogfood accepts a source-backed proposal-only Scoper output and rejects a proofless or mutating output.
- `public/strategic-execution.js` contains the Scoper panel renderer, section renderer, and route-linked Scoper output renderer.
- The UI exposes blocked auto-actions so Steve can see what the system refused to do automatically.
- Current Sprint advances to `SOURCE-001` only after the focused proof and full gates pass.

## Details

Existing work reused:

- `lib/intel-scoper.js` owns `intelligence_scoper_outputs`.
- `lib/strategy-planning-workflow.js` already reads Scoper outputs and builds Strategy Hub planning queues.
- `/api/strategic-execution/v2` already returns `planningWorkflow`.
- `public/strategic-execution.js` already renders Strategy Hub v2 planning and route review surfaces.
- `public/styles-strategy-sales.css` already owns Strategy Hub v2 layout styles.
- Existing docs reused: `docs/process/intel-scoper-001-plan.md`, `docs/process/intel-thread-context-001-plan.md`, `docs/process/strategy-004-planning-workflow-plan.md`, and `docs/process/strategy-009-package-ux-plan.md`.

The new owner module is `lib/scoper-ui.js`. It normalizes Scoper output into UI-ready sections and provides a behavior evaluator. The Strategy Hub payload consumes that object inside the existing planning workflow. The frontend renders it as compact operational UI, not a marketing page, and keeps route application in the existing review path.

The behavior proof is function/process based:

- `buildScoperUiSnapshot()` builds sectioned output from Scoper rows.
- `evaluateScoperUiSnapshot()` fails if outputs are proofless, missing sections, or mutating.
- `buildScoperUiDogfoodProof()` proves a valid source-backed output passes and a proofless/mutating output fails.
- Live proof confirms at least one real `intelligence_scoper_outputs` row renders through `planningWorkflow.scoperUi`.
- Static file-marker checks only verify UI/package/registry wiring after the function-path behavior proof passes. They are not accepted as the behavioral proof.

Gate decision: full gate. The blast radius touches Strategy Hub payload, frontend rendering, closeout registry, package scripts, Current Sprint truth, and verifier coverage.

Speed boundary: the focused proof must be fast enough to use by default. It reads bounded Scoper rows, local files, and live sprint/backlog truth; it does not run extraction, provider calls, browser automation, screenshots, OCR, transcription, or broad source reads.

## Reuse Existing Work

Existing code:

- `lib/intel-scoper.js`
- `lib/strategy-planning-workflow.js`
- `lib/strategy-shared-comms-routes.js`
- `public/strategic-execution.js`
- `public/styles-strategy-sales.css`

Existing tables:

- `intelligence_scoper_outputs`
- `intelligence_strategic_issues`
- `intelligence_action_routes`

Existing policies:

- Scoper output is proposal-only.
- Action routing remains human-approved.
- No backlog work is auto-created from Scoper output.
- Blocked actions must stay visible in the UI.
- Do not work MEETING-VAULT-ACL-001 Phase B.
- Do not mutate Drive permissions.
- Meeting Vault Phase B and Drive permissions remain outside this card.

## Operator Value

Steve can open Strategy Hub, go to Planning Workflow, and read a Scoper output in plain English:

- what is already answered
- what evidence is partial
- what gap remains
- who likely owns it
- what the next review action is
- what proof backs it
- what the system is not allowed to do automatically

That makes the Scoper useful in a shared-screen planning conversation instead of turning into another report pile. Operator behavior for Steve: open Strategy Hub Planning Workflow during an ownership conversation, expand a Scoper output, read what is verified, partial, still missing, who likely owns it, and which existing review route to open next.

## Risks

- Risk: the UI becomes a hidden mutation path. Repair path: no new POST endpoint or backlog/action apply call; buttons only open existing review paths.
- Risk: raw Scoper JSON leaks into the UI. Repair path: normalized sections and evidence pointers only.
- Risk: route cards and Scoper output drift apart. Repair path: relate route cards through `routeRefs`.
- Risk: this turns into SOURCE-001 or broader source/extraction work. Repair path: Current Sprint advances to `SOURCE-001`; this card only renders Scoper output.
- Risk: proof becomes marker-only. Repair path: focused proof calls `buildScoperUiSnapshot()` and evaluates live Scoper rows before checking file wiring.

## Tests

Focused proof:

- `node --check lib/scoper-ui.js lib/strategy-planning-workflow.js public/strategic-execution.js scripts/process-scoper-ui-check.mjs`
- `npm run process:scoper-ui-check -- --close-card --json`

Full gates:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SCOPER-UI-001 --planApprovalRef=docs/process/approvals/SCOPER-UI-001.json --closeoutKey=scoper-ui-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SCOPER-UI-001 --closeoutKey=scoper-ui-v1`
- `npm run process:foundation-ship -- --card=SCOPER-UI-001 --planApprovalRef=docs/process/approvals/SCOPER-UI-001.json --closeoutKey=scoper-ui-v1 --commitRef=HEAD`

## Not Next

- No auto-created backlog cards from Scoper output.
- No decision approval, lock, apply, send, message, or external write.
- No new extraction, source sync, crawl, browser session, screenshot, OCR, transcription, or provider/model call.
- Do not work MEETING-VAULT-ACL-001 Phase B.
- Do not mutate Drive permissions.
- No Drive permission mutation, credential/key rotation, provider config change, paid/provider access, or browser-auth work.
- No SOURCE-001, SOURCE-002, or SOURCE-003 implementation inside this card.
- No Action Router apply workflow changes.

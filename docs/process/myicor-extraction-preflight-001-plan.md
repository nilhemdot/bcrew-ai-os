# MYICOR-EXTRACTION-PREFLIGHT-001 Plan

## What

Create the MyICOR extraction preflight packet from repo truth only.

This card captures source identity, auth owner, planned access method, course-map boundary, expected content types, permission posture, artifact policy, sensitivity, extraction plan, costs/approval unknowns, and source-specific approval fields for `SRC-MYICRO-001`.

This card is preflight/proof only. It does not open MyICOR, use a private browser profile, log in, crawl, download, screenshot, fetch transcripts, summarize course content, call models, or write downstream outputs.

Not-next boundaries: no live MyICOR extraction, logged-in app access, authorized browser session, course crawl, lesson navigation, transcript fetch, screenshot/keyframe capture, download, summarization, vision analysis, model call, paid/private/community/course auth, Skool/Loom authorized-browser use, copied lesson text, copied transcript text, copied resource links, copied screenshots/keyframes, Research Inbox writes, KB page writes, atom writes, synthesis fact writes, action-route writes, vector/query-index writes, backlog mutation from extracted content, external writes, Drive/Gmail/ClickUp/Slack/Agent Feedback mutation, hidden subagents, invisible extraction workers, or live extraction worker launch.

## Why

Steve wants MyICOR training eventually mined because it may contain useful AI-team, project-management, process-automation, and agent-operating doctrine. The source is paid/private course material, so a normal extractor queue would be unsafe without explicit source-auth proof.

Useful operator behavior: Steve can see exactly what would need approval before MyICOR becomes readable: actor, access method, content types, max scope, artifact storage, privacy/redaction, content-use boundary, downstream use, review cadence, rollback/delete plan, proof command, and expiry/review date. The builder can continue safely without touching the paid app.

## Acceptance Criteria

- `lib/myicor-extraction-preflight.js` builds a deterministic metadata-only preflight snapshot for `SRC-MYICRO-001`.
- The snapshot reuses the existing source contract, source-contract validation profile, connector credential blocker, and course source-auth boundary row.
- The source contract remains `Scoped, not connected` and `Not Signed Off`.
- The `myicro-access` credential row remains blocked and not safe to use.
- The source extraction gate fails closed until owner authorization and content-use proof exist.
- The approval packet draft names every required field from `COURSE-SOURCE-AUTH-BOUNDARY-001` without granting extraction approval.
- The course map is an uninspected metadata skeleton only.
- No course content, lesson text, transcripts, resource links, screenshots, keyframes, summaries, or raw paid material are copied into the repo.
- No private auth, paid auth, browser session, crawl, lesson navigation, transcript fetch, screenshot/keyframe capture, download, model call, downstream write, external write, or hidden subagent starts.
- Dogfood rejects missing source contract, unsafe extraction unblocking, missing approval field, private auth/browser use, live extraction, copied course content, inspected course map, downstream writes, and model calls.
- Focused proof validates live backlog, Plan Critic, Current Sprint, approval, packet doc, verifier coverage, closeout registry, package script, current plan/state, and file budgets.
- Full `foundation:verify` and `process:foundation-ship` pass before push.

## Definition Of Done

Done means `MYICOR-EXTRACTION-PREFLIGHT-001` is live `done`, closeout key `myicor-extraction-preflight-v1` is registered, Current Sprint advances `MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001` in `scoping`, and Recent Builds exposes the closeout after commit.

Command-proven done requires:

- `node --check lib/myicor-extraction-preflight.js lib/foundation-intelligence-audit-verifier.js scripts/process-myicor-extraction-preflight-check.mjs scripts/foundation-verify.mjs`
- `npm run process:myicor-extraction-preflight-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MYICOR-EXTRACTION-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/MYICOR-EXTRACTION-PREFLIGHT-001.json --closeoutKey=myicor-extraction-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=MYICOR-EXTRACTION-PREFLIGHT-001 --closeoutKey=myicor-extraction-preflight-v1`
- `npm run process:foundation-ship -- --card=MYICOR-EXTRACTION-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/MYICOR-EXTRACTION-PREFLIGHT-001.json --closeoutKey=myicor-extraction-preflight-v1 --commitRef=HEAD`

## Details

Existing work to reuse:

- `SRC-MYICRO-001` in `lib/source-contracts.js`.
- `SRC-MYICRO-001` profile in `lib/source-contract-validation-layer.js`.
- `myicro-access` in `lib/connector-credential-registry.js`.
- `COURSE-SOURCE-AUTH-BOUNDARY-001` source-auth matrix and approval fields.
- `EXTRACTION-PARALLEL-WORKER-PROTOCOL-001` no-launch/no-hidden-worker protocol.
- `docs/source-notes/myicro-training.md` as historical/source-note context, not as active approval.

Implementation files:

- `lib/myicor-extraction-preflight.js`
- `scripts/process-myicor-extraction-preflight-check.mjs`
- `lib/foundation-intelligence-audit-verifier.js`
- `lib/foundation-build-closeout-intelligence-records.js`
- `docs/process/myicor-extraction-preflight-001-plan.md`
- `docs/process/myicor-extraction-preflight-001-packet.md`
- `docs/process/approvals/MYICOR-EXTRACTION-PREFLIGHT-001.json`
- `docs/handoffs/2026-05-18-myicor-extraction-preflight-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

Verifier/check posture: `scripts/process-myicor-extraction-preflight-check.mjs` is read-only by default. Live backlog, Plan Critic, and Current Sprint writes require explicit `--apply` or `--close-card` through `process-write-guard.js`. `foundation:verify` remains read-only and must fail closed rather than repair live state.

Large-file posture and split plan: this card touches large shared verifier/docs surfaces only as thin wrapper/source aggregation lines and adds no new responsibility to those large files. All new behavior lives in `lib/myicor-extraction-preflight.js` and `scripts/process-myicor-extraction-preflight-check.mjs`; `lib/foundation-intelligence-audit-verifier.js` only imports/calls the new module, `lib/foundation-build-closeout-intelligence-records.js` only receives a closeout record, and `docs/rebuild/current-plan.md` remains a current-sprint handoff wrapper. Any broader verifier, closeout registry, or rebuild-plan split remains separate Foundation cleanup work.

## Risks

- Risk: the packet gets mistaken for approval to use paid MyICOR access. Mitigation: snapshot exposes `approvedExtraction: false`, connector status `blocked`, and dogfood rejects auth/browser/session side effects.
- Risk: useful course planning accidentally copies paid course material into docs. Mitigation: snapshot/dogfood reject copied lesson text, transcript text, screenshots, keyframes, source-backed summaries, and resource links.
- Risk: course-map work turns into browser scanning. Mitigation: course map remains `not_inspected`; inspected lessons or browser/session source fail closed.
- Risk: outputs bypass extraction-to-KB/atom gates. Mitigation: artifact policy keeps downstream routing blocked until source-specific approval and later proposal-only routing.
- Rollback/repair path: if focused proof, verifier coverage, or full ship fails, leave the card in `executing`, remove closeout/current-plan claims from the branch if needed, and repair the pure preflight before rerunning `--close-card`.

## Tests

Gate decision tree: full gate is required because this changes a Foundation source-auth module, package script, verifier coverage, closeout records, live sprint/backlog state, and current rebuild docs. Static proof is `node --check`; focused proof is `process:myicor-extraction-preflight-check`; final proof is `process:foundation-ship`.

Behavior proof is actual function path, not substring proof: `buildMyicorExtractionPreflightSnapshot()` calls real source-contract, validation, credential, and source-auth boundary checks; `buildMyicorExtractionPreflightDogfoodProof()` mutates fixtures to recreate unsafe MyICOR failure modes.

Speed and file-size budget: module and focused proof stay under 1,500 lines each, approval JSON stays under 60 lines, handoff stays under 100 lines, focused proof should run under two minutes, and full ship must stay within the ship target so the gate remains usable by default.

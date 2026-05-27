# MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001 Plan

## What

Create the Mark M Skool extraction preflight packet from repo truth only.

This card captures source identity, auth owner, planned access/export method, community/course-map boundary, expected content types, permission posture, artifact policy, sensitivity, extraction plan, costs/approval unknowns, and source-specific approval fields for `SRC-SKOOL-001`.

This card is preflight/proof only. It does not open Skool, use a private browser profile, log in, crawl, extract posts/comments/member data, navigate courses, fetch transcripts, summarize community/course content, call models, capture screenshots/keyframes, download, or write downstream outputs.

Not-next boundaries: no live Skool extraction, logged-in community access, authorized browser session, community crawl, course/classroom navigation, post/comment extraction, member-data read, embedded-video extraction, transcript fetch, screenshot/keyframe capture, download, summarization, vision analysis, model call, paid/private/community/course auth, Skool/MyICOR/Loom authorized-browser use, copied posts, copied comments, copied member data, copied lesson text, copied transcript text, copied resource links, copied screenshots/keyframes, Research Inbox writes, KB page writes, atom writes, synthesis fact writes, action-route writes, vector/query-index writes, backlog mutation from extracted content, external writes, Drive/Gmail/ClickUp/Slack/Agent Feedback mutation, hidden subagents, invisible extraction workers, or live extraction worker launch.

## Why

Steve wants Mark M / Skool classes mined for agent-building and operating-system lessons, but Skool is private/community-based source material with explicit platform and content-use risk.

Useful operator behavior: Steve can see exactly what would need approval before Skool becomes readable: community/account, content owner, actor, approved access/export/API/admin/browser path, content types, max scope, artifact storage, privacy/redaction, content-use boundary, downstream use, review cadence, rollback/delete plan, proof command, and expiry/review date. The builder can continue safely without touching Skool.

## Acceptance Criteria

- `lib/mark-m-skool-extraction-preflight.js` builds a deterministic metadata-only preflight snapshot for `SRC-SKOOL-001`.
- The snapshot reuses the existing source contract, source-contract validation profile, connector credential blocker, and course source-auth boundary row.
- The source contract remains `Gap` and `Not Signed Off`.
- The `skool-access` credential row remains blocked and not safe to use.
- The source extraction gate fails closed until owner authorization and content-use proof exist.
- The approval packet draft names every required field from `COURSE-SOURCE-AUTH-BOUNDARY-001` without granting extraction approval.
- The community/course map is an uninspected metadata skeleton only.
- No posts, comments, member data, lesson text, transcripts, resource links, screenshots, keyframes, summaries, or raw private/community material are copied into the repo.
- No private auth, paid auth, browser session, crawl, post/comment extraction, member-data read, embedded-video extraction, transcript fetch, screenshot/keyframe capture, download, model call, downstream write, external write, or hidden subagent starts.
- Dogfood rejects missing source contract, unsafe extraction unblocking, missing approval field, private auth/browser use, live extraction, copied community content, inspected community map, downstream writes, and model calls.
- Focused proof validates live backlog, Plan Critic, Current Sprint, approval, packet doc, verifier coverage, closeout registry, package script, current plan/state, and file budgets.
- Full `foundation:verify` and `process:foundation-ship` pass before push.

## Definition Of Done

Done means `MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001` is live `done`, closeout key `mark-m-skool-extraction-preflight-v1` is registered, Current Sprint advances `MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001` in `scoping`, and Recent Builds exposes the closeout after commit.

Command-proven done requires:

- `node --check lib/mark-m-skool-extraction-preflight.js lib/foundation-intelligence-audit-verifier.js scripts/process-mark-m-skool-extraction-preflight-check.mjs scripts/foundation-verify.mjs`
- `npm run process:mark-m-skool-extraction-preflight-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001.json --closeoutKey=mark-m-skool-extraction-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001 --closeoutKey=mark-m-skool-extraction-preflight-v1`
- `npm run process:foundation-ship -- --card=MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001.json --closeoutKey=mark-m-skool-extraction-preflight-v1 --commitRef=HEAD`

## Details

Existing work to reuse:

- `SRC-SKOOL-001` in `lib/source-contracts.js`.
- `SRC-SKOOL-001` profile in `lib/source-contract-validation-layer.js`.
- `skool-access` in `lib/connector-credential-registry.js`.
- `COURSE-SOURCE-AUTH-BOUNDARY-001` source-auth matrix and approval fields.
- `MYICOR-EXTRACTION-PREFLIGHT-001` as the immediate private/paid source preflight pattern.
- `docs/source-notes/skool-corpus.md` as source-note context, not as active approval.

Implementation files:

- `lib/mark-m-skool-extraction-preflight.js`
- `scripts/process-mark-m-skool-extraction-preflight-check.mjs`
- `lib/foundation-intelligence-audit-verifier.js`
- `lib/foundation-build-closeout-intelligence-records.js`
- `docs/process/mark-m-skool-extraction-preflight-001-plan.md`
- `docs/process/mark-m-skool-extraction-preflight-001-packet.md`
- `docs/process/approvals/MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001.json`
- `docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-mark-m-skool-extraction-preflight-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

Verifier/check posture: `scripts/process-mark-m-skool-extraction-preflight-check.mjs` is read-only by default. Live backlog, Plan Critic, and Current Sprint writes require explicit `--apply` or `--close-card` through `process-write-guard.js`. `foundation:verify` remains read-only and must fail closed rather than repair live state.

Large-file posture and split plan: this card touches large shared verifier/docs surfaces only as thin wrapper/source aggregation lines and adds no new responsibility to those large files. All new behavior lives in `lib/mark-m-skool-extraction-preflight.js` and `scripts/process-mark-m-skool-extraction-preflight-check.mjs`; `lib/foundation-intelligence-audit-verifier.js` only imports/calls the new module, `lib/foundation-build-closeout-intelligence-records.js` only receives a closeout record, and `docs/rebuild/current-plan.md` remains a current-sprint handoff wrapper. Any broader verifier, closeout registry, or rebuild-plan split remains separate Foundation cleanup work.

## Risks

- Risk: the packet gets mistaken for approval to use private Skool access. Mitigation: snapshot exposes `approvedExtraction: false`, connector status `blocked`, and dogfood rejects auth/browser/session side effects.
- Risk: useful community planning accidentally copies private community/course material into docs. Mitigation: snapshot/dogfood reject copied posts, comments, member data, lesson text, transcripts, screenshots, keyframes, source-backed summaries, and resource links.
- Risk: community/course map work turns into browser scanning. Mitigation: map remains `not_inspected`; inspected courses/posts/members or browser/session source fail closed.
- Risk: outputs bypass extraction-to-KB/atom gates. Mitigation: artifact policy keeps downstream routing blocked until source-specific approval and later proposal-only routing.
- Rollback/repair path: if focused proof, verifier coverage, or full ship fails, leave the card in `executing`, remove closeout/current-plan claims from the branch if needed, and repair the pure preflight before rerunning `--close-card`.

## Tests

Gate decision tree: full gate is required because this changes a Foundation source-auth module, package script, verifier coverage, closeout records, live sprint/backlog state, and current rebuild docs. Static proof is `node --check`; focused proof is `process:mark-m-skool-extraction-preflight-check`; final proof is `process:foundation-ship`.

Behavior proof is actual function path, not substring proof: `buildMarkMSkoolExtractionPreflightSnapshot()` calls real source-contract, validation, credential, and source-auth boundary checks; `buildMarkMSkoolExtractionPreflightDogfoodProof()` mutates fixtures to recreate unsafe Skool failure modes.

Speed and file-size budget: module and focused proof stay under 1,500 lines each, approval JSON stays under 60 lines, handoff stays under 100 lines, focused proof should run under two minutes, and full ship must stay within the ship target so the gate remains usable by default.

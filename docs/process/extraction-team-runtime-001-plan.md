# EXTRACTION-TEAM-001 Plan

## What

Build the V1 supervised Extraction Team runtime contract for Foundation. This card ties together the already-shipped safe extraction-prep slices:

- source-auth approval boundary
- public Build Intel queue specs
- extraction runtime readiness gates
- visible parallel worker protocol
- proposal-only output routing
- MyICOR and Mark M Skool private-source preflights

Tight V1 scope: pure runtime contract, deterministic snapshot, dogfood proof, focused proof, verifier coverage, closeout registry, and current plan/state updates. This card creates no extractor, launches no workers, and approves no source access.

Not-next boundaries: no live extraction worker launch, public web lookup, YouTube API call, source crawl, transcript fetch, screenshot/keyframe capture, download, summarization, vision analysis, model call, private/paid/community/course auth, Skool/MyICOR/Loom/authorized-browser access, Research Inbox write, KB page write, atom write, synthesis fact write, action-route write, backlog mutation, vector/query-index write, Drive/Gmail/ClickUp/Slack/Agent Feedback mutation, Drive permission mutation, hidden subagents, or invisible extraction workers.

## Why

Steve wants extraction progress, but the safe next step is not to start live extraction. The repo already has many guarded pieces. Without one operating contract, a builder can confuse metadata-only queue prep, private-source preflight, or visible-worker protocol with permission to run.

This card makes the Extraction Team lane fail closed: the system can report what is ready, what remains blocked, and what must be separately approved before any extractor or worker touches real source content.

Useful operator behavior: Steve can ask "is the Extraction Team safe to start?" and get one source-backed answer that separates ready prep, approval-bound blockers, and forbidden side effects without opening hidden worker lanes.

## Acceptance Criteria

- `lib/extraction-team-runtime.js` builds a runtime snapshot that composes source-auth, queue specs, runtime readiness, visible worker protocol, proposal-output pipeline, and private-source preflights.
- The healthy snapshot is `ready` only when all six required runtime stages exist.
- Public queue specs remain metadata-only, runtime readiness grants no live extraction approval, visible workers remain unlaunched, and output routing remains proposal-only.
- MyICOR and Mark M Skool preflights stay blocked pending source-specific approval.
- Side-effect flags for live workers, web/source lookup, transcript/keyframe/screenshot/download/model work, private auth, downstream writes, external writes, Drive permissions, Agent Feedback auto-send, and hidden subagents stay false.
- Dogfood rejects live run start, missing stage, worker launch, direct downstream write, hidden subagent, and premature private-source approval.
- `lib/foundation-intelligence-audit-verifier.js` includes behavior coverage and dogfood for the Extraction Team runtime.
- `scripts/process-extraction-team-runtime-check.mjs` proves live backlog, Plan Critic, Current Sprint, approval, verifier coverage, package script, closeout registry, current plan/state, and file budgets.
- Full `foundation:verify` and full `process:foundation-ship` pass before push.

## Definition Of Done

Done means `EXTRACTION-TEAM-001` is live `done`, the closeout key is `extraction-team-runtime-v1`, Current Sprint rolls to `FOUNDATION-UP-CAPABILITY-REGISTRY-001` in `scoping`, and Recent Builds exposes the closeout after commit.

Command-proven done requires:

- `node --check lib/extraction-team-runtime.js lib/foundation-intelligence-audit-verifier.js lib/foundation-recent-builds-verifier.js scripts/process-extraction-team-runtime-check.mjs scripts/foundation-verify.mjs`
- `npm run process:extraction-team-runtime-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=EXTRACTION-TEAM-001 --planApprovalRef=docs/process/approvals/EXTRACTION-TEAM-001.json --closeoutKey=extraction-team-runtime-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=EXTRACTION-TEAM-001 --closeoutKey=extraction-team-runtime-v1`
- `npm run process:foundation-ship -- --card=EXTRACTION-TEAM-001 --planApprovalRef=docs/process/approvals/EXTRACTION-TEAM-001.json --closeoutKey=extraction-team-runtime-v1 --commitRef=HEAD`

## Details

Existing work to reuse:

- `COURSE-SOURCE-AUTH-BOUNDARY-001` blocks private, paid, community, course, Loom/private training, and auth-bound extraction without source-specific approval.
- `YOUTUBE-BUILD-INTEL-BATCH-001` prepares metadata-only public queue specs and does not approve transcripts, screenshots, keyframes, model calls, or output routing.
- `EXTRACTION-RUNTIME-READINESS-001` defines source/auth posture, evidence envelope, cost caps, run health, and output gates.
- `EXTRACTION-PARALLEL-WORKER-PROTOCOL-001` defines visible worker/worktree/branch/source-packet/wrap-report requirements without launching workers.
- `EXTRACTION-TO-KB-ATOM-PIPELINE-001` routes outputs only to proposal candidates.
- `MYICOR-EXTRACTION-PREFLIGHT-001` and `MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001` keep private/paid source access metadata-only and blocked.

Implementation files:

- `lib/extraction-team-runtime.js`
- `scripts/process-extraction-team-runtime-check.mjs`
- `lib/foundation-intelligence-audit-verifier.js`
- `lib/foundation-recent-builds-verifier.js`
- `lib/foundation-build-closeout-intelligence-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `docs/process/extraction-team-runtime-001-plan.md`
- `docs/process/approvals/EXTRACTION-TEAM-001.json`
- `docs/handoffs/2026-05-18-extraction-team-runtime-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

Verifier/check posture: `scripts/process-extraction-team-runtime-check.mjs` is read-only by default. Live backlog, Plan Critic, and Current Sprint writes require explicit `--apply` or `--close-card` posture through `process-write-guard.js`; no-flag writes are blocked, and verifier/check paths fail closed instead of repairing live state. For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

Large-file posture: do not add behavior to `scripts/foundation-verify.mjs`. Keep the runtime contract in `lib/extraction-team-runtime.js` and the behavior coverage in the existing intelligence/audit verifier module. `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` get only thin current-sprint closeout updates.

## Risks

- Risk: this card is mistaken for live extraction approval. Mitigation: snapshot exposes `liveExtractionApprovedByThisCard: false`, no worker launch, no downstream write approval, and dogfood for live-run flags.
- Risk: hidden subagents return through the extraction lane. Mitigation: hidden worker/subagent spawns are explicit failure cases and the visible-worker protocol remains required.
- Risk: private/paid source preflights silently unlock. Mitigation: MyICOR and Skool snapshots must remain blocked and approval-specific.
- Risk: proposal outputs become direct writes. Mitigation: output routing must remain proposal-only and direct-write dogfood fails closed.
- Risk: historical Recent Builds proof rows still assume `EXTRACTION-TEAM-001` is only scoped. Mitigation: update the Recent Builds verifier expectation to allow the old Slack proof row to remain valid after this card moves to `done`.
- Rollback/repair path: if focused proof, verifier coverage, or full ship regresses, leave the card in `executing` or return it with the failing invariant, remove the closeout/current-plan claim from the branch, and repair the pure contract before re-running `--close-card`. Do not patch live DB rows or skip verifier failures.

## Tests

Gate decision tree: full gate is required because this changes a Foundation behavior module, package script, verifier coverage, closeout records, live sprint/backlog state, and current rebuild docs. Static proof is `node --check`; focused proof is `process:extraction-team-runtime-check`; final proof is `process:foundation-ship`.

Behavior proof is actual function path, not substring proof: `buildExtractionTeamRuntimeSnapshot()` calls the shipped component snapshots and validates the composed runtime gates. `buildExtractionTeamRuntimeDogfoodProof()` mutates fixtures to recreate the exact unsafe failure modes and proves they fail closed.

Speed and file-size budget: module and focused proof stay under 1,500 lines each, approval JSON stays under 50 lines, handoff stays under 100 lines, focused proof should run under two minutes, and full ship must stay inside the existing ship target so the gate is fast enough to use by default.

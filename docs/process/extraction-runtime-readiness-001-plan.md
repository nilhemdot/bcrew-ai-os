# EXTRACTION-RUNTIME-READINESS-001 Plan

## What

Build the Foundation-owned extraction runtime readiness layer before any new extractor queue packet or live extraction work. V1 is a queue/spec/preflight contract only: it validates source/auth posture, extractor queue item shape, evidence envelope fields, runtime/cost caps, run health, and proposal-only output posture. It also exposes a read-only `/api/foundation/extraction-runtime-readiness` route for agents and Foundation surfaces.

Tight V1 scope:

- `lib/extraction-runtime-readiness.js` owns the readiness snapshot, queue item validation, evidence envelope validation, proposal-only output gate, dogfood proof, and existing-work summary.
- `lib/foundation-runtime-read-routes.js` exposes the narrow readiness route.
- `lib/foundation-extraction-runtime-verifier.js` and `scripts/foundation-verify.mjs` wire readiness into full verifier coverage.
- The focused proof creates/updates the live card, Current Sprint overlay, Plan Critic row, and proof checks.

Split plan: `server.js` stays a thin wrapper with no new responsibility; route behavior lives in `lib/foundation-runtime-read-routes.js` and `lib/extraction-runtime-readiness.js`. Split plan: `scripts/foundation-verify.mjs` is touched only as source/API aggregation and passes the payload into the extraction-runtime verifier; all new readiness behavior lives in the new module and focused script, not the verifier root.

Main session approved active sprint scope: Foundation owns these shared files in this sprint, requested shared files are declared in this plan, and no side/hub chat commits or pushes this work.

Not next: No live extraction. No auth-required extraction, no paid extraction without explicit Steve approval, no OAuth, no connector auth, no Harlan/Fal/voice/Canva/OpenHuman work, no broad UI redesign, no Drive permission mutation, no live Agent Feedback auto-send, no atom promotion, and no backlog mutation from extracted content.

## Why

Foundation now has source-contract validation and loading architecture in place. The next risk is letting extractor work start from chat intent instead of governed runtime truth. This card gives Steve and future builders a concrete readiness answer: which targets are source-bound, which are blocked, whether any run is active/stale, what evidence a run must produce, what cost/spend caps exist, and whether outputs remain proposal-only.

Useful operator behavior: before Steve approves a video/source extraction packet, he can inspect one readiness route and see whether the runtime is safe, blocked, or missing proof instead of waiting for a builder to discover the problem mid-sprint.

## Acceptance Criteria

- A valid no-auth proposal queue item passes readiness.
- A missing/invalid source-contract readiness state fails.
- A missing auth posture fails.
- An auth-required source cannot become an active extraction target.
- Active targets require explicit runtime/cost caps.
- Paid/private extraction without Steve approval fails.
- Evidence envelopes require source ID, source URL, timestamp, transcript or screenshot reference, anchors, model/provider, cost, confidence, and governed output target.
- Proposal output routes to Research Inbox/proposed atom state only and cannot write backlog or create promoted atoms.
- `/api/foundation/extraction-runtime-readiness` returns a compact read-only readiness payload and does not start live extraction.
- `foundation:verify` fails if the readiness contract, route, focused proof, or closeout coverage is missing.
- Proof command `npm run process:extraction-runtime-readiness-check -- --json` returns pass or revise/fail with check details for `EXTRACTION-RUNTIME-READINESS-001`.
- Route performance budget: `/api/foundation/extraction-runtime-readiness` stays under 1500 ms and under 250 KB; route proof command uses `curl --max-time 5 -w "%{time_total} %{size_download}" http://localhost:3000/api/foundation/extraction-runtime-readiness`.

## Definition Of Done

- Live backlog card is executing/done and the Current Sprint overlay has plan ref, approval ref, closeout key, proof commands, existing-work check, and not-next boundaries.
- `docs/process/approvals/EXTRACTION-RUNTIME-READINESS-001.json` validates at 9.8+ against this plan snapshot.
- `npm run process:extraction-runtime-readiness-check -- --json` passes.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify` passes.
- `npm run process:foundation-ship -- --card=EXTRACTION-RUNTIME-READINESS-001 --planApprovalRef=docs/process/approvals/EXTRACTION-RUNTIME-READINESS-001.json --closeoutKey=extraction-runtime-readiness-v1 --commitRef=HEAD` passes.
- Closeout is registered and pushed with the commit.
- Approval data record budget: `docs/process/approvals/EXTRACTION-RUNTIME-READINESS-001.json` stays under 60 lines.
- Closeout report artifact budget: `docs/handoffs/2026-05-17-extraction-runtime-readiness-closeout.md` stays under 120 lines.

## Details

Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth. Existing code/docs/scripts/backlog truth to reuse:

Existing work to reuse:

- `SOURCE-CONTRACT-VALIDATION-LAYER-001` owns source/auth/extraction posture and auth-required blocking.
- `source_crawl_targets`, `source_crawl_items`, and `/api/foundation/extraction-control` own existing queue/run status.
- `MULTIMODAL-EXTRACTOR-001` owns extractor input/evidence contract posture.
- `RESEARCH-INBOX-001` owns proposal-only output before backlog mutation.
- Runtime read routes already own narrow Foundation runtime API surfaces.

Behavior proof must call the real module and API path. Substring checks are supporting coverage only after the function/API dogfood passes.

## Risks

- Risk: existing scheduled archive targets are misclassified as unsafe because readiness treats source-crawl status values as queue-only values. Repair path: accept current runtime statuses like `active` and `planned` while still blocking auth-required or paid/unapproved targets.
- Risk: a future queue packet bypasses source-contract validation. Repair path: `validateExtractionRuntimeQueueItem` and full verifier fail closed.
- Risk: a future proof starts live extraction. Repair path: focused proof is read-only by default and checks the readiness route/run summary for `runningRuns=0`.
- Risk: proposal output becomes automatic backlog/atom mutation. Repair path: Research Inbox proposal proof must keep `proposalOnly=true`, `writesBacklog=false`, and `createsPromotedAtoms=false`.

## Tests

Gate decision tree: static checks are not enough because this is a Foundation behavior substrate. Focused proof is required while iterating, and the full ship gate is required before push.

Focused gate:

- `node --check lib/extraction-runtime-readiness.js lib/foundation-extraction-runtime-verifier.js lib/foundation-runtime-read-routes.js scripts/process-extraction-runtime-readiness-check.mjs scripts/foundation-verify.mjs`
- `npm run process:extraction-runtime-readiness-check -- --json`

Full gates:

- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=EXTRACTION-RUNTIME-READINESS-001 --planApprovalRef=docs/process/approvals/EXTRACTION-RUNTIME-READINESS-001.json --closeoutKey=extraction-runtime-readiness-v1 --commitRef=HEAD`

Speed bound: the focused proof is fast and should stay under 2 minutes. It should not run live extraction or full verifier while debugging.

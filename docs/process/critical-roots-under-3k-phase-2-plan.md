# CRITICAL-ROOTS-UNDER-3K-PHASE-2 Plan

## What
Continue the staged critical-root cleanup by splitting the live API snapshot loading responsibility out of `scripts/foundation-verify.mjs`.

This sprint keeps `scripts/foundation-verify.mjs` as the verifier orchestration root and moves the read-only Foundation Hub/source-truth/API snapshot loader into `lib/foundation-verify-live-api-snapshot.js` without route behavior changes. The extracted module owns the live API endpoint list, local-doc guard probes, derived Hub snapshot, extraction-control arrays, and focused split evaluator/dogfood proof.

## Why
`scripts/foundation-verify.mjs` is the highest-risk remaining critical root at 4,998 lines before this sprint. It is below the emergency 5,000-line line but still combines verifier orchestration with source loading, API fetch coordination, and domain checks.

The useful operator value is future verifier work with a smaller root and a named place for live read snapshot behavior, so Steve can see that the verifier reads the same Foundation/source truth while the root keeps shrinking. This unlocks better speed and quality for Foundation rebuild work because Steve should not have to trust another arbitrary line cut; the split has a clear owner and preserves read-only behavior.

## Acceptance Criteria
- Live backlog card `CRITICAL-ROOTS-UNDER-3K-PHASE-2` exists and owns this sprint.
- `scripts/foundation-verify.mjs` delegates live API snapshot loading through `loadFoundationVerifyLiveApiSnapshot({ baseUrl })`.
- `lib/foundation-verify-live-api-snapshot.js` owns the Foundation/API/local-doc snapshot responsibility and stays below 1,500 lines.
- The verifier root line count decreases from the 4,998-line baseline and stays below the Phase 2 budget.
- The split does not change route behavior, connector writes, DB schema, Harlan/Fal/voice/Canva work, hub feature work, or Steve local mockup assets.
- Focused proof fails if the root still owns direct live API fetches, the module misses required endpoints or local-doc guard probes, the module exceeds 1,500 lines, the package script is missing, or the root line count is not reduced.
- Backlog hygiene, focused proof, `foundation:verify`, and full `process:foundation-ship` pass before push.

## Definition Of Done
- Add `lib/foundation-verify-live-api-snapshot.js`.
- Update `scripts/foundation-verify.mjs` to delegate live API snapshot loading.
- Add `scripts/process-critical-roots-under-3k-phase-2-check.mjs` and package script `process:critical-roots-under-3k-phase-2-check`.
- Add `docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-2.json`.
- Add verifier coverage for `CRITICAL-ROOTS-UNDER-3K-PHASE-2`.
- Add closeout registry record `critical-roots-under-3k-phase-2-v1`.
- Write closeout handoff and close the live card only after focused proof, backlog hygiene, `foundation:verify`, and full Foundation ship gate pass.

## Details
Existing code to reuse: `foundation:verify`, `lib/foundation-verify-runtime-support.js` fetch helpers, `SOURCE_LIFECYCLE_API_PATH`, approval integrity, Plan Critic runs, build closeout registry, `backlog:hygiene`, and `process:foundation-ship`.

Existing docs to reuse: `docs/handoffs/2026-05-17-foundation-next-sprint-queue.md`, the Phase 1 critical roots closeout, the file-size engineering standard plan, current plan/current state, and live backlog truth.

Gate decision tree: static proof is `node --check`; focused proof is `process:critical-roots-under-3k-phase-2-check`; full proof is required because the sprint touches `scripts/foundation-verify.mjs`, `package.json`, process docs, verifier coverage, and the closeout registry. Blast radius is Foundation verification/process only. The implementation remains read-only with no route behavior changes and no external write job reruns.

The focused proof calls the real split evaluator and the real live API snapshot loader. It dogfoods bad fixtures: unchanged root line count, oversized module, direct root live API fetch, missing endpoint, and missing package script must all fail closed. The focused proof remains fast enough to use by default because it reads repo files, checks one live read-only snapshot, and leaves the heavier full verifier to `process:foundation-ship`.

Split/no-new-responsibility plan: this sprint touches the over-budget verifier root only to remove the live API snapshot responsibility and delegate it to a named module. This is a no new responsibility change for `scripts/foundation-verify.mjs`; no new verifier domain checks are added to the root.

File-size budget: the extracted hand-written module must stay below 1,500 lines. The verifier root must decrease from 4,998 and stay under the Phase 2 root budget. The approval JSON has an explicit data record budget and must stay below 3,000 lines. No generated files, generated payloads, or report artifacts are added.

Coordination: Steve explicitly started this sprint with main session approval on branch `foundation/system-health-red-to-green-001`; no side or hub worker owns these shared Foundation files. If another builder needs the verifier, package scripts, process docs, or closeout registry during this active sprint scope, they must coordinate before editing.

## Risks
The main risk is creating a fake split that only moves lines without owning a real responsibility. The repair path is to fail focused proof unless the root delegates the live API snapshot and the module owns the endpoints, local-doc guard probes, and derived snapshot shape.

Another risk is accidentally changing verifier behavior by reordering or broadening API reads. The repair path is to keep the loader read-only, reuse existing fetch helpers, run the full verifier, and route any behavioral failure before closing.

## Tests
Run:

- `node --check scripts/foundation-verify.mjs lib/foundation-verify-live-api-snapshot.js scripts/process-critical-roots-under-3k-phase-2-check.mjs lib/foundation-verify-coverage-card-ids.js lib/foundation-build-closeout-size-records.js`
- `npm run process:critical-roots-under-3k-phase-2-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --failures-only`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-2 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-2.json --closeoutKey=critical-roots-under-3k-phase-2-v1 --commitRef=HEAD`

## Not Next
Do not start `FOUNDATION-SURFACE-UPDATES-001`. Do not do UI polish, hub feature work, Canva/Fal/voice/Harlan runtime work, connector auth work requiring Steve, Agent Feedback live auto-send, DB schema changes, route behavior changes, broad feature work, or Steve local mockup asset work. Do not start another root split inside this sprint after Phase 2 ships.

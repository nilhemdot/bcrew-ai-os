# CRITICAL-ROOTS-UNDER-3K-PHASE-3 Plan

## What
Continue staged critical-root cleanup by splitting the document strategy surface responsibility out of `server.js`.

This sprint keeps `server.js` as the route/orchestration root and moves markdown document allowlisting, doc metadata, document edit helpers, git doc status helpers, and business strategy PDF generation into `lib/server-document-strategy-surface.js` without route behavior changes.

## Why
`server.js` is still a high-risk critical root at 4,831 lines before this sprint. It mixes route registration with a large cohesive document strategy surface: `/api/doc` helpers, doc inventory metadata, pending-doc-update helpers, git status helpers, and `/foundation/export/strategy.pdf` PDF rendering helpers.

The useful operator value is a smaller server root with a named ownership boundary. Steve should not have to trust a line-count cut; the split must prove that a real document/PDF helper domain moved and that the route behavior stayed in place.

Operator behavior unlocked: Steve and the team keep the same real workflow for reading docs, reviewing pending doc updates, and exporting the strategy PDF, while future Foundation route work gets better speed and quality because document/PDF behavior is no longer buried inside the server monolith.

## Acceptance Criteria
- Live backlog card `CRITICAL-ROOTS-UNDER-3K-PHASE-3` exists and owns this sprint.
- `server.js` imports and instantiates `createServerDocumentStrategySurface`.
- `server.js` no longer defines the moved document strategy helper functions inline.
- `lib/server-document-strategy-surface.js` owns markdown allowlisting, document metadata, strategy PDF generation, heading replacement/diff helpers, hash/git helpers, and focused split dogfood proof.
- The extracted hand-written module stays below 1,500 lines.
- `server.js` line count decreases from the 4,831-line baseline and stays below the Phase 3 budget.
- Focused proof calls the extracted module, generates a synthetic PDF, proves private local docs stay blocked, rejects arbitrary line movement, rejects a root that still owns the moved domain, and rejects missing package-script/oversized-module fixtures.
- The sprint does not change route behavior, DB schema, connector auth, hub feature work, UI polish, Harlan/Fal/voice/Canva work, Agent Feedback send jobs, or Steve local mockup assets.
- Backlog hygiene, focused proof, `foundation:verify`, and full `process:foundation-ship` pass before push.

## Definition Of Done
- Add `lib/server-document-strategy-surface.js`.
- Update `server.js` to delegate the document strategy helper domain while keeping routes and route module calls unchanged.
- Add `scripts/process-critical-roots-under-3k-phase-3-check.mjs` and package script `process:critical-roots-under-3k-phase-3-check`.
- Add `docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-3.json`.
- Add verifier coverage for `CRITICAL-ROOTS-UNDER-3K-PHASE-3`.
- Add closeout registry record `critical-roots-under-3k-phase-3-v1`.
- Write closeout handoff and close the live card only after focused proof, backlog hygiene, `foundation:verify`, and full Foundation ship gate pass.

## Details
Existing code to reuse: `server.js` route wiring, existing route modules, approval integrity, Plan Critic runs, build closeout registry, `backlog:hygiene`, and `process:foundation-ship`.

Existing docs to reuse: the Phase 1 and Phase 2 critical roots closeouts, the file-size engineering standard plan, the current sprint/backlog truth, and Foundation closeout registry convention.

Gate decision tree: static proof is `node --check`; focused proof is `process:critical-roots-under-3k-phase-3-check`; full proof is required because the sprint touches `server.js`, `scripts/foundation-verify.mjs`, `package.json`, process docs, verifier coverage, and the closeout registry. Blast radius is Foundation server document helpers and process proof only. The implementation remains read-only for proof and does not rerun external-write jobs.

The focused proof calls the real module factory and real helper functions. It dogfoods bad fixtures: unchanged root line count, oversized module, root still defining `buildBusinessStrategyPdf`, missing PDF builder, arbitrary line movement, and missing package script must all fail closed. It is proportional and fast enough to use by default, targeting under 2 minutes before the heavier full ship gate.

Split/no-new-responsibility plan: this sprint removes an existing responsibility from `server.js` and gives it one named module. This is a no new responsibility change for `server.js`: it keeps existing route definitions and delegates helper ownership outside the monolith. It does not add new routes, new write paths, new DB schema, new connector behavior, or product features.

Route performance budget: `/api/doc` and `/foundation/export/strategy.pdf` keep their current payload semantics. `/api/doc` must stay a small JSON document response under 200 KB for the strategy docs used in proof; the PDF route must return `application/pdf` and stay a generated attachment. The route proof command is covered by the focused module PDF generation plus full `foundation:verify`; if route behavior regresses, use `curl --max-time 5 -w '%{time_total} %{size_download}'` against the changed route before closeout.

Process-check apply posture: `scripts/process-critical-roots-under-3k-phase-3-check.mjs` is read-only by default and performs no live backlog, sprint, DB, or file writes. Any future process-check mutation for this card would require explicit `--apply` posture and no-flag writes must be blocked.

File-size budget: the extracted hand-written module must stay below 1,500 lines. `server.js` must decrease from 4,831 lines and stay under the Phase 3 root budget. The approval JSON has an explicit data record budget and must stay below 3,000 lines. No generated files, generated payloads, or report artifacts are added.

Coordination: Steve explicitly started this sprint on branch `foundation/system-health-red-to-green-001`; no side or hub worker owns these shared Foundation files. If another builder needs `server.js`, package scripts, process docs, or the closeout registry during this active sprint scope, they must coordinate before editing.

## Risks
The main risk is a fake split that moves lines without a domain boundary. The repair path is to fail focused proof unless the root delegates the document strategy surface and the module owns PDF, markdown, metadata, diff, hash, and git helper behavior.

Another risk is accidentally changing route behavior by moving helper code. The repair path is to keep route definitions in `server.js`, reuse the same call sites, run static syntax checks, run focused proof against real helper calls, and run full `foundation:verify`.

## Tests
Run:

- `node --check server.js lib/server-document-strategy-surface.js scripts/foundation-verify.mjs scripts/process-critical-roots-under-3k-phase-3-check.mjs lib/foundation-verify-coverage-card-ids.js lib/foundation-build-closeout-size-records.js`
- `npm run process:critical-roots-under-3k-phase-3-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --failures-only`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-3 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-3.json --closeoutKey=critical-roots-under-3k-phase-3-v1 --commitRef=HEAD`

## Not Next
Do not start another sprint after this sprint ships. Do not start `FOUNDATION-SURFACE-UPDATES-001`. Do not do UI polish, hub feature work, Canva/Fal/voice/Harlan runtime work, connector auth work requiring Steve, Agent Feedback live auto-send, DB schema changes, route behavior changes, broad feature work, or Steve local mockup asset work.

# ENGINE-001 Planning Attrition Input Plan

## What

Make planning attrition a first-class Agent Engine input without rebuilding the Freedom model.

- Card: `ENGINE-001`
- Title: Make planning attrition a first-class engine input
- Closeout key: `engine-001-planning-attrition-input-v1`
- Owner: Foundation Data
- Next card after close: `MEMORY-005`

## Why

The Agent Engine already reads the planning attrition assumption from the BHAG builder, but it was still too easy to treat it as a buried requirement detail instead of an editable planning input.

Operator value: Steve can open the Agent Engine support doc or Strategy source-backed values panel and see the attrition assumption as an input that affects recruiting pace, while also seeing live attrition pressure as a separate operating signal. This unlocks a useful workflow: planning assumptions can be reviewed without confusing them with live attrition performance.

## Acceptance Criteria

- `Planning Attrition Assumption` appears in the `Engine Inputs` source snapshot group.
- The row is backed by `SRC-FREEDOM-BHAG-001`, has a nonblank value, has an `asOf` date, and names the BHAG builder in its detail.
- `Planning Attrition Assumption` remains visible in `Current Requirement` so required recruiting pace context is preserved.
- `Live Attrition Pressure` remains separate and backed by `SRC-FREEDOM-ENGINE-001`.
- `public/doc.js` and `public/foundation-doc-markdown-renderers.js` render planning attrition in the Agent Engine input card.
- Focused dogfood rejects missing input visibility and merged planning/live attrition semantics.

## Definition Of Done

- `process:engine-001-check` reports `status=healthy`.
- Plan Critic reports pass at 9.8+.
- Live Agent Engine source snapshot contains one Engine Inputs planning attrition row and one Current Requirement planning attrition row.
- `ENGINE-001` is `done`, Current Sprint marks it `done_this_sprint`, and `MEMORY-005` becomes the active blocker.
- `foundation:verify` and `process:foundation-ship` pass from committed repo truth.

## Details

Existing code, docs, scripts, and live backlog truth reused:

- Existing code: `lib/foundation-strategy-source-snapshots.js`, `public/doc.js`, and `public/foundation-doc-markdown-renderers.js`.
- Existing docs: `docs/strategy/agent-engine.md`, `docs/rebuild/freedom-rebuild-blueprint.md`, and `docs/source-notes/freedom-sheet.md`.
- Existing scripts: `foundation:verify`, `process:foundation-ship`, `backlog:hygiene`, repeated-failure gate, and this focused proof script.
- Live backlog and Current Sprint truth for `ENGINE-001`, `MEMORY-005`, and the active sprint overlay.
- `lib/foundation-strategy-source-snapshots.js` owns `getLiveAgentEngineSourceSnapshot()`.
- `public/doc.js` and `public/foundation-doc-markdown-renderers.js` own Agent Engine doc card rendering.
- `docs/strategy/agent-engine.md` owns the operator explanation.
- `docs/rebuild/freedom-rebuild-blueprint.md` already names `ENGINE-001` as the planning-attrition gap.
- `DATA-001`, `OPS-003`, Current Sprint, Plan Critic, backlog hygiene, repeated-failure gate, `foundation:verify`, and `process:foundation-ship`.
- Live backlog truth for `ENGINE-001`, `MEMORY-005`, and the current sprint overlay.

Behavior proof path:

- Actual function path: `getDocSourceSnapshot('docs/strategy/agent-engine.md')` reads the actual source-backed Agent Engine rows.
- `evaluateEngine001PlanningAttrition()` validates source ID, value, detail, `asOf`, group placement, and planning-vs-live attrition separation.
- `buildEngine001DogfoodProof()` proves a missing Engine Inputs row and a merged live/planning attrition row fail closed.
- The real behavior under test is source snapshot row production plus renderer inclusion; the focused proof checks function output and renderer paths before the API/ship gates run.
- No substring-only proof is accepted: the focused proof reads live source snapshot rows and also checks renderer/source files for the UI path.
- Gate decision tree: static syntax checks first, focused `process:engine-001-check` second, and full `process:foundation-ship` before push because this touches source snapshot code, frontend renderers, Current Sprint truth, package scripts, closeout registry, and docs. The focused proof should stay under 2 minutes.

## Risks

- Risk: this turns into a broad Agent Engine rebuild.
  - Mitigation: only source snapshot placement, doc rendering, proof, and closeout truth are in scope.
- Risk: planning attrition and live attrition get merged.
  - Mitigation: proof requires planning attrition from `SRC-FREEDOM-BHAG-001` and live attrition from `SRC-FREEDOM-ENGINE-001`.
- Risk: a builder hardcodes live attrition values in docs.
  - Mitigation: markdown explains the boundary; live values stay in source snapshots.
- Repair path if proof fails: fix the source snapshot/renderer path when it is a code mapping problem. If the failure requires Google Sheet edits, ClickUp, FUB, finance, credential, provider, Drive permission, external send, or broad Freedom rebuild work, park that unsafe action with owner/reason/next trigger and continue the next safe card.

## Tests

- `node --check lib/foundation-strategy-source-snapshots.js lib/engine-001-planning-attrition-input.js scripts/process-engine-001-check.mjs public/doc.js public/foundation-doc-markdown-renderers.js`
- `npm run process:engine-001-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=ENGINE-001 --planApprovalRef=docs/process/approvals/ENGINE-001.json --closeoutKey=engine-001-planning-attrition-input-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=ENGINE-001 --closeoutKey=engine-001-planning-attrition-input-v1`
- `npm run process:foundation-ship -- --card=ENGINE-001 --planApprovalRef=docs/process/approvals/ENGINE-001.json --closeoutKey=engine-001-planning-attrition-input-v1 --commitRef=HEAD`

Dogfood must reject:

- missing `Engine Inputs` planning attrition row
- planning attrition without BHAG source provenance
- merged planning and live attrition semantics
- renderer path that omits the attrition input card

## Not Next

- No Google Sheet formula edits or spreadsheet-era blind cell rewrites.
- No ClickUp, FUB, finance, credential, OAuth, provider, Drive permission, external send, or public exposure mutation.
- No full Agent Engine rebuild, bonus-system rebuild, planning model redesign, or new source extraction.
- No hardcoded live planning attrition values in markdown or frontend fixtures.
- No collapse of planning attrition and live attrition into one metric.

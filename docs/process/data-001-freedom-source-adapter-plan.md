# DATA-001 Freedom Source Adapter Plan

## What

Close `DATA-001` by adding a read-only Freedom Sheet source adapter and schema-drift monitor.

The adapter maps stable Freedom source IDs to the live workbook tabs/ranges and exposes the status through the existing sheet-structure data-health surface:

- `SRC-FREEDOM-TEAM-001`
- `SRC-FREEDOM-COMMUNITY-001`
- `SRC-FREEDOM-COMMUNITY-REV-001`
- `SRC-FREEDOM-ENGINE-001`
- `SRC-FREEDOM-BHAG-001`

Closeout key: `data-001-freedom-source-adapter-v1`.

## Why

The Freedom Sheet is signed off for current meaning, but downstream work should not trust blind cell references. Before OPS, Engine, and source-backed dashboard work continue, Foundation needs a small adapter that says which source ID owns each Freedom range and whether the live workbook schema still matches the signed-off baseline.

## Definition Of Done

- Freedom source IDs map to explicit workbook, tab, range, owner, and trigger metadata.
- Delegated Google Sheets structure checks feed a Freedom schema-drift snapshot.
- Missing source IDs, missing sheets, failed headers, or missing watched cells fail closed.
- `/api/sheets/structure-status` returns `freedomSheetAdapter` and `dataHealth.freedomSheetAdapter`.
- Current State sheet watch explains source-ID/schema-drift posture in plain English.
- The Freedom source note records the DATA-001 adapter boundary.
- No source system mutation, spreadsheet writes, Drive permission mutation, ClickUp/FUB/finance writes, provider calls, browser auth, or broad extraction occurs.
- Focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.
- Current Sprint advances to `OPS-003`.

## Acceptance Criteria

- `buildFreedomSourceAdapterContract()` returns all five Freedom source IDs with readable source-contract posture.
- `buildFreedomSheetSchemaDriftSnapshot()` returns healthy when live sheet structure matches the baseline.
- Dogfood rejects:
  - missing source IDs,
  - missing header/range checks,
  - stale schema accepted silently,
  - source mutation allowed,
  - missing data-health exposure,
  - live-value hardcoding.
- The existing `sheets:verify` path remains read-only and now includes Freedom adapter data-health output.
- Any remaining Freedom drift row includes owner, source ID, reason, and next action.

## Details

The card reuses existing sheet proof rather than adding another Google integration path:

- `scripts/sheets-structure-verify.mjs` already performs delegated read-only structure checks against the Freedom workbook.
- `lib/source-contracts.js` already owns the five Freedom source contracts.
- `/api/sheets/structure-status` already exposes sheet structure status to the Foundation UI.
- Current State already has a Sheet structure watch panel.

The new module `lib/data-001-freedom-source-adapter.js` turns those existing pieces into a source-ID adapter:

- source ID -> workbook/tab/range/owner/trigger
- live sheet structure result -> schema drift snapshot
- drift snapshot -> data-health output and closeout proof

Behavioral Proof: the focused proof calls the actual functions `buildFreedomSourceAdapterContract()`, `buildFreedomSheetSchemaDriftSnapshot()`, `evaluateData001LiveStatus()`, and `buildData001DogfoodProof()`. The proof also runs the live delegated sheet-structure verifier. No substring-only proof is accepted; source-marker checks are only supporting artifact checks after the function path proves the adapter behavior.

Gate decision tree: this is a full-gate card by blast radius because it touches the sheet structure API payload, Current State renderer copy, package scripts, live backlog/Current Sprint truth, closeout registry, and verifier coverage. Static syntax checks run first. Focused proof runs second through `process:data-001-check`. Full proof then runs System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` before push.

Speed bound: the focused proof should stay under 2 minutes and remain thin enough to use by default. It performs one bounded delegated sheet-structure read and local function checks; the slower full ship gate runs only after the focused proof is green.

## Reuse Existing Work

Existing code reused:

- `scripts/sheets-structure-verify.mjs`
- `lib/google-delegated.js`
- `lib/source-contracts.js`
- `/api/sheets/structure-status`
- `public/foundation-current-state-renderers.js`
- `lib/process-plan-critic.js`
- Current Sprint and ship gates

Existing docs reused:

- `docs/source-notes/freedom-sheet.md`
- `docs/rebuild/freedom-rebuild-blueprint.md`
- `docs/strategy/operating-truths.md`
- `docs/source-registry.md`

Existing cards reused:

- `FOUNDATION-004`
- `OPS-003`
- `ENGINE-001`
- `DATA-003`

## Operator Value

Steve can now trust the Freedom sheet watch as more than "the workbook exists." It says whether the signed-off Freedom source ID rows still match the live workbook structure. If the sheet changes, the system names the exact source ID and next repair action before downstream dashboards or adapters silently drift. This unlocks higher-quality OPS, Engine, and data-health work because builders can reuse the adapter instead of rediscovering Freedom header meaning every card.

## Risks

- **Source mutation risk:** this card is read-only. No spreadsheet writes or Drive mutations.
- **Cell-reference risk:** source IDs own the adapter rows; cell/header checks detect drift instead of hiding it.
- **Scope creep risk:** no OPS rollup repair, Agent Engine rebuild, DATA-003 UI build, extraction, or live value hardcoding.
- **Runtime risk:** delegated Google Sheets reads may fail. If they do, the card reports degraded proof and parks live-read-dependent closure rather than mutating sources.

Rollback:

- Remove the adapter output from `scripts/sheets-structure-verify.mjs` and Current State copy while preserving the original sheet verifier.
- Leave the source note boundary in place if the code path needs repair.

## Tests

Focused proof:

- `node --check lib/data-001-freedom-source-adapter.js scripts/process-data-001-check.mjs scripts/sheets-structure-verify.mjs public/foundation-current-state-renderers.js`
- `npm run process:data-001-check -- --close-card --json`

Full gates:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=DATA-001 --planApprovalRef=docs/process/approvals/DATA-001.json --closeoutKey=data-001-freedom-source-adapter-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=DATA-001 --closeoutKey=data-001-freedom-source-adapter-v1`
- `npm run process:foundation-ship -- --card=DATA-001 --planApprovalRef=docs/process/approvals/DATA-001.json --closeoutKey=data-001-freedom-source-adapter-v1 --commitRef=HEAD`

## Not Next

- No spreadsheet mutation.
- No Drive permission mutation.
- No ClickUp, FUB, or finance writes.
- No credential/key rotation, OAuth scope mutation, provider config change, or external send.
- No broad private extraction, paid/provider/browser-auth work, screenshots, OCR, transcription, or model call.
- No OPS-003 rollup repair.
- No ENGINE-001 planning attrition rebuild.
- No DATA-003 live-value UI expansion.
- No final replacement of the Freedom Sheet.

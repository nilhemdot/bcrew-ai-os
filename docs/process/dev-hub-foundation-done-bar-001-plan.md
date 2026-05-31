# DEV-HUB-FOUNDATION-DONE-BAR-001 Plan

## What

Add a read-only Dev Hub Foundation Done bar that projects existing source-maturity truth into the Dev intelligence loop: extracted, atomized, synthesized, routed, and resolved/applied.

## Why

Steve needs `/dev` to answer whether source intelligence is actually flowing or sitting still. The system can currently show routed work while 100+ routes remain unresolved, so the Dev Hub needs a compact bar that makes unresolved routing pressure visible without mutating recommendations.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `foundationDoneBar`.
- `/dev` renders a visible Foundation Done panel with extracted, atomized, synthesized, routed, and resolved/applied counts.
- Routed-but-pending sources do not count as done; they surface as `resolved` gaps with waiting route counts.
- The read model reuses `buildSourceMaturityGridSnapshot` and does not create a second source truth layer.
- The payload is bounded and includes only compact rows and top gaps.
- No route approval/apply/reject/snooze, extraction, model call, Harlan send, backlog write, destination write, or external write is added to the readback path.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, UI wiring, payload bounds, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with the exact commit subject so ship proof can match it.

## Details

- Create `lib/dev-hub-foundation-done-bar.js` as a compact projection over source maturity rows.
- Wire `buildDevTeamHubV0Snapshot` to build `foundationDoneBar` from `foundationSnapshot`, `sourceContracts`, and `extractionControl`.
- Add `public/dev-foundation-done-bar.js` and a small `/dev` panel that listens to the existing `devhub:snapshot` event.
- Add `scripts/process-dev-hub-foundation-done-bar-check.mjs` and `process:dev-hub-foundation-done-bar-check`.
- Register the closeout and verifier coverage card ID.

## Risks

- False green risk: route-only progress could be mislabeled as done. The dogfood proof must reject routed-but-unapplied rows as complete.
- Payload risk: the Dev Hub is already large, so this view must be compact and keep `/api/foundation/dev-team-hub` under the existing operator budget.
- Architecture risk: `lib/dev-team-hub.js`, `public/dev.js`, and `public/dev.css` are above 3,000 lines. Keep edits minimal and put new behavior in standalone files.

## Tests

```bash
node --check lib/dev-hub-foundation-done-bar.js scripts/process-dev-hub-foundation-done-bar-check.mjs public/dev-foundation-done-bar.js
npm run process:dev-hub-foundation-done-bar-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-FOUNDATION-DONE-BAR-001 --planApprovalRef=docs/process/approvals/DEV-HUB-FOUNDATION-DONE-BAR-001.json --closeoutKey=dev-hub-foundation-done-bar-v1 --commitRef=HEAD
```

# FOUNDATION-HUB-BACKLOG-CONTRACT-001 Plan

## What

Build a narrow V1 backlog payload contract for the default `/api/foundation-hub` route. The default Foundation Hub should expose thin backlog rows and counts, while full backlog detail remains available through full diagnostics or dedicated detail paths.

## Why

Steve needs Foundation to stay fast and reliable while hubs consume it. The backlog keeps growing, and spreading the full core snapshot into the default hub route lets `backlogItems` silently become another multi-megabyte payload. This unlocks useful operator behavior: normal Foundation and hub pages can load source/backlog status quickly without pulling every long backlog note by default.

## Acceptance Criteria

- `FOUNDATION-HUB-BACKLOG-CONTRACT-001` has a contract module that turns full backlog rows into thin default rows.
- Thin rows preserve card identity, lane, priority, rank, scope, owner, and short summary/action/status excerpts.
- Thin rows do not include full `whyItMatters`, full `nextAction`, or full `statusNote` text in the default route.
- Dogfood proof simulates oversized backlog rows and proves the contract truncates them before route payload shaping.
- `/api/foundation-hub` stays under the current summary payload budget and exposes `backlogContract` metadata.
- Full diagnostics remain available at `/api/foundation-hub?view=full`.

## Definition Of Done

- Plan approval exists at `docs/process/approvals/FOUNDATION-HUB-BACKLOG-CONTRACT-001.json` with score at least 9.8.
- Durable Plan Critic pass row exists for `FOUNDATION-HUB-BACKLOG-CONTRACT-001`.
- Focused proof passes with `npm run process:foundation-hub-backlog-contract-check -- --json`.
- Static checks pass for the new module, focused proof script, server route file, and verifier file.
- Full ship gate passes with `npm run process:foundation-ship -- --card=FOUNDATION-HUB-BACKLOG-CONTRACT-001 --closeoutKey=foundation-hub-backlog-contract-v1`.

## Details

Reuse existing code: `getFoundationCoreSnapshot()`, `buildFoundationHubSummaryPayload()`, `attachFoundationHubPerformanceMetadata()`, `evaluateFoundationHubPayloadBudget()`, `backlog:hygiene`, Current Sprint helpers, Plan Critic, and the existing full diagnostics route. Reuse existing docs in `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and the Foundation route budget cleanup closeout.

This is a bounded API payload contract card. The implementation adds a new module outside the `server.js` monolith, wires the default summary route to replace full backlog rows with a thin contract snapshot, and keeps full backlog detail available through `/api/foundation-hub?view=full`. Touching `server.js` and `scripts/foundation-verify.mjs` is treated as architecture risk: the split plan is to keep new responsibility in `lib/foundation-hub-backlog-contract.js`, add only thin import/wiring in `server.js`, and add only verifier coverage in `scripts/foundation-verify.mjs` without adding a new verifier subsystem to the monolith.

## Risks

- Risk: the frontend expects full backlog text on the default route. Repair path is to keep short excerpts and route any full-detail use to existing full diagnostics or a later detail endpoint.
- Risk: payload reduction hides operator truth. Repair path is to preserve counts, IDs, lanes, priorities, and excerpts, and fail focused proof if counts diverge.
- Risk: this becomes another monolith addition. Repair path is fail closed through Plan Critic architecture rules; all new behavior lives in the new module, not inside `server.js` or the verifier.

## Tests

- Static: `node --check lib/foundation-hub-backlog-contract.js scripts/process-foundation-hub-backlog-contract-check.mjs server.js scripts/foundation-verify.mjs`
- Focused: `npm run process:foundation-hub-backlog-contract-check -- --json`
- Hygiene: `npm run backlog:hygiene -- --json`
- Full: `npm run foundation:verify -- --json-summary`
- Ship: `npm run process:foundation-ship -- --card=FOUNDATION-HUB-BACKLOG-CONTRACT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HUB-BACKLOG-CONTRACT-001.json --closeoutKey=foundation-hub-backlog-contract-v1 --commitRef=HEAD`

## Not Next

Do not build hub features, Marketing Video Lab routes, Skool/myICOR extraction, Build Intel agents, broad frontend redesign, broad `public/foundation.js` refactor, or a new backlog editing workflow in this card. Do not remove full diagnostics. Do not mutate backlog content from the proof script; it is read-only by default and has no `--apply` path.

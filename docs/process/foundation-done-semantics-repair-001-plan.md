# FOUNDATION-DONE-SEMANTICS-REPAIR-001 Plan

## What

Repair done-card readback semantics from the Claude/Codex tune-up audit. V1 adds a durable `doneSemantics` classifier to the backlog API, done archive, detail endpoint, and Foundation UI so done rows explicitly read as one of:

- behavior-proven done
- V1 contract
- preflight/contract
- blocked/waiting
- blocked preflight
- done, needs review

This is a readback repair only. It does not rewrite historical backlog cards and does not delete evidence.

## Why

The audit found that some done cards say V1, preflight, blocked, pending approval, or approval-bound while the UI can still make them feel feature-complete. That is the exact old-system failure pattern: paperwork turns green and Steve has to remember the real boundary from chat.

Useful operator behavior is simple: when Steve opens Backlog or Done Archive, a bounded V1, preflight, approval packet, blocked slice, or unclear legacy close must say that plainly. The real workflow this unlocks is faster review with quality: Steve can scan done work without translating old chat history or asking whether a green row is real product behavior. Only done rows with proof/closeout language and no limiting marker can claim behavior-proven done.

## Acceptance Criteria

- `buildFoundationBacklogDetailCard()` adds `doneSemantics` to every backlog card.
- Backlog list summary and done archive summary include counts by done outcome and explicit review candidate IDs.
- Single-card detail payload exposes the same done semantics as list/archive rows.
- Foundation backlog UI renders a `Done Outcome` line for done cards.
- The dogfood proof rejects the audit failure mode: blocked preflight, preflight-only, bounded V1, and unclear done rows cannot be feature-complete claims.
- The live readback includes a reviewed candidate list for limiting done language without bulk-editing historical rows.
- Source/browser proof lane, source-session readiness, local-browser route policy, Dev Hub System Truth, and `/api/foundation/dev-team-hub` honest posture remain protected.

## Definition Of Done

- Update `lib/foundation-backlog-detail.js` with `classifyFoundationDoneSemantics()` and `buildFoundationDoneSemanticsSummary()`.
- Update `public/foundation.js` so done cards render `Done Outcome`.
- Add `lib/foundation-done-semantics-repair.js` and `scripts/process-foundation-done-semantics-repair-check.mjs`.
- Add package script `process:foundation-done-semantics-repair-check`.
- Add approval, closeout record, and verifier done-card coverage for `FOUNDATION-DONE-SEMANTICS-REPAIR-001`.
- Focused proof, tune-up roadmap proof, builder-memory proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.

## Details

Existing code reused:

- `lib/foundation-backlog-detail.js` for backlog list, done archive, and detail endpoint contracts.
- `public/foundation.js` for shared backlog accordion rendering.
- Current Sprint DB helpers, Plan Critic, approval integrity, process write guard, build closeout log, and existing tune-up proof structure.

Existing docs/backlog truth reused:

- Live backlog card `FOUNDATION-DONE-SEMANTICS-REPAIR-001`.
- Current sprint `FOUNDATION-TUNEUP-2026-05-29`.
- The Claude/Codex audit finding that done cards must not imply feature-complete when they really mean V1, preflight, blocked, pending, or approval-bound.

The focused proof calls the real backlog payload builders against live backlog rows and dogfoods synthetic fixtures for each risky outcome. It rejects substring-only proof by checking the API contracts, the UI source, the live summary counts, the review candidate ID list, and the classifier behavior.

Gate decision tree: static checks alone are not enough because the blast radius includes API contracts, UI rendering, package scripts, Current Sprint state, closeout metadata, and verifier coverage. The default fast loop is the focused `process:foundation-done-semantics-repair-check`, which is proportional and should run in under 1 minute for normal iteration. The full gate is required only for ship because the card changes served readback contracts: focused proof first, then `foundation:verify`, then `process:foundation-ship`.

## Risks

Risk: the classifier over-edits history by mutating old cards. Repair path: do not update historical rows; add readback semantics computed from the existing text.

Risk: every V1 done row gets treated as bad. Repair path: V1 rows are not bad; they are labelled as bounded V1 contracts so they stop masquerading as feature-complete.

Risk: an unclear done row becomes a false green. Repair path: rows without limiting markers and without proof/closeout language become `Done, needs review`, not behavior-proven done.

Risk: this turns into verifier cleanup or per-hub restructuring. Repair path: Current Sprint and proof boundaries keep verifier deletion and `FOUNDATION-HUB-FOLDER-ISOLATION-001` parked.

## Tests

- `node --check lib/foundation-backlog-detail.js`
- `node --check public/foundation.js`
- `node --check lib/foundation-done-semantics-repair.js`
- `node --check scripts/process-foundation-done-semantics-repair-check.mjs`
- `npm run process:foundation-done-semantics-repair-check -- --json`
- `npm run process:foundation-done-semantics-repair-check -- --apply --stage=building_now --json`
- `npm run process:foundation-done-semantics-repair-check -- --close-card --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-DONE-SEMANTICS-REPAIR-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DONE-SEMANTICS-REPAIR-001.json --closeoutKey=foundation-done-semantics-repair-v1 --commitRef=HEAD`

## Not Next

Do not rewrite historical done cards. Do not delete verifier/approval/plan/check/closeout files. Do not delete `scripts/codex-status.mjs`. Do not start `FOUNDATION-HUB-FOLDER-ISOLATION-001` or per-hub folders. Do not work `MEETING-VAULT-ACL-001` Phase B. Do not mutate Drive permissions. Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, or external systems. Do not touch or weaken `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`, source-session readiness, local-browser route policy, Dev Hub System Truth, or `/api/foundation/dev-team-hub` posture.

# YOUTUBE-DEV-TEAM-SPRINT-PLAN-001 Plan

## What

Promote the saved `YouTube To Dev Team Intelligence V1` checkpoint into live sprint and backlog truth.

This card makes the current sprint explicit: Mark Kashef public YouTube becomes the first source, Foundation remains the source/intelligence spine, and Dev Team / Build Intel becomes the consumer hub that reads Foundation reports, atoms, review routes, and promotion decisions.

## Why

The plan cannot live only in chat or a handoff. Steve should not have to remind each Builder what the sprint is, which cards are next, or which older scoped cards are parked.

`YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002` produced a real scout report, seven proposal-only atoms, and seven evidence hits, but it did not finish the full sprint. The remaining work needs explicit cards and order so Builders execute the plan rather than drifting into Skool, MyICOR, Strategy, People, or broad extraction.

## Acceptance Criteria

- Live Current Sprint goal is `YouTube To Dev Team Intelligence V1`.
- The active sprint references the checkpoint handoff and current source `SRC-YOUTUBE-INTEL-001`.
- Missing sprint-slice backlog cards exist for Dev Team Hub V0, latest-20 deeper intel, Dev Team Intelligence Director, Promotion Gate, and the sprint-plan control card.
- Existing continuation cards stay live instead of being deleted.
- Skool, MyICOR, Strategy, People, and unrelated scoped cards are parked outside the active sprint order.
- Current Sprint active blocker advances to the first real remaining sprint slice.
- Every active sprint item has definition of done, proof command expectations, not-next boundaries, and existing-work doctrine fields.
- The focused proof verifies live backlog rows, active sprint order, package script wiring, closeout registry, verifier coverage, and current docs.
- Plan Critic records a pass score for this exact card; a revise result blocks apply.

## Definition Of Done

Done means `YOUTUBE-DEV-TEAM-SPRINT-PLAN-001` is closed under `youtube-dev-team-intelligence-sprint-plan-v1`, the live Current Sprint and backlog cards encode the whole `YouTube To Dev Team Intelligence V1` sprint, parked cards remain in backlog but out of the sprint order, and raw Foundation gates remain green.

## Details

Existing docs and live truth reused:

- `docs/handoffs/2026-05-21-youtube-dev-team-intelligence-sprint-checkpoint.md`
- `docs/handoffs/2026-05-21-youtube-scout-latest-video-vision-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- live backlog rows for `YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002`, `EXTRACTOR-OVERNIGHT-RUN-GUARD-001`, and `BUILD-INTEL-EXTRACTION-IMPLEMENTATION`

New focused proof:

- `scripts/process-youtube-dev-team-intelligence-sprint-plan-check.mjs`

Sprint order after this card:

1. `DEV-TEAM-HUB-V0-001`
2. `YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002`
3. `EXTRACTOR-OVERNIGHT-RUN-GUARD-001`
4. `YOUTUBE-LATEST-20-INTEL-RUN-001`
5. `DEV-TEAM-INTELLIGENCE-DIRECTOR-001`
6. `BUILD-OPPORTUNITY-PROMOTION-GATE-001`
7. `BUILD-INTEL-EXTRACTION-IMPLEMENTATION`

Gate decision tree: this is a full ship gate because it mutates live backlog rows, Current Sprint truth, closeout registry, verifier coverage, and operator-facing plan/state docs. Static docs alone are not enough.

Behavior proof: the focused proof exercises the real process path, not marker text. It calls the actual guarded Current Sprint API/function path `upsertFoundationCurrentSprintOverlay()`, writes real live backlog rows, records a real Plan Critic row, then performs a DB round-trip readback through `getActiveFoundationCurrentSprint()` and `getBacklogItemsByIds()`. It rejects weak proof: no substring-only proof, string match verifier theatre, or static markdown marker can replace the live DB/API round trip. The dogfood shape is the before/after failure: before apply the proof must show missing cards/order, and after apply it must show exact sprint order plus parked-card boundaries.

Operator value: Steve can ask "what are we building next?" and the system answers from live sprint truth without relying on chat memory.

Speed boundary: this card does not build extractor features. It only cards and orders the sprint plan, so the next Builder can start the first real slice cleanly.

Repair path: if live sprint/order/card proof fails, repair the sprint-plan writer and rerun this focused proof. Do not manually edit live DB rows or leave the plan only in markdown.

## Risks

- Active sprint order can drift if a Builder writes a broad overlay. Mitigation: the focused proof checks the sprint order and active blocker.
- Parked cards can disappear if removed instead of scoped. Mitigation: the proof verifies parked cards remain in backlog truth.
- Future cards can be too thin. Mitigation: every card gets definition of done, proof expectations, and not-next boundaries.
- Static docs can disagree with live truth. Mitigation: current plan/state docs reference the sprint-plan card and live Current Sprint remains operational truth.

## Not Next

- No Skool, MyICOR, Gumroad, Calendly, paid/private/auth/member/community/comment extraction.
- No purchase, download, opt-in, booking, form submit, external message, credential mutation, browser profile mutation, or external write.
- No automatic backlog cards from scout findings.
- No Strategy/People work.
- No MEETING-VAULT-ACL-001 Phase B or Drive permission mutation.

## Tests

- `node --check scripts/process-youtube-dev-team-intelligence-sprint-plan-check.mjs`
- `npm run process:youtube-dev-team-intelligence-sprint-plan-check -- --apply --json`
- `npm run process:youtube-dev-team-intelligence-sprint-plan-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

## Changed Files

- `scripts/process-youtube-dev-team-intelligence-sprint-plan-check.mjs`
- `docs/process/youtube-dev-team-intelligence-sprint-plan-001-plan.md`
- `docs/process/approvals/YOUTUBE-DEV-TEAM-SPRINT-PLAN-001.json`
- `docs/handoffs/2026-05-21-youtube-dev-team-intelligence-sprint-plan-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-process-gate-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `package.json`

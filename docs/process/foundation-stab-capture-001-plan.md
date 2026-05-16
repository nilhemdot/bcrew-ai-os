# FOUNDATION-STAB-CAPTURE-001 Plan

Card: `FOUNDATION-STAB-CAPTURE-001`
Sprint: `foundation-audit-reliability-2026-05-16`
Closeout key: `foundation-stab-capture-v1`

## What

Capture Steve and Claude's current proposed next-work list into live backlog truth without opening any of it for build. Dedupe existing items and keep proposals clearly scoped/research until Steve chooses.

## Why

The old failure pattern was "we talked about it but never promoted it." The other failure pattern was pulling every idea into active work. This card solves the first without causing the second.

Operator value: Steve's connector, Build Intel, hub, staging, director, and UI ideas are not lost, but the active sprint stays Foundation audit reliability. The useful real workflow is Steve choosing the next sprint from live backlog truth instead of asking a chat to reconstruct a lost conversation.

## Acceptance Criteria

- The 14 proposed items from the latest planning exchange are checked against existing backlog IDs.
- Missing items are inserted or enriched as proposal-only backlog cards.
- Existing equivalent cards are updated or referenced, not duplicated.
- `ACTION-ROUTER-001` remains done and is not recreated.
- `DOC-ARTIFACT-BUDGET-001` is added or confirmed scoped as the doc-size/doc-bloat boundary Steve asked about.
- No proposal card moves into executing or Current Sprint.
- A short handoff lists created, enriched, existing, and intentionally deferred cards.

## Definition Of Done

- `FOUNDATION-STAB-CAPTURE-001` closes under `foundation-stab-capture-v1`.
- This plan and `docs/process/approvals/FOUNDATION-STAB-CAPTURE-001.json` validate.
- A durable Plan Critic pass row exists at `9.8+`.
- Live backlog contains the proposal-only cards or explicit dedupe notes.
- A capture handoff exists in `docs/handoffs/`.
- `foundation:verify` and full ship gate pass before push.

## Details

Proposal list to capture or dedupe:

- `CONNECTOR-COMPLETION-SPRINT`,
- `BUILD-INTEL-EXTRACTION-IMPLEMENTATION`,
- `E2E-STAGING-HARNESS-001`,
- `MULTI-WORKER-DISPATCH-001`,
- `PILLAR-4-SYSTEM-CAPABILITIES-001`,
- `PILLAR-5-AGENT-INVENTORY-001`,
- `REPLY-WATCHING-LOOP`,
- `TELEGRAM-BOTS-001`,
- existing `ACTION-ROUTER-001`,
- `MARKETING-PIPELINE-REBUILD`,
- `DEPARTMENT-DIRECTORS-001`,
- `MASTER-DIRECTOR-001`,
- `CANVA-CLIENT-MARKETING-VIDEO-LAB-REVIEW-001`,
- `FOUNDATION-IA-UI-RESTRUCTURE`,
- `DOC-ARTIFACT-BUDGET-001` for doc/handoff/report bloat boundaries.

Root cause / root invariant: memory and chat are not backlog. Proposal capture is healthy only when live backlog/DB truth records the idea and Current Sprint membership stays unchanged.

Existing code to reuse:

- live backlog DB tables,
- `getBacklogItemsByIds`,
- change events,
- Current Sprint read helpers.

Existing docs/scripts to reuse:

- `docs/handoffs/` planning context,
- `docs/rebuild/current-plan.md`,
- `docs/rebuild/current-state.md`,
- `npm run backlog:hygiene -- --json`,
- `npm run foundation:verify -- --json-summary`.

Gate decision tree: static syntax checks first, focused backlog capture proof through `npm run process:foundation-stab-capture-check -- --json`, then `backlog:hygiene`, `foundation:verify`, and full ship gate because the blast radius mutates live backlog truth.

Focused proof is fast, targeted under 2 minutes, read-only by default after capture, and compares actual live backlog and Current Sprint state through the actual function path `getBacklogItemsByIds()` plus a DB/API-style round trip against Current Sprint membership. It rejects substring-only proof and fails closed if proposal cards enter `executing` or Current Sprint without approval.

## Risks

- Risk: proposal capture becomes stealth sprint opening.
  - Response: every captured card stays research/scoped only and Current Sprint items do not change except this active sprint.
- Risk: duplicate cards clutter the backlog.
  - Response: dedupe by ID and title before inserting.
- Risk: context is too thin to build from later.
  - Response: each inserted card gets summary, why it matters, next action, owner, and source note.

Rollback / repair path: if duplicates are found after capture, keep this card open, merge or mark duplicates explicitly, and rerun backlog hygiene. Do not delete history silently.

## Tests

```bash
node --check scripts/process-foundation-stab-capture-check.mjs
npm run process:foundation-stab-capture-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-STAB-CAPTURE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-STAB-CAPTURE-001.json --closeoutKey=foundation-stab-capture-v1 --commitRef=HEAD
```

Dogfood proof checks that the capture creates/enriches proposal cards without changing active sprint membership or moving any proposal into executing.

## Not Next

- Do not build connector completion in this card.
- Do not start paid-source auth, Build Intel extraction, Telegram bots, directors, or Marketing pipeline.
- Do not wire Canva/Marketing Video Lab routes.
- Do not auto-create sprint items for the captured proposal cards.

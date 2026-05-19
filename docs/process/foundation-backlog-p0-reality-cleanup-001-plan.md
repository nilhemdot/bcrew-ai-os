# FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001 Plan

## What

Clean live P0 backlog truth so the operator view separates the active Foundation blocker from real-but-deferred P0 work.

V1 adds a reusable P0 reality classifier and focused proof. It updates the small set of misleading security/provider/runtime rows so they clearly say whether they are active, approval-bound, exposure-gated, or historical done records.

## Why

The May 19 recovery proved that scary-looking P0 rows can hide the real blocker. Provider-side key proof, public edge auth, filtered comms access, and local runtime mutation are important, but they should not look like the active Foundation sprint blocker unless they are actually pulled into Current Sprint.

P0 means real importance. It does not mean every P0 is being worked right now. Current Sprint owns the active execution path.

## Acceptance Criteria

- `lib/foundation-backlog-p0-reality-cleanup.js` classifies live P0 rows into active blocker, current sprint future work, approval-bound, exposure-gated, security follow-up, deferred source/value work, research, scoped, or done.
- Hidden P0 `executing` rows outside the active blocker fail.
- Provider/approval/security/exposure rows cannot sit in active posture unless they are the active blocker.
- Provider/approval/security/exposure rows need owner, status, and next-action reality text.
- `SECURITY-001` remains historical done work but routes remaining provider-side proof to `SECURITY-PROVIDER-ROTATION-PROOF-001` and `SECURITY-006`.
- `SECURITY-006`, `SECURITY-PROVIDER-ROTATION-PROOF-001`, `MEMORY-002`, `SECURITY-EDGE-001`, and `SECURITY-FILTERED-COMMS-ACCESS-001` state their non-active/approval/exposure posture.
- The proof does not demote real security work or delete backlog rows.
- Current Sprint advances to `SYSTEM-010` after closeout.

## Definition Of Done

- `process:foundation-backlog-p0-reality-cleanup-check` passes with `--apply --close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `foundation-backlog-p0-reality-cleanup-v1`.
- Verifier coverage includes `FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001`.

## Details

Root invariant: a P0 row can be non-active, but it cannot be ambiguous. The system should show:

- what is active now,
- what is approved future sprint work,
- what is provider/approval-bound,
- what is a public/broader-access gate,
- what is historical done work,
- and what is deferred source/value work.

The cleanup keeps real security cards P0. It does not demote credential exposure work. It only prevents those rows from looking like the active blocker during this Foundation-only sprint.

No provider keys are rotated from this card. No provider APIs are called. No credential values, hashes, or fingerprints are recorded. Provider-side rotation/retirement remains owner-owned through existing no-secret proof rows.

## Reuse Existing Work

Reuse existing code:

- `lib/foundation-db.js`
- `lib/foundation-current-sprint.js`
- `lib/foundation-backlog-store.js`
- `lib/process-plan-critic.js`
- `lib/foundation-lessons-learned-loop.js`

Reuse existing docs:

- `docs/process/security-provider-rotation-proof-preflight-001-plan.md`
- `docs/process/foundation-lessons-learned-loop-001-plan.md`
- `docs/process/foundation-health-green-lock-001-plan.md`

Reuse existing scripts:

- `scripts/backlog-hygiene.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-foundation-ship.mjs`

## Behavioral Proof

Dogfood cases:

- Healthy active blocker plus scoped provider/exposure/source rows passes.
- A hidden `executing` P0 row outside the active blocker fails.
- A done security scare row without provider-proof route fails.
- An active-blocker mismatch fails.

Live proof checks:

- live P0 backlog rows,
- live Current Sprint active blocker,
- targeted security/provider row status text,
- System Health,
- repeated-failure gate,
- Plan Critic,
- closeout registry,
- verifier coverage.

## Tests

- `node --check lib/foundation-backlog-p0-reality-cleanup.js scripts/process-foundation-backlog-p0-reality-cleanup-check.mjs`
- `npm run process:foundation-backlog-p0-reality-cleanup-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001.json --closeoutKey=foundation-backlog-p0-reality-cleanup-v1 --commitRef=HEAD`

Gate decision tree: static, focused, and full are chosen based on blast radius. This card is full because it touches live backlog truth, Current Sprint progression, Plan Critic rows, closeout registry, and operator priority semantics. The focused proof is `process:foundation-backlog-p0-reality-cleanup-check`; the full proof is `foundation:verify` plus `process:foundation-ship`.

The proof is behavior-based, not marker-based. It calls `evaluateBacklogP0Reality()` against live P0 rows and synthetic dogfood rows, then proves the Current Sprint active blocker is the only active path.

Speed bound: the focused check uses one bounded P0 backlog query, one Current Sprint read, and existing fast gates. It must be cheap enough to run before `foundation:verify`.

Operator value: Steve sees the actual active blocker without losing real P0 security/provider work. Scary rows stay important, but they no longer masquerade as today’s active build target.

## Risks

- Over-cleaning could demote real security work. Mitigation: the proof forbids priority demotion and deletion.
- Under-cleaning could leave scary rows ambiguous. Mitigation: targeted provider/security/runtime/exposure rows require owner/status/next action reality text.
- Scope could drift into provider key rotation. Mitigation: this card does not rotate, revoke, validate, or print credential material.
- Scope could drift into source/value work. Mitigation: Current Sprint advances only to `SYSTEM-010`.
- If proof fails after live update, repair the targeted row text or reopen this card; do not proceed to source/value work until the P0 reality proof is healthy.

## Not Next

- Do not start Value Builder split.
- Do not start source/extract work from this card.
- Do not rotate provider keys unless real exposure, suspicious access, public sharing, or Steve explicitly approves it.
- Do not mutate credentials, Drive permissions, public edge exposure, external systems, or sends.
- Do not demote real security work just to make the queue look clean.

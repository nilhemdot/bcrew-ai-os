# TIER-BEHAVIORAL-COMPLETION-001 Tier Behavior Plan

Status: approved at 10.0 on 2026-05-12. Implementation is limited to this plan.

Card: `TIER-BEHAVIORAL-COMPLETION-001`

## What

Build the sixth Foundation Source Once-Over card: a behavior decision matrix for the first read endpoints future non-owner users will hit.

V1 proves each selected surface is either:

- role-filtered and intentionally available to Ops or Sales; or
- owner-only and intentionally closed until a later filtered-access card exists.

This card does not broaden shared communications, Strategy, Foundation, or intelligence evidence access. It makes the current security decisions explicit and behavior-proven.

## Why

The audit correction was precise: `assertTier` is wired, but confidence needs route behavior proof. `SECURITY-BEHAVIOR-PROOF-001` proved the base wiring. This card finishes the first product-read decision layer so Steve can see which team-facing reads are real and which reads remain closed.

Useful operator behavior: Steve can open Foundation and see the tier decision for each first-read surface, the route posture, who the proof allows, which sensitive reads remain owner-only, and whether the Tanner subject-person leak proof is still green.

## Acceptance Criteria

- `lib/tier-behavioral-completion.js` defines the first-read surface matrix.
- The matrix covers Foundation command/source/brand APIs, Ops Hub, Ops Agent Feedback Dry Run, Owners Review Queue, Sales Hub, shared communications archive, Strategy Hub v2, and intelligence evidence.
- Every covered route has an explicit route posture in `lib/security-access.js`.
- Ops Hub, Ops Agent Feedback Dry Run, Owners Review Queue, and Sales Hub are proven role-plus-tier surfaces.
- Foundation/source/brand APIs stay owner-only.
- Shared communications, Strategy Hub v2, and intelligence evidence stay redaction-ready but owner-only.
- Tanner subject-person redaction proof remains green before any evidence access broadens.
- `/api/foundation/tier-behavioral-completion` returns the snapshot.
- `/api/foundation/source-lifecycle` and `/api/foundation-hub` include the same `tierBehavioralCompletion` payload.
- Foundation UI renders the tier behavior panel under Source Lifecycle.
- Plan Critic must return `pass` with score at least 9.8.
- The focused proof validates approval, Plan Critic, real route posture behavior, no broad access opening, API/UI/process wiring, current-plan/current-state/build-log fanout, and Current Sprint advancement to `VERIFICATION-RUNS-001`.

## Definition Of Done

Done means `tier-behavioral-completion-v1` is closed with:

- valid approval file at `docs/process/approvals/TIER-BEHAVIORAL-COMPLETION-001.json`;
- tier behavior library at `lib/tier-behavioral-completion.js`;
- explicit route postures for the covered Foundation source-depth APIs;
- API route at `/api/foundation/tier-behavioral-completion`;
- Source Lifecycle/Foundation Hub payload wiring;
- Foundation UI rendering in `public/foundation.js` and `public/styles.css`;
- focused proof at `scripts/process-tier-behavioral-completion-check.mjs`;
- package script `process:tier-behavioral-completion-check`;
- backlog card moved to done with closeout proof;
- Current Sprint active blocker advanced to `VERIFICATION-RUNS-001`;
- current plan/current state/build log/verifier fanout updated.

## Details

Existing work reused:

- `lib/security-access.js`
- `lib/security-behavior-proof.js`
- `scripts/process-security-behavior-proof-check.mjs`
- `lib/foundation-current-sprint.js`
- `lib/foundation-db.js`
- `server.js`
- `public/foundation.js`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Implementation shape:

- Add `lib/tier-behavioral-completion.js` as the route decision and behavior proof builder.
- Add explicit owner-only route posture rows for Foundation source-depth APIs that previously depended on the default fail-closed posture.
- Add the tier behavior API and attach the payload to existing Source Lifecycle and Foundation Hub responses.
- Render a scan-friendly Foundation panel showing route decisions and allowed proof actors.
- Advance Source Once-Over to `VERIFICATION-RUNS-001` after proof passes.

Not Next:

- Do not open shared communications to non-owner users.
- Do not open Strategy Hub to non-owner users.
- Do not open intelligence evidence to non-owner users.
- Do not create broad Foundation team access.
- Do not change write permissions.
- Do not build per-user changelog, restricted decision queue, Reply/Watching Loop, Brand Guardian enforcement, Marketing Pipeline, Telegram bots, Directors, or Drive ACL changes.

## Risks

- The card could accidentally broaden access while trying to prove access. Repair path: snapshot summary must keep `broadSharedCommsOpened`, `strategyTeamAccessOpened`, and `foundationTeamAccessOpened` false.
- Role-filtered endpoints may be confused with redaction-filtered endpoints. Repair path: V1 labels Ops/Sales as role-plus-tier only and keeps sensitive evidence/comms/Strategy owner-only.
- Default route posture can hide missing route registration. Repair path: V1 requires explicit route posture for every covered first-read surface.
- Subject-person leakage can reappear if evidence access broadens later. Repair path: this card reuses the Tanner proof and keeps it visible in the Foundation UI.

## Gate Decision

Decision-tree result: full gate for ship, focused gate while building.

- Static gate alone is not enough because this changes server/API, security route posture, UI, current sprint, build log, docs, package scripts, and canonical verifier coverage.
- Focused gate: `npm run process:tier-behavioral-completion-check -- --json=true`; this is the fast default loop and should stay under 2 minutes.
- Full gate: `npm run process:foundation-ship -- --card=TIER-BEHAVIORAL-COMPLETION-001 --planApprovalRef=docs/process/approvals/TIER-BEHAVIORAL-COMPLETION-001.json --closeoutKey=tier-behavioral-completion-v1 --commitRef=HEAD`.
- Blast radius: security route posture registry, Foundation Source Lifecycle payloads, Foundation Hub payloads, Source Lifecycle UI, Current Sprint, build log, and `foundation:verify`.

## Tests

Run:

```bash
npm run process:tier-behavioral-completion-check -- --json=true
npm run process:security-behavior-proof-check
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=TIER-BEHAVIORAL-COMPLETION-001 --planApprovalRef=docs/process/approvals/TIER-BEHAVIORAL-COMPLETION-001.json --closeoutKey=tier-behavioral-completion-v1 --commitRef=HEAD
```

Behavior proof requirements:

- call the real route posture and authorization function path;
- prove Ops/Sales non-owner reads are role-filtered;
- prove Foundation/source/brand APIs stay owner-only;
- prove shared communications, Strategy, and evidence reads stay owner-only;
- prove Tanner subject-person redaction remains green;
- prove no broad access flag is opened by this card;
- prove Current Sprint advances to `VERIFICATION-RUNS-001`;
- reject substring-only verifier theatre by failing if function/API/UI/script paths are missing.

Speed bound:

- Use the focused proof first while building.
- Keep the focused proof fast and proportional, under 2 minutes in normal local runs.
- Run the full ship gate only after the card is committed.

# DECISION-RESTRICTED-QUEUE-001 Restricted Decision Queue Plan

Status: approved at 10.0 on 2026-05-12. Implementation is limited to this plan.

Card: `DECISION-RESTRICTED-QUEUE-001`

## What

Build the Foundation Source Once-Over slice that auto-flags people-sensitive decision records and keeps them out of general decision consumers.

V1 reuses the existing `decisions` table, `decision-auto-emit` proposed-only posture, shared-candidate extraction context, Strategy advisor context, Foundation Hub, and Source Lifecycle UI. It classifies decisions from title, summary, rationale, evidence notes, context, source reference, owner, confirmed-by, and participants.

Restricted categories are termination, compensation, performance concern, personnel/HR, and legal/compliance. Matching decisions go into an owner-only restricted review queue. General Strategy/extraction contexts receive only non-restricted decision records.

## Why

Tier checks protect reads, but sensitive content also needs a downstream net. The old system had a useful restricted decision pattern: termination, compensation, performance, and personnel topics did not route to general agents.

The new system already has decisions and auto-emitted proposed decisions. Without this card, a future hub or agent can consume a people-sensitive decision because the decision exists in the normal Foundation decision list. V1 closes that specific foundation gap before broader routing resumes.

Useful operator behavior: Steve can open Foundation and see which decisions are restricted, why they were flagged, what matched, and that restricted decisions are not being handed to general Strategy/extraction consumers.

## Acceptance Criteria

- `DECISION-RESTRICTED-QUEUE-001` stays inside the Foundation Source Once-Over sprint and does not start Reply Parser, Watching Items, agents, or product workflows.
- `lib/decision-restricted-queue.js` classifies restricted decisions with behavior-tested rules for termination, compensation, performance concern, personnel/HR, and legal/compliance content.
- The restricted queue snapshot separates restricted decisions from general decisions and exposes counts, matched categories, matched terms, and owner-only routing.
- `/api/foundation/restricted-decision-queue` returns the owner-only restricted queue.
- `/api/foundation/source-lifecycle` and `/api/foundation-hub` include the restricted decision queue payload.
- Strategy advisor context and shared-candidate extraction context use the general-decision filter so restricted decisions are not passed to broad consumers.
- Foundation UI renders the restricted queue status under Source Lifecycle without creating a new hub.
- The behavior proof calls the real classifier function path, the real snapshot builder function path, a synthetic proof, the API route, UI/process wiring checks, current-plan/current-state/build-log fanout, and Current Sprint advancement to `FOUNDATION-UI-COMPLETE-001`.
- Plan Critic must pass with score at least 9.8 before closeout is trusted.

## Definition Of Done

Done means `decision-restricted-queue-v1` is closed with:

- valid approval file at `docs/process/approvals/DECISION-RESTRICTED-QUEUE-001.json`;
- plan file at `docs/process/decision-restricted-queue-001-plan.md`;
- restricted decision queue library at `lib/decision-restricted-queue.js`;
- API wiring in `server.js`;
- owner-only route posture in `lib/security-access.js`;
- general-context filtering in `server.js` and `lib/shared-candidate-extraction.js`;
- Foundation UI rendering in `public/foundation.js` and `public/styles.css`;
- focused proof at `scripts/process-decision-restricted-queue-check.mjs`;
- package script `process:decision-restricted-queue-check`;
- Current Sprint advancement to `FOUNDATION-UI-COMPLETE-001`;
- current plan/current state/build log/verifier fanout updated.

## Details

Existing code/docs/scripts reused:

- `decisions` and change events in `lib/foundation-db.js`
- `lib/decision-auto-emit.js` proposed-only decision generation
- `lib/shared-candidate-extraction.js`
- Strategy advisor context in `server.js`
- `lib/foundation-current-sprint.js`
- `lib/foundation-build-log.js`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- existing process gate scripts and approval-integrity checks

Implementation shape:

- Add `lib/decision-restricted-queue.js` as the single classifier/snapshot builder.
- Use explicit word-boundary patterns and category labels for termination, compensation, performance concern, personnel/HR, and legal/compliance.
- Treat broad marketing/business performance text as general unless it carries a people-sensitive performance signal such as concern, review, discipline, warning, PIP, underperforming, or named-person context.
- Build `filterGeneralDecisionRecords()` and use it where decisions are sent to broad Strategy/extraction contexts.
- Expose restricted decisions to Foundation owner surfaces only.
- Do not auto-lock, auto-apply, auto-send, delete, or mutate decision records in V1.
- Behavior proof calls actual function paths and API route behavior, then fails substring-only proof.

Not Next:

- Do not build Reply Parser or Watching Items.
- Do not build a new decision table or separate private queue that competes with `decisions`.
- Do not auto-lock or auto-apply restricted decisions.
- Do not send notifications, emails, Slack, Telegram, or agent messages.
- Do not build legal/HR advice. This is routing and access safety only.
- Do not broaden non-owner decision reads.
- Do not build Strategy Hub expansion, Marketing Pipeline, Telegram bots, Directors, or Drive ACL changes.

## Risks

- Risk: A generic word such as performance over-flags business/marketing decisions. Repair path: performance only restricts on people-sensitive performance signals, not generic marketing performance.
- Risk: A restricted decision still leaks through a broad consumer. Repair path: proof must verify `filterGeneralDecisionRecords()` excludes restricted fixtures and that Strategy/extraction contexts use the filter.
- Risk: This turns into a new decision system. Repair path: V1 uses the existing `decisions` table and adds classification/sequestration only.
- Risk: Auto-emit starts applying sensitive decisions. Repair path: V1 keeps auto-emit proposed-only and proof checks no auto-lock/apply behavior is added.
- Risk: This touches server, UI, security posture, shared extraction context, verifier, and package scripts. The gate decision tree classifies it as a full Foundation ship. Use focused proof first for speed, then full ship because blast radius includes server/security/UI/canonical verifier paths.

## Tests

Run:

```bash
npm run process:decision-restricted-queue-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=DECISION-RESTRICTED-QUEUE-001 --planApprovalRef=docs/process/approvals/DECISION-RESTRICTED-QUEUE-001.json --closeoutKey=decision-restricted-queue-v1 --commitRef=HEAD
```

Behavior proof requirements:

- call the real restricted decision classifier function path;
- call the real restricted queue snapshot builder function path;
- prove termination, compensation, performance concern, personnel/HR, and legal/compliance fixtures route to owner-only restricted review;
- prove generic marketing/business performance text stays general;
- prove restricted decisions are filtered out of general decision contexts;
- prove proposed-only/no-auto-apply boundaries remain explicit;
- prove API/UI/script/current-sprint/build-log/verifier wiring exists;
- reject substring-only verifier theatre by failing if the function/API/UI/script paths are missing.

Speed bound:

- The default dev loop is the fast focused proof command first, targeted to stay under 2 minutes on normal local runs. It should fail quickly on plan/API/UI/sprint fanout before paying the full ship-gate cost. Full verification still runs before push because this is a full-risk Foundation substrate change.

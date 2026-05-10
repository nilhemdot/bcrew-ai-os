# FOUNDATION-SPRINT-SYSTEM-001 Current Sprint Control Plan

Status: approved at 9.8 by Steve on 2026-05-10. Implementation is allowed only inside this plan.

Card: `FOUNDATION-SPRINT-SYSTEM-001`

Current truth:

- `DRIVE-ACCESS-REQUEST-001` is shipped at `ae8f5ec`.
- `MEETING-VAULT-ACL-001` remains scoped/blocking after Phase A dry-run.
- The Phase B approval path for `MEETING-VAULT-ACL-001` is paused.
- Foundation readiness is still `not_ready` because of the meeting raw Drive ACL/vault leg.
- `FOUNDATION-SURFACE-UPDATES-001` currently owns broad surface clarity and UX polish. This plan splits out the sprint execution-control layer so it is not buried as generic UI work.

## Goal

Create a minimal Current Sprint control panel that shows the active execution lane without creating a second backlog.

The panel should answer:

- What is the current sprint goal?
- What is the active blocker?
- Which cards are in the sprint, in what order?
- Which card is being scoped, ready, building, done, or returned?
- Why is a card ready, returned, or blocked?
- What proof commands and not-next boundaries govern each card?

V1 should appear at the top of `Recent Work` because done cards naturally continue into the existing Recent Work closeout feed below. If the same component can be reused cheaply on the Foundation home/overview without redesign, add it there too. Otherwise keep V1 to Recent Work and capture the second placement as follow-up.

## Core Rule

Current Sprint is an overlay on live backlog truth, not a second backlog.

The overlay may store sprint-specific fields such as order, stage, goal, readiness check, returned reason, and proof commands. It must not duplicate independent card title, priority, lane, owner, source, summary, or closeout truth. Those come from `backlog_items` and Recent Work closeouts.

If the overlay references a missing backlog card, the panel must show `missing_backlog_card` and the verifier must fail.

## Current Sprint Stages

Use exactly these V1 stages:

- `scoping`: Scoping
- `sprint_ready`: Sprint Ready
- `building_now`: Building Now
- `done_this_sprint`: Done This Sprint
- `returned`: Returned

Rules:

- `building_now` should be limited to one card unless Steve explicitly approves parallel active work.
- `sprint_ready` requires a completed existing-work/doctrine check.
- `done_this_sprint` requires the live backlog card to be `done` or the overlay must show why the card is done in sprint but not yet closed in backlog; the latter should normally fail.
- `returned` requires `returnedReason`.
- Unknown stages fail closed and should not render as healthy.

## Sprint Ready Existing-Work/Doctrine Check

Every `sprint_ready` and `building_now` card must include an existing-work/doctrine check with these fields:

- `existingCode`: exact existing files/modules/routes that already solve part of the problem.
- `existingDocs`: relevant docs, plans, source notes, or process artifacts.
- `existingScripts`: proof or process scripts to reuse.
- `existingPolicy`: current doctrine, guardrails, security rules, or source-contract boundaries.
- `reused`: what the implementation will reuse.
- `notRebuilt`: what the implementation must not rebuild.
- `exactGap`: the specific missing gap this card closes.
- `overBroadRisk`: how this could drift into broader Foundation UI, Strategy, corpus, ACL, or product work.
- `readyBy`: human or agent who completed the check.
- `readyAt`: timestamp.

If any required field is empty, the card cannot show as Sprint Ready.

## Sprint Card Display Contract

Each card row/card must show:

- backlog card ID and title from live backlog;
- sprint stage;
- sprint order;
- definition of done;
- proof commands;
- readiness blocker cleared, if any;
- not-next boundaries;
- existing-work/doctrine check status;
- plan link, when present;
- returned reason, when stage is `returned`;
- closeout/commit link if the card is done and Recent Work has it.

Display should stay compact. This is a command/control panel, not a card-heavy redesign.

## Initial Sprint Seed

The first sprint should be narrow:

- Sprint goal: `Build the Current Sprint execution-control overlay so Foundation work cannot drift through chat-only sequencing.`
- Active blocker: `FOUNDATION-SPRINT-SYSTEM-001`
- Ordered cards:
  - `FOUNDATION-SPRINT-SYSTEM-001` in `scoping` until this plan is approved, then `building_now` during implementation.
  - `MEETING-VAULT-ACL-001` in `returned` or `scoping_paused` equivalent must not be invented. Since V1 stages are fixed, use `returned` with reason `Phase B approval path paused; do not mutate Drive permissions.`

Do not put Strategy, Sales, Agent Feedback, Scoper, Agent Factory, broad corpus, video mining, researcher, or UI polish cards into the initial sprint.

## Files And Modules To Inspect

Inspect before implementation:

- `lib/foundation-db.js`
- `lib/foundation-build-log.js`
- `lib/foundation-surface-map.js`
- `lib/foundation-review-sprint.js`
- `lib/backlog-hygiene.js`
- `server.js`
- `public/foundation.js`
- `public/styles.css`
- `scripts/foundation-verify.mjs`
- `scripts/backlog-hygiene.mjs`
- `scripts/process-foundation-ship.mjs`
- `docs/process/foundation-1100-review-sprint.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/process/meeting-vault-acl-001-phase-b-approval-packet.md`
- `docs/process/meeting-vault-acl.md`

Existing surfaces to inspect:

- `GET /api/foundation-hub`
- `GET /api/foundation/build-log`
- `GET /api/foundation/backlog` if present through the current Foundation API shape
- Foundation `Recent Work` renderer in `public/foundation.js`
- Foundation home/overview renderers in `public/foundation.js`

## Likely Files To Touch After Approval

Keep implementation small and centralized:

- Add `lib/foundation-current-sprint.js`
  - Owns stage registry, overlay validation, existing-work/doctrine check validation, initial seed, status build, and closeout matching.
- Update `lib/foundation-db.js`
  - Add additive sprint overlay tables and helpers.
  - Do not add a second backlog table.
- Update `server.js`
  - Add `currentSprint` to `GET /api/foundation-hub`, or add a small admin-gated `GET /api/foundation/current-sprint` only if the hub payload becomes too heavy.
- Update `public/foundation.js`
  - Render Current Sprint at the top of `Recent Work`.
  - Optionally render the same component on Foundation home/overview if cheap.
  - Do not redesign nav, menu, page layout, cards, typography, or global styles.
- Update `public/styles.css`
  - Add only minimal classes needed for the compact control panel and optional tiny velocity sparkline.
- Add `scripts/process-foundation-sprint-system-check.mjs`
  - Focused proof for overlay shape, no second backlog, stage rules, readiness checks, returned reasons, and no-not-next drift.
- Update `package.json`
  - Add `process:foundation-sprint-system-check`.
- Update `scripts/foundation-verify.mjs`
  - Verify central module, package script, API exposure, panel hook, stage registry, Sprint Ready doctrine check, returned-reason requirement, and `FOUNDATION-SURFACE-UPDATES-001` split.
- After approval and implementation only:
  - `docs/process/approvals/FOUNDATION-SPRINT-SYSTEM-001.json`
  - `docs/process/foundation-sprint-system.md`
  - `lib/foundation-build-log.js`
  - `docs/rebuild/current-plan.md`
  - `docs/rebuild/current-state.md`

## Additive Data Model

Use additive schema only.

Preferred tables:

### `foundation_sprints`

- `sprint_id TEXT PRIMARY KEY`
- `status TEXT NOT NULL CHECK (status IN ('active', 'closed'))`
- `goal TEXT NOT NULL`
- `active_blocker_card_id TEXT`
- `started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `closed_at TIMESTAMPTZ`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `foundation_sprint_items`

- `sprint_id TEXT REFERENCES foundation_sprints(sprint_id) ON DELETE CASCADE`
- `backlog_id TEXT REFERENCES backlog_items(id)`
- `sprint_order INTEGER NOT NULL`
- `stage TEXT NOT NULL CHECK (stage IN ('scoping', 'sprint_ready', 'building_now', 'done_this_sprint', 'returned'))`
- `plan_ref TEXT`
- `definition_of_done TEXT NOT NULL`
- `proof_commands TEXT[] NOT NULL DEFAULT '{}'::text[]`
- `readiness_blocker_cleared TEXT`
- `not_next_boundaries TEXT[] NOT NULL DEFAULT '{}'::text[]`
- `existing_work_check JSONB NOT NULL DEFAULT '{}'::jsonb`
- `returned_reason TEXT`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- primary key on `(sprint_id, backlog_id)`

Validation:

- only one active sprint;
- no duplicate `sprint_order` inside active sprint;
- every `backlog_id` must resolve to a live backlog card;
- `returned_reason` required when `stage = 'returned'`;
- existing-work/doctrine check required when `stage IN ('sprint_ready', 'building_now')`;
- `done_this_sprint` must reconcile with live backlog done state and/or matching Recent Work closeout.

## API Shape

V1 response should be metadata-only and backlog-backed:

```json
{
  "status": "active",
  "sprintId": "foundation-current-2026-05-10",
  "goal": "Build the Current Sprint execution-control overlay so Foundation work cannot drift through chat-only sequencing.",
  "activeBlocker": {
    "cardId": "FOUNDATION-SPRINT-SYSTEM-001",
    "title": "Build Current Sprint execution-control overlay"
  },
  "stages": ["scoping", "sprint_ready", "building_now", "done_this_sprint", "returned"],
  "items": [
    {
      "cardId": "FOUNDATION-SPRINT-SYSTEM-001",
      "title": "Build Current Sprint execution-control overlay",
      "stage": "scoping",
      "order": 1,
      "definitionOfDone": "...",
      "proofCommands": ["npm run process:foundation-sprint-system-check"],
      "readinessBlockerCleared": null,
      "notNextBoundaries": ["MEETING-VAULT Phase B", "Drive permission mutations"],
      "existingWorkCheck": {
        "status": "required_before_sprint_ready"
      },
      "returnedReason": null,
      "recentWorkCloseout": null
    }
  ],
  "findings": []
}
```

No raw private source content, Drive metadata, meeting titles, transcript text, or permission details belong in this API.

## UI Placement

V1 placement:

- render `Current Sprint` above the executive review summary on `Recent Work`;
- show a compact goal/active-blocker header;
- render stages in the approved order;
- render sprint cards in order inside each stage;
- link card IDs to `/foundation#backlog:<id>`;
- for `done_this_sprint`, link to the matching Recent Work closeout below when available;
- for `returned`, show returned reason as required copy.

Optional if cheap:

- add the same compact panel near the top of Foundation home.

Do not:

- rebuild Foundation nav;
- redesign Recent Work closeout cards;
- create a new Backlog page;
- add drag/drop sprint management;
- add broad styling polish;
- hide the normal backlog lanes.

## Done Velocity

Add a small done-velocity graph only if it is cheap and honest.

Acceptable cheap source:

- Recent Work closeout dates from `lib/foundation-build-log.js` and `/api/foundation/build-log`; or
- reliable backlog transition events from `change_events` where lane changed to `done`.

Fail-closed rule:

- do not infer moved-to-done dates from `created_at`, commit date alone, or stale seed data.
- if reliable done-transition data is not already available, capture `FOUNDATION-DONE-VELOCITY-001` as a follow-up and leave the graph out of V1.

## FOUNDATION-SURFACE-UPDATES-001 Split

Update live backlog truth so:

- `FOUNDATION-SPRINT-SYSTEM-001` owns the Current Sprint overlay, sprint stages, existing-work/doctrine check, returned-reason requirement, and minimal execution-control panel.
- `FOUNDATION-SURFACE-UPDATES-001` keeps broader surface clarity work: plain-English polish, breadcrumbs, broad Recent Work/Overview refinements, where-it-lives links, and optional velocity expansion after sprint V1.
- Sprint-system work is not described as generic UI polish.

## Acceptance Criteria

`FOUNDATION-SPRINT-SYSTEM-001` is done only when:

- active sprint overlay exists and references live backlog cards;
- there is no second backlog table or independent card-truth source;
- `Current Sprint` renders at the top of Recent Work;
- sprint goal and active blocker are visible;
- sprint cards render in order;
- stages are exactly Scoping, Sprint Ready, Building Now, Done This Sprint, Returned;
- Sprint Ready and Building Now cards require the existing-work/doctrine check;
- each sprint card shows definition of done, proof commands, readiness blocker cleared, and not-next boundaries;
- returned cards cannot render as valid without a returned reason;
- done sprint cards link naturally to Recent Work closeouts when available;
- velocity graph is either honestly implemented from reliable done-transition data or captured as follow-up;
- `FOUNDATION-SURFACE-UPDATES-001` is updated to route sprint-system requirements to this card;
- focused proof and `foundation:verify` pass.

## Proof Commands

Minimum proof after implementation:

```bash
node --check lib/foundation-current-sprint.js
node --check scripts/process-foundation-sprint-system-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:foundation-sprint-system-check
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=FOUNDATION-SPRINT-SYSTEM-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SPRINT-SYSTEM-001.json --closeoutKey=foundation-sprint-system-v1 --commitRef=HEAD
```

Focused proof must cover:

- active sprint exists;
- overlay references live backlog cards;
- stage registry is exact;
- only one `building_now` card unless explicitly marked parallel-approved;
- Sprint Ready fails without existing-work/doctrine check;
- Returned fails without returned reason;
- done sprint cards reconcile with live backlog and Recent Work closeouts;
- not-next boundaries include no Meeting Phase B/Drive mutation work unless separately approved;
- `FOUNDATION-SURFACE-UPDATES-001` points to the sprint-system split;
- no raw/private proof leak.

## Rollback And Fail-Closed Behavior

- If current sprint query fails, the panel shows unavailable/risk and does not invent an empty healthy sprint.
- If a sprint item references a missing backlog card, proof fails.
- If a stage is unknown, proof fails.
- If `building_now` has multiple cards without explicit approval, proof fails.
- If `returned` lacks a reason, proof fails.
- If `sprint_ready` lacks the existing-work/doctrine check, proof fails.
- If done velocity cannot be proven from reliable dates, omit the graph and name the follow-up.
- Rollback is to remove the panel/API/module and leave the live backlog untouched; no source, meeting ACL, Drive, Strategy, or extraction state changes are involved.

## Not Next

Do not build in this card:

- `MEETING-VAULT-ACL-001` Phase B;
- real Google Drive permission mutation;
- request-access emails;
- broad Foundation menu/UI pass;
- broad Recent Work redesign;
- Strategy Hub work;
- Sales expansion;
- Agent Feedback expansion;
- Scoper;
- Agent Factory;
- broad corpus or video mining;
- researcher/self-improvement agent;
- extraction retry/backoff work;
- filtered shared-comms access;
- public access.

# PER-USER-CHANGELOG-001 Per-User Changelog Plan

Status: approved at 10.0 on 2026-05-12. Implementation is limited to this plan.

Card: `PER-USER-CHANGELOG-001`

## What

Build the Foundation Source Once-Over audit slice that turns the existing system change history into per-user and per-actor activity history.

V1 reuses the existing `change_events` trust table and active Foundation users. It groups recent activity by actor, classifies writes/approvals/applies/system events, exposes privacy-safe latest activity rows, and names the missing coverage from the old `write_audit_log` pattern.

V1 is intentionally honest: changed/approved/applied/system activity is visible because those events exist today; viewed/ignored/received history is not yet tracked and must remain an explicit gap.

## Why

Foundation has a system changelog, Recent Work, and broad DB `change_events`. That helps Steve see what the system changed, but future team use needs a narrower question answered: what did this user or actor do, approve, apply, or trigger?

The old system had a useful `write_audit_log` pattern. Rebuilding that as a separate table before we know the current source shape would add another place for truth to drift. Reusing `change_events` first gives Foundation an immediate per-user audit surface and shows the exact missing events before broader team access resumes.

Useful operator behavior: Steve can open Foundation and see which users/agents/system actors have recent write activity, approval activity, applied changes, and which human-history gaps still need a later card.

## Acceptance Criteria

- `PER-USER-CHANGELOG-001` stays inside the Foundation Source Once-Over sprint and does not start product work.
- `lib/per-user-changelog.js` builds a per-user changelog snapshot from existing users and `change_events`.
- `/api/foundation/per-user-changelog` returns actor summaries, recent activity, coverage status, and explicit missing coverage.
- `/api/foundation/source-lifecycle` and `/api/foundation-hub` include the same per-user changelog payload.
- Foundation UI renders the audit summary under Source Lifecycle without creating a new hub.
- The behavior proof calls `buildPerUserChangelogSnapshot()` and a synthetic proof that verifies known users, unknown actors, system actors, activity classification, metadata-key-only privacy, and missing viewed/ignored/received coverage.
- `npm run process:per-user-changelog-check -- --json=true` validates approval, Plan Critic, real snapshot behavior, API/UI/process wiring, current-plan/current-state/build-log fanout, and Current Sprint advancement to `DECISION-RESTRICTED-QUEUE-001`.
- Plan Critic must pass with score at least 9.8 before closeout is trusted.

## Definition Of Done

Done means `per-user-changelog-v1` is closed with:

- valid approval file at `docs/process/approvals/PER-USER-CHANGELOG-001.json`;
- plan file at `docs/process/per-user-changelog-001-plan.md`;
- per-user changelog library at `lib/per-user-changelog.js`;
- API wiring in `server.js`;
- owner-only route posture in `lib/security-access.js`;
- Foundation UI rendering in `public/foundation.js` and `public/styles.css`;
- focused proof at `scripts/process-per-user-changelog-check.mjs`;
- package script `process:per-user-changelog-check`;
- Current Sprint advancement to `DECISION-RESTRICTED-QUEUE-001`;
- current plan/current state/build log/verifier fanout updated.

## Details

Existing code/docs/scripts reused:

- `change_events` in `lib/foundation-db.js`
- `listFoundationUsers()` and `getRecentChangeEvents()` from `lib/foundation-db.js`
- existing `/api/foundation/changes` and `/api/foundation/change-log` behavior
- `lib/foundation-current-sprint.js`
- `lib/foundation-build-log.js`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- existing process gate scripts and approval-integrity checks

Implementation shape:

- Add `lib/per-user-changelog.js` as the single per-actor snapshot builder.
- Classify `change_events` into `changed`, `approved`, `applied`, `system`, and `other` activity buckets.
- Match actors to active Foundation users when possible; keep `system`, `codex`, and unknown actors visible without pretending they are users.
- Return only metadata keys/counts, not raw metadata values, so private or sensitive event metadata is not copied into the UI.
- Expose coverage gaps for `viewed`, `ignored`, and `received` as missing event families.
- Attach the snapshot to Foundation source lifecycle and hub payloads.
- Render a compact panel in the existing Source Lifecycle area.
- Behavior proof calls the actual function path and API route; a substring-only proof is rejected.

Not Next:

- Do not build a new audit-log write table in V1.
- Do not add read/view tracking middleware across every route.
- Do not log private content, raw metadata values, request bodies, cookies, tokens, or local memory content.
- Do not build a searchable audit explorer.
- Do not build Reply Parser, Watching Items, Telegram bots, Directors, Marketing Pipeline, Strategy expansion, or Drive ACL changes.
- Do not mark viewed/ignored/received coverage complete until real event writers exist.

## Risks

- Risk: Per-user history looks complete when it only covers writes/process events. Repair path: the snapshot must expose coverage gaps and the proof must require `viewed`, `ignored`, and `received` to remain marked missing.
- Risk: Raw metadata can leak private details. Repair path: entries expose metadata keys and counts only, not values.
- Risk: Actor names such as `codex` or `system` get treated as human users. Repair path: the snapshot must classify actor kind separately from known Foundation users.
- Risk: This can become another process dashboard. Repair path: Current Sprint must advance to `DECISION-RESTRICTED-QUEUE-001`, and the card must not create a new hub.
- Risk: This touches server, security route posture, UI, verifier, and package scripts. The gate decision tree classifies it as a full Foundation ship. Use focused proof first for speed, then full ship because blast radius includes server/security/UI/canonical verifier paths.

## Tests

Run:

```bash
npm run process:per-user-changelog-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=PER-USER-CHANGELOG-001 --planApprovalRef=docs/process/approvals/PER-USER-CHANGELOG-001.json --closeoutKey=per-user-changelog-v1 --commitRef=HEAD
```

Behavior proof requirements:

- call the real per-user changelog snapshot function;
- call the real Foundation API route where available;
- prove known-user, unknown-actor, and system-actor grouping;
- prove write/approval/apply/system classification;
- prove metadata values are not copied;
- prove missing viewed/ignored/received coverage remains visible;
- reject substring-only verifier theatre by failing if the function/API/UI/script paths are missing.

Speed bound:

- The default dev loop is the fast focused proof command first, targeted to stay under 2 minutes on normal local runs. It should fail quickly on plan/API/UI/sprint fanout before paying the full ship-gate cost. Full verification still runs before push because this is a full-risk Foundation substrate change.

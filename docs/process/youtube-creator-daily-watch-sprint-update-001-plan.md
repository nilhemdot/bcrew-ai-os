# YOUTUBE-CREATOR-DAILY-WATCH-SPRINT-UPDATE-001 Plan

## What

Update the live `YouTube To Dev Team Intelligence V1` sprint so public creator-channel freshness is a first-class requirement.

The prior scout proved Mark Kashef latest/last-20 discovery once, but it did not create a daily creator watch. Steve corrected the requirement: this does not work until the system checks approved public creators every day, detects newly dropped videos, keeps a research pool current, and treats Mark Kashef as the first deeper baseline with last 50 public videos while other public creator channels start at last 20.

## Why

Build Intel should be current. A one-time scout is useful proof, but it will miss new videos unless a scheduled, deduped, source-backed daily watch exists.

This card does not build the monitor. It promotes the missing daily-watch and Mark last-50 baseline work into live sprint order so Builders do not continue from an incomplete plan.

## Acceptance Criteria

- Live Current Sprint active blocker changes to `YOUTUBE-CREATOR-DAILY-WATCH-001`.
- `YOUTUBE-CREATOR-DAILY-WATCH-001` exists as a P0 card requiring daily public creator-channel checks from `SRC-CREATOR-WATCHLIST-001` and `SRC-YOUTUBE-INTEL-001`.
- `MARK-KASHEF-LAST-50-BASELINE-001` exists as a P0 card requiring the first Mark last-50 public-video baseline before broad creator processing.
- Existing cards remain live and are reordered behind daily-watch currentness.
- The sprint explicitly says Mark starts with last 50, other approved public creators start with last 20.
- The daily watch card is metadata/discovery first: public no-auth channel/video metadata, dedupe, first-seen/last-seen, queue/report output, and no private/paid/auth/comment/member crawling.
- Deeper transcript/description/screenshot/resource extraction still waits for the guard and approval-gated extraction cards.
- Focused proof verifies live backlog rows, active sprint order, parked-card boundaries, package script wiring, closeout registry, verifier coverage, and current docs.
- Plan Critic must pass for `YOUTUBE-CREATOR-DAILY-WATCH-SPRINT-UPDATE-001` with score at or above 9.8; any revise result blocks apply.
- `npm run process:youtube-creator-daily-watch-sprint-update-check -- --apply --json` must write the live order, and `npm run process:youtube-creator-daily-watch-sprint-update-check -- --json` must read it back healthy without write flags.

## Definition Of Done

Done means `YOUTUBE-CREATOR-DAILY-WATCH-SPRINT-UPDATE-001` is closed under `youtube-creator-daily-watch-sprint-update-v1`, live Current Sprint contains the daily-watch-first order, `YOUTUBE-CREATOR-DAILY-WATCH-001` is active, Mark last-50 and rest-of-creator last-20 requirements are explicit, and Foundation gates remain green.

## Details

Existing truth reused:

- Existing code: Foundation DB, `upsertFoundationCurrentSprintOverlay()`, backlog row writes, source crawl ledger, Build Intel watchlist, YouTube scout, closeout registry, and verifier coverage helpers.
- Existing docs: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, the YouTube scout closeout, and the sprint checkpoint.
- Existing scripts: `scripts/process-youtube-dev-team-intelligence-sprint-plan-check.mjs`, `scripts/process-youtube-scout-latest-video-vision-check.mjs`, and the new focused proof script.
- Live backlog and Current Sprint remain the operational truth for card order and active blocker.
- `SRC-CREATOR-WATCHLIST-001`
- `SRC-YOUTUBE-INTEL-001`
- `lib/build-intel-watchlist.js`
- `lib/youtube-build-intel-batch.js`
- `docs/handoffs/2026-05-21-youtube-scout-latest-video-vision-closeout.md`
- `docs/handoffs/2026-05-21-youtube-dev-team-intelligence-sprint-plan-closeout.md`
- live Current Sprint `YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21`

New focused proof:

- `scripts/process-youtube-creator-daily-watch-sprint-update-check.mjs`

Sprint order after this card:

1. `YOUTUBE-CREATOR-DAILY-WATCH-001`
2. `DEV-TEAM-HUB-V0-001`
3. `YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002`
4. `EXTRACTOR-OVERNIGHT-RUN-GUARD-001`
5. `MARK-KASHEF-LAST-50-BASELINE-001`
6. `YOUTUBE-LATEST-20-INTEL-RUN-001`
7. `DEV-TEAM-INTELLIGENCE-DIRECTOR-001`
8. `BUILD-OPPORTUNITY-PROMOTION-GATE-001`
9. `BUILD-INTEL-EXTRACTION-IMPLEMENTATION`

Gate decision tree: full ship gate. This mutates live backlog rows, Current Sprint active blocker/order, control-plane docs, closeout registry, verifier coverage, and the final closeout uses `process:foundation-ship` plus `foundation:verify`.

Behavior proof: the focused proof uses guarded process-write flags and real function path/API/process behavior: it calls the actual Current Sprint overlay path, writes real live backlog rows, records a Plan Critic row, then proves the result through DB/API round-trip readback from Current Sprint and backlog helpers. It rejects weak dogfood cases: chat-only planning, no substring-only proof, static markdown-only proof, missing active blocker, missing watch cards, missing Mark last-50 requirement, missing rest-of-creator last-20 requirement, and parked cards accidentally entering the active sprint.

Operator value: Steve can rely on the sprint to build a current research intake loop instead of a one-time scout that goes stale.

Speed boundary: this is a narrow, fast, proportional sprint-control card. The focused proof should stay under 2 minutes by doing DB/API readback only; it does not crawl YouTube, follow links, fetch transcripts, call models, or schedule the daily monitor itself.

Repair path: if sprint proof fails, fix the sprint writer and rerun the focused proof. Do not manually edit live DB rows or leave the daily-watch requirement only in chat.

## Risks

- Builders may confuse daily watch with deep extraction. Mitigation: daily watch is metadata/discovery/queue only; deeper extraction remains guarded.
- Mark last-50 could become too expensive if treated as immediate full extraction. Mitigation: baseline starts as public metadata and queue/readback; transcript/visual/resource processing stays approval/guard-bound.
- Other creators may have missing public channel URLs. Mitigation: skip missing URLs and report lookup gaps; do not fabricate channels.
- Sprint docs can drift from live truth. Mitigation: focused proof checks live Current Sprint and current docs.

## Not Next

- No Skool, MyICOR, Gumroad, Calendly, paid/private/auth/member/community/comment extraction.
- No purchase, download, opt-in, booking, form submit, external message, credential mutation, browser profile mutation, or external write.
- No automatic backlog cards from creator findings.
- No Strategy/People work.
- No MEETING-VAULT-ACL-001 Phase B or Drive permission mutation.

## Tests

- `node --check scripts/process-youtube-creator-daily-watch-sprint-update-check.mjs`
- `npm run process:youtube-creator-daily-watch-sprint-update-check -- --apply --json`
- `npm run process:youtube-creator-daily-watch-sprint-update-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

## Changed Files

- `scripts/process-youtube-creator-daily-watch-sprint-update-check.mjs`
- `docs/process/youtube-creator-daily-watch-sprint-update-001-plan.md`
- `docs/process/approvals/YOUTUBE-CREATOR-DAILY-WATCH-SPRINT-UPDATE-001.json`
- `docs/handoffs/2026-05-21-youtube-creator-daily-watch-sprint-update-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-process-gate-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `package.json`

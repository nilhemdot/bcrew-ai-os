# SOURCE-PACKET-WORKER-RUNNER-001 Plan

## What

Run approved source packets through a governed worker.

Plain English: once Steve approves an exact public/free/source link packet, the system should actually process that packet, save evidence, mark what happened, and surface the next source-packet candidates without wandering the web or pretending approval means crawl everything.

## Why

The source-packet approval ledger is useful, but it is still only a decision record. God Mode needs the next step: a worker that consumes approved records and turns them into source-backed artifacts that synthesis, Director, Scoper, and source grading can trust.

## V1 Scope

V1 consumes only approved source-packet decisions that match the existing public runtime boundary:

- `approve_public_free_read`
- `approve_sales_page_review`
- approved public GitHub/docs/resource pages that resolve to public no-auth web reads

V1 executes exactly one approved URL at a time through local Playwright. It does not follow discovered links. It classifies discovered links into new source-packet candidates and stops.

## Required Flow

1. Read approved source-packet decision records.
2. Validate source family, exact URL, access boundary, allowed actions, and forbidden actions.
3. Run the local Playwright-first public web runtime for the exact URL.
4. Persist an evidence artifact/report with packet ID, source URL, run ID, capture metadata, text/headings/meta, discovered link classifications, stop reason, and no-side-effect proof.
5. Mark packet run status as completed, blocked, or failed with a clear reason.
6. Trigger or flag synthesis/router freshness so extracted evidence does not sit stale.
7. Surface status in Dev/Foundation views.

## Acceptance Criteria

- Worker refuses packets with missing approval, vague URL, auth/private/paid/community boundary, download/form/purchase intent, broad crawl settings, or auto-backlog permission.
- Worker can run in synthetic proof mode without network.
- Optional live mode requires an explicit flag and still uses exact URL only.
- Evidence artifacts preserve source lineage and are readable by downstream synthesis/Director layers.
- Discovered links are recorded as source-packet candidates, not followed.
- The approval action and the worker run stay separate operations.
- The worker exposes enough status for Steve to see whether an approved packet was run, blocked, failed, or waiting.

## Definition Of Done

- Add a worker runner module around `lib/source-packet-public-web-runtime.js`.
- Add a focused proof script and `package.json` command:

```bash
npm run process:source-packet-worker-runner-check -- --json
```

- Prove decision -> runner -> artifact -> freshness/status with no external writes.
- Update Current Sprint/Dev truth so Hands no longer exists only in handoffs.

V1 proof note:

- `lib/source-packet-worker-runner.js` now validates an approved source-packet decision, delegates exact public-page extraction to `lib/source-packet-public-web-runtime.js`, emits a worker artifact record, flags synthesis freshness without destination writes, and blocks held/rejected/Skool/follow-link/live-without-allow cases.
- `scripts/process-source-packet-worker-runner-check.mjs` proves this in synthetic/no-network mode.
- Live DB artifact persistence and UI status wiring remain next.

## Not Next

- Do not log in.
- Do not crawl Skool/MyICOR/private/community/course/member content.
- Do not follow links automatically.
- Do not submit forms, purchase, opt in, download, post, comment, message, mutate credentials, or write externally.
- Do not create backlog cards from extracted content.
- Do not run broad creator/video catch-up from this card.

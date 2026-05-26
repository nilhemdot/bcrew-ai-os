# EXTRACTOR-HANDS-PRODUCTION-RUNNER-001 Plan

## What

Wire bounded browser Hands into the approved source-packet runner.

Plain English: an approved packet with explicit Hands details should be able to run through a separate guarded browser action, save evidence, show status, and stop. Approval still does not start a worker.

## Why

`EXTRACTOR-HANDS-BROWSER-RUNTIME-001` proved the controlled Hands runtime, and `SOURCE-PACKET-WORKER-RUNNER-001` proved approved packet persistence. The remaining gap is production-safe integration: approved decision rows need a Hands queue/run path with status and artifact persistence.

## V1 Scope

V1 supports public/free packets only:

- source family `public_web` or `github`
- decision `approve_public_free_read` or `approve_sales_page_review`
- Steve-approved packet decision
- explicit Hands policy with selector/action, allowed next URL/pattern, stop condition, and evidence target
- one click, two pages maximum, same source host

V1 does not approve Skool, MyICOR, paid, private, member, community, course, login, download, purchase, opt-in, booking, or form flows.

## Required Flow

1. Read approved source-packet decision rows.
2. Classify each row into ready, already-run, or blocked for bounded Hands.
3. Require a separate run call with explicit Hands policy.
4. Run `lib/extractor-hands-browser-runtime.js` through the production runner wrapper.
5. Persist status into `source_crawl_items` under `extractor-hands-production-runs`.
6. Persist a proof artifact into `intelligence_report_artifacts`.
7. Surface the queue/status read model in Dev Data Pool and the guarded API routes.

Proof target:

```bash
npm run process:extractor-hands-production-runner-check -- --json
```

## Acceptance Criteria

- Decision approval and Hands execution stay separate.
- The runner refuses missing Hands policy, held/rejected decisions, Skool/auth sources, broad follow mode, live mode without `allowLive=true`, external writes, and backlog writes.
- The proof dogfoods decision -> Hands runner -> artifact -> status without network.
- Persistence writes only governed Foundation stores: `source_crawl_items` and `intelligence_report_artifacts`.
- Dev Data Pool can show source-packet worker status and Hands runner status from queue read models.
- God Mode parity can see production Hands runner progress without allowing a full God Mode claim.

## Not Next

- Do not log in.
- Do not open Skool, MyICOR, paid communities, private/member sources, or course areas.
- Do not submit forms, buy, download, opt in, post, comment, message, or write externally.
- Do not auto-create backlog cards from extracted content.
- Do not treat public/resource-link Hands as full God Mode for YouTube, Skool, MyICOR, or private sources.
- Do not use hosted browser tools before local Playwright is proven insufficient and Steve approves the fallback.

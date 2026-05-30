# Source Browser Fallback Live Persistence Repair

Date: 2026-05-28
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `source-browser-fallback-live-persistence-repair-v1`

## What Changed

- Fixed Source Browser Agent target persistence to use valid `source_crawl_targets` values:
  - source ID: `SRC-YOUTUBE-INTEL-001`
  - lane: `recovery`
  - runtime mode: `manual`
  - runtime caps: no LLM spend, max 20 rows/run, max 3,900 seconds
- Added proof so fixture checks now reject the invalid internal source ID / lane / runtime values that live Postgres rejected.
- Updated `source:browser-fallback-batch` so safe terminal rows are handled as green operational outcomes:
  - recovered rows count as completed
  - rows that still hit a browser challenge are safely parked for hosted/browser fallback
  - unsafe rows still fail the batch

## Live Readback

The first live persisted fallback retry reached the intended boundary instead of crashing:

- `agent.minimax.io` still showed a browser challenge.
- The row was parked as `source_browser_fallback_hosted_fallback_required`.
- Unsafe side effects: `0`.
- Extracted pages: `0`.
- The batch exited green as `completed_with_safe_parked_rows`.

A three-row retry then safely parked:

- `https://agent.minimax.io/?utm_media_source=YT`
- `https://chatgpt.com/`
- `https://claude.ai/`

All three still require hosted/browser fallback; none were counted as extracted source evidence.

The target is also represented in the Source Lifecycle baseline and bounded-run hardening proof so Foundation health does not treat it as an unapproved or unbounded extraction target. Hardening readback shows `source-browser-agent-runs` bounded by `exact_source_packet_recovery`, max 20 rows/run, max 3,900 seconds, and no active unbounded targets.

## Boundary

No login, signup, purchase, download, post, comment, message, Telegram send, credential mutation, normal Chrome profile, hosted browser launch, or Scoper promotion happened.

## Next

The clean local retry lane is now honest: it can recover simple cases, and when it cannot, it parks rows cleanly. The next real capability is the hosted/source-session browser fallback for challenge-heavy pages, plus source-session readiness for Skool/newsletter/MyICOR.

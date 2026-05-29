# Human Web Agent V1 Sprint Reset Closeout - 2026-05-29

## Current Decision

Human Web Agent V1 is the active sprint. Browserbase/hosted-browser work is parked outside this sprint. The build path is local-first:

- deterministic readers for public/free pages and repos
- local isolated Playwright browser hands when interaction is required
- Source Session Broker and Harlan/operator escalation for auth, MFA, browser challenges, and source-session repair
- native/read-only connectors where safer than browser UI
- explicit tiny API/model caps only when model-backed local browser work is approved

## Live Sprint Truth

- Sprint ID: `HUMAN-WEB-AGENT-V1-2026-05-29`
- Active blocker / Building Now: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
- Active order:
  1. `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001`
  2. `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
  3. `SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001`
  4. `LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001`
  5. `SOURCE-SESSION-BROKER-001`
  6. `BUILD-OPPORTUNITY-PROMOTION-GATE-001`
- Parked outside sprint: `BROWSERBASE-ONE-MONTH-BAKEOFF-001`

## What Changed

- Added evidence/scoping/plan artifacts for the Human Web Agent V1 sprint reset.
- Updated Current Sprint plan/state docs so the old YouTube intelligence sprint remains upstream context, not the command order.
- Tightened source-browser cost and brain-route policy so old Browserbase flags/env keys/stale bakeoff approval cannot start hosted-browser spend.
- Repaired Dev Hub source-packet runtime previews. They now show `local_playwright_first`, then `source_session_broker_or_harlan_operator_escalation_after_local_retries`, with `externalBrowserSpendAllowed: false`.
- Added validation that fails legacy `hostedFallback` runtime fields before they can leak into operator readback.
- Corrected newsletter source-session readiness readback so live signup approval, saved-packet review, and dry-run/no-submit intake are separate states.
- Cleaned active fallback wording from hosted-browser fallback to source-session/operator escalation.

## Live Queue Readback

Latest dry-run:

```bash
npm run source:youtube-handoff -- --json --max-runs=3
```

Result:

- evidence rows: `1281`
- queued rows: `1202`
- already-run rows: `670`
- parked rows: `532`
- runnable rows: `0`
- rows with run command: `0`
- browser challenge fallback rows: `5`

Latest fallback dry-run:

```bash
npm run source:browser-fallback-batch -- --json --max-runs=3
```

Result:

- fallback rows: `5`
- clean retry ready rows: `0`
- selected rows: `0`
- source-session required rows: `5`

Plain English: there is nothing safe to auto-run right now. The remaining challenged rows need source-session/operator handling, not another automated browser retry.

## MyICOR OAuth And Browser Visibility

Steve approved the MyICOR read-only OAuth connector setup during this sprint lane. The agent completed the flow with the isolated local Playwright/Chrome profile, stored the OAuth token in macOS Keychain, and verified the MCP tool list.

- Token metadata ref: `macos-keychain:bcrew-ai-os/myicor-mcp-oauth/myicor-authorized-member`
- Verified command: `npm run myicor:mcp-tools -- --json`
- Tool count: `16`
- Raw secret printed: `false`

Operator visibility rule now captured in the sprint/broker docs: visible local isolated browser mode is the default; `--headless` is explicit. The watchable MyICOR auth command is:

```bash
npm run myicor:mcp-authorize-agent -- --account=myicor-authorized-member --json --timeoutMs=300000
```

The hidden/headless command is only for cases where Steve does not need to watch:

```bash
npm run myicor:mcp-authorize-agent -- --account=myicor-authorized-member --json --headless --timeoutMs=300000
```

Both modes use the same source-owned isolated profile under `.openclaw` and write local live-state artifacts (`live-state.json`, `live-screenshot.png`). Neither mode uses Steve's normal Chrome profile or Browserbase.

## MyICOR Source System Map V1

Steve clarified the intended source-system pattern after OAuth succeeded: MyICOR and Skool should be mapped and monitored like source systems, not manually browsed once or blindly crawled. The map should know what exists, what changed, what is high-value, what is useless, and what was already implemented or cleared so Dev Director does not keep resurfacing stale material.

Implemented `MYICOR-SOURCE-SYSTEM-MAP-001` as a scoped P0 backlog card and focused proof:

- `lib/myicor-source-system-map.js`
- `scripts/process-myicor-source-system-map-check.mjs`
- `docs/process/myicor-source-system-map-001-plan.md`
- package script: `process:myicor-source-system-map-check`

Verified MyICOR MCP metadata from live read-only calls:

- `15` courses
- about `265` lesson metadata rows from course counts
- high-signal clusters: `AI Mastery`, `Claude Mastery for Professionals`, `myPKA System`, `Automation like a Pro`
- MCP gap: no full lesson body/script or video/audio capture from `get_courses`/`get_lessons`

Architecture locked:

- MCP catalog first
- visible local isolated browser only for approved MCP gaps
- state/fingerprint/delta before extraction
- grade/keep/ignore/implemented-cleared suppression before Dev Director recommendations
- no Browserbase, normal Chrome, broad crawl, lesson-content extraction, raw-secret read, atom/vector writes, or external writes in this map slice

First exact extraction candidates:

1. `myPKA System` / `Why an AI Team Beats a Smart Chatbot`
2. `Claude Mastery for Professionals` / `Building a Personal Intelligence System: Inside Paco's 17-Agent Mindset Architecture`
3. `AI Mastery` / `Agent (The Specialist)`
4. `AI Mastery` / `MCP (The Toolbox)`
5. `AI Mastery` / `Orchestration (The Team Leader)`

Next cards split cleanly:

- `MYICOR-MCP-CATALOG-SNAPSHOT-001`: persist catalog/delta state without content extraction
- `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`: one exact approved high-value lesson/content extraction proof
- `SKOOL-SOURCE-SYSTEM-MAP-001`: reuse the same pattern for approved Skool courses/communities

## Source-System State And Builder Memory Vision

Steve restated the broader operating model: source systems should compound. The system should know what it has discovered, what is metadata-mapped, what has been extracted, what changed, what is trash, what was implemented/cleared, and what should feed Dev Director again.

Captured as live backlog anchors:

- `MYICOR-MCP-CATALOG-SNAPSHOT-001`: persist MyICOR MCP catalog source-state rows and report artifact.
- `SKOOL-SOURCE-SYSTEM-MAP-001`: map approved free and paid Skool communities before broad extraction.
- `SOURCE-EXTRACTION-STATE-LEDGER-001`: mark extracted/not-extracted/changed/ignored/implemented-cleared state.
- `DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001`: daily old-plus-new evidence review, enrichment, suppression, and upgrade recommendations.
- `DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001`: clean `/dev` around built/running/blocker/proof truth.
- `BUILDER-MEMORY-SYSTEM-001`: builder memory and startup context from live sprint/source/backlog/proof truth so agents stop starting from scratch.

The MyICOR catalog snapshot is the first persisted proof of this pattern: `source_crawl_items` for state rows, `intelligence_report_artifacts` for review, no content extraction.

Live snapshot result:

- command: `npm run process:myicor-mcp-catalog-snapshot-check -- --live-mcp --apply --json`
- MCP calls: `21`
- courses: `15`
- lesson metadata rows: `265`
- learning-resource metadata rows: `16`
- source-state rows persisted: `296`
- report artifact: `source-system:myicor:mcp-catalog-snapshot:v1`
- target: `myicor-mcp-catalog-snapshot-v1`
- content captured: `false`
- browser started: `false`
- external writes: `false`

The shared source extraction state ledger is now the second proof: `SOURCE-EXTRACTION-STATE-LEDGER-001` is built under `source-extraction-state-ledger-v1` with report artifact `source-system:extraction-state-ledger:v1`.

Live ledger result:

- command: `npm run process:source-extraction-state-ledger-check -- --apply --json`
- governed targets summarized: `24`
- source items summarized: `21,916`
- MyICOR mapped rows: `296`
- MyICOR extracted content rows: `0`
- state axes: discovery, extraction, review/suppression
- suppression model: `graded_ignore` and `implemented_cleared` are reversible Director-routing history, not deletion
- source rows mutated: `false`
- atom/vector writes: `false`
- browser started: `false`
- external writes: `false`

The Skool source-system map is now the third proof: `SKOOL-SOURCE-SYSTEM-MAP-001` is built under `skool-source-system-map-v1` with report artifact `source-system:skool:source-system-map:v1`.

Live Skool map result:

- command: `npm run process:skool-source-system-map-check -- --apply --json`
- governed Skool targets mapped: `4`
- source items found: `0`
- extracted Skool content rows: `0`
- paid/private/member targets blocked: `2`
- public-read targets packet-gated: `1`
- source rows mutated: `false`
- atom/vector writes: `false`
- browser started: `false`
- login/join/course crawl/member read/download/post/comment/message: `false`
- external writes: `false`

The Dev Director daily source review loop is now the fourth proof: `DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001` is built under `dev-director-daily-source-review-loop-v1` with report artifact `director:dev-daily-source-review-loop:v1`.

Live Director review result:

- command: `npm run process:dev-director-daily-source-review-loop-check -- --apply --json`
- input reports: Director, source-state ledger, MyICOR MCP catalog snapshot, exact MyICOR extraction proof, Skool source-system map
- existing Director candidates reviewed: `2,319`
- new/changed/kept ledger candidates: `1`
- extracted evidence candidates: `1`
- MyICOR exact packet candidates: `12`
- Skool packet targets: `4`
- suppressed searchable history items: `0`
- auto backlog promotions: `0`
- extraction runs started: `0`
- source rows mutated: `false`
- atom/vector writes: `false`
- browser started: `false`
- external writes: `false`

The Dev page system truth cleanup is now the fifth proof: `DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001` is built under `dev-page-system-truth-cleanup-v1` with report artifact `dev-page:system-truth-cleanup:v1`.

Live Dev page truth result:

- command: `npm run process:dev-page-system-truth-cleanup-check -- --apply --json`
- Dev Hub payload field: `systemTruth`
- Dev page section: `System Truth`
- visible systems: `7` built/running/blocked source systems with counts, proof commands, report IDs, and next actions
- reports surfaced: `6`
- source ledger items surfaced: `21,987`
- extracted evidence candidates surfaced: `1`
- MyICOR packet candidates surfaced: `12`
- Skool targets surfaced: `4`
- blocked/approval rows surfaced: from daily source review plus Skool map
- auto backlog promotions: `0`
- extraction runs started: `0`
- source rows mutated: `false`
- atom/vector writes: `false`
- browser started: `false`
- Browserbase default: `false`
- external writes: `false`

The builder memory startup packet is now the sixth proof: `BUILDER-MEMORY-SYSTEM-001` is built under `builder-memory-system-v1` with report artifact `builder-memory:startup-packet:v1`.

Live builder memory result:

- command: `npm run process:builder-memory-system-check -- --apply --json`
- startup packet command: `npm run builder:startup-packet`
- input reports: Dev page system truth, daily source review, source extraction ledger, MyICOR MCP catalog, exact MyICOR extraction proof, Skool source map
- live truth loaded: Current Sprint, relevant backlog cards, source reports, source counts, active blocker, guardrails, proof commands, next cards
- source ledger items surfaced: `21,987`
- extracted evidence candidates surfaced: `1`
- MyICOR packet candidates surfaced: `12`
- Skool targets surfaced: `4`
- private memory copied into repo truth: `false`
- chat memory authoritative: `false`
- auto backlog promotions: `0`
- extraction runs started: `0`
- source rows mutated: `false`
- atom/vector writes: `false`
- browser started: `false`
- Browserbase default: `false`
- external writes: `false`

The exact MyICOR source packet is now the seventh proof: `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001` is built under `myicor-approved-lesson-extract-proof-v1` with report artifact `source-system:myicor:approved-lesson-extract-proof:v1`.

Live exact MyICOR extraction result:

- command: `npm run process:myicor-approved-lesson-extract-proof-check -- --live-mcp --live-browser --headless --apply --json`
- exact resource: `Stop Managing Your AI Agents. Build the One That Manages Them for You.`
- source URL: `https://app.myicor.com/resources/stop-managing-your-ai-agents-build-the-one-that-manages-them-for-you`
- source target: `myicor-approved-lesson-extract-proof-v1`
- source state: `extracted_with_evidence` and `graded_keep`
- text captured: `18,033` chars
- content hash: `4bcf30a70eb180f029202a1f5c93e335265aa60f20930006cbbee7987f3c7cec`
- screenshot hash: `cfd3631880d2ee76feaecbe24407c888774bd89b64434ddf51b39ecf3c43df91`
- raw text storage: local-only under `.openclaw/myicor-approved-lesson-extract`
- screenshot storage: local-only under `.openclaw/myicor-approved-lesson-extract`
- browser route: source-owned isolated MyICOR profile
- MCP-first: `true`
- broad crawl: `false`
- clicks/forms/downloads/external writes: `false`
- Browserbase: `false`
- normal Chrome: `false`
- atom/vector writes: `false`
- auto backlog promotion: `0`

## Proof

Green after dashboard and worker restart:

```bash
npm run process:human-web-agent-v1-sprint-plan-check -- --json
npm run process:build-intel-link-approval-source-packets-check -- --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:source-browser-runtime-cost-guardrails-check -- --json
npm run process:source-browser-brain-route-policy-check -- --json
npm run process:source-browser-agent-harness-check -- --json
npm run process:source-browser-agent-executor-check -- --json
npm run process:source-browser-fallback-executor-check -- --json
npm run process:source-session-readiness-check -- --json
npm run myicor:mcp-tools -- --json
npm run process:myicor-source-system-map-check -- --apply --json
npm run process:myicor-source-system-map-check -- --json
npm run process:myicor-mcp-catalog-snapshot-check -- --live-mcp --apply --json
npm run process:myicor-mcp-catalog-snapshot-check -- --json
npm run process:source-extraction-state-ledger-check -- --apply --json
npm run process:source-extraction-state-ledger-check -- --json
npm run process:skool-source-system-map-check -- --apply --json
npm run process:skool-source-system-map-check -- --json
npm run process:skool-free-community-god-mode-runner-check -- --json
npm run process:dev-director-daily-source-review-loop-check -- --apply --json
npm run process:dev-director-daily-source-review-loop-check -- --json
npm run process:dev-page-system-truth-cleanup-check -- --apply --json
npm run process:dev-page-system-truth-cleanup-check -- --json
npm run process:builder-memory-system-check -- --apply --json
npm run process:builder-memory-system-check -- --json
npm run process:myicor-approved-lesson-extract-proof-check -- --json
npm run process:myicor-approved-lesson-extract-proof-check -- --live-mcp --json
npm run process:myicor-approved-lesson-extract-proof-check -- --live-mcp --live-browser --headless --apply --json
npm run process:myicor-approved-lesson-extract-proof-check -- --json
npm run builder:startup-packet
npm run process:verifier-surface-trust-split-module-check -- --json
npm run process:verifier-surface-trust-orchestration-split-check -- --json
npm run process:source-god-mode-youtube-handoff-check -- --json
npm run process:current-sprint-dynamic-truth-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

Final verifier result:

- `foundation:verify`: `519/519`
- `backlog:hygiene`: healthy, `875` cards, `0` findings
- `process:source-session-readiness-check`: healthy; MyICOR OAuth token metadata present
- `myicor:mcp-tools`: healthy; `16` read-only MCP tools visible
- `process:myicor-source-system-map-check`: healthy; live backlog card `MYICOR-SOURCE-SYSTEM-MAP-001/scoped/P0`
- `process:skool-source-system-map-check`: healthy; live backlog card `SKOOL-SOURCE-SYSTEM-MAP-001/done/P0`
- `process:skool-free-community-god-mode-runner-check`: healthy against local fixture only; no live Skool community touched
- `process:dev-director-daily-source-review-loop-check`: healthy; live backlog card `DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001/done/P0`
- `process:dev-page-system-truth-cleanup-check`: healthy; live backlog card `DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001/done/P0`
- `process:builder-memory-system-check`: healthy; live backlog card `BUILDER-MEMORY-SYSTEM-001/done/P0`
- `process:myicor-approved-lesson-extract-proof-check`: healthy; live backlog card `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001/done/P0`

One post-ledger `foundation:verify` run correctly caught missing done-card verifier coverage for `SOURCE-EXTRACTION-STATE-LEDGER-001`, which also made the surface/trust self-checks report `9/10`. The card is now registered in `lib/foundation-verify-coverage-card-ids.js`; both focused surface/trust proofs passed, services were restarted, and the full verifier rerun passed `519/519`.

## Next Right Step

Do not start Browserbase. Do not run live newsletter signup, auth resume, Telegram delivery, login, purchase, download, post/comment/message, profile mutation, credential mutation, or paid/source-session extraction without Steve approval.

The next build slice should be another exact approved source packet, most likely an exact Skool free/public packet before any Skool runner or a second exact MyICOR lesson/resource if Steve approves the title and URL. Do not run broad Skool/MyICOR crawling; source extraction now needs exact packet scope, source-session state, and content-use approval.

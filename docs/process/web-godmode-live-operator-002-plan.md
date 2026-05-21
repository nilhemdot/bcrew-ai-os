# WEB-GODMODE-LIVE-OPERATOR-002 Plan

## What

Build the first real GOD-mode live operator proof for `WEB-GODMODE-LIVE-OPERATOR-002`.

The exact approved target is Mark Kashef's public YouTube video `5xrjO38WUYY`, `How to Use /goal to Build a Self-Improving OS`, at `https://www.youtube.com/watch?v=5xrjO38WUYY`. Steve also supplied the public channel videos page `https://www.youtube.com/@Mark_Kashef/videos` as the later public YouTube queue source.

This card proves one exact public/no-auth source item only. It launches a real browser, navigates the YouTube page, reads page/body/description text, captures viewport and video-player screenshot artifacts, discovers and classifies description/resource links, detects caption-track metadata, runs the existing exact YouTube transcript target, and persists a reviewed proof report artifact with provenance.

## Why

The previous `WEB-GODMODE-001` closeout was useful as a governed synthetic kernel, but it did not prove the real capability Steve asked for: a worker that can navigate a page like a human, inspect video/page state, take screenshots, read transcripts/descriptions/resource links, and keep strong boundaries around paid/private/auth-required content.

This card repairs that promise-to-proof gap without jumping straight into broad crawls or private sources. Once one public Mark Kashef video works end to end, the next safe card is the bounded Mark latest/last-20 public YouTube scout.

## Acceptance Criteria

- The operator opens exactly `https://www.youtube.com/watch?v=5xrjO38WUYY` through Playwright with no logged-in/auth browser session.
- The proof captures page title/body text, video title/channel evidence, expanded description text, and DOM link evidence from the live page.
- The proof captures a viewport screenshot and a video-player screenshot as local temporary artifacts, records byte count and SHA-256 hash metadata, and does not commit screenshot bytes to tracked docs.
- The proof detects YouTube caption-track metadata from the live player.
- The proof classifies outbound resource links, including Skool/Gumroad/Calendly-style links, as approval-required or later-follow candidates and does not follow them.
- The proof seeds exactly one public video inventory item and runs `video-content-extract-backfill` with `--onlyExternalId=https://www.youtube.com/watch?v=5xrjO38WUYY`.
- The transcript artifact `SRC-YOUTUBE-INTEL-001:video_transcript:5xrjO38WUYY` is persisted or the card fails closed with the exact transcript/quota/route failure.
- The proof report artifact `proof:web-godmode-live-operator-002:mark-kashef-5xrjo38wuyy` stores the browser observation, screenshot metadata, transcript context, extraction context, resource link classifications, stop controls, and approval-required actions.
- Dogfood rejects private Skool/classroom access, broad channel extraction, external link following/purchase/form actions, missing screenshots, missing caption evidence, and missing transcript artifact.
- Current Sprint advances to `YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002` only after this one-video proof and raw Foundation gates pass.

## Definition Of Done

Done means `WEB-GODMODE-LIVE-OPERATOR-002` is closed under `web-godmode-live-operator-v1`, the exact Mark Kashef public video has live browser observation proof, viewport/video-player screenshot metadata, description/resource link classifications, caption-track metadata, exact transcript artifact, a persisted proof report artifact, and no auth/private/paid/external-follow side effects.

The proof must call the actual browser path and actual transcript target runner. Substring checks, synthetic-only fixtures, metadata-only claims, and "we can do it later" closeouts do not count as done.

## Details

Existing code reused:

- `lib/web-godmode-extractor.js`
- `lib/mark-kashef-goal-build-intel-packet.js`
- `lib/youtube-build-intel-runtime-proof.js`
- `scripts/run-extraction-target.mjs`
- `scripts/extract-video-content.mjs`
- `lib/e2e-staging-harness.js`

Existing scripts and live truth reused:

- Existing scripts: `scripts/run-extraction-target.mjs`, `scripts/extract-video-content.mjs`, and focused proof script wiring through `process:*`.
- Existing docs/current truth: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, live Backlog, and Current Sprint.

Existing storage reused:

- `source_crawl_items` for the exact public video inventory/extraction item
- `shared_communication_artifacts` for the video transcript artifact
- `intelligence_report_artifacts` for the live operator proof report
- Current Sprint overlay and live Backlog for sequencing truth

Screenshot storage policy:

- Public YouTube screenshots are allowed for this exact proof.
- Screenshot bytes are written only to a local temp directory and are not committed.
- Durable proof stores screenshot kind, path, byte count, SHA-256 hash, viewport/source URL, and storage class.
- Private/paid/auth-required screenshot storage remains blocked until a source-specific approval card names retention and content-use policy.

Gate decision tree: static syntax checks run for edited modules, the focused proof is `npm run process:web-godmode-live-operator-check -- --close-card --json`, and full Foundation ship runs because this card launches a live browser, writes local screenshot artifacts, writes DB artifacts, updates Current Sprint, and changes ship/coverage registry files.

Behavior proof: the focused proof calls the actual function path `runWebGodmodeLiveBrowserObservation()`, the actual Playwright browser path, the actual exact extraction target runner, and the actual report persistence path. Dogfood cases reject weak variants: private Skool, broad channel extraction, external follow/purchase/form actions, and missing screenshot/caption/transcript evidence. Substring-only proof is explicitly rejected.

Operator value: Steve gets useful product behavior, not just a process artifact. The system can now open the public source he named, see the video page, read the description/resources, preserve screenshot and transcript provenance, and tell him which links require approval before it clicks, buys, books, or downloads anything. This unlocks better quality for the Mark latest/last-20 public YouTube scout.

Speed boundary: the focused gate is proportional and bounded to one exact public video, one browser page, two screenshots, one exact transcript target run, and one report artifact. It is intended to stay fast enough for normal closeout use instead of becoming another heavy overnight crawl.

## Risks

- YouTube layout or consent UI may block description expansion or player screenshot capture. Repair path: make selectors more robust and rerun the focused proof; do not downgrade to synthetic proof.
- DataForSEO/YouTube subtitle extraction may fail or have quota limits. Repair path: fail closed, leave the card open with the exact failure, and do not invent transcript text.
- Resource links can include paid/community/download/booking actions. Repair path: classify and stop; follow only under a later explicit approval card.
- Screenshot bytes can become repo bloat or private-content leakage if generalized. Repair path: keep bytes local-temp for this public proof and require storage policy before private/paid screenshots.
- Broad-channel work can accidentally start before one-video proof is stable. Repair path: exact URL preflight and dogfood broad-channel rejection.

## Tests

- `node --check lib/web-godmode-live-operator.js`
- `node --check scripts/process-web-godmode-live-operator-check.mjs`
- `npm run process:web-godmode-live-operator-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=WEB-GODMODE-LIVE-OPERATOR-002 --planApprovalRef=docs/process/approvals/WEB-GODMODE-LIVE-OPERATOR-002.json --closeoutKey=web-godmode-live-operator-v1 --commitRef=HEAD`

## Not Next

- No last-20 YouTube batch until this one exact public video proof is green.
- No Skool, Gumroad, Calendly, MyICOR, Loom, comments/member, paid-source, or authorized-browser/private-source crawl.
- No purchase, download, opt-in, booking, form submit, credential mutation, browser-profile mutation, or external write.
- No provider/vision/model interpretation in this card.
- No Strategy/People work.

## Changed Files

- `lib/web-godmode-live-operator.js`
- `scripts/process-web-godmode-live-operator-check.mjs`
- `docs/process/web-godmode-live-operator-002-plan.md`
- `docs/process/approvals/WEB-GODMODE-LIVE-OPERATOR-002.json`
- `docs/handoffs/2026-05-20-web-godmode-live-operator-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-intelligence-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `package.json`

# YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002 Plan

## What

Build the first bounded Mark Kashef public YouTube scout for `SRC-YOUTUBE-INTEL-001`.

The approved public channel videos page is `https://www.youtube.com/@Mark_Kashef/videos`. The first exact seed video is `https://www.youtube.com/watch?v=5xrjO38WUYY`, `How to Use /goal to Build a Self-Improving OS`.

This card discovers the current latest/last-20 public videos, captures the seed-video transcript, description/resource links, caption/visual metadata, and screenshot hashes where allowed, then converts the raw capture into Dev Team Intelligence V1 observations, proposal-only atoms/candidates, a scout report, and Build Intel review routes. It creates no backlog cards automatically.

## Why

`WEB-GODMODE-LIVE-OPERATOR-002` proved one exact public Mark Kashef video can be opened, inspected, screenshotted, and tied to the transcript artifact. Steve now needs the useful next step: a bounded public YouTube scout that sees the channel's current video queue, ranks AIOS/dev-team build opportunities, and reports the result for review without drifting into paid/private source extraction.

Foundation remains source/intelligence truth. Dev Team Hub and Build Intel read the persisted Foundation report/atoms/review-route truth; there is no separate silo.

## Acceptance Criteria

- The scout opens only the public Mark Kashef YouTube channel videos page and discovers at most 20 public videos.
- The latest video candidate and the exact seed video `5xrjO38WUYY` are recorded with video ID, normalized URL, title, visible metadata, and screenshot metadata.
- The seed video page is captured through the existing public browser/operator path with no logged-in/auth browser session.
- The seed transcript artifact `SRC-YOUTUBE-INTEL-001:video_transcript:5xrjO38WUYY` is present and source-linked.
- Description/resource links are classified and not followed; Skool, Gumroad, Calendly, purchase/download/opt-in/community/course/private/auth/member/comment surfaces are approval-bound.
- Screenshot/visual metadata is stored as local temp paths, byte counts, hashes, caption tracks, and policy notes; screenshot/media bytes are not committed.
- The raw capture becomes ranked AIOS/dev-team opportunities, proposal-only atoms/candidates, evidence hits, and Build Intel review routes.
- The scout report artifact is persisted for Foundation/Dev Team review and records `createsBacklogCardsAutomatically=false` and `externalWrites=false`.
- Dogfood rejects private/paid source drift, external follow/purchase/form behavior, short/missing transcript evidence, and auto-promotion posture.
- Current Sprint advances only after the focused proof and raw Foundation gates pass.

## Definition Of Done

Done means `YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002` is closed under `youtube-scout-latest-video-vision-v1`, the Mark Kashef public latest/last-20 discovery and exact seed-video capture read back from persisted Foundation truth, Dev Team opportunities are proposal-only, no backlog cards or external writes were created, and raw Foundation gates remain green.

## Details

Existing code reused:

- `lib/web-godmode-live-operator.js`
- `lib/youtube-build-intel-runtime-proof.js`
- `lib/build-intel-extraction-implementation.js`
- `lib/build-intel-daily-extraction-review.js`
- `shared_communication_artifacts`, `intelligence_report_artifacts`, `intelligence_atoms`, and `intelligence_atom_hits`

Existing docs, scripts, and live truth reused:

- Existing docs: `docs/process/web-godmode-live-operator-002-plan.md`, `docs/process/youtube-build-intel-runtime-proof-001-plan.md`, and the WEB-GODMODE closeout handoff.
- Existing scripts: `scripts/process-web-godmode-live-operator-check.mjs`, `scripts/process-youtube-build-intel-runtime-proof-check.mjs`, and `scripts/run-extraction-target.mjs`.
- Live Backlog and Current Sprint remain the sequencing truth for `YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002`, `WEB-GODMODE-LIVE-OPERATOR-002`, and the next scoped card.

New focused code:

- `lib/youtube-scout-latest-video-vision.js`
- `scripts/process-youtube-scout-latest-video-vision-check.mjs`

Behavior proof: the focused proof calls actual function paths: `runYoutubeScoutLatest20Discovery()`, `runYoutubeScoutSeedVideoCapture()`, the existing browser observation function, report/atom/hit persistence, and Current Sprint update. It rejects weak dogfood cases for private-source drift, external follow behavior, short transcript evidence, and auto-promotion posture. We reject substring-only proof; marker checks cannot replace the live browser/API/DB round trip.

Gate decision tree: this is a full ship gate. The blast radius includes public YouTube browser discovery, local screenshot hash artifacts, internal Foundation intelligence writes, Current Sprint updates, closeout registry, verifier coverage, and `process:foundation-ship`. Static-only or focused-only gates are not enough for closeout, though the card keeps its focused proof proportional.

Operator value: Steve and the dev team get useful product behavior, not only process artifacts. The system can look at the current Mark Kashef public video queue, identify the latest video, connect it to the seed-video transcript and page evidence, and hand Steve ranked build opportunities with exact approval gates before anything becomes work.

Speed boundary: the default focused proof is bounded to one channel page, at most 20 public video rows, one seed video page, local screenshot hashes, existing transcript readback, and one internal report/atom write set. It is designed to stay fast enough to use by default and not become another heavy overnight crawl.

Repair path: if YouTube layout, browser capture, transcript readback, report persistence, or a raw Foundation gate fails, the card fails closed and remains active. The repair is to fix the exact failing function/API/process path and rerun the focused proof; do not downgrade to stale screenshots, synthetic-only proof, or hidden classification. If source approval is needed, park the exact source item and keep private/paid work blocked.

## Risks

- YouTube layout changes can reduce channel discovery or description capture quality. Repair path: update selectors and dogfood the actual browser path again.
- The seed transcript artifact can be missing or stale. Repair path: fail closed or rerun the exact public transcript target for `5xrjO38WUYY`; do not invent transcript text.
- Resource links can point to Skool, Gumroad, Calendly, purchases, downloads, opt-ins, or communities. Repair path: classify and stop until Steve approves exact follow-up.
- Report/atom persistence can regress schema contracts. Repair path: fix the Foundation report/atom write path and prove readback.
- Broad extraction pressure can creep in after discovery. Repair path: keep the limit at 20, keep only the seed video end-to-end in this card, and require separate approval for any promoted source item.

## Not Next

- No Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment extraction.
- No purchase, download, opt-in, booking, form submit, external message, credential mutation, browser profile mutation, or external write.
- No automatic backlog cards from scout findings.
- No Strategy/People work.

## Tests

- `node --check lib/youtube-scout-latest-video-vision.js`
- `node --check scripts/process-youtube-scout-latest-video-vision-check.mjs`
- `npm run process:youtube-scout-latest-video-vision-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002 --planApprovalRef=docs/process/approvals/YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002.json --closeoutKey=youtube-scout-latest-video-vision-v1 --commitRef=HEAD`

## Changed Files

- `lib/youtube-scout-latest-video-vision.js`
- `scripts/process-youtube-scout-latest-video-vision-check.mjs`
- `docs/process/youtube-scout-latest-video-vision-002-plan.md`
- `docs/process/approvals/YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002.json`
- `docs/_archive/handoffs/2026-05-21-youtube-scout-latest-video-vision-closeout.md`
- `lib/foundation-build-closeout-intelligence-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `package.json`

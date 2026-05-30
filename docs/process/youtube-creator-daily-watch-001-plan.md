# YOUTUBE-CREATOR-DAILY-WATCH-001 Plan

## What

Build the scheduled public no-auth YouTube creator watch for `SRC-CREATOR-WATCHLIST-001` and `SRC-YOUTUBE-INTEL-001`.

The watch reads the canonical Build Intel creator watchlist, selects active known public YouTube channel refs, checks their public `/videos` pages daily, and records video metadata into a deduped Foundation research pool. Mark Kashef and ICOR with Tom start with the last 50 public videos because Steve treats both as highest-value Build Intel sources. Other known public YouTube creator channels start with the last 20 public videos. That baseline is only catch-up, not completion: every new video released today, tomorrow, or later must keep entering the daily-delta queue for full extraction review. After baseline, the same watch records daily deltas by keeping first-seen and last-seen provenance.

## Why

Build Intel cannot depend on one-time scouting. Steve needs the system to notice when approved public creators publish new videos, preserve source-backed metadata, and make exact source items reviewable without automatically turning content into backlog work.

Foundation remains the source/intelligence truth. Dev Team Hub reads the Foundation target, report, atoms, and review rows; no separate silo is created.

## Acceptance Criteria

- The scheduled Foundation job `youtube-creator-daily-watch` is registered, enabled, daily, and allowlisted as `operational_write`.
- The job writes only governed internal Foundation rows: `source_crawl_targets`, `source_crawl_items`, `intelligence_report_artifacts`, `intelligence_atoms`, and `intelligence_atom_hits`.
- The watch derives creators from `lib/build-intel-watchlist.js`; it does not hardcode an alternate watchlist.
- Mark Kashef and ICOR with Tom use baseline depth `50`; every other watched public YouTube channel uses baseline depth `20`.
- Baseline depth does not cap future monitoring. New public uploads after baseline are still detected daily, preserved as deltas, and eligible for the governed full-watch extraction queue.
- Creator refs without a known public YouTube channel URL become lookup gaps, not invented URLs.
- Private, paid, auth, member, community, comment, course, Skool, MyICOR, Gumroad, Calendly, Loom, purchase, download, opt-in, booking, and form paths are not opened or followed.
- The research pool dedupes by YouTube video ID and preserves creator, channel URL, video ID, title, visible publish date text, URL, discovery run, source IDs, first-seen timestamp, and last-seen timestamp.
- A Foundation scout report exposes the pool for Dev Team Hub / Build Intel review and records `createsBacklogCardsAutomatically=false` and `noExternalWrites=true`.
- Title-level candidate atoms and evidence hits are proposal-only; they do not claim transcript/model/visual understanding.
- Focused proof dogfoods dedupe, baseline-depth rules, daily delta behavior, no-auth boundaries, no external writes, and no automatic backlog creation.
- Current Sprint closes only after the focused proof, raw Foundation gates, `foundation:verify`, and Foundation ship gate pass.

## Definition Of Done

Done means `YOUTUBE-CREATOR-DAILY-WATCH-001` is closed under `youtube-creator-daily-watch-v1`; the scheduled job has a fresh successful run; the `youtube-creator-daily-watch` source-crawl target and research-pool rows read back from Postgres; the report artifact `research-pool:youtube-creator-daily-watch` exposes proposal-only review output; System Health, backlog hygiene, Current Sprint gate, plan reconcile, `foundation:verify`, and `process:foundation-ship` are green; main is pushed clean.

## Details

Existing code reused:

- `lib/build-intel-watchlist.js` for canonical creator/source truth.
- `lib/foundation-source-crawl-store.js` via `foundation-db.js` for source-crawl target and item persistence.
- `lib/source-contracts.js`, `lib/source-contract-validation-layer.js`, `lib/source-lifecycle.js`, and `lib/source-lifecycle-completion.js` for source-boundary truth instead of hardcoding around blocked source posture.
- `lib/hub-read-routes.js` full-diagnostics compaction patterns so the added research-pool rows do not bloat Foundation health surfaces.
- `scripts/run-foundation-job.mjs` and `lib/foundation-jobs.js` for scheduled job execution.
- `lib/foundation-job-mutation-allowlist.js` for scheduled operational-write posture.
- `intelligence_report_artifacts`, `intelligence_atoms`, and `intelligence_atom_hits` for review-pool reporting.
- `lib/youtube-scout-latest-video-vision.js` selector patterns and prior public YouTube boundary precedent.

Existing docs reused:

- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` for the current sprint order, active-card truth, and next-card handoff.
- `docs/process/foundation-gate-decision-tree.md` for the full gate choice.
- `docs/process/approvals/YOUTUBE-CREATOR-DAILY-WATCH-001.json` for Steve-approved scope and source boundaries.

Existing scripts reused:

- `scripts/run-foundation-job.mjs` for the actual scheduled-job path.
- `scripts/process-youtube-creator-daily-watch-check.mjs` for focused proof and Current Sprint closeout.
- `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `process:current-sprint-active-card-gate-check`, `process:foundation-plan-reconcile-check`, `foundation:verify`, and `process:foundation-ship` for the raw closeout proof.

Live backlog / Current Sprint truth reused:

- The live Current Sprint API remains authoritative for active card, sprint order, source IDs, baseline depths, and the next card.
- Live Backlog status is changed only by the focused closeout path after proof passes; old shipped cards remain in Backlog done / Recent Work, not the active sprint overlay.

New code:

- `lib/youtube-creator-daily-watch.js`
- `scripts/run-youtube-creator-daily-watch.mjs`
- `scripts/process-youtube-creator-daily-watch-check.mjs`
- `/api/foundation/build-intel/youtube-creator-daily-watch`
- Source-contract/source-lifecycle truth for proposal-only public YouTube metadata watch posture, explicit no-LLM runtime caps, and continued richer-extraction gating.
- Full-diagnostics extraction-control compaction for this new research-pool target so System Health stays raw green without hiding rows.

Operator value:

- Steve and the Dev Team get one Foundation-backed review pool showing which approved public creators have new or baseline videos worth inspecting.
- The useful product behavior is a real workflow: daily public-video discovery, duplicate suppression, lookup-gap visibility, and proposal-only review output that lets Steve pick exact source items for later extraction.
- This unlocks better speed and quality for Build Intel without creating backlog-card spam, pretending title metadata is extraction, or splitting Dev Team Hub into a separate source of truth.

Speed boundary:

- The focused closeout gate stays proportional and fast by reading the latest successful job, target rows, report, atoms, hits, dogfood fixtures, and sprint truth; it does not recrawl YouTube during closeout.
- The live job is the only public YouTube discovery pass and is bounded to known public channel `/videos` pages, last 50 for Mark Kashef and ICOR with Tom, last 20 for other approved public creators, and no transcripts, models, screenshots, comments, or external links.
- The baseline catch-up is not a one-time archive. The same job keeps running after catch-up so new public uploads keep flowing into the research pool.
- If the focused proof or gates become slow, the repair path is to narrow the proof to the same real artifacts and keep broad crawling out of this card, not bypass the gate.

Runtime behavior:

1. Build a watch plan from active Build Intel creator watchlist rows.
2. Keep only known public YouTube channel URLs.
3. Open each public `/videos` page with a headless public no-auth browser.
4. Extract bounded title/URL/visible metadata rows only.
5. Upsert rows into `source_crawl_items` using video ID as the dedupe key.
6. Preserve first-seen and last-seen state on repeated daily runs.
7. Write a Foundation report and proposal-only title-level atoms/hits for review.
8. Keep the source-crawl target explicit about no LLM spend, runtime caps, baseline caps, no auth, and no external writes.

Gate decision tree: full ship gate. This card adds a scheduled operational-write job, source-crawl writes, report/atom/hit writes, a read API route, closeout registry entry, verifier coverage, and Current Sprint advancement. Static-only proof is insufficient.

Behavior proof: the focused proof requires a real successful Foundation job run, then reads back the target, pool rows, report, atoms, hits, job posture, and Current Sprint state. The dogfood proof recreates duplicate video IDs, Mark/ICOR 50 versus other 20 baseline rules, daily delta first-seen preservation, private URL rejection, and no-auto-promotion flags.

Repair path: if YouTube discovery, DB persistence, scheduled job status, report/atom readback, or a Foundation gate fails, keep this card active and fix the exact path. Do not hide failures with classification or mark the job healthy without a fresh successful run.

## Risks

- YouTube layout can change and reduce discovery quality. Repair path: update selectors and rerun the real scheduled job proof.
- Some watchlist rows have YouTube listed but no public channel URL. Repair path: record lookup gaps; do not fabricate channels.
- Title metadata can be mistaken for extraction. Repair path: report explicitly says transcript/model/visual extraction has not run.
- Scheduled job write posture can become unsafe. Repair path: keep the allowlist narrow and block if external writes, auth, or auto-backlog behavior appears.
- A new scheduled job can create System Health watch/red if it is due and not run. Repair path: close only after the Foundation job path has a fresh successful run.

## Not Next

- No Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment/course extraction.
- No transcript, description, screenshot, keyframe, visual, provider/model, or resource-link extraction from this daily watch.
- No purchase, download, opt-in, booking, form submit, external message, credential mutation, browser profile mutation, provider config mutation, or external write.
- No automatic backlog cards from creator findings.
- No Strategy/People work.
- No MEETING-VAULT-ACL-001 Phase B or Drive permission mutation.

## Tests

- `node --check lib/youtube-creator-daily-watch.js`
- `node --check scripts/run-youtube-creator-daily-watch.mjs`
- `node --check scripts/process-youtube-creator-daily-watch-check.mjs`
- `npm run foundation:job -- --job=youtube-creator-daily-watch --actor=youtube-creator-daily-watch-proof --force`
- `npm run process:youtube-creator-daily-watch-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=YOUTUBE-CREATOR-DAILY-WATCH-001 --planApprovalRef=docs/process/approvals/YOUTUBE-CREATOR-DAILY-WATCH-001.json --closeoutKey=youtube-creator-daily-watch-v1 --commitRef=HEAD`

## Changed Files

- `lib/youtube-creator-daily-watch.js`
- `scripts/run-youtube-creator-daily-watch.mjs`
- `scripts/process-youtube-creator-daily-watch-check.mjs`
- `docs/process/youtube-creator-daily-watch-001-plan.md`
- `docs/process/approvals/YOUTUBE-CREATOR-DAILY-WATCH-001.json`
- `docs/_archive/handoffs/2026-05-21-youtube-creator-daily-watch-closeout.md`
- `lib/foundation-job-mutation-allowlist.js`
- `lib/foundation-jobs.js`
- `lib/foundation-build-intel-routes.js`
- `lib/foundation-build-closeout-intelligence-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `lib/source-contracts.js`
- `lib/source-contract-validation-layer.js`
- `lib/source-lifecycle.js`
- `lib/source-lifecycle-completion.js`
- `lib/hub-read-routes.js`
- `server.js`
- `package.json`

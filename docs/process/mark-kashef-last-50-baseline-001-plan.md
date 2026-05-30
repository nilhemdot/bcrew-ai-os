# MARK-KASHEF-LAST-50-BASELINE-001 Plan

## What

Build the first real Mark Kashef God Mode YouTube extraction slice before any Mark last-50 scale-up.

This card starts with one exact approved public Mark video, `https://www.youtube.com/watch?v=5xrjO38WUYY`, and proves the full source package:

- Gemini API full video/audio/visual understanding from the YouTube URL.
- Current transcript/subtitle artifact when present.
- Public YouTube page evidence, description text, caption metadata, screenshot metadata, and resource-link classification.
- Safe public resource metadata follow only where the link is clearly public/no-auth/no-download/no-form.
- Approval queue for Skool, Gumroad, Calendly, paid/private/auth/download/opt-in/member/course/community links.
- Ranked build/business/marketing opportunities with evidence and provenance.
- Model quality/value comparison between `gemini-2.5-flash` and `gemini-3.5-flash`.

This does not close the full Mark last-50 baseline. It creates the one-video end-to-end proof needed before the next 3-video or 5-video guarded batch.

## Why

Steve corrected the extraction doctrine: the system must not process 50 videos through weak metadata, transcript-only, or Gemini subscription URL-scout output and call that God Mode.

The previous Eyes quality loop proved Gemini API video understanding improves extraction quality. The strict Gemini Workspace retest showed the subscription web route cannot currently be trusted as full YouTube video watching from a URL. Therefore Mark scale-up must use the API full-watch route for video/audio/visual understanding, with subscription routes kept for reasoning over bounded evidence where they are actually proven.

This card also answers Steve's model question: use the best quality-for-value Gemini model, not an old default by habit.

## Acceptance Criteria

- The active sprint card remains `MARK-KASHEF-LAST-50-BASELINE-001` and is not marked done by this one-video slice.
- The proof reads the exact Mark video from the existing daily YouTube watch / source truth, not a private ad hoc list.
- The proof uses Gemini API video understanding for the full video/audio/visual route.
- The proof compares `gemini-2.5-flash` against `gemini-3.5-flash` on the same source package.
- The comparison records quality score, timestamped visual evidence count, build candidate count, token usage, and quality per 1K tokens.
- The transcript artifact, YouTube page description, caption metadata, resource links, and screenshot metadata are included in the same report.
- External links are classified. Safe public metadata follows are bounded; approval-required links are not followed.
- The persisted report records the chosen recommended model and why.
- Proposal-only atoms and evidence hits are persisted for the top recommendations.
- No backlog cards are auto-created.
- No private/auth/member/comment/course crawling runs.
- No purchases, downloads, opt-ins, bookings, forms, credential mutation, browser-profile mutation, or external writes occur.
- No `MEETING-VAULT-ACL-001` Phase B, Drive permissions mutation, or request-access emails are in scope.

## Definition Of Done

Done for this slice means the one-video Mark God Mode extraction report reads back from Foundation truth with model comparison, source package evidence, ranked candidates, approval boundaries, atoms, hits, and Current Sprint still points to the Mark baseline as active work.

The full `MARK-KASHEF-LAST-50-BASELINE-001` card is done only after the remaining Mark batch plan is executed or explicitly split into visible follow-up cards. V1 means one end-to-end full-watch proof, not last-50 completion.

## Details

Existing work reused:

- Existing code: `lib/god-mode-extractor-eyes-quality-loop.js`, `lib/gemini-video-brain-route.js`, `lib/web-godmode-live-operator.js`, `lib/youtube-creator-daily-watch.js`, and Foundation intelligence report/atom/hit stores.
- Existing docs: `docs/source-notes/god-mode-extractor-eyes-quality-loop-2026-05-23.md`, `docs/_archive/handoffs/2026-05-23-god-mode-extractor-checkpoint.md`, and this sprint plan.
- Existing scripts: `scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs` and `scripts/process-youtube-creator-daily-watch-check.mjs`.
- Live truth: `SRC-YOUTUBE-INTEL-001`, `source_crawl_items` from `youtube-creator-daily-watch`, `shared_communication_artifacts` transcript rows, `intelligence_report_artifacts`, `intelligence_atoms`, and `intelligence_atom_hits`.

New focused code:

- `lib/god-mode-youtube-end-to-end-extractor.js`
- `scripts/process-mark-kashef-last-50-baseline-check.mjs`
- `lib/mark-kashef-god-mode-small-batch.js`
- `scripts/process-mark-kashef-god-mode-small-batch-check.mjs`

Behavior proof:

- The focused script calls the actual YouTube page capture path.
- The focused script calls the actual Gemini API video-understanding path twice, once per model.
- The focused script persists and reads back the report, atoms, and hits when `--apply` is used.
- The dogfood proof rejects subscription-scout output as full-watch proof and rejects transcript-only scale-up.
- The small-batch proof selects the next 3-5 unwatched Mark videos from the Foundation daily watch pool, uses only `gemini-3.5-flash` by default, persists one stable API full-watch batch report, and keeps all candidates proposal-only.
- Marker checks, stale reports, substring proof, and "we found data" without video/audio/visual evidence are not accepted.

Gate decision tree uses static, focused, and full based on blast radius. Static gates are syntax-only (`node --check`). The focused gate is `process:mark-kashef-last-50-baseline-check` and proves the real source package, model calls, persistence, and readback. Full gates are `foundation:verify` and the Foundation health checks after persistence because the blast radius includes live provider calls, Foundation intelligence writes, and Current Sprint truth. `process:foundation-ship` is only for final closeout work, not for this one-video active-card slice.

Operator value: Steve gets a clear answer to one operational question: "Can one Mark video become source-backed build opportunities with evidence, and which Gemini model should we use before scaling?"

Speed boundary: this is a narrow, fast, proportional one-video slice designed to run under 15 minutes in normal provider conditions. It processes one video, two models, bounded page/resource evidence, and proposal-only output. No last-50 run in this slice, and not another heavy overnight crawl.

Repair path: if either Gemini model fails, if the page evidence fails, or if persisted truth does not read back, the card remains active. Fix the exact failing route and rerun this one-video proof. Do not downgrade to subscription-scout or transcript-only output.

## Risks

- `gemini-3.5-flash` may be unavailable to the current API key or region. Repair path: record provider failure, keep `gemini-2.5-flash` as the known-good route, and do not pretend comparison happened.
- YouTube page layout may hide description/resource links. Repair path: update the public page capture selectors and rerun the same exact video.
- Resource links may lead to Skool, Gumroad, Calendly, downloads, paid content, or opt-ins. Repair path: classify and queue for approval; do not follow.
- Model output may be generic. Repair path: tighten the prompt and rerun one video before scaling.
- Token cost can creep during model comparison. Repair path: record usage metadata and quality-per-token before choosing the default model.

## Tests

- `node --check lib/god-mode-extractor-eyes-quality-loop.js`
- `node --check lib/god-mode-youtube-end-to-end-extractor.js`
- `node --check scripts/process-mark-kashef-last-50-baseline-check.mjs`
- `npm run process:mark-kashef-last-50-baseline-check -- --json`
- `npm run process:mark-kashef-last-50-baseline-check -- --apply --live-gemini-api --json`
- `npm run process:mark-kashef-god-mode-small-batch-check -- --apply --live-gemini-api --batch-size=3 --model=gemini-3.5-flash --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`

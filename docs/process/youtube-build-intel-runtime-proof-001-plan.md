# YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001 Plan

## What

Build a narrow V1 runtime proof for `YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001`: run exactly one approved public YouTube Build Intel video through the existing governed extraction target, then persist the local provenance, Brain Fleet ledger truth, report artifact, atoms, hits, training notes, review route, duplicate/staleness guard, and explicit skipped/error reasons.

The exact approved target is Nick Saraev's public video `K65vd9EYbDU`, `I Built a $1M/y SaaS with Claude Code, Here's How`, published `2026-05-20T13:30:22Z`, at `https://www.youtube.com/watch?v=K65vd9EYbDU`.

This is a bounded, fast, proportional runtime card. It is not a broad channel crawl, not a provider/model execution card, and not a private-source approval card.

## Why

Foundation already proved the governed extractor path on an archived transcript. Steve's useful operator workflow needs proof that AIOS can take one fresh approved public Build Intel video, capture the transcript through the controlled target runner, preserve source/provenance, and create reviewable local intelligence outputs without weakening Foundation health.

This unlocks a quality-controlled path toward a later last-20 public YouTube batch only after one real public item works cleanly.

## Acceptance Criteria

- The exact public YouTube inventory item for `https://www.youtube.com/watch?v=K65vd9EYbDU` is seeded as public/no-auth and no Skool/MyICOR/Loom/private row is selected.
- The focused process path runs `scripts/run-extraction-target.mjs` and `scripts/extract-video-content.mjs` with an exact external-ID filter that preserves the full YouTube URL, including the `v=K65vd9EYbDU` query value.
- The transcript artifact `SRC-YOUTUBE-INTEL-001:video_transcript:K65vd9EYbDU` is persisted or the card fails closed with the exact transcript/quota/route failure.
- Build Intel extraction consumes exactly one selected transcript artifact and produces observations, proposal-only review route truth, implementation atom inputs, and atom-hit inputs.
- Brain Fleet ledger truth records workload, route, provider, model, account label, quota/reset posture, status, artifact refs, failure reason, and stop condition without running a provider summary call.
- A proof report artifact, atoms, hits, training notes, chapter-capture result or explicit unavailable reason, duplicate/staleness guard, and skipped/error reasons read back from persisted DB state.
- Dogfood rejects private/non-YouTube source rows, missing transcript artifact, short/empty transcript capture, OpenClaw-only route posture, auto-write review routes, and broad extraction without an exact external-ID filter.
- Credential truth remains unchanged, external notification/write helpers are absent, and Current Sprint advances only to `SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001` after the focused proof and raw gates pass.

## Definition Of Done

Done means `YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001` is closed under `youtube-build-intel-runtime-proof-v1`, the exact Nick Saraev public video has a fresh governed transcript artifact, the extraction run is scoped to that URL, Brain Fleet ledger truth exists, proof report/atoms/hits/training notes/review route are persisted, skipped/error reasons are explicit, Current Sprint advances to Skool exact-source approval work, and raw Foundation gates pass.

The proof must call actual function and process paths, including the target runner, source-crawl store exact filter, Build Intel extraction snapshot, Build Intel review snapshot, Brain Fleet ledger validator, report/atom persistence, and dogfood cases. Substring-only proof and string-match verifier theatre are rejected.

## Details

Existing code reused:

- `scripts/run-extraction-target.mjs`
- `scripts/extract-video-content.mjs`
- `lib/foundation-source-crawl-store.js`
- `lib/build-intel-extraction-implementation.js`
- `lib/build-intel-daily-extraction-review.js`
- `lib/brain-fleet-quota-ledger.js`
- `lib/intelligence-atoms.js`

Existing docs and backlog truth reused:

- `docs/source-notes/video-link-inventory.md`
- `docs/handoffs/2026-05-18-youtube-build-intel-batch-closeout.md`
- `docs/handoffs/2026-05-20-extractor-brain-fleet-proof-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- Live Backlog and Current Sprint truth for `YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001`, `EXTRACTOR-BRAIN-FLEET-PROOF-001`, `BRAIN-FLEET-QUOTA-LEDGER-001`, and `SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001`

Existing storage reused:

- `source_crawl_targets`
- `source_crawl_items`
- `shared_communication_artifacts`
- `llm_calls`
- `intelligence_report_artifacts`
- `intelligence_atoms`
- `intelligence_atom_hits`

Gate decision tree: static syntax checks are used for edited modules, the focused gate is `npm run process:youtube-build-intel-runtime-proof-check -- --close-card --json`, and the full gate is required because this card touches runtime extraction, source-crawl DB rows, intelligence writes, Current Sprint truth, package scripts, verifier coverage, and Foundation ship. Blast radius is bounded to one exact public URL and one local proof artifact set.

## Risks

- DataForSEO or YouTube subtitle retrieval may have quota, timing, or transcript availability failure. Repair path is fail closed, leave the card blocked with the exact failure, and do not invent a transcript.
- URL query parsing can regress and drop the `v=K65vd9EYbDU` value. Repair path is to fix the argument parser and rerun the exact focused proof until the extraction run proves the exact URL.
- A broad queue selection could accidentally choose old Skool/private rows. Repair path is fail closed through the exact external-ID filter and dogfood private-source rejection.
- Report/atom persistence can fail on schema contracts. Repair path is to use existing allowed report/atom enums and rerun idempotently.
- Any System Health, repeated-failure, backlog hygiene, active-card, plan-reconcile, or `foundation:verify` failure keeps the card open until the real cause is repaired or an exact blocking repair card is recorded.

## Tests

- `node --check lib/youtube-build-intel-runtime-proof.js`
- `node --check scripts/process-youtube-build-intel-runtime-proof-check.mjs`
- `node --check lib/foundation-source-crawl-store.js`
- `node --check lib/extract-retire.js`
- `node --check lib/runtime-first-jobs.js`
- `node --check lib/foundation-build-closeout-model-records.js`
- `node --check lib/foundation-verify-coverage-card-ids.js`
- `node --check scripts/extract-video-content.mjs`
- `node --check scripts/run-extraction-target.mjs`
- `npm run process:youtube-build-intel-runtime-proof-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001 --planApprovalRef=docs/process/approvals/YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001.json --closeoutKey=youtube-build-intel-runtime-proof-v1 --commitRef=HEAD`

The focused gate stays fast enough to run by default because it selects one exact public video and avoids broad batch work. The full gate is used only for closeout.

## Not Next

- No broad YouTube channel crawl or last-20 batch until this one-video proof is green.
- No Skool, MyICOR, Loom, private video, comments/member, paid-source, or authorized-browser crawl.
- No screenshots/keyframes, media download, public posting, email, Telegram, `MEETING-VAULT-ACL-001 Phase B`, Drive permission mutation, credential mutation, provider config mutation, or external writes.
- No Strategy or People work.
- Stop on quota, transcript failure, duplicate explosion, route failure, or raw Foundation health degradation.

## Changed Files

- `lib/youtube-build-intel-runtime-proof.js`
- `scripts/process-youtube-build-intel-runtime-proof-check.mjs`
- `lib/foundation-source-crawl-store.js`
- `lib/extract-retire.js`
- `lib/runtime-first-jobs.js`
- `scripts/extract-video-content.mjs`
- `scripts/run-extraction-target.mjs`
- `docs/process/youtube-build-intel-runtime-proof-001-plan.md`
- `docs/process/approvals/YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001.json`
- `docs/handoffs/2026-05-20-youtube-build-intel-runtime-proof-closeout.md`
- `lib/foundation-build-closeout-model-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

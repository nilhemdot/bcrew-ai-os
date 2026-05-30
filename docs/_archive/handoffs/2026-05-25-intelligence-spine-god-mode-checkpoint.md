# Intelligence Spine God Mode Checkpoint - 2026-05-25

## Why This Exists

Steve corrected the mission: extraction is not a pile of reports. Extraction exists so AIOS can learn what makes the system better, then upgrade the extractor, synthesis/router layer, and Dev Intelligence Director before scaling more sources.

## Current Truth

- Foundation is the shared data pool. Dev reads the Dev-relevant slice; Dev should not own separate source crawlers.
- YouTube/Mark extraction is currently the best-proven public-source lane: Mark last-50 is complete through the Gemini API full video/audio/visual route.
- The core intelligence spine is now guarded by `INTELLIGENCE-SPINE-GOD-MODE-001`.
- The Director flow is corrected: `intelligence -> recommendation -> Scoper -> Build Portfolio/Sprint Master -> scoped backlog candidate -> Steve approval/promotion`.
- Steve approval should not be requested on a vague recommendation before Scoper produces scope, dependencies, risk, proof, and effort.
- The Build Portfolio/Sprint Master layer is needed after Scoper so duplicate/overlapping scoped cards can be merged and enhanced into stronger build opportunities before Steve approves queue/sprint work.
- The target behavior is that seven overlapping ideas from different extractions can become one stronger source-backed build concept when portfolio review proves they are really one opportunity.
- Old-system review confirmed this should stay separate from Director: old Dev Director, Implementation Scoper, Sprint Master, and Backlog Monitor were useful role boundaries, but the new build should implement them as fewer code-owned contracts with source lineage and proof, not as another messy always-on agent swarm.

## Route Truth

Focused proof now verifies both checked-in defaults and live runtime routes:

- Text extraction: `foundation-extraction-openai-api` -> `openai / gpt-5.5 / quality / extra_high_required`
- Synthesis: `foundation-synthesis-openai-api` -> `openai / gpt-5.5 / quality / extra_high_required`
- Deep review: `foundation-deep-audit-openai-api` -> `openai / gpt-5.5 / quality / extra_high_required`
- Video eyes: `foundation-video-gemini-api` -> `gemini / gemini-3.5-flash / quality / vision_multimodal`
- OpenClaw Foundation routes remain blocked.
- No available critical route may use `5.4`, `medium`, `configured-*`, or `default-*model` placeholders.
- `npm run llm:route -- --profile=overnight --apply` now updates extraction, synthesis, and deep review together.
- The Claude subscription reasoning candidate was demoted to `probe_required`, model `opus-4.7`, profile `max`, not live automated execution.

## What Changed

- `lib/llm-router.js`
  - Removed cheap/default extraction placeholder.
  - Default text extraction now uses the intelligence spine model with `quality` and `extra_high_required`.
  - Synthesis/deep-audit checked-in defaults now use `quality`, not `fast`.
  - Gemini video default is `gemini-3.5-flash`.
- `lib/intelligence-spine-god-mode.js`
  - Added extraction route proof.
  - Added video eyes route proof.
  - Added runtime placeholder/weak-model blocker.
  - Disallows `fast` for critical core intelligence routes; accepts `quality` or `max`.
- `scripts/process-intelligence-spine-god-mode-check.mjs`
  - Runtime proof now reads extraction, video, synthesis, deep-audit, and OpenClaw routes.
- `scripts/llm-route-control.mjs`
  - `--profile=overnight` now includes text extraction, not just synthesis/deep review.
- `lib/dev-team-intelligence-director.js`
  - Promotion status changed to `proposal_only_needs_scoper_before_steve_approval`.
  - Scoper question now asks for build plan, dependencies, risks, proof, and effort before Steve approval.
- `docs/rebuild/current-plan.md`
  - Added explicit Director ranking doctrine from System Strategy.
- `docs/process/dev-team-intelligence-director-001-plan.md`
  - Corrected flow so Scoper and Build Portfolio/Sprint Master come before Steve approval/promotion.
- `docs/process/build-portfolio-scrum-master-001-plan.md`
  - Added the post-Scoper portfolio layer for duplicate/overlap merge, source-lineage preservation, and queue recommendations.
- `lib/build-portfolio-scrum-master.js`
  - Added deterministic first-pass portfolio review and dogfood fixtures.
- `scripts/process-build-portfolio-scrum-master-check.mjs`
  - Added focused proof for merge, thin-card return, source/auth parking, existing-card reuse, and proposal-only output.
- `docs/source-notes/dev-team-intelligence-director-2026-05-24.md`
  - Refreshed Director report with corrected promotion language.

## Proof Run

- Passed: `npm run intelligence:spine-god-mode-check -- --json`
- Passed: `npm run llm:route -- --profile=overnight --json`
- Applied: `npm run llm:route -- --profile=overnight --apply --json`
- Passed: `npm run intelligence:synthesis-proof -- --json`
- Passed after sequential rerun: `npm run intelligence:action-router-proof -- --json`
- Passed: `npm run process:dev-team-intelligence-director-check -- --json`
- Applied: `npm run process:dev-team-intelligence-director-check -- --apply --json`

## Important Lesson

Do not run DB-backed synthesis/router/Director proofs in parallel. A parallel proof attempt produced a Postgres deadlock. Sequential rerun passed. Keep DB-backed Foundation proof gates sequential unless a specific test is proving concurrency behavior.

## Remaining Gaps

1. Dev Intelligence Director is still V1 and mostly YouTube/Mark report driven. It needs a multisource Director card before it can fairly consume Gmail, Missive, Slack, Meetings, GitHub/repos, Skool, MyICOR, and creator/community sources.
2. The synthesis/router spine has a stronger route guard now, but the actual synthesis quality loop still needs a richer self-improvement/evaluation card: compare old vs new outputs, score usefulness, detect duplication/noise, and feed improvements into prompts/contracts.
3. Scoped build candidates need the post-Scoper portfolio layer implemented beyond dogfood fixtures: live Foundation reads, persisted portfolio report, and Dev surface read path.
4. The Brain Fleet/System Control surface (`SYSTEM-014`) should show extractors, synthesis/router, Directors, provider/model/profile, route status, and allow approved route/profile changes from the UI.
5. Next extraction should not be broad blind scale until the improved spine/Director/portfolio path is visible enough to evaluate whether extracted intel changed system quality.

## Next Cards To Queue

1. `DEV-DIRECTOR-MULTISOURCE-INPUTS-001` - make the Dev Intelligence Director read a governed Dev slice from the shared Foundation pool, not hardcoded Mark/YouTube reports only.
2. `INTELLIGENCE-SPINE-QUALITY-EVAL-001` - build the quality loop that compares extracted/synthesized outputs, flags noise, duplication, missing proof, and useful AIOS-upgrade opportunities.
3. `BUILD-PORTFOLIO-SCRUM-MASTER-001` - review scoped build candidates, detect duplicates/overlap, merge related ideas, preserve source lineage, return weak cards to Scoper, park source/auth blockers, and propose queue order before Steve approval.
4. `SYSTEM-014` - Brain Fleet/System Control surface showing every extractor, synthesis/router, Director, and model/profile/route powering it.
5. `SOURCE-REGISTRY-DEV-SLICE-001` - normalize Dev source families: YouTube, Skool, MyICOR, GitHub/repos, communities, email/comms, meetings, Drive/training.
6. `YOUTUBE-LATEST-20-INTEL-RUN-001` - continue public YouTube extraction after Director multisource/spine quality visibility is acceptable.

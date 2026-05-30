# FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001 Plan

## What

Build the first oversized-file split wave from the Claude/Codex tune-up audit. V1 splits `public/dev.css` into ordered CSS ownership modules: Dev core, YouTube/source intelligence, and source/approval/responsive styles.

This is a CSS ownership split only. It preserves the Dev page cascade order and updates existing proof scripts to read the CSS bundle instead of assuming all selectors live in one file.

## Why

The audit found 141 code/frontend files over 800 lines. `public/dev.css` was the safest high-value first slice because it sat at 4,998 lines, close to the 5,000-line danger threshold, but the split can be done without changing live data paths, routes, browser execution, source rows, or verifier architecture.

The useful operator behavior is lower collision risk on the Dev Hub without changing what Steve sees. Builders can work on YouTube/source UI styling without touching the same giant CSS file as System Truth, rankings, approvals, and source leaderboard styling. This unlocks speed with quality for the team because the focused check is fast, proportional, and aimed at the actual artifact that blocked edits.

The existing Dev Hub, source-session readiness, source-family maturity, and System Truth proofs stay responsible for behavior so this does not become a visual-only cleanup. Substring-only proof is explicitly rejected: the focused proof fails when a required selector is missing, and the supporting proof scripts load the real ordered CSS bundle.

## Acceptance Criteria

- `public/dev.css` becomes the Dev core CSS file and drops below the oversized risk threshold.
- `public/dev-youtube-source.css` owns the YouTube/source intelligence selectors that previously lived in `public/dev.css`.
- `public/dev-source-approval.css` owns approval/source leaderboard styles and the bottom responsive media rules so mobile cascade order is preserved.
- `public/dev.html` loads the CSS files in the original cascade order before `public/dev.js`.
- Existing proof scripts that check Dev CSS selectors read the full CSS bundle.
- Focused proof rejects the audit failure mode: an oversized unsplit root file and a missing required selector.
- Closing this card does not make historical Foundation progression checks regress when the next active blocker becomes `FOUNDATION-DONE-SEMANTICS-REPAIR-001`.
- Source/browser proof lane, source-session readiness, local-browser route policy, Dev Hub System Truth, and `/api/foundation/dev-team-hub` honest posture remain protected.

## Definition Of Done

- Add `lib/foundation-oversized-file-split-wave.js` and `scripts/process-foundation-oversized-file-split-wave-check.mjs`.
- Add package script `process:foundation-oversized-file-split-wave-check`.
- Split `public/dev.css` into the three ordered CSS assets and update `public/dev.html`.
- Update existing focused proofs to read the Dev CSS bundle: Dev Team Hub, source-session readiness, source-family God Mode maturity, and Dev page System Truth.
- Add the closeout record and verifier done-card coverage for `FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001`.
- Register the remaining non-hub tune-up follow-up cards as known Foundation progression blockers so old sprint-history checks keep proving historical closeouts instead of depending on a stale active blocker.
- Focused proof, Dev Hub proof, source-session readiness proof, source-family proof, System Truth proof, tune-up roadmap proof, builder-memory proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.

## Details

Existing code reused:

- `public/dev.html`, `public/dev.css`, and `public/dev.js` for the current Dev Hub UI.
- `scripts/process-dev-team-hub-v0-check.mjs` for Dev Hub visible-section and selector proof.
- `scripts/process-source-session-readiness-check.mjs` for source-session readiness selector and metadata-only guardrails.
- `scripts/process-source-family-god-mode-extractors-check.mjs` for source-family maturity selector proof.
- `scripts/process-dev-page-system-truth-cleanup-check.mjs` for System Truth proof and source/browser proof-lane protection.
- `lib/process-plan-critic.js`, `lib/process-write-guard.js`, and Current Sprint DB helpers for plan/live-state control.

Existing docs/backlog truth reused:

- Live backlog card `FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001`.
- Current sprint `FOUNDATION-TUNEUP-2026-05-29`.
- The Claude/Codex audit consensus that oversized files should be split after the import-ownership and clone-collapse foundation work.

The focused proof calls real file-loading and process paths: it measures the actual CSS files, verifies HTML load order, checks bundle selector availability, updates Current Sprint through the same DB helper path as prior tune-up cards, and rejects a synthetic unsplit oversized root plus a synthetic missing selector. It rejects substring-only proof and string-match verifier theater because a selector marker alone is not enough; the proof must preserve the bundle order and the existing process checks must run against that bundle.

Gate decision: full gate. This touches frontend assets, package scripts, Current Sprint, closeout metadata, and proof scripts, so static checks are insufficient. The focused proof is intentionally fast and proportional; it runs first, then the supporting Dev Hub/source-session/source-family/System Truth checks, then full `foundation:verify`, then `process:foundation-ship`.

## Risks

Risk: moving media rules before or after the wrong selectors breaks mobile layout. Repair path: keep the source/approval file last and include the bottom responsive rules there so original cascade order is preserved.

Risk: existing process checks fail because they only read `public/dev.css`. Repair path: update each affected proof script to read the ordered CSS bundle.

Risk: the split hides a missing selector and creates a false green. Repair path: focused dogfood rejects a synthetic missing `.yt-session-readiness` selector and the existing Dev Hub/source-session/source-family/System Truth proofs still read the bundle.

Risk: closing this card advances the active blocker and trips old historical progression checks. Repair path: register the remaining non-hub tune-up follow-up cards as known Foundation progression blockers and prove the registry has the next blockers.

Risk: this turns into the larger per-hub folder restructure. Repair path: Current Sprint, closeout, and proof guardrails keep `FOUNDATION-HUB-FOLDER-ISOLATION-001` parked for Steve checkpoint.

## Tests

- `node --check lib/foundation-oversized-file-split-wave.js`
- `node --check scripts/process-foundation-oversized-file-split-wave-check.mjs`
- `node --check scripts/process-dev-team-hub-v0-check.mjs`
- `node --check scripts/process-source-session-readiness-check.mjs`
- `node --check scripts/process-source-family-god-mode-extractors-check.mjs`
- `node --check scripts/process-dev-page-system-truth-cleanup-check.mjs`
- `npm run process:foundation-oversized-file-split-wave-check -- --json`
- `npm run process:foundation-oversized-file-split-wave-check -- --apply --stage=building_now --json`
- `npm run process:foundation-oversized-file-split-wave-check -- --close-card --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run process:source-session-readiness-check -- --json`
- `npm run process:source-family-god-mode-extractors-check -- --json`
- `npm run process:dev-page-system-truth-cleanup-check -- --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001.json --closeoutKey=foundation-oversized-file-split-wave-v1 --commitRef=HEAD`

## Not Next

Do not redesign the Dev page. Do not change runtime behavior. Do not split `scripts/foundation-verify.mjs` in this card. Do not delete verifier/approval/plan/check files. Do not delete `scripts/codex-status.mjs`. Do not work `MEETING-VAULT-ACL-001` Phase B. Do not mutate Drive permissions. Do not start `FOUNDATION-HUB-FOLDER-ISOLATION-001` or per-hub folders. Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, or external systems. Do not touch or weaken `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`, source-session readiness, local-browser route policy, Dev Hub System Truth, or `/api/foundation/dev-team-hub` posture.

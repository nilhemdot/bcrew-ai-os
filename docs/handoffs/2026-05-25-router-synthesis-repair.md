# Router And Synthesis Repair - 2026-05-25

## What Changed

- Direct OpenAI Responses calls remain blocked by default, but `lib/llm-router.js` can now execute an operator-configured OpenAI API route when the selected route and credential are both available, low-risk, policy-allowed, and marked as configured through model route control.
- OpenAI Responses output text now joins all `output_text` chunks instead of keeping only the first chunk.
- Shared candidate extraction now asks for compact schema-bounded JSON, limits candidate counts and field lengths, and retries once with a smaller payload if the model returns malformed JSON.
- The Intelligence Spine God Mode proof now checks that random direct OpenAI API calls stay blocked unless routed through approved model-route control.
- The synthesis freshness proof now accepts the repaired live state: failed extractors must block synthesis, but repaired extractors should advance to `needs_synthesis_refresh`, then `action_router_due`, then `fresh`.

## Live Run Proof

- `gmail-extract-latest`, `missive-extract-latest`, `slack-extract-latest`, and `meeting-transcripts-extract-backlog` were rerun through the Foundation job runner after the route repair.
- The meeting extractor recovered from malformed JSON through the new compact retry path and produced 15 candidates in the job-wrapper run.
- `intelligence-synthesis-spine-refresh` ran after extraction and saved 132 facts, refreshed 8 synthesized items, and produced verified source-backed synthesis.
- `intelligence-action-router-proposals` then ran and staged 3 human-approval-required proposals. It did not silently write destination decisions.
- Final freshness state: `fresh`, no failed extractor blockers, no next job due.

## Proof Commands

- `npm run process:synthesis-router-freshness-trigger-check -- --json` passed.
- `npm run intelligence:spine-god-mode-check -- --json` passed and confirmed `gpt-5.5` quality/extra-high routes for extraction, synthesis, and deep audit, with OpenClaw blocked for core Intelligence Spine work.
- `npm run process:god-mode-extractor-parity-gate-check -- --json` passed and still reports 0 full God Mode claims.
- `npm run process:dev-team-hub-v0-check -- --json` passed and now reports internal extraction lanes live through the repaired runs.
- `npm run backlog:hygiene -- --json` passed with 843 cards and 0 findings.
- `git diff --check` passed.

## Next Work

- Fix `/dev` source cards that still rely on static source definitions before presenting them as live operational truth.
- Add a real source approval/review surface so Steve can approve, reject, or annotate discovered links without manual chat routing.
- Continue God Mode extractor parity work: browser Hands, approved source-packet worker execution, paid/private source boundaries, GitHub/community source workers, and proof-backed scheduler automation. YouTube comments are operator-excluded and are not a God Mode blocker unless Steve explicitly reverses that decision.
- Add Samin Yasar or the Hermes content-team video only after the exact YouTube channel/video URL is confirmed.

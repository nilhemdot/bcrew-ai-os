# Subscription-First Extraction Runtime Checkpoint

Date: 2026-04-24
Status: evidence

## Why This Exists

Steve clarified the original doctrine from the old system:

- the system should be subscription-first, not API-first
- API spend should be guarded fallback, not the default
- subscription routes are acceptable if the runtime is designed around spacing, long timeouts, queues, and model/lane choice

Live proofs showed the router migration was real, but the first extraction runtime shape still copied API-style assumptions into a subscription gateway.

## What Was Hardened

- Direct OpenAI Responses calls remain guarded outside the router.
- `llm_calls` now has a verifier guard for stale `planned` / `started` rows.
- Shared candidate processing runs now have a verifier guard for post-hardening rows missing actual route provenance.
- OpenClaw subprocess calls now use process-group timeout cleanup with `SIGTERM` then `SIGKILL` so a hung subscription call does not leave orphan workers.
- Candidate rejection now happens after successful replacement extraction, not before.
- Re-emitted candidate keys are protected from stale rejection even when duplicate fingerprints skip an upsert.
- Failed processing rows preserve routed LLM provenance when the LLM call succeeded but later parsing/persistence failed.
- Slack and Zoom extractors were migrated onto the same routed-provenance sanitizer path.

## Proofs

`npm run foundation:verify` passes `28/28`.

Small routed extraction proof succeeded:

- command: `npm run gmail:extract-candidates -- --onlyWithoutCandidates=true --limit=1`
- route: `openclaw` / `chatgpt_subscription_gateway`
- model: `openai-codex/gpt-5.4`
- cost: `$0` marginal
- processing row recorded provider/auth path/route/model/content hash

Composite proof exposed the real runtime gap:

- parent run: `job-shared-comms-intelligence-bite-20260424223137-gshsuz`
- Gmail: succeeded, 5 artifacts, 4 candidates
- Missive: succeeded, 5 artifacts, 5 candidates
- Meeting transcript backlog: mined one valuable transcript, then large transcript calls timed out at 120 seconds
- OpenClaw timeout cleanup worked; no orphan `openclaw` / `openclaw-infer` processes were left

Fast-path proof after excluding meetings still showed Gmail can time out at 120 seconds on some artifacts:

- parent run: `job-shared-comms-intelligence-bite-20260424224654-sn9xhw`
- aborted manually after repeated OpenClaw timeouts
- stale run and `llm_calls` rows were marked failed
- verifier still passed after cleanup

## Doctrine Correction

Subscription-first does not mean subscription calls are treated like normal APIs.

Correct runtime shape:

- high-volume extraction runs as paced miners
- miners use small limits, long per-call windows, retry ledgers, and resumable cursors
- daily user-facing intelligence synthesizes already-mined material
- large meeting/corpus/transcript extraction does not block the morning brief
- API fallback remains explicit and guarded, not automatic

## Code Policy Change

`shared-comms-intelligence-bite` is now the fast path:

- Gmail candidate bite
- Missive candidate bite
- synthesis
- skips meeting transcript backlog by default

`meeting-transcripts-extract-backlog` is now a separate deep miner:

- one transcript per run
- long subscription-first timeout window
- manual until route latency is stable

## Next

1. Tune subscription extraction miners before daily scheduling.
2. Consider separate route/model lanes for fast extraction vs synthesis when a faster subscription model/adapter is available.
3. Build the Claude Code / Claude Agent SDK subscription adapter under the BCrew router.
4. Run monitored fast-path proofs again after route timing is tuned.
5. Schedule daily synthesis only after the fast path has clean subscription-routed runs.
6. Keep meeting transcript/corpus mining as background miners that feed the brief, not blockers inside the brief.


# Runtime, Router, And Current-Day Sync Checkpoint

Date: 2026-04-24
Status: pushed checkpoint after Phase 1/2/3 activation slices

## Why This Exists

Steve asked to stop measuring progress by manual backfills and start building a system that runs useful work without him watching builder chat.

This checkpoint records the shift from:

- scripts that exist
- manual archive pulls
- unclear model/auth paths

to:

- supervised Foundation jobs
- policy-aware LLM route probes
- extraction targets with leases, run state, and bounded current-day sync

## Commits In This Checkpoint

- `747ae63` — Wire current-day sync to extraction targets
- `b64d5e9` — Schedule Missive current sync lane
- `5a7b995` — Make Missive current sync change-aware
- `b369236` — Make Gmail current sync change-aware

## Runtime State

Foundation system runtime is now separate from the later OpenClaw/live-agent runtime.

Live now:

- `npm run foundation:job`
- `npm run foundation:worker`
- `ai.bcrew.dashboard` LaunchAgent
- `ai.bcrew.foundation-worker` LaunchAgent
- DB-backed job runs
- DB-backed pause/resume controls
- active-run locking
- process-group timeout cleanup

The worker survives terminal exit. The dashboard/API can show registered jobs, manual/scheduled status, latest run, next run, failures, and due state.

## LLM Router State

Phase 2 MVP is a probe/control substrate only.

Live now:

- `llm_credentials`
- `llm_routes`
- `llm_route_probes`
- `llm_calls`
- `lib/llm-router.js` shell
- `llm-auth-audit` manual Foundation job

Probe state:

- OpenAI API available
- Gemini API available through `GOOGLE_API_KEY`
- local Claude Code Max login available
- OpenClaw gateway running
- Anthropic API missing
- Claude OAuth/setup-token missing

Important boundary:

- no production extraction/synthesis workload has been moved behind the router yet
- no blind subscription quota farming
- no broad 32-script rewrite

## Extraction Control State

Live now:

- `source_crawl_targets`
- `source_crawl_items`
- `extraction-control-seed` manual Foundation job
- `scripts/run-extraction-target.mjs`
- `/api/foundation/extraction-control`

Seeded targets:

- Gmail current-day
- Missive current-day
- meetings current-day
- Slack current-day
- Drive corpus backfill
- Skool corpus validation/backfill
- old-system report mining
- Zoom audio recovery

Skool remains blocked until access/content-use boundaries are explicit.
Zoom audio recovery remains paused unless strategy/content value justifies reopening it.

## Current-Day Sync Proof

Gmail and Missive now run through the extraction target ledger:

- claim target lease
- run bounded source sync
- enforce process-group timeout
- record before/after archive stats
- clear lease
- update target last run / failure state

Gmail first proof:

- `970` messages scanned
- `263` threads selected
- `148` net-new artifacts

Missive first proof:

- `100` conversations selected
- `43` net-new artifacts

## Missive Scheduled Lane

Missive is the first scheduled current-day lane.

Schedule:

- `missive-sync-current`
- every `120` minutes
- next run visible through `/api/foundation/jobs`

Change-aware proof:

- selected `100` conversations
- skipped `94` already-current conversations
- refreshed `6` changed conversations
- archived `0` net-new artifacts

This is the correct behavior because Missive can contain new comments/messages inside existing conversations.

## Gmail Manual Lane

Gmail now has change-aware filtering but remains manual.

Proof:

- selected `263` recent team threads
- skipped `249` already-current threads
- refreshed `14`
- archived `13` net-new artifacts

Immediate rerun:

- still found `2` changed/new threads
- archived `1` net-new artifact

Decision:

- keep Gmail manual for now
- do not schedule Gmail until repeated runs stabilize

## Meeting Notes Manual Lane

Meeting notes current-day is now registered as a manual Foundation job:

- `meeting-notes-sync-current`
- target: `meetings-current-day`
- window: Drive files modified in the last 48 hours

First proof:

- `49` meetings selected
- `46` Gemini notes archived
- `39` embedded transcripts archived
- `7` net-new artifacts
- `3` Google Drive export `500` failures captured in output

Decision:

- keep meeting notes manual until the export failures have a retry/report path
- do not schedule this lane yet

## Dashboard Controls

System Health job cards now expose pause/resume buttons.

Proof:

- paused `gmail-sync-current`
- resumed `gmail-sync-current`
- restored it to manual mode
- verifier stayed green

## Current Verification

Latest verifier:

- `npm run foundation:verify`
- `19/19` passing

Latest shared-comms coverage from verifier:

- `12,074` artifacts
- `4,529` candidates

## What Is Next

Next safe build order:

1. Monitor the first scheduled Missive runs.
2. Add retry/report path for meeting-note export failures.
3. Add item-level cursors/leases before broad backfill.
4. Promote Gmail only after repeated change-aware runs stabilize.
5. Then move to the next bounded worker lane: likely Slack current-day or Drive one-folder bite.

## What Is Not Next

- no broad historical backfill marathon
- no moving extraction/synthesis behind the LLM router yet
- no building Harlan/Crewbert agent runtime yet
- no Drive organizer/move actions without dry-run and approval
- no Skool crawler until access and content-use boundaries are explicit

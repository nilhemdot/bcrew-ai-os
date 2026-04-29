# Email Depth And Extraction Checkpoint

Date: 2026-04-23

Purpose: capture the shared-comms email-layer work after the Missive/Gmail deepening pass so the next chat does not have to reconstruct what changed from command output.

## What Changed

- Missive is now treated as the primary shared email intelligence lane because it includes internal comments/chat inside threads.
- Gmail remains the broader mailbox layer and fallback, but not the richer collaboration surface.

## Code Changes

- `lib/missive.js`
  - added `until` support to conversation listing
  - exposed raw `createdAtUnix` / `lastActivityAtUnix`
  - serialized Missive API requests
  - added retry/backoff for `429` and other retryable errors
  - made thread reads sequential instead of `Promise.all` burst calls
- `scripts/sync-missive-archive.mjs`
  - paginates across Missive conversation pages with `until`
  - raises archive cap from a single shallow page to a bounded multi-page sync
- `scripts/sync-gmail-archive.mjs`
  - supports `--team=true`
  - loops across delegated users from `listFoundationUsers({ meetingSyncEnabled: true })`
  - stores mailbox-scoped archive ids as `${userEmail}:${threadId}`
- `scripts/extract-missive-thread-candidates.mjs`
  - removed the silent `20`-thread cap
  - tightened prompts so promo/personal/vendor threads should return `0`, not junk atoms
- `scripts/extract-gmail-thread-candidates.mjs`
  - removed the silent `20`-thread cap
  - tightened prompts so promo/personal/vendor threads should return `0`, not junk atoms

## Current Archive State

- `SRC-MISSIVE-001`: `500` archived threads
- `SRC-GMAIL-001`: `1,103` archived mailbox-scoped threads across delegated team users

Context:

- Missive was `28` before this pass
- Gmail was `3` before this pass
- Gmail is still not a true 180-day complete archive. The current team sync archives up to `100` selected threads per delegated user per run, so the current oldest Gmail artifact is `2026-04-09`.
- Missive is still not a true full-history archive. The current bounded run selected `500` visible conversations; the current oldest Missive artifact is `2026-04-19`.
- Missive API docs confirm the conversation page limit is `50`, but history can be paginated with `until`; rate limit is the real constraint, especially `900` requests per `15` minutes. References:
  - `https://missiveapp.com/docs/developers/rest-api/endpoints`
  - `https://missiveapp.com/docs/developers/rest-api/rate-limits`

## Current Extraction State

- Missive pending candidates: `92`
  - `27` task
  - `32` blocker
  - `5` decision
  - `2` feedback
  - `26` atom
- Gmail pending candidates: `141`
  - `58` task
  - `21` blocker
  - `3` decision
  - `4` feedback
  - `55` atom

## Quality Read

- Missive quality improved after prompt tightening.
- Good examples now include:
  - BCrew Google Ads catch-all lead routing
  - disconnected social accounts
  - billboard artwork / contract / stale creative issues
  - repo access and integration blockers
- Gmail still has some residue/noise, but the extraction mix is materially more useful than before.
- Missive remains the priority email/collaboration lane because it captures internal comments inside threads.
- Gmail is broader and useful, but will need synthesis/ranking faster because it includes more low-signal mailbox residue.

## What Changed After The First Checkpoint

- Gmail team sync ran successfully:
  - `5,500` messages scanned
  - `1,100` threads selected
  - `1,100` archived this run
- Missive all-conversation sync ran successfully after two fixes:
  - hard-capped page size to Missive's real API max of `50`
  - added a skip-existing guard so reruns do not refetch already archived threads
  - slowed retries and honored `Retry-After` to survive `429` limits
- Latest extraction passes:
  - Gmail extracted `131` candidates from the latest `100` archived threads
  - Missive extracted `94` candidates from the latest `100` archived threads

## Next Best Moves

1. Add cursor/chunked Missive backfill so it can safely continue beyond the first `500` visible conversations without fighting rate limits.
2. Add a stricter Gmail/Missive post-filter or prompt rule for event blasts / listing spam / promo residue if the next sample still leaks noise.
3. Start the first synthesis pass over meetings + Slack + Missive + Gmail so the system surfaces ranked live intelligence instead of raw candidate piles.
4. Add a Gmail date-sliced or cursor-aware team backfill if true 180-day mailbox coverage becomes a hard requirement before synthesis.

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

- `SRC-MISSIVE-001`: `60` archived threads
- `SRC-GMAIL-001`: `58` archived mailbox-scoped threads across `11` users

Context:

- Missive was `28` before this pass
- Gmail was `3` before this pass

## Current Extraction State

- Missive pending candidates: `45`
  - `16` task
  - `13` blocker
  - `4` decision
  - `1` feedback
  - `11` atom
- Gmail pending candidates: `69`
  - `31` task
  - `15` blocker
  - `2` decision
  - `3` feedback
  - `18` atom

## Quality Read

- Missive quality improved after prompt tightening.
- Good examples now include:
  - BCrew Google Ads catch-all lead routing
  - disconnected social accounts
  - billboard artwork / contract / stale creative issues
  - repo access and integration blockers
- Gmail still has some residue/noise, but the extraction mix is materially more useful than before.

## Next Best Moves

1. Deepen Missive again, but now aim at richer/shared threads instead of only newest-all threads.
2. Add a stricter Gmail/Missive post-filter or prompt rule for event blasts / listing spam / promo residue if the next sample still leaks noise.
3. Start the first synthesis pass over meetings + Slack + Missive + Gmail so the system surfaces ranked live intelligence instead of raw candidate piles.
4. Do a selective git hygiene pass after the current working block settles, because the repo is still ahead locally and dirty.

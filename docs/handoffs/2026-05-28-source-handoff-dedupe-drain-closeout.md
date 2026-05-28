# Source Handoff Dedupe And Public Queue Drain Closeout - 2026-05-28

## What Changed

The YouTube source-browser handoff queue now canonicalizes public source URLs before selecting runnable rows.

This fixes duplicate source work such as:

- `https://buildpartner.ai/4cp`
- `https://www.buildpartner.ai/4cp/`
- `https://buildpartner.ai/4cp?utm_source=youtube&session=...`

Those rows now collapse into one source row while preserving every original URL, source video ID, creator, report artifact ID, and disposition as provenance.

The queue also matches existing saved source runs by canonical URL, so a previously saved read is not falsely shown as a fresh runnable row just because the URL differs by `www`, tracking params, trailing slash, or session params.

## Live Run

After the dedupe fix, the live safe public/free queue dropped from 5 runnable rows to 4:

- `https://buildpartner.ai/4cp`
- `https://hostinger.com/web-apps-hosting/claude-code-hosting`
- `https://the-ai-playbook.com/4cp`
- `https://theincubator.xyz/eng/4cp`

Ran:

```bash
npm run source:youtube-handoff -- --json --apply --max-runs=4
```

Result:

- batch `source-god-mode-youtube-handoff:20260528124937`
- 4/4 rows completed healthy
- 13 pages read
- 9 hands events
- evidence persisted to `source-god-mode-youtube-handoff-runs`
- no provider calls
- no forms submitted
- no downloads
- no purchases
- no posts/comments/messages
- no credential mutation
- no Scoper promotion
- no backlog writes

Post-run dry-run:

- `runnableRows: 0`
- `alreadyRunRows: 696`
- `parkedRows: 463`
- `duplicateRows: 75`

## Current Source-Session State

The safe public/read-only part is drained. The remaining work is correctly blocked behind source sessions, source-specific runners, or approval.

Readiness proof:

```bash
npm run process:source-session-readiness-check -- --json
```

Live state:

- status: `waiting_for_credentials_or_sessions`
- prep rows: 276
- free Skool/session rows: 88
- newsletter rows: 16
- non-Skool community runner rows: 4
- paid/auth rows: 168
- missing credentials/session metadata:
  - `skool / ai@bensoncrew.ca`
  - `creator-newsletters / ai@bensoncrew.ca`
  - `myicor-mcp-oauth / myicor-authorized-member`

## Proofs

Passed:

```bash
node --check lib/source-god-mode-youtube-handoff.js
node --check scripts/process-source-god-mode-youtube-handoff-check.mjs
node --check scripts/process-dev-team-hub-v0-check.mjs
npm run process:source-god-mode-youtube-handoff-check -- --json
npm run source:youtube-handoff -- --json --max-runs=5
npm run source:youtube-handoff -- --json --apply --max-runs=4
npm run source:youtube-handoff -- --json --max-runs=5
npm run process:source-session-readiness-check -- --json
npm run process:dev-team-hub-v0-check -- --json
```

## Morning Next

Do not start Scoper first.

Next real unlock is source session setup while Steve is awake:

1. Add or authorize `skool / ai@bensoncrew.ca`.
2. Add or authorize `creator-newsletters / ai@bensoncrew.ca`.
3. Authorize or decide MyICOR MCP OAuth for `myicor-authorized-member`.
4. Rerun `npm run process:source-session-readiness-check -- --json`.
5. Run the first real free-community proof only after the session broker shows a ready row.
6. Keep paid/private/auth extraction parked until Steve approves exact source packets and boundaries.


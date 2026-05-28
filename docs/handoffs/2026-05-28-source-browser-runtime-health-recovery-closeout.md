# Source Browser Runtime Health Recovery Closeout

Date: 2026-05-28

Cards:

- `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
- parent: `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001`

## Why

Steve approved moving Director recommendation #1 (`Browser Agent That Can Work`) and #3 (`Extractor That Can Go Anywhere`) from review into real build work.

The MyICOR OAuth attempt exposed the failure mode clearly: a browser worker must not get stuck on `about:blank`, a Chrome restore/session page, or the wrong browser/profile state and still act like the extractor is working.

## What Changed

- Added a source-browser session policy to `source:god-mode`.
- The runtime now forbids normal Chrome profile use and supports isolated ephemeral or isolated persistent source profiles.
- Added browser health checks for:
  - `about:blank`
  - Chrome new-tab/control surfaces
  - restore-previous-session prompts
  - Chrome error pages
  - empty page after navigation
- Live browser runs now keep a `browserRecoveryEvents` ledger.
- On navigation/browser-state failure, the runtime clears source-origin state in the isolated context, retries once, then fails closed with a blocker instead of false-green extraction.
- Source reports now include `runtime.sourceBrowserSession`, per-page `browserHealth`, and `browserRecoveryEvents`.
- The Stagehand agentic browser adapter now checks browser health before observe/act/extract/agent steps, so it does not reason from a blank or restore browser page.
- `source:god-mode` CLI now supports `--profileMode=` and `--profileRoot=`.
- Repaired live contract drift with `process:god-mode-extractor-system-contract-check -- --apply`, so the live YouTube catch-up card again blocks video-only God Mode completion.

## Proof

Passed:

- `node --check lib/source-agentic-browser-runtime.js`
- `node --check lib/source-god-mode-extractor-runtime.js scripts/process-source-god-mode-extractor-runtime-check.mjs scripts/run-source-god-mode-extractor.mjs`
- `npm run process:source-god-mode-extractor-runtime-check -- --json`
- `npm run process:god-mode-extractor-system-contract-check -- --apply --json`
- `npm run process:god-mode-extractor-system-contract-check -- --json`
- `npm run process:source-session-broker-check -- --json`
- `npm run process:skool-free-community-god-mode-runner-check -- --json`
- `npm run process:source-god-mode-youtube-handoff-check -- --json`
- `npm run process:god-mode-extractor-parity-gate-check -- --json`
- `npm run process:source-session-readiness-check -- --json`
- `npm run foundation:verify -- --json-summary` (`519/519`)

## Remaining Truth

- The generic source/browser runtime is stronger now, but full God Mode is still not complete.
- Source-session readiness is green as a check but operationally waiting for credentials/sessions:
  - 276 prep rows
  - 3 missing credential checks
  - 0 rows allowed to run right now through source-session prep
- Next live work remains source-session setup and first real approved runs:
  - free Skool identity/session
  - newsletter source identity/intake
  - MyICOR read-only MCP/OAuth or approved paid-session route

Do not claim paid/private/auth extraction is automatic yet.

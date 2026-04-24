# 2026-04-22 Shared Communications Read Check

## Goal

Start the Foundation shared-communications source revalidation for:

- `SOURCE-001` Gmail
- `SOURCE-002` Google Calendar
- `SOURCE-003` Google Drive
- `SOURCE-005` Slack

## What Was Checked

### Gmail connector

- tool: `mcp__codex_apps__gmail._get_profile`
- result: failed
- blocker:
  - `token_expired`
  - `Provided authentication token is expired. Please try signing in again.`

### Google Calendar connector

- tool: `mcp__codex_apps__google_calendar._get_profile`
- result: failed
- blocker:
  - `token_expired`
  - `Provided authentication token is expired. Please try signing in again.`

## What This Means

- Gmail and Calendar are not yet revalidated in the rebuild on this machine.
- This is not a model-understanding problem.
- It is an auth-state problem.
- Canonical doctrine is now explicit:
  - Google Workspace sources should standardize on the delegated Google path.
  - Connectors are fallback / temporary access, not the foundation default.
- Source-registry status stays accurate as:
  - pending revalidation

## Known Good Nearby Signal

- `npm run google:health` still passes for delegated Google Sheets access.
- That proves the delegated Sheets path is healthy.
- It does **not** prove Gmail or Calendar connector read access.

## Next Step

1. Reconnect the Gmail connector.
2. Reconnect the Google Calendar connector.
3. Re-run simple read checks:
   - Gmail profile / labels
   - Calendar profile / bounded event read
4. Then write the exact trusted boundary:
   - readable only
   - partially signed off
   - workflow-ready

## Slack

- Slack was not revalidated in this pass.
- No live Slack read was attempted in this slice.
- Keep `SOURCE-005` pending until the machine/tool path is explicit.

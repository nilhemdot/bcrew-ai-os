# Source Session MyICOR Credential Readback Checkpoint

Date: 2026-05-29
Card: `SOURCE-SESSION-BROKER-001`
Closeout key: `source-session-myicor-credential-readback-v1`

## Why This Exists

The Source Session readiness surface was showing MyICOR as broadly waiting on credentials/tokens, but it did not distinguish the paid Google SSO credential from the read-only MyICOR MCP OAuth token. That made the operator state look like "MyICOR credentials are missing" even when the Google SSO credential metadata exists and only the MCP token still needs authorization.

## What Changed

- Source Session readiness now exposes a dedicated `myicor-google-sso-credential` metadata check for `myicor-google-sso / steve.zahnd@bensoncrew.ca`.
- Source Session readiness still exposes `myicor-mcp-oauth-token` separately for `myicor-mcp-oauth / myicor-authorized-member`.
- Any accidental `myicor-google-sso / ai@bensoncrew.ca` row is shown as optional/ignored and does not block paid MyICOR readiness.
- MyICOR MCP missing-token output now points to the agent-driven OAuth route first: `npm run myicor:mcp-authorize-agent -- --account=myicor-authorized-member`.
- Source Session auth-resume packets now use the same agent-driven MyICOR MCP authorization command instead of the older manual browser-open command.

## Boundaries

- No raw password or token read.
- No live MyICOR login.
- No browser opened.
- No Harlan/Telegram message sent.
- No signup, purchase, download, post, message, profile mutation, or credential mutation.

## Next

When Steve is awake and wants to authorize MyICOR, run the agent-driven OAuth path. If Google verification appears, emit/handle the Harlan auth-needed loop, then reverify before any MyICOR extraction.

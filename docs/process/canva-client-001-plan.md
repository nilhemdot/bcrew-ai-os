# CANVA-CLIENT-001 Plan

Status: approved for build
Card: `CANVA-CLIENT-001`
Sprint: `canva-client-foundation-2026-05-15`
Closeout key: `canva-client-v1`

## What

Add a reusable read-only Canva Connect API client for BCrew AI OS.

V1 wraps the existing `.env` Canva OAuth credentials into `lib/canva-client.js` so future Foundation and Marketing work can mint short-lived access tokens from `CANVA_REFRESH_TOKEN` and read Canva brand-asset metadata through clean helpers.

V1 supports:

- OAuth refresh-token access token minting through Canva Connect API `/oauth/token`
- refresh-token rotation detection and explicit `.env` replacement when a live smoke is run with `--update-refresh-token --apply`
- folder item listing through `/folders/{folderId}/items`
- design metadata listing/getters through `/designs` and `/designs/{designId}`
- asset metadata getter through `/assets/{assetId}`
- brand template metadata/dataset helpers through `/brand-templates`, `/brand-templates/{brandTemplateId}`, and `/brand-templates/{brandTemplateId}/dataset`
- synthetic dogfood proof with no network and no spend
- optional live read-only smoke with no token logging
- guarded OAuth bootstrap utility at `scripts/canva-oauth-bootstrap.mjs` for refreshing the admin-backed token when the current refresh token is stale

## Why

Steve wants AIOS to access Benson Crew's Canva brand assets without more manual login screens. This is Foundation work because Canva becomes a governed source/access primitive that hubs can use later.

Root invariant: this card creates the API client only. It does not ingest the whole Canva library, create designs, export files, upload assets, mutate Canva content, wire Marketing Video Lab routes, or add UI.

Operator value: future Marketing Hub, brand stack, and content workflows can call one clean client instead of each feature reinventing OAuth and risking token leakage.

## Acceptance Criteria

- `lib/canva-client.js` exports `createCanvaClient()`, `createCanvaClientFromEnv()`, `mintCanvaAccessToken()`, `buildCanvaEnvStatus()`, `sanitizeCanvaLogValue()`, and `buildSyntheticCanvaClientProof()`.
- Refresh-token flow uses Basic client authentication and keeps access tokens in memory only.
- The client exposes read helpers for folders, designs, assets, and brand templates.
- V1 has no write/export/upload/design-create helpers.
- The focused proof script validates:
  - plan approval
  - live backlog card
  - Current Sprint item
  - durable Plan Critic pass
  - package script registration
  - no token/secret logging
  - synthetic read-only wrapper behavior
  - Canva env presence as present/missing only
- Optional `--live` smoke reads small Canva metadata samples and reports counts/titles only.
- Because Canva refresh tokens are single-use and rotate on refresh, any live smoke must replace the existing `CANVA_REFRESH_TOKEN=` line in `.env`; it must not append a duplicate line.
- If the current refresh token is already stale, `npm run canva:oauth-bootstrap -- --apply` starts a localhost PKCE authorization flow. Steve logs into Canva as the admin account and approves access; the script replaces the existing `.env` token line and does not print the token.
- No provider spend, no Canva mutation, no secrets written, no UI wiring.

## Definition Of Done

- The live backlog card is in `done` and Current Sprint shows `CANVA-CLIENT-001` as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:canva-client-check -- --json`.
- Optional live smoke passes or reports endpoint-level degraded status without failing on unavailable Enterprise-only brand templates.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `canva-client-v1`.

Gate decision tree: static checks cover changed JS syntax, focused gate proves Canva OAuth/client behavior without network, optional live smoke proves real read-only reachability, and full gate is required because this card changes Foundation process scripts, package scripts, verifier coverage, closeout records, and live sprint/backlog state.

## Details

Existing code to reuse: existing `.env` credential pattern, `approval-integrity`, live backlog/current sprint/Plan Critic readers, process-check proof style, build closeout registry, and Foundation ship gates.

Official Canva Connect API docs used. These are the official Canva Connect API docs boundaries for V1:

- Authentication / generate access token: `POST https://api.canva.com/rest/v1/oauth/token`
- List folder items: `GET https://api.canva.com/rest/v1/folders/{folderId}/items`
- List designs: `GET https://api.canva.com/rest/v1/designs`
- Get asset: `GET https://api.canva.com/rest/v1/assets/{assetId}`
- List brand templates: `GET https://api.canva.com/rest/v1/brand-templates`

Implementation shape: create `lib/canva-client.js` with a small fetch-based client and no new package dependency. Create `scripts/process-canva-client-check.mjs` as a read-only focused proof. Add `scripts/canva-oauth-bootstrap.mjs` as a guarded setup utility for stale refresh tokens. Register `process:canva-client-check` and `canva:oauth-bootstrap`.

Architecture guardrail: this card does not add code to oversized route/DB/verifier modules except a narrow verifier import/read-only assertion. It does not touch `server.js`, `lib/foundation-db.js`, hub files, Marketing Video Lab files, or Canva UI.

Verifier/check posture: focused proof is read-only. It must not call `createBacklogItem`, `updateBacklogItem`, `upsertFoundationCurrentSprintOverlay`, SQL `INSERT/UPDATE/DELETE`, provider write APIs, or `fs.writeFile`. The optional live smoke only uses Canva GET endpoints plus OAuth token refresh.

Security posture: output must never print `CANVA_CLIENT_SECRET`, `CANVA_REFRESH_TOKEN`, access tokens, Basic auth values, or Bearer tokens. Env status is reported as present/missing only.

Credential posture: Canva refresh tokens rotate. Default synthetic proof is read-only. Live proof is explicitly write-postured because the refresh token must be replaced when Canva returns the next token. The only approved write path in this card is replacing the existing `CANVA_REFRESH_TOKEN=` line in `.env` under `--live --update-refresh-token --apply`; duplicate token lines are rejected by dogfood proof.

## Risks

- Risk: Canva refresh tokens rotate.
  - Repair path: V1 reports `refreshTokenRotated` in memory and the live proof uses explicit `--update-refresh-token --apply` posture to replace the existing `.env` line instead of appending a stale duplicate.
- Risk: Brand templates require Canva Enterprise and may return 403/404.
  - Repair path: live smoke treats endpoint-level failure as degraded metadata, not a mutation or blocker for folder/design/asset access.
- Risk: This drifts into Marketing Video Lab or Canva asset ingestion.
  - Repair path: no `server.js`, UI, design creation, export, upload, or library backfill in this card.

## Tests

```bash
node --check lib/canva-client.js scripts/canva-oauth-bootstrap.mjs scripts/process-canva-client-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:canva-client-check -- --json
npm run canva:oauth-bootstrap -- --apply
npm run process:canva-client-check -- --json --live --update-refresh-token --apply
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=CANVA-CLIENT-001 --planApprovalRef=docs/process/approvals/CANVA-CLIENT-001.json --closeoutKey=canva-client-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card prevents: each feature inventing its own Canva OAuth call, leaking/printing tokens, or appending duplicate stale refresh-token lines. The synthetic proof must show refresh-token grant behavior, refresh-token rotation detection, one-line `.env` replacement semantics, Bearer token usage in memory, read-only GET wrappers, and secret redaction.

## Not Next

- no uploads
- no exports
- no design creation
- Google Flow is not part of this card; it remains a human UI/research reference, while this sprint uses the Canva Connect API.
- Do not create, update, delete, export, or upload Canva designs/assets.
- Do not wire Marketing Video Lab live routes.
- Do not touch `server.js`, `lib/security-access.js`, DB schema, hub UI, or package dependencies.
- Do not create a full Canva source contract/backfill crawler yet.
- Do not store access tokens or refresh tokens outside `.env`.
- Do not mutate Drive permissions, run Meeting Vault ACL Phase B, connect paid Skool/myICOR sources, or start broad source extraction.

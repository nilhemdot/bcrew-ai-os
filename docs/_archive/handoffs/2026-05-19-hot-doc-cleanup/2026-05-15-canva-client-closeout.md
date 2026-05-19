# Canva Client Foundation Closeout

Date: 2026-05-15
Sprint: `canva-client-foundation-2026-05-15`
Card: `CANVA-CLIENT-001`
Closeout key: `canva-client-v1`

## What Changed

- Added `lib/canva-client.js` as the governed Canva Connect API client.
- Added `scripts/process-canva-client-check.mjs` as the focused proof.
- Added `scripts/canva-oauth-bootstrap.mjs` as the guarded admin OAuth bootstrap for stale refresh tokens.
- Added package scripts:
  - `npm run process:canva-client-check`
  - `npm run canva:oauth-bootstrap`
- Added verifier coverage for `CANVA-CLIENT-001`.
- Updated active rebuild docs to show the Canva client sprint as current live work.
- Added source note: `docs/source-notes/canva-brand-assets.md`.
- Queued future backlog cards:
  - `MARKETING-BRAND-INGREDIENT-ASSET-LIBRARY-001`
  - `CANVA-EDITABLE-OUTPUT-LOOP-001`

## Behavior

The client can:

- mint Canva access tokens from `CANVA_REFRESH_TOKEN`
- detect Canva refresh-token rotation
- replace the existing `CANVA_REFRESH_TOKEN=` line instead of appending duplicates
- keep access tokens in memory only
- redact token/secret/auth fields from proof output
- read Canva profile, folder items, designs, assets, and brand-template metadata

V1 cannot:

- upload assets
- export designs
- create designs
- mutate folders/assets/designs
- wire Marketing Video Lab routes
- build Tanner's asset library

## Admin Token Step

Completed. Steve approved the OAuth flow while logged into the admin Canva account. The bootstrap replaced the existing `CANVA_REFRESH_TOKEN=` line and left exactly one refresh-token line in `.env`.

The live smoke then ran with:

```bash
npm run process:canva-client-check -- --json --live --update-refresh-token --apply
```

It minted an access token in memory, persisted the rotated refresh token, reported provider spend `0`, and reached Canva profile, root folder, uploads folder, designs, and brand-template metadata. No token values were printed.

## Future Canva Work

Tanner's current folder is useful intake, not truth:

- `https://www.canva.com/folder/FAHJp1pSJv0`

Future work should create a clean Brand Ingredient Asset Library where Marketing can curate approved staple assets without Foundation access. Future editable-output work should let AIOS push approved generated posts/designs into Canva so team members can manually edit them.

Those are deliberately not in `CANVA-CLIENT-001`.

## Proof

Passed:

```bash
npm run process:canva-client-check -- --json
npm run process:canva-client-check -- --json --live --update-refresh-token --apply
npm run backlog:hygiene -- --json
npm run foundation:verify -- --failures-only
npm run process:ship-check -- --card=CANVA-CLIENT-001 --planApprovalRef=docs/process/approvals/CANVA-CLIENT-001.json --closeoutKey=canva-client-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=CANVA-CLIENT-001 --closeoutKey=canva-client-v1
npm run process:foundation-ship -- --card=CANVA-CLIENT-001 --planApprovalRef=docs/process/approvals/CANVA-CLIENT-001.json --closeoutKey=canva-client-v1 --commitRef=HEAD
```

Current proof status:

- focused synthetic proof: passed
- live Canva smoke: passed; root/uploads/designs/brand templates each returned sample metadata
- verifier: passed 354/354 after Current Sprint boundary repair

## Sources

Canva official Connect API docs checked:

- Authentication / token refresh: https://www.canva.dev/docs/connect/api-reference/authentication/generate-access-token/
- Folder items: https://www.canva.dev/docs/connect/api-reference/folders/list-folder-items/
- Assets: https://www.canva.dev/docs/connect/api-reference/assets/
- Designs: https://www.canva.dev/docs/connect/api-reference/designs/get-design/
- Brand templates: https://www.canva.dev/docs/connect/api-reference/brand-templates/

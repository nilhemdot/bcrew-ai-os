# Foundation Backlog Detail Endpoint Closeout - 2026-05-15

Closeout key: `foundation-backlog-detail-endpoint-v1`
Sprint ID: `foundation-backlog-detail-endpoint-2026-05-15`
Card: `FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001`

## What Shipped

Foundation now has a read-only single-card backlog detail endpoint:

```text
GET /api/foundation/backlog/:cardId
```

The route is admin-gated, validates card IDs, reads only the requested backlog card by ID, and returns full card text for that one card. It is the detail companion to the compact default `/api/foundation-hub` backlog contract.

## Why It Matters

The default Foundation Hub route is intentionally compact. Without this endpoint, any UI or hub that needs full card text would be tempted to pull `/api/foundation-hub?view=full`, reintroducing the slow/full-diagnostics pattern. This gives Foundation and hub surfaces a small, predictable read path for one card.

## Files Changed

- `lib/foundation-backlog-detail.js`
- `server.js`
- `scripts/process-foundation-backlog-detail-endpoint-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/foundation-backlog-detail-endpoint-001-plan.md`
- `docs/process/approvals/FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-records.js`

## Proof

Focused proof:

```text
npm run process:foundation-backlog-detail-endpoint-check -- --json
```

Key measured output:

- Real card detail route: `200`, `48ms`, `2,089B`
- Missing valid card: `404`
- Malformed card ID: `400`
- Default `/api/foundation-hub`: `461,702B`
- Dogfood proof covers found, missing, and malformed card behavior.

Full closeout proof:

```text
npm run process:foundation-backlog-detail-endpoint-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001.json --closeoutKey=foundation-backlog-detail-endpoint-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001 --closeoutKey=foundation-backlog-detail-endpoint-v1
npm run process:foundation-ship -- --card=FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001.json --closeoutKey=foundation-backlog-detail-endpoint-v1 --commitRef=HEAD
```

## Not Shipped

- No Marketing Video Lab route wiring.
- No hub feature UI.
- No paid-source auth or extraction.
- No full diagnostics redesign.
- No broad Foundation frontend rewrite.

## Next

Continue no-auth Foundation cleanup. Good candidates:

- another verifier module split
- server route ownership split
- a small UI consumer switch to use `/api/foundation/backlog/:cardId` if the Foundation page currently pulls full diagnostics for card expansion

# SOURCE-001 Gmail Source Contract Closeout

Date: 2026-05-20
Card: `SOURCE-001`
Closeout key: `source-001-gmail-source-contract-v1`

## What Changed

- Locked `SRC-GMAIL-001` as a V1 signed-off source boundary for current Foundation read-side use.
- Updated source registry docs and shared communications notes so Gmail is clearly the fallback mailbox / Google email layer, not Missive internal-comment or assignment truth.
- Added a focused SOURCE-001 proof that checks live governed Gmail targets, latest governed Gmail jobs, local artifact counts, source-registry sync, and dogfood false-green cases.
- Advanced Current Sprint to `SOURCE-002` when the focused proof closes the card.

## Boundary

Approved:

- delegated Gmail reads,
- governed `gmail-current-day` thread archive,
- governed `gmail-extract-latest` candidate extraction,
- `email-attachments-backfill` PDF/text/calendar attachment V1 artifacts,
- local source registry / backlog / Current Sprint updates.

Not approved:

- Gmail sends,
- Gmail settings/label/filter/credential/provider mutation,
- broad team-mailbox exposure,
- broad historical private Gmail extraction,
- Drive permission mutation,
- treating Gmail as Missive internal comments, mentions, assignments, or routing truth.

## Proof

- `node --check lib/source-001-gmail-source-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js scripts/process-source-001-check.mjs`
- `npm run process:source-001-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SOURCE-001 --planApprovalRef=docs/process/approvals/SOURCE-001.json --closeoutKey=source-001-gmail-source-contract-v1 --commitRef=HEAD`

## Next

Continue `SOURCE-002` in the live sprint order unless System Health, repeated-failure gate, `foundation:verify`, or main sync goes red.

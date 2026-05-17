# Foundation Backlog Done Archive Lazy Load Closeout

Card: `FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001`

Closeout key: `foundation-backlog-done-archive-lazy-load-v1`

Branch: `foundation/system-health-red-to-green-001`

## What Shipped

- Updated the default `GET /api/foundation/backlog` contract so it returns all non-done cards plus a bounded recent-done window.
- Added explicit `GET /api/foundation/backlog/done-archive` route ownership for older done cards.
- Preserved total backlog counts, active counts, done counts, recent-done counts, archived-done counts, and full older done-card history.
- Kept focused backlog links working through the default route `ids=` query without loading every older done card.
- Added the minimal `#backlog-done-archive` page using the existing backlog card renderer, with no visual redesign.
- Added focused proof, verifier coverage, plan/approval artifacts, and closeout registry record.

## Proof

- Focused proof: `npm run process:foundation-backlog-done-archive-lazy-load-check -- --json`
- Focused proof result: 16/16 checks passed.
- Close-card focused proof passed with `FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001:done`.
- Default `/api/foundation/backlog`: 384,693 bytes / 365ms, 266 visible rows out of 651 total cards.
- Done archive `/api/foundation/backlog/done-archive`: 580,500 bytes / 342ms, preserving 385 older done cards behind the explicit archive route.
- Route budgets: default backlog under 700KB / 1.5s; done archive under 900KB / 1.5s.
- Backlog hygiene: `npm run backlog:hygiene -- --json`
- Foundation verify: `npm run foundation:verify`
- Ship gate: `npm run process:foundation-ship -- --card=FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001.json --closeoutKey=foundation-backlog-done-archive-lazy-load-v1 --commitRef=HEAD`

## Dogfood Coverage

- Default backlog loads active plus recent done, not full done history.
- Older done cards appear through the explicit done archive route.
- Focused links can include a requested archived done card by ID.
- A fixture that keeps all done cards in the default payload fails.
- A fixture missing the done archive route fails.

## Boundaries Held

- No backlog semantic rewrite.
- No deletion or data loss.
- No Recent Work rewrite.
- No extractor runtime, live extraction, auth-required extraction, paid extraction, connector work, or OAuth work.
- No Harlan, Fal, voice, Canva, OpenHuman, or broad visual UI redesign.
- No `MEETING-VAULT-ACL-001` Phase B or Meeting Vault permission mutation.
- No Google Drive permission mutation.
- No live Agent Feedback auto-send job.

## Next

Recommended next sprint: `EXTRACTION-RUNTIME-READINESS-001`, unless backlog budgets or engineering fitness turn red.

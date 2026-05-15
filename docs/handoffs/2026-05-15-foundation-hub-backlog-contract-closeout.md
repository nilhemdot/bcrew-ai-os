# Foundation Hub Backlog Contract Closeout - 2026-05-15

Closeout key: `foundation-hub-backlog-contract-v1`
Sprint ID: `foundation-hub-backlog-contract-2026-05-15`
Card: `FOUNDATION-HUB-BACKLOG-CONTRACT-001`

## What Shipped

The default `/api/foundation-hub` route now uses an explicit `foundation-hub-backlog.contract.v1` backlog contract instead of sending full long backlog rows by default.

The new contract preserves the fields normal command surfaces need:

- card id/title
- scope/team
- lane
- priority
- rank
- short summary
- optional short source/action/status/owner/update excerpts
- lane, priority, and scope counts
- full-detail pointer to `/api/foundation-hub?view=full`

Full backlog detail remains available through `/api/foundation-hub?view=full`.

## Why It Matters

The backlog is now hundreds of cards. If the default Foundation command surface carries every long `whyItMatters`, `nextAction`, and `statusNote` forever, the route silently bloats as the rebuild grows. This card makes the default contract explicit and budgeted before that becomes another 70-second API.

## Files Changed

- `lib/foundation-hub-backlog-contract.js`
- `lib/foundation-hub-summary-payload.js`
- `server.js`
- `scripts/process-foundation-hub-backlog-contract-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/foundation-hub-backlog-contract-001-plan.md`
- `docs/process/approvals/FOUNDATION-HUB-BACKLOG-CONTRACT-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-records.js`

## Proof

Focused proof:

```text
npm run process:foundation-hub-backlog-contract-check -- --json
```

Key measured output:

- Dogfood pathological row: `35,317B -> 1,018B`
- Live backlog rows: `635,881B -> 344,325B`
- Live default `/api/foundation-hub`: `473,181B`
- Live default route duration in focused proof: `93ms`
- Live row count preserved: `455/455`

Compatibility proof:

- `foundation:verify` exposed that the compact default job payload could drop the critical `llm-auth-audit` latest run when it fell outside the recent-run slice.
- `compactFoundationJobRunSnapshot()` now preserves critical job latest runs from job definitions as well as recent runs.
- Final verifier readback passed `312/312`.

Full closeout proof:

```text
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-HUB-BACKLOG-CONTRACT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HUB-BACKLOG-CONTRACT-001.json --closeoutKey=foundation-hub-backlog-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-HUB-BACKLOG-CONTRACT-001 --closeoutKey=foundation-hub-backlog-contract-v1
npm run process:foundation-ship -- --card=FOUNDATION-HUB-BACKLOG-CONTRACT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HUB-BACKLOG-CONTRACT-001.json --closeoutKey=foundation-hub-backlog-contract-v1 --commitRef=HEAD
```

## Not Shipped

- No Marketing Video Lab route wiring.
- No hub feature work.
- No paid-source auth or extraction.
- No full frontend redesign.
- No backlog mutation from the proof script.

## Next

Continue no-auth Foundation cleanup. Good candidates:

- another verifier module split
- server route ownership split
- a dedicated backlog-detail endpoint if the UI needs rich card expansion without loading full diagnostics

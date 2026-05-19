# Clean Table: Marketing Video Lab WIP Preservation - 2026-05-15

## Why This Exists

Steve wanted `main` clean before the next Foundation sprint instead of carrying dirty Marketing Hub work in the working tree.

The Marketing Video Lab Phase 2A WIP was not discarded. It was preserved on an isolated local branch and split into live backlog cards so the work can resume deliberately later.

## Preserved WIP Branch

Local branch:

```text
wip/marketing-video-lab-phase-2a-2026-05-15
```

WIP commit:

```text
1097683 WIP Marketing Video Lab phase 2A
```

The branch contains the Marketing chat's unshipped files:

- `docs/marketing/video-lab/README.md`
- `docs/marketing/video-lab/real-tool-implementation-plan.md`
- `docs/marketing/video-lab/server-route-review-request.md`
- `lib/marketing-video-job-store.js`
- `lib/marketing-video-live.js`
- `lib/marketing-video-provider-adapters.js`
- `public/marketing.html`
- `public/marketing.js`
- `scripts/marketing-video-lab-live-check.mjs`

Do not merge this branch directly into `main`. Resume it only through the live backlog cards below.

## Live Backlog Updates

Created or updated in live backlog:

- `HUB-CONSUMER-CONTRACT-001`
- `HUB-SANDBOX-WORKFLOW-001`
- `SHARED-FILE-INTEGRATION-GATE-001`
- `SOURCE-TO-HUB-PROOF-001`
- `MARKETING-VIDEO-LAB-LIVE-SAFETY-001`
- `MARKETING-VIDEO-LAB-OWNER-ROUTE-INTEGRATION-001`
- Updated `MARKETING-VIDEO-LAB-001` from active executing WIP back to scoped parent work.

Backlog hygiene proof:

```text
npm run backlog:hygiene -- --json
Status: healthy
Cards scanned: 454
Findings: 0
```

## Safety Findings To Preserve

Main/Foundation review found two blockers before route wiring:

1. Concurrent Marketing Video Lab submits could create two running jobs.
2. Placeholder HTTPS sample assets could pass live validation.

Those are now owned by `MARKETING-VIDEO-LAB-LIVE-SAFETY-001`.

Route wiring is sequenced after safety under `MARKETING-VIDEO-LAB-OWNER-ROUTE-INTEGRATION-001`.

## Clean Main State

After preserving the WIP branch and updating backlog, `main` was returned to the pushed Foundation state:

```text
5599a0399e37948e1864660dbf9e86955c6f4d83
```

Use this handoff before any future Marketing Video Lab continuation.

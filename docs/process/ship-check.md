# Process Ship Check

Plain English: this is the manual v1 gate before a Foundation ship is trusted.

For normal ships, prefer the v2 wrapper:

```bash
npm run process:foundation-ship -- \
  --card=<CARD_ID> \
  --planApprovalRef=docs/process/approvals/<CARD_ID>.json \
  --closeoutKey=<CLOSEOUT_KEY> \
  --commitRef=HEAD
```

The wrapper runs this check, `process:fanout-check`, `process:post-ship-fanout`, and `foundation:verify` in order. It refuses missing required arguments instead of silently skipping gates.

Run it after the plan is approved and before the ship is treated as done:

```bash
npm run process:ship-check -- \
  --card=PROCESS-HOOKS-001 \
  --planApprovalRef=docs/process/approvals/PROCESS-HOOKS-001.json \
  --closeoutKey=process-hooks-v1
```

What it checks:

- the backlog card exists
- an approval file exists
- the approval score is at least 9.8
- the approval has an approver and timestamp
- the Recent Builds closeout has all seven required fields
- the closeout says where the work lives
- the dashboard is serving the same commit as repo `HEAD`
- default `npm run foundation:verify` passes on `localhost:3000`

If live verification is intentionally skipped, `--skipLiveVerifyReason="..."` is required.

If an emergency bypass is ever used, `--emergencyBypassReason="..."` is required and a follow-up backlog card must be created or updated.

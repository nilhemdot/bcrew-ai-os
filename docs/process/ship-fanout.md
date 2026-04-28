# Process Fanout Check

This check answers one plain-English question:

Did the ship update every place it claimed to update?

Use it after the normal process ship check for Foundation work.

```bash
npm run process:fanout-check -- --card=PROCESS-FANOUT-001 --closeoutKey=process-fanout-v1-repair
```

## What It Checks

- The backlog card exists and is actually done.
- The closeout record exists and has the seven required fields.
- The closeout links the target backlog card.
- Files, docs, and scripts named by the card or closeout really exist.
- Recent Builds exposes the closeout.
- Recent Builds says where the change lives.
- Proof commands include `process:fanout-check`, `process:ship-check`, and `foundation:verify`.
- The live dashboard is serving the same commit as repo `HEAD`.

## Why It Exists

`PROCESS-FANOUT-001` was marked done while claiming these artifacts existed:

- `scripts/process-fanout-check.mjs`
- `docs/process/ship-fanout.md`
- `npm run process:fanout-check`

They did not exist.

That is a false-done card. This check prevents that class of miss from passing quietly again.

## What It Does Not Do Yet

- It is not a Git hook.
- It does not automatically update every downstream surface.
- It does not replace `npm run process:ship-check`.
- It does not prove worker served-code trust.
- It does not scan every historical card for full verifier coverage.

Those are separate follow-up cards in the hit list.

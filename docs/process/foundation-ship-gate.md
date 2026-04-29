# Foundation Ship Gate

Plain English: this is the one command builders should run before a Foundation ship is trusted.

It does not replace Steve's 9.8 plan review. It only makes the approved ship gates harder to forget.

## How To Run

```sh
npm run process:foundation-ship -- --card=<CARD_ID> --planApprovalRef=docs/process/approvals/<CARD_ID>.json --closeoutKey=<CLOSEOUT_KEY> --commitRef=HEAD
```

## What It Runs

1. `npm run process:ship-check`
2. `npm run process:fanout-check`
3. `npm run process:post-ship-fanout`
4. `npm run foundation:verify`

## Required Inputs

- `--card`
- `--planApprovalRef`
- `--closeoutKey`

If any required input is missing, the wrapper refuses to run and prints the missing argument. It does not silently skip a gate.

## Boundaries

- The wrapper orchestrates existing gates; it does not invent a new approval process.
- The wrapper does not replace the 9.8 plan score.
- Emergency bypass still needs a reason and follow-up card through the existing ship-check behavior.

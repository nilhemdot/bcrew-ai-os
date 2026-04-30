# Post-Ship Fanout Check

This check answers one plain-English question:

Did this ship update the places around the code that Steve needs in order to trust it?

Run it after `process:ship-check` and `process:fanout-check`:

```bash
npm run process:post-ship-fanout -- --card=POST-SHIP-FAN-OUT-001 --closeoutKey=post-ship-fanout-v1
```

For normal review, this check reads live Foundation state after a read-only DB readiness check. It does not run schema/seed initialization.

## V1 Rules

- Commit touches `lib/foundation-db.js` -> the closeout must reference Backlog state changes.
- Commit touches `scripts/foundation-verify.mjs` -> the closeout must reference verifier checks and include `foundation:verify` proof.
- Commit touches `public/foundation.js` -> the closeout must reference the visible Foundation surface.
- Commit touches `docs/rebuild/*` -> the closeout must reference plan/state changes.
- Commit touches `package.json` -> the closeout must reference the npm command or proof command it added.

## What It Does Not Do

V1 checks and reports. It does not auto-edit backlog cards, docs, or UI metadata.

That boundary is intentional. Auto-updating every touched surface would be wrong too often. The right first step is to fail loudly when the surrounding truth did not move with the code.

## What Fails

- Missing seven-field closeout.
- Closeout does not link the target backlog card.
- Closeout links a backlog card that does not exist.
- A touched file triggers a rule, but the closeout does not explain that surface.
- A verifier change does not include `foundation:verify` proof.
- The synthetic missing-fanout test stops being caught.

## Why It Exists

`PROCESS-FANOUT-001` was once marked done while the artifacts it claimed did not exist. The next failure class is subtler: code ships, but Backlog, Recent Work, Runtime Health, plan/state docs, or verifier proof do not move with it.

This check makes that drift visible before the ship is trusted.

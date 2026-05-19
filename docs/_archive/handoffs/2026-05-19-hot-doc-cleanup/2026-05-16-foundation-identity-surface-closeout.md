# Foundation Identity Surface Closeout

Card: `FOUNDATION-IDENTITY-001`
Closeout key: `foundation-identity-surface-v1`
Status: Done

## What Changed

- Added `lib/foundation-identity-surface.js` for the identity payload builder, validator, source evaluator, and dogfood proof.
- Added `identity` to `/api/system-inventory`.
- Added a Workspace Identity panel to Foundation > System Inventory.
- Extended source-trust verifier coverage so `foundation:verify` requires the identity payload.
- Added `scripts/process-foundation-identity-check.mjs` and `process:foundation-identity-check`.

## What It Does

Foundation now shows the active guidance stack without copying private local memory content into shared truth:

- `docs/users/steve.md` is the repo-visible Steve profile.
- `USER.md`, `MEMORY.md`, and `memory/*.md` remain local-private metadata-only signals.
- `bcrew-foundation` is detected from local runtime skills.
- plugins are shown as runtime capabilities, not business source-truth signoff.

## Proof

- `node --check lib/foundation-identity-surface.js server.js public/foundation-system-inventory-renderers.js lib/foundation-source-trust-verifier.js scripts/process-foundation-identity-check.mjs`
- `npm run process:foundation-identity-check -- --json` passed 12/12.
- `/api/system-inventory` identity proof: 117ms / 313,656 bytes during focused proof.
- `npm run foundation:verify -- --json-summary` passed 397/397 before closeout.

## Dogfood

The focused proof calls the real builder, validator, and live API route. It proves:

- safe metadata-only identity passes;
- synthetic private content fails closed;
- missing `bcrew-foundation` fails closed;
- plugin-as-source-truth fails closed.

## Not Done

- No private memory content exposure.
- No auth broadening.
- No live Agent Registry.
- No hub feature work.
- No source extraction or Build Intel extraction.
- No Marketing Video Lab wiring.
- No Canva asset-library workflow.
- No `MEETING-VAULT-ACL-001 Phase B`.
- No Drive permissions mutation or request-access email path.

## Next

Continue no-auth Foundation cleanup. Good next slices are another verifier proof-domain split, a bounded Foundation DB store split, or a verifier/current-sprint focused repair if the ship gate surfaces a process gap.

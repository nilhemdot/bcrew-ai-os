# Foundation DB Store Split Sprint Handoff - 2026-05-14

Live sprint ID: `foundation-db-store-split-2026-05-14`.

## Sprint Goal

Reduce `lib/foundation-db.js` monolith risk by splitting the Current Sprint store and mutation guard seam into a separate module while preserving the public Foundation DB exports.

## Card

1. `FOUNDATION-DB-STORE-SPLIT-001`

## Process Guardrail

- The sprint was opened in live DB first with the card in Scoping and empty doctrine.
- Doctrine and Plan Critic rows must exist before the card moves to Sprint Ready.
- Build only this one store split.
- Dogfood proof must recreate the broad Current Sprint mutation risk and prove the guard still blocks unsafe writes after the split.
- Stop at sprint review when the card closes.

## Not Next

- No Sales Hub or Ops Hub work.
- No Build Intel, Skool, myICOR, Loom, YouTube, or GitHub extraction.
- No broad `foundation-db.js` rewrite.
- No `public/foundation.js`, `server.js`, or `scripts/foundation-verify.mjs` cleanup beyond focused proof registration.
- No schema seed split in this card.

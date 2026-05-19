# Foundation Performance Hardening Sprint Handoff - 2026-05-13

Live sprint ID: `foundation-performance-hardening-2026-05-13`.

## Sprint Goal

Make the Foundation command surface fast enough for daily sprint work by reducing the default `/api/foundation-hub` latency and payload while preserving the full diagnostic view behind an explicit detail mode.

## Card

1. `FOUNDATION-PERFORMANCE-001`

## Baseline

- `/api/foundation-hub`: `63.541180s`, `4,506,418` bytes, HTTP `200`.
- `/api/foundation/current-sprint`: `0.367777s`, `15,665` bytes, HTTP `200`.
- Largest JavaScript files before work:
  - `lib/foundation-db.js`: `19,494` lines.
  - `public/foundation.js`: `16,054` lines.
  - `scripts/foundation-verify.mjs`: `13,736` lines.
  - `server.js`: `7,640` lines.
  - `lib/foundation-build-log.js`: `5,775` lines.

## Process Guardrail

- Sprint was opened in live DB first with `FOUNDATION-PERFORMANCE-001` in Scoping.
- Doctrine and Plan Critic approval are required before build.
- Dogfood proof must measure the same route before and after the fix.
- This sprint may touch oversized files only with a named extraction/split boundary and a narrow reason.
- Stop at sprint review when the card closes. Do not open the next sprint automatically.

## Not Next

- No Build Intel extraction, Skool, myICOR, Loom, YouTube, or GStack work.
- No product, hub, customer, or operational feature work.
- No broad UI redesign.
- No broad monolith refactor beyond the smallest extraction needed for this performance slice.
- No autonomous backlog mutation.
- No `MEETING-VAULT-ACL-001` Phase B work.
- No Drive permission mutation or request-access emails.


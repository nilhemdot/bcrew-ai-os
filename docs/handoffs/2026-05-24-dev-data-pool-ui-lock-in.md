# Dev Data Pool UI Lock-In

Date: 2026-05-24
Status: Locked for next implementation pass

## What Locked

The Dev Data Pool page is now the live proof for the hub-page design pattern.
The style contract was promoted to active in
`docs/specs/bcrew-ui-design-contract.md`.

Approved page order:

1. blue hero pill
2. Director Lens
3. Extraction Systems
4. Evidence Produced
5. Source Inputs

Key decisions:

- First content band after the blue pill is white.
- Then alternate grey, white, grey bands.
- The blue hero pill does not use a cyan glow.
- Mascot assets on blue surfaces must use cleaned cutouts, not source files with
  semi-transparent studio floor/background haze.
- Director Lens comes before extraction/source proof because Steve should see
  the useful recommendations first.
- Repeated cards use left accent bars, stable footer alignment, plain-English
  titles, and no duplicate status pills.
- Evidence cards use big numbers with plain-English labels.
- Source cards are compact mini-cards with icons and one status line.
- Healthy/live states do not need extra pills in detail panels.
- Normal operator UI must not expose database table names, raw artifact IDs,
  job keys, or internal labels such as `source-backed candidate`.

## Current Proof

Live files:

- `public/dev.html`
- `public/dev.css`
- `public/dev.js`
- `scripts/process-dev-team-hub-v0-check.mjs`

Focused proof already passed:

- `node --check public/dev.js`
- `node --check scripts/process-dev-team-hub-v0-check.mjs`
- `npm run process:dev-team-hub-v0-check -- --json`
- Browser scan confirmed v21 assets, no rejected visible copy, and aligned
  extractor/evidence footer rows.

Screenshots from the pass:

- `/tmp/bcrew-dev-ui-pass/dev-plain-english-final-desktop.png`
- `/tmp/bcrew-dev-ui-pass/dev-plain-english-final-mobile.png`
- `/tmp/bcrew-dev-ui-pass/dev-final-polish-desktop.png`
- `/tmp/bcrew-dev-ui-pass/dev-banner-shadow-flat.png`

## Next Right Work

1. Apply the locked contract to the hub launcher as a small polish pass.
2. Keep `/dev` focused on Data Pool proof before adding more Dev pages.
3. Route any new extractor/source/director concepts through backlog instead of
   expanding this page ad hoc.
4. If a future builder changes visual patterns, update the design contract in
   the same slice.

## Hub Launcher Follow-Up Applied

The next polish pass started immediately after lock-in:

- launcher now points at versioned `mascot-6-cutout-v2-*` assets to remove the
  semi-transparent floor/background haze
- login was returned to the original transparent `mascot-7-*` assets with the
  heavy image drop-shadow removed, because global alpha cleanup damaged the
  hair/head edge
- launcher user chip opens an account menu with `Log out`
- launcher cache keys bumped to the May 24 polish assets
- minor launcher contract alignment: 22px hubs heading, 11px role text, no fixed
  topbar-right min-width, active press feedback
- follow-up consistency pass changed launcher display family to `Stratum1`,
  switched launcher KPI footers to dashed dividers, showed the Dev sidebar
  `HUB · 07` kicker with pulse dot, kept the Dev mobile live pill visible while
  hiding subtitle/clock, and moved Source Inputs to a 5-card desktop row
- final header repair removed the `/dev` page-local `topbar` / `tb-*` header
  system. `/dev` now imports `/hub-launcher.css` and uses the exact launcher
  header classes. Focused proof added to `process:dev-team-hub-v0-check`, and a
  Playwright desktop/mobile computed-style comparison passed 76/76 checks.

## Extraction Checkpoint

Current sprint truth on 2026-05-24:

- active card: `MARK-KASHEF-LAST-50-BASELINE-001`
- next action: review
  `proof:mark-kashef-last-50-baseline-001:god-mode-end-to-end:5xrjO38WUYY`,
  then run the next small Mark API full-watch batch with `gemini-3.5-flash` if
  quality/value is approved
- not next: full YouTube extraction across every creator

Reason:

- `process:current-sprint-active-card-gate-check -- --json` is healthy and
  points to the Mark baseline card.
- `process:dev-team-intelligence-director-check -- --json` is healthy, reads the
  active Mark card, and exposes 5 proposal-only Director picks.
- `intelligence:synthesis-proof -- --json` succeeded and shows the synthesis
  spine can save facts, cluster active items, and avoid unclustered routeable
  items.
- `intelligence:action-router-proof -- --json` failed because a route proposal
  selected an unverified synthesized item. That is a router trust issue and
  blocks broad extraction scale-up until repaired or explicitly bounded.

Recommended next sequence:

1. Treat the design system as locked for this slice.
2. Repair/bound the action-router verified-only gate so proposed actions can
   only route verified synthesized items.
3. Continue the active Mark baseline with a small guarded Gemini API full-watch
   batch, not full YouTube.
4. Re-run the Dev Intelligence Director after the next batch and review whether
   recommendations improve.
5. Only after Mark quality, cost, router trust, and approval boundaries are
   proven should the sprint expand to broader creator extraction.

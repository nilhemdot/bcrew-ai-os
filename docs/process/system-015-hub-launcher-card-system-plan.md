# SYSTEM-015 - Hub Launcher Station Card Alignment

## Objective

Bring the hub launcher station cards into the locked BCrew AI OS card system without rebuilding the launcher.

## Why This Matters

The `/dev` Data Pool page now proves the preferred repeated-card pattern:

- left accent status bar;
- stable card rows;
- aligned footer line;
- plain status copy instead of noisy pills;
- consistent hover/lift behavior;
- no duplicate status treatments.

The hub launcher is visually strong, but its station cards still use the older top-accent/status-pill pattern. If that stays, future hub pages will keep drifting between two card systems.

## V1 Scope

- Update only the eight launcher station cards.
- Use the v3 UI design contract in `docs/specs/bcrew-ui-design-contract.md`.
- Preserve launcher hero, mission, mascot, KPI/metric cards, route behavior, and access behavior.
- Replace chunky station-card status pills with the locked left-accent status treatment.
- Keep one clear footer/action line per station card.
- Prove desktop and mobile screenshots against the launcher and Dev Data Pool patterns.

## Not In Scope

- Do not rebuild the login screen.
- Do not change hub access/permissions.
- Do not add new hub pages.
- Do not change source-backed values or Foundation hub data calls.
- Do not redesign hero KPI cards unless a specific defect is found.

## Acceptance Criteria

- Hub launcher station cards and Dev Data Pool cards feel like the same product family.
- Station cards use one status treatment, not top rule plus status pill plus win box.
- Footer/action rows align across cards.
- Mobile cards do not clip, overlap, or change heights unpredictably.
- The launcher still keeps its command-center energy.

## Proof Commands

- focused launcher screenshot/proof command after implementation
- `node --check public/home.js`
- `npm run process:hub-launcher-source-backed-values-check`

## Implementation Checkpoint - 2026-05-24

V1 station-card alignment has been applied:

- eight launcher station cards use left accent status rails;
- Strategy partial is amber;
- planned stations are grey;
- Ops live is blue;
- Dev carve-out is black;
- chunky status-pill styling is removed from station cards;
- the station value line is plain text instead of a tinted win box;
- footer rows align across cards.

Proof captured:

- `npm run process:hub-launcher-source-backed-values-check -- --json`
- desktop screenshot: `/tmp/bcrew-hub-launcher-style-lock-desktop-v2.png`
- mobile screenshot: `/tmp/bcrew-hub-launcher-style-lock-mobile-v2.png`

Visual audit result:

- 8/8 station cards visible;
- 0 chunky station status pills;
- no console errors;
- no failed requests;
- no card text overflow;
- equal station card heights on desktop and mobile;
- aligned station card footers on desktop and mobile.

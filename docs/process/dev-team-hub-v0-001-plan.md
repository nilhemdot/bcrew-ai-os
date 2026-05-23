# DEV-TEAM-HUB-V0-001 Plan

## What

Build a read-only Dev Team Hub V0 at `/dev` that consumes Foundation truth for the YouTube To Dev Team Intelligence V1 sprint.

This V1 is narrow: it proves the data pipe from public creator watch and Mark YouTube scout outputs into an operator-facing Dev surface. It does not create a new Dev data silo and it does not run extraction.

## Why

Steve needs to see what Build Intel produced without reading raw database rows, chat handoffs, or source artifacts.

The useful operator behavior is simple: open `/dev`, see the current sprint state, see recommended build candidates, see approval-required source/link items, and verify that the research pool, atoms, evidence hits, and review routes are flowing from Foundation.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` returns `ready` from Foundation-backed data only.
- `/dev` renders a read-only Dev Hub over the existing Foundation API route.
- The page shows recommended build candidates before raw proof details.
- Approval-required items are visible and split between source/video approvals and external/private/download/auth links.
- Daily creator watch, Mark YouTube status, scout report, atoms, evidence hits, review routes, and approval-required links are readable from existing Foundation tables/routes.
- No extraction, external writes, browser profile mutation, credential mutation, or automatic backlog card creation happens from this card.
- `DEV-TEAM-HUB-V0-001` has a focused proof, closeout handoff, closeout registry record, verifier coverage, and live sprint/backlog readback.
- Plan Critic returns pass and the live Current Sprint gate stays healthy after closeout.

## Definition Of Done

Done means Steve can open `/dev` and verify that Foundation Build Intel data reaches the Dev Hub: research pool count, Mark/YouTube source status, recommended build candidates, approval queue, atoms, evidence hits, and review routes.

Done also means the root invariant is proven: the Dev Hub reads Foundation truth through the real API/function path and does not hardcode or invent the Build Intel data. Substring-only proof is rejected; marker checks cannot replace the API and DB-backed round trip.

## Details

Existing code reused:

- `lib/dev-team-hub.js`
- `lib/foundation-build-intel-routes.js`
- `server.js`
- `public/dev.html`
- `public/dev.css`
- `public/dev.js`
- `scripts/process-dev-team-hub-v0-check.mjs`
- Foundation tables for `intelligence_report_artifacts`, `intelligence_atoms`, `intelligence_atom_hits`, source crawl/watch truth, and Current Sprint truth

Existing docs reused:

- `docs/process/youtube-dev-team-intelligence-sprint-plan-001-plan.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/handoffs/2026-05-21-youtube-dev-team-intelligence-sprint-checkpoint.md`
- `docs/handoffs/2026-05-21-youtube-scout-latest-video-vision-closeout.md`

Behavior proof uses the actual route/API/process path: `/api/foundation/dev-team-hub`, the Dev Hub module, the focused process check, and Playwright page render checks. It rejects weak dogfood where the route is missing required Build Intel buckets, where approval items are not surfaced, or where data is not sourced from Foundation truth.

Gate decision tree: static, focused, and full gates were considered from blast radius. Static proof is not enough because this card adds an operator-facing route/page and reads live Foundation intelligence data. The focused gate is `npm run process:dev-team-hub-v0-check -- --json`; full closeout uses Current Sprint/backlog gates plus `foundation:verify` or a documented unrelated broad-gate blocker.

Operator value: Steve gets a usable Dev command surface for the sprint instead of an invisible proof artifact.

Speed boundary: the focused proof stays proportional and should complete in a few minutes; it does not run a broad crawl or model extraction.

Repair path: if the route, page, data readback, closeout, or sprint gate fails, fail closed, repair the specific API/DB/UI path, rerun the focused proof, and reopen the card if the claimed data pipe is not real.

## Risks

- The page can become a report dump instead of a decision surface. Repair path: keep Overview decision-first and move raw data to detail views.
- UI can hardcode stale Build Intel numbers. Repair path: source values from Foundation API only and show `Needs source` if data is not available.
- Approval items can look like permission to follow private/external links. Repair path: split approval queues and keep external/private/download/auth actions blocked until explicit approval.
- Broad Foundation gates can be red from unrelated health blockers. Repair path: run the focused proof and sprint gates, document unrelated broad blockers, and do not claim full green unless broad gates pass.

## Not Next

- Do not run Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment extraction.
- Do not purchase, download, opt in, book, submit forms, send external messages, mutate credentials, or mutate browser profiles.
- Do not create backlog cards automatically from Build Intel findings.
- Do not treat public creator metadata as transcript/model/visual extraction approval.
- Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or mutate Drive permissions.

## Tests

- `node --check public/dev.js`
- `node --check lib/dev-team-hub.js`
- `node --check lib/foundation-build-intel-routes.js`
- `npm run process:dev-team-hub-v0-check -- --json`
- `/api/foundation/dev-team-hub` ready readback
- Desktop and mobile Playwright render checks for `/dev`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`

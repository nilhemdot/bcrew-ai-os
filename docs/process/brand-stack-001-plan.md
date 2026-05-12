# BRAND-STACK-001 Brand Stack Plan

Status: approved at 10.0 on 2026-05-12. Implementation is limited to this plan.

Card: `BRAND-STACK-001`

## What

Build the fifth Foundation Source Once-Over card: a source-backed brand stack that models five brand entities and their Brand Guardian boundaries without building marketing production.

V1 models five brand entities:

- Benson Crew
- Zahnd Team Ag
- Steve Zahnd
- MarketMasters
- Unchained

It consumes the existing `MARKETING-SOURCE-MAP-001` lane output, imported avatars, and existing brand/source doctrine. It does not build campaigns, writers, editors, designers, video production, repurposing, scheduling, Brand Guardian enforcement, content approval workflow, or connector repairs.

## Why

The old system had useful brand discipline, but the new Foundation needs explicit brand entity truth before Strategy or Marketing operators draft, route, or publish anything.

Useful operator behavior: Steve can open Foundation and see which brand entities exist, what each brand is for, which audiences/offers/tone boundaries belong to it, which source IDs and avatar assignments feed it, and which Brand Guardian rules are defined but not enforced yet.

## Acceptance Criteria

- `lib/brand-stack.js` builds a snapshot with five brand entities.
- Each entity resolves to one `MARKETING-SOURCE-MAP-001` brand lane and inherits source IDs and avatar IDs from that lane.
- Every entity has audience, offer, tone, approval, and Brand Guardian boundary rules.
- Benson Crew, Zahnd Team Ag, Steve Zahnd, MarketMasters, and Unchained stay distinct.
- Brand Guardian enforcement remains false and marketing production remains false.
- `/api/foundation/brand-stack` returns the snapshot.
- `/api/foundation/source-lifecycle` and `/api/foundation-hub` include the same `brandStack` payload.
- Foundation UI renders the brand stack under Source Lifecycle.
- Plan Critic must return `pass` with score at least 9.8; `revise` blocks closeout until this plan or implementation is repaired.
- The focused proof validates approval, Plan Critic, real function path, API/UI/process wiring, synthetic classification, no production build, current-plan/current-state/build-log fanout, and Current Sprint advancement to `TIER-BEHAVIORAL-COMPLETION-001`.

## Definition Of Done

Done means `brand-stack-v1` is closed with:

- valid approval file at `docs/process/approvals/BRAND-STACK-001.json`;
- brand stack library at `lib/brand-stack.js`;
- API route at `/api/foundation/brand-stack`;
- Source Lifecycle/Foundation Hub payload wiring;
- Foundation UI rendering in `public/foundation.js` and `public/styles.css`;
- focused proof at `scripts/process-brand-stack-check.mjs`;
- package script `process:brand-stack-check`;
- backlog card moved to done with closeout proof;
- Current Sprint active blocker advanced to `TIER-BEHAVIORAL-COMPLETION-001`;
- current plan/current state/build log/verifier fanout updated.

## Details

Existing work reused:

- `lib/marketing-source-map.js`
- `lib/marketing-avatar-registry.js`
- `docs/source-notes/freedom-marketing.md`
- `docs/strategy/marketmasters.md`
- `docs/system-strategy.md`
- `lib/foundation-current-sprint.js`
- `lib/foundation-db.js`
- `server.js`
- `public/foundation.js`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Implementation shape:

- Add `lib/brand-stack.js` as the Foundation brand entity and Brand Guardian boundary builder.
- Use the marketing source map as the lane/source/avatar input; do not create new connector/source contracts.
- Add the brand stack API and attach the payload to existing Source Lifecycle and Foundation Hub responses.
- Render five brand cards in the existing Foundation Source Lifecycle view.
- Advance Source Once-Over to `TIER-BEHAVIORAL-COMPLETION-001` after proof passes.

Not Next:

- Do not build the Marketing Pipeline.
- Do not build writer/editor/designer/video/repurposer/scheduler operators.
- Do not build Brand Guardian enforcement or generated-content approval workflow.
- Do not fix Google Ads auth, validate SocialPilot, connect Real Broker, or create campaigns.
- Do not build Reply Parser, Watching Items, Strategy Hub expansion, Telegram bots, Directors, or Drive ACL changes.

## Risks

- The stack can look like marketing is ready when it only defines boundaries. Repair path: `brandGuardianEnforcementBuilt` and `marketingProductionBuilt` stay false, and the UI labels this as boundary-only.
- Brand entities can blur into each other if the rules are too generic. Repair path: focused proof requires five distinct entities with lane-specific audience/offer/tone/approval boundaries.
- Brand Guardian can be accidentally completed inside this card. Repair path: this card defines Guardian boundaries only; enforcement stays for a later approved card.
- If the focused proof fails, fix the real brand snapshot, API, UI, sprint state, or backlog wiring before trying the full gate.

## Gate Decision

Decision-tree result: full gate for ship, focused gate while building.

- Static gate alone is not enough because this changes server/API, UI, current sprint, build log, docs, package scripts, and canonical verifier coverage.
- Focused gate: `npm run process:brand-stack-check -- --json=true`; this is the fast default loop and should stay under 2 minutes.
- Full gate: `npm run process:foundation-ship -- --card=BRAND-STACK-001 --planApprovalRef=docs/process/approvals/BRAND-STACK-001.json --closeoutKey=brand-stack-v1 --commitRef=HEAD`.
- Blast radius: Foundation Source Lifecycle payloads, Foundation Hub payloads, Source Lifecycle UI, Current Sprint, build log, and `foundation:verify`.

## Tests

Run:

```bash
npm run process:brand-stack-check -- --json=true
npm run process:marketing-source-map-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=BRAND-STACK-001 --planApprovalRef=docs/process/approvals/BRAND-STACK-001.json --closeoutKey=brand-stack-v1 --commitRef=HEAD
```

Behavior proof requirements:

- call the real brand stack snapshot function;
- call the real marketing source map function path;
- prove five brand entities and five Brand Guardian boundaries;
- prove every entity resolves to a marketing source-map lane;
- prove source IDs and avatar IDs carry through from the marketing source map;
- prove Brand Guardian enforcement and marketing production remain unbuilt by this card;
- prove Current Sprint advances to `TIER-BEHAVIORAL-COMPLETION-001`;
- reject substring-only verifier theatre by failing if function/API/UI/script paths are missing.

Speed bound:

- Use the focused proof first while building.
- Keep the focused proof fast and proportional, under 2 minutes in normal local runs.
- Run the full ship gate only after the card is committed.

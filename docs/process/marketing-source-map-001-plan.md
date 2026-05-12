# MARKETING-SOURCE-MAP-001 Marketing Source Map Plan

Status: approved at 10.0 on 2026-05-12. Implementation is limited to this plan.

Card: `MARKETING-SOURCE-MAP-001`

## What

Build the fourth Foundation Source Once-Over card: a source-backed map that connects imported avatars and marketing source contracts to five brand lanes.

V1 maps five lanes:

- Benson Crew
- Zahnd Team Ag
- Steve Zahnd
- MarketMasters
- Unchained

It uses existing source contracts, `AVATAR-IMPORT-001`, and `docs/source-notes/freedom-marketing.md`. It does not build campaigns, writers, editors, designers, video production, repurposing, scheduling, Brand Guardian enforcement, or new connector repairs.

## Why

The old system had useful marketing intent, but the new Foundation needs brand-lane source truth before future Strategy or Marketing operators consume avatars, source facts, or mined content.

Useful operator behavior: Steve can open Foundation and see which brands consume which avatars, which source contracts feed each brand lane, and which marketing inputs are connected, pending, or gaps without starting marketing production.

## Acceptance Criteria

- `lib/marketing-source-map.js` builds a snapshot with five brand lanes.
- The snapshot consumes the real avatar registry and proves 15 avatars / 15 imported avatars are available.
- Benson Crew maps both RETAIN and ATTRACT avatars; Steve Zahnd and Unchained map ATTRACT avatars; MarketMasters stays source-only until Brand Stack decides its audience model.
- Every source reference points to a registered source contract.
- Gap/pending source refs stay visible instead of being marked green.
- `/api/foundation/marketing-source-map` returns the snapshot.
- `/api/foundation/source-lifecycle` and `/api/foundation-hub` include the same `marketingSourceMap` payload.
- Foundation UI renders the marketing source map under Source Lifecycle.
- Plan Critic must return `pass` with score at least 9.8; `revise` blocks closeout until this plan or implementation is repaired.
- The focused proof validates approval, Plan Critic, real function path, API/UI/process wiring, synthetic classification, no production build, current-plan/current-state/build-log fanout, and Current Sprint advancement to `BRAND-STACK-001`.

## Definition Of Done

Done means `marketing-source-map-v1` is closed with:

- valid approval file at `docs/process/approvals/MARKETING-SOURCE-MAP-001.json`;
- source map library at `lib/marketing-source-map.js`;
- API route at `/api/foundation/marketing-source-map`;
- Source Lifecycle/Foundation Hub payload wiring;
- Foundation UI rendering in `public/foundation.js` and `public/styles.css`;
- focused proof at `scripts/process-marketing-source-map-check.mjs`;
- package script `process:marketing-source-map-check`;
- backlog card moved to done with closeout proof;
- Current Sprint active blocker advanced to `BRAND-STACK-001`;
- current plan/current state/build log/verifier fanout updated.

## Details

Existing code/docs/scripts reused:

- `lib/marketing-avatar-registry.js`
- `docs/marketing/avatars/source/old-bcrew-buddy/`
- `lib/source-contracts.js`
- `docs/source-notes/freedom-marketing.md`
- `lib/foundation-current-sprint.js`
- `lib/foundation-db.js`
- `server.js`
- `public/foundation.js`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Implementation shape:

- Add `lib/marketing-source-map.js` as the Foundation source map builder.
- Use source contracts as the source reference truth; do not create loose brand/source markdown.
- Use the avatar registry function path, not copied avatar counts.
- Add the marketing source map API and attach the payload to existing Source Lifecycle and Foundation Hub responses.
- Render five lane cards in the existing Foundation Source Lifecycle view.
- Advance Source Once-Over to `BRAND-STACK-001` after proof passes.

Not Next:

- Do not build the Marketing Pipeline.
- Do not build writer/editor/designer/video/repurposer/scheduler operators.
- Do not build Brand Guardian enforcement; `BRAND-STACK-001` is next.
- Do not fix Google Ads auth, validate SocialPilot, connect Real Broker, or create campaigns.
- Do not build Reply Parser, Watching Items, Strategy Hub expansion, Telegram bots, Directors, or Drive ACL changes.

## Risks

- The map can look like marketing is ready when it only names source lanes. Repair path: gap and pending source refs stay visible, and `marketingProductionBuilt` remains false.
- Brand Stack can be accidentally completed inside this card. Repair path: this card maps source consumption only; brand entity doctrine and Brand Guardian boundaries stay in `BRAND-STACK-001`.
- The avatar count can drift from the imported source docs. Repair path: proof calls the real avatar registry and fails if the 15-avatar count or assignments change unexpectedly.
- If the focused proof fails, fix the real snapshot, API, UI, sprint state, or backlog wiring before trying the full gate.

## Gate Decision

Decision-tree result: full gate for ship, focused gate while building.

- Static gate alone is not enough because this changes server/API, UI, current sprint, build log, docs, package scripts, and canonical verifier coverage.
- Focused gate: `npm run process:marketing-source-map-check -- --json=true`; this is the fast default loop and should stay under 2 minutes.
- Full gate: `npm run process:foundation-ship -- --card=MARKETING-SOURCE-MAP-001 --planApprovalRef=docs/process/approvals/MARKETING-SOURCE-MAP-001.json --closeoutKey=marketing-source-map-v1 --commitRef=HEAD`.
- Blast radius: Foundation Source Lifecycle payloads, Foundation Hub payloads, Source Lifecycle UI, Current Sprint, build log, and `foundation:verify`.

## Tests

Run:

```bash
npm run process:marketing-source-map-check -- --json=true
npm run process:avatar-import-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=MARKETING-SOURCE-MAP-001 --planApprovalRef=docs/process/approvals/MARKETING-SOURCE-MAP-001.json --closeoutKey=marketing-source-map-v1 --commitRef=HEAD
```

Behavior proof requirements:

- call the real marketing source map snapshot function;
- call the real avatar registry function path;
- prove five brand lanes and 15 imported avatars;
- prove every source ref resolves to a registered source contract;
- prove synthetic avatar/lane/source classification;
- prove marketing production and Brand Stack remain unbuilt by this card;
- prove Current Sprint advances to `BRAND-STACK-001`;
- reject substring-only verifier theatre by failing if function/API/UI/script paths are missing.

Speed bound:

- Use the focused proof first while building.
- Keep the focused proof fast and proportional, under 2 minutes in normal local runs.
- Run the full ship gate only after the card is committed.

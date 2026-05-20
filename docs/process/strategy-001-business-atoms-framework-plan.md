# STRATEGY-001 Plan - Business Atoms Framework

## What

Create the V1 Business Atoms framework as a DB-backed planning signal layer on top of existing source-backed intelligence.

The card adds `business_atoms` and `atom_hits`, seeds a bounded set from current `intelligence_atoms` and `intelligence_synthesis_facts`, and exposes a read-only Strategy Hub Business Atoms view with weekly, monthly, quarterly, and annual planning slices.

## Why

Strategy work needs small reusable business signals instead of dashboard-only blobs. Steve should be able to see recurring bottlenecks, wins, risks, decisions, and opportunities as source-backed atoms that can later feed governance, planning, and director loops.

This must not rebuild the intelligence spine. V1 reuses the atoms, synthesis facts, source registry, temporal truth model, Current Sprint, Plan Critic, and ship gates already in the system.

The useful operator behavior is simple: Steve can open Strategy Hub and see source-backed planning signals by time horizon instead of scanning raw reports. Governance can then use those atoms as inputs without pretending they are approved decisions or automatic tasks.

## Acceptance Criteria

- `business_atoms` and `atom_hits` exist in live PostgreSQL and are initialized by Foundation DB bootstrap.
- Every business atom has a source ID, source reference, source excerpt, hit count, owner, threshold, next trigger, taxonomy fields, and temporal current-state fields.
- V1 seed creates at least five atoms from existing source-backed strategy/business evidence.
- Dashboard snapshot exposes weekly, monthly, quarterly, and annual views.
- Strategy Hub v2 payload and UI render Business Atoms without applying decisions, creating work, or calling providers.
- Source ID constraint audit includes `business_atoms.source_id` and `atom_hits.source_id`.
- Dogfood proof rejects atoms with missing provenance, missing owner/threshold/next trigger, invalid taxonomy, or no supporting hits.
- Current Sprint advances to `GOV-001` only after focused proof, System Health, repeated-failure gate, backlog hygiene, foundation verify, ship check, fanout, and foundation ship pass.

## Definition Of Done

- `npm run process:strategy-001-check -- --close-card --json` is healthy and writes the closeout.
- `STRATEGY-001` is marked done in live Backlog and Current Sprint.
- `GOV-001` is the active blocker in Current Sprint.
- The Strategy Hub Business Atoms view is read-only and uses `getBusinessAtomDashboardSnapshot`.
- `process:foundation-ship` passes and main is pushed clean.

## Details

The implementation reuses existing intelligence evidence:

- `intelligence_atoms`
- `intelligence_synthesis_facts`
- `source_contract_registry`
- `MEMORY-005` temporal truth semantics
- Strategy Hub v2 route and UI shell

The V1 taxonomy is intentionally small:

- category: bottleneck, decision needed, decision made, win, loss, frustration, opportunity, assumption risk, culture signal, external signal
- pillar: ATTRACT, GROW, RETAIN, FINANCIAL, LEADERSHIP, SYSTEM
- department: leadership, recruiting, sales, marketing, operations, retention, finance, system, unknown
- time scope: this week, this month, this quarter, annual pattern, structural
- lifecycle: detected, confirmed, recurring, structural, resolved, archived

The DB write path is limited to the focused process proof and Foundation DB initialization. The Strategy Hub route only reads the existing snapshot and must not run schema DDL or seed rows at request time.

Behavior proof is no substring-only proof. The focused process check initializes the live schema, seeds atoms from current source-backed evidence, reads the same dashboard snapshot the route exposes, validates source ID constraint coverage, validates Current Sprint/Backlog movement, and dogfoods weak atom rejection for missing source refs, source IDs, excerpts, and hit support.

Gate decision tree uses static, focused, and full based on blast radius. This is a full Foundation gate card because it changes PostgreSQL schema, Foundation DB exports, a Strategy Hub API payload, Strategy Hub UI, source ID constraint audit coverage, live Backlog, and Current Sprint. Focused proof runs first, then System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, ship check, fanout, and `process:foundation-ship`.

## Reuse Existing Work

- Existing code: `lib/intelligence-atoms.js`, `lib/intelligence-synthesis-facts.js`, `lib/memory-005-temporal-truth-model.js`, `lib/foundation-db-schema-seed-store.js`, `lib/foundation-db.js`, `lib/strategy-shared-comms-routes.js`, `public/strategic-execution.js`.
- Existing docs: `docs/specs/business-atoms-spec.md`, `docs/strategy/operating-truths.md`, `docs/specs/data-source-maturity-model.md`.
- Existing scripts: Plan Critic, backlog hygiene, repeated-failure gate, System Health, foundation verify, ship check, fanout, foundation ship.
- Existing live truth: Current Sprint and Backlog remain the task authority.

## Risks

- The card could fork a second intelligence system. V1 prevents that by seeding from existing intelligence evidence and exposing business-facing views only.
- The Strategy Hub route could mutate state. V1 keeps schema creation/seeding inside DB init and the focused close-card proof.
- Atom taxonomy could become marketing-only. V1 keeps avatar/audience tags optional and makes atoms usable across leadership, recruiting, sales, marketing, operations, finance, and system work.
- Proof could become substring theater. The focused proof creates live rows, reads the dashboard snapshot, checks schema and source constraints, and runs dogfood rejection cases.

If proof fails or behavior regresses, the repair path is to keep `STRATEGY-001` as the active blocker, fix the focused invariant that failed, rerun `npm run process:strategy-001-check -- --close-card --json`, and only then run the full ship gates. If the Business Atoms route ever requires schema creation or seeding at request time, revert that route behavior and keep writes inside DB init/process proof only.

## Tests

- `node --check lib/strategy-001-business-atoms.js scripts/process-strategy-001-check.mjs lib/foundation-db-schema-seed-store.js lib/foundation-db.js lib/strategy-shared-comms-routes.js public/strategic-execution.js server.js`
- `npm run process:strategy-001-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=STRATEGY-001 --planApprovalRef=docs/process/approvals/STRATEGY-001.json --closeoutKey=strategy-001-business-atoms-framework-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=STRATEGY-001 --closeoutKey=strategy-001-business-atoms-framework-v1`
- `npm run process:foundation-ship -- --card=STRATEGY-001 --planApprovalRef=docs/process/approvals/STRATEGY-001.json --closeoutKey=strategy-001-business-atoms-framework-v1 --commitRef=HEAD`

Speed bound: the focused proof only reads local repo files, local PostgreSQL, and existing seeded source-backed intelligence. It does not fetch endpoints, call providers, run browser automation, or scan broad private archives, so it should stay fast enough to run before every closeout.

## Not Next

- Do not rebuild Action Router, retrieval, atom schema V1, or Strategic Intel.
- Do not auto-apply decisions, create tasks, send messages, or mutate external systems from business atoms.
- Do not run browser automation, paid/provider access, broad private extraction, credential changes, Drive permission mutation, or external writes.
- Do not redesign Strategy Hub beyond the bounded Business Atoms read-only view.
- Do not import the old research agent runtime or create a new autonomous agent layer.

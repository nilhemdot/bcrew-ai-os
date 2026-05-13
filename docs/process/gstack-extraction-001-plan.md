# GSTACK-EXTRACTION-001 Plan

## What

Extract a public GStack source map and pattern scorecard from the local repo mirror into AIOS proposals.

## Why

GStack is a useful public benchmark for AI coding workflow maturity. The value is path-cited implementation lessons, not importing someone else's setup as AIOS doctrine.

## Acceptance Criteria

- The extractor inventories `/tmp/gstack-research` and records the inspected commit.
- Source map counts files, text files, skill files, and high-signal categories.
- Pattern scorecard covers at least five high-value AIOS patterns with path evidence.
- The proof calls the actual extractor function path and fails if local mirror evidence is missing.
- A Plan Critic pass row with score at least 9.8 exists before build.

## Definition Of Done

- `docs/handoffs/2026-05-13-gstack-build-intel-extraction.md` exists and cites the closeout key.
- Scorecard findings are proposal-only and do not write backlog.
- The card closes only after focused proof, backlog hygiene, foundation verifier, and ship gate pass.

## Details

Existing code to reuse: `lib/research-inbox.js`, `lib/implementation-intelligence.js`, `lib/build-intel-extraction-implementation.js`, Current Sprint helpers, Plan Critic, and build-log patterns. Existing docs to reuse: the GStack packet, GitHub build intel source note, current plan, and current state. Existing scripts to reuse: `process:gstack-build-intel-check`, `backlog:hygiene`, and `foundation:verify`.

The root invariant is: GStack extraction is read-only pattern extraction with source paths and commit SHA. The proof should inspect real files through a black-box function path, validate generated rows, compare backlog lane counts before/after, and reject substring-only proof.

This is a narrow V1 card: extract a source map, pattern scorecard, and proposal rows from the local public mirror only. It does not install GStack, copy GStack runtime code, replace AIOS doctrine, or start autonomous dev. The behavior proof uses the actual function path, a black-box API-style round-trip over structured snapshot output, real file evidence from the inspected commit, and a synthetic no-mutation case that rejects weak substring-only proof.

Gate decision tree: static checks are insufficient because this creates Foundation-visible Build Intel output; the focused gate is `npm run process:gstack-build-intel-check -- --card=GSTACK-EXTRACTION-001 --json`; the full gate is required because blast radius includes source evidence, generated handoff report, verifier coverage, server/API-visible output, and closeout documentation. Final shipping uses `foundation:verify` and `process:foundation-ship`.

Operator value: Steve gets implementation-quality lessons from a strong public benchmark without importing another operator's system. This unlocks speed and quality for the team by turning GStack into path-cited proposals that enrich existing cards instead of adding noisy new ideas.

Speed bound: the focused proof is fast, thin, and proportional to the card; it should run under 2 minutes and avoid another heavy extraction lane.

## Risks

- Copying code or skills wholesale would repeat old-system drift. Repair path: fail if `codeImported` or `installStarted` becomes true.
- Local mirror can go stale. Repair path: record commit and regenerate the packet intentionally when the source is refreshed.
- Pattern scoring can be subjective. Repair path: require path evidence and AIOS fit/risk per row.

## Tests

- `npm run process:gstack-build-intel-check -- --card=GSTACK-EXTRACTION-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- This V1 is bounded to read-only pattern extraction.
- Do not install GStack.
- Do not copy runtime code.
- Do not replace AIOS doctrine.
- Do not create autonomous dev from extracted patterns.

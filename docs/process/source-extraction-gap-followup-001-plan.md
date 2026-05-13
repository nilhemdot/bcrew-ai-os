# SOURCE-EXTRACTION-GAP-FOLLOWUP-001 Plan

## What

Produce a ranked source extraction gap triage from the connector matrix, routing matrix, source maturity grid, and extraction coverage state. This V1 is triage only: classify gaps as safe next, blocked, needs Steve/access, not required, or sprint #2 candidate.

## Why

The source matrices now expose many gaps, but pulling ingestion blindly overnight would mix source truth with access and rights decisions. The operator value is a ranked, source-backed queue that tells the next sprint what can safely move without guessing.

## Acceptance Criteria

- `SOURCE-EXTRACTION-GAP-FOLLOWUP-001` gets a Plan Critic pass score at or above 9.8; revise blocks Sprint Ready.
- Triage covers every source row with extraction attention or connector blocker.
- Each triage item has source ID, connector key if available, current matrix state, blocked reason, proposed next card, and not-next boundary.
- The report includes atom-flow auto-demotion, extract retry execution, and research-lane purge as queued next-sprint candidates, not active work.
- No source extraction job is started by this card.
- The proof command `npm run process:source-extraction-gap-followup-check -- --json` compares triage output to the live matrices and rejects missing high-priority gap rows.

## Definition Of Done

- A generated report or API snapshot ranks source extraction gaps.
- The next sprint can choose from an honest queue without opening external auth or UI review.
- Closeout says exactly which sources are safe, blocked, need Steve, or not next.

## Details

Reuse existing code in `lib/source-connector-matrix.js`, `lib/source-hub-routing-matrix.js`, `lib/source-maturity-grid.js`, `lib/source-extraction-coverage.js`, and existing source contracts. Reuse existing docs in source notes and handoffs, existing scripts for source matrix checks, live backlog truth, and Current Sprint overlay behavior. Add the smallest triage builder/proof needed to turn matrix rows into next-card recommendations.

The behavior proof calls the actual matrix builders and triage builder, performs a source-row round-trip through the triage output, and rejects a synthetic missing-gap variant. Gate decision tree: static, focused, or full is chosen by blast radius; source triage library/doc output uses focused proof unless server or Foundation payload changes require full `process:foundation-ship`.

This gives Steve useful operator value: a real workflow for choosing the next source sprint with speed and quality, without waking him for UI review or access decisions. The V1 is thin and proportional: rank and bucket gaps, do not start extraction.

## Risks

- Risk: triage becomes ingestion. Mitigation: no extraction targets, no connector auth repair, no source crawl starts.
- Risk: too many recommendations. Mitigation: rank and bucket, do not auto-promote everything.
- Risk: blocked sources get hidden. Mitigation: blocked and needs-Steve states are first-class.
- Repair path: fail closed, revise the triage rules, reopen the card, and keep source-specific extraction cards scoped until the ranked queue is honest.

## Tests

- `npm run process:source-extraction-gap-followup-check -- --json`
- Matrix coverage readback
- `npm run backlog:hygiene -- --json`

## Not Next

Do not build Reply/Watching Loop, Strategy Hub expansion, Mycro/Skool/Loom/Zoom/Real/SocialPilot extraction, Google Ads repair, MEETING-VAULT-ACL-001 Phase B, Drive permissions mutation, request-access emails, or broad ingestion.

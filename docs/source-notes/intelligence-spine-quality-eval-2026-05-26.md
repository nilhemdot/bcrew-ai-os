# Intelligence Spine Quality Eval - 2026-05-26

Generated: 2026-05-26T08:16:06.314Z
Card: `INTELLIGENCE-SPINE-QUALITY-EVAL-001`
Status: `healthy`

## Scope

This report evaluates the existing stored intelligence spine only. It does not run extraction, call providers, browse, click, log in, submit forms, download files, create backlog cards, mutate sprint state, or write externally.

## Same-Input Sample

- Mark video reports: `batch:mark-kashef-last-50:api-full-watch-small-batch-v1`, `proof:mark-kashef-last-50-baseline-001:god-mode-end-to-end:5xrjO38WUYY`
- Shared meeting/comms reports: 4
- Director input reports after source-slice filtering: 3

## Scorecard

- Legacy flat baseline: 49
- Current spine: 100
- Improvement: +51

## What Improved

- Raw candidates inspected: 254
- Duplicate raw clusters found: 44
- Director ranked candidates: 108
- Source-slice routing: 39 Dev candidates, 9 parked operational items
- Portfolio raw-Director boundary: 5/5 groups returned to Scoper

## Current Top Build Signals

- 1. Create the agent handbook and AI knowledge base for onboarding/support - score 92; source `slice:dev-source-slice-router-001:live-foundation-sources`; readiness `nearly_ready`
- 2. Video-to-SOP Agentic Pipeline - score 87; source `batch:mark-kashef-last-50:api-full-watch-small-batch-v1`; readiness `ready_for_scoper`
- 3. Provide a live marketing/source map across three lanes - score 86; source `slice:dev-source-slice-router-001:live-foundation-sources`; readiness `nearly_ready`
- 4. Provide live marketing/source map for Benson Crew, Steve Zahnd, and MarketMasters - score 86; source `slice:dev-source-slice-router-001:live-foundation-sources`; readiness `nearly_ready`
- 5. Claude Code State Parser & Visualizer - score 80; source `batch:mark-kashef-last-50:api-full-watch-small-batch-v1`; readiness `ready_for_scoper`

## Gates Checked

- Director promotion status stays `proposal_only_needs_scoper_before_steve_approval`.
- Scoper card: `DEV-BUILD-OPPORTUNITY-SCOPER-001`
- Portfolio card: `BUILD-PORTFOLIO-SCRUM-MASTER-001`
- Promotion gate card: `BUILD-OPPORTUNITY-PROMOTION-GATE-001`

## Checks

- PASS same-input sample includes Mark full-watch video reports - batch:mark-kashef-last-50:api-full-watch-small-batch-v1, proof:mark-kashef-last-50-baseline-001:god-mode-end-to-end:5xrjO38WUYY
- PASS same-input sample includes meeting/comms synthesis reports - 4
- PASS legacy baseline sees enough raw candidates to compare - 254 raw candidates
- PASS legacy baseline exposes duplicate candidate noise on the same inputs - 44 duplicate clusters
- PASS source-slice router evaluates internal reports before Director - dev=39; parked=9
- PASS Director snapshot is healthy on quality-eval inputs - ready_for_steve_review
- PASS Director emits plain-English proposal-only top candidates - 5 top candidates
- PASS Director top candidates keep source report anchors - slice:dev-source-slice-router-001:live-foundation-sources, batch:mark-kashef-last-50:api-full-watch-small-batch-v1, slice:dev-source-slice-router-001:live-foundation-sources, slice:dev-source-slice-router-001:live-foundation-sources, batch:mark-kashef-last-50:api-full-watch-small-batch-v1
- PASS Director report contains build readiness, Scoper question, and source coverage sections - plain-English sections present
- PASS Portfolio returns raw Director output to Scoper instead of promotion - groups=5; returned=5
- PASS Scoper dogfood still requires raw evidence, link disposition, proof, risks, and not-next boundaries - DEV-BUILD-OPPORTUNITY-SCOPER-001
- PASS Promotion gate dogfood still blocks weak, duplicate, stale, unsafe, and unapproved candidates - BUILD-OPPORTUNITY-PROMOTION-GATE-001
- PASS current intelligence spine quality score clears pass threshold - 100/85
- PASS current spine improves materially over legacy flat baseline - +51 points over 49
- PASS quality eval path stays no-backlog and no-external-write - proposal-only

## Next

Use this eval before broad extraction scale-up. If the score regresses, repair synthesis/router/Director quality before spending more watch budget.


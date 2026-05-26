# Intelligence Spine Quality Eval 001 Plan

Card: `INTELLIGENCE-SPINE-QUALITY-EVAL-001`

## What

Build the same-input quality comparison harness for the Foundation intelligence spine before broad extraction scale-up.

The eval compares the old flat "raw candidate list" behavior against the current spine:

`stored extraction/synthesis reports -> Dev source-slice router -> Dev Intelligence Director -> Scoper boundary -> Portfolio boundary -> Promotion gate boundary`

This is not a new extractor and not a live model run. It uses existing stored report artifacts only.

## Why

Steve's correction is right: watching more videos is only valuable if the brain layer dedupes, routes, ranks, and explains the output well enough to guide builds.

The system already has public YouTube full-watch reports, Mark full-watch evidence, shared meeting/comms synthesis reports, Director scoring, Scoper rules, Portfolio rules, and a promotion preflight. This card proves those layers work together on the same input sample before spending more watch budget.

## Details

V1 builds a focused quality eval that:

- Uses Mark full-watch report artifacts as the video sample.
- Uses at least one stored meeting/comms synthesis report as the internal source sample.
- Builds a legacy flat baseline from the exact same reports.
- Builds the current spine result from the source-slice router plus Director snapshot.
- Proves plain-English output quality: title, why, next step, readiness, and Scoper question.
- Proves dedupe quality by exposing raw duplicate clusters and comparing them to ranked Director output.
- Proves routing quality by showing internal Dev candidates and parked operational follow-up.
- Proves evidence anchors: source report, video/source refs, timestamps/atoms/hits where available.
- Proves Director ranking uses source trust and mission scoring.
- Proves raw Director output returns to Scoper before Portfolio/Promotion.
- Proves Scoper, Portfolio, and Promotion dogfood gates still block weak, raw, duplicate, stale, unsafe, or unapproved candidates.
- Writes a Steve-readable report only when `--write-report` is passed.

Behavior proof is through actual function paths, not substring-only proof: `buildIntelligenceSpineQualityEvalSnapshot()` calls the real source-slice router, Director snapshot builder, Portfolio raw-Director handoff builder, Scoper dogfood, and Promotion gate dogfood. Substring-only proof is rejected; the focused process script requires live scores, live report IDs, dogfood failure-mode recreation, and explicit write flags.

## Acceptance Criteria

- Focused proof passes with no provider calls, no browser runs, no live extraction, no login, no private/auth source access, no downloads, no form submits, no external writes, no automatic backlog creation, and no sprint mutation.
- Same-input sample includes Mark full-watch evidence and meeting/comms synthesis evidence.
- Legacy flat baseline and current spine are both scored.
- Current spine score is at least 85 and improves over baseline by at least 25 points.
- Eval output includes machine-readable summary: baseline score, current score, improvement, raw candidate count, duplicate clusters, Director candidate count, source-slice counts, Portfolio return-to-Scoper count, and top candidates.
- Steve-readable report exists at `docs/source-notes/intelligence-spine-quality-eval-2026-05-26.md`.
- Live backlog card can be closed only through explicit `--close-card` posture after proof passes.

## Definition Of Done

- Add `lib/intelligence-spine-quality-eval.js`.
- Add `scripts/process-intelligence-spine-quality-eval-check.mjs`.
- Add package script `process:intelligence-spine-quality-eval-check`.
- Add the Steve-readable quality report.
- Add closeout registry proof for `intelligence-spine-quality-eval-v1`.
- Add done-card verifier coverage in `lib/foundation-verify-coverage-card-ids.js`.
- Focused proof, code-quality no-write, doc bloat, system health, backlog hygiene, full Foundation verify, and Foundation ship gate pass.
- Commit and push to `origin/main`.

## Existing Work To Reuse

- Existing code to reuse: `lib/dev-source-slice-router.js`, `lib/dev-team-intelligence-director.js`, `lib/dev-build-opportunity-scoper.js`, `lib/build-portfolio-scrum-master.js`, and `lib/build-opportunity-promotion-gate.js`.
- Existing scripts/proof script pattern to reuse: `scripts/process-dev-team-intelligence-director-check.mjs`, `scripts/process-dev-build-opportunity-scoper-check.mjs`, `scripts/process-build-portfolio-scrum-master-check.mjs`, and `scripts/process-build-opportunity-promotion-gate-check.mjs`.
- Existing docs/current plan/current state/verifier coverage to reuse: `docs/rebuild/current-plan.md`, `docs/system-strategy.md`, `lib/foundation-verify-coverage-card-ids.js`, and the scoped live backlog card `INTELLIGENCE-SPINE-QUALITY-EVAL-001`.
- Existing live backlog/current sprint truth to reuse: read `getActiveFoundationCurrentSprint()` and close the live backlog card only through explicit `--close-card`.
- Existing data truth to reuse: stored `intelligence_report_artifacts`, atoms, and hits.

## Gate Decision Tree

Blast radius is Foundation intelligence quality, live backlog closeout, and one report file, so this uses full Foundation gates:

- Static gate: `node --check`.
- Focused gate: `npm run process:intelligence-spine-quality-eval-check -- --json`.
- Focused write gate: `npm run process:intelligence-spine-quality-eval-check -- --json --write-report --close-card`.
- Full gate: `npm run process:foundation-ship -- --card=INTELLIGENCE-SPINE-QUALITY-EVAL-001 --planApprovalRef=docs/process/approvals/INTELLIGENCE-SPINE-QUALITY-EVAL-001.json --closeoutKey=intelligence-spine-quality-eval-v1 --commitRef=HEAD`.

## Operator Value

Steve gets a fast, plain-English quality gate that says whether the extraction brain is good enough before spending more video watch budget. The useful operator behavior is confidence in the build-intel queue: the report shows score, improvement, source coverage, dedupe, routing, and the exact gates that stop weak ideas from becoming work.

## Speed Bound

The focused proof is bounded to existing stored report artifacts and should stay fast enough to run by default before extraction scale-up. It reads a small Mark sample and a small meeting/comms sample, not every report in the database.

## Risks

- The score could become theater if it only checks field presence. Repair path: add harder dogfood fixtures or live behavior checks before trusting the score.
- Internal meeting/comms reports can contain private context. Repair path: the Steve-readable report lists report IDs/counts and source families, not raw private excerpts.
- A green eval could be mistaken for approval to watch more sources. Repair path: keep the no-provider/no-extraction/not-next boundaries in the report and closeout.
- If proof fails or behavior regresses, fail closed, leave the card scoped, and repair the specific Director/source-slice/Scoper/Portfolio/Promotion gate finding before broad extraction.

## Tests

```bash
node --check lib/intelligence-spine-quality-eval.js scripts/process-intelligence-spine-quality-eval-check.mjs lib/foundation-build-closeout-overnight-records.js lib/foundation-verify-coverage-card-ids.js
npm run process:intelligence-spine-quality-eval-check -- --json
npm run process:intelligence-spine-quality-eval-check -- --json --write-report --close-card
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:doc-artifact-bloat-guard-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=INTELLIGENCE-SPINE-QUALITY-EVAL-001 --planApprovalRef=docs/process/approvals/INTELLIGENCE-SPINE-QUALITY-EVAL-001.json --closeoutKey=intelligence-spine-quality-eval-v1 --commitRef=HEAD
```

## Not Next

- No provider calls. No live Gemini/OpenAI/provider calls.
- No YouTube watching or new extraction.
- No Skool, MyICOR, paid, private, login, form, download, purchase, or source-packet run.
- No automatic backlog-card creation from extracted ideas.
- No sprint mutation.
- No comments lane.
- No broad Director rewrite. Repair only the specific quality gates if this eval fails.

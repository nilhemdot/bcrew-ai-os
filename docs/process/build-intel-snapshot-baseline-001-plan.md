# BUILD-INTEL-SNAPSHOT-BASELINE-001 Plan

## What

Classify fixed Build Intel inspected commits as snapshot evidence with explicit freshness semantics.

## Why

The May 19 deep audit found the GStack Build Intel commit pinned as expected truth. A fixed commit is valid evidence for the inspected packet, but it must not be treated as latest upstream monitoring truth. Build Intel needs a clear difference between "this is what we inspected" and "this source is currently fresh."

## Acceptance Criteria

- `lib/build-intel-snapshot-baseline.js` owns reusable snapshot baseline metadata, proof commands, card constants, and evaluator/dogfood proof.
- `lib/gstack-build-intel.js` exposes `snapshotBaseline`, `sourcePosture`, and latest monitoring boundary metadata for the inspected GStack commit.
- `scripts/process-gstack-build-intel-check.mjs` validates snapshot semantics instead of treating the fixed commit as latest truth.
- `lib/code-quality-nightly-audit.js` uses the snapshot-baseline evaluator and no longer proposes this card when Build Intel baselines are labeled correctly.
- `lib/foundation-intelligence-audit-verifier.js` validates the same snapshot posture.
- `docs/source-notes/github-build-intel.md` documents the snapshot/freshness boundary.
- `lib/deep-audit-findings-closure-gate.js` routes the audit finding to this shipped closeout.

## Definition Of Done

- Focused proof passes and dogfoods stale fixed-commit truth as rejected.
- Code-quality nightly audit no longer reports `fixed-build-intel-commit-baseline`.
- Backlog card closes and Current Sprint advances to `BUILD-CLOSEOUT-DATA-SOURCE-001`.
- `foundation:verify`, repeated-failure gate, System Health, backlog hygiene, and `process:foundation-ship` pass.
- Main is clean, pushed, and synced after the card.

## Details

Existing work reused:

- Existing code: `lib/gstack-build-intel.js`, `scripts/process-gstack-build-intel-check.mjs`, `lib/code-quality-nightly-audit.js`, `lib/foundation-intelligence-audit-verifier.js`, and `lib/deep-audit-findings-closure-gate.js`.
- Existing docs: `docs/source-notes/github-build-intel.md`, the May 19 deep merge audit, and the live Current Sprint command truth.
- Existing scripts: `process:gstack-build-intel-check`, `process:code-quality-nightly-audit-check`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `foundation:verify`, and `process:foundation-ship`.
- Live backlog truth: `BUILD-INTEL-SNAPSHOT-BASELINE-001` is the active blocker and `BUILD-CLOSEOUT-DATA-SOURCE-001` is the next safe card.

Implementation:

- Add a snapshot baseline helper that records source ID, inspected commit, as-of date, evidence path, and latest monitoring boundary.
- Keep the existing inspected commit value intact; the card changes its posture, not the evidence.
- Keep Build Intel proposal-only and read-only. Do not call GitHub, clone repos, import code, install outside tooling, or mutate backlog from Build Intel findings.
- Update the code-quality detector to call the evaluator so a healthy snapshot baseline clears the deep-audit finding while stale direct fixed-commit truth still fails.
- Use guarded backlog and Current Sprint writes only when `--close-card` is passed.
- Root invariant: an inspected Build Intel commit is evidence, not freshness truth. Latest/fresh monitoring must come from the source monitoring lane.
- Behavior proof: the focused check calls the real evaluator and dogfood fixtures. It rejects stale `sourceCommit === expected` proof and proves healthy snapshot metadata clears the audit finding. Substring-only proof is not enough.
- No substring-only proof is accepted; marker/string-match checks are only secondary evidence after the actual function path and code-quality audit behavior prove the invariant.
- Gate decision: static checks are insufficient alone, the focused `process:build-intel-snapshot-baseline-check` proves the behavior, and the full gate is required because the blast radius touches nightly audit detection, Build Intel source posture, verifier proof, closeout registry, and package scripts. Closeout uses `foundation:verify` and `process:foundation-ship`.
- Operator value: Steve can trust Build Intel reports without confusing old inspected evidence for current source freshness. This unlocks safer Build Intel monitoring because stale public-repo packets no longer masquerade as live truth.
- Repair path: if proof fails, leave `BUILD-INTEL-SNAPSHOT-BASELINE-001` active, repair the exact caller or detector that still treats a fixed commit as latest truth, and rerun the focused proof. If the behavior regresses later, reopen this card or route the code-quality audit finding to a narrow follow-up.
- Speed bound: the focused proof is fast and proportional; it skips endpoint fetches in code-quality audit and should stay under 2 minutes before the full ship gate.

Not next:

- Do not build a new GitHub crawler.
- Do not run live GitHub extraction.
- Do not import GStack code or install GStack.
- Do not auto-create backlog cards from Build Intel findings.
- Do not start source/value/extraction expansion from this card.

## Risks

- Treating the fixed commit as latest truth creates false confidence in Build Intel freshness.
- Over-fixing could accidentally rebuild the GitHub monitor or expand source access.
- A detector that only scans substrings could be bypassed by renamed variables.
- Closing the card requires live backlog and Current Sprint mutation, so the focused proof must keep writes guarded.

## Tests

- `node --check lib/build-intel-snapshot-baseline.js scripts/process-build-intel-snapshot-baseline-check.mjs`
- `npm run process:build-intel-snapshot-baseline-check -- --close-card --json`
- `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=BUILD-INTEL-SNAPSHOT-BASELINE-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-SNAPSHOT-BASELINE-001.json --closeoutKey=build-intel-snapshot-baseline-v1 --commitRef=HEAD`

# OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001 Closeout

Date: 2026-05-19
Closeout key: `old-system-research-team-harvest-v1`
Commit: pending

## What Changed

- Added a focused proof script for the old-system research/scout/intel harvest.
- Reviewed the old BCrew-Buddy reference repo without running old agents or importing old code.
- Generated durable harvest artifacts in `docs/audits/`.
- Preserved useful old research-team patterns into current backlog/spec truth.
- Explicitly retired the old-system failure patterns: free-floating agent sprawl, report piles, prompt-only scheduler truth, split-brain runtime state, and unsafe browser/auth scripts.

## Harvest Result

- Old agent records reviewed: 90
- Old skill files reviewed: 121
- Research/intel/extraction skills harvested: 121
- Key evidence files found: 12/12
- Promoted live cards checked: 11

## What It Means

The useful old-system intelligence pattern is not "rebuild every old agent." It is: source scan, scored finding, synthesis, review/routing, and owner-bound action. The next extractor sprint should reuse that shape through governed cards like `WEB-GODMODE-001`, `LOOM-001`, `SKOOL-WORKER-001`, `MYICRO-TRAINING-001`, `DRIVE-WORKER-001`, and `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`.

## Proof

- `node --check scripts/process-old-system-research-team-harvest-check.mjs`
- `npm run process:old-system-research-team-harvest-check -- --apply --json`
- `npm run process:old-system-research-team-harvest-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001 --planApprovalRef=docs/process/approvals/OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001.json --closeoutKey=old-system-research-team-harvest-v1 --commitRef=HEAD`

## Where It Lives

- `scripts/process-old-system-research-team-harvest-check.mjs`
- `package.json`
- `docs/process/old-system-research-team-harvest-001-plan.md`
- `docs/process/approvals/OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001.json`
- `docs/_archive/audits/2026-05-19-old-system-research-team-harvest.md`
- `docs/audits/2026-05-19-old-system-research-team-harvest.json`
- `docs/_archive/handoffs/2026-05-19-old-system-research-team-harvest-closeout.md`

## Known Limits

- This does not implement `WEB-GODMODE-001`.
- This does not run old agents or old crawlers.
- This does not crawl paid/private/browser-auth sources.
- This does not replace the new system's source contracts, job ledger, or proof gates.

## Next

Run `FOUNDATION-OPERATOR-PULSE-001` next unless live backlog/current sprint truth has a higher P0. Keep GOD-mode extraction next in line after the operator surface/progress control is not hiding anything.

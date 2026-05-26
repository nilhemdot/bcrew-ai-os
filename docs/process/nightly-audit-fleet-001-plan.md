# NIGHTLY-AUDIT-FLEET-001 Plan

## What

Upgrade the nightly audit system from one broad reviewer into a specialist audit fleet with a single morning rollup.

Plain English: the system should not only ask "did the app pass checks?" It should ask several separate questions every night: are we violating Foundation doctrine, hardcoding runtime truth, weakening extractor quality, letting synthesis/director output get lazy, drifting from the UI style guide, hiding source/auth gaps, or creating code/process rot.

## Why

Steve's concern is correct: one deterministic code scan will miss important failure modes. AIOS depends on source-backed intelligence, governed extractors, high-quality synthesis/director layers, consistent UI, clean runtime routing, and hard write boundaries. If those drift, the system can look busy while becoming another messy rebuild.

The useful operator value is a morning report that shows what got worse, what improved, what needs a card, and what can be ignored. The fleet must be report-only by default and must not auto-fix, auto-create backlog cards, spend model credits blindly, or mutate source systems.

Guard words for proof: report-only, no-auto-fix, no-auto-card mutation.

## Auditor Lanes

V1 should define at least these lanes:

- Code Quality Auditor: file size, monolith risk, endpoint latency/payload, verifier/check quality, duplication, dead code, and test/proof weakness.
- Hardcoded Truth / Runtime Config Auditor: hardcoded live values, model names outside router ownership, schedules, budgets, report-output policy, source lists, and UI live-state copy.
- Extractor God Mode Auditor: source-family parity for eyes, ears, hands, link resolution, operator-excluded comments, long-course routing, source packets, cost, failure recovery, and freshness.
- Synthesis + Director Auditor: candidate quality, duplicate/overlap detection, evidence strength, source weighting, scoring drift, mission alignment, and whether weak inputs are being over-promoted.
- Source Coverage + Freshness Auditor: creator/source watch coverage, S/A/B/C/D grading, source-family health, blocked approval packets, stale jobs, and missing connectors.
- UI / Brand System Auditor: topbar/sidebar consistency, card/pill rules, type scale, spacing, mobile behavior, accessibility, and whether new pages follow `docs/specs/bcrew-ui-design-contract.md`.
- Process / Write-Boundary Auditor: checks that mutate, report writers without `--write-report`, scheduled jobs that can write, unguarded external actions, and dirty-tree/ship-discipline risks.
- Mission / Doctrine Auditor: whether active work advances AIOS as a source-backed operating system with agentic assistants for Steve, leadership, staff, and realtor coaching at scale.

## Acceptance Criteria

- A fleet registry defines auditor lanes, owner, scope, required inputs, output schema, cost/model posture, and no-auto boundaries.
- Each auditor has a focused deterministic proof or an explicit "packet-only until approved route exists" status.
- The rollup separates findings by severity, lane, new/worse/resolved/still-open, proposed owner/card, and confidence.
- The fleet can run with no LLM spend in deterministic mode.
- Any LLM/deep-review lane must use the LLM router with an approved route, model/effort/cost policy, and explicit budget.
- No auditor writes backlog cards, source systems, external messages, credentials, browser profiles, provider config, or code.
- Markdown reports require `--write-report`; normal runtime truth goes to DB/artifact tables.
- The morning report is concise enough to read and links to deeper lane packets.

## Definition Of Done

- Add a plan/proof command for the audit fleet registry.
- Wire the fleet rollup into system health or the nightly deep audit surface without replacing existing checks.
- Add dogfood fixtures for:
  - hardcoded model/report-output policy outside router/process guard
  - extractor claiming God Mode while hands/source packets are missing or while operator-excluded comments are reintroduced as active work
  - Director over-promoting weak evidence
  - UI card style drift from the locked design contract
  - process check writing repo artifacts without `--write-report`
- Focused proof passes.
- `foundation:verify` passes.

V1 registry proof:

- `lib/nightly-audit-fleet.js` defines the deterministic report-only audit fleet registry.
- `scripts/process-nightly-audit-fleet-check.mjs` proves the required specialist lanes exist, including the hardcoded truth/runtime config auditor Steve called out.
- The proof dogfoods failure for a missing hardcoded-truth lane, auto-fix, auto-created backlog mutation, unsafe LLM review without router/budget, and reintroducing operator-excluded comments as active extractor work.
- The registry is wired into a scheduled 03:05 America/Toronto read-only Foundation job, after `nightly-deep-audit` and before the 05:15 `system-health-nightly-audit` morning rollup.
- System Health now includes an `auditFleet` rollup in JSON/markdown with lane count, job key, schedule, hardcoded-truth lane presence, latest run status, and fail-closed wiring failures.

Proof:

```bash
npm run process:nightly-audit-fleet-check -- --json
npm run process:system-health-nightly-audit-check -- --json
```

## Not Next

- Do not auto-fix findings.
- Do not auto-create backlog cards.
- Do not run paid/provider LLM review until the route and budget are explicit.
- Do not block safe public extraction just because the fleet is not complete.
- Do not turn every finding into P0. The fleet should separate true blockers from review-level cleanup.

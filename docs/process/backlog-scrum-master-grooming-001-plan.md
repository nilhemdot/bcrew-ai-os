# BACKLOG-SCRUM-MASTER-GROOMING-001 Plan

## What
Review all non-done live backlog cards and turn the backlog into a sprint-plannable command surface before more Foundation/root/feature work.

The sprint creates live card `BACKLOG-SCRUM-MASTER-GROOMING-001`, classifies every non-done card, aliases duplicate/overlapping cards, enriches thin high-priority cards where grooming can safely make them plannable, scans done cards lightly for integrity issues, and produces the next 3 to 5 sprint bundles from live backlog truth.

## Why
Foundation can be green and still be hard to operate if the backlog is not groomed. Steve should not have to inspect 600 cards, remember chat-only queue labels, or notice duplicate/stale cards before choosing the next sprint. This sprint makes sprint planning pull from live backlog truth instead of handoff memory.

Operator value: the next builder can see which cards are build-ready, which are blocked, which are aliases, which are parked, and which belong together. That prevents starting `FOUNDATION-SURFACE-UPDATES-001`, another root split, or feature work from stale or thin card truth.

This unlocks a real workflow for Steve and the team: choose the next sprint bundle from a groomed, live backlog view instead of re-reading chat. The useful thing is faster and higher-quality sprint selection with blocked work and duplicate work visible before anyone starts building.

## Acceptance Criteria
- Live backlog card `BACKLOG-SCRUM-MASTER-GROOMING-001` exists and owns this sprint.
- Every non-done live backlog card is classified as:
  - build-ready
  - needs enrichment
  - duplicate/alias
  - stale/parked
  - blocked by Steve/auth/source access
  - belongs inside a larger sprint bundle
- Exact duplicate/overlap cards are aliased to canonical live cards instead of duplicated.
- Thin high-priority cards are either enriched into sprint-plannable shape or explicitly classified blocked/stale/duplicate so they cannot be pulled as next work by accident.
- Done cards receive a lightweight integrity scan: closeout/proof signal, not referenced as active/next, follow-up work has a real card where obvious, and no obvious fake-done issue blocks sprint planning.
- The next 3 to 5 sprint bundles are listed from live backlog truth with clear card groups and order.
- Focused proof fails if active or next sprint queues use a missing card, thin card, duplicate card without alias, stale/parked card, or done card as active work.
- Backlog hygiene, focused proof, `foundation:verify`, and full `process:foundation-ship` pass before push.

## Definition Of Done
- Add `docs/process/backlog-scrum-master-grooming-001-plan.md` and approval file.
- Add `lib/backlog-scrum-master-grooming.js` as the reusable grooming classifier and queue validator.
- Add `scripts/process-backlog-scrum-master-grooming-check.mjs` and package script `process:backlog-scrum-master-grooming-check`.
- Update the Foundation next-sprint queue doc so it names the grooming sprint and the next sprint bundles from live backlog truth.
- Add closeout registry and verifier coverage for `backlog-scrum-master-grooming-v1`.
- Close the live card and Current Sprint only after focused proof, backlog hygiene, `foundation:verify`, and the full Foundation ship gate pass.

## Details
The focused proof reads the live backlog, active Current Sprint, Plan Critic runs, approval file, package scripts, queue doc, and build closeout registry. It does not rely on substring-only proof. The queue validator uses the same classification path as the report and dogfoods bad fixtures:

- missing card fails
- thin card fails
- duplicate card without alias fails
- stale/parked card fails
- done card used as active/next fails
- healthy live card passes

No substring-only proof is accepted. The proof rejects substring-only verifier theater by calling the actual function path in `lib/backlog-scrum-master-grooming.js`, using real live backlog and Current Sprint data, and dogfooding synthetic weak queue cases through the same behavior path.

Existing code, existing docs, existing scripts, and live backlog truth are reused: `lib/foundation-db.js` readers, Current Sprint overlay data, approval integrity, Plan Critic run ledger, build closeout registry, `backlog:hygiene`, `foundation:verify`, `process:foundation-ship`, and the existing Foundation next-sprint queue handoff. The sprint adds only the narrow classifier/checker needed to make the existing backlog planning surface reliable.

Gate decision tree: static proof is `node --check`; focused proof is `process:backlog-scrum-master-grooming-check`; full proof is required because package scripts, process docs, closeout registry, and live backlog/Current Sprint truth change. Blast radius is Foundation process/backlog truth only, so the implementation stays out of route behavior, DB schema, connector writes, and feature surfaces, but still runs the full `foundation:verify` and `process:foundation-ship` gates before push.

The live backlog stays the source of truth. This sprint may update card text only for backlog truth: alias/supersede notes and build-readiness enrichment. It does not build hub, Canva, Fal, voice, connector, Harlan, or product features. It does not start `FOUNDATION-SURFACE-UPDATES-001` or another under-3K root split.

The next sprint bundles are ordered as:

1. Foundation operator surface truth: `FOUNDATION-SURFACE-UPDATES-001`, `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001`
2. Foundation process control and owner access: `SYSTEM-010`, `FOUNDATION-USERS-001`
3. Source contract validation layer: `SOURCE-001`, `SOURCE-002`, `SOURCE-003`, `SOURCE-012`, `SOURCE-ID-ARRAY-PROVENANCE-IMPLEMENTATION-001`
4. Security and access hardening: `SECURITY-006`, `SECURITY-PROVIDER-ROTATION-PROOF-001`, `SECURITY-EDGE-001`, `SECURITY-FILTERED-COMMS-ACCESS-001`
5. Extraction runtime readiness: `EXTRACT-CURRENT-001`, `EXTRACT-BACKFILL-001`, `DRIVE-CONTENT-001`, `EMAIL-ATTACHMENTS-001`, `MEETING-VIDEO-001`, `EXTRACTION-TEAM-001`

Security and source-access cards can remain blocked by provider/operator action while still being grouped for planning. The proof blocks stale/thin/duplicate/done/missing cards from active/next sprint use; it surfaces source-access blockers as explicit risk, not hidden green.

File-size budget: new hand-written files stay below 1,500 lines. The closeout registry addition is a data-record entry inside the existing control-plane closeout registry budget.

## Risks
The main risk is pretending a thin or stale card is build-ready because it has a high rank. The repair path is to classify it as needs enrichment, stale/parked, duplicate/alias, or blocked instead of pulling it into a sprint.

Another risk is turning grooming into feature work. The repair path is to keep all edits to backlog/process truth and stop before any Harlan, Fal, voice, Canva, hub, connector, root-split, or product implementation.

## Tests
Run:

- `node --check lib/backlog-scrum-master-grooming.js scripts/process-backlog-scrum-master-grooming-check.mjs lib/foundation-build-closeout-control-plane-records.js lib/foundation-verify-coverage-card-ids.js`
- `npm run process:backlog-scrum-master-grooming-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=BACKLOG-SCRUM-MASTER-GROOMING-001 --planApprovalRef=docs/process/approvals/BACKLOG-SCRUM-MASTER-GROOMING-001.json --closeoutKey=backlog-scrum-master-grooming-v1 --commitRef=HEAD`

## Not Next
Do not start `FOUNDATION-SURFACE-UPDATES-001` in this sprint. Do not start another root split. Do not touch Harlan, Fal, voice, Canva, hub feature work, connector feature work, Agent Feedback live auto-send, DB schema, route behavior, Steve local mockup assets, or shared feature files.

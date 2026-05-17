# BACKLOG-QUEUE-RECONCILE-001 Plan

## What
Reconcile the May 17 Foundation next-sprint queue so handoff labels, live backlog cards, process artifacts, and next-step truth agree before any more Foundation building.

## Why
The queue handoff used labels that sounded like backlog cards even when the live backlog already had a different owning card. That creates false task truth: a builder can pull a handoff-only label, ship against the wrong card, or duplicate work that is already covered by a live card. This sprint makes live backlog truth explicit and adds a guardrail so future queue handoffs cannot reference missing live cards without an explicit alias.

Operator value: Steve can trust the next sprint queue without translating chat history or guessing which card is real. Foundation can resume surface/root cleanup after this with the live backlog as the source of truth.

## Acceptance Criteria
- `BACKLOG-QUEUE-RECONCILE-001` exists in live backlog and owns this sprint.
- `SYSTEM-HEALTH-RED-TO-GREEN-001` is reconciled as an alias covered by live card `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`, not duplicated.
- `CRITICAL-ROOTS-UNDER-3K-PHASE-1` remains mapped to its existing done live backlog card.
- `NO-AUTH-CONNECTOR-COMPLETION-001` is reconciled as an alias covered by live card `CONNECTOR-COMPLETION-SPRINT`, not duplicated.
- `docs/handoffs/2026-05-17-foundation-next-sprint-queue.md` names live backlog cards and explicit aliases instead of presenting handoff-only labels as cards.
- Focused proof rejects a synthetic handoff queue that names a missing card without an alias.
- Backlog hygiene, focused proof, `foundation:verify`, and full `process:foundation-ship` pass before push.

## Definition Of Done
- Reuse existing live backlog, current sprint, approval integrity, build closeout registry, backlog hygiene, and Foundation ship gate behavior.
- Add only the narrow process proof required for this card: `scripts/process-backlog-queue-reconcile-check.mjs`.
- Add the active plan and approval artifacts for `BACKLOG-QUEUE-RECONCILE-001`.
- Add a closeout registry record and handoff closeout for `backlog-queue-reconcile-v1`.
- Do not start `FOUNDATION-SURFACE-UPDATES-001`, another under-3K root split, connector auth, hub work, Canva, Fal, voice, Harlan feature work, or Steve local mockup work.

## Details
The proof treats live backlog as task truth and the queue handoff as a derived operator document. The handoff may mention historical labels, but every queue item must either name a real live backlog card or declare an explicit alias from the old label to a real live card. Missing labels without aliases fail the proof.

Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth. The focused proof calls the actual function path that parses the queue handoff, the DB-backed live backlog snapshot, the active Current Sprint snapshot, approval integrity, the existing build closeout registry, and the existing package script map. It rejects weak behavior with dogfood fixtures instead of accepting substring-only proof: a handoff-only `Card:` line fails, an explicit alias to a live backlog card passes, and an alias to a missing live backlog card fails. No substring-only or marker-only proof is accepted.

The required mappings for this sprint are:

- `BACKLOG-QUEUE-RECONCILE-001` -> `BACKLOG-QUEUE-RECONCILE-001`
- `SYSTEM-HEALTH-RED-TO-GREEN-001` -> `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`
- `CRITICAL-ROOTS-UNDER-3K-PHASE-1` -> `CRITICAL-ROOTS-UNDER-3K-PHASE-1`
- `NO-AUTH-CONNECTOR-COMPLETION-001` -> `CONNECTOR-COMPLETION-SPRINT`

This reuses the existing `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`, `CRITICAL-FILES-UNDER-5K-001`, `FILE-SIZE-ENGINEERING-STANDARD-001`, `CRITICAL-ROOTS-UNDER-3K-PHASE-1`, and `CONNECTOR-COMPLETION-SPRINT` cards. It enriches existing live cards with alias context where needed rather than creating duplicate backlog cards for handoff-only labels.

Gate decision tree: static proof is `node --check`; focused proof is `npm run process:backlog-queue-reconcile-check -- --json`; full proof is `npm run process:foundation-ship`. The focused proof is read-only and uses a synthetic bad queue fixture to prove the missing-card drift fails closed. The focused gate is thin and fast, targeted to run under 1 minute so future builders can use it by default before trusting a queue handoff.

This unlocks a real workflow for Steve and the Foundation team: the next builder can scan one queue, see the real live backlog card, understand old label aliases, and pull the next sprint without re-reading chat history or creating duplicate cards. It improves speed and quality by making the handoff-to-backlog path auditable.

Explicit file-size budget: this plan, approval, handoff closeout, and focused proof stay below 1,500 lines each. The closeout registry addition is a data-record entry inside the existing control-plane closeout registry budget; no generated payloads are added.

## Risks
The main risk is duplicating backlog truth by creating cards for labels that were already covered by existing cards. The repair path is to map the old label as an alias on the existing live card and make the proof require the alias target to exist.

Another risk is accidentally turning this reconcile into new Foundation feature work. The sprint stops at truth reconciliation and guardrail proof.

## Tests
Run:

- `node --check scripts/process-backlog-queue-reconcile-check.mjs lib/foundation-build-closeout-control-plane-records.js`
- `npm run process:backlog-queue-reconcile-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=BACKLOG-QUEUE-RECONCILE-001 --planApprovalRef=docs/process/approvals/BACKLOG-QUEUE-RECONCILE-001.json --closeoutKey=backlog-queue-reconcile-v1 --commitRef=HEAD`

## Not Next
Do not start `FOUNDATION-SURFACE-UPDATES-001` in this sprint. Do not start another under-3K split. Do not touch Harlan, Fal, voice, Canva, hub feature work, connector auth, Agent Feedback live auto-send, DB schema, route behavior, or Steve's local mockup assets. After this ships, pause and report the next recommended live backlog sprint.

# FULL-SYSTEM-RE-AUDIT-001 · Phase E Re-Audit

Date: 2026-04-29
Status: Accepted

Plain English purpose: prove whether Phases A-D actually made Foundation trustworthy enough to resume action-loop work, or whether hidden drift still blocks feature work.

## Summary

Twelve scoped audit passes checked the Foundation enforcement cleanup after Phases A-D.

- Clean areas: 3
- Minor drift areas: 9
- Blockers: 0

Phase F recommendation: **Open Phase F with follow-up cards.** The named Phase F card, `ACTION-REVIEW-APPLY-001`, is already done for v1 and is safe to use. If Steve wants more action-loop work, scope the next child slice instead of reopening broad `ACTION-ROUTER-001`.

## Classification Rules Used

- `clean`: no findings, or only known/intentional limits that do not affect operator trust.
- `minor drift`: real issue that should be fixed later but does not block Phase F.
- `blocker`: the system is lying, broken, or unsafe to build features on.

## 1. Backlog Truth

**Evidence checked:** `lib/foundation-db.js`, `docs/process/hit-list-snapshot.json`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `lib/foundation-build-log.js`, `public/foundation.js`, live `/api/foundation-hub`, `npm run foundation:verify`.

**Verdict:** `minor drift`

**Findings:** Phase A-D card states align across repo seed and live API. `FULL-SYSTEM-RE-AUDIT-001` was correctly scoped before this audit. `ACTION-REVIEW-APPLY-001` is already done with UI/API/verifier proof. Minor drift: `docs/process/hit-list-snapshot.json` still labels `ACTION-REVIEW-APPLY-001` as Phase F sequence 18 even though active docs say it already shipped for v1.

**Recommended follow-up:** route any snapshot wording cleanup through `HIT-LIST-RECONCILE-001` ownership.

**Changed since prior audit:** the hit list is now snapshotted and reconciled; drift is visible instead of living only in chat.

## 2. Process Gates

**Evidence checked:** `process:ship-check`, `process:fanout-check`, `process:post-ship-fanout`, approval JSONs, `foundation:verify`, current plan/state, Foundation closeouts.

**Verdict:** `clean`

**Findings:** Approval evidence exists for the Phase A-D gate cards. Latest Phase D gates passed: `process:ship-check` 24/24, `process:fanout-check` 22/22, `process:post-ship-fanout` 8/8, and `foundation:verify` 181/181. A transient parallel fanout deadlock passed on sequential rerun and is not trust-impacting.

**Recommended follow-up:** none blocking.

**Changed since prior audit:** the process gate has teeth: approval file, seven-field closeout, served-code proof, artifact proof, and fanout proof are enforced by scripts.

## 3. Recent Builds

**Evidence checked:** `lib/foundation-build-log.js`, `/api/foundation/build-log`, `public/foundation.js`, Phase C/D closeout records, git log, `npm run foundation:verify`.

**Verdict:** `minor drift`

**Findings:** Closeout visibility is real and multi-closeout commits now render instead of hiding extra closeouts. Minor drift: same-commit closeouts can over-infer sibling backlog IDs from a shared commit subject. Proof and where-it-lives data remain intact.

**Recommended follow-up:** `FOUNDATION-SURFACE-UPDATES-001`.

**Changed since prior audit:** multi-closeout Recent Work visibility is now structurally guarded.

## 4. Foundation Surfaces

**Evidence checked:** `public/foundation.html`, `public/foundation.js`, `lib/foundation-surface-map.js`, current plan/state, live Foundation APIs, `npm run foundation:verify`.

**Verdict:** `minor drift`

**Findings:** Overview, Systems, Backlog, Recent Builds/Recent Work, and Runtime Health are wired to live-backed APIs/docs. Phase C/D status is visible. Minor drift: UI still mixes `Recent Builds` and `Recent Work` naming, and one KPI overview copy row still reads like KPI Health is future work even though `KPI-HEALTH-001` is done for v1.

**Recommended follow-up:** `FOUNDATION-SURFACE-UPDATES-001`; optional readability polish under `RUNTIME-HEALTH-SIMPLIFY-001`.

**Changed since prior audit:** command-order view and cleanup status surfaces are live.

## 5. Verifier Coverage

**Evidence checked:** `scripts/foundation-verify.mjs`, `lib/post-ship-fanout.js`, process gate scripts/docs, verifier exception ledgers, Phase A-D closeouts/current plan/state, live `npm run foundation:verify`.

**Verdict:** `clean`

**Findings:** `foundation:verify` passed 181/181. Done-card proof, claimed artifact checks, explicit exceptions, stale-code checks, Phase C reference checks, and Phase D cleanup checks are all guarded. The 24 historical exceptions are explicit, curated, and deadline-bound to 2026-07-27.

**Recommended follow-up:** keep exception cleanup deadline visible before 2026-07-27.

**Changed since prior audit:** false-done and missing-artifact classes now fail loudly.

## 6. Source Contracts

**Evidence checked:** `lib/source-contracts.js`, `lib/source-reference-trust.js`, `docs/source-registry.md`, `docs/process/source-contract-cleanup.md`, `server.js`, `scripts/foundation-verify.mjs`, live source APIs.

**Verdict:** `minor drift`

**Findings:** Active source-reference trust is clean: 35 declared contracts, 0 undeclared active refs, 0 orphan `not-in-use` contracts. Minor drift: `docs/source-registry.md` does not yet mention proposed contracts `SRC-STRATEGY-QUARTER-001` and `SRC-MYICRO-001`, though they are documented in cleanup evidence.

**Recommended follow-up:** `SOURCE-012` or `FOUNDATION-SURFACE-UPDATES-001`.

**Changed since prior audit:** active source IDs now resolve or are classified; no fake active source truth remains.

## 7. Decisions

**Evidence checked:** `lib/decision-auto-emit.js`, `scripts/decision-auto-emit.mjs`, `docs/process/decision-auto-emit.md`, approval evidence, DB helpers, Decisions UI/API, live rows, backlog cards, `npm run foundation:verify`.

**Verdict:** `minor drift`

**Findings:** Decision taxonomy is clean and `DECISION-AUTO-EMIT-001` is verified. The system is honest that it does not auto-import every meeting/chat decision yet. Minor drift: live DB has 7 locked decisions and 0 `decision-auto-emit:%` records, so the tool exists but is not yet routinely applied.

**Recommended follow-up:** `DECISION-004`, `DECISION-005`, `DECISION-007`.

**Changed since prior audit:** explicit decision language can now become proposed decisions through a dry-run-first tool.

## 8. Doctrine Propagation

**Evidence checked:** generated `bcrew-foundation` doctrine block, `lib/doctrine-propagation.js`, `scripts/doctrine-propagation-check.mjs`, `docs/process/doctrine-propagation.md`, Runtime Health/API wiring, `foundation:verify`.

**Verdict:** `minor drift`

**Findings:** Doctrine propagation is working and private memory content is not copied into repo truth. Minor drift: docs imply `memory/*.md` broadly triggers review, but v1 checks a hardcoded memory-file list. Tier-two persona/skill checks are phrase-based, not semantic.

**Recommended follow-up:** `DOCTRINE-PROPAGATION-002`.

**Changed since prior audit:** the active skill now carries current operating doctrine through a generated section.

## 9. Archive And Doc Cleanup

**Evidence checked:** `docs/_archive`, `docs/rebuild/plan-history`, `docs/README.md`, `docs/INDEX.md`, cleanup manifests, active handoff/audit folders, verifier cleanup guards.

**Verdict:** `minor drift`

**Findings:** Archive move proof is clean and delete boundary is safe: 113 files preserved, 0 deleted, 0 refused. Minor drift: `docs/README.md` still links retired `rebuild-decisions.md`; `docs/INDEX.md` labels retired plan-history docs as supporting truth; retired docs contain old relative links.

**Recommended follow-up:** `DOC-AUTHORITY-INDEX-REPAIR-001`.

**Changed since prior audit:** old evidence is preserved under archive folders instead of cluttering active truth.

## 10. Runtime And Code Trust

**Evidence checked:** `server.js`, `scripts/foundation-worker.mjs`, `scripts/foundation-verify.mjs`, `lib/google-sheets-cache.js`, `lib/google-delegated.js`, `public/foundation.js`, LaunchAgent status, live `/api/foundation-hub`, `foundation:verify`.

**Verdict:** `minor drift`

**Findings:** Dashboard and worker served-code trust are clean and both match repo HEAD. LaunchAgents are running with matching pids. Stale-code failure messages include exact restart commands. Minor drift: Sheets cache has recent `cache_file_write_error` events while top-level status stays quota-driven healthy.

**Recommended follow-up:** `RUNTIME-HEALTH-SIMPLIFY-001` / `SYSTEM-008`; optionally scope a narrower Sheets cache warning card if this becomes operator pain.

**Changed since prior audit:** stale dashboard/worker code now fails loud instead of relying on reviewer timing.

## 11. Manual Pattern Scan

**Evidence checked:** hit-list snapshot, process docs, process scripts, dev-process audit, current plan/state, backlog hygiene, live Foundation API, `npm run backlog:hygiene`, `npm run foundation:verify`.

**Verdict:** `minor drift`

**Findings:** The external Google Doc hit list is intentionally manual but snapshotted and age-guarded. Process gates are real but still operator-run scripts, not automatic hooks. Backlog hygiene reports 34 warnings and 0 critical findings. These are visible cleanup targets, not blockers.

**Recommended follow-up:** `PROCESS-HOOKS-002`, `SYSTEM-010`, `RUNTIME-SUPERVISOR-001`, `FOUNDATION-SURFACE-UPDATES-001`.

**Changed since prior audit:** manual drift points are now surfaced as warnings/gates instead of depending only on Steve noticing.

## 12. Feature Readiness For Phase F

**Evidence checked:** `npm run foundation:verify`, `/api/foundation/action-review`, `/api/foundation-hub`, current plan/state, closeouts, Phase D runtime health.

**Verdict:** `clean`

**Findings:** `ACTION-REVIEW-APPLY-001` is safe for v1 use: visible home exists, approve/reject/apply flow exists, reject reason is required, and applied-route destination proof exists. No blocker remains from Phases A-D. The current Action Review lacks owner reassignment, snooze/ignore polish, and high-volume resolution feedback, but those are maturity gaps, not trust blockers.

**Recommended follow-up:** use the existing action review surface; scope any next action-loop hardening as a child card after Steve re-plan.

**Changed since prior audit:** the action loop is no longer a hidden queue; Steve can see and apply routes from Foundation > Backlog > Action Review.

## Blocker Summary

Blockers: 0

No finding says the system is lying, broken, or unsafe to build features on. The re-audit found minor drift, but it is visible, scoped, or already owned by follow-up cards.

## Follow-Up Cards

Existing cards that already own minor drift:

- `FOUNDATION-SURFACE-UPDATES-001`
- `SOURCE-012`
- `DECISION-004`
- `DECISION-005`
- `DECISION-007`
- `RUNTIME-HEALTH-SIMPLIFY-001`
- `SYSTEM-008`
- `SYSTEM-010`
- `RUNTIME-SUPERVISOR-001`

New follow-up cards created from this audit:

- `DOC-AUTHORITY-INDEX-REPAIR-001`
- `DOCTRINE-PROPAGATION-002`
- `PROCESS-HOOKS-002`

## Phase F Recommendation

Open Phase F with follow-up cards. Because `ACTION-REVIEW-APPLY-001` is already done for v1, the next decision is not another Foundation cleanup wave by default. Steve should review this audit, then either use the Action Review surface or scope the next narrow action-loop child slice.

Not next by default: Strategy UI, Scoper, Agent Factory, corpus expansion, retry/backoff, or another cleanup wave.

## Known Limits

- This audit reports findings; it does not fix minor drift inside the audit slice.
- Agent outputs were consolidated into this report; the report is repo truth, not the chat fragments.
- Minor drift cards still need normal 9.8 planning before any build.

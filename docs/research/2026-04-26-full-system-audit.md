# 2026-04-26 Full System Audit (Pre-Build Sweep)

**Auditor:** Claude (Opus 4.7), with 6 parallel deep-audit subagents
**HEAD at audit-start:** `f8066e9` "Clarify Foundation closeout authority"
**HEAD at doc-write:** `27f67fa` "Add fresh chat start handoff after Ops v1" (4 commits later)
**Scope:** entire `bcrew-ai-os-review` repo — substrate code, plan vs reality, specs, doctrine + handoffs, code quality + dead code, verifier + tests
**Method:** every audit team given absolute paths, no hand-waving allowed, file:line references required, called out what they didn't read

---

## POST-AUDIT VERIFICATION (read this first)

Between when this audit started and when this doc was written, Codex shipped **23 commits** including the AIOS public login gate, Google OAuth, Ops Hub v1, Owners Admin closeout, and a verifier expansion from 28 → 58 ensures (more than doubled). Most of the P0 findings below were closed in those commits. The honest situation as of HEAD `27f67fa`:

**Closed by overnight commits:**
- ✅ All 5 unauth read endpoints (`/api/foundation-hub`, `/api/owners/review-queue`, `/api/foundation/changes`, `/api/foundation/doc-updates`, `/api/doc`, plus `/api/fub/person`, `/api/owners/lead-source-governance`, `/api/system-inventory`, `/api/sheets/structure-status`) now require `requireAdminToken` — verified at lines listed inline below
- ✅ Direct Whisper API call in `transcribe-zoom-audio-archive.mjs` — REMOVED. Replaced with `ZOOM_AUDIO_TRANSCRIPTION_PAUSED_MESSAGE` blocking real transcription via SECURITY-003 until rebuilt as router-ledged workload
- ✅ Verifier added meaningful checks: `broad Foundation/Ops/doc read APIs are admin-gated`, `app auth gates live surfaces by role`, `local admin bypass uses socket locality, not spoofable Host header`, `direct model/transcription host calls stay behind approved adapters`, `shared-comms candidates apply idempotently`, `LLM router refuses non-runnable routes`, `source crawl ledger is run-id, lease-owner, and item-key safe`, `markdown-rendered links sanitize unsafe schemes`, plus more
- ✅ Idempotency check on candidate apply (`shared-comms candidates apply idempotently`) addresses my P1 "candidate re-apply" finding
- ✅ FUB proxy mutations now require explicit supervised env flag for write methods
- ✅ PDF export now forwards admin token

**Still open (confirmed against current HEAD):**
- ❌ `getRequestActor()` (`server.js:1225-1227`) STILL returns hardcoded `'steve'`. Some call sites pass `req`; the function ignores the argument. Every change-event, decision proposal, backlog edit is still attributed to Steve regardless of caller. **Fix this first — everything tier-related assumes it works.**
- ❌ Worker `for` loop (`scripts/foundation-worker.mjs:49-54`) STILL has no try/catch around `runFoundationJob`. One bad job kills the worker; the partial unique active-run index then makes that job key permanently un-rerunnable.
- ❌ No orphan reaper for stuck `foundation_job_runs` rows
- ❌ No reaper for stale `llm_calls` (`getStaleLlmCalls` detects, nothing closes)
- ❌ No reaper for expired `source_crawl_items.lease_expires_at`
- ❌ No `runtime_mode = 'decommissioned'` enum value (only `paused`)
- ❌ No `/api/foundation/active-processes` endpoint (the "what's running RIGHT NOW" view SYSTEM-010 needs)
- ❌ Windows kill semantics still uses negative-PID (POSIX-only) — needs to be checked against current code
- ❌ `users.tier` nullable; `subject_people`/`sensitivity`/`min_tier` still in JSONB metadata not first-class columns
- ❌ Atoms-vs-Synthesis taxonomy collision (will bite when STRATEGY-001 starts)
- ❌ Doc drift items (numbering chaos, AGENTS.md residue, rebuild-decisions.md TBD)
- ❌ No Postgres backup, no schema migration tooling

**New concerns introduced by Ops Hub v1:**
- ⚠️ **Auth model is two-role (`owner`/`ops`), not three-tier (`tier ∈ {1,2,3}`).** The Phase 4A spec (`auth-tiers-vault.md:230-237`) requires `tier SMALLINT NOT NULL CHECK (tier IN (1,2,3))`. Per BCrew tier model: Steve=1, Carson/Clare=2, Georgia=3. Codex collapsed Carson/Clare/Georgia all to "ops" with the same path whitelist. **Pragmatic for Ops Hub v1, but does not satisfy Phase 4A.** Future work that needs to distinguish Tier-2 from Tier-3 (e.g., termination/comp discussions about a person should be invisible to that person but visible to Steve+leadership) cannot use the current role model.
- ⚠️ **Ops Hub shipped before Phase 4A complete.** `current-plan.md:54` says "Strategy Hub is the first major consumer." Codex shipped a different hub (Ops Hub) that uses Ops queue data, not shared-comms intelligence. Defensible scope-wise — Ops Hub does NOT expose shared-comms data, so the Phase 4A privacy gate language is technically respected. But the plan now lacks an "Ops Hub" phase. Update plan to reflect what shipped.
- ⚠️ **`isOpsApiPath` is a hardcoded path list** (`server.js:482-486`): `/api/ops-hub`, `/api/owners/review-queue`. Future Ops endpoints must be added here manually or they'll 403 for ops users. Magic-string list is fragile; promote to declared metadata on each endpoint.
- ⚠️ **Local dev bypass is now stricter** (`isLocalDevRequest` requires both local IP AND localhost host header) — good — but means `foundation:verify` running through ngrok would actually exercise the gate. Verify hits localhost, so the verifier still doesn't test the auth path.

**Bottom line of the bottom line:** The audit was 70% addressed before I could push. Steve and Codex shipped the right things in the right order overnight. The remaining items — `getRequestActor` stub, worker reaper, decommission flow, three-tier vs two-role, substrate JSONB→column migration, atoms taxonomy reconciliation — are P0/P1 and still need Tier-1/Tier-2 work below.

The original audit body remains as written for reference. Treat any P0 marked as "broken" in the body below as ✅ fixed unless re-confirmed in this Post-Audit Verification section.

---

## Bottom Line

Foundation is closing methodically. **NOT drifting toward Strategy Hub.** Doctrine is consistent post-f8066e9 across all live docs. The substrate is well-built: clean transactions, consistent `change_events` audit trail, advisory locks on schema init, no TODO/FIXME debt anywhere, no abandoned `catch (e) {}` swallows.

**But the gate Codex just hardened is not yet enforced.** Five unauthenticated read endpoints leak shared-communications intelligence (candidates, synthesis, change events, doc-update text, raw markdown) — directly violating the rule added in `current-plan.md:52` that says no broad read surface may expose shared-comms intelligence until tier filtering and subject-person redaction are implemented. SECURITY-002 is correctly promoted to P0; the code did not change to match in the same commit.

Beyond the privacy gap, **SYSTEM-010 has doctrine but not controls.** Pause/resume works. Decommission, dead-man timer, kill switch, and "what's running right now" view do not exist as code.

The verifier is partially theatre. It runs on `localhost`, which auto-bypasses the only auth primitive (`requireAdminToken`). It has zero tier-filter tests, zero redaction tests, zero unit tests, and 5 of its 28 checks pass on empty arrays.

---

## What's Working (don't only criticize)

- **Mutation routes consistently behind `requireAdminToken`** with timing-safe comparison (`server.js:308-358`).
- **Schema init wrapped in advisory lock + transaction** (`lib/foundation-db.js:3850-5025`) — concurrent boots can't corrupt schema.
- **`withFoundationTransaction`** (`lib/foundation-db.js:3763-3781`) is a clean BEGIN/work/COMMIT/ROLLBACK helper used by every write path I sampled.
- **`change_events` consistently emitted** alongside writes for backlog, decisions, questions, doc updates, source drift, review queue, job-run lifecycle, LLM credentials/routes/probes, crawl targets/items. Audit trail is real (despite `getRequestActor` stub).
- **Active-run unique partial index** (`idx_foundation_job_runs_active_unique`, `lib/foundation-db.js:4322-4324`) — strong primitive for preventing concurrent same-job runs.
- **`extractFubPersonId`** (`lib/fub.js:149-162`) — tight whitelist parser for FUB IDs.
- **`isAllowedDocPath`** (`server.js:360-380`) does correct realpath canonicalization and traversal rejection (the policy is wrong, but the path-handling is right).
- **`shared-candidate-extraction.js:191-203`** clamps `min_tier` by `sensitivity` and resolves `subject_people` through verified user directory. The capture half of the privacy model is well-built.
- **LLM router records every call** in `llm_calls` with workload/hub/provider/auth_path/credential/route/status/cost — full provenance.
- **Subscription provenance preserved** through OpenClaw adapter; direct OpenAI Responses gated by `llm-spend-policy.js`.
- **`foundation-jobs.js` is registry, not runtime** — clean separation between job definition and execution.
- **Zero TODO/FIXME/XXX/HACK** in the entire repo. Remarkable for a 6-week build.
- **No `console.log` of secrets**; no debug noise left in `lib/*.js`.
- **No circular imports.** Single `lib/slack.js` is the only orphan (no consumers).
- **Strategy Hub doctrine is consistent everywhere post-f8066e9.** Every active doc says it's Phase 7, blocked behind 4A. No contradictions.

---

## P0 — Privacy gate failures (these block Phase 4A close)

The new doctrine added in f8066e9 (`current-plan.md:52`):

> *"Admin-only proof surfaces can exist behind `requireAdminToken`, but no broad hub, assistant, query, or human-facing read surface may expose shared-communications intelligence until auth/tier filtering and subject-person redaction are implemented and verified."*

Five endpoints break this rule today. All are reachable without auth.

### 1. `/api/foundation-hub` (`server.js:3107-3119`) — full intelligence bundle

Calls `getFoundationSnapshot()` which unconditionally returns `getSharedCommunicationCandidateSnapshot` + `getSharedCommunicationSynthesisSnapshot`. Candidate mapper (`lib/foundation-db.js:3647-3663`) returns `title`, `summary`, `evidenceExcerpt`, `ownerHint`, plus full `metadata` JSONB including `subjectPeople` (emails), `sensitivity`, `minTier`. Synthesis mapper (`lib/foundation-db.js:3689-3710`) returns `title`, `oneLine`, `whyItMatters`, `recommendedNextAction`, `evidenceSummary`, `suggestedOwner`, `sensitivity`. `public/foundation.js:4050` hits this endpoint without `X-Admin-Token`. The `requireAdminToken` middleware short-circuits for `127.0.0.1` (`server.js:336-339`), so even if you added the gate locally you couldn't test it.

### 2. `/api/owners/review-queue` (`server.js:2897`) — real-estate client PII

Returns Owners + Conditional review queues with client names, agents, deal numbers, addresses, findings text. No token.

### 3. `/api/foundation/changes` (`server.js:3460`) — change-event metadata

`getRecentChangeEvents` returns full `metadata` JSONB including decision IDs, supersession links, FUB drift detail.

### 4. `/api/foundation/doc-updates` (`server.js:3475`) — proposed text + decision rationale

`listPendingDocUpdates` (`lib/foundation-db.js:8767-8784`) joins `pending_doc_updates` to `decisions` and returns `proposed_text`, `current_text`, `proposed_diff`, `decision_rationale`, `decision_evidence_notes`, `participant_names`. Exactly the "evidence" surface that should be locked.

### 5. `/api/doc?path=...` (`server.js:3928-3967`) — raw markdown read

Allowlist policy is `isAllowedDocPath` with a blocklist of only `memory/`, `node_modules/`, `.git/`, `.openclaw/`, `store/`, plus 5 named files. Everything in `docs/handoffs/`, `docs/audits/`, `docs/research/`, `docs/source-notes/`, `docs/users/` is reachable. These contain mining evidence and meeting-derived material.

### Bonus: `getRequestActor()` is a hardcoded stub

`server.js:1028-1030` always returns `'steve'` regardless of `req`. Several call sites (`server.js:3278, 3358, 3405, 3444`) try to pass `req`; the function ignores the argument. **Every change-event, decision proposal, backlog edit, doc-update apply, and FUB-rule edit is attributed to Steve no matter who actually fired it.** Breaks the audit trail and undercuts SYSTEM-010's "who did this" requirement. Fix this FIRST — everything else assumes it.

### Other unauthed endpoints worth reviewing

- `/api/fub/person?person=<id>` (`server.js:2583`) — public — full FUB person record (name, address, leadSource, etc.) for any person ID
- `/api/owners/lead-source-governance` (`server.js:2856`) — public — Sheets read against Owners workbook
- `/api/fub/lead-sources` (`server.js:2624`) — public, borderline — governance summary + drift
- `/api/system-inventory` (`server.js:3066`) — public, OK-ish — reveals tracked docs and skill/plugin inventory but not contents

---

## P0 — SYSTEM-010 controls (Foundation gate per `current-plan.md:53`)

Codex's promotion of SYSTEM-010 to P0 is correct doctrine. The code does not match.

| Control | Status | Evidence |
|---|---|---|
| Pause/resume | **Built** | `POST /api/foundation/jobs/:jobKey/control` (`server.js:3170`), `updateFoundationJobControl` (`foundation-db.js:5422`), UI button in `public/foundation.js:4200`, worker honors via `applyFoundationJobControl` |
| Dead-man timer on miners | **Partial** | `getStaleLlmCalls` (`foundation-db.js:5955`) DETECTS stuck calls; no reaper writes them. Per-job `maxRuntimeSeconds` exists in `run-foundation-job.mjs:124-131` but no system-wide dead-man |
| Stuck-run reaper (orphan job runs) | **MISSING** | `scripts/foundation-worker.mjs:48-54` runs jobs in a `for` loop with no `try/catch`. A single throw kills the worker, leaves run row stuck `'running'`, the partial unique index makes that job key **permanently un-rerunnable** until manual SQL. No `reapStaleJobRuns` function exists. Grep for "reap"/"orphan"/"stuck" returns zero hits. |
| Lease-expiry reaper (`source_crawl_items`) | **MISSING** | `lease_expires_at` exists; nothing revokes it |
| Decommission flow | **MISSING** | `runtime_mode` enum has `paused` but not `decommissioned`. Pause is reversible; there's no permanent stop. |
| Cost/process visibility | **Partial** | `llm_calls.estimated_cost_usd` exists; `getLlmRuntimeSnapshot` shows recent calls. **No "what's running RIGHT NOW" endpoint** (`/api/foundation/active-processes` doesn't exist). |
| Kill switch (global) | **MISSING** | Only env flag `LLM_ALLOW_DIRECT_OPENAI_RESPONSES` |
| Windows kill semantics | **Broken** | `process.kill(-child.pid, signal)` (`scripts/run-foundation-job.mjs:38-49`, `lib/llm-router.js:336-347`) targets POSIX process groups. On Windows, fallback `child.kill(signal)` only kills the immediate npm child; grandchild scripts/transcribe processes survive. Steve's environment is Windows 11 — this is an operational bug. |

The plan claims SYSTEM-010 controls are "active" prerequisite for Phase 7 (`current-plan.md:524-532`). Today they are not active. Doctrine has been hardened ahead of code. That is acknowledged in `current-state.md:49` ("open"), but the dashboard still shows green Foundation status, which masks the gap.

---

## P1 — Data integrity & substrate

### Schema-vs-spec drift

- **`users.tier` is nullable** (`foundation-db.js:4530`): `tier IS NULL OR tier IN (1, 2, 3)`. Spec `2026-04-23-auth-tiers-vault.md:230-237` requires `NOT NULL`. A row with NULL tier silently fails any `WHERE tier <= req.user.tier` predicate. **Fail-closed orientation is wrong.**
- **`subject_people`, `sensitivity`, `min_tier` are JSONB metadata, not first-class columns** on `shared_communication_candidates`. Cannot index. Cannot use SQL predicates. Every reader must remember to apply the filter in app code. The auth-tiers-vault spec demands first-class columns (`min_tier SMALLINT` per row).
- **`shared_communication_synthesized_items.sensitivity` defaults to `'neutral'`** (`foundation-db.js:4277`). When the LLM returns no sensitivity, items default to neutral and would pass a future tier filter. Should be NULL or fail-closed.

### Substrate write hazards

- **`recordSharedCommunicationSynthesisRun` deletes child items unconditionally on every upsert** (`foundation-db.js:7647-7650`). If a re-run has fewer items (LLM regression), prior items vanish with no rollback. Wrap of `withFoundationTransaction` commits the delete.
- **`applySharedCommunicationCandidate*` (`foundation-db.js:8024-8236`) doesn't check candidate status.** A user can re-apply the same candidate repeatedly and create duplicate decisions/questions/backlog items.
- **No `change_event` emitted for archive writes** (`upsertSharedCommunicationArtifact`). Every other writer logs change events; this one does not. No audit trail for when artifacts arrive.

### Other

- **`scripts/transcribe-zoom-audio-archive.mjs:220-246`** calls Whisper API directly with `OPENAI_API_KEY` and **no `assertDirectOpenAiResponsesAllowed` guard.** The verifier check #7 (`foundation-verify.mjs:166`) only catches the Responses API URL pattern, so this transcription bypass is invisible.
- **`callLlm({ dryRun = true })` default** (`lib/llm-router.js:507`): trap orientation. A future caller forgetting to pass `dryRun: false` gets a silent no-op with a "succeeded" record. Default should be `false`.
- **Two `pg.Pool` instances**: `lib/foundation-db.js:6` and `scripts/generate-shared-comms-synthesis.mjs:201`. Two connection budgets, two failure modes, two close-paths.
- **`finishLlmCall` inside catch** (`lib/llm-router.js:589-606`) has no inner try; if the DB write of the failure throws, the original provider error is masked.
- **Migration is one giant blob inside `initFoundationDb`** (`foundation-db.js:3850-5025`). Every server boot replays dozens of UPDATE statements that re-stamp seed values, including SECURITY-002/SYSTEM-010 priority changes added in f8066e9. Operators who change those fields in production get overwritten on next restart. Schema, seed, and reconciliation are conflated in one transaction.
- **`change_events.event_type` CHECK constraint duplicated then re-added identically** (`foundation-db.js:4067-4112`). No-op rewrite that adds startup latency for nothing — sign of an in-place schema rewrite that left dead code.
- **`team` vs `scope` rename half-done.** Column is still named `team`; many code paths read/write `team`; docs/UI use `scope`. `legacyBacklogScopeMap` migrates `dev → foundation`, but the rename never finished.

---

## P1 — Frankenstein patterns (call them out before they spread)

### F1. Three overlapping taxonomies for "intelligence units"

| Surface | Categorization |
|---|---|
| `business-atoms-spec.md` (NOT BUILT) | `bottleneck`, `decision_needed`, `decision_made`, `win`, `loss`, `frustration`, `opportunity`, `assumption_risk`, `culture_signal`, `external_signal` |
| `synthesis-engine-v1.md` (BUILT) | `decision`, `blocker`, `action_item`, `strategic_issue`, `pattern`, `content_atom`, `source_trust_issue` |
| `shared_communication_candidates.metadata` (BUILT) | freeform candidate types: question/decision/backlog/atom hint via metadata |

**A "bottleneck" in atoms ≈ a "blocker" in synthesis. A "decision_needed" ≈ a "decision". A "frustration" maps to what?** STRATEGY-001 (P0/P1 in backlog) is to build the atoms tables — but if you build them with a different taxonomy than synthesis, you'll have parallel plumbing.

**Recommendation:** Reconcile the taxonomies BEFORE STRATEGY-001 starts. Either fold atoms into synthesis (one model with categorical + actionable axes), or define a stable mapping table. Don't let the build outrun the design.

### F2. Dual snapshot pathways

`getFoundationSnapshot` (the public unauth `/api/foundation-hub`) bundles candidates + synthesis + jobs + LLM runtime + extraction control + drive corpus. The same data is also reachable via individual endpoints `/api/foundation/job-runs`, `/api/foundation/llm-runtime`, `/api/foundation/extraction-control`, `/api/shared-communications/*` — **all of which DO sit behind `requireAdminToken`**. The bundle bypasses every individual guard. Likely a leftover from the early dashboard-only era.

### F3. `lib/foundation.js` is a phantom

The audit prompt referenced it. It does not exist. Orchestration lives in `lib/foundation-jobs.js` (registry), `scripts/foundation-worker.mjs` (loop), `scripts/run-foundation-job.mjs` (per-job runner). Either the mental model expects an orchestrator file that was never built, or the file was deleted and references weren't cleaned. Codex / human commenters reference it.

### F4. Duplicate `seed → upsert` pattern for backlog

`seedTable` for `backlog_items` does `ON CONFLICT (id) DO NOTHING` (`foundation-db.js:4607`), then immediately follows with hand-rolled UPDATE blocks (`4625-4866`) that overwrite the same fields. Semantics: "seed only if missing, then forcibly reconcile selected fields anyway." Old code that thought it was the writer can't tell.

### F5. Duplicate hashing implementations

`transcriptTextHash()` (`lib/meeting-transcripts.js:12`) is the canonical helper. But `server.js:1004`, `scripts/generate-shared-comms-synthesis.mjs:193`, `lib/shared-candidate-extraction.js:216`, and `scripts/inventory-video-links.mjs:33` each re-implement `createHash('sha256').update().digest('hex')` directly with different slice lengths. **Three different "fingerprint" conventions in one repo.**

### F6. Duplicate `shorten()`

Defined in `lib/shared-candidate-extraction.js:94` (canonical), `public/foundation.js:5926` (browser, slightly different), and `scripts/sync-slack-archive.mjs:35` (private copy with no need to be private).

### F7. `_req` underscore on endpoints that should consume `req`

E.g., `app.get('/api/foundation-hub', async (_req, res) => ...)`. The underscore tells the reader "we don't care about the request" right next to a function that should be tier-filtering on it.

---

## P2 — Doc drift & numbering chaos

### Three competing numbering systems

| Doc | System |
|---|---|
| `current-plan.md` | **10 phases**: 0, 1, 2, 3, 4, 4A, 5, 6, 7, 8 |
| `current-state.md` lines 78-87 | **10-step Active Execution Order** (different ordering: Step 5 = Auth/Tier, but that's Phase 4A in plan; Step 7 = Source trust, but that's Phase 5) |
| `docs/research/2026-04-24-full-system-audit.md` | **Tier A through F (1-18 sub-items)** — Claude audit narrative |
| `rebuild-decisions.md` lines 77-83 | **7-item build order from 2026-04-11** (no "superseded" marker) |

A new builder picking any one without cross-referencing will misorder work. **Fix:** unify on the 10-phase plan numbering. Mark `current-state.md` execution order as "phase shorthand for plan." Mark `rebuild-decisions.md` build order as superseded.

### Stale references

- **`rebuild-decisions.md` line 53** still says "Crewbert email: ai@bensoncrew.ca or crewbert@bensoncrew.ca — TBD." `current-plan.md:425` resolved this (`ai@` front-office, `crewbert@` private vault). Update locked-decisions doc.
- **`AGENTS.md` (root)** instructs sessions to read `MEMORY.md`, `USER.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `TOOLS.md`, `HEARTBEAT.md` — **none exist in this repo**. Template residue from a `~/.agents`-style personal workspace. Either delete or rewrite to BCrew-specific.
- **Dashboard source count silently increased in f8066e9** (`server.js:2462`): now counts `status: 'Verified Readable'` even if `validation: 'Not Signed Off'`. Pre-f8066e9 was ~2 readable; post is ~12. Number jump with no changelog entry. Annotate.

### Open loops needing promotion

- **Unchained Realtor split rule** lives only in `2026-04-23-unchained-realtor-split-handoff.md` (flagged `needs-promotion`, never promoted). Rule: "UR ideas go to `~/unchained-realtor/BACKLOG.md`, do not deep-build UR in this repo."
- **Sunday strategy prep** flagged `needs-reconciliation`. Open decisions and active blockers never routed into DB-backed ledgers.
- **`SRC-GADS-001` `invalid_grant`** — connector dead, no backlog card with owner.
- **SocialPilot enterprise auth** — Steve provided API key, validation pending, no card.

---

## Verifier theatre

The verifier is `scripts/foundation-verify.mjs` (29 ensures). **Codex's framing of "24 → 28 checks in f8066e9" is wrong.** `git show f8066e9 --stat` does not touch the verifier. The 4 added checks landed in earlier commits (`cea339c`, `c9a6a5a`, `9497061`, `8995986`) during LLM router/extraction hardening.

There are **zero unit tests, zero integration tests, zero CI workflows**. No `tests/` directory. No `*.test.js`. No `npm test` script in `package.json`.

### Worst theatre offenders

| # | Check | What it asserts | Why it's theatre |
|---|---|---|---|
| 1-5 | Doc/contract grep checks (`foundation-verify.mjs:129-160`) | Substring matches in JS constants and markdown | Constant-equals-constant in same commit. `includesAll(text, ['Signed Off | 2026-04-16'])` doesn't tell Steve anything about source state. |
| 9 | Extraction records LLM provenance (`:180`) | Five identifier names exist in file | Could be in a comment, a string, an unused constant. The DB-state check (#10) is the real proof; #9 is decorative. |
| 12, 13 | `api/source-of-truth` length match (`:218, 224`) | length of live response = length of code constant | Passes when both are wrong by the same amount. |
| 15 | foundation-hub returns "expected core arrays" (`:248`) | `Array.isArray(...)` | `[]` passes. Empty backlog passes. Corrupt items pass. |
| 22 | Drive cursor (`:326`) | `inspectedFolderCount >= 1 AND queuedFolderCount >= 1` | Lowest possible bar. One inventoried folder forever. |

### Critical blind spots

- **Auth/tier coverage: zero.** `subjectPerson|subject_person|redactSubject|tier|requireUser|currentUser|authUser` — zero meaningful matches across the codebase. `foundation-verify.mjs` runs from localhost; localhost auto-bypasses `requireAdminToken`; the gate is therefore not exercised. The Phase 4A acceptance criterion ("verifier checks proving lower-tier users and subject people cannot read restricted material") is unmet.
- **Action Router coverage: none.** Plan acknowledges it doesn't exist; verifier silently skips. Add an explicit "ActionRouter is not present" check to make the absence visible.
- **End-to-end synthesis correctness: none.** Existence check (#16) doesn't verify ranked items trace back to artifacts that still exist with snippet-containment.
- **Failure-state propagation: not proven.** Plan claims partial-run alerts work; no verifier asserts that planted failures show up in the dashboard.

### Top 5 missing checks (ordered by risk)

1. **Tier-filtered read smoke test.** Hit `/api/shared-communications/synthesis` from non-localhost with no token, with wrong token, with non-admin tier identity. Assert 401/403 and an empty-result shape identical to the populated shape (no length leak).
2. **Subject-person redaction round-trip.** Seed one synthesis item mentioning a non-Steve subject. Query as that subject. Assert suppression AND identical response shape.
3. **Action Router presence/absence.** Single check: `foundationHub.actionRouter` exists. Today plan says it doesn't; make absence explicit.
4. **End-to-end synthesis correctness.** Sample a ranked item, follow its `evidenceArtifactIds` back to artifacts, confirm snippet-containment.
5. **Failure-state propagation.** Plant a failing job, assert dashboard `failures` count incremented and last-failure-reason non-null.

---

## Spec build status

| Spec | Built | Drift | Notes |
|---|---|---|---|
| `auth-tiers-vault.md` (332 lines) | **~10%** | YES — `users.tier` nullable; `subject_people`/`sensitivity`/`min_tier` in JSONB not columns; no `assertTier`; no `req.user`; no Cloudflare Access middleware; no `meeting_notes` table; no `extractions` table; no `/api/query`; no vault folder; no ACL strip flow; `lib/google-delegated.js` is read-only | Excellent quality spec. Buildable as written. **Foundation gate per `current-plan.md:52`.** |
| `synthesis-engine-v1.md` | **~70%** | Minor — V1 batch is real, no consumer-shape variants yet (sales/ops/marketing/retention briefs), resolution detection conservative | Adequate as a contract, weak as a build doc. |
| `business-atoms-spec.md` | **0%** | N/A — nothing built | Conflicts with synthesis enum (see F1). Reconcile before STRATEGY-001 starts. |
| `data-source-maturity-model.md` | Conceptual | None | Status doc, not build spec. Fine. |

### Built but not spec'd (no design docs)

- The entire `shared_communication_artifacts` / `_candidates` / `_artifact_processing_runs` substrate (largest production surface in the repo)
- `llm_credentials` / `llm_routes` / `llm_route_probes` / `llm_calls` + `lib/llm-router.js` + `lib/llm-spend-policy.js`
- `source_crawl_targets` / `source_crawl_items`
- `foundation_job_runs` / `foundation_job_controls`
- `pending_doc_updates` + `change_events`
- Meeting handling (`meeting_classification.js`, `meeting-notes-verify.mjs`, `mirror-meeting-archive-to-drive.mjs`) overlaps `auth-tiers-vault.md` without reconciliation

---

## Gaps not in `current-plan.md` Phase 0-8

These are real risks the plan doesn't name:

1. **Postgres backups.** Mac Mini disk failure = catastrophic data loss. No backup, no snapshot, no restore step appears in any phase. Add to Phase 1 or Phase 4A as operational sub-item.
2. **Observability / metrics.** `llm_calls` ledger exists, `foundation:verify` exists, no structured metrics export, no log aggregation, no ongoing health cadence. Plan is silent.
3. **Secret rotation.** `SRC-GADS-001` `invalid_grant` is the canary. Token expiry alerting and re-auth pathway not phase items.
4. **Schema migration tooling.** No migration tool, no version table, no down-migration path. Column type changes have no documented playbook.
5. **Synthesis claim verification (Verification Agent equivalent).** Mentioned at `current-plan.md:378` as a buried sub-item. Should be promoted — it prevents synthesis-side gaslighting at the source. Same with acknowledged-state registry (`:380`).
6. **Cross-source freshness universal policy.** Phase 5 covers marketing freshness; FUB/Owners freshness is live; the other 28 sources have no freshness rules. Plan-level absence: every reader assumes their source has freshness rules; only 2 actually do.
7. **Test strategy.** No automated test suite named in plan. `foundation:verify` covers DB consistency, not regression of `server.js` (4,050 lines).
8. **Notification routing.** Action Router routes to "owner-bound action proposal" — but where does it deliver? Telegram, Missive, dashboard inbox? Not picked.

---

## Honest comparison: new system vs old system (BCrew-Buddy)

**Better in new system:**
- DB-first architecture (Postgres single source of truth) vs old's `data/crewbert.db` SQLite + scattered markdown files
- VPS-first → single-machine Mac Mini (cheaper, simpler, no auto-deploy seam bugs)
- `change_events` audit trail consistently emitted vs old's ad-hoc logging
- Advisory locks on schema init vs old's race-prone migrations
- Subscription router with cost guard vs old's direct API spend
- Candidate substrate captures `subjectPeople`/`sensitivity`/`min_tier` (capture half of privacy)
- Doctrine-as-code: `current-plan.md` Locked Doctrine section is THE rule set
- Foundation/runtime/identity/execution layered architecture vs old's "agent-first then figure out plumbing"
- No agent swarm — paced miners with bounded budgets
- Process control via `foundation_job_controls` (pause/resume) vs old's PM2-only
- Zero TODO/FIXME debt vs old system's accumulated cruft

**Same problems persisting:**
- Half-built privacy enforcement (capture works, query-side filter doesn't) — same gaslighting risk old system had
- Doc drift (numbering chaos, stale TBDs, template residue) — old system's `docs/intelligence/` is similarly drift-prone
- Verifier theatre — `npm run foundation:verify` is a stronger green-light than old's nightly chain, but still has 5 trivial checks that pass on `[]`
- No backup story — old system has SQLite backup nightly; new system has nothing yet
- Test coverage zero — old system has tests under `tests/` and `npm test`; new system has none
- Schema migration story missing — old has explicit `db.ts` migrations; new has the giant `initFoundationDb` blob

**My read:** The new system is **architecturally better** by maybe 2x. Cleaner separation of concerns. DB-first. Subscription-first. Honest about Foundation gating. The substrate code quality is genuinely good (zero TODO, clean transactions, no dead catches). But it's only ~50-55% closed on Foundation, and the privacy/SYSTEM-010 doctrine just got hardened in f8066e9 — so the **doctrine is now ahead of the code**. That's not drift; that's a known commit-vs-implementation gap. The risk is shipping anything that exposes broader access (Strategy Hub, Harlan, Crewbert assistant) before the gap closes.

The old system's failure mode was "build agents on a fragile foundation, then patch forever." The new system has not made that mistake — but it could, if the next session decides to start Strategy Hub or wire Harlan to real data before Phase 4A code lands.

---

## Recommended action order (do these BEFORE starting Phase 7)

### Tier 1 — close the gate Codex just hardened (P0 Foundation gate)

1. **Fix `getRequestActor()` stub** (`server.js:1028`) → make it read from session/header → propagate `req.user` everywhere. Single point of identity. Everything else assumes this works.
2. **Lock down 5 unauth endpoints** as immediate stop-gap: add `requireAdminToken` to `/api/foundation-hub`, `/api/foundation/changes`, `/api/foundation/doc-updates`, `/api/owners/review-queue`, `/api/doc`. Buy time before Phase 4A real auth lands.
3. **Add Tier-1-only check to `/api/shared-communications/synthesis`** (15-min stop-gap before full Phase 4A). The endpoint requires admin token but admin isn't tier — once any non-admin user logs in, this is the leak point.
4. **Build worker resilience**:
   - Wrap `for` loop in `scripts/foundation-worker.mjs:48-54` with try/catch
   - Add stuck-run reaper: query `foundation_job_runs WHERE status='running' AND started_at < now() - interval '<timeout+grace>'` → flip to `failed`
   - Add stale-LLM-call reaper: pair `getStaleLlmCalls` with a writer
   - Add lease-expiry reaper for `source_crawl_items.lease_expires_at`
5. **Fix Windows kill semantics**: replace negative-PID signal with a Windows-aware process-tree kill (e.g., `taskkill /T /F /pid X` via `execFile`, or platform-detect and use the right kill primitive). Confirm grandchild processes die.
6. **Add `runtime_mode='decommissioned'`** to enum + dashboard control. Pause is reversible; decommission is the permanent stop.
7. **Add `/api/foundation/active-processes`**: `{job_runs WHERE status='running', llm_calls WHERE status IN ('planned','started'), source_crawl_targets WHERE lease_owner IS NOT NULL}`. The "what's running RIGHT NOW" view SYSTEM-010 needs.

### Tier 2 — substrate honesty (P1 data integrity)

8. **Migrate `subject_people`, `sensitivity`, `min_tier` to first-class columns** on `shared_communication_candidates` and `_synthesized_items`. Index them. JSONB metadata can stay for additional context.
9. **Make `users.tier` NOT NULL** with default that fails closed (e.g., 99 = "no read access").
10. **Reconcile atoms-vs-synthesis taxonomy** before STRATEGY-001 builds. Either fold atoms into synthesis or define mapping table.
11. **Move `scripts/transcribe-zoom-audio-archive.mjs:220` direct-OpenAI call** behind `assertDirectOpenAiResponsesAllowed` (or transcription-specific allow flag).
12. **Flip `callLlm({ dryRun = true })` default** to `false`. Probes pass `{ dryRun: true }` explicitly.
13. **Wrap `finishLlmCall` inside catch** in `lib/llm-router.js:589-606` with its own try.
14. **Don't unconditionally delete child synthesized items** on upsert (`foundation-db.js:7647`). Either soft-delete or compare-and-only-delete-superseded.
15. **Check candidate status in `applySharedCommunicationCandidate*`** to prevent re-apply duplicates.

### Tier 3 — verifier honesty (catch what theatre missed)

16. **Add the 5 missing checks** listed above (tier filter, subject redaction, Action Router presence, synthesis correctness, failure propagation).
17. **Run `foundation:verify` from a non-localhost path** so `requireAdminToken` is actually exercised.
18. **Replace doc-grep checks (#1-5)** with DB-state checks against actual sheet probe results.

### Tier 4 — operational gaps (not in plan)

19. **Postgres backup**: nightly pg_dump to a Drive folder via Foundation job.
20. **Schema migration tool**: pick one (node-pg-migrate, drizzle-kit, or roll your own with a `schema_migrations` table). Stop conflating schema/seed/reconcile in `initFoundationDb`.

### Tier 5 — doc cleanup (P2)

21. **Update `rebuild-decisions.md`**: resolve `ai@/crewbert@` TBD; mark execution order superseded.
22. **Delete or rewrite `AGENTS.md`** (root) — currently references files that don't exist.
23. **Annotate dashboard source count change** — note the f8066e9 readable-count semantics shift.
24. **Reconcile numbering**: pick "10 phases" as canonical; mark `current-state.md` execution order and audit narratives as derivative.

---

## Verdict

You asked: are we doing this right?

**Yes — architecturally.** The Foundation/Runtime/Synthesis/Action-Router layering is sound. `f8066e9` correctly hardened doctrine in the right places. Strategy Hub is properly deferred. Substrate code quality is genuinely good.

**No — operationally — until 1-7 above are done.** Phase 4A doctrine exists; Phase 4A code does not. Shipping a Strategy Hub UI or wiring Harlan to real data tomorrow would expose Tier-1 intelligence to anyone on the local network. SYSTEM-010 controls are 30% built, doctrine is 100%. The gap is the danger zone.

**Don't worry about Frankenstein yet** — three indicators (atoms-vs-synthesis taxonomy collision, dual snapshot pathways, half-done `team`/`scope` rename) but none load-bearing. The repo isn't a Frankenstein build today. It could become one if the next 2-3 sessions skip Tier 1 and 2 and start consumer surfaces.

**The 8-step order Codex wrote in his commit message IS the right plan.** It matches Tier A→E from the 4-24 audit. f8066e9 is a textbook-correct response to the audit. The work above is what closes Tier B (auth/tier/redaction) and Tier C (SYSTEM-010 controls) — both of which Codex correctly named P0.

Don't start Phase 7. Close Tiers 1 and 2 above, then revisit.

---

## Appendix: files referenced by absolute path

- `C:\Users\steve\bcrew-ai-os-review\server.js`
- `C:\Users\steve\bcrew-ai-os-review\lib\foundation-db.js`
- `C:\Users\steve\bcrew-ai-os-review\lib\foundation-jobs.js`
- `C:\Users\steve\bcrew-ai-os-review\lib\llm-router.js`
- `C:\Users\steve\bcrew-ai-os-review\lib\llm-spend-policy.js`
- `C:\Users\steve\bcrew-ai-os-review\lib\shared-candidate-extraction.js`
- `C:\Users\steve\bcrew-ai-os-review\lib\fub.js`
- `C:\Users\steve\bcrew-ai-os-review\lib\google-delegated.js`
- `C:\Users\steve\bcrew-ai-os-review\lib\meeting-transcripts.js`
- `C:\Users\steve\bcrew-ai-os-review\lib\source-contracts.js`
- `C:\Users\steve\bcrew-ai-os-review\lib\slack.js`
- `C:\Users\steve\bcrew-ai-os-review\scripts\foundation-worker.mjs`
- `C:\Users\steve\bcrew-ai-os-review\scripts\run-foundation-job.mjs`
- `C:\Users\steve\bcrew-ai-os-review\scripts\foundation-verify.mjs`
- `C:\Users\steve\bcrew-ai-os-review\scripts\generate-shared-comms-synthesis.mjs`
- `C:\Users\steve\bcrew-ai-os-review\scripts\transcribe-zoom-audio-archive.mjs`
- `C:\Users\steve\bcrew-ai-os-review\docs\rebuild\current-plan.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\rebuild\current-state.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\rebuild\intelligence-pipeline.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\rebuild\rebuild-decisions.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\rebuild\agent-architecture.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\rebuild\doc-cleanup-plan.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\rebuild\source-registry.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\specs\2026-04-23-auth-tiers-vault.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\specs\2026-04-23-synthesis-engine-v1.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\specs\business-atoms-spec.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\specs\data-source-maturity-model.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\handoffs\2026-04-24-foundation-closeout-and-doc-checkpoint.md`
- `C:\Users\steve\bcrew-ai-os-review\docs\handoffs\2026-04-24-strategy-action-loop-correction.md`
- `C:\Users\steve\bcrew-ai-os-review\AGENTS.md`
- `C:\Users\steve\bcrew-ai-os-review\SOUL.md`
- `C:\Users\steve\bcrew-ai-os-review\public\foundation.js`
- `C:\Users\steve\bcrew-ai-os-review\public\index.html`
- `C:\Users\steve\bcrew-ai-os-review\package.json`

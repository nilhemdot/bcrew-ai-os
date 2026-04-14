# Foundation Trust Layer (B1) — Design Spec

**Date:** 2026-04-14
**Scope:** B-tight (B1) — make Foundation writeable and trusted, defer source expansion
**Status:** Revised v2 after reviewer findings (ID model, schema alignment, auth scope, apply-flow guarantees)

---

## 1. Context

The new `bcrew-ai-os` rebuild has a read-only Foundation: strategy docs render cleanly, PostgreSQL seeds backlog / decisions / open questions / parking lot / memory status, Google Sheets reads work. But the HTTP layer has **zero mutation endpoints**, no system-strategy doc exists, and there is no decision capture flow. The system is a one-way mirror — beautiful to read, impossible to operate.

Two parallel audits (fresh-context builder and Mac-mini reviewer) converged on the same architectural answer: **Foundation is the root layer of the OS**, not a narrow strategy section. The debate is settled. What remains is building the trust layer so Foundation can evolve without drifting.

## 2. Scope

### In scope (B1)
1. `SYSTEM-001` — `docs/system-strategy.md`, the OS constitution
2. Write APIs for `backlog_items`, `decisions`, `open_questions`
3. Minimal UI forms to exercise the write APIs inside the existing Operating Memory shell
4. Decision proposal → review → explicit apply flow, against a small doc allowlist
5. `Recent Changes` surface and typed decision classification on the Decisions view
6. Opportunistic hygiene (extract shared `client-utils.js`, delete `app.js`) only where it sits in the path of the work above

### Explicitly deferred (write to backlog, do not build)
- New source integrations (sales, finance, governance, retention truth) — Steve will wire these one at a time later and verify reads
- Source-health expansion beyond what SYSTEM-001 needs
- Doctrine-as-code / rule enforcement engine
- Broad drift detection engine
- Strategy change ledger with inline yellow-highlight annotations (`DECISION-002`)
- Decision conflict detection + cleanup (`DECISION-003`)
- Nav / IA refactor — **keep the current Foundation UI shell** (Overview / Supporting Docs / Operating Memory / Sources); let SYSTEM-001 describe the deeper architecture, adjust UI later if needed
- Auto-detection scouts, Telegram integration, background Decision Codifier agent

### Non-goals
- Multi-user auth
- Public deployment
- Mobile UI
- Real-time collaborative editing

## 3. Architecture Principles (to encode in SYSTEM-001)

- **Foundation is the root layer of the OS.** Every future hub (Marketing, Strategy Team, departments) plugs into Foundation's shared primitives.
- **Three conceptual zones inside Foundation** (UI organization can follow later):
  - **Business Foundation** — the WHAT. Durable strategy, Git-versioned docs, human-readable.
  - **System Foundation** — the HOW. Operating memory in PostgreSQL — decisions, backlog, open questions, system-strategy doc, memory status, recent changes.
  - **Source of Truth** — the PROOF. Source registry, source contracts, health/trust signals.
- **Durable truth lives in Git. Volatile memory lives in PostgreSQL.** Docs are curated artifacts maintained by tracked proposals and approvals. The database is the change log underneath them.
- **The system proposes; Steve confirms; the system records.** No doc gets auto-edited without an explicit apply step.
- **Stale docs are system bugs, not human failures.** (Doctrine carried from old system, enforcement deferred to a later phase.)
- **Source contracts with stable IDs.** Live values reference Source IDs, not hardcoded cell refs.
- **Agents support and operationalize strategy; they do not set or change it.** Carried forward from the existing System Rules in the foundation UI.

## 4. Data Model

### 4.0 ID strategy (decided, not an open question)

The existing tables all use `TEXT PRIMARY KEY` with human-readable IDs (`DEC-001`, `SYSTEM-001`, `FOUNDATION-001`, etc.). That pattern stays.

- **User-facing entities** (`decisions`, `backlog_items`, `open_questions`, `parking_lot_items`, new `pending_doc_updates`) → `TEXT PRIMARY KEY` with human-readable prefixed IDs.
- **Cross-table references** (`pending_doc_updates.decision_id`, `change_events.entity_id`, `decisions.supersedes_ids[]`) → `TEXT`, matching the referenced primary key type.
- **Internal append-only log** (`change_events.id`) → `BIGSERIAL`. No one references this externally; queries go through `(created_at, entity_table, entity_id)` indexes. Using a bigserial here keeps the event log cheap without bleeding integer PKs into the public surface.

Next-ID generation uses a small helper in `lib/foundation-db.js` that scans `SELECT MAX(id)` by prefix (e.g. `DEC-%`) and returns the next zero-padded sequence. Cheap at current volumes; we revisit if write throughput ever matters.

### 4.1 Extend existing `decisions` table

`decisions.category` already exists as `TEXT NOT NULL` without a CHECK constraint. Existing seeded rows use legacy categories (`foundation`, `data`, `memory`, `strategy`, `system`) that do not match the new classification set (`strategy`, `system`, `execution`, `people`) — and a naive normalization would silently flatten meaning. Strategy for B1:

- **Do not add a DB-level CHECK constraint in S2.** The column stays free-text at the schema level.
- **Enforce the new classification set at the API layer** (POST/PATCH validators) so every *new or re-classified* decision must pick one of the four canonical categories.
- **Leave legacy categories intact on existing rows** and surface them as-is in the UI. Steve re-classifies them manually via `PATCH /decisions/:id` whenever he wants to.
- Add a follow-up backlog item `DECISION-004` during S2: "re-classify seven seeded decisions into the canonical four-category set." This is a data task, not a schema task.

The CHECK constraint gets added in a later phase once all rows are on the canonical set.

Schema migration for S2 is therefore **additive-only**:

```sql
-- Add classification tracking + supersession columns. No CHECK on category for B1.
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS classified_at  TIMESTAMPTZ;
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS classified_by  TEXT;
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS supersedes_ids TEXT[];  -- TEXT[] because decisions.id is TEXT

-- Backfill classified_at for rows that already exist.
UPDATE decisions
  SET classified_at = COALESCE(classified_at, created_at)
  WHERE classified_at IS NULL;
```

API-layer validator (implemented in S3) rejects POST/PATCH bodies where `category` is not in `('strategy','system','execution','people')`, returning `400 invalid_category`. This keeps the rule explicit without forcing a destructive migration on legacy data.

### 4.2 Extend existing `open_questions` table

`open_questions` today has no lifecycle column — it is append-only and there is no way to resolve or reopen a question. B1 needs both. Migration adds a `status` lifecycle plus resolution metadata.

```sql
ALTER TABLE open_questions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE open_questions
  DROP CONSTRAINT IF EXISTS open_questions_status_check;
ALTER TABLE open_questions
  ADD CONSTRAINT open_questions_status_check
  CHECK (status IN ('open','resolved'));
ALTER TABLE open_questions ADD COLUMN IF NOT EXISTS resolved_at     TIMESTAMPTZ;
ALTER TABLE open_questions ADD COLUMN IF NOT EXISTS resolved_by     TEXT;
ALTER TABLE open_questions ADD COLUMN IF NOT EXISTS resolution_note TEXT;
```

### 4.3 Extend existing `backlog_items` table

`backlog_items` has no `owner` column today. API design assigns ownership on PATCH, so add it. `status_note` already exists and covers the "notes" use case, so no second notes column is introduced.

```sql
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS owner TEXT;
```

### 4.4 New table `pending_doc_updates`

Captures the proposal stage of the decision-to-doc-update flow. Stores enough structured context that review tooling can show a rich diff, not a raw blob.

```sql
CREATE TABLE IF NOT EXISTS pending_doc_updates (
  id              TEXT PRIMARY KEY,           -- e.g. 'DU-001', generated by next-id helper
  decision_id     TEXT REFERENCES decisions(id),
  target_doc_path TEXT NOT NULL,              -- e.g. 'docs/strategy/quarterly-priorities.md'
  target_section  TEXT,                       -- optional heading slug
  summary         TEXT NOT NULL,              -- one-line description of the change
  current_text    TEXT,                       -- snapshot of the section before the change
  proposed_text   TEXT NOT NULL,              -- replacement content
  proposed_diff   TEXT,                       -- optional unified-diff rendering
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','applied','expired','failed')),
  proposed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proposed_by     TEXT NOT NULL,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT,
  applied_at      TIMESTAMPTZ,
  applied_commit  TEXT,                       -- git sha once apply succeeds
  expires_at      TIMESTAMPTZ,                -- 72h default, mirrors old-system TTL
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb  -- {error_detail, retry_count, …}
);

CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_status   ON pending_doc_updates(status);
CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_decision ON pending_doc_updates(decision_id);
```

The `failed` status is new (not in v1 of this spec) to distinguish a failed apply attempt from a pre-apply reject. Failed entries keep `metadata.error_detail` and can be retried via a subsequent apply call.

### 4.5 New table `change_events`

Powers the Recent Changes surface and gives every mutation a single event log to query against. Internal-only — nobody references events by id externally, so `BIGSERIAL` is the right PK.

```sql
CREATE TABLE IF NOT EXISTS change_events (
  id            BIGSERIAL PRIMARY KEY,
  event_type    TEXT NOT NULL
                CHECK (event_type IN (
                  'decision_proposed','decision_classified','decision_locked','decision_superseded',
                  'backlog_created','backlog_status_changed','backlog_updated',
                  'question_created','question_resolved','question_reopened',
                  'doc_update_proposed','doc_update_approved','doc_update_applied',
                  'doc_update_rejected','doc_update_failed'
                )),
  entity_table  TEXT NOT NULL,               -- 'decisions','backlog_items','open_questions','pending_doc_updates'
  entity_id     TEXT NOT NULL,               -- TEXT to match the referenced primary key
  actor         TEXT NOT NULL,               -- 'steve','system', future: agent name
  summary       TEXT NOT NULL,               -- rendered one-liner for UI
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_events_created_at ON change_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_events_entity     ON change_events(entity_table, entity_id);
```

### 4.6 Untouched tables

`parking_lot_items`, `memory_system_status`, `doc_source_snapshots` are not modified by B1. They stay read-only / seed-maintained.

## 5. Write APIs

All under `/api/foundation/`. Every mutation writes a matching `change_events` row **inside the same DB transaction** — when the mutation commits, the event is durable; when it rolls back, so does the event.

| Method | Path | Purpose |
|---|---|---|
| `POST`  | `/api/foundation/backlog`             | Create backlog item |
| `PATCH` | `/api/foundation/backlog/:id`         | Update lane / rank / priority / owner / status_note |
| `POST`  | `/api/foundation/decisions`           | Propose decision (enters as `status='proposed'`, classified) |
| `PATCH` | `/api/foundation/decisions/:id`       | Re-classify / lock / supersede |
| `POST`  | `/api/foundation/questions`           | Add open question |
| `PATCH` | `/api/foundation/questions/:id`       | Resolve, reopen, update summary/owner |
| `GET`   | `/api/foundation/doc-updates`         | List pending doc update proposals |
| `POST`  | `/api/foundation/doc-updates`         | Create a proposal tied to a decision |
| `POST`  | `/api/foundation/doc-updates/:id/approve` | Mark approved (no file write yet) |
| `POST`  | `/api/foundation/doc-updates/:id/apply`   | Explicit apply — writes file and commits via git |
| `POST`  | `/api/foundation/doc-updates/:id/reject`  | Reject the proposal |
| `GET`   | `/api/foundation/changes`             | Paginated recent changes feed |

### 5.1 Auth — gate writes, preserve read access

Reads today are available on the Mac mini's LAN IP (e.g. `192.168.2.102:3000`) and Steve uses that workflow. B1 does **not** change host binding and does **not** gate GETs. Only mutations are protected.

- **GET routes:** unchanged. Accessible on loopback and LAN, as today.
- **Mutation routes** (every `POST` / `PATCH` / `DELETE` under `/api/foundation/*`): require header `X-Admin-Token` matching `process.env.ADMIN_TOKEN`.
  - Missing header → `401`
  - Mismatched token → `401`
  - Token is loaded from `.env` (gitignored); never logged.
- **Token rotation:** change env var, restart `node server.js`.
- **Optional belt-and-suspenders** (stretch, not required for B1): mutation middleware can also require the request's remote address to be loopback or a short LAN allowlist. Default B1 ships with token-only; the allowlist hook is left in place but unconfigured.

Real multi-user auth (sessions, roles, tiers) is out of scope for B1 and captured as `AUTH-001`.

### 5.2 Input validation

Every endpoint uses a small hand-written validator (no new dep required). Invalid body → `400` with field-level errors. Unknown fields are rejected (strict mode) so UI bugs surface early.

### 5.3 Error handling

- DB mutations are wrapped in a single Postgres transaction with the matching `change_events` insert — both commit together or both roll back.
- File-write + git-commit (apply flow only) is a **separate phase** after the DB transaction commits; see §6.2 for the failure model.
- Errors return `{ error: { code, message, details? } }`.
- Server logs include the request id; the admin token is never logged.

## 6. Decision Capture Flow (MVP, manual-first)

```
[Steve uses Foundation UI]
        |
        v
"Log Decision" form
 - title, summary (required)
 - detail (optional)
 - category (strategy | system | execution | people)
 - does this affect a doc? (yes/no + allowlist doc picker + section picker)
        |
        v
POST /decisions                     → decisions row, status='proposed', category set
        |
        v  (if affects a doc)
POST /doc-updates                   → pending_doc_updates row, status='pending'
                                      form auto-drafts proposed_text; current_text snapshot
                                      taken from the target section at proposal time
        |
        v
[Pending Doc Updates panel shows diff]
        |
        v
Steve picks an action:
  - Approve         → status='approved'  (still no file write — marks intent)
  - Apply           → runs apply flow (see §6.2); on success, status='applied'
  - Reject          → status='rejected'
        |
        v
change_events rows recorded at every transition
        |
        v
Recent Changes surface updates
```

### 6.1 Doc allowlist for B1 apply

The `apply` endpoint only writes to files on this allowlist. Proposals may target any doc, but `apply` against an out-of-list path returns `409 not-in-allowlist` — Steve edits those by hand for now.

**B1 allowlist** (section-level updates allowed):
- `docs/strategy/quarterly-priorities.md`
- `docs/strategy/strategic-issues.md`
- `docs/strategy/department-mandates.md`

**Explicitly not in the B1 allowlist** (edit by hand):
- `docs/business-strategy.md`
- `docs/system-strategy.md`
- `docs/rebuild-decisions.md`
- `docs/source-registry.md`
- `docs/strategy/vision-and-north-star.md`
- `docs/strategy/bhag-model.md`
- `docs/strategy/agent-engine.md`
- `docs/strategy/core-values.md`
- `docs/strategy/governance.md`
- `docs/strategy/marketmasters.md`
- `docs/strategy/financial-model-and-assumptions.md` (UI displays as "Planning Definitions")

The allowlist lives in a single constant in `lib/doc-allowlist.js` so it can expand deliberately.

### 6.2 Apply step — narrowed guarantees (no cross-system atomicity)

The previous spec claimed every mutation was transactional and no partial write would survive. That overstated the guarantee: Postgres, the filesystem, and git do not participate in a single transaction. The honest model for B1:

**What is atomic:**
- DB changes (decision row status flip, pending_doc_updates row update, change_event insert) are all in one Postgres transaction.

**What is not atomic, but is recoverable:**
- The file write and git commit happen **after** the DB transaction commits, in a sequential phase with explicit compensation on failure.

**Apply flow in detail:**

1. Validate: proposal exists, `status IN ('pending','approved','failed')`, target_doc_path is in allowlist.
2. **Phase A (Postgres, atomic):** read current file, locate target section by heading slug match, verify `current_text` hash still matches (concurrency guard). Do not mutate DB yet.
3. **Phase B (filesystem, non-transactional):** write the new file content. If write fails, no DB row has been mutated — surface error, status stays `approved`, log `metadata.error_detail`.
4. **Phase C (git, non-transactional):** stage the file, commit with message `Apply doc update <id>: <summary>` plus a `Co-Authored-By` trailer. Implemented via Node's built-in `child_process` calling the system `git` binary — **no new npm dependency**.
5. **Phase D (Postgres, atomic):** in a single transaction, flip `pending_doc_updates.status = 'applied'`, store `applied_commit`, set `applied_at`, flip `decisions.status = 'locked'` if the decision was still `proposed`, insert `change_events(event_type='doc_update_applied')`.
6. If any of B / C / D fails after a step has succeeded: run compensation. File written but commit failed → leave the file in place (it is now uncommitted), mark `pending_doc_updates.status = 'failed'`, record `metadata.error_detail` and `metadata.partial_write=true`. Steve can inspect, fix git state, and call `apply` again.

**Concurrency guard:** the section-not-found case and the "someone edited this doc between propose and apply" case are both caught in step 2 by hashing `current_text` and comparing to the current on-disk content. Mismatch → `409 conflict`.

**Dependency:** the apply flow uses `child_process.execFile('git', …)`. `simple-git` is **not** added to `package.json`.

## 7. UI (inside the existing Foundation shell)

No nav refactor. Add three things to the current Operating Memory area:

- **Add / edit forms** on Backlog, Decisions, Open Questions cards
  - Inline edit for quick fields (lane, priority, category, status)
  - Modal / panel for full-record create
  - Admin token is stored client-side in `localStorage` after Steve pastes it once; every mutation sends it as the `X-Admin-Token` header. **There is no signed-cookie session.** A `401` response prompts a re-paste.
- **Pending Doc Updates panel** in System Foundation area
  - List of proposals with status pills (pending / approved / applied / rejected / failed)
  - Diff view (current_text → proposed_text)
  - Approve / Apply / Reject buttons
- **Recent Changes panel** on Foundation overview
  - Latest ~20 `change_events` rendered with timestamp, actor, summary
  - Category pills for decisions

Classification pills (`strategy` / `system` / `execution` / `people`) on decision cards. Tabs or filters to slice decisions by category.

## 8. Hygiene (opportunistic only)

Only do these if they sit in the path of the work above:

- Extract common helpers from `foundation.js`, `doc.js`, `strategic-execution.js`, `home.js` into `public/client-utils.js` and import.
- Delete `public/app.js` (618 lines, unused).
- Leave the unfilled OpenClaw template files (`IDENTITY.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`, `AGENTS.md`) alone for this pass — they are harmless scaffolding and touching them is a separate decision.

## 9. Testing Strategy

- **Schema migrations** — run on a temp DB and assert column/constraint presence (new `decisions` columns, `open_questions.status` with CHECK, `backlog_items.owner`, `pending_doc_updates`, `change_events`).
- **Category validation (API layer)** — POST/PATCH with `category='foundation'` (or any legacy value) → `400 invalid_category`; with one of the four canonical values → `200`. Legacy rows remain readable via GET.
- **Write APIs** — one happy-path and one failure test per endpoint against the real local Postgres; verify the matching `change_events` row is inserted.
- **Auth gate** — mutations: missing token → `401`, wrong token → `401`, correct token → `200`. GETs: all still reachable without a token.
- **Apply flow** — fixture doc under `tests/fixtures/`, propose + apply, assert file content, commit sha recorded, `pending_doc_updates.status='applied'`, decision `locked`, event logged.
- **Concurrency guard** — mutate fixture doc out-of-band between propose and apply, assert `409`.
- **Allowlist enforcement** — attempt an `apply` against an out-of-list doc and assert `409 not-in-allowlist`.
- **Compensation** — inject a git failure (bad repo state), assert `status='failed'`, `metadata.partial_write=true`, file remains on disk, retry succeeds after fix.

Target: each slice ships with its tests green before the next slice starts.

## 10. Slices (6 auditable checkpoints)

| # | Slice | Deliverable | Rough size |
|---|---|---|---|
| **S1** | `SYSTEM-001` doc | `docs/system-strategy.md` written and rendered inside Foundation as a Supporting Doc (single card added to the existing Supporting Docs list, no nav change) | ~3 hrs |
| **S2** | DB schema + backfill | All migrations from §4.1-4.5, next-ID helper, seed regression still green | ~3 hrs |
| **S3** | Write APIs only | All endpoints from §5 live and tested, admin-token gate on mutations, GET behavior unchanged, no UI wiring yet | ~1 day |
| **S4** | UI forms | Minimal forms on existing Backlog / Decisions / Open Questions cards calling the S3 APIs, classification pills on decisions, admin token stored in a cookie | ~1 day |
| **S5** | Proposal / apply flow | Pending Doc Updates panel, allowlist enforcement, explicit Apply button, `child_process` git commit path, Phase-B/C/D failure model + compensation | ~1 day |
| **S6** | Recent Changes + cleanup | Recent Changes panel on Foundation overview, opportunistic hygiene (`client-utils.js`, delete `app.js`), final audit pass | ~4 hrs |

Each slice lands as a single commit (or small PR) so the Mac-mini reviewer can audit it before the next slice starts.

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Apply-phase git failure leaves an uncommitted file on disk | Explicit compensation path: `status='failed'`, `metadata.partial_write=true`, retry flow. Not true cross-system atomicity, but observable and fixable. |
| Category constraint silently flattens legacy seeded categories | B1 does not add a DB CHECK; the four-category rule lives in the API validator. Legacy rows stay visible with their original category, reclassified manually via PATCH. (§4.1) |
| Open-questions status rollout breaks existing reads | New `status` column defaults to `'open'` — existing UI code that doesn't know about status treats everything as open, matching prior behavior. |
| `admin_token` leaks into logs | Never log request headers; `.env` gitignored; rotate via env var + restart. |
| LAN access to GETs exposes strategy reads to anyone on the network | Accepted for B1 — matches existing workflow. `AUTH-001` (real auth) captures this for later. |
| `BIGSERIAL` event id vs text entity id inconsistency feels odd | Documented in §4.0; event id is internal and never surfaces in APIs or UI. |
| `child_process` git invocations spawn shells with wrong cwd | Use `execFile` (not `exec`), pass explicit `cwd: process.cwd()`, tests cover this path. |
| Schema migration re-runs on every boot | All ALTERs are idempotent (IF NOT EXISTS + DROP IF EXISTS on constraints). Safe under repeated `initFoundationDb`. |
| Future schema change breaks `supersedes_ids TEXT[]` consumers | Queried through a single helper that lives in `lib/foundation-db.js`; consumers do not hand-craft array SQL. |

## 12. What Comes After B1

Captured as backlog items during implementation, not built now:

- `DECISION-002` — strategy change ledger + inline highlights
- `DECISION-003` — decision conflict detection + cleanup workflow
- `SOURCE-001..N` — per-source integrations (sales, finance, governance, retention), one at a time with read verification
- `DRIFT-001` — doc staleness detection (15-day flag, 18-day escalation)
- `DOCTRINE-001` — rule enforcement engine (carry the 16 rules / 6 lessons pattern into the new stack once the trust layer is live)
- `AUTH-001` — real multi-user auth when anyone other than Steve needs access
- `CAPTURE-001` — scout-driven automatic decision detection (replaces manual-first form)

## 13. Success Criteria

B1 is done when **all seven** of these are true:
1. `docs/system-strategy.md` exists, is rendered inside Foundation, and matches the architecture this doc describes.
2. Steve can create, edit, and close a backlog item / decision / open question entirely through the UI — no seed file edits, no server restart.
3. Steve can propose a doc update tied to a decision, review the diff, and explicitly apply it against an allowlisted doc — the file changes, a commit lands, the decision locks.
4. Every mutation appears in a Recent Changes surface within seconds.
5. Decisions are classified into one of four categories, visibly on the UI.
6. No regressions: all existing GET endpoints still work, seeded data still renders, Foundation overview still loads on LAN.
7. An apply failure (forced during testing) leaves the system in a recoverable `failed` state — not a stuck or silently-partial one.

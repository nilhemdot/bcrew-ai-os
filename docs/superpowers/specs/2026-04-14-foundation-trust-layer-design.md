# Foundation Trust Layer (B1) — Design Spec

**Date:** 2026-04-14
**Scope:** B-tight (B1) — make Foundation writeable and trusted, defer source expansion
**Status:** Approved for implementation planning

---

## 1. Context

The new `bcrew-ai-os` rebuild has a read-only Foundation: strategy docs render cleanly, PostgreSQL seeds 51 backlog items / 7 decisions / 3 open questions, Google Sheets reads work. But the HTTP layer has **zero mutation endpoints**, no system-strategy doc exists, and there is no decision capture flow. The system is a one-way mirror — beautiful to read, impossible to operate.

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

### 4.1 Extend existing `decisions` table

```sql
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS category TEXT
  CHECK (category IN ('strategy','system','execution','people'))
  DEFAULT 'strategy';
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS classified_by TEXT;
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS supersedes_ids INTEGER[];
```

Backfill: existing rows default to `category = 'strategy'` and `classified_at = created_at`. A simple migration script in `lib/foundation-db.js` handles this idempotently.

### 4.2 New table `pending_doc_updates`

Captures the proposal stage of the decision-to-doc-update flow. Stores enough structured context that review tooling can show a rich diff, not a raw blob.

```sql
CREATE TABLE IF NOT EXISTS pending_doc_updates (
  id              SERIAL PRIMARY KEY,
  decision_id     INTEGER REFERENCES decisions(id),
  target_doc_path TEXT NOT NULL,        -- e.g. 'docs/strategy/quarterly-priorities.md'
  target_section  TEXT,                 -- optional anchor / heading slug
  summary         TEXT NOT NULL,        -- human-readable 1-line description of the change
  current_text    TEXT,                 -- snapshot of the section/line before the change
  proposed_text   TEXT NOT NULL,        -- replacement content
  proposed_diff   TEXT,                 -- optional unified-diff representation
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','applied','expired')),
  proposed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proposed_by     TEXT NOT NULL,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT,
  applied_at      TIMESTAMPTZ,
  applied_commit  TEXT,                 -- git sha, if apply path commits
  expires_at      TIMESTAMPTZ,          -- 72h default, mirrors old system TTL
  metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_status ON pending_doc_updates(status);
CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_decision ON pending_doc_updates(decision_id);
```

### 4.3 New table `change_events`

Powers the Recent Changes surface and gives every mutation a single event log to query against.

```sql
CREATE TABLE IF NOT EXISTS change_events (
  id            SERIAL PRIMARY KEY,
  event_type    TEXT NOT NULL
                CHECK (event_type IN (
                  'decision_proposed','decision_classified','decision_locked','decision_superseded',
                  'backlog_created','backlog_status_changed','backlog_updated',
                  'question_created','question_resolved','question_reopened',
                  'doc_update_proposed','doc_update_applied','doc_update_rejected'
                )),
  entity_table  TEXT NOT NULL,
  entity_id     INTEGER NOT NULL,
  actor         TEXT NOT NULL,          -- 'steve', 'system', future: agent name
  summary       TEXT NOT NULL,          -- rendered one-liner
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_events_created_at ON change_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_events_entity ON change_events(entity_table, entity_id);
```

### 4.4 Existing tables — no schema change

`backlog_items`, `open_questions`, `parking_lot_items`, `memory_system_status`, `doc_source_snapshots` gain write endpoints but keep their existing columns.

## 5. Write APIs

All under `/api/foundation/`. Every mutation writes a `change_events` row transactionally.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/foundation/backlog` | Create backlog item |
| `PATCH` | `/api/foundation/backlog/:id` | Update lane / rank / priority / owner / notes |
| `POST` | `/api/foundation/decisions` | Propose decision (enters as `status='proposed'`, unclassified) |
| `PATCH` | `/api/foundation/decisions/:id` | Classify, lock, supersede |
| `POST` | `/api/foundation/questions` | Add open question |
| `PATCH` | `/api/foundation/questions/:id` | Resolve, reopen, update |
| `GET` | `/api/foundation/doc-updates` | List pending doc update proposals |
| `POST` | `/api/foundation/doc-updates` | Create a proposal tied to a decision |
| `POST` | `/api/foundation/doc-updates/:id/approve` | Mark approved (no file write yet) |
| `POST` | `/api/foundation/doc-updates/:id/apply` | Explicit apply — writes file and commits via git |
| `POST` | `/api/foundation/doc-updates/:id/reject` | Reject the proposal |
| `GET` | `/api/foundation/changes` | Paginated recent changes feed |

### 5.1 Auth (B1)

**Simplest safe gate, not signed cookies:**
- Admin-token header `X-Admin-Token` validated against `ADMIN_TOKEN` env var
- Token loaded at boot from `.env` (gitignored)
- Endpoint binding: bind HTTP server to `127.0.0.1` only (no LAN exposure) — the Mac mini is the single machine; remote access happens via SSH tunnel when needed
- Missing / mismatched token → `401`
- All `GET` routes remain unauthenticated inside the local bind (they are already public today)

Real auth (sessions, roles, tiers) is out of scope for B1. We revisit before anyone other than Steve uses the system.

### 5.2 Input validation

Every endpoint uses a small hand-written validator (no new dep required). Invalid body → `400` with field-level errors. Unknown fields are rejected (strict mode) so UI bugs surface early.

### 5.3 Error handling

- All mutations inside a single Postgres transaction with the matching `change_events` insert
- Failures roll back the whole transaction
- Errors return `{ error: { code, message, details? } }`
- Server logs the request id, the user-provided admin token is **never** logged

## 6. Decision Capture Flow (MVP, manual-first)

```
[Steve uses Foundation UI]
        |
        v
"Log Decision" form
 - summary (required)
 - detail (optional)
 - category (strategy | system | execution | people)
 - does this affect a doc? (yes/no + allowlist doc picker + section picker)
        |
        v
POST /decisions                     → decisions row, status='proposed', category set
        |
        v  (if affects a doc)
POST /doc-updates                   → pending_doc_updates row, status='pending'
                                      system auto-drafts proposed_text from the form
        |
        v
[Pending Doc Updates panel shows diff]
        |
        v
Steve picks an action:
  - Approve         → status='approved'  (still no file write — just marks intent)
  - Apply           → status='applied'   (writes file, optional git commit, decision status='locked')
  - Reject          → status='rejected'
        |
        v
change_events rows recorded at every transition
        |
        v
Recent Changes surface updates
```

### 6.1 Doc allowlist for B1 apply

The `apply` endpoint only writes to files on this allowlist. All other `target_doc_path` values can be proposed and approved, but `apply` returns `409 not-in-allowlist` — Steve edits those by hand for now.

**B1 allowlist** (editable section-level updates):
- `docs/strategy/quarterly-priorities.md`
- `docs/strategy/strategic-issues.md`
- `docs/strategy/department-mandates.md`

**Explicitly not in the B1 allowlist** (too central, edit by hand):
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
- `docs/strategy/financial-model-and-assumptions.md` (displayed as "Planning Definitions")

The allowlist lives in a single constant in `lib/doc-allowlist.js` so it can expand deliberately as trust grows.

### 6.2 Apply step details

- Reads the current file
- Locates the target section by heading anchor (slug match on the h1/h2/h3 text)
- Replaces the section body with `proposed_text`
- Writes the file back
- Stages and commits via `simple-git` with message `Apply doc update #{id}: {summary}` and a `Co-Authored-By` trailer for the system actor
- Stores the resulting commit sha in `pending_doc_updates.applied_commit`

If any step fails (section not found, file dirty, git error), the status flips back to `approved` with an `error_detail` in `metadata`, no partial write survives. The UI surfaces the error for manual handling.

## 7. UI (inside the existing Foundation shell)

No nav refactor. Add three things to the current Operating Memory area:

- **Add / edit forms** on Backlog, Decisions, Open Questions cards
  - Inline edit for quick fields (lane, priority, category)
  - Modal / panel for full-record create
- **Pending Doc Updates panel** in System Foundation area
  - List of proposals with status pills, diff view, approve/apply/reject buttons
- **Recent Changes panel** on Foundation overview
  - Latest ~20 `change_events` rendered with timestamp, actor, summary
  - Category pills for decisions

Classification pills (`strategy` / `system` / `execution` / `people`) on decision cards. Tabs or filters to slice decisions by category.

## 8. Hygiene (opportunistic only)

Only do these if they sit in the path of the work above:

- Extract common helpers from `foundation.js`, `doc.js`, `strategic-execution.js`, `home.js` into `public/client-utils.js` and import
- Delete `public/app.js` (618 lines, unused)
- Leave the unfilled OpenClaw template files (`IDENTITY.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`, `AGENTS.md`) alone for this pass — they are harmless scaffolding and touching them is a separate decision

## 9. Testing Strategy

- **Schema migrations** — run on a temp DB and assert column/table presence
- **Write APIs** — one happy-path and one failure test per endpoint (curl-style integration tests using the real local Postgres)
- **Apply flow** — fixture doc under `tests/fixtures/`, apply against it, assert file content and commit sha recorded
- **Allowlist enforcement** — attempt an `apply` against an out-of-list doc and assert `409`
- **Auth gate** — missing token → `401`, wrong token → `401`, correct token → `200`

Target: each slice ships with its tests green before the next slice starts.

## 10. Slices (6 auditable checkpoints)

| # | Slice | Deliverable | Rough size |
|---|---|---|---|
| **S1** | `SYSTEM-001` doc | `docs/system-strategy.md` written + rendered inside Foundation as a Supporting Doc (no nav change beyond adding one card) | ~3 hrs |
| **S2** | DB schema + backfill | Migration for `decisions` columns, new `pending_doc_updates`, new `change_events`, backfill script, seed regression still green | ~2 hrs |
| **S3** | Write APIs only | All endpoints from §5 live and tested, admin-token gate, `127.0.0.1` bind, no UI wiring yet | ~1 day |
| **S4** | UI forms | Minimal forms on existing Backlog / Decisions / Open Questions cards calling the S3 APIs, classification pills on decisions | ~1 day |
| **S5** | Proposal / apply flow | Pending Doc Updates panel, allowlist enforcement, explicit Apply button, git commit path, transaction + rollback behavior | ~1 day |
| **S6** | Recent Changes + cleanup | Recent Changes panel on Foundation overview, opportunistic hygiene (`client-utils.js`, delete `app.js`), final audit pass | ~4 hrs |

Each slice lands as a single commit (or small PR) so the Mac-mini reviewer can audit it before the next slice starts.

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Apply path silently corrupts a strategy doc | Allowlist + transactional apply + git commit provides full rollback |
| Classification schema wrong after more use | `category` is a CHECK constraint that's easy to widen; `supersedes_ids` is optional and additive |
| `change_events` becomes a hot write path | Covered by index; if volume grows, we add partitioning later (not a B1 concern) |
| Admin token leaks | `.env` gitignored, token never logged, rotate by changing env var and restarting |
| Schema migrations break existing seeds | Migration is additive-only (new columns / tables), existing seeds use `INSERT IF NOT EXISTS` pattern |
| SYSTEM-001 content drifts from UI reality | Write SYSTEM-001 to match current architecture, not aspirational — it describes what IS, plus the doctrine we carry forward |

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

B1 is done when **all six** of these are true:
1. `docs/system-strategy.md` exists, is rendered inside Foundation, and matches the architecture this doc describes.
2. Steve can create, edit, and close a backlog item / decision / open question entirely through the UI — no seed file edits, no server restart.
3. Steve can propose a doc update tied to a decision, review the diff, and explicitly apply it against an allowlisted doc — the file changes, a commit lands, the decision locks.
4. Every mutation appears in a Recent Changes surface within seconds.
5. Decisions are classified into one of four categories, visibly on the UI.
6. No regressions: all existing GET endpoints still work, seeded data still renders, Foundation overview still loads.

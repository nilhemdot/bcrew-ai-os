# Auth, Tiers, Data Vault, and Tier-Aware Query — Design Spec

Date: 2026-04-23
Status: Design only. No code until Codex current block is committed.
Scope: one spec covering identity, tiers, meeting-note vault, and tier-aware intelligence output.

## Why this spec exists

The old system's tier model filtered at the **UI layer only**. Raw meeting notes, emails, and Slack threads still sat on participants' Drives and inboxes. Anyone who could read a raw meeting note got unfiltered intelligence — including termination discussions, performance concerns, and strategic context that was supposed to be Steve-only.

The new model fixes that by storing raw comms in a vault only the system can read, and producing tier-filtered outputs on the way out. Cloudflare Access + app middleware + vault — all three layers required. Any one missing, it leaks.

## Identity Model

Two system identities + human users:

| Identity | Purpose | Password shared with team? |
|----------|---------|----------------------------|
| **`ai@bensoncrew.ca`** | Public-facing service account. Calendar attendee. Invitable to meetings. Already in use as the Google delegated service account. | Yes (known to team). **Never holds secrets.** |
| **`crewbert@bensoncrew.ca`** | Private system identity. Owns the vault. Processed intelligence lives here. | **No — password held by Steve only.** |
| Human users | Log in via Google OAuth on their own `@bensoncrew.ca` email. Tier looked up by email. | N/A |

**Key rule:** `ai@` is front-office (meetings, calendar visibility, delegated reads). `crewbert@` is back-office (vault, ACLs locked to system + Steve). Never confuse them.

## Tier Model (ported from old `CLAUDE.md:83-89`)

| Tier | Name | Members | Access |
|------|------|---------|--------|
| 1 | GOD MODE | Steve | Everything. Unfiltered. |
| 2 | LEADERSHIP | Nick, Carson, Ryan, Blake, Scott, Clare, John Kitchens, Ahsan (verify) | All data except own termination/comp discussions |
| 3 | DEPT HEAD | Tanner, Georgia | Strategy context + own department only. No cross-dept names in performance data. |

**Absolute rules:**

- Only Tier 1 sees unfiltered intelligence.
- Never disclose to any person that they are being considered for termination or that undisclosed negative performance concerns exist about them.
- Tier assignments are durable identity, not per-query. Tier is stored in the DB, not inferred.

## Layer 1: Cloudflare Access (Edge Auth)

- Gates the entire `*.bensoncrew.ca` (or whatever subdomain) at the CDN edge.
- Requires Google OAuth login, restricted to `@bensoncrew.ca` domain + explicit allow-list.
- Attackers never reach the app. Anyone not in the allow-list is blocked before a request hits the Mac mini.
- Cloudflare forwards the authenticated email via the `Cf-Access-Authenticated-User-Email` header.

**What Cloudflare Access does NOT do:** tier filtering. It's binary — you're in or you're out. Tiers are app-level.

## Layer 2: App Middleware (Tier Attachment)

Every request passes through middleware that:

1. Reads `Cf-Access-Authenticated-User-Email` header.
2. Looks up email in the `users` table.
3. Attaches `req.user = { email, name, tier }` to the request.
4. Rejects requests with no header (401) or unknown email (403).

Pseudocode shape:

```js
app.use(async (req, res, next) => {
  const email = (req.header('Cf-Access-Authenticated-User-Email') || '').toLowerCase();
  if (!email) return res.status(401).json({ error: 'Unauthorized' });
  const user = await db.oneOrNone(
    'SELECT email, name, tier FROM users WHERE email = $1 AND active = true',
    [email]
  );
  if (!user) return res.status(403).json({ error: 'Not in users table' });
  req.user = user;
  next();
});
```

A helper `assertTier(req, minTier)` throws 403 if `req.user.tier > minTier`. Endpoints that need Tier 1 call `assertTier(req, 1)`; Tier 2 endpoints call `assertTier(req, 2)`; etc.

**Local dev bypass:** if `NODE_ENV !== 'production'` AND `USER_EMAIL_OVERRIDE` env var set, middleware uses the override. Hard error if that env var is seen in production.

## Layer 3: Data Vault

Raw comms never live on a user's Drive or inbox once ingested. They move to a vault folder owned by `crewbert@bensoncrew.ca`, shared with nobody.

### Meeting Capture Flow (the important one)

**Design revision 2 (2026-04-23 later):** Previous revisions first moved notes to a vault, then dropped the move entirely. Both were wrong. Steve's actual architecture is **owner-preserving ACL** — pull content via JWT, then strip everyone from the Drive file ACL EXCEPT the meeting owner, and add `crewbert@bensoncrew.ca`. Carson's notes don't disappear from Carson's Drive. Everyone else is gated through the system via access-request flow. This pairs with subject-person redaction on the intelligence side (see new section below) to make the whole system work.

**Observed live artifact reality (verified via Drive queries 2026-04-23):** Google Meet does not produce a single consistent artifact shape. Recent meetings have a `Notes by Gemini` Doc that **contains the transcript text embedded inside** the Doc with speaker labels. Older meetings have a standalone `Transcript` Doc separate from the Gemini note. Some meetings also produce `Recording` (binary video) and `Chat` (plain-text file) artifacts. The capture rule must handle all of these.

**Flow:**

1. System uses JWT domain-wide delegation (via `getJwtClient(userEmail)` in `lib/google-delegated.js`) to impersonate each `@bensoncrew.ca` user in the `users` table.
2. For each user, list their `Meet Recordings` folder (Google's default location). Pull every meeting artifact: `Notes by Gemini` Docs, standalone `Transcript` Docs, `Recording` binaries (metadata only if too large), `Chat` text files.
3. Dedupe by calendar event ID across users (the same meeting appears in every attendee's Drive).
4. Source-of-truth priority for extraction: (a) standalone Transcript Doc → (b) embedded transcript section extracted from the Gemini Doc → (c) if neither, log as "non-transcribed" and skip extraction.
5. Archive content to `shared_communication_artifacts.content_text` in PostgreSQL.
6. **ACL modification on the original Drive file:** impersonate the meeting owner (organizer per calendar event). Remove all participant permissions EXCEPT the owner's. Add `crewbert@bensoncrew.ca` as editor. Result: only the meeting owner + Crewbert have raw Drive access. Everyone else must go through the system.
7. Record metadata: calendar event ID, participants, timestamps, artifact IDs per type, transcript-source flag (`standalone` | `embedded_in_gemini` | `missing`), impersonated-user-used-for-pull, ACL-before and ACL-after snapshots (for audit/rollback).
8. Extraction layer processes the transcript body with Foundation context injected (see `Layer 4` below) AND tags each extraction with `subject_people` + `sensitivity` (see `Layer 5` subject-person redaction).
9. Users query through `/api/query` — never hit raw transcripts. Access requests for raw content route through Crewbert and come back as email summaries only.

**Why this is cleaner than move+remove:**

- Retroactive: pulls meetings that predate the system
- Non-intrusive: no one notices a file vanishing from their Drive
- No dependency on `ai@` being invited to every meeting
- Backup is naturally present (every attendee still has their copy)
- Works even if the system is offline temporarily — backfill by re-reading on next sync

**Sensitive-meeting exception (flagged at extraction, not at Drive):**

If the transcript contains explicit sensitive patterns (`termination`, `compensation review`, `comp discussion`, `legal counsel`, explicit PII categories), the extractor:

- Tags the extraction `min_tier: 1` (Steve only)
- Routes to a narrower review lane (not the shared `shared_communication_candidates`)
- Optionally: moves **only that transcript** to a Drive vault folder owned by `crewbert@bensoncrew.ca` + revokes participant ACL (late-binding vault; rare path)
- Logs the move as a visible system action (never silent for sensitive transitions)

**Why transcript over Gemini's bullet summary:** Gemini's "Next steps" bullets summarize what was literally said. Our system knows who's who, what the strategy is, what decisions are already on the table, what's in the backlog, and what's been said in prior meetings. That context produces materially better extractions — decisions that reference prior decisions, contributions tied to pillars, blockers mapped to the right source. The embedded transcript section inside the Gemini Doc is the real input. When only the Gemini note exists but no transcript in any form, flag the meeting rather than extract from bullets.

**Drive write permission required.** `lib/google-delegated.js` is read-only today. Old repo had `src/integrations/google-delegated-writes.ts` — Codex needs to port this before vault moves can happen.

### Meeting-Scout (Proactive)

- Scheduled job scans calendars (Steve's, leadership calendars, the ops calendar) for upcoming meetings `ai@` should attend.
- Rules (configurable, seeded from what the old system had): attend leadership meetings, strategic planning sessions, sales reviews, retention reviews, 1:1s where specified.
- If `ai@` is not already invited:
  - Send a low-friction notification to the meeting organizer via email (or Telegram once Harlan is wired): "please add `ai@bensoncrew.ca` to \[event title\] — needed for decision capture."
- Do **not** auto-accept or auto-add — organizer retains control.

### Other Raw Sources (same pattern)

- **Gmail threads** flagged as business-intel by scout rules → raw thread archived to vault, summary to DB.
- **Missive threads** → same pattern (Missive API has an archive-friendly pull).
- **Slack messages** (when Slack read-only is ported) → raw thread archived to vault with channel/timestamp metadata.

## Layer 4: Context-Aware Extraction

Extraction is not "summarize the transcript." It is "extract decisions, contributions, blockers, task candidates, and atoms from the transcript **given Foundation's current context**."

Foundation context supplied to each extraction LLM call:

- **Strategy snapshot** — current business strategy, BHAG, engine model, quarterly priorities.
- **People snapshot** — the `users` table (name, email, tier, role/pillar from strategy docs).
- **Decision history** — recent decisions, open questions, active contradictions from the decision layer.
- **Backlog snapshot** — current research / scoped / ranked / executing cards so the extractor can link task candidates to existing work instead of duplicating.
- **Source registry** — knows which sources are signed off, which are in drift, what each source owns.
- **Meeting metadata** — participants, calendar event title, recurring-series link, prior meeting in the same series.
- **Recent extractions from same participants or same pillar** — prevents restating what was already captured.

Context is pulled from Foundation DB and strategy docs at extraction time. No hardcoded prompts trying to be the knowledge layer. The LLM call's system prompt assembles this context fresh for each transcript.

Extraction output shape (per item):

```json
{
  "extraction_type": "decision|contribution|blocker|task_candidate|atom",
  "summary": "one-line plain language",
  "evidence": { "transcript_offset": ..., "speaker": "...", "quote": "..." },
  "links": { "related_decisions": [...], "related_backlog": [...], "pillar": "...", "participants": [...] },
  "min_tier": 1|2|3,
  "confidence": 0.0-1.0
}
```

All extractions land in the `extractions` table with full provenance. Low-confidence or ambiguous extractions go into a **review lane** (same pattern as `/api/owners/review-queue`) before becoming canon.

## Layer 5: Subject-Person Redaction and Uniform Response

**The rule that distinguishes this system from the old one:** Tiers alone are not enough. For every user, content **about that user** that is performance-concern, termination-risk, comp-discussion, or undisclosed-feedback must be suppressed from that user's view — even if their tier would otherwise grant access. This applies uniformly across all comms sources (meeting transcripts, emails, Slack, Missive), not just meetings.

### Extraction-side tagging

Every extraction gets two additional fields in `shared_communication_candidates.metadata`:

- `subject_people`: array of emails — who is this content ABOUT (distinct from participants; someone mentioned in a transcript is a subject even if not in the meeting)
- `sensitivity`: one of `neutral` | `positive` | `performance_concern` | `termination_risk` | `comp_discussion` | `undisclosed_feedback`

Sensitivity classification is an LLM judgment at extraction time, with explicit rubric in the prompt. Classifications can be reviewed in the `pending` lane before applying.

### Query-side filter

When a user (or their assistant, acting on their behalf) queries, the filter is:

```
suppress extraction X from user U's results if:
  U ∈ X.subject_people
  AND X.sensitivity ∈ {performance_concern, termination_risk, comp_discussion, undisclosed_feedback}
  AND NOT (X.source_meeting has X.is_performance_review_with(U) === true)
```

The exception covers performance reviews where the subject is present — they already know the topic.

### Uniform response shape

Critical rule: the shape of a response must not leak existence of suppressed content.

- Responses are always summaries. Never raw transcripts. Never "I can't show you X."
- If extractions were suppressed, the synthesis simply proceeds without them. The user does not see a "content omitted" marker.
- Raw-access requests (e.g. Ryan asks for meeting note X) are always answered with a filtered email summary, never with a Drive link. Same shape whether or not content was redacted for the requester.

### Access-request flow

1. User requests raw meeting access (UI button or email to system).
2. Crewbert retrieves the transcript + all extractions from that meeting.
3. Applies subject-person filter for the requester.
4. Composes an email summary of allowed extractions + transcript excerpt (redacted).
5. Sends email to requester from `crewbert@bensoncrew.ca`.
6. Logs the request + redaction decisions in the audit trail.

### Personal-assistant inheritance

Each leader's personal assistant (Harlan, Nick's assistant, Ryan's future assistant, etc.) inherits **their owner's tier** AND automatically applies subject-person filter **with their owner as the subject**. So Ryan's assistant can never surface performance-concern content about Ryan, even if Ryan's tier would otherwise allow it. Ryan cannot ask his assistant "did anyone mention me in this week's meetings" and get content that describes concerns about him.

## Layer 6: Query API

- `/api/query` endpoint. Inputs: natural-language question or structured filter. Outputs: tier-filtered + subject-redacted intelligence.
- Server-side flow:
  1. `assertTier(req, 3)` minimum (anyone who got through middleware).
  2. Look up matching extractions where `min_tier >= req.user.tier`.
  3. Apply subject-person redaction (Layer 5) with `req.user.email` as subject.
  4. Pull Foundation context (same context pool the extractor uses).
  5. LLM synthesizes answer from filtered extractions + context.
  6. Return answer + source-extraction IDs + confidence.
- Response shape is identical regardless of whether content was suppressed.
- Raw transcript content never returned — only extracted structured data plus tier-filtered + subject-redacted synthesized answers.

## Data Model

### New tables

```sql
CREATE TABLE users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier SMALLINT NOT NULL CHECK (tier IN (1, 2, 3)),
  active BOOLEAN NOT NULL DEFAULT true,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE TABLE meeting_notes (
  id BIGSERIAL PRIMARY KEY,
  calendar_event_id TEXT,
  vault_file_id TEXT NOT NULL,  -- Google Drive file ID in crewbert@ vault
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_participants TEXT[],
  source TEXT NOT NULL DEFAULT 'google-meet',
  metadata JSONB
);

CREATE TABLE extractions (
  id BIGSERIAL PRIMARY KEY,
  source_type TEXT NOT NULL,    -- 'meeting_note' | 'email' | 'missive' | 'slack'
  source_id BIGINT NOT NULL,     -- FK to meeting_notes.id or equivalent
  extraction_type TEXT NOT NULL, -- 'decision' | 'contribution' | 'blocker' | 'atom' | 'task_candidate'
  payload JSONB NOT NULL,
  min_tier SMALLINT NOT NULL CHECK (min_tier IN (1, 2, 3)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX extractions_source ON extractions (source_type, source_id);
CREATE INDEX extractions_tier ON extractions (min_tier, created_at DESC);
```

### `users` seed (ported from old `CLAUDE.md`)

```sql
INSERT INTO users (email, name, tier) VALUES
  ('steve.zahnd@bensoncrew.ca',    'Steve',   1),
  ('nick.bergmann@bensoncrew.ca',  'Nick',    2),
  ('carsonc@bensoncrew.ca',        'Carson',  2),
  ('ryanc@bensoncrew.ca',          'Ryan',    2),
  ('blake.berfelz@bensoncrew.ca',  'Blake',   2),
  ('scottb@bensoncrew.ca',         'Scott',   2),
  ('clare.manalo@bensoncrew.ca',   'Clare',   2),
  ('accounting@bensoncrew.ca',     'Ahsan',   2),  -- verify tier
  ('tanner.marsh@bensoncrew.ca',   'Tanner',  3),
  ('georgia.huntley@bensoncrew.ca','Georgia', 3);
```

## Implementation Sequence (for Codex)

| # | Step | Est |
|---|------|-----|
| 1 | Port `src/integrations/google-delegated-writes.ts` → `lib/google-delegated-writes.js` | 1–2 hr |
| 2 | Create `users`, `meeting_notes`, `extractions` tables + seed data | 30 min |
| 3 | Add Cloudflare Access email-header middleware to `server.js` | 30 min |
| 4 | Add `assertTier(req, minTier)` helper | 15 min |
| 5 | Retrofit existing `/api/*` endpoints with tier gates (the long one) | 2–3 hr |
| 6 | Provision vault folder under `crewbert@bensoncrew.ca` Drive + record ID | 30 min |
| 7 | Build meeting-capture job: Drive poll/webhook → move transcript + Gemini note to vault + record metadata | 2 hr |
| 8 | Build meeting-scout: calendar scan + auto-invite-request notification | 2–3 hr |
| 9 | Build **Foundation context assembler**: pulls strategy + users + decisions + backlog + source registry + recent extractions into a single context object for LLM calls | 2–3 hr |
| 10 | Build extraction layer: transcript + context → structured extractions (decisions / contributions / blockers / task candidates / atoms) with `min_tier` tagging | 3–4 hr |
| 11 | Build review lane for low-confidence extractions (same pattern as Owners review queue) | 1–2 hr |
| 12 | Build `/api/query` with tier-filtered lookup + context-aware synthesis | 1–2 hr |
| 13 | Add to `scripts/foundation-verify.mjs`: tier-leak test (Tier 3 can't read Tier 1 data) + context-assembly test | 1 hr |

Total: ~18–24 hours focused Codex time. (Up from earlier estimate — context-aware extraction is bigger than a naive Gemini-summary-parse, but it's the actual intelligence layer.)

**Order matters.** Steps 3–5 (auth middleware + tier gates) must land before step 6 (vault). Cloudflare Access + tunnel comes last, after the app enforces tiers internally.

## Test Plan

- **Unit:** tier filter returns correct subset for each tier on synthetic extractions.
- **Integration:** middleware rejects missing/invalid email header; accepts valid header → correct tier attached.
- **Integration:** meeting-note mover picks up a test Doc in a test folder and moves it silently.
- **Security regression:** Tier 3 user queries `/api/query` with a known Tier 1 extraction in scope — must not appear in result.
- **Verification:** add `PASS tier filter: tier 3 cannot read tier 1 data` to `foundation:verify`.

## Open Questions

1. **Ahsan's tier** — old `CLAUDE.md` said Tier 2 but he was listed as "accounting@bensoncrew.ca" not in the chatId table. Verify before seeding.
2. **Drive watch vs. poll** — Google Drive push notifications are more elegant but require a public HTTPS endpoint. Polling `ai@`'s Drive every N minutes is simpler for day 1. Start with poll.
3. **Vault retention** — archive raw transcripts forever, or age them out after N years? Recommend "forever for now, revisit later."
4. **`min_tier` assignment** — static rule per `extraction_type` (e.g., termination discussion → always Tier 1), or LLM-tagged per extraction? Recommend static rules first, LLM-tagged as enhancement.
5. **Transcript availability** — verify the current Google Workspace plan produces transcripts by default. If not, the extraction layer needs a fallback to raw recording + STT, which adds complexity.
6. **Context staleness** — Foundation context is pulled fresh per extraction call, but strategy docs change. Should extractions record a snapshot of the context used, for later audit? Recommend yes (store a hash/version ID in the extraction row).

## Not In Scope (Separate Specs)

- ClickUp task open/close on approved extractions (Hub work, not Foundation)
- Contribution-tracking UI (later, after extraction layer proves out)
- Atoms / overlays / Scopers full build (separate spec)
- Harlan personal assistant integration (separate spec when Harlan externalizes)

## Summary

Five layers: Cloudflare Access at the edge, tier middleware in the app, data vault owned by `crewbert@bensoncrew.ca`, **context-aware extraction** (transcript + Foundation knowledge → structured intelligence), and tier-filtered query API. `ai@` stays the public-facing meeting attendee; `crewbert@` holds the secrets. Tiers enforce what each human can see. The extraction layer reads raw transcripts with Foundation context — not Gemini's shallow summaries — so the output reflects what our business knows, not what a stranger would infer.

No raw transcripts, emails, or Slack threads ever reach a user through the app — only tier-filtered structured output derived from our system's full context.

This is the design the old system was reaching for and never closed. The new system can close it because Foundation is already built for source contracts, decisions, verified truth, and PostgreSQL-backed operating memory. This spec adds the confidentiality layer and the context-aware intelligence layer on top.

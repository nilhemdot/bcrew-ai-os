# Doc Cleanup And Consolidation Plan

Last updated: 2026-04-25
Status: Active operating plan

Use this doc for one question:

- how do we clean the repo without losing evidence or rewriting history?

## Current Inventory

As of 2026-04-25 closeout audit:

| Area | Count | Meaning |
|------|-------|---------|
| `docs/handoffs/` | 79 markdown files | Session checkpoints and reconstructed chat evidence |
| `docs/audits/` | 12 files | Strategy / rebuild / source audits |
| `docs/source-notes/` | 11 files | Source-specific operator notes |
| `docs/rebuild/` | 11 markdown files | Active rebuild operating docs plus plan history entry point |
| `docs/strategy/` | 9 files | Strategy packet/supporting docs |
| `docs/` total | 163 files / 149 markdown files | Full documentation surface |

Phase 1 has started:

- `docs/README.md` added as the top-level documentation authority map
- `docs/INDEX.md` generated as the full markdown inventory
- `docs/handoffs/INDEX.md` generated
- `docs/audits/INDEX.md` generated
- `scripts/generate-doc-indexes.mjs` added so indexes can be regenerated

Current cleanup gap:

- the indexes exist, but the active docs still need a one-by-one review pass so every major surface is either active truth, source note, evidence, superseded evidence, or backlog-worthy gap
- no Strategy Hub work should rely on floating handoff claims unless the claim has been promoted into the active truth set or a DB-backed backlog/decision record

This is not a delete problem first. It is a routing problem:

- active operating truth is mixed with evidence
- old checkpoints are useful but too easy to mistake for current plan
- some audits are superseded by later audits
- some handoffs contain source evidence that should not be lost
- the active plan should be readable in minutes, not buried in 70 checkpoint files

## Authority Model

Do not collapse the whole repo into one mega-doc.

Use this hierarchy instead:

1. Active truth lives in the active truth set below, source contracts, verifier checks, and DB-backed backlog/decisions/questions.
2. Source notes are operator references for specific sources.
3. Specs are design references until promoted into active truth or backlog gates.
4. Handoffs, audits, and research docs are evidence unless an active doc or backlog card explicitly promotes them.
5. Product/assets docs stay where they are; they are not rebuild doctrine unless linked from the active truth set.

If a builder finds a claim in an audit, handoff, or research note, they must ask: "where is this represented in active truth?" If the answer is nowhere, promote it or treat it as evidence only.

## Cleanup Principle

Do not delete historical artifacts unless they are duplicate, empty, or unsafe.

Instead:

1. Promote durable decisions into active docs or backlog.
2. Index handoffs and audits so they are searchable evidence, not operating doctrine.
3. Mark superseded docs clearly.
4. Keep the active plan small.
5. Move or rename only with `git mv` so history stays traceable.

## Active Truth Set

These are the docs a new builder should trust first:

- `docs/rebuild/current-plan.md` — what we are doing right now
- `docs/rebuild/current-state.md` — what is built, open, and blocked
- `docs/rebuild/intelligence-pipeline.md` — how archive, extraction, synthesis, action routing, hubs, and agents fit together
- `docs/rebuild/current-runtime-map.md` — runtime doctrine and what runs where
- `docs/rebuild/agent-architecture.md` — Harlan / Crewbert / agent boundaries
- `docs/rebuild/doc-cleanup-plan.md` — how evidence becomes truth without creating doc sprawl
- `docs/rebuild/owners-closeout.md` — exact Owners package closeout order
- `docs/system-strategy.md` — permanent system strategy
- `docs/source-registry.md` — source contract index

Everything else is supporting evidence unless explicitly linked from one of these.

## What To Keep

Keep these categories:

- Full conversation checkpoints that capture major strategic shifts.
- Handoffs tied to shipped code, commits, source validations, or current open work.
- Audits that contain unique findings not promoted elsewhere yet.
- Source-specific closeout evidence for FUB, Owners, marketing connectors, shared comms, and meeting/archive work.
- Old-system audits used as references for what to salvage and what not to rebuild.

Reason: these are evidence. They protect us from repeating mistakes and let future chats verify why a decision happened.

## What To Consolidate

Consolidate these categories:

- Multiple handoffs that say the same thing about shared-comms progress.
- Older audits whose recommendations were superseded by later verified reads.
- Half-plan / half-chat docs that mix operating truth with speculative brainstorming.
- Repeated "what is next" sections across handoffs.
- Repeated runtime / agent / OpenClaw debates that now have a settled doctrine.

Consolidation does not mean deleting the original on day one. It means:

1. Pull the durable point into the active doc.
2. Add a link back to the evidence file.
3. Mark the source file as `Archived / Superseded` in an index.

## Proposed Structure

### Active

Keep current active docs where they are:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/intelligence-pipeline.md`
- `docs/rebuild/current-runtime-map.md`
- `docs/rebuild/agent-architecture.md`
- `docs/rebuild/doc-cleanup-plan.md`
- `docs/rebuild/owners-closeout.md`
- `docs/system-strategy.md`
- `docs/source-registry.md`

### Evidence Archive

Keep evidence in place for now, but add indexes:

- `docs/handoffs/INDEX.md`
- `docs/audits/INDEX.md`

Each index row should include:

- file
- date
- category
- status: `active`, `supporting-truth`, `evidence`, `superseded-evidence`, `duplicate-candidate`, `needs-promotion`, `needs-reconciliation`
- one-line value
- promoted-to link, if any

Do not make every future chat read all handoffs. Make future chats read the active truth set and use indexes only when they need evidence.

### Optional Later Move

After the index is trusted, move old material into dated archive folders:

- `docs/handoffs/archive/2026-04/`
- `docs/audits/archive/2026-04/`

This is optional and should only happen after all links are checked.

## Cleanup Sequence

### Immediate Tactical Guardrail

Do not turn cleanup or router work into a 32-script rewrite.

The immediate Foundation-closeout build order is:

1. Keep verifier/runtime proof green while doc authority is cleaned.
2. Finish `SYSTEM-010` process control gaps: decommission, dead-man, cost/process visibility, and stop/pause controls for long miners and future agents.
3. Finish extraction control with paced miner v1, cursors, leases, retries, and current-day freshness.
4. Promote auth/tier/subject-person redaction from spec into implementation before any broad hub/query/assistant read surface.
5. Build Action Router v1 so synthesized items route to decisions, tasks, questions, contradictions, ignore/snooze, or owner-bound actions.
6. Close source-trust dependencies, including the strategy-used Owners slice.
7. Only then build Strategy Hub as the first consumer.

Definition of done for any built feature:

- registered in Foundation runtime/job status
- scheduled or explicitly marked manual
- supervised by worker/scheduler or clearly manual-only
- visible in Foundation status
- has last run, next run, and failure state
- failures surface in the dashboard

If a feature only exists as a script that Steve or a builder has to remember to run, it is not done.

Runtime activation should still be conservative. Activate only a few high-value jobs at a time:

- `foundation:verify`
- `shared-comms:coverage`
- deal-review queued runner
- synthesis/action-review proof as manual with explicit route and budget visibility until the action loop is governed
- one current-day sync lane if stable

LLM router MVP should include:

- executable router adapter per accepted subscription/API path
- credential registry
- `llm_calls` ledger
- probes for Claude Code Max, Claude setup-token/OAuth, OpenClaw/ChatGPT Pro, and direct APIs
- no blind round-robin quota farming
- no mass migration until route probes are classified and at least one real workload probe succeeds

Extraction control MVP should include:

- current-day lane before historical backfill
- source cursors
- source leases
- budgets
- retries
- pause switches
- bounded historical bites instead of giant manual backfill marathons

### Phase 1 — Inventory

Build a deterministic inventory script or one-time table:

- list every doc
- capture title, first heading, date, word count, git status
- classify by directory and filename
- flag likely duplicates by title and shared keywords

Output:

- `docs/handoffs/INDEX.md`
- `docs/audits/INDEX.md`

### Phase 2 — Promote Current Truth

Read the latest high-value handoffs/audits and promote only durable truth into active docs:

- runtime activation status
- LLM router and hub-dedicated capacity doctrine
- extraction team / current-vs-backfill lane
- Drive and Skool workers
- synthesis engine responsibilities
- marketing source lanes: Benson Crew, Zahnd Team Ag, Steve Zahnd, MarketMasters
- old-system salvage rules

Output:

- updated `current-plan.md`
- updated `current-state.md`
- updated `current-runtime-map.md`
- updated `intelligence-pipeline.md` if needed

### Phase 3 — Mark Superseded

For each audit/handoff:

- if fully promoted, mark `superseded`
- if still useful as evidence, mark `evidence`
- if still needed by active work, promote the durable claim into an active doc or DB card and mark the source file `needs-promotion` until that happens
- if duplicate, mark `duplicate-candidate`

Do not delete during this phase.

### Phase 4 — Backlog Alignment

Every durable open item found during cleanup must land in the DB-backed backlog or current plan.

Likely cards to verify or add:

- `RUNTIME-ACTIVATION-001`
- `RUNTIME-WORKER-001`
- `RUNTIME-SUPERVISOR-001`
- `RUNTIME-FIRST-JOBS-001`
- `LLM-AUTH-AUDIT-001`
- `LLM-CREDENTIAL-REGISTRY-001`
- `LLM-HUB-CAPACITY-001`
- `LLM-ROUTER-001`
- `EXTRACT-CONTROL-001`
- `EXTRACT-CURRENT-001`
- `EXTRACT-BACKFILL-001`
- `DRIVE-WORKER-001`
- `SKOOL-WORKER-001`
- `REPORT-MINING-001`
- `LEGACY-SYSTEM-AUDIT-001`
- `PLATFORM-INTEL-001`
- `CRM-RECRUIT-001`
- `FUB-AGENT-TOOLS-001`

If a card already exists, enrich it instead of duplicating it.

### Phase 5 — Link Check And Commit

Before calling cleanup done:

- run `npm run foundation:verify`
- run any doc/link check available
- run `git status -sb`
- commit the index + promoted truth together
- leave historical moves for a separate commit

## Rules Going Forward

- No new audit without an owner, status, and promoted-to path.
- No new handoff without "what changed", "what remains open", and "next exact step".
- Long chats get one handoff, not five overlapping ones.
- If a handoff creates a durable rule, promote it to an active doc before the session ends.
- If an audit is wrong or superseded, do not hide it. Mark it as superseded and link the correction.
- Active docs stay concise. Evidence stays indexed.

## What Not To Do

- Do not delete 70 handoffs blindly.
- Do not move files before creating indexes.
- Do not ask Steve to manually read all handoffs.
- Do not let Claude, Codex, or another chat treat old handoffs as current doctrine unless the active truth set links to them.
- Do not rebuild the doc system into a new knowledge base before the current repo has indexes and active-doc discipline.

## End State

A new builder should be able to answer:

- what is the current plan?
- what is built?
- what is open?
- what is evidence-only?
- which old claims were superseded?
- where did this decision come from?

Without reading 70 handoffs.

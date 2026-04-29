# Foundation Full Audit

Date: 2026-04-23

## Scope

This audit consolidates the earlier reset/clarity audits and re-checks the live repo against:

- the current canon in `docs/system-strategy.md`, `docs/rebuild/`, and `docs/source-registry.md`
- the current implementation in `lib/`, `public/`, `server.js`, and `scripts/`
- the old reference repo at `/Users/bensoncrew/bcrew-buddy-reference`
- the saved handoffs and prior audits already in this repo

## Straight Verdict

This is **not** a Frankenstein yet.

It **is** a trust-first rebuild with three clear states:

1. the doctrine is materially better than the old system
2. one real governed foundation slice exists now
3. the next intelligence layer is still mostly backlog and doctrine, not ported code

The real risk is no longer "we built the wrong thing."

The real risk is:

- stale claims staying in canon after live reality changes
- research and handoff residue growing faster than executable closure
- runtime/tooling debates distracting from the few package closures that actually matter

## What We Are Actually Rebuilding

The target is not "an agent swarm."

The target is a high-trust operating system for Benson Crew with four layers:

1. **Foundation**
   - strategy docs
   - source contracts
   - decisions
   - backlog
   - verification
2. **Governed source packages**
   - Owners
   - FUB
   - finance
   - KPI read rules
   - shared communications
3. **Shared intelligence substrate**
   - normalized communications
   - business atoms
   - overlays
   - scopers
4. **Later runtime / agent layer**
   - OpenClaw or another runtime as an execution shell
   - personal assistants
   - orchestrator
   - narrow acting agents

That layered model is still the right one.

## What Is Solid Right Now

- The strategy canon is tight and readable:
  - `docs/business-strategy.md`
  - `docs/strategy/*`
  - `docs/system-strategy.md`
- The rebuild has a real operating-memory layer:
  - `lib/foundation-db.js`
- The rebuild has real source contracts:
  - `lib/source-contracts.js`
- The rebuild has a real verification script:
  - `scripts/foundation-verify.mjs`
- The rebuild has one real governed workflow, not just talk:
  - `/api/owners/review-queue`
  - row-scoped admin review runner
  - row-scoped conditional review runner
- The rebuild has real decision infrastructure:
  - decision provenance
  - decision traceability
  - decision review queue

So the foundation is real.

## Hard Findings

### 1. The canon currently overstates system health

`docs/rebuild/current-state.md` still says the verification baseline "is passing" even though `npm run foundation:verify` failed during this audit because `npm run sheets:verify` failed on `Owners: CI Report B6`.

Evidence:

- `docs/rebuild/current-state.md:24`
- `scripts/sheets-structure-verify.mjs:226`
- live audit run on 2026-04-23:
  - `foundation:verify` failed
  - `sheets:verify` ended at `179/180`
  - failing check: `Owners: CI Report B6`

This matters because once canon claims green while the verifier is red, the trust layer starts lying.

### 2. The backlog is still structurally under-executed

Current live backlog snapshot during this audit:

- `136` total
- `100` in `research`
- `10` in `scoped`
- `6` in `ranked`
- `3` in `executing`
- `13` in `done`

This is better than "nothing exists," but still too research-heavy for a system that wants closure discipline.

Evidence:

- live `getFoundationSnapshot()` read during this audit

### 3. The queue architecture still hardcodes `dev` and `marketing`

The earlier audit finding is still real in live code and schema:

- backlog creation UI still defaults to `dev` / `marketing`
- database schema still constrains `team` to those two values
- there is already a backlog card describing this as architecture debt

Evidence:

- `public/foundation.js:2597`
- `lib/foundation-db.js:1412`
- `lib/foundation-db.js:3242`

This is the clearest sign that the rebuild still carries temporary scaffolding in a place that should already be canonical.

### 4. Shared communications and atoms are still mostly doctrine, not implementation

The current plan correctly says the next foundation layer is:

- shared communications ingestion
- business atoms
- overlays
- scopers

But in the current repo there are no real shared-communications readers or atom/scoper implementation files under `lib/`, `scripts/`, or `public/`.

By contrast, the old repo already had working reads and skill patterns for:

- Missive
- Gmail/email intelligence
- Google delegated readers
- meeting filing
- Slack/feedback extraction

Evidence:

- `docs/rebuild/current-plan.md:89`
- new repo code search during this audit returned no `missive`, `communication`, `atom`, `overlay`, or `scoper` implementation files in `lib/`, `scripts/`, or `public/`
- old repo has:
  - `src/integrations/missive.ts`
  - `src/integrations/google-delegated.ts`
  - `skills/bcrew-email-intelligence/SKILL.md`
  - `skills/bcrew-meeting-filer/SKILL.md`

This means the rebuild is not overbuilt here. It is under-ported.

### 5. Repo-truth discipline is weaker than the written rules

The workspace says handoffs should be committed and pushed in the same turn, but the current worktree is heavily dirty and includes many modified canonical files plus many untracked docs/handoffs.

Volume snapshot:

- `58` handoff files
- `4` audit files before this one
- `7` rebuild docs
- `7` source notes

Volume alone is not the problem.

The problem is that too much current truth is sitting in a dirty worktree instead of a clearly locked repo state.

Evidence:

- `docs/handoffs/README.md`
- `git status --short` during this audit

### 6. The new repo avoided old-system swarm sprawl, which is good

The old reference repo still shows exactly the failure mode you want to avoid:

- `100` agent definitions
- `91` marked `WORKING`
- many specialist skills, bridges, and orchestration surfaces

Evidence:

- `/Users/bensoncrew/bcrew-buddy-reference/src/agent-registry.ts`
- audit count run on 2026-04-23

This is important because it means the new repo has **not** repeated the old swarm mistake yet.

The current problem is not "too many live agents."

The current problem is "too much doctrine and residue before the next small set of real code closures."

## Old System vs New System

### What the old system got right

- real source-reading instincts
- real meeting/email/slack intelligence patterns
- real skill decomposition
- strong ideas around atoms, scopers, and decision codification

### What the old system got wrong

- massive agent sprawl
- too many "working" claims
- runtime complexity outrunning trust
- hard-to-audit operational state

### What the new system got right

- foundation-first order
- source-contract doctrine
- docs vs live-value separation
- DB-backed operating memory
- better architectural boundaries

### What the new system is still missing

- selective porting of the few old adapters that mattered most
- closure on the Owners/FUB/finance/KPI package chain
- canon compression and repo-truth discipline
- a green verifier that stays green

## Consolidated Read On Earlier Audits

The earlier audits were mostly directionally correct.

The main updates from this audit are:

1. the system has advanced beyond "foundations are only theoretical"
2. `FOUNDATION-VERIFY-001` is built, but today it is not green
3. the hardcoded backlog-scope problem is still alive
4. shared communications / atoms / overlays / scopers remain the next major gap
5. the biggest current danger is canon drift plus residue, not missing vision

## Canon Compression

If you want a tight ship, treat these as the active canon:

- `docs/system-strategy.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/owners-closeout.md`
- `docs/source-registry.md`
- this audit

Everything else should be treated as one of:

- supporting note
- source note
- handoff/archive
- research/reference

The rule should be:

- if a doc does not own a unique decision, boundary, or source map, it should not gain more status

## Recommendation On Runtime Choice

Do **not** pivot to a new runtime right now.

Do **not** build an APEX-style orchestration framework right now.

Do **not** rebuild the whole stack around Claude Code SDK right now.

The right call is:

1. keep the current runtime doctrine:
   - Foundation first
   - OpenClaw remains the planned later runtime
   - Codex / Claude Code remain implementation tools
2. port the old high-value source readers as runtime-agnostic modules
3. only revisit runtime architecture after one narrow shared-intelligence loop is real

Why:

- the blocker is not runtime capability
- the blocker is foundation package closure and selective adapter porting
- a runtime pivot now would recreate old-system distraction under a new name

## Post-Foundation Architecture Research

The architecture answer after Foundation should be **hybrid**, not all-in on one product.

### What current tools are actually good for

#### OpenClaw

Best fit:

- live channels
- runtime supervision
- health/status checks
- plugin ecosystem
- agent-facing memory files
- operator-visible runtime shell

Current official docs still support that reading:

- plugin system is broad and runtime-oriented
- bundle support can map Codex/Claude/Cursor-style plugin layouts into OpenClaw
- health/status are first-class operational surfaces
- memory remains human-readable and workspace-based, with optional wiki and backend upgrades

That makes OpenClaw a good **runtime shell**, not a replacement for the Foundation trust layer.

#### OpenAI Agents SDK

Best fit:

- code-first internal workers
- controlled orchestration inside your own app
- specialist agents where your app owns state, approvals, and tool execution
- hosted tool leverage when useful:
  - web search
  - file search
  - sandbox/container-style execution

This is strongest when you want agents as **application workers**, not as the entire business runtime.

#### Claude Agent SDK / Claude Code subagents

Best fit:

- repo-local coding agents
- development automation
- agents that need built-in file read/edit/command execution
- project-specific subagents checked into a repo

This is a strong implementation harness, especially for code and terminal-native work.

It is not the best choice for the primary multi-channel Benson Crew business runtime.

### Recommended stack after Foundation

#### Layer 1: Keep Foundation as the permanent core

- source contracts
- source-backed views
- PostgreSQL business memory
- decisions
- backlog
- approvals
- verification

This remains custom and repo-owned.

#### Layer 2: Keep runtime shell separate

Use OpenClaw for:

- Telegram / WhatsApp / live channels
- session routing
- runtime health
- supervised long-running agents
- lightweight agent memory

Important current local-state read:

- OpenClaw is installed locally and still minimal
- the config is effectively channel + model routing only
- native memory baseline is still not turned on

That is a sign to keep OpenClaw as a later runtime shell, not to force the whole rebuild into it prematurely.

#### Layer 3: Add worker engines selectively

Use SDK workers for narrow jobs:

- OpenAI Agents SDK:
  - deep research workers
  - search-heavy synthesis workers
  - containerized specialist jobs when sandboxing helps
- Claude Agent SDK / Claude Code:
  - repo coding workers
  - code review
  - refactor / implementation specialists

These should be called by your system, not allowed to become the system.

#### Layer 4: Keep orchestration logic in your own app

Do **not** outsource the business brain to a runtime vendor.

Keep these in your own repo and database:

- queues
- job records
- approvals
- audit trails
- source-boundary rules
- review lanes
- supersession and decision logic
- atom approval state

That is the real moat.

### What not to build next

- not a full custom APEX-style orchestration platform before one narrow agent loop is proven
- not a Claude-only runtime pivot
- not a second Foundation hidden inside OpenClaw or Claude config files
- not a giant persona roster

### The right first agent path after Foundation

1. shared communications ingestion
2. normalized communication records
3. extraction review lane
4. first `business_atoms` slice
5. first Scoper
6. one narrow read-mostly agent loop
7. only then personal assistants and broader orchestration

The first narrow loop should be something like:

- decision/task/blocker extraction from shared comms into review
or
- meeting-note / inbox synthesis into approved atoms

Not:

- an always-on executive super-agent
- broad autonomous team management
- acting agents that write into many business systems at once

## Recommended Next Steps

### 1. Re-establish red/green truth

- fix the `sheets:verify` baseline drift
- then make `docs/rebuild/current-state.md` truthful again
- do not let "is passing" sit in canon while the verifier is red

### 2. Close one real business package end-to-end

In this order:

1. `SOURCE-008`
2. Owners package closeout chain
3. `FOUNDATION-003`
4. `SOURCE-010`
5. `SOURCE-014` package closeout

This is the shortest path to a genuinely trusted foundation.

### 3. Fix root queue architecture before more hubs

- remove `dev` / `marketing` hardcoding from schema, API, and UI
- move to data-driven scope ownership
- reduce the research pile before adding more conceptual surfaces

### 4. Port the old readers selectively, not the old swarm

First port:

- Google delegated readers that still matter
- Missive bridge
- meeting-note/transcript ingestion primitives

Do **not** port:

- the old agent roster
- persona swarm logic
- runtime theater

### 5. Build one narrow shared-intelligence slice

The next real substrate should be:

1. shared communications ingestion
2. normalized records
3. extraction review
4. first `business_atoms` slice

Only after that should overlays and Scopers move from doctrine into code.

### 6. Leave `ME.md` until after the foundation reset pass

That file is valuable, but it is downstream of this audit.

Right now the system needs:

- trust
- closure
- canon compression
- the next two real code packages

`ME.md` should come after the operating foundation is back in a clean, truthful state.

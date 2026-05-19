# GStack Codebase Extraction Packet

Date: 2026-05-13  
Owner: Codex  
Status: backlog-ready packet, not yet written into live backlog  
Source mode: read-only extraction, proposal-only routing

## Source Identity

- Repository: https://github.com/garrytan/gstack
- Local mirror: `/tmp/gstack-research`
- Commit inspected: `dc6252d1df7f1f650ea6e9b2bba7d08fab5de902`
- Verified public signals on 2026-05-13: about 95,418 stars, 14,160 forks, MIT license
- Press context: TechCrunch covered the repo as Garry Tan's Claude Code setup on 2026-03-17

## Why This Matters

Steve's message called out the right operating pattern: the AIOS should monitor GitHub, Codex Community, Claude Code Community, OpenClaw, and adjacent build-system communities because high-signal builders are publishing full working systems in public.

GStack is not valuable because it should be copied into the AIOS. It is valuable because it is a complete public example of a mature AI coding operating system: skills, browser tooling, review gates, QA flows, Codex/OpenClaw adapters, memory sync, and workflow discipline are all visible in one repo.

The right extraction path is:

1. Treat GStack as a public source artifact.
2. Inventory patterns by system area.
3. Convert useful patterns into Research Inbox proposals.
4. Promote approved proposals into AIOS backlog cards.
5. Avoid importing unreviewed code, hidden assumptions, or someone else's operating doctrine as active truth.

## Tandem Boundary

This packet is safe to do while the Build Intel extraction builder continues because it does not modify the active implementation files or current sprint scripts.

Do now:

- Source-backed extraction packet.
- Backlog-ready card definitions.
- Research Inbox proposal shapes.
- Initial pattern inventory.

Do after the current builder finishes proof:

- Insert these items into live `backlog_items`.
- Wire GitHub/community monitoring into the Build Intel source catalog.
- Add verifier checks if new source/provenance rules are approved.

Do not do now:

- Install GStack into this repo.
- Copy skills wholesale.
- Replace AIOS doctrine with GStack doctrine.
- Write live backlog rows during another builder's proof window if their verifier depends on stable backlog counts.
- Enable autonomous development from outside sources.

## Extraction Surfaces Found

High-signal repo areas:

- `skills/*/SKILL.md` - about 45 specialist skills, including planning, review, QA, browser, Codex, OpenClaw, context save/restore, learning, shipping, and upgrade flows.
- `README.md` - public workflow map from planning through ship and reflection.
- `AGENTS.md` - skill registry and command surface.
- `docs/OPENCLAW.md` - OpenClaw integration and dispatch tiers.
- `docs/gbrain-sync.md` - private memory/repo sync pattern.
- `openclaw/gstack-lite-CLAUDE.md` - lightweight planning discipline for OpenClaw.
- `package.json` - dev scripts, eval scripts, browser dependencies, and CLI entrypoints.
- `evals/`, `benchmarks/`, `tests/` - quality gates and regression surfaces.

## High-Value Patterns To Extract

### 1. GitHub And Community Monitor

Observation: Steve's source list should become a durable Build Intel lane, not an ad hoc reminder.

AIOS fit:

- Track selected public repos, release notes, stars/forks velocity, issues/discussions, and high-signal community posts.
- Start with manual or semi-automated scout reports before any automated ingestion.
- Keep this proposal-only until source contracts and scoring are explicit.

Backlog candidate: `BUILD-INTEL-GITHUB-MONITOR-001`

### 2. GStack Full Extraction

Observation: The repo is large enough to require a structured extraction sprint rather than opportunistic browsing.

AIOS fit:

- Build a source map of repo surfaces.
- Score each pattern by AIOS relevance, implementation complexity, and doctrine fit.
- Convert accepted findings into Research Inbox proposals.

Backlog candidate: `GSTACK-EXTRACTION-001`

### 3. Skill Improvement Loop

Observation: GStack treats skills as first-class operational units with update checks, usage constraints, routing, and self-improvement.

AIOS fit:

- Compare AIOS skills, AGENTS rules, and Codex operating habits against GStack's skill discipline.
- Extract only the patterns that improve clarity, routing, or verification.

Backlog candidate: `SKILL-IMPROVER-GSTACK-ENRICHMENT-001`

### 4. Review Gate Upgrade

Observation: GStack has specialist review paths for CEO, engineering, design, security, devex, planning, and shipping.

AIOS fit:

- Add review modes where they map to real AIOS accountability surfaces.
- Keep reviewers as checklists and proof gates first, not fake org chart expansion.

Backlog candidate: `REVIEW-GATE-UPGRADE-001`

### 5. Browser QA Proof Loop

Observation: GStack makes browser-based QA an explicit skill and workflow, not just a developer preference.

AIOS fit:

- Strengthen frontend proof expectations for Foundation dashboard changes.
- Capture browser screenshots, interaction checks, and nonblank checks where applicable.

Backlog candidate: `BROWSER-QA-PROOF-001`

### 6. Context Save And Restore

Observation: GStack separates context-save and context-restore into explicit skills.

AIOS fit:

- Compare this against AIOS handoff discipline, daily memory, and `docs/handoffs/`.
- Add a compact, repeatable closeout pattern for long chats and implementation sprints.

Backlog candidate: `CONTEXT-SAVE-RESTORE-001`

### 7. Agent Workflow Roles

Observation: GStack's workflow breaks work into planning, implementation, review, QA, ship, and retro phases.

AIOS fit:

- Map roles to AIOS phases and Foundation views.
- Avoid creating more persona labels unless they produce better evidence or handoffs.

Backlog candidate: `AGENT-WORKFLOW-ROLES-001`

### 8. Guard, Freeze, And Safety Rails

Observation: GStack has explicit guard/freeze-style workflows to slow down risky edits and preserve context.

AIOS fit:

- Strengthen AIOS rules around destructive commands, source-truth drift, active-builder conflicts, and concurrent work.
- Convert repeated safety rules into verifiers where possible.

Backlog candidate: `AIOS-GUARD-FREEZE-001`

### 9. Private Repo Memory Sync

Observation: GStack's `gbrain` concept treats memory and learnings as syncable but private state, with exclusions for credentials and machine-local data.

AIOS fit:

- Compare against local-only `memory/`, `MEMORY.md`, `USER.md`, and repo-tracked docs.
- Tighten the boundary between repo truth and private workspace truth.

Backlog candidate: `PRIVATE-MEMORY-SYNC-001`

### 10. Eval And Benchmark Harness

Observation: GStack ships eval and benchmark surfaces around model behavior and workflow quality.

AIOS fit:

- Add lightweight checks for skill changes, source extraction quality, and handoff completeness.
- Start with narrow verifier checks, not a broad eval platform.

Backlog candidate: `AIOS-EVAL-HARNESS-001`

### 11. OpenClaw Dispatch Tiers

Observation: GStack documents simple, medium, heavy, full, and plan dispatch tiers for OpenClaw.

AIOS fit:

- Useful as a reference for routing work by complexity.
- Should be translated into AIOS language before use.

Backlog candidate: `OPENCLAW-DISPATCH-TIERS-001`

## Backlog-Ready Rows

Recommended first insertion set after the active builder finishes:

| ID | Priority | Lane | Title | Next action |
| --- | --- | --- | --- | --- |
| `GSTACK-EXTRACTION-001` | P1 | scoped | Extract Garry Tan GStack into AIOS proposals | Build the source map, score patterns, and promote accepted findings into Research Inbox proposals. |
| `BUILD-INTEL-GITHUB-MONITOR-001` | P1 | research | Add GitHub/community monitoring to Build Intel | Define the first watchlist for GitHub repos and AI coding communities, with source contracts and proposal-only output. |
| `SKILL-IMPROVER-GSTACK-ENRICHMENT-001` | P1 | research | Enrich AIOS skill improver from GStack patterns | Compare GStack skill structure against AIOS skills and propose only doctrine-fit improvements. |
| `REVIEW-GATE-UPGRADE-001` | P1 | research | Upgrade AIOS review gates from specialist workflow patterns | Extract review modes that improve Foundation proof, owner review, design review, and ship discipline. |
| `BROWSER-QA-PROOF-001` | P1 | scoped | Add browser QA proof expectations for dashboard work | Define when local browser proof, screenshots, and interaction checks are required before signoff. |
| `CONTEXT-SAVE-RESTORE-001` | P2 | research | Improve AIOS context save and restore discipline | Compare GStack context skills to AIOS memory and handoff rules, then propose a small closeout standard. |
| `AIOS-GUARD-FREEZE-001` | P2 | research | Convert guard and freeze patterns into AIOS safety rails | Identify checks that prevent unsafe concurrent edits, source-truth drift, or destructive commands. |
| `AIOS-EVAL-HARNESS-001` | P2 | research | Scope lightweight AIOS eval harnesses | Define small verifier checks for skills, extraction quality, and handoff completeness. |

## Research Inbox Proposal Shape

Each finding should use this structure before becoming a backlog item:

```json
{
  "source_id": "SRC-GITHUB-BUILD-INTEL-001",
  "source_url": "https://github.com/garrytan/gstack",
  "source_commit": "dc6252d1df7f1f650ea6e9b2bba7d08fab5de902",
  "proposal_only": true,
  "writes_backlog": false,
  "pattern": "short name",
  "evidence": ["file path", "line or section reference"],
  "aios_fit": "why this should or should not map to AIOS",
  "risk": "what could go wrong if copied blindly",
  "recommended_route": "backlog | source contract | verifier | no action"
}
```

## Suggested Source Contract

Initial source ID:

- `SRC-GITHUB-BUILD-INTEL-001`

Initial repo artifact:

- `GITHUB-REPO-GSTACK-001`

Fields to capture:

- Public GitHub repo URL.
- Commit SHA inspected.
- License.
- Last checked timestamp.
- Extraction scope.
- Allowed use: read-only pattern extraction, proposal generation.
- Disallowed use: wholesale code import, automatic install, doctrine overwrite, credentialed scraping.

## First Sprint Shape

Name: GStack codebase extraction sprint  
Duration: 1 focused pass  
Output:

- Source map.
- Pattern scorecard.
- 5 to 10 Research Inbox proposals.
- 3 to 5 promoted backlog candidates.
- Handoff summarizing what was rejected and why.

Acceptance:

- Every promoted item cites a repo path and commit.
- Every item names AIOS fit and risk.
- No GStack code is copied into production paths.
- No proposal writes directly to backlog without Steve/Codex approval.

## Recommendation

Start with `GSTACK-EXTRACTION-001` and `BUILD-INTEL-GITHUB-MONITOR-001`.

Those two cards create the operating loop Steve is asking for:

1. Extract value from this specific public codebase.
2. Make sure the AIOS keeps noticing future public systems before they become stale discoveries.

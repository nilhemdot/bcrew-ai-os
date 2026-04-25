# Full System Closeout Audit

Status: evidence
Last updated: 2026-04-25

This audit exists because Steve asked for an end-to-end cleanup pass before Foundation keeps expanding.

It does not replace the current plan. It records what was inspected, what was fixed immediately, and what still needs deeper line-by-line review.

## Coverage So Far

New `bcrew-ai-os` repo:

- tracked files before this audit patch: `251`
- tracked lines before this audit patch: `123079`
- tracked markdown files: `149`
- tracked markdown lines: `54529`
- tracked JS/MJS files syntax-checked: `63`
- tracked code/app files counted across JS/MJS/SH/SQL/HTML/CSS: `74`
- tracked code/app lines across JS/MJS/SH/SQL/HTML/CSS: `51975`

Documentation:

- added `docs/README.md` as the authority map
- added generated `docs/INDEX.md` so every markdown doc is visible and classified
- updated `scripts/generate-doc-indexes.mjs` so handoffs, audits, source notes, specs, strategy docs, research docs, design notes, and active docs do not blur together

Live/local memory:

- main repo long-term memory: `/Users/bensoncrew/bcrew-ai-os/MEMORY.md`
- main repo daily memory: `/Users/bensoncrew/bcrew-ai-os/memory/YYYY-MM-DD.md`
- Unchained local memory: `/Users/bensoncrew/unchained-realtor/MEMORY.md`
- per `AGENTS.md`, these memory files are local-only workspace state, not repo truth

Old/local systems inventoried:

| Path | Role | Files, excluding deps | Markdown | JS/TS |
|------|------|-----------------------|----------|-------|
| `/Users/bensoncrew/.inspection/BCrew-Buddy` | old BCrew Buddy system | 1847 | 1271 | 120 |
| `/Users/bensoncrew/.inspection/bcrew-skills` | old skill/team library | 2561 | 308 | 321 |
| `/Users/bensoncrew/.inspection/zahnd-team-dashboard` | KPI / dashboard system | 280 | 4 | 148 |
| `/Users/bensoncrew/.openclaw/workspace` | OpenClaw workspace | 8 | 7 | 0 |
| `/Users/bensoncrew/unchained-realtor` | Unchained local project | 4 | 4 | 0 |

Those systems are inventoried, not fully line-read in this pass yet.

## Immediate Fixes Made

1. Documentation authority was missing.

Fix:

- added `docs/README.md`
- added `docs/INDEX.md`
- linked both from root `README.md`
- upgraded the index generator to classify docs globally, not only handoffs and audits

2. Active runtime doctrine was stale.

Fix:

- updated `docs/system-strategy.md`
- updated `docs/rebuild/current-runtime-map.md`
- updated `docs/rebuild/current-plan.md`

Current doctrine:

- Foundation is the truth and control layer
- BCrew router owns model/runtime decisions
- OpenClaw is one live channel/runtime adapter, not the whole OS
- Codex and Claude Code are coding/investigation tools and possible supervised adapters, not the business OS
- subscription/native routes are internal capacity lanes only when allowed, probed, paced, logged, and policy-classified
- official APIs remain the default for production/customer-facing automated work unless a native/subscription route is explicitly approved

3. Active docs referenced missing backlog cards.

Fix:

- added and seeded `RUNTIME-ACTIVATION-001`
- added and seeded `RUNTIME-WORKER-001`
- added and seeded `RUNTIME-SUPERVISOR-001`
- added and seeded `RUNTIME-FIRST-JOBS-001`
- added and seeded `EXTRACT-CONTROL-001`
- added and seeded `EXTRACT-CURRENT-001`
- added and seeded `EXTRACT-BACKFILL-001`
- added and seeded `DRIVE-WORKER-001`
- added and seeded `SKOOL-WORKER-001`
- active read-first docs now reference `96` backlog/source IDs and all resolve to either DB backlog or source contracts

4. Legacy/full-system audit needed its own durable card.

Fix:

- added and seeded `LEGACY-SYSTEM-AUDIT-001`
- this owns line-reading the old systems and promoting only durable rebuild truth

5. Broad read surfaces were under-gated.

Fix:

- added `requireAdminToken` to source-of-truth and doc reads
- kept FUB reads, Owners reads, sheet structure, Foundation hub, system inventory, changes, and doc updates admin-gated
- added browser token forwarding through `BCREW_ADMIN_TOKEN` in localStorage for Foundation, Ops, doc viewer, Strategic Execution, strategy export, and home status reads
- updated verifier coverage for the broader gate

Localhost remains frictionless because `requireAdminToken` allows local requests. Non-local access now requires the admin token stop-gap until `SECURITY-002` is complete.

6. P0/P1 safety bugs surfaced during parallel code audit.

Fix:

- local admin bypass now uses socket locality only; it no longer trusts spoofable Host headers
- dashboard binds to `127.0.0.1` by default unless `HOST` is explicitly set
- strategy PDF export is admin-gated and browser downloads forward the admin token
- generic FUB proxy mutations are disabled unless `FUB_PROXY_ALLOW_MUTATION=true` is set for a supervised run
- doc-update apply blocks a dirty repo and uses `git commit --only` so it cannot commit unrelated staged work
- markdown-rendered links in Foundation, Strategic Execution, and doc viewer disable unsafe schemes and isolate external links
- shared-communications candidate apply now row-locks the candidate and refuses already-applied / non-review states
- source crawl target finish now requires the matching lease owner, and source crawl item events use the actual DB row key
- LLM router now refuses non-runnable live routes instead of executing a `probe_required` route just because it sorts first

7. Backlog was enriched from the audit instead of leaving findings in chat.

New or enriched cards:

- `DOC-AUTHORITY-001`
- `DB-SEED-001`
- `CRAWL-RUN-LEDGER-001`
- `DB-CONSTRAINT-001`
- `LEGACY-SYSTEM-AUDIT-001`

## Current Risk Register

1. This was not yet a full legacy line-by-line audit.

The old systems are large enough that they need their own salvage pass:

- BCrew-Buddy old docs and memory
- old skill/team library
- KPI / Supabase / Lee integration code in the dashboard system
- Unchained local project
- OpenClaw workspace and runtime config

2. `docs/INDEX.md` classifies the doc surface, but old evidence still needs promotion decisions.

The main risk is not that old docs exist. The risk is building from old evidence without promoting it into active docs, source contracts, or DB backlog first.

3. DB seed/live truth is still split.

The immediate safety bugs are fixed, but the seed/live migration problem remains open under `DB-SEED-001`.

4. Broad auth remains an interim stop-gap.

`requireAdminToken` is enough for local/non-local separation, but not the final auth/tier/privacy layer. `SECURITY-002` still owns proper auth, tier filtering, subject-person redaction, and query access rules.

5. Memory is still split.

The repo has local assistant memory files and DB-backed operating memory. The real memory spine still needs:

- intelligence job ledger
- atom schema
- chunk-level lexical retrieval
- pgvector semantic retrieval
- hybrid evidence API
- action routing back into decisions/tasks/questions/contradictions

6. Full line-by-line review remains open for the external systems.

The right next audit lane is not more chat debate. It is a bounded salvage audit that reads old-system roots and promotes only durable truth into this repo.

## Next Audit Lanes

1. Finish new-repo code audit by module group:

- `server.js`
- `lib/foundation-db.js`
- `lib/llm-router.js`
- source connectors in `lib/`
- Foundation worker/job scripts
- deal review scripts
- extraction/shared-comms scripts
- browser UI files under `public/`

2. Run legacy salvage audit:

- old BCrew Buddy docs and memory
- old skills with names, purposes, inputs, outputs, and salvage value
- old KPI/Supabase/Lee-FUB integration architecture
- Unchained local notes
- OpenClaw runtime config and memory behavior

3. Promote only real durable findings:

- active docs when doctrine changes
- DB backlog when work remains
- source registry/source notes when a source contract changes
- specs when a build contract needs detail

4. Close or merge stale cards after evidence review.

No backlog card should stay open just because an old audit mentioned it.

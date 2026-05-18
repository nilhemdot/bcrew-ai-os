# MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 Packet

Card: `MATT-POCOCK-CLAUDE-FOLDER-EVAL-001`  
Closeout key: `matt-pocock-claude-folder-eval-v1`  
Mode: public GitHub/source eval only

## Source Identity

| Field | Value |
| --- | --- |
| Creator | Matt Pocock / Total TypeScript |
| Creator watchlist ID | `matt-pocock-total-typescript` |
| Source ID | `SRC-GITHUB-BUILD-INTEL-001` |
| Related YouTube source | `SRC-YOUTUBE-INTEL-001` |
| Repo | https://github.com/mattpocock/skills |
| Repo description | Skills for real engineering from a public `.claude` skills folder |
| Default branch | `main` |
| Commit inspected | `67bce91c80cd1020a4f068ced32d0281656842ad` |
| License | MIT |
| Stars at lookup | 91765 |
| Forks at lookup | 8049 |
| Open issues at lookup | 40 |
| Last pushed at lookup | 2026-05-18T12:21:29Z |

## Public Repo Shape

| Field | Value |
| --- | --- |
| Blob files | 66 |
| `SKILL.md` files | 28 |
| Plugin-exposed skills | 14 |
| ADR files | 1 |
| Helper scripts | 4 |

## Inspected Public Files

| Surface | Examples |
| --- | --- |
| Agent instructions | `CLAUDE.md`, `.claude-plugin/plugin.json` |
| Markdown memory | `CONTEXT.md`, `docs/adr/0001-explicit-setup-pointer-only-for-hard-dependencies.md` |
| Engineering skills | `tdd`, `diagnose`, `grill-with-docs`, `improve-codebase-architecture`, `setup-matt-pocock-skills`, `to-issues`, `to-prd`, `triage` |
| Productivity/misc skills | `handoff`, `git-guardrails-claude-code` |
| Scripts | `scripts/list-skills.sh`, `scripts/link-skills.sh` |

## Transfer Candidates

| Candidate | AIOS use | Route |
| --- | --- | --- |
| small_composable_skills | Keep capabilities narrow, registry-owned, and composable instead of one broad prompt blob. | Enrich agent capability/template doctrine if reopened |
| setup_before_dependent_skills | Require setup/readiness gates before tools claim issue-tracker, label, source, or domain-doc authority. | Future capability setup gate proposal |
| domain_glossary_and_adr_memory | Useful markdown-memory pattern, but AIOS should map it into source-backed KB/compiler gates. | `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001` / `KNOWLEDGE-BASE-QUALITY-GATE-001` enrichment |
| feedback_loop_first_debugging | Matches Foundation doctrine: focused behavior proof first, full ship gate second. | Plan Critic and focused proof enrichment |
| handoff_compaction_not_long_term_memory | Useful for chat continuity, not a replacement for live backlog/source/KB truth. | Chat archive and handoff discipline enrichment |
| ninety_day_context_claim_unverified | No 90-day context-retention pattern was found in the public repo scan. | Blocked claim; no implementation |

## Boundaries

- Do not install the repo, run `npx skills`, install a plugin, or create skill symlinks.
- Do not copy raw `SKILL.md`, README, scripts, prompts, or course material into AIOS runtime surfaces.
- Do not mutate Claude/Codex config.
- Do not fetch YouTube transcripts, capture screenshots/keyframes, download videos, summarize video/course content, or call models.
- Do not use paid course access, private auth, authorized browser sessions, comments, or community data.
- Do not write Research Inbox, KB, atoms, synthesis facts, action routes, vectors, query indexes, backlog content from source material, or external systems.

## Unverified

- The public repo scan did not find a 90-day context-retention pattern. Treat that claim as unverified until a source-backed artifact proves it.
- Public YouTube and paid/course content were not extracted.
- Repo skills were not installed, imported, copied, or adapted into AIOS.

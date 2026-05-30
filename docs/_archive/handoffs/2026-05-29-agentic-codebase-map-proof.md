# Agentic Codebase Map Proof

Date: 2026-05-29
Card: `AGENTIC-CODEBASE-MAP-001`

## What Changed

Added an AIOS-owned read-only repo-map proof for future Codex/Claude/build agents.

The map is deterministic and local-only. It scans explicit repo roots, summarizes file paths, categories, surfaces, sizes, imports/exports, markdown headings, package scripts, critical surfaces, and file-size risks.

## Why

Steve asked for a better way to move between long chats and builders without losing repo context. Better Stack / Understand-Anything was reviewed and found useful, but the safe first move is not to install a third-party plugin into Codex/Claude tool state. This gives future agents a governed AIOS-native map first.

## Boundaries

- No third-party plugin install.
- No symlinks into Codex, Claude, Cursor, VS Code, or user-level tool folders.
- No generated `.understand-anything/knowledge-graph.json` committed.
- No private/local memory reads: `MEMORY.md`, `USER.md`, `TOOLS.md`, `memory/`, `.openclaw/`, `.claude/`, `.env`.
- No conversation archive or `_archive` scan.
- No model/provider call, browser run, source extraction, backlog write, or external write.

## Proof

```bash
node --check lib/agentic-codebase-map.js scripts/process-agentic-codebase-map-check.mjs
npm run process:agentic-codebase-map-check -- --json
```

Latest focused proof returned healthy:

- 2,575 mapped files
- 13/13 critical source/extractor/runtime surfaces present
- 7 oversized-file risk flags surfaced for future split work
- private/local/archive paths excluded
- dogfood rejects private leaks and missing critical surfaces
- done-card verifier coverage registered in `lib/foundation-verify-coverage-card-ids.js`
- no install, symlink, subprocess, or write path in the repo-map module

## Next

Use this as the safe local map layer. If the team later wants a full knowledge graph/dashboard, build it as a separate artifact-policy card instead of directly installing Understand-Anything into normal tool state.

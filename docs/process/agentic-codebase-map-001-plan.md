# AGENTIC-CODEBASE-MAP-001 Plan

## What

Build an AIOS-owned, read-only repo-map lane for future Codex/Claude/build agents.

Plain English: Steve asked for a way to move between chats without losing the shape of the repo. Better Stack / Understand-Anything is useful evidence, but the safe first move is not to install a third-party plugin into Codex/Claude tool state. The first move is a deterministic repo map that future agents can trust.

## Why

Long chats compact, future builders start cold, and the source/extractor stack is now too large to rediscover from scratch every time. A repo map should show the current critical files, source-browser/runtime surfaces, proof commands, package scripts, import edges, and file-size risks while excluding private/local memory and generated graph artifacts.

## Scope

- Add a read-only scanner over explicit include roots.
- Exclude private/local files by default:
  - `MEMORY.md`
  - `USER.md`
  - `TOOLS.md`
  - `memory/`
  - `.openclaw/`
  - `.claude/`
  - `.env`
  - `docs/_archive/`
  - `docs/conversation-archive/`
- Include critical source/extractor/runtime files and process docs.
- Extract structure only: file path, category, surface, size, import/export names, markdown headings, package scripts, and size-risk flags.
- Keep generated graphs and third-party plugin installs out of the repo until a separate artifact policy exists.

## Acceptance Criteria

- `npm run process:agentic-codebase-map-check -- --json` returns healthy.
- The map includes source-browser, source-session, YouTube, Dev Hub, verifier, job, and worker surfaces.
- The proof rejects private/local path leaks.
- The proof rejects missing critical surfaces.
- The proof proves the Understand-Anything repo eval is used as guidance only, with no third-party plugin install, symlink, subprocess, generated graph commit, or repo write path.
- The output is report-only and creates no backlog card, external write, provider call, browser run, install, or generated artifact.

## Not Next

- No third-party plugin install.
- No symlinks into Codex, Claude, Cursor, VS Code, or user-level tool folders.
- No generated `.understand-anything/knowledge-graph.json` committed.
- No read of private memory, local runtime state, env files, credentials, or conversation exports.
- No model/provider call.
- No source extraction, browser run, external write, or backlog promotion.

## Proof

```bash
node --check lib/agentic-codebase-map.js scripts/process-agentic-codebase-map-check.mjs
npm run process:agentic-codebase-map-check -- --json
```

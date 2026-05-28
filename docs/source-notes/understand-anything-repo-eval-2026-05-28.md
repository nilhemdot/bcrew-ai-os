# Understand-Anything Repo Eval

Date: 2026-05-28
Source: `https://github.com/Lum1104/Understand-Anything`
Reviewed commit: `26edf61856fa476e466bda1814819a266a293c47`
Review mode: read-only sandbox clone in `/tmp`; no install, no repo dependency changes.

## Call

Worth testing, but do not install directly into the main AIOS workspace yet.

The repo is a strong fit for the pain Steve raised: future Codex/Claude chats need a faster way to understand this codebase, and the output model is a codebase knowledge graph plus dashboard, with follow-on skills for chat, explain, diff, onboarding, domain graph, and knowledge-base graph.

## Why It Looks Useful

- MIT licensed.
- Multi-platform plugin metadata exists for Claude, Cursor, Copilot, Codex-style skill folders, and related tools.
- The core package uses deterministic parsing plus LLM analysis instead of pure prompt memory.
- It has explicit skills for:
  - `understand`
  - `understand-dashboard`
  - `understand-chat`
  - `understand-diff`
  - `understand-explain`
  - `understand-onboard`
  - `understand-domain`
  - `understand-knowledge`
- It has auto-update hooks for commit/session-start graph freshness.
- It supports a committed `.understand-anything/knowledge-graph.json`, which could become shared repo truth for future builders.

## Risks / Guardrails

- The installer clones to `~/.understand-anything/repo` and symlinks skills into user-level tool folders. That is machine/tool state, not normal repo code.
- The dashboard install path can run `pnpm install`, build packages, and start a Vite server.
- Auto-update hooks can prompt graph updates after commits when enabled.
- The graph could be large; if committed, it needs a deliberate policy for generated artifacts and possible Git LFS.
- This should not replace our DB-backed backlog, source contracts, or Foundation verifiers. It should help agents read the codebase faster.

## Recommended Next Step

Run a bounded sandbox adoption proof:

1. Install or symlink it outside the main repo tool state first.
2. Run `/understand --no-auto-update` against a small fixture or a scoped AIOS directory.
3. Verify output quality, graph size, ignored paths, and whether sensitive/local-only files stay out.
4. Decide whether AIOS should commit a generated graph, keep it local-only, or build our own repo-map lane from its ideas.

Until that proof passes, treat it as promising but not installed.

## Bounded Sandbox Proof

Proof run: 2026-05-28, in `/tmp/understand-anything-proof.0rgCdX`.

What ran:

- Cloned the repo into `/tmp`.
- Used `npx pnpm@10.6.2` with npm cache pointed at `/tmp`, because `pnpm` was not installed globally.
- Installed dependencies only inside the `/tmp` clone; no AIOS dependency or global tool state was changed.
- Built `@understand-anything/core`.
- Copied a small AIOS source-browser slice into `/tmp/understand-anything-proof.0rgCdX/aios-scope`.
- Ran the deterministic scanner, import-map extractor, and structure extractor against that scoped copy.
- Wrote sandbox-only `.understand-anything/knowledge-graph.json` and `meta.json`.

Proof output:

- Scoped files scanned: 11.
- Categories: 6 code, 4 docs, 1 config.
- Import map: 4 files with imports, 5 import edges.
- Graph: 146 nodes, 140 edges, 135 function nodes, 4 document nodes, 49 heuristic tour steps.
- Graph size: about 120 KB on disk for the scoped slice.
- Generated artifacts stayed under `/tmp/understand-anything-proof.0rgCdX/aios-scope/.understand-anything/`.
- No symlinks were created.
- No AIOS repo files, dependencies, hooks, or user-level plugin folders were modified.

Privacy/readiness checks:

- The scoped input did not include `.env`, `MEMORY.md`, `USER.md`, `memory/`, `.openclaw/`, `node_modules/`, or live local runtime artifacts.
- A string scan found only source-code function names such as `buildSourceSessionSecretRef`; no raw secret value was exposed.

Call after sandbox:

Adopt the idea, but do not install the plugin directly into the main AIOS workspace yet. The deterministic scanner/structure pieces are useful and safe in a bounded lane. The full plugin workflow still needs an AIOS-specific wrapper that enforces:

- explicit include roots
- default private/local ignore list
- no auto-update hooks by default
- no user-level skill symlinks from a normal build
- generated graph artifact policy before anything is committed

Best next implementation path: build an AIOS-owned `repo-map` lane that can optionally use Understand-Anything's deterministic scanner/core ideas inside a guarded runtime, rather than letting a third-party installer write directly into Codex/Claude/OpenClaw tool state.

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

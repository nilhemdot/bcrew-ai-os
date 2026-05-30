# Public Repo Deep-Review Chrome Filter Closeout

Date: 2026-05-28
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `public-repo-deep-review-chrome-filter-v1`

## What Changed

The public repo deep-review runner now blocks repo chrome paths such as pulls, projects, issues, actions, releases, settings, branches, tags, commits, and similar GitHub/GitLab UI routes before they can be followed as implementation evidence.

It also prefers primary repo content blocks before full-page text and filters GitHub navigation/session snippets from implementation-pattern extraction.

## Why

A live read-only sanity check against a YouTube-discovered GitHub row showed the old runner could treat GitHub chrome/session text as implementation evidence. That is false gold. Repo extraction should return README/docs/examples/license/provenance evidence, not nav/sidebar/session copy.

## Proof

- `node --check lib/public-repo-deep-review-runner.js scripts/process-public-repo-deep-review-runner-check.mjs scripts/run-public-repo-deep-review.mjs`
- `npm run process:public-repo-deep-review-runner-check -- --json`

The focused proof now verifies:

- overview/docs/examples/license are still read
- raw/archive/download/auth/external/chrome links are blocked
- pulls/projects/actions are not opened
- implementation snippets come from primary repo content, not GitHub chrome text
- no clone/install/import/download/backlog/provider/auth side effects occur

## Boundary

This does not add GitHub monitoring, cloning, raw file fetches, installs, downloads, code import, provider calls, backlog writes, or Scoper promotion.

Some static GitHub file pages may now produce fewer implementation patterns instead of noisy patterns when the static HTML does not expose clean primary content. That is correct until a separately approved richer repo reader exists.

# 2026-05-28 YouTube Public Repo Deep-Review Handoff

## Scope

Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`

Closeout key: `youtube-public-repo-deep-review-handoff-v1`

This slice upgrades YouTube-discovered public code repo links from generic source-browser reads to the dedicated public repo deep-review lane.

This is a blocked-preflight closeout. The full source-browser/GitHub source lane is not done, and live monitoring, Scoper promotion, code import, downloads, installs, and implementation decisions remain approval-bound continuation work.

## What Changed

- Public-code-repo handoff rows now use runner `repo:deep-review`.
- Repo handoff commands now call `npm run repo:deep-review -- --url=<repo> --maxPages=<n> --maxDepth=<n>`.
- The batch runner can execute the public repo deep-review runner directly from the YouTube source handoff queue.
- Repo review results persist a repo review packet and cited implementation patterns into the source crawl item metadata.
- Old generic `source:god-mode` repo reads no longer count as completed repo review. They return as `repo_deep_review_upgrade_needed` until the repo lane proves README/docs/examples/license/provenance and implementation-pattern extraction.
- Product/tool hosts that accidentally land in the public-code bucket are parked before execution instead of burning `repo:deep-review` runs.
- Host-root URLs that accidentally land in the public-code bucket, such as `https://github.com`, are parked before execution because they are not exact repo or repo-file targets.
- Dev source coverage copy now describes the GitHub/repo feed path as public README/docs/examples/license review before any implementation work.

## Why It Matters

The YouTube system found many public repos. A generic page read is not enough to decide whether a repo contains useful implementation patterns for AIOS. This handoff gives those repos a real read-only lane without cloning, installing, downloading, importing code, writing backlog, or promoting to Scoper.

## Guardrails

- Public read-only repo pages only.
- No clone.
- No install.
- No archive/file download.
- No code import.
- No backlog write.
- No provider/model call.
- No auth/private repo access.
- No Scoper promotion.

## Proof Commands

- `node --check lib/source-god-mode-youtube-handoff.js scripts/process-source-god-mode-youtube-handoff-check.mjs scripts/process-dev-team-hub-v0-check.mjs lib/dev-intel-source-coverage.js`
- `npm run process:source-god-mode-youtube-handoff-check -- --json`
- `npm run process:public-repo-deep-review-runner-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SOURCE-BROWSER-AGENTIC-RUNTIME-001 --planApprovalRef=docs/process/approvals/SOURCE-BROWSER-AGENTIC-RUNTIME-001.json --closeoutKey=youtube-public-repo-deep-review-handoff-v1 --commitRef=HEAD`

## Current Live Readback

Before this slice, live Dev Hub showed the public repo handoff lane as already read from older generic source-browser evidence.

After this slice, those old generic repo reads are treated honestly:

- public-code repo rows route to `repo:deep-review`
- old generic reads stay as history
- repo rows needing the real lane show as runnable upgrade work

Live effect after bounded batches:

- public-code repo rows: 86 total
- repo rows read or recorded: 81
- repo rows parked/blocked: 5
- repo rows still runnable: 0

The parked rows include non-repo/product hosts, host roots, and repo URLs that the read-only repo runner could not read cleanly. They are recorded instead of silently retried.

## Next

Review the highest-value repo implementation packets with Steve before any Scoper promotion or implementation import. The next source-expansion lane should be chosen from the source-session prep queue, not by broadening repo read permissions.

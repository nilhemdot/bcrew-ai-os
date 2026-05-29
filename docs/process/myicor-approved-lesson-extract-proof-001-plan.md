# MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001 Plan

## What

Run one governed MyICOR content extraction proof for the exact approved resource:

`https://app.myicor.com/resources/stop-managing-your-ai-agents-build-the-one-that-manages-them-for-you`

This is the first real content gap-fill after the MyICOR MCP catalog snapshot. The route is MCP metadata first, then a source-owned isolated Playwright profile for the exact URL only. Raw text and screenshots are local-only under `.openclaw`; repo docs and report rows store hashes, paths, headings, counts, and build-intel signals rather than the full article body.

## Why

Steve approved this because the article is directly aligned with the current sprint: human web agent, manager-agent orchestration, memory, and extraction that compounds. The system needs proof that it can read an approved paid/member source like a human, capture evidence, remember what was extracted, and stop at boundaries without Browserbase, normal Chrome, broad crawling, or side effects.

## Acceptance Criteria

- The MCP `search_learning_resources` result confirms the exact title and URL before browser gap-fill.
- The browser opens only the exact approved MyICOR resource URL through the source-owned isolated profile.
- The run captures page title/headings, body text count, content hash, local-only raw text path, local-only screenshot hash/path, link inventory, and build-intel signals.
- The run persists one report artifact: `source-system:myicor:approved-lesson-extract-proof:v1`.
- The run persists one source target and one source item under `myicor-approved-lesson-extract-proof-v1`.
- The source item is marked `extracted_with_evidence` and `graded_keep` so the source ledger and Dev Director review can see it.
- The backlog card is marked done only after live MCP, live browser, report, source item, and proof checks pass.
- No broad crawl, adjacent navigation, clicks, form submits, comments, likes, bookmarks, downloads, purchases, posts/messages, profile/account/credential mutation, external writes, Browserbase, normal Chrome profile, atom writes, vector writes, or auto backlog promotion.

## Approved Packet

- Card: `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`
- Source: `SRC-MYICRO-001`
- Title: `Stop Managing Your AI Agents. Build the One That Manages Them for You.`
- URL: `https://app.myicor.com/resources/stop-managing-your-ai-agents-build-the-one-that-manages-them-for-you`
- Approval file: `docs/process/approvals/MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001.json`
- Browser route: source-owned isolated profile at `.openclaw/myicor-mcp-oauth/profiles/myicor-authorized-member`

## Implementation Shape

`MCP exact match -> exact local browser read -> local artifacts -> source item extracted_with_evidence -> proof report -> backlog closeout -> ledger/daily review refresh`

Files:

- `lib/myicor-approved-lesson-extract-proof.js`
- `scripts/process-myicor-approved-lesson-extract-proof-check.mjs`
- `docs/process/approvals/MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001.json`

## Proof

Focused proof:

```bash
node --check lib/myicor-approved-lesson-extract-proof.js
node --check scripts/process-myicor-approved-lesson-extract-proof-check.mjs
npm run process:myicor-approved-lesson-extract-proof-check -- --json
npm run process:myicor-approved-lesson-extract-proof-check -- --live-mcp --json
npm run process:myicor-approved-lesson-extract-proof-check -- --live-mcp --live-browser --headless --apply --json
```

Follow-up refresh proof:

```bash
npm run process:source-extraction-state-ledger-check -- --apply --json
npm run process:dev-director-daily-source-review-loop-check -- --apply --json
npm run process:dev-page-system-truth-cleanup-check -- --apply --json
npm run process:builder-memory-system-check -- --apply --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- No broad MyICOR crawl.
- No course-wide extraction.
- No lesson/video/audio/coaching-call capture.
- No screenshot bytes committed to repo.
- No downloads.
- No comments, likes, bookmarks, forms, messages, or profile/account changes.
- No external writes.
- No atom/chunk/vector/query-index writes from MyICOR content in this proof.
- No Browserbase.
- No normal Chrome profile.

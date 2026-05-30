# Foundation KB Compiler V1 Closeout

Card: `FOUNDATION-KB-COMPILER-V1-001`

Closeout key: `foundation-kb-compiler-v1`

## What Shipped

Built the first Foundation-owned proposal-only KB compiler path. V1 turns existing source-backed synthesis facts, locked decisions, and intelligence atoms into a compiled KB/wiki draft contract with source IDs, citations, freshness metadata, privacy tier, compiler frontmatter, contradiction status, and quality-gate pass/fail.

This did not run live extraction, transcript fetches, screenshots, crawl, summarization, model calls, provider probes, paid/auth runs, external writes, compiled page writes, query index writes, vector table writes, Research Inbox writes, atom creation, backlog mutation from compiled content, Google Drive permission mutation, or live Agent Feedback auto-send.

## Where It Lives

- `lib/foundation-kb-compiler-v1.js`
- `scripts/process-foundation-kb-compiler-v1-check.mjs`
- `lib/foundation-intelligence-audit-verifier.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `lib/foundation-build-closeout-cleanup-records.js`
- `docs/process/foundation-kb-compiler-v1-001-plan.md`
- `docs/process/approvals/FOUNDATION-KB-COMPILER-V1-001.json`

## Proof

- `node --check lib/foundation-kb-compiler-v1.js lib/foundation-intelligence-audit-verifier.js scripts/process-foundation-kb-compiler-v1-check.mjs scripts/foundation-verify.mjs`
- `npm run process:foundation-kb-compiler-v1-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-KB-COMPILER-V1-001 --planApprovalRef=docs/process/approvals/FOUNDATION-KB-COMPILER-V1-001.json --closeoutKey=foundation-kb-compiler-v1 --commitRef=HEAD`

## Dogfood

- Missing source ID fails closed.
- Missing citation/evidence ref fails closed.
- Stale freshness fails closed.
- Live extraction/model/external-write/compiled-page-write attempts fail closed.
- Valid existing source-backed records compile into a proposal-only draft.
- The draft keeps source IDs, citations, privacy tier, freshness metadata, compiler frontmatter, and quality-gate status.

## Current Status

`FOUNDATION-KB-COMPILER-V1-001` is done for V1 once this closeout ships. The compiler path is read-only/proposal-only and is safe for the next action-route review cards to consume as pattern truth.

Next card in `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001`: `ACTION-ROUTE-REVIEW-INBOX-001`.

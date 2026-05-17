# Foundation Knowledge Base Compiler Design Closeout

Card: `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`

Closeout key: `foundation-knowledge-base-compiler-design-v1`

## What Changed

Defined the Foundation-owned design contract for a future knowledge compiler:

- source contracts
- ingestion permission
- raw evidence envelopes
- compiler rules
- compiled markdown/wiki page contract
- query/Q&A contract
- operator feedback and repair loop
- quality-gate dependency through `KNOWLEDGE-BASE-QUALITY-GATE-001`

## Proof

- `node --check lib/foundation-knowledge-base-compiler-design.js lib/foundation-intelligence-audit-verifier.js scripts/process-foundation-knowledge-base-compiler-design-check.mjs scripts/foundation-verify.mjs`
- `npm run process:foundation-knowledge-base-compiler-design-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:ship-check -- --card=FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001.json --closeoutKey=foundation-knowledge-base-compiler-design-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 --closeoutKey=foundation-knowledge-base-compiler-design-v1`
- `npm run process:foundation-ship -- --card=FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001.json --closeoutKey=foundation-knowledge-base-compiler-design-v1 --commitRef=HEAD`

## Known Limits

- This does not run live extraction.
- This does not fetch transcripts, screenshots, crawls, summaries, or model output.
- This does not create compiled KB pages, a query index, atoms, Research Inbox rows, or backlog items from extracted content.
- This does not build Harlan/Fal/voice/Canva/OpenHuman feature work.

## Review Next

Continue with `KNOWLEDGE-BASE-QUALITY-GATE-001`.

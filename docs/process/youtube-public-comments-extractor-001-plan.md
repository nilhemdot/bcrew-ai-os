# YOUTUBE-PUBLIC-COMMENTS-EXTRACTOR-001 Plan

## What

Document that public YouTube comments are excluded from the active God Mode extractor lane.

Plain English: the repo contains historical proof that public comments could be captured safely, but Steve explicitly rejected spending extractor, LLM, or runtime attention on YouTube comments for this sprint. Comments are not active work, not parked future work, and not a God Mode blocker unless Steve explicitly reverses the decision.

## Why

The active God Mode problem is browser Hands, approved source-packet execution, evidence persistence, synthesis freshness, and source-family maturity. Keeping comments framed as a future extractor gap causes builders to waste time and confuses the sprint order.

## Current Decision

- `YOUTUBE-PUBLIC-COMMENTS-EXTRACTOR-001` is closed as an operator-exclusion decision.
- Historical code/proof may remain as boundary evidence.
- No API key setup, batch runner integration, scheduler work, Director weighting, or LLM analysis should be done for comments.
- God Mode parity should show comments as `operator_excluded`, not `missing`, `blocked`, `parked`, or `next`.

## Proof

The proof command now exists to prevent regression back into comment work:

```bash
npm run process:youtube-public-comments-extractor-check -- --json
```

## Not Next

- Do not configure YouTube comment API keys for this lane.
- Do not integrate comments into the public YouTube full-watch runner.
- Do not route comments into Director, Scoper, Portfolio, or source-value grading.
- Do not call comments a missing God Mode capability.
- Do not revisit this without an explicit Steve reversal.

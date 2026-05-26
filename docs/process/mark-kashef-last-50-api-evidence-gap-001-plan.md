# MARK-KASHEF-LAST-50-API-EVIDENCE-GAP-001 Plan

## What

Add a no-spend evidence gate that prevents `MARK-KASHEF-LAST-50-BASELINE-001` from being falsely closed as Gemini API complete.

The gate reads the current Mark last-50 source pool and separates:

- accepted Gemini API full-watch report evidence;
- older Gemini Workspace/subscription browser-eyes evidence;
- exact Mark videos missing accepted API atom and hit proof.

Current live truth at planning time: 44/50 current Mark pool videos have accepted Gemini API full-watch atom and hit evidence. Six videos only have older workspace/subscription evidence: `7aQbN543Mec`, `Fu5KIG2Jm1g`, `OMkdlwZxSt8`, `RChO5deJ_fE`, `TJRsTwi1McI`, and `rVzGu5OYYS0`.

## Why

The attempted Mark closeout exposed a false-green risk. Live backlog and sprint text said Mark was 50/50 API full-watch complete, but exact report evidence showed six videos came from the older `gemini_workspace_subscription_browser_eyes` batch.

Steve's doctrine is clear: subscription/browser scout output is not accepted as full YouTube video/audio/visual watching. The system must fail closed rather than marking weak evidence as God Mode.

## Acceptance Criteria

- The proof reads the current Mark 50-row pool from `source_crawl_items`, not a hardcoded list.
- The proof counts only accepted Gemini API full-watch report artifacts as API coverage.
- The proof requires both atom and hit evidence for accepted API coverage.
- The proof classifies the older workspace/subscription batch as non-API evidence.
- The proof identifies the exact six current missing API videos.
- The old small-batch watched-id readback no longer counts arbitrary `sourceVideoId` rows as watched API evidence.
- The repair card closes only the evidence-gap repair, not the parent Mark baseline.
- The parent Mark card is parked with exact blocker context.
- Current Sprint advances to safe public YouTube catch-up planning without live provider spend.
- No live Gemini call, browser crawl, private/auth/community/course/comment source, form, download, purchase, backlog auto-promotion, credential mutation, Drive permission mutation, or external write runs from this proof.

## Definition Of Done

Done means the false-closeout path is blocked by a focused proof, live backlog/sprint truth no longer claims Mark is 50/50 API complete, and the six-video API gap is parked with exact IDs for a future Steve-approved budgeted rewatch or explicit split.

This does not complete `MARK-KASHEF-LAST-50-BASELINE-001`. It prevents that parent card from being completed incorrectly.

## Tests

- `node --check scripts/process-mark-kashef-last-50-api-evidence-gap-check.mjs scripts/process-mark-kashef-god-mode-small-batch-check.mjs`
- `npm run process:mark-kashef-last-50-api-evidence-gap-check -- --json`
- `npm run process:mark-kashef-last-50-api-evidence-gap-check -- --json --close-card`
- `npm run process:youtube-creator-god-mode-catchup-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

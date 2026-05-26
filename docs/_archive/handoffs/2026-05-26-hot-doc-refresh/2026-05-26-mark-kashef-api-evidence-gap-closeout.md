# Mark Kashef API Evidence Gap Closeout

Card: `MARK-KASHEF-LAST-50-API-EVIDENCE-GAP-001`
Closeout: `mark-kashef-last-50-api-evidence-gap-v1`

## What Changed

The attempted Mark last-50 closeout found a real false-green risk.

Live evidence does **not** prove `MARK-KASHEF-LAST-50-BASELINE-001` is 50/50 accepted Gemini API full-watch complete. Exact Mark pool proof currently shows:

- current Mark pool rows: 50
- accepted Gemini API atom+hit coverage: 44/50
- missing accepted API evidence: 6 videos
- the six missing videos are only covered by the older `gemini_workspace_subscription_browser_eyes` batch

Missing accepted API video IDs:

- `7aQbN543Mec`
- `Fu5KIG2Jm1g`
- `OMkdlwZxSt8`
- `RChO5deJ_fE`
- `TJRsTwi1McI`
- `rVzGu5OYYS0`

## Decision

Do not close `MARK-KASHEF-LAST-50-BASELINE-001` yet.

The parent card is parked with exact blocker context. Current Sprint advances to `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001` for safe no-spend readback/scheduler planning while the six-video Mark API gap waits for Steve-approved live Gemini budget or an explicit split.

## Proof

- `npm run process:mark-kashef-last-50-api-evidence-gap-check -- --json`
- `npm run process:mark-kashef-last-50-api-evidence-gap-check -- --json --close-card`

The repair also narrows `process-mark-kashef-god-mode-small-batch-check` so arbitrary `sourceVideoId` rows no longer count as watched API evidence.

## Not Next

- no live Gemini spend from this repair
- no Skool/MyICOR/private/auth/community/course/comment extraction
- no browser crawl
- no downloads, purchases, forms, credential changes, Drive permission changes, external writes, or automatic backlog promotion

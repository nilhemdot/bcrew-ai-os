# Dev Intel Source Routing Checkpoint

Date: 2026-05-25

## What Is Proven

- Public YouTube full-watch extraction is working through the Gemini API video/audio/visual route.
- Dev Intelligence Director now reads Mark, ICOR, Nate, Austin, broad latest-20 public batches, and the filtered Dev slice from meetings/Gmail/Missive/Slack.
- Dev Director report `director:dev-team-intelligence-director-001:aios-mission-v0` now ranks 338 proposal-only candidates.
- Source value grading is report-only and lane-specific. A creator can be S-tier for AIOS builds and lower for realtor teaching, or the reverse.
- The current Dev build S-tier public sources are ICOR, Austin Marchese, Mark Kashef, and Nate Herk.
- Realtor AI training value is tracked separately. Do not globally pause or promote a source from the Dev build grade alone.

## Current Source Grades

Dev build lane:

- ICOR with Tom | AI Productivity: S, score 100
- Austin Marchese: S, score 100
- Mark Kashef: S, score 97
- Nate Herk: S, score 92
- Aaron Bitwise: B, score 61

Realtor AI training lane:

- ICOR with Tom | AI Productivity: A, score 81
- Mark Kashef: B, score 68
- Austin Marchese: B, score 64
- Nate Herk: B, score 60
- Aaron Bitwise: C, score 33

## Paid/Auth Sources

Skool and MyICOR are not approved for live extraction yet.

What is ready:

- Source contracts and auth boundaries exist.
- Approval packet drafts exist.
- Skool worker proof is green.
- Local Skool URL inventory can be preserved as URL/provenance only.
- WEB-GODMODE/private-source guard blocks private observation without source-specific approval.

What is blocked:

- Skool login.
- Private redirects.
- Course/classroom/community crawling.
- Posts, comments, member data.
- Embedded private video watching.
- Model calls over private content.
- Atoms, synthesis facts, KB drafts, backlog cards, vector writes, or external writes from private content.

Next paid-source move:

- Approve one exact source packet and one bounded lesson/community proof before any private extraction starts.

## Nate Follow-Up

- After paid/auth checks, Nate was the next safe S-tier public source.
- The normal full-watch lane was tightened to route multi-hour courses out to a future long-course lane.
- Nate second batch watched 4 standard public videos and produced 8 proposal-only build candidates, 12 visual evidence items, and 44 approval-required links.
- Nate is now exhausted for the standard public Build Intel lane. The selector surfaces 2 remaining course-style videos for the long-course path.
- Nate remains S for AIOS/dev build and is now S for ops/process value.

## Broad Public Follow-Up

- Ran one more 9-video standard public comparison batch after long-course routing was fixed.
- Sources watched: Chase AI, Matt Pocock, Aaron Bitwise, Dan Martell, Dream Labs AI, Kia Ghasem, Nick Saraev, Jack, and Jono Catliff.
- Result: 18 proposal-only build candidates, 27 visual evidence items, 107 approval-required links, 1 resolved public resource link, no external/backlog writes.
- The top 5 Director picks did not change; Mark/ICOR/generic ideas still lead immediate Dev build priority.
- Jono entered the source grader at B Dev build with best Director rank 15.
- The source grader health check was repaired so lane-specific grading stays valid even when the current live source set is Dev-heavy.

## Recommended Next Order

1. Keep daily public YouTube delta monitoring on S/A Dev sources.
2. Do not scale C/D Dev sources for build work, but keep lane-specific value available for realtor teaching or marketing.
3. Build or approve the first bounded Skool/MyICOR source packet when Steve is ready.
4. Use Director output as recommendations only.
5. Route selected recommendations into Scoper.
6. Let Portfolio/Scrum Master merge duplicates, compare scoped ideas, and rank the best build opportunities before Steve approves promotion.

## Verification Run

- `npm run process:build-intel-source-value-grader-check -- --apply --json`
- `npm run process:dev-team-intelligence-director-check -- --apply --json`
- `npm run process:mark-m-skool-extraction-preflight-check -- --json`
- `npm run process:myicor-extraction-preflight-check -- --json`
- `npm run process:skool-worker-check -- --json`
- `npm run process:course-source-auth-boundary-check -- --json`

Known nuance: older MyICOR, Mark Skool, and parent course-boundary checks prove their source/auth boundaries but still fail stale Current Sprint overlay assumptions. The green Skool worker proof is the current blocked-worker truth.

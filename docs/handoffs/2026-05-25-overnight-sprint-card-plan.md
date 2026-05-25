# 2026-05-25 Overnight Sprint Card Plan

Status: Active plan  
Owner: Foundation / Dev Team  
Starting point: `8b8c5156 Lock launcher card design system`

## What Just Closed

`SYSTEM-015` is locally done.

Proof:

- `npm run process:hub-launcher-source-backed-values-check -- --json`
  - 71/71 checks
- `node --check public/home.js`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene`
  - healthy, 0 findings
- Desktop/mobile rendered screenshots passed for both `/` and `/dev`:
  - `/tmp/bcrew-launcher-style-lock-desktop.png`
  - `/tmp/bcrew-launcher-style-lock-mobile.png`
  - `/tmp/bcrew-dev-style-lock-desktop.png`
  - `/tmp/bcrew-dev-style-lock-mobile.png`

What changed:

- Launcher station cards now use the locked left-rail card system.
- Old station status pills are removed.
- Old visible jargon is removed: `PARTIAL`, `PLANNED`, `CARVE OUT`.
- Dev station is treated as a running hub, not a carve-out.
- The old `launcher-hub-win` class is gone; station value lines are plain text.
- Design contract v3 now includes card variation rules and status-color rules.

## Overnight Principle

Do not scale extraction before proving the brain layer is strong.

The next work should move in this order:

```text
quality gate
  -> resynthesize/review current Mark output
  -> continue guarded Mark baseline
  -> refresh Director
  -> decide promotion/scoping
  -> only then broader sources
```

## Card Sequence

### 1. `INTELLIGENCE-SPINE-QUALITY-EVAL-001`

Goal: prove synthesis/router/Director quality before more scale.

Work:

- build or run a same-input quality harness;
- use selected Mark output plus at least one meeting/comms sample if available;
- check plain-English quality, dedupe, route choice, evidence trail, and Director
  ranking;
- produce a Steve-readable report.

Stop condition:

- if the output is generic, noisy, or hard to act on, stop extraction scale-up
  and fix the brain layer first.

### 2. `MARK-KASHEF-LAST-50-BASELINE-001`

Goal: cleanly account for the Mark batch that completed during the checkpoint
reset.

Work:

- review the `2026-05-25T02:33:43Z` Mark batch;
- refresh Dev Intelligence Director;
- update the Mark source note/handoff with the new batch result;
- do not start a new batch until the Director output is reviewed.

Stop condition:

- if Director resynthesis fails or output quality is weak, go back to card 1.

### 3. `MARK-KASHEF-LAST-50-BASELINE-001` continuation

Goal: continue the public Mark YouTube baseline only if cards 1 and 2 pass.

Work:

- run one guarded 3-5 video batch;
- no private/auth/community crawl;
- after the batch, rerun Director, Dev Hub proof, active-card gate, and backlog
  hygiene.

Stop condition:

- quota/rate limit, failed proof, fewer than 3 eligible videos, weak output, or
  any private/auth boundary.

### 4. `DEV-TEAM-INTELLIGENCE-DIRECTOR-001` refresh

Goal: leave a morning-ready Director report.

Work:

- summarize what changed in the top recommendations;
- list top 5 proposed builds;
- separate ready ideas from next ideas;
- keep everything proposal-only.

Stop condition:

- if the Director output cannot be explained in plain English, do not promote.

### 5. `BUILD-PORTFOLIO-SCRUM-MASTER-001`

Goal: prepare the post-Scoper portfolio layer that turns many scoped ideas into
the best merged build opportunities before Steve approval.

Work:

- verify no recommendation auto-creates backlog;
- define the Scoper step before portfolio review;
- define duplicate/overlap clustering;
- define merge/enhance behavior so 7 related ideas can become 1 stronger build;
- define weak-card return-to-Scoper behavior;
- define source/auth blocker parking;
- preserve evidence links, source route, and source lineage.

Stop condition:

- no auto-promotion without explicit approval.
- no Steve approval request until the candidate has enough scope plus portfolio
  review to judge value, risk, source evidence, and build path.

### 6. `BUILD-OPPORTUNITY-PROMOTION-GATE-001`

Goal: approve or reject portfolio-reviewed build opportunities into backlog
cards or existing-card attachments.

Work:

- define Steve approval as priority/promotion after portfolio review;
- define approved-for-backlog versus rejected versus parked;
- keep source lineage attached to approved cards;
- prevent auto-build.

Stop condition:

- no queue/sprint work starts without Steve approval after portfolio review.

### 7. `SYSTEM-014`

Goal: Brain Fleet/System Control surface.

Work:

- read-first V1;
- show each LLM-powered package/tool;
- show provider, model, effort, status, and route;
- route changes must go through `npm run llm:route` proof path.

Stop condition:

- do not build provider switching if route proof and guardrails are not clear.

### 8. `GOD-MODE-EXTRACTOR-PRODUCT-ARCHITECTURE-001`

Goal: capture the sellable/reusable extractor architecture.

Work:

- define eyes, ears, hands, brain;
- define source approval boundaries;
- define output packets;
- define what can be productized later.

Stop condition:

- do not turn product architecture into broad source crawling.

### 9. `YOUTUBE-LATEST-20-INTEL-RUN-001`

Goal: prepare broader public YouTube extraction after Mark proves quality.

Work:

- select exact approved public creator/video targets;
- run bounded latest-20 only after Mark and the spine quality gate pass;
- no transcript-only scale-up.

Stop condition:

- if Mark quality is not accepted, this waits.

### 10. `SKOOL-LIVE-NAVIGATION-PROOF-002`

Goal: prepare one approved Skool proof.

Work:

- exact source packet only;
- one bounded lesson/feed proof;
- no broad paid/community crawl.

Stop condition:

- no approval packet, no run.

### 10. `MYICOR-LIVE-NAVIGATION-PROOF-002`

Goal: prepare one approved MyICOR proof.

Work:

- exact source packet only;
- one bounded lesson proof;
- capture route, evidence, stop controls.

Stop condition:

- no approval packet, no run.

## Not Overnight Unless Explicitly Approved

- broad Skool crawl;
- broad MyICOR course sweep;
- non-Mark mass YouTube scale-up before the spine quality gate;
- auto backlog creation from Director output;
- pushing through protected Foundation ship gates without the approved ship
  command or explicit bypass.

## Morning Readout Should Include

- which cards were completed;
- what proof passed;
- whether the intelligence spine quality is acceptable;
- what Mark videos/reports were reviewed or extracted;
- Director top 5 and what changed;
- exact next card recommendation.

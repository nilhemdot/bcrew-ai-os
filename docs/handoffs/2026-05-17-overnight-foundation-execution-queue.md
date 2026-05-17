# 2026-05-17 Overnight Foundation Execution Queue

Owner: Codex main Foundation session
Window: run until Steve checks in around 2026-05-17 07:00 America/Toronto
Mode: Foundation-only execution. No hub features, Canva, Marketing Video Lab, Fal image editing, voice wiring, or external auth-required connector work.

## Current Repo Reality

Current critical file sizes:

- `scripts/foundation-verify.mjs`: 13,046 lines. Still red.
- `lib/foundation-db.js`: 4,734 lines. Under 5K.
- `server.js`: 4,831 lines. Under 5K.
- `public/foundation.js`: 4,909 lines. Under 5K.

The verifier is now the only major monolith still above the 10K danger line. It is the top Foundation cleanup target.

Recent verifier growth was thin registration pressure, not new large logic:

- `ed43a35` added `llmHubCapacitySource`.
- `3559898` added `llmCredentialRegistrySource`.

That is still a risk signal: every new Foundation capability still wants to touch the root verifier. The next work must reduce that pressure, not add to it.

## Non-Negotiable Rules

- One sprint/card lane at a time.
- Do not touch unrelated dirty files: `SOUL.md`, `scripts/codex-usage-web.mjs`, mockup images, or `public/harlan-command-center.html`.
- Do not build hub features or marketing tools during this queue.
- Do not start auth-required connector work. Skool, MyICOR, Loom, SocialPilot, paid communities, and login-gated sources stay auth-pending.
- Do not add new verifier behavior directly to `scripts/foundation-verify.mjs`. Any required root touch must be thin import/source aggregation only, with behavior in focused modules.
- Dogfood every card by recreating the failure mode it claims to prevent.
- Full ship gate before any push.
- If a focused proof fails because it is coupled to stale active sprint state, fix that proof before continuing. Closed cards must remain verifiable after the sprint moves on.
- Stop after the final closeout if it is 07:00 ET or later. If it is earlier, continue to the next queued Foundation-only item.

## Sprint 1: Audit Proof Reuse Repair

Card name: `NIGHTLY-AUDIT-RUN-PROOF-REUSABLE-CHECK-001`

Goal: Make the nightly audit run proof reusable after the original sprint is closed.

Why:

`npm run process:nightly-audit-run-proof-check -- --json` currently proves the freshness logic works, but the script fails because it still expects `NIGHTLY-AUDIT-RUN-PROOF-001` in the active Current Sprint. That is stale current-sprint coupling. It is the same class of process rot that made old green checks untrustworthy.

Acceptance:

- The focused proof passes after `NIGHTLY-AUDIT-RUN-PROOF-001` is closed.
- The proof still verifies approval, backlog truth, closeout truth, Plan Critic pass, dogfood fixtures, current scheduled job config, and live latest-run freshness.
- The proof no longer requires the old card to be in the active Current Sprint.
- Dogfood still proves missing, failed, and stale audit runs fail closed.

Proof:

```bash
node --check lib/nightly-audit-run-proof.js scripts/process-nightly-audit-run-proof-check.mjs
npm run process:nightly-audit-run-proof-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=NIGHTLY-AUDIT-RUN-PROOF-REUSABLE-CHECK-001 --commitRef=HEAD
```

## Sprint 2: Plan Critic Verifier Enforcement Dogfood

Card name: `PLAN-CRITIC-VERIFIER-ENFORCEMENT-DOGFOOD-001`

Goal: Prove Plan Critic rejects unsafe additions to `scripts/foundation-verify.mjs`.

Why:

The generic architectural rule exists and currently rejects oversized file work without a split plan. It must be dogfooded specifically against the remaining red monolith, `scripts/foundation-verify.mjs`, because that is where future work is still adding thin coverage lines.

Acceptance:

- Synthetic plan that adds 100 lines of new verifier behavior to `scripts/foundation-verify.mjs` without a split plan returns `revise`.
- Synthetic plan that touches `scripts/foundation-verify.mjs` only as a thin wrapper/import/source aggregation and puts behavior in a focused module can pass when all other plan requirements are met.
- The rejection includes the large-file split-plan finding.
- The proof is run through the real `evaluatePlanCriticPlan()` path, not string matching.

Proof:

```bash
node --check lib/process-plan-critic.js lib/plan-critic-architectural-rules.js scripts/process-plan-critic-architectural-rules-check.mjs
npm run process:plan-critic-architectural-rules-check -- --json
npm run foundation:verify -- --json-summary
```

## Sprint 3: Verifier Monolith Final Closeout

Card name: `VERIFIER-MONOLITH-FINAL-CLOSEOUT-001`

Goal: Reduce `scripts/foundation-verify.mjs` below the danger line.

Minimum exit:

- Root verifier under 10,000 lines.

Target exit:

- Root verifier under 8,000 lines if achievable without unsafe rewrite behavior.

Approach:

- Split remaining root verifier domains into focused modules.
- Prefer already-visible domain boundaries:
  - source contracts/source lifecycle
  - runtime/system health
  - build log/closeout/process proof
  - intelligence/audit/synthesis
  - UI/frontend/render budgets
  - connector/source credential health
- Each split gets a focused process check.
- Root verifier should become orchestration and aggregation, not the place where new behavior lives.

Acceptance:

- `scripts/foundation-verify.mjs` decreases materially.
- Each extracted module has a named focused proof.
- Full `foundation:verify` remains green.
- No behavior is intentionally changed.
- Dogfood proves the extracted module still catches at least one known failure in its domain.

Proof:

```bash
wc -l scripts/foundation-verify.mjs
node --check scripts/foundation-verify.mjs lib/*.js scripts/process-*-check.mjs
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-MONOLITH-FINAL-CLOSEOUT-001 --commitRef=HEAD
```

## Sprint 4: Critical File Size Health Surface

Card name: `VERIFIER-FILE-SIZE-SYSTEM-HEALTH-001`

Goal: Make monolith growth visible on the Foundation health surface before Steve has to ask.

Why:

Stale jobs are now visible. Monolith growth should be visible too. Steve should not need to run `wc -l` to know that a critical file is growing back into danger.

Acceptance:

- Foundation system health reports tracked critical file sizes.
- Yellow at 5,000+ lines.
- Red at 10,000+ lines.
- Critical tracked files include:
  - `scripts/foundation-verify.mjs`
  - `lib/foundation-db.js`
  - `server.js`
  - `public/foundation.js`
- The Foundation 30-second/operator surface can expose the result.
- Dogfood proves synthetic 5K and 10K thresholds produce yellow/red.

Proof:

```bash
node --check lib/foundation-system-health.js scripts/process-system-health-nightly-audit-check.mjs
npm run process:system-health-nightly-audit-check -- --json
npm run foundation:verify -- --json-summary
```

## Sprint 5: No-Auth Connector Contracts Continue

Card name: `CONNECTOR-REMAINING-SOURCE-CONTRACTS-001`

Goal: Continue connector/source-contract completion only after verifier safety is improved.

Scope:

- Google Sheets
- Google Docs
- Google Slides
- Google Search Console
- Google Analytics
- Google Business Profile
- Reddit
- GitHub
- X/Twitter via available crawl/research path
- Generic Web crawl

Rules:

- No live auth requiring Steve.
- No paid community extraction.
- No external writes.
- Each source gets source contract, extraction posture, atom-flow target, and health/status posture.
- If credentials or auth are missing, record exact blocker and move on.

Acceptance:

- Each no-auth source has explicit contract status: ready, blocked, stale, or auth-required.
- No source is silently marked green.
- Connector matrix/source health reflects the new truth.
- Dogfood proves blocked/auth-required sources do not appear as healthy.

Proof:

```bash
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=CONNECTOR-REMAINING-SOURCE-CONTRACTS-001 --commitRef=HEAD
```

## Sprint 6: Morning Closeout And Next-Decision Packet

Card name: `FOUNDATION-OVERNIGHT-CLOSEOUT-2026-05-17`

Goal: Leave Steve one readable morning packet.

Acceptance:

- Write a closeout summarizing:
  - commits pushed
  - cards closed
  - file sizes before/after
  - proof commands run
  - failures encountered
  - what remains
  - next recommended sprint
- Confirm dirty files left untouched.
- Confirm origin/main matches local HEAD.
- Stop for Steve if it is 07:00 ET or later.

Proof:

```bash
git status --short
git rev-parse HEAD
git rev-parse origin/main
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```


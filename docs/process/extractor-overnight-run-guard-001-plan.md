# EXTRACTOR-OVERNIGHT-RUN-GUARD-001 Plan

## What

Build the fail-closed overnight extraction guard before Mark last-50 or broader creator latest-20 extraction.

This card does not run broad extraction. It creates the governed run envelope that any later God Mode extractor run must pass: exact source approval, small quotas, route budget, artifact namespace, stale/duplicate prevention, retry limits, auth/content boundaries, and morning review.

The next active card after this guard is `SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001`, because Steve wants to test the logged-in subscription mini-brain route before paying API tokens for broad video intelligence.

## Why

The Eyes Quality Loop proved that video-understanding adds value, but it also proved scale-up is dangerous if it turns into broad calls, duplicate rows, stale active runs, or private/auth drift. The system needs a reusable guard before it is allowed to process Mark last-50 or creator latest-20.

This protects the sprint mission: connect source-backed Build Intel into the Dev Team without creating weak transcript-only sludge, account burn, or unreviewed private-source crawling.

## Acceptance Criteria

- The guard evaluates an exact proposed extraction request, not vague "overnight run" intent.
- The allowed pilot is public YouTube only, no auth, no private/paid/community/comment/course extraction.
- The guard enforces source packet approval, max creators, max videos, route call budget, estimated token budget, estimated API cost, max runtime, retry limits, and required morning review.
- The guard blocks missing artifact namespace, stale active source-crawl runs, duplicate recent run fingerprints, and external write/purchase/download/opt-in/form/credential/profile/backlog actions.
- Dogfood proves broad Mark last-50, private Skool, missing artifact path, stale active run, duplicate run, over-budget, and external action cases fail closed.
- The guard is persisted as policy/report truth only; no new source-crawl target is created until `SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001` proves and approves one.
- A Foundation report, proposal-only atoms, evidence hits, and closeout handoff record the policy and the next required proof.
- Current Sprint advances to `SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001`, not Mark last-50.

## Definition Of Done

Done means `EXTRACTOR-OVERNIGHT-RUN-GUARD-001` is closed under `extractor-overnight-run-guard-v1`, guard policy/report truth is persisted without adding a source-crawl target, guard dogfood proves unsafe runs fail closed, the morning-review report reads back from Foundation truth, raw Foundation health remains green, and Current Sprint advances to `SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001`.

## Details

Existing docs, scripts, and code reused:

- Existing docs: `docs/process/god-mode-extractor-eyes-quality-loop-001-plan.md`, `docs/source-notes/god-mode-extractor-research-swarm-2026-05-23.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs`, `scripts/process-youtube-creator-daily-watch-check.mjs`, and Foundation health gates.
- Existing code: `foundation-source-crawl-store`, extraction control snapshots, Brain Fleet runtime ledger snapshots, Foundation intelligence report/atom/hit persistence, Plan Critic, and Current Sprint mutation guards.

New focused code:

- `lib/extractor-overnight-run-guard.js`
- `scripts/process-extractor-overnight-run-guard-check.mjs`

Behavior proof: the focused proof calls actual function paths for extraction control snapshot readback, guard evaluation, dogfood rejection cases, generated target cleanup, report/atom/hit persistence, and Current Sprint overlay update. We reject substring-only proof; marker checks cannot replace the evaluator, DB readback, and live sprint proof.

Gate decision tree: this is a full ship gate. The blast radius includes extraction guard policy truth, report/atom/hit writes, Current Sprint sequencing, closeout registry, verifier coverage, and `process:foundation-ship`. Static-only or focused-only gates are not enough for closeout.

Operator value: Steve gets a simple answer: broad extraction cannot run yet, and the next correct build is the subscription mini-brain adapter test. Later extraction runs inherit the guard instead of relying on a builder remembering the rules from chat.

Speed boundary: the focused proof is fast enough to use by default: it is mostly read-only and synthetic dogfood, should stay under 2 minutes, and does not call Gemini, Codex, Claude, OpenClaw, Skool, MyICOR, or external systems. The only close-card writes are internal Foundation guard report/atom/hit/sprint rows and cleanup of the generated placeholder target if present.

Repair path: if the guard fails because stale runs exist, repair or reap the stale runs before continuing. If the source packet or artifact path is missing, fix the proposed run envelope. If dogfood fails, fix the evaluator. Do not bypass the guard by running broad extraction manually.

## Risks

- A later runner could ignore the guard policy and call extractor code directly. Repair path: the next implementation card must consume this guard evaluator before any broad run.
- Source items can look public but point to auth/member/comment/course surfaces. Repair path: the guard scans source items/resource links and fails closed on forbidden surfaces.
- The mini-brain subscription route may not be reliable enough. Repair path: `SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001` proves or rejects it before scale-up.
- Large runs can create duplicate rows if idempotency is weak. Repair path: the guard requires run fingerprints and duplicate-window checks.

## Not Next

- No Mark last-50 extraction.
- No creator latest-20 extraction.
- No Skool, MyICOR, Gumroad, Calendly, Discord, Reddit login-only, comments, members, paid, private, auth-required, or course source extraction.
- No purchases, downloads, opt-ins, bookings, form submits, credential mutation, browser profile mutation, public posts, emails, or external writes.
- No automatic backlog card creation from findings.
- No Strategy, People, MEETING-VAULT-ACL-001 Phase B, or Drive permission mutation.

## Tests

- `node --check lib/extractor-overnight-run-guard.js`
- `node --check scripts/process-extractor-overnight-run-guard-check.mjs`
- `npm run process:extractor-overnight-run-guard-check -- --close-card --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=EXTRACTOR-OVERNIGHT-RUN-GUARD-001 --planApprovalRef=docs/process/approvals/EXTRACTOR-OVERNIGHT-RUN-GUARD-001.json --closeoutKey=extractor-overnight-run-guard-v1 --commitRef=HEAD`

## Changed Files

- `lib/extractor-overnight-run-guard.js`
- `scripts/process-extractor-overnight-run-guard-check.mjs`
- `docs/process/extractor-overnight-run-guard-001-plan.md`
- `docs/process/approvals/EXTRACTOR-OVERNIGHT-RUN-GUARD-001.json`
- `docs/handoffs/2026-05-23-extractor-overnight-run-guard-closeout.md`
- `lib/foundation-build-closeout-intelligence-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

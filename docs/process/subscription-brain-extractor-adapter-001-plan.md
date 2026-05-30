# SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001 Plan

## What

Prove whether the extractor can use a logged-in subscription mini-brain route for bounded evidence reasoning before broad public YouTube extraction.

The exact proof item is Mark Kashef public YouTube seed video `5xrjO38WUYY`, transcript artifact `SRC-YOUTUBE-INTEL-001:video_transcript:5xrjO38WUYY`, and Eyes report `proof:god-mode-extractor-eyes-quality-loop-001`.

## Why

Steve pays for subscription brains and wants to know whether they can reduce API-token burn. The system already proved Gemini API video understanding is valuable, but that route uses API tokens. This card tests the subscription adapter idea without pretending it replaces video eyes.

## Acceptance Criteria

- The card uses only already-approved public evidence for `5xrjO38WUYY`.
- The adapter uses an already-authenticated local subscription route; no credential mutation is allowed.
- The provider call is wrapped in Brain Fleet quota ledger planned/finished records.
- Claude Code tools are disabled, session persistence is disabled, and the call runs from an empty temp directory.
- The adapter returns strict JSON with usable build candidates, approval boundaries, and fallback policy.
- The adapter explicitly says it can reason over bounded evidence and cannot replace Gemini/API video eyes.
- The proof fails closed on auth, quota, rate-limit, parse failure, credential mutation, private/auth source requests, broad extraction requests, missing ledger, tools, or external writes.
- Persisted Foundation truth includes a proof report, proposal-only atoms, and evidence hits.
- Current Sprint advances to `MARK-KASHEF-LAST-50-BASELINE-001` only after focused proof and raw Foundation gates pass.

## Definition Of Done

Done means `SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001` is closed under `subscription-brain-extractor-adapter-v1`; the local Claude Code subscription route has successfully reasoned over bounded extractor evidence with Brain Fleet ledger proof; credential fingerprints are unchanged; the report/atoms/hits read back from Foundation truth; Gemini/API Eyes remains the direct video-understanding route; and broad extraction remains guarded.

## Details

Existing docs, scripts, and live truth reused:

- `docs/process/extractor-overnight-run-guard-001-plan.md`
- `docs/process/god-mode-extractor-eyes-quality-loop-001-plan.md`
- `lib/claude-code-review-brain-route.js`
- `lib/brain-fleet-quota-ledger.js`
- `intelligence_report_artifacts`, `intelligence_atoms`, and `intelligence_atom_hits`
- Current Sprint truth for `YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21`

New focused code:

- `lib/subscription-brain-extractor-adapter.js`
- `scripts/process-subscription-brain-extractor-adapter-check.mjs`

Behavior proof: the focused proof runs an actual local Claude Code print-mode JSON call with tools disabled and no session persistence. It records a Brain Fleet ledger call before provider execution and finishes it after. It compares Claude credential fingerprints before and after. It rejects unsafe dogfood cases for private/auth sources, broad extraction, video-eyes replacement claims, missing ledger, tools/external writes, and credential mutation.

Gate decision tree: this is a full ship gate. The card writes Foundation intelligence proof artifacts, touches live Current Sprint order, and controls whether Mark last-50 can begin. Static-only checks are not enough.

Operator value: Steve gets a clear answer: subscription mini-brains are useful for bounded reasoning over captured evidence, but they are not yet the eyes. Gemini/API remains the proven video-eyes route until a separate logged-in Gemini/browser route is proven.

Speed boundary: the focused proof is fast enough to use by default and proportional to the card: one video, one transcript artifact, one existing Eyes report, one subscription reasoning call, no crawls, no downloads, no browser automation, no source target creation. Target runtime is under 5 minutes locally; full Foundation gates stay in the final ship path.

Repair path: if Claude auth, quota, output parsing, credential fingerprint, ledger, or Foundation readback fails, the card stays active. The repair is to fix that exact route/auth/proof path, not to run Mark last-50 anyway.

## Risks

- Claude Code subscription may require auth or hit provider limits. Repair path: stop and run Harlan/auth repair, then rerun this card.
- Claude may produce non-JSON output. Repair path: tighten the prompt and parser; do not hide the failure.
- The adapter could be misread as video understanding. Repair path: keep `canReplaceVideoEyes=false` and persist the video-eyes boundary atom.
- Broad extraction pressure can creep in after a successful proof. Repair path: overnight guard remains required and Mark last-50 is a separate card.

## Not Next

- No Mark last-50 run inside this card.
- No Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment extraction.
- No logged-in Gemini browser/subscription proof in this card.
- No purchase, download, opt-in, booking, form submit, external message, credential mutation, browser profile mutation, or external write.
- No automatic backlog cards from findings.
- No Strategy/People work.

## Tests

- `node --check lib/subscription-brain-extractor-adapter.js`
- `node --check scripts/process-subscription-brain-extractor-adapter-check.mjs`
- `npm run process:subscription-brain-extractor-adapter-check -- --close-card --live-claude --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001 --planApprovalRef=docs/process/approvals/SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001.json --closeoutKey=subscription-brain-extractor-adapter-v1 --commitRef=HEAD`

## Changed Files

- `lib/subscription-brain-extractor-adapter.js`
- `scripts/process-subscription-brain-extractor-adapter-check.mjs`
- `docs/process/subscription-brain-extractor-adapter-001-plan.md`
- `docs/process/approvals/SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001.json`
- `docs/_archive/handoffs/2026-05-23-subscription-brain-extractor-adapter-closeout.md`
- `lib/foundation-build-closeout-intelligence-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

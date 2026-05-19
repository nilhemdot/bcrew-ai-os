# Verifier Agent Feedback Split Module Closeout

Date: 2026-05-16
Card: `VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001`
Closeout key: `verifier-agent-feedback-split-module-v1`

## What Changed

Moved the Agent Feedback verifier proof domain out of `scripts/foundation-verify.mjs` into `lib/foundation-agent-feedback-verifier.js`.

The root verifier now delegates the existing PASS/FAIL rows for:

- replay-hardened feedback token/form behavior
- Agent Onboarding Feedback system visibility
- Stage 1 dry-run/send infrastructure
- governed auto-send controls
- response notifications
- reminder cadence and live reminders
- Company Email-only policy
- Steve full-loop gating
- real-user submit repair
- verifier health repair
- production auto-send visibility

## What It Does

The module exports:

- `evaluateFoundationAgentFeedbackVerifier()`
- `buildFoundationAgentFeedbackVerifierDogfoodProof()`
- the card, sprint, closeout, plan, approval, and focused-proof constants for the split.

The root verifier line count dropped from the recorded `13,575` baseline to about `12,900` lines while preserving behavior.

## Why It Matters

Agent Feedback has high trust risk because it touches public feedback links, send infrastructure, production auto-send approval, reminders, Company Email policy, and metadata-only privacy boundaries. Those checks are now inspectable in one focused module instead of buried inside the root verifier monolith.

## Where It Lives

- `lib/foundation-agent-feedback-verifier.js`
- `scripts/process-verifier-agent-feedback-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json` script `process:verifier-agent-feedback-split-module-check`
- `docs/process/verifier-agent-feedback-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Proof

Passed before closeout:

```bash
node --check lib/foundation-agent-feedback-verifier.js
node --check scripts/process-verifier-agent-feedback-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-agent-feedback-split-module-check -- --json
npm run foundation:verify -- --json-summary
```

Results:

- focused proof: 12/12
- Plan Critic: 10/10
- `foundation:verify`: 378/378
- root verifier line count: `13,575` -> about `12,917`

Dogfood proof rejects:

- replay gaps
- dry-run side effects
- ungated production auto-send
- personal-email routing
- private feedback proof leakage

Final ship proof:

```bash
npm run process:foundation-ship -- --card=VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001.json --closeoutKey=verifier-agent-feedback-split-module-v1 --commitRef=HEAD
```

## Known Limits

- This does not split all of `scripts/foundation-verify.mjs`.
- This does not change Agent Feedback send behavior.
- This does not change route, auth, source, DB schema, backlog, Current Sprint, connector, or source contract behavior.
- This does not run extraction or use paid-source auth.
- This does not build hub features, Marketing Video Lab live wiring, Canva asset library work, Build Intel extraction, or Drive permission mutation.

## Review Next

Continue the standard-mode no-auth Foundation cleanup queue with the next coherent verifier proof-domain split. If the next verifier slice is too broad, return to bounded store splits or route-payload latency work.

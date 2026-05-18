# Foundation Agent Usefulness Runtime Gates Closeout

Card: `FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001`

Closeout key: `foundation-agent-usefulness-runtime-gates-v1`

## What Changed

- Added `lib/foundation-agent-usefulness-runtime-gates.js`.
- Added focused proof `scripts/process-foundation-agent-usefulness-runtime-gates-check.mjs`.
- Added plan and approval artifacts:
  - `docs/process/foundation-agent-usefulness-runtime-gates-001-plan.md`
  - `docs/process/approvals/FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001.json`
- Wired runtime reliability verifier coverage and done-card coverage.
- Added the next-card current-progress allowlist for `AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001` while keeping `scripts/foundation-verify.mjs` under 5,000 lines.
- Registered closeout key `foundation-agent-usefulness-runtime-gates-v1`.
- Updated current plan/state to record the shipped gate bundle.

## What It Does

The gate bundle defines the runtime checks required before an agent can sound current, capable, or action-ready:

- live-answer preflight
- capability registry evidence
- action permission contract
- stale-data warning
- source-backed status claim guard
- failure visibility
- prompt-only rule rejection

## Why It Matters

Agents should be useful because the system enforces source-backed behavior, not because a prompt asks them to remember rules. The bundle makes Harlan, Crewbert, role assistants, and specialist workers start from fail-closed runtime proof before deeper agent work begins.

## Proof

Focused proof:

```bash
npm run process:foundation-agent-usefulness-runtime-gates-check -- --close-card --json
```

Full proof:

```bash
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001.json --closeoutKey=foundation-agent-usefulness-runtime-gates-v1 --commitRef=HEAD
```

Dogfood rejects:

- prompt-only rules
- stale current answers
- undeclared capability claims
- unapproved side effects
- stale data without warning
- hidden subagents or workers without explicit approval
- hidden failures

## Not Done

This does not build Harlan UI.

This does not launch live agent runtime work.

This does not implement the full capability registry or reusable agent template.

This does not run live extraction, auth-required or paid jobs, provider/model probes, external writes, Drive permission mutation, or Agent Feedback auto-send.

This does not launch hidden subagents or parallel builders.

## Next

Continue with `AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001` unless repo truth surfaces a higher P0 repair.

# OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001 Plan

Card: `OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001`

Closeout key: `old-system-agent-onboarding-harvest-v1`

## What

Read the old BCrew-Buddy onboarding/coaching evidence and promote only durable keep/rebuild/retire lessons into Foundation repo truth for `AGENT-010`.

This card captures:

- evidence source metadata
- keep/rebuild/retire lessons
- profile fields
- calibration questions
- coaching loop requirements
- failure and non-engagement handling
- proof requirements for `AGENT-010`

This card does not implement `AGENT-010`, launch Harlan, run live extraction, call models/providers, send Telegram/Gmail/ClickUp/Agent Feedback messages, mutate Drive, or promote raw private transcripts/profile data into repo truth.

## Why

The old system contains useful personal-agent onboarding lessons, but it also contains stale implementation details, old adoption claims, and private evidence. Operator value: Steve gets the useful lessons preserved for the next personal-agent contract without making the new system inherit old-system debt or privacy risk.

Useful operator behavior unlocked: when Steve pulls `AGENT-010`, the builder has a compact, source-backed onboarding packet that says what to ask, what profile fields to keep private, what old patterns to retire, and what proof must fail closed. That improves quality and speed in the real workflow because Steve does not have to re-explain the old system or police private/transcript leakage by memory.

## Acceptance Criteria

- Live backlog card is enriched and moved through Current Sprint truth.
- `docs/agents/old-system-agent-onboarding-harvest.md` captures evidence metadata, keep/rebuild/retire lessons, profile fields, calibration questions, and `AGENT-010` proof requirements.
- `lib/old-system-agent-onboarding-harvest.js` defines the harvest contract, evaluator, and dogfood proof.
- Missing evidence metadata fails closed.
- Missing keep/rebuild/retire disposition fails closed.
- Thin profile fields or calibration questions fail closed.
- Raw private content promotion fails closed.
- Runtime launch, extraction, model calls, external writes, and hidden-subagent attempts fail closed.
- The dogfood proof calls the actual harvest evaluator/function path and rejects weak synthetic harvests; it is behavior proof, not substring-only proof.
- Runtime reliability verifier coverage and done-card coverage are wired.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001` is a live done card under `old-system-agent-onboarding-harvest-v1`, Current Sprint points next to `AGENT-010`, focused proof and full ship gates pass, and the commit is pushed.

Done does not mean `AGENT-010` is implemented or Harlan runtime work has launched.

## Risks

- Scope drift into `AGENT-010` implementation. Mitigation: V1 is read-only evidence harvest/proof only.
- Privacy leak from old transcripts/profile evidence. Mitigation: commit metadata and lessons only, not raw private content.
- Treating old-system implementation as active truth. Mitigation: every lesson has keep/rebuild/retire disposition.
- Scope drift into live messaging or bot setup. Mitigation: all Telegram/Gmail/ClickUp/Agent Feedback sends are explicitly not next.

## Details

Existing work to reuse:

- `agent-template-runtime-contract-v1`
- `agent-capability-registry-v1`
- `agent-live-answer-preflight-gate-v1`
- `docs/agents/personal-agent-onboarding.md`
- `docs/rebuild/agent-architecture.md`
- old-system evidence under `~/bcrew-buddy-reference`
- Current Sprint metadata guards, Plan Critic, closeout registry, and Foundation ship gates

Scope boundaries:

- Tight V1 scope: evidence metadata, keep/rebuild/retire harvest, AGENT-010 prep fields, dogfood, closeout, and verifier wiring.
- Not next: `AGENT-010` implementation, Harlan UI, live runtime launch, live extraction, model/provider calls, external writes, Drive permission mutation, request-access emails, Meeting Vault Phase B, hidden subagents, or parallel builders.
- No raw private transcript or private profile content in repo truth.

Behavior proof:

- `buildOldSystemAgentOnboardingHarvestDogfoodProof()` round-trips the real `evaluateOldSystemAgentOnboardingHarvest()` function path against healthy and broken fixtures.
- Broken fixtures remove evidence, remove the retire disposition, thin the private profile, thin calibration questions, promote raw private content, and attempt runtime/extraction/model/external-write/hidden-subagent side effects.
- The focused proof rejects substring-only proof as insufficient; string markers in docs/verifier wiring are supporting artifact checks only after the function behavior fails closed.

Gate decision tree:

- Static gate: `node --check` for the harvest module, runtime verifier wiring, focused proof script, and root verifier syntax.
- Focused gate: `npm run process:old-system-agent-onboarding-harvest-check -- --close-card --json` proves harvest behavior and live backlog/current sprint readback.
- Full gate: `npm run foundation:verify -- --json-summary` and `process:foundation-ship` because this is a P0 agent-runtime governance card with verifier and Current Sprint blast radius.

## Tests

```bash
node --check lib/old-system-agent-onboarding-harvest.js lib/foundation-runtime-reliability-verifier.js scripts/process-old-system-agent-onboarding-harvest-check.mjs scripts/foundation-verify.mjs
npm run process:old-system-agent-onboarding-harvest-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001 --planApprovalRef=docs/process/approvals/OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001.json --closeoutKey=old-system-agent-onboarding-harvest-v1 --commitRef=HEAD
```

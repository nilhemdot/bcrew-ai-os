# VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001 Plan

Card: `VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001`
Sprint: `verifier-agent-feedback-split-module-2026-05-16`
Closeout key: `verifier-agent-feedback-split-module-v1`

## What

Extract the Agent Feedback verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-agent-feedback-verifier.js` without changing runtime behavior, public routes, send behavior, DB schema, source contracts, backlog mutation behavior, Current Sprint behavior, or hub features.

This is a verifier monolith cleanup card. It keeps the existing Agent Feedback proof rows intact while moving them into a named verifier domain module.

## Why

The root verifier is still too large to audit quickly. Agent Feedback is one of the highest-risk proof domains because it covers public feedback tokens, dry-run send infrastructure, production auto-send gating, reminder sends, company-email-only policy, real-user submit repair, and metadata-only proof boundaries. Those checks should be inspectable without reading a 13K-line verifier.

Useful operator behavior: Steve gets a tighter Foundation gate where Agent Feedback safety is in one drawer. This unlocks better speed and quality in a real workflow: future work can audit whether feedback links are replay-hardened, dry-runs stay no-send, production auto-send remains approval-gated, and private proof stays metadata-only without hunting through the root verifier.

## Details

### Existing Work

- `scripts/foundation-verify.mjs` currently owns inline Agent Feedback checks for token/link replay hardening, Agent Onboarding Feedback system visibility, Stage 1 send infrastructure, governed auto-send, response notifications, reminder cadence, live reminders, Company Email policy, Steve full-loop gating, real-user submit repair, verifier health repair, and production auto-send visibility.
- Existing behavior modules remain unchanged: `lib/foundation-agent-feedback*.js`, `lib/foundation-agent-feedback-store.js`, `lib/google-delegated.js`, `lib/foundation-jobs.js`, route modules, Foundation Hub, and Ops Hub.
- Prior verifier split cards established the safe pattern: focused module, root delegation, read-only focused proof script, dogfood fixtures, live backlog/Plan Critic/approval proof, and Recent Builds closeout registration.

### V1 Scope

1. Add `lib/foundation-agent-feedback-verifier.js`.
2. Move existing Agent Feedback verifier predicates out of the root verifier into the focused module.
3. Keep the same PASS/FAIL row names for the moved checks.
4. Add `scripts/process-verifier-agent-feedback-split-module-check.mjs` as a read-only focused proof.
5. Add package script `process:verifier-agent-feedback-split-module-check`.
6. Add dogfood proof recreating the failure class: replay gap, dry-run side effects, ungated production auto-send, personal-email routing, and private feedback proof leakage.
7. Update Current Plan, Current State, and Recent Builds closeout records after proof passes.

### Gate Decision Tree

- Focused proof required: `npm run process:verifier-agent-feedback-split-module-check -- --json`.
- The focused proof is read-only by default. This card introduces no live-state mutation path; any future process-check mutation would require explicit `--apply` posture and a separate plan.
- Full gate required before push: `npm run process:foundation-ship -- --card=VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001.json --closeoutKey=verifier-agent-feedback-split-module-v1 --commitRef=HEAD`.
- Expected focused proof budget: fast, under 1 minute, because it is read-only and does not call Gmail, ClickUp, Canva, paid source auth, or live extraction.
- Expected final ship gate budget: under 300 seconds, consistent with the current Foundation ship gate target.

### Not Next Boundaries

- No Gmail sends, ClickUp writes, Canva calls, source extraction, paid-source auth, or live production changes.
- No route/auth/source/DB/backlog behavior changes.
- No production auto-send policy changes.
- No hub feature work.
- No Marketing Video Lab live wiring.
- No connector auth or new source work.
- No Drive permission mutation, request-access emails, or `MEETING-VAULT-ACL-001` Phase B.

## Acceptance Criteria

- Root verifier line count is below `13,575`.
- New module owns Agent Feedback verifier checks and dogfood proof.
- Root verifier delegates to `evaluateFoundationAgentFeedbackVerifier()`.
- Old inline root verifier checks for `agent onboarding feedback form is source-backed and replay-hardened` and `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 production auto-send is live and visible` are absent from the root verifier.
- Dogfood proof recreates the failure class and must fail closed when:
  - a feedback form replay gap is introduced
  - a dry-run send path has side effects
  - production auto-send is ungated
  - personal email is allowed instead of Company Email
  - private Agent Feedback proof leaks raw data instead of metadata-only evidence
- Focused proof script is read-only and passes.
- Full Foundation ship gate passes before push.
- Behavior proof, not substring proof: the focused proof rejects substring-only evidence and exercises dogfood fixtures for the original failure modes.

## Definition Of Done

- Live backlog contains `VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001` with Plan Critic pass evidence and a valid approval file.
- Current Sprint shows the card in Building Now during implementation and Done This Sprint after closeout.
- Recent Builds has closeout key `verifier-agent-feedback-split-module-v1` with the commit subject matcher.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` name the closeout key.
- Proof commands pass:
  - `node --check lib/foundation-agent-feedback-verifier.js`
  - `node --check scripts/process-verifier-agent-feedback-split-module-check.mjs`
  - `node --check scripts/foundation-verify.mjs`
  - `node --check lib/foundation-build-closeout-overnight-records.js`
  - `npm run process:verifier-agent-feedback-split-module-check -- --json`
  - `npm run backlog:hygiene -- --json`
  - `npm run foundation:verify -- --json-summary`
  - `npm run process:foundation-ship -- --card=VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001.json --closeoutKey=verifier-agent-feedback-split-module-v1 --commitRef=HEAD`

## Risks

- False-green risk: moved checks could become substring theater. Mitigation: focused dogfood rejects the original failure classes.
- Behavior-change risk: extracting a block could skip or weaken an Agent Feedback check. Mitigation: keep existing row names, run the full verifier, and require the old inline high-risk patterns to be absent from root while module proof passes.
- Send-risk regression: Agent Feedback touches production auto-send. Mitigation: no send path or production policy is changed; proof is read-only and metadata-only.
- Sprint-truth drift risk: code could ship without live sprint/closeout agreement. Mitigation: focused proof checks approval, Plan Critic row, Current Sprint, Recent Builds, current plan, and current state.

## Tests

- Static syntax checks for new module, focused proof, root verifier, and closeout registry.
- Plan approval validation at 9.8+.
- Plan Critic must pass this seven-section plan before live sprint work is marked Building Now.
- Focused proof must pass and prove dogfood rejection for replay gap, dry-run write, ungated auto-send, personal-email routing, and private proof leak fixtures.
- Full Foundation verification and ship gate must pass before commit/push.

# VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001 Plan

Card: `VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001`
Sprint: `verifier-process-trust-split-module-2026-05-16`
Closeout key: `verifier-process-trust-split-module-v1`

## What

Extract the process-trust verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-process-trust-verifier.js` without changing route behavior, DB schema, source contracts, backlog mutation behavior, Current Sprint behavior, process hook behavior, worker behavior, or hub features.

This is a verifier monolith cleanup card. It keeps the existing PASS/FAIL rows intact while moving process-trust assertions into a named verifier domain module.

## Why

The root verifier is still above the 10K-line danger line. Process trust is one of the highest-blast-radius proof domains because it decides whether Steve can trust green checks, Recent Work, worker served-code proof, done-card coverage, claimed artifacts, and post-ship fanout.

Useful operator behavior: Steve gets the same proof rows, but the proof is now inspectable in one smaller drawer instead of buried inside a 12K-line verifier. In the real daily workflow this means a failed ship gate can point to "process trust" instead of forcing Steve/Codex to hunt through the entire verifier, and a green ship stays meaningful because done-card proof, claimed artifacts, worker served-code trust, and fanout proof remain checked together.

## Details

### Existing Work

- `scripts/foundation-verify.mjs` currently owns inline process-trust checks for backlog hygiene, process hooks, fanout, worker served-code trust, done-card proof enforcement, claimed-artifact enforcement, and post-ship fanout.
- `lib/foundation-surface-trust-verifier.js` already owns the low-level done-card and artifact claim detectors.
- `lib/post-ship-fanout.js` already owns the low-level post-ship fanout detector.
- Prior verifier split cards established the safe pattern: focused module, root delegation, read-only focused proof script, dogfood fixtures, live backlog/Plan Critic/approval proof, and Recent Builds closeout registration.

### V1 Scope

1. Add `lib/foundation-process-trust-verifier.js`.
2. Move existing process-trust verifier predicates out of the root verifier into the focused module.
3. Keep the same PASS/FAIL row names for the moved checks.
4. Add `scripts/process-verifier-process-trust-split-module-check.mjs` as a read-only focused proof.
5. Add package script `process:verifier-process-trust-split-module-check`.
6. Add dogfood proof recreating the failure class: missing ship-check evidence, missing fanout evidence, stale worker served-code trust, missing done-card coverage, missing claimed-artifact gate, and missing post-ship fanout detector.
7. Update Current Plan, Current State, and Recent Builds closeout records after proof passes.

### Gate Decision Tree

- Focused proof required: `npm run process:verifier-process-trust-split-module-check -- --json`.
- Full gate required before push: `npm run process:foundation-ship -- --card=VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001.json --closeoutKey=verifier-process-trust-split-module-v1 --commitRef=HEAD`.
- This card touches the canonical verifier, so full Foundation ship gate is required before push.
- Speed budget: keep the focused proof fast and proportional. It should stay under 60 seconds, and the final Foundation ship gate should stay under the existing 300-second target. If the focused proof becomes slow, split the proof or remove unnecessary live reads instead of accepting a slower default gate.

### Not Next Boundaries

- No route/auth/source/DB/backlog behavior changes.
- No process hook policy changes.
- No worker scheduling changes.
- No source extraction, paid-source auth, Canva writes, Gmail sends, ClickUp writes, or live provider calls.
- No hub feature work or Marketing Video Lab wiring.
- No Drive permission mutation, request-access emails, or `MEETING-VAULT-ACL-001` Phase B.

## Acceptance Criteria

- Root verifier line count is below `12,918`.
- New module owns process-trust verifier checks and dogfood proof.
- Root verifier delegates to `evaluateFoundationProcessTrustVerifier()`.
- Old inline root verifier checks for `Backlog hygiene and process-gate cards are captured` and `POST-SHIP-FAN-OUT-001 closes post-ship fanout gate with proof` are absent from the root verifier.
- Dogfood proof recreates the failure class and must fail closed when:
  - process ship-check evidence is missing
  - fanout evidence is missing
  - worker served-code trust is stale or missing
  - done-card coverage enforcement is missing
  - claimed-artifact enforcement is missing
  - post-ship fanout detector is missing
- Focused proof script is read-only and passes.
- Full Foundation ship gate passes before push.
- Behavior proof, not substring proof: the focused proof rejects failure fixtures and verifies root delegation plus old-inline absence.

## Definition Of Done

- Live backlog contains `VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001` with Plan Critic pass evidence and a valid approval file.
- Current Sprint shows the card in Building Now during implementation and Done This Sprint after closeout.
- Recent Builds has closeout key `verifier-process-trust-split-module-v1` with the commit subject matcher.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` name the closeout key.
- Proof commands pass:
  - `node --check lib/foundation-process-trust-verifier.js`
  - `node --check scripts/process-verifier-process-trust-split-module-check.mjs`
  - `node --check scripts/foundation-verify.mjs`
  - `node --check lib/foundation-build-closeout-overnight-records.js`
  - `npm run process:verifier-process-trust-split-module-check -- --json`
  - `npm run backlog:hygiene -- --json`
  - `npm run foundation:verify -- --json-summary`
  - `npm run process:foundation-ship -- --card=VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001.json --closeoutKey=verifier-process-trust-split-module-v1 --commitRef=HEAD`

## Risks

- False-green risk: moved checks could become substring theater. Mitigation: focused dogfood rejects the original process-proof failure classes.
- Behavior-change risk: extracting a block could skip or weaken a process-trust check. Mitigation: keep existing row names, run the full verifier, and require old inline high-risk patterns to be absent from root while module proof passes.
- Process-drift risk: this proof touches the rules that make ships trustworthy. Mitigation: no process hook behavior is changed; this is extraction and delegation only.

## Tests

- Static syntax checks for new module, focused proof, root verifier, and closeout registry.
- Plan approval validation at 9.8+.
- Plan Critic must pass this seven-section plan before live sprint work is marked Building Now.
- Focused proof must pass and prove dogfood rejection for missing ship-check, fanout, worker-code, done-coverage, claimed-artifact, and post-ship-fanout fixtures.
- Full Foundation verification and ship gate must pass before commit/push.

# VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001 Plan

Card: `VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001`
Sprint: `verifier-process-hardening-split-module-2026-05-16`
Closeout key: `verifier-process-hardening-split-module-v1`

## What

Extract the process-hardening verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-process-hardening-verifier.js` without changing runtime behavior, route behavior, DB schema, source contracts, backlog mutation behavior, or hub features.

This is a verifier monolith cleanup card. It makes the proof for read-only verification, process-check write boundaries, scheduled mutation guards, DB init/seed separation, Current Sprint mutation guards, and backlog concurrency inspectable in a focused module instead of buried in the root verifier.

## Why

The verifier is still a high-risk monolith. Keeping process-hardening checks inline in `scripts/foundation-verify.mjs` makes the most important trust boundaries hard to inspect and easier to weaken accidentally. Steve should not need to know where a 13K+ line verifier hides the proof that green checks are honest; this module keeps that proof in one named place.

Operator value: this unlocks a useful thing for Steve and the team: future Foundation builds can audit "can checks write, can verifiers repair, can sprint/backlog state be silently mutated" without reading the whole root verifier. That keeps green gates meaningful while improving speed and quality.

## Details

### Existing Work

- `scripts/foundation-verify.mjs` currently owns the inline checks for read-only verification, process-check write boundaries, scheduled mutation guards, Foundation DB init/seed separation, Current Sprint mutation guards, DB seed posture, KPI cache posture, Current Sprint store split, and backlog concurrency.
- Existing modules already implement the behavior under test: `lib/process-write-guard.js`, `lib/process-check-readonly-mode.js`, `lib/sprint-check-historical-mode.js`, `lib/foundation-jobs.js`, `lib/foundation-db.js`, `lib/foundation-current-sprint-store.js`, `lib/foundation-backlog-store.js`, and `lib/backlog-store-concurrency.js`.
- Prior verifier split cards established the pattern: focused module, read-only focused proof script, dogfood fixtures, root verifier delegation, Recent Builds closeout, and full Foundation ship gate.

### V1 Scope

1. Add `lib/foundation-process-hardening-verifier.js`.
2. Move the existing process-hardening verifier predicates out of the root verifier into the new focused module.
3. Keep the same PASS/FAIL row names for the moved checks.
4. Add `scripts/process-verifier-process-hardening-split-module-check.mjs` as a read-only focused proof.
5. Add package script `process:verifier-process-hardening-split-module-check`.
6. Add dogfood proof recreating the failure class: repair-then-pass verifier, scheduled mutating process check, seed/repair writing by default, and silent backlog lost update.
7. Update Current Plan, Current State, and Recent Builds closeout records after proof passes.

### Gate Decision Tree

- Focused proof required: `npm run process:verifier-process-hardening-split-module-check -- --json`.
- Full gate required before push: `npm run process:foundation-ship -- --card=VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001.json --closeoutKey=verifier-process-hardening-split-module-v1 --commitRef=HEAD`.
- Expected focused proof budget: fast, under 1 minute, because it is read-only and avoids external network/source extraction.
- Expected final ship gate budget: under 300 seconds, consistent with the current Foundation ship gate target.

### Not Next Boundaries

- No route/auth/source/DB/backlog behavior changes.
- No new process guard behavior.
- No verifier weakening.
- No hub feature work.
- No Canva asset-library work.
- No connector auth or paid-source work.
- No extraction runs.
- No Drive permission mutation, request-access emails, or `MEETING-VAULT-ACL-001` Phase B.

## Acceptance Criteria

- Root verifier line count is below `13,743`.
- New module owns process-hardening verifier checks and dogfood proof.
- Root verifier delegates to `evaluateFoundationProcessHardeningVerifierChecks()`.
- Old inline `VERIFY-READONLY-GATE-001` and `BACKLOG-STORE-CONCURRENCY-001` ensure blocks are absent from the root verifier.
- Dogfood proof recreates the failure class and must fail closed when:
  - a verifier path can repair live state before passing
  - a scheduled mutating process check is not blocked
  - seed/bootstrap code would write live truth by default
  - backlog concurrent writes can silently lose one writer
- Focused proof script is read-only and passes.
- Full Foundation ship gate passes before push.
- Behavior proof, not substring proof: the focused proof rejects substring-only evidence and exercises dogfood fixtures for the original failure modes.

## Definition Of Done

- Live backlog contains `VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001` with Plan Critic pass evidence and a valid approval file.
- Current Sprint shows the card in Building Now during implementation and Done This Sprint after closeout.
- Recent Builds has closeout key `verifier-process-hardening-split-module-v1` with the commit subject matcher.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` name the closeout key.
- Proof commands pass:
  - `node --check lib/foundation-process-hardening-verifier.js`
  - `node --check scripts/process-verifier-process-hardening-split-module-check.mjs`
  - `node --check scripts/foundation-verify.mjs`
  - `node --check lib/foundation-build-closeout-overnight-records.js`
  - `npm run process:verifier-process-hardening-split-module-check -- --json`
  - `npm run backlog:hygiene -- --json`
  - `npm run foundation:verify -- --json-summary`
  - `npm run process:foundation-ship -- --card=VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001.json --closeoutKey=verifier-process-hardening-split-module-v1 --commitRef=HEAD`

## Risks

- False-green risk: moved checks could become substring theater. Mitigation: keep real dogfood fixtures that fail closed on the original audit failure classes.
- Behavior-change risk: extracting a block could accidentally skip a check. Mitigation: focused proof requires old high-risk inline patterns to be absent from root and equivalent module checks to pass.
- Monolith-regression risk: adding proof into root verifier would grow the file again. Mitigation: Plan Critic requires the split plan, and this card adds the extracted module instead of expanding the root.
- Sprint-truth drift risk: code could ship without live sprint/closeout agreement. Mitigation: focused proof checks approval, Plan Critic row, Current Sprint, Recent Builds, current plan, and current state.

## Tests

- Static syntax checks for new module, focused proof, root verifier, and closeout registry.
- Plan approval validation at 9.8+.
- Plan Critic must pass this seven-section plan before live sprint work is marked Building Now.
- Focused proof must pass and prove dogfood rejection for repair-then-pass, scheduled mutation, seed writeback, and backlog lost update fixtures.
- Full Foundation verification and ship gate must pass before commit/push.

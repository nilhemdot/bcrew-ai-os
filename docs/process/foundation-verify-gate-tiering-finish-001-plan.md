# FOUNDATION-VERIFY-GATE-TIERING-FINISH-001 Plan

## What
Finish the proportional verifier gate before any verifier/check cleanup starts. V1 closes the specific audit-risk gap where protected verifier, approval, plan, or process files can disappear while still being treated as a focused proof path. Deleted protected files must require the full ship/repoint path instead of producing a focused command that points at a missing file.

## Why
Steve's audit guardrail is right: do not bulk-delete verifier files first because existing gates read named files and can crash when they vanish. The operator value is faster safe work in the real workflow: small edits stay focused, archive/delete moves cannot sneak through as "fast" work, and the team gets better speed and quality without asking Steve to police cleanup by hand.

## Acceptance Criteria
- Protected Foundation file deletion is detected from real git diff text, not from a marker-only list.
- Deleted protected files classify as `full`, with a reason that says the gate must be repointed before archiving.
- Focused proof commands do not include `node --check` for a file that was deleted.
- Existing focused paths stay fast for docs/process/surface edits and additive backlog-card captures.
- Full-risk paths remain full for server, package, canonical verifier, security, schema/database, extraction, intelligence, source, and runtime substrate changes.
- No verifier, approval, plan, check, source/browser proof, or Dev Hub System Truth file is archived in this card.

## Definition Of Done
`lib/process-verify-gate-tiering.js` owns deletion-aware classification and synthetic proof cases. `scripts/process-verify-gate-tiering-check.mjs` records focused proof using the actual HEAD diff, so a deletion commit cannot hide from the classifier. Live Current Sprint has this finish card in Building Now with this plan, proof commands, and not-next boundaries. Roadmap/startup/backlog/full verification stay green.

## Details
Reuse existing code in `lib/process-verify-gate-tiering.js`, `lib/process-git-hooks.js`, `scripts/process-verify-gate-tiering-check.mjs`, `scripts/process-foundation-tuneup-roadmap-check.mjs`, and the existing focused proof record path under `.git/foundation-focused-verify-proof.json`. Reuse existing docs in `docs/process/verify-gate-tiering-001-plan.md`, `docs/process/foundation-tuneup-roadmap-001-plan.md`, `AGENTS.md`, `CLAUDE.md`, and current plan/state. Reuse existing live backlog and Current Sprint truth.

The dogfood proof must exercise the actual function path in the real classifier with synthetic git diff text that looks like a deleted `scripts/process-*-check.mjs` file. No substring-only proof is accepted: if a check merely sees "deleted" in source text, the plan should fail closed. The proof also keeps old good cases: docs are focused, hook policy is focused, canonical verifier is full, server/security is full, additive backlog-card capture is focused, and schema/function changes in `lib/foundation-db.js` are full.

Gate decision tree signals: `static`, `focused`, `full`, blast radius, `process:foundation-ship`, `foundation:verify`, and `process:verify-gate-tiering-check`. Gate decision: focused while editing this card because it touches gate policy and process proof only. Full `foundation:verify` still runs before handoff because this is Foundation control-plane work. If a deleted protected file is part of a future cleanup, the pre-push gate must require `process:foundation-ship` or an explicit bypass card/reason after the gate is repointed.

## Risks
Risk: making too many harmless deletes full-gate. Repair path: keep the rule scoped to protected Foundation inputs and revise with a more precise status map later if needed. Risk: weakening the fast path. Repair path: synthetic cases must prove existing focused paths still classify as focused. Risk: treating this as cleanup approval. Repair path: this card archives nothing and only changes the gate.

## Tests
- `node --check lib/process-verify-gate-tiering.js scripts/process-verify-gate-tiering-check.mjs lib/process-git-hooks.js`
- `npm run process:verify-gate-tiering-check`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

## Not Next
Do not start the per-hub folder restructure. Do not delete or archive verifier, approval, plan, check, closeout, source/browser proof, route-policy, source-session readiness, or Dev Hub System Truth files. Do not delete `scripts/codex-status.mjs`. Do not mutate Drive permissions, run Meeting Vault Phase B, broaden source extraction, use Browserbase, or make external writes.

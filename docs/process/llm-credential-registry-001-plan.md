# LLM-CREDENTIAL-REGISTRY-001 Plan

## What

Build a narrow V1 registry-policy layer for `LLM-CREDENTIAL-REGISTRY-001`. The work extends the existing `llm_credentials` and `llm_routes` records through their DB-backed `metadata.capacityPolicy` fields, using the already-proven capacity lane definitions from `LLM-HUB-CAPACITY-001`.

This is registry truth only. It does not run live model calls, rotate secrets, wire Harlan terminal execution, add Fal image editing, add voice, change Canva, or touch hub features.

## Why

Steve needs to know which AI capacity is actually usable before assuming Harlan, OpenClaw, Codex, Claude Code, Gemini, or API fallback can do a job. The useful operator behavior is simple: Foundation should show who owns each model lane, what it can do, what fallback exists, how to stop it, what it costs/caps, and when it was last probed.

The exact gap is that `LLM-HUB-CAPACITY-001` made capacity visible, but some of that policy still lives in code definitions instead of the live credential and route registry rows. This card promotes the policy into DB-backed registry metadata without exposing secret values.

This unlocks a real workflow for Steve: before asking Harlan, a hub, or a build worker to use model capacity, the Foundation Runtime page can answer whether that lane is ready, who owns it, what fallback exists, and where to stop it if it misbehaves.

## Acceptance Criteria

- `llm_credentials.metadata.capacityPolicy` exists for every capacity-lane-backed credential.
- `llm_routes.metadata.capacityPolicy` exists for every primary or fallback route referenced by a capacity lane.
- Each capacity policy includes owner, lane keys, workload/hub coverage, budget/cap, pacing, account window, stop control, fallback route references, and source/version.
- The Foundation LLM Runtime panel shows capacity ownership, fallback, and latest probe context from the existing runtime snapshot.
- A focused proof verifies live DB-backed registry metadata, rejects missing/weak policy metadata, rejects secret-shaped policy leaks, and proves the default check is read-only.
- The first metadata sync requires explicit `--apply`; the normal proof runs read-only after the sync.

## Definition Of Done

- Reuse existing code: `lib/foundation-llm-runtime-store.js`, `lib/llm-hub-capacity.js`, `llm_credentials`, `llm_routes`, probes, and Runtime panel rendering.
- Reuse existing docs: `docs/rebuild/current-runtime-map.md`, `docs/process/llm-hub-capacity-001-plan.md`, and `docs/handoffs/2026-05-17-llm-hub-capacity-closeout.md`.
- Reuse existing scripts/gates: Plan Critic, `foundation:verify`, `process:foundation-ship`, and read-only process-check write guard.
- New focused proof: `npm run process:llm-credential-registry-check -- --json`.
- Apply proof: `npm run process:llm-credential-registry-check -- --json --apply`.
- Full ship proof passes before push.

## Details

Implementation is intentionally small:

- Add `lib/llm-credential-registry.js` as a pure policy/evaluator module.
- Add `scripts/process-llm-credential-registry-check.mjs` as the focused proof and guarded one-time metadata sync.
- Extend `getLlmRuntimeSnapshot()` to expose `credentialRegistry` summary and rows.
- Update the Foundation LLM Runtime renderer to show owner, fallback, and last probe context.
- Add thin verifier coverage so the done card is not a false-green orphan. Split plan / large-file rule: `scripts/foundation-verify.mjs` stays read-only and only imports the new registry module into existing coverage aggregation; it gets no new verifier responsibility, no live-state mutation, and no repair path. New registry responsibility lives outside the verifier monolith in `lib/llm-credential-registry.js`.

Behavior proof uses actual function paths. No substring-only proof is accepted. The proof calls the actual evaluator against live runtime rows and synthetic weak fixtures:

- missing metadata fails;
- missing owner fails;
- missing stop control fails;
- missing budget/cap fails;
- secret-shaped policy values fail;
- live rows pass only after the guarded registry sync writes metadata.

This is active sprint scope owned by the main Foundation session. Main session owns the shared Foundation files for this sprint, requested shared files are declared through this plan, and no side/hub chat is allowed to commit, push, merge, or ship these shared files.

## Risks

Root risk: registry policy becomes another static copy that drifts from real route status.

Mitigation: the policy metadata stores ownership and guardrails only; live status still comes from existing credential, route, probe, and call rows. If proof fails, do not loosen checks. Repair path is to rerun the guarded sync from capacity lane definitions or reopen `LLM-HUB-CAPACITY-001` if the lane definitions are wrong.

There is also DB write risk because this card updates `llm_credentials` and `llm_routes` metadata. The script is read-only by default and requires explicit `--apply`; it writes no secrets and does not change credential status, policy classification, route priority, model, or auth path.

## Tests

- `node --check lib/llm-credential-registry.js scripts/process-llm-credential-registry-check.mjs lib/foundation-llm-runtime-store.js public/foundation-runtime-renderers.js`
- `npm run process:llm-credential-registry-check -- --json --apply`
- `npm run process:llm-credential-registry-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=LLM-CREDENTIAL-REGISTRY-001 --planApprovalRef=docs/process/approvals/LLM-CREDENTIAL-REGISTRY-001.json --closeoutKey=llm-credential-registry-v1 --commitRef=HEAD`

Gate decision: full. This touches Foundation runtime policy, DB metadata, dashboard rendering, verifier coverage, and ship surfaces.

## Not Next

- Do not run live OpenClaw, Claude Code, OpenAI, Anthropic, Gemini, Fal, Canva, or ElevenLabs calls.
- Do not rotate, print, add, or commit secrets.
- Do not build Harlan terminal runtime, Fal image iteration, voice wiring, Canva routes, Marketing Video Lab routes, or hub features.
- Do not modify provider auth, account login, paid-source extraction, Skool, myICOR, Loom, MEETING-VAULT-ACL-001 Phase B, or Drive permissions.
- Do not make consumer subscriptions production/customer-facing capacity.

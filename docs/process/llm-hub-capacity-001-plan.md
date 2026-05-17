# LLM-HUB-CAPACITY-001 Plan

Card: `LLM-HUB-CAPACITY-001`
Sprint: `llm-hub-capacity-2026-05-17`
Closeout key: `llm-hub-capacity-v1`

## What

Define the V1 model-capacity lane policy that Foundation, hubs, and future agents can read before assuming an AI runtime is usable.

This sprint adds a deterministic, read-only capacity view over existing `llm_credentials`, `llm_routes`, probes, and calls. It names the main internal capacity lanes, checks owner/budget/fallback/stop-control policy, and exposes capacity health in the existing LLM Runtime surface. It does not create new credentials, rotate accounts, run model calls, wire Harlan terminal access, or spend provider credits.

Main-session approved active sprint scope: this is Foundation main-session work, not side/hub work. The requested shared files are limited to the plan, approval, package script, LLM capacity module, existing LLM runtime snapshot module, existing Foundation Runtime renderer, focused process check, closeout record, and closeout handoff.

Thin verifier coverage update: this card may add the new capacity module source to `scripts/foundation-verify.mjs` coverage-source aggregation so the existing done-card coverage gate sees ID-named focused proof. It must not add behavioral verifier logic to the monolith.

## Why

Steve is seeing the exact old-system risk again: "we pay for tools, but the agent cannot actually use them." The useful operator behavior is one honest answer to which model lanes exist, who owns them, what they are allowed to do, whether they have fallback and stop controls, and whether a route is usable now or still needs probe/policy work.

This makes Harlan/OpenClaw/Codex/Claude/Fal confusion safer by separating actual runtime capacity from demo hype and loose environment assumptions. A configured key or subscription is not trusted capacity until Foundation can show policy, owner, budget, fallback, stop control, and route status.

Operator value for Steve and the team: this unlocks faster, higher-quality runtime decisions because the system can say "ready", "needs review", or "blocked" before Steve assumes an assistant, hub, or scheduled worker can use a model lane.

## Acceptance Criteria

- `lib/llm-hub-capacity.js` defines named V1 capacity lanes for builder chat/manual review, system-worker extraction, Strategy Advisor fast/deep synthesis, Claude Code/coding, video/vision, and direct API fallback.
- The lane model includes owner, provider/auth path, credential, primary route, fallback route, allowed workloads, budget or manual-only cap, pacing, stop-control owner/action, account window, policy posture, and status.
- `getLlmRuntimeSnapshot()` includes `capacityLanes`, `capacityFindings`, and capacity summary fields without adding live model calls or provider probes.
- Foundation Runtime UI renders capacity lane status in the existing LLM Runtime panel so hidden red/yellow model capacity is visible.
- Dogfood proof rejects a lane missing owner, fallback, budget/cap, stop control, or matching credential/route linkage, and accepts a healthy fixture through the real evaluator path.
- Focused proof validates live backlog, Current Sprint doctrine, Plan Critic pass, approval integrity, package script, dogfood proof, and live snapshot shape.
- No secrets are printed, stored, committed, or inferred from `.env`.

## Definition Of Done

- `LLM-HUB-CAPACITY-001` moves through Scoping, Sprint Ready, Building Now, and Done This Sprint with timestamps in the live Current Sprint overlay.
- `docs/process/llm-hub-capacity-001-plan.md` and `docs/process/approvals/LLM-HUB-CAPACITY-001.json` exist and validate at 9.8+.
- `lib/llm-hub-capacity.js` exports constants, `buildLlmHubCapacitySnapshot`, `evaluateLlmHubCapacityLanes`, and `buildLlmHubCapacityDogfoodProof`.
- `scripts/process-llm-hub-capacity-check.mjs` passes and remains read-only.
- `package.json` includes `process:llm-hub-capacity-check`.
- `docs/handoffs/2026-05-17-llm-hub-capacity-closeout.md` records proof and limits.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse:

- `lib/foundation-llm-runtime-store.js` for `getLlmRuntimeSnapshot()`.
- Existing `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` tables.
- `public/foundation-runtime-renderers.js` existing LLM Runtime panel.
- `scripts/foundation-verify.mjs` existing surface-trust coverage-source aggregation only.
- `lib/process-plan-critic.js`, approval integrity, Current Sprint, backlog, and closeout registry patterns.

Existing docs to reuse:

- `docs/rebuild/current-state.md` LLM routing status.
- `docs/process/foundation-db-llm-runtime-store-split-010-plan.md` LLM runtime store split boundary.
- `docs/handoffs/2026-05-16-foundation-llm-runtime-store-split-closeout.md` shipped runtime store proof.

Existing scripts to reuse:

- `npm run process:foundation-llm-runtime-store-split-check`.
- `npm run process:llm-auth-audit-check`.
- `npm run process:foundation-ship`.

Live backlog and Current Sprint truth are reused for `LLM-HUB-CAPACITY-001`; this card does not create a second side queue.

Root invariant: a model lane is not healthy because a key or subscription exists. It is healthy only when the lane has named ownership, allowed workloads, a route/credential link, fallback or manual-only exception, budget/cap, pacing, stop control, and current route status.

Gate decision tree: static syntax checks, focused capacity proof, live snapshot proof, `foundation:verify`, and full `process:foundation-ship` because this affects Foundation runtime truth and operator UI.

Performance posture: capacity evaluation is in-memory over the existing LLM runtime snapshot. It must not add provider probes or slow Foundation hot routes.

Large-file split/extraction plan: `scripts/foundation-verify.mjs` is still above 5,000 lines, so this card does not add new verifier behavior there. The only allowed verifier touch is one thin source-read/coverage aggregation line for `lib/llm-hub-capacity.js`; all capacity behavior and dogfood proof live in the new focused module and process check.

Check-script posture: `scripts/process-llm-hub-capacity-check.mjs` is read-only by default. No-flag writes are blocked; this proof script has no apply posture and may inspect files and live DB snapshots only. It must not mutate backlog, sprint, credentials, routes, source systems, providers, or files.

## Risks

- Risk: the lane policy gives a false green because it only checks labels.
  - Repair path: dogfood rejects missing owner, budget/cap, fallback, stop control, and route/credential linkage through the real evaluator.
- Risk: this becomes hidden account rotation.
  - Repair path: lane definitions explicitly classify subscription/native routes as internal capacity only and require policy classification before automation.
- Risk: Steve reads experimental routes as ready.
  - Repair path: status remains warning/red when routes are `probe_required`, credentials are missing, or policy is experimental.
- Risk: this turns into Harlan terminal or Fal build work.
  - Repair path: keep those cards scoped separately; this sprint only builds the Foundation capacity truth surface.

## Tests

```bash
node --check lib/llm-hub-capacity.js scripts/process-llm-hub-capacity-check.mjs lib/foundation-llm-runtime-store.js public/foundation-runtime-renderers.js scripts/foundation-verify.mjs
npm run process:llm-hub-capacity-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=LLM-HUB-CAPACITY-001 --planApprovalRef=docs/process/approvals/LLM-HUB-CAPACITY-001.json --closeoutKey=llm-hub-capacity-v1 --commitRef=HEAD
```

## Not Next

- Do not run live OpenClaw, Claude Code, OpenAI, Anthropic, Gemini, Fal, Canva, or ElevenLabs calls.
- Do not build Harlan terminal runtime, Fal image iteration, voice wiring, Canva routes, Marketing Video Lab routes, or hub feature UI.
- Do not add or rotate secrets.
- Do not change external auth, subscription plan usage, paid-source extraction, Skool, myICOR, Loom, or Drive permissions.
- Do not treat this as the full agent franchise model or system capabilities inventory.

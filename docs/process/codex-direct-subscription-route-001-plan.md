# CODEX-DIRECT-SUBSCRIPTION-ROUTE-001 Plan

Closeout key: `codex-direct-subscription-route-v1`

## What

Add and prove one bounded direct Codex subscription route separate from OpenClaw. V1 registers a local Codex CLI route in the existing LLM runtime truth, probes it with `codex exec` in an ephemeral read-only scratch directory, records GPT-5.5 availability, GPT-5.4-mini fallback availability, Fast/priority speed availability, auth/status posture, quota/reset posture, route-probe evidence, and a Brain Fleet quota ledger row.

This is not a generic backend API around subscription credits. The route is local-tooling-only and remains `experimental` after the proof. Future promotion to scheduled runtime use needs a separate policy card and adapter proof.

## Why

OpenClaw is useful, but it is an adapter. Foundation needs to know whether local Codex can be addressed directly by Brain Fleet for coding-agent/tooling work without letting OpenClaw limits define the architecture.

Operator value: Steve can see the exact route, account label, model/Fast/fallback truth, quota status, auth status, ledger row, and stop condition before Gemini, Claude, OpenClaw boundary, or extractor proof work proceeds.

## Acceptance Criteria

- `CODEX-DIRECT-SUBSCRIPTION-ROUTE-001` has a 9.8+ Plan Critic row and approval file.
- `lib/llm-router.js` contains a direct Codex credential and route separate from OpenClaw.
- `lib/codex-direct-subscription-route.js` runs the bounded route proof through local Codex CLI discovery plus a single `codex exec` probe only in close-card mode.
- The proof writes Brain Fleet quota ledger truth before live Codex execution: workload, route, model, account label, status, artifact, quota/reset posture, failure reason, and stop condition.
- The proof records route-probe evidence with account label, auth method, GPT-5.5 availability, GPT-5.4-mini fallback availability, Fast/priority availability, quota/status posture, artifact contract, and no-external-write posture.
- If auth/2FA is needed, the proof records the failure, uses the Harlan auth-needed flow, prepares dry-run Steve-only notification, fails closed, and does not close the card.
- The Codex auth credential file is checked before/after and any mutation fails the proof.
- The route remains experimental/local-tooling-only after a successful probe; it is not promoted to generic scheduled backend execution.
- Current Sprint advances to `GEMINI-VIDEO-BRAIN-ROUTE-001` only after focused proof and Foundation ship gates pass.

## Definition Of Done

Done means the direct Codex route is added to existing LLM runtime truth, the close-card proof runs exactly one bounded `codex exec` provider call after creating a Brain Fleet ledger row, route-probe evidence is recorded, model/Fast/fallback/auth/quota/status truth is visible, `$CODEX_HOME/auth.json` is unchanged, Current Sprint advances to `GEMINI-VIDEO-BRAIN-ROUTE-001`, and all listed proof commands pass through `process:foundation-ship`.

Done does not mean direct Codex is approved as a generic backend API, extractor route, Strategy route, People route, public product route, or autonomous scheduled route. The route remains experimental/local-tooling-only until a future policy/promotion card explicitly changes that.

## Details

V1 is a route/proof slice. It changes the existing route metadata, runs one bounded provider probe, records proof rows, and advances Current Sprint only when the proof passes.

## Existing Work Reused

Existing code reused:

- `lib/llm-router.js` remains the canonical route/credential seed surface.
- `lib/brain-fleet-quota-ledger.js` remains the required call ledger boundary.
- `lib/brain-fleet-model-capability-registry.js` remains the route capability truth reader.
- `lib/harlan-auth-escalation-loop.js` remains the auth-needed escalation path.
- `lib/foundation-llm-runtime-store.js` remains the `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` store.
- Current Sprint, live backlog, approval integrity, Plan Critic, process write guard, closeout registry, and `process:foundation-ship` remain the process control plane.

Existing docs reused:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/_archive/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md`
- `docs/_archive/handoffs/2026-05-20-harlan-auth-escalation-loop-closeout.md`
- `docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-quota-ledger-closeout.md`
- `docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-model-capability-registry-closeout.md`

Existing scripts reused:

- `scripts/process-harlan-auth-escalation-loop-check.mjs`
- `scripts/process-brain-fleet-quota-ledger-check.mjs`
- `scripts/process-brain-fleet-model-capability-registry-check.mjs`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship`

Live backlog and Current Sprint truth reused:

- `CODEX-DIRECT-SUBSCRIPTION-ROUTE-001` is the active P0 card.
- `GEMINI-VIDEO-BRAIN-ROUTE-001` is the next card.
- Strategy, People, broad extraction, and broad paid/private source work remain parked.

Implementation behavior:

- Add credential `codex-direct-chatgpt-local` with provider `codex`, auth path `codex_subscription`, account label `local Codex ChatGPT login`, and experimental policy.
- Add route `foundation-agent-codex-direct` with workload `agent`, primary model `gpt-5.5`, fallback route to Claude Code, and experimental policy.
- Use `codex doctor --json`, `codex login status`, and `codex debug models` for local auth/reachability/model catalog truth.
- Use one bounded `codex exec --ephemeral --ignore-rules --skip-git-repo-check --sandbox read-only --ask-for-approval never` probe with an exact one-line response contract.
- Store only proof metadata, route-probe capability truth, and ledger truth. Do not store secrets, raw auth tokens, private profile content, or broad model output.
- Mark quota/reset as explicit unknown when Codex CLI does not expose quota/reset truth.
- Preserve the local-tooling-only boundary with route policy `experimental`, even when auth and model probe pass.

Behavior proof, not substring proof:

- Synthetic dogfood exercises successful direct Codex proof, ledger create/finish, auth-needed failure through Harlan, missing model catalog failure, no external sends, and no credential mutation.
- Live close-card proof writes a planned `llm_calls` ledger row before the Codex CLI execution and finishes it as succeeded or failed with a stop condition.
- Live close-card proof records an `llm_route_probes` row for the direct Codex route.
- Live close-card proof checks `$CODEX_HOME/auth.json` before and after the probe and fails if it changes.

## Not Next

- Do not use direct Codex subscription as a generic backend API.
- Do not promote the direct route to scheduled extractor, Strategy, People, or autonomous agent runtime.
- Do not run broad extraction, broad Skool/MyICOR/Loom crawl, YouTube runtime proof, Gemini, Claude, OpenClaw adapter boundary, or extractor proof from this card.
- Do not send emails, Telegram, Slack, public posts, Drive writes, or other external writes.
- No external writes are allowed from the focused proof or close-card proof.
- Do not mutate credentials, OAuth tokens, browser profiles, Codex auth files, provider config, source systems, Drive permissions, or public exposure settings.
- Do not hide auth, quota, rate-limit, provider, ledger, or credential-mutation failures by classification. Green means raw green.

## Gate Decision Tree

Static checks alone are not enough because this card adds route metadata, writes live `llm_calls` and `llm_route_probes` proof rows, and runs one bounded provider call. The focused card proof is required while building because it dogfoods the ledger-before-provider invariant, Harlan auth-needed branch, model/Fast/fallback parsing, and no-credential-mutation proof. Full gates are required for closeout because the card changes live sprint truth, closeout records, verifier coverage, package scripts, and served Foundation truth.

## Risks

- Risk: the direct Codex route becomes a hidden generic backend API. Mitigation: route policy stays `experimental`, notes and metadata say local-tooling-only, and generic router execution is not promoted.
- Risk: route probe spends capacity without ledger truth. Mitigation: close-card proof creates the Brain Fleet ledger row before `codex exec`.
- Risk: Codex auth needs 2FA or login repair. Mitigation: failure is classified as `auth_needed`, routed through Harlan dry-run escalation, and the card stays blocked.
- Risk: Codex CLI refreshes/mutates auth tokens. Mitigation: `$CODEX_HOME/auth.json` is fingerprinted before/after; mutation fails the proof.
- Risk: model catalog text or stale memory is treated as proof. Mitigation: live proof reads `codex debug models` and records model/Fast/fallback truth in route-probe capability.
- Repair path: if focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, or `process:foundation-ship` fails, keep this card active, repair the exact failing invariant, and do not start Gemini.

## Tests

Focused proof:

- `node --check lib/codex-direct-subscription-route.js lib/llm-router.js scripts/process-codex-direct-subscription-route-check.mjs`
- `npm run process:codex-direct-subscription-route-check -- --close-card --json`

System gates:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=CODEX-DIRECT-SUBSCRIPTION-ROUTE-001 --planApprovalRef=docs/process/approvals/CODEX-DIRECT-SUBSCRIPTION-ROUTE-001.json --closeoutKey=codex-direct-subscription-route-v1 --commitRef=HEAD`

Gate decision tree: this is a P0 Foundation runtime/governance card with a bounded live provider call, live LLM route/probe/ledger writes, Current Sprint truth, closeout registry, package script, and verifier coverage. It needs focused behavior proof, live route proof, System Health, repeated-failure gate, backlog hygiene, full `foundation:verify`, and `process:foundation-ship`.

# SYSTEM-004 Live Capabilities Surface Plan

## What

Build the operator-facing live System Capabilities surface from generated capability and agent inventory artifacts.

Closeout key: `system-004-live-capabilities-surface-v1`.

## Why

Pillar 4 generated `docs/system-capabilities.generated.json`, and Pillar 5 generated `docs/agents/agent-inventory.generated.json`. That is useful repo truth, but Steve should not have to open generated docs to know what the OS can actually use right now.

SYSTEM-004 turns those generated artifacts into the existing Foundation System Inventory UI and `/api/system-inventory` payload so capability truth is visible, source-backed, and honest.

## Definition Of Done

- `/api/system-inventory` exposes a compact `capabilitySurface` derived from Pillar 4 and Pillar 5 generated artifacts.
- Foundation System Inventory capability pages render generated truth, not only static lane copy.
- Skills page shows runtime skills backed by generated capability truth.
- Plugins/MCPs page shows installed plugins plus provider/tool capabilities that remain blocked until explicit approval.
- Agents page shows current guarded agents, old-system agent evidence summary, and governed job inventory without approving runtime.
- Dogfood proves missing Pillar 4 truth, runtime-approved agents, provider/tool approval drift, and source-less capability rows fail closed.
- `SYSTEM-004` closes and Current Sprint advances to `LEGACY-SYSTEM-AUDIT-001`.

## Acceptance Criteria

- Capability surface includes at least 10 generated capability rows.
- Capability surface includes at least 2 current guarded agents.
- Capability surface includes at least 80 old-system agent evidence rows as a summary.
- Capability surface includes at least 10 governed Foundation jobs.
- Runtime-approved agents by this card remain 0.
- Provider/tool capability rows remain visible and blocked unless a separate card explicitly approves runtime use.
- Generated surface is source-backed by `docs/system-capabilities.generated.json` and `docs/agents/agent-inventory.generated.json`.
- The existing System Inventory capability pages use the generated API surface.
- `SYSTEM-004` focused proof must pass or revise; weak UI marker checks are not enough by themselves.
- Required proof command: `npm run process:system-004-capabilities-surface-check -- --close-card --json`.

## Details

Add `lib/system-004-capabilities-surface.js` as the behavior owner.

The server adds `capabilitySurface` to `/api/system-inventory`.

Root invariant: SYSTEM-004 is only healthy when the operator surface is backed by the actual generated Pillar 4 and Pillar 5 artifacts, exposed through the real `/api/system-inventory` API route, and evaluated through the actual function path. The goal is not to silence a dashboard warning or make a visible page pass; the check should prove the source-backed capability payload exists and keeps runtime/provider/old-agent boundaries blocked.

The existing `public/foundation-system-inventory-renderers.js` capability sections render from that surface:

- `#capabilities-skills`
- `#capabilities-plugins`
- `#capabilities-agents`

## Reuse Existing Work

Reuse:

- Existing code: `public/foundation-system-inventory-renderers.js`, `server.js /api/system-inventory`, `lib/approval-integrity.js`, `lib/process-plan-critic.js`, and `lib/process-write-guard.js`.
- Existing docs: `docs/system-capabilities.generated.json`, `docs/agents/agent-inventory.generated.json`, `docs/system-capabilities.generated.md`, and `docs/agents/agent-inventory.generated.md`.
- Existing scripts/proof scripts: `process:pillar-4-system-capabilities-check`, `process:pillar-5-agent-inventory-check`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, and `foundation:verify`.
- Live backlog and Current Sprint truth: `SYSTEM-004`, `LEGACY-SYSTEM-AUDIT-001`, and sprint `FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19`.

Do not rebuild:

- Pillar 4 generator
- Pillar 5 generator
- provider/tool registry
- agent runtime
- old-system agent code
- extraction workers
- Value Builder split

## Operator Value

Steve gets one visible place to answer:

- what the OS can actually use
- what is only installed/runtime capability
- what is source-backed
- what agents are current but guarded
- what old-system agents are evidence only
- what provider/tool capabilities are still blocked

Useful thing unlocked: Steve and future Foundation builders can inspect capability truth in the operator UI before claiming an agent, plugin, provider tool, job, or old-system pattern is usable. This improves speed and quality because the real workflow becomes "check the live surface, then build from the right source-backed boundary," not "search old docs and hope the claim is current."

## Risks

- Overclaim risk: installed plugins or old agents can look like approval. Mitigation: generated surface keeps plugin/provider/agent boundaries visible and blocked.
- Payload risk: generated artifacts can bloat `/api/system-inventory`. Mitigation: expose compact summaries and rows, not full markdown or private content.
- UI drift risk: hardcoded static copy can hide generated truth. Mitigation: focused proof checks server and renderer wiring markers.

Rollback/repair:

- If generated truth is missing or overclaims runtime, fail the focused proof and do not close the card.
- If UI rendering breaks, repair the renderer or revert the UI change while keeping the API helper available.
- If the focused proof score is revise, repair the plan or behavior first; do not force pass, bypass Plan Critic, or suppress the failure.

## Tests

Static proof:

- `node --check lib/system-004-capabilities-surface.js scripts/process-system-004-capabilities-surface-check.mjs public/foundation-system-inventory-renderers.js server.js`

Focused proof:

- `npm run process:system-004-capabilities-surface-check -- --close-card --json`

Behavior proof:

- `loadSystem004CapabilitiesSurfacePayload()` reads the actual generated artifacts.
- `evaluateSystem004CapabilitiesSurfacePayload()` checks source refs, proof refs, current agent runtime blocking, provider/tool runtime blocking, old-system evidence summary, and job visibility.
- `buildSystem004CapabilitiesSurfaceDogfoodProof()` uses synthetic failing cases to prove missing Pillar 4 truth, runtime-approved agents, provider/tool approval drift, and source-less capability rows fail closed.
- The process script checks the server route and renderer wiring markers, then closes live backlog and Current Sprint only after the behavior proof passes.
- The API route proof is a real `/api/system-inventory` route round-trip after commit/restart through `process:foundation-ship`, not a substring-only proof.
- No substring-only proof is accepted as the SYSTEM-004 invariant. Source/renderer markers are only smoke checks after the actual artifact, function, dogfood, DB, API, backlog, and Current Sprint behavior has passed.

Full gates:

- `curl -fsS http://localhost:3000/api/system-inventory`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SYSTEM-004 --planApprovalRef=docs/process/approvals/SYSTEM-004.json --closeoutKey=system-004-live-capabilities-surface-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SYSTEM-004 --closeoutKey=system-004-live-capabilities-surface-v1`
- `npm run process:foundation-ship -- --card=SYSTEM-004 --planApprovalRef=docs/process/approvals/SYSTEM-004.json --closeoutKey=system-004-live-capabilities-surface-v1 --commitRef=HEAD`

Speed:

- Focused proof is local JSON and DB truth only; it should run fast and stay under 2 minutes.
- The new API payload is compact and proportional: it exposes summaries and compact rows, not generated Markdown or private content.
- Full gate remains `process:foundation-ship` because this touches `server.js`, `public/`, package script, closeout registry, live backlog, and Current Sprint.

## Not Next

- No provider/tool runtime approval.
- No live agent runtime.
- No old-system code or prompt import.
- No worker/scout launch.
- No model/provider calls.
- No extraction.
- No external writes or sends.
- No Drive permission mutation.
- No credential or provider config mutation.
- No Value Builder split.

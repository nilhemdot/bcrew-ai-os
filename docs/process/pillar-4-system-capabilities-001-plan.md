# PILLAR-4-SYSTEM-CAPABILITIES-001 System Capabilities Plan

## What

Generate a live System Capabilities artifact from existing Foundation truth.

This replaces stale hand-maintained “what the system can do” claims with generated, source-backed rows from:

- source contracts
- source connectors
- grouped source systems
- Foundation surface and API map
- governed job definitions
- `/api/system-inventory` runtime skills/plugins/identity
- Foundation-up provider/tool capability registry
- agent capability registry

Closeout key: `pillar-4-system-capabilities-v1`.

## Why

The old system rotted partly because capabilities lived in docs, agent claims, and chat memory. Foundation now has the pieces, but they are scattered. The OS needs one generated artifact that says what exists, where it comes from, what proof supports it, who owns it, and what is still blocked.

This is a guardrail before agent scale and GOD-mode extraction work. Builders and future agents should not be able to claim a capability unless it appears in generated capability truth or is explicitly scoped as missing.

## Definition Of Done

- `docs/system-capabilities.generated.json` exists and is generated from live code/API truth.
- `docs/system-capabilities.generated.md` exists as the operator-readable generated artifact.
- Every capability row has source refs, proof refs, owner, status, and approval boundary.
- Provider/tool capabilities are present but remain blocked unless a separate approval card grants runtime use.
- Agent capability registry is represented as declaration truth, not live runtime approval.
- Runtime skills and plugins are included from `/api/system-inventory`, with plugin-as-source-truth boundary preserved.
- Private local memory remains metadata-only and no secret values are copied.
- Dogfood fails source-less rows, provider over-claims, secret leakage, external mutation claims, and missing runtime inventory.
- `PILLAR-4-SYSTEM-CAPABILITIES-001` closes and Current Sprint advances to `PILLAR-5-AGENT-INVENTORY-001`.

## Acceptance Criteria

- The generated snapshot includes at least:
  - 20 source contracts
  - 20 Foundation surfaces/sub-surfaces
  - 10 governed job definitions
  - 1 runtime skill
  - 1 runtime plugin
  - 4 blocked provider/tool rows
  - the agent capability registry row
- `/api/system-inventory` is fetched successfully within the existing route budget.
- Generated JSON and Markdown match the current function output.
- The generated rows include required rows:
  - `source-contract-registry`
  - `source-connector-registry`
  - `foundation-surface-map`
  - `foundation-job-definitions`
  - `runtime-skills-inventory`
  - `runtime-plugin-inventory`
  - `workspace-identity-boundary`
  - `agent-capability-registry`
- Focused proof, System Health, repeated-failure gate, backlog hygiene, verifier, and ship gate pass.

## Details

Implement `lib/pillar-4-system-capabilities.js` as the behavior owner.

Generated outputs:

- `docs/system-capabilities.generated.json`
- `docs/system-capabilities.generated.md`

The module builds a deterministic snapshot by importing current Foundation truth directly from existing registries and by accepting the live `/api/system-inventory` payload from the process check.

Root invariant: System Capabilities is healthy only when the generated artifact is built from live code/API truth and cannot overstate blocked provider/tool, agent runtime, external mutation, plugin source-truth, private memory, or secret boundaries.

## Reuse Existing Work

Reuse:

- Existing code: `lib/source-contracts.js`, `lib/foundation-surface-map.js`, `lib/foundation-jobs.js`, `lib/foundation-identity-surface.js`, `lib/foundation-up-capability-registry.js`, `lib/agent-capability-registry.js`, `server.js /api/system-inventory`, `lib/approval-integrity.js`, `lib/process-plan-critic.js`, and `lib/process-write-guard.js`.
- Existing docs: `docs/process/foundation-up-capability-registry-001-plan.md`, `docs/process/agent-capability-registry-001-plan.md`, `docs/process/foundation-identity-001-plan.md`, `docs/conversation-archive/LESSONS-IP-MANIFEST.json`, and current sprint truth.
- Existing scripts: `scripts/process-foundation-up-capability-registry-check.mjs`, `scripts/process-agent-capability-registry-check.mjs`, `scripts/process-foundation-identity-check.mjs`, `process:system-health-nightly-audit-check`, and `process:build-lane-repeated-failure-action-gate-check`.
- Existing backlog truth: live `PILLAR-4-SYSTEM-CAPABILITIES-001`, `PILLAR-5-AGENT-INVENTORY-001`, and Current Sprint `FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19`.

Do not rebuild:

- the System Inventory UI
- source contracts
- source connector runtime
- job runner
- provider clients
- agent inventory detail
- live agent runtime
- external write/mutation controls

## Operator Value

Steve gets one generated answer to “what can the OS do right now, where does that truth live, and what is still blocked?”

Useful outputs:

- capabilities by category
- source and proof refs for every row
- provider/tool rows that are registered but blocked
- runtime skills/plugins with source-truth boundary
- job/surface/source coverage counts
- next card for detailed agent inventory

## Risks

- Over-claim risk: provider/tool registration or agent declaration can be mistaken for runtime approval. Mitigation: provider/tool and agent runtime use remain explicitly blocked in generated rows and dogfood fails over-claims.
- Stale-doc risk: generated Markdown can be hand-edited. Mitigation: focused proof compares generated files to function output.
- Privacy risk: `/api/system-inventory` includes private local doc metadata. Mitigation: generated output uses metadata counts and identity boundary only; no private content is copied.
- Scope creep: agent inventory detail, provider use, and extraction are explicitly not next.

Rollback/repair:

- If generated artifact is wrong, repair `lib/pillar-4-system-capabilities.js` and regenerate. Do not hand-edit generated output as truth.
- If a row over-claims a blocked capability, fail the card and repair before shipping.
- If `/api/system-inventory` is unavailable, leave the card executing and repair system inventory route health.

## Tests

Gate decision tree:

- Static gate: `node --check` for the new module and process script.
- Focused gate: `process:pillar-4-system-capabilities-check` because behavior is live inventory aggregation, generated docs, dogfood, and sprint/backlog closeout.
- Full gate: required at closeout because the card touches package scripts, generated docs, closeout registry, live backlog, Current Sprint, and Foundation ship proof.
- Blast radius: generated repo artifacts plus live Foundation sprint/backlog rows only. No source-system, provider, credential, Drive permission, public route, or external-write mutation.

Behavior proof:

- `buildPillar4SystemCapabilitiesSnapshot()` is the actual function path for generating output.
- `evaluatePillar4SystemCapabilitiesSnapshot()` checks rows, source refs, proof refs, ownership, approval boundaries, counts, and secret/value leakage.
- `buildPillar4SystemCapabilitiesDogfoodProof()` uses synthetic failing cases to prove source-less rows, provider over-claims, secret leakage, external mutation claims, and missing runtime inventory fail closed.
- The process script fetches live `/api/system-inventory` and compares generated JSON/Markdown to function output.

Focused proof:

- `node --check lib/pillar-4-system-capabilities.js scripts/process-pillar-4-system-capabilities-check.mjs`
- `npm run process:pillar-4-system-capabilities-check -- --write-report --close-card --json`

Full gates:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=PILLAR-4-SYSTEM-CAPABILITIES-001 --planApprovalRef=docs/process/approvals/PILLAR-4-SYSTEM-CAPABILITIES-001.json --closeoutKey=pillar-4-system-capabilities-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=PILLAR-4-SYSTEM-CAPABILITIES-001 --closeoutKey=pillar-4-system-capabilities-v1`
- `npm run process:foundation-ship -- --card=PILLAR-4-SYSTEM-CAPABILITIES-001 --planApprovalRef=docs/process/approvals/PILLAR-4-SYSTEM-CAPABILITIES-001.json --closeoutKey=pillar-4-system-capabilities-v1 --commitRef=HEAD`

Speed:

- The focused gate should stay bounded under 2 minutes.
- It reads `/api/system-inventory`, repo files, generated docs, approval/closeout records, and live sprint/backlog rows.

## Not Next

- No provider calls.
- No model/media generation.
- No terminal worker launch.
- No live extraction.
- No agent runtime launch.
- No external writes, sends, Drive permission mutation, credential mutation, public exposure, or source-system mutation.
- No secret values or raw private local memory in generated artifacts.
- No agent inventory detail; that is `PILLAR-5-AGENT-INVENTORY-001`.
- No Value Builder split.

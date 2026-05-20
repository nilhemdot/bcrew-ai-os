# PILLAR-5-AGENT-INVENTORY-001 Agent Inventory Plan

## What

Generate a live Agent Inventory artifact with honest status.

The inventory combines:

- current Foundation agent capability registry
- governed Foundation job definitions
- old-system agent roster evidence from `~/bcrew-buddy-reference/dashboard/agent-data.json`
- old-system research/scout skill harvest from `docs/audits/2026-05-19-old-system-research-team-harvest.json`
- Pillar 4 System Capabilities output

Closeout key: `pillar-5-agent-inventory-v1`.

## Why

The old system had useful agent/team ideas, but it also had agent sprawl, stale status claims, prompt-only runtime confidence, and reports that piled up without action.

Before Foundation scales agents, scouts, GOD-mode extraction, or parallel builders, the system needs one generated place that says:

- which agents are current Foundation declarations
- which old agents are evidence only
- which jobs exist and whether they are scheduled/manual/paused
- which old skills are useful patterns
- which statuses are honest and which are not live runtime truth

## Definition Of Done

- `docs/agents/agent-inventory.generated.json` exists and is generated from current registry/job/old-system evidence truth.
- `docs/agents/agent-inventory.generated.md` exists as the operator-readable generated artifact.
- Current Foundation agents are sourced from `lib/agent-capability-registry.js`.
- Old-system agents are included as evidence-only rows and old `WORKING` status is not presented as current runtime truth.
- Governed Foundation jobs are inventoried with runtime mode and source/proof refs.
- Harvested old scout/research skills are represented from the old-system research-team harvest.
- No old code, prompts, private profile content, team emails, chat IDs, raw memories, tokens, or secrets are copied.
- Dogfood fails source-less rows, live legacy claims, runtime approvals, old-code import, and private/secret leakage.
- `PILLAR-5-AGENT-INVENTORY-001` closes and Current Sprint advances to `SYSTEM-004`.

## Acceptance Criteria

- Generated snapshot includes at least:
  - 2 current Foundation agents
  - 80 old-system agent evidence rows
  - 100 harvested old-system skills
  - 10 governed Foundation jobs
  - 0 runtime-approved agents from this card
- Old-system `WORKING` rows become evidence-only honest statuses.
- Every current and legacy agent row has agent id, display name, owner, role, honest status, source refs, and proof refs.
- Every job row has job key, runtime mode, source refs, and proof refs.
- Generated JSON/Markdown match the current function output.
- Focused proof, System Health, repeated-failure gate, backlog hygiene, verifier, and ship gate pass.

## Details

Implement `lib/pillar-5-agent-inventory.js` as the behavior owner.

Generated outputs:

- `docs/agents/agent-inventory.generated.json`
- `docs/agents/agent-inventory.generated.md`

Root invariant: Agent Inventory is healthy only when it distinguishes current guarded Foundation agents from old-system evidence rows and refuses to treat old status, old code, or old prompts as live runtime approval.

## Reuse Existing Work

Reuse:

- Existing code: `lib/agent-capability-registry.js`, `lib/foundation-jobs.js`, `lib/pillar-4-system-capabilities.js`, `lib/old-system-agent-onboarding-harvest.js`, `lib/approval-integrity.js`, `lib/process-plan-critic.js`, and `lib/process-write-guard.js`.
- Existing docs: `docs/system-capabilities.generated.json`, `docs/audits/2026-05-19-old-system-research-team-harvest.json`, `docs/agents/old-system-agent-onboarding-harvest.md`, and `docs/specs/2026-05-15-foundation-ia-rebuild-game-plan.md`.
- Existing scripts: `scripts/process-agent-capability-registry-check.mjs`, `scripts/process-old-system-research-team-harvest-check.mjs`, `scripts/process-pillar-4-system-capabilities-check.mjs`, `process:system-health-nightly-audit-check`, and `process:build-lane-repeated-failure-action-gate-check`.
- Existing old-system evidence: `~/bcrew-buddy-reference/dashboard/agent-data.json` and the committed old-system harvest output.
- Existing backlog truth: live `PILLAR-5-AGENT-INVENTORY-001`, `SYSTEM-004`, and Current Sprint `FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19`.

Do not rebuild:

- old agents
- old prompts
- Harlan/Crewbert runtime
- provider/model call path
- extraction workers
- System Capabilities UI surface
- Value Builder split

## Operator Value

Steve gets an honest answer to “what agents/jobs exist and what is real right now?”

Useful outputs:

- current guarded agents
- old agent rows as evidence only
- old scout/research skill patterns
- governed job definitions
- status counts
- clear boundaries before agent scale

## Risks

- Old-status overclaim risk: old `WORKING` rows can look like current live agents. Mitigation: convert to evidence-only honest status and dogfood live-legacy claims.
- Privacy risk: old team data can contain emails/chat IDs/private profile details. Mitigation: generated output excludes emails, chat IDs, private profiles, raw memories, and token-like data.
- Runtime creep: this card can drift into agent launch. Mitigation: no runtime approval, no model calls, no extraction, no hidden workers.
- Stale artifact risk: generated Markdown can be hand-edited. Mitigation: focused proof compares generated files to function output.

Rollback/repair:

- If generated rows overclaim runtime status, repair the generator and regenerate.
- If private content appears, fail the card and remove the generated artifact before shipping.
- If old-system evidence is unavailable, keep the card executing and repair the evidence path or record a scoped blocker.

## Tests

Gate decision tree:

- Static gate: `node --check` for the new module and process script.
- Focused gate: `process:pillar-5-agent-inventory-check` because behavior is local registry/evidence aggregation, generated docs, dogfood, and sprint/backlog closeout.
- Full gate: required at closeout because the card touches package scripts, generated docs, closeout registry, live backlog, Current Sprint, and Foundation ship proof.
- Blast radius: generated repo artifacts plus live Foundation sprint/backlog rows only. No old-system mutation, source-system mutation, provider call, credential mutation, Drive permission mutation, external write, or runtime launch.

Behavior proof:

- `buildPillar5AgentInventorySnapshot()` is the actual function path for generating output.
- `evaluatePillar5AgentInventorySnapshot()` checks agent rows, job rows, source/proof refs, status boundaries, counts, and secret/value leakage.
- `buildPillar5AgentInventoryDogfoodProof()` uses synthetic failing cases to prove source-less rows, live legacy claims, runtime approvals, old-code import, and private/secret leakage fail closed.
- The process script compares generated JSON/Markdown files to the function output.

Focused proof:

- `node --check lib/pillar-5-agent-inventory.js scripts/process-pillar-5-agent-inventory-check.mjs`
- `npm run process:pillar-5-agent-inventory-check -- --write-report --close-card --json`

Full gates:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=PILLAR-5-AGENT-INVENTORY-001 --planApprovalRef=docs/process/approvals/PILLAR-5-AGENT-INVENTORY-001.json --closeoutKey=pillar-5-agent-inventory-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=PILLAR-5-AGENT-INVENTORY-001 --closeoutKey=pillar-5-agent-inventory-v1`
- `npm run process:foundation-ship -- --card=PILLAR-5-AGENT-INVENTORY-001 --planApprovalRef=docs/process/approvals/PILLAR-5-AGENT-INVENTORY-001.json --closeoutKey=pillar-5-agent-inventory-v1 --commitRef=HEAD`

Speed:

- The focused gate should stay bounded under 2 minutes.
- It reads committed repo artifacts and local old-system evidence metadata only.

## Not Next

- No agent launch.
- No old code import.
- No hidden subagents or workers.
- No model/provider calls.
- No live extraction.
- No external writes or sends.
- No Drive permission mutation.
- No credential or provider config mutation.
- No private profile, email, chat ID, token, raw memory, or secret content copied into repo truth.
- No System Capabilities UI surface; that is `SYSTEM-004`.
- No Value Builder split.

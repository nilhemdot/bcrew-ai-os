# LEGACY-SYSTEM-AUDIT-001 Plan

## What

Line-read the local legacy-system roots and produce one sanitized salvage map that promotes useful old-system truth into current backlog/source/spec/proof lanes.

Closeout key: `legacy-system-audit-v1`.

## Why

Steve explicitly called out that the old research team, old system, and long conversation review exposed valuable work that was not fully carded. That gold cannot live only in chat memory or stale old-system docs.

This card captures the useful patterns while blocking the old failure modes: agent sprawl, prompt-only scheduler truth, report piles, stale docs, private runtime copying, and old code imports.

## Definition Of Done

- Legacy roots are represented in a bounded audit: `~/bcrew-buddy-reference`, `~/.inspection/bcrew-skills`, `~/.inspection/FUBZahnd`, `~/.inspection/zahnd-team-dashboard`, `~/.openclaw` metadata-only, and `~/unchained-realtor`.
- Every salvage finding is classified as `promote`, `backlog`, `source_note`, `spec`, `evidence_only`, `duplicate`, `reject`, or `approval_bound`.
- Every promoted/backlog/source/spec item points to live backlog truth.
- OpenClaw and other private runtime surfaces are metadata-only; no raw private content, credentials, messages, media, or runtime state is copied into repo artifacts.
- The old-system anti-patterns are explicitly rejected, not silently carried forward.
- `LEGACY-SYSTEM-AUDIT-001` closes and Current Sprint advances to `STRATEGIC-INTEL-001`.

## Acceptance Criteria

- `docs/audits/2026-05-19-legacy-system-audit.md` exists and includes root summaries, evidence metadata, salvage disposition, promoted live cards, and senior call.
- `docs/audits/2026-05-19-legacy-system-audit.json` exists and contains the same sanitized snapshot.
- The snapshot has at least 5 present legacy roots, at least 20 targeted evidence hits, at least 15 classified findings, and at least 18 promoted live destinations.
- Dogfood proof rejects missing roots, unclassified findings, and any old-code/runtime import side effect.
- The focused proof validates approval integrity, Plan Critic, live backlog rows, Current Sprint advancement, closeout registry wiring, and the metadata-only privacy boundary.
- The proof returns pass/revise with the score in the Plan Critic summary; revise means the card stays open.
- Required proof command: `npm run process:legacy-system-audit-check -- --write-report --close-card --json`.

## Details

Add `lib/legacy-system-audit.js` as the behavior owner.

Add `scripts/process-legacy-system-audit-check.mjs` as the focused proof. The proof must write sanitized audit artifacts only when explicitly run with `--write-report` or `--close-card`.

Root invariant: the audit is healthy only when the actual function path `buildLegacySystemAuditSnapshot()` creates sanitized evidence, `evaluateLegacySystemAuditSnapshot()` verifies every finding and live destination, and `buildLegacySystemAuditDogfoodProof()` rejects weak fixtures. This is real behavior proof through function path and focused process path, not substring-only proof. The script may use small source markers only after the behavior proof, DB truth, artifact existence, and dogfood proof pass.

The roots are evidence inputs, not runtime dependencies:

- `~/bcrew-buddy-reference`: old operating system, old scout/research team, extraction scripts, agent inventory, system capability docs.
- `~/.inspection/bcrew-skills`: old skill/team library and source scout contracts.
- `~/.inspection/FUBZahnd`: FUB/Zahnd SQL and processor evidence for source/data models.
- `~/.inspection/zahnd-team-dashboard`: old dashboard IA/resource-center evidence.
- `~/.openclaw`: metadata-only workspace/runtime boundary evidence.
- `~/unchained-realtor`: Steve product/business strategy notes for future strategic intelligence extraction.

The audit output is a salvage map:

- Keep and promote source scan, scored finding, director synthesis, action routing, course/video extraction, role/team skill contracts, FUB source shapes, dashboard IA, memory/heartbeat doctrine, and Unchained product strategy patterns.
- Rebuild those patterns only through current governed cards such as `STRATEGIC-INTEL-001`, `INTEL-SCOPER-001`, `DECISION-008`, `WEB-GODMODE-001`, `SKOOL-WORKER-001`, `MYICRO-TRAINING-001`, `SOURCE-019`, `SOURCE-020`, `DATA-002`, and `DATA-003`.
- Reject old-code import, free-floating agent sprawl, report piles without owner/action routing, stale static dashboards, and private runtime state copying.

## Reuse Existing Work

Existing code to reuse:

- `lib/approval-integrity.js`
- `lib/process-plan-critic.js`
- `lib/process-write-guard.js`
- `lib/foundation-db.js`
- `lib/foundation-build-log.js`
- `lib/system-004-capabilities-surface.js`
- `lib/pillar-4-system-capabilities.js`
- `lib/pillar-5-agent-inventory.js`

Existing docs to reuse:

- `docs/audits/2026-05-19-old-system-research-team-harvest.md`
- `docs/audits/2026-05-19-old-system-research-team-harvest.json`
- `docs/conversation-archive/MANIFEST.json`
- `docs/system-capabilities.generated.json`
- `docs/agents/agent-inventory.generated.json`

Existing scripts to reuse:

- `process:old-system-research-team-harvest-check`
- `process:pillar-4-system-capabilities-check`
- `process:pillar-5-agent-inventory-check`
- `process:system-004-capabilities-surface-check`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `backlog:hygiene`
- `foundation:verify`
- `process:foundation-ship`

Live backlog and Current Sprint truth to reuse:

- `LEGACY-SYSTEM-AUDIT-001`
- `STRATEGIC-INTEL-001`
- live backlog cards for WEB-GODMODE, Loom, Skool, Mycro, Drive, shared comms, Strategic Intelligence, Scoper, Decision doctrine, DATA-002, DATA-003, deep auditor, and operator pulse.
- sprint `FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19`.

Do not rebuild:

- old agents
- old crawlers
- old browser scripts
- old `.NET` processor runtime
- old dashboard code
- OpenClaw runtime
- source/extraction workers
- Value Builder split

## Operator Value

Steve gets the old-system gold captured as durable truth before the next sprint goes deep into Strategic Intelligence and extraction.

Useful thing unlocked: builders can now use the salvage map as the source of what to carry forward and what to reject, instead of re-reading long chats or guessing which old-system ideas are still valid.

## Risks

- Private-data leak risk: old local runtime and product notes may contain private content.
  - Mitigation: repo artifacts store metadata, path class, file counts, byte counts, hashes, and dispositions only. OpenClaw is metadata-only.
- Old-code import risk: useful scripts can tempt direct copy/import.
  - Mitigation: focused dogfood fails any old-code/runtime import side effect; report explicitly says rebuild governed patterns only.
- Endless archaeology risk: old roots can consume the sprint.
  - Mitigation: V1 uses bounded targeted evidence rows plus root summaries. More detailed work becomes backlog cards.
- False completion risk: a report can exist without live routing.
  - Mitigation: promoted destinations must exist in live backlog and Current Sprint advances only after proof.

Rollback/repair:

- If a root is missing, keep the card executing and either repair the root path or mark it evidence-only with Steve-approved reason.
- If an unsafe/private detail appears in artifacts, remove it, rerun the audit, and add a leakage dogfood case.
- If a promoted target is missing, create/scope that backlog card before closeout.

## Tests

Static proof:

```bash
node --check lib/legacy-system-audit.js scripts/process-legacy-system-audit-check.mjs
```

Focused proof:

```bash
npm run process:legacy-system-audit-check -- --write-report --close-card --json
```

Behavior proof:

- `buildLegacySystemAuditSnapshot()` scans the bounded roots and creates sanitized metadata/evidence rows.
- `evaluateLegacySystemAuditSnapshot()` proves roots, evidence, classifications, promoted live cards, and no-side-effect boundaries.
- `buildLegacySystemAuditDogfoodProof()` rejects missing-root, unclassified-finding, and unsafe-import fixtures.
- The process script validates approval integrity, Plan Critic, package script, closeout registry, closeout handoff, live backlog rows, and Current Sprint advancement.
- The proof explicitly rejects substring-only proof: file/source markers cannot close the card unless the actual function path, artifact writes, DB reads, and dogfood fixtures pass first.

Full gates:

```bash
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=LEGACY-SYSTEM-AUDIT-001 --planApprovalRef=docs/process/approvals/LEGACY-SYSTEM-AUDIT-001.json --closeoutKey=legacy-system-audit-v1 --commitRef=HEAD
```

Speed:

- Focused proof is local filesystem metadata and DB truth only.
- Focused proof is fast and should run under 2 minutes in normal local conditions.
- The audit is proportional: targeted evidence rows plus root summaries, not another heavy full-repo line-by-line archaeology pass.
- No browser automation, old agents, provider/model calls, paid/private extraction, or external writes.

## Not Next

- No old-system code import.
- No old-agent execution.
- No old crawler/browser automation.
- No private broad extraction.
- No paid/provider/browser-auth work.
- No raw private runtime content in repo artifacts.
- No credential, provider config, Drive permission, source-system, send, or external-write mutation.
- No Value Builder split.

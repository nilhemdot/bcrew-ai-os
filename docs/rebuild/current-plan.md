# BCrew AI OS Rebuild Plan

Last updated: 2026-05-18
Version: v6.101 - Action Route dedupe/staleness guard closed
Status: Continue KB/action review sprint

Use this doc for one question:

- what are we doing next, in what order, and what counts as done?

For the short state read, use [Current State](current-state.md).
For archive/extraction/synthesis doctrine, use [Intelligence Pipeline Operating Model](intelligence-pipeline.md).
For runtime boundaries, use [Current Runtime Map](current-runtime-map.md).
For Harlan/Crewbert boundaries, use [Agent Architecture](agent-architecture.md).
For doc cleanup rules, use [Doc Cleanup And Consolidation Plan](doc-cleanup-plan.md).

## Plan History

The previous active plan was preserved before this rewrite:

- [current-plan-2026-04-24-pre-v6-runtime-router-cleanup.md](plan-history/current-plan-2026-04-24-pre-v6-runtime-router-cleanup.md)

Reason for v6:

- the system now has enough archive/extraction/synthesis proof to stop treating every next step as more manual mining
- the immediate gap is activation: jobs exist but must become scheduled, supervised, visible system work
- model access must be centralized through a policy-aware router before high-volume automation expands
- extraction needs current-day and backfill control lanes so Steve is not waiting in builder chat for giant manual runs
- the doc surface became noisy enough that active doctrine must be separated from historical evidence

## Locked Doctrine

Locked doctrine means current operating default, not permanent dogma. If research from operators, paid training, YouTube/creator intelligence, Mycro/myICOR, customer evidence, or better system proof shows a better way, update the plan through the Foundation change path: capture the evidence, confirm the owner decision, update docs/backlog/source notes, and add or adjust verifier checks.

- Mac Mini stays the primary machine for this phase.
- Foundation-first stays the build order.
- OpenClaw stays the current Harlan channel/runtime adapter and possible later live-agent adapter, not the whole OS.
- BCrew router owns model/subscription routing. OpenClaw is one adapter for the ChatGPT/Codex subscription path, not the controlling system.
- Direct OpenAI Responses API is fallback-only and blocked unless an explicit paid-run override is set.
- Harlan is Steve's personal agent, not the whole OS.
- Crewbert is the orchestrator/operator identity, not a magic replacement for source contracts.
- We are not switching stacks mid-Foundation.
- We are not turning on a large agent swarm during Foundation.
- Scripts/routines that call LLMs are not the same thing as agents.
- Real agents are later and narrow: Harlan, Crewbert, then a few specialist agents only after governed loops are stable.
- Active truth lives in the current docs and source-backed UI/API surfaces.
- Handoffs and audits are evidence unless promoted into active docs or backlog.
- Specs are design references until promoted into this plan, source contracts, verifier checks, or DB-backed backlog/decision records.
- Foundation surfaces must not rely on Steve noticing stale truth. When source contracts, connectors, jobs, docs, backlog, Systems, Data Sources, System Inventory, or hub links change, the change must update live-backed surfaces, add/adjust verifier checks, or run a deliberate sweep captured under `FOUNDATION-SWEEP-001`.
- Imported spreadsheet mirrors are not write surfaces. Any governed write must target the source workbook/range or a deliberately non-imported destination.
- Extraction is a Foundation supply chain, not a one-off research chore. It must keep current sources fresh, mine old corpora one bounded bite at a time, and preserve what each hub can use.
- Drive and Skool mining belong in Foundation while they inventory, archive, classify, extract, and organize evidence. Course creation, content production, recruiting outreach, coaching, and monetization are Hub work built on that Foundation output.
- The brand/hub lanes must stay separate: Benson Crew residential, Zahnd Team Ag, Steve Zahnd personal brand, MarketMasters, and Steve-owned monetization/education assets are different consumers with different risk boundaries.
- Foundation is not done until source evidence can move through the full loop: source -> archive/artifact -> candidate/atom -> synthesized item -> routed decision/task/question/contradiction/action -> resolution. V1 now proves this through one approved/applied Action Router route into a live backlog row; the remaining hardening is review UX, closure feedback, and recurrence durability.
- Foundation is the control plane for systems; hubs are the human/business cockpits. A job can run in Foundation while its queue, decisions, and cleanup work surface in the hub it serves.
- SECURITY-002 v1 is live for app-side auth/tier/redaction. Shared-comms and intelligence routes that cannot yet prove filtered access stay Tier 1-only until `SECURITY-FILTERED-COMMS-ACCESS-001` closes.
- Raw meeting notes are a separate Drive/vault boundary. `SECURITY-002` controls AIOS responses, but it does not remove access to original Google Docs. `MEETING-VAULT-ACL-001` owns owner-preserving raw meeting-note ACL enforcement.
- No public/broader external exposure happens until `SECURITY-EDGE-001` or an explicit approved successor proves the edge auth/tunnel/access posture.
- `SYSTEM-010` controls are a Foundation gate, not a later ops polish item: running jobs, agents, miners, and paid/subscription model calls must be visible, pausable/stoppable, failure-tracked, and decommissionable before autonomous loops expand. The `SYSTEM-010-GHOST-CLOSEOUT-001` slice closes the current Foundation readiness runtime/process blocker; auto-restart-on-push remains reported honestly as manual until push-hook proof exists.
- Strategy Hub is the first major consumer, not the old advisor surface. Now that the spine has Action Router v1 and retrieval eval coverage, resume Strategy Hub only as a source-to-gap operating dashboard on top of source-backed facts, synthesized items, and routed approval records.

## Source Intelligence Lifecycle

Foundation source work follows this order:

1. connect the source and prove the system can reach it
2. verify the trusted unit, range, tab, API object, or corpus boundary
3. understand the business meaning, owner, caveats, and trust boundary
4. extract useful atoms with provenance and retry/cursor control
5. synthesize those atoms into business insight
6. route the insight into the right hub, decision, task, contradiction, or owner-bound action
7. close the loop when the item is resolved, stale, rejected, deferred, or superseded

The Strategy packet has completed steps 1-3 for its current source package: strategy docs, Freedom Community, BHAG Builder, Agent Engine, and the strategy-used Owners slice. That does not mean extraction, synthesis, Strategy Hub, or Action Router are complete; those are later Foundation layers.

## Latest Sprint: Foundation KB/action Review

Live sprint ID: `action-route-dedup-staleness-guard-2026-05-18`.

This sprint was interrupted by a P0 build-lane reliability injection: `BUILD-LANE-FAILURE-TELEMETRY-001`, closed under `build-lane-failure-telemetry-v1`. It fingerprints failed proof/verifier/ship/fanout/hygiene checks, counts repeats over 24 hours and 7 days, and surfaces repeated failures in System Health so recurring build mistakes become repair work instead of repeated manual debugging.

The broader sprint remains `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001`. The first shipped slice is `foundation-kb-compiler-v1`: a Foundation-owned, proposal-only compiler path from existing source-backed records into a quality-gated KB/wiki draft contract.

Completed cards:

1. `BUILD-LANE-FAILURE-TELEMETRY-001` - done under `build-lane-failure-telemetry-v1`. Scope was local build-lane observability: failed focused proofs, verifier checks, ship checks, fanout checks, post-ship fanout checks, and backlog hygiene failures -> normalized failure fingerprints with yellow/red repeat thresholds and System Health surfacing.
2. `FOUNDATION-KB-COMPILER-V1-001` - done under `foundation-kb-compiler-v1`. Scope was read-only/proposal-only compiler plumbing: existing source-backed synthesis facts, locked decisions, and intelligence atoms -> compiled KB/wiki draft with source IDs, citations, freshness metadata, privacy tier, compiler frontmatter, contradiction status, and quality-gate pass/fail.
3. `ACTION-ROUTE-REVIEW-INBOX-001` - done under `action-route-review-inbox-v1`. Scope was read-only review-inbox plumbing: Action Router records and route-derived backlog rows -> proposed review items with type, owner, age, source refs, destination, and review state. Default Backlog separates action-route-derived rows from normal work while focused-card reads still load them.
4. `ACTION-ROUTE-PROMOTION-WORKFLOW-001` - done under `action-route-promotion-workflow-v1`. Scope is governed internal Review Inbox workflow: confirm decisions, answer questions, assign owners, promote to backlog, mark duplicates, reject, snooze, and link existing cards while preserving source evidence and blocking duplicate backlog promotion.
5. `ACTION-ROUTE-DEDUP-STALENESS-GUARD-001` - done under `action-route-dedup-staleness-guard-v1`. Scope is Review Inbox duplicate/staleness policy: repeated unresolved findings are grouped without data loss, route/backlog linked duplicates are informational, unresolved rows at 3 days are yellow watch, unresolved rows at 7 days are red risk, and every stale item or duplicate cluster carries a closure next action.

Not next from this closeout: live extraction, transcript fetches, screenshots, crawl, summarization, model calls, provider probes, auth-required or paid runs, external writes, automatic deletion/hiding/rejection/snoozing, Harlan/Fal/voice/Canva/OpenHuman feature work, Drive permission mutation, or Agent Feedback auto-send.

Next: continue safe Foundation-up work from repo truth. Prefer no-auth source/connector completion, source-contract/extraction-readiness gaps, or safe Foundation cleanup if connector/source work needs Steve approval.

## Previous Sprint: Parallel Builder Worktree Protocol

Live sprint ID: `parallel-builder-worktree-protocol-2026-05-18`.

This sprint is complete under `parallel-builder-worktree-protocol-v1`. It defines the Foundation-owned protocol for safe overnight and parallel builder work: one card per dedicated branch/worktree, disjoint write scopes, shared-file coordination, Current Sprint staging, proof commands, merge handoffs, and explicit no-go boundaries.

Completed card:

1. `PARALLEL-BUILDER-WORKTREE-PROTOCOL-001` - done under `parallel-builder-worktree-protocol-v1`. Scope was protocol/proof only. It rejects shared worktrees, shared branch edits, overlapping write scopes, missing Current Sprint coordination, uncoordinated shared/root file edits, forbidden local/mockup/Harlan/Fal/voice/Canva/OpenHuman scopes, and live extraction/provider-probe/external-write side effects. It also keeps `scripts/foundation-verify.mjs` under the 5,000-line guardrail by moving process-hardening orchestration wiring to `lib/foundation-verify-process-hardening-runner.js`.

Not next from this closeout: live extraction, auth-required or paid runs, provider/model probes, connector/OAuth repair, runtime worker implementation, model calls, external writes, Harlan/Fal/voice/Canva/OpenHuman feature work, Drive permission mutation, or Agent Feedback auto-send.

## Previous Sprint: Agent Status Freshness Gate

Live sprint ID: `agent-status-freshness-gate-2026-05-17`.

This sprint is complete under `agent-status-freshness-gate-v1`. It makes current operational status claims depend on fresh live Foundation/API truth instead of memory, notes, screenshots, handoffs, or chat claims.

Completed card:

1. `AGENT-STATUS-FRESHNESS-GATE-001` - done under `agent-status-freshness-gate-v1`. Scope was synthetic status-truth contract proof only: current-status claim type, as-of timestamp, fresh live API source, route/source ID, queried-at timestamp, max-age budget, current vs last-known labeling, and conflict detection against live truth.

Not next from this closeout: live extraction, auth-required or paid runs, provider/model probes, connector/OAuth repair, runtime adapter installs, model calls, external writes, Harlan/Fal/voice/Canva/OpenHuman feature work, Drive permission mutation, or Agent Feedback auto-send.

Recommended next: choose the next Foundation sprint from fresh repo truth.

## Previous Sprint: AIOS Runtime Portability Gate

Live sprint ID: `aios-runtime-portability-gate-2026-05-17`.

This sprint is complete under `aios-runtime-portability-gate-v1`. It makes runtime brains portable adapters under Foundation-owned contracts before agent/runtime work expands.

Completed card:

1. `AIOS-RUNTIME-PORTABILITY-GATE-001` - done under `aios-runtime-portability-gate-v1`. Scope was synthetic runtime contract proof only: identity, tools, permissions, model/provider route, auth posture, cost policy, logs/transcripts export, source/compiled-KB truth boundary, fallback brain, and adapter-only ownership for Claude, Codex, OpenClaw, OpenHuman, Higgsfield-style, and future runtimes.

Not next from this closeout: live extraction, auth-required or paid runs, provider/model probes, connector/OAuth repair, runtime adapter installs, model calls, external writes, Harlan/Fal/voice/Canva/OpenHuman feature work, Drive permission mutation, or Agent Feedback auto-send.

Followed by: `AGENT-STATUS-FRESHNESS-GATE-001`.

## Previous Sprint: Knowledge-Base Quality Gate

Live sprint ID: `knowledge-base-quality-gate-2026-05-17`.

This sprint is complete under `knowledge-base-quality-gate-v1`. It makes the Karpathy LLM Knowledge Base / LLM Wiki quality gate executable before any agent, extractor, or Harlan memory feature consumes compiled knowledge.

Completed card:

1. `KNOWLEDGE-BASE-QUALITY-GATE-001` - done under `knowledge-base-quality-gate-v1`. Scope was synthetic fail-closed quality-gate proof only: citations/source IDs, freshness, contradiction checks, page-size budgets, orphan-page blocking, frontmatter requirements, privacy/tier enforcement, and unsourced-doctrine blocking.

Not next from this closeout: live extraction, transcript fetch, screenshot capture, crawl, summarization, model calls, compiled KB page writes, query index/vector table writes, Research Inbox writes, atom creation, backlog mutation from extracted content, Harlan/Fal/voice/Canva/OpenHuman feature work, Drive permission mutation, or Agent Feedback auto-send.

Recommended next: `AIOS-RUNTIME-PORTABILITY-GATE-001`.

## Previous Sprint: Foundation Knowledge-Base Compiler Design

Live sprint ID: `foundation-knowledge-base-compiler-design-2026-05-17`.

This sprint is complete under `foundation-knowledge-base-compiler-design-v1`. It keeps the Karpathy LLM Knowledge Base / LLM Wiki direction Foundation-owned before any agent, extractor, or Harlan memory feature consumes it.

Completed card:

1. `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001` - done under `foundation-knowledge-base-compiler-design-v1`. Scope was design/proof only: raw sources and source contracts -> ingestion permission -> raw evidence envelope -> compiler rules -> compiled markdown/wiki page contract -> query/Q&A contract -> operator feedback loop -> quality gate.

Not next from this closeout: live extraction, transcript fetch, screenshot capture, crawl, summarization, model calls, compiled KB pages, query index/vector table, Research Inbox writes, atom creation, backlog mutation from extracted content, Harlan/Fal/voice/Canva/OpenHuman feature work, Drive permission mutation, or Agent Feedback auto-send.

Recommended next: `KNOWLEDGE-BASE-QUALITY-GATE-001`.

## Previous Sprint: LLM Auth Audit Budget Label Clarity

Live sprint ID: `llm-auth-audit-budget-label-clarity-2026-05-17`.

This sprint is complete under `llm-auth-audit-budget-label-clarity-v1`. It fixes the LLM auth audit budget truth before knowledge compiler and runtime portability work.

Completed card:

1. `LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001` - done under `llm-auth-audit-budget-label-clarity-v1`. Scope was Foundation process truth only: change `llm-auth-audit` from `no_llm` to `model_probe_no_extraction`, record explicit model-provider-probe/no-extraction/no-external-write budget details, label the OpenClaw `actual_model_run` probe, and dogfood that `no_llm` cannot hide provider/model probing.

Not next from this closeout: live extraction, live LLM auth audit rerun, provider account repair, OAuth, Agent Feedback auto-send, Gmail send, ClickUp write, Harlan/Fal/voice/Canva/OpenHuman feature work, connector auth, broad UI redesign, Drive permission mutation, or Meeting Vault Phase B.

Recommended next: `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`.

## Previous Sprint: Build Intel Karpathy LLM KB Preflight

Live sprint ID: `build-intel-karpathy-llm-kb-preflight-2026-05-17`.

This sprint is complete under `build-intel-karpathy-llm-kb-preflight-v1`. It prepares the Karpathy LLM Knowledge Base / LLM Wiki direction as Foundation-owned proposal truth before any extraction or compiler build.

Completed card:

1. `BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001` - done under `build-intel-karpathy-llm-kb-preflight-v1`. Scope was proposal/research only: compare current AIOS atoms, retrieval, synthesis, docs, source contracts, and Build Intel primitives against the raw data -> compiled markdown/wiki -> query/Q&A -> quality/lint loop; confirm the pending Karpathy packet remains non-runnable; identify have/missing/not-to-copy truth; and route gaps to `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001` plus `KNOWLEDGE-BASE-QUALITY-GATE-001`.

Not next from this closeout: live extraction, transcript fetch, screenshot capture, crawl, summarization, model calls, auth-required extraction, paid extraction without Steve approval, Research Inbox writes, atom creation, backlog mutation from extracted content, Harlan/Fal/voice/Canva/OpenHuman feature work, broad UI redesign, Drive permission mutation, or Agent Feedback auto-send.

Recommended next: `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`, unless Steve separately approves a no-auth/no-paid extraction run from the pending Karpathy packet.

## Previous Sprint: Source ID Array-Backed Provenance Design

Live sprint ID: `source-id-array-provenance-design-2026-05-16`.

This sprint is complete under `source-id-array-provenance-design-v1`. It designs the governed provenance model for the 3 array-backed `source_ids` relations that were deliberately excluded from simple scalar FK enforcement.

Completed card:

1. `SOURCE-ID-ARRAY-PROVENANCE-DESIGN-001` - done under `source-id-array-provenance-design-v1`. Scope was no-auth, report-only Foundation data-integrity design: inspect the 3 array-backed source-reference relations from the source-ID constraint contract and choose a canonical normalized child-table provenance model before any schema mutation. The design recommends later child tables `intelligence_report_artifact_sources`, `intelligence_retrieval_run_sources`, and `shared_communication_synthesized_item_sources`, each with `source_id` FK targets to `source_contract_registry(source_id)`. It rejects simple array FKs, generated scalar canonical projection, trigger-only canonical truth, scalar relation leakage, missing apply-gated backfill, and non-report-only posture.

Not next: DB schema mutation, trigger installation, join-table creation, backfill apply, source-contract authoring UI, startup/init FK creation, source extraction, connector auth, paid-source auth, Build Intel extraction, hub feature work, Marketing Video Lab wiring, Canva asset mutation, Drive permissions mutation, Drive permissions request-access emails, or MEETING-VAULT-ACL-001 Phase B.

Next active blocker: `SOURCE-ID-ARRAY-PROVENANCE-IMPLEMENTATION-001` is scoped as the explicit follow-up, but paused for Steve review. Do not build it until Steve approves an apply-gated migration plan. After review, choose this implementation card, another no-auth Foundation cleanup card, or a return to Build Intel/source extraction.

## Previous Sprint: Source ID Scalar FK Migration

Live sprint ID: `source-id-scalar-fk-migration-2026-05-16`.

This sprint is complete under `source-id-scalar-fk-migration-v1`. It enforces scalar source-ID integrity now that source contracts are materialized into `source_contract_registry`.

Completed card:

1. `SOURCE-ID-SCALAR-FK-MIGRATION-001` - done under `source-id-scalar-fk-migration-v1`. Scope was apply-gated DB enforcement only: derive the 10 scalar `fk_safe_now` `source_id` relations from the source-ID constraint contract, dry-run first, abort on stale registry or invalid live references, add/validate foreign keys to `source_contract_registry(source_id)`, keep the 3 array-backed `source_ids` relations out of this migration, and wire source-contract/root verifier coverage. Closeout proof validated 10/10 scalar FKs, 0 invalid scalar references, healthy registry state, and 0 array-backed constraints.

Not next: array-backed provenance redesign, trigger/join-table design, source-contract authoring UI, startup/init FK creation, source extraction, connector auth, paid-source auth, Build Intel extraction, hub feature work, Marketing Video Lab wiring, Canva asset mutation, Drive permissions mutation, Drive permissions request-access emails, or MEETING-VAULT-ACL-001 Phase B.

Next active blocker: choose the next no-auth Foundation cleanup slice from array-backed source provenance design, verifier split/line-count cleanup, or the next source/runtime integrity card that does not require Steve auth.

## Previous Sprint: Source Contract Registry Table

Live sprint ID: `source-contract-registry-table-2026-05-16`.

This sprint is complete under `source-contract-registry-table-v1`. It materializes the first DB-backed `source_contract_registry` table before any source-ID foreign-key migration.

Completed card:

1. `SOURCE-CONTRACT-REGISTRY-TABLE-001` - done under `source-contract-registry-table-v1`. Scope was data-integrity substrate: create schema, explicit apply-gated sync from `getSourceContracts()`, stable contract hashes, read-only focused proof, and source-contract verifier coverage.

Not next: source-ID FK constraints, array-backed provenance redesign, source-contract authoring UI, route redesign, seed/live overwrite, source extraction, connector auth, paid-source auth, Build Intel extraction, hub feature work, Marketing Video Lab wiring, Canva asset mutation, Drive permissions mutation, Drive permissions request-access emails, or MEETING-VAULT-ACL-001 Phase B.

Next active blocker: choose the next source-ID data-integrity slice from registry-backed scalar FK planning, scalar FK constraints for shape-safe relations, or array-backed provenance redesign.

## Previous Sprint: Source-ID Constraint Contract

Live sprint ID: `source-id-constraint-contract-2026-05-16`.

This sprint is complete under `source-id-constraint-contract-v1`. It creates a report-only contract for DB-backed source-ID references before any broad source-ID foreign-key migration.

Completed card:

1. `SOURCE-ID-CONSTRAINT-CONTRACT-001` - done under `source-id-constraint-contract-v1`. Scope was report-only data-integrity contract work: classify all 13 DB source-reference relations currently checked by `getFoundationDbConstraintAudit()` as `fk_safe_now` or `needs_schema_design`, dogfood unsafe FK claims, and wire thin core-governance verifier coverage.

Not next: DB schema migration, source-contract table redesign, live data mutation, route redesign, seed/live overwrite, hub feature work, Marketing Video Lab wiring, Canva asset mutation, paid-source auth, Build Intel extraction, source extraction, Drive permissions mutation, Drive permissions request-access emails, or MEETING-VAULT-ACL-001 Phase B.

Next active blocker: decide whether the next DB source-ID hardening slice should materialize a source-contract registry table, add scalar FKs for the 10 shape-safe relations, or redesign the 3 array-backed provenance relations first.

## Previous Sprint: DB Constraint Doc-Update Supersedes

Live sprint ID: `db-constraint-doc-update-supersedes-2026-05-16`.

This sprint is complete under `db-constraint-doc-update-supersedes-v1`. It makes approved pending-doc-update apply semantics match normal linked-decision supersession semantics: applying a doc update linked to a decision now locks that decision and applies its `supersedesIds` through the existing decision supersession path.

Completed card:

1. `DB-CONSTRAINT-001` - done under `db-constraint-doc-update-supersedes-v1`. Scope was decision-store apply semantics only: applying an approved pending doc update linked to a decision locks that decision, applies its `supersedesIds` through `markSupersededDecisions()`, records applied supersession metadata, and is covered by focused dogfood plus core-governance verifier proof.

Not next: live doc apply runs, route redesign, DB schema migration, broad source-ID foreign key migration, seed/live overwrite, hub feature work, Marketing Video Lab wiring, Canva asset mutation, paid-source auth, Build Intel extraction, Drive permissions mutation, Drive permissions request-access emails, or `MEETING-VAULT-ACL-001` Phase B.

## Previous Sprint: Extract Retry

Live sprint ID: `extract-retry-2026-05-16`.

This sprint is complete under `extract-retry-v1`. `EXTRACT-RETRY-001` makes failed-item retry support honest: only targets with a proven target-specific retry runner get a no-write reviewed retry command, and unsupported Drive/video/email corpus targets block instead of advertising fake `--retryFailed=true` support. Meeting retry mode loads retry-eligible crawl rows only. It did not run live extraction, add new retry targets, schedule retry loops, change connector auth, build hubs, wire Marketing Video Lab, mutate Canva assets, work Meeting Vault Phase B, or mutate Drive permissions.

Completed card:

1. `EXTRACT-RETRY-001` - done under `extract-retry-v1`. Scope was retry-command truth only: shared supported-target list, `buildExtractionNextSafeCommand()` honesty, meeting retry eligible-row loading, focused package-wired dogfood, extraction-runtime verifier coverage, rebuild doc update, and backlog/current-sprint closeout.

Previously completed in this runtime lane:

1. `EXTRACT-RETIRE-001` - done under `extract-retire-v1`. Scope was source-crawl finish-path retirement only: pure helper, store integration, focused package-wired dogfood, extraction-runtime verifier coverage, rebuild doc update, and backlog/current-sprint closeout.
2. `CRAWL-RUN-LEDGER-001` - done under `crawl-run-ledger-reconcile-v1`. Scope was proof and closeout only: focused `source_crawl_target_runs` / `crawlRunId` dogfood, package-wired focused proof, extraction-runtime verifier coverage, rebuild doc update, and backlog/current-sprint closeout.
3. `RUNTIME-HEALTH-SIMPLIFY-001` - done under `runtime-health-simplify-v1`. Scope was Runtime Health readability only: top command panel, attention-only runtime items, direct jumps to proof sections, collapsed diagnostics by proof area, focused dogfood that rejects the old wall-of-diagnostics shape, runtime reliability verifier coverage, focused proof 16/16, and full Foundation verification 401/401 before closeout.
4. `RUNTIME-FIRST-JOBS-001` - done under `runtime-first-jobs-v1`. Scope was no-auth runtime repair only: restore `leaseSourceCrawlTarget` / `finishSourceCrawlTargetRun` delegates, prove `gmail-current-day` and `missive-current-day` dry-runs do not lease targets or spawn child sync commands, add focused runtime reliability verifier coverage, and close with full Foundation verification at 400/400.
5. `FOUNDATION-IDENTITY-001` - done under `foundation-identity-surface-v1`. V1 exposes metadata-only workspace identity in System Inventory without copying private memory into repo truth.
6. `RUNTIME-SUPERVISOR-001` - done under `runtime-supervisor-v1`. V1 owns `lib/runtime-process-control.js` service-supervisor builders, `server.js` LaunchAgent wiring, `public/foundation-runtime-renderers.js` Runtime Health supervised-service rendering, `lib/foundation-runtime-reliability-verifier.js` coverage, focused proof `scripts/process-runtime-supervisor-check.mjs`, and closeout `docs/handoffs/2026-05-16-runtime-supervisor-closeout.md`.
7. `RUNTIME-WORKER-001` - done under `runtime-worker-reliability-v1`. V1 owns `lib/foundation-worker-reliability.js`, shared worker dry-run parsing, one-shot dry-run runtime-status guard, `workerReliability` job snapshots, Runtime Health worker reliability rendering, runtime reliability verifier coverage, focused proof `scripts/process-runtime-worker-check.mjs`, and closeout `docs/handoffs/2026-05-16-runtime-worker-reliability-closeout.md`.

Not next: live extraction, new retry target implementations, scheduled retry loops, auto-restart-on-push install, new scheduler framework, route/auth behavior changes, DB schema changes, source contract behavior changes, connector auth, hub feature work, Canva asset work, paid-source auth, screenshots, Build Intel feature work, Drive permission mutation, Drive permissions request-access emails, or Meeting Vault Phase B.

Next active blocker: choose the next no-auth Foundation cleanup card through Current Sprint review.

## Previous Sprint: Process-Hardening Verifier Split

Live sprint ID: `verifier-process-hardening-split-module-2026-05-16`.

This sprint is complete under `verifier-process-hardening-split-module-v1`. It extracted the existing process-hardening verifier checks out of `scripts/foundation-verify.mjs` into `lib/foundation-process-hardening-verifier.js` while preserving the same PASS/FAIL rows for read-only verifier fail-closed behavior, process-check write posture, scheduled mutation guards, Foundation DB init/seed separation, Current Sprint mutation guards, DB seed governance, KPI cache posture, Current Sprint store split proof, and backlog lost-update protection.

Completed card:

1. `VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001` - done under `verifier-process-hardening-split-module-v1`. V1 owns `lib/foundation-process-hardening-verifier.js`, `scripts/process-verifier-process-hardening-split-module-check.mjs`, package script `process:verifier-process-hardening-split-module-check`, plan/approval docs, dogfood fixtures that reject repair-then-pass verifier behavior, scheduled mutating process checks, seed/bootstrap writeback by default, and silent backlog lost updates, plus root verifier delegation and closeout record `docs/handoffs/2026-05-16-verifier-process-hardening-split-module-closeout.md`.

Not next: process guard behavior changes, route/auth behavior changes, UI redesign, Foundation Hub payload behavior changes, DB schema changes, backlog mutation behavior changes, source contract behavior changes, connector auth, extraction runs, hub feature work, Canva asset work, paid-source auth, screenshots, Build Intel feature work, Drive permission mutation, Drive permissions request-access emails, or Meeting Vault Phase B.

Previous completed sprint: `verifier-surface-trust-split-module-2026-05-16`, closed under `verifier-surface-trust-split-module-v1`.

## Previous Sprint: Surface/Trust Verifier Split

Live sprint ID: `verifier-surface-trust-split-module-2026-05-16`.

This sprint is complete under `verifier-surface-trust-split-module-v1`. It extracted the existing surface/trust verifier checks out of `scripts/foundation-verify.mjs` into `lib/foundation-surface-trust-verifier.js` while preserving the same PASS/FAIL rows for Foundation Hub core arrays, dashboard/worker served-code trust, verifier exception ledger validity, done-card verifier coverage, claimed artifact existence, backlog seed/live drift, DB constraint audit exposure, Foundation surface mapping, and surface freshness sweep exposure.

Completed card:

1. `VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001` - done under `verifier-surface-trust-split-module-v1`. V1 owns `lib/foundation-surface-trust-verifier.js`, `scripts/process-verifier-surface-trust-split-module-check.mjs`, package script `process:verifier-surface-trust-split-module-check`, plan/approval docs, dogfood fixtures that reject stale verifier exceptions, missing done-card verifier proof, missing claimed artifacts/routes/scripts, stale served code, and incomplete surface maps, plus root verifier delegation and closeout record `docs/handoffs/2026-05-16-verifier-surface-trust-split-module-closeout.md`.

Not next: route/auth behavior changes, UI redesign, Foundation Hub payload behavior changes, DB schema changes, backlog mutation behavior changes, source contract behavior changes, connector auth, extraction runs, hub feature work, Canva asset work, paid-source auth, screenshots, Build Intel feature work, Drive permission mutation, Drive permissions request-access emails, or Meeting Vault Phase B.

Previous completed sprint: `verifier-extraction-runtime-split-module-2026-05-16`, closed under `verifier-extraction-runtime-split-module-v1`.

## Previous Sprint: Extraction Runtime Verifier Split

Live sprint ID: `verifier-extraction-runtime-split-module-2026-05-16`.

This sprint is complete under `verifier-extraction-runtime-split-module-v1`. It extracted the existing extraction/runtime verifier checks out of `scripts/foundation-verify.mjs` into `lib/foundation-extraction-runtime-verifier.js` while preserving the same PASS/FAIL rows for Foundation worker reapers, video-link inventory control, corpus quota missions, scheduled source lanes, Drive/Gmail/video extraction targets, shared-comms content-hash processing, LLM route provenance, and stale LLM call detection.

Completed card:

1. `VERIFIER-EXTRACTION-RUNTIME-SPLIT-MODULE-001` - done under `verifier-extraction-runtime-split-module-v1`. V1 owns `lib/foundation-extraction-runtime-verifier.js`, `scripts/process-verifier-extraction-runtime-split-module-check.mjs`, package script `process:verifier-extraction-runtime-split-module-check`, plan/approval docs, dogfood fixtures that reject missing worker reaper wiring, missing corpus quota controls, missing Drive extraction support, and missing LLM provenance, plus root verifier delegation and closeout record `docs/handoffs/2026-05-16-verifier-extraction-runtime-split-module-closeout.md`.

Not next: extraction runs, extraction schedule changes, connector auth, source contract behavior changes, DB schema changes, backlog mutation behavior changes, route/auth behavior changes, hub feature work, Canva asset work, paid-source auth, screenshots, Build Intel feature work, Drive permission mutation, Drive permissions request-access emails, or Meeting Vault Phase B.

Previous completed sprint: `verifier-intelligence-spine-split-module-2026-05-16`, closed under `verifier-intelligence-spine-split-module-v1`.

## Previous Sprint: Intelligence Spine Verifier Split

Live sprint ID: `verifier-intelligence-spine-split-module-2026-05-16`.

This sprint is complete under `verifier-intelligence-spine-split-module-v1`. It extracted the existing intelligence-spine verifier checks out of `scripts/foundation-verify.mjs` into `lib/foundation-intelligence-spine-verifier.js` while preserving the same PASS/FAIL rows for INTEL-JOBS, REPORT-MINING, INTEL-ATOM, retrieval, retrieval eval, SYNTHESIS-FACTS, SYNTHESIS-ENGINE, and ACTION-ROUTER proof.

Completed card:

1. `VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001` - done under `verifier-intelligence-spine-split-module-v1`. V1 owns `lib/foundation-intelligence-spine-verifier.js`, `scripts/process-verifier-intelligence-spine-split-module-check.mjs`, package script `process:verifier-intelligence-spine-split-module-check`, plan/approval docs, dogfood fixtures that reject missing job-ledger provenance, missing retrieval tier guards, missing Action Router approval gates, and missing synthesis evidence proof, plus root verifier delegation and closeout record `docs/handoffs/2026-05-16-verifier-intelligence-spine-split-module-closeout.md`.

Not next: intelligence store rewrites, extraction runs, embeddings, synthesis refresh, action-router mutation, route behavior changes, auth behavior changes, source contract behavior changes, DB schema changes, backlog mutation behavior changes, hub feature work, Canva asset work, paid-source auth, screenshots, Build Intel feature work, Drive permission mutation, Drive permissions request-access emails, or Meeting Vault Phase B.

Previous completed sprint: `verifier-core-governance-split-module-2026-05-16`, closed under `verifier-core-governance-split-module-v1`.

## Previous Sprint: Core Governance Verifier Split

Live sprint ID: `verifier-core-governance-split-module-2026-05-16`.

This sprint is complete under `verifier-core-governance-split-module-v1`. It extracted the existing core governance/security verifier checks out of `scripts/foundation-verify.mjs` into `lib/foundation-core-governance-verifier.js` while preserving the same PASS/FAIL rows for doctrine promotion, People/Agents clarity, docs authority, direct model-call blocking, backlog closeout guardrails, DB constraint health, admin-gated routes, role-based app auth, localhost trust, Strategy PDF token forwarding, and FUB proxy mutation posture.

Active card:

1. `VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001` - done under `verifier-core-governance-split-module-v1`. V1 owns `lib/foundation-core-governance-verifier.js`, `scripts/process-verifier-core-governance-split-module-check.mjs`, package script `process:verifier-core-governance-split-module-check`, plan/approval docs, dogfood fixtures that reject direct host leaks, ungated admin routes, Host-header localhost bypass, open FUB proxy mutations, invalid DB source references, and weak backlog done-closeout guards, plus root verifier delegation and closeout record `docs/handoffs/2026-05-16-verifier-core-governance-split-module-closeout.md`.

Previous completed sprint: `verifier-intelligence-audit-split-module-2026-05-15`, closed under `verifier-intelligence-audit-split-module-v1`.

## Previous Sprint: Intelligence/Audit Verifier Split

Live sprint ID: `verifier-intelligence-audit-split-module-2026-05-15`.

This sprint is complete under `verifier-intelligence-audit-split-module-v1`. It extracted the existing intelligence/audit verifier checks out of `scripts/foundation-verify.mjs` into `lib/foundation-intelligence-audit-verifier.js` while preserving proposal-only and report-only guardrails for Implementation Intelligence, Build Intel Extraction Implementation, GStack Build Intel, Code Quality Nightly Audit, and Nightly Deep Audit.

Active card:

1. `VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001` - done under `verifier-intelligence-audit-split-module-v1`. V1 owns `lib/foundation-intelligence-audit-verifier.js`, `scripts/process-verifier-intelligence-audit-split-module-check.mjs`, package script `process:verifier-intelligence-audit-split-module-check`, plan/approval docs, dogfood fixtures that reject backlog writes, paid auth, code imports, auto-fixes, and audit writeback, root verifier delegation, and closeout record `docs/handoffs/2026-05-15-verifier-intelligence-audit-split-module-closeout.md`.

Previous completed sprint: `verifier-current-sprint-split-module-2026-05-15`, closed under `verifier-current-sprint-split-module-v1`.

## Previous Sprint: Current Sprint Verifier Split

Live sprint ID: `verifier-current-sprint-split-module-2026-05-15`.

This sprint is complete under `verifier-current-sprint-split-module-v1`. It extracts the Current Sprint system/cadence verifier checks out of `scripts/foundation-verify.mjs` into `lib/foundation-current-sprint-verifier.js` while preserving the canonical PASS/FAIL rows for the live Current Sprint overlay, sprint command view, done-this-sprint review state, Plan Critic/sprint approval proof, and Meeting Vault / Drive permission stop-lines.

Active card:

1. `VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001` - done under `verifier-current-sprint-split-module-v1`. V1 owns `lib/foundation-current-sprint-verifier.js`, `scripts/process-verifier-current-sprint-split-module-check.mjs`, package script `process:verifier-current-sprint-split-module-check`, plan/approval docs, dogfood fixtures that reject unhealthy Current Sprint API/status, missing doctrine/source markers, missing build-log ownership, and missing Drive/Meeting Vault stop-line evidence, root verifier delegation, and closeout record `docs/handoffs/2026-05-15-verifier-current-sprint-split-module-closeout.md`.

Not next: Current Sprint DB schema changes, Current Sprint route/UI behavior changes, broad verifier rewrite, Foundation DB splits, Marketing Video Lab, Canva asset library work, hub feature UI, paid-source auth, Build Intel extraction, Drive permission mutation, Drive permissions request-access emails, or Meeting Vault Phase B.

Previous completed sprint: `verifier-source-trust-split-module-2026-05-15`, closed under `verifier-source-trust-split-module-v1`.

## Previous Sprint: Source-Trust Verifier Split

Live sprint ID: `verifier-source-trust-split-module-2026-05-15`.

This sprint is complete under `verifier-source-trust-split-module-v1`. It extracts source-trust verifier checks out of `scripts/foundation-verify.mjs` into `lib/foundation-source-trust-verifier.js` while preserving the canonical PASS/FAIL rows for source-of-truth shape, connector working status, grouped source systems, KPI/Supabase health, Backlog Hygiene, Card Reference Trust, Source Contract Trust, Phase C visibility, Drive corpus notes, and Owners signoff visibility.

Active card:

1. `VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001` - done under `verifier-source-trust-split-module-v1`. V1 owns `lib/foundation-source-trust-verifier.js`, `scripts/process-verifier-source-trust-split-module-check.mjs`, package script `process:verifier-source-trust-split-module-check`, plan/approval docs, dogfood fixtures that reject missing connector/KPI/reference-trust/Phase C coverage, root verifier delegation, and closeout record `docs/handoffs/2026-05-15-verifier-source-trust-split-module-closeout.md`.

Not next: source contract behavior changes, connector behavior changes, KPI probe changes, source-of-truth route changes, Foundation DB splits, Marketing Video Lab, Canva asset library work, hub feature UI, paid-source auth, Build Intel extraction, Drive permission mutation, or Meeting Vault Phase B.

Previous completed sprint: `canva-client-foundation-2026-05-15`, closed under `canva-client-v1`.

## Previous Sprint: Canva Client Foundation

Live sprint ID: `canva-client-foundation-2026-05-15`.

This sprint is complete under `canva-client-v1`. It built a governed read-only Canva Connect API client so AIOS can mint access tokens from the existing Canva OAuth credentials, handle refresh-token rotation safely, and read Canva folders/designs/assets/brand-template metadata without leaking secrets.

This is the access primitive only. It does not organize Tanner's Canva library, create designs, upload assets, export files, wire Marketing Video Lab routes, or build the future Brand Ingredient Asset Library.

Active card:

1. `CANVA-CLIENT-001` - done under `canva-client-v1`. V1 owns `lib/canva-client.js`, `scripts/process-canva-client-check.mjs`, `scripts/canva-oauth-bootstrap.mjs`, package scripts, focused synthetic proof, live read-only Canva smoke, and verifier coverage. Steve completed the admin OAuth bootstrap; the script replaced the existing `CANVA_REFRESH_TOKEN=` line instead of appending a duplicate stale token.

Future queued context: Tanner's messy intake folder `https://www.canva.com/folder/FAHJp1pSJv0` is an upstream source to inspect later, not clean brand truth. Later Marketing/Foundation work should create a clean Brand Ingredient Asset Library: approved mascots, avatars, sold signs, fonts, guidelines, templates, and staple assets with Canva provenance, plus a separate editable-output loop that can push AI-generated posts/designs into Canva for team manual editing.

Not next: Canva writes/uploads/exports/design creation, Marketing Video Lab live route wiring, `server.js`/security route changes, DB schema changes, hub UI, full Canva source crawler/backfill, Tanner asset cleanup, Google Flow work, paid-source auth, broad source extraction, Drive permission mutation, request-access emails, or `MEETING-VAULT-ACL-001` Phase B.

Previous completed sprint: `foundation-db-shared-comms-coverage-split-2026-05-15`, closed under `foundation-shared-comms-coverage-split-v1`. `FOUNDATION-DB-MONOLITH-SPLIT-008` moved shared-comms coverage aggregation into `lib/foundation-shared-comms-coverage.js`, keeps the public DB export stable for existing callers, and dogfoods that old inline shared-comms coverage ownership fails while split module ownership passes.

Previous completed sprint: `foundation-db-fub-lead-source-store-split-2026-05-15`, closed under `foundation-fub-lead-source-store-split-v1`. `FOUNDATION-DB-MONOLITH-SPLIT-007` moved FUB lead-source rules/snapshot storage into `lib/foundation-fub-lead-source-store.js` while preserving table schema, SQL behavior, return shapes, public exports, and existing callers.

Previous completed sprint: `foundation-db-strategy-goal-truth-split-2026-05-15`, closed under `foundation-strategy-goal-truth-split-v1`. `FOUNDATION-DB-MONOLITH-SPLIT-006` moved Strategy Prework Coverage and Strategy Goal Truth builder behavior into `lib/foundation-strategy-goal-truth.js` while preserving source IDs, doc paths, participant detection, goal group keys, rules, caveats, and public callers.

Previous completed sprint: `foundation-db-strategy-operating-truth-split-2026-05-15`, closed under `foundation-strategy-operating-truth-split-v1`. `FOUNDATION-DB-MONOLITH-SPLIT-005` moved Strategy Operating Truth finance/Owners/FUB/KPI source-card builder behavior into `lib/foundation-strategy-operating-truth.js` while preserving source IDs, Google ranges, KPI card reads, FUB snapshot reads, public callers, and source-card shape.

Previous completed sprint: `foundation-db-strategy-source-snapshot-split-2026-05-15`, closed under `foundation-strategy-source-snapshot-split-v1`. `FOUNDATION-DB-MONOLITH-SPLIT-004` moved source-backed BHAG and Agent Engine doc snapshot builders into `lib/foundation-strategy-source-snapshots.js` while preserving Google source IDs/ranges/doc paths/source IDs/labels/sort orders and `doc_source_snapshots` persistence.

Previous completed sprint: `foundation-db-core-seed-split-2026-05-15`, closed under `foundation-core-seed-split-v1`. `FOUNDATION-DB-MONOLITH-SPLIT-003` moved static Foundation bootstrap seed arrays into `lib/foundation-core-seed.js` while preserving live Postgres/API as operational truth after bootstrap.

Previous completed sprint: `verifier-server-route-split-module-2026-05-15`, closed under `verifier-server-route-split-module-v1`. `VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001` extracted the already-shipped server route split verifier proof domain from `scripts/foundation-verify.mjs` into `lib/foundation-server-route-split-verifier.js` without changing route behavior.

Previous completed sprint: `kpi-health-api-cache-2026-05-15`, closed under `kpi-health-api-cache-v1`. `KPI-HEALTH-API-CACHE-001` bounded KPI/Supabase health probes with an explicit timeout, kept source/hub request paths on cached safe KPI health, and dogfooded that a slow KPI provider aborts quickly instead of hanging Foundation or hub routes.

Previous completed sprint: `db-seed-2026-05-15`, closed under `db-seed-v1`. `DB-SEED-001` split backlog seed truth out of `lib/foundation-db.js` into `lib/foundation-backlog-seed.js`, added report-only seed-governance proof, and reduced `lib/foundation-db.js` from about `17,852` to `13,200` lines without treating seed files as live truth.

Previous completed sprint: `active-vs-historical-verifier-split-2026-05-15`, closed under `active-vs-historical-verifier-split-v1`. `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001` separates active live-truth verifier assertions from historical closeout proof. Dogfood proves stale active live truth fails even when verified historical closeout evidence exists, while historical proof passes only for a done card plus matching verified closeout.

Previous completed sprint: `foundation-job-mutation-allowlist-2026-05-15`, closed under `foundation-job-mutation-allowlist-v1`. It makes enabled scheduled Foundation jobs prove their mutation posture through an explicit keyed allowlist before the worker can trust them. Missing rows, posture mismatches, and explicitly blocked scheduled jobs fail closed. Runtime/job rows expose the allowlist status so the morning health view can say why a job is allowed or blocked.

Previous completed sprint: `live-truth-verify-decouple-2026-05-15`, closed under `live-truth-verify-decouple-v1`. It separates active Current Sprint command truth from explicitly labeled historical closeout proof and bootstrap/default sprint literals. The nightly code-quality audit no longer reports the eight 2026-05-14 baseline references as active hardcoded Current Sprint truth, while unlabeled active current-sprint literals still fail as P0 findings.

## Previous Sprint: Sprint Check Historical Mode

Live sprint ID: `sprint-check-historical-mode-2026-05-15`.

This sprint is closed under `sprint-check-historical-mode-v1`. It makes focused sprint proof scripts historical-aware after closeout: active cards still prove against the active Current Sprint, while closed cards can prove from live done-lane backlog truth plus a matching verified closeout after the active sprint rolls forward.

Completed card:

1. `SPRINT-CHECK-HISTORICAL-MODE-001` - historical-aware focused sprint checks. Adds `lib/sprint-check-historical-mode.js`, migrates `scripts/process-check-readonly-mode-check.mjs` from exact active-sprint ID assertion to active-or-verified-closeout proof, adds focused proof and verifier coverage, and keeps the checker read-only by default. Dogfood proves the previous readonly proof now passes after rollover from verified closeout evidence while weak historical fixtures fail closed.

Not next: rewriting every historical process script, adding an `activeSprintAtOrPast` bypass, weakening active Current Sprint checks for current cards, hub UI, Marketing Video Lab wiring, Build Intel extraction, paid-source auth, Drive permission mutation, or Meeting Vault Phase B.

Previous completed sprint: `process-check-readonly-mode-2026-05-15`, closed under `process-check-readonly-mode-v1`. It makes process-check scripts safer by default: shared backlog create/update calls now reject process-check writes unless the invocation has explicit write posture, and a focused scanner classifies every `process-*-check.mjs` script as read-only, guarded live mutation, report-only, or historical closeout-only.

Previous completed sprint: `foundation-decision-store-split-2026-05-15`, closed under `foundation-decision-store-split-v1`. It extracted only the decision, open-question, and pending-doc-update store domain from `lib/foundation-db.js` into `lib/foundation-decision-store.js`, while preserving the existing public exports from `lib/foundation-db.js`.

Previous completed sprint: `verifier-source-contracts-module-2026-05-15`, closed under `verifier-source-contracts-module-v1`. It extracted only the source-contract/signoff verifier domain from `scripts/foundation-verify.mjs` into `lib/foundation-source-contract-verifier.js`, while preserving the same canonical PASS/FAIL rows for signed-off Owners, Finance current reality, Freedom range coverage, source-registry truth, and current-state helper/mirror boundaries.

Previous completed sprint: `foundation-server-monolith-closeout-2026-05-15`, closed by splitting server route domains without feature changes. `NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001` closed under `nightly-deep-audit-p0-triage-v1`, `APP-PAGE-ROUTES-SPLIT-001` closed under `app-page-routes-split-v1`, `AUTH-ROUTES-SPLIT-001` closed under `auth-routes-split-v1`, `HUB-READ-ROUTES-SPLIT-001` closed under `hub-read-routes-split-v1`, `STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001` closed under `strategy-shared-comms-routes-split-v1`, `FOUNDATION-WRITE-ROUTES-SPLIT-001` closed under `foundation-write-routes-split-v1`, and `AGENT-FEEDBACK-ROUTES-SPLIT-001` closed under `agent-feedback-routes-split-v1`. `server.js` is now under the danger line at about `4,800` lines.

Previous completed sprint: `foundation-runtime-read-routes-split-2026-05-15`, closed under `foundation-runtime-read-routes-split-v1`. It extracted the read-only Foundation runtime status route cluster out of `server.js` into `lib/foundation-runtime-read-routes.js` without changing runtime-control mutation behavior, POSTing job-control mutations in proof, or touching hub feature work.

Previous completed sprint: `fub-source-route-split-2026-05-15`, closed under `fub-source-route-split-v1`. It extracted the no-auth FUB source-control route cluster out of `server.js` into `lib/fub-source-routes.js` without changing validation behavior, calling live FUB success-path refreshes in proof, or touching hub feature work.

Previous completed sprint: `verifier-frontend-split-checks-module-2026-05-15`, closed under `verifier-frontend-split-checks-module-v1`. It extracted the already-shipped frontend split verifier checks out of `scripts/foundation-verify.mjs` into `lib/foundation-frontend-split-verifier.js` without changing the canonical frontend split PASS/FAIL rows or product behavior.

Previous completed sprint: `frontend-decision-question-renderers-split-2026-05-15`, closed under `frontend-decision-question-renderers-split-v1`. It extracted the Foundation Decisions / Open Questions renderer cluster out of `public/foundation.js` into `public/foundation-decision-question-renderers.js` and reduced `public/foundation.js` from about `6,348` to `4,910` lines for that slice.

Previous completed sprint: `frontend-current-state-renderers-split-2026-05-15`, closed under `frontend-current-state-renderers-split-v1`. It extracted the Foundation Overview / Current State renderer cluster out of `public/foundation.js` into `public/foundation-current-state-renderers.js` and reduced `public/foundation.js` from about `7,710` to `6,348` lines.

Previous completed sprint before that: `frontend-fub-lead-source-renderers-split-2026-05-15`, closed under `frontend-fub-lead-source-renderers-split-v1`. It extracted the Foundation FUB lead-source taxonomy renderer cluster out of `public/foundation.js` into `public/foundation-fub-lead-source-renderers.js` and reduced `public/foundation.js` from about `8,388` to `7,710` lines.

Previous completed sprint before that: `frontend-system-inventory-renderers-split-2026-05-15`, closed under `frontend-system-inventory-renderers-split-v1`. It extracted Foundation Systems and System Inventory renderers out of `public/foundation.js` into `public/foundation-system-inventory-renderers.js` and reduced `public/foundation.js` from about `9,774` to about `8,388` lines.

Previous completed sprint before that: `frontend-source-registry-renderers-split-2026-05-15`, closed under `frontend-source-registry-renderers-split-v1`. It extracted Data Sources / Source Registry renderers out of `public/foundation.js` into `public/foundation-source-registry-renderers.js` and reduced `public/foundation.js` from about `11,223` to about `9,775` lines for that slice.

## Previous Sprint: Foundation Source Lifecycle Renderer Split

Live sprint ID: `frontend-source-lifecycle-renderers-split-2026-05-15`.

This sprint is closed under `frontend-source-lifecycle-renderers-split-v1`. It extracts the Foundation source lifecycle/source-health renderer cluster out of `public/foundation.js` into a focused classic browser script without changing renderer behavior, route semantics, CSS, or Foundation API contracts.

The sprint order:

1. `FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001` - done under `frontend-source-lifecycle-renderers-split-v1`; Source Lifecycle/source-health panel renderers now live in `public/foundation-source-lifecycle-renderers.js` while `public/foundation.js` keeps the route-level `renderSourceLifecycle()` owner. Focused proof executes the split scripts in a VM-backed fake browser, proves Source Lifecycle dispatch reaches moved renderer globals, proves extracted helper behavior, rejects missing/wrong source-lifecycle-module script order, measures `/foundation` and split scripts under budget, updates split-source reviewer readers, and reduces `public/foundation.js` from `12,717` to about `11,223` lines for this slice.

Previous completed sprint: `frontend-runtime-renderers-split-2026-05-15`, closed under `frontend-runtime-renderers-split-v1`. It extracted Runtime Health diagnostic panel renderers out of `public/foundation.js` into `public/foundation-runtime-renderers.js` without changing renderer behavior.
## Previous Sprint: Foundation Runtime Renderer Split

Live sprint ID: `frontend-runtime-renderers-split-2026-05-15`.

This sprint is closed under `frontend-runtime-renderers-split-v1`. It extracts the Foundation runtime diagnostics renderer cluster out of `public/foundation.js` into a focused classic browser script without changing renderer behavior, route semantics, CSS, or Foundation API contracts.

The sprint order:

1. `FRONTEND-RUNTIME-RENDERERS-SPLIT-001` - done under `frontend-runtime-renderers-split-v1`; Runtime Health diagnostic panel renderers now live in `public/foundation-runtime-renderers.js` while `public/foundation-operations-renderers.js` keeps the route-level `renderDataHealth()` owner. Focused proof executes the split scripts in a VM-backed fake browser, proves Runtime Health dispatch reaches moved renderer globals, proves extracted helper behavior, rejects missing/wrong runtime-module script order, measures `/foundation` and split scripts under budget, updates split-source reviewer readers, and reduces `public/foundation.js` from about `14,206` to about `12,718` lines for this slice.

Previous completed sprint: `frontend-operations-renderers-split-2026-05-15`, closed under `frontend-operations-renderers-split-v1`. It extracted Runtime Health, System Activity, Daily Summary, Recent Work, and Current Sprint build-log route renderers out of `public/foundation.js` into `public/foundation-operations-renderers.js` without changing renderer behavior.

## Previous Sprint: Foundation Operations Renderer Split

Live sprint ID: `frontend-operations-renderers-split-2026-05-15`.

This sprint is closed under `frontend-operations-renderers-split-v1`. It extracts the Foundation operations renderer cluster out of `public/foundation.js` into a focused classic browser script without changing renderer behavior, route semantics, CSS, or Foundation API contracts.

The sprint order:

1. `FRONTEND-OPERATIONS-RENDERERS-SPLIT-001` - done under `frontend-operations-renderers-split-v1`; Runtime Health, System Activity, Daily Summary, Recent Work, and Current Sprint build-log renderers now live in `public/foundation-operations-renderers.js`. Focused proof executes the split scripts in a VM-backed fake browser, proves extracted helper behavior and route dispatch to moved renderer globals, rejects missing/wrong operations-module script order, measures `/foundation` and split scripts under budget, updates split-source reviewer readers, and reduces `public/foundation.js` from `15,305` to about `14,207` lines for this slice.

Previous completed sprint: `frontend-monolith-split-2026-05-15`, closed under `frontend-monolith-split-v1`. It extracted nav/doc config, cache/read/mutation helpers, and hash route/nav/init behavior out of `public/foundation.js` without changing renderer behavior.

## Previous Sprint: Foundation Frontend Monolith Split

Live sprint ID: `frontend-monolith-split-2026-05-15`.

This sprint is closed under `frontend-monolith-split-v1`. It extracts the first safe Foundation browser seams out of `public/foundation.js` into focused classic browser scripts without changing renderer behavior, route semantics, CSS, or Foundation API contracts.

The sprint order:

1. `FRONTEND-MONOLITH-SPLIT-001` - done under `frontend-monolith-split-v1`; nav/doc config now lives in `public/foundation-nav-config.js`, cache/read/mutation helpers live in `public/foundation-data.js`, and hash route/nav/init behavior lives in `public/foundation-router.js`. Focused proof executes the split scripts in a VM-backed fake browser, proves route dispatch and cache invalidation behavior, rejects missing/wrong script-order failures, measures `/foundation` and split scripts under budget, and reduces `public/foundation.js` from `16,061` to `15,306` lines for this slice.

Previous completed sprint: `foundation-backlog-store-split-2026-05-15`, closed under `foundation-backlog-store-split-v1`. It extracted backlog create/update write behavior out of `lib/foundation-db.js` into `lib/foundation-backlog-store.js` without changing public `createBacklogItem` / `updateBacklogItem` imports or task-truth safeguards.

## Previous Sprint: Foundation Backlog Store Split

Live sprint ID: `foundation-backlog-store-split-2026-05-15`.

This sprint is closed under `foundation-backlog-store-split-v1`. It extracts backlog create/update write behavior out of `lib/foundation-db.js` into `lib/foundation-backlog-store.js` without changing public `createBacklogItem` / `updateBacklogItem` imports or task-truth safeguards.

The sprint order:

1. `FOUNDATION-DB-MONOLITH-SPLIT-001` - done under `foundation-backlog-store-split-v1`; backlog write behavior now lives in `lib/foundation-backlog-store.js`, public exports remain stable in `lib/foundation-db.js`, and focused dogfood rejects weak done-lane closeouts plus missing row-lock/change metadata failures.

Previous completed sprint: `verifier-route-split-module-2026-05-15`, closed under `verifier-route-split-module-v1`. It extracted the route-split verifier checks for the operator/source/Build Intel route splits out of `scripts/foundation-verify.mjs` into `lib/foundation-route-split-verifier.js` without changing the canonical verifier rows.

## Previous Sprint: Verifier Route Split Module

Live sprint ID: `verifier-route-split-module-2026-05-15`.

This sprint is closed under `verifier-route-split-module-v1`. It extracts the route-split verifier checks for the operator/source/Build Intel route splits out of `scripts/foundation-verify.mjs` into `lib/foundation-route-split-verifier.js` without changing the canonical verifier rows.

The sprint order:

1. `VERIFIER-MONOLITH-SPLIT-CONTINUE-001` - done under `verifier-route-split-module-v1`; route-split verifier definitions now live in `lib/foundation-route-split-verifier.js`, `foundation:verify` delegates through `evaluateFoundationRouteSplitVerifier`, and focused dogfood rejects old inline route, missing module marker, wrong Build Intel payload, and missing closeout failures.

Previous completed sprint: `build-intel-route-split-2026-05-15`, closed under `build-intel-route-split-v1`. It extracted the Foundation Build Intel read-route cluster into `lib/foundation-build-intel-routes.js`: Build Intel watchlist, multimodal extractor contract, Research Inbox contract, control compression, implementation intelligence, Build Intel extraction, and GStack Build Intel.

## Previous Sprint: Foundation Build Intel Route Split

Live sprint ID: `build-intel-route-split-2026-05-15`.

This sprint is closed under `build-intel-route-split-v1`. It extracts the Foundation Build Intel read-route cluster out of `server.js` into `lib/foundation-build-intel-routes.js` without changing route behavior.

The sprint order:

1. `BUILD-INTEL-ROUTE-SPLIT-001` - done under `build-intel-route-split-v1`; Build Intel watchlist, multimodal extractor contract, Research Inbox contract, control compression, implementation intelligence, Build Intel extraction, and GStack Build Intel now register through `registerFoundationBuildIntelRoutes(app, deps)`. Focused proof hit all 7 moved live routes under budget, with worst route `/api/foundation/control-compression` under 500ms, proved the old inline route markers are absent from `server.js`, and proved the focused script is read-only.

Previous completed sprint: `source-route-split-2026-05-15`, closed under `source-route-split-v1`. It extracted the Foundation source/control route cluster into `lib/foundation-source-routes.js`: source-of-truth, source lifecycle, marketing source map, brand stack, tier behavior, verification runs, per-user changelog, restricted decision queue, source coverage, extraction coverage, source maturity, connector preflight, connector matrix, and source-to-hub routing.

Previous completed sprint: `server-route-split-2026-05-15`, closed under `server-route-split-v1`. It extracted a bounded Foundation operator read-route cluster into `lib/foundation-operator-routes.js`: changes, change-log, daily-summary, build-log, single-card backlog detail, and doc-updates.

## Previous Sprint: Foundation Server Route Split

Live sprint ID: `server-route-split-2026-05-15`.

This sprint is closed under `server-route-split-v1`. It extracts a bounded Foundation operator read-route cluster out of `server.js` into `lib/foundation-operator-routes.js` without changing route behavior.

The sprint order:

1. `SERVER-ROUTE-SPLIT-001` - done under `server-route-split-v1`; `GET /api/foundation/changes`, `/api/foundation/change-log`, `/api/foundation/daily-summary`, `/api/foundation/build-log`, `/api/foundation/backlog/:cardId`, and `/api/foundation/doc-updates` now register through `registerFoundationOperatorRoutes(app, deps)`. Focused proof hit every moved live route, confirmed missing backlog still returns `404`, malformed backlog IDs still return `400`, proved the old inline route markers are absent from `server.js`, and kept the single-card backlog detail route at `2ms` / `2,089B`.

Previous completed sprint: `foundation-backlog-detail-endpoint-2026-05-15`, closed under `foundation-backlog-detail-endpoint-v1`. It adds a read-only single-card backlog detail endpoint so hubs and Foundation UI can fetch full text for one card without pulling full diagnostics.

## Previous Sprint: Foundation Backlog Detail Endpoint

Live sprint ID: `foundation-backlog-detail-endpoint-2026-05-15`.

This sprint is closed under `foundation-backlog-detail-endpoint-v1`. It adds a read-only single-card backlog detail endpoint so hubs and Foundation UI can fetch full text for one card without pulling full diagnostics.

The sprint order:

1. `FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001` - done under `foundation-backlog-detail-endpoint-v1`; `GET /api/foundation/backlog/:cardId` returns full detail for one valid card, returns `404` for a missing valid card, returns `400` for malformed IDs, and measured `48ms` / `2,089B` for a real card in focused proof while the default `/api/foundation-hub` stayed compact at `461,702B`.

The approved sprint is complete. If Steve is unavailable, continue no-auth Foundation cleanup. Good candidates are another verifier module split, server route ownership split, or a small UI consumer switch to use `/api/foundation/backlog/:cardId` if the Foundation page currently pulls full diagnostics for card expansion.

Previous completed sprint: `foundation-hub-backlog-contract-2026-05-15`, closed under `foundation-hub-backlog-contract-v1`. It keeps the default Foundation Hub route fast as the backlog grows by making `backlogItems` an explicit thin contract instead of a full long-note dump. `FOUNDATION-HUB-BACKLOG-CONTRACT-001` is done under `foundation-hub-backlog-contract-v1`; default `/api/foundation-hub` now exposes `foundation-hub-backlog.contract.v1`, preserves all 455 card identities/counts, shrinks live default backlog rows from 635,887B to 344,296B, and measures the route at 470,134B / 72ms in focused proof.

Previous completed sprint: `foundation-ready-safe-hub-lane-2026-05-15`, closed under `foundation-ready-safe-hub-lane-v1`. It creates the safe lane Steve needs for hub work while Foundation sprints continue: hubs can consume read-only Foundation source health, use hub-owned fixtures, and request shared route/server changes without editing shared files directly. `HUB-CONSUMER-CONTRACT-001`, `HUB-SANDBOX-WORKFLOW-001`, `SHARED-FILE-INTEGRATION-GATE-001`, and `SOURCE-TO-HUB-PROOF-001` are done under this closeout.

Previous completed sprint: `foundation-ship-gate-verifier-tightening-2026-05-15`, closed under `foundation-ship-gate-tightening-v1`. It reduces Foundation ship-gate friction without hiding risk: `foundation:verify` now has additive failure-only and JSON summary modes, closeout validation rejects owned/context card overlap, and route-budget verifier behavior is split into `lib/foundation-route-budget-verifier.js`.

Previous completed sprint: `foundation-route-budget-cleanup-2026-05-14`, closed under `foundation-route-budget-cleanup-v1`. It turns the first nightly deep audit route-budget findings into measured fixes without hub feature work: `/api/source-of-truth` delegates payload construction to `lib/source-of-truth-payload.js`, uses a bounded KPI health route cache, and measured 10ms / 134,031 bytes after cache warmup. Default `/api/foundation-hub` compacts Foundation Jobs runtime rows, Foundation 1100 review, and Research Curation cards through `lib/foundation-hub-summary-payload.js`, measuring 79ms / 774,641 bytes under the 800KB warning budget.

Previous completed sprint: `nightly-deep-audit-upgrade-2026-05-14`, closed under `nightly-deep-audit-upgrade-v1`. It schedules the report-only `nightly-deep-audit` reviewer at 03:00 America/Toronto, writes date-based morning reports, selects changed/high-risk backend/frontend/verifier/hot-route/DB surfaces, records approved-route readiness without live spend by default, and dogfoods the May 13 rot patterns. The first report found 76 findings, 18 high-risk review targets, Foundation Hub payload warning at 873237B, and `/api/source-of-truth` latency risk at 2501ms.

Recommended next sprint, not silently opened: choose from the next nightly audit and profiler. Good candidates are verifier/module splits, server route ownership split, and a thin default `backlogItems` payload contract for Foundation Hub.

Previous completed sprint: `foundation-clickup-verify-health-boundary-2026-05-14`, closed under `foundation-clickup-verify-health-boundary-v1`. It cut the measured ClickUp verifier drag without weakening verifier trust: `health:clickup:verify` dropped from roughly 45 seconds to 2.733 seconds in the final profile proof, and the full profiled verifier dropped from roughly 92 seconds to 49.427 seconds.

Previous completed sprint: `foundation-ship-gate-speed-payload-cleanup-2026-05-14`, closed under `foundation-ship-gate-speed-payload-cleanup-v1`. It added a read-only fast ship preflight, live freshness ownership rows, verifier timing profile output, one LLM auth verifier module split, and a smaller full diagnostics payload. That sprint exposed ClickUp verifier latency as the next measured bottleneck, which is now closed under `foundation-clickup-verify-health-boundary-v1`.

Previous completed sprint: `foundation-operating-reliability-2026-05-14`, closed under `foundation-operating-reliability-v1`. It added connector uptime, connector failure redaction/classification, runtime activation, and a report-only morning health surface. The `connector-uptime-monitor` Foundation job is scheduled read-only. The older `code-quality-nightly-audit` job remains manual/report-first as the deterministic base layer; `RECURRING-DEEP-AUDIT-001` remains manual/report-only historical cadence; `NIGHTLY-DEEP-AUDIT-UPGRADE-001` is now the scheduled reviewer layer.

Previous completed audit sprint: `foundation-code-quality-nightly-audit-2026-05-13`, closed under `foundation-code-quality-nightly-audit-v1`. It added deterministic report-first codebase/frontend audit detectors and a manual unscheduled Foundation job. Findings are proposed backlog fixes only. It did not schedule a recurring senior-engineer deep audit.

Previous completed control-plane sprint ID: `control-plane-connector-readiness-2026-05-12`.

The control-plane sprint order was:

1. `CURRENT-SPRINT-DYNAMIC-TRUTH-001` — done under `current-sprint-dynamic-truth-v1`; active Current Sprint command truth now fails closed when live sprint metadata is incomplete, and hardcoded defaults are bootstrap-only.
2. `SPRINT-STAGE-GATE-001` — done under `sprint-stage-gate-v1`; stage prerequisites are enforced, and the dogfood proof rejects the original skipped Connector/Routing state while accepting the repaired after-action state.
3. `FOUNDATION-PLAN-RECONCILE-001` — done under `foundation-plan-reconcile-control-plane-v1`; rebuild plan/state/handoff truth now matches live sprint and closeout reality without product expansion.
4. `CONNECTOR-CREDENTIAL-001` — done under `connector-credential-v1`; the no-secret connector credential/preflight registry now records owner, credential class, source-unlocked state, last probe status, and blocker reason without exposing credential values.
5. `LLM-AUTH-AUDIT-001` — done under `llm-auth-audit-v1`; the Foundation job ledger has fresh model route/auth probes, guarded fallback status, and dry-run route-selection proof without provider account changes.
6. `SOURCE-EXTRACTION-GAP-FOLLOWUP-001` — done under `source-extraction-gap-followup-v1`; `docs/handoffs/2026-05-13-source-extraction-gap-triage.md` ranks 23 source rows needing attention without starting ingestion.

The approved control-plane sprint is complete. Stop at sprint review before opening the next sprint or product work.

Source Truth Guardrails is also complete under `atom-flow-auto-demotion-v1`, `extract-run-hardening-execution-v1`, and `research-lane-purge-v1`.

Build Intel Intake Foundation is complete under `build-intel-intake-foundation-v1`:

1. `CREATOR-WATCHLIST-001` — normalized 24 Build Intel sources and 4 later marketing-content sources into `lib/build-intel-watchlist.js` and `/api/foundation/build-intel-watchlist` without starting extraction.
2. `MULTIMODAL-EXTRACTOR-001` — defined the governed extractor contract for public YouTube, authorized paid/private sources, evidence levels, route/cost provenance, screenshot/keyframe policy, and auto-backlog-mutation rejection.
3. `RESEARCH-INBOX-001` — defined the proposal-only Research Inbox gate so Build Scoper/extraction findings return proposals for Steve+Codex approval before backlog mutation.

Next named sprint, not silently opened: **Build Intel Extraction Implementation Sprint**. Scope: bounded YouTube watchlist proof, Steve-present access/content-use decisions for Skool/myICOR/Loom, Build Scoper proposals to Research Inbox, and Build Intel brief synthesis.

Foundation Control + Backlog Compression is complete under `foundation-control-backlog-compression-v1`:

1. `FEEDBACK-CAPTURE-001` — schema-backed Foundation feedback capture exists so Steve feedback can be stored for review instead of living only in chat.
2. `FEEDBACK-TRIAGE-001` — deterministic triage proposes routing only; it does not create backlog cards, decisions, docs, sprints, or code changes.
3. `BACKLOG-MONITOR-001` — live backlog pressure, research survivors, duplicate candidates, proof risks, stale candidates, and ghost-completion candidates are reported without mutation.
4. `SPRINT-MASTER-ADVISOR-001` — next-sprint options are proposed with rationale and blockers, but Steve+Codex still approve and open the sprint manually.
5. `SYSTEM-FLOW-MAP-001` — Foundation now has a live source -> job -> atom -> synthesis -> route/proposal -> backlog -> sprint -> ship map.
6. `FOUNDATION-DONE-VELOCITY-001` — Foundation done velocity is exposed with honest date confidence.
7. `PROCESS-ACK-STATES-001` — acknowledged states now carry owner, reason, review date, expiry, and related card/source refs without suppressing critical verifier failures automatically.
8. `VERIFIER-INCREMENTAL-COVERAGE-001` — incremental proof planning exists for safe focused checks while protected server/security/database/runtime/verifier paths fall back to full verification.

Stop at sprint review. Good next sprint options are Internal Implementation Scoper for thin-card enrichment (`INTERNAL-SCOPER-001`), Runtime + Extraction Hardening Foundation, Build Intel Extraction Implementation with Steve-present auth decisions, or research-lane promotion review from the backlog monitor.

Implementation Intelligence is complete under `implementation-intelligence-v1`:

1. `INTERNAL-SCOPER-001` — proposal-only Internal Scoper now returns 7-section build-ready enrichment for thin cards and no-ops on cards that are already build-ready.
2. `THIN-CARD-DETECTOR-001` — deterministic backlog readiness scoring identifies thin scoped/research cards with missing-field reasons and no backlog mutation.
3. `RESEARCH-DISPOSITION-QUEUE-001` — research cards become proposed-only promote/keep/future/kill-review rows without lane moves, deletes, or closes.
4. `BUILDER-LESSON-LINKER-001` — builder implementation lessons map to existing cards through Research Inbox enrichment proposals before any new-card suggestion.
5. `PUBLIC-YOUTUBE-PREFLIGHT-001` — public YouTube Build Intel candidates are separated from paid/auth blockers and validated against the multimodal contract without crawling, transcripts, screenshots, atoms, or paid auth.

Stop at sprint review. Good next options are applying selected Internal Scoper enrichments, starting Build Intel Extraction Implementation with public YouTube first, or Runtime + Extraction Hardening before paid-source auth.

Build Intel Extraction Implementation is complete under `build-intel-extraction-implementation-v1`:

1. `YOUTUBE-SCOUT-001` — no-auth V1 now consumes existing public YouTube transcript artifacts from the shared archive as Build Intel input; it does not discover latest uploads or connect paid sources.
2. `PUBLIC-YOUTUBE-BUILD-INTEL-001` — transcript artifact selection now filters for AIOS/build-intel signal and keeps unrelated public video transcripts skipped with reasons.
3. `BUILD-INTEL-OBSERVATION-EXTRACTOR-001` — transcript-derived implementation observations now validate through the multimodal contract while honestly marking screenshots/OCR/keyframes as not captured in this V1.
4. `BUILD-INTEL-RESEARCH-INBOX-PROPOSALS-001` — extracted lessons now route to proposal-only Research Inbox rows with `writesBacklog=false` and `autoCreateBacklogCard=false`.
5. `BUILD-INTEL-BRIEF-001` — the first Build Intel extraction brief is generated at `docs/handoffs/2026-05-13-build-intel-extraction-implementation.md` and exposed through `/api/foundation/build-intel-extraction`.

Stop at sprint review. Good next options are current public-video discovery after creator channel URLs are confirmed, Steve-present paid-source auth preflight for Skool/myICOR, or screenshot/OCR/keyframe upgrade under the multimodal contract.

GStack Build Intel Extraction is complete under `gstack-build-intel-extraction-v1`:

1. `PUBLIC-DEV-COMMUNITY-WATCHLIST-001` — public GitHub, Codex Community, Claude Code Community, OpenClaw, and adjacent public AI coding sources are defined as Build Intel sources with proposal-only output.
2. `GSTACK-EXTRACTION-001` — the public `garrytan/gstack` local mirror is extracted into a path-cited source map and pattern scorecard from commit `dc6252d1df7f1f650ea6e9b2bba7d08fab5de902`.
3. `BUILD-INTEL-GITHUB-MONITOR-001` — public GitHub/community monitoring is defined as manual-first and proposal-only through `SRC-GITHUB-BUILD-INTEL-001`.
4. `SKILL-IMPROVER-GSTACK-ENRICHMENT-001` — skill discipline lessons route to proposal-only Skill Improver enrichment while preserving the default-to-code boundary.
5. `REVIEW-GATE-UPGRADE-001` — review-gate lessons route to deterministic checklist/proof-path proposals before any reviewer-agent idea.
6. `BROWSER-QA-PROOF-001` — browser QA proof expectations are defined for future UI/dashboard work and explicitly not required for backend-only cards.

Stop at sprint review. Good next options are public GitHub monitor implementation, frontend design pipeline, context save/restore, or eval harness. Do not install GStack, copy runtime code, scrape private communities, use paid auth, create autonomous dev, or mutate backlog from extracted findings.

Recently closed sprint truth that this sprint depends on:

- Foundation Source Once-Over is closed for v1 through `foundation-ui-complete-v1`. Closed sequence: `SOURCE-MATURITY-GRID-001` / `source-maturity-grid-v1`, `SOURCE-EXTRACTION-COVERAGE-001` / `source-extraction-coverage-v1`, `SOURCE-COVERAGE-CLOSEOUT-001` / `source-coverage-closeout-v1`, `MARKETING-SOURCE-MAP-001` / `marketing-source-map-v1`, `BRAND-STACK-001` / `brand-stack-v1`, `TIER-BEHAVIORAL-COMPLETION-001` / `tier-behavioral-completion-v1`, `VERIFICATION-RUNS-001` / `verification-runs-v1`, `PER-USER-CHANGELOG-001` / `per-user-changelog-v1`, `DECISION-RESTRICTED-QUEUE-001` / `decision-restricted-queue-v1`, and `FOUNDATION-UI-COMPLETE-001` / `foundation-ui-complete-v1`.
- Connector/Routing Truth is closed under `connector-routing-truth-v1`: atom promotion was restored, sprint DB drift was reconciled, Plan Critic logging landed, and connector/routing matrices became visible.
- Process Repair is closed under `connector-routing-process-repair-v1`, `verifier-sprint-independence-v1`, `verifier-modular-split-v1`, and `process-root-vs-patch-v1`: skipped doctrine was repaired as after-action truth, verifier checks were made sprint-independent, the first verifier module boundary was split, and Plan Critic now rejects symptom patches without root-invariant proof.

Queued, not pulled into this sprint:

- `ATOM-FLOW-AUTO-DEMOTION-001` — auto-demote maturity claims when atom flow stalls.
- `EXTRACT-RUN-HARDENING-EXECUTION-001` — run retry/backoff execution instead of leaving retry policy on paper.
- `RESEARCH-LANE-PURGE-001` — generate a human-confirmable report for parked research cards.

Stop at sprint review. Do not silently roll into Reply/Watching Loop or another product sprint when these six cards close.

Not next: Reply/Watching Loop, Strategy Hub UI expansion, Mycro/Skool/Loom/Zoom/Real/SocialPilot extraction, Telegram/mobile assistants, Department Directors/Master Director, marketing production, Brand Guardian enforcement, new hubs, Drive permission mutation, request-access emails, or historical Meeting Vault cleanup. Do not run MEETING-VAULT-ACL-001 Phase B, mutate Drive permissions, or send request-access emails from this sprint.

## Current Reality

Built and useful now:

- Foundation source/contracts layer.
- Foundation verifier.
- Strategy, decision, backlog, open-question, and change-event database surfaces.
- Source-backed dashboard/Foundation UI.
- Foundation Systems page: 14 major operating systems mapped with purpose, maturity level, source contracts, connectors, runtime jobs, source notes, backlog cards, and next-level plan.
- Google delegated read path for Workspace sources.
- Gmail, Calendar, Missive, Slack, meeting notes, and meeting transcript reads.
- Shared-communications archive in Postgres.
- Candidate extraction lanes for meetings, Gmail, Missive, Slack, and recovered Zoom material.
- Historical meeting context reaching back to October 2024 where recovered/transcribed.
- Persisted synthesis runs/items in Postgres.
- Memory/retrieval/synthesis spine through governed synthesis: intelligence job runs, old-system salvage contract, report artifacts, atoms, atom hits, lexical chunks/search, pgvector semantic search, hybrid evidence retrieval, source-backed facts, and governed synthesized items with fact/evidence/chunk provenance.
- First Foundation job registry and DB-backed job run ledger, with active-process/liveness visibility, owned stop decisions, confirmation-gated decommission controls, and cost/process risk rollup under `system-010-ghost-closeout-v1`.
- Current Sprint execution-control overlay under `foundation-sprint-system-v1`: live-backlog-backed sprint goal, active blocker, ordered cards, stages, Sprint Ready existing-work/doctrine check, returned reason, proof commands, readiness blocker, and not-next boundaries at the top of Recent Work.
- Per-user changelog under `per-user-changelog-v1`: existing `change_events` are grouped by known users, agents, system actors, and unknown actors with write/approval/apply/system counts; metadata values stay private and viewed/ignored/received remain explicit missing coverage.
- Restricted decision queue under `decision-restricted-queue-v1`: decisions matching termination, compensation, performance concern, personnel/HR, or legal/compliance rules route to owner-only Foundation review and are filtered out of general Strategy/extraction decision contexts.
- First Foundation worker slice: scheduled/manual job metadata, due/next-run status, one-pass worker, deal-review jobs proven through the worker, and LaunchAgent supervision live.
- Policy-aware LLM router: credential/route/probe/call tables, executable OpenClaw/Codex subscription adapter, auth-path audit job, call ledger, route status visibility, and shared intelligence extraction/synthesis migrated behind the router.
- Extraction control MVP: source crawl target/item tables, seeded current-day/backfill/corpus/recovery lanes, item-level crawl reporting, scheduled current-day lanes for Gmail/Missive/meetings/Slack, daily shared-comms extraction missions, daily Drive inventory/content missions, daily Gmail attachment extraction, and daily YouTube subtitle transcript extraction from the video manifest.
- Drive content extraction first slices: Google Docs, Google Sheets, PDFs, markdown, and plain-text files are archived as source-backed artifacts with explicit skip reasons for unsupported file types.
- Gmail attachment extraction first slice: Gmail PDF/text attachments are archived; images/media/Office/OCR classes are skipped into explicit future lanes.
- Video transcript extraction first slice: YouTube subtitles are extracted through DataForSEO from the shared video-link manifest; no-subtitle/visual-review work routes to the multimodal lane.
- KPI/Supabase read rules are closed for `SOURCE-010`; `KPI-HEALTH-001` v1 now probes load-bearing KPI tables/RPCs, freshness windows, and Lee repo/Supabase schema drift.
- Row-scoped Owners / deal-review runners.
- Owners Dashboard imported `Lists` repair: governed FUB lead sources now live in upstream `SRC-OWNERS-LISTS-001`, Admin `N` and `P` reuse the same source list, Admin `S` uses imported active agents, and Google delegated writes are blocked from the imported mirror range.
- Owners/FUB v1 parity rules: Admin column `BZ` joins to FUB person records, governed FUB source rules drive company/agent expectations, and Admin review flags invalid source, source-lineage, stale-stage, and ISA mismatch issues.
- Google Drive corpus root list captured in `docs/source-notes/google-drive-corpus.md`.
- Skool corpus access and policy boundary captured in `docs/source-notes/skool-corpus.md`.
- Marketing source evidence from the old system and current connector checks.
- Doc cleanup plan and generated doc indexes.
- Ops Hub v1 as its own hub surface for systems serving Ops, starting with Admin, Conditional, FUB drift, and Agent Roster inspections. Scheduled jobs now run marked re-reviews first, then pace Admin first-pass backlog at 5 newest eligible June 2025+ deals per day, writing AI status/action/findings only. Foundation remains the control plane; Ops owns the human cockpit.
- Source maturity grid v1 under `source-maturity-grid-v1`: every source contract is now scored across connected, trusted, monitored, extracted, atomized, synthesized, and routed stages, with first gaps and top gaps rendered from live Foundation state.
- Source coverage closeout v1 under `source-coverage-closeout-v1`: source maturity and extraction coverage gaps are now routed into covered/deferred/not-required decisions or explicit `SOURCE-EXTRACTION-GAP-FOLLOWUP-001` / `SOURCE-MATURITY-GAP-FOLLOWUP-001` queues.
- Marketing source map v1 under `marketing-source-map-v1`: imported avatars and registered marketing source contracts are mapped to brand lanes so future Strategy/Marketing work does not blend Benson Crew, Zahnd Team Ag, Steve Zahnd, MarketMasters, and Unchained.
- Brand stack v1 under `brand-stack-v1`: the five brand entities now carry source/avatar links plus audience, offer, tone, approval, and Brand Guardian boundary rules; Brand Guardian enforcement and marketing production remain unbuilt.
- Tier behavior completion v1 under `tier-behavioral-completion-v1`: fourteen first-read surfaces now have explicit behavior decisions; Ops/Sales reads are role-filtered, and Foundation/source/brand/shared-comms/Strategy/evidence reads remain owner-only until separate filtered-access cards exist.
- Verification runs v1 under `verification-runs-v1`: stale research cards, synthesized findings, pending/approved action routes, and backlog hygiene findings are visible as proposed-only review candidates; auto-expiry and writeback remain separate future work.

Still not done:

- durable source cursors, target-run IDs, and backfill leases beyond the current-day target proof
- router-ledged transcription workload and enforced model-route budgets/caps beyond the direct-host verifier
- failed-item retry policy for Drive/video/non-meeting crawl records beyond the first meeting retry path
- proof that partial-run job failure/alert semantics work on a real failed meeting/Drive item
- operator UI/verifier hardening for job/target schedule truth now that Foundation jobs own scheduled crawl lanes
- Claude Code / Claude Agent SDK subscription adapter under the BCrew router
- hub-dedicated model capacity allocation beyond the first Foundation subscription path
- source-budget and failure visibility beyond the current runtime/process rollup
- raw meeting-note Drive/vault ACL enforcement
- real-data filtered shared-comms summaries for approved non-Tier-1 users
- public edge auth/tunnel hardening before broader external exposure
- provider-side rotation/retirement proof for exposed credentials
- auto-restart-on-push proof beyond the current manual-restart status
- scheduled broad corpus promotion beyond the current proof/mission lanes
- broader KPI / finance / FUB fact expansion inside synthesis
- Action Router closure proof: synthesized items now create human-approval-required routes into decisions, backlog tasks, open questions, ignore/snooze, and owner-bound action lanes with source back-links. One route has been approved/applied into live backlog item `ACTION-001`; pending queue size is no longer a verifier dependency.
- source-backed Strategy Hub
- Harlan/Crewbert useful runtime
- Drive Slides/Office/shortcut/vision-grade OCR/media extractors and Skool/Loom/Drive-video crawler workers
- clean marketing account/property map by lane
- hub consumer map for mined corpus value: strategy, ops, sales, marketing, recruiting, agent coaching, Steve personal brand, MarketMasters, and Steve-owned education/monetization

## Definition Of Done

A feature is not done because a script exists.

A feature is done only when it is:

- registered in Foundation runtime/job status
- scheduled or explicitly marked manual-only
- supervised by worker/scheduler or clearly manual-only
- visible in Foundation status
- assigned an owner/system lane
- protected by enforced budget, pause, and retry rules where relevant; if budget is only descriptive, the field must say so
- recording last run, next run, and failure state
- surfacing failures in the dashboard
- verified by `npm run foundation:verify` or a specific proof command

If Steve or a builder has to remember to run it from a terminal, it is still a prototype.

## Phase Gates And Backlog Traceability

This section is not a second backlog.

Priority resolves in this order:

1. Foundation Overview gives the command order for what to work on next.
2. The live Backlog owns task status, priority, lane, owner, and next action.
3. This Rebuild Plan explains doctrine, phase gates, and the definition of done.

If these disagree, fix the live Backlog and the active docs together instead of letting two work queues compete.
If a builder chat drifts into lower-priority work, the assistant should name the drift, route the idea to backlog, or ask Steve to explicitly override the current command order.
All implementation work must be backlog-pulled. Evidence chooses which formal card to pull next; it does not justify chat-only work.
Before code, each slice needs a card ID, scope, implementation plan, acceptance criteria, verifier plan, closeout plan, and risk notes reviewed to the 9.8/10 quality bar.

### 2026-05-02 Missing-Card Capture

After the SECURITY-002 closeout, Steve asked for a full sweep of specs, audits, handoffs, source notes, memory, and backlog state to catch work that had been discussed but never promoted into real backlog cards. The sweep found more than the meeting-note issue. The following work is now captured in backlog truth and must be planned before implementation:

- `MEETING-VAULT-ACL-001` — raw Google Drive meeting-note ACL enforcement. SECURITY-002 does not remove Drive access from original files.
- `SECURITY-FILTERED-COMMS-ACCESS-001` — real-data filtered shared-comms/intelligence summaries for approved non-Tier-1 users.
- `SECURITY-EDGE-001` — public edge auth/tunnel hardening before broader external exposure.
- `SECURITY-PROVIDER-ROTATION-PROOF-001` — provider-side proof for exposed or retired credentials.
- `DRIVE-ACCESS-REQUEST-001` — done under `drive-access-request-v1`; delegated Drive dry-run/preflight now proves actor shape, metadata-only permission inventory, missing-access/owner-ambiguity/request-access-needed classification, and dry-run ledgering without emails or permission mutations.
- `FOUNDATION-SPRINT-SYSTEM-001` — done under `foundation-sprint-system-v1`; Current Sprint is now an overlay on live Backlog, not a second backlog. `FOUNDATION-SURFACE-UPDATES-001` stays broader UI polish, `FOUNDATION-DONE-VELOCITY-001` stays the honest velocity follow-up, and `MEETING-VAULT-ACL-001` remains scoped/blocking. Latest sensitivity-aware Phase A addendum: `docs/process/meeting-vault-acl-001-sensitivity-aware-phase-a.md`; dry-run hash `31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d`; no Phase B mutation approval exists.
- `FOUNDATION-DONE-TEST-001` — explicit Foundation readiness exit gate. Done for the gate implementation under `foundation-done-test-v1`; the current gate may still report `not_ready` while blocker cards remain open, and it does not make the blocker cards pass.
- `SYSTEM-010-GHOST-CLOSEOUT-001` — done for the runtime/process-control readiness blocker under `system-010-ghost-closeout-v1`; active-process, liveness, stop/decommission, restart-status, and cost/process risk are visible and fail closed.
- `SOURCE-LIFECYCLE-COMPLETION-001` — done for the source lifecycle completion/revalidation blocker under `source-lifecycle-completion-v1`; all 36 current source contracts now have terminal states, load-bearing sources are complete/read-only/current-reality for current scope, the public GitHub Build Intel source is read-only/non-readiness-bearing, and future/gap sources are accepted-blocked with owner, reason, next action, and blocker card.
- `EXTRACT-RUN-HARDENING-001` — done under `extract-run-hardening-v1`; existing extraction lanes now have central retry/backoff policy, queryable item retry state, crawlRunId attempt ledgering, stale item-lease reaping, partial/failed next-safe-command visibility, and bounded-backfill proof.
- `SYNTHESIS-VERIFY-001` — done under `synthesis-verify-v1`; synthesized claims now require source-evidence verification before Strategy/scout/researcher/advisor consumption.
- `MEETING-FORWARD-TRANSCRIPT-ENFORCEMENT-001` — future meeting transcript capture and gap handling.
- `PROCESS-ACK-STATES-001` — governed acknowledged-state handling for accepted gaps and intentional pauses.
- `VERIFIER-INCREMENTAL-COVERAGE-001` — incremental/card-scoped verifier path.

Disposition notes:

- `FOUNDATION-SURFACE-UPDATES-001` and `RUNTIME-HEALTH-SIMPLIFY-001` already cover the Foundation command-center/UI clarity work; do not create a duplicate command-center card unless Steve explicitly wants a separate build.
- Existing source cards still own source-specific work where they are already precise enough. The new cards above exist only where audits found missing ownership or an umbrella that could hide a Foundation gate.
- These cards are captured so the sprint does not skip them. Capture is not approval to build them out of order. `FOUNDATION-DONE-TEST-001` is implemented as the readiness detector, `SYSTEM-010-GHOST-CLOSEOUT-001` closes its runtime/process-control leg, `SOURCE-LIFECYCLE-COMPLETION-001` closes its source completion/revalidation leg, `SYNTHESIS-VERIFY-001` closes its synthesized-claim verification leg, `EXTRACT-RUN-HARDENING-001` closes its extraction retry/ledger/backfill leg, and `DRIVE-ACCESS-REQUEST-001` closes delegated Drive preflight only. `MEETING-VAULT-ACL-001` still does not pass unless Phase A proves every file safe or separately approved Phase B repairs and rechecks Drive permissions.

### Operator Surface Standard

Foundation is the CEO dashboard for system-building. It must answer in plain English:

- what the system can do now
- how healthy the system and code are
- what shipped recently
- what needs attention next

Every operator-facing page, build description, status label, and agent handoff should use plain English first. If a technical term is necessary, such as a commit hash, table name, file path, API route, or source ID, put the plain-English meaning next to it.

The daily Foundation nav target is:

1. Overview
2. Systems
3. Backlog
4. Recent Work

The Overview should act like a scrum-master / CEO dashboard for the Foundation build: active command order, system grade, recent shipped work, done velocity, and the next decision. Done sections should show when work moved to done and sort newest done to oldest done. Recent Builds / Recent Work should default collapsed and show where each change lives in the app or docs. Current Sprint is now owned by `FOUNDATION-SPRINT-SYSTEM-001` as an execution-control overlay; broader surface cleanup remains under `FOUNDATION-SURFACE-UPDATES-001`, and done velocity remains under `FOUNDATION-DONE-VELOCITY-001`.

The old Foundation Overview grouping that reads like `Phase 1 · Truth Cleanup` must not compete with this Rebuild Plan's phase numbers. Either reconcile the UI to the plan's phase numbering or replace those groups with the current command-order view: keep maps/build log current -> monitor extraction -> harden corpus -> source health/freshness -> close action loop.

### Immediate Foundation Closeout Checklist

This checklist is the current phase-gate trace after the 2026-04-26 systems/source review. Treat it as a map to live backlog cards, not a standalone work queue.

0. `BACKLOG-HYGIENE-PASS-001` -> `BACKLOG-HYGIENE-001` -> `DEV-PROCESS-AUDIT-001` -> `PROCESS-HOOKS-001` — Restore backlog-pulled dev discipline before more product UI.
   - `BACKLOG-HYGIENE-PASS-001` is the one-time cleanup that moved stale/unclear cards out of executing or split their proof from remaining work.
   - `BACKLOG-HYGIENE-001` is done for v1: `npm run backlog:hygiene`, `/api/foundation-hub > backlogHygiene`, Runtime Health > Backlog Hygiene, synthetic stale-card proof, and verifier coverage are live.
   - `DEV-PROCESS-AUDIT-001` is done for v1: `docs/audits/2026-04-28-dev-process-audit.md` maps the 2026-04-28 failures to hook/verifier/backlog/UX owners and gives `PROCESS-HOOKS-001` 10 concrete v1 requirements.
   - `PROCESS-HOOKS-001` is done for v1: `npm run process:ship-check` requires a live backlog card, approval evidence file, score >= 9.8, seven-field closeout, where-it-lives metadata, served-code proof, and default `foundation:verify` unless a skip reason is explicit.

1. `SECURITY-003` — Close direct LLM/transcription spend bypasses.
   - `scripts/transcribe-zoom-audio-archive.mjs` is paused/fail-closed for non-dry-run use.
   - Verifier coverage now checks direct model/transcription host calls outside approved router/adapters, not only OpenAI Responses.
   - Later: rebuild transcription as a router-ledged transcription workload before reopening Zoom audio recovery.
   - Keep sanctioned auth probes explicit.
2. `SECURITY-004` / `SECURITY-002` — Gate broad read APIs before any broader dashboard, hub, assistant, or user-facing access.
   - `SECURITY-002` is done for v1 under `security-002-auth-tier-redaction-v1`: central request access context, route posture registry, `assertTier`/`assertRole`, server-derived intelligence evidence tier, stable redacted response helpers, subject_people/sensitivity/min_tier filtering proof, and Tier 1-only fail-closed posture for unproven shared-comms/intelligence access.
   - Interim admin gating remains for legacy broad read surfaces, but it now runs behind central route posture instead of scattered route allowlists.
   - `MEETING-VAULT-ACL-001` owns raw Google Drive meeting-note ACL enforcement. Do not treat SECURITY-002 as removing access from original Drive files.
   - `DRIVE-ACCESS-REQUEST-001` is done under `drive-access-request-v1` for dry-run/preflight only. It classifies missing access and owner ambiguity without sending emails or mutating Drive permissions.
   - `SECURITY-FILTERED-COMMS-ACCESS-001` owns non-Tier-1 filtered summary access on real shared-comms data.
   - `SECURITY-EDGE-001` owns public edge auth/tunnel hardening before broader external exposure.
   - `SECURITY-PROVIDER-ROTATION-PROOF-001` owns provider-side credential rotation/retirement proof.
   - `FOUNDATION-USERS-001` is the smaller P1 follow-up for owner-only user administration from Foundation: list users, add email/name/role, disable users, audit changes, avoid password exposure, and prove non-owners cannot manage access. Do not build it inside extraction-control schedule reconciliation.
   - `FOUNDATION-SURFACE-UPDATES-001` is the P1 follow-up for Foundation operator clarity: plain-English status/copy, Overview -> Systems -> Backlog -> Recent Work nav order, collapsed Recent Builds / Recent Work with app/doc breadcrumbs, done-velocity visibility, and plan/backlog grouping convergence. Do not build it inside hygiene/process slices unless Steve explicitly switches scope.
3. `SYSTEM-010` — Keep runtime/process-control hardening honest.
   - Keep dashboard and worker LaunchAgent plists in repo.
   - Served-code-equals-HEAD check is live: the dashboard captures its server-start commit and `foundation:verify` fails with a restart command if the served commit does not match repo HEAD.
   - Add auto-restart-on-push next so the dashboard updates itself after verified commits instead of only failing loudly.
   - Router fallback is manual-explicit, not automatic; keep code/docs/UI from implying automatic paid fallback.
   - Enforce job-level budget tags or rename them as descriptive tags.
   - Bound large Foundation snapshot reads with limits or paging.
   - `SYSTEM-010-GHOST-CLOSEOUT-001` is done under `system-010-ghost-closeout-v1`: active-process view, dead-man/liveness rollup, owned stop decisions, confirmation-gated decommission, and cost/process visibility are live.
   - Keep auto-restart-on-push honest: current status is manual unless a later push-hook/WatchPaths proof closes it.
4. `EXTRACTION-TEAM-001` / `DRIVE-CONTENT-001` / `EMAIL-ATTACHMENTS-001` / `MEETING-VIDEO-001` — Finish controlled miner/corpus lanes.
   - Build paced miner v1: one-at-a-time, cursors, leases, retry/backoff, spacing, per-source timeouts.
   - Keep daily Drive Docs/Sheets/PDF/text/markdown, scanned-PDF OCR fallback, Gmail PDF/text attachment, and YouTube subtitle transcript missions stable.
   - Add Missive attachments, Drive Slides/Office/shortcuts/vision-grade OCR, meeting-linked Drive/Zoom/Loom video priority, and richer multimodal/GOD-mode extraction as separate ledged slices.
   - Extend failed-item retry/reporting beyond meetings into Drive/video/non-meeting crawl records.
   - Keep Skool/Loom/Mycro extraction governed by authorized access, use rights, cost/route ledgering, quotas, and stop controls.
   - `EXTRACT-RUN-HARDENING-001` is done under `extract-run-hardening-v1`; do not reopen it for new lanes or scope expansion.
5. `INTEL-JOBS-001` -> `REPORT-MINING-001` -> `INTEL-ATOM-001` -> `RETRIEVAL-001` through `SYNTHESIS-ENGINE-001` — Build the memory/retrieval/synthesis spine.
   - Add a run/cost/cursor ledger for ingestion, extraction, chunking, embedding, synthesis, video analysis, and brief generation.
   - `INTEL-JOBS-001`, `REPORT-MINING-001`, `INTEL-ATOM-001` done as the v1 report/atom substrate, `RETRIEVAL-001`, `RETRIEVAL-002`, `RETRIEVAL-003`, `SYNTHESIS-FACTS-001`, `SYNTHESIS-ENGINE-001`, and `ACTION-ROUTER-001` are now done/hardened enough for Strategy Hub v2 to consume routed proof.
   - Use `intelligence_report_artifacts`, `intelligence_atoms`, `intelligence_atom_hits`, `intelligence_retrieval_chunks`, `intelligence_synthesis_facts`, and `intelligence_synthesized_items` as the governed report/atom/retrieval/fact/synthesis substrate before scaling video/web/Skool extraction.
   - Build Strategy Hub v2 next from deterministic source-to-gap snapshots and routed action records, not the old advisor/recommendation surface. Run `npm run intelligence:retrieval-eval` before major retrieval/synthesis changes.
   - Keep Graphiti/Zep deferred until Postgres memory proves itself.
6. `SOURCE-008` / `DATA-005` — Close FUB Level 2 taxonomy and Owners/FUB lineage.
   - Refresh stale FUB source snapshot.
   - Sign off trusted FUB source taxonomy baseline and new-source review rules.
   - Lock Owners dropdown/list parity against FUB lineage.
7. `DATA-007` through `DATA-009` — Parked Ops/deal-validation cleanup, not Foundation source blockers.
   - Invalid lead-source row backfill, missing FUB link backfill, and suspicious duplicate full-credit row resolution now route through Ops/source-quality cleanup unless new evidence proves a v1 rule is wrong.
8. `KPI-HEALTH-001` — Done for v1 after `SOURCE-010`.
   - `SOURCE-010` is closed for first-pass read rules. KPI health now has a read-only probe, Data Sources surface, Runtime Health warning hook, Lee repo/Supabase schema drift checklist, and verifier coverage.
9. `SYNTHESIS-ENGINE-001` / `SYNTHESIS-FACTS-001` / `ACTION-ROUTER-001` — Close the intelligence loop.
   - Governed synthesis now persists owner-suggested synthesized items from source-backed facts and hybrid evidence.
   - Source-backed strategy/source-contract, goal, operating, KPI, source-health, and retrieved-evidence grounding is now persisted in `intelligence_synthesis_facts`.
   - Action Router v1 now proposes governed routes into decisions, backlog tasks, questions, ignore/snooze, or owner-bound action lanes with back-links and human approval required before destination writes.
   - `ACTION-REVIEW-APPLY-001` is done for v1: Foundation > Backlog > Action Review makes pending and approved routes visible, supports approve/reject/apply, requires reject reasons, and shows destination-record proof after apply. Do not reopen broad `ACTION-ROUTER-001` for this.

10. `RESEARCH-INBOX-001` — Done for v1 as the proposal-only Build Intel inbox gate.
   - This captures Steve's outside ideas, YouTube/Mycro/myICOR/course/article inputs, and AI-system-building patterns before they become committed backlog. Workflow: capture -> plain-English triage -> propose backlog/enrichment or archive with reason.
   - It is not an autonomous backlog mutator; Build Scoper and extraction workers must propose to Research Inbox first, then Steve+Codex approve.

11. `RUNTIME-HEALTH-SIMPLIFY-001` — Park Runtime Health simplification.
   - Runtime Health is powerful but dense. Later work should add a plain-English top layer and collapsed diagnostic groups without removing the underlying detail.
   - Not next.

### Hard Checkpoint — 2026-04-28 Foundation Return

The Apr 27-28 Strategy push was useful because it proved the source -> atom -> retrieval -> facts -> synthesis -> route spine and exposed the next Strategic Intelligence requirements. It also proved the danger of climbing too high before Foundation can explain and police what was built.

Current call:

- pause Strategy Hub UI polish
- do not build the Scoper yet
- do not start Agent Factory / Health Auditor / cleanup agents
- stop and re-plan with Steve after the first Action Review slice

Order now:

1. `SYSTEM-STRATEGY-REVIEW-001` — done / P1.
   - Apr 26-28 builder/reviewer lessons were promoted into system strategy, current plan/state, and backlog cards.
   - The handoff evidence is `docs/handoffs/2026-04-28-foundation-hard-checkpoint.md`.
2. `FOUNDATION-SWEEP-001` — done / P0.
   - V1 maps every Foundation nav page to backing APIs/docs/tables/source IDs/backlog owners.
   - Runtime Health now surfaces stale source-crawl target runs.
   - The stale Slack proof run `crawl-slack-current-day-20260427145904292-3f93bebd` was caught and marked failed by the stale source-crawl run reaper.
   - `foundation:verify` now guards the surface map, stale-run payload, and no-stale-active-run state.
3. `FOUNDATION-CHANGELOG-002` — done / P0.
   - Recent Builds v2 merges git history with repo-truth closeout records for major Foundation builds.
   - The page now groups builds by day and system area, links related backlog cards, shows proof commands/status, explains where the work lives, and names what Steve should review next.
   - `foundation:verify` guards the v2 closeout schema and the visible closeout proof for `FOUNDATION-SWEEP-001` and `FOUNDATION-CHANGELOG-002`.
4. `EXTRACT-CONTROL-001` / `EXTRACT-METRICS-001` — done for v1 / P0 + P1.
   - Runtime Health now exposes Extraction Control: Coverage By Target.
   - The coverage panel shows last success, last failure, next bite, item totals, succeeded/skipped/failed counts, top failed/skipped reasons, and remaining backlog indicators where lanes already expose them.
   - `EXTRACT-CONTROL-001` v1 is closed; failed-item retry/backoff remains in `EXTRACT-RETRY-001`, and surface breadcrumb/update polish remains in `FOUNDATION-SURFACE-UPDATES-001`.
5. `ACTION-REVIEW-APPLY-001` — done for v1 / P0.
   - Foundation > Backlog > Action Review is the first human action-loop surface.
   - Pending routes can be approved or rejected with a required reason; approved routes can be applied; applied routes show destination-record proof.
   - Next is not automatic. Stop and re-plan with Steve before un-pausing Scoper, dev intelligence, agent-managed backlog, Strategy UI, or another Foundation slice.
   - runtime/source freshness
   - extraction/corpus hardening
   - closed-loop action/resolution feedback
   - privacy/tier/process controls
6. Resume Strategic Intelligence only after the Foundation checkpoint work is stable.

### Closed Sprint — Behavior Proof And First Operator Loop

The 2026-05-12 multi-auditor review changed the next sprint order.

Foundation now reports READY, but the meaning is narrow: owner-only Strategy re-entry may resume. It does not mean old-system parity, broad team access, public exposure, or full hub rebuild coverage.

Consensus risk:

- the substrate is real
- too much proof is process/doc/verifier-marker proof
- too little proof is product behavior
- verification has been all-or-nothing instead of proportional to blast radius
- old-system rebuild targets are still too easy to lose in research or chat

Closed sprint goal:

`Make Foundation verification proportional, then convert Foundation READY from process proof into behavior proof and ship one owner-only Strategy operator loop.`

Order:

1. `VERIFY-GATE-TIERING-001` — done this sprint / P0.
   - Add proportional verification tiers so small Foundation/doc/current-sprint/process changes use focused automatic proof instead of the full ship gate every time.
   - Full-risk paths still require `process:foundation-ship` or an explicit card/reason bypass.
2. `REBUILD-PLAN-RECONCILE-001` — done this sprint / P0 under `rebuild-plan-reconcile-v1`.
   - Align current plan, current state, Current Sprint, live backlog, readiness wording, and old-system capability coverage.
   - Meeting Vault historical cleanup stays a later legacy-exception sprint.
   - Foundation READY must be worded as owner-only Strategy re-entry, not old-system parity.
3. `PLAN-CRITIC-REPLACEMENT-001` — done this sprint / P0 under `plan-critic-replacement-v1`.
   - Rebuilds the old Plan Critic pressure before the verifier behavior cleanup can close.
   - Adds the gate decision tree and a 10-point scoring schema that rejects weak plans, substring-only proof, missing rollback/repair path, and missing not-next boundaries.
   - This is a thin pre-build gate, not Agent Factory or a generic reviewer persona.
4. `SECURITY-BEHAVIOR-PROOF-001` — done this sprint / P0 under `security-behavior-proof-v1`.
   - Proves route-boundary behavior for owner, ops, sales, unknown user, admin-token/system, anonymous public, default fail-closed, shared-comms owner-only, Strategy owner-only, and subject-person leak cases.
   - `assertTier` is wired through route authorization; this closeout proves behavior through actual function paths without opening non-Tier-1 shared-comms access.
5. `VERIFIER-BEHAVIOR-SWEEP-001` — done this sprint / P0 under `verifier-behavior-sweep-v1`.
   - Added the top-P0 behavior registry and focused proof for 12 high-risk closeouts.
   - The proof calls actual function/synthetic/focused process paths for security, readiness, runtime, Meeting Vault, Drive preflight, synthesis, extraction, source lifecycle, Plan Critic, proportional verification, and Current Sprint command truth.
6. `STRATEGY-HUB-MEETING-READY-001` — done this sprint / P1 under `strategy-hub-meeting-ready-v1`.
   - Built one owner-only Strategy meeting packet that consumes source-backed facts, retrieval status, and Strategy-qualified Action Router records.
   - This is the first product proof that Foundation can support an operator, not just pass its own gates.
7. `AVATAR-IMPORT-001` — done this sprint / P1 under `avatar-import-v1`.
   - Imported the old 10 RETAIN and 5 ATTRACT avatars into governed new-system truth.
   - The registry preserves stable avatar IDs, trigger language, pains, source-backed platform behavior, objections, and buying signals without restarting Marketing production.
8. `AUTO-DEPLOY-ROLLBACK-001` — done this sprint / P1 / active blocker pinned for sprint closeout under `auto-deploy-rollback-v1`.
   - Added a guarded Mac mini deploy runner: dry-run by default, explicit apply mode, fast-forward pull, dashboard/worker restart, served-commit health check, and rollback to the previous SHA on failed health.
   - This is reliability carry-forward, not broad deployment redesign or a permanent periodic auto-pull LaunchAgent install.

Old-system parity cards preserved from that sprint:

- `CURRENT-SPRINT-DYNAMIC-TRUTH-001` was pulled into the Control Plane + Connector Readiness sprint and is done under `current-sprint-dynamic-truth-v1`.
- `REPLY-WATCHING-LOOP-001`, `MARKETING-PIPELINE-REBUILD-001`, `TELEGRAM-BOTS-REBUILD-001`, and `INTEL-DIRECTORS-REBUILD-001` remain carded so old-system value is visible, but they are not automatically active while the control-plane sprint is open. `VERIFICATION-RUNS-001`, `PER-USER-CHANGELOG-001`, `DECISION-RESTRICTED-QUEUE-001`, and `BRAND-STACK-001` are done for v1.

Current Sprint rollover rule:

- A new sprint starts clean with only the active sprint backlog cards.
- `Done This Sprint` is only for cards completed inside the active sprint. When the sprint closes, those cards remain in Backlog `done` and Recent Work, then leave the next sprint overlay.
- `Returned` is only for cards returned inside the active sprint. At sprint rollover, returned cards leave the overlay and stay in the main backlog with their returned/blocker context.

### Parked Next Leg — Strategic Intelligence Operating Loop

This is the active next-leg plan after the 2026-04-28 Strategy Hub route review. The goal is not a one-time quarterly planning dashboard. The goal is a continuously useful Strategic Intelligence loop that mines company signals, surfaces needle-moving issues, scopes what is already answered versus truly missing, and helps the ownership team move those issues to resolution.

This leg remains correct, but it is not the next build until Foundation visibility catches up.

Order:

1. `STRATEGY-HUB-MEETING-READY-001` — done for v1 under `strategy-hub-meeting-ready-v1`.
   - V1 now ships the owner-only meeting packet, API field, overview preview, and focused behavior proof.
   - Next Strategy Intelligence work should wait until this packet is reviewed or used in practice.
   - Remaining future need: Scoper/issue-ledger workflow that turns meeting discussion into resolved Strategy work.
2. `STRATEGIC-INTEL-001` — scoped / P0.
   - Spec gate before more Strategic Intelligence code.
   - Must define the strategic issue data model, continuous mining cadence, urgency/impact/confidence/staleness fields, resolution feedback writes, old scout/director/scoper/sprint mapping, and 10x value metrics.
   - Depends on `STRATEGY-HUB-MEETING-READY-001`; blocks `INTEL-SCOPER-001`.
   - Initial 10x targets for the first pilot: >= 5 strategic issues surfaced/week, >= 3 scoped/week, >= 2 resolved-to-applied/week, and median manual investigation time <= 30 minutes per issue.
3. `INTEL-SCOPER-001` — scoped / P0.
   - Build the gap-resolving Scoper, not a generic research brief.
   - It must answer what is already verified, what is partial, what actually remains, who likely owns it, and the smallest useful next steps, with evidence pointers for every verified claim.
   - Depends on the approved `STRATEGIC-INTEL-001` issue-ledger/schema decision.
   - Hub UI must support `Scope this` and render the scoped result as verified / partial / remaining-gaps sections with evidence chips and next steps.
4. `INTEL-THREAD-CONTEXT-001` — scoped / P1.
   - Evidence proof must show reply count, participants, latest activity, weak-proof flags, and cross-source corroboration where available.
   - This prevents one-way or test-like emails from looking like confirmed strategic issues.
5. `STRATEGY-QUARTER-001` — scoped / P1.
   - Build the Strategy Quarter input/context layer: quarter theme, critical number, unresolved strategic issues, department targets, open decisions, weekly outputs, and meeting follow-through.
   - This gives Strategic Intelligence context; it is not the value layer by itself.
6. `MODEL-ROUTING-001` — scoped / P1.
   - Document model/runtime routing doctrine before Scoper and agent work expand.
   - Preserve the boundary: subscriptions are for humans/operator use when allowed and logged; system runtime uses official APIs and governed adapters by default.
   - Canonical destination is `docs/rebuild/current-runtime-map.md`.
7. `SYSTEM-STRATEGY-REVIEW-001` — done / P1.
   - Apr 26-28 builder/reviewer conversations were mined into repo truth/backlog/verifiers by the hard checkpoint.

Discipline rules for this leg:

- Memory is not backlog. If a conversation changes the build, it must land in repo truth or a DB-backed backlog card in the same session.
- Each card closes only on measurable acceptance criteria, proof, and a human-readable sample where applicable.
- Steve reads the Strategy/Scoper sample rows before closeout; verifier success alone is not enough.
- Do not start Agent Factory, System Health Auditor, cleanup agents, or department director agents until the existing deferral gate is met.
- Foundation remains the control plane. Hubs are consumers and work surfaces; if the system cannot explain its own changes and current plan, do not climb higher into hub UX.

### Phase 0 — Keep The Existing Proof Stable

Goal: do not break the working Foundation while we activate it.

Do now:

- keep `npm run foundation:verify` green
- keep shared-comms coverage working
- keep synthesis persisted
- keep Owners/deal-review queued and first-pass backlog runners usable
- keep source-backed spreadsheet mirrors guarded and covered by `npm run sheets:verify`
- keep docs indexed and active truth clear

Do not do now:

- giant new manual backfills
- broad feature expansion
- new agent swarm
- full router migration
- rewriting every script before the router probes pass

### Phase 1 — Runtime MVP

Goal: turn the best existing routines from builder-chat/manual scripts into supervised system work.

Build:

- runtime registry for Foundation services/jobs
- always-on worker/scheduler path
- supervisor config for web/API and worker process
- dashboard panel for active/scheduled/failed/manual jobs
- pause switches
- retry limits
- max runtime limits
- last run / next run / failure state

Activate only 3 to 5 jobs first:

- `foundation:verify`
- `shared-comms:coverage`
- deal-review queued/backlog runner
- synthesis as manual or scheduled with explicit route and budget visibility
- current-day sync lanes for Gmail, Missive, meetings, and Slack
- daily quota missions for shared-comms extraction, Drive content, Gmail attachments, and video transcript outputs

Backlog/cards:

- `RUNTIME-ACTIVATION-001`
- `RUNTIME-WORKER-001`
- `RUNTIME-SUPERVISOR-001`
- `RUNTIME-FIRST-JOBS-001`
- `SYSTEM-010`

Acceptance:

- Foundation UI can answer: what is running, what is scheduled, what is stale, what failed, and what is paused?
- Terminal windows are for debugging only, not production runtime.
- Worker survives terminal session end.
- Failed jobs become visible failures.

Current partial proof:

- `npm run foundation:worker -- --once --maxJobs=2` ran the two due deal-review jobs and recorded successful runs.
- `npm run foundation:job -- --snapshot` now exposes scheduled, due, and manual job counts plus next-run status.
- `ai.bcrew.foundation-worker` is loaded as a LaunchAgent and running the worker loop.
- `ai.bcrew.dashboard` is loaded as a LaunchAgent and was restarted after the runtime changes.
- `RUNTIME-SUPERVISOR-001` now explicitly owns the dashboard served-code-equals-HEAD / auto-restart-on-push gap exposed by the Recent Builds closeout review. The served-code verifier slice is live; auto-restart-on-push remains open.
- Active-run locking is enforced with a unique active-run index per job, so a second worker/manual trigger cannot start the same job while it is already queued/running.
- Job timeout cleanup now kills the process group with `SIGTERM` and escalates to `SIGKILL`.
- Operator-controlled job pause/resume is DB-backed and exposed through `/api/foundation/jobs/:jobKey/control`.
- Gmail and Missive current-day sync jobs now run through the extraction target ledger.
- Missive current-day sync has been promoted to scheduled every 2 hours after exact-ID idempotency proof.
- Gmail current-day sync now has item-level thread ledgering and is scheduled every 2 hours after repeated bounded runs showed `0` item failures and explainable net-new/changed threads.
- Meeting notes current-day and Slack current-day lanes are scheduled.
- Daily shared-comms extraction missions are scheduled for Gmail, Missive, meeting transcripts, and Slack.
- Drive content extraction, Gmail attachment extraction, and video transcript extraction are scheduled as daily quota missions with filed-output proof.
- Dashboard pause/resume buttons are live on the System Health job cards and were round-trip tested through `gmail-sync-current`.
- Runtime Health now exposes SYSTEM-010 active-process/liveness, stop/decommission controls, restart-on-push status, and cost/process risk under `system-010-ghost-closeout-v1`.
- Remaining Phase 1 gap: monitor scheduled current-day/extraction runs, prove alert behavior on real partial failures, and raise daily quotas only after runs stay stable.

### Phase 2 — Policy-Aware LLM Router MVP

Goal: centralize model access before high-volume automation expands.

Build:

- `lib/llm-router.js`
- credential registry
- `llm_calls` ledger
- route probes
- workload route table
- model/provider fallback rules
- usage/cost/risk visibility

Auth paths to test and classify:

- Claude Code Max via local `claude -p`
- Claude setup-token / OAuth route
- Claude Agent SDK route
- OpenClaw / ChatGPT Pro route
- direct OpenAI API
- direct Anthropic API
- direct Gemini API
- manual interactive routes

Routing doctrine:

- use subscription paths where supported, observable, stable, and policy-classified
- keep API/cloud fallback mandatory
- do not build blind round-robin quota farming
- do not make resale economics depend on consumer-plan arbitrage
- do not build the production product backend on consumer subscriptions; use official APIs for customer-facing automation unless a native/subscription route is explicitly allowed, probed, logged, and workload-classified
- migrate one workload family at a time only after that route has a successful actual-call probe

Hub-dedicated capacity doctrine:

- Foundation gets its own default model capacity lane.
- Marketing gets its own high-burn model lane because content, video, visuals, and creative iteration can consume far more than normal ops.
- Heavy hubs may need both Claude and ChatGPT capacity.
- Strategy, Ops, Sales, Recruiting, Retention, Zahnd Team Ag, Steve Zahnd, MarketMasters, and Unchained Realtor receive dedicated lanes as usage becomes real.
- Router chooses the hub-assigned account first.
- Overflow is allowed only when explicit, logged, budgeted, and visible.
- No single account is assumed sufficient for all Foundation plus hub workloads.

Backlog/cards:

- `LLM-AUTH-AUDIT-001`
- `LLM-CREDENTIAL-REGISTRY-001`
- `LLM-HUB-CAPACITY-001`
- `LLM-ROUTER-001`

Acceptance:

- every LLM call can be logged with workload, hub, provider, model, auth path, credential, status, and estimated cost
- route probes classify each path before scheduled automation uses it
- existing extraction/synthesis can be moved behind the router incrementally
- API fallback can be invoked only as a guarded, explicit paid-run path when subscription paths fail, exhaust, or are not allowed

Current proof:

- `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` are live in Foundation DB.
- `lib/llm-router.js` seeds policy-aware credential/route config, executes OpenClaw/Codex subscription model calls, logs every call, and keeps direct OpenAI Responses API as a guarded fallback only.
- `llm-auth-audit` is registered as a manual Foundation job and runs through `npm run foundation:job -- --job=llm-auth-audit`.
- Latest audit probes, in order: direct OpenAI API, direct Anthropic API, local Claude Code subscription, Claude OAuth token, OpenClaw/ChatGPT gateway, and Gemini API.
- Latest probe result: OpenAI API available, Gemini API available through `GOOGLE_API_KEY`, Claude Code Max login available, OpenClaw/Codex subscription model run succeeded through `openai-codex/gpt-5.4`, Anthropic API missing, Claude OAuth token missing.
- 2026-04-26 correction: keep AIOS subscription extraction on `openai-codex/gpt-5.4` until OpenClaw explicitly supports `openai-codex/gpt-5.5`; use 5.5 for coding/interactive work, not scheduled extraction.
- No raw secrets are stored in Postgres. DB records only labels, auth-path classes, status, policy classification, env/keychain references, probe outcomes, and call telemetry.
- Shared candidate extraction and shared-comms synthesis are migrated behind the router.
- Live proof: one synthesis run and one Gmail extraction run recorded `provider=openclaw`, `authPath=chatgpt_subscription_gateway`, `estimatedCostUsd=0` in `llm_calls`.
- A bounded JSON extraction probe also passed through `openclaw` / `openai-codex/gpt-5.4`; full shared-comms extraction can use long subscription windows, but it must run through paced worker jobs with timeout/reaper coverage instead of foreground builder-chat commands.
- Direct OpenAI Responses calls outside the router are blocked by `foundation:verify`; the router fallback requires `LLM_ALLOW_DIRECT_OPENAI_RESPONSES=true`.
- Remaining Phase 2 gap: build the Claude Code / Claude Agent SDK subscription adapter, define hub-dedicated capacity lanes, and add overflow/fallback rules before broad hub automation.

### Phase 3 — Extraction Control MVP

Goal: stop running giant manual backfills and create an always-current extraction team.

Build:

- source crawl targets
- crawl item ledger
- current-day lane
- bounded historical backfill lane
- corpus value classification
- source cursors
- leases
- budgets
- retries
- pause switches
- dedupe/fingerprint rules
- dashboard visibility for each source

Current-day lane:

- process last 24 to 48 hours
- prioritize Gmail, Missive, meetings, Slack, Calendar, Drive notes, and high-value source deltas
- never wait for historical backfill to stay fresh

Backfill lane:

- one bounded bite per source target
- fixed budget and stop condition
- resumable and idempotent
- records what was inspected and what remains

Corpus mission lane:

- old Drive, Skool, Zoom, Loom, YouTube, and report mining are daily quota missions, not polling timers
- a mission starts, processes a small count such as 5 files, 5 videos, or 10 reports, files the outputs with provenance, updates the ledger, then stops
- runtime windows can be long when subscription capacity is used, but completion is governed by quota, filed outputs, and stop conditions instead of elapsed time alone
- current-day sync is scheduled for Gmail, Missive, meetings, and Slack; corpus inventory/extraction should run as quota missions with pause/stop behavior and filed-output checks

Corpus value lane:

- classify mined material by consumer: strategy, sales leadership, ops, marketing, recruiting, agent coaching, Steve personal brand, MarketMasters, Unchained/education, or reject/no value
- tag reusable assets for content, training, courses, recruiting proof, SOPs, coaching, and strategy evidence
- keep original source evidence linked so hubs can use the material without guessing where it came from
- do not reorganize or move Drive assets outside dry-run mode until a target folder strategy is approved

Backlog/cards:

- `EXTRACT-CONTROL-001`
- `EXTRACT-CURRENT-001`
- `EXTRACT-BACKFILL-001`
- `EXTRACT-RETRY-001`
- `EXTRACT-SCHEDULE-001`
- `EXTRACT-METRICS-001`
- `FOUNDATION-SURFACE-UPDATES-001`
- `COMMS-BACKFILL-001`
- `EXTRACTION-TEAM-001`
- `HUB-INTEL-001`

Acceptance:

- Steve can see what source is being crawled, what is current, what remains, and what failed
- current-day sync stays fresh even while history is being processed
- high-value old material becomes usable by the right hub instead of disappearing into a raw archive
- no more overnight "I thought it was running" ambiguity

Current partial proof:

- `source_crawl_targets` and `source_crawl_items` are live in Foundation DB.
- `extraction-control-seed` is registered as a manual Foundation job and seeds the control plane without running any crawls.
- Seed/control runs are serialized with advisory locks and retry deadlocks so overlapping restarts/manual runs do not corrupt the target ledger.
- Seeded targets cover Gmail, Missive, meetings, Slack, Drive, Skool, old-system report mining, and historical Zoom recovery.
- Current-day targets are separate from bounded backfill/corpus/recovery targets.
- `scripts/run-extraction-target.mjs` wraps supported targets with a lease, process-group timeout, source before/after stats, output tail, and target run-state update.
- Scheduled crawl targets now display Foundation job runtime as the visible next-run truth; target-level `next_run_at` remains available only as `crawlCheckpointNextRunAt` runner checkpoint metadata.
- `gmail-sync-current` now calls `npm run extraction:target -- --target=gmail-current-day` through the Foundation job runner.
- `missive-sync-current` now calls `npm run extraction:target -- --target=missive-current-day` through the Foundation job runner.
- `meeting-notes-sync-current` now calls `npm run extraction:target -- --target=meetings-current-day` through the Foundation job runner.
- `slack-current-day` now records channel-level `source_crawl_items`; the 2026-04-28 proof run inspected 61 channels, archived 481 threads, marked 51 channel items succeeded, marked 10 skipped with `no_archivable_messages`, and replaced the stale Apr 27 reaped run as the latest target state.
- `missive-current-day` now records conversation-level `source_crawl_items`; the 2026-04-28 proof run inspected 100 conversations, wrote/refreshed 17, marked 82 already-current skips, marked 1 empty-thread skip, and produced 0 item failures.
- `docs/audits/2026-04-28-extraction-lane-item-shape.md` preserves the lane-consistency inspection for `EXTRACT-METRICS-001`: Slack, Gmail, meetings, Drive corpus/content, attachments, video, and Missive now all expose item ledger rows; the audit-time Drive content failures stay routed to future retry/backoff handling if they reappear.
- Runtime Health now exposes Extraction Control: Coverage By Target from `/api/foundation-hub`, with last success, last failure, next bite, item totals, top failed/skipped reasons, and remaining backlog indicators where available.
- `EXTRACT-CONTROL-001` v1 is closed through that coverage panel. Further retry/backoff execution belongs to `EXTRACT-RETRY-001`; richer app-surface breadcrumbs and updated markers belong to `FOUNDATION-SURFACE-UPDATES-001`.
- Drive Sheets text extraction was picked from Runtime Health evidence: `sheet_text_extraction_not_in_v1` was the largest actionable Drive content skipped reason. Proof run `crawl-drive-content-extract-backfill-20260428181558392-93bfbd63` inspected 5 existing sheet-skipped items, archived 5 `drive_spreadsheet` artifacts / 308,697 chars through Sheets API values, and recorded 0 crawl item failures.
- KPI health was picked from the broader Runtime Health/source evidence frame: failed extraction items were 0, synthesis quality was green, Action Router had pending work but no approved-stuck breakage, and `KPI-HEALTH-001` was the smallest closeable freshness/health slice. The v1 probe checks 14 load-bearing KPI tables, 5 KPI RPCs, per-source freshness windows, expected Supabase columns/RPC output fields, and Lee `zahnd-team-dashboard` table/RPC references. Primary surface is Foundation > Data Sources > APIs / Apps > KPI / Supabase Health; Runtime Health only warns when unhealthy.
- Partial target runs now exit nonzero from `run-extraction-target`, so item-level failures cannot look like green Foundation jobs.
- `meeting-notes-retry-failed` is registered as a manual Foundation job and retries failed meeting crawl items from `source_crawl_items` instead of rerunning the whole current-day window.
- First retry proof found `0` failed meeting crawl items and succeeded as a no-op.
- Meeting transcript gap report now separates historical archive gaps from recent forward-looking transcript watch. Current archive coverage is `866` notes, `649` transcripts, and `863` meetings across `2024-10-03` to `2026-04-24`; historical gaps remain real (`239/863` meetings missing transcript artifacts), led by Steve (`123/386` missing), Blake (`49/203`), Nick (`40/88`), and Tanner (`10/32`). Recent watch is keyed to the actual meeting date, not document modified time; the exact Apr 23-24 Leadership, Owners, Budget Review, and Marketing docs Steve checked are confirmed archived with `embedded_in_gemini` transcripts.
- `meeting-transcript-recent-gap-verify` is registered as a manual Foundation job. First proof classified the `21` recent missing transcript artifacts as `21` true-missing, `0` parser/tab misses, `0` owner/path misses, and `0` key mismatches; no safe auto-repairs were available.
- Meeting text coverage is not the same as meeting video/recording coverage. The video-link inventory can find linked Loom/Drive/YouTube/Vimeo/Wistia/Zoom/Skool URLs, but reviewing or transcribing the linked videos/recordings is separate backlog work.
- `meeting-transcripts-extract-backlog` is registered as a scheduled daily Foundation job for a bounded LLM bite over archived transcripts without a successful processing run for the current content hash. First proof scanned `15` transcripts, upserted `87` candidates, and moved recent transcript candidate coverage to `56/59`.
- First manual proof: Gmail scanned `970` messages, selected `263` threads, and archived `148` net-new artifacts through the target ledger.
- First manual proof: Missive selected `100` conversations and archived `43` net-new artifacts through the target ledger.
- Missive change-aware idempotency check is live; immediate rerun selected `100` conversations, skipped `94` already-current conversations, refreshed `6` changed conversations, and archived `0` net-new artifacts.
- `missive-sync-current` is scheduled every `120` minutes.
- `gmail-extract-latest`, `missive-extract-latest`, `meeting-transcripts-extract-backlog`, and `slack-extract-latest` now target archived artifacts without a successful processing run for the current content hash. Gmail and Missive first proofs scanned `15` threads each and created `13` and `11` candidates. These now run as scheduled daily subscription-router quota missions.
- `shared_communication_artifact_processing_runs` now records candidate-extraction processing attempts with `artifact_content_hash`, actual `provider`, `auth_path`, `route_key`, and actual model. Successful zero-candidate artifacts are excluded from future `--onlyWithoutCandidates=true` queues only for the same extractor version and same current content hash, while changed content and failures remain retryable.
- System Health now exposes Intelligence Pipeline extraction depth: archived artifacts, artifacts with active candidates, still-unmined artifacts, extraction coverage percent, and latest synthesis.
- `shared-comms-intelligence-bite` is a manual synthesis-only job for strategy prep and action review. It reads already-mined candidates and records ranked Strategy Hub/action-router input with a long subscription-route timeout. Gmail, Missive, meeting transcript, and Slack extraction now run as separate scheduled daily subscription miners so slow extraction calls do not block current-day archive sync.
- Skool remains blocked until access path and content-use boundaries are explicit.
- Historical Zoom audio recovery is paused unless strategy/content value justifies reopening it.
- Gmail item-level ledger proof selected `259` recent threads per run, produced `0` item failures across repeated bounded runs, and promoted `gmail-sync-current` to scheduled every `120` minutes. The first scheduled worker run succeeded, archived `4` threads, cleared its lease, and set target/job next run around `2026-04-24T20:09Z`.
- Meeting notes current-day proof selected `50` meetings, archived `50` notes and `42` embedded transcripts, recorded `50` succeeded crawl items, left `0` failed crawl items, and added `2` net-new artifacts.
- Meeting target runs now parse item-level crawl failures and mark the target `partial` when the process succeeds but individual crawl items fail; partials now fail the Foundation job so the dashboard/worker gets an alert path instead of a false green state.
- Extraction target snapshots now attach a `scheduler` object derived from the registered Foundation job when `metadata.foundationJobKey` exists. This makes Foundation jobs the schedule truth for scheduled crawl lanes while preserving target `nextRunAt` as crawl checkpoint metadata.
- First read-only Drive corpus bite is live through scheduled daily Foundation job `drive-corpus-inventory-bite`: Zahnd TEAM OG root inspected, `60` direct children recorded, `24` child folders discovered, `36` files discovered, `31` next folders/roots queued, `0` item failures, and no files moved/copied/exported/LLM-processed.
- Foundation now exposes a Drive corpus inventory review snapshot with item totals, folder/file counts, pending extraction counts, candidate value routes, and queue state.
- Raw Drive inventory script writes are guarded: non-dry-run inventory must be run through `extraction:target` so leases and target cursors advance with item writes.
- Shared-comms synthesis was run through the subscription router and recorded `synth-20260424T203755Z-e6b01782ad` with `5` ranked live intelligence items. Top issues surfaced: KPI deal-data display/sync failure, June cash gap, SocialPilot access/publishing instability, Union Street delivery retry, and Loom access migration issue.
- Remaining Phase 3 gap: monitor scheduled current-day/extraction runs, prove partial failure on a real failed item, extend retry semantics to Drive/video lanes, add Missive attachment extraction and richer Gmail attachment file types, prove meeting-linked video review, tune subscription-route miners with per-source timeouts and pacing, prove synthesis as Strategy Hub/action-router input, and build review/export gates before broad backfill. Drive Docs/Sheets/PDF/text/markdown, agenda link inventory, rough scanned-PDF OCR fallback, and Gmail PDF/text attachment filed-output extraction are now live first slices, not unbuilt gaps.

### Phase 4 — Retrieval, Entity, And Synthesis Hardening

Goal: turn archived data into ranked, live, source-backed intelligence.

Build:

- chunk-level hybrid retrieval / embeddings where justified, with pgvector or a documented fallback
- retrieval cost/call ledgering for high-volume corpus mining
- entity graph
- temporal edges
- cross-artifact linking
- resolution detection
- supersession detection
- cross-source dedup
- staleness scoring
- actionability ranking
- synthesis claim verification before human-facing outputs are treated as decision-grade
- acknowledged-state registry so resolved/accepted/ignored items stop resurfacing as fresh work
- source-backed fact grounding from strategy, KPI, finance, Owners, FUB, marketing, and source contracts
- subject-person privacy/redaction: a person cannot see sensitive evidence about themselves just because they can ask their own assistant
- tier-aware query filtering before any human-facing or agent-facing answer uses sensitive people data

Synthesis output must answer:

- what is new?
- what is unresolved?
- what was resolved?
- what was superseded?
- what matters now?
- who owns it?
- what evidence proves it?
- what should Steve or leadership do next?

Backlog/cards:

- `SECURITY-002`
- `INTEL-JOBS-001`
- `INTEL-ATOM-001`
- `RETRIEVAL-001`
- `RETRIEVAL-002`
- `RETRIEVAL-003`
- `SYNTHESIS-ENGINE-001`
- `SYNTHESIS-FACTS-001`
- `ACTION-ROUTER-001`
- `STRATEGY-001`
- `MEMORY-005`
- `DECISION-005`

Acceptance:

- a small live set of real items exists instead of thousands of raw candidates
- each item links to evidence and source facts
- each item can route to the right operating ledger: decision, backlog task, open question, contradiction, ignore/snooze, or owner-bound action
- old items are suppressed if resolved, stale, duplicated, superseded, or explicitly closed
- sensitive people facts are filtered by subject-person and tier before reaching hubs or agents

### Phase 4A — Auth, Tier, Redaction, And Process-Control Gates

Goal: prevent the old-system leak pattern before hubs or assistants consume sensitive intelligence.

Build:

- app-level authenticated user and tier attachment — done for v1 through `lib/security-access.js`
- tier-aware read filters for shared intelligence surfaces — done synthetically, with unproven routes left Tier 1-only
- subject-person tagging and sensitivity policy for comms-derived items — done for v1 proof; broader real-data filtering remains future approved work
- subject-person redaction before any non-Steve / non-admin response — done for v1 proof and route posture
- uniform response shape that does not reveal that content was suppressed — done for v1 helpers
- owner-preserving raw meeting/doc access policy from `docs/specs/2026-04-23-auth-tiers-vault.md` — done for fail-closed summary boundary
- `ai@bensoncrew.ca` front-office identity stays invite/delegated-read only; `crewbert@bensoncrew.ca` owns private vault/back-office access
- verifier checks proving lower-tier users and subject people cannot read restricted material
- `SYSTEM-010` decommission/dead-man/cost/process controls for scheduled miners and future agents

Backlog/cards:

- `SYSTEM-010`

Acceptance:

- admin-only proof endpoints are clearly separated from user-facing hub/query endpoints
- every shared-communications read surface has an explicit auth/tier/redaction posture
- sensitive people facts cannot be surfaced to the subject person through their own assistant or query
- every running miner/job/agent has visible state, stop/pause/decommission behavior, last activity, and cost/subscription call visibility
- Strategy Hub and agents remain blocked until this gate is green

### Phase 5 — Source Trust Closures

Goal: close the source truth needed before Strategy Hub is trusted.

Close:

- `SOURCE-008`
- `SOURCE-010`
- FUB Level 2 taxonomy baseline
- KPI truth-layer map

Already closed for current reality:

- strategy-used Owners slice
- `SOURCE-014`
- `FOUNDATION-003` / `SRC-FINANCE-001`

Marketing source map:

- `SOURCE-016`
- Benson Crew lane
- Zahnd Team Ag lane
- Steve Zahnd lane
- MarketMasters lane
- legacy Zahnd Team assets that still feed BCrew truth
- SocialPilot auth validation
- Google marketing auth repair
- GA4 / Search Console / YouTube / Google Business Profile / Google Ads account map
- GoHighLevel and lead-flow map

Acceptance:

- Strategy Hub can trust the source facts it uses
- marketing can separate brand lanes without mixing current BCrew and legacy Zahnd truth incorrectly
- KPI and finance facts are no longer guessed from memory

### Phase 6 — Drive, Skool, And Old-System Mining

Goal: create sustainable corpus ingestion instead of one-time archaeology. Steve has repeatedly made this explicit: the target is a high-end multimodal extractor for YouTube videos/channels, Loom, Skool, Drive/meeting videos, Zoom recordings, demos, screenshots, transcripts, and related training/course material. This is not optional research; it is a core Foundation capability. The constraint is governed access, provenance, cost/route ledgering, quotas, and stop controls.

Build:

- Drive worker: one folder at a time
- Skool worker: trainings, videos, links, docs, comments where accessible
- rich multimodal extractor contract for Zoom, Loom, YouTube, Skool, web pages, screenshots, transcripts, slides, and demos
- normalized creator/source watchlist for YouTube, blogs, Skool, X, LinkedIn, newsletters, and websites
- YouTube discovery and Gemini video-intelligence MVP after the retrieval spine is live
- web/video crawler boundary for YouTube, Loom, Vimeo, Wistia, public web, Mycro/myICOR-style paid training apps, and paid/community sources
- video-link inventory lane: system discovers Loom/Drive/YouTube/Vimeo/Wistia/Zoom/Skool links from archives and authorized crawlers so Steve is not manually collecting URLs
- video-content extraction lane: first YouTube subtitle transcript slice is live through DataForSEO and the shared video manifest, including manual Steve priority URLs such as the Mycro `The AI Team Setup Nobody Talks About` proof; richer visual review, no-subtitle videos, Loom, Drive videos, Zoom recordings, and Skool embeds stay under the multimodal contract
- old-system report miner (broad corpus mining stays here; the pre-atom report-shape salvage gate is `REPORT-MINING-001` in the memory spine)
- value classifier for content/course/training/recruiting/strategy material
- hub handoff queues for mined assets
- source fingerprints and duplicate detection
- dry-run organizer mode for Drive

Rules:

- current-day lane remains more important than history
- backfill takes one bite per day/source
- Google Drive starts with read-only direct-child inventory of the eight captured shared-drive roots
- Skool starts with access-path audit only; no blind browser scraping
- Loom starts with URL inventory and small authorized extractor proof; Loom's SDK is not a bulk extraction API
- YouTube/Loom/Skool/video extraction should proceed through small ledged proofs, then daily quota missions; do not wait for another broad approval that the category matters
- transcript-only is not full video understanding; paid trainings, demos, meeting recordings, and screen walkthroughs require the GOD-mode layer: speech/transcript, screenshots/keyframes, visual workflow/tool detection, timestamped evidence, quality scoring, and cost/permission controls
- organizer/move actions stay dry-run until approved
- old system is mined for output patterns and useful doctrine, not copied as runtime architecture
- mining output must say which hub can use the asset, or why it should be ignored

Backlog/cards:

- `DRIVE-CORPUS-001`
- `MULTIMODAL-EXTRACTOR-001`
- `CREATOR-WATCHLIST-001`
- `YOUTUBE-SCOUT-001`
- `SKOOL-001`
- `LOOM-001`
- `ZOOM-RECOVERY-001`
- `EXTRACTION-TEAM-001`
- `REPORT-MINING-001`
- `PLATFORM-INTEL-001`
- `HUB-INTEL-001`
- `WEB-CRAWLER-001`
- `WEB-GODMODE-001`
- `MYICRO-TRAINING-001`

Acceptance:

- the system can keep eating old Drive/Skool/meeting/training content without Steve sitting there
- salvageable old avatars, marketing atoms, scout reports, director briefs, and strategy context are indexed into the new Foundation model
- valuable old material can feed course ideas, YouTube scripts, training assets, recruiting proof, or strategy evidence without mixing brand lanes

### Phase 7 — Strategy Hub

Goal: build the first high-value hub on top of Foundation truth, not raw archive dumps.

Prerequisites:

- runtime MVP active
- router MVP classified
- extraction current-day lane active
- synthesis hardening producing governed synthesized items
- memory/retrieval/fact/synthesis spine complete enough for routing: `INTEL-JOBS-001`, accepted old-system report-shape salvage, `INTEL-ATOM-001`, `RETRIEVAL-001` lexical retrieval, `RETRIEVAL-002` semantic retrieval, `RETRIEVAL-003` hybrid evidence retrieval, `SYNTHESIS-FACTS-001` source-backed fact grounding, `SYNTHESIS-ENGINE-001` governed synthesized items, and the direct Scoper-to-atom query rule
- Action Router v1 producing governed decision/task/question/ignore/snooze/owner-action route records with source back-links
- strategy/Owners/FUB/finance/KPI trust boundaries clear enough for strategy use
- subject-person privacy/redaction active for any sensitive people evidence used in the hub
- `SYSTEM-010` decommission/dead-man/process-cost controls active for any autonomous loop the hub depends on

Strategy Hub should:

- ingest last strategy materials and John Kitchens prep
- compare planned strategy against source-backed operating reality
- surface contradictions
- identify open decisions
- identify constraints and blockers
- produce a tight owner-level strategy packet
- track follow-through after the meeting

Latest proof remains useful historical/debug evidence: `strategy:evidence-packet` generated source-backed packet material from mined candidates, Drive/video/email/meeting artifacts, strategy docs, backlog/decision/runtime facts, and live goal/operating truth. That work exposed the right operating metrics and proved the danger of letting packet/advisor synthesis outrun the Foundation spine. The active Strategic Execution surface now renders the Strategy Hub v2 source-to-gap command view: live goal truth, operating source cards, retrieval eval status, and Action Router review/promote records. The advisor endpoint still returns `strategy_hub_v2_in_progress`, and old active 90-day priority generation remains disabled. The Foundation spine is closed enough for routed review and apply: `INTEL-JOBS-001`, `REPORT-MINING-001`, `INTEL-ATOM-001`, `RETRIEVAL-001`, `RETRIEVAL-002`, `RETRIEVAL-003`, `SYNTHESIS-FACTS-001`, `SYNTHESIS-ENGINE-001`, and `ACTION-ROUTER-001` are done for v1, with one Strategy route created after the synthesis/router repair and old operational routes hidden from Strategy. `npm run intelligence:retrieval-eval` guards 20 expected hybrid retrieval matches across Gmail, Meetings, and Missive before Strategy Hub depends on evidence recall. Next Strategy Hub hardening should make the current route review meeting-ready, then define Strategic Intelligence and build the gap-resolving Scoper. It must not revive chat/advisor polish.

Acceptance:

- output is concise enough for ownership to read
- every important claim links to evidence
- decisions and follow-through become tracked system objects

### Phase 8 — First Useful Agents

Goal: only after governed loops work, connect live agents to the system.

Order:

- Harlan personal assistant
- Crewbert orchestrator/operator
- one narrow specialist if needed

Do not build:

- 20 scouts
- autonomous agents without kill switches
- agents that bypass Foundation source truth
- agents that act without logged evidence and approval lanes
- agents that can leak subject-person restricted evidence

Acceptance:

- agents read Foundation truth
- agents create logged proposals/actions
- agents have kill switches
- agents do not invent separate memory or source truth
- agents respect subject-person privacy and tier filters before answering or acting

## Active Post-Audit Trust Hit List

Before new feature work resumes, finish the post-audit trust repairs that protect the rebuild process itself.

Current order:

1. `PROCESS-FANOUT-001` repair — done for v1. The false-done card now has the actual fanout check, doc, npm command, closeout proof, and verifier coverage.
2. Wave 2 Chat B: `WORKER-CODE-TRUST-001` — done for v1. The supervised Foundation worker now exposes startup commit and LaunchAgent pid proof.
3. Wave 2 Chat A: `VERIFIER-DONE-COVERAGE-001` + `VERIFIER-ARTIFACT-EXISTS-001` — done for v1. Done cards now need verifier proof or an explicit exception, and claimed artifacts must exist.
4. Wave 3 Card 4: `POST-SHIP-FAN-OUT-001` — done for v1. The post-ship fanout gate checks that closeouts prove surrounding truth moved with the code.
5. Card 6.5: `SHEETS-QUOTA-HARDENING-001` — done for v1. Sheets reads now have short TTL caching, batchGet support, and Runtime Health quota visibility before Wave 5 parallel ramp.
6. Wave 4 Card 5: `DOCTRINE-PROPAGATION-001` — done for v1. The active bcrew-foundation skill now carries the current operating doctrine through a generated section without copying private memory content.
7. Wave 4 Card 6: `DECISION-AUTO-EMIT-001` — done for v1. Explicit commit/checkpoint decision language can now become proposed decisions through a dry-run-first tool.
8. Phase C Track 1: `PHANTOM-CARD-CHECK-001` + `PHASE-NUMBERING-RECONCILE-001` — done for v1. Active card references must point at live backlog cards, and the Foundation UI now shows command order instead of competing phase labels.
9. Phase C Track 2: `SUB-SURFACE-MAPPING-001` + `SYSTEM-INVENTORY-TRUE-UP-001` — done for v1. Foundation maps critical sub-surfaces/API routes and System Inventory reports all nine configured plugin surfaces.
10. Phase C Track 3: `SOURCE-CONTRACT-CLEANUP-001` + `VERIFIER-CONSOLIDATION-001` — done for v1. Active source references resolve to source contracts, historical source aliases are classified, and verifier messaging is cleaner.
11. Phase D Cards 13+14: `DOC-ARCHIVE-AUTO-001` + `RESEARCH-CURATION-001` — done for v1. Historical handoffs/audits/research docs moved to `docs/_archive/` without deletion, and research-lane cards remain preserved for later human curation.
12. Phase D Cards 15+16: `REBUILD-DOCS-RETIRE-001` + `ARCHIVE-RETIRE-001` — done for v1. Stale rebuild docs moved to plan history, and the only delete lane recorded that no safe-delete archive was present, so nothing was deleted.
13. Phase D drift remediation: `EXCEPTION-CURATION-001` + `HIT-LIST-RECONCILE-001` — done for v1. The 24 historical verifier exceptions are classified without extending the 2026-07-27 deadline, and the canonical hit-list snapshot is checked without auto-reading Steve's private Google Doc.
14. Phase D Recent Work UX: `RECENT-BUILDS-MULTI-CLOSEOUT-001` — done for v1. Recent Builds can show multiple closeouts under one collapsed same-commit group.
15. Phase E: `FULL-SYSTEM-RE-AUDIT-001` — done for v1. The 12-area re-audit found 0 blockers, 9 minor-drift areas, and 3 clean areas. Phase F can open with follow-up cards.
16. Wave Cleanup A: `LOCAL-DOC-LINK-001`, `DOC-AUTHORITY-INDEX-REPAIR-001`, and `DOC-OTHER-TRIAGE-001` — done for v1. Private local docs can open only from trusted localhost, stale doc-authority links/statuses are repaired, and the 127-doc `Other` bucket has an inspect-only triage report.
17. Cleanup B: `DOC-CATEGORIZATION-001`, `DOCTRINE-PROPAGATION-002`, and `PROCESS-HOOKS-002` — done for v1. System Inventory now uses the 12 approved doc categories, doctrine propagation watches private memory metadata without copying content, and `process:foundation-ship` gives builders one canonical gate wrapper.
18. Phase G Track 1: `GATE-PERFORMANCE-001` — done for v1. The canonical Foundation ship wrapper now skips the duplicate embedded verifier with an explicit reason, runs independent fanout checks in parallel, prints per-step timing, and keeps strict duplicate-verifier mode available.
19. Hard-checkpoint backlog reconciliation: `FOUNDATION-PLAN-RECONCILE-001` is done for v1. It promoted the hard-checkpoint sprint plan into backlog truth before Phase G Track 2 starts.
20. Phase 1 enforcement: `APPROVAL-FILE-INTEGRITY-001`, `BUILD-LOG-BACKLOG-ID-FIX-001`, `PRE-COMMIT-HOOK-INSTALL-001`, and `CLOSEOUT-BACKFILL-001` are done for v1. Approval files are tamper-evident, Recent Work separates owned backlog IDs from mentioned context IDs, the 13 closeout-proof targets are backfilled or explicitly exceptioned, and repo-managed Git hooks protect Foundation paths while keeping `process:foundation-ship` as the full gate.
21. Foundation control layer: `GATE-RELIABILITY-001`, `PERSONAL-WORKSPACE-BOUNDARY-001`, `DOCTRINE-PROPAGATION-003`, `DECISION-AUTO-EMIT-002`, and `CEO-DASHBOARD-PATTERN-001` are done for v1 under `foundation-control-layer-v1`. Gate reliability uses deterministic injected transient/permanent proof, bounded raw-verifier retry, and a targeted `gate-reliability-retry-pool-reset-v1` patch proving retry after DB cleanup resets the Foundation DB pool before the second attempt; personal workspace proof is metadata-only for real private files with synthetic sentinel leak tests; doctrine propagation carries the missing control rules; decision auto-emit is explicit-source and proposed-only; CEO dashboard pattern is a doctrine/schema contract, not UI polish.
22. Foundation 1100 Review Sprint: `BACKLOG-HYGIENE-PASS-002`, `ACTION-REVIEW-CLEANUP-001`, `RESEARCH-CURATION-002`, and `PHASE-G-READINESS-001` are done for v1 under `foundation-1100-review-v1`. The sprint froze the 289-card baseline before wrapper-card creation, cleaned the 20 Backlog Hygiene warnings to 0 findings, curated the 18 pending Action Review routes without applying business/owner-action routes, dispositioned 102 research/future-build cards without deep research or source expansion, and recorded the Phase G order. No Phase G UI work starts inside this cleanup sprint.
23. Phase G Track 2: `PLAIN-ENGLISH-SWEEP-001` is done for v1 under `plain-english-sweep-v1`. Foundation operator copy was tightened across Backlog/Action Review, Runtime Health, Recent Work/Build Log, Data Sources, System Inventory, and shell/nav/mobile/error/empty states with 60 audited entries and 24/24 manual route/viewport passes. This was copy-only: no IDs, selectors, API shapes, route names, data contract keys, source IDs, card IDs, table names, proof commands, source-contract strings, layout, Recent Work redesign, source expansion, Strategy, Scoper, Agent Factory, corpus, research, or action-review workflows changed.
24. Reliability follow-up before UI layout: `GATE-RELIABILITY-002` is done for v1 under `gate-reliability-recurring-transient-v1`. After `PLAIN-ENGLISH-SWEEP-001`, Steve pulled this narrow patch ahead of UI/menu/layout polish because recurring bounded `foundation:verify` retries still needed a root-cause class. Gate retries now classify and print class/subsystem diagnostics for Postgres deadlocks, Foundation DB pool cleanup, network timeouts, and external quota/rate limits while keeping bounded retry behavior and permanent failures fail-closed. The ship wrapper also runs fanout gates sequentially by default to avoid the observed local Postgres deadlock class; `--parallelFanout=true` remains explicit profiling mode. This does not start UI polish or any other Phase G surface work.
25. Phase G Track 2: `UI-MENU-LAYOUT-POLISH-001` is done for v1 under `ui-menu-layout-polish-v1`. Foundation navigation now puts the operator command surfaces first, adds separate System Inventory access for Current Docs and Archive / History, keeps `/api/system-inventory` shape unchanged, hides archive/history docs from the default current-doc view, preserves archive/history evidence at `/foundation#inventory-archive-history`, keeps private/local docs metadata-only, adds desktop/mobile manual route review, and proves the slice through `process:ui-menu-layout-polish-check`.
26. Reliability follow-up after UI layout: `GATE-RELIABILITY-003` is done for v1 under `gate-reliability-direct-verifier-deadlock-v1`. Independent review accepted `UI-MENU-LAYOUT-POLISH-001`, but direct `foundation:verify` still hit a bounded `postgres-deadlock` retry. The root local path was normal review gates calling the write-heavy `initFoundationDb()` schema/seed initializer while dashboard/worker were live. Direct verifier, process ship/fanout gates, post-ship fanout, and backlog hygiene now use read-only DB readiness checks before reading live state. Gate retry diagnostics include safe Postgres metadata only: code, relation OIDs, process IDs, routine, gate label, and retry attempt; no row data, source content, or private content is logged.
27. Phase G Track 2: `RECENT-BUILDS-BILLION-DOLLAR-UI-001` is done for v1 under `recent-builds-billion-dollar-ui-v1`. Recent Work now has an executive summary, visible review-next queue, collapsed-by-default closeout cards, proof/known-limit/where-it-lives sections, separate owning-card and context-card treatments, and same-commit groups that stay grouped while each closeout stays individually reviewable. Ownership semantics remain exact: `backlogIds` own cards only, mentioned/context cards stay context only.
28. Phase G Track 2: `CHANGE-LOG-COMPREHENSIVE-001` is done for v1 under `change-log-comprehensive-v1`. System Activity now has a comprehensive source-backed changelog with recent highlights, by-surface grouping, by-type grouping, raw evidence rows, inspectable evidence refs, and owner/context card separation. The layer uses verified closeouts, DB `change_events`, and changed-file evidence; `/api/foundation/changes` remains backward-compatible and `/api/foundation/change-log` is additive. This did not implement Daily Exec Summary, source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, or a new feature lane.
29. Phase G Track 2: `DAILY-EXEC-SUMMARY-001` is done for v1 under `daily-exec-summary-v1`. Foundation now has a date-scoped daily executive summary at `/foundation#daily-summary` and `/api/foundation/daily-summary`, with selected date, recent-day selector/list, where we started, what changed, what shipped, what remains, what we learned, what is next, and proof/evidence refs. The layer uses Recent Work, comprehensive changelog, current plan/state, live backlog truth, action/research disposition summaries, and recorded proof only; it does not generate narrative without evidence refs.
30. Phase G Track 2: `SOURCE-LIFECYCLE-EXPANSION-001` is done for v1 under `source-lifecycle-expansion-v1`. Foundation now has an additive source lifecycle control layer at `/foundation#source-lifecycle` and `/api/foundation/source-lifecycle`, covering all 35 source contracts and all 12 governed extraction targets with connected/verified/extracted/reviewed/retry/parked status, visible parked/blocked lanes, unchanged extraction caps, and metadata-only evidence refs. This is visibility/control only: it does not create extraction targets, increase quotas, activate Strategy Hub, Scoper, Agent Factory, broad corpus expansion, research cleanup, Action Review applying, or a new feature lane.
31. Foundation follow-up capture: `FOUNDATION-FOLLOWUP-CARD-CAPTURE-001` is done for v1 under `foundation-followup-card-capture-v1`. It created and scoped the three missing follow-up cards with full context, kept `PEOPLE-006` as related/context only, and did not send Gmail, write ClickUp Requested status, implement Systems grouping, start feature work, or open Strategy, Scoper, Agent Factory, corpus, source expansion, or research cleanup. Next expected build order:
   1. FOUNDATION-SYSTEMS-SERVICE-GROUPING-001
   2. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001
   3. AGENT-FEEDBACK-SEND-001
32. Foundation Systems service grouping: `FOUNDATION-SYSTEMS-SERVICE-GROUPING-001` is done for v1 under `foundation-systems-service-grouping-v1`. It groups the 12 existing `/api/source-of-truth` `groupedSystems` records by the 14 approved business/service areas on `/foundation#systems`, gives every system one valid primary `serviceArea`, keeps valid `secondaryServiceAreas`, labels partial/planned systems, shows empty groups as `No mapped systems yet.`, and keeps Sales and Recruiting separate with no combined bucket. This did not invent systems, send Gmail, write ClickUp Requested, build Agent Onboarding Feedback, build `AGENT-FEEDBACK-SEND-001`, or start Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or a new feature lane. Next expected card is `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`.
33. Agent Onboarding Feedback system visibility: `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` is done for v1 under `agent-onboarding-feedback-system-v1`. `/api/source-of-truth` now has 13 `groupedSystems`: the existing 12 are preserved and `SYS-AGENT-ONBOARDING-FEEDBACK-001` is added exactly once as a partial `Agent Onboarding` system. The system records ClickUp Agent Roster source truth, Real Start Date + 30/60/90 triggers, Agent Roster / Ops review queue, `/agent-feedback` private-token form, `agent_onboarding_feedback_responses`, Onboarding NPS 30/60/90 Status/Score/Feedback writeback fields, statuses, blockers, proof surfaces, and privacy boundaries. Georgia/Chris proof is metadata-only. `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001` is scoped as context only, `AGENT-FEEDBACK-SEND-001` remains scoped, and the closeout owns only `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`. This did not send Gmail, write ClickUp Requested, send Georgia a survey, build the production email path, broaden Systems regrouping, or copy private feedback tokens, feedback content, or personal email addresses into tracked proof.
34. Agent Onboarding Feedback send Stage 1: `AGENT-FEEDBACK-SEND-001` is done for Stage 1 under `agent-feedback-send-v1`. The infrastructure now has eligibility checks, dry-run metadata proof, duplicate-send protection, Gmail send path wiring, Requested writeback sequencing, privacy checks, and verifier coverage. `AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001` later corrects the recipient policy across request, test, auto-send, and reminder paths: Agent Feedback uses ClickUp Company Email only. Contract Link is warning/data-quality metadata only and does not block 30/60/90 onboarding feedback send eligibility. No Gmail send, ClickUp Requested writeback, Georgia survey, or Stage 2 execution happened. `AGENT-FEEDBACK-GEORGIA-SEND-001` is preserved as context only; Steve Zahnd is now the only live full-loop test target.
35. Agent Onboarding Feedback auto-send readiness: `AGENT-FEEDBACK-AUTO-SEND-001` is done for readiness under `agent-feedback-auto-send-v1`. The system now has a daily dry-run/report scanner over the ClickUp Agent Roster for 30/60/90 onboarding feedback candidates, with would-send/sent/skipped/blocked/warning/repair counts visible in Runtime Health and Ops. Default behavior is dry-run/report-only. Live sends require both `AGENT_FEEDBACK_AUTO_SEND_ENABLED=true` and an approved mode/allowlist artifact; toggle alone cannot send, allowlist alone cannot send, and production-all requires a separate approval artifact. The Company Email policy makes all auto-send candidates use Company Email; Steve Zahnd is the next full-loop live test target, and production-all remains a separate later card. No Gmail send, ClickUp Requested writeback, broad live auto-send, raw email address, token URL, or feedback-content exposure happened.
36. Agent Onboarding Feedback response notification: `AGENT-FEEDBACK-RESPONSE-NOTIFY-001` is done for v1 under `agent-feedback-response-notify-v1`. After a feedback response saves in `agent_onboarding_feedback_responses` and after the ClickUp Completed/Score/Feedback writeback attempt, the system sends an internal notification to Steve, Carson, Ryan, and Georgia with agent name, milestone day, score, feedback text, submitted timestamp, ClickUp task/source reference, and ClickUp writeback status. If ClickUp writeback fails after DB save, the notification still sends with repair status `clickup_completed_writeback_failed`. Duplicate notification protection is keyed by `agent_onboarding_feedback_response_notifications.response_id`. Synthetic dry-run proof covers success and repair paths with no Gmail send. Tracked proof uses roles/hashes only and does not copy private tokens, raw email addresses, or feedback text. Response notification remains active for the Steve full-loop test and later production-all enablement.
37. Agent Onboarding Feedback reminder cadence: `AGENT-FEEDBACK-REMINDER-CADENCE-001` is done for readiness under `agent-feedback-reminder-cadence-v1`. Reminder readiness now covers day 1, day 3, day 7, day 10, day 14, and day 17 after a successful initial Requested send, with cap 6 reminders or 30 days. No reminder runs before a successful initial request. Completed/skipped/blocked status stops reminders, duplicate task/milestone/slot sends are protected by `agent_onboarding_feedback_reminder_attempts`, and Runtime Health/Ops expose pending/sent/skipped/blocked/maxed-out/repair counts plus next-due dates. The Company Email policy makes reminder recipients use Company Email only. No live reminder send, Georgia send, Steve test, production auto-send, ClickUp Requested writeback, Gmail send, raw email address, token URL, or feedback-content exposure happened.
38. Agent Feedback Company Email policy: `AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001` is done for v1 under `agent-feedback-company-email-policy-v1`. Request sends, test sends, auto-send readiness, and reminder readiness all use ClickUp Company Email only. Personal Email is not part of Agent Feedback send eligibility, and legacy Personal Email blockers cannot appear in Agent Feedback checks. Contract Link remains warning-only. BCC oversight remains Steve, Carson, Ryan, and Georgia with To-recipient dedupe. Approval validation and allowlists support any named approved target instead of Georgia-only. Proof shows Steve Zahnd Day-30 dry-run eligible by Company Email, Georgia eligible by Company Email if checked but not the live target, and a synthetic external agent eligible by Company Email. No Gmail send, ClickUp Requested writeback, production auto-send, or Georgia test happened.
39. Steve Agent Feedback full-loop test: `AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001` is not accepted. The prior `agent-feedback-steve-full-loop-test-v1` run sent the Steve Day-30 request and then the script consumed the same emailed token with a controlled synthetic response before Steve could use the real browser link. That proof is now evidence of the failure mode only, not production readiness. No production auto-send may start from it.
40. Real-user submit repair: `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001` is done for the repaired real-user test under `agent-feedback-real-user-submit-repair-v1`. It split send-only/manual-user mode from dry-run-only synthetic-submit mode, superseded the script-consumed Steve Day-30 artifacts without deleting evidence, sent one fresh Steve Day-30 Company Email request, waited for Steve to submit from the actual emailed browser link, and proved DB response, ClickUp Completed/Score/Feedback writeback, internal notification, reminder stop, duplicate-submit clear error, duplicate resend protection, and BCC role proof. It cleared the gate for the separate production enablement card.
41. Foundation verifier health repair: `FOUNDATION-VERIFY-HEALTH-REPAIR-001` is done under `foundation-verify-health-repair-v1`. It repaired or classified the three remaining `foundation:verify` failures after the real-user submit repair: worker startup code trust was real served-code drift and was repaired by restarting the Foundation worker; `DAILY-EXEC-SUMMARY-001` was a stale date-scoped latest-build expectation and now measures latest Recent Work as of the selected summary date; `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` was stale live source-context wording and now records explicit status vocabulary, live-send Gmail proof wording, and current Chris source-state proof. `foundation:verify` is fully green. It cleared the Foundation gate before the separate production enablement card.
42. Agent Feedback production auto-send: `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001` is done under `agent-feedback-production-autosend-enable-v1`. The production auto-send is live for governed 30/60/90 onboarding feedback initial requests. The daily job scans the ClickUp Agent Roster at 8:30 AM America/Toronto and the live sender fails closed outside the 8:30-10:00 AM America/Toronto send window. It uses Company Email only, BCCs Steve/Carson/Ryan/Georgia with To/BCC dedupe, writes ClickUp Requested only after Gmail succeeds, blocks duplicates through `agent_onboarding_feedback_send_attempts`, records non-resend repair state if Gmail succeeds but ClickUp Requested fails, and exposes enabled state, send window, last run, next run, and sent/skipped/blocked/warning/repair counts in Runtime/Ops.
43. Agent Feedback live reminders: `AGENT-FEEDBACK-LIVE-REMINDERS-001` is done under `agent-feedback-live-reminders-v1`. Live reminders are enabled for requested-but-not-completed onboarding feedback using the existing day 1, 3, 7, 10, 14, and 17 cadence after the initial Requested send. The reminder job runs at 8:30 AM America/Toronto and fails closed outside the 8:30-10:00 AM America/Toronto send window before Gmail, ClickUp, or reminder ledger side effects. It uses Company Email only, BCCs Steve/Carson/Ryan/Georgia with To/BCC dedupe, does not write ClickUp Requested, blocks duplicate reminder slots through `agent_onboarding_feedback_reminder_attempts`, stops after feedback is completed/skipped/blocked, and exposes live mode, next due, last run, next run, and sent/skipped/blocked/warning/repair counts in Runtime/Ops. Georgia Huntley Day-30 and Chris Chopite Day-30 have exactly one protected Requested initial attempt each; as of the proof run no reminder was due and both next reminder states were deferred to 2026-05-03T00:00:00.000Z.
44. System registration sweep: `SYSTEM-REGISTRATION-SWEEP-001` is done under `system-registration-sweep-v1`. `/api/source-of-truth` and Foundation Systems now include `SYS-SALES-GLS-001` as `GLS System / Get Listings Sold`, a live Sales system with routes `/sales#gls-dashboard` and `/sales#gls-system`, source truth ClickUp Deal Data Entry / `SRC-CLICKUP-001`, supporting evidence only from KPI Shopping List / `SRC-SUPABASE-001`, trigger active listings crossing stale threshold, owner lane Sales Leadership, and proof from `SALES-GLS-SCOREBOARD-V1`. `SYS-AGENT-ONBOARDING-FEEDBACK-001` remains visible as live under Agent Onboarding. `process:system-registration-sweep-check` and `foundation:verify` now protect shipped-system discoverability.
45. Foundation verification cleanup: `PLAN-CRITIC-ARCH-RULES-DOGFOOD-001`, `HUB-PERF-VERIFICATION-001`, `MONOLITH-SPLIT-CONTINUE-001`, and `RECURRING-DEEP-AUDIT-001` are done under `foundation-verification-cleanup-v1`. Plan Critic now dogfoods hot-route performance-budget rejection in addition to large-file, write-boundary, verifier-readonly, focused-proof, and audit-dogfood rules. Foundation Hub default route is measured fast (about 0.1s / 891 KB) while full diagnostics remains heavy (about 75s / 4.8 MB) and is queued as follow-up. Closeout records continue moving out of the oversized registry, and recurring senior-engineer deep audits are registered as manual/report-only cadence every 4-6 Foundation sprints or explicit Steve approval.
46. Foundation full diagnostics performance: `FOUNDATION-FULL-DIAGNOSTICS-PERF-001` and `FOUNDATION-HUB-FULL-ROUTE-SPLIT-001` are done under `foundation-full-diagnostics-perf-v1`. Profiling showed core Foundation snapshot time was under a second while Agent Feedback Auto-Send readiness could take about 82 seconds. Full diagnostics now bounds optional Agent Feedback / ClickUp panels, returns degraded `runtime_diagnostic_timeout` source health when that panel is slow, and keeps `/api/foundation-hub?view=full` under the new 15s / 5.5 MB budget in focused proof (about 11.1s / 4.71 MB on a fresh local server). `server.js` delegates that slow-path behavior to `lib/foundation-hub-full-diagnostics.js`; this is a partial route split, not a claim that the server monolith is solved.
47. Foundation DB seed governance: `DB-SEED-001` is done under `db-seed-v1`. The static backlog seed moved from `lib/foundation-db.js` into `lib/foundation-backlog-seed.js`, dropping the DB monolith from about 17,852 to 13,200 lines while preserving bootstrap behavior. `lib/foundation-db-seed-governance.js` now classifies seed/live drift as report-only governance: mutable drift such as seed `scoped` vs live `done` refuses default overwrite, and missing live rows are bootstrap candidates only. `initFoundationDb()` remains schema-only by default; explicit bootstrap still uses `bootstrapFoundationDb()`.
48. Verifier Foundation-DB split module: `VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001` is done under `verifier-foundation-db-split-module-v1`. The Foundation-DB split assertions for the eight shipped DB split cards moved from `scripts/foundation-verify.mjs` into `lib/foundation-db-split-verifier.js`, with a focused read-only proof script that rejects missing split evidence and old inline verifier predicates. This did not change Foundation-DB behavior, schema, seed, hub features, Canva assets, paid-source auth, Build Intel extraction, or Drive permissions.
49. Foundation DB shared-comms store split: `FOUNDATION-DB-MONOLITH-SPLIT-009` is done under `foundation-shared-comms-store-split-v1`. Shared-communications archive, candidate, synthesis, and review-application store behavior now lives in `lib/foundation-shared-comms-store.js`, with `foundation-db.js` preserving existing public exports as delegates. Focused dogfood proves the split rejects missing module ownership, old inline archive ownership, missing delegate wiring, and weak split plans. This was monolith cleanup only: no schema changes, source extraction, hub feature work, Canva assets, paid-source auth, Build Intel extraction, or Drive permissions.
50. Foundation DB LLM runtime store split: `FOUNDATION-DB-MONOLITH-SPLIT-010` is done under `foundation-llm-runtime-store-split-v1`. LLM credential, route, probe, call, runtime snapshot, stale-call read, and stale-call reaper behavior now lives in `lib/foundation-llm-runtime-store.js`, with `foundation-db.js` preserving existing public exports as delegates. Focused dogfood proves the split rejects missing module ownership, old inline LLM runtime ownership, missing delegate wiring, and weak split plans. This was monolith cleanup only: no LLM routing policy changes, provider auth changes, live model calls, schema changes, source extraction, hub feature work, Canva assets, paid-source auth, Build Intel extraction, or Drive permissions.
51. Foundation DB runtime/job store split: `FOUNDATION-DB-MONOLITH-SPLIT-011` is done under `foundation-runtime-job-store-split-v1`. Foundation runtime status, job controls, job schedule index, job run snapshot/lookup, job run metadata update, create/finish/stop, and stale job-run reaper behavior now lives in `lib/foundation-runtime-job-store.js`, with `foundation-db.js` preserving existing public exports as delegates. Focused dogfood proves the split rejects missing module ownership, old inline runtime/job ownership, missing delegate wiring, and weak split plans. This was monolith cleanup only: no Foundation job definition changes, schedule policy changes, live scheduled jobs, source extraction, connector auth changes, schema changes, hub feature work, Canva assets, paid-source auth, Build Intel extraction, or Drive permissions.
52. Foundation DB source-crawl store split: `FOUNDATION-DB-MONOLITH-SPLIT-012` is done under `foundation-source-crawl-store-split-v1`. Source crawl target/run/item mapping, target scheduling overlays, target leasing/finish, stale target-run reaping, item upsert/listing, retry classification/lease, attempt start/finish, stale item reaping, Drive/video extraction queue reads, extraction-control snapshots, extraction-hardening snapshots, and Drive corpus inventory snapshot behavior now lives in `lib/foundation-source-crawl-store.js`, with `foundation-db.js` preserving existing public exports as delegates. Focused dogfood proves the split rejects missing module ownership, old inline source-crawl ownership, missing delegate wiring, and weak split plans. This was monolith cleanup only: no source target definitions, schedule policy changes, retry policy changes, live scheduled jobs, source extraction, connector auth changes, schema changes, hub feature work, Canva assets, paid-source auth, Build Intel extraction, or Drive permissions.
53. Foundation DB Drive/Meeting Vault proof-store split: `FOUNDATION-DB-MONOLITH-SPLIT-013` is done under `foundation-drive-meeting-vault-store-split-v1`. Meeting raw Drive candidate listing, Drive Access preflight run storage, Meeting Vault ACL audit storage, Meeting Vault auto-enforcement run storage, and legacy exception reads now live in `lib/foundation-drive-meeting-vault-store.js`, with `foundation-db.js` preserving existing public exports as delegates. Focused dogfood proves the split rejects missing module ownership, old inline Drive/Meeting Vault ownership, missing delegate wiring, and weak split plans. This was proof-store cleanup only: no Drive permission mutation, request-access email, Meeting Vault Phase B, schema change, source extraction, connector auth change, hub feature work, Canva assets, paid-source auth, or Build Intel extraction.
54. Foundation DB Agent Feedback store split: `FOUNDATION-DB-MONOLITH-SPLIT-014` is done under `foundation-agent-feedback-store-split-v1`. Agent Onboarding Feedback response, send-attempt, reminder-attempt, and response-notification storage behavior now lives in `lib/foundation-agent-feedback-store.js`, with `foundation-db.js` preserving existing public exports as delegates. Focused dogfood proves the split rejects missing module ownership, old inline Agent Feedback ownership, missing delegate wiring, and weak split plans; synthetic fake-pool proof preserves response/send/reminder/notification object shapes. This was store cleanup only: no Gmail send, ClickUp writeback, reminder cadence, notification recipient policy, token policy, auth, route, UI, schema, source extraction, connector auth change, hub feature work, Canva assets, paid-source auth, Build Intel extraction, or Drive permissions.
55. Foundation DB Sales Listing store split: `FOUNDATION-DB-MONOLITH-SPLIT-015` is done under `foundation-sales-listing-store-split-v1`. Sales Listing assignment reads, tracked case reads, assignment upsert behavior, and GLS case-history mapping now live in `lib/foundation-sales-listing-store.js`, with `foundation-db.js` preserving existing public exports as delegates. Focused dogfood proves the split rejects missing module ownership, old inline Sales Listing ownership, missing delegate wiring, weak split plans, and a DB monolith still above 5,000 lines; synthetic fake-pool proof preserves create/update/list/case-history object shapes. This was store cleanup only: no ClickUp read, ClickUp writeback, listing sync cadence, case status semantic change, Sales Hub UI, auth, route, schema, source extraction, connector auth change, hub feature work, Canva assets, paid-source auth, Build Intel extraction, or Drive permissions.
56. Verifier Process Trust split: `VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001` is done under `verifier-process-trust-split-module-v1`. Process-trust proof for backlog hygiene, process hooks, fanout, worker served-code trust, done-card coverage, claimed artifacts, and post-ship fanout now lives in `lib/foundation-process-trust-verifier.js`, with `scripts/foundation-verify.mjs` preserving behavior through focused delegation. Focused dogfood rejects missing ship-check, fanout, worker served-code, done-card coverage, claimed-artifact, and post-ship fanout proof. This was verifier monolith cleanup only: no process policy change, route behavior change, source extraction, Canva, paid-source auth, Build Intel, Drive permission mutation, or hub feature work.
57. Verifier Canva Client split: `VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001` is done under `verifier-canva-client-split-module-v1`. The Canva client read-only/rotation-safe verifier predicate now lives in `lib/foundation-canva-client-verifier.js`, with `scripts/foundation-verify.mjs` preserving behavior through focused delegation and coverage aggregation. Focused dogfood rejects missing refresh token, missing rotation-safe bootstrap, exposed Canva write wrapper, and missing official read-plan evidence. This was verifier monolith cleanup only: no Canva writes, uploads, exports, design creation, asset-library sync, Marketing Video Lab wiring, route/auth/source/DB/backlog behavior change, paid-source auth, Build Intel extraction, Drive permission mutation, or hub feature work.
58. Foundation endpoint budgets: `FOUNDATION-ENDPOINT-BUDGETS-001` is done under `foundation-endpoint-budgets-v1`. Endpoint latency/payload budget state now lives in `lib/foundation-endpoint-budgets.js`, future nightly deep audit JSON artifacts persist `endpointMetrics`, and full Foundation Operating Reliability can show endpoint budget findings without measuring endpoints from the default Foundation Hub request path. Focused dogfood rejects the old 70-second / 4.63 MB endpoint failure class, over-800KB payload warnings, and missing endpoint metrics. This was operating reliability cleanup only: no route rewrite, hub UI feature work, Marketing Video Lab wiring, Canva asset-library features, paid-source auth, source extraction, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.
59. Source Lifecycle dynamic counts: `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001` is done under `source-lifecycle-dynamic-counts-v1`. Source Lifecycle completion now derives required/optional coverage from current source contracts instead of exact source-count baselines. Focused dogfood proves optional/future source additions do not fail completion while required sources without terminal coverage and terminal rules without source contracts fail closed. Historical docs can keep dated count labels as evidence, but live proof paths should not treat a fixed source count as the invariant.
60. Foundation frontend asset budgets: `FOUNDATION-FRONTEND-ASSET-BUDGET-001` is done under `foundation-frontend-asset-budget-v1`. Foundation frontend asset-budget state now lives in `lib/foundation-frontend-asset-budgets.js`, discovers local JS/CSS from `public/foundation.html`, measures raw/gzip size and served cache posture, and feeds the same snapshot into the nightly code-quality audit. Focused dogfood rejects oversized and missing assets, warns on large no-store assets, and rejects aggregate bloat. The live baseline is `14` Foundation assets at about `622 KB` raw / `124 KB` gzip with no risk-level failures; current `no-store` serving remains a visible review finding, not a hidden pass. This did not change cache headers, bundle assets, redesign Foundation UI, wire Marketing Video Lab, build Canva asset-library features, run paid-source auth, start Build Intel extraction, work Meeting Vault Phase B, or mutate Drive permissions.
61. KPI Health dynamic year contract: `KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001` is done under `kpi-health-dynamic-year-contract-v1`. KPI health RPC params now derive `target_year`, start dates, and end dates from one runtime period contract instead of fixed year-window literals. Focused dogfood rejects the old frozen prior-year params, proves a synthetic future runtime generates future-year params without code edits, and confirms live KPI health code no longer triggers the hardcoded-year detector. Snapshots expose `periodContract` metadata. This did not change KPI source data, Supabase schema, KPI dashboard behavior, Sales/Ops hub behavior, KPI writes, paid-source auth, source extraction, Build Intel extraction, Meeting Vault Phase B, or Drive permissions.
62. Foundation UI live summary sources: `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001` is done under `foundation-ui-live-summary-sources-v1`. Foundation Overview current-state system maturity rows now render from the source-backed `/api/foundation-hub` `currentStateSummary` payload instead of frontend-owned live-looking copy. Focused dogfood mutates KPI/current-sprint inputs and proves row copy follows payload truth without frontend edits, and the nightly audit now scans the renderer that used to own the stale static rows. This did not change KPI data, source contracts, DB schema, auth, external integrations, Marketing Video Lab wiring, Canva asset-library behavior, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permissions.
63. Foundation frontend DOM budgets: `FOUNDATION-FRONTEND-DOM-BUDGET-001` is done under `foundation-frontend-dom-budget-v1`. Foundation frontend DOM rebuild budget state now lives in `lib/foundation-frontend-dom-budgets.js`, discovers scripts from `public/foundation.html`, feeds the nightly audit through `domBudgetSnapshot`, and proves a real Current State renderer path in a VM fake DOM. Focused dogfood accepts small split renderers, warns on aggregate churn, and rejects heavy source and heavy route fixtures. Current repo baseline is review-level, not risk-level: `12` scripts, `1,567` createElement signals, `2,030` appendChild signals, and `63` innerHTML signals; VM Current State proof is healthy at `73` createElement and `72` appendChild operations. This did not optimize renderers, redesign Foundation UI, change routes, wire Marketing Video Lab, build Canva asset-library features, run paid-source auth, start Build Intel extraction, work Meeting Vault Phase B, or mutate Drive permissions.
64. Verifier operator-budget split: `VERIFIER-OPERATOR-BUDGET-SPLIT-MODULE-001` is done under `verifier-operator-budget-split-module-v1`. Route, endpoint, frontend asset, DOM, and verify-reporter budget checks now live in `lib/foundation-operator-budget-verifier.js`, with `scripts/foundation-verify.mjs` preserving behavior through focused delegation. Focused dogfood rejects old route latency, payload bloat, missing endpoint metrics, oversized/missing assets, heavy DOM churn, and weak failure-reporting behavior. The first full verifier run caught and repaired coverage-source aggregation plus exact Current Sprint doctrine wording before final verifier proof. This was verifier monolith cleanup only: no route behavior, auth, DB schema, hub features, Marketing Video Lab wiring, Canva asset-library behavior, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

65. Verifier hub-safety split: `VERIFIER-HUB-SAFETY-SPLIT-MODULE-001` is done under `verifier-hub-safety-split-module-v1`. Hub work coordination, safe hub lane, Foundation Hub backlog contract, and backlog detail endpoint checks now live in `lib/foundation-hub-safety-verifier.js`, with `scripts/foundation-verify.mjs` preserving behavior through focused delegation. Focused dogfood rejects missing hub ownership matrix, invalid writable hub consumer payload, bloated or broken backlog contract, missing backlog detail payload, and missing root delegation. This was verifier monolith cleanup only: no hub UI, route behavior, auth behavior, DB schema, Marketing Video Lab wiring, Canva asset-library behavior, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

66. Foundation identity surface: `FOUNDATION-IDENTITY-001` is done under `foundation-identity-surface-v1`. `/api/system-inventory` now exposes a metadata-only `identity` section tying repo-visible profile/runtime docs, local-private memory posture, active skills, and plugin counts together without copying private memory, `USER.md`, or raw local-only content into repo truth. Foundation System Inventory shows the same Workspace Identity panel, and source-trust verification now proves the identity surface stays metadata-only and does not treat plugins as source-truth signoff. This was owner-only identity visibility and privacy-boundary cleanup only: no auth broadening, Agent Registry, hub feature work, source extraction, Build Intel extraction, Canva asset-library behavior, Marketing Video Lab wiring, Meeting Vault Phase B, or Drive permission mutation.

67. Runtime Supervisor service supervision: `RUNTIME-SUPERVISOR-001` is done under `runtime-supervisor-v1`. Runtime process-control now exposes a two-service supervisor snapshot for the dashboard and Foundation worker with LaunchAgent status, pid matching, running commit trust, metadata freshness, restart commands, and log paths. Runtime Health renders the same supervised-service panel, and runtime reliability verification proves missing LaunchAgent, pid mismatch, stale commit, and stale heartbeat cases fail closed. This was visibility/proof work only: no auto-restart-on-push install, new scheduler framework, job execution semantic changes, route/auth changes, DB schema changes, hub feature work, source extraction, Build Intel extraction, Canva asset-library behavior, Marketing Video Lab wiring, Meeting Vault Phase B, or Drive permission mutation.

68. Runtime Worker reliability: `RUNTIME-WORKER-001` is done under `runtime-worker-reliability-v1`. Foundation job snapshots now include `workerReliability` with scheduled/due counts, failed latest runs, retry candidates, blocked scheduled jobs, stale active runs, fail-closed dry-run posture, and plain-English operator status. Runtime Health renders the worker reliability summary in Foundation Jobs, default `/api/foundation-hub` preserves a compact worker summary, and the focused proof caught/fixed the one-shot dry-run status-poisoning bug so `npm run foundation:worker -- --once --dry-run` cannot overwrite the long-running LaunchAgent worker pid truth. This was reliability/proof work only: no scheduler framework, new jobs, auto-retry behavior, auto-restart-on-push install, hub features, source extraction, Build Intel extraction, Canva asset-library behavior, Marketing Video Lab wiring, Meeting Vault Phase B, or Drive permission mutation.

Guardrail: Agent Feedback production enablement, live reminders, the system registration sweep, `SECURITY-002` auth/tier/redaction v1, `FOUNDATION-SPRINT-CADENCE-001` under `foundation-sprint-cadence-v1`, and `MEETING-VAULT-AUTO-ENFORCEMENT-001` under `meeting-vault-auto-enforcement-v1` are in place. Meeting Vault now closes Foundation readiness through automatic report-only forward-flow proof and a bounded legacy exception queue, not through more historical permission batches. `FOUNDATION-SPRINT-REVIEW-001` is complete in `docs/process/foundation-sprint-review-001.md`; Foundation reports READY only for owner-only Strategy re-entry. Next work is:

1. Close the sprint review and decide whether the next active product behavior card is `REPLY-WATCHING-LOOP-001`.
2. Review `STRATEGY-HUB-MEETING-READY-001` in practice before promoting Scoper, Strategic Intelligence, or advisor-style work.
3. Decide separately whether to install a permanent periodic auto-pull LaunchAgent for the deploy runner; v1 intentionally did not install it.
4. Keep `SECURITY-FILTERED-COMMS-ACCESS-001` separate; security behavior proof did not open shared communications to non-Tier-1 users.
5. Keep historical Meeting Vault cleanup as a later separately approved legacy-exception sprint, not current Foundation readiness work.

## Active Docs Only

Trust these first:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/intelligence-pipeline.md`
- `docs/rebuild/current-runtime-map.md`
- `docs/rebuild/agent-architecture.md`
- `docs/rebuild/doc-cleanup-plan.md`
- `docs/rebuild/owners-closeout.md`
- `docs/system-strategy.md`
- `docs/source-registry.md`

Evidence indexes:

- `docs/handoffs/INDEX.md`
- `docs/audits/INDEX.md`

Treat all other handoffs/audits as evidence unless promoted here or linked from the active docs.

## What Is Not Next

- not a full runtime pivot
- not Harlan migration before runtime/source trust
- not a 32-script router rewrite; route one workload family at a time after real adapter proof
- not multi-agent sprawl
- not another giant manual backfill marathon
- not manually auditing hundreds of rows with Steve
- not rebuilding KPI inside AI OS before read rules are locked
- not sales coach / ops hub automations before Owners, FUB, KPI, and source trust are stable
- not deleting handoffs blindly

## Review Cadence

Every major build block needs a checkpoint:

- what shipped?
- what is registered/scheduled/visible?
- what is still manual?
- what source facts changed?
- what backlog cards were closed/enriched?
- what docs became superseded?
- what should run without Steve tonight?

If the answer is unclear, the block is not done.

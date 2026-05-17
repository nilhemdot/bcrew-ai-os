# KNOWLEDGE-BASE-QUALITY-GATE-001 Plan

Card: `KNOWLEDGE-BASE-QUALITY-GATE-001`

Closeout key: `knowledge-base-quality-gate-v1`

## What

Define and prove the Foundation-owned fail-closed quality gate for compiled knowledge before agents can query, cite, or treat compiled KB pages as current truth.

The gate covers:

- citations and source IDs
- stale or fuzzy freshness expectations
- contradiction checks
- oversized compiled pages
- orphan pages
- missing frontmatter
- privacy/tier violations
- unsourced doctrine

## Why

`FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001` defined the raw source -> compiled wiki -> query contract -> feedback loop. This card makes the quality-gate part executable so the KB direction cannot become transcript dumps, stale pages, Harlan-only memory, or uncited doctrine.

Operator value: Steve and future agents get a clear stop/go contract for compiled knowledge before extraction/runtime work creates more data pressure. The useful behavior is fail-closed proof over bad compiled-page fixtures, not a live extraction or visual UI build.

## Acceptance Criteria

- Live backlog card is enriched and moved through Current Sprint truth from `scoping` to `sprint_ready` to `building_now` to `done_this_sprint`.
- `lib/foundation-knowledge-base-quality-gate.js` defines the compiled-page quality gate and its validator.
- The quality gate checks citations/source IDs, freshness, contradictions, page size, orphan pages, frontmatter, privacy/tier, and unsourced doctrine.
- Dogfood rejects synthetic bad compiled pages for each required failure class.
- Valid synthetic no-auth/no-live compiled-page fixtures pass.
- Focused proof is registered in `package.json`.
- Foundation intelligence/audit verifier covers the gate through behavior functions, not substring-only proof.
- Closeout registry and handoff are present.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.
- No live extraction, transcript fetch, screenshot capture, crawl, summarization, model call, compiled KB write, query index write, atom creation, Research Inbox write, or backlog mutation from extracted content occurs.

## Definition Of Done

Done means `KNOWLEDGE-BASE-QUALITY-GATE-001` is a live done card under `knowledge-base-quality-gate-v1`, Current Sprint is closed with complete scaffold metadata, the focused proof passes, the full Foundation ship gate passes, and the commit is pushed.

Done does not mean live compiled KB pages exist. The next build card is `AIOS-RUNTIME-PORTABILITY-GATE-001`.

## Details

Existing work to reuse:

- Existing code: `lib/foundation-knowledge-base-compiler-design.js`, `lib/build-intel-karpathy-llm-kb-preflight.js`, `lib/foundation-intelligence-audit-verifier.js`, and `lib/build-lane-reliability.js`.
- Existing docs: `docs/process/foundation-knowledge-base-compiler-design-001-plan.md`, `docs/handoffs/2026-05-17-foundation-knowledge-base-compiler-design-closeout.md`, `docs/handoffs/2026-05-17-build-intel-karpathy-llm-kb-preflight-closeout.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `scripts/process-foundation-knowledge-base-compiler-design-check.mjs`, `scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs`, `scripts/foundation-verify.mjs`, backlog hygiene, and `process:foundation-ship`.
- Live backlog and Current Sprint truth: use the live DB card and overlay, not a handoff-only label.
- Reused policy: Foundation owns source contracts, ingestion permission, compiler rules, quality gates, and query interface; Harlan/Codex/other agents consume only after Foundation owns it.

Behavior proof:

- The focused proof calls the actual function paths `buildKnowledgeBaseQualityGate()`, `evaluateKnowledgeBaseQualityGate()`, and `buildKnowledgeBaseQualityGateDogfoodProof()`.
- Dogfood uses synthetic compiled-page fixtures for missing frontmatter, missing citations/source IDs, stale freshness, unresolved contradictions, oversized pages, orphan pages, privacy/tier violations, unsourced doctrine, and live-run attempts.
- No substring-only proof is accepted; substring-only proof is rejected. Source-label checks may prove registration only, and they are not accepted without function-path dogfood.
- API/process behavior comes through live backlog readback, Current Sprint metadata, Plan Critic rows, package script registration, closeout registry, verifier coverage, and full `process:foundation-ship`.

Gate decision tree:

- This card uses fast static syntax checks and focused proof while iterating.
- Target focused proof runtime is under 5 minutes; repair targeted failures instead of running repeated full gates.
- Full `foundation:verify` runs once the focused proof is green, and full `process:foundation-ship` runs before push.
- This is proportional because the card touches Foundation process artifacts, verifier coverage, package scripts, and current-state docs, but it does not run extraction or create runtime data.
- If proof fails or behavior regresses, stop on the focused failure, repair the failing quality-gate rule or process artifact, rerun the targeted focused check, and do not close the card or run ship until the bad fixture fails closed again.
- If the failure reveals a larger compiler/runtime implementation gap, leave the card returned or route a new explicit follow-up card instead of weakening the gate.

Foundation approved active sprint scope. Requested shared files are declared: `package.json`, `scripts/foundation-verify.mjs`, `lib/foundation-intelligence-audit-verifier.js`, `lib/foundation-build-closeout-cleanup-records.js`, `lib/foundation-verify-coverage-card-ids.js`, `docs/process/*`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`. This is main-session Foundation process work, not side, hub, extractor runtime, or feature work.

File-size and artifact budget:

- New hand-written module target: under 1,500 lines.
- New focused proof script target: under 1,500 lines.
- Approval JSON data-record budget: under 5 KB.
- Closeout/report artifact budget: under 12 KB.
- Plan artifact budget: under 12 KB.
- No generated data file, compiled page, query index, vector table, atom record, Research Inbox record, or extraction run record is created.
- `scripts/foundation-verify.mjs` is over the preferred hand-written module budget, so this card adds only a thin coverage import while behavior lives in the focused quality-gate module and intelligence/audit verifier.
- `lib/foundation-intelligence-audit-verifier.js` is over the preferred hand-written module budget, so this card adds one bounded quality-gate check and synthetic fixture only; no new unrelated intelligence/audit responsibility is added.
- `lib/foundation-build-closeout-cleanup-records.js` is a registry artifact above the preferred hand-written module budget, so this card adds one record only and does not add behavior there.
- Split plan: oversized shared files receive thin registration/check wiring only with no new responsibility; durable quality-gate behavior lives in `lib/foundation-knowledge-base-quality-gate.js`.

Read/write posture:

- Verifier/check read paths must fail closed and report missing artifacts or bad compiled-page fixtures.
- Live backlog, Plan Critic, and Current Sprint writes are allowed only when the focused proof is invoked with explicit `--apply` or `--close-card`.
- No verifier path may silently seed live state, repair data, run extraction, or create compiled KB output just to pass.

## Risks

- Scope drift into live extraction, transcript fetching, model calls, compiled output writes, or query-index implementation. Mitigation: dogfood fails live-run and output-write variants.
- Scope drift into Harlan-only memory. Mitigation: quality gate is Foundation-owned and agents remain consumers only after Foundation query contracts pass.
- Brittle proof. Mitigation: proof must call the actual validator and dogfood bad fixtures; source checks are registration support only.
- Verifier bloat. Mitigation: new behavior lives in `lib/foundation-knowledge-base-quality-gate.js`; root verifier gets registration/coverage only.

Not next:

- No live extraction.
- No transcript fetch, screenshot capture, crawl, summarization, or model call.
- No compiled KB pages, query index, vector table, atom creation, Research Inbox write, or backlog mutation from extracted content.
- No auth-required or paid extraction without Steve approval.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad UI redesign.
- Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.
- Do not mutate Google Drive permissions.
- No live Agent Feedback auto-send.

## Tests

Use the focused loop first:

```bash
node --check lib/foundation-knowledge-base-quality-gate.js lib/foundation-intelligence-audit-verifier.js scripts/process-knowledge-base-quality-gate-check.mjs scripts/foundation-verify.mjs
npm run process:knowledge-base-quality-gate-check -- --apply --stage=scoping --json
npm run process:knowledge-base-quality-gate-check -- --apply --stage=sprint_ready --json
npm run process:knowledge-base-quality-gate-check -- --apply --stage=building_now --json
```

Then run the final gate set:

```bash
npm run process:knowledge-base-quality-gate-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=KNOWLEDGE-BASE-QUALITY-GATE-001 --planApprovalRef=docs/process/approvals/KNOWLEDGE-BASE-QUALITY-GATE-001.json --closeoutKey=knowledge-base-quality-gate-v1 --commitRef=HEAD
```

Gate choice: static syntax checks and focused proof while iterating; full `foundation:verify` and `process:foundation-ship` once the focused proof is green.

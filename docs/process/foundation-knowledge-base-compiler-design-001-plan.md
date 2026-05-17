# FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 Plan

Card: `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`

Closeout key: `foundation-knowledge-base-compiler-design-v1`

## What

Define the Foundation-owned design contract for a knowledge compiler before any agent, extractor, or Harlan memory feature consumes a Karpathy-style knowledge base.

The contract covers:

- raw sources and source contracts
- ingestion permission
- raw evidence envelopes
- compiler rules for markdown/wiki pages
- compiled page frontmatter and citation policy
- query/Q&A contract
- operator feedback and repair loop
- quality-gate dependency through `KNOWLEDGE-BASE-QUALITY-GATE-001`

## Why

Steve wants the building system moving, but the Karpathy KB idea can become system debt if it turns into a transcript dump, Harlan-only memory, or direct agent facts without Foundation source contracts. Foundation needs to own the source contract, ingestion permission, compiler rules, query contract, quality gate, and feedback loop first. Agents consume second.

## Acceptance Criteria

- Live backlog card is enriched and moved through Current Sprint truth from `scoping` to `sprint_ready` to `building_now` to `done_this_sprint`.
- `lib/foundation-knowledge-base-compiler-design.js` defines the Foundation-owned pipeline: source contracts -> ingestion permission -> raw evidence envelope -> compiler rules -> compiled wiki -> query contract -> feedback loop -> quality gate.
- Dogfood rejects Harlan-only memory ownership, raw transcript dumps, missing quality gate, direct agent consumption, and live extraction.
- Focused proof is registered in `package.json`.
- Foundation intelligence/audit verifier covers the design through behavior functions, not substring-only proof.
- Closeout registry and handoff are present.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001` is a live done card under `foundation-knowledge-base-compiler-design-v1`, the Current Sprint item is closed with complete scaffold metadata, the focused proof passes, the full Foundation ship gate passes, and the commit is pushed.

Done does not mean compiled KB implementation exists. The next build card is `KNOWLEDGE-BASE-QUALITY-GATE-001`.

## Details

This sprint is design/proof only. It creates a compiler contract module and focused proof that fail closed if the design drifts into:

- live extraction
- transcript fetches, screenshot capture, crawl, summarization, or model calls
- compiled page writes
- query index/vector table writes
- Research Inbox writes
- atom creation
- backlog mutation from extracted content
- Harlan-only memory ownership
- direct agent consumption before Foundation owns the query contract

Existing work to reuse:

- Existing code: `lib/build-intel-karpathy-llm-kb-preflight.js`, `lib/extractor-queue-karpathy-kb-video-pack.js`, `lib/foundation-extraction-runtime-verifier.js`, `lib/foundation-intelligence-audit-verifier.js`, and `lib/build-lane-reliability.js`.
- Existing docs: `docs/process/build-intel-karpathy-llm-kb-preflight-001-plan.md`, `docs/handoffs/2026-05-17-build-intel-karpathy-llm-kb-preflight-closeout.md`, `docs/handoffs/2026-05-17-extractor-queue-karpathy-kb-video-pack-closeout.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs`, `scripts/process-extractor-queue-karpathy-kb-video-pack-check.mjs`, `scripts/foundation-verify.mjs`, backlog hygiene, and `process:foundation-ship`.
- Live backlog and Current Sprint truth: use the live DB card and overlay, not a handoff-only label.
- Reused policy: Foundation owns source contracts, ingestion permission, compiler rules, quality gates, and query interface; Harlan/Codex/other agents consume only after Foundation owns it.

Behavior proof:

- The focused proof calls the actual function paths `buildFoundationKnowledgeBaseCompilerDesign()`, `validateFoundationKnowledgeBaseCompilerDesign()`, and `buildFoundationKnowledgeBaseCompilerDesignDogfoodProof()`.
- Dogfood uses synthetic unsafe designs for Harlan-only ownership, transcript dumps, missing quality gates, direct agent consumption, and live extraction.
- No substring-only proof is accepted; substring-only proof is rejected. Source-label checks may prove registration only, and they are not accepted without function-path dogfood.
- API/process behavior comes through live backlog readback, Current Sprint metadata, Plan Critic rows, package script registration, closeout registry, verifier coverage, and full `process:foundation-ship`.

Gate decision tree:

- This card uses fast static syntax checks and focused proof while iterating.
- Target focused proof runtime is under 5 minutes; repair targeted failures instead of running repeated full gates.
- Full `foundation:verify` runs once the focused proof is green, and full `process:foundation-ship` runs before push.
- This is proportional because the card touches Foundation process artifacts, verifier coverage, package scripts, and current-state docs, but it does not run extraction or create runtime data.

Foundation approved active sprint scope. Requested shared files are declared: `package.json`, `scripts/foundation-verify.mjs`, `lib/foundation-intelligence-audit-verifier.js`, `lib/foundation-build-closeout-cleanup-records.js`, `lib/foundation-verify-coverage-card-ids.js`, `docs/process/*`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`. This is main-session Foundation process work, not side, hub, extractor runtime, or feature work.

File-size and ownership plan:

- New hand-written module and focused proof stay below the preferred 1,500-line budget.
- `scripts/foundation-verify.mjs` is over 1,500 lines, so this card adds no new responsibility there; it only imports a coverage constant while behavior lives in the focused intelligence/audit verifier module.
- No generated data file is created.
- Approval JSON data-record budget: under 5 KB.
- Closeout/report artifact budget: under 12 KB.
- Plan artifact budget: under 12 KB.
- No compiled page, query index, vector table, atom record, Research Inbox record, or extraction run record is created.
- Shared Foundation files are touched only for verifier/package/closeout registration. If unrelated local changes appear in shared files, stop and reconcile before commit.

## Risks

- Scope drift into extraction, transcript fetching, model calls, or compiled output writes. Mitigation: dogfood fails live extraction/model/output variants.
- Scope drift into Harlan-only memory. Mitigation: owner must be Foundation and consumers are blocked until Foundation query contract exists.
- Verifier bloat. Mitigation: new behavior lives in `lib/foundation-knowledge-base-compiler-design.js`; root verifier gets registration/coverage only.
- Queue drift. Mitigation: focused proof checks live backlog, Current Sprint metadata, Plan Critic, closeout registry, and next card.

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
node --check lib/foundation-knowledge-base-compiler-design.js lib/foundation-intelligence-audit-verifier.js scripts/process-foundation-knowledge-base-compiler-design-check.mjs scripts/foundation-verify.mjs
npm run process:foundation-knowledge-base-compiler-design-check -- --apply --stage=scoping --json
npm run process:foundation-knowledge-base-compiler-design-check -- --apply --stage=sprint_ready --json
npm run process:foundation-knowledge-base-compiler-design-check -- --apply --stage=building_now --json
```

Then run the final gate set:

```bash
npm run process:foundation-knowledge-base-compiler-design-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001.json --closeoutKey=foundation-knowledge-base-compiler-design-v1 --commitRef=HEAD
```

Gate choice: static syntax checks and focused proof while iterating; full `foundation:verify` and `process:foundation-ship` once the focused proof is green.

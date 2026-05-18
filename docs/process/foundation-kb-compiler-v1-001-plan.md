# FOUNDATION-KB-COMPILER-V1-001 Plan

Card: `FOUNDATION-KB-COMPILER-V1-001`

Closeout key: `foundation-kb-compiler-v1`

## What

Build the first Foundation-owned KB compiler path. V1 compiles existing source-backed records into a proposal-only KB/wiki draft contract with source IDs, citations, freshness metadata, privacy/tier metadata, compiler frontmatter, contradiction status, and quality-gate pass/fail.

The compiler reads existing records only:

- `intelligence_synthesis_facts`
- locked `decisions`
- `intelligence_atoms`

It does not run extraction, fetch transcripts, capture screenshots, crawl, summarize, call models, create compiled pages, build query/vector indexes, write Research Inbox, create atoms, or mutate backlog from compiled content.

## Why

Steve wants the building system moving again, but Foundation cannot safely resume extractor/agent expansion until the memory/KB direction has executable plumbing. The useful operator behavior is a source-backed draft path: Foundation can show how existing facts, decisions, and atoms become a cited KB draft before agents or hubs consume that knowledge.

This turns the Karpathy-style raw data -> compiled wiki -> query/Q&A -> quality loop from design into a small, proven Foundation path without adding new data pressure.

## Acceptance Criteria

- Live backlog card exists and is enriched as P0 Foundation work.
- Current Sprint moves cleanly from `scoping` to `sprint_ready` to `building_now` to `done_this_sprint`.
- `lib/foundation-kb-compiler-v1.js` defines the compiler contract, draft builder, and dogfood proof.
- The compiler uses existing source-backed facts, locked decisions, and atoms.
- Draft frontmatter includes source IDs, privacy tier, compiler version, `lastCompiledAt`, and `staleAfter`.
- Every compiled claim has a matching citation/evidence ref and source ID.
- The shipped `evaluateKnowledgeBaseQualityGate()` accepts the healthy draft.
- Dogfood rejects missing source IDs, missing citation/evidence refs, stale freshness, and live extraction/model/external-write/compiled-page-write attempts.
- Output stays proposal-only with no compiled page, query index, vector table, Research Inbox, atom, or backlog writes.
- Focused proof is registered in `package.json`.
- Foundation verifier coverage proves the behavior through function paths; reject substring-only proof.
- Closeout registry and handoff are present.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.
- No extraction, transcript fetch, screenshot capture, crawl, summarization, model call, provider probe, auth-required or paid run, external write, Harlan/Fal/voice/Canva/OpenHuman feature work, Drive permission mutation, or Agent Feedback auto-send occurs.

## Definition Of Done

Done means `FOUNDATION-KB-COMPILER-V1-001` is a live done card under `foundation-kb-compiler-v1`, Current Sprint is closed with complete scaffold metadata, the focused proof passes, full Foundation ship gate passes, closeout is registered, and the commit is pushed.

Done does not mean live extraction, model summarization, compiled-page storage, query indexing, Research Inbox promotion, atom creation, or agent consumption exists. The next card is `ACTION-ROUTE-REVIEW-INBOX-001`.

## Details

Existing work to reuse:

- Existing code: `lib/foundation-knowledge-base-compiler-design.js`, `lib/foundation-knowledge-base-quality-gate.js`, `lib/build-intel-karpathy-llm-kb-preflight.js`, `lib/intelligence-atoms.js`, `lib/intelligence-synthesis-facts.js`, `lib/foundation-intelligence-audit-verifier.js`, and `lib/build-lane-reliability.js`.
- Existing docs: `docs/process/foundation-knowledge-base-compiler-design-001-plan.md`, `docs/process/knowledge-base-quality-gate-001-plan.md`, their closeouts, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `scripts/process-foundation-knowledge-base-compiler-design-check.mjs`, `scripts/process-knowledge-base-quality-gate-check.mjs`, `scripts/foundation-verify.mjs`, backlog hygiene, and `process:foundation-ship`.
- Existing policy: Foundation owns source contracts, ingestion permission, compiler rules, quality gates, and query interface; agents consume after Foundation owns it.
- Live backlog and Current Sprint truth: use the live DB card and overlay, not a handoff-only label.

Behavior proof:

- The focused proof calls `compileFoundationKbDraft()` and `buildFoundationKbCompilerV1DogfoodProof()`.
- The live proof samples existing source-backed facts, locked decisions, and atoms, then compiles them through `evaluateKnowledgeBaseQualityGate()`.
- Dogfood uses synthetic invalid records for missing source ID, missing citation/evidence ref, stale freshness, and unsafe live run attempts.
- Source checks only prove registration. They are not accepted without compiler and quality-gate behavior, and substring-only proof is rejected.

Gate decision tree:

- Use static syntax checks and focused proof while iterating.
- Target focused proof runtime is under 5 minutes; repair targeted failures instead of running repeated full gates.
- Full `foundation:verify` runs once focused proof is green, and full `process:foundation-ship` runs before push.
- If the compiler cannot find existing source-backed records, stop and route that as source/atom truth drift rather than falling back to live extraction.
- If the quality gate rejects a valid draft, repair the compiler/quality contract or route the red item before closing.
- Repair path: if focused proof fails, keep the card open, fix the failing compiler/quality-gate/process invariant, rerun the focused proof, and only then proceed to full `foundation:verify` and `process:foundation-ship`. If behavior regresses after ship, reopen or create a follow-up against `FOUNDATION-KB-COMPILER-V1-001` instead of weakening the gate.

Requested shared files are declared: `package.json`, `scripts/foundation-verify.mjs`, `lib/foundation-intelligence-audit-verifier.js`, `lib/foundation-build-closeout-cleanup-records.js`, `lib/foundation-verify-coverage-card-ids.js`, `docs/process/*`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`. This is Foundation compiler plumbing, not extractor, connector auth, Harlan, Fal, voice, Canva, OpenHuman, or hub feature work. The active sprint owns these edits in this worktree; any parallel builder needing them must coordinate before edit, commit, push, merge, or ship.

File-size and artifact budget:

- Split plan: new module `lib/foundation-kb-compiler-v1.js` owns the compiler behavior. Existing over-budget files receive no new responsibility; they only get bounded registration/check wiring.
- New hand-written module target: under 1,500 lines.
- New focused proof script target: under 1,500 lines.
- Explicit file-size budget for the approval JSON data record: under 5 KB.
- Explicit file-size budget for the closeout/report artifact: under 12 KB.
- Explicit file-size budget for the plan artifact: under 12 KB.
- No generated data file, extraction run record, model call record, connector auth record, compiled KB page, query index, vector table, Research Inbox row, atom, or backlog card from compiled content is created.
- `scripts/foundation-verify.mjs`, `lib/foundation-intelligence-audit-verifier.js`, and `lib/foundation-build-closeout-cleanup-records.js` are above the preferred hand-written module budget, so this card adds only bounded registration/check wiring there and moves compiler behavior into the new under-budget module.

Read/write posture:

- Live backlog, Plan Critic, and Current Sprint writes are allowed only when the focused proof is invoked with explicit `--apply` or `--close-card`.
- The compiler and verifier paths must not seed live state, repair data, run extraction, call models/providers, mutate runtime config, write external systems, create compiled pages, or build agents to pass.
- Verifier/check read-only posture: zero repairs in read-only mode, no live state mutation without explicit apply posture, and checks fail closed with a routed repair path.

## Risks

- Scope drift into live extraction or transcript/video work. Mitigation: V1 reads existing records only and dogfood rejects live-run attempts.
- Scope drift into model summarization. Mitigation: no model call is needed; draft generation is deterministic and source-backed.
- Scope drift into writing compiled pages or indexes. Mitigation: V1 returns proposal-only drafts and proof fails if trusted write flags turn on.
- Private/sensitive leakage. Mitigation: use source IDs, citations/evidence refs, privacy tier, and quality gate before agent consumption.
- False confidence from string checks. Mitigation: proof calls compiler and quality-gate functions; source checks are registration support only.
- Slow build loop. Mitigation: focused proof first, full verifier only after focused green.

Not next:

- No live extraction.
- No transcript fetch, screenshot capture, crawl, summarization, or model call.
- No auth-required or paid run.
- No provider/model probe.
- No external write.
- No compiled page write, query index write, vector table write, Research Inbox write, atom creation, or backlog mutation from compiled content.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad UI redesign.
- Do not work `MEETING-VAULT-ACL-001` Phase B from this sprint.
- Do not mutate Google Drive permissions.
- No live Agent Feedback auto-send.

## Tests

Use the focused loop first:

```bash
node --check lib/foundation-kb-compiler-v1.js lib/foundation-intelligence-audit-verifier.js scripts/process-foundation-kb-compiler-v1-check.mjs scripts/foundation-verify.mjs
npm run process:foundation-kb-compiler-v1-check -- --apply --stage=scoping --json
npm run process:foundation-kb-compiler-v1-check -- --apply --stage=sprint_ready --json
npm run process:foundation-kb-compiler-v1-check -- --apply --stage=building_now --json
```

Then run the final gate set:

```bash
npm run process:foundation-kb-compiler-v1-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=FOUNDATION-KB-COMPILER-V1-001 --planApprovalRef=docs/process/approvals/FOUNDATION-KB-COMPILER-V1-001.json --closeoutKey=foundation-kb-compiler-v1 --commitRef=HEAD
```

Gate choice: static syntax checks and focused proof while iterating; full `foundation:verify` and `process:foundation-ship` once the focused proof is green.

# VERIFIER-MONOLITH-SPLIT-CONTINUE-002 Plan

## What

Extract the source-contract/signoff verifier checks from `scripts/foundation-verify.mjs` into a focused module:

- source-contract object truth for `SRC-OWNERS-001`, `SRC-FINANCE-001`, and `SRC-FREEDOM-COMMUNITY-001`
- source-registry documentation truth for signed-off validation units and tab/range coverage
- current-state boundary truth for the Owners Lists mirror / helper tab source boundary

V1 adds `lib/foundation-source-contract-verifier.js` and `scripts/process-verifier-source-contracts-module-check.mjs`. The canonical verifier still emits the same source-contract check labels; it just delegates their logic to the focused module.

## Why

`scripts/foundation-verify.mjs` is over 15,000 lines. The verifier is trustworthy now, but it is still too large to safely review. Every future cleanup that adds another inline verifier block repeats the old-system drift pattern.

This card keeps the Foundation strong by moving one coherent verifier domain into a named module with dogfood proof. The useful operator behavior is simple: when Steve sees source-contract checks pass, the proof is small enough to inspect and specific enough to trust instead of hiding source-truth drift inside a 15K-line verifier. That improves quality in the real workflow Steve actually uses every sprint: read the board, trust the source-contract green checks, and decide whether Foundation is safe enough to keep building.

## Acceptance Criteria

- `lib/foundation-source-contract-verifier.js` owns source-contract/signoff verifier definitions and evaluation logic.
- `scripts/foundation-verify.mjs` imports and delegates to that module instead of keeping those checks inline.
- The canonical verifier still records the same source-contract and source-registry PASS/FAIL rows.
- Focused proof dogfoods healthy and broken fixtures:
  - healthy source contracts pass,
  - missing Owners signoff fails,
  - missing required signed-off tab fails,
  - missing registry source row fails,
  - stale current-state mirror boundary fails.
- Focused proof rejects substring-only theater: module delegation is not enough unless broken fixtures fail.
- The proof script is read-only by default and has no DB mutation, file-write, or `--apply` path.
- Line-count delta for `scripts/foundation-verify.mjs` is recorded.
- Live backlog, Current Sprint, Plan Critic run, approval, closeout, Recent Builds, and verifier coverage all name `VERIFIER-MONOLITH-SPLIT-CONTINUE-002` and `verifier-source-contracts-module-v1`.

## Definition Of Done

- `VERIFIER-MONOLITH-SPLIT-CONTINUE-002` closes under `verifier-source-contracts-module-v1`.
- `docs/process/verifier-source-contracts-module-001-plan.md` and `docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-002.json` exist and validate.
- `plan_critic_runs` has a durable pass row at `9.8+`.
- `scripts/process-verifier-source-contracts-module-check.mjs` passes and proves healthy/broken fixtures.
- `scripts/foundation-verify.mjs` delegates source-contract verifier behavior through `evaluateFoundationSourceContractVerifier`.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse:

- current source-contract checks in `scripts/foundation-verify.mjs`
- `lib/source-contracts.js`
- `lib/foundation-route-split-verifier.js`
- `lib/foundation-route-budget-verifier.js`
- `lib/approval-integrity.js`

Existing docs to reuse:

- `docs/source-registry.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/process/verifier-monolith-split-continue-001-plan.md`
- `AGENTS.md` Foundation rebuild discipline

Existing scripts to reuse:

- `npm run foundation:verify -- --json-summary`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-ship`
- prior verifier module focused proof scripts

Live backlog and Current Sprint truth to reuse: `VERIFIER-MONOLITH-SPLIT-CONTINUE-002` is active in `verifier-source-contracts-module-2026-05-15`, initially in Scoping until this plan, approval, and Plan Critic pass row are present.

Gate decision tree: this is full-risk Foundation verification work because it touches the canonical verifier, package scripts, closeout records, Current Sprint truth, and rebuild docs. Static checks and focused proof run first. Full `process:foundation-ship` is required before push.

Large-file split/extraction plan: this card touches `scripts/foundation-verify.mjs`, already over the `5,000` line architecture-risk threshold, but the change removes a coherent inline domain and adds a thin delegation call. No new verifier responsibility is added to the large file; responsibility moves out into `lib/foundation-source-contract-verifier.js`. If the work starts expanding into unrelated verifier checks, stop and create a separate card.

## Risks

- Risk: check semantics change while moving code.
  - Response: focused dogfood covers both healthy and broken fixtures, and full `foundation:verify` must still pass.
- Risk: this becomes a broad verifier rewrite.
  - Response: only source-contract/signoff checks move. No route checks, hub checks, Build Intel checks, Agent Feedback checks, or DB checks move in this card.
- Risk: proof becomes source-substring theater.
  - Response: proof must show broken source-contract, registry, and current-state fixtures fail.
- Risk: the proof script mutates live truth.
  - Response: focused proof script is read-only and rejects mutation tokens in its own source.

Repair path: if focused proof fails, keep the card in Building Now, restore the moved source-contract check semantics from the current verifier, fix the module fixture that failed, rerun the focused proof, and only then rerun full `foundation:verify`. If full ship fails after focused proof passes, do not weaken the verifier; either adjust the module to preserve the old row exactly or revert this card's extraction and leave `VERIFIER-MONOLITH-SPLIT-CONTINUE-002` open for a smaller slice.

## Tests

```bash
node --check lib/foundation-source-contract-verifier.js scripts/process-verifier-source-contracts-module-check.mjs scripts/foundation-verify.mjs
npm run process:verifier-source-contracts-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-MONOLITH-SPLIT-CONTINUE-002 --planApprovalRef=docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-002.json --closeoutKey=verifier-source-contracts-module-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by feeding the module bad fixtures that should fail but can become easy to miss when the verifier is a 15K-line file. Substring-only proof is rejected because the focused proof must demonstrate real pass/fail behavior from the extracted module.

## Not Next

- Do not rewrite the whole verifier.
- Do not split `lib/foundation-db.js` in this card.
- Do not split frontend, CSS, or server routes in this card.
- Do not build Build Intel extraction.
- Do not build hub features, Marketing Video Lab wiring, Sales/Ops UI, or source writeback.
- Do not start paid-source auth, Skool/myICOR/Loom extraction, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.

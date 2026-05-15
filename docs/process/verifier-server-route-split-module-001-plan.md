# VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001 Plan

Card: `VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001`
Sprint: `verifier-server-route-split-module-2026-05-15`
Closeout key: `verifier-server-route-split-module-v1`

## What

Extract the server-route split verifier checks from `scripts/foundation-verify.mjs` into a focused module:

- FUB source route split checks,
- Foundation runtime read route split checks,
- app page route split checks,
- auth route split checks,
- hub read route split checks,
- Strategy/shared-comms route split checks,
- Foundation write route split checks,
- Agent Feedback public route split checks.

V1 adds `lib/foundation-server-route-split-verifier.js` and `scripts/process-verifier-server-route-split-module-check.mjs`. The canonical verifier still emits the same PASS/FAIL rows for each route split; it just delegates the predicates to a smaller module.

## Why

`server.js` is now under the 5,000-line danger line, but the verifier proof that protects those route splits is still buried inside a 15,980-line verifier. That keeps too much route-safety proof in one file and makes future route work easier to weaken by accident.

This card keeps the Foundation strong by making the route-split proof inspectable. The useful operator behavior is simple: Steve can trust that the server route splits stayed split without reading a 16K-line verifier, and future hub/server work has a smaller proof surface watching route ownership.

## Acceptance Criteria

- `lib/foundation-server-route-split-verifier.js` owns the server-route split verifier definitions and evaluation logic.
- `scripts/foundation-verify.mjs` imports and delegates this route-split proof domain to the focused module.
- The canonical verifier still records the same server-route split check labels for the eight route split cards.
- Focused dogfood proof accepts the healthy current route split state and rejects:
  - missing route module ownership,
  - old inline route ownership returning to `server.js`,
  - missing server registrar delegation,
  - moved out-of-scope routes,
  - weak proof scripts that only contain substrings.
- The proof script is read-only by default and has no DB mutation, file-write, or `--apply` path.
- `scripts/foundation-verify.mjs` line count decreases from the `15,980` baseline.
- Live backlog, Current Sprint, Plan Critic run, approval, closeout, Recent Builds, and verifier coverage all name `VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001` and `verifier-server-route-split-module-v1`.

## Definition Of Done

- `VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001` closes under `verifier-server-route-split-module-v1`.
- `docs/process/verifier-server-route-split-module-001-plan.md` and `docs/process/approvals/VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at `9.8+`.
- `scripts/process-verifier-server-route-split-module-check.mjs` passes and proves healthy/broken route split fixtures.
- `scripts/foundation-verify.mjs` delegates server-route split verifier behavior through `evaluateFoundationServerRouteSplitVerifier`.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse:

- current server-route split checks in `scripts/foundation-verify.mjs`,
- route split dogfood functions and constants in `lib/fub-source-routes.js`, `lib/foundation-runtime-read-routes.js`, `lib/app-page-routes.js`, `lib/auth-routes.js`, `lib/hub-read-routes.js`, `lib/strategy-shared-comms-routes.js`, `lib/foundation-write-routes.js`, and `lib/agent-feedback-routes.js`,
- `lib/foundation-route-split-verifier.js` and `lib/foundation-source-contract-verifier.js` module patterns,
- `lib/approval-integrity.js`.

Existing docs to reuse:

- `docs/process/verifier-source-contracts-module-001-plan.md`,
- server route split closeouts from 2026-05-15,
- `AGENTS.md` Foundation rebuild discipline.

Existing scripts to reuse:

- `npm run foundation:verify -- --json-summary`,
- `npm run backlog:hygiene -- --json`,
- `npm run process:foundation-ship`,
- prior verifier module focused proof scripts.

Live backlog and Current Sprint truth to reuse: `VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001` is active in `verifier-server-route-split-module-2026-05-15`, initially in Scoping until this plan, approval, and Plan Critic pass row are present.

Gate decision tree: this is full-risk Foundation verification work because it touches the canonical verifier, package scripts, closeout records, Current Sprint truth, and rebuild docs. Static checks and focused proof run first. Full `process:foundation-ship` is required before push.

Large-file split/extraction plan: this card touches `scripts/foundation-verify.mjs`, already over the `5,000` line architecture-risk threshold, but the change removes a coherent inline domain and adds a thin delegation call. No new route proof responsibility is added to the large file; responsibility moves out into `lib/foundation-server-route-split-verifier.js`. If the work starts expanding into unrelated verifier checks, stop and create a separate card.

## Risks

- Risk: check semantics change while moving code.
  - Response: focused dogfood covers both healthy and broken fixtures, and full `foundation:verify` must still pass.
- Risk: this becomes a broad verifier rewrite.
  - Response: only server-route split checks move. No source-contract, frontend, DB, runtime safety, Build Intel, or Agent Feedback product behavior moves in this card.
- Risk: proof becomes source-substring theater.
  - Response: proof must show broken route fixtures fail, including missing modules, inline server route ownership, missing registrars, moved out-of-scope routes, and weak proof scripts.
- Risk: the proof script mutates live truth.
  - Response: focused proof script is read-only and rejects mutation tokens in its own source.

Repair path: if the focused proof fails, keep the card in Building Now, restore the current inline route-split verifier predicates, fix the extracted module fixture that failed, rerun the focused proof, and only then rerun full `foundation:verify`. If full ship fails after focused proof passes, do not weaken the verifier; either adjust the module to preserve the old row exactly or revert this card's extraction and leave `VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001` open for a smaller route-split proof slice.

## Tests

```bash
node --check lib/foundation-server-route-split-verifier.js scripts/process-verifier-server-route-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:verifier-server-route-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001.json --closeoutKey=verifier-server-route-split-module-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by feeding the module bad route split fixtures that should fail but can become easy to miss when the verifier is a 16K-line file. Substring-only proof is rejected because the focused proof must demonstrate real pass/fail behavior from the extracted module.

## Not Next

- Do not rewrite the whole verifier.
- Do not change server route behavior.
- Do not split `lib/foundation-db.js` in this card.
- Do not split frontend, CSS, or app hub files in this card.
- Do not wire Marketing Video Lab live routes.
- Do not build Build Intel extraction.
- Do not build hub features, paid-source auth, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.

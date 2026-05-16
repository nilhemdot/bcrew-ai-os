# FOUNDATION-IDENTITY-001 Plan

## What

Build a thin V1 identity surface for `FOUNDATION-IDENTITY-001`. It adds one owner-only `identity` section to `/api/system-inventory` and one compact Workspace Identity panel to Foundation > System Inventory.

This is a fast visibility card, not another heavy agent framework. It reuses the existing System Inventory page, existing private workspace boundary, existing skills/plugins inventory, Current Sprint, and live backlog truth.

Gate decision tree: full gate. Blast radius touches `server.js`, `/api/system-inventory`, Foundation UI rendering, verifier coverage, a package proof command, and Foundation closeout records. The focused proof is required, but the full `process:foundation-ship` gate is also required.

## Why

Steve and the team need to see what is guiding the system without needing senior-engineer muscle memory. The useful operator behavior is simple: Foundation should show what files, memory boundaries, skills, and plugins guide Codex while making clear what is repo-visible versus local-private. This is a real workflow for review: open System Inventory, see the active guidance stack, and decide whether a stale rule belongs in repo truth, local memory, or backlog. It unlocks speed and quality because hidden assistant context stops living only in chat.

This prevents hidden drift from local files and skills. It also prevents the opposite failure: exposing private `USER.md`, `MEMORY.md`, or `memory/*.md` content just because Foundation wants visibility.

## Acceptance Criteria

- `/api/system-inventory.identity` exists and validates through the real `buildFoundationIdentitySurface()` function path.
- The identity payload marks `docs/users/steve.md` as the repo-visible Steve profile and marks `USER.md` as local-private metadata only.
- The identity payload represents `memory/*.md` by count/latest metadata only, with `contentMode: metadata-only` and `contentCopied: false`.
- The identity payload detects the `bcrew-foundation` skill from local runtime skill inventory.
- The identity payload includes plugin and plugin-skill counts while stating plugins are runtime capabilities, not source-truth signoff.
- The Foundation Current Docs inventory renders a Workspace Identity panel from the live identity payload.
- The focused proof rejects substring-only proof and marker-only checks by calling the real builder, validator, API route, and synthetic leaking payload cases.
- The proof command finishes fast enough for default use, with target runtime under 30 seconds for the focused check.

## Definition Of Done

- `lib/foundation-identity-surface.js` owns the identity builder, validator, source evaluator, and dogfood proof.
- `server.js` only wires the new identity payload into `/api/system-inventory`; private file content is not read for the identity payload.
- `public/foundation-system-inventory-renderers.js` shows the Workspace Identity panel without changing Skills, Plugins, or Agents lane behavior.
- `lib/foundation-source-trust-verifier.js` requires the new identity payload shape during `foundation:verify`.
- `scripts/process-foundation-identity-check.mjs` validates approval, Current Sprint, Plan Critic pass, package script, source wiring, live API, UI markers, and dogfood behavior.
- `FOUNDATION-IDENTITY-001` has a Plan Critic pass row, full closeout, Recent Work visibility, and live backlog lane `done`.

## Details

Existing code to reuse:

- `/api/system-inventory` in `server.js`
- private-local doc metadata helpers in `server.js`
- `buildPersonalWorkspaceBoundaryStatus()` from `lib/foundation-personal-workspace-boundary.js`
- System Inventory rendering in `public/foundation-system-inventory-renderers.js`
- source-trust verifier coverage in `lib/foundation-source-trust-verifier.js`

Existing docs to reuse:

- `docs/process/personal-workspace-boundary.md`
- `docs/process/doctrine-propagation.md`
- `docs/users/steve.md`
- `docs/rebuild/current-runtime-map.md`
- live Current Sprint and live backlog records

Existing scripts to reuse:

- `npm run process:personal-workspace-boundary-check`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship`

V1 payload shape:

- `identity.status`
- `identity.visibilityMode`
- `identity.repoVisibleProfile`
- `identity.workspaceRuntimeDocs`
- `identity.localPrivateMemory`
- `identity.runtimeCapabilities`
- `identity.privacyBoundary`
- `identity.plainEnglish`

The identity payload may include metadata fields such as path, role, visibility class, existence, counts, modified timestamp, and content mode. It must not include private content, excerpts, summaries, raw text, token values, local-doc bodies, or private memory quotes.

## Risks

- Risk: The surface leaks private memory by trying to be too helpful.
  - Repair path: validator rejects content-like keys and synthetic leak dogfood fails closed.
- Risk: The surface duplicates existing System Inventory pages.
  - Repair path: add one compact panel and keep Skills, Plugins, Agents, and Current Docs as their existing lanes.
- Risk: Skills/plugins get mistaken for business source signoff.
  - Repair path: payload and UI explicitly state runtime capability is not source-truth approval.
- Risk: Server monolith grows again.
  - Repair path: behavior lives in `lib/foundation-identity-surface.js`; server gets only narrow wiring.
- Risk: Proof fails or behavior regresses.
  - Repair path: fail closed, revise the plan or implementation, and reopen the card before any closeout.

## Tests

Focused proof:

```sh
npm run process:foundation-identity-check -- --json
```

Full proof:

```sh
npm run backlog:hygiene -- --json
npm run process:foundation-identity-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-IDENTITY-001 --planApprovalRef=docs/process/approvals/FOUNDATION-IDENTITY-001.json --closeoutKey=foundation-identity-surface-v1 --commitRef=HEAD
```

Dogfood requirements:

- A safe synthetic identity payload passes validation.
- A payload with `USER.md.content`, private memory `rawText`, or a private memory `summary` fails validation.
- A payload missing the `bcrew-foundation` runtime skill fails validation.
- A payload that marks plugins as source-truth signoff fails validation.

Not next:

- No shared-context `MEMORY.md` exposure.
- No local-only `USER.md` or raw private memory in repo truth.
- No auth broadening.
- No hub feature work.
- No source extraction.
- No Build Intel extraction.
- No Canva asset-library workflow.
- No Marketing Video Lab wiring.
- No `MEETING-VAULT-ACL-001 Phase B`.
- No Drive permissions mutation or request-access email path.

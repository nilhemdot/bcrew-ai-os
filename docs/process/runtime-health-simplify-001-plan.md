# RUNTIME-HEALTH-SIMPLIFY-001 Plan

## What

Ship a narrow Foundation UX/reliability slice for `RUNTIME-HEALTH-SIMPLIFY-001`.

Runtime Health now has real diagnostic power: served-code trust, worker-code trust, backlog hygiene, reference trust, post-ship fanout, job control, worker reliability, runtime process control, LLM routes, extraction targets, and source queues. The page is accurate, but it is too dense for normal operator scanning.

This card adds a plain-English command layer and collapses the deep diagnostic groups by default without removing the existing detail.

## Why

Steve should be able to open Runtime Health and answer three questions in under a minute:

- Is the system okay right now?
- What needs attention?
- Where do I click for the deeper proof?

If the only useful answer requires reading every diagnostic panel, Foundation still depends on an engineer to translate the page.

## Acceptance Criteria

- Runtime Health renders a top command panel before the detailed diagnostic sections.
- The command panel states overall runtime status in plain English.
- The command panel surfaces attention-only items: services, worker jobs, stale runs, backlog hygiene, fanout, KPI/source warnings, and endpoint/asset budget signals when available.
- The command panel includes direct jump actions to the deeper diagnostic sections.
- Existing detailed diagnostic panels are still rendered and remain available.
- Deep diagnostic panels are grouped in collapsed sections by default, with summaries that describe what is inside.
- Critical/attention sections can be opened by default when the top-level source says risk.
- The implementation does not change backend routes, auth, Foundation Hub payload shape, job controls, runtime semantics, source extraction, connector auth, hub features, Canva asset-library behavior, Marketing Video Lab wiring, Meeting Vault Phase B, or Drive permissions.
- Focused dogfood rejects the old wall-of-diagnostics page shape: no command panel, no attention-only list, no direct jump path, and direct append of every diagnostic panel.
- No new runtime controls are introduced; this card only changes how existing Runtime Health diagnostics are read.
- No diagnostic deletion is allowed; existing source-backed panels remain available behind collapsed groups.
- Performance proof must show the default `/api/foundation-hub` route remains under the compact route budget.
- Focused proof must pass with a 9.8+ Plan Critic approval row before build is trusted.
- Full Foundation ship gate passes.

## Definition Of Done

- `lib/runtime-health-simplify.js` owns constants and dogfood evaluation for the Runtime Health simplification.
- `public/foundation-runtime-renderers.js` owns the command-panel renderer and attention-item builders.
- `public/foundation-operations-renderers.js` uses the command panel and diagnostic section wrapper instead of appending every Runtime Health diagnostic panel directly.
- `public/styles-foundation-workflows.css` includes minimal styles for the command panel and diagnostic wrappers.
- `scripts/process-runtime-health-simplify-check.mjs` proves plan approval, backlog/sprint state, UI source markers, dogfood behavior, package script, route budget, and verifier coverage.
- `lib/foundation-runtime-reliability-verifier.js` covers `RUNTIME-HEALTH-SIMPLIFY-001` through the focused module.
- `scripts/foundation-verify.mjs` only passes source text into the existing runtime reliability verifier.
- Backlog, Current Sprint, current plan/state docs, closeout, Recent Builds, and ship proof agree.

## Details

Existing code to reuse:

- Runtime Health page assembly lives in `public/foundation-operations-renderers.js`.
- Runtime panel renderers live in `public/foundation-runtime-renderers.js`.
- Generic card/panel helpers already exist: `renderStatusCard`, `renderStatusGroupPanel`, and status grids.
- Live runtime data already comes from `/api/foundation-hub?view=full`; do not add another backend API.
- Runtime reliability verifier coverage already lives in `lib/foundation-runtime-reliability-verifier.js`.

Implementation shape:

- Add `renderRuntimeHealthCommandPanel(hub)` to build the top-level operator view.
- Add attention-item helpers that read existing hub payload slices and produce concise cards.
- Add `appendRuntimeDiagnosticPanel(container, panel, options)` to wrap each existing diagnostic panel in a `<details>` group with a short summary.
- Keep details available and source-backed; do not delete or truncate any diagnostic panel.
- Add CSS for the command panel, attention list, and diagnostic wrappers.
- Add dogfood proof that fails if the command layer disappears or the operations renderer returns to direct append-only diagnostic sprawl.

Split/extraction plan for architecture risk:

- `public/foundation-runtime-renderers.js` is under the 3,000-line warning line; adding a small renderer there is acceptable.
- `public/foundation-operations-renderers.js` is small and owns page composition, so it is the right place for the wrapper.
- Do not add new logic to `public/foundation.js`.
- Do not add inline verifier logic to `scripts/foundation-verify.mjs`; use the existing runtime reliability verifier module.

Gate decision tree:

- Static gate: `node --check` for changed JS modules and scripts.
- Focused gate: `npm run process:runtime-health-simplify-check -- --json` proves the command layer, collapsed diagnostics, direct jump paths, and verifier coverage.
- Route budget: default `/api/foundation-hub` must remain under 2 seconds and 800 KB.
- Full gate: `npm run process:foundation-ship -- --card=RUNTIME-HEALTH-SIMPLIFY-001 --planApprovalRef=docs/process/approvals/RUNTIME-HEALTH-SIMPLIFY-001.json --closeoutKey=runtime-health-simplify-v1 --commitRef=HEAD`.

Check-script apply posture:

- `scripts/process-runtime-health-simplify-check.mjs` is read-only by default and has no `--apply` path.
- It must not call backlog/current-sprint write helpers, raw SQL mutation, `fs.writeFile`, live connector commands, paid APIs, or source extraction.

Speed budget:

- Focused proof under 2 minutes and expected under 10 seconds.
- Default `/api/foundation-hub` under 2 seconds and 800 KB.
- No full-diagnostics route measurement inside the default page proof unless specifically needed.

## Risks

- **Hiding detail risk:** Collapsing diagnostics could make problems harder to inspect. Mitigation: every group keeps direct detail, direct jump actions, and risk sections can open by default.
- **Subjective polish risk:** UI simplification can become taste. Mitigation: focused proof checks objective operator affordances: command panel, attention-only list, collapsed wrappers, and direct jump path.
- **Scope creep risk:** This is not a Runtime Health redesign or new health model. Do not change thresholds, backend payloads, source status semantics, job controls, routes, or auth.
- **Performance risk:** Do not make Runtime Health load more data than it already loads.
- **Rollback path:** Revert the new command panel/wrapper and CSS while leaving backend runtime diagnostics untouched.

## Tests

```sh
node --check lib/runtime-health-simplify.js scripts/process-runtime-health-simplify-check.mjs public/foundation-runtime-renderers.js public/foundation-operations-renderers.js lib/foundation-runtime-reliability-verifier.js scripts/foundation-verify.mjs
npm run process:runtime-health-simplify-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=RUNTIME-HEALTH-SIMPLIFY-001 --planApprovalRef=docs/process/approvals/RUNTIME-HEALTH-SIMPLIFY-001.json --closeoutKey=runtime-health-simplify-v1 --commitRef=HEAD
```

Not next: no backend route changes, no auth changes, no new runtime/job semantics, no source extraction, no connector auth, no hub feature work, no Canva asset-library behavior, no Marketing Video Lab wiring, no Build Intel extraction, no Meeting Vault Phase B, no Drive permission mutation, and no auto-restart-on-push install.

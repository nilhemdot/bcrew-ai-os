# CRITICAL-ROOTS-UNDER-3K-PHASE-1 Plan

## What
Ship the first critical-root under-3,000-line split by extracting cohesive Foundation frontend document/strategy/home rendering domains out of `public/foundation.js`.

## Why
Foundation already brought critical files below the emergency 5,000-line threshold, but the current roots are still large enough to hide responsibility drift. This sprint starts the staged cleanup by making one root materially easier to review without opening a broad rewrite or touching Harlan, Fal, voice, hub, or mockup work.

Operator value: Steve and the team can see that one watched root moved from "large but not red" toward the preferred Foundation module shape, while the remaining roots stay visible as follow-up instead of being hidden as green. This is a real workflow improvement that unlocks speed and quality by making future Foundation review easier.

## Acceptance Criteria
- At least one critical root is below 3,000 lines after the split.
- `public/foundation.js` drops below 3,000 lines by moving domain-owned renderers, not arbitrary line cuts.
- No extracted hand-written module exceeds 1,500 lines.
- The Foundation HTML script order loads shared doc helpers before root UI, and loads home/strategy renderers before the router dispatches.
- Focused proof rejects synthetic old failures: no root below 3,000, an oversized extracted module, missing script order, and arbitrary/non-domain split evidence.
- Full `process:foundation-ship` passes before push.

## Definition Of Done
- Reuse the existing Foundation frontend classic-script architecture, existing renderer split proof style, existing file-size standard, existing live backlog, existing Plan Critic row, existing approval integrity, existing build closeout registry, existing ship gate, and existing verifier coverage source.
- Add only the small process proof required for this card: `scripts/process-critical-roots-under-3k-check.mjs`.
- Keep `public/foundation.js` as the root orchestration/support file while `public/foundation-doc-markdown-renderers.js`, `public/foundation-strategy-renderers.js`, and `public/foundation-home-renderers.js` own their coherent domains.
- Add `docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-1.json`, a live backlog card, a durable Plan Critic pass row, closeout registry record `critical-roots-under-3k-phase-1-v1`, and a closeout handoff.

## Details
The split plan is a split/no-new-responsibility plan for the over-budget hand-written root. The domain split creates three new module boundaries. `foundation-doc-markdown-renderers.js` owns markdown links, table rendering, live-doc source cards, BHAG summary cards, and Agent Engine summary cards. `foundation-strategy-renderers.js` owns the Strategy Packet, strategy document routes, Current Quarter card rendering, support doc cards, and Rebuild Plan command-order panel. `foundation-home-renderers.js` owns the legacy Foundation home renderer and sequence data. The root does not get new product responsibility; it only loses cohesive renderer domains.

This reuses existing code, existing docs, existing scripts, live backlog truth, Current Sprint context, existing file-size standards, and the existing frontend split verifier surfaces. It keeps shared data/cache/router modules unchanged, preserves current route behavior, and leaves larger backend roots for later staged cleanup. Main-session approved active sprint scope owns the protected Foundation shared files for this sprint; this is not hub chat, side build, Canva, Fal, Harlan, or voice work.

The focused proof is read-only by default and performs no live-state mutation. It proves behavior through the actual function path and route path: it reads real files, counts lines, validates script order, checks the moved functions are absent from the root and present in domain modules, fetches the `/foundation` route, and dogfoods bad fixtures. The proof explicitly rejects substring-only proof by requiring both negative root evidence and positive domain-module evidence plus failing synthetic fixtures.

Gate decision tree: static gate is `node --check`, focused gate is `npm run process:critical-roots-under-3k-check -- --json`, and full gate is `npm run process:foundation-ship`. Route/performance budget: `/foundation` must serve under 2 seconds in focused proof, extracted scripts must return non-empty payloads, the focused gate should stay fast enough for default use, and the full ship gate target remains under 5 minutes / 300 seconds. Payload budget: this sprint adds only small hand-written JS modules and no generated payloads.

Explicit file-size budget: hand-written extracted modules stay under 1,500 lines, approval JSON stays under 3,000 lines, this report artifact and handoff artifact stay under 3,000 lines, and no generated files are added.

## Risks
The main risk is breaking classic-script global ordering. The repair path is explicit script-order proof plus `foundation:verify`, which exercises the frontend split verifier surfaces after the helper movement. Another risk is claiming the whole root cleanup is done; this V1 closes only one root and records the remaining critical roots for later sprints.

## Tests
Run `node --check public/foundation.js public/foundation-doc-markdown-renderers.js public/foundation-strategy-renderers.js public/foundation-home-renderers.js public/foundation-current-state-renderers.js lib/foundation-frontend-current-state-renderers-split.js lib/foundation-source-trust-verifier.js scripts/foundation-verify.mjs scripts/process-critical-roots-under-3k-check.mjs`, `npm run process:critical-roots-under-3k-check -- --json`, `npm run foundation:verify -- --failures-only`, `npm run foundation:verify`, `npm run backlog:hygiene -- --json`, and full `npm run process:foundation-ship -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-1 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-1.json --closeoutKey=critical-roots-under-3k-phase-1-v1 --commitRef=HEAD`.

## Not Next
Do not split another root in this sprint. Do not touch Harlan, Fal, voice, Canva, hub feature work, connector auth, Agent Feedback live auto-send, DB schema, route behavior, or Steve's local mockup assets. After this ships, pause; the next sprint starts with `BACKLOG-QUEUE-RECONCILE-001` before continuing Foundation surface/root cleanup from live backlog truth.

# STYLESHEET-MONOLITH-SPLIT-001 Plan

## What

Split `public/styles.css` from one 9,859-line stylesheet into smaller ordered CSS modules without changing rendered behavior.

V1 keeps `public/styles.css` as the single browser entry point and turns it into an ordered `@import` manifest. The imported files preserve the current cascade order:

- `public/styles-base-layout.css`
- `public/styles-foundation-core.css`
- `public/styles-foundation-workflows.css`
- `public/styles-strategy-docs.css`
- `public/styles-home-foundation-shell.css`
- `public/styles-strategy-sales.css`

## Why

The frontend code monolith is now below the 5K danger line, but `public/styles.css` is still almost 10K lines. That creates the same failure pattern in CSS: every hub or Foundation visual change risks editing one giant surface where unrelated selectors, media rules, and print rules are mixed together.

The operator value is safer hub work. Sales, Ops, Strategy, and Foundation UI can keep using the same stylesheet entry point while future changes have smaller ownership seams.

## Acceptance Criteria

- `public/styles.css` is under 5,000 lines and only owns ordered imports plus a short ownership note.
- All split CSS modules exist, are each under 5,000 lines, and preserve the original stylesheet line order.
- The combined imported CSS contains required selectors for login/layout, Foundation, source lifecycle, docs, home/Foundation shell, Strategy v2, Sales, responsive, and print surfaces.
- A focused proof rejects old failure modes: an overlarge root stylesheet, missing import, missing required selector, wrong import order, and an overlarge module.
- Existing HTML pages keep linking `styles.css`; no page-by-page route rewiring is required.

## Definition Of Done

- Live backlog card `STYLESHEET-MONOLITH-SPLIT-001` is `done` and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:stylesheet-monolith-split-check -- --json`.
- `foundation:verify` and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `stylesheet-monolith-split-v1`.

## Details

This is a mechanical cascade-preserving split, not a redesign. The split uses line ranges that map to existing surface clusters and keep source order intact. The root `styles.css` remains the only stylesheet that HTML pages need to load.

Existing code/docs/scripts/backlog truth reused: existing code from the current `public/styles.css`, existing docs in the current plan and current state closeout pattern, existing scripts (`foundation:verify`, `process:foundation-ship`, `backlog:hygiene`) plus the new focused proof script, live backlog card `STYLESHEET-MONOLITH-SPLIT-001`, and Current Sprint / Plan Critic DB truth.

Implementation split/extraction plan: extract existing stylesheet line ranges into ordered modules without changing selectors, declarations, or HTML links. `public/styles.css` is over 5,000 lines, so this card specifically shrinks that file and adds no new styling responsibility to it. `scripts/foundation-verify.mjs` is also over 5,000 lines; this card only adds bounded verifier coverage for the new proof module and does not add unrelated verifier responsibility. Any further verifier cleanup remains a separate verifier module split.

The proof must evaluate actual files, not just marker strings. It resolves the `@import` manifest, checks import order, checks module line counts, and verifies key selectors remain in the combined CSS. Dogfood fixtures simulate the old failure modes and must fail closed.

Gate decision tree: this card explicitly chooses static, focused, or full gates from the decision tree. Static syntax checks cover JS verifier/proof files, the focused proof checks CSS import/order/selector behavior, and full Foundation ship is required because this touches a public asset used by multiple pages, package scripts, closeout registry, and `scripts/foundation-verify.mjs`.

Speed bound: the focused proof is fast, read-only, and file-based, with no provider calls and no browser automation requirement. It should complete in seconds so the check is cheap enough to keep in future ship gates.

Operator value: Steve and hub builders can keep using the same pages while future Foundation, Sales, Ops, and Strategy visual changes have smaller CSS ownership files instead of one giant stylesheet.

## Risks

- Risk: cascade order changes and visual styling shifts.
  - Repair path: proof locks import order and required selector presence; browser pages still load the same root stylesheet.
- Risk: this becomes a visual redesign or hub feature change.
  - Repair path: no selectors are rewritten in V1; only file ownership changes.
- Risk: CSS modules become new monoliths.
  - Repair path: each module has a line-count budget below 5,000 and proof rejects overlarge modules.

## Tests

```bash
node --check lib/foundation-stylesheet-monolith-split.js scripts/process-stylesheet-monolith-split-check.mjs scripts/foundation-verify.mjs
npm run process:stylesheet-monolith-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=STYLESHEET-MONOLITH-SPLIT-001 --planApprovalRef=docs/process/approvals/STYLESHEET-MONOLITH-SPLIT-001.json --closeoutKey=stylesheet-monolith-split-v1 --commitRef=HEAD
```

## Not Next

- Do not redesign Foundation, Strategy, Sales, Ops, or Marketing UI styling.
- Do not convert to a frontend build system.
- Do not edit hub feature logic, Marketing Video Lab live wiring, Canva assets, paid-source auth, source extraction, Drive permissions, Meeting Vault ACL Phase B, or autonomous dev.
- Do not touch unrelated dirty Marketing assets or usage dashboard changes.

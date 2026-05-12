# Foundation Gate Decision Tree

Status: active V1
Date: 2026-05-12
Owner: Foundation

Use fast gates by default, but do not hide full-risk work behind speed.

## Rule

Pick the cheapest automatic proof that can catch the real failure mode.

## Static

Use `static` when the change is docs-only outside active command truth, copy-only, or isolated JS/JSON syntax/config that does not affect Foundation behavior.

Proof:

```bash
node --check <changed-js-files>
JSON.parse changed JSON files
```

Examples:

- typo or wording fix in a non-command doc
- isolated formatting in a process note
- local script syntax check with no live system impact

## Focused

Use `focused` when the change is bounded Foundation process work, Current Sprint truth, process docs, focused proof scripts, Recent Work closeout metadata, or Foundation/Ops operator surface wiring that does not touch security, schema, runtime, package, canonical verifier, extraction, source, or intelligence substrate.

Proof:

```bash
npm run process:<card-check>
npm run backlog:hygiene -- --json
```

Examples:

- Current Sprint stage/order/closeout update
- process plan or approval file
- focused card proof script
- Recent Work closeout record
- bounded Foundation command-surface wording

## Full

Use `full` when the change touches auth, security, tiering, schema, database seed, package/dependencies, server routes, runtime workers, source contracts, extraction/intelligence write paths, readiness gates, or the canonical verifier.

Proof:

```bash
npm run process:foundation-ship -- --card=<card> --planApprovalRef=<approval-json> --closeoutKey=<closeout-key>
```

Full-risk examples:

- `server.js`
- `lib/security-access.js`
- `lib/foundation-db.js`
- `package.json` or `package-lock.json`
- `scripts/foundation-verify.mjs`
- database schema and seed changes
- source, extraction, intelligence, runtime, or worker behavior

## Bypass

Bypass only with a card ID, reason, and follow-up proof path. Bypass is not a quality strategy.

## Plan Critic Tie-In

Plan Critic checks the plan before implementation. It must reject a plan when the selected gate does not match blast radius, when behavior proof is missing, or when the plan relies on substring-only verifier markers without an explicit justification and a stronger behavior proof path.

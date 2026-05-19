# FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001 Closeout

Date: 2026-05-15
Sprint: `frontend-decision-question-renderers-split-2026-05-15`
Closeout key: `frontend-decision-question-renderers-split-v1`
Card: `FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001`

## What Changed

Extracted the Foundation Decisions / Open Questions renderer cluster from `public/foundation.js` into `public/foundation-decision-question-renderers.js`.

The new module owns decision memory cards, parking-lot capture cards, open-question cards, decision review grouping, decision/open-question create and editor controls, pending doc-update cards, and supporting decision/question helpers.

`public/foundation.js` dropped from about `6,348` lines to `4,910` lines, bringing it below Steve's 5,000-line refactor threshold.

## Proof

Focused proof:

```bash
npm run process:frontend-decision-question-renderers-split-check -- --json
```

Result:

- 14/14 checks passed
- `/foundation` returned `200` in about `25.1ms` with `7,685B`
- `/foundation-decision-question-renderers.js` returned `200` with `52,409B`
- VM proof confirmed decision card rendering, decision review rendering, pending doc-update rendering, open-question group/card rendering, create/editor controls, and synthetic Decisions/Open Questions route render
- Dogfood rejected missing/wrong Decisions / Open Questions module script order
- `public/foundation.js` line count dropped below 5,000

Full ship commands:

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-fub-lead-source-renderers.js public/foundation-system-inventory-renderers.js public/foundation-current-state-renderers.js public/foundation-decision-question-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-decision-question-renderers-split-check.mjs lib/foundation-frontend-decision-question-renderers-split.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:frontend-decision-question-renderers-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001.json --closeoutKey=frontend-decision-question-renderers-split-v1 --commitRef=HEAD
```

## Files

- `public/foundation-decision-question-renderers.js`
- `public/foundation.js`
- `public/foundation.html`
- `lib/foundation-frontend-decision-question-renderers-split.js`
- `scripts/process-frontend-decision-question-renderers-split-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- Split frontend source readers in `lib/` and `scripts/process-foundation-sprint-*.mjs`
- `docs/process/frontend-decision-question-renderers-split-001-plan.md`
- `docs/process/approvals/FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001.json`
- `lib/foundation-build-closeout-overnight-records.js`

## Not Included

- No Decisions or Open Questions UX redesign
- No Foundation Hub, Decisions, Open Questions, Backlog, Action Review, or source API contract changes
- No Backlog or Action Review renderer split
- No hub feature work or Marketing Video Lab live wiring
- No paid-source auth, source extraction, Drive permission mutation, or Meeting Vault Phase B

## Next

Continue no-auth Foundation cleanup if Steve is still unavailable. Good next work: split another verifier proof module, split another DB/server seam, or take the next smaller frontend route-local renderer seam.

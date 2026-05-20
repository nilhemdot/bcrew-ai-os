# FOUNDATION-CSS-SURFACE-DECOUPLE-001 Plan

Card: `FOUNDATION-CSS-SURFACE-DECOUPLE-001`
Closeout key: `foundation-css-surface-decouple-v1`

## What

Close the May 19 deep-audit finding that Foundation CSS surfaces are still broad enough to recreate frontend drift risk.

This card splits two high-risk ownership seams out of the broad CSS files while preserving cascade order:

- Build Log / Current Sprint / process-memory styles move from `public/styles-foundation-workflows.css` into `public/styles-foundation-build-log.css`.
- Current State / System Inventory styles move from `public/styles-foundation-core.css` into `public/styles-foundation-current-state.css`.

## Why

The root stylesheet was already split, but two imported modules still owned too many unrelated Foundation surfaces. Large shared CSS files make regressions harder to localize and let DOM/layout coupling creep back in.

This card keeps the UI behavior the same and makes the ownership boundary clearer: broad core/workflow modules stay smaller, surface-owned modules carry the selectors for their own renderers, and proof fails if those selectors drift back into the broad files.

The implementation must preserve cascade order.

## Existing Work Reused

Existing code:

- `public/styles.css` is already the stable root stylesheet manifest.
- `public/styles-foundation-core.css` and `public/styles-foundation-workflows.css` already hold the CSS blocks named by the deep audit.
- `lib/foundation-stylesheet-monolith-split.js` already validates stylesheet imports and required selectors.
- `lib/deep-audit-findings-closure-gate.js` already owns May 19 deep-audit finding routing.

Existing docs:

- `docs/audits/2026-05-19-foundation-deep-merge-audit.md`
- `docs/process/stylesheet-monolith-split-001-plan.md`
- `docs/process/deep-audit-findings-closure-gate-001-plan.md`

Existing scripts:

- `process:stylesheet-monolith-split-check`
- `process:code-quality-nightly-audit-check`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `process:foundation-ship`

Live backlog truth:

- `FOUNDATION-CSS-SURFACE-DECOUPLE-001` is the active blocker.
- `DECISION-008` is the next approved overnight card.

Not rebuilt:

- No visual redesign.
- No DOM renderer rewrite.
- No broad mechanical stylesheet rewrite.
- No source/value/extraction expansion.

Exact gap:

- The May 19 deep audit found `public/styles-foundation-workflows.css` and `public/styles-foundation-core.css` large enough to raise DOM rebuild and frontend drift risk.

## Acceptance Criteria

- `public/styles.css` imports the new CSS ownership modules in preserved cascade order.
- `public/styles-foundation-build-log.css` owns representative Build Log / Current Sprint selectors:
  - `.build-log-list`
  - `.current-sprint-panel`
  - `.build-log-card-summary`
  - `.doc-update-diff`
- `public/styles-foundation-current-state.css` owns representative Current State / System Inventory selectors:
  - `.current-state-grid-4`
  - `.current-state-surface-summary`
  - `.current-state-package-table`
  - `.foundation-system-stack`
- Those selectors no longer live in the broad core/workflows files.
- `public/styles-foundation-core.css` is under 1,800 lines.
- `public/styles-foundation-workflows.css` is under 2,100 lines.
- Every CSS module in the root manifest stays under 2,200 lines.
- Dogfood rejects:
  - missing CSS ownership imports,
  - selectors drifting back into broad CSS files,
  - unresolved audit routing.
- `lib/deep-audit-findings-closure-gate.js` marks `foundation-dom-rebuild-risk` done under `foundation-css-surface-decouple-v1`.
- `npm run process:foundation-css-surface-decouple-check -- --close-card --json` marks the card done and advances Current Sprint to `DECISION-008`.
- Pass score/status: the Plan Critic result must be `pass` at score `9.8` or higher before close-card writeback.

## Operator Value

Steve gets a cleaner Foundation frontend with less hidden stylesheet coupling. Future UI work can touch the Build Log, Current Sprint, Current State, or System Inventory CSS without opening a 2,500-line shared file and risking unrelated surface regressions.

## Definition Of Done

- Focused proof: `npm run process:foundation-css-surface-decouple-check -- --close-card --json` exits 0 with `status=healthy`, `failedCount=0`, and active blocker `DECISION-008`.
- Legacy stylesheet proof: `npm run process:stylesheet-monolith-split-check -- --json` exits 0.
- Code-quality audit: `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch` exits 0 and does not emit `foundation-dom-rebuild-risk`.
- System Health: `npm run process:system-health-nightly-audit-check -- --json` exits 0 with healthy status.
- Repeated-failure gate: `npm run process:build-lane-repeated-failure-action-gate-check -- --json` exits 0 with no blockers.
- Backlog hygiene: `npm run backlog:hygiene -- --json` exits 0.
- Verifier: `npm run foundation:verify -- --json-summary` exits 0.
- Ship: `npm run process:foundation-ship -- --card=FOUNDATION-CSS-SURFACE-DECOUPLE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CSS-SURFACE-DECOUPLE-001.json --closeoutKey=foundation-css-surface-decouple-v1 --commitRef=HEAD` exits 0.
- Git: main is clean, pushed, and `HEAD == origin/main` after ship.

## Details

Implementation scope:

- Add `public/styles-foundation-current-state.css`.
- Add `public/styles-foundation-build-log.css`.
- Keep `public/styles.css` as the only browser entry point and preserve import order.
- Update stylesheet proof metadata so the new modules are part of the existing root-manifest proof.
- Add `lib/foundation-css-surface-decouple.js` and `scripts/process-foundation-css-surface-decouple-check.mjs` for focused evidence and guarded closeout.
- Route the May 19 audit finding to this closeout.

Preserve cascade order:

- Current State/System Inventory styles are imported immediately after `styles-foundation-core.css`, where they originally lived.
- Build Log/Current Sprint styles are imported immediately before `styles-foundation-workflows.css`, where they originally lived.

Not in scope:

- Do not redesign Foundation UI.
- Do not rewrite unrelated selectors.
- Do not change DOM renderer behavior.
- Do not start source/value/extraction expansion.

Gate decision tree:

- Static syntax check first.
- Legacy stylesheet split proof next to make sure the root manifest and required selectors still work.
- Focused CSS surface proof with `--close-card` next because this mutates backlog and Current Sprint only through guarded closeout posture.
- Health gates next: System Health, repeated-failure gate, and backlog hygiene.
- Full ship gate last because this touches frontend assets, process proof, audit routing, package scripts, and closeout records.

Speed bound:

- The focused proof is local-file and local-DB only.
- It does not fetch external providers, run extraction jobs, mutate source systems, or hit browser/auth surfaces.
- Target runtime is under 2 minutes so it can run during every card closeout.

Rollback or repair path:

- If selectors move incorrectly, restore the original CSS blocks from git and split a smaller block.
- If the legacy stylesheet proof fails, update the root import order or required-selector list before closeout.
- If Plan Critic fails, revise the plan before close-card writeback.
- If System Health or repeated-failure gates fail, repair raw health first, then rerun this focused proof.
- If the full ship gate fails after commit, keep the card unpushed until the failing proof is fixed and `process:foundation-ship` passes.

## Risks

- Risk: a CSS cleanup becomes a visual redesign. Mitigation: this is a cascade-preserving move of existing blocks only.
- Risk: broad files remain broad with a new name added. Mitigation: budgets require core/workflows reduction and fail if moved selectors remain in broad files.
- Risk: the audit finding gets marked done without proof. Mitigation: dogfood rejects unresolved audit routing.

## Tests

```bash
node --check lib/foundation-css-surface-decouple.js scripts/process-foundation-css-surface-decouple-check.mjs
npm run process:stylesheet-monolith-split-check -- --json
npm run process:foundation-css-surface-decouple-check -- --close-card --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-CSS-SURFACE-DECOUPLE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CSS-SURFACE-DECOUPLE-001.json --closeoutKey=foundation-css-surface-decouple-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-CSS-SURFACE-DECOUPLE-001 --closeoutKey=foundation-css-surface-decouple-v1
npm run process:foundation-ship -- --card=FOUNDATION-CSS-SURFACE-DECOUPLE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CSS-SURFACE-DECOUPLE-001.json --closeoutKey=foundation-css-surface-decouple-v1 --commitRef=HEAD
```

## Not Next

- Do not do a broad visual redesign.
- Do not rewrite unrelated CSS selectors.
- Do not change DOM renderer behavior.
- Do not work source/value/extraction expansion inside this card.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- Do not mutate Drive permissions.
- Do not send emails/messages, rotate credentials, run paid/provider access, or perform private broad extraction.

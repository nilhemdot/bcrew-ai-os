# PROMISE-TO-PROOF-INTEGRITY-GATE-001 Plan

## Goal

Stop V1/preflight/contract/synthetic/dry-run closeouts from burying unfinished product promises. If a card closes a partial capability slice, the remaining promise must stay visible as a separate open backlog card.

## Scope

- Add a promise-to-proof integrity module that identifies limited V1 product/capability closeouts.
- Add a focused process check with dogfood proof.
- Open/update P0 continuation cards for the known buried product promises.
- Link historical/source cards to their continuation cards.
- Wire the rule into `process:ship-check`.
- Close this process gate after proof, while keeping actual product continuation cards open.

## Definition Of Done

- `process:ship-check` fails a partial V1 capability closeout when no separate open continuation card is referenced.
- Dogfood proves the target card itself does not count as its own continuation.
- The known continuation cards exist in live backlog and remain open.
- Historical/source cards mention the continuation card that owns the remaining product promise.
- System Health, backlog hygiene, repeated-failure gate, Current Sprint gate, plan reconcile, and `foundation:verify` are green.

## Non-Goals

- Do not build GOD-mode extractor in this card.
- Do not run private Skool/MyICOR navigation, paid/provider work, browser-auth extraction, sends, Drive permission mutation, or external writes.
- Do not mark product continuation cards done.

## Proof Commands

```sh
node --check lib/promise-to-proof-integrity-gate.js scripts/process-promise-to-proof-integrity-gate-check.mjs scripts/process-ship-check.mjs
npm run process:promise-to-proof-integrity-gate-check -- --apply --close-card --json
npm run process:promise-to-proof-integrity-gate-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run process:current-sprint-active-card-gate-check -- --json
npm run process:foundation-plan-reconcile-check -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=PROMISE-TO-PROOF-INTEGRITY-GATE-001 --planApprovalRef=docs/process/approvals/PROMISE-TO-PROOF-INTEGRITY-GATE-001.json --closeoutKey=promise-to-proof-integrity-gate-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=PROMISE-TO-PROOF-INTEGRITY-GATE-001 --closeoutKey=promise-to-proof-integrity-gate-v1
```

## Next Product Program

After this process gate ships, the first product build is `WEB-GODMODE-LIVE-OPERATOR-002`, scoped to one approved public/no-auth source before Skool/MyICOR/private/community navigation.

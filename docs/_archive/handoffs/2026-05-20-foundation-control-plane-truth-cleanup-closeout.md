# Foundation Control-Plane Truth Cleanup Closeout

Date: 2026-05-20
Card: `FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001`
Closeout: `foundation-control-plane-truth-cleanup-v1`

## Summary

Steve's live order is Foundation/control-plane cleanup, Brain Fleet, Extractor proof, Extraction scale, then Strategy Hub. This card repairs the split-brain where Current Sprint and plan-reconcile checks were still tied to stale sprint assumptions while the rest of Foundation reported raw green.

The cleanup routes the active blocker through the Current Sprint API, keeps the May 12 control-plane sprint as historical closeout truth, proves the May 20 deep-audit findings are closed/routed/accepted, and parks `STRATEGY-003` until the higher-priority Foundation and extraction proof sequence is complete.

## Proof

- `process:foundation-control-plane-truth-cleanup-check` owns the focused proof and guarded Current Sprint overlay mutation.
- `process:current-sprint-active-card-gate-check` validates the live active card without requiring the old overnight sprint ID.
- `process:foundation-plan-reconcile-check` validates active docs against the live API while preserving historical closeout proof.
- May 20 deep-audit summary: 7 findings, 0 P0, all P1/P2 findings routed to done/scoped/accepted owners.
- Final pre-ship proof reached System Health raw 0 risk / 0 watch, repeated-failure gate healthy, backlog hygiene healthy, and `foundation:verify` 518/518 green. The scheduled `foundation-verify` and `connector-uptime-monitor` read-only jobs were rerun to create later-success proof after stale failed job-run records.
- First ship attempt exposed an old reliability verifier assumption: `GATE-RELIABILITY-002` still required a Recent Builds row after its durable closeout had rolled out of the window. The repair moved `GATE-RELIABILITY-002` and `GATE-RELIABILITY-003` to the durable closeout fallback path already used for other historical closeout proof.

## Not Done

No Brain Fleet implementation, extractor proof, extraction scale, Strategy Hub, People work, live extraction, provider/model calls, credential changes, Drive permission changes, emails, public posts, or external writes were started by this card.

## Next

Pause after ship. The next scoped blocker is `BRAIN-FLEET-FOUNDATION-001`; do not start it until Steve gives the next build order.

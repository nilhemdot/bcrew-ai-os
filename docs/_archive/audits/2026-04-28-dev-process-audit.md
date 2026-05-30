# DEV-PROCESS-AUDIT-001 · Dev Loop Failure Map

Date: 2026-04-28
Status: Accepted as the requirements input for `PROCESS-HOOKS-001`

Plain English purpose: this is not another process essay. It records the real places the dev loop slipped today and says exactly what should catch each slip next time.

Rules for this audit:

- Do not create more process cards from this audit.
- Each failure has one owner.
- `PROCESS-HOOKS-001` builds enforcement next.
- `ACTION-REVIEW-APPLY-001` stays next after process hooks. Do not push it farther back.

## Failure Map

| Failure | What happened | Owner | What must catch it next time |
| --- | --- | --- | --- |
| Stale backlog lane state | Cards sat in executing even though work was done, split, or inactive. `DOC-AUTHORITY-001`, `DATA-004`, `SOURCE-021`, `SECURITY-001`, and `SECURITY-006` exposed the problem. | `BACKLOG-HYGIENE-001` | Backlog Hygiene must keep surfacing stale/unclear cards in Runtime Health and CLI output instead of relying on Steve to notice. |
| Work shipped before plan score | The trust slice, hygiene plan, and hygiene execution moved ahead before the 9.8 plan gate was actually honored. | `PROCESS-HOOKS-001` | Pre-commit enforcement must require a formal card, scoped plan, and external 9.8+ approval before normal implementation commits. |
| Backlog updates stayed manual | Steve had to ask whether doing cards were still real. Card movement and status-note enrichment were not automatic enough after ship. | `PROCESS-HOOKS-001` | Post-ship enforcement must verify touched backlog cards were moved, split, or updated with proof before closeout is accepted. |
| Dashboard served old code | Reviewers saw stale dashboard behavior after commits because the process stayed alive while serving old code. | `RUNTIME-SUPERVISOR-001` | Served-code trust must keep failing loudly when dashboard commit and repo HEAD disagree; auto-restart-on-push remains the next runtime hardening step under the existing supervisor work. |
| Recent Builds did not always say where work lives | Recent Builds could prove files and commits but still left Steve asking where to click in the app or docs. | `FOUNDATION-SURFACE-UPDATES-001` | Recent Builds / Recent Work UX must add app/doc breadcrumbs, visible/backend-only labels, and where-it-lives links. Hooks should require the metadata; this card owns the UX. |
| Verifier claims depended on manual restart timing | A verifier pass was sometimes true only in the builder's restarted process, then reviewers saw a different result later. | `PROCESS-HOOKS-001` | Post-ship enforcement must restart or confirm the live dashboard, prove served commit equals HEAD, then run default `npm run foundation:verify` on `localhost:3000`. |
| Plan, backlog, and phase labels disagreed | Foundation Overview read like a rebuild backlog, but its phase labels did not match the rebuild plan, creating two-headed truth. | `FOUNDATION-SURFACE-UPDATES-001` | The surface update card must reconcile plan/backlog grouping or replace it with the current command-order view. Hooks only make sure major closeouts include the metadata needed by that UX. |
| Transient source quota made the verifier non-reproducible | A reviewer hit `/api/strategic-execution/operating-truth` returning 500 from a Google Sheets 429 quota window. A later rerun passed 139/139, but the temporary red verifier still blocked trust. | `PROCESS-HOOKS-001` | Red verifier is a stop condition. The process hook must not let the next build continue while `foundation:verify` is failing; if the failure repeats, the builder must fix graceful degradation or route it to the current backlog before more product work. |

## Requirements For PROCESS-HOOKS-001

V1 hooks should enforce these checks without turning the system into ceremony:

1. Every normal commit references a live backlog card ID in the subject or closeout record.
2. Every normal implementation has an externally approved 9.8+ plan before code starts.
3. Every closeout draft has all seven fields: `whatChanged`, `whatItDoes`, `whyItMatters`, `whereItLives`, `proofCommands`, `knownLimits`, and `reviewNext`.
4. Every ship proves the default live dashboard, not only a temporary port.
5. Every ship proves the dashboard served commit equals repo HEAD.
6. Every card moved to done has proof in the status note and Recent Builds closeout.
7. Every touched backlog card is moved, split, scoped, or updated before closeout.
8. Every major closeout includes where-it-lives metadata for `FOUNDATION-SURFACE-UPDATES-001` to render later.
9. Any red `foundation:verify` result stops the next build until green or explicitly routed to the active backlog.
10. Emergency bypass, if needed later, must be explicit and leave a follow-up card. V1 should not silently bypass.

## Known Limits

- This audit does not build hooks.
- This audit does not redesign Recent Builds / Recent Work.
- This audit does not build Action Review.
- This audit does not create more process cards.

## Next

Build `PROCESS-HOOKS-001` as the narrow enforcement slice, then return to `ACTION-REVIEW-APPLY-001`, then stop and re-plan with Steve.

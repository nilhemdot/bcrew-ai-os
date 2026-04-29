# Verifier Consolidation V1

Plain English: verifier failures should tell the operator what is wrong and what to do next.

## Consolidated Check Patterns

| Pattern | Shared helper / rule |
| --- | --- |
| Required text in UI/API/docs | `ensureIncludesAll` |
| Required backlog card state | `ensureBacklogCard` |
| Required closeout key and linked card | `ensureCloseoutLinked` |
| Required npm script text | existing claimed-artifact verifier |
| Required active card references | `buildCardReferenceTrustStatus` |
| Required active source references | `buildSourceReferenceTrustStatus` |

## Message Rewrites

| Before | After |
| --- | --- |
| System Inventory pages explain live backing and boundaries | System Inventory shows all nine configured plugin surfaces |
| Foundation pages are mapped to backing APIs/docs/tables/source IDs/backlog owners | Foundation pages, sub-surfaces, and critical API routes are mapped |
| api/foundation-hub exposes the Foundation surface freshness sweep | Runtime Health can show Foundation surface-map findings |
| current-state documents Data Sources and System Inventory purpose boundaries | Current State explains Data Sources vs System Inventory in plain English |
| done backlog cards have ID-named verifier coverage or approved exceptions | Done cards have proof or a visible expiring exception |
| done cards and closeouts do not claim missing artifacts | Done cards and closeouts only claim artifacts that exist |
| verifier exceptions are valid and not expired | Verifier exceptions have owner, reason, date, and have not expired |
| Runtime Health exposes automatic Backlog Hygiene findings | Runtime Health shows backlog drift without Steve spotting it manually |
| Source-reference IDs resolve to source contracts | Source Contract Trust has no undeclared active source IDs |
| post-ship fanout checker exists and catches synthetic gaps | Post-ship fanout catches missing closeout updates before review |
| dashboard served commit matches repo HEAD | Dashboard is serving the same code as the repo |
| worker served commit matches repo HEAD and LaunchAgent pid | Worker is serving the same code as the repo |

## V1 Boundary

- This is verifier hygiene, not a full rewrite.
- No check is removed unless its behavior is covered by an equivalent helper.
- The proof is a green `foundation:verify` with no coverage loss.

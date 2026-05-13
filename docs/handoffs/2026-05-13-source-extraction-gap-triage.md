# Source Extraction Gap Triage - 2026-05-13

This report is triage only. It does not start extraction jobs, repair credentials, crawl paid systems, mutate Drive permissions, or promote new source work into the current sprint.

## Summary

- Connector matrix rows: 25
- Rows needing triage: 23
- Triage items: 23
- Missing triage source IDs: none
- Buckets: safe_next=3, sprint_2_candidate=12, needs_steve_access=5, blocked=3

## Queued Next-Sprint Candidates

- ATOM-FLOW-AUTO-DEMOTION-001 (P0) - Atom-gap rows prove maturity labels need automatic demotion before product loops trust source state.
- EXTRACT-RUN-HARDENING-EXECUTION-001 (P0) - Extraction retry/backoff execution should run before new source lanes expand the failure surface.
- RESEARCH-LANE-PURGE-001 (P1) - The parked research lane should be reviewed before more proposed source cards accumulate.

## Ranked Triage

| Rank | Bucket | Source | State | Credential | Proposed next | Blocker |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | safe_next | SRC-CLICKUP-001 / clickup | missing_extraction | available | SOURCE-EXTRACTION-TARGET-SEED-001 | No extraction target or artifact flow is visible. |
| 2 | safe_next | SRC-FUB-001 / fub | missing_extraction | available | SOURCE-EXTRACTION-TARGET-SEED-001 | No extraction target or artifact flow is visible. |
| 3 | safe_next | SRC-MISSIVE-001 / missive | routing_gap | available | SOURCE-HUB-ROUTING-GAP-REPAIR-001 | Synthesis exists but routing destination is not visible. |
| 4 | sprint_2_candidate | SRC-GDRIVE-001 / drive | atom_gap | available | ATOM-FLOW-AUTO-DEMOTION-001 | Artifacts/candidates exist but promoted atoms are not visible. |
| 5 | sprint_2_candidate | SRC-SLACK-001 / slack | atom_gap | available | ATOM-FLOW-AUTO-DEMOTION-001 | Artifacts/candidates exist but promoted atoms are not visible. |
| 6 | sprint_2_candidate | SRC-GA4-001 / ga4 | missing_contract | blocked | SRC-CONTRACT-EXPANSION-001 | SRC-GA4-001 is missing as a first-class source contract. |
| 7 | sprint_2_candidate | SRC-GBP-001 / gbp | missing_contract | blocked | SRC-CONTRACT-EXPANSION-001 | SRC-GBP-001 is missing as a first-class source contract. |
| 8 | sprint_2_candidate | SRC-GDOCS-001 / google-docs-type | missing_contract | available | SRC-CONTRACT-EXPANSION-001 | SRC-GDOCS-001 is missing as a first-class source contract. |
| 9 | sprint_2_candidate | SRC-GSC-001 / gsc | missing_contract | blocked | SRC-CONTRACT-EXPANSION-001 | SRC-GSC-001 is missing as a first-class source contract. |
| 10 | sprint_2_candidate | SRC-GSHEETS-001 / google-sheets-type | missing_contract | available | SRC-CONTRACT-EXPANSION-001 | SRC-GSHEETS-001 is missing as a first-class source contract. |
| 11 | sprint_2_candidate | SRC-GSLIDES-001 / google-slides-type | missing_contract | available | SRC-CONTRACT-EXPANSION-001 | SRC-GSLIDES-001 is missing as a first-class source contract. |
| 12 | sprint_2_candidate | SRC-TELEGRAM-IN-001 / telegram-inbound | missing_contract | blocked | SRC-CONTRACT-EXPANSION-001 | SRC-TELEGRAM-IN-001 is missing as a first-class source contract. |
| 13 | sprint_2_candidate | SRC-WEB-001 / web-external | missing_contract | blocked | SRC-CONTRACT-EXPANSION-001 | SRC-WEB-001 is missing as a first-class source contract. |
| 14 | sprint_2_candidate | SRC-WHATSAPP-001 / whatsapp | missing_contract | blocked | SRC-CONTRACT-EXPANSION-001 | SRC-WHATSAPP-001 is missing as a first-class source contract. |
| 15 | sprint_2_candidate | SRC-ZOOM-001 / zoom | missing_contract | blocked | SRC-CONTRACT-EXPANSION-001 | SRC-ZOOM-001 is missing as a first-class source contract. |
| 16 | needs_steve_access | SRC-GADS-001 / google-ads | blocked | blocked | SRC-GADS-OAUTH-REPAIR-001 | OAuth invalid_grant / re-auth required before this can be marked connected. |
| 17 | needs_steve_access | SRC-MYICRO-001 / mycro | blocked | blocked | SRC-MYICRO-ACCESS-DECISION-001 | Source contract exists, but logged-in paid-app extraction is not connected. |
| 18 | needs_steve_access | SRC-PUBLISH-001 / socialpilot | blocked | blocked | SRC-PUBLISH-AUTH-CONTEXT-001 | Enterprise API key exists as a candidate, but owner/user auth context is not validated. |
| 19 | needs_steve_access | SRC-REAL-001 / real | blocked | blocked | SRC-REAL-CONNECTION-001 | Never connected in the new system. |
| 20 | needs_steve_access | SRC-SKOOL-001 / skool-earlyaidopters | blocked | blocked | SKOOL-ACCESS-MATRIX-001 | Access, policy, and earlyaidopters paid-community permissions need explicit matrix proof. |
| 21 | blocked | SRC-GHL-001 / ghl | missing_extraction | blocked | SOURCE-EXTRACTION-TARGET-SEED-001 | No extraction target or artifact flow is visible. |
| 22 | blocked | SRC-META-001 / meta | missing_extraction | blocked | SOURCE-EXTRACTION-TARGET-SEED-001 | No extraction target or artifact flow is visible. |
| 23 | blocked | SRC-LOOM-001 / loom | blocked | blocked | SRC-LOOM-EXTRACTION-PATH-DECISION-001 | Bulk extraction path not validated; Loom SDK is not enough by itself. |

## Not Next Boundaries

- SRC-CLICKUP-001: Next work may scope the smallest proof slice only; do not start broad ingestion or new external crawling from this triage card.
- SRC-FUB-001: Next work may scope the smallest proof slice only; do not start broad ingestion or new external crawling from this triage card.
- SRC-MISSIVE-001: Next work may scope the smallest proof slice only; do not start broad ingestion or new external crawling from this triage card.
- SRC-GDRIVE-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-SLACK-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-GA4-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-GBP-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-GDOCS-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-GSC-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-GSHEETS-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-GSLIDES-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-TELEGRAM-IN-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-WEB-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-WHATSAPP-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-ZOOM-001: Keep as next-sprint planning input; do not silently promote into the current sprint.
- SRC-GADS-001: Needs Steve/access/rights decision before any authenticated extraction, credential repair, or paid-community crawling.
- SRC-MYICRO-001: Needs Steve/access/rights decision before any authenticated extraction, credential repair, or paid-community crawling.
- SRC-PUBLISH-001: Needs Steve/access/rights decision before any authenticated extraction, credential repair, or paid-community crawling.
- SRC-REAL-001: Needs Steve/access/rights decision before any authenticated extraction, credential repair, or paid-community crawling.
- SRC-SKOOL-001: Needs Steve/access/rights decision before any authenticated extraction, credential repair, or paid-community crawling.
- SRC-GHL-001: Do not implement connector/auth/extraction repair until a separate approved card removes the blocker.
- SRC-META-001: Do not implement connector/auth/extraction repair until a separate approved card removes the blocker.
- SRC-LOOM-001: Do not implement connector/auth/extraction repair until a separate approved card removes the blocker.

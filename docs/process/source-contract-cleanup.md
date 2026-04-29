# Source Contract Cleanup V1

Plain English: active Foundation files should not use a `SRC-*` ID unless that source exists in the source contract registry.

## Active Fixes

| Source ID | Resolution |
| --- | --- |
| `SRC-STRATEGY-QUARTER-001` | Added as a proposed source contract for the future Strategy Quarter input layer. |
| `SRC-MYICRO-001` | Added as a proposed source contract for Steve-authorized Mycro / myICOR training extraction. |

## Historical / Future References

These IDs were found in old audits or specs. They are classified here instead of being promoted into fake active source truth.

| Source ID | Classification | Current handling |
| --- | --- | --- |
| `SRC-AGENT-SATISFACTION-001` | future-candidate | Strategy Hub spec candidate. Not active source truth yet. |
| `SRC-YOUTUBE-001` | historical-alias | Use `SRC-YOUTUBE-INTEL-001` for planned YouTube intelligence. |
| `SRC-CREATOR-BLOGS-001` | historical-alias | Use `SRC-CREATOR-WATCHLIST-001` for creator/watchlist intelligence. |
| `SRC-SKOOL-TRAINING-001` | historical-alias | Use `SRC-SKOOL-001` for Skool source truth. |
| `SRC-BOOK-NOTES-001` | historical-alias | Future research/library notes are not active source truth yet. |

## V1 Boundary

- Active scan: current rebuild docs, source notes, Foundation code, and UI code.
- Historical audits, old handoffs, and specs are classified, not blocked.
- No source connection or extraction lane is built here.

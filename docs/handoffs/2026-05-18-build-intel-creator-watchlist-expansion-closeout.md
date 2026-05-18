# Build Intel Creator Watchlist Expansion Closeout

Card: `BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001`
Closeout key: `build-intel-creator-watchlist-expansion-v1`
Source ID: `SRC-CREATOR-WATCHLIST-001`

## What Changed

Expanded the canonical Build Intel creator watchlist with lookup-backed source refs for the current agent/extractor research queue. This registers source metadata only. It does not start extraction, crawl, transcript fetches, screenshots, keyframes, model calls, paid/private auth, Research Inbox writes, atom creation, or backlog mutation from extracted content.

## Watchlist Triage

| Creator/source | Priority | Cadence | Boundary | Source URLs | Status |
| --- | --- | --- | --- | ---: | --- |
| `dream-labs-ai` | P0 | weekly | public lookup-backed; extraction still pending operator approval | 2 | ready |
| `nate-herk` | P0 | weekly | mixed public and paid/community; only public metadata is in scope | 2 | ready |
| `chase-ai` | P0 | weekly | public lookup-backed; extraction still pending operator approval | 2 | ready |
| `everyday-ai-jordan-wilson` | P0 | daily | public lookup-backed news and operator education source | 3 | ready |
| `mark-kashef` | P0 | weekly | mixed public and paid Skool/community; paid/auth content blocked until approval | 4 | ready |
| `matt-pocock-total-typescript` | P0 | weekly | mixed public and paid course; paid course extraction blocked until approval | 3 | ready |
| `andrej-karpathy` | P0 | monthly | public original-source material for LLM Wiki and AI engineering | 3 | ready |
| `aaron-bitwise` | P0 | weekly | public lookup-backed low-code/business AI workflow source | 1 | ready |
| `openhuman-tinyhumansai` | P0 | weekly | public open-source agent/runtime source; no install or execution in this card | 2 | ready |

## Guardrails

- Paid/community/course surfaces remain metadata-only until `COURSE-SOURCE-AUTH-BOUNDARY-001` defines the approval boundary.
- OpenHuman is registered as public source truth only; this card does not install, run, or integrate it.
- Build Intel source rows can inform future proposals, but they do not create Research Inbox rows, atoms, or backlog mutations in this card.

## Proof Commands

- `node --check lib/build-intel-watchlist.js lib/build-intel-creator-watchlist-expansion.js lib/foundation-verifier-control-loop.js lib/foundation-intelligence-audit-verifier.js scripts/process-build-intel-creator-watchlist-expansion-check.mjs scripts/foundation-verify.mjs`
- `npm run process:build-intel-creator-watchlist-expansion-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001.json --closeoutKey=build-intel-creator-watchlist-expansion-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:foundation-ship -- --card=BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001.json --closeoutKey=build-intel-creator-watchlist-expansion-v1 --commitRef=HEAD`

## Dogfood

Focused dogfood rejects:

- missing required source row
- missing required source URL
- duplicate creator ID
- duplicate source URL across source refs
- extraction approval on a watchlist row
- live extraction side effect
- paid-auth side effect

## Next

Continue `COURSE-SOURCE-AUTH-BOUNDARY-001` before any private, paid, Skool, MyICOR, Loom, or course extraction. If repo truth surfaces a higher P0 safety blocker, handle that first and leave private/source-auth extraction blocked.

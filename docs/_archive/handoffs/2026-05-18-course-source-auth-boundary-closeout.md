# Course Source Auth Boundary Closeout

Card: `COURSE-SOURCE-AUTH-BOUNDARY-001`
Closeout key: `course-source-auth-boundary-v1`

## Summary

Defined the Foundation source-auth boundary before private/course extraction. V1 separates metadata-only preflight from approved extraction for MyICOR, Skool, Loom/private training, and public YouTube Build Intel sources.

## Source Boundary Table

| Source | Class | Preflight | Extraction | Status |
| --- | --- | --- | --- | --- |
| `SRC-MYICRO-001` | paid course | metadata-only | blocked pending source-auth approval | blocked |
| `SRC-SKOOL-001` | private community/course | metadata-only | blocked pending source-auth approval | blocked |
| `SRC-LOOM-001` | private video/training | metadata-only | blocked pending source-auth approval | blocked |
| `SRC-YOUTUBE-INTEL-001` | public no-auth | metadata-only | blocked until public packet approval | blocked |

## Approval Packet

Required before private/paid/course extraction: source ID, source class, access owner, approved actor, approved access method, permitted content types, max scope, artifact storage policy, privacy/redaction policy, content-use boundary, downstream use policy, operator review cadence, rollback/delete plan, proof command, and expiry/review date.

## Proof

- `node --check lib/course-source-auth-boundary.js lib/foundation-intelligence-audit-verifier.js scripts/process-course-source-auth-boundary-check.mjs scripts/foundation-verify.mjs`
- `npm run process:course-source-auth-boundary-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=COURSE-SOURCE-AUTH-BOUNDARY-001 --planApprovalRef=docs/process/approvals/COURSE-SOURCE-AUTH-BOUNDARY-001.json --closeoutKey=course-source-auth-boundary-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=COURSE-SOURCE-AUTH-BOUNDARY-001 --closeoutKey=course-source-auth-boundary-v1`
- `npm run process:foundation-ship -- --card=COURSE-SOURCE-AUTH-BOUNDARY-001 --planApprovalRef=docs/process/approvals/COURSE-SOURCE-AUTH-BOUNDARY-001.json --closeoutKey=course-source-auth-boundary-v1 --commitRef=HEAD`

## Dogfood

Focused proof rejects missing Skool/source rows, missing approval fields, unsafe private approval without packet ref, live extraction/transcript fetch, paid/private auth, Research Inbox writes, KB drafts, and atom creation.

## Not Done

No login, private auth, paid auth, source crawl, transcript fetch, screenshot/keyframe capture, download, model call, Research Inbox write, KB draft, atom, action route, external write, Drive mutation, Harlan/OpenHuman runtime, hidden subagent, or parallel builder launched.

## Next

Continue `EXTRACTION-TEAM-001`. MyICOR, Skool, Loom/private training, and course extraction remain blocked until source-specific approval packets exist.

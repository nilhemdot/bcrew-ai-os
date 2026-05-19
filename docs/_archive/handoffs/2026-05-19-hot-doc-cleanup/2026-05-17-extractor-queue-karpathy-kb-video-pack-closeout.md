# Extractor Queue Karpathy KB Video Pack Closeout

Card: `EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001`

Closeout key: `extractor-queue-karpathy-kb-video-pack-v1`

Branch: `foundation/system-health-red-to-green-001`

## What Changed

- Added `lib/extractor-queue-karpathy-kb-video-pack.js` as the source-owned queue packet module.
- Added Dream Labs AI to the Build Intel watchlist as `public_lookup_required`.
- Seeded `karpathy-kb-video-pack` as a blocked/pending-approval manual extraction control target.
- Tightened runtime readiness so `pending_approval` queue targets are not classified as runnable.
- Represented the packet in Source Lifecycle as a blocked/manual governed target with bounded caps and no quota increase.
- Added focused proof, plan, approval, verifier coverage, and closeout registry coverage.

## What It Does

The packet records the Dream Labs AI video, Nate Herk video, and original Karpathy LLM Wiki source as a single fail-closed, pending-approval Build Intel extraction target. It gives the next research/preflight sprint durable source truth without running extraction.

## Why It Matters

Build Intel can now move from chat titles to governed queue truth. The source packet is visible to Foundation readiness and can be inspected by agents, but it cannot run live extraction, spend money, fetch transcripts, capture screenshots, or mutate Research Inbox/backlog/atoms without a separate approval.

## Proof

- `node --check lib/extractor-queue-karpathy-kb-video-pack.js lib/extraction-runtime-readiness.js lib/foundation-extraction-runtime-verifier.js scripts/process-extractor-queue-karpathy-kb-video-pack-check.mjs scripts/foundation-verify.mjs`
- `npm run process:extractor-queue-karpathy-kb-video-pack-check -- --close-card --json` passed 28/28, route 81ms, target `blocked`, runnable `false`.
- `npm run backlog:hygiene -- --json` passed with 651 cards and 0 findings.
- `npm run foundation:verify -- --json-summary --failures-only` passed 475/475 after served worker drift was repaired. A worker dry-run reported `due=0` before restart; no live extraction or Agent Feedback auto-send job ran.
- `npm run process:foundation-ship -- --card=EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001 --planApprovalRef=docs/process/approvals/EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001.json --closeoutKey=extractor-queue-karpathy-kb-video-pack-v1 --commitRef=HEAD` passed before push.

Focused proof covers Dream Labs watchlist truth, Nate Herk continuity, three source candidates, blocked/pending-approval/manual target status, no scheduled job key, no live-run approval, no source crawl run for the target, readiness route non-runnable status, Source Lifecycle baseline representation, and dogfood failures for active/scheduled, live-approved, missing Dream Labs, and missing URL variants.

## Known Limits

- This does not run live extraction.
- This does not fetch transcripts, crawl pages, capture screenshots, summarize videos, or call a video model.
- This does not approve no-auth/no-paid extraction; it only creates a pending-approval packet.
- This does not write Research Inbox proposals, create atoms, mutate backlog from extracted content, or do Harlan/Fal/voice/Canva/OpenHuman work.

## Review Next

Continue to `BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001` as proposal/research only unless a Foundation readiness or budget gate turns red.

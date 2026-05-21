# YOUTUBE-CREATOR-DAILY-WATCH-001 Closeout

Closeout key: `youtube-creator-daily-watch-v1`
Card: `YOUTUBE-CREATOR-DAILY-WATCH-001`
Target: `youtube-creator-daily-watch`
Scheduled job: `youtube-creator-daily-watch`
Report artifact: `research-pool:youtube-creator-daily-watch`

## What Shipped

- A scheduled public no-auth YouTube creator-channel watch over canonical Build Intel watchlist refs.
- Mark Kashef starts at last 50 public videos; other approved public YouTube creators start at last 20.
- Discovered video metadata is deduped into `source_crawl_items` with creator, channel URL, video ID, title, visible publish date, URL, discovery run, source IDs, first-seen, and last-seen provenance.
- A Foundation scout report exposes the reviewable research pool for Dev Team Hub / Build Intel review.
- Title-level candidate atoms and evidence hits are proposal-only and do not create backlog cards.
- Private/auth/member/comment/course/resource-link/external-write paths remain blocked.

## Watched Public Creators

- Mark Kashef (mark-kashef) - https://www.youtube.com/@Mark_Kashef/videos - baseline 50
- Nate Herk (nate-herk) - https://www.youtube.com/@nateherk/videos - baseline 20
- Chase AI (chase-ai) - https://www.youtube.com/@chase-h-ai/videos - baseline 20
- Everyday AI / Jordan Wilson (everyday-ai-jordan-wilson) - https://www.youtube.com/@EverydayAI/videos - baseline 20
- Matt Pocock / Total TypeScript (matt-pocock-total-typescript) - https://www.youtube.com/@mattpocockuk/videos - baseline 20
- Andrej Karpathy (andrej-karpathy) - https://www.youtube.com/@karpathy/videos - baseline 20
- Aaron Bitwise (aaron-bitwise) - https://www.youtube.com/@AaronBitwise/videos - baseline 20

## Lookup Gaps

- Dream Labs AI (dream-labs-ai) - public_video_ref_without_channel_url
- Dan Martell (dan-martell) - public_channel_url_lookup_required
- Nick Saraev (nick-saraev) - public_channel_url_lookup_required
- Paul J Lipsky (paul-j-lipsky) - public_channel_url_lookup_required
- Linking Your Thinking / Nick Milo (linking-your-thinking-nick-milo) - public_channel_url_lookup_required
- Mansel Scheffel (mansel-scheffel) - public_channel_url_lookup_required
- AI News & Strategy Daily (ai-news-strategy-daily) - public_channel_url_lookup_required
- Ray Amjad (ray-amjad) - public_channel_url_lookup_required
- Alex Finn (alex-finn) - public_channel_url_lookup_required
- Jono Catliff (jono-catliff) - public_channel_url_lookup_required
- Chris Bradley (chris-bradley) - public_channel_url_lookup_required
- Ambitious AI (ambitious-ai) - public_channel_url_lookup_required
- Brad | AI & Automation (brad-ai-automation) - public_channel_url_lookup_required
- Creator Magic (creator-magic) - public_channel_url_lookup_required
- Stacked Podcast (stacked-podcast) - public_channel_url_lookup_required
- Zane Cole (zane-cole) - public_channel_url_lookup_required
- JP Middleton (jp-middleton) - public_channel_url_lookup_required
- Next Gen AI (next-gen-ai) - public_channel_url_lookup_required
- Leveling Up / Eric Siu (leveling-up-eric-siu) - public_channel_url_lookup_required
- Simon Scrapes (simon-scrapes) - public_channel_url_lookup_required

## Proof Findings

- PASS watch plan includes known public YouTube creator channel refs: 7 creator(s)
- PASS Mark Kashef baseline depth is last 50: 50
- PASS other public creators baseline depth is last 20: 6 non-Mark creator(s)
- PASS all watched refs are public no-auth YouTube videos pages: https://www.youtube.com/@Mark_Kashef/videos, https://www.youtube.com/@nateherk/videos, https://www.youtube.com/@chase-h-ai/videos, https://www.youtube.com/@EverydayAI/videos, https://www.youtube.com/@mattpocockuk/videos, https://www.youtube.com/@karpathy/videos, https://www.youtube.com/@AaronBitwise/videos
- PASS lookup gaps do not become private/auth crawling: 20 lookup gap(s)
- PASS source crawl target exists for daily watch: youtube-creator-daily-watch
- PASS source crawl target is scheduled and linked to Foundation job: scheduled/youtube-creator-daily-watch
- PASS Foundation job is scheduled operational-write: scheduled/operational_write
- PASS latest scheduled job run succeeded: job-youtube-creator-daily-watch-20260521210220-3fk17n/succeeded
- PASS research pool has persisted source-crawl items: 132 item(s)
- PASS research pool dedupes by video ID: 0 duplicate(s)
- PASS pool rows preserve required provenance: 132 row(s)
- PASS pool rows prove no-auth/no-private/no-comment/no-external-follow boundary: metadata flags
- PASS research pool report artifact exists: research-pool:youtube-creator-daily-watch
- PASS report links creator watchlist and YouTube intel source IDs: SRC-CREATOR-WATCHLIST-001, SRC-YOUTUBE-INTEL-001
- PASS report is exposed for Dev Team Hub / Build Intel review: {"hub":true,"pool":true}
- PASS report records no auto backlog cards and no external writes: {"auto":false,"external":true}
- PASS report contains reviewable research pool output: 132 structured item(s)
- PASS hard boundaries are explicit: Public YouTube channel/video metadata only. | No Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment/course extraction. | Do not follow purchase, download, opt-in, booking, form, community, or external resource links. | Do not fetch transcripts, call models, capture screenshots/keyframes, or run visual interpretation from the daily watch. | Do not mutate credentials, browser profiles, source systems, provider/account config, Drive permissions, or external systems. | Do not create backlog cards automatically from creator findings; promotion is approval-gated. | Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or Drive permission lanes from this card.

## Proof Commands

- `node --check lib/youtube-creator-daily-watch.js`
- `node --check scripts/run-youtube-creator-daily-watch.mjs`
- `node --check scripts/process-youtube-creator-daily-watch-check.mjs`
- `npm run foundation:job -- --job=youtube-creator-daily-watch --actor=youtube-creator-daily-watch-proof --force`
- `npm run process:youtube-creator-daily-watch-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=YOUTUBE-CREATOR-DAILY-WATCH-001 --planApprovalRef=docs/process/approvals/YOUTUBE-CREATOR-DAILY-WATCH-001.json --closeoutKey=youtube-creator-daily-watch-v1 --commitRef=HEAD`

## Next

Next active card: `DEV-TEAM-HUB-V0-001`. Do not start it without Steve/Orchestrator direction from this chat.

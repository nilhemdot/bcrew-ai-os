# Creator Watchlist Reconcile - 2026-05-23

Source IDs: `SRC-CREATOR-WATCHLIST-001`, `SRC-YOUTUBE-INTEL-001`

Status: public YouTube channel URLs reconciled for the current Build Intel watchlist where the source was clear enough to avoid guessing.

## What Changed

The daily public YouTube metadata watch now has 30 verified Build Intel public YouTube creators instead of 8.

This is still metadata-only discovery:

- detect new public videos
- record title, URL, visible channel metadata, first seen / last seen, and source provenance
- no transcript extraction
- no screenshots or visual interpretation
- no Skool/community crawling
- no automatic backlog card creation

Deep understanding belongs to `GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001`, not the daily watch.

Latest applied run after the 30-creator reconcile:

- Crawl run: `crawl-youtube-creator-daily-watch-20260523133645020-fd2832b8`
- Creators checked: 30
- Lookup gaps: 0
- Deduped public video metadata rows saved: 538
- Proposal-only atoms/hits written: 538 / 538

## Build Intel Channels Now Watchable

| Creator | Public YouTube surface |
| --- | --- |
| ICOR with Tom / AI Productivity | `https://www.youtube.com/@myicor` |
| Mark Kashef | `https://www.youtube.com/@Mark_Kashef` |
| Kia Ghasem / AI Automations | `https://www.youtube.com/@KiaGhasem` |
| Nate Herk | `https://www.youtube.com/@nateherk` |
| Dream Labs AI | `https://www.youtube.com/@DreamLabs_AI` |
| Chase AI | `https://www.youtube.com/@chase-h-ai` |
| Everyday AI / Jordan Wilson | `https://www.youtube.com/@EverydayAI` |
| Matt Pocock / Total TypeScript | `https://www.youtube.com/@mattpocockuk` |
| Andrej Karpathy | `https://www.youtube.com/@karpathy` |
| Aaron Bitwise | `https://www.youtube.com/@AaronBitwise` |
| Dan Martell | `https://www.youtube.com/@danmartell` |
| Nick Saraev | `https://www.youtube.com/@nicksaraev` |
| Paul J Lipsky | `https://www.youtube.com/@PaulJLipsky` |
| Linking Your Thinking / Nick Milo | `https://www.youtube.com/@linkingyourthinking` |
| Mansel Scheffel | `https://www.youtube.com/@mansel.scheffel` |
| AI News & Strategy Daily | `https://www.youtube.com/@artificialintelligencenews1373` |
| Ray Amjad | `https://www.youtube.com/@ramjad` |
| Alex Finn | `https://www.youtube.com/@AlexFinn` |
| Jono Catliff | `https://www.youtube.com/@jonocatliff` |
| Chris Bradley / MRR Official | `https://www.youtube.com/@chrisbradleymrrofficial` |
| Ambitious AI | `https://www.youtube.com/@ambitious1z` |
| Brad Bonanno / AI & Automation | `https://www.youtube.com/@bradbonanno` |
| Creator Magic | `https://www.youtube.com/@creatormagicai` |
| Stacked Podcast | `https://www.youtube.com/@stackedpod` |
| Jack / Itssssss_Jack | `https://www.youtube.com/@Itssssss_Jack` |
| Zane Cole | `https://www.youtube.com/@ZaneCole` |
| JP Middleton | `https://www.youtube.com/@OfficialJPMiddleton` |
| Next Gen AI | `https://www.youtube.com/@NextGenAIHQ` |
| Leveling Up / Eric Siu | `https://www.youtube.com/@levelingupofficial` |
| Simon Scrapes | `https://www.youtube.com/@simonscrapes` |

## Still Needs Reconcile

No Steve-supplied Build Intel YouTube channel names remain parked from the May 23 reconcile.

`OpenHuman / tinyhumansai` remains a Build Intel source lead without a public YouTube channel ref and is not part of the daily YouTube channel watch.

## Marketing Sources Captured But Parked

The following marketing/content sources now have public YouTube/site refs in the watchlist, but they remain `marketing_content_later` and are not part of the current Build Intel sprint:

- Neil Patel
- Russell Brunson
- Alex Hormozi
- Arsh Sanwarwala / ThrillX

## Operator Doctrine

Steve wants the future system to consume creators across surfaces, not just YouTube:

- YouTube
- Skool/community text where permitted
- blogs/newsletters
- social posts
- public GitHub/repos/packages where relevant

The watchlist is source discovery. The value comes later when God Mode extraction can select the highest-signal items and understand transcript, description/resource links, screenshots, visible workflows, and code/UI shown on screen.

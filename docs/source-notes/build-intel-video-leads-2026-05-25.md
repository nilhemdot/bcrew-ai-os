# Build Intel Video Leads - 2026-05-25

Source IDs: `SRC-CREATOR-WATCHLIST-001`, `SRC-YOUTUBE-INTEL-001`

Status: source leads plus post-check extraction status. These notes do not start extraction; they record what the governed system already knows.

## Operator Context

Steve supplied more public YouTube Build Intel leads while the God Mode extractor/source-packet work was active. These leads should enter the governed creator/source queue, then source grading decides whether the creator is S/A/B/C/D for each lane.

## Leads

### Brad Bonanno / AI & Automation

- Channel: `https://www.youtube.com/@bradbonanno`
- Video: `https://www.youtube.com/watch?v=QZMljuD10sU`
- Title resolved by YouTube oEmbed: `My Claude Code Can INSTANTLY Watch Any Video (Here's How)`
- Why it matters: directly compares against BCrew's God Mode video route. Extract and review for useful `/watch`-style ideas, but do not assume it beats our source-packet, visual evidence, link approval, and Director pipeline until extraction proves it.
- Status: already God Mode full-watched in report artifact `batch:youtube-latest-20:api-full-watch-v1:20260525185845` at `2026-05-25T18:58:45.431Z` using `gemini-3.5-flash`.
- Extracted ideas: `Multimodal Video Ingestion Tool` and `Adaptive Frame-Capping Token Optimizer`.
- Resolved public resource: `https://github.com/bradautomates/claude-video`.
- Approval-required links: Google sign-in, Cal.com, LinkedIn, Kit signup, and YouTube support. These require exact source-packet decisions before deeper follow-up.

### Steve Builder-Comprehension Video Lead / Creator TBD

- Supplied links: `https://youtu.be/vmiuxvlt7_i?si=bxrbdlnq12lgevpl` and `https://youtu.be/vmiuxvlt7_i?si=aoxyaaloipygq0go`
- Canonicalized candidate URL: `https://www.youtube.com/watch?v=vmiuxvlt7_i`
- Why it matters: Steve flagged this as important for extractors, Codex, Claude Code, and future builders to understand the codebase/system, not just as another source video to mine for build ideas.
- Intake status: exact lower-case video ID `vmiuxvlt7_i` currently returns YouTube `Video unavailable`; Steve then said he may have provided the wrong link.
- Queue posture: add as a P0 confirmation-needed Build Intel lead, but do not spend extraction/model budget or build conclusions until the exact URL/title/creator is confirmed tomorrow.

## Case-Sensitivity Note

Steve's pasted YouTube short link arrived lowercased as `qzmljud10su`. YouTube video IDs are case-sensitive; the resolved video ID is `QZMljuD10sU`.

## Not Next

- Do not rerun duplicate extraction just because the lead was mentioned again; use the existing full-watch report unless a new model comparison or source-packet follow-up is explicitly approved.
- Do not treat the video claims as implementation-ready until Director/Scoper review compares them against BCrew's existing Gemini video route, source-packet approvals, and hands/navigation gap.
- Do not replace BCrew's extractor design from a title or sales claim.

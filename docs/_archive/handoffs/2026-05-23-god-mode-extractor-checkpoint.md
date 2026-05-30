# God Mode Extractor Checkpoint

Date: 2026-05-23
Sprint: `YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21`
Active card: `MARK-KASHEF-LAST-50-BASELINE-001`

## Plain-English Truth

The goal is not "summarize YouTube links."

The goal is God Mode Extractor:

- reads source pages,
- watches/analyzes real video content,
- captures transcript/description/resource links,
- uses authenticated browser sessions for approved course/community sources later,
- turns evidence into ranked build/business/marketing opportunities,
- keeps exact provenance,
- does not auto-create backlog cards without approval.

Steve's priority is subscription-first when possible, but not at the cost of fake video watching.

## What Actually Happened

### 1. Gemini API Eyes was already proven

`GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001` is closed.

It used Gemini video understanding through the API route:

- report: `proof:god-mode-extractor-eyes-quality-loop-001`
- model recorded: `gemini-2.5-flash`
- route: `foundation-video-gemini-api`
- 3 exact approved public videos
- 3/3 improved vs transcript/page baseline
- +43 average quality delta
- timestamped visual evidence persisted
- proposal-only atoms/hits persisted

This is the real full-video Eyes proof currently in the system.

### 2. Gemini Workspace subscription browser was proven only as experimental

`GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001` is closed.

It proved a logged-in Gemini Workspace/App browser prompt could return structured output without a Gemini API key.

But after a stricter May 23 retest, Gemini web subscription returned:

```json
{
  "fullVideoWatchStatus": "cannot_watch_video"
}
```

for a YouTube URL when explicitly asked to watch/analyze the actual video timeline.

Therefore:

- Gemini subscription web cannot currently be treated as full-video watching from a YouTube URL.
- It can be a scout/reasoning route.
- It cannot be the Mark last-50 full-watch route unless a new proof shows true full-watch parity.

### 3. A wrong Mark scale-up ran

The system ran a subscription-browser Mark batch for ranks 4-10:

- report: `batch:mark-kashef-last-50:20260523221531`
- videos: 7/7
- proposal-only build candidates: 21
- atoms/hits: 21/21
- no external writes
- no auto backlog cards

This batch is useful as scout output only.

It is not full-watch proof.

Do not count this as "10/50 watched."

Correct wording:

- 10 Mark videos have subscription scout output.
- Full-video watched Mark baseline is not complete.
- Remaining Mark baseline should use Gemini API video-understanding unless subscription full-watch is proven later.

## Current Dirty Repo State

Uncommitted files exist from the interrupted Mark proof work:

- `package.json`
- `docs/process/approvals/MARK-KASHEF-LAST-50-BASELINE-001.json`
- `docs/process/mark-kashef-last-50-baseline-001-plan.md`
- `scripts/process-mark-kashef-last-50-baseline-check.mjs`

The script was partially corrected before this checkpoint:

- `--live-subscription` is being blocked for Mark full-watch baseline.
- intended next mode is `--live-gemini-api`.
- selection should use full-video/API Eyes reports, not subscription scout reports.

Before resuming build, inspect and finish or revert this dirty work intentionally. Do not blindly continue it.

## External Research Notes

Google's Gemini video understanding docs show the API supports YouTube URLs as `file_uri` / `fileData.fileUri`, and supports detailed video insight prompts with both audio and visual details plus timestamps. The docs also state Gemini samples video visually at about 1 FPS by default and supports clipping intervals/custom frame rate. Source: <https://ai.google.dev/gemini-api/docs/video-understanding>

Browserbase documents browser agents with persistent sessions, observability, and agent identity for real web interaction, plus Skills for reusable browser workflows and authentication flows. Sources: <https://docs.browserbase.com/use-cases/agents>, <https://docs.browserbase.com/integrations/skills/introduction>

Playwright's authentication docs confirm authenticated browser state can be saved/reused, but warn auth state can contain sensitive cookies/headers and should not be checked into repos. Source: <https://playwright.dev/docs/auth>

Skool does not appear to have a clean first-party public API for our needs. Third-party SkoolAPI docs describe account/session-based access and note credential-based auth is not ideal. For our system, Skool/MyICOR work should use dedicated extractor accounts, credential vault/session broker, approval boundaries, and read-only-first browser skills. Sources: <https://docs.skoolapi.com/>, <https://docs.skoolapi.com/security>

## Architecture Decision

God Mode Extractor should be layered:

1. Source Connectors
   - YouTube public watchlist and video URLs.
   - Skool/MyICOR/course/community sources later through exact approved auth sessions.
   - GitHub/repos/blogs/docs/social/community feeds as separate source connectors.

2. Hands
   - Browser controller for login, clicking, navigation, course progress, screenshots when needed, and source capture.
   - Uses isolated profiles / storage state / credential vault.
   - No normal personal browser automation.

3. Eyes
   - For YouTube full video: Gemini API video understanding is current reliable route.
   - For subscription: browser route is scout-only unless future proof shows true full-video watch from URL.
   - For courses/communities: browser page visual capture + transcript/page text + maybe provider vision if approved.

4. Ears/Text
   - Transcript/subtitle extraction where available.
   - Page description/resource links.
   - Community post/comment text.
   - Course lesson text/resources.

5. Brain
   - Synthesis/ranking layer.
   - Turns evidence into build/business/marketing opportunities.
   - Uses proposal-only atoms, evidence hits, reports, review routes.
   - No automatic backlog promotion.

6. Director
   - Ranks opportunities.
   - Decides what needs Steve approval.
   - Promotes only through `BUILD-OPPORTUNITY-PROMOTION-GATE-001`.

## Next Correct Build

Do not continue Mark 50 with subscription URL scout.

Next active work should stay on the live sprint card:

`MARK-KASHEF-LAST-50-BASELINE-001`

Purpose:

- Use Gemini API video understanding on one exact Mark video first.
- Include transcript, page description, caption metadata, screenshot metadata, resource-link classification, approval queue, and safe public resource metadata follow where allowed.
- Compare `gemini-2.5-flash` against `gemini-3.5-flash` on the same source package.
- No YouTube downloads.
- No upload workaround.
- No subscription URL-scout pretending to be full watch.
- Read Mark queue from `SRC-YOUTUBE-INTEL-001`.
- Persist report/atoms/hits as full-watch output.
- Compare quality against the subscription scout output already recorded.
- If quality/value is strong and gates are green, Steve can approve the next small Mark batch.

Acceptance:

- 1 exact public Mark video processed through `foundation-video-gemini-api`.
- both compared model results have timestamped visual evidence.
- the recommended model is selected from quality/value evidence.
- report says clearly `fullWatchRoute=gemini_api_youtube_url_video_understanding`.
- subscription scout report remains separate and labeled scout-only.
- no private/auth/source crawling.
- no external writes.
- no auto backlog cards.

## Later Roadmap

After Mark full-watch is stable:

1. Build Dev Team Intelligence Director over the evidence pool.
2. Build promotion gate from recommendation to backlog card.
3. Add creator/source scorecards:
   - people/communities followed,
   - platforms per person,
   - value grade S/A/B/C/D/F,
   - number of promoted ideas,
   - evidence quality,
   - cost/time per insight.
4. Add Skool/MyICOR extractor only after source/auth approval:
   - dedicated account,
   - credential vault,
   - session broker,
   - read-only browser navigation,
   - exact course/community approval,
   - no broad private crawling.
5. Productize God Mode Extractor as a possible standalone offer:
   - research/content/course-note engine,
   - business opportunity detector,
   - marketing content source miner,
   - training/course digest builder,
   - evidence-backed recommendation engine.

## Guardrail

If an extractor output does not prove real video/page/community evidence, it must be labeled scout, metadata, transcript, or baseline.

Do not label it God Mode full-watch.

# YouTube Extraction Tool — Availability + Security Audit

**Date:** 2026-04-22
**Purpose:** Decide which YouTube transcript extraction tool to install so Steve can pipe insights from videos he watches into the foundation layer.
**Status:** Research + pre-install security review complete. Install pending — deferred because another agent is active in the repo.

---

## Why this matters

Steve watches a lot of YouTube and needs a tool that can "see what he sees" — extract transcripts + metadata so the value can flow into Postgres and be reasoned over by Harlan/Crewbert. No dedicated YouTube skill or plugin was installed at audit time.

---

## What's already available (no install needed)

MCP tools present in the environment that can touch YouTube:

- `mcp__dataforseo__serp_youtube_video_info_live_advanced` — video metadata
- `mcp__dataforseo__serp_youtube_video_subtitles_live_advanced` — transcripts/captions (paid API calls)
- `mcp__dataforseo__serp_youtube_video_comments_live_advanced` — comments
- `mcp__dataforseo__serp_youtube_organic_live_advanced` — search/discovery
- `mcp__fal-ai__speech_to_text` — fallback transcription if no captions
- `mcp__firecrawl__firecrawl_scrape` — can scrape YouTube pages into markdown

**Not present:** no dedicated YouTube MCP server, no `yt-dlp` / `youtube-dl` CLI, no YouTube skill/plugin.
**Official Anthropic marketplace:** no first-party YouTube plugin. Installed plugins are only `frontend-design`, `superpowers`, `context7`.

---

## Candidates evaluated

Top community options researched:

| Repo | Stars | Lang | Last push | Notes |
|---|---|---|---|---|
| `jkawamoto/mcp-youtube-transcript` | 371 | Python | 2026-04-16 | Uses `yt-dlp` + `youtube-transcript-api` as backbone. Proxy support. |
| `kimtaeyoon83/mcp-server-youtube-transcript` | 525 | TS | 2025-12-24 | Hand-rolled protobuf. Shorts + ad-chapter filtering + language fallback. |
| `hancengiz/youtube-transcript-mcp` | 7 | — | 2025-12-09 | No license. Too small. Rejected. |
| `ergut/youtube-transcript-mcp` | — | — | — | Remote-hosted; zero install; works on mobile. Flagged as option but not deeply audited. |
| `zerowing113/claude-youtube-skill` | — | — | — | Claude Code *skill* (not MCP). Compiles videos/playlists into reference docs w/ embedded player + clickable timestamps. Possible value-extraction layer on top of raw transcripts. |
| Firecrawl (already installed) | — | — | — | `firecrawl_scrape` on a YouTube URL returns transcript as markdown. Zero new install. Keep as fallback. |

---

## Security pre-review — both top candidates

Both repos had their runtime source read line-by-line. Results:

### jkawamoto/mcp-youtube-transcript — CLEAN ✅

- Dependencies: `mcp`, `requests`, `beautifulsoup4`, `pydantic`, `rich-click`, `humanize`, `youtube-transcript-api`, `yt-dlp`. All legitimate and well-maintained.
- Network: only youtube.com + optional user-supplied proxy (Webshare or HTTP/HTTPS env vars). No telemetry, no third-party callouts.
- No shell exec, no file writes outside process scope, no credential scraping.
- License: MIT. Author Junpei Kawamoto — real identity, long-running public Python portfolio.

### kimtaeyoon83/mcp-server-youtube-transcript — CLEAN ✅

- Runtime deps: only `@modelcontextprotocol/sdk` (official Anthropic) + `mcp-evals`. Minimal surface.
- Network: only youtube.com (`/watch` and `/youtubei/v1/get_transcript`). No exfiltration.
- No `eval`, no `child_process`, no dynamic `require`, no postinstall scripts.
- Hand-rolled protobuf traced and matches YouTube's documented internal API shape.
- Android-client impersonation to bypass poToken A/B test — same technique `yt-dlp` uses. Standard in this space.
- License: MIT.

### What neither repo contained

- ❌ Obfuscated code
- ❌ Preinstall/postinstall scripts running arbitrary code
- ❌ Non-YouTube network calls
- ❌ Credential / token harvesting
- ❌ Typosquatted or suspicious dependency pins

---

## Recommendation

**Primary: `jkawamoto/mcp-youtube-transcript`**

- Most recent activity (April 2026) — YouTube breaks extractors quarterly; maintenance matters.
- Delegates to `yt-dlp`, the gold-standard YouTube tool — inherits fixes automatically.
- Proxy support built in — needed for bulk ingestion without rate-limit walls.
- Python fits the Mac mini / Postgres stack.

**Fallback: `kimtaeyoon83/mcp-server-youtube-transcript`** — safe to run alongside if jkawamoto ever has an outage.

**Keep:** Firecrawl as generic-scrape fallback. DataForSEO YouTube endpoints for on-demand/search.

**Optional add:** `zerowing113/claude-youtube-skill` as a value-extraction *skill* on top of raw transcripts (compile video/playlist → reference article w/ embedded player + timestamps). Not yet audited.

---

## When installing

1. Re-audit at install time — this space moves fast, a better/safer option may exist.
2. Prefer `uvx` / pinned version over `curl | bash` or `@latest`.
3. Show Steve the exact config diff (MCP server config) before touching anything.
4. Route transcripts into the foundation DB (likely a `content` or `video` table) so Harlan/Crewbert can reason over them.

---

## Source links

- https://github.com/jkawamoto/mcp-youtube-transcript
- https://github.com/kimtaeyoon83/mcp-server-youtube-transcript
- https://github.com/ergut/youtube-transcript-mcp
- https://github.com/zerowing113/claude-youtube-skill
- https://github.com/hancengiz/youtube-transcript-mcp
- https://www.firecrawl.dev/glossary/web-scraping-apis/how-to-extract-youtube-transcript-in-claude-code
- https://awesomeclaude.ai/how-to/use-youtube-with-claude

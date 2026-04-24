# Conversation — YouTube Extraction Tool Audit

**Date:** 2026-04-22
**Participants:** Steve + Claude (Opus 4.7, 1M)
**Outcome:** Saved audit report at `docs/audits/2026-04-22-youtube-extraction-tool-audit.md`. No installs, no commits, no code changes. Steve is shutting down and handing off to a deep-audit agent.
**Related files:**
- `docs/audits/2026-04-22-youtube-extraction-tool-audit.md` — the formal audit report

---

## Transcript

### Steve
> do we have the youtube extraciton skill or plugin or tool avail if not research it and make sure its avail for our system

### Claude
Checked local install and MCP surface.

**Already available via MCP (no install needed):**
- `mcp__dataforseo__serp_youtube_video_info_live_advanced` — video metadata
- `mcp__dataforseo__serp_youtube_video_subtitles_live_advanced` — transcripts/captions
- `mcp__dataforseo__serp_youtube_video_comments_live_advanced` — comments
- `mcp__dataforseo__serp_youtube_organic_live_advanced` — search/discovery
- `mcp__fal-ai__speech_to_text` — fallback transcription if no captions
- `mcp__firecrawl__firecrawl_scrape` — scrape YouTube pages

**Not available:**
- No dedicated YouTube skill or plugin (installed plugins: only `frontend-design`, `superpowers`, `context7`).
- No `yt-dlp` / `youtube-dl` CLI on the Mac.

Proposed three paths: (1) DataForSEO only, (2) `brew install yt-dlp` for local/bulk, (3) Both.

---

### Steve
> Can you search the anothropic and community skills and reserach the internet i swear thaswear there is a tool that can extract youtube video transcritps or the videos and either websearch etch. And yes i do have al lthose tools and they should be avail to you so go ahead resarech i watch a lot of youtube vidoes and need a tool that can see what i see so we can extract the value form them

### Claude
Web-searched + queried Anthropic marketplace. Findings:

**Official Anthropic marketplace:** no first-party YouTube plugin.

**Community options (all free, open-source):**
1. `kimtaeyoon83/mcp-server-youtube-transcript` — Shorts + multi-language + timestamps + ad-chapter filtering.
2. `jkawamoto/mcp-youtube-transcript` — simplest; uses `yt-dlp` + `youtube-transcript-api`.
3. `ergut/youtube-transcript-mcp` — remote-hosted, zero install, works on mobile.
4. `zerowing113/claude-youtube-skill` — Claude Code *skill* (not MCP); compiles videos/playlists into reference docs w/ embedded player + clickable timestamps.
5. `youtube-transcribe-skill` on FastMCP — saves transcript as local markdown.
6. Firecrawl (already installed) — `firecrawl_scrape` works on YouTube URLs.

Recommendation: primary `kimtaeyoon83` MCP + secondary `zerowing113` skill + Firecrawl as fallback. (Later revised — see below.)

---

### Steve
> I am working iwth another agent so i don't wnat to do any pushes or commit or code chagnes. but once i am done iwth it then yes lets get the aboslute best virus free install so we can have the best tool possible.

### Claude
Acknowledged — no installs, no commits, no config edits until green light. Committed to:
1. Vet for safety before installing (stars, age, open issues, author history, source read).
2. Prefer safest install path (`npx` pinned, not `@latest`; no curl-pipe-bash).
3. Re-benchmark at install time — space moves fast.

---

### Steve
> Yes if hter eis one you htink is avoluteily the vest can you not review the code to ensure there are no virues or bad thinks that live in the code etc?

### Claude
Pulled GitHub metadata + read every line of runtime source for the top two candidates.

**Repo metadata (as of 2026-04-19):**

| Repo | Stars | Forks | Last push | License |
|---|---|---|---|---|
| `kimtaeyoon83/mcp-server-youtube-transcript` | 525 | 86 | 2025-12-24 | MIT |
| `jkawamoto/mcp-youtube-transcript` | 371 | 61 | 2026-04-16 | MIT |
| `hancengiz/youtube-transcript-mcp` | 7 | 2 | 2025-12-09 | none (rejected) |

**Security review — `kimtaeyoon83/mcp-server-youtube-transcript`:** CLEAN ✅
- Runtime deps: `@modelcontextprotocol/sdk` (official Anthropic) + `mcp-evals` only.
- Network: only youtube.com (`/watch`, `/youtubei/v1/get_transcript`).
- No `eval`, no `child_process`, no file writes, no postinstall scripts.
- Hand-rolled protobuf traced and matches YouTube's documented internal API shape.
- Android-client impersonation — same technique `yt-dlp` uses.

**Security review — `jkawamoto/mcp-youtube-transcript`:** CLEAN ✅
- Deps: `mcp`, `requests`, `beautifulsoup4`, `pydantic`, `rich-click`, `humanize`, `youtube-transcript-api`, `yt-dlp`. All legitimate.
- Network: only youtube.com + optional user-supplied proxy.
- No shell exec, no credential scraping.
- Author Junpei Kawamoto — real identity, long-running public Python portfolio.

**Neither repo contained:** obfuscated code, pre/postinstall scripts, non-YouTube network calls, credential harvesting, typosquatted deps.

**Final recommendation:** **`jkawamoto/mcp-youtube-transcript`** as primary.

Why:
1. Most recent activity (2026-04-16 vs 2025-12-24) — YouTube breaks extractors quarterly, maintenance matters.
2. Delegates to `yt-dlp`, the gold-standard YouTube tool — inherits fixes automatically.
3. Proxy support built in — needed for bulk ingestion without rate-limit walls.
4. Python fits the Mac mini / Postgres stack.

`kimtaeyoon83` = safe fallback, can run alongside.

---

### Steve
> not surew what this chat was all about but i am going to do a restart if this is anyt gold in here for an auit or understanding tools can you put thi sinto an audit folder or what was this for?

### Claude
Wrote formal audit report to `docs/audits/2026-04-22-youtube-extraction-tool-audit.md` — includes availability summary, candidates table, full security review of top two, final recommendation, and install-time checklist.

---

### Steve
> ok save this converstaion to the places conversiaons get saved and make sure the reprot is in some kind of audit report i am shutting eveyrthign down and having an agent do a deep audit and revewing eveyrhtign top to bottom and consoldate notes etc. eventually

### Claude
Saving transcript to `docs/handoffs/` (this file). Audit report already in place. Safe to shut down.

---

## Key outputs for the deep-audit agent

1. **Audit report:** `docs/audits/2026-04-22-youtube-extraction-tool-audit.md` — decision-ready, install pending.
2. **No code changes made this session.** Git working tree unchanged by this conversation (except the new audit + handoff markdown files).
3. **Open action:** install `jkawamoto/mcp-youtube-transcript` MCP server after current agent's work completes. Re-audit at install time. Route transcripts into foundation DB so Harlan/Crewbert can reason over video content.

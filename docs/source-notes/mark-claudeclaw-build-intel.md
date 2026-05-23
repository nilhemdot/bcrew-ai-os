# Mark Kashef / ClaudeClaw Build Intel

Source IDs: `SRC-CREATOR-WATCHLIST-001`, `SRC-YOUTUBE-INTEL-001`, `SRC-SKOOL-001`, `SRC-GITHUB-BUILD-INTEL-001`

Status: source leads captured, mixed access boundaries. Public pages are safe for read-only metadata monitoring. Skool classroom pages and the ClaudeClaw OS repository are paid/auth member sources and must stay approval-bound.

## Why This Matters

Steve follows Mark Kashef for practical Claude Code, ClaudeClaw, and agentic OS patterns. These sources should feed the Build Intel / Dev Team pipeline as source-backed evidence, not loose chat notes.

## Source Leads

| Source | URL | Boundary | Initial read |
| --- | --- | --- | --- |
| Living Claude Code Course | `https://ea-claudecodelivingcourse.vercel.app/` | Public no-auth sales/course page | Public page says the course is updated weekly, includes 54 lessons, and bundles ClaudeClaw OS with Mission Control, Scheduled Agents, Hive Mind, Long-term Memories, War Room, and Audit & Usage. |
| ClaudeClaw Roadmap | `https://ea-roadmap.vercel.app/` | Public no-auth roadmap API/page | Public roadmap exposes ClaudeClaw OS board data and cards. Initial ClaudeClaw board pull returned 10 cards, 55 votes, 1 in progress, and 5 done. |
| Early AI-dopters Skool community | `https://www.skool.com/earlyaidopters` | Paid/auth private community | Public about page confirms private community, Mark Kashef ownership, Claude Code Living Course, ClaudeClaw Agentic OS, Obsidian + Claude Second Brain, and related AI/sales/cybersecurity topics. |
| Premium membership recordings | `https://www.skool.com/earlyaidopters/classroom/26269254?md=40b2005716c94833a5f4563d0f3c40f0` | Paid/auth classroom | Exact source lead only. Do not crawl or copy paid classroom content until a source packet approves access, content-use boundary, retention, and output rules. |
| ClaudeClaw classroom | `https://www.skool.com/earlyaidopters/classroom/f1a72e71?md=e02d48da3b644170a9a8ab0624804102` | Paid/auth classroom | Exact source lead only. Do not crawl or copy paid classroom content until a source packet approves access, content-use boundary, retention, and output rules. |
| ClaudeClaw OS private package | `https://github.com/earlyaidopters/claudeclaw-os` | Paid/auth private GitHub package | Exact package lead only. Never store member tokens in docs, backlog rows, source notes, git remotes, or committed files. Inspect only from a local approved package clone/export. |

## Public Roadmap Snapshot

Initial public ClaudeClaw OS roadmap read on 2026-05-23 returned these visible cards:

- `ClaudeClaw classroom series` - done, 18 votes.
- `ClaudeClaw V3` - done, 19 votes.
- `ClaudeClaw v4` - done, 3 votes.
- `Improve Hook Support for ClaudeClaw` - in progress, 1 vote.
- `v0 of Enterprise-Grade ClaudeClaw OS` - todo, 7 votes.
- `Text-Based War Room` - done, 4 votes.
- `Better War Room Experience` - done, 3 votes.
- `Delegated permissions in web portal` - backlog.
- `Natively support discord` - backlog.
- `Digital Twin (self or model) Solved for us` - backlog.

## Daily Watch Boundary

These sources should become part of Build Intel monitoring, but not all through the current YouTube daily watch.

- Public no-auth pages: daily metadata/hash/API snapshot is safe once a web roadmap/page watcher exists.
- YouTube: stays in `YOUTUBE-CREATOR-DAILY-WATCH-001`.
- Skool classroom/community: exact source leads only until approved member-source extraction packet exists.
- Private GitHub package: exact local package review only after Steve provides a valid package clone/export and source boundary is recorded.

## Source Crawl Targets

Captured in live Foundation source-crawl truth on 2026-05-23:

| Target key | Status | Runtime | Boundary |
| --- | --- | --- | --- |
| `mark-claude-code-living-course-public` | `planned` | `manual` | Public no-auth metadata/hash lead; requested daily once the public web watcher exists. |
| `mark-claudeclaw-roadmap-public` | `planned` | `manual` | Public no-auth roadmap API/page lead; requested daily once the public web watcher exists. |
| `mark-skool-premium-recordings` | `blocked` | `paused` | Paid/auth Skool classroom; exact source lead only until approved. |
| `mark-skool-claudeclaw-classroom` | `blocked` | `paused` | Paid/auth Skool classroom; exact source lead only until approved. |
| `mark-claudeclaw-os-private-github` | `blocked` | `paused` | Paid/private GitHub package; local approved clone/export only, no token storage. |

## Current Follow-Up Cards

- `YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002` - active sprint card for YouTube link/resource approval routing.
- `MARK-BUILD-INTEL-WEB-DAILY-WATCH-001` - build the public no-auth Mark web/roadmap daily watcher.
- `MARK-CLAUDE-CLAW-CODE-PACKAGE-REVIEW-001` - review the private package from the approved local clone/export without copying code or storing package credentials.
- `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001` - future full extractor runtime; not needed to record public page metadata.

## ClaudeClaw OS Package Snapshot

Steve supplied the current package access flow on 2026-05-23. A local read-only review clone was acquired without storing the temporary member token in repo truth. Clean package source:

- Repo: `https://github.com/earlyaidopters/claudeclaw-os`
- Reviewed head: `f166a30a0aba`
- Boundary: inspect for transferable patterns only. Do not copy private package code into AIOS production paths without explicit implementation approval and provenance review.

Initial architecture map from the package:

- Local agent OS wrapper around Claude Code / ACP providers, delivered through Telegram and a web dashboard.
- Core surfaces: Telegram chat, dashboard, scheduled tasks, Mission Control, multi-agent specialists, Hive Mind activity view, agent file editor, text/voice War Room, file sending, media handling.
- Provider seam: `src/agent-engine/` normalizes Claude SDK, OpenCode, Gemini CLI, Codex ACP, and custom ACP providers behind one event interface.
- Scheduling/mission queue: `src/scheduler.ts`, `src/mission-cli.ts`, and `src/message-queue.ts` serialize work, reset stuck runs, time out long tasks, and route work by agent.
- Memory: `src/memory.ts`, `src/memory-ingest.ts`, and `src/embeddings.ts` layer keyword/vector recall, recent important memories, consolidation insights, cross-agent activity, and duplicate-aware ingestion.
- Tool safety: `src/warroom-tool-policy.ts`, `src/exfiltration-guard.ts`, and `src/kill-switches.ts` provide default-deny side-effect tools, MCP filtering, audit logs, per-turn tool budgets, secret scanning, and runtime kill switches.
- Media/video: `src/media.ts` downloads Telegram media and prompts the agent to use Gemini for uploaded video analysis. This is useful prior art, but it is not continuous video watching, browser navigation, or frame-by-frame extractor vision.
- Live meetings: `warroom/server.py` and `warroom/daily_agent.py` use Gemini Live for speech-to-speech and can join Daily.co with a static avatar camera-out. The Daily path sets `video_in_enabled=false`, so it is voice/control plumbing, not visual screen understanding.

Early AIOS transfer candidates:

- Provider/brain adapter seam for Brain Fleet execution.
- Mission queue and stuck-run recovery patterns for extractor jobs.
- Default-deny tool/MCP policy for any Harlan, War Room, or future agent lane.
- Kill-switch and exfiltration guard concepts for God Mode Extractor safety.
- Hive Mind / Mission Control UX patterns for Dev Team Hub once the data pipe is stable.
- Media upload to Gemini as a narrow input path, while AIOS still needs a stronger `EYES/HANDS/BRAIN` extractor for browser/video/screen work.

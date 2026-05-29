# MYICOR-SOURCE-SYSTEM-MAP-001 Plan

## What

Build MyICOR Source System Map V1 as the first paid-source system adapter under Human Web Agent V1.

Plain English: getting into MyICOR proved the source-session path. The next useful step is not a blind crawl. It is a stateful source map that uses the MyICOR MCP/API first, records what the source contains, finds the high-value AIOS/agent/memory/workflow material, tracks what changed, suppresses useless or already-implemented material, and only then sends exact lesson/content packets to the visible local isolated browser extractor when the connector cannot provide the needed evidence. The route rule is MCP catalog first, browser gap-fill second.

## Why

MyICOR looks like a high-value source for AIOS architecture:

- courses and workshops on AI, Claude, MCP, agents, orchestration, RAG, workflows, SSOT, process mapping, personal intelligence systems, and team memory
- likely recorded lessons/coaching calls or media surfaces that the MCP metadata does not fully expose
- an official MCP/API intended for agents to read the system safely

The same pattern should later power Skool: map the source, grade it, monitor deltas, extract only approved/high-value content, and keep the Dev Director from rereading noise forever.

## Acceptance Criteria

- V1 treats MyICOR as a source system, not a one-off scrape.
- Route order is MCP catalog first, visible local isolated browser second, and only for approved gaps.
- The source map captures course catalog, lesson metadata, progress/deep links, learning-resource search, trend reports, workstreams/tool-stack/lifecycle surfaces where available.
- The map honestly records MCP gaps: full lesson body/script, video/audio playback, coaching-call recording inventory if not exposed by the API, embedded follow links, and visual walkthrough evidence.
- The first state model includes `new`, `known_unchanged`, `changed`, `graded_keep`, `graded_ignore`, `implemented_cleared`, `needs_browser_gap_fill`, and `blocked_by_boundary`.
- Dev Director routing is proposal-only and can suppress ignored/cleared/implemented items.
- First extraction candidates are exact lessons, not broad course crawling.
- Skool reuse is explicit: the same source-map/delta-monitor pattern applies to approved Skool courses/communities later.
- This slice does not extract lesson content, copy course scripts, capture video/audio, screenshot lessons, download files, submit forms, mutate progress, write atoms/chunks, send messages, use Browserbase, or use Steve's normal Chrome profile.

## Observed MyICOR MCP Surface

Verified read-only tools include:

- `get_courses`
- `get_lessons`
- `search_learning_resources`
- `get_trend_reports`
- `get_trend_report`
- `get_my_workstreams`
- `get_workstream_details`
- `get_my_tools`
- `get_my_tool_stack_gaps`
- `get_lifecycle_catalog`
- `get_trusted_sources`

The connector returned 15 courses and roughly 267 lessons from course metadata. Useful high-signal clusters from the first metadata pass:

- `AI Mastery`: Agent, MCP, orchestration, RAG, briefing/validation/knowledge/delegation/orchestration workflows.
- `Claude Mastery for Professionals`: MCPs, connectors, skills, scheduled tasks, AI employees, Claude Code, personal intelligence systems.
- `myPKA System`: AI team vs chatbot, specialists, team memory, session logs, SOPs, SQLite upgrade, expansion packs.
- `Automation like a Pro`: process/workflow/workstream/SOP, SSOT, process mapping.

Broad MCP searches for exact phrases like `agentic OS`, `AI operating system agents workflows automation`, and `coaching call agent automation workflow` returned no results. That means V1 should not assume search alone is enough; it needs catalog/delta state plus browser gap-fill packets.

## First Extraction Candidates

Do not run these as a broad batch. Use one exact approved lesson/content packet at a time:

1. `myPKA System` / lesson `2467` / `Why an AI Team Beats a Smart Chatbot`
2. `Claude Mastery for Professionals` / lesson `2387` / `Building a Personal Intelligence System: Inside Paco's 17-Agent Mindset Architecture`
3. `AI Mastery` / lesson `2329` / `Agent (The Specialist)`
4. `AI Mastery` / lesson `2362` / `MCP (The Toolbox)`
5. `AI Mastery` / lesson `2330` / `Orchestration (The Team Leader)`
6. `myPKA System` / lesson `2475` / `Team Knowledge - Three Forms of Team Memory`
7. `myPKA System` / lesson `2490` / `Session-Logs - How the Team Remembers Itself`
8. `Claude Mastery for Professionals` / lesson `2382` / `Building a Team of AI Employees That Actually Work`

## Implementation Shape

V1 source-system map:

`MCP tools -> source catalog -> fingerprints/deltas -> grade -> monitor policy -> approved extraction queue -> Dev Director proposal bundle -> implemented/cleared suppression`

State ledger fields:

- source id
- system surface
- course id/name/type
- lesson id/title/type/url
- discovered route
- content availability route
- last seen
- fingerprint
- state
- grade and keep/ignore reason
- extraction status
- implemented/cleared status
- next check cadence

Browser gap-fill packet fields:

- exact lesson/resource URL
- allowed actor/account
- approved purpose
- content-use boundary
- allowed artifacts
- forbidden actions
- max runtime/cost
- proof path
- stop conditions

Next cards:

- `MYICOR-MCP-CATALOG-SNAPSHOT-001`: persist the MCP course/lesson/resource map and first delta state with no course content extraction.
- `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`: extract one exact approved high-value lesson through visible isolated browser or an approved MCP content route if MyICOR exposes one.
- `SKOOL-SOURCE-SYSTEM-MAP-001`: reuse the same state-map/delta-monitor pattern for approved Skool courses and communities.

## Proof

Focused proof:

```bash
npm run process:myicor-source-system-map-check -- --json
```

Supporting proof:

```bash
node --check lib/myicor-source-system-map.js scripts/process-myicor-source-system-map-check.mjs
npm run process:source-session-readiness-check -- --json
npm run myicor:mcp-tools -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- No broad MyICOR crawl.
- No lesson-content extraction in this map slice.
- No course script copying.
- No video/audio/coaching-call capture.
- No screenshots/keyframes.
- No download.
- No progress mutation.
- No post/comment/message/profile/account mutation.
- No external writes.
- No atom/chunk/vector/query-index writes from MyICOR content.
- No Browserbase or hosted-browser fallback.
- No normal Chrome profile use.

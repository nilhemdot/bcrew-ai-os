# Human Web Agent V1 Evidence Matrix

Date: 2026-05-29

Status: Evidence-first scoping artifact. This is built from the Dev Director top-three candidates and raw ranked Director report. It does not mutate live backlog, Current Sprint, credentials, external systems, Browserbase, source sessions, or Scoper cards.

## Why This Exists

Steve's correction: the videos were watched for a reason. The sprint must use the actual extracted ideas to decide how to build the browser agent, memory layer, and extractor. Counts and backlog cards are not enough.

This matrix turns the Director top-three evidence into implementation decisions.

## Director Top Three

1. `Browser Agent That Can Work`
   - Director score: 97
   - Support: 32 creators, 162 videos, 218 idea signals, 12 links/resources
   - Plain English: reliable human-style web worker that can see pages, click, type, use approved sessions, and stop at real boundaries

2. `Memory System That Keeps Agents Sharp`
   - Director score: 96
   - Support: 35 creators, 419 videos, 658 idea signals, 12 links/resources
   - Plain English: durable memory, context, source truth, and handoff state

3. `Extractor That Can Go Anywhere`
   - Director score: 95
   - Support: 35 creators, 179 videos, 260 idea signals, 12 links/resources
   - Plain English: source system that can watch, read, follow public/free resources, inspect allowed communities/courses, and package value with proof

Raw Director report inspected:

- Report: `director:dev-team-intelligence-director-001:aios-mission-v0`
- Ranked candidates: 2,319
- Source trust for the top signals: mostly `api_full_watch`
- Director preview only shows five important signals per opportunity, so this matrix uses the raw ranked report instead of the compact Dev page preview.

## Implementation Answer

The best build is a hybrid agentic browser system, not a pure browser script and not an unconstrained "agent."

The architecture should be:

`source mission packet -> route policy -> browser/session/connector tool -> observe -> plan -> act -> extract -> remember -> prove -> continue/stop/escalate`

In practical terms:

- Use Playwright/Chrome DevTools/local isolated browser profiles as the first hands layer.
- Use deterministic public page/repo/source workers when no browser interaction is required.
- Use Source Session Broker for login/session/MFA/account boundaries.
- Use native read-only connectors first where available, especially MyICOR MCP after OAuth approval.
- Do not use Browserbase in V1; the active path is local/browser-session/connector first because hosted browser plus agentic model calls is too expensive for this sprint.
- Use memory as part of the browser run loop: state, handoff, blocker, source skill, and retry history.
- Use extractor outputs as the product result: source-stack updates, evidence artifacts, resource capture, paid-gate evaluations, and source grades.

## Evidence-To-Build Matrix

| Evidence Pattern | Representative Director Signals | Build Decision |
| --- | --- | --- |
| Playwright/Puppeteer browser control | `Agentic Browser Automation Pipeline`, `Agentic Browser Automation Tool`, `Local Agent Browser Scraper` | Build the V1 hands runtime around Playwright/Puppeteer-style controlled browser sessions. This is the default local browser layer. |
| Chrome DevTools / browser MCP control | `Chrome DevTools MCP Automation Engine`, `Chrome DevTools MCP Toolset`, `Dynamic Browser Skill Orchestrator` | Expose browser navigation, selector clicking, form typing, screenshots, and eval through a narrow tool registry. |
| Isolated browser profiles | `Multi-Agent Browser Automation Orchestrator`, `Parallel Browser Orchestrator (MCP)`, `Persistent Session Browser Tool` | Every source/account gets an isolated persistent profile. No normal Chrome profile as the default. |
| Active session bridge / sidecar | `Agentic Browser Controller`, `Cross-App Browser Automation Sidecar`, `Browser-Agent Session Bridge`, `Local Browser Automation Agent Runtime` | V1 should support source-session reuse through governed profiles. A Chrome extension/active-tab bridge is a later enhancement after local isolated profiles are safe. |
| Human-in-the-loop for sensitive actions | `Browser-Based Human-in-the-Loop Protocol`, `Mobile-to-Desktop Agent Remote Control`, `Human-in-the-Loop Action Queue` | Login, MFA, payment, profile changes, posts, comments, messages, and external sends must produce approval/auth-needed packets, not autonomous actions. |
| Workflow recorder / skills | `AIOS Background Workflow Recorder`, `Video-to-SOP Agent`, `Video-to-SOP Generator`, `SOP Video-to-Agent Generator` | Add a run recorder that turns successful source navigation into reusable source skills/SOPs. |
| Visual browser proof | `CLI-to-Browser Visual Verification Loop`, `Visual-First Human-Like QA Agent`, `Self-Healing UI QA Agent`, `Visual Browser QA & Self-Correction Loop` | Every browser run should be able to capture screenshot/page-health evidence. Visual proof is part of done, not polish. |
| Connector-vs-browser routing | `Hybrid MCP & Browser Automation Router`, MyICOR MCP preflight evidence | Build a route policy: connector/API first when safer and read-only, browser second when UI is required, hosted browser fallback only when proven necessary. |
| OS/computer-use control | `OS-Level Accessibility Agent Controller`, `Local OS Agentic Control (Computer Use)` | This is real, but it is not the first browser sprint. Keep it as V2 for non-browser desktop apps after source-browser V1 is safe. |
| Cross-session memory | `Cross-Session Memory and Tool Search`, `Persistent Cross-Session Memory for Desktop Agents`, `Local Agent Memory Manager` | Persist source run state and retrieval metadata so the next agent knows what happened, what failed, and what to do next. |
| Handoff and context compaction | `Context Handoff Protocol`, `Multi-Model Context Handoff System`, `Markdown-Based Session Handoff Protocol (Baton Pass)` | Every long run needs a compact mission/run handoff packet with state, artifacts, blockers, next action, and proof commands. |
| Local file/markdown memory | `Local Markdown-based Agent Memory Vault`, `Local State & Context Sync via CLAUDE.md and MEMORY.md`, `Dual-State Agent Memory Directory Structure` | Store human-readable run summaries and source skills locally; store operational truth in DB/source ledgers. |
| Tiered/semantic memory | `3-Tier Agent Memory Architecture`, `Hybrid Semantic Memory Search`, `Tiered Agent Memory Controller` | V1 memory shape should separate static rules, active run state, and retrievable history. Vector search can follow after run ledger and summaries exist. |
| Self-improving memory loop | `Self-Improving Memory Loop (/improve-system)`, `Asynchronous Memory Consolidation Engine` | After each browser/source run, promote repeatable learning into source SOPs, verifier rules, or backlog items. |
| Multimodal extraction | `Dynamic Frame-Budget Video Analyzer MCP`, `Multimodal Video Ingestion Tool`, Mark full video/audio/visual proof | Extractor must combine video/audio/visual/page/resource evidence, not transcript-only. |
| Page/resource visual audit | `Multi-Page Visual Auditor`, `Visual Design Ingestion Pipeline`, `Multi-Page Visual Auditor` | Source-browser runs should capture page screenshots and classify visible resources/forms/buttons/links. |
| Video/resource link extraction | `Video End-Screen Annotation Extractor`, YouTube page/resource evidence | YouTube source SOP must extract page/description/resource links and feed them into source packets. |
| Source-stack output | Extractor source SOP evidence across YouTube, newsletters, repos, Skool, MyICOR | Done means creator/source cards show surfaces, status, value captured, blocker, next action, and evidence. |

## What V1 Should Build

### 1. Source Mission Packet

Fields:

- exact URL
- source family
- source id / creator id
- allowed actions
- forbidden actions
- account/session identity
- storage rules
- expected output
- stop conditions
- budget/run caps

Why: The evidence repeatedly points to browser automation doing real tasks. The packet is how AIOS knows which task is allowed.

### 2. Route Policy Brain

Routes:

- public deterministic reader
- repo/docs reader
- local isolated browser hands
- source session broker
- read-only connector/MCP
- newsletter lane
- free-community lane
- Harlan/operator escalation for auth/challenge/sensitive steps
- human auth/action packet

Why: The evidence says browser agents work best when they can choose tools. It also says API/connector routes should be used when safer than UI automation.

### 3. Local Browser Hands Runtime

Capabilities:

- open exact URL in isolated profile
- observe DOM/text/headings/links/buttons/forms
- screenshot/page health
- click safe links
- scroll
- type only when explicitly approved
- block download/purchase/post/comment/message/profile changes
- emit action log

Why: The highest-signal browser evidence points directly to Playwright/Puppeteer/Chrome DevTools control.

### 4. Source Session Broker

Capabilities:

- source profile per account/source
- Keychain secret refs only
- source identity selection
- existing-session probe
- auth-needed packet for login/MFA/challenge
- wait/resume command
- fail-closed proof

Why: Many signals mention active sessions, authenticated platforms, login, browser profiles, and no API integration overhead. That requires a broker, not raw credentials in agent prompts.

### 5. Browser Run Memory

Persist:

- run id
- mission packet
- route chosen
- page state
- actions taken
- extracted value
- blocker
- next action
- artifacts
- source skill/SOP learned
- handoff packet

Why: The memory evidence says agents fail when state is lost. V1 memory should first keep browser/source runs sharp before broad personal memory expansion.

### 6. Extractor Output

Output:

- useful ideas
- implementation patterns
- resources/repos/docs/templates
- newsletter/community/course links
- paid-gate evaluation
- source-stack surface status
- source grade contribution
- evidence refs

Why: The extractor evidence says the point is not "browse"; it is to package source-backed value.

### 7. Dev Hub Readback

Show:

- running/idle/blocked/completed
- last URL
- source family
- route
- pages read
- actions taken
- evidence count
- blocker
- next action
- source-stack update

Why: Steve should not need chat memory to know whether the system used the web like a human.

## What The Evidence Says Not To Do First

- Do not build a broad autonomous browser agent without source packets.
- Do not use Steve's normal Chrome profile as the default session store.
- Do not treat Browserbase as architecture. It is parked outside this sprint.
- Do not treat memory as a separate giant rebuild before browser-run state exists.
- Do not claim extraction is done from video-only watch counts.
- Do not jump to LinkedIn/Instagram sending before read/classify/source-stack and action policy exist.
- Do not let a builder write "browser code" without mapping it back to these evidence patterns.

## Correct Sprint

The correct sprint is:

`HUMAN-WEB-AGENT-V1`

Definition:

Build the first evidence-backed AIOS web worker that can take an exact source packet, use local isolated browser hands or safer connectors, preserve session boundaries, extract source value, remember run state, update source-stack readback, and stop/escalate at real boundaries.

## Build Order From Evidence

1. Evidence matrix proof
   - Prove the top Director signals map to these build decisions.

2. Exact source packet runner
   - Convert one watched-video discovered URL into a mission packet.

3. Local browser hands
   - Open, observe, screenshot, classify, click one safe link, stop at blocked actions.

4. Route policy
   - Public page/repo/connector/session/newsletter/free-community/fallback selection.

5. Source session broker
   - Probe one session-bound source and emit ready/auth-needed/fail-closed.

6. Browser run memory
   - Persist run state, blocker, next action, and handoff.

7. Extractor packaging
   - Produce source-stack value output with evidence.

8. Dev Hub readback
   - Show the run and next action without reading logs/chat.

9. Newsletter/free-community/MyICOR proofs
   - Only after exact packet and approval boundaries are satisfied.

10. Explicit no-Browserbase posture
   - Keep hosted browser work out of V1 unless Steve later reopens it with a fresh cost-approved plan.

## Existing Cards This Should Control

- `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001`
- `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
- `LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001`
- `SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001`
- `SOURCE-SESSION-BROKER-001`
- `FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001`
- `MEMORY-002` concepts only for browser-run memory, not broad runtime mutation
- `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001` as upstream source discovery, not the active product goal

## Sprint Exit Proof

V1 cannot exit until there is a real run proof for:

- one public/resource source packet
- one browser-hands observed/clicked/extracted packet
- one source-session ready or auth-needed packet
- one browser-run memory/handoff readback
- one source-stack update visible in Dev Hub
- one blocked action that fails closed with a useful next action

Approval-bound later proofs:

- live newsletter signup/confirmation
- MyICOR OAuth read-only MCP
- free Skool/community session-bound run
- Harlan/operator escalation and source-session resume

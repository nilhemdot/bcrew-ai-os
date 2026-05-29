# Human Web Agent V1 Sprint Scope

Date: 2026-05-29

Status: Scoping artifact. This does not mutate live backlog, Current Sprint, credentials, source sessions, external accounts, Browserbase, Scoper cards, or source systems.

## Correction

Steve's correction is right: the watched YouTube videos are not only evidence that browser agents, memory, and extraction matter. They are the design input for the sprint.

The sprint should be scoped from three evidence-backed Director candidates together:

- `Browser Agent That Can Work`: human-style web worker that can see pages, click, type, use approved sessions, and stop at real boundaries.
- `Memory System That Keeps Agents Sharp`: durable run memory, context, source truth, and handoff state so agents stop forgetting and duplicating work.
- `Extractor That Can Go Anywhere`: source system that can watch, read, follow useful public/free resources, inspect allowed communities/courses, and package gold with proof.

The product goal is simple:

AIOS should use the web like a careful human researcher on approved sources.

## Evidence Base

Live Director and Dev Hub evidence reviewed:

- Browser Agent support: 32 creators, 162 videos, 218 idea signals, 12 links/resources.
- Memory support: 35 creators, 419 videos, 658 idea signals, 12 links/resources.
- Extractor support: 35 creators, 179 videos, 260 idea signals, 12 links/resources.
- YouTube source intelligence: 36 creators, 803 tracked metadata rows, 768 watched video rows, 152 full-watch reports, 2,289 build ideas, 850 source follow-up runs.
- Source handoff evidence: 1,281 evidence rows, 1,202 queued rows, 532 parked rows, 265 paid/auth parked rows, 16 newsletter signup rows, and zero public/free rows currently ready without session/approval work.

High-signal video-derived implementation patterns:

- Secure Playwright/Puppeteer browser control for agent-driven navigation and scraping.
- Browser controller/sidecar that reads active page state and can execute background workflows.
- Multi-agent browser automation across isolated browser profiles.
- Browser-based human-in-the-loop handoff for login, payment, MFA, and sensitive actions.
- Workflow recorders and browser skills that turn repeated source navigation into reusable playbooks.
- Visual browser agents and multi-page visual auditors using screenshots, DOM, text, and page health.
- Context handoff protocols that serialize current task state for another agent or future run.
- Local markdown memory vaults and cross-session retrieval for durable recall.
- Self-improving memory loops that summarize runs and update durable instructions or source skills.
- Dynamic frame-budget video analyzers and multimodal extractors for video/audio/visual source work.

## Sprint Name

`HUMAN-WEB-AGENT-V1`

Working title: Human Web Agent V1.

Mission: Make AIOS accept an exact source mission packet, open the right isolated browser/session, observe the page like a human, click/navigate/scroll/type only where policy permits, extract useful value, persist evidence and memory, update the source stack, and stop or ask for help at real boundaries.

## What This Is

This is local-first human web agent work. Browserbase is killed/parked outside this sprint because the goal is to make AIOS use its own local browser/session/connector stack without creating a large hosted-browser/model-call bill.

This is a browser-agent product sprint with a route policy:

1. Use deterministic public/source workers when plain HTTP reading is enough.
2. Use local isolated browser hands when page interaction or visual state matters.
3. Use Source Session Broker when source identity, login, MFA, or an existing session matters.
4. Prefer native read-only connectors where they exist, especially MyICOR MCP after OAuth approval.
5. Use no Browserbase in V1. If a local proof exposes a missing capability, park it with evidence instead of spending hosted-browser minutes.

## Product Contract

Human Web Agent V1 must do seven things:

1. Take a source mission packet.
   - Exact URL/source family.
   - Allowed areas.
   - Forbidden actions.
   - Actor/account/session boundary.
   - Expected output.
   - Stop conditions.

2. Observe like a human.
   - DOM text.
   - Headings, anchors, buttons, forms.
   - Screenshot/full-page screenshot when useful.
   - Page health and browser health.
   - Auth wall, paywall, challenge, restore page, blank page, download, purchase, form, posting, messaging, profile-change, or private-area signals.

3. Decide the next safe step.
   - Continue reading.
   - Click/navigate/scroll.
   - Type into an approved form.
   - Switch to source session broker.
   - Use connector route.
   - Ask Steve/Harlan for auth.
   - Park for paid/value review.
   - Fail closed.

4. Act through governed hands.
   - Use isolated source profiles, not normal Chrome.
   - Click safe links only inside the packet.
   - Submit only when the packet permits the exact form.
   - Never buy, download unsafe files, post, comment, message, mutate profiles, or cross private/paid boundaries by default.

5. Extract the value.
   - Ideas and claims.
   - Implementation patterns.
   - Tools and workflows.
   - Code/repos/docs/templates.
   - Newsletter/community/course/resource links.
   - Paid-gate evaluation.
   - Creator/source-stack contribution.

6. Remember what happened.
   - Source run state.
   - Session/profile status.
   - Last useful page.
   - Blocker and recovery path.
   - Successful source workflow as a reusable skill/SOP.
   - Repeated failure as a verifier/recovery rule, not a chat reminder.

7. Show proof.
   - Source URL.
   - Capture time.
   - Artifact ID.
   - Page title/hash or text hash where useful.
   - Screenshot hash when visual proof matters.
   - Action log.
   - Stop reason.
   - Source-stack update.
   - Dev Hub readback.

## Sprint Slices

### Slice 1 - Evidence-To-Scope Matrix

Turn the top Browser Agent, Memory, and Extractor signals into an execution matrix:

- signal title
- creator/video/source report
- required AIOS behavior
- existing card/tool that covers it
- gap
- proof command or live proof needed

This prevents builders from ignoring the videos and writing generic browser code.

### Slice 2 - Exact Source Packet Browser Loop

Use `SOURCE-BROWSER-AGENTIC-RUNTIME-001` as the flagship agent card under `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001`.

Required behavior:

- accept exact source URL/source family
- route through brain policy
- open local isolated browser hands where needed
- observe visible page state
- classify safe/blocked next action
- execute one safe action when permitted
- write source-browser run ledger
- expose readback in Dev/source UI

### Slice 3 - Source Session Broker Live Proof

Use `SOURCE-SESSION-BROKER-001` to prove the human-like session flow:

- isolated source profile first
- Keychain secret refs only
- source identity selection
- auth-needed artifact when login/MFA/challenge appears
- Harlan/operator packet draft
- wait/resume shape
- fail closed when session is not ready

The first proof should be one real session-bound source or a clean auth-needed resume packet, not broad crawling.

### Slice 4 - Newsletter Source Lane

Use the video evidence around creator newsletters and source stacks.

Required behavior:

- classify a newsletter/signup page from a watched-video resource link
- detect safe newsletter form
- use approved source mailbox policy
- submit only when exact signup is approved
- confirm/read issue when mailbox proof exists
- extract links/ideas/resources from issue
- update creator source stack

### Slice 5 - Free Community / Skool Proof

Use `FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001`.

Required behavior:

- exact free/community source packet
- approved source identity/session boundary
- last 20 days visible free activity where allowed
- free classroom/resources/pinned docs where allowed
- linked public/free resources
- stop at paid/private/member/login/post/comment/message/profile boundaries
- update source stack and paid-gate evaluation

### Slice 6 - MyICOR Read-Only Connector First

Use the MyICOR MCP/OAuth path before browser fallback.

Required behavior:

- exact MyICOR read-only source packet
- OAuth token approval
- tools/list or equivalent read-only proof
- lessons/articles/podcast/tool-stack/workstream availability check
- citations for anything extracted
- no write scopes, purchases, profile mutation, or raw private content in git

### Slice 7 - Agent Run Memory

This is the Memory candidate scoped to the browser sprint, not a broad memory rebuild.

Required behavior:

- source run memory: URL, source family, route, state, blocker, next action
- session memory: profile/account label, readiness, auth-needed state, no raw secrets
- workflow memory: repeated successful navigation becomes a source skill/SOP
- failure memory: blank browser, challenge, wrong signup branch, auth wall, restore page, unsafe download, no evidence
- handoff memory: compact resumable packet for next agent/builder

### Slice 8 - Source Stack And Dev Readback

Human Web Agent V1 is not done until Steve can see what happened.

Required readback:

- creator/source stack per surface: YouTube, site/blog, repo/docs/resources, newsletter, free community, paid course/community/platform
- status: discovered, runnable, extracting, blocked, paid-gate evaluation, parked, rejected
- last success
- source-run evidence count
- pages/resources captured
- blocker
- next action
- grade contribution

### Slice 8A - Source-System State And Daily Director Loop

This is the May 29 source-system operating vision Steve restated after MyICOR OAuth worked.

Required behavior:

- `MYICOR-MCP-CATALOG-SNAPSHOT-001`: persist the MyICOR MCP catalog into source-state rows before extracting lesson content.
- `SKOOL-SOURCE-SYSTEM-MAP-001`: map approved free and paid Skool communities as source systems before broad community/course extraction.
- `SOURCE-EXTRACTION-STATE-LEDGER-001`: show what has been discovered, metadata-mapped, extracted, ignored, changed, blocked, and implemented-cleared.
- `DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001`: run the daily Dev Director old-plus-new source evidence review, enrich opportunities, add new opportunities, suppress trash, and clear implemented ideas while retaining history for future upgrades.
- `DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001`: make the Dev page show live truth about systems built, systems running, incoming data, blockers, proof, and next action.
- `BUILDER-MEMORY-SYSTEM-001`: give builders a startup memory packet from live sprint/source/backlog/proof truth so each new agent does not start from scratch.

Plain English: source extraction should compound. The system should know what it already saw, what it already extracted, what changed, what was useless, what was implemented, and what deserves another look.

### Slice 9 - Browserbase Parked

Browserbase is not in the active sprint.

Required behavior:

- no Browserbase work
- no hosted-browser bakeoff
- no model-agent browser loop spend
- if a local browser/source-session proof fails, record the exact blocker and continue local/session/connector/Harlan repair first

## Backlog Mapping

Use the existing backlog instead of inventing a parallel project:

- Parent: `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001`
- Flagship browser agent: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
- Session/auth layer: `SOURCE-SESSION-BROKER-001`
- Local hands runtime: `LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001`
- Free community proof: `FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001`
- MyICOR source map: `MYICOR-SOURCE-SYSTEM-MAP-001`
- MyICOR persisted catalog state: `MYICOR-MCP-CATALOG-SNAPSHOT-001`
- Skool source-system map: `SKOOL-SOURCE-SYSTEM-MAP-001`
- Source extraction state ledger: `SOURCE-EXTRACTION-STATE-LEDGER-001`
- Daily Dev Director loop: `DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001`
- Dev page truth cleanup: `DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001`
- Builder memory: `BUILDER-MEMORY-SYSTEM-001`
- Browser route/cost policy: `SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001`
- Memory slice: scoped browser-agent memory under `MEMORY-002` concepts, not broad runtime enablement
- YouTube source upstream: `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001`
- Promotion boundary: `BUILD-OPPORTUNITY-PROMOTION-GATE-001`

## Definition Of Done

Human Web Agent V1 is done when all of this is true:

- A Builder can start from an exact URL/source packet, not from vague "browse the web" text.
- The agent opens an isolated source browser/session when interaction is required.
- It observes DOM, page state, forms, buttons, links, and screenshots where useful.
- It chooses safe next steps from visible state plus source policy.
- It can click/navigate/scroll on public/free allowed pages.
- It can type/submit only for an explicitly approved source form.
- It extracts ideas/resources/workflows with evidence.
- It updates creator/source-stack readback.
- It records run memory and next action.
- It stops at auth, paid, private, purchase, download, post, comment, message, profile, CAPTCHA, or unsafe form boundaries.
- It produces auth-needed or value-review packets instead of silent failure.
- It has at least one real public/resource proof, one newsletter proof path, one session-bound/free-community or auth-needed proof, and one MyICOR connector/OAuth readiness proof.
- Dev Hub shows the run state, blocker, evidence, and next action without reading chat history.

## Proof Commands

Existing focused proof set to keep:

```bash
npm run process:source-browser-agent-harness-check -- --json
npm run process:source-browser-agent-executor-check -- --json
npm run process:local-virtual-browser-hands-runtime-check -- --json
npm run process:source-browser-brain-route-policy-check -- --json
npm run process:source-session-readiness-check -- --json
npm run process:source-session-profile-probe-check -- --json
npm run process:creator-newsletter-intake-runner-check -- --json
npm run process:skool-free-community-god-mode-runner-check -- --json
npm run myicor:mcp-preflight -- --json
npm run process:dev-team-hub-v0-check -- --json
npm run backlog:hygiene -- --json
```

Additional sprint proof needed:

- Evidence-to-scope matrix proof: verify top Director signals map to behaviors, cards, and proof.
- Real source-session proof: one approved source packet runs or parks with auth-needed and resume command.
- Newsletter live proof: only after exact source/signup approval.
- MyICOR OAuth proof: only after read-only connector approval.
- Dev Hub readback proof: source stack shows the run/evidence/blocker/next action.

## Not Next

- Do not reintroduce Browserbase without fresh explicit approval and cost proof.
- Do not claim God Mode from video-only watching.
- Do not auto-promote Scoper cards from Director candidates.
- Do not log into paid/private/auth sources without exact source packets.
- Do not post, comment, message, send DMs, mutate profiles, purchase, trade, bank, or make external writes in this sprint.
- LinkedIn/Instagram/social surfaces are read/classify/source-stack surfaces first. Sending messages is a later action-policy sprint.

## Immediate Builder Order

1. Build the evidence-to-scope matrix from the top Director signals.
2. Reset live Current Sprint only after the matrix passes review, so the sprint says `HUMAN-WEB-AGENT-V1` instead of video catch-up-only language.
3. Make `SOURCE-BROWSER-AGENTIC-RUNTIME-001` the active build card under the extractor parent.
4. Prove one exact public/resource source packet end to end.
5. Prove one session-bound source packet or auth-needed resume path.
6. Prove newsletter and MyICOR connector readiness through approved packets.
7. Wire run memory and Dev Hub source-stack readback.
8. Park any hosted-browser desire as a future explicit approval question, not active sprint work.

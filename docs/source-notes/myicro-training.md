# Mycro / myICOR Training Source Note

Proposed source ID: `SRC-MYICRO-001`  
Related cards: `MYICRO-TRAINING-001`, `WEB-GODMODE-001`, `MULTIMODAL-EXTRACTOR-001`, `WEB-CRAWLER-001`, `AGENT-001`
Last updated: 2026-05-28  
Status: Proposed / Access Proof Needed

## Purpose

Steve pays for the Mycro / myICOR training because it contains high-value AI-team, project-management, and process-automation operating doctrine. The source value is not only transcript text. It includes course structure, folder structures, screenshots/images, videos, lesson sequencing, resources, workflow demonstrations, and the operator's model for running AI teams.

This should become a governed training-app source lane, not a one-off YouTube summary.

## Steve Direction

AIOS needs a human-like browser/video extraction capability that can:

- log into the app with Steve-authorized access
- navigate pages, courses, lessons, and next/previous course flows
- read lesson text and resource links
- watch videos or capture transcripts where available
- capture screenshots/keyframes and page structure
- understand folder structures, images, diagrams, and demonstrated workflows
- identify project-management and agent-team operating patterns
- file source-backed artifacts and later atoms
- route useful lessons into AIOS architecture, backlog, agent design, and operating doctrine

Whether this is called an agent, a worker, or code with a brain is secondary. The correct architecture is to build a governed GOD-mode browser/video tool first, then allow approved agents/workers to call it under permissions, budgets, and content-use rules.

## Boundary

This is paid/community training material. Treat it as internal learning and process-improvement source material unless Steve confirms broader rights.

Rules:

- do not store passwords or session tokens in Postgres or repo files
- use only Steve-authorized login/session paths
- do not blind-scrape or bulk-download before a small access proof
- classify content-use rights before reusing any material externally
- prefer source-backed summaries, observations, and BCrew applications over copying course content
- keep screenshots/keyframes governed by storage/use policy
- preserve course URL, lesson URL, timestamp, screenshot/frame reference, extractor version, runtime cost, and permission class

## Current MCP Discovery

May 26, 2026 live preflight found the current MyICOR MCP route:

- Paid account login is Google OAuth. Use the public MyICOR home page or `https://app.myicor.com/login`, then choose Sign in / Log in with Google for the existing paid account.
- Do not use Start Free, signup, or onboarding as the paid-account path.
- Do not ask Steve for a MyICOR password unless Steve later confirms there is a separate MyICOR password login. Current known paid access is Google OAuth.
- MCP endpoint: `https://mcp.myicor.com/mcp`
- OAuth metadata: `https://app.myicor.com/.well-known/oauth-authorization-server`
- Authorization endpoint: `https://app.myicor.com/mcp/authorize`
- Token endpoint: `https://app.myicor.com/api/oauth/token`
- Server: `myicor-mcp` version `1.15.0`
- Supported scopes: `mcp:read`, `mcp:tools`, `mcp:progress`, `mcp:inner-circle`, `mcp:admin`
- Extraction scope should request read/progress/inner-circle/tool-stack access only, not `mcp:admin`.
- The older `https://mcp.myicor.com/sse` endpoint is stale and returned `404`.

May 28, 2026 recheck confirmed the same safe preflight state:

- `npm run myicor:mcp-preflight -- --json` returned `ok: true`.
- Server remained `myicor-mcp` version `1.15.0`.
- Unauthenticated `tools/list` returned `401 Authentication required`, so no paid/private library data is exposed without OAuth.
- `https://mcp.myicor.com/sse` still returned `404`.
- Raw secret printed: `false`.

The local helper is `npm run myicor:mcp-preflight`, then `npm run myicor:mcp-authorize -- --account=myicor-authorized-member` once Steve is ready to approve OAuth. Tokens are stored in macOS Keychain under `myicor-mcp-oauth`, not in repo docs or Postgres.

## Extraction Levels

Level 1: public YouTube subtitle proof  
Status: Done for `https://youtu.be/McPot5-N0ys`. Archived `SRC-YOUTUBE-INTEL-001:video_transcript:McPot5-N0ys`.

Level 2: logged-in course inventory  
Status: Not built. Needs authorized browser session, course/lesson map, and resource-link inventory.

Level 3: lesson extraction  
Status: Not built. Needs lesson text, screenshots, video transcript/audio notes, resources, and source-backed summary.

Level 4: GOD-mode visual workflow review  
Status: Not built. Needs screenshots/keyframes, visual workflow/tool detection, demonstrated folder structures, and timestamped evidence.

Level 5: atoms and applications  
Status: Not built. Needs downstream atom schema/retrieval/action routing so useful lessons become AIOS architecture improvements, agent/workstream doctrine, project-management patterns, training ideas, and implementation tasks.

## Proof Sequence

Phase A can use the public YouTube video Steve already dropped. That proves whether the GOD-mode video analyzer can understand folder structures, screenshots, on-screen workflows, and spoken context from one known-good visual training example.

Phase A does not prove paid-app navigation.

Phase B needs one Steve-authorized lesson or course page inside the app. That proves login/session handling, course map extraction, lesson navigation, resource inventory, and next/previous course movement.

Phase B steps:

1. Open the app through an approved browser/session.
2. Record the access boundary and content-use class.
3. Capture course title, lesson title, URL, and navigation path.
4. Extract page text and resource links.
5. Capture screenshots of the visual structure.
6. Extract or transcribe the video where available.
7. Produce a source-backed summary focused on project-management, AI-team, and agent-tooling lessons.
8. Store outputs as governed artifacts, not chat-only notes.
9. Convert only the useful lessons into atoms/backlog/doc updates.

## Browser Session Preflight

Browser automation has to know which human/service identity it is acting as.

The 2026-04-26 Drive access test showed the risk: the local browser profile was logged in as `steve.zahnd@bensoncrew.ca`, so it opened a document Steve could already see instead of showing the `ai@bensoncrew.ca` request-access flow. A governed web/app extractor cannot rely on "a browser is open" as proof of the right identity.

Before the Mycro or any paid-app proof is considered real, AIOS needs to record:

- intended actor account
- browser profile/session used
- visible logged-in account proof where available
- source/app URL
- access boundary and content-use class
- whether login, request-access, or owner approval was required
- screenshots or page text proving the state
- any manual action Steve took outside the worker

This belongs under `WEB-GODMODE-001` as a general browser-worker rule, not only under Mycro.

## Open Questions

- What is the canonical spelling/URL for the app/source: Mycro, myICOR, or another brand name?
- Which login/account should the governed worker use?
- Does the membership permit internal AI-assisted learning/extraction for Steve's business use?
- Which courses are highest priority: AI team foundation, intelligent process automation, personal knowledge assistant, project management, or specific agent library lessons?
- Which outputs are allowed to be stored as screenshots versus text summaries only?

# Hub Chat Prompt Template

Paste this into a Sales/Ops/Strategy/Marketing hub chat before it builds.

```text
You are working as a hub builder inside bcrew-ai-os.

Hub: <sales|ops|strategy|marketing>
Goal: <plain English goal>
Backlog card: <card ID>

Rules:
- Do not commit or push unless the main session explicitly approves.
- Stay inside hub-owned files unless you stop and ask main session first.
- Do not touch Foundation/process files: lib/foundation-*.js, lib/process-*.js, scripts/process-*.mjs, scripts/foundation-verify.mjs, docs/process/*, docs/handoffs/*, package.json, or public/foundation*.
- Treat server.js, package.json, app-auth, security, source contracts, and Foundation DB as stop-and-coordinate files.
- Before coding, give me a short plan with target files, proof command, and files you will not touch.
- After coding, return a handoff with changed files, proof output, known limits, and whether any shared files were touched.
- Include a hub-work manifest I can pass to `npm run process:hub-work-check -- --manifest=<path> --json`.

First task: read the relevant hub code and produce the plan only. Do not edit until I confirm or main session confirms.
```

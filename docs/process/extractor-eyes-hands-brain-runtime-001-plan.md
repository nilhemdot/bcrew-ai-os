# EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001 Plan

## What

Build the full God Mode extractor runtime and source SOP system.

Plain English: this is not a YouTube-video watcher. This is the reusable extraction system that can read, watch, listen, click/navigate where approved, reason, preserve evidence, follow approved value, stop at boundaries, update source grades, and run on autopilot without Steve or Codex babysitting every batch.

## Steve Requirement Locked

This card preserves the May 26 correction so it cannot be reduced back to video-only work:

- The system starts by reviewing all approved creator/source metadata and deciding what is worth extracting.
- For YouTube, the first baseline is the latest 10 relevant public videos for every approved creator.
- After the first baseline, every creator/source gets a visible grade/score on the YouTube/source card.
- If the value is poor, the system parks or throttles that source instead of watching forever.
- Steve should be able to click YouTube in Sources and see all creators, not just a small priority subset, with grade, score, watched count, pending baseline, blockers, and next action.
- Autopilot must run every morning after it is proven. Babysitting is only allowed while validating that the system can be left alone.
- The YouTube job must extract the video and the whole YouTube page.
- The YouTube job must read the description and classify every resource link.
- When the creator offers free value such as skills, code, templates, repos, docs, checklists, downloads, or public resource pages, the system captures the allowed value or creates the exact packet needed to capture it.
- If a free Skool/community is linked, the system creates the source packet and, when approved and within boundary, uses Hands to inspect the free community, free chat, free courses, and free resources.
- If the extractor hits a paid gate, login gate, purchase, private area, member-only area, form, checkout, or download boundary, it stops and creates an evaluation for Steve instead of crossing the boundary.
- Paid-gate evaluation must answer whether the course/community/package looks worth buying, based on the free evidence already extracted.
- Extraction exists to find ideas, wins, implementation patterns, source-backed know-how, and system improvements for the agentic AIOS.
- No more broad video crawling should run under a fake God Mode label. Video-only completion is not God Mode.

## Parent Runtime Contract

Every source-family extractor must have these layers:

- Source packet: exact source, actor/session boundary, allowed areas, forbidden actions, storage rules, content-use rules, and stop conditions.
- Metadata triage: decide whether the source item is relevant, safe, duplicate, long-form/course, blocked, or worth spending budget on.
- Read: visible text, page metadata, files/docs where allowed, source page state, and structured fields.
- Ears: transcript/audio route where the source has spoken content.
- Eyes: video/screen/page/visual understanding where the source shows workflows, tools, code, diagrams, screenshares, or UI.
- Hands: governed browser/app navigation, clicks, scrolling, and allowed link traversal inside source-packet limits.
- Brain: model route and interpretation layer that turns raw evidence into useful findings, not a pile of text.
- Evidence: source URL, artifact ID, timestamp/capture time, page title/hash where possible, transcript/visual timestamp, resource disposition, and stop reason.
- Boundaries: no private/auth/paid/community/course/member/form/download/purchase/post/comment/message/external action unless the exact packet permits it.
- Output: atoms, evidence hits, source notes/artifacts, Director input, Scoper readiness, source grade updates, approval packets, and blocker packets.
- Grading: source/creator grades by lane, based on extracted value, promotion rate, resource quality, relevance, freshness, proof quality, and repeat usefulness.
- Autopilot: scheduled morning run plan, budget/run caps, failure stop/report, next action, and no-babysitting operating posture after proof.

## Source SOPs

### YouTube Public Creator SOP

1. Refresh public metadata for every approved creator.
2. Triage metadata before spending model budget:
   - public/no-auth only
   - relevant title/topic signal
   - duplicate/already watched status
   - long-course route vs standard lane
   - private/paid/auth blocker
   - noise/low-value blocker
3. Queue the latest 10 relevant public videos for every approved creator as the first baseline.
4. Deepen S/A sources toward 50 where useful; sample B selectively; park or throttle C/D after baseline unless another lane needs that source.
5. Run qualifying videos through full video/audio/visual watch, transcript/page capture, timestamped evidence, and model-route ledger proof.
6. Read the whole YouTube page:
   - title
   - description
   - visible metadata
   - captions/transcript status
   - page evidence
   - public comments remain operator-excluded
7. Classify every description/resource link:
   - safe public repo/docs/resource/page
   - free community
   - paid course/community/product
   - login/member/private
   - download/form/opt-in
   - short link/unknown
   - blocked/noise
8. Follow only approved public/free packets through the governed worker/Hands route.
9. Capture free skills, code, templates, repos, docs, checklists, resource pages, and implementation material when packet-allowed.
10. If a free Skool/community appears, create a free-community source packet; after approval, inspect allowed free chat, free courses, and free resources.
11. If a paid gate appears, stop and create a value packet for Steve:
    - what the free material already proved
    - what appears to be behind the gate
    - price if visible
    - likely AIOS value
    - risk/unknowns
    - buy / do not buy / needs more free evidence recommendation
12. Persist atoms, hits, resource dispositions, source-packet status, paid-gate evaluation, Director input, Scoper readiness, and creator grade update.
13. Update the source card so every creator shows grade/score, metadata count, watched count, pending baseline, resource status, paid-gate status, blocker, and next action.
14. Morning autopilot runs the SOP only after proof is green; it stops and reports blockers instead of guessing.

### Skool Free Community SOP

1. Require exact free-community source packet, actor/session boundary, content-use rule, and allowed area list.
2. Use governed Hands only inside approved free areas.
3. Inspect free chat, public/free posts, free courses, pinned resources, docs, and linked resources only where allowed.
4. Capture free value with source URL, capture time, title, artifact ID, and stop reason.
5. Stop at paid, private, member-only, login-required, form, checkout, DM, posting, commenting, or download boundaries unless separately approved.
6. Emit a paid/community value evaluation if the free layer suggests the paid community or course may be worth buying.

### Skool Paid/Private SOP

1. Do not enter or crawl until Steve approves the paid/private source packet.
2. Packet must define login/session boundary, content-use limit, storage rules, allowed areas, and forbidden actions.
3. Run one bounded lesson/community proof before broad extraction.
4. Preserve provenance without storing private course content in git or public surfaces.
5. Stop before purchases, account changes, messages, comments, posts, downloads, external writes, or unapproved areas.

### MyICOR Paid Training SOP

1. Do not log in or navigate paid training until Steve approves the exact MyICOR packet.
2. Packet must define session boundary, course scope, content-use rules, storage, and stop conditions.
3. Run one bounded approved lesson proof with Eyes/Ears/Read/Hands/Brain/Evidence before broad training extraction.
4. Capture course map, lesson claims, implementation steps, resources, and blockers.
5. Do not store private raw media in git.
6. Stop before purchases, forms, profile/account changes, downloads, external writes, or unapproved course areas.

### GitHub, Docs, And Public Resources SOP

1. Require exact public repo/docs/resource source packet from a YouTube/resource-link disposition or approved source registry row.
2. Read metadata, README/docs, license/provenance, examples, install/use steps, and implementation relevance.
3. Follow only allowed same-source docs links when the packet allows it; otherwise create follow-up packets.
4. Capture useful code/resource summary and implementation applicability.
5. Do not auto-copy private code, mutate repos, create backlog cards, or write externally.

## Build Order

1. Lock this parent contract, live backlog card, process plan, and proof.
2. Update `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001` so it cannot mean video-only catch-up.
3. Build the YouTube SOP runner/read model end to end:
   - all creator rows visible
   - metadata triage
   - latest-10 baseline
   - full watch
   - page/description extraction
   - resource-link source packets
   - free-resource capture
   - paid-gate evaluation
   - creator grade update
   - morning autopilot report
4. Only then resume broad live YouTube spend.
5. Add Skool free-community SOP runner with packet approval and one bounded proof.
6. Add paid/private Skool and MyICOR approved-session proof after Steve provides exact approvals.
7. Add GitHub/docs/public resource SOP completion and Scoper-ready resource evidence.
8. Wire all source-family SOP maturity into the Dev/Foundation source cards and nightly audit.

## Acceptance Criteria

- The parent backlog card is P0 and not parked.
- The plan names both layers: reusable extractor runtime and source-specific SOPs.
- YouTube SOP includes metadata triage, latest 10 baseline, visible creator grade/score, whole page extraction, description/resource links, free-resource capture, free Skool/community source packet, paid-gate evaluation, and morning autopilot.
- YouTube catch-up card explicitly says video-only catch-up is not God Mode.
- Source-family SOPs exist for YouTube, Skool free community, Skool paid/private, MyICOR paid training, and GitHub/docs/public resources.
- The proof fails if the system only says "watch videos."
- The proof fails if Hands, Brain, Evidence, Boundaries, Grading, or Autopilot are missing.
- Default proof does not crawl, call providers, spend budget, mutate credentials, submit forms, download, buy, post/comment/message, write externally, or auto-create backlog cards.

## Definition Of Done

This card is not done when the plan exists. This card is done only when:

- The parent runtime contract is represented in code.
- The source SOPs are represented in code and proof.
- The YouTube SOP is implemented end to end.
- The Dev/Foundation source UI can show all YouTube creators and their grade/status.
- Morning autopilot can run in dry-run and live-bounded mode without babysitting.
- Video-only extraction cannot pass any God Mode proof.
- At least one public/free resource-link follow-up path proves capture of free value.
- Paid/free-community gates produce evaluation packets instead of silent blockers.

## Proof

```bash
node --check lib/god-mode-extractor-system-contract.js scripts/process-god-mode-extractor-system-contract-check.mjs
npm run process:god-mode-extractor-system-contract-check -- --json
```

Live backlog update, only when intentionally applying the stab:

```bash
npm run process:god-mode-extractor-system-contract-check -- --apply --json
```

## Not Next

- Do not run broad YouTube live extraction from this contract stab.
- Do not call Gemini from this proof.
- Do not crawl Skool, MyICOR, private/member sources, paid courses, comments, or logged-in sessions without source-specific approval.
- Do not buy, submit forms, download, opt in, post, comment, message, mutate credentials, write externally, or auto-create backlog cards.
- Do not treat this plan as implementation complete.

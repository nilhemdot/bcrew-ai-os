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
- Newsletters are a real creator source. The system should sign up for approved free creator newsletters with `ai@bensoncrew.ca` or `crewbert@bensoncrew.ca`, route issues into an `AIOS Sources/Newsletters` mailbox label/folder, extract ideas/resources/links, and show newsletter value on the creator card.
- The creator card should show the creator source stack: YouTube, blog/site, newsletter, GitHub/docs/resources, free Skool/community, paid Skool/course, paid course/training platforms, current extraction status, and what value we are getting from each surface. MyICOR is one paid course/training platform instance, not its own top-level source family or tag.
- If a free Skool/community is linked, the system uses the free-community SOP and approved source identity/session boundary to inspect allowed free areas, including recent free chat/posts/comments, free courses, pinned resources, docs, linked resources, and safe free downloads/resources.
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

### Creator Source Stack SOP

1. Every approved creator gets one source stack row/card.
2. The stack shows every known creator surface:
   - YouTube
   - blog/site
   - newsletter
   - GitHub/docs/resources
   - free Skool/community
   - paid Skool/course
   - paid course/training platforms, with MyICOR only as one source instance when present
   - other approved public/free resources
3. Each surface has a clear status:
   - discovered
   - auto-readable public/free
   - signed up/subscribed
   - extracting
   - blocked
   - paid-gate evaluation
   - parked/throttled
   - rejected noise
4. Each surface records what value the system actually got:
   - useful ideas
   - code/resources/templates
   - implementation patterns
   - offers/paid gates
   - extracted links
   - source-backed build candidates
   - grade contribution
5. Creator grades are lane-specific, not one global score. A creator can be S for Dev build intelligence, B for realtor training, and C for marketing.
6. The creator card must show last success, extraction counts, resource count, free-resource capture status, paid-gate recommendation, blocker, and next action.
7. No source surface disappears just because another source surface is active. Missing newsletter/blog/Skool/GitHub status must be visible as missing, blocked, or not found.

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
   - newsletter/signup page
   - blog/site
   - free community
   - paid course/community/product
   - login/member/private
   - download/form/opt-in
   - short link/unknown
   - blocked/noise
8. Follow public/free resources through the governed worker/Hands route when the source policy allows it.
9. Capture free skills, code, templates, repos, docs, checklists, safe free downloads, resource pages, and implementation material when packet-allowed.
10. If a free newsletter/signup page appears, use the Newsletter Source Lane SOP.
11. If a free Skool/community appears, use the Skool Free Community SOP.
12. If a paid gate appears, stop and create a value packet for Steve:
    - what the free material already proved
    - what appears to be behind the gate
    - price if visible
    - likely AIOS value
    - risk/unknowns
    - buy / do not buy / needs more free evidence recommendation
13. Persist atoms, hits, resource dispositions, source-packet status, paid-gate evaluation, Director input, Scoper readiness, and creator grade update.
14. Update the source card so every creator shows grade/score, metadata count, watched count, pending baseline, source-stack status, resource status, newsletter status, Skool/community status, paid-gate status, blocker, and next action.
15. Morning autopilot runs the SOP only after proof is green; it stops and reports blockers instead of guessing.

### Newsletter Source Lane SOP

1. Treat free creator newsletters as a standing approved source type after they are linked to an approved creator/source and classified as free/no-purchase.
2. Use `ai@bensoncrew.ca` as the default source-intake inbox.
3. Use `crewbert@bensoncrew.ca` as fallback only when the source requires a named operator identity.
4. Submitting a free newsletter opt-in is allowed under standing source policy when:
   - the source is linked to an approved creator/source
   - the form asks for normal newsletter fields only
   - there is no payment, credit-card, phone, private credential, or paid membership requirement
   - the action does not post, comment, message, or mutate a public profile
5. If confirmation email is required, process the confirmation through the approved mailbox and record:
   - creator/source
   - signup URL
   - email used
   - confirmation timestamp
   - unsubscribe path
6. Route newsletter issues into an `AIOS Sources/Newsletters` mailbox label/folder.
7. Extract each issue for:
   - useful ideas
   - resources and links
   - code/templates/downloads
   - implementation patterns
   - offers and paid gates
   - source-grade signal
8. Follow public/free issue links through the public-resource/free-source SOP.
9. Stop on paid upgrades, account changes, unsafe downloads, unexpected login/private areas, posting/messaging, or forms outside the newsletter signup/confirmation flow.
10. Park or unsubscribe low-value newsletters after the evidence-backed grade says they are not worth ongoing monitoring.

### Skool Free Community SOP

1. Treat free Skool/community spaces as a standing approved source type after the URL is classified as free/community and the lane has an approved source identity/session boundary.
2. Use `ai@bensoncrew.ca` or `crewbert@bensoncrew.ca` for free signup/join only.
3. Store credential/session references in the approved credential/profile store, never in git or chat.
4. Use governed Hands only inside approved free areas.
5. Inspect the last 20 days of allowed free chat/posts/comments where available.
6. Inspect free courses, pinned resources, docs, and linked resources only where allowed.
7. Follow public/free resource links through the public-resource/free-source SOP.
8. Capture safe free downloads/resources when the file type and terms are acceptable.
9. Capture free value with source URL, capture time, title, artifact ID, resource disposition, and stop reason.
10. Stop at paid, private, member-only, unexpected login/session escalation, checkout, DM, posting, commenting, unsafe download, account/profile mutation, or unapproved form boundaries.
11. Emit a paid/community value evaluation if the free layer suggests the paid community or course may be worth buying.

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
4. Capture useful code/resource summary, safe free downloads/resources, and implementation applicability.
5. Do not auto-copy private code, mutate repos, create backlog cards, or write externally.

## Build Order

1. Lock this parent contract, live backlog card, process plan, and proof.
2. Update `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001` so it cannot mean video-only catch-up.
3. Build the creator source-stack read model:
   - all creator source surfaces visible
   - per-surface status
   - per-surface value capture
   - lane-specific source grades
   - blocker/next action
4. Build the YouTube SOP runner/read model end to end:
   - all creator rows visible
   - metadata triage
   - latest-10 baseline
   - full watch
   - page/description extraction
   - resource-link source packets
   - free-resource capture
   - newsletter signup/status
   - free-community status
   - paid-gate evaluation
   - creator grade update
   - morning autopilot report
5. Add Newsletter Source Lane runner with mailbox label/folder readback and one bounded signup proof.
6. Only then resume broad live YouTube spend.
7. Add Skool free-community SOP runner with standing free-source identity/session boundary and one bounded proof.
8. Add paid/private Skool and paid course/training platform approved-session proof after Steve provides exact approvals.
9. Add GitHub/docs/public resource SOP completion and Scoper-ready resource evidence.
10. Wire all source-family SOP maturity into the Dev/Foundation source cards and nightly audit.

## Acceptance Criteria

- The parent backlog card is P0 and not parked.
- The plan names both layers: reusable extractor runtime and source-specific SOPs.
- YouTube SOP includes metadata triage, latest 10 baseline, visible creator grade/score, whole page extraction, description/resource links, free-resource capture, free Skool/community source packet, paid-gate evaluation, and morning autopilot.
- YouTube catch-up card explicitly says video-only catch-up is not God Mode.
- Source-family SOPs exist for YouTube, Skool free community, Skool paid/private, paid course/training platforms, and GitHub/docs/public resources.
- Source-family SOPs exist for the creator source stack and Newsletter Source Lane.
- Newsletter signup uses `ai@bensoncrew.ca` / `crewbert@bensoncrew.ca`, routes issues to `AIOS Sources/Newsletters`, and stops on paid/private/unsafe actions.
- Free Skool/community SOP includes recent free chat/posts/comments, free courses, pinned resources, linked resources, and safe free downloads/resources.
- The proof fails if the system only says "watch videos."
- The proof fails if Hands, Brain, Evidence, Boundaries, Grading, or Autopilot are missing.
- Default proof does not crawl, call providers, spend budget, mutate credentials, submit forms, download, buy, post/comment/message, write externally, or auto-create backlog cards.

## Definition Of Done

This card is not done when the plan exists. This card is done only when:

- The parent runtime contract is represented in code.
- The source SOPs are represented in code and proof.
- The YouTube SOP is implemented end to end.
- The Dev/Foundation source UI can show all YouTube creators and their grade/status.
- The creator card can show the full source stack: YouTube, blog/site, newsletter, GitHub/docs/resources, free Skool/community, paid Skool/course/training platforms, and other approved source surfaces.
- The newsletter lane can sign up, label/folder, monitor, extract, grade, and unsubscribe/park in a governed way.
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
- Do not buy, submit unrelated forms, download unsafe files, opt in outside the approved newsletter/free-source SOP, post, comment, message, mutate credentials/profile outside the approved source identity/session boundary, write externally, or auto-create backlog cards.
- Do not treat this plan as implementation complete.

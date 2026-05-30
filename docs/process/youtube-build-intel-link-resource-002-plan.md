# YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002 Plan

## What

Build the next YouTube Build Intel slice: capture, classify, dedupe, and review YouTube description/resource links without automatically following risky external links.

This V1 starts with public no-auth YouTube source items already known to Foundation. It turns description links and resource references into Foundation review/approval data that the Dev Hub can show.

## Why

The best implementation material is often not only in the transcript. It can be in a YouTube description, linked code/resource page, Gumroad page, Skool post, download, calendar, opt-in, or other follow-up link.

Steve needs a safe operator workflow: the system should find those links, classify what they are, show why they matter, and ask before following anything outside public no-auth YouTube.

## Acceptance Criteria

- The card reads from existing public YouTube Build Intel data and approved source IDs, starting with `SRC-YOUTUBE-INTEL-001`.
- Description/resource links from approved YouTube artifacts are captured and normalized.
- Links are classified into safe public YouTube/internal references versus approval-required external/private/download/purchase/opt-in/auth/member/community links.
- Duplicate links are deduped with stable IDs/hashes and source evidence.
- Approval-required links are visible to the Dev Hub/API with source video, reason, risk boundary, and allowed decision.
- No external link follow, purchase, download, opt-in, booking, form submit, credential mutation, browser profile mutation, or private/auth source access happens automatically.
- No backlog cards are created automatically from the links.
- Focused proof dogfoods safe-link, risky-link, duplicate-link, and missing-source cases through real function/API paths.
- Plan Critic must return pass/revise with score for `YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002` before closeout.
- Current Sprint and backlog truth remain healthy after the card is closed.

## Definition Of Done

Done means YouTube description/resource links are source-backed Foundation review data: captured, classified, deduped, evidence-linked, and visible for Steve review without unsafe auto-follow behavior.

Done also means the root invariant is proven: the system can receive YouTube link/resource evidence into the Foundation pool and expose it to the Dev Hub approval flow while failing closed on risky links. Substring-only proof is rejected; a string marker that says "approval required" is not enough without real API/function/DB readback.

## Details

Existing code to reuse:

- `lib/dev-team-hub.js`
- `lib/foundation-build-intel-routes.js`
- `lib/youtube-scout-latest-video-vision.js`
- `lib/youtube-creator-daily-watch.js`
- `lib/youtube-build-intel-runtime-proof.js`
- existing intelligence report, atom, evidence-hit, and source crawl stores

Existing docs and truth to reuse:

- `docs/process/youtube-dev-team-intelligence-sprint-plan-001-plan.md`
- `docs/process/dev-team-hub-v0-001-plan.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/_archive/handoffs/2026-05-22-dev-team-hub-v0-closeout.md`
- live backlog and Current Sprint truth for `YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002`

Behavior proof must use real function/API/process paths. It should build a focused classifier/check module, run dogfood fixtures for safe, risky, duplicate, and missing-source links, write or read Foundation review records through the approved store path, and verify that `/api/foundation/dev-team-hub` can surface approval-required link data. The proof command is `npm run process:youtube-build-intel-link-resource-check -- --json`. It must reject weak proof, substring-only proof, and static markdown-only evidence.

Gate decision tree: this is a full Foundation card because it touches extraction-adjacent Build Intel behavior, Foundation intelligence/review data, Dev Hub approval display, Current Sprint/backlog truth, closeout registry, and verifier coverage. Static proof is not enough. The focused gate should be `npm run process:youtube-build-intel-link-resource-check -- --json`; broad closeout uses sprint gates and `foundation:verify` or documents unrelated broad blockers.

Operator value: Steve gets a clear approval queue for the actual high-value links hiding behind YouTube videos, without the system wandering into paid/private/auth surfaces.

Speed boundary: V1 is bounded to link capture/classification/review data and should stay fast enough for default focused proof. It does not process all videos, download files, buy products, or crawl communities.

Repair path: if source evidence, classification, dedupe, approval routing, Dev Hub readback, or sprint gates fail, fail closed, leave the exact link/source item parked, repair the focused path, and rerun the proof. If a link needs external/private access, record it as approval-required and stop.

## Risks

- The system may treat a discovered link as permission to follow it. Repair path: approval-required links stop at classification and review.
- Duplicate links can flood the approval queue. Repair path: stable dedupe IDs and source evidence references.
- Link text can be misleading. Repair path: preserve source video/artifact evidence and classify conservatively.
- The card can drift into broad extraction. Repair path: keep V1 to link/resource classification and Dev Hub approval surfacing only.
- Broad health gates can fail for unrelated Foundation health. Repair path: keep focused proof green and document unrelated blockers instead of weakening the gate.

## Not Next

- Do not run Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment extraction.
- Do not follow purchase, download, opt-in, booking, form, auth, private, paid, member, or community links automatically.
- Do not mutate credentials, OAuth tokens, provider config, browser profiles, or source systems.
- Do not create backlog cards automatically from links or recommendations.
- Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or mutate Drive permissions.

## Tests

- `node --check lib/youtube-build-intel-link-resource.js`
- `node --check scripts/process-youtube-build-intel-link-resource-check.mjs`
- `npm run process:youtube-build-intel-link-resource-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`

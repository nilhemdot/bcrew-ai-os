# WEB-GODMODE-001 Plan

## What

Build the governed website GOD-mode extraction kernel. This card creates the reusable contract and synthetic proof for browser/page/video observation before any Loom, Skool, MyICOR, meeting-video, or paid/private training worker uses it.

V1 is a kernel/proof card only. It does not launch a browser, log in, crawl a live site, fetch a transcript from a provider, store screenshot bytes, call a model, write extracted content downstream, or access paid/private/auth sources.

Operator value: Steve gets a usable extraction base that can later inspect approved pages/videos/screens/transcripts while preserving proof, stop controls, and source boundaries. Future Loom/Skool/MyICOR cards can build on one governed worker shape instead of each inventing a crawler.

## Why

Steve wants the system to extract useful knowledge from web apps, Loom videos, Skool training, meeting recordings, and paid course material. The old system had useful browser/scout patterns, but it also created agent sprawl and report piles. This card rebuilds the useful part as governed infrastructure: source boundaries, stop controls, provenance, screenshot policy, transcript/media discovery, runtime/cost ledger, and proposal-only downstream posture.

Without this card, the next extractor cards either stay blocked or risk becoming uncontrolled browser automation.

## Acceptance Criteria

- `WEB-GODMODE-001` has a valid 9.8 approval file and a Plan Critic pass row.
- `buildWebGodmodeObservation()` passes on the synthetic fixture and returns page text, DOM outline, media references, transcript candidates, screenshot references, source anchors, and a zero-cost runtime ledger.
- `buildWebGodmodeDogfoodProof()` passes and rejects unsafe cases with explicit failure codes.
- `process:web-godmode-check` passes in focused mode and proves the live card, sprint item, package script, closeout registry, and closeout handoff.
- `process:foundation-ship` passes before the card is pushed to main.

## Definition Of Done

- `buildWebGodmodeObservation()` returns ready on the synthetic fixture.
- The fixture produces page text, heading/DOM outline, at least two media references, at least one transcript candidate, one screenshot reference, provenance anchors, and zero-cost runtime ledger.
- The output validates through `validateMultimodalExtractionEnvelope()`.
- `buildWebGodmodeDogfoodProof()` blocks unknown access, private/auth without preflight, cross-host navigation, broad crawl, screenshot-without-policy, external writes, live browser side effects, and live run without approved preflight.
- The focused proof updates live backlog/current sprint only when run with explicit `--apply` or `--close-card`; read-only mode must not write live state.
- Live backlog marks `WEB-GODMODE-001` executing/done and Current Sprint truth uses the GOD-mode extraction sprint.
- `LOOM-001` is the next scoped card after closeout.
- Focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.

## Details

In scope:

- `lib/web-godmode-extractor.js` with source-boundary validation, operation limits, side-effect gates, synthetic page observation, multimodal envelope compatibility, and unsafe-operation dogfood.
- `scripts/process-web-godmode-check.mjs` focused proof with approval, Plan Critic, live backlog/current sprint, prerequisite cards, synthetic observation, stop-control dogfood, package script, and closeout registry checks.
- Current Sprint update to `FOUNDATION-GODMODE-EXTRACTION-2026-05-19`, with `WEB-GODMODE-001` first and `LOOM-001` next.
- Closeout wiring and proof commands.

Out of scope:

- No live browser launch or login.
- No private/auth/paid source content access.
- No broad crawl or blind scraping.
- No video/audio download, provider transcript fetch, screenshot byte storage, vision/model call, OCR, or transcription.
- No external writes, sends, Drive permission mutation, credential/key mutation, public exposure, or downstream content writes.
- No automatic backlog/atom/KB/synthesis/action-route/vector/query-index mutation from extracted content.
- No MEETING-VAULT-ACL-001 Phase B or Drive permission work.

Behavior proof path:

- Function proof: `buildWebGodmodeObservation()`, `validateWebGodmodeRequest()`, and `buildWebGodmodeDogfoodProof()`.
- Contract proof: `validateMultimodalExtractionEnvelope()` accepts the synthetic observation envelope and rejects unsafe variants.
- Process proof: `process:web-godmode-check` validates approval integrity, Plan Critic, live backlog/current sprint truth, prerequisite cards, closeout registry, package script, and read/write posture.
- Live state proof: `--close-card` explicitly updates backlog/current sprint; read-only mode reports current state without mutating it.

Gate decision tree and blast radius:

- Static gate: `node --check` for the new module and focused script.
- Focused gate: `process:web-godmode-check` for kernel behavior, dogfood, live sprint/backlog truth, and closeout registry.
- System gates: System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship`.
- Blast radius is Foundation extraction control-plane code plus backlog/current-sprint truth, so the card uses static, focused, and full gates.

Speed budget:

- The focused proof must stay fast, synthetic/no-network, and complete in under 2 minutes so it is used by default.
- The module and process script must stay below 900 and 650 lines respectively.
- Approval and closeout artifacts are small bounded records; no generated crawl report or media artifact is created in this card.

File/artifact budgets:

- `docs/process/approvals/WEB-GODMODE-001.json` is a bounded approval data record under 120 lines.
- `docs/handoffs/2026-05-19-web-godmode-closeout.md` is a bounded closeout artifact under 150 lines.
- No screenshots, transcripts, video downloads, model outputs, or extracted content reports are written by this card.

## Reuse Existing Work

- `MULTIMODAL-EXTRACTOR-001` defines multimodal input/evidence/access classes and envelope validation.
- `COURSE-SOURCE-AUTH-BOUNDARY-001` blocks private, paid, community, course, Loom, Skool, and MyICOR extraction without source-specific approval.
- `EXTRACTION-TEAM-001` anchors supervised runtime boundaries and no hidden extraction workers.
- `EXTRACTION-TO-KB-ATOM-PIPELINE-001` keeps outputs proposal-only before downstream persistence.
- `OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001` promoted the old browser/page/video scout pattern while rejecting old agent sprawl.
- `FOUNDATION-OPERATOR-PULSE-001` gives the live operator next-card surface that now points to this card.

Existing code/docs/scripts/backlog truth reused:

- Code: `lib/multimodal-extractor-contract.js`, `lib/course-source-auth-boundary.js`, `lib/extraction-team-runtime.js`, `lib/extraction-to-kb-atom-pipeline.js`.
- Docs: `docs/process/multimodal-extractor-001-plan.md`, `docs/process/course-source-auth-boundary-001-plan.md`, `docs/process/extraction-team-runtime-001-plan.md`, `docs/process/old-system-research-team-harvest-001-plan.md`.
- Scripts: `scripts/process-old-system-research-team-harvest-check.mjs`, `scripts/process-foundation-operator-pulse-check.mjs`.
- Backlog truth: `WEB-GODMODE-001`, `LOOM-001`, `MEETING-VIDEO-001`, `SKOOL-WORKER-001`, `MYICRO-TRAINING-001`, `DRIVE-WORKER-001`, `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`, `SOURCE-019`, `SOURCE-020`, and `DATA-002`.

The kernel validates an observation request before any page observation can run:

- Source ID, URL, host allowlist, access class, rights class, and content-use boundary are required.
- Approved operations are limited to page text, DOM outline, link discovery, media discovery, transcript discovery, screenshot references, and workflow observation.
- Forbidden operations include external writes, sends, credential mutation, Drive permission mutation, public posting, browser login, private content read, broad crawl, and automatic downstream writes.
- Public/synthetic observations can run only inside the declared host boundary.
- Private/paid/browser-auth observations require approved session preflight and approver.
- Screenshot references require storage policy and visual-use boundary.
- Runtime bounds cap pages, screenshots, and runtime.
- Side effects must stay zero in V1.

The synthetic fixture proves page text extraction, DOM outline, links, embedded media, transcript candidate discovery, screenshot references without bytes, cost/runtime ledger, provenance anchors, and multimodal envelope compatibility.

## Risks

- Risk: GOD-mode becomes a wild crawler. Mitigation: host allowlist, operation allowlist, page/runtime caps, and forbidden-operation dogfood.
- Risk: private/paid/auth sources get accessed by implication. Mitigation: source-specific preflight required, and V1 launches no browser or network fetch.
- Risk: screenshot/OCR/video work creates artifact bloat. Mitigation: V1 stores screenshot references only and requires storage/use policy before richer visual work.
- Risk: extracted content mutates downstream systems too early. Mitigation: auto backlog/atom/KB/synthesis/action-route/vector/query writes are forbidden.
- Risk: the builder stops on approval-bound work. Mitigation: blocker actions are parked with exact command/reason, then safe sprint work continues.

Rollback/repair path:

- If focused behavior fails, repair the kernel/dogfood before touching live backlog or sprint truth.
- If live state mutation fails, leave the card executing/scoped, report the exact DB/sprint blocker, and continue only with safe non-mutating work.
- If a future source requires auth/private/paid access, park that action with command/reason/approval owner and continue the next safe sprint card.
- If System Health or repeated-failure gates go red from workflow failure, repair that first before continuing source/value extraction.

## Tests

- `node --check lib/web-godmode-extractor.js scripts/process-web-godmode-check.mjs`
- `npm run process:web-godmode-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=WEB-GODMODE-001 --planApprovalRef=docs/process/approvals/WEB-GODMODE-001.json --closeoutKey=web-godmode-extractor-v1 --commitRef=HEAD`

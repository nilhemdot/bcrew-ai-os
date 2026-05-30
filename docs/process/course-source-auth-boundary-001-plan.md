# COURSE-SOURCE-AUTH-BOUNDARY-001 Plan

## What

Define the source-auth approval boundary for private, paid, community, course, Loom/private training, and public no-auth Build Intel sources before extraction can run.

Tight V1 scope: policy matrix, source rows, approval packet fields, focused proof, verifier coverage, live backlog/current sprint truth, and closeout only.

Not next: live extraction, private/paid/community/course login, Skool/MyICOR/Loom authorized-browser use, source crawl, transcript fetch, screenshot/keyframe capture, download, summarization, vision/model calls, Research Inbox writes, KB drafts, atoms, action routes, backlog mutation from extracted content, OpenHuman install/runtime, Harlan UI/runtime, Drive permissions mutation, Meeting Vault Phase B, external writes, hidden subagents, or parallel builders.

## Why

The Build Intel watchlist now names sources that mix public, paid, private, community, and course-like surfaces. Steve needs a clear line between safe metadata-only preflight and content extraction so MyICOR, Skool, Loom/private training, and paid communities cannot be scraped, copied, summarized, screenshotted, or routed before explicit approval.

## Acceptance Criteria

- Existing source contracts, connector blocker registry, Build Intel watchlist, extractor queue precedent, Current Sprint helpers, Plan Critic, Recent Builds, and ship gates are reused.
- `SRC-MYICRO-001`, `SRC-SKOOL-001`, `SRC-LOOM-001`, and `SRC-YOUTUBE-INTEL-001` are classified in the source-auth matrix.
- Metadata-only preflight is allowed and bounded.
- Private/paid/course/community/video extraction remains blocked until a source-specific approval packet exists.
- Approval packet required fields include actor, access method, permitted content, max scope, storage, redaction, downstream use, review cadence, rollback/delete plan, proof command, and expiry/review date.
- Focused proof dogfoods missing source, missing approval field, unsafe private approval, live extraction, paid/private auth, and downstream output writes.
- `foundation:verify` covers the boundary honestly.
- Full `process:foundation-ship` passes before push.

## Definition Of Done

- `lib/course-source-auth-boundary.js` owns the source-auth matrix, source rows, snapshot, dogfood, and report renderer.
- `scripts/process-course-source-auth-boundary-check.mjs` validates approval, Plan Critic, live backlog/current sprint truth, source-contract evidence, connector blocker evidence, docs, package script, verifier coverage, closeout registry, and side-effect boundaries.
- `lib/foundation-intelligence-audit-verifier.js` covers this card and dogfoods unsafe source-auth variants.
- The card closes under `course-source-auth-boundary-v1`.
- Next card is `EXTRACTION-TEAM-001`; MyICOR/Skool/Loom/private course extraction remains blocked until later source-specific approval packets.

## Details

Existing code to reuse: `lib/source-contracts.js`, `lib/connector-credential-registry.js`, `lib/build-intel-watchlist.js`, `lib/extractor-queue-karpathy-kb-video-pack.js`, `lib/build-intel-creator-watchlist-expansion.js`, Current Sprint helpers, Plan Critic helpers, and process write guards.

Existing docs to reuse: `docs/source-registry.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and `docs/_archive/handoffs/2026-05-18-build-intel-creator-watchlist-expansion-closeout.md`.

Existing scripts to reuse: `process:build-intel-creator-watchlist-expansion-check`, `process:extractor-queue-karpathy-kb-video-pack-check`, `backlog:hygiene`, `foundation:verify`, `process:ship-check`, `process:fanout-check`, and `process:foundation-ship`.

Behavior proof: focused proof must call actual function paths `buildCourseSourceAuthBoundarySnapshot()`, `buildCourseSourceAuthBoundaryDogfoodProof()`, and `renderCourseSourceAuthBoundaryReport()`, then run `npm run process:course-source-auth-boundary-check`. The proof must validate real source-auth behavior and dogfood unsafe variants; substring-only proof is rejected unless backed by function-path proof and synthetic failing cases.

Gate decision tree: static policy text is not enough because the root invariant is fail-closed private/source auth. Focused proof validates the matrix and dogfood variants. Full proof runs `foundation:verify` and `process:foundation-ship` because the blast radius includes verifier coverage, Current Sprint truth, Recent Builds, and future extractor runtime gates. Focused proof should stay fast/proportional, under 2 minutes.

Apply posture and read-only rule: the process script is read-only by default. Live backlog and Current Sprint writes require explicit `--apply` or `--close-card`; no-flag writes are blocked, and verifier/check paths fail closed instead of repairing live state.

Split plan: `docs/rebuild/current-plan.md` is over the preferred handwritten-file budget, so this card only adds a tiny Current Sprint status note there. New behavior stays in `lib/course-source-auth-boundary.js` and the focused proof script. No new responsibility, durable doctrine sprawl, or broad source-auth manual is added to the large plan file.

Explicit file-size budget: approval JSON/data records stay under 60 lines, report artifacts and handoffs stay under 120 lines for this card, generated/data/report artifacts stay under 3000 lines, and handwritten modules/scripts stay under the 1500-line preferred budget or require a split/no-new-responsibility plan.

Shared-file coordination: this is main-session Foundation work with active sprint scope. No separate builder, hidden subagent, side lane, hub chat, or parallel worker owns these shared files. The main session owns coordination, commit, push, and ship; future side/hub work touching shared files must return to the main session before commit or push.

Operator behavior: Steve gets a simple, useful approval boundary before extraction speed increases. He can tell what is safe metadata preflight, what is blocked, what must be approved, and why public YouTube differs from MyICOR, Skool, and Loom. That improves speed and quality by preventing accidental private-source extraction while letting safe preflight cards continue.

## Risks

- The card can drift into logging into paid/private sources, screenshots, transcripts, downloads, model summaries, or downstream KB/atom/action outputs.
- A vague approval packet could later be mistaken for blanket private-source permission.
- Public YouTube metadata may be confused with public transcript/model extraction approval.
- If proof fails, the repair path is to fail closed, revise the matrix/proof/docs, rerun the focused command, and only then continue to full ship gates.

## Tests

- `node --check lib/course-source-auth-boundary.js lib/foundation-intelligence-audit-verifier.js scripts/process-course-source-auth-boundary-check.mjs scripts/foundation-verify.mjs`
- `npm run process:course-source-auth-boundary-check -- --apply --json`
- `npm run process:course-source-auth-boundary-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=COURSE-SOURCE-AUTH-BOUNDARY-001 --planApprovalRef=docs/process/approvals/COURSE-SOURCE-AUTH-BOUNDARY-001.json --closeoutKey=course-source-auth-boundary-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=COURSE-SOURCE-AUTH-BOUNDARY-001 --closeoutKey=course-source-auth-boundary-v1`
- `npm run process:foundation-ship -- --card=COURSE-SOURCE-AUTH-BOUNDARY-001 --planApprovalRef=docs/process/approvals/COURSE-SOURCE-AUTH-BOUNDARY-001.json --closeoutKey=course-source-auth-boundary-v1 --commitRef=HEAD`

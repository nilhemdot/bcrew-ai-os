# Build Intel Intake Foundation Sprint Plan

## What

Run a backend-first Foundation sprint that creates the intake primitives for Build Intel: normalized creator/source watchlist truth, a governed multimodal extraction contract, and a proposal-only Research Inbox gate.

## Why

Steve wants AIOS to learn from the builders he follows without repeating the old-system mistake of messy autonomous agents and loose chat memory. The system needs deterministic source truth and proposal gates before actual extraction work starts. This sprint makes the next extraction sprint safer by defining who to follow, how extracted evidence is allowed to be represented, and where recommendations land before becoming backlog work.

## Acceptance Criteria

- The sprint is visible in live DB with all three cards starting in Scoping.
- `CREATOR-WATCHLIST-001`, `MULTIMODAL-EXTRACTOR-001`, and `RESEARCH-INBOX-001` each have complete doctrine and a Plan Critic pass row at 9.8 or higher before build.
- Build Intel sources are captured separately from later marketing-content sources.
- The multimodal extractor contract distinguishes public YouTube, authorized paid/private sources, browser/session screenshots, transcript-only evidence, visual evidence, route/cost provenance, rights class, skip reasons, and adopt/adapt/ignore recommendations.
- Research Inbox is the proposal-only gate for Build Intel findings before backlog mutation.
- Closeout explicitly names the next sprint as **Build Intel Extraction Implementation Sprint** and does not start extraction implicitly.

## Definition Of Done

- All three backlog cards close with focused proof and live backlog/current sprint readback.
- The focused proof calls actual exported functions and API-style snapshots, not substring-only markers.
- The closeout explains what the next extraction sprint should implement and what remains blocked on Steve/auth decisions.
- Foundation verifier and backlog hygiene pass before final closeout.

## Details

Existing code to reuse: live backlog helpers, Current Sprint overlay helpers, Plan Critic, source contracts for `SRC-CREATOR-WATCHLIST-001` and `SRC-YOUTUBE-INTEL-001`, source lifecycle/source registry surfaces, and Foundation verifier patterns. Existing docs to reuse: `docs/handoffs/2026-05-13-build-intel-direction-capture.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/source-registry.md`, and existing source notes for video, Skool, Loom, and myICOR. Existing scripts to reuse: a focused Build Intel intake proof, `backlog:hygiene`, and `foundation:verify`.

The root invariant is: AIOS cannot claim Build Intel readiness because a chat listed creators. Readiness requires source-backed watchlist entries, a governed extractor output contract, and a proposal-only intake gate that prevents automatic backlog mutation. The black-box proof should read the actual module exports, validate required source rows, validate extractor-policy decisions, validate proposal-only research inbox behavior, and read back live backlog/current sprint state. Substring-only proof is rejected.

Gate decision: focused process check plus full Foundation verify because this sprint adds shared Foundation contracts and closes live backlog cards. Blast radius is intake contract and source/proposal metadata only. No external network extraction, login flow, Drive mutation, or provider spending path is allowed.

## Risks

- A registry-only sprint can feel like delay. Mitigation: closeout must name the exact next extraction implementation sprint and its scope.
- Public YouTube visual extraction can drift into bulk screenshot scraping. Mitigation: contract defaults to official/Gemini-first public-video policy and requires explicit screenshot/keyframe storage rules.
- Research Inbox could become auto-dev by another name. Mitigation: proposal-only state, Steve+Codex approval before backlog mutation, and proof that promotion returns a proposal instead of writing backlog.
- Paid source access can leak into this sprint. Mitigation: paid/auth extraction remains blocked until Steve is present to approve access and content-use boundaries.

## Tests

- `npm run process:build-intel-intake-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CREATOR-WATCHLIST-001 --planApprovalRef=docs/process/approvals/CREATOR-WATCHLIST-001.json --closeoutKey=build-intel-intake-foundation-v1 --commitRef=HEAD`

## Not Next

- Do not extract Skool, myICOR, Loom, or logged-in web content.
- Do not run a bulk YouTube sweep or generate atoms from the watchlist.
- Do not auto-create backlog cards from Build Intel findings.
- Do not build Reply/Watching Loop, Strategy Hub expansion, marketing content production, directors, Telegram bots, or autonomous dev.
- Do not mutate Drive permissions, send request-access emails, or change model/provider spending policy.

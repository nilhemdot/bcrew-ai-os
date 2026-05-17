# EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001 Plan

Card: `EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001`

## What

Build a narrow V1 queue packet for the Karpathy LLM Knowledge Base source set. This is queue/spec/preflight only: the live `source_crawl_targets` row stays fail-closed as `blocked` with `metadata.approvalStatus=pending_approval`, manual runtime mode, no scheduled job, no live-run approval, and no Research Inbox/backlog/atom mutation.

## Why

Steve and the team need speed with quality before Build Intel or extractor work resumes. The useful operator behavior this unlocks is a visible, inspectable source packet that agents can plan against without turning chat titles into live extraction, spend, or auth work.

## Acceptance Criteria

- `EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001` exists in live Backlog and Current Sprint with this plan, approval, closeout key, not-next boundaries, proof commands, and existing-work metadata.
- Dream Labs AI exists in the Build Intel watchlist as `public_lookup_required`, and Nate Herk remains present.
- The packet contains the Dream Labs AI video, Nate Herk video, and original Karpathy LLM Wiki source URL as three source candidates.
- The live extraction control target is `blocked` plus `approvalStatus=pending_approval`, `runtimeMode=manual`, no `foundationJobKey`, no live-run approval, and zero source crawl runs.
- The readiness API route sees the packet and marks it non-runnable while pending approval.
- Source Lifecycle represents the packet in its governed target baseline with unchanged caps, zero extra target drift, and no quota increase.
- Dogfood rejects unsafe variants: active/scheduled, live-approved, missing Dream Labs, and missing lookup URL.
- Substring-only proof is rejected; proof must call the actual function path, DB path, and API route behavior.

## Definition Of Done

- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused instead of rebuilding extractor control.
- The focused proof command `npm run process:extractor-queue-karpathy-kb-video-pack-check -- --close-card --json` passes and records the card as done.
- `npm run backlog:hygiene -- --json`, `npm run foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout registry and handoff exist for `extractor-queue-karpathy-kb-video-pack-v1`.
- No live extraction, transcript fetch, screenshot capture, crawl, summarization, model call, paid/auth access, Research Inbox write, backlog mutation from extracted content, or atom promotion occurs.

## Details

Reuse `lib/extraction-runtime-readiness.js`, `lib/source-lifecycle.js`, `lib/foundation-source-crawl-store.js`, `lib/build-intel-watchlist.js`, `lib/research-inbox.js`, `scripts/process-extraction-runtime-readiness-check.mjs`, `scripts/seed-extraction-control.mjs`, and `scripts/foundation-verify.mjs`. The root invariant is that a Karpathy packet is useful only when it is live queue truth, represented in source lifecycle visibility, and also impossible to run without separate approval.

The check script is read-only by default. Live Backlog, Plan Critic, extraction-control, and Current Sprint mutation require explicit `--apply` or `--close-card`; no-flag mode is blocked for mutations and must fail closed rather than repair live state. Main-session approved coordination owns this Foundation sprint and the shared process files; this is not side, hub, Canva, Fal, Harlan, voice, or OpenHuman work.

This card touches over-budget shared verifier/process surfaces only as no new responsibility wiring: `scripts/foundation-verify.mjs`, `docs/rebuild/current-plan.md`, and `lib/foundation-build-closeout-control-plane-records.js` receive references/counts only. `lib/source-lifecycle.js` receives the target baseline row required to keep the existing lifecycle invariant true; it does not start extraction or raise a quota. New responsibility stays in `lib/extractor-queue-karpathy-kb-video-pack.js` and its focused proof module. Data/report artifact budgets: approval JSON under 50 lines, closeout handoff under 120 lines, and both remain explicit bounded artifacts.

## Risks

- Risk: pending approval is misclassified as runnable. Repair path: readiness validator reads queue approval metadata, excludes `pending_approval` from runnable statuses, and the focused proof inspects the API route.
- Risk: queue packet becomes extraction. Repair path: target has no scheduled job key, no live-run approval, manual runtime mode, and active/scheduled dogfood fails closed.
- Risk: source titles become loose chat truth. Repair path: source candidates live in the packet module and extraction-control metadata.
- Risk: watchlist count drift breaks Build Intel verifier truth. Repair path: update the intake proof/verifier count to 24 Build Intel sources and keep docs aligned.
- Risk: a new queue target breaks Source Lifecycle caps/baseline gates. Repair path: represent the target in Source Lifecycle as blocked/manual with bounded caps and no live quota increase.
- Risk: shared-file changes create process drag. Repair path: fail closed, revise this card, or reopen a follow-up instead of broadening scope.

## Tests

Gate decision tree: static syntax first, focused proof while iterating, full Foundation ship gate at the end because this touches extraction runtime, verifier wiring, package scripts, live Backlog, Current Sprint, and extraction control. The focused proof is fast and proportional; it should run in under 2 minutes so it is used by default.

- `node --check lib/extractor-queue-karpathy-kb-video-pack.js lib/extraction-runtime-readiness.js lib/foundation-extraction-runtime-verifier.js scripts/process-extractor-queue-karpathy-kb-video-pack-check.mjs scripts/foundation-verify.mjs`
- `npm run process:extractor-queue-karpathy-kb-video-pack-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001 --planApprovalRef=docs/process/approvals/EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001.json --closeoutKey=extractor-queue-karpathy-kb-video-pack-v1 --commitRef=HEAD`

## Not Next

Do not run live extraction. Do not fetch transcripts, screenshots, crawls, summaries, or video model outputs. Do not do auth-required extraction, paid extraction, OAuth, connector auth, Harlan, Fal, voice, Canva, OpenHuman, broad UI redesign, Meeting Vault Phase B, Drive permissions mutation, Agent Feedback auto-send, atom promotion, Research Inbox write, or backlog mutation from extracted content.

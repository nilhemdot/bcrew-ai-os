# BUILD-INTEL-RESEARCH-INBOX-PROPOSALS-001 Plan

## What

Route extracted Build Intel observations into proposal-only Research Inbox items and enrichment proposals for existing backlog cards.

## Why

Steve clarified the YouTube builders will mostly help with how to implement ideas we already have. That means the output should usually enrich existing cards rather than create new backlog items. This card makes Research Inbox the gate.

## Acceptance Criteria

- `BUILD-INTEL-RESEARCH-INBOX-PROPOSALS-001` has a Plan Critic pass row with score at least 9.8 before build.
- Each proposal validates through `validateResearchInboxItem` / `buildResearchInboxPromotionProposal`.
- Proposals carry source ref, source type, why Steve cares, takeaway, system fit, related cards, recommendation, owner, disposition, and evidence links.
- At least one proposal targets an existing backlog card when a relevant match exists.
- Every proposal has `proposalOnly=true`, `writesBacklog=false`, `requiresSteveApproval=true`, and `autoCreateBacklogCard=false`.
- The proof compares before/after backlog counts and lanes and fails if they change from proposal generation.

## Definition Of Done

- The Build Intel extraction snapshot exposes Research Inbox proposal rows.
- The generated handoff includes proposal summaries without mutating the backlog.
- The backlog card and sprint item close under `build-intel-extraction-implementation-v1`.

## Details

Existing code to reuse: `RESEARCH-INBOX-001` contract functions, `buildResearchInboxPromotionProposal`, `validateResearchInboxItem`, `buildBuilderLessonLinkerSnapshot`, live backlog readers, Current Sprint helpers, and Foundation verifier helpers. Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/build-intel-extraction-implementation-2026-05-13-plan.md`, and this plan. Existing scripts to reuse: `process:build-intel-extraction-check`, `backlog:hygiene`, and `foundation:verify`. Existing live backlog and Current Sprint truth to reuse: `BUILD-INTEL-RESEARCH-INBOX-PROPOSALS-001`, `RESEARCH-INBOX-001`, `BUILDER-LESSON-LINKER-001`, and `INTERNAL-SCOPER-001`.

The root invariant is: external Build Intel informs cards but never edits cards without Steve/Codex review. The behavior proof must call the actual function path and API route through a black-box round trip, compare before/after live backlog lane counts, and reject substring-only proof. A synthetic weak case must fail if any proposal sets `autoCreateBacklogCard=true` or `writesBacklog=true`.

Gate decision tree: static proof is insufficient because mutation safety must be proven through live backlog counts; focused proof is `npm run process:build-intel-extraction-check -- --json`; full proof is required at sprint close with `npm run foundation:verify` and `process:foundation-ship` because the blast radius includes Foundation API/verifier behavior. The focused proof should stay fast, targeting under 2 minutes.

## Risks

- Matching may miss relevant cards because titles are thin. Mitigation: proposal rows can still use `needs_steve_review`, and Internal Scoper handles thin cards later.
- Too many proposals create noise. Mitigation: V1 caps proposal output and prioritizes implementation themes.
- Auto-mutation could reintroduce old-system drift. Mitigation: before/after DB counts and proposal flags are hard proof.
- Repair path: if proposal generation changes backlog counts, fail closed, reopen the card, and mark generated proposals invalid until a clean proposed-only run passes.
- Operator value: Steve gets builder implementation lessons attached to existing cards for review, not another unmanaged set of new ideas.
- Speed bound: the focused proposal proof should run under 2 minutes and avoid any network or LLM call.

## Tests

- `npm run process:build-intel-extraction-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not insert, update, close, or move backlog items from these proposals.
- Do not approve proposals automatically.
- Do not build a full BUILD-SCOPER agent in this sprint.
- Do not schedule recurring proposal generation.

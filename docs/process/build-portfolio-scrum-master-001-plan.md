# BUILD-PORTFOLIO-SCRUM-MASTER-001 Plan

## What

Build the post-Scoper portfolio layer for Dev build opportunities.

This is the missing step after the Dev Intelligence Director and Scoper. It reviews scoped build candidates, finds duplicates and overlap, merges related ideas into stronger build concepts, enriches thin cards with source-backed evidence, and proposes the highest-leverage queue/sprint order.

Working name: Build Portfolio / Sprint Master.

This intentionally improves on the old agent system instead of recreating it. The old system had useful separation between Dev Director, Implementation Scoper, Backlog Monitor, and Sprint Master, but it was too agent-heavy and too easy for reports to pile up. The new version keeps the useful roles as code-owned contracts, Foundation-backed source lineage, focused proof, and explicit handoffs.

## Why

The system will eventually extract hundreds or thousands of useful ideas from YouTube, Skool, MyICOR, GitHub/repos, communities, meetings, email/comms, Drive, and training material.

If every extracted idea becomes a separate scoped card, the backlog becomes noise. Seven related ideas from seven sources may actually describe one much stronger AIOS capability. The useful behavior is not just ranking individual cards; it is combining overlapping source-backed ideas into one better build that advances the AIOS mission.

The target loop is:

`approved sources -> extraction -> Director recommendations -> Scoper -> Build Portfolio/Sprint Master -> merged/enhanced build opportunities -> Steve approval/promotion -> queue/sprint`

Plain English: the Director says what looks valuable, the Scoper figures out what it would actually take to build, then the Build Portfolio/Sprint Master reviews the whole pile and turns seven overlapping ideas into one better proposal before Steve approves it.

Short approval chain: Director -> Scoper -> Build Portfolio/Sprint Master -> Steve approval.

## Acceptance Criteria

- Reads scoped build candidates from Foundation truth, not chat memory.
- Reads Director recommendations, source reports, atoms, evidence hits, and Scoper output.
- Treats raw Director recommendations as Scoper inputs only; they cannot become merged portfolio proposals until Scoper adds build scope, acceptance criteria, definition of done, proof/tests, risks, not-next boundaries, existing work to reuse, and source lineage.
- Detects duplicate and overlapping ideas across sources, creators, meetings, comms, and prior backlog cards.
- Clusters related candidates into build-opportunity groups.
- Produces a merged/enhanced build concept when multiple cards are really one stronger opportunity.
- Preserves source lineage for every merged concept: which ideas, sources, videos/reports/atoms, and evidence contributed.
- Reuses useful old-system operating rules from Dev Director, Implementation Scoper, Sprint Master, and Backlog Monitor evidence, but does not recreate the old system as a swarm of always-on agents.
- Scores merged concepts against System Strategy and the AIOS mission:
  - Foundation/shared truth
  - God Mode Extractor quality
  - reliable agents/execution systems
  - context continuity
  - agent/realtor coaching leverage
  - marketing/content leverage where relevant
  - approval-gated safe execution
- Produces queue recommendations with plain-English reasons: build now, strong next, park, merge into existing card, blocked by source/auth/proof, or reject.
- Does not auto-promote to sprint or backlog execution without Steve approval.
- Focused proof includes dogfood fixtures for:
  - duplicate scoped cards merged
  - overlapping cards enhanced into one stronger concept
  - unrelated cards kept separate
  - thin or generic cards returned to Scoper when they lack acceptance criteria, definition of done, proof/tests, risks, not-next boundaries, existing work to reuse, or source lineage
  - blocked/source-auth cards parked
  - already-existing backlog card reused instead of duplicated

## Definition Of Done

- Add a bounded Build Portfolio/Sprint Master plan, proof script, and reusable classifier/merger.
- Connect it after Scoper and before `BUILD-OPPORTUNITY-PROMOTION-GATE-001`.
- Produce a Steve-readable portfolio report with merged build opportunities and source lineage.
- Add proof that queue output cannot silently create sprint work, backlog execution work, or external actions.
- Update Dev Data Pool / future Dev backlog view only after the read path is proven.

## Relationship To Existing Work

This reuses the useful part of `BACKLOG-SCRUM-MASTER-GROOMING-001`: classify, dedupe, alias/supersede, enrich, and sequence cards.

The difference is timing and input:

- old backlog grooming reviewed broad existing backlog health
- this card reviews scoped build opportunities produced by the intelligence/extraction pipeline

## Not Next

- Do not turn this into a broad autonomous builder.
- Do not auto-create sprint work.
- Do not bypass Scoper.
- Do not ask Steve to approve vague recommendations before scope exists.
- Do not let "ready for Scoper" mean "ready for Steve approval" or "ready for sprint."
- Do not merge ideas without preserving source lineage and evidence.
- Do not run new extraction from this card.

## Old-System Evidence Reviewed

Useful patterns were pulled from:

- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-dev-director-intel/SKILL.md`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-implementation-scoper/SKILL.md`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-sprint-master/SKILL.md`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-backlog-monitor/SKILL.md`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/knowledge/dev-planning.md`
- `/Users/bensoncrew/bcrew-ai-os/public/dev-reference/old-neural-map.html`

What to keep:

- Director is the intelligence funnel.
- Scoper defines how a recommendation becomes buildable.
- Sprint Master/portfolio review is the gateway before build order.
- Backlog Monitor watches duplicates, stale work, and ghost completions.

What to change:

- Fewer always-on agents.
- More deterministic code contracts.
- More source lineage.
- More focused dogfood proof.
- No automatic sprint/build promotion without Steve seeing the merged scope.

## Tests

- `node --check lib/build-portfolio-scrum-master.js`
- `node --check scripts/process-build-portfolio-scrum-master-check.mjs`
- `npm run process:build-portfolio-scrum-master-check -- --json`

The focused proof must also dogfood raw Director recommendations and prove they return to Scoper with source lineage preserved instead of entering the portfolio queue.

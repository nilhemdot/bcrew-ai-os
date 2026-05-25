# Old System Dev Agent Harvest

Date: 2026-05-25
Source: `/Users/bensoncrew/bcrew-buddy-reference`
Purpose: Preserve the useful old-system Dev pipeline ideas without recreating the old agent sprawl.

## Plain-English Call

The old system had the right job boundaries, but the wrong operating shape.

Keep the role separation:

1. scouts and extractors collect evidence
2. Director ranks what matters
3. Scoper turns promising ideas into buildable scope
4. Sprint/Portfolio Master merges, dedupes, and orders scoped work
5. Steve approves promotion
6. builders execute only after the card is real

Do not rebuild the old swarm. In AIOS, these jobs should be code-owned contracts, source-backed reports, and focused proofs first. Add model/agent judgment only at the points where judgment improves output quality.

## Useful Old-System Parts To Keep

### Dev Director

Evidence:

- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-dev-director-intel/SKILL.md`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-director-intelligence/SKILL.md`

What was useful:

- one funnel for dev intelligence
- dynamic source discovery instead of one fixed list
- scoring by relevance, actionability, urgency, and strategic value
- watching tracker so repeated signals escalate instead of dying in reports
- ground-truth check against current capabilities and backlog before recommending work

What AIOS should do better:

- source discovery comes from Foundation source contracts and source IDs, not loose folders
- Director output stays proposal-only and never writes backlog directly
- Director must cite raw atoms/hits and report artifacts
- repeated signals should become clustered evidence, not duplicate cards

### Implementation Scoper

Evidence:

- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-implementation-scoper/SKILL.md`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/knowledge/implementation-scoping.md`

What was useful:

- Director says what and why; Scoper defines how
- full card template with plain-English what/why, acceptance criteria, definition of done, details, risks, and test steps
- codebase scan before writing cards
- explicit blocked/source/auth handling
- quality self-check before promotion

What AIOS should do better:

- Scoper output stays proposal-only until Steve approval
- every scoped candidate must cite at least one raw intelligence atom or evidence hit, not just a Director summary
- no direct backlog writes in V1; Portfolio and approval gate decide promotion
- checks should fail closed when scope is thin

### Sprint Master / Portfolio Layer

Evidence:

- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-sprint-master/SKILL.md`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/knowledge/dev-planning.md`

What was useful:

- separates Dev work from Marketing work
- buildability filter before ranking
- snapshot/decision log discipline
- stale item, duplicate item, and ghost completion review
- consolidation rule: fewer well-scoped tasks beat many overlapping tasks

What AIOS should do better:

- Portfolio reviews only scoped candidates, never raw recommendations
- it merges overlapping scoped work while preserving all source lineage
- it returns thin cards to Scoper
- it parks source/auth blockers
- it proposes queue order; Steve approves promotion

### Backlog Monitor

Evidence:

- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-backlog-monitor/SKILL.md`

What was useful:

- stale item detection
- duplicate detection
- ghost completion detection
- priority alignment checks
- weekly health report feeding Sprint Master

What AIOS should do better:

- use live Foundation backlog/API truth instead of markdown parsing
- convert repeated hygiene failures into verifier checks or repair cards
- keep reports short and decision-oriented

### Event Chain

Evidence:

- `/Users/bensoncrew/bcrew-buddy-reference/src/scheduler.ts`

Old chain:

`Dev Director -> Implementation Scoper -> Sprint Master -> code task orchestrator`

Useful idea:

- downstream work is triggered after upstream work completes
- better to run an empty Scoper than miss real items

AIOS version:

`Foundation extraction/synthesis -> Dev Intelligence Director -> Dev Build Scoper -> Build Portfolio/Sprint Master -> Steve approval/promotion -> build queue`

## What To Reject From The Old System

- dozens of always-on agents with overlapping responsibilities
- agents writing directly into backlog from weak source material
- folder reports as the only state
- Telegram/email noise from every scout
- undocumented magic prompts
- source/auth crawling without source packets
- hidden scheduler chains that are hard to supervise
- “skill file says it” treated as proof that runtime behavior works

## Current AIOS Cards Carrying This Forward

- `DEV-TEAM-INTELLIGENCE-DIRECTOR-001`
- `DEV-BUILD-OPPORTUNITY-SCOPER-001`
- `BUILD-PORTFOLIO-SCRUM-MASTER-001`
- `BUILD-OPPORTUNITY-PROMOTION-GATE-001`

## Design Rule

When rebuilding an old agent job, first ask:

1. Is this a deterministic contract?
2. Is this a source-backed report?
3. Is this a quality gate?
4. Is this a human approval boundary?
5. Is this truly an agent/runtime job?

Only the last one should become a real agent.

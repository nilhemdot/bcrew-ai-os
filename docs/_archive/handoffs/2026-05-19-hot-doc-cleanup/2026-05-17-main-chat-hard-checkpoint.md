# Main Chat Hard Checkpoint

Date: 2026-05-17
Status: checkpoint / backlog capture

## Why This Exists

Steve called out a real process failure: Codex said ideas were captured, but several immediate execution labels were not live backlog cards yet. This checkpoint maps the conversation into live backlog truth so the next builder is not working from fuzzy chat labels.

Rule reinforced: if an idea is build-worthy, create or map a live backlog card. A handoff alone is not enough.

## Immediate Foundation Queue

1. `FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001`
   - Fix brittle Foundation Hub full payload budget.
   - Dogfood: adding several rich backlog cards must not break verifier payload budget.

2. `SOURCE-CONTRACT-VALIDATION-LAYER-001`
   - Validate source ID, owner, brand/lane, auth posture, extraction posture, freshness, connector status, atom-flow expectation, blocked reason, and next action.
   - Dogfood: invalid/thin source contracts fail closed without auth-required extraction.

3. `EXTRACTION-RUNTIME-READINESS-001`
   - Prepare governed extractor queue, transcript/screenshot/evidence envelope, provider/cost posture, and proposal-only Research Inbox output.
   - No paid/auth-required extraction until Steve approves source access.

4. Continue critical-root splits only when a large, cohesive boundary exists.
   - Current roots after Phase 3: verifier ~4.9K, server ~3.9K, foundation-db ~4.7K, frontend ~3K.

5. `PARALLEL-BUILDER-WORKTREE-PROTOCOL-001`
   - Needed before broad multi-chat building becomes normal.
   - Reuse `PROCESS-WIP-PROTOCOL-001`, `MULTI-WORKER-DISPATCH-001`, and `DEV-001`.

## Runtime / Agent Infrastructure Captured

Live cards:

- `FOUNDATION-UP-CAPABILITY-REGISTRY-001`
  - Provider/tool capabilities like Fal, ElevenLabs, Canva, and terminal workers must be Foundation-up before any agent uses them.
  - Contract should include env refs, permission posture, cost policy, logs, callable path, owner, and proof.

- `HARLAN-TERMINAL-RUNTIME-001`
  - Governed terminal worker lane for Harlan.

- `FAL-IMAGE-ITERATION-TOOL-001`
  - Fal image edit/iteration path for Harlan after Foundation capability contract exists.

- `VOICE-RUNTIME-WIRING-001`
  - ElevenLabs/OpenAI voice runtime wiring after Foundation capability contract exists.

- `AIOS-RUNTIME-PORTABILITY-GATE-001`
  - Runtimes are adapters/workers. Foundation owns truth.

- `AIOS-GOAL-DRIVEN-RUNNER-EVAL-001`
  - Evaluate goal-runner contract so long-running builders stop only on measured done/pause conditions.

- `AIOS-CONTEXT-FIRST-AGENT-PREFLIGHT-001`
  - Agents must check Foundation/source truth before asking Steve business questions.

## Build Intel / Creator Sources Captured

Live cards:

- `BUILD-INTEL-CHASE-AI-RUNTIME-PORTABILITY-PACKET-001`
- `BUILD-INTEL-WATCHLIST-EVERYDAYAI-SCHOOL-001`
- `BUILD-INTEL-OPENHUMAN-RUNTIME-EVAL-001`
- `BUILD-INTEL-MARK-KASHEF-GOAL-PACKET-001`
- `BUILD-INTEL-WATCHLIST-MATT-POCOCK-001`
- `BUILD-INTEL-WATCHLIST-BITWISE-AI-001`
- `BUILD-INTEL-WATCHLIST-DREAM-LABS-AI-001`
- `BUILD-INTEL-WATCHLIST-NATE-HERK-001`
- `EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001`
- `BUILD-INTEL-KARPATHY-LLM-KB-PREFLIGHT-001`

Important boundaries:

- Do not install OpenHuman or connect broad OAuth from these cards.
- Do not trust creator claims without source-backed extraction and official-doc verification.
- Build Intel outputs must stay proposal-only until promoted through Research Inbox/backlog.

## Memory / Knowledge Base Captured

Live cards:

- `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`
- `KNOWLEDGE-BASE-QUALITY-GATE-001`
- `MEMORY-003`
- `MEMORY-004`

Working doctrine:

- Raw atoms are not enough.
- AIOS needs a compiled, source-backed knowledge layer that agents can query.
- Quality gates must enforce provenance, freshness, answer quality, and no stale founder-memory drift.

## Harlan Conversation Business Gold Captured

Already promoted through `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-harlan-conversation-deep-analysis.md` and related cards:

- `SOURCE-016`
- `MKT-003`
- `HUB-002`
- `CRM-RECRUIT-001`
- `SALES-006`
- `SALES-007`
- `SALES-008`
- `SALES-009`
- `FINANCE-004`
- `AGENT-ONBOARDING-FIRST-USE-LOOKUP-001`
- `AGENT-CONVERSATION-REVIEW-FEEDBACK-001`
- `AGENT-ROLE-ACCESS-BOUNDARIES-001`

Key doctrine preserved:

- Benson Crew = ATTRACT + RETAIN.
- Zahnd Team Ag = RETAIN only.
- MarketMasters feeds agent-attraction engine, not Steve personally.
- GROW = agent productivity/conversion owned by Sales Leadership.
- Lead complaints first check KPI benchmark, not default Marketing blame.
- Sales options tracker uses live company average as the moving strike price.
- Tool adoption/process compliance are separate from performance.

## Retention / Disengagement Captured

Live card:

- `RETENTION-DISENGAGEMENT-SIGNAL-MODEL-001`

Scope:

- Agent Feedback, culture surveys, NPS/review requests, and tool adoption can signal disengagement.
- After bounded attempts, nonresponse should create level 1/2 disengagement flags instead of endless retries.
- Retention dashboard, Georgia/owner notification, and follow-up tasks are required.
- V1 must be diagnostic/supportive, not punitive automation.

Existing related card:

- `RETAIN-002`

## Canva / Brand Asset Library Captured

Existing live cards:

- `CANVA-CLIENT-001`
- `CANVA-CLIENT-MARKETING-VIDEO-LAB-REVIEW-001`
- `MARKETING-BRAND-INGREDIENT-ASSET-LIBRARY-001`
- `CANVA-EDITABLE-OUTPUT-LOOP-001`

Working doctrine:

- Tanner can manage Marketing-owned brand/ingredient assets without direct Foundation access.
- Foundation owns the registry/source contract.
- Canva output loop is for editable team assets later, not current Foundation cleanup.

## Payload Budget Status

`FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001` shipped after this checkpoint was first drafted.

Closeout:

- `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-foundation-hub-payload-budget-v2-closeout.md`

Commit:

- `1a76288 Add Foundation Hub payload budget V2`

Proof from closeout:

- `process:foundation-hub-payload-budget-v2-check` passed.
- `backlog:hygiene` passed with 639 cards and 0 findings.
- `foundation:verify` passed 446/446.
- Full `process:foundation-ship` passed.
- Default `/api/foundation-hub`: 627,837 bytes with 22,163 bytes headroom under the V2 650KB budget.
- Full diagnostics route: 4,120,626 bytes under the 4.2MB budget.

## Next Builder Instruction

Start the next sprint from repo truth.

Next order:

1. `SOURCE-CONTRACT-VALIDATION-LAYER-001`
2. `EXTRACTION-RUNTIME-READINESS-001`
3. `PARALLEL-BUILDER-WORKTREE-PROTOCOL-001`
4. Meaningful critical-root split only if a large clean boundary is obvious.

Not next:

- Foundation UI polish.
- OpenHuman install.
- Fal/voice/Harlan feature work before `FOUNDATION-UP-CAPABILITY-REGISTRY-001`.
- Tiny line-count splits.
- Auth-required extraction.

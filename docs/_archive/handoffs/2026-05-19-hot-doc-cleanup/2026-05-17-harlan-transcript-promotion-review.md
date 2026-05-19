# Harlan Transcript Promotion Review

Date: 2026-05-17
Source evidence:
- Steve pasted the real Harlan exchange into the main Codex chat.
- `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-full-convo-steve-chat-reconstructed.md` preserves the broader reconstructed sequence.
- `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-agent-conversation-review-feedback-capture.md` preserves the first-use agent-friction pattern.
- Steve later pasted a fuller near-verbatim section that included the super-agent discussion and the raw-transcript/export failure. This review treats that later paste as the highest-fidelity evidence currently available, while still not pretending it is a native provider export.

This review promotes the durable decisions and backlog-worthy work. It does not treat Harlan's throwaway UI/image work as product truth.

## What Matters

### Agent behavior failure

Harlan asked Steve questions Foundation/strategy had already answered. The durable rule is:

- inspect Foundation/source truth first
- ask Steve one question at a time only after verifying the issue is unresolved
- use Strategy package, source notes, source contracts, and existing atoms before asking founder questions
- conversation reviews should catch "asked already-answered questions" and promote the fix into shared agent behavior

Harlan also failed on transcript expectations. It could see enough live chat context to respond, but did not have a raw provider/session transcript export tool. That difference must be explicit:

- visible conversational context is not the same as a raw exportable message log
- if an agent cannot produce an exact transcript, it should say so upfront
- it should offer the best available near-verbatim reconstruction immediately, preserving tone and turn order
- the system should expose a real export path if exact transcript capture is a product requirement

### Marketing source and brand-lane cleanup

The marketing scorecard model remains:

- awareness
- engagement
- leads
- remarketing

The source-contract layer is still weaker than the doctrine for GA4, Search Console, Google Business Profile, YouTube, and explicit remarketing audience sources.

Brand lanes must stay separate and then roll up to one master view:

- Benson Crew
- Zahnd Team Ag
- Steve Zahnd Everywhere
- MarketMasters
- future Unchained

Ambiguous integrations should be marked for lane review instead of being silently forced into the closest lane.

### Lane and engine doctrine clarified

- Benson Crew supports ATTRACT and RETAIN.
- Benson Crew agent attraction is ATTRACT.
- Benson Crew client lead generation/support for agents is RETAIN.
- Zahnd Team Ag is RETAIN only.
- Steve Zahnd Everywhere and future Unchained are Steve personal ATTRACT lanes.
- MarketMasters feeds the agent-attraction engine as recruiting/training trust, not Steve personally.
- GROW is agent productivity and conversion, owned by Sales Leadership.

RETAIN is not just lead generation. It is the feeling that the brokerage gives the agent an engine in the house: pride, proof, support, visibility, demand assistance, and market leverage.

### Recruiting hub rollup

Recruiting-side sources from MarketMasters, Steve Zahnd Everywhere, and Benson Crew should roll into a future Recruiting Hub. Steve is the allocator. Leads can be assigned to Scott, Steve, or another recruiter, and assistant-managed follow-through is required because not every recruiter will log in manually.

### Lead complaint diagnostic

When an agent says "the leads suck," the first diagnostic gate is live KPI conversion performance, not a default marketing blame.

Use the live company benchmark from KPI. The 16 percent lead-to-consult number was discussed as the current/example benchmark, not a hardcoded forever number.

If an agent is materially below company benchmark and complains about lead quality, the default diagnosis leans Sales Leadership, skill, script, or follow-up issue before Marketing.

Lead quality and conversion capability must stay separate.

### Sales options tracker

Sales Hub should eventually render per-metric benchmark trackers:

- company average as the moving strike price
- agents above and below the strike
- intervention priority by distance below strike, not just below/above
- bottom 3 to 5 performers grouped for metric-specific cohort training
- each metric has its own tracker because weakness in one stage does not mean weakness in every stage

Initial metrics:

1. lead to consult set
2. consult or appointment to signed client
3. signed client to firm deal
4. average commission rate
5. average sale price
6. average agent production

Add a second layer for:

- results
- tool adoption
- process compliance

The AI value is not a static dashboard. It is fast diagnosis: separate source problems from skill problems, identify cohorts, and suggest the right intervention.

### Finance doctrine from reconstructed transcript

The reconstructed transcript also preserved cash-protection doctrine:

- 3 months cash runway is the minimum healthy standard
- under 2 months triggers owner half pay
- at 1 month triggers owner no pay
- never fall below 1 month again
- Steve owns the trigger
- protect the minimum viable operating backbone first, not people generically

This should be promoted through the decision/doctrine pipeline with contradiction checks before becoming locked Foundation truth.

### Runtime and super-agent clarity

AIOS should remain the owner of business truth, source contracts, decisions, doctrine, routing, and hubs.

OpenClaw, Claude Code SDK, Codex, Higgsfield, Hermes, or other super-agent runtimes can be evaluated as execution/worker layers on top of AIOS. The risk is rebuilding low-level orchestration when a better runtime exists, not building the Benson Crew business-brain layer.

## Backlog Actions

Enrich existing cards:

- `AGENT-ONBOARDING-FIRST-USE-LOOKUP-001`
- `AGENT-CONVERSATION-REVIEW-FEEDBACK-001`
- `AGENT-ROLE-ACCESS-BOUNDARIES-001`
- `HARLAN-TERMINAL-RUNTIME-001`
- `MEMORY-003`
- `SOURCE-016`
- `MKT-003`
- `SALES-006`

Add missing cards if not already present:

- Sales options tracker and conversion benchmark surface
- Sales lead-complaint diagnostic rule
- Sales tool-adoption and process-compliance cohorts
- Recruiting Hub source-lane rollup and allocator model
- Finance cash-protection doctrine promotion

Do not promote:

- Harlan command-center throwaway UI as product truth
- avatar/image iterations as doctrine
- any secret values
- any broad Marketing or Sales feature sprint outside the hub/Foundation protocol

## Next Safe Move

After backlog enrichment, run backlog hygiene. Do not open a new sprint from this review automatically.

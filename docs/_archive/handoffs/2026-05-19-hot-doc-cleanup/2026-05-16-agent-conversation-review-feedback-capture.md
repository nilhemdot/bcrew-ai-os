# Agent Conversation Review + Feedback Capture

Date: 2026-05-16
Card: AGENT-CONVERSATION-REVIEW-FEEDBACK-001
Related cards:
- AGENT-ONBOARDING-FIRST-USE-LOOKUP-001

## Why This Exists

Steve is using the assistant before rolling agents out to other team members. That means first-use friction in this conversation is not a one-off annoyance; it is high-value Foundation Ops signal. The system should not let those lessons die in chat. Each agent should review its conversations, identify bottlenecks or choke points, and route a feedback report into system truth so future agents inherit the improvement.

## Core Lesson

The right pattern is:

- chat
- review
- feedback
- system improvement

Agents should not only answer requests. They should also examine where the interaction broke down, what lookup should have happened faster, what source path was proven, what doctrine/tooling/playbook was missing, and what should be promoted into backlog or operating doctrine.

## What Steve Explicitly Wants

- every agent should perform a conversation review
- the review should detect friction, bottlenecks, and missed opportunities
- the agent should send a feedback report into the system
- the system should use that report to self-improve
- upgrades should cascade upward, not stay local to one agent/chat
- role-specific access boundaries still matter
- the process should help new agents avoid the same growing pains Steve experienced on first use

## Rich Context From This Conversation

### Proven live-source facts

- Google JWT delegated access works live in this environment
- the assistant can read live Google Sheets / Owners Dashboard directly
- the live finance lookup path was proven:
  - workbook: Owners Dashboard `18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk`
  - tab: `Cashflow Dash`
  - sheet date: `C2`
  - Steve TD card balance: `F20`
  - adjacent fields exist for card `Limit` and `Remaining Balance`
- the deeper source mapping was also proven:
  - `(Input) Weekly Actuals` row `153` = TD/VISA charges
  - `(Input) Weekly Actuals` row `154` = TD/VISA payments

### Friction / choke point that triggered this card

The assistant initially behaved as if the problem was missing context or insufficient access, when in reality:

- the documentation already described how to crawl the finance source
- the live Google delegate access already existed
- the repo already had the read path and helper code
- the correct behavior should have been: hear the question, inspect the live source, answer, then only report a blocker if the lookup truly failed

### Behavior lesson

The assistant should default to:

- inspect live source first when source notes or docs map the path
- treat documentation as an executable map
- do the lookup before saying "I can't find it"
- avoid pushing work back to Steve when the system already has the access and tools

### System lesson

Future agents need:

- a shared onboarding layer
- top repeated lookup playbooks
- conversation review and feedback routing
- role-specific access boundaries
- backlog/doctrine promotion so lessons cascade upward

## What A Good Daily Review Loop Should Capture

### Conversation report

- what Steve asked
- what was answered
- which live source paths were proven
- where friction happened
- whether the agent pushed work back unnecessarily
- what lookup took too long

### Feedback report

Split into two lanes:

1. **agent behavior feedback**
   - reply was too passive
   - agent failed to inspect a known source
   - agent asked Steve to do something the agent could do
   - memory/doctrine should be upgraded

2. **system / backlog feedback**
   - missing helper or lookup tool
   - missing source playbook
   - missing role/access boundary model
   - missing automation for recurring review/reporting
   - real backlog card needed

## Suggested Shape For The Future Build

A minimal v1 could:

- run once daily per agent or owner context
- scan that day’s conversation
- extract bottlenecks, proven source paths, and upgrade ideas
- write durable notes
- create or enrich backlog cards when the lesson implies real build work
- keep the output tight but rich enough that Codex can act without rereading the whole chat

## Guardrails

- do not grant every agent the same data access
- preserve role-specific visibility and permission boundaries
- do not let the review loop create noisy backlog spam
- prefer enrich-existing-card over duplicate-card behavior when the theme already exists
- if the issue is only local behavior, promote doctrine instead of forcing a build card

## Senior-Engineer Read

This is a Foundation Ops self-improvement pattern, not a vanity journaling feature. The system already captures chat, memory, backlog, and source truth. What is missing is a disciplined daily bridge that converts interaction friction into governed upgrades. If built well, this reduces first-use agent stumble, strengthens onboarding, and improves every downstream assistant without re-training Steve on the same gaps.

## 2026-05-17 Addendum: Harlan Transcript And Doctrine Retrieval Failure

Steve later provided the real Harlan exchange plus a reconstructed full-session handoff at `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-full-convo-steve-chat-reconstructed.md`.

Additional failure patterns:

- Harlan asked Steve questions that Foundation/strategy doctrine had already answered, especially around ATTRACT, RETAIN, GROW, FUB lead-source truth, and brand lanes.
- Harlan asked too broadly instead of asking one concise unresolved question at a time.
- Harlan blurred visible conversation context with raw transcript-export capability.
- When Steve asked for the exact full conversation, Harlan did not immediately state the real boundary: it could reason over visible chat context but did not have a raw provider/session transcript export tool.

New agent behavior rule:

- before asking Steve, inspect Foundation/source truth first
- if exact raw transcript export is unavailable, say that upfront
- offer the best available near-verbatim reconstruction immediately
- label the output honestly as raw export, reconstructed transcript, summary, or doctrine extraction
- route the failure into shared agent feedback so the next assistant does not repeat it

Backlog follow-through was captured in `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-harlan-transcript-promotion-review.md` and live backlog cards for agent onboarding, conversation review, conversation scanner, full-conversation archive, Harlan terminal runtime, marketing lane/source cleanup, Sales options tracker, finance doctrine promotion, and external super-agent runtime evaluation.

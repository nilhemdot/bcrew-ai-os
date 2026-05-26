# 2026-05-25 Multi-Day Conversation Review Checkpoint

Status: Active checkpoint  
Owner: Foundation / Steve / Codex  
Scope: conversation review from the last several days of Dev Data Pool, UI,
God Mode extraction, source strategy, Brain Fleet, and overnight planning.

## Why This Exists

Steve asked for a real checkpoint before more work.

The failure mode to avoid is simple: we talk through important ideas, then the
next builder only sees fragments in chat and starts building the wrong thing.
This document promotes the useful parts into repo truth and live backlog cards.

This is not a tiny overnight handoff. It is the recovery point for the whole
conversation.

## The Core Mission

Plain English:

1. Foundation is the shared truth/data pool.
2. Source connectors and extractors feed Foundation first.
3. Hubs do not build their own hidden data systems. They read the slice of
   Foundation truth that matters to that hub.
4. The Dev hub is proving the pattern first: source data comes into Foundation,
   Dev sees the system-building slice, and the Dev Intelligence Director turns
   that into proposed build work.
5. Nothing private, paid, strategic, or backlog-changing moves without the right
   approval.
6. The UI must be consistent enough that every future hub feels like one system,
   not another AI-generated one-off page.

The operating map:

```text
approved source
  -> Foundation connector/extractor
  -> artifacts, atoms, evidence, reports, approval items
  -> hub-specific Intelligence Director
  -> proposed candidates
  -> Scoper / Promotion Gate
  -> approved backlog card or action
```

The extractor works for Foundation, not for one hub. The Dev page is the Dev
view of the shared Foundation pool.

## What Steve Actually Wants Built

The bigger vision is an AI operating system for Benson Crew first, then for the
realtors/agents and leadership workflows around the business.

It should:

- keep strategy live, source-backed, visible, and enforceable;
- ingest reality from systems like YouTube, Skool, MyICOR, meetings, email,
  Slack/comms, KPI systems, agent feedback, and training sources;
- turn that raw reality into useful intelligence;
- help Steve recruit, lead, and build high-ticket systems while AI handles more
  of the operating load;
- eventually give staff, leadership, and agents proactive assistants that help
  them drive their goals, onboarding, coaching, content, and business execution;
- preserve human approval for strategy, private-source access, and anything
  that changes work or external systems.

This is why the data pool, extractor, synthesis/router, Directors, Scoper, and
Brain Fleet matter so much. They are not side features. They are the operating
spine.

## Chronological Review

### 1. Hub Launcher Stats And Foundation Confusion

The launcher originally showed a mix of real and unsupported stats. That caused
the right question: if all assumptions live in Foundation, why is the launcher
getting bespoke data links and questionable values?

Decision:

- launcher stats can come back later;
- unsupported stats should show `Needs source` or be removed;
- the launcher is allowed to be "good enough" for now;
- the sprint is not about perfect launcher KPIs. The sprint is about proving
  the source -> Foundation pool -> hub consumption pattern.

Current state:

- launcher station cards have now been visually aligned with the locked card
  system;
- the live values still must be source-backed or clearly marked as missing.

### 2. Sprint Mission

The mission was clarified several times:

- prove Foundation is the pool;
- prove sources feed the pool;
- prove Dev consumes the relevant slice;
- build one source at a time, one hub at a time;
- do not invent a separate Dev data silo.

Current proof surface:

- `/api/foundation/dev-team-hub`
- `/dev`

The Dev page exists to prove data is flowing, not to become the entire Dev
backlog/sprint/workflow system in one pass.

### 3. Dev Page Reset

The first Dev page was backend proof, not real UX. It had too many report-like
sections, anchor scrolling, and weak information architecture.

Steve pushed it back to one simple page:

- one menu item for now: `Data Pool`;
- show what Dev is reading from Foundation;
- show extraction systems and evidence in plain English;
- show the Dev Intelligence Director output;
- link the old workflow map as reference, not as the main UI.

Current state:

- `/dev` is a read-only Dev Data Pool page;
- it is not the full Dev Sprint page;
- it is not the full Dev backlog;
- it is not the old neural workflow visual rebuilt as a page.

### 4. Old Dev System Lessons

The old system had a useful concept:

```text
research scouts / source monitors
  -> intelligence director
  -> recommendations
  -> scoping
  -> backlog / build queue
  -> builder
  -> review
  -> ship
```

The problem was execution reliability, too much noise, and agents breaking.

Decision:

- keep the useful operating model;
- rebuild it with Foundation as the shared pool;
- use deterministic code and governed model routes where possible;
- do not recreate an uncontrolled swarm.

### 5. Source Model

Steve struggled with whether sources should be hub-specific or Foundation-wide.

Decision:

- source extraction is Foundation-owned;
- hubs pull filtered slices;
- source-type cards come first, target/creator cards live inside them.

Example:

- Source type: YouTube
- Target inside YouTube: Mark Kashef, Kia Ghasem, Matt Pocock, etc.
- Source type: Skool paid
- Target inside Skool: Mark community, Kia community, etc.

This prevents duplicate email/slack/YouTube extractors per hub.

### 6. UI And Design Lock

The Dev page design went through several failed passes:

- too many cards;
- inconsistent topbar;
- clipped text;
- misaligned cards;
- random pill styles;
- old and new design language mixed together.

The final direction was locked from:

- hub launcher v9 as the north star;
- strategy/sales blue-pill headers;
- Dev Data Pool final pass;
- launcher station card alignment pass.

Design decisions now captured in `docs/specs/bcrew-ui-design-contract.md`:

- shared topbar;
- first content band white, then alternating grey/white bands where useful;
- blue hero pill without extra glow bleed;
- left-accent cards for repeated hub work/proof items;
- plain-English copy;
- no database/report jargon in operator UI;
- no chunky status pills on repeated station cards;
- aligned card footers and equal card heights;
- mascot/cutout images should use real transparency and not be over-trimmed or
  haloed.

Current state:

- `/dev` is the hub-page proof;
- hub launcher station cards were aligned;
- logout exists in the launcher user menu for demo flow;
- the login/launcher avatar still needs image asset cleanup if the current file
  has halo/blue-edge artifacts.

### 7. God Mode Extractor

There was a major misunderstanding around "watching videos."

Steve's requirement:

- not screenshot-only;
- not transcript-only;
- God Mode means read, hear, see, and eventually navigate approved links like a
  human, but more consistently.

Current accepted truth:

- public YouTube full-watch route is Gemini API video/audio/visual;
- Gemini Workspace/browser subscription route may work for bounded prompts but
  is not accepted as the reliable full-watch route;
- if the subscription route cannot watch YouTube videos reliably, use the API;
- API cost is acceptable if the knowledge value is high;
- speed mode is not always better for overnight work if it burns more tokens for
  marginal time savings.

The "God Mode" definition:

```text
eyes: visual frames / screen / video understanding
ears: audio and transcript understanding
hands: approved browsing/navigation/link/resource following
brain: synthesis, dedupe, evidence, ranking, and routing
```

Current gap:

- God Mode works as internal pipeline pieces;
- it is not yet a polished reusable product/service;
- private/paid app navigation needs source packets and auth boundaries.

### 8. Creator And Source Watchlist

Steve supplied and expanded the Build Intel watchlist.

Key targets mentioned:

- Mark Kashef
- ICOR / Tom
- Nate Herk
- Chase AI
- Dan Martell
- Nick Saraev
- Paul J Lipsky
- Nick Milo / Linking Your Thinking
- Mansel Scheffel
- AI News & Strategy Daily
- Ray Amjad
- Alex Finn
- Jono Catliff
- Chris Bradley
- Ambitious AI
- Brad Bonanno
- Creator Magic
- Stacked Podcast
- Zane Cole
- JP Middleton
- Next Gen AI
- Eric Siu
- Simon Scrapes
- Neil Patel
- Russell Brunson
- Alex Hormozi
- Arsh Sanwarwala / ThrillX
- Kia Ghasem / AI Automations
- Matt Pocock
- David Ondrej
- Austin Marchese
- Brock Mesarich
- Dream Labs AI
- Jack / Itssssss_Jack

Rule:

- watchlist membership is not the same as full extraction;
- public metadata watch can be broad;
- full God Mode extraction should be guarded and value-driven;
- Mark is the current S-tier proof source by Steve judgment.

### 9. Mark Kashef Baseline

Current sprint card:

- `MARK-KASHEF-LAST-50-BASELINE-001`

Purpose:

- finish a guarded public YouTube full-watch baseline for Mark before blasting
  many sources.

Current output:

- multiple Mark batches have run;
- batches produce build candidates, visual evidence, and approval-required
  links;
- Dev Intelligence Director ranks the output.

Important:

- not every watched video becomes a recommendation;
- Director recommendations are proposal-only;
- no backlog card is auto-created from extraction.
- one Mark batch had already started before this checkpoint reset and completed
  at `2026-05-25T02:33:43Z`; its source note is a worktree change and should be
  reviewed/resynthesized before any more extraction is launched.

### 10. Dev Intelligence Director

The Director reads the Dev slice of the Foundation pool and ranks ideas against
the AIOS mission.

Current Director role:

- rank what matters for building the AIOS;
- separate "ready to build" from "next";
- keep evidence/source trail;
- produce Steve-reviewable recommendations.

The Director is not the builder and not the scoper.

Correct flow:

```text
Director recommends
  -> Scoper turns a promising recommendation into an evidence-backed build brief
  -> Promotion Gate creates or updates a proposal/backlog candidate
  -> Steve approves priority/promotion into queue or sprint
  -> Builder executes only approved queued/sprint work
```

Steve should not be asked to approve a vague recommendation. The approval point
is after enough scoping exists to judge quality, risk, expected value, source
evidence, and build path. Separate source-access approvals still happen before
private, paid, auth-required, or external-link extraction.

Existing cards:

- `BUILD-OPPORTUNITY-PROMOTION-GATE-001`
- `INTEL-SCOPER-001`

### 11. Synthesis / Router / Brain Layer

Steve called out that the synthesis/router layer is critical. If this layer is
weak, more extraction only creates more noise.

Current truth:

- the route posture was upgraded;
- OpenClaw is blocked for core Foundation intelligence;
- best approved brain routes should be used for synthesis/deep audit/text
  extraction;
- Gemini API is used for video eyes;
- the UI for controlling/viewing all of this is not built yet.

Existing card:

- `SYSTEM-014` - Brain Fleet / System Control surface

New card created from this checkpoint:

- `INTELLIGENCE-SPINE-QUALITY-EVAL-001`

Why the new card exists:

- before broad scaling, we need a quality harness that tests the same inputs
  against the upgraded synthesis/router/Director stack and produces a
  Steve-reviewable before/after quality report.

### 12. Brain Fleet / Model Routing

Steve wants model/provider/effort to be adjustable from one governed place.

Current CLI:

- `npm run llm:route -- --show --json`
- `npm run llm:route -- --profile=overnight --apply --json`

Current accepted route posture:

- OpenClaw is not used for core intelligence;
- core synthesis/deep-audit/text routes should use the strongest approved
  provider/model/effort configuration;
- Gemini API handles video/audio/visual route;
- subscription/native routes may become internal capacity lanes only when
  reliable, observable, policy-classified, and approved.

Current gap:

- no Foundation page yet shows every model-powered package/tool, route, effort,
  and switch path.

Card:

- `SYSTEM-014`

### 13. Skool / MyICOR / Paid Sources

Steve wants Mark's Skool, Kia's Skool/community, MyICOR, and paid courses to
feed the system eventually.

Decision:

- no broad private/paid crawl overnight;
- start with one approved lesson/source packet;
- credentials stay in vault/session systems, not in docs or chat;
- extractor jobs need auth-needed escalation and stop controls.

Existing cards:

- `SKOOL-WORKER-001`
- `SKOOL-LIVE-NAVIGATION-PROOF-002`
- `SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001`
- `MYICRO-TRAINING-001`
- `MYICOR-LIVE-NAVIGATION-PROOF-002`
- `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`

### 14. Credential / Browser / Subscription Reality

Steve tested storing Gemini credentials in the macOS Keychain.

Decision:

- use a credentials vault/session boundary;
- never print secrets into docs;
- do not rely on this chat as a password store;
- browser sign-in can be persisted only through the right profile/session;
- Gemini app subscription route is not equivalent to a stable Gemini video API
  route for automated full-watch extraction.

### 15. Cursor / Harness Discussion

The David Ondrej extraction led to a discussion about Cursor, Codex, Claude
Code, OpenClaw, and "harnesses."

Decision:

- Codex/Claude Code/Cursor/OpenClaw are harness/runtime layers;
- BCrew AIOS is the repo/system/truth layer plus runtime/router/adapters;
- Steve does not need to switch to Cursor now;
- if Cursor is tested later, it must follow the same Foundation docs, design
  contract, backlog, and route rules.

### 16. Source Value Ranking

Steve wants to know which sources actually produce value.

Decision:

- source grades can exist, but only when tied to real extracted value;
- do not show fake S/A/B grades;
- source family grade should roll up from useful findings, accepted
  recommendations, promoted cards, and shipped value.

Existing card:

- `BUILD-INTEL-SOURCE-VALUE-LEADERBOARD-001-001`

## What Is Built

- Dev Data Pool V0 read-only page.
- `/api/foundation/dev-team-hub`.
- Dev Intelligence Director V0.
- UI design contract v3.
- Hub launcher station card alignment.
- Shared launcher/Dev topbar behavior.
- Logout path from launcher user menu.
- LLM route control CLI.
- Intelligence Spine route posture blocking OpenClaw for core intelligence.
- Gemini API public YouTube full-watch route.
- Mark public YouTube baseline in progress.
- Source cards for Skool/MyICOR next steps.

## What Is Not Built

- Full Mark last-50 baseline is not completely closed.
- Broader non-Mark YouTube latest-20 scale-up has not run.
- Synthesis/router/Director quality evaluation harness is not built.
- Brain Fleet/System Control UI is not built.
- Build Opportunity Promotion Gate is not built.
- Source Value Leaderboard is not built.
- Skool/MyICOR live extraction has not been approved/run.
- God Mode Extractor product architecture is not written.
- Dev page is not the full Dev sprint/backlog/recent-work system.
- Full app visual refactor is not done; the locked style now exists, but older
  pages may still drift.
- Protected push remains blocked unless the Foundation ship path is run.

## Live Card Map

| Conversation item | Status | Card / doc |
| --- | --- | --- |
| Mark public YouTube baseline | Active current work | `MARK-KASHEF-LAST-50-BASELINE-001` |
| Broader public YouTube last-20 run | Scoped, not started | `YOUTUBE-LATEST-20-INTEL-RUN-001` |
| Brain/model/effort control page | Scoped | `SYSTEM-014` |
| Hub launcher station card style | Implemented V1, card still scoped | `SYSTEM-015` |
| Director candidate approval into backlog | Scoped | `BUILD-OPPORTUNITY-PROMOTION-GATE-001` |
| Scoper backend pattern | Done V1 | `INTEL-SCOPER-001` |
| Skool live navigation proof | Scoped, approval-bound | `SKOOL-LIVE-NAVIGATION-PROOF-002` |
| Skool one-lesson extraction | Scoped, approval-bound | `SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001` |
| MyICOR live navigation proof | Scoped, approval-bound | `MYICOR-LIVE-NAVIGATION-PROOF-002` |
| MyICOR one-lesson extraction | Scoped, approval-bound | `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001` |
| Source/creator value leaderboard | Scoped, later | `BUILD-INTEL-SOURCE-VALUE-LEADERBOARD-001-001` |
| Synthesis/router/Director quality gate | Newly carded | `INTELLIGENCE-SPINE-QUALITY-EVAL-001` |
| Reusable/sellable God Mode Extractor architecture | Newly carded | `GOD-MODE-EXTRACTOR-PRODUCT-ARCHITECTURE-001` |
| Dev Data Pool page model | Active design/source doc | `docs/specs/dev-research-targets-page-concept.md` |
| UI design philosophy | Active design contract | `docs/specs/bcrew-ui-design-contract.md` |

## New Cards Created By This Checkpoint

### `INTELLIGENCE-SPINE-QUALITY-EVAL-001`

Purpose:

- evaluate the synthesis/router/Director stack before scaling extraction.

Why:

- extraction volume is not progress if the brain layer is weak.

Next action:

- run same-input quality comparisons across videos, meeting notes, and internal
  signal samples; produce a Steve-readable report showing whether candidate
  quality, dedupe, routing, evidence, and ranking improved.

### `GOD-MODE-EXTRACTOR-PRODUCT-ARCHITECTURE-001`

Purpose:

- define how the internal extractor becomes a reusable architecture and
  possible product.

Why:

- Steve sees this as a valuable standalone capability for videos, courses,
  trainings, communities, research, content, and agent tooling.

Next action:

- write the architecture after Mark baseline and spine-quality proof, including
  source approvals, eyes/ears/hands/brain layers, output packets, pricing/value
  boundaries, and proof harness.

## Correct Next Sequence

Do not jump straight to "watch everything."

### Step 1 - Finish This Checkpoint

Done when this file exists, the two missing cards are live, and the next plan is
clear.

### Step 2 - Run/finish the quality gate

Next real card should be:

- `INTELLIGENCE-SPINE-QUALITY-EVAL-001`

Reason:

- Steve explicitly called out that the synthesis/router/Director layer must be
  exceptional before scaling more extraction.

### Step 3 - Continue Mark baseline if quality gate is acceptable

Continue:

- `MARK-KASHEF-LAST-50-BASELINE-001`

Run only guarded public YouTube batches. After each healthy batch, refresh the
Director and Dev Hub proof.

### Step 4 - Morning review

Review:

- what Mark videos were processed;
- what Director recommendations changed;
- what the top 5 proposed builds are;
- what needs approval;
- whether one item should go to Scoper.

### Step 5 - Choose one next expansion

Pick one:

- `SYSTEM-014` Brain Fleet/System Control UI;
- `BUILD-OPPORTUNITY-PROMOTION-GATE-001`;
- one Scoper pass on the top Director recommendation;
- `YOUTUBE-LATEST-20-INTEL-RUN-001` after Mark quality is accepted;
- one source packet for Skool/MyICOR.

## Overnight Plan Options

### Conservative Plan

Use this if Steve wants confidence over volume:

1. Run `INTELLIGENCE-SPINE-QUALITY-EVAL-001`.
2. Produce a morning quality report.
3. Do not run more extraction until the brain layer passes.

### Balanced Plan

Use this if Steve wants progress and quality:

1. Run the quality evaluation first.
2. If it passes, run one guarded Mark batch.
3. Refresh Director and Dev Hub checks.
4. Stop and leave morning handoff.

### Aggressive Plan

Use only with explicit approval:

1. Run quality evaluation.
2. Continue Mark batches sequentially while all proofs pass.
3. Stop on quota, rate-limit, failed proof, private/auth boundary, or final
   remainder guard.
4. Do not start Skool/MyICOR or broad non-Mark extraction.

## Stop Conditions

Stop instead of pushing forward if:

- any proof fails;
- Gemini quota/rate limits hit;
- a source requires auth/private/paid access and no source packet approval is
  attached;
- Director output quality gets noisy or generic;
- extraction starts producing volume without actionable candidates;
- live DB/source proof and UI claims disagree.

## Push / Repo Status Note

Several commits are local and not pushed because the protected Foundation
pre-push ship gate blocks normal push until the approved Foundation ship path is
run.

Do not bypass that silently. If Steve wants a push, run the appropriate
Foundation ship command or get explicit bypass approval.

## Checkpoint Verification

Completed during this checkpoint pass:

- `INTELLIGENCE-SPINE-QUALITY-EVAL-001` created in the live backlog.
- `GOD-MODE-EXTRACTOR-PRODUCT-ARCHITECTURE-001` created in the live backlog.
- `SYSTEM-015`, `MARK-KASHEF-LAST-50-BASELINE-001`, and
  `INTELLIGENCE-SPINE-QUALITY-EVAL-001` were updated with explicit
  scope/proof language.
- `MARK-KASHEF-LAST-50-BASELINE-001` was also updated to note the
  `2026-05-25T02:33:43Z` Mark batch that completed before the checkpoint reset.
- `npm run backlog:hygiene` returned healthy with 0 findings.

## Final Plain-English Checkpoint

We are not starting over.

The system direction is right:

- Foundation pool first;
- Dev reads the Dev slice;
- extractor creates evidence;
- Director recommends;
- Scoper/promoter turns approved ideas into build work;
- Brain Fleet controls model routes;
- UI design contract prevents visual drift.

The next mistake to avoid is scaling extraction before proving the brain layer
is good enough. The next right checkpoint card is the intelligence-spine quality
evaluation, then continue Mark public YouTube baseline if the quality report is
solid.

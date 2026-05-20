# Agent Inventory

Generated artifact. Do not hand-edit agent truth here; regenerate through `process:pillar-5-agent-inventory-check`.

Generated at: 2026-05-20T00:42:09.140Z
Card: PILLAR-5-AGENT-INVENTORY-001
Closeout: pillar-5-agent-inventory-v1

## Summary

- Current registry agents: 2
- Current declared capabilities: 2
- Old-system agent evidence rows: 90
- Old-system harvested skills: 121
- Governed Foundation jobs: 40
- Runtime-approved agents by this card: 0

## Boundaries

- Current Foundation agents remain declared/guarded until a runtime card approves operation.
- Old-system agents are evidence only; old WORKING status is not current runtime truth.
- Old code, prompts, private profiles, chat IDs, emails, tokens, and raw memories are not imported.
- Scheduled jobs are inventoried as governed runtime definitions, not launched by this card.

## Current Foundation Agents

| Agent | Status | Role | Owner | Capabilities | Next Action |
| --- | --- | --- | --- | --- | --- |
| Harlan | planned_guarded | personal-operator-assistant | Steve / Foundation | foundation-status-read | Stay guarded until an explicit runtime card approves live agent operation. |
| Crewbert | planned_guarded | foundation-system-orchestrator | Foundation | repo-status-read | Stay guarded until an explicit runtime card approves live agent operation. |

## Old-System Agent Evidence

| Agent | Old Status | Honest Status | Role | Owner | Teams |
| --- | --- | --- | --- | --- | --- |
| Crewbert | WORKING | legacy_claim_working_evidence_only | Director of Strategic Intelligence | System | core |
| Ace | WORKING | legacy_claim_working_evidence_only | Executive Assistant | Steve | core |
| Nick's Assistant | WORKING | legacy_claim_working_evidence_only | Sales Leadership Support | Nick | assistants |
| Carson's Assistant | WORKING | legacy_claim_working_evidence_only | Operations Support | Carson | assistants |
| Tanner's Assistant | WORKING | legacy_claim_working_evidence_only | Marketing Support | Tanner | assistants |
| Georgia's Assistant | DEGRADED | legacy_degraded_evidence_only | Retention Support | Georgia | assistants |
| Sprint Master | WORKING | legacy_claim_working_evidence_only | Sprint Planning + Backlog Prioritization | System | dev-product |
| Head of Code | WORKING | legacy_claim_working_evidence_only | Autonomous Code Execution | System | dev-product |
| Plan Critic | WORKING | legacy_claim_working_evidence_only | Automated Plan Quality Gate | System | dev-product |
| QA Reviewer | WORKING | legacy_claim_working_evidence_only | Automated Quality Assurance | System | dev-product |
| Review Loop | WORKING | legacy_claim_working_evidence_only | Feedback Router + Revision Coordinator | System | dev-product |
| Agent Roster | WORKING | legacy_claim_working_evidence_only | Agent Roster Health Check | System | dev-product |
| Master Director of Intelligence | WORKING | legacy_claim_working_evidence_only | Cross-department intelligence synthesis + pattern spotting | System | intelligence |
| Course Scout | WORKING | legacy_claim_working_evidence_only | Course Extraction + Coaching Call Processing | System | intelligence |
| External Scout | WORKING | legacy_claim_working_evidence_only | YouTube, Skool & Community Intelligence | System | intelligence |
| Platform Intel | WORKING | legacy_claim_working_evidence_only | Platform & AI Research Intelligence | System | intelligence |
| Content Intelligence | WORKING | legacy_claim_working_evidence_only | Marketing Intelligence + Brand Execution Tracking | System | marketing |
| Content Writer | WORKING | legacy_claim_working_evidence_only | Automated Content Generation | System | marketing |
| Scheduler | DEGRADED | legacy_degraded_evidence_only | Automated Social Posting | System | marketing |
| Brand Guardian | WORKING | legacy_claim_working_evidence_only | Brand Compliance Gate | System | marketing |
| Production Monitor | WORKING | legacy_claim_working_evidence_only | $13K/Agent Tracking + Production Intelligence | System | sales |
| Deal Analyst | WORKING | legacy_claim_working_evidence_only | Deal Flow Analysis + Pipeline Health | System | sales |
| Coaching Intelligence | WORKING | legacy_claim_working_evidence_only | Training Effectiveness + Performance Coaching | System | sales |
| Onboarding Monitor | WORKING | legacy_claim_working_evidence_only | Onboarding Pipeline Tracking + Ops Health | System | operations |
| Process Enforcer | WORKING | legacy_claim_working_evidence_only | SOP Compliance + Task Enforcement | System | operations |
| Ops Dashboards | PLANNED | planned_evidence_only | Operations Metrics + Pipeline Visualization | System | operations |
| Meeting Classifier | WORKING | legacy_claim_working_evidence_only | Meeting Note Classification (SAFE/RESTRICTED) | System | strategy |
| Meeting Analyst | PLANNED | planned_evidence_only | Meeting Intelligence + Action Item Extraction | System | future |
| Scoreboard Agent | WORKING | legacy_claim_working_evidence_only | Production Dashboards + Leaderboards | System | sales |
| Missive Agent | WORKING | legacy_claim_working_evidence_only | Inbox Triage + Client Routing | System | strategy |
| Email Intelligence | WORKING | legacy_claim_working_evidence_only | Email Signal Extraction + Decision Tracking | System | strategy |
| Ops Signal Monitor | WORKING | legacy_claim_working_evidence_only | Operational Signal Detection + System Health | System | strategy |
| Deep Research | PLANNED | planned_evidence_only | Market Research + Competitive Intel | System | future |
| Front-End Developer | WORKING | legacy_claim_working_evidence_only | Web Interface Builder | System | dev-product, marketing |
| UI/UX Specialist | WORKING | legacy_claim_working_evidence_only | Interface Review + Design Quality Gate | System | dev-product, marketing |
| Visual Designer | WORKING | legacy_claim_working_evidence_only | Design Mockups + Layout Creation | System | dev-product, marketing |
| Org Design | PLANNED | planned_evidence_only | Team Structure + KPI Cascade Design | System | core |
| Backlog Monitor | WORKING | legacy_claim_working_evidence_only | Backlog Health Auditing | System | dev-product |
| Brand Sync | WORKING | legacy_claim_working_evidence_only | Brand Guidelines Sync from Google Drive | System | marketing |
| Email Rules | WORKING | legacy_claim_working_evidence_only | Email Routing + Approval Gate | System | strategy |
| EOD Wrap | WORKING | legacy_claim_working_evidence_only | End-of-Day Summary + Tomorrow Preview | Steve | core |
| Executive Brief | WORKING | legacy_claim_working_evidence_only | Daily Executive Action Brief | System | core |
| Feedback Triage | GHOST | legacy_unknown_evidence_only | Feedback Queue Classification + Routing | System | feedback |
| Full Report | WORKING | legacy_claim_working_evidence_only | Complete System Export | Steve | core |
| Meeting Filer | WORKING | legacy_claim_working_evidence_only | Orphaned Meeting Notes Auto-Filing | System | strategy |
| Meeting Prep | WORKING | legacy_claim_working_evidence_only | Daily Meeting Context Prep | System | strategy |
| Memory Audit | WORKING | legacy_claim_working_evidence_only | Conversation Memory Gap Detection | System | core |
| Memory Review | WORKING | legacy_claim_working_evidence_only | Monthly Memory Rebuild + Archive | System | core |
| Memory Writer | WORKING | legacy_claim_working_evidence_only | Structured Memory Logging | System | core |
| Midday Pulse | WORKING | legacy_claim_working_evidence_only | Lightweight Mid-Day Status Check | Steve | core |
| Strategic Work | WORKING | legacy_claim_working_evidence_only | Structured Strategic Analysis Sessions | System | core |
| Strategy OS | WORKING | legacy_claim_working_evidence_only | Strategy Operating System + Priority Access | System | core |
| Tracking Steve | WORKING | legacy_claim_working_evidence_only | Steve's Commitment Tracker | Steve | core |
| Skill Improver | WORKING | legacy_claim_working_evidence_only | Self-improving SKILL.md pipeline (DEV-029) | System | dev-product |
| Marketing Platform Scout | WORKING | legacy_claim_working_evidence_only | Monitor algorithm changes, features, and tactics across Instagram, Facebook, LinkedIn, X, YouTube, SEO, Google Business Profile, AI Search, Email, and CRO | System | marketing |
| Marketing Industry Scout | WORKING | legacy_claim_working_evidence_only | Real estate competitor monitoring, CRO benchmarks, industry content trends, and vertical-specific marketing intelligence | System | marketing |
| Marketing Director of Intelligence | WORKING | legacy_claim_working_evidence_only | Synthesizes marketing platform and industry scout reports into actionable briefs, scores findings, auto-adds high-scoring items to backlog | System | marketing |
| Marketing Sprint Master | WORKING | legacy_claim_working_evidence_only | Marketing content sprint planning and daily content prioritization | System | marketing |
| Campaign Planner | WORKING | legacy_claim_working_evidence_only | 30-day content calendars, email sequences, multi-platform campaign design | System | marketing |
| Graphic Designer | WORKING | legacy_claim_working_evidence_only | Visual content creation: carousels, infographics, social graphics | System | marketing |
| Content Repurposer | WORKING | legacy_claim_working_evidence_only | Adapts source content to 5+ platform-specific versions | System | marketing |
| Content Editor | WORKING | legacy_claim_working_evidence_only | Editorial quality gate between content creation and brand review | System | marketing |
| SEO Strategist | WORKING | legacy_claim_working_evidence_only | Keyword research, programmatic SEO page generation, site audit | System | marketing |
| CRO Analyst | WORKING | legacy_claim_working_evidence_only | Conversion rate optimization for landing pages, email funnels, CTAs | System | marketing |
| Marketing Ecosystem Scout | WORKING | legacy_claim_working_evidence_only | Monitors how the best marketing teams use AI for content, videos, workflows, and new tools. Feeds daily intelligence to improve BCrew marketing team capabilities. | System | marketing |
| Top Agent Social Scout | WORKING | legacy_claim_working_evidence_only | Watches top-performing real estate agents on social media to extract content patterns, hooks, and strategies | System | marketing |
| Viral Trends Scout | WORKING | legacy_claim_working_evidence_only | Scans trending formats, hooks, audio, and topics across all platforms for time-sensitive content opportunities | System | marketing |
| Lead Gen Research Scout | WORKING | legacy_claim_working_evidence_only | Researches what homebuyers and sellers are actually asking about to feed RETAIN content and lead magnets | System | marketing |
| Agent Recruiting Intel Scout | WORKING | legacy_claim_working_evidence_only | Monitors what real estate agents say about switching brokerages to feed ATTRACT recruiting content | System | marketing |
| Community & Skills Scout | WORKING | legacy_claim_working_evidence_only | Scans for Claude Code community skills, MCP servers, and tools that BCrew should adopt | System | intelligence |
| Internal Scout: Coaching & Leadership | WORKING | legacy_claim_working_evidence_only | Mines Google Drive for coaching calls and leadership training content from all BCrew leaders | System | marketing |
| Internal Scout: Slack & Team Culture | DEGRADED | legacy_degraded_evidence_only | Monitors Slack channels for wins, culture moments, insights, and authentic team content | System | marketing |
| Internal Scout: Team Email & Client Signals | WORKING | legacy_claim_working_evidence_only | Monitors team email for client questions, objections, and stories that feed RETAIN content | System | marketing |
| Internal Scout: Market & Deals | WORKING | legacy_claim_working_evidence_only | Mines Google Drive for sold data, client wins, market insights, and neighborhood expertise | System | marketing |
| Internal Scout: Meetings & Strategy | WORKING | legacy_claim_working_evidence_only | Mines Google Drive for team meeting notes, strategic decisions, and thought leadership content | System | marketing |
| Internal Scout: Skool & Training | DEGRADED | legacy_degraded_evidence_only | Mines BCrew Skool platform for course content, Loom videos, and training material to repurpose | System | marketing |
| Content Archive Scout | WORKING | legacy_claim_working_evidence_only | Analyzes BCrew published content across all platforms to identify what works and what to repurpose | System | marketing |
| Dev Director of Intelligence | WORKING | legacy_claim_working_evidence_only | Synthesizes dev scout reports into daily dev-specific briefs with scored findings | System | dev-product |
| Feedback Scout | WORKING | legacy_claim_working_evidence_only | Cross-system feedback extraction and department routing | System | intelligence |
| Implementation Scoper | WORKING | legacy_claim_working_evidence_only | Researches thin backlog items and writes full sprint cards with implementation specs | System | intelligence |
| Marketing Scoper | WORKING | legacy_claim_working_evidence_only | Researches marketing findings, writes enriched content cards to content-backlog | System | marketing |
| Client Avatar Researcher | WORKING | legacy_claim_working_evidence_only | Monthly deep research on 10 RETAIN client avatars | System | marketing |
| IG/FB Platform Specialist | WORKING | legacy_claim_working_evidence_only | Weekly deep research on Meta algorithm, IG format trends, competitor IG analysis, posting optimization | System | marketing |
| IG Scoper | WORKING | legacy_claim_working_evidence_only | Daily IG/FB content direction with scoping cards | System | marketing |
| Agent Avatar Researcher | WORKING | legacy_claim_working_evidence_only | Monthly deep research on 5 ATTRACT agent recruiting avatars | System | marketing |
| Error/Log Scout | WORKING | legacy_claim_working_evidence_only | System error monitoring and failure pattern detection | System | intelligence, dev-product |
| Compliance Enforcer | WORKING | legacy_claim_working_evidence_only | Post-creation validator. Checks franchise model compliance, tools registry references, system-architecture rules, dashboard wiring, SKILL.md template adherence. | System | dev-product |
| Decision Codifier | WORKING | legacy_claim_working_evidence_only | Decision confirmation processing and codification across email, meetings, Slack, and conversations | System | strategy |
| Sales Director of Intelligence | WORKING | legacy_claim_working_evidence_only | Synthesizes sales scout outputs into daily sales-specific briefs with scored findings | System | intelligence |
| Ops Director of Intelligence | WORKING | legacy_claim_working_evidence_only | Synthesizes ops scout outputs into daily ops-specific briefs with scored findings | System | intelligence |

## Governed Jobs

| Job | Runtime Mode | Type | Lane | Priority |
| --- | --- | --- | --- | --- |
| foundation-verify | scheduled | health_check | health | P0 |
| verification-runs | scheduled | health_check | health | P1 |
| code-quality-nightly-audit | manual | health_check | health | P0 |
| recurring-deep-audit | manual | review | health | P1 |
| nightly-deep-audit | scheduled | review | health | P0 |
| system-health-nightly-audit | scheduled | health_check | health | P0 |
| foundation-lessons-learned-loop | scheduled | review | health | P0 |
| connector-uptime-monitor | scheduled | health_check | health | P0 |
| shared-comms-coverage | scheduled | health_check | coverage | P0 |
| llm-auth-audit | manual | llm_audit | model | P0 |
| extraction-control-seed | manual | control_plane | extract | P0 |
| gmail-sync-current | scheduled | current_sync | archive | P0 |
| calendar-sync-current | scheduled | current_sync | archive | P1 |
| missive-sync-current | scheduled | current_sync | archive | P0 |
| email-attachment-extract-bite | scheduled | corpus_extraction | extract | P0 |
| meeting-notes-sync-current | scheduled | current_sync | archive | P0 |
| meeting-notes-retry-failed | manual | recovery | archive | P1 |
| extraction-retry-failed | manual | recovery | archive | P1 |
| slack-sync-current | scheduled | current_sync | archive | P1 |
| slack-extract-latest | scheduled | extraction | extract | P1 |
| drive-corpus-inventory-bite | scheduled | corpus_inventory | archive | P1 |
| drive-content-extract-bite | scheduled | corpus_extraction | extract | P0 |
| video-link-inventory-bite | manual | corpus_inventory | archive | P1 |
| video-content-extract-bite | scheduled | corpus_extraction | extract | P0 |
| gmail-extract-latest | scheduled | extraction | extract | P1 |
| missive-extract-latest | scheduled | extraction | extract | P1 |
| meeting-transcript-gaps | manual | health_check | coverage | P1 |
| meeting-transcript-recent-gap-verify | manual | health_check | coverage | P1 |
| meeting-transcripts-extract-backlog | scheduled | extraction | extract | P1 |
| admin-deal-review-readonly | scheduled | review | transactions | P1 |
| admin-deal-backlog-review | scheduled | review | transactions | P1 |
| conditional-deal-review-readonly | scheduled | sync | transactions | P1 |
| agent-roster-review | scheduled | review | people | P1 |
| agent-feedback-auto-send-readiness | scheduled | send | people | P1 |
| agent-feedback-reminder-readiness | scheduled | send | people | P1 |
| shared-comms-intelligence-bite | manual | intelligence_bite | synthesis | P0 |
| shared-comms-synthesis-v1 | manual | synthesis | synthesis | P0 |
| intelligence-synthesis-spine-refresh | scheduled | synthesis | synthesis | P0 |
| intelligence-action-router-proposals | scheduled | routing | action | P0 |
| strategy-evidence-packet-v1 | manual | synthesis | strategy | P0 |

## Not Next

- Do not launch agents, workers, scouts, or hidden subagents.
- Do not import old-system agent code or prompts as active runtime truth.
- Do not treat old-system WORKING status as current new-system runtime status.
- Do not copy private profile content, team emails, chat IDs, tokens, raw memories, or secret values.
- Do not call providers, run model calls, start extraction, mutate external systems, or approve sends.
- Do not build the System Capabilities UI surface; that is SYSTEM-004.
- Do not start Value Builder split.

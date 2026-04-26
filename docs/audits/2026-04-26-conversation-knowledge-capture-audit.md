# 2026-04-26 Conversation Knowledge Capture Audit

Created: 2026-04-26 12:45 EDT

Purpose: audit whether Steve's high-value business logic from the long 2026-04-26 conversation was promoted into durable repo truth, live backlog, or local memory instead of being left only in chat.

Scope reviewed:

- current conversation context after Ops Hub v1 closeout
- `memory/2026-04-26.md`
- `docs/handoffs/2026-04-26-source-automation-checkpoint.md`
- `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md`
- current source notes for Follow Up Boss, KPI, FUB/KPI deal connection, ClickUp, and FUBZahnd
- live `backlog_items`
- live `fub_lead_source_rules` where relevant

This audit is a knowledge-capture audit, not another code/security audit.

## Result

Steve's major logic was not wasted. The important items are now captured in source notes, handoffs, live backlog, and local memory.

One real capture gap was found during this audit:

- the latest founder clarification about generic `Sphere`, guided lead-source correction, buy/sell appointment exceptions, and KPI-vs-FUB write destinations was not strong enough in durable docs at first

Fix applied:

- updated Follow Up Boss source note
- updated KPI source note
- updated KPI/FUB/Sales handoff
- updated live backlog and seed backlog
- corrected live `fub_lead_source_rules.Sphere` to `not_canonical`

## Knowledge Capture Matrix

| Topic Steve Taught / Corrected | Durable Location | Backlog / Live State | Status |
| --- | --- | --- | --- |
| Fresh chat should start from handoffs/memory/current repo, not huge old chat context | `docs/handoffs/2026-04-26-fresh-chat-start-after-ops-v1.md`, `memory/2026-04-26.md` | - | Captured |
| Audits found hardening gaps, not evidence the system is fake | `memory/2026-04-26.md`, `docs/handoffs/2026-04-26-source-automation-checkpoint.md` | `SECURITY-005`, `SOURCE-023`, `ACTION-ROUTER-001`, `SYSTEM-010`, `SECURITY-002` | Captured |
| Subscription route is allowed if reliable; GPT-5.4 subscription route is enough for extraction, GPT-5.5 is mainly coding/API path | `memory/2026-04-26.md`, `docs/rebuild/current-state.md` | `LLM-AUTH-AUDIT-001`, `LLM-CREDENTIAL-REGISTRY-001`, `LLM-ROUTER-001` | Captured |
| Runtime should be mission/quota based for subscription extraction, not short timer based | `docs/handoffs/2026-04-26-source-automation-checkpoint.md`, `memory/2026-04-26.md` | Foundation jobs and verifier cover daily mission quotas | Captured |
| Priority sources need two lanes: current-day capture plus daily history/extraction until caught up | `docs/handoffs/2026-04-26-source-automation-checkpoint.md` | scheduled meeting/slack current, Gmail/Missive/meeting/Slack extraction, Drive inventory | Captured |
| History/corpus missions should auto-retire when empty | `docs/handoffs/2026-04-26-source-automation-checkpoint.md` | `EXTRACT-RETIRE-001` | Captured |
| Drive inventory is not Drive content extraction | `docs/handoffs/2026-04-26-source-automation-checkpoint.md` | `DRIVE-CONTENT-001` | Captured |
| Email body sync is not attachment extraction | `docs/handoffs/2026-04-26-source-automation-checkpoint.md` | `EMAIL-ATTACHMENTS-001` | Captured |
| Meeting text coverage is not meeting-video / recording understanding | `docs/handoffs/2026-04-26-source-automation-checkpoint.md` | `MEETING-VIDEO-001` | Captured |
| YouTube/channels, Loom, Skool, Drive videos, meeting videos, Zoom, demos, screenshots need a governed multimodal extractor | `docs/rebuild/current-state.md`, `docs/handoffs/2026-04-26-source-automation-checkpoint.md` | `MULTIMODAL-EXTRACTOR-001`, `MEETING-VIDEO-001` | Captured |
| If Steve already gave API keys, future audits should not pretend keys are missing | `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md`, local memory | `CONNECTOR-CREDENTIAL-001` | Captured |
| FUB/KPI/Owners/ClickUp connectors were live for the deep connection audit | `docs/source-notes/fub-kpi-deal-connection-map.md` | `SOURCE-021`, `OPS-008` | Captured |
| FUB `PersonID` is the human; KPI `persons.pid` is the opportunity episode | `docs/source-notes/fub-kpi-deal-connection-map.md`, `docs/source-notes/fub-zahnd-middleware.md` | `SOURCE-021` | Captured |
| One human can re-enter as a new opportunity; new opportunity is not always a brand-new human | `docs/source-notes/fub-kpi-deal-connection-map.md`, `docs/source-notes/fub-zahnd-middleware.md`, `docs/source-notes/kpi-dashboard.md` | `SOURCE-021`, `SOURCE-017` | Captured |
| User ID `22` / Benson Crew Assistant is the pond/unclaimed owner context | `docs/source-notes/fub-kpi-deal-connection-map.md` | `SOURCE-021` | Captured |
| `leadclaimeddate` must be separated from `leaddate` before praising lead generation | `docs/source-notes/fub-kpi-deal-connection-map.md`, `docs/source-notes/kpi-dashboard.md` | `SOURCE-021` | Captured |
| ClickUp is not broadly broken; FUB-linked proof set mostly has tasks by address with missing/wrong Deal # | `docs/source-notes/fub-kpi-deal-connection-map.md`, `docs/source-notes/clickup.md` | `OPS-008` | Captured |
| KPI How-To page is source evidence; local code is enough for doctrine/code proof | `docs/source-notes/kpi-dashboard.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `KPI-APPT-QUALITY-001`, `KPI-LEAD-VALIDATION-001` | Captured |
| Appointment stacking corrupts conversion if repeated meetings become repeated appointments for one opportunity | `docs/source-notes/kpi-dashboard.md` | `KPI-APPT-QUALITY-001` | Captured |
| Appointment audit should prompt on multiple appointments within roughly 60-90 days, not automatically accuse | `docs/source-notes/kpi-dashboard.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `KPI-APPT-QUALITY-001` | Captured |
| Buy+sell pairs, multiple properties, and separate deal paths are legitimate appointment exceptions | `docs/source-notes/kpi-dashboard.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `KPI-APPT-QUALITY-001` | Captured |
| Agents often miss appointment outcomes or use wrong outcomes | `docs/source-notes/kpi-dashboard.md` | `KPI-APPT-QUALITY-001` | Captured |
| FUB auto-creates lead records; agents can create fake KPI leads by leaving non-leads in lead stages | `docs/source-notes/kpi-dashboard.md`, `docs/source-notes/follow-up-boss.md` | `KPI-LEAD-VALIDATION-001`, `SOURCE-017` | Captured |
| `Import`, `<unspecified>`, generic `Sphere`, `SOI`, and similar placeholders are not validated final lead sources | `docs/source-notes/follow-up-boss.md`, `docs/source-notes/kpi-dashboard.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `KPI-LEAD-VALIDATION-001`, `SOURCE-017`; live `Sphere` marked `not_canonical` | Captured |
| Lead-source assistant should ask if true source is Met in Person, Met Social, Family, Referral, Introduction, or another governed source | `docs/source-notes/follow-up-boss.md`, `docs/source-notes/kpi-dashboard.md` | `KPI-LEAD-VALIDATION-001`, `SOURCE-017`, `SALES-005` | Captured |
| For referral/introduction, assistant should ask who introduced, search FUB, and offer to add/connect missing origin person | `docs/source-notes/follow-up-boss.md`, `docs/source-notes/kpi-dashboard.md` | `KPI-LEAD-VALIDATION-001`, `SALES-005` | Captured |
| For Met in Person / Met Social, assistant should ask where / platform and store secondary details | `docs/source-notes/follow-up-boss.md`, `docs/source-notes/kpi-dashboard.md` | `KPI-LEAD-VALIDATION-001`, `SALES-005` | Captured |
| Ground Zero must trace the original relationship/source, not stop at placeholder source labels | `docs/source-notes/follow-up-boss.md`, `docs/source-notes/owners-dashboard.md`, `docs/source-notes/kpi-dashboard.md` | `SOURCE-017`, `KPI-LEAD-VALIDATION-001` | Captured |
| Support-network health levels / smart lists are part of future AI assistant coaching | `docs/source-notes/follow-up-boss.md` | `SOURCE-017`, `SALES-004` | Captured enough; needs later deep pass |
| Shopping List is critical and should be updated weekly | `docs/source-notes/kpi-dashboard.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `KPI-SHOPPING-001` | Captured |
| Reilly Mitchell and Sofia Fischman coaching calls should be mined for Shopping List doctrine | `docs/source-notes/kpi-dashboard.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `KPI-SHOPPING-001` | Captured |
| Agent coach should eventually help agents act/update systems, not just report problems | `docs/source-notes/kpi-dashboard.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `SALES-004`, `SALES-005`, `ACTION-ROUTER-001` | Captured |
| Most KPI production truth flows from FUB/Lee DB, so hygiene writes usually go to FUB | `docs/source-notes/kpi-dashboard.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `SALES-005` | Captured |
| KPI-native writes are mainly goals and Shopping List | `docs/source-notes/kpi-dashboard.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `SALES-005`, `KPI-SHOPPING-001` | Captured |
| If KPI endpoints are missing, BCrew owns the code and can ask Aidan/Lee to implement safe endpoints | `docs/source-notes/kpi-dashboard.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `SALES-005` | Captured |
| Long-term CRM replacement direction: use deep FUB/KPI/Home Value Hub understanding to eventually reduce dependence on GHL/FUB | `memory/2026-04-26.md`, `docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md` | `SALES-004`, `SALES-005`, future source cards | Captured as direction, not build-ready |
| KPI Current State yellow item / `SOURCE-010` should close after KPI read-rule lock | `docs/source-notes/kpi-dashboard.md`, `docs/rebuild/current-state.md` | `SOURCE-010=done`; follow-on under `KPI-HEALTH-001`, `SOURCE-021`, KPI quality cards | Captured |
| Steve strategy folder and John Kitchens binder need Drive extraction for strategy prep | `docs/source-notes/google-drive-corpus.md`, `docs/audits/2026-04-26-drive-content-extraction-proof.md`, `memory/2026-04-26.md` | `DRIVE-CONTENT-001` first slice shipped; remaining file types explicit | Captured |
| Gmail attachment extraction matters because emails can carry PDFs/files, not only message bodies | `docs/source-notes/shared-communications.md`, `memory/2026-04-26.md` | `EMAIL-ATTACHMENTS-001` first slice shipped; Missive/OCR/Office/media still open | Captured |
| YouTube subtitle extraction is useful but not GOD-mode video understanding | `docs/source-notes/video-link-inventory.md`, `docs/audits/2026-04-26-video-transcript-extraction-proof.md`, `docs/handoffs/2026-04-26-video-extraction-checkpoint.md` | `MULTIMODAL-EXTRACTOR-001`, `MEETING-VIDEO-001`, `YOUTUBE-SCOUT-001` | Captured |
| Mycro public YouTube video is a good visual test because value is in folder structures, screenshots, and workflow shown on screen | `docs/source-notes/video-link-inventory.md`, `docs/rebuild/agent-architecture.md`, `docs/source-notes/myicro-training.md` | `MULTIMODAL-EXTRACTOR-001`, `MYICRO-TRAINING-001` | Captured |
| GOD-mode video/web extractor must watch/listen/read/capture screenshots/keyframes/tool workflows, not only summarize captions | `docs/source-notes/video-link-inventory.md`, `docs/source-notes/myicro-training.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md` | `MULTIMODAL-EXTRACTOR-001`, `WEB-GODMODE-001` | Captured |
| Mycro / myICOR logged-in app extraction is a separate source lane from public YouTube proof | `docs/source-notes/myicro-training.md` | `MYICRO-TRAINING-001`; proposed `SRC-MYICRO-001` after access proof | Captured |
| The crawler may be code with a brain, a worker, or later an agent; the durable need is a governed GOD-mode tool that agents can call | `docs/source-notes/myicro-training.md`, `docs/rebuild/agent-architecture.md` | `WEB-GODMODE-001`, `AGENT-001`, `MULTIMODAL-EXTRACTOR-001` | Captured |
| Multiple paid model/subscription seats are allowed if treated as named compliant capacity lanes, not blind account rotation | `memory/2026-04-26.md`, `docs/handoffs/2026-04-26-video-extraction-checkpoint.md` | `LLM-HUB-CAPACITY-001` | Captured |

## Items That Still Need Real Work

These are not lost; they are tracked work:

- `KPI-APPT-QUALITY-001`: build the actual agent-level appointment-quality audit.
- `KPI-LEAD-VALIDATION-001`: build the actual invalid-source / fake-lead / correction-prompt audit.
- `SOURCE-017`: turn the doctrine into one governed FUB/KPI opportunity-hygiene contract.
- `KPI-SHOPPING-001`: mine Reilly/Sofia coaching calls and lock Shopping List weekly discipline.
- `SALES-005`: design and later build safe agent-authorized writes.
- `DRIVE-CONTENT-001`, `EMAIL-ATTACHMENTS-001`, `MEETING-VIDEO-001`, `MULTIMODAL-EXTRACTOR-001`: build the missing extraction layers so future strategy/coach work can read the full corpus.
- `CONNECTOR-CREDENTIAL-001`: build preflight registry so future agents know whether keys exist before starting deep audits.
- `WEB-GODMODE-001`: build the governed browser-capable worker/tool for authorized web apps, page navigation, screenshots, visual workflow detection, and source-backed artifact filing.
- `MYICRO-TRAINING-001`: validate logged-in Mycro/myICOR paid-training extraction as the first app/course proof after the public YouTube visual proof.

## Process Fix

When Steve gives dense business logic during active implementation, the assistant must pause and run a mini capture loop:

1. Identify the durable owner: source note, backlog, current-state doc, handoff, verifier, or local memory.
2. Patch the durable owner immediately if the logic is new or corrective.
3. Update the live backlog if the logic changes work priority or acceptance criteria.
4. Say where it was captured before continuing build work.

This is the only way to prevent "Steve explained it in chat" from becoming system loss.

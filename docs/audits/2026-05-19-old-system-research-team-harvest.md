# Old System Research Team Harvest - 2026-05-19

Card: `OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001`
Closeout key: `old-system-research-team-harvest-v1`
Old repo: `~/bcrew-buddy-reference`

## Summary

- Old agent records reviewed: 90
- Skills reviewed: 121
- Research/intel/extraction skills harvested: 121
- Key evidence files found: 12/12
- Promoted live cards checked: 11
- Boundary: pattern harvest only; no old-code import, no old-agent execution, no private crawl.

## Keep

- source scan -> scored finding -> synthesis -> action/backlog -> `WEB-GODMODE-001`, `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`, `FOUNDATION-OPERATOR-PULSE-001`
  Evidence: skills/bcrew-external-scout/SKILL.md, skills/bcrew-director-intelligence/SKILL.md, scripts/atom-extractor.cjs
- course/video scout with transcript/resource extraction and usefulness scoring -> `WEB-GODMODE-001`, `LOOM-001`, `SKOOL-WORKER-001`, `MYICRO-TRAINING-001`
  Evidence: skills/bcrew-course-scout/SKILL.md, archive/batch-youtube-extract.cjs, docs/archive/youtube-deep-analysis.md
- internal source scouts for Gmail/Missive/Slack/meetings feeding director synthesis -> `SOURCE-019`, `SOURCE-020`, `DATA-002`
  Evidence: skills/bcrew-internal-email/SKILL.md, skills/bcrew-internal-slack/SKILL.md, skills/bcrew-internal-meetings/SKILL.md

## Rebuild

- browser/page/video observation kernel: web/browser/course scripts plus human auth state -> governed WEB-GODMODE kernel with approved source boundary, screenshots, transcript discovery, ledger, cost/runtime, and stop controls (WEB-GODMODE-001)
- training corpus extraction: YouTube/course reports and MyICOR/Skool screenshots -> bounded Loom/Skool/Mycro proofs with source rights, transcript-first behavior, screenshots where allowed, and review routing (LOOM-001 / SKOOL-WORKER-001 / MYICRO-TRAINING-001)
- research inbox and daily review: reports pile up in docs/archive/intelligence -> Build Intel daily extraction review queue with promote/archive decisions and backlog/action links (BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001)

## Retire

- free-floating agent sprawl without live source contracts
- prompt-only scheduler truth with stale docs as outputs
- VPS/local split-brain runtime state
- browser/auth scripts that run outside approved source posture
- report piles without owner/action/review decision

## Approval-Bound

- paid/private source login and browser session access
- bulk Skool/Loom/Mycro extraction
- screenshots or video/audio capture where source rights are unclear
- external sends, public posting, permission mutation, credential mutation

## Promoted Cards

- `WEB-GODMODE-001`: scoped / P0 / Build governed website GOD-mode extraction worker
- `LOOM-001`: research / P1 / Validate authorized Loom extraction path
- `MEETING-VIDEO-001`: scoped / P0 / Review videos and recordings linked from meeting notes
- `SKOOL-WORKER-001`: research / P0 / Build the Skool source contract and crawler worker
- `MYICRO-TRAINING-001`: scoped / P0 / Validate Mycro paid-training app extraction lane
- `DRIVE-WORKER-001`: scoped / P1 / Build the Google Drive inventory and extraction worker
- `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`: scoped / P1 / Create Build Intel extraction review queue for daily learning atoms
- `FOUNDATION-OPERATOR-PULSE-001`: scoped / P0 / Build one Steve-facing Foundation operator pulse surface
- `SOURCE-019`: scoped / P1 / Build the shared communications ingestion and synthesis layer
- `SOURCE-020`: scoped / P1 / Port and harden the shared communications source adapters
- `DATA-002`: research / P1 / Build source trust scoring layer

## Harvested Skill Matrix

- acestep: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (.agents/skills/acestep/SKILL.md)
- elevenlabs: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (.agents/skills/elevenlabs/SKILL.md)
- ffmpeg: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (.agents/skills/ffmpeg/SKILL.md)
- frontend-design: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (.agents/skills/frontend-design/SKILL.md)
- ltx2: research_or_intel, external_scouting, extractor_pattern (.agents/skills/ltx2/SKILL.md)
- moviepy: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (.agents/skills/moviepy/SKILL.md)
- playwright-recording: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (.agents/skills/playwright-recording/SKILL.md)
- qwen-edit: research_or_intel, external_scouting, synthesis_or_director (.agents/skills/qwen-edit/SKILL.md)
- remotion-best-practices: research_or_intel, external_scouting, extractor_pattern (.agents/skills/remotion-best-practices/SKILL.md)
- remotion: research_or_intel, external_scouting, extractor_pattern (.agents/skills/remotion/SKILL.md)
- runpod: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (.agents/skills/runpod/SKILL.md)
- video_toolkit: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (.agents/skills/video_toolkit/SKILL.md)
- bcrew-agent-recruiting-intel: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-agent-recruiting-intel/SKILL.md)
- bcrew-assist-agent: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-assist-agent/SKILL.md)
- bcrew-assist-carson: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-assist-carson/SKILL.md)
- bcrew-assist-georgia: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-assist-georgia/SKILL.md)
- bcrew-assist-nick: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-assist-nick/SKILL.md)
- bcrew-assist-steve: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-assist-steve/SKILL.md)
- bcrew-assist-tanner: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-assist-tanner/SKILL.md)
- bcrew-attract-brief: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-attract-brief/SKILL.md)
- bcrew-backlog-monitor: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-backlog-monitor/SKILL.md)
- bcrew-brand-guardian: research_or_intel, external_scouting, synthesis_or_director (skills/bcrew-brand-guardian/SKILL.md)
- bcrew-brand-sync: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-brand-sync/SKILL.md)
- bcrew-coaching-intelligence: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-coaching-intelligence/SKILL.md)
- bcrew-command-brief: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-command-brief/SKILL.md)
- bcrew-community-skills: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-community-skills/SKILL.md)
- bcrew-compliance-enforcer: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-compliance-enforcer/SKILL.md)
- bcrew-content-archive: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-content-archive/SKILL.md)
- bcrew-content-intelligence: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-content-intelligence/SKILL.md)
- bcrew-content-writer: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-content-writer/SKILL.md)
- bcrew-course-scout: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-course-scout/SKILL.md)
- bcrew-deal-analyst: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-deal-analyst/SKILL.md)
- bcrew-decision-codifier: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-decision-codifier/SKILL.md)
- bcrew-dev-director-intel: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-dev-director-intel/SKILL.md)
- bcrew-director-intelligence: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-director-intelligence/SKILL.md)
- bcrew-email-intelligence: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-email-intelligence/SKILL.md)
- bcrew-email-rules: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-email-rules/SKILL.md)
- bcrew-eod-wrap: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-eod-wrap/SKILL.md)
- bcrew-error-log-scout: research_or_intel, external_scouting, synthesis_or_director (skills/bcrew-error-log-scout/SKILL.md)
- bcrew-executive-brief: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-executive-brief/SKILL.md)
- bcrew-external-scout: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-external-scout/SKILL.md)
- bcrew-feedback-scout: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-feedback-scout/SKILL.md)
- bcrew-feedback-triage: research_or_intel, external_scouting, synthesis_or_director (skills/bcrew-feedback-triage/SKILL.md)
- bcrew-feedback: research_or_intel, external_scouting, synthesis_or_director (skills/bcrew-feedback/SKILL.md)
- bcrew-finance-director-intel: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-finance-director-intel/SKILL.md)
- bcrew-foundation-router: research_or_intel, external_scouting, synthesis_or_director (skills/bcrew-foundation-router/SKILL.md)
- bcrew-frontend-dev: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-frontend-dev/SKILL.md)
- bcrew-full-report: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-full-report/SKILL.md)
- bcrew-grow-brief: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-grow-brief/SKILL.md)
- bcrew-head-of-code: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-head-of-code/SKILL.md)
- bcrew-implementation-scoper: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-implementation-scoper/SKILL.md)
- bcrew-internal-coaching: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-internal-coaching/SKILL.md)
- bcrew-internal-email: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-internal-email/SKILL.md)
- bcrew-internal-market: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-internal-market/SKILL.md)
- bcrew-internal-meetings: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-internal-meetings/SKILL.md)
- bcrew-internal-skool: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-internal-skool/SKILL.md)
- bcrew-internal-slack: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-internal-slack/SKILL.md)
- bcrew-lead-gen-research: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-lead-gen-research/SKILL.md)
- bcrew-leadership-scoreboard: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-leadership-scoreboard/SKILL.md)
- bcrew-marketing-brief: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-marketing-brief/SKILL.md)
- bcrew-marketing-scoper: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-marketing-scoper/SKILL.md)
- bcrew-meeting-classifier: research_or_intel, external_scouting, internal_source_scouting (skills/bcrew-meeting-classifier/SKILL.md)
- bcrew-meeting-filer: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-meeting-filer/SKILL.md)
- bcrew-meeting-prep: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-meeting-prep/SKILL.md)
- bcrew-memory-audit: research_or_intel, external_scouting, synthesis_or_director (skills/bcrew-memory-audit/SKILL.md)
- bcrew-memory-review: external_scouting, internal_source_scouting (skills/bcrew-memory-review/SKILL.md)
- bcrew-memory-writer: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-memory-writer/SKILL.md)
- bcrew-midday-pulse: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-midday-pulse/SKILL.md)
- bcrew-missive: external_scouting, internal_source_scouting (skills/bcrew-missive/SKILL.md)
- bcrew-mktg-analyst: research_or_intel, external_scouting, synthesis_or_director (skills/bcrew-mktg-analyst/SKILL.md)
- bcrew-mktg-attract-researcher: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-mktg-attract-researcher/SKILL.md)
- bcrew-mktg-avatar-agent: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-mktg-avatar-agent/SKILL.md)
- bcrew-mktg-avatar-client: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-mktg-avatar-client/SKILL.md)
- bcrew-mktg-campaign-planner: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-mktg-campaign-planner/SKILL.md)
- bcrew-mktg-content-editor: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-mktg-content-editor/SKILL.md)
- bcrew-mktg-content-repurposer: research_or_intel, external_scouting, internal_source_scouting, extractor_pattern (skills/bcrew-mktg-content-repurposer/SKILL.md)
- bcrew-mktg-creative-director: research_or_intel, external_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-mktg-creative-director/SKILL.md)
- bcrew-mktg-cro-analyst: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director (skills/bcrew-mktg-cro-analyst/SKILL.md)
- bcrew-mktg-director-intel: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-mktg-director-intel/SKILL.md)
- bcrew-mktg-ecosystem-scout: research_or_intel, external_scouting, internal_source_scouting, synthesis_or_director, extractor_pattern (skills/bcrew-mktg-ecosystem-scout/SKILL.md)

## Evidence Files

- found ~/bcrew-buddy-reference/docs/agent-inventory.md (22586B, sha256 baaef085f41e...)
- found ~/bcrew-buddy-reference/docs/team-reference.md (6422B, sha256 b8eb2150bd77...)
- found ~/bcrew-buddy-reference/docs/architecture/intelligence-loop.md (1260B, sha256 92dfc3e7d5b0...)
- found ~/bcrew-buddy-reference/skills/bcrew-external-scout/SKILL.md (12222B, sha256 5af850b195f8...)
- found ~/bcrew-buddy-reference/skills/bcrew-course-scout/SKILL.md (14300B, sha256 114488b0af46...)
- found ~/bcrew-buddy-reference/skills/bcrew-platform-intel/SKILL.md (11828B, sha256 343268ad565b...)
- found ~/bcrew-buddy-reference/skills/bcrew-director-intelligence/SKILL.md (16335B, sha256 b69cc9a45b07...)
- found ~/bcrew-buddy-reference/skills/bcrew-internal-skool/SKILL.md (20115B, sha256 5b2ef17345eb...)
- found ~/bcrew-buddy-reference/archive/batch-youtube-extract.cjs (5969B, sha256 0f678798d4d0...)
- found ~/bcrew-buddy-reference/archive/fire-scouts.cjs (7478B, sha256 1d2cc8ab74e9...)
- found ~/bcrew-buddy-reference/scripts/atom-extractor.cjs (6124B, sha256 e44143223c57...)
- found ~/bcrew-buddy-reference/src/web-extractor.ts (21474B, sha256 7531ad459223...)

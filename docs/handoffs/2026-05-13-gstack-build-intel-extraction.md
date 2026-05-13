# GStack Build Intel Extraction - 2026-05-13

Closeout key: `gstack-build-intel-extraction-v1`  
Source: `SRC-GITHUB-BUILD-INTEL-001`  
Repo: https://github.com/garrytan/gstack  
Commit inspected: `dc6252d1df7f1f650ea6e9b2bba7d08fab5de902`

## Summary

This is a read-only, proposal-only extraction of public GStack implementation patterns into AIOS. It does not install GStack, copy code, scrape private communities, use paid auth, open a sprint, or mutate backlog from findings.

## Source Map

- Repo available during proof: yes
- Files inventoried: 761
- Text files inventoried: 679
- Skill files inventoried: 51
- Browser QA files: 186
- Frontend/design files: 52
- Review-gate files: 25

## Public Developer Community Watchlist

- SRC-GITHUB-BUILD-INTEL-001: Public GitHub build intelligence; cadence manual_first_then_weekly_proposal; blocked private_repo_content, credentialed_scraping, wholesale_code_import, auto_install
- SRC-CODEX-COMMUNITY-BUILD-INTEL-001: Codex Community public Build Intel; cadence manual_first; blocked private messages, login-gated scraping, auto-created backlog
- SRC-CLAUDE-CODE-COMMUNITY-BUILD-INTEL-001: Claude Code Community public Build Intel; cadence manual_first; blocked private messages, login-gated scraping, auto-created backlog
- SRC-OPENCLAW-COMMUNITY-BUILD-INTEL-001: OpenClaw public Build Intel; cadence manual_first; blocked private messages, login-gated scraping, auto-created backlog

## Pattern Scorecard

| Pattern | Score | Route | Related Cards | Evidence |
| --- | ---: | --- | --- | --- |
| browser_qa_proof_loop | 14 | enrich_existing_card | BROWSER-QA-PROOF-001, FOUNDATION-UI-COMPLETE-001 | yes:BROWSER.md, yes:browse/SKILL.md, yes:browse/test/security-live-playwright.test.ts, yes:open-gstack-browser/SKILL.md |
| skill_improver_operating_rules | 13 | enrich_existing_card | SKILL-IMPROVER-001, SKILL-IMPROVER-GSTACK-ENRICHMENT-001 | yes:README.md, yes:AGENTS.md, yes:codex/SKILL.md, yes:review/SKILL.md |
| review_gate_checklists | 13 | enrich_existing_card | REVIEW-GATE-UPGRADE-001, VERIFIER-INCREMENTAL-COVERAGE-001 | yes:review/checklist.md, yes:review/design-checklist.md, yes:ship/SKILL.md, yes:qa/SKILL.md |
| public_github_monitoring | 13 | enrich_existing_card | PUBLIC-DEV-COMMUNITY-WATCHLIST-001, BUILD-INTEL-GITHUB-MONITOR-001 | yes:.github/workflows/, yes:gstack-upgrade/SKILL.md, yes:bin/gstack-community-dashboard, yes:docs/designs/SELF_LEARNING_V0.md |
| context_save_restore | 11 | propose_new_card | CONTEXT-SAVE-RESTORE-001, FEEDBACK-CAPTURE-001 | yes:context-save/SKILL.md, yes:context-restore/SKILL.md, yes:USING_GBRAIN_WITH_GSTACK.md, yes:docs/gbrain-sync.md |
| guard_freeze_safety | 10 | propose_new_card | AIOS-GUARD-FREEZE-001, PROCESS-ACK-STATES-001 | yes:guard/SKILL.md, yes:freeze/SKILL.md, yes:careful/SKILL.md, yes:freeze/bin/check-freeze.sh |
| frontend_design_pipeline | 8 | propose_new_card | BROWSER-QA-PROOF-001, FRONTEND-DESIGN-PIPELINE-001 | yes:design/src/design-to-code.ts, yes:design/src/variants.ts, yes:design/src/gallery.ts, yes:design/src/diff.ts, yes:design-shotgun/SKILL.md |
| eval_and_benchmark_harness | 7 | propose_new_card | AIOS-EVAL-HARNESS-001, VERIFIER-INCREMENTAL-COVERAGE-001 | no:evals/, yes:benchmark/SKILL.md, yes:scripts/eval-summary.ts, yes:docs/evals/security-bench-ensemble-v2.json |
| openclaw_dispatch_tiers | 7 | propose_new_card | OPENCLAW-DISPATCH-TIERS-001, SPRINT-MASTER-ADVISOR-001 | yes:docs/OPENCLAW.md, yes:openclaw/gstack-lite-CLAUDE.md, yes:openclaw/gstack-full-CLAUDE.md, yes:openclaw/gstack-plan-CLAUDE.md |

## Research Inbox Proposals

- gstack_browser_qa_proof_loop: enrich_existing_card -> BROWSER-QA-PROOF-001, FOUNDATION-UI-COMPLETE-001
- gstack_skill_improver_operating_rules: enrich_existing_card -> SKILL-IMPROVER-001, SKILL-IMPROVER-GSTACK-ENRICHMENT-001
- gstack_review_gate_checklists: enrich_existing_card -> REVIEW-GATE-UPGRADE-001, VERIFIER-INCREMENTAL-COVERAGE-001
- gstack_public_github_monitoring: enrich_existing_card -> PUBLIC-DEV-COMMUNITY-WATCHLIST-001, BUILD-INTEL-GITHUB-MONITOR-001
- gstack_context_save_restore: propose_new_card -> CONTEXT-SAVE-RESTORE-001, FEEDBACK-CAPTURE-001
- gstack_guard_freeze_safety: propose_new_card -> AIOS-GUARD-FREEZE-001, PROCESS-ACK-STATES-001
- gstack_frontend_design_pipeline: propose_new_card -> BROWSER-QA-PROOF-001, FRONTEND-DESIGN-PIPELINE-001

## Adopt

- Browser QA proof expectations for UI/dashboard work.
- Review gates as deterministic checklists and proof paths.
- Skill-improver checks that keep code-first boundaries.
- Public GitHub/community monitoring as Build Intel.

## Reject Or Defer

- Do not copy GStack skills wholesale.
- Do not install GStack into AIOS runtime.
- Do not treat GStack's visual style as AIOS design direction.
- Do not create autonomous dev loops from public repo findings.
- Defer frontend design pipeline work until UI work is active or Steve approves it as a standalone sprint.

## Next

Sprint review: decide whether to build FRONTEND-DESIGN-PIPELINE-001, Context Save/Restore, or Eval Harness next; do not install GStack or open autonomous dev.

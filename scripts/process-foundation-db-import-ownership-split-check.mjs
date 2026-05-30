#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SCRIPT_PATH = 'scripts/process-foundation-db-import-ownership-split-check.mjs'
const PACKAGE_SCRIPT = 'process:foundation-db-import-ownership-split-check'
const DIRECT_IMPORT_LIMIT = 436

const DOMAIN_MODULES = [
  {
    path: 'lib/foundation-db-session.js',
    expectedExports: [
      'initFoundationDb',
      'closeFoundationDb',
      'assertFoundationDbReadyForReadOnlyGate',
      'withFoundationAdvisoryLock',
    ],
  },
  {
    path: 'lib/foundation-backlog-sprint-db.js',
    expectedExports: [
      'getActiveFoundationCurrentSprint',
      'getBacklogItemsByIds',
      'getPlanCriticRunsByCardIds',
      'upsertFoundationCurrentSprintOverlay',
    ],
  },
  {
    path: 'lib/foundation-intelligence-db.js',
    expectedExports: [
      'upsertIntelligenceReportArtifact',
      'getIntelligenceJobLedgerSnapshot',
      'searchIntelligenceEvidenceHybrid',
      'proposeActionRoutes',
    ],
  },
  {
    path: 'lib/foundation-source-crawl-db.js',
    expectedExports: [
      'getSourceContractRegistrySnapshot',
      'listSourceCrawlItems',
      'upsertSourceCrawlItem',
      'upsertSourceCrawlTarget',
    ],
  },
  {
    path: 'lib/foundation-shared-comms-db.js',
    expectedExports: [
      'getSharedCommunicationArchiveSnapshot',
      'getSharedCommunicationCoverageSnapshot',
      'recordSharedCommunicationSynthesisRun',
      'upsertSharedCommunicationArtifact',
    ],
  },
  {
    path: 'lib/foundation-runtime-jobs-db.js',
    expectedExports: [
      'createFoundationJobRun',
      'createLlmCall',
      'getFoundationJobRunSnapshot',
      'getLlmRuntimeSnapshot',
    ],
  },
  {
    path: 'lib/foundation-people-sales-db.js',
    expectedExports: [
      'createAgentFeedbackSendAttempt',
      'listFoundationUsers',
      'listSalesListingCases',
      'upsertSalesListingAssignment',
    ],
  },
  {
    path: 'lib/foundation-strategy-docs-db.js',
    expectedExports: [
      'createDecision',
      'getFoundationSnapshot',
      'getStrategyGoalTruthSnapshot',
      'getStrategyOperatingTruthSnapshot',
    ],
  },
]

const MIGRATED_IMPORTERS = [
  {
    path: 'scripts/process-builder-memory-system-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-intelligence-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-tuneup-roadmap-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-db-store-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-backlog-store-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-current-sprint-split-module-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/agent-feedback-production-dry-run.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/send-agent-feedback-test-email.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/process-agent-feedback-production-autosend-dry-run-check.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/process-agent-feedback-production-autosend-enable-check.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/agent-feedback-reminders.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/process-agent-feedback-auto-send-check.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/process-agent-feedback-send-check.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/process-agent-feedback-response-notify-check.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/agent-feedback-auto-send.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/agent-feedback-response-notify.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/process-agent-feedback-reminder-cadence-check.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/process-dev-build-scoper-evidence-trace-check.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/process-build-portfolio-scrum-master-check.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/audit-kpi-shopping-list-quality.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/decision-auto-emit.mjs',
    expectedImports: ['../lib/foundation-db-session.js'],
  },
  {
    path: 'scripts/transcribe-zoom-audio-archive.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-shared-comms-db.js',
    ],
  },
  {
    path: 'scripts/sync-zoom-text-archive.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-shared-comms-db.js',
    ],
  },
  {
    path: 'scripts/sync-slack-archive.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-shared-comms-db.js',
      '../lib/foundation-source-crawl-db.js',
    ],
  },
  {
    path: 'scripts/sync-missive-archive.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-shared-comms-db.js',
      '../lib/foundation-source-crawl-db.js',
    ],
  },
  {
    path: 'scripts/report-shared-comms-coverage.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-shared-comms-db.js',
    ],
  },
  {
    path: 'scripts/generate-shared-comms-synthesis.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-shared-comms-db.js',
    ],
  },
  {
    path: 'lib/llm-router.js',
    expectedImports: ['./foundation-runtime-jobs-db.js'],
  },
  {
    path: 'lib/brain-fleet-quota-ledger.js',
    expectedImports: ['./foundation-runtime-jobs-db.js'],
  },
  {
    path: 'scripts/run-foundation-job.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-runtime-jobs-db.js',
    ],
  },
  {
    path: 'lib/agent-feedback-send.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/agent-feedback-auto-send.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/agent-feedback-response-notify.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/agent-feedback-reminders.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/agent-feedback-real-user-submit-repair.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/agent-feedback-steve-full-loop-test.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/sales-listing-cases.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/sales-listing-inventory.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/sales-hub-routes.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/fub-lead-source-governance.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/kpi-lead-validation-audit.js',
    expectedImports: ['./foundation-people-sales-db.js'],
  },
  {
    path: 'lib/agent-feedback-production-autosend-dry-run.js',
    expectedImports: [
      './foundation-people-sales-db.js',
      './foundation-runtime-jobs-db.js',
    ],
  },
  {
    path: 'scripts/generate-strategy-evidence-packet.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-shared-comms-db.js',
      '../lib/foundation-strategy-docs-db.js',
    ],
  },
  {
    path: 'lib/decision-auto-emit.js',
    expectedImports: [
      './foundation-db-session.js',
      './foundation-strategy-docs-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-frontend-dom-budget-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-runtime-worker-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-wip-protocol-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-cleanup-arc-closeout-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-process-hardening-orchestration-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-clickup-verify-health-boundary-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-hub-backlog-contract-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-strategy-docs-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-job-mutation-allowlist-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-plan-critic-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-plan-critic-architectural-rules-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-control-loop-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-frontend-source-registry-renderers-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-kb-compiler-v1-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-source-once-over-orchestration-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-llm-auth-audit-budget-label-clarity-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-harlan-operator-loop-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-security-behavior-proof-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-operator-budget-split-module-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-runtime-health-simplify-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-extraction-runtime-orchestration-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-endpoint-budgets-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-build-lane-served-code-fanout-sync-repair-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-frontend-asset-budget-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-lazy-surface-loading-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-matt-pocock-claude-folder-eval-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-source-trust-orchestration-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-runtime-reliability-orchestration-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-frontend-monolith-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-agent-template-runtime-contract-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-build-lane-telemetry-resolution-repair-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-source-route-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-identity-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-runtime-first-jobs-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-runtime-read-routes-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-foundation-db-split-module-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-health-script-module-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-agent-feedback-orchestration-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-plan-reviews-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-core-governance-split-module-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-verifier-runtime-reliability-split-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-source-maturity-freedom-bhag-atom-flow-repair-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-strategy-docs-db.js',
      '../lib/foundation-intelligence-db.js',
    ],
  },
  {
    path: 'scripts/process-kpi-lead-validation-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-ui-complete-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/sync-meeting-notes-archive.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-source-crawl-db.js',
      '../lib/foundation-shared-comms-db.js',
      '../lib/foundation-people-sales-db.js',
    ],
  },
  {
    path: 'scripts/run-creator-newsletter-issue-extraction.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-shared-comms-db.js',
    ],
  },
  {
    path: 'scripts/process-brand-stack-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-rebuild-plan-reconcile-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-build-lane-verifier-result-parser-repair-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-gemini-video-brain-route-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-runtime-jobs-db.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-mark-kashef-goal-build-intel-packet-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/extract-meeting-transcript-candidates.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-strategy-docs-db.js',
      '../lib/foundation-shared-comms-db.js',
    ],
  },
  {
    path: 'scripts/process-strategy-009-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-role-assistant-contracts-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/extract-zoom-audio-transcript-candidates.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-strategy-docs-db.js',
      '../lib/foundation-shared-comms-db.js',
    ],
  },
  {
    path: 'scripts/llm-route-control.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-runtime-jobs-db.js',
    ],
  },
  {
    path: 'scripts/process-source-maturity-github-build-intel-trust-gap-repair-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-strategy-docs-db.js',
      '../lib/foundation-source-crawl-db.js',
    ],
  },
  {
    path: 'scripts/process-source-hub-routing-matrix-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-strategy-docs-db.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-youtube-current-sprint-workspace-cleanup-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-source-maturity-strategy-monitoring-gap-repair-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-strategy-docs-db.js',
    ],
  },
  {
    path: 'scripts/sync-source-contract-registry.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-source-crawl-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-raw-green-repair-and-lock-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-source-maturity-freedom-community-rev-monitoring-gap-repair-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-strategy-docs-db.js',
    ],
  },
  {
    path: 'scripts/intelligence-action-router-proof.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-intelligence-db.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-sprint-closeout-continuous-work-ready-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-source-maturity-strategy-routing-gap-repair-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-strategy-docs-db.js',
      '../lib/foundation-intelligence-db.js',
    ],
  },
  {
    path: 'scripts/agent-feedback-real-user-submit-repair.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-strategy-docs-db.js',
    ],
  },
  {
    path: 'scripts/process-ship-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-strategy-docs-db.js',
    ],
  },
  {
    path: 'scripts/process-action-route-dedup-staleness-guard-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-myicro-training-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-decision-004-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-intelligence-db.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-llm-credential-registry-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-runtime-jobs-db.js',
    ],
  },
  {
    path: 'scripts/process-source-maturity-freedom-engine-atom-flow-repair-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-strategy-docs-db.js',
      '../lib/foundation-intelligence-db.js',
    ],
  },
  {
    path: 'scripts/process-source-maturity-strategy-atom-flow-repair-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-strategy-docs-db.js',
      '../lib/foundation-intelligence-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-branch-merge-readiness-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-runtime-jobs-db.js',
    ],
  },
  {
    path: 'scripts/process-promise-to-proof-integrity-gate-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-strategy-docs-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-overnight-closeout-morning-readiness-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
  {
    path: 'scripts/process-audit-finding-to-backlog-router-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-strategy-docs-db.js',
    ],
  },
  {
    path: 'scripts/bootstrap-foundation-db.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
    ],
  },
  {
    path: 'scripts/process-source-extraction-gap-followup-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
      '../lib/foundation-strategy-docs-db.js',
    ],
  },
  {
    path: 'scripts/process-foundation-css-surface-decouple-check.mjs',
    expectedImports: [
      '../lib/foundation-db-session.js',
      '../lib/foundation-backlog-sprint-db.js',
    ],
  },
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function listCodeFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.openclaw') continue
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await listCodeFiles(absolutePath, files)
      continue
    }
    if (/\.(m?js)$/.test(entry.name)) {
      files.push(path.relative(repoRoot, absolutePath))
    }
  }
  return files
}

async function directFoundationDbImportLines() {
  const files = [
    ...await listCodeFiles(path.join(repoRoot, 'lib')),
    ...await listCodeFiles(path.join(repoRoot, 'scripts')),
  ]
  const matches = []
  for (const file of files) {
    const source = await readRepoFile(file)
    const lines = source.split('\n')
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (
        !trimmed.includes('source.includes(') &&
        /from\s+['"](?:\.\.\/lib\/|\.\/)foundation-db\.js['"]/.test(trimmed)
      ) {
        matches.push({ file, line: index + 1, source: line.trim() })
      }
    })
  }
  return matches
}

async function importDomainModule(relativePath) {
  const moduleUrl = pathToFileURL(path.join(repoRoot, relativePath)).href
  return import(moduleUrl)
}

async function main() {
  const args = parseArgs()
  const checks = []
  let directImports = []
  const exportedByModule = {}

  try {
    const [packageJson, roadmapSource] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile('scripts/process-foundation-tuneup-roadmap-check.mjs'),
    ])

    addCheck(
      checks,
      packageJson.scripts?.[PACKAGE_SCRIPT] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`,
      'package exposes foundation-db import ownership proof',
      packageJson.scripts?.[PACKAGE_SCRIPT] || 'missing',
    )

    for (const domain of DOMAIN_MODULES) {
      const source = await readRepoFile(domain.path)
      const moduleExports = Object.keys(await importDomainModule(domain.path)).sort()
      exportedByModule[domain.path] = moduleExports
      addCheck(
        checks,
        source.includes("from './foundation-db.js'"),
        `${domain.path} is a transitional facade-backed domain target`,
        'keeps old facade stable while moving consumers',
      )
      addCheck(
        checks,
        domain.expectedExports.every(name => moduleExports.includes(name)),
        `${domain.path} exports required domain functions`,
        domain.expectedExports.join(', '),
      )
    }

    for (const importer of MIGRATED_IMPORTERS) {
      const source = await readRepoFile(importer.path)
      addCheck(
        checks,
        !source.includes("../lib/foundation-db.js") && !source.includes('"../lib/foundation-db.js"'),
        `${importer.path} no longer imports the foundation-db facade directly`,
        importer.expectedImports.join(', '),
      )
      addCheck(
        checks,
        importer.expectedImports.every(importPath => source.includes(importPath)),
        `${importer.path} imports the new domain target(s)`,
        importer.expectedImports.join(', '),
      )
    }

    directImports = await directFoundationDbImportLines()
    addCheck(
      checks,
      directImports.length <= DIRECT_IMPORT_LIMIT,
      'direct foundation-db facade import count did not grow',
      `${directImports.length} <= ${DIRECT_IMPORT_LIMIT}`,
    )
    addCheck(
      checks,
      MIGRATED_IMPORTERS.length >= 5,
      'first migration cluster covers at least five existing importers',
      `${MIGRATED_IMPORTERS.length} importers`,
    )
    addCheck(
      checks,
      await repoFileExists('scripts/codex-status.mjs'),
      'codex status live tool still exists',
      'scripts/codex-status.mjs',
    )
    addCheck(
      checks,
      roadmapSource.includes('Keep the foundation-db.js facade as a stable pass-through') &&
        roadmapSource.includes('MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001') &&
        roadmapSource.includes('/api/foundation/dev-team-hub'),
      'roadmap preserves facade, proof-lane, and dashboard guardrails',
      'scripts/process-foundation-tuneup-roadmap-check.mjs',
    )

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      directFoundationDbImportCount: directImports.length,
      directFoundationDbImportLimit: DIRECT_IMPORT_LIMIT,
      domainModules: DOMAIN_MODULES.map(domain => domain.path),
      migratedImporters: MIGRATED_IMPORTERS.map(importer => importer.path),
      exportedByModule,
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Foundation DB import ownership proof: ${result.status}`)
      console.log(`Direct facade imports: ${directImports.length}/${DIRECT_IMPORT_LIMIT}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error('Foundation DB import ownership proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})

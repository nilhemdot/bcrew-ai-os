import { buildAgentRosterReviewQueue } from './agent-roster-review.js'
import { buildAgentFeedbackAutoSendDryRunReport } from './agent-feedback-auto-send.js'
import { buildAgentFeedbackProductionAutoSendDryRunReport } from './agent-feedback-production-autosend-dry-run.js'
import { buildAgentFeedbackReminderDryRunReport } from './agent-feedback-reminders.js'
import { buildClickUpSourceOutageDogfoodProof } from './clickup.js'

export const SOURCE_OUTAGE_BOUNDARY_CARD_ID = 'SOURCE-OUTAGE-BOUNDARY-001'
export const SOURCE_OUTAGE_BOUNDARY_SPRINT_ID = 'source-outage-boundary-2026-05-14'
export const SOURCE_OUTAGE_BOUNDARY_CLOSEOUT_KEY = 'source-outage-boundary-v1'
export const SOURCE_OUTAGE_BOUNDARY_PLAN_PATH = 'docs/process/source-outage-boundary-001-plan.md'
export const SOURCE_OUTAGE_BOUNDARY_APPROVAL_PATH = 'docs/process/approvals/SOURCE-OUTAGE-BOUNDARY-001.json'
export const SOURCE_OUTAGE_BOUNDARY_SCRIPT_PATH = 'scripts/process-source-outage-boundary-check.mjs'

export async function buildSourceOutageBoundaryDogfoodProof() {
  const clickUpProof = buildClickUpSourceOutageDogfoodProof()
  const degradedSnapshot = clickUpProof.degraded
  const now = new Date('2026-05-14T12:00:00.000Z')

  const [
    agentRoster,
    autoSendReport,
    productionDryRun,
    reminderReport,
  ] = await Promise.all([
    Promise.resolve(buildAgentRosterReviewQueue(degradedSnapshot)),
    buildAgentFeedbackAutoSendDryRunReport({
      now,
      includeCandidates: true,
      forceRefresh: true,
      snapshot: degradedSnapshot,
    }),
    buildAgentFeedbackProductionAutoSendDryRunReport({
      now,
      includeCandidates: true,
      forceRefresh: true,
      snapshot: degradedSnapshot,
    }),
    buildAgentFeedbackReminderDryRunReport({
      now,
      includeCandidates: true,
      forceRefresh: true,
      snapshot: degradedSnapshot,
    }),
  ])

  const checks = [
    {
      ok: clickUpProof.ok === true,
      check: 'ClickUp 500 is converted to a sanitized degraded source-health snapshot',
      detail: clickUpProof.degraded?.sourceHealth?.message || '',
    },
    {
      ok: agentRoster.sourceHealth?.status === 'degraded' &&
        agentRoster.openItems === 1 &&
        agentRoster.needsFixing === 0 &&
        agentRoster.items?.[0]?.id === 'agent-roster-source-degraded',
      check: 'Agent Roster review queue reports source degraded instead of zero clean rows',
      detail: `${agentRoster.openItems || 0} open / ${agentRoster.needsFixing || 0} fixing`,
    },
    {
      ok: autoSendReport.sourceHealth?.status === 'degraded' &&
        autoSendReport.scanner?.sourceUnavailable === true &&
        autoSendReport.georgiaDay30?.action === 'skipped' &&
        autoSendReport.sideEffects?.gmailSent === false &&
        autoSendReport.sideEffects?.clickUpRequestedWritten === false,
      check: 'Auto-send readiness fails closed with no Gmail or ClickUp side effects',
      detail: autoSendReport.georgiaDay30?.action || 'missing action',
    },
    {
      ok: productionDryRun.sourceHealth?.status === 'degraded' &&
        productionDryRun.source?.sourceUnavailable === true &&
        productionDryRun.summary?.totalCandidates === 0 &&
        productionDryRun.sideEffects?.gmailSent === false &&
        productionDryRun.sideEffects?.clickUpRequestedWritten === false,
      check: 'Production dry-run reports source outage without pretending it scanned ClickUp',
      detail: `${productionDryRun.source?.tasksInspected || 0} tasks`,
    },
    {
      ok: reminderReport.sourceHealth?.status === 'degraded' &&
        reminderReport.scanner?.sourceUnavailable === true &&
        reminderReport.sideEffects?.gmailSent === false &&
        reminderReport.sideEffects?.clickUpRequestedWritten === false &&
        reminderReport.sideEffects?.reminderLedgerWritten === false,
      check: 'Reminder readiness reports source outage without email, ClickUp, or ledger writes',
      detail: `${reminderReport.scanner?.candidateCount || 0} candidates`,
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    cardId: SOURCE_OUTAGE_BOUNDARY_CARD_ID,
    checks,
    clickUpProof,
    agentRoster: {
      openItems: agentRoster.openItems,
      needsFixing: agentRoster.needsFixing,
      sourceHealth: agentRoster.sourceHealth,
      firstItem: agentRoster.items?.[0] || null,
    },
    reports: {
      autoSend: {
        sourceHealth: autoSendReport.sourceHealth,
        scanner: autoSendReport.scanner,
        georgiaDay30Action: autoSendReport.georgiaDay30?.action || '',
        sideEffects: autoSendReport.sideEffects,
      },
      productionDryRun: {
        sourceHealth: productionDryRun.sourceHealth,
        source: productionDryRun.source,
        summary: productionDryRun.summary,
        sideEffects: productionDryRun.sideEffects,
      },
      reminders: {
        sourceHealth: reminderReport.sourceHealth,
        scanner: reminderReport.scanner,
        sideEffects: reminderReport.sideEffects,
      },
    },
  }
}

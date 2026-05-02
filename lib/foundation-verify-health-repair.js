import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFile = promisify(execFileCallback)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID = 'FOUNDATION-VERIFY-HEALTH-REPAIR-001'
export const FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY = 'foundation-verify-health-repair-v1'
export const FOUNDATION_VERIFY_HEALTH_REPAIR_APPROVED_PLAN_PATH = 'docs/process/approved-plans/foundation-verify-health-repair-v1.md'
export const FOUNDATION_VERIFY_HEALTH_REPAIR_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-VERIFY-HEALTH-REPAIR-001.json'
export const FOUNDATION_VERIFY_HEALTH_REPAIR_PROOF_PATH = 'docs/audits/2026-05-01-foundation-verify-health-repair-proof.md'

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

async function readOptionalText(repoRoot, relativePath) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

async function getRepoHead(repoRoot) {
  const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: repoRoot })
  return stdout.trim().toLowerCase()
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

function includesAll(source, phrases) {
  return phrases.every(phrase => source.includes(phrase))
}

export async function buildFoundationVerifyHealthRepairStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
  dailyExecSummaryStatus = null,
  agentOnboardingFeedbackSystemStatus = null,
  agentFeedbackRealUserSubmitRepairStatus = null,
} = {}) {
  const findings = []
  const [
    currentPlan,
    currentState,
    packageSource,
    dailySummarySource,
    onboardingSystemSource,
    sourceContractsSource,
    foundationVerifySource,
    proofSource,
  ] = await Promise.all([
    readOptionalText(repoRoot, 'docs/rebuild/current-plan.md'),
    readOptionalText(repoRoot, 'docs/rebuild/current-state.md'),
    readOptionalText(repoRoot, 'package.json'),
    readOptionalText(repoRoot, 'lib/foundation-daily-exec-summary.js'),
    readOptionalText(repoRoot, 'lib/agent-onboarding-feedback-system.js'),
    readOptionalText(repoRoot, 'lib/source-contracts.js'),
    readOptionalText(repoRoot, 'scripts/foundation-verify.mjs'),
    readOptionalText(repoRoot, FOUNDATION_VERIFY_HEALTH_REPAIR_PROOF_PATH),
  ])
  const repoHead = await getRepoHead(repoRoot)
  const dashboardCode = foundationHub?.runtimeSupervisor?.servedCode || {}
  const workerCode = foundationHub?.runtimeSupervisor?.workerCode || {}
  const backlogItems = normalizeList(foundationHub?.backlogItems)
  const repairCard = backlogItems.find(card => card.id === FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID) || null
  const productionCard = backlogItems.find(card => card.id === 'AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001') || null
  const realUserRepairCard = backlogItems.find(card => card.id === 'AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001') || null
  const productionEnabled = process.env.AGENT_FEEDBACK_AUTO_SEND_ENABLED === 'true'
  const closeout = normalizeList(foundationBuildLog?.builds).find(build =>
    build.closeoutKey === FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY
  ) || null
  const closeoutOwners = normalizeList(closeout?.backlogIds)

  addFinding(findings, repairCard?.lane === 'done', 'health repair card is done', repairCard?.lane || 'missing')
  addFinding(findings, /foundation-verify-health-repair-v1/.test(repairCard?.statusNote || ''), 'health repair card records closeout', repairCard?.statusNote || 'missing')
  addFinding(findings, productionEnabled ? productionCard?.lane === 'done' : productionCard?.lane === 'scoped', 'production auto-send card lane matches env-enabled state', productionCard?.lane || 'missing')
  addFinding(findings, productionEnabled === (productionCard?.lane === 'done'), 'production auto-send env flag agrees with card lane', process.env.AGENT_FEEDBACK_AUTO_SEND_ENABLED || 'unset')
  addFinding(findings, realUserRepairCard?.lane === 'done', 'real-user submit repair remains accepted/done', realUserRepairCard?.lane || 'missing')
  addFinding(findings, agentFeedbackRealUserSubmitRepairStatus?.status === 'healthy', 'real-user submit repair process status remains healthy', agentFeedbackRealUserSubmitRepairStatus?.status || 'missing')
  addFinding(findings, Boolean(agentFeedbackRealUserSubmitRepairStatus?.summary?.realBrowserResponse), 'real-user repair still has real browser response proof', String(Boolean(agentFeedbackRealUserSubmitRepairStatus?.summary?.realBrowserResponse)))

  addFinding(findings, dashboardCode.runningCommit === repoHead && dashboardCode.status === 'live', 'dashboard serves current HEAD', dashboardCode.runningShortCommit || dashboardCode.runningCommit || 'missing')
  addFinding(findings, workerCode.runningCommit === repoHead && workerCode.status === 'live', 'worker serves current HEAD', workerCode.runningShortCommit || workerCode.runningCommit || 'missing')
  addFinding(findings, Boolean(workerCode.processId), 'worker exposes process id', workerCode.processId || 'missing')

  addFinding(findings, dailyExecSummaryStatus?.status === 'healthy', 'daily exec summary check is healthy', dailyExecSummaryStatus?.status || 'missing')
  addFinding(findings, dailyExecSummaryStatus?.summary?.latestRecentBuildsRepresented >= 5, 'daily summary represents latest five builds as of selected date', String(dailyExecSummaryStatus?.summary?.latestRecentBuildsRepresented || 0))
  addFinding(findings, dailySummarySource.includes('latestBuildsAsOfSelectedDate'), 'daily summary metric is selected-date scoped', 'latestBuildsAsOfSelectedDate')

  addFinding(findings, agentOnboardingFeedbackSystemStatus?.status === 'healthy', 'Agent Onboarding Feedback system check is healthy', agentOnboardingFeedbackSystemStatus?.status || 'missing')
  addFinding(findings, agentOnboardingFeedbackSystemStatus?.summary?.chrisMetadataCurrent === true, 'Chris source-state proof is current', String(agentOnboardingFeedbackSystemStatus?.summary?.chrisMetadataCurrent))
  addFinding(findings, onboardingSystemSource.includes('Chris metadata-only source-state proof is current'), 'onboarding checker uses current Chris source-state wording', 'Chris metadata-only source-state proof is current')
  addFinding(findings, includesAll(sourceContractsSource, [
    'Status vocabulary remains explicit: not due, due, requested, completed, skipped, blocked',
    'Production auto-send is live',
    'Gmail send proof for controlled production sends',
  ]), 'Agent Onboarding source contract carries current health wording', 'source-contract currentState')

  addFinding(findings, includesAll(packageSource, [
    '"process:foundation-verify-health-repair-check"',
    'scripts/process-foundation-verify-health-repair-check.mjs',
  ]), 'package exposes health repair process check', 'process:foundation-verify-health-repair-check')
  addFinding(findings, foundationVerifySource.includes(FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID), 'foundation verifier covers health repair card', FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID)
  addFinding(findings, includesAll(currentPlan, [
    'FOUNDATION-VERIFY-HEALTH-REPAIR-001` is done',
    'AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001',
  ]), 'current plan records health repair closeout and next card', 'current-plan')
  addFinding(findings, includesAll(currentState, [
    'FOUNDATION-VERIFY-HEALTH-REPAIR-001` is done',
    'foundation:verify',
  ]), 'current state records health repair closeout', 'current-state')
  addFinding(findings, includesAll(proofSource, [
    FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID,
    'worker startup code trust',
    'DAILY-EXEC-SUMMARY-001',
    'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001',
    'Production auto-send remains disabled',
  ]), 'proof artifact records the three repaired failures and production boundary', FOUNDATION_VERIFY_HEALTH_REPAIR_PROOF_PATH)
  addFinding(findings, Boolean(closeout), 'Recent Work exposes health repair closeout', FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY)
  addFinding(findings, closeoutOwners.length === 1 && closeoutOwners.includes(FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID), 'closeout owns only health repair card', closeoutOwners.join(', ') || 'missing')
  addFinding(findings, closeout?.acceptanceState === 'Verified', 'health repair closeout is verified', closeout?.acceptanceState || 'missing')

  return {
    status: findings.length ? 'risk' : 'healthy',
    findings,
    summary: {
      repairCardLane: repairCard?.lane || null,
      productionCardLane: productionCard?.lane || null,
      productionAutoSendEnabled: productionEnabled,
      realUserRepairStatus: agentFeedbackRealUserSubmitRepairStatus?.status || null,
      dashboardCommit: dashboardCode.runningShortCommit || dashboardCode.runningCommit || null,
      workerCommit: workerCode.runningShortCommit || workerCode.runningCommit || null,
      dailyStatus: dailyExecSummaryStatus?.status || null,
      latestRecentBuildsRepresented: dailyExecSummaryStatus?.summary?.latestRecentBuildsRepresented || 0,
      onboardingStatus: agentOnboardingFeedbackSystemStatus?.status || null,
      chrisMetadataCurrent: agentOnboardingFeedbackSystemStatus?.summary?.chrisMetadataCurrent === true,
      closeoutKey: closeout?.closeoutKey || null,
      closeoutOwnsOnlyHealthRepair: closeoutOwners.length === 1 && closeoutOwners.includes(FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID),
    },
  }
}

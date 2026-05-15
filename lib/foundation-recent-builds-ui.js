import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCombinedFoundationStylesheet } from './foundation-stylesheet-monolith-split.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const RECENT_BUILDS_UI_CARD_ID = 'RECENT-BUILDS-BILLION-DOLLAR-UI-001'
export const RECENT_BUILDS_UI_CLOSEOUT_KEY = 'recent-builds-billion-dollar-ui-v1'
export const RECENT_BUILDS_UI_APPROVED_PLAN_PATH = 'docs/process/approved-plans/recent-builds-billion-dollar-ui-v1.md'
export const RECENT_BUILDS_UI_APPROVAL_PATH = 'docs/process/approvals/RECENT-BUILDS-BILLION-DOLLAR-UI-001.json'
export const RECENT_BUILDS_UI_BASELINE_PATH = 'docs/audits/2026-04-30-recent-builds-billion-dollar-ui-baseline.md'
export const RECENT_BUILDS_UI_MANUAL_REVIEW_PATH = 'docs/audits/2026-04-30-recent-builds-billion-dollar-ui-manual-review.md'

export const RECENT_BUILDS_UI_REQUIRED_ROUTE = '/foundation#build-log'
export const RECENT_BUILDS_UI_REQUIRED_VIEWPORTS = ['desktop 1440x900', 'mobile 390x844']
export const RECENT_BUILDS_UI_REQUIRED_STATES = [
  'collapsed default',
  'expanded latest closeout',
  'same-commit group',
  'ownership context separation',
  'review-next queue',
]

function normalizeText(value) {
  return String(value || '').trim()
}

async function readOptionalText(repoRoot, relativePath) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

function addFinding(findings, ok, check, detail = '', severity = 'critical') {
  if (!ok) findings.push({ severity, check, detail })
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function manualPassRecorded(manualReview, viewport, state) {
  const pattern = new RegExp(
    `\\|\\s*${escapeRegExp(RECENT_BUILDS_UI_REQUIRED_ROUTE)}\\s*\\|\\s*${escapeRegExp(viewport)}\\s*\\|\\s*${escapeRegExp(state)}\\s*\\|\\s*pass\\s*\\|`,
    'i',
  )
  return pattern.test(manualReview)
}

function countOperatorCloseoutsByCommit(builds = []) {
  return builds.reduce((acc, build) => {
    if (!build?.operatorCloseout) return acc
    const key = build.sha || build.shortSha || build.subject || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function findCloseout(builds = [], closeoutKey) {
  return builds.find(build => build.closeoutKey === closeoutKey) || null
}

function exactOwner(build, cardId) {
  const ids = build?.backlogIds || []
  return ids.length === 1 && ids.includes(cardId)
}

export async function buildRecentBuildsBillionDollarUiStatus({
  repoRoot = defaultRepoRoot,
  foundationBuildLog = null,
} = {}) {
  const findings = []
  const foundationJs = await readOptionalText(repoRoot, 'public/foundation.js')
  const foundationNavConfigJs = await readOptionalText(repoRoot, 'public/foundation-nav-config.js')
  const foundationDataJs = await readOptionalText(repoRoot, 'public/foundation-data.js')
  const foundationSourceRegistryJs = await readOptionalText(repoRoot, 'public/foundation-source-registry-renderers.js')
  const foundationFubLeadSourceJs = await readOptionalText(repoRoot, 'public/foundation-fub-lead-source-renderers.js')
  const foundationSystemInventoryJs = await readOptionalText(repoRoot, 'public/foundation-system-inventory-renderers.js')
  const foundationCurrentStateJs = await readOptionalText(repoRoot, 'public/foundation-current-state-renderers.js')
  const foundationDecisionQuestionJs = await readOptionalText(repoRoot, 'public/foundation-decision-question-renderers.js')
  const foundationSourceLifecycleJs = await readOptionalText(repoRoot, 'public/foundation-source-lifecycle-renderers.js')
  const foundationRuntimeJs = await readOptionalText(repoRoot, 'public/foundation-runtime-renderers.js')
  const foundationOperationsJs = await readOptionalText(repoRoot, 'public/foundation-operations-renderers.js')
  const foundationRouterJs = await readOptionalText(repoRoot, 'public/foundation-router.js')
  const foundationFrontendJs = [
    foundationNavConfigJs,
    foundationDataJs,
    foundationJs,
    foundationSourceRegistryJs,
    foundationFubLeadSourceJs,
    foundationSystemInventoryJs,
    foundationCurrentStateJs,
    foundationDecisionQuestionJs,
    foundationSourceLifecycleJs,
    foundationRuntimeJs,
    foundationOperationsJs,
    foundationRouterJs,
  ].join('\n')
  const foundationStyles = await readCombinedFoundationStylesheet(repoRoot, readOptionalText)
  const packageJson = await readOptionalText(repoRoot, 'package.json')
  const approvedPlan = await readOptionalText(repoRoot, RECENT_BUILDS_UI_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, RECENT_BUILDS_UI_APPROVAL_PATH)
  const baseline = await readOptionalText(repoRoot, RECENT_BUILDS_UI_BASELINE_PATH)
  const manualReview = await readOptionalText(repoRoot, RECENT_BUILDS_UI_MANUAL_REVIEW_PATH)

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', RECENT_BUILDS_UI_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', RECENT_BUILDS_UI_APPROVAL_PATH)
  addFinding(findings, Boolean(baseline), 'baseline artifact exists', RECENT_BUILDS_UI_BASELINE_PATH)
  addFinding(findings, Boolean(manualReview), 'manual review artifact exists', RECENT_BUILDS_UI_MANUAL_REVIEW_PATH)

  addFinding(findings, approvedPlan.includes('collapsed-by-default') || approvedPlan.includes('collapsed by default'), 'approved plan requires collapsed default cards', 'collapsed default')
  addFinding(findings, approvedPlan.includes('backlogIds = owning cards only'), 'approved plan protects owning-card semantics', 'backlogIds owner-only')
  addFinding(findings, approvedPlan.includes('mentioned/context cards stay context only'), 'approved plan protects context-card semantics', 'context only')
  addFinding(findings, approvedPlan.includes('No comprehensive changelog'), 'approved plan blocks comprehensive changelog scope', 'no changelog implementation')

  addFinding(findings, packageJson.includes('"process:recent-builds-billion-dollar-ui-check"'), 'package script exists', 'process:recent-builds-billion-dollar-ui-check')
  addFinding(findings, foundationFrontendJs.includes('renderBuildExecutiveSummary'), 'executive summary renderer exists', 'renderBuildExecutiveSummary')
  addFinding(findings, foundationFrontendJs.includes('renderBuildReviewQueue'), 'review-next queue renderer exists', 'renderBuildReviewQueue')
  addFinding(findings, foundationFrontendJs.includes('build-log-executive-summary'), 'executive summary class is rendered', 'build-log-executive-summary')
  addFinding(findings, foundationFrontendJs.includes('build-log-card-summary'), 'collapsed closeout summary is rendered', 'build-log-card-summary')
  addFinding(findings, foundationFrontendJs.includes('build-log-context-link'), 'context cards have separate UI treatment', 'build-log-context-link')
  addFinding(findings, foundationFrontendJs.includes('Grouped same-commit closeouts'), 'same-commit grouped closeouts remain visible', 'Grouped same-commit closeouts')
  addFinding(findings, foundationFrontendJs.includes('/api/foundation/build-log?limit=60'), 'UI reads live build-log API without a new endpoint', '/api/foundation/build-log?limit=60')
  addFinding(findings, foundationStyles.includes('.build-log-executive-summary'), 'executive summary styles exist', '.build-log-executive-summary')
  addFinding(findings, foundationStyles.includes('.build-log-review-link'), 'review queue styles exist', '.build-log-review-link')
  addFinding(findings, foundationStyles.includes('@media (max-width: 520px)') && foundationStyles.includes('.build-log-quick-strip { grid-template-columns: 1fr; }'), 'mobile/narrow layout override exists', '390x844 support')

  addFinding(findings, baseline.includes('Before build: `99a0100`'), 'baseline records repo head before build', '99a0100')
  addFinding(findings, baseline.includes('Closeout builds: 42'), 'baseline records closeout count', '42 closeouts')
  addFinding(findings, baseline.includes('same-commit closeout groups'), 'baseline records same-commit closeout groups', 'same-commit groups')
  addFinding(findings, baseline.includes('backlogIds are owning cards only'), 'baseline records ownership boundary', 'owner/context boundary')

  addFinding(findings, manualReview.includes('Failures: 0'), 'manual review records zero failures', 'Failures: 0')
  addFinding(findings, manualReview.includes('desktop 1440x900') && manualReview.includes('mobile 390x844'), 'manual review records required viewports', '1440x900 and 390x844')
  for (const phrase of [
    'no horizontal overflow',
    'no overlapping text',
    'collapsed by default',
    'same-commit closeouts stay grouped',
    'owned cards stay separate from context cards',
    'review-next queue is visible',
    'proof is visible after expand',
  ]) {
    addFinding(findings, manualReview.toLowerCase().includes(phrase), `manual review covers ${phrase}`, phrase)
  }
  for (const viewport of RECENT_BUILDS_UI_REQUIRED_VIEWPORTS) {
    for (const state of RECENT_BUILDS_UI_REQUIRED_STATES) {
      addFinding(
        findings,
        manualPassRecorded(manualReview, viewport, state),
        `manual pass recorded for ${viewport} / ${state}`,
        `${viewport} / ${state}`,
      )
    }
  }

  const builds = Array.isArray(foundationBuildLog?.builds) ? foundationBuildLog.builds : []
  const summary = foundationBuildLog?.summary || {}
  const multiCommitGroups = Object.values(countOperatorCloseoutsByCommit(builds)).filter(count => count >= 2).length
  const gate003 = findCloseout(builds, 'gate-reliability-direct-verifier-deadlock-v1')
  const phase1 = findCloseout(builds, 'phase-1-enforcement-v1')
  const thisCloseout = findCloseout(builds, RECENT_BUILDS_UI_CLOSEOUT_KEY)

  if (foundationBuildLog) {
    addFinding(findings, foundationBuildLog.schemaVersion === 2, 'build-log API remains v2', String(foundationBuildLog.schemaVersion || 'missing'))
    addFinding(findings, summary.closeoutBuilds >= 42, 'build-log API exposes closeout records', `${summary.closeoutBuilds || 0} closeouts`)
    addFinding(findings, summary.proofLinkedBuilds >= 42, 'build-log API exposes proof-linked records', `${summary.proofLinkedBuilds || 0} proof-linked`)
    addFinding(findings, multiCommitGroups >= 2, 'same-commit groups remain available in live API', `${multiCommitGroups} groups`)
    addFinding(findings, exactOwner(gate003, 'GATE-RELIABILITY-003'), 'GATE-RELIABILITY-003 closeout ownership remains exact', gate003?.backlogIds?.join(',') || 'missing')
    addFinding(findings, Array.isArray(gate003?.mentionedBacklogIds) && gate003.mentionedBacklogIds.includes(RECENT_BUILDS_UI_CARD_ID), 'GATE-RELIABILITY-003 context cards remain context only', (gate003?.mentionedBacklogIds || []).join(','))
    addFinding(findings, phase1?.backlogIds?.includes('BUILD-LOG-BACKLOG-ID-FIX-001') && Array.isArray(phase1?.mentionedBacklogIds), 'BUILD-LOG-BACKLOG-ID-FIX-001 semantics stay present', phase1?.closeoutKey || 'missing')
    if (thisCloseout) {
      addFinding(findings, exactOwner(thisCloseout, RECENT_BUILDS_UI_CARD_ID), 'new closeout owns only RECENT-BUILDS-BILLION-DOLLAR-UI-001', (thisCloseout.backlogIds || []).join(','))
      addFinding(findings, !(thisCloseout.backlogIds || []).includes('CHANGE-LOG-COMPREHENSIVE-001'), 'new closeout does not own next Phase G card', (thisCloseout.backlogIds || []).join(','))
    }
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: RECENT_BUILDS_UI_CARD_ID,
    closeoutKey: RECENT_BUILDS_UI_CLOSEOUT_KEY,
    summary: {
      totalBuilds: summary.totalBuilds || builds.length,
      closeoutBuilds: summary.closeoutBuilds || 0,
      proofLinkedBuilds: summary.proofLinkedBuilds || 0,
      reviewNextBuilds: summary.reviewNextBuilds || 0,
      sameCommitGroups: multiCommitGroups,
      manualRouteChecks: RECENT_BUILDS_UI_REQUIRED_VIEWPORTS.length * RECENT_BUILDS_UI_REQUIRED_STATES.length,
      manualRouteFailures: manualReview.includes('Failures: 0') ? 0 : 1,
      newCloseoutPresent: Boolean(thisCloseout),
    },
    findings,
  }
}

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBacklogHygieneSnapshot } from './backlog-hygiene.js'
import { getFoundationBuildCloseouts } from './foundation-build-log.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const FOUNDATION_REVIEW_SPRINT_SCHEMA_VERSION = 1
export const FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY = 'foundation-1100-review-v1'
export const FOUNDATION_REVIEW_SPRINT_ARTIFACT_PATH = 'docs/process/foundation-1100-review-sprint.json'
export const FOUNDATION_REVIEW_SPRINT_CARD_IDS = [
  'BACKLOG-HYGIENE-PASS-002',
  'ACTION-REVIEW-CLEANUP-001',
  'RESEARCH-CURATION-002',
  'PHASE-G-READINESS-001',
]
export const FOUNDATION_REVIEW_SPRINT_PHASE_G_ORDER = [
  'PLAIN-ENGLISH-SWEEP-001',
  'UI-MENU-LAYOUT-POLISH-001',
  'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
  'CHANGE-LOG-COMPREHENSIVE-001',
  'DAILY-EXEC-SUMMARY-001',
  'SOURCE-LIFECYCLE-EXPANSION-001',
]
export const FOUNDATION_REVIEW_SPRINT_CONTEXT_CARD_IDS = [
  ...FOUNDATION_REVIEW_SPRINT_PHASE_G_ORDER,
  'SECURITY-002',
  'SYSTEM-010',
  'EXTRACT-RETRY-001',
  'GATE-RELIABILITY-001',
]

const REVIEWED_PHASE_G_PROGRESS_CLOSEOUTS = {
  'PLAIN-ENGLISH-SWEEP-001': 'plain-english-sweep-v1',
}

const BUSINESS_SIDE_EFFECT_ROUTE_TYPES = new Set(['owner_action'])
const BUSINESS_SIDE_EFFECT_KEYWORDS = /\b(finance|sales|people|customer|invoice|access|grant|owner action|owner_action|prep materials|roster|accountability chart)\b/i

function countBy(values, keyFn) {
  return (values || []).reduce((acc, value) => {
    const key = keyFn(value)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function normalizeText(value) {
  return String(value || '').trim()
}

function relativeArtifactPath(repoRoot = defaultRepoRoot) {
  return path.join(repoRoot, FOUNDATION_REVIEW_SPRINT_ARTIFACT_PATH)
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

export async function loadFoundationReviewSprintArtifact({ repoRoot = defaultRepoRoot } = {}) {
  try {
    return await readJsonFile(relativeArtifactPath(repoRoot))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

export async function writeFoundationReviewSprintArtifact(artifact, { repoRoot = defaultRepoRoot } = {}) {
  const artifactPath = relativeArtifactPath(repoRoot)
  await fs.mkdir(path.dirname(artifactPath), { recursive: true })
  await fs.writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
  return artifactPath
}

export function classifyResearchCard(card) {
  const text = `${card?.id || ''} ${card?.title || ''} ${card?.summary || ''}`
  const subTag = /audit|review|research/i.test(text) ? 'research' : 'future-build'
  return {
    cardId: card.id,
    laneBefore: card.lane,
    priority: card.priority,
    rank: card.rank ?? null,
    subTag,
    disposition: subTag === 'research' ? 'keep-research' : 'park-future-build',
    reason: subTag === 'research'
      ? 'Disposition-only triage: keep in research until a later approved investigation scopes it.'
      : 'Disposition-only triage: park as future-build idea until later hub or source proof makes it current.',
    noDeepResearch: true,
    noImplementation: true,
    noSourceExpansion: true,
  }
}

export function classifyActionRoute(route) {
  const routeText = [
    route.routeType,
    route.destinationTable,
    route.owner,
    route.routingReason,
    route.proposedPayload?.title,
    route.proposedPayload?.summary,
  ].filter(Boolean).join(' ')
  const businessSideEffect = BUSINESS_SIDE_EFFECT_ROUTE_TYPES.has(route.routeType) ||
    BUSINESS_SIDE_EFFECT_KEYWORDS.test(routeText)
  const foundationHousekeeping = !businessSideEffect &&
    ['decision', 'ignore', 'open_question'].includes(String(route.routeType || '')) &&
    ['decisions', 'open_questions', 'intelligence_synthesized_items'].includes(String(route.destinationTable || ''))

  let disposition = 'hold-pending-with-recommendation'
  let recommendation = 'Reviewed for Foundation 1100 sprint. Keep pending until Steve approves a specific route.'
  if (route.routeType === 'ignore') {
    disposition = 'recommend-reject-noisy-route'
    recommendation = 'Recommend rejecting as non-work/noisy route; no destination apply in this sprint.'
  } else if (route.routeType === 'decision') {
    disposition = 'recommend-decision-review'
    recommendation = 'Recommend human decision review only; do not silently create applied/locked decisions.'
  } else if (route.routeType === 'open_question') {
    disposition = 'recommend-question-review'
    recommendation = 'Recommend human question review only; do not create or reopen questions without route-specific approval.'
  } else if (businessSideEffect) {
    disposition = 'classify-business-or-owner-action'
    recommendation = 'Classify and hold. Finance, sales, people, customer, invoice, access-grant, and owner-action routes require Steve route-specific approval before apply.'
  }

  return {
    routeId: route.routeId,
    routeType: route.routeType,
    destinationTable: route.destinationTable,
    approvalStatusBefore: route.approvalStatus,
    owner: route.owner || null,
    sourceIds: route.sourceIds || [],
    disposition,
    recommendation,
    foundationHousekeeping,
    businessSideEffect,
    applyAllowedWithoutSteve: foundationHousekeeping && !businessSideEffect && false,
    externalSideEffectAllowed: false,
    reviewedOnly: true,
  }
}

export function buildFoundationReviewSprintBaseline({
  repoHead,
  foundation,
  actionRouter,
  generatedAt = new Date().toISOString(),
} = {}) {
  const backlogItems = foundation?.backlogItems || []
  const hygiene = buildBacklogHygieneSnapshot({
    backlogItems,
    closeouts: getFoundationBuildCloseouts(),
  })
  const pendingRoutes = (actionRouter?.recentRoutes || [])
    .filter(route => route.approvalStatus === 'pending')
    .map(classifyActionRoute)
  const researchDispositions = backlogItems
    .filter(card => card.lane === 'research')
    .map(classifyResearchCard)
  const wrapperCardsBefore = FOUNDATION_REVIEW_SPRINT_CARD_IDS.map(cardId => {
    const card = backlogItems.find(item => item.id === cardId)
    return {
      cardId,
      exists: Boolean(card),
      lane: card?.lane || null,
    }
  })

  return {
    schemaVersion: FOUNDATION_REVIEW_SPRINT_SCHEMA_VERSION,
    closeoutKey: FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY,
    capturedAt: generatedAt,
    repoHead,
    counts: {
      backlogCards: backlogItems.length,
      done: backlogItems.filter(card => card.lane === 'done').length,
      scoped: backlogItems.filter(card => card.lane === 'scoped').length,
      research: backlogItems.filter(card => card.lane === 'research').length,
      actionRoutesTotal: actionRouter?.totalRoutes || 0,
      actionRoutesPending: actionRouter?.pendingRoutes || 0,
      hygieneFindings: hygiene.summary?.findingCount || 0,
      hygieneCritical: hygiene.summary?.criticalFindings || 0,
      hygieneWarnings: hygiene.summary?.warningFindings || 0,
    },
    wrapperCardsBefore,
    hygiene: {
      summary: hygiene.summary,
      findings: (hygiene.findings || []).map(finding => ({
        findingKey: `${finding.type}:${finding.cardId}:${finding.issue}`,
        type: finding.type,
        severity: finding.severity,
        cardId: finding.cardId,
        lane: finding.lane,
        priority: finding.priority,
        issue: finding.issue,
        recommendedAction: finding.recommendedAction,
      })),
    },
    actionReview: {
      policy: 'Disposition-only unless a route is safe Foundation/system housekeeping with no external/business side effect. No route is auto-applied in this sprint.',
      pendingRoutes,
      byDisposition: countBy(pendingRoutes, route => route.disposition),
    },
    researchCuration: {
      policy: 'Disposition-only. No deep research, implementation, source expansion, or corpus expansion.',
      dispositions: researchDispositions,
      byDisposition: countBy(researchDispositions, item => item.disposition),
      bySubTag: countBy(researchDispositions, item => item.subTag),
    },
    phaseGReadiness: {
      finalOrder: FOUNDATION_REVIEW_SPRINT_PHASE_G_ORDER,
      notStarted: true,
      reason: 'Phase G starts only after this cleanup sprint is shipped and reviewed.',
      nextPlanCard: FOUNDATION_REVIEW_SPRINT_PHASE_G_ORDER[0],
      longParkedGateDecisions: [
        {
          cardId: 'SECURITY-002',
          decision: 'required-before-broader-hub-or-assistant-read-work',
        },
        {
          cardId: 'SYSTEM-010',
          decision: 'required-before-autonomous-runtime-or-broader-hub-work',
        },
        {
          cardId: 'EXTRACT-RETRY-001',
          decision: 'build-only-when-failed-crawl-items-justify-retry-backoff',
        },
      ],
    },
    scopeControls: {
      noPhaseGUiWork: true,
      noStrategyUi: true,
      noScoper: true,
      noAgentFactory: true,
      noCorpusExpansion: true,
      noResearchDeepDive: true,
      noBusinessActionApplyWithoutSteve: true,
    },
  }
}

function currentRouteCuration(route) {
  return route?.metadata?.foundation1100Review || null
}

function buildFindings({ artifact, backlogItems, actionRouter, hygiene }) {
  const findings = []
  const cardById = new Map((backlogItems || []).map(card => [card.id, card]))
  const routesById = new Map((actionRouter?.recentRoutes || []).map(route => [route.routeId, route]))

  if (!artifact) {
    findings.push({
      severity: 'critical',
      type: 'missing_review_sprint_artifact',
      issue: `${FOUNDATION_REVIEW_SPRINT_ARTIFACT_PATH} is missing.`,
      recommendedAction: 'Write the baseline snapshot before cleanup work and preserve it through closeout.',
    })
    return findings
  }

  if (artifact?.baseline?.counts?.backlogCards !== 289) {
    findings.push({
      severity: 'critical',
      type: 'baseline_count_drift',
      issue: `Baseline backlog count is ${artifact?.baseline?.counts?.backlogCards ?? 'missing'}, expected 289 before wrapper-card bootstrap.`,
      recommendedAction: 'Restore the original baseline snapshot or explain the count change before trusting cleanup proof.',
    })
  }

  const missingWrapperCards = FOUNDATION_REVIEW_SPRINT_CARD_IDS.filter(cardId => !cardById.has(cardId))
  if (missingWrapperCards.length) {
    findings.push({
      severity: 'critical',
      type: 'missing_wrapper_cards',
      issue: `Sprint wrapper cards are missing: ${missingWrapperCards.join(', ')}.`,
      recommendedAction: 'Create the wrapper cards with full context before cleanup work.',
    })
  }

  const notDoneWrapperCards = FOUNDATION_REVIEW_SPRINT_CARD_IDS.filter(cardId => {
    const card = cardById.get(cardId)
    return card && card.lane !== 'done'
  })
  if (notDoneWrapperCards.length) {
    findings.push({
      severity: 'critical',
      type: 'wrapper_cards_not_done',
      issue: `Sprint wrapper cards are not done: ${notDoneWrapperCards.join(', ')}.`,
      recommendedAction: 'Complete the reviewed cleanup work and move each wrapper card to done with closeout proof.',
    })
  }

  if ((hygiene?.summary?.criticalFindings || 0) !== 0) {
    findings.push({
      severity: 'critical',
      type: 'hygiene_critical_findings',
      issue: `Backlog Hygiene still reports ${hygiene.summary.criticalFindings} critical finding(s).`,
      recommendedAction: 'Resolve critical hygiene findings before closeout.',
    })
  }

  const baselineFindings = artifact?.baseline?.hygiene?.findings || []
  const currentFindingKeys = new Set((hygiene?.findings || []).map(finding => `${finding.type}:${finding.cardId}:${finding.issue}`))
  const unresolvedBaselineFindings = baselineFindings.filter(finding => currentFindingKeys.has(finding.findingKey))
  if (unresolvedBaselineFindings.length) {
    findings.push({
      severity: 'warning',
      type: 'baseline_hygiene_findings_remaining',
      issue: `${unresolvedBaselineFindings.length} original hygiene warning(s) remain unresolved.`,
      recommendedAction: 'Resolve or explicitly accept each remaining original warning with reason.',
    })
  }

  const actionDispositions = artifact?.baseline?.actionReview?.pendingRoutes || []
  if (actionDispositions.length !== 18) {
    findings.push({
      severity: 'critical',
      type: 'action_review_snapshot_count',
      issue: `Action Review baseline has ${actionDispositions.length} pending route dispositions, expected 18.`,
      recommendedAction: 'Snapshot the exact 18 pending routes before cleanup work.',
    })
  }
  const uncuratedRoutes = actionDispositions.filter(disposition => {
    const route = routesById.get(disposition.routeId)
    const curation = currentRouteCuration(route)
    return !curation || curation.closeoutKey !== FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY
  })
  if (uncuratedRoutes.length) {
    findings.push({
      severity: 'critical',
      type: 'action_routes_missing_curation_metadata',
      issue: `${uncuratedRoutes.length} snapped action route(s) lack Foundation 1100 curation metadata.`,
      recommendedAction: 'Record review metadata on every snapped route without applying business routes.',
    })
  }
  const unsafeAppliedRoutes = actionDispositions.filter(disposition => {
    const route = routesById.get(disposition.routeId)
    return route?.approvalStatus === 'applied' && disposition.applyAllowedWithoutSteve !== true
  })
  if (unsafeAppliedRoutes.length) {
    findings.push({
      severity: 'critical',
      type: 'unsafe_action_route_apply',
      issue: `${unsafeAppliedRoutes.length} business/external action route(s) were applied without explicit Steve approval.`,
      recommendedAction: 'Revert or document route-specific Steve approval before trusting Action Review cleanup.',
    })
  }

  const researchDispositions = artifact?.baseline?.researchCuration?.dispositions || []
  if (researchDispositions.length !== 102) {
    findings.push({
      severity: 'critical',
      type: 'research_disposition_count',
      issue: `Research Curation baseline has ${researchDispositions.length} dispositions, expected 102.`,
      recommendedAction: 'Snapshot and disposition all 102 research/future-build cards without deep research.',
    })
  }
  const missingResearchCards = researchDispositions.filter(disposition => !cardById.has(disposition.cardId))
  if (missingResearchCards.length) {
    findings.push({
      severity: 'critical',
      type: 'research_cards_deleted',
      issue: `${missingResearchCards.length} research/future-build card(s) from the baseline are missing.`,
      recommendedAction: 'Restore or preserve retired/merged cards; do not delete research cards in this sprint.',
    })
  }
  const disallowedResearchWork = researchDispositions.filter(disposition =>
    disposition.noDeepResearch !== true ||
      disposition.noImplementation !== true ||
      disposition.noSourceExpansion !== true
  )
  if (disallowedResearchWork.length) {
    findings.push({
      severity: 'critical',
      type: 'research_scope_violation',
      issue: `${disallowedResearchWork.length} research disposition(s) do not carry no-build/no-source-expansion proof.`,
      recommendedAction: 'Mark this sprint as disposition-only and route deeper work to later scoped investigation.',
    })
  }

  const phaseGOrder = artifact?.baseline?.phaseGReadiness?.finalOrder || []
  const phaseGOrderOk = JSON.stringify(phaseGOrder) === JSON.stringify(FOUNDATION_REVIEW_SPRINT_PHASE_G_ORDER)
  if (!phaseGOrderOk) {
    findings.push({
      severity: 'critical',
      type: 'phase_g_order_missing',
      issue: 'Final Phase G order is missing or different from the reviewed readiness order.',
      recommendedAction: 'Record the final Phase G order before closing PHASE-G-READINESS-001.',
    })
  }
  const phaseGStarted = FOUNDATION_REVIEW_SPRINT_PHASE_G_ORDER
    .map(cardId => cardById.get(cardId))
    .filter(card => card && ['executing', 'done'].includes(card.lane))
  const unapprovedPhaseGStarted = phaseGStarted.filter(card => {
    const approvedCloseout = REVIEWED_PHASE_G_PROGRESS_CLOSEOUTS[card.id]
    return !(card.lane === 'done' && approvedCloseout && String(card.statusNote || '').includes(approvedCloseout))
  })
  if (unapprovedPhaseGStarted.length) {
    findings.push({
      severity: 'critical',
      type: 'phase_g_started_inside_cleanup',
      issue: `Phase G card(s) started without separate approved closeout proof: ${unapprovedPhaseGStarted.map(card => card.id).join(', ')}.`,
      recommendedAction: 'Move Phase G work back to scoped and submit the separate Phase G plan gate.',
    })
  }

  return findings
}

export function buildFoundationReviewSprintStatus({
  artifact = null,
  backlogItems = [],
  actionRouter = {},
  hygiene = null,
} = {}) {
  const hygieneSnapshot = hygiene || buildBacklogHygieneSnapshot({
    backlogItems,
    closeouts: getFoundationBuildCloseouts(),
  })
  const findings = buildFindings({
    artifact,
    backlogItems,
    actionRouter,
    hygiene: hygieneSnapshot,
  })
  const currentRouteMap = new Map((actionRouter?.recentRoutes || []).map(route => [route.routeId, route]))
  const actionDispositions = artifact?.baseline?.actionReview?.pendingRoutes || []
  const curatedActionRoutes = actionDispositions.filter(disposition =>
    currentRouteCuration(currentRouteMap.get(disposition.routeId))?.closeoutKey === FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY
  )
  const researchDispositions = artifact?.baseline?.researchCuration?.dispositions || []

  return {
    status: findings.some(finding => finding.severity === 'critical') ? 'critical' : findings.length ? 'warning' : 'healthy',
    visibleHome: 'Foundation > Backlog > Foundation 1100 Review',
    closeoutKey: FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY,
    artifactPath: FOUNDATION_REVIEW_SPRINT_ARTIFACT_PATH,
    summary: {
      wrapperCardCount: FOUNDATION_REVIEW_SPRINT_CARD_IDS.length,
      wrapperCardsDone: FOUNDATION_REVIEW_SPRINT_CARD_IDS.filter(cardId =>
        (backlogItems || []).find(card => card.id === cardId && card.lane === 'done')
      ).length,
      baselineBacklogCards: artifact?.baseline?.counts?.backlogCards || 0,
      baselineHygieneFindings: artifact?.baseline?.hygiene?.findings?.length || 0,
      currentHygieneCritical: hygieneSnapshot.summary?.criticalFindings || 0,
      currentHygieneWarnings: hygieneSnapshot.summary?.warningFindings || 0,
      actionRoutesSnapshotted: actionDispositions.length,
      actionRoutesCurated: curatedActionRoutes.length,
      actionRoutesAppliedBySprint: actionDispositions.filter(disposition =>
        currentRouteMap.get(disposition.routeId)?.approvalStatus === 'applied'
      ).length,
      researchCardsSnapshotted: researchDispositions.length,
      researchCardsDispositionOnly: researchDispositions.filter(disposition =>
        disposition.noDeepResearch === true &&
          disposition.noImplementation === true &&
          disposition.noSourceExpansion === true
      ).length,
      phaseGOrderCount: artifact?.baseline?.phaseGReadiness?.finalOrder?.length || 0,
      findingCount: findings.length,
    },
    wrapperCards: FOUNDATION_REVIEW_SPRINT_CARD_IDS.map(cardId => {
      const card = (backlogItems || []).find(item => item.id === cardId)
      return {
        cardId,
        exists: Boolean(card),
        lane: card?.lane || null,
        priority: card?.priority || null,
      }
    }),
    actionReview: {
      policy: artifact?.baseline?.actionReview?.policy || null,
      byDisposition: artifact?.baseline?.actionReview?.byDisposition || {},
      routes: actionDispositions.map(disposition => {
        const current = currentRouteMap.get(disposition.routeId)
        return {
          ...disposition,
          currentApprovalStatus: current?.approvalStatus || null,
          curationRecorded: currentRouteCuration(current)?.closeoutKey === FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY,
        }
      }),
    },
    researchCuration: {
      policy: artifact?.baseline?.researchCuration?.policy || null,
      byDisposition: artifact?.baseline?.researchCuration?.byDisposition || {},
      bySubTag: artifact?.baseline?.researchCuration?.bySubTag || {},
      allDispositions: researchDispositions,
      sample: researchDispositions.slice(0, 12),
    },
    phaseGReadiness: artifact?.baseline?.phaseGReadiness || null,
    scopeControls: artifact?.baseline?.scopeControls || null,
    findings,
    knownLimits: [
      'This sprint is cleanup and disposition proof only. It does not start Phase G UI work.',
      'Research dispositions use existing backlog/API metadata and do not deep-research the underlying ideas.',
      'Action Review business/owner-action routes are classified and held unless Steve approves a specific route.',
    ],
  }
}

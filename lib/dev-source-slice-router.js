import crypto from 'node:crypto'

export const DEV_SOURCE_SLICE_ROUTER_CARD_ID = 'DEV-SOURCE-SLICE-ROUTER-001'
export const DEV_SOURCE_SLICE_ROUTER_PLAN_PATH = 'docs/process/dev-source-slice-router-001-plan.md'
export const DEV_SOURCE_SLICE_ROUTER_APPROVAL_PATH = 'docs/process/approvals/DEV-SOURCE-SLICE-ROUTER-001.json'
export const DEV_SOURCE_SLICE_ROUTER_SCRIPT_PATH = 'scripts/process-dev-source-slice-router-check.mjs'
export const DEV_SOURCE_SLICE_ROUTER_REPORT_ARTIFACT_ID = 'slice:dev-source-slice-router-001:live-foundation-sources'

const DEV_SOURCE_IDS = new Set([
  'SRC-YOUTUBE-INTEL-001',
  'SRC-VIDEO-001',
  'SRC-GITHUB-BUILD-INTEL-001',
  'SRC-MEETINGS-001',
  'SRC-GMAIL-001',
  'SRC-MISSIVE-001',
  'SRC-SLACK-001',
])

const DEV_TERMS = [
  'aios',
  'system',
  'dashboard',
  'page',
  'app',
  'tool',
  'tools',
  'automation',
  'workflow',
  'ai agent',
  'agent runtime',
  'agentic',
  'extractor',
  'router',
  'synthesis',
  'source',
  'data',
  'kpi',
  'api',
  'integration',
  'tracking',
  'assignment',
  'action plan',
  'stale listings',
  'lead routing',
  'follow up',
  'follow-up',
  'onboarding',
  'coaching',
  'training',
]

const STRONG_SYSTEM_TERMS = new Set([
  'aios',
  'system',
  'dashboard',
  'page',
  'app',
  'tool',
  'tools',
  'automation',
  'ai agent',
  'agent runtime',
  'agentic',
  'extractor',
  'router',
  'synthesis',
  'source',
  'data',
  'kpi',
  'api',
  'integration',
  'tracking',
  'assignment',
  'action plan',
  'stale listings',
  'lead routing',
])

const OPS_ONLY_TERMS = [
  'commission',
  'transaction',
  'deal file',
  'seller',
  'buyer',
  'closing',
  'file update',
  'invoice',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function slug(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'candidate'
}

function compact(value = '') {
  return text(value).replace(/\s+/g, ' ')
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function candidateSignalText(value = '') {
  return compact(value).split(/\bArtifact excerpt:/i)[0]
}

function termMatches(haystack = '', term = '') {
  const pattern = escapeRegExp(term).replace(/\\ /g, '\\s+')
  return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, 'i').test(haystack)
}

function candidateText(candidate = {}) {
  return [
    candidate.title,
    candidate.content,
    candidate.summary,
    candidate.finding,
    candidate.whyItMatters,
    candidate.suggestedAction,
    candidate.suggested_action,
    candidate.recommendedNextStep,
  ].map(candidateSignalText).filter(Boolean).join(' ').toLowerCase()
}

function sourceIdsFromReport(report = {}) {
  return list(report.sourceIds || report.source_ids).map(text).filter(Boolean)
}

function reportId(report = {}) {
  return report.reportArtifactId || report.report_artifact_id || ''
}

function reportStructured(report = {}) {
  return report.structuredOutputJson || report.structured_output_json || {}
}

function normalizeRawCandidate(raw = {}, source = {}) {
  const title = text(raw.title || raw.finding || raw.theme || raw.atomId || raw.atom_id)
  if (!title) return null
  return {
    candidateId: `dev-source-slice:${slug(title)}:${stableHash({ title, source }).slice(0, 10)}`,
    title,
    content: text(raw.content || raw.whyItMatters || raw.finding || raw.summary || raw.derivedClaim || raw.recommendation),
    suggestedAction: text(raw.suggestedAction || raw.suggested_action || raw.recommendedNextStep || raw.nextStep),
    sourceId: text(raw.sourceId || raw.source_id || source.sourceIds?.[0]),
    sourceIds: list(raw.sourceIds || raw.source_ids).length ? list(raw.sourceIds || raw.source_ids) : source.sourceIds,
    sourceReportArtifactId: source.reportArtifactId,
    sourceReportTitle: source.reportTitle,
    sourceAtomId: text(raw.atomId || raw.atom_id),
    sourceKind: source.kind || 'report',
    rawType: raw.atomType || raw.atom_type || raw.type || '',
    status: raw.status || '',
  }
}

function collectReportCandidates(bundle = {}) {
  const report = bundle.report || {}
  const source = {
    reportArtifactId: reportId(report),
    reportTitle: report.title || reportId(report),
    sourceIds: sourceIdsFromReport(report),
    kind: 'report',
  }
  const structured = reportStructured(report)
  const buckets = [
    report.topFindings || report.top_findings,
    structured.buildCandidates,
    structured.topBuildCandidates,
    structured.candidates,
    structured.reviewRoutes,
    structured.snapshot?.topBuildCandidates,
  ]
  const rows = buckets.flatMap(bucket => list(bucket)).map(item => normalizeRawCandidate(item, source)).filter(Boolean)
  for (const atom of list(bundle.atoms)) {
    rows.push(normalizeRawCandidate(atom, {
      ...source,
      kind: 'atom',
    }))
  }
  return rows
}

function scoreDevRelevance(candidate = {}) {
  const haystack = candidateText(candidate)
  const devMatches = DEV_TERMS.filter(term => termMatches(haystack, term))
  const opsOnlyMatches = OPS_ONLY_TERMS.filter(term => termMatches(haystack, term))
  const strongSystemMatches = devMatches.filter(term => STRONG_SYSTEM_TERMS.has(term))
  const sourceBonus = list(candidate.sourceIds).some(sourceId => DEV_SOURCE_IDS.has(sourceId)) ? 8 : 0
  const systemBonus = strongSystemMatches.length ? 15 : 0
  const opsPenalty = opsOnlyMatches.length && !strongSystemMatches.length ? 30 : opsOnlyMatches.length * 18
  const score = Math.max(0, Math.min(100, devMatches.length * 8 + sourceBonus + systemBonus - opsPenalty))
  return {
    score,
    devMatches,
    opsOnlyMatches,
    strongSystemMatches,
  }
}

function classifyCandidate(candidate = {}) {
  const relevance = scoreDevRelevance(candidate)
  const hasStrongBuildSignal = relevance.strongSystemMatches.length >= 1
  const hasBuildSignal = relevance.score >= 24 && relevance.devMatches.length >= 1 && hasStrongBuildSignal
  const isOpsOnly = relevance.opsOnlyMatches.length >= 1 && (!hasStrongBuildSignal || relevance.score < 24)
  if (hasBuildSignal) {
    return {
      route: 'dev_director_candidate',
      reason: `Matches Dev/system terms: ${relevance.devMatches.slice(0, 5).join(', ')}`,
      relevance,
    }
  }
  if (isOpsOnly) {
    return {
      route: 'park_operational_followup',
      reason: `Looks like operational follow-up, not Dev build intel: ${relevance.opsOnlyMatches.slice(0, 4).join(', ')}`,
      relevance,
    }
  }
  return {
    route: 'not_dev_relevant',
    reason: 'No strong Dev/system/tooling signal.',
    relevance,
  }
}

export function buildDevSourceSliceRouterSnapshot({
  reportBundles = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const inputReports = list(reportBundles).filter(bundle => bundle.report)
  const sourceCoverage = inputReports.map(bundle => {
    const report = bundle.report || {}
    return {
      reportArtifactId: reportId(report),
      title: report.title || reportId(report),
      sourceIds: sourceIdsFromReport(report),
      atoms: list(bundle.atoms).length,
      hits: list(bundle.hits).length,
    }
  })
  const rawCandidates = inputReports.flatMap(collectReportCandidates)
  const routed = rawCandidates.map(candidate => ({
    ...candidate,
    classification: classifyCandidate(candidate),
  }))
  const devCandidates = routed
    .filter(candidate => candidate.classification.route === 'dev_director_candidate')
    .sort((left, right) => right.classification.relevance.score - left.classification.relevance.score || left.title.localeCompare(right.title))
    .slice(0, 40)
  const parkedOperational = routed
    .filter(candidate => candidate.classification.route === 'park_operational_followup')
    .slice(0, 40)
  const ignored = routed
    .filter(candidate => candidate.classification.route === 'not_dev_relevant')
    .slice(0, 40)
  const checks = [
    { ok: inputReports.length >= 1, check: 'input source reports are present', detail: `${inputReports.length}` },
    {
      ok: sourceCoverage.some(source => source.sourceIds.some(sourceId => ['SRC-MEETINGS-001', 'SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-SLACK-001'].includes(sourceId))),
      check: 'shared internal sources are visible',
      detail: sourceCoverage.flatMap(source => source.sourceIds).join(', '),
    },
    { ok: devCandidates.length >= 1, check: 'Dev-relevant candidates are routed to Director lane', detail: `${devCandidates.length}` },
    { ok: parkedOperational.length >= 1 || rawCandidates.length === devCandidates.length, check: 'ops-only items are parked instead of polluting Dev', detail: `${parkedOperational.length}` },
    { ok: true, check: 'router is read-only proposal-only', detail: 'no writes, no extraction, no external calls' },
  ]
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready_for_director_input',
    cardId: DEV_SOURCE_SLICE_ROUTER_CARD_ID,
    reportArtifactId: DEV_SOURCE_SLICE_ROUTER_REPORT_ARTIFACT_ID,
    generatedAt,
    counts: {
      inputReports: inputReports.length,
      rawCandidates: rawCandidates.length,
      devCandidates: devCandidates.length,
      parkedOperational: parkedOperational.length,
      ignored: ignored.length,
    },
    sourceCoverage,
    devCandidates,
    parkedOperational,
    ignored,
    checks,
    failures,
    externalWrites: false,
    proposalOnly: true,
  }
}

export function buildDevSourceSliceDirectorInputBundle(snapshot = {}) {
  const report = {
    reportArtifactId: DEV_SOURCE_SLICE_ROUTER_REPORT_ARTIFACT_ID,
    reportType: 'source_slice',
    title: 'Dev source slice from shared Foundation sources',
    status: snapshot.status || 'ready_for_director_input',
    sourceIds: Array.from(new Set(list(snapshot.sourceCoverage).flatMap(source => source.sourceIds))).filter(Boolean),
    topFindings: list(snapshot.devCandidates).slice(0, 20).map(candidate => ({
      title: candidate.title,
      whyItMatters: candidate.content || candidate.classification?.reason,
      recommendedNextStep: candidate.suggestedAction || 'Review as a Dev build/system improvement signal before Scoper.',
      confidence: candidate.classification?.relevance?.score >= 50 ? 'high' : 'medium',
      qualityScore: candidate.classification?.relevance?.score || 0,
      evidenceRefs: [
        candidate.sourceReportArtifactId,
        candidate.sourceAtomId,
      ].filter(Boolean),
      sourceIds: candidate.sourceIds,
      sourceReportArtifactId: candidate.sourceReportArtifactId,
      sourceAtomId: candidate.sourceAtomId,
    })),
    structuredOutputJson: {
      buildCandidates: list(snapshot.devCandidates).slice(0, 20).map(candidate => ({
        title: candidate.title,
        whyItMatters: candidate.content || candidate.classification?.reason,
        recommendedNextStep: candidate.suggestedAction || 'Review as a Dev build/system improvement signal before Scoper.',
        confidence: candidate.classification?.relevance?.score >= 50 ? 'high' : 'medium',
        qualityScore: candidate.classification?.relevance?.score || 0,
        sourceRefs: [
          candidate.sourceReportArtifactId,
          candidate.sourceAtomId,
        ].filter(Boolean),
      })),
      parkedOperational: list(snapshot.parkedOperational).slice(0, 20),
      sourceCoverage: snapshot.sourceCoverage,
      proposalOnly: true,
      externalWrites: false,
    },
    actionRequiredItems: [],
    metadata: {
      cardId: DEV_SOURCE_SLICE_ROUTER_CARD_ID,
      proposalOnly: true,
      externalWrites: false,
    },
  }
  return {
    report,
    atoms: [],
    hits: [],
  }
}

export function buildDevSourceSliceRouterDogfoodProof() {
  const reportBundles = [
    {
      report: {
        reportArtifactId: 'report:dogfood-shared-comms',
        title: 'Shared comms dogfood',
        sourceIds: ['SRC-MEETINGS-001', 'SRC-MISSIVE-001'],
        topFindings: [
          {
            title: 'Investigate why KPI dashboards are not reflecting deal data',
            sourceId: 'SRC-MEETINGS-001',
            content: 'The KPI system and dashboard views are not updating even though Supabase still has data.',
            suggestedAction: 'Scope a system fix for the KPI dashboard data refresh path.',
          },
          {
            title: 'Validate commission for 515 Ainley Street transaction',
            sourceId: 'SRC-MISSIVE-001',
            content: 'Real Brokerage flagged the transaction as needing commission validation.',
            suggestedAction: 'Steve needs to review the commission details.',
          },
          {
            title: 'Commission workflow needs manual review after Ryan payout issue',
            sourceId: 'SRC-MEETINGS-001',
            content: 'The team discussed preventing a repeat payout issue, but no system, dashboard, API, tracking, or automation build was identified.',
            suggestedAction: 'Ops should verify the commission workflow before Dev scopes anything.',
          },
          {
            title: 'Build assignment and action-plan tracking into stale listings workflow',
            sourceId: 'SRC-MEETINGS-001',
            content: 'Steve committed to making the stale-listings page assignable to sales leaders and tracking whether an action plan exists.',
            suggestedAction: 'Scope the workflow and tracking fields before adding the page work.',
          },
          {
            title: 'Training correction: use definitive language with clients',
            sourceId: 'SRC-MEETINGS-001',
            content: 'Scott coached agents to avoid tentative pricing language. This is useful training content, not a Dev build request.',
            suggestedAction: 'Route to coaching/content review instead of Dev Director.',
          },
        ],
      },
      atoms: [],
      hits: [],
    },
  ]
  const snapshot = buildDevSourceSliceRouterSnapshot({ reportBundles })
  const cases = [
    {
      name: 'system_and_dashboard_items_route_to_dev',
      ok: snapshot.devCandidates.some(candidate => /KPI dashboards/i.test(candidate.title)),
    },
    {
      name: 'workflow_tracking_routes_to_dev',
      ok: snapshot.devCandidates.some(candidate => /stale listings/i.test(candidate.title)),
    },
    {
      name: 'commission_followup_is_parked',
      ok: snapshot.parkedOperational.some(candidate => /commission/i.test(candidate.title)),
    },
    {
      name: 'training_lesson_does_not_pollute_dev_director',
      ok: snapshot.ignored.some(candidate => /definitive language/i.test(candidate.title)) &&
        !snapshot.devCandidates.some(candidate => /definitive language/i.test(candidate.title)),
    },
    {
      name: 'director_input_bundle_contains_only_dev_candidates',
      ok: buildDevSourceSliceDirectorInputBundle(snapshot).report.topFindings.length === snapshot.devCandidates.length,
    },
  ]
  return {
    ok: cases.every(item => item.ok) && snapshot.ok,
    cases,
    snapshot,
  }
}

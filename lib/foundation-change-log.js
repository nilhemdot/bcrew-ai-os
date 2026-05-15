import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const FOUNDATION_CHANGE_LOG_SCHEMA_VERSION = 1
export const CHANGE_LOG_COMPREHENSIVE_CARD_ID = 'CHANGE-LOG-COMPREHENSIVE-001'
export const CHANGE_LOG_COMPREHENSIVE_CLOSEOUT_KEY = 'change-log-comprehensive-v1'
export const CHANGE_LOG_COMPREHENSIVE_APPROVED_PLAN_PATH = 'docs/process/approved-plans/change-log-comprehensive-v1.md'
export const CHANGE_LOG_COMPREHENSIVE_APPROVAL_PATH = 'docs/process/approvals/CHANGE-LOG-COMPREHENSIVE-001.json'
export const CHANGE_LOG_COMPREHENSIVE_BASELINE_PATH = 'docs/audits/2026-04-30-change-log-comprehensive-baseline.md'
export const CHANGE_LOG_COMPREHENSIVE_MANUAL_REVIEW_PATH = 'docs/audits/2026-04-30-change-log-comprehensive-manual-review.md'

export const CHANGE_LOG_TOTAL_MINIMUM = 40
export const CHANGE_LOG_VERIFIED_CLOSEOUT_MINIMUM = 20
export const CHANGE_LOG_REQUIRED_TYPE_MINIMUM = 8
export const CHANGE_LOG_LATEST_BUILD_MINIMUM = 5

export const CHANGE_LOG_REQUIRED_TYPES = [
  { key: 'backlog_card', label: 'Backlog / card changes' },
  { key: 'build_closeout', label: 'Build closeouts' },
  { key: 'docs_plan_state', label: 'Plan and state docs' },
  { key: 'system_inventory', label: 'System Inventory' },
  { key: 'source_contract_config', label: 'Source contract and config' },
  { key: 'verifier_gate_process', label: 'Verifier, gate, and process' },
  { key: 'ui_operator_surface', label: 'UI / operator surface' },
  { key: 'runtime_job', label: 'Runtime and jobs' },
  { key: 'decision_review', label: 'Decision / review flow' },
  { key: 'extraction_intelligence', label: 'Extraction and intelligence' },
]

const typeLabels = new Map(CHANGE_LOG_REQUIRED_TYPES.map(type => [type.key, type.label]))
const privatePathPattern = /(^|\/)(MEMORY\.md|USER\.md|IDENTITY\.md|TOOLS\.md|HEARTBEAT\.md|memory\/)/i

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)))
}

function addType(types, key) {
  if (typeLabels.has(key) && !types.includes(key)) types.push(key)
}

function compactDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function safeEvidencePath(filePath) {
  const value = normalizeText(filePath)
  if (!value) return ''
  if (privatePathPattern.test(value)) {
    const name = value.split('/').pop() || 'private-local-doc'
    return `private-local-doc:${name}:metadata-only`
  }
  return value
}

function classifySurface(typeKey, build = null, event = null) {
  if (build?.systemArea) return build.systemArea
  if (typeKey === 'build_closeout') return 'Foundation Recent Work'
  if (typeKey === 'backlog_card') return 'Foundation Backlog'
  if (typeKey === 'docs_plan_state') return 'Rebuild Plan / Current State'
  if (typeKey === 'system_inventory') return 'System Inventory'
  if (typeKey === 'source_contract_config') return 'Data Sources'
  if (typeKey === 'verifier_gate_process') return 'Foundation Gates'
  if (typeKey === 'ui_operator_surface') return 'Foundation UI'
  if (typeKey === 'runtime_job') return 'Runtime Health'
  if (typeKey === 'decision_review') return 'Decisions / Action Review'
  if (typeKey === 'extraction_intelligence') return 'Extraction / Intelligence'
  return event?.entityTable || 'Foundation'
}

function classifyBuildTypes(build = {}) {
  const types = []
  const files = normalizeList(build.files)
  const text = [
    build.subject,
    build.systemArea,
    build.whatChanged,
    build.whatItDoes,
    build.whyItMatters,
    build.reviewNext,
    normalizeList(build.whereItLives).join(' '),
    files.join(' '),
  ].join(' ').toLowerCase()

  if (build.operatorCloseout) addType(types, 'build_closeout')
  if (normalizeList(build.backlogIds).length || /\bbacklog|foundation-db|card\b/.test(text)) addType(types, 'backlog_card')
  if (files.some(file => /^docs\/rebuild\/current-(plan|state)\.md$/.test(file)) || /current plan|current state|rebuild plan/.test(text)) addType(types, 'docs_plan_state')
  if (/system inventory|inventory-docs|inventory-archive-history|doc categorization|doc authority/.test(text)) addType(types, 'system_inventory')
  if (/source-|source_|source contract|source registry|source-of-truth|connector|kpi|fub|sheets|google|owners/.test(text)) addType(types, 'source_contract_config')
  if (files.some(file => file === 'package.json' || file.startsWith('scripts/foundation-verify') || file.startsWith('scripts/process-') || file.startsWith('docs/process/approvals/') || file.startsWith('docs/process/approved-plans/') || file.startsWith('.githooks/') || file.includes('verify') || file.includes('gate')) || /verifier|foundation:verify|process:|gate|approval/.test(text)) addType(types, 'verifier_gate_process')
  if (files.some(file => file.startsWith('public/')) || /ui|operator surface|foundation >|recent work|system activity|dashboard|layout|plain-english/.test(text)) addType(types, 'ui_operator_surface')
  if (/runtime|worker|job|launchagent|foundation-jobs|foundation-worker|system-010|served-code/.test(text)) addType(types, 'runtime_job')
  if (/decision|action review|review queue|action-router|auto-emit|pending route/.test(text)) addType(types, 'decision_review')
  if (/extract|crawl|source_crawl|intelligence|retrieval|synthesis|atom|shared-comms|corpus/.test(text)) addType(types, 'extraction_intelligence')

  return types
}

function classifyChangeEventTypes(event = {}) {
  const eventType = normalizeText(event.eventType).toLowerCase()
  const entityTable = normalizeText(event.entityTable).toLowerCase()
  const text = [eventType, entityTable, event.entityId, event.summary].join(' ').toLowerCase()
  const types = []

  if (eventType.startsWith('backlog_') || entityTable.includes('backlog')) addType(types, 'backlog_card')
  if (eventType.startsWith('doc_update_') || entityTable.includes('pending_doc')) addType(types, 'docs_plan_state')
  if (eventType.startsWith('source_') || /source|connector|credential|route|llm/.test(text)) addType(types, 'source_contract_config')
  if (eventType.startsWith('job_run_') || eventType === 'foundation_job_control_updated' || /foundation_job|runtime|worker|llm_/.test(text)) addType(types, 'runtime_job')
  if (eventType.startsWith('decision_') || eventType.startsWith('review_queue_') || eventType.startsWith('intelligence_action_route_') || /decision|review|route/.test(text)) addType(types, 'decision_review')
  if (eventType.startsWith('source_crawl_') || eventType.startsWith('intelligence_') || /crawl|extraction|intelligence|retrieval|synthesis|atom/.test(text)) addType(types, 'extraction_intelligence')

  return types.length ? types : ['runtime_job']
}

function buildEvidenceRefsForBuild(build = {}, typeKey) {
  const refs = []
  if (build.shortSha) refs.push(`commit:${build.shortSha}`)
  if (build.closeoutKey) refs.push(`closeout:${build.closeoutKey}`)
  if (typeKey === 'build_closeout' && build.proofCommands?.length) refs.push(`proof:${build.proofCommands[0]}`)
  normalizeList(build.whereItLives).slice(0, 4).forEach(value => refs.push(`where:${value}`))
  normalizeList(build.files).slice(0, 8).forEach(file => refs.push(`file:${safeEvidencePath(file)}`))
  return unique(refs)
}

function buildEvidenceRefsForEvent(event = {}) {
  const refs = [
    event.id ? `change_event:${event.id}` : '',
    event.eventType ? `event_type:${event.eventType}` : '',
    event.entityTable && event.entityId ? `entity:${event.entityTable}:${event.entityId}` : '',
  ]
  return unique(refs)
}

function buildEntryFromBuild(build, typeKey) {
  const label = typeLabels.get(typeKey) || typeKey
  const sourceId = build.closeoutKey || build.shortSha || build.sha || build.subject || typeKey
  const title = typeKey === 'build_closeout'
    ? normalizeText(build.closeoutKey || build.subject || 'Build closeout')
    : `${label} · ${normalizeText(build.closeoutKey || build.subject || build.shortSha || 'Build evidence')}`
  const summary = typeKey === 'build_closeout'
    ? normalizeText(build.whatChanged || build.subject || 'Build closeout record.')
    : `Changed ${normalizeList(build.files).length || 1} repo artifact(s) tied to ${label.toLowerCase()}.`
  const occurredAt = compactDate(build.committedAt) || build.committedAt || null
  return {
    id: `build:${build.shortSha || build.sha}:${sourceId}:${typeKey}`.replace(/\s+/g, '-'),
    occurredAt,
    title,
    summary,
    changeType: typeKey,
    changeTypeLabel: label,
    surface: classifySurface(typeKey, build, null),
    sourceKind: build.operatorCloseout ? 'verified_closeout' : 'changed_file_evidence',
    sourceId,
    evidenceRefs: buildEvidenceRefsForBuild(build, typeKey),
    backlogIds: normalizeList(build.backlogIds),
    mentionedBacklogIds: normalizeList(build.mentionedBacklogIds),
    commit: build.shortSha || build.sha || null,
    closeoutKey: build.closeoutKey || null,
    files: normalizeList(build.files).map(safeEvidencePath).slice(0, 12),
    confidence: build.operatorCloseout ? 'verified' : 'file-evidence',
    highlightReason: build.operatorCloseout ? 'verified closeout' : 'changed-file evidence',
    acceptanceState: build.acceptanceState || null,
  }
}

function buildEntryFromEvent(event, typeKey) {
  const label = typeLabels.get(typeKey) || typeKey
  const occurredAt = compactDate(event.createdAt) || event.createdAt || null
  return {
    id: `event:${event.id}:${typeKey}`,
    occurredAt,
    title: normalizeText(event.summary) || `${label} event`,
    summary: `${normalizeText(event.actor || 'system')} recorded ${normalizeText(event.eventType || 'change_event')}.`,
    changeType: typeKey,
    changeTypeLabel: label,
    surface: classifySurface(typeKey, null, event),
    sourceKind: 'change_event',
    sourceId: event.id ? String(event.id) : normalizeText(event.entityId),
    evidenceRefs: buildEvidenceRefsForEvent(event),
    backlogIds: [],
    mentionedBacklogIds: [],
    commit: null,
    closeoutKey: null,
    files: [],
    confidence: 'db-event',
    highlightReason: 'DB trust-layer event',
    acceptanceState: null,
  }
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0))
}

function groupBy(entries, keyFn) {
  const groups = new Map()
  for (const entry of entries) {
    const key = keyFn(entry)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entry)
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label: key,
    count: items.length,
    latestAt: items[0]?.occurredAt || null,
    items: items.slice(0, 8),
  }))
}

function inspectOwnershipSmearing(entries) {
  return entries.filter(entry => {
    const owners = new Set(normalizeList(entry.backlogIds))
    return normalizeList(entry.mentionedBacklogIds).some(id => owners.has(id))
  })
}

function inspectPrivateEvidence(entries) {
  return entries.filter(entry =>
    [...normalizeList(entry.evidenceRefs), ...normalizeList(entry.files), entry.title, entry.summary]
      .some(value => privatePathPattern.test(String(value || '')) && !String(value || '').includes('metadata-only'))
  )
}

function buildTypeCoverage(entries, builds, changeEvents) {
  return CHANGE_LOG_REQUIRED_TYPES.map(type => {
    const entryCount = entries.filter(entry => entry.changeType === type.key).length
    const matchingCloseouts = (builds || []).filter(build => build.operatorCloseout && classifyBuildTypes(build).includes(type.key)).length
    const matchingChangeEvents = (changeEvents || []).filter(event => classifyChangeEventTypes(event).includes(type.key)).length
    const matchingFileEvidence = (builds || []).filter(build => classifyBuildTypes(build).includes(type.key)).length
    return {
      key: type.key,
      label: type.label,
      entryCount,
      evidenceAvailable: matchingCloseouts + matchingChangeEvents + matchingFileEvidence > 0,
      absenceProof: entryCount
        ? null
        : {
            noMatchingCloseout: matchingCloseouts === 0,
            noMatchingChangeEvent: matchingChangeEvents === 0,
            noMatchingChangedFileEvidence: matchingFileEvidence === 0,
            reason: 'no matching closeout; no matching change_event; no matching changed-file evidence',
          },
    }
  })
}

export function buildFoundationChangeLog({
  builds = [],
  changeEvents = [],
  limit = 100,
  generatedAt = new Date().toISOString(),
} = {}) {
  const buildEntries = []
  for (const build of builds || []) {
    for (const typeKey of classifyBuildTypes(build)) {
      buildEntries.push(buildEntryFromBuild(build, typeKey))
    }
  }

  const eventEntries = []
  for (const event of changeEvents || []) {
    for (const typeKey of classifyChangeEventTypes(event)) {
      eventEntries.push(buildEntryFromEvent(event, typeKey))
    }
  }

  const allEntries = sortEntries([...buildEntries, ...eventEntries])
  const boundedLimit = Math.min(200, Math.max(1, Number(limit) || 100))
  const latestFiveBuilds = (builds || []).slice(0, CHANGE_LOG_LATEST_BUILD_MINIMUM)

  const selected = new Map()
  const addSelected = entry => {
    if (entry && !selected.has(entry.id) && selected.size < boundedLimit) selected.set(entry.id, entry)
  }
  for (const build of latestFiveBuilds) {
    allEntries
      .filter(entry => entry.commit === build.shortSha || entry.commit === build.sha)
      .forEach(addSelected)
  }
  allEntries
    .filter(entry => entry.sourceKind === 'verified_closeout')
    .slice(0, CHANGE_LOG_VERIFIED_CLOSEOUT_MINIMUM)
    .forEach(addSelected)
  allEntries
    .filter(entry => entry.closeoutKey === CHANGE_LOG_COMPREHENSIVE_CLOSEOUT_KEY)
    .forEach(addSelected)
  for (const type of CHANGE_LOG_REQUIRED_TYPES) {
    addSelected(allEntries.find(entry => entry.changeType === type.key))
  }
  for (const entry of allEntries) addSelected(entry)
  const entries = sortEntries(Array.from(selected.values()))

  const latestBuildsRepresented = latestFiveBuilds.filter(build =>
    entries.some(entry => entry.commit === build.shortSha || entry.commit === build.sha)
  )
  const typeCoverage = buildTypeCoverage(entries, builds, changeEvents)
  const ownershipSmears = inspectOwnershipSmearing(entries)
  const privateEvidenceLeaks = inspectPrivateEvidence(entries)
  const representedTypes = typeCoverage.filter(type => type.entryCount > 0)
  const evidenceAvailableTypes = typeCoverage.filter(type => type.evidenceAvailable)
  const missingTypesWithoutProof = typeCoverage.filter(type => type.entryCount === 0 && !type.absenceProof)
  const latestCloseoutRepresented = entries.some(entry => entry.closeoutKey === CHANGE_LOG_COMPREHENSIVE_CLOSEOUT_KEY)
  const verifiedCloseoutBackedEntries = entries.filter(entry => entry.sourceKind === 'verified_closeout' && /verified/i.test(entry.acceptanceState || '')).length
  const closeoutBackedEntries = entries.filter(entry => entry.closeoutKey).length
  const highlightedEntries = entries.filter(entry => {
    if (entry.closeoutKey) return true
    if (entry.changeType === 'verifier_gate_process') return true
    if (entry.changeType === 'docs_plan_state') return true
    const ageMs = Date.now() - new Date(entry.occurredAt || 0).getTime()
    return Number.isFinite(ageMs) && ageMs <= 7 * 24 * 60 * 60 * 1000
  })

  return {
    schemaVersion: FOUNDATION_CHANGE_LOG_SCHEMA_VERSION,
    generatedAt,
    source: 'Derived from build-log closeouts, git changed-file evidence, and DB change_events. No fake history is invented.',
    requiredChangeTypes: CHANGE_LOG_REQUIRED_TYPES,
    thresholds: {
      totalEntries: CHANGE_LOG_TOTAL_MINIMUM,
      verifiedCloseoutBackedEntries: CHANGE_LOG_VERIFIED_CLOSEOUT_MINIMUM,
      representedChangeTypes: CHANGE_LOG_REQUIRED_TYPE_MINIMUM,
      latestRecentBuilds: CHANGE_LOG_LATEST_BUILD_MINIMUM,
    },
    summary: {
      totalEntries: entries.length,
      availableEvidenceEntries: allEntries.length,
      closeoutBackedEntries,
      verifiedCloseoutBackedEntries,
      representedChangeTypes: representedTypes.length,
      evidenceAvailableChangeTypes: evidenceAvailableTypes.length,
      missingChangeTypes: typeCoverage.filter(type => type.entryCount === 0).length,
      missingTypesWithoutProof: missingTypesWithoutProof.length,
      latestRecentBuildsRepresented: latestBuildsRepresented.length,
      latestChangeLogCloseoutRepresented: latestCloseoutRepresented,
      ownershipContextSmearing: ownershipSmears.length,
      privateEvidenceLeaks: privateEvidenceLeaks.length,
      highlightedEntries: highlightedEntries.length,
      changeEventEntries: eventEntries.length,
      buildEvidenceEntries: buildEntries.length,
    },
    coverage: {
      typeCoverage,
      latestRecentBuilds: latestFiveBuilds.map(build => ({
        shortSha: build.shortSha,
        subject: build.subject,
        represented: latestBuildsRepresented.some(item => item.shortSha === build.shortSha || item.sha === build.sha),
      })),
      missingTypesWithoutProof,
      ownershipSmears,
      privateEvidenceLeaks,
    },
    groups: {
      recentHighlights: highlightedEntries.slice(0, 12),
      bySurface: groupBy(entries, entry => entry.surface),
      byType: CHANGE_LOG_REQUIRED_TYPES.map(type => {
        const items = entries.filter(entry => entry.changeType === type.key)
        const coverage = typeCoverage.find(item => item.key === type.key)
        return {
          key: type.key,
          label: type.label,
          count: items.length,
          absenceProof: coverage?.absenceProof || null,
          items: items.slice(0, 8),
        }
      }),
      rawEvidence: entries,
    },
    entries,
  }
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

export async function buildChangeLogComprehensiveStatus({
  repoRoot = defaultRepoRoot,
  changeLog = null,
  changesApi = null,
  buildLog = null,
} = {}) {
  const findings = []
  const packageJson = await readOptionalText(repoRoot, 'package.json')
  const serverSource = await readOptionalText(repoRoot, 'server.js')
  const operatorRouteSource = await readOptionalText(repoRoot, 'lib/foundation-operator-routes.js')
  const routeSource = `${serverSource}\n${operatorRouteSource}`
  const foundationUi = [
    await readOptionalText(repoRoot, 'public/foundation.js'),
    await readOptionalText(repoRoot, 'public/foundation-data.js'),
    await readOptionalText(repoRoot, 'public/foundation-source-lifecycle-renderers.js'),
    await readOptionalText(repoRoot, 'public/foundation-runtime-renderers.js'),
    await readOptionalText(repoRoot, 'public/foundation-operations-renderers.js'),
  ].join('\n')
  const foundationStyles = await readOptionalText(repoRoot, 'public/styles.css')
  const approvedPlan = await readOptionalText(repoRoot, CHANGE_LOG_COMPREHENSIVE_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, CHANGE_LOG_COMPREHENSIVE_APPROVAL_PATH)
  const baseline = await readOptionalText(repoRoot, CHANGE_LOG_COMPREHENSIVE_BASELINE_PATH)
  const manualReview = await readOptionalText(repoRoot, CHANGE_LOG_COMPREHENSIVE_MANUAL_REVIEW_PATH)

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', CHANGE_LOG_COMPREHENSIVE_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', CHANGE_LOG_COMPREHENSIVE_APPROVAL_PATH)
  addFinding(findings, Boolean(baseline), 'baseline artifact exists', CHANGE_LOG_COMPREHENSIVE_BASELINE_PATH)
  addFinding(findings, Boolean(manualReview), 'manual review artifact exists', CHANGE_LOG_COMPREHENSIVE_MANUAL_REVIEW_PATH)

  addFinding(findings, approvedPlan.includes('40+ changelog entries total'), 'approved plan records 40+ entry threshold', '40+ entries')
  addFinding(findings, approvedPlan.includes('20+ verified closeout-backed entries'), 'approved plan records verified closeout threshold', '20+ verified closeout-backed')
  addFinding(findings, approvedPlan.includes('at least 8 of the 10 required change types'), 'approved plan records type coverage threshold', '8/10 types')
  addFinding(findings, approvedPlan.includes('/api/foundation/changes keeps its existing shape'), 'approved plan protects old changes API', '/api/foundation/changes')
  addFinding(findings, approvedPlan.includes('Private/local docs may appear only as metadata/classification'), 'approved plan protects private/local content', 'metadata only')

  addFinding(findings, packageJson.includes('"process:change-log-comprehensive-check"'), 'package script exists', 'process:change-log-comprehensive-check')
  addFinding(findings, routeSource.includes("app.get('/api/foundation/change-log'"), 'new change-log API route exists', '/api/foundation/change-log')
  addFinding(findings, routeSource.includes("app.get('/api/foundation/changes'"), 'old changes API route remains present', '/api/foundation/changes')
  addFinding(findings, foundationUi.includes('fetchFoundationChangeLog'), 'System Activity fetches comprehensive changelog API', 'fetchFoundationChangeLog')
  addFinding(findings, foundationUi.includes('renderChangeLogHighlights'), 'recent highlights renderer exists', 'renderChangeLogHighlights')
  addFinding(findings, foundationUi.includes('renderChangeLogSurfaceGroups'), 'by-surface renderer exists', 'renderChangeLogSurfaceGroups')
  addFinding(findings, foundationUi.includes('renderChangeLogTypeGroups'), 'by-type renderer exists', 'renderChangeLogTypeGroups')
  addFinding(findings, foundationUi.includes('renderChangeLogRawEvidence'), 'raw evidence renderer exists', 'renderChangeLogRawEvidence')
  addFinding(findings, foundationUi.includes('Owning cards') && foundationUi.includes('Context cards'), 'UI labels owner and context cards separately', 'owner/context labels')
  addFinding(findings, foundationStyles.includes('.change-log-summary-grid'), 'changelog summary styles exist', '.change-log-summary-grid')
  addFinding(findings, foundationStyles.includes('.change-log-evidence-list'), 'evidence styles exist', '.change-log-evidence-list')

  addFinding(findings, baseline.includes('Baseline source: 95e47e7'), 'baseline records starting commit', '95e47e7')
  addFinding(findings, baseline.includes('Existing closeout-backed entries available'), 'baseline records closeout evidence count', 'closeout evidence')
  addFinding(findings, baseline.includes('Existing change_events available'), 'baseline records DB event evidence count', 'change_events')

  for (const phrase of [
    'Failures: 0',
    'recent highlights visible',
    'by-surface grouping visible',
    'by-type grouping visible',
    'raw evidence feed visible',
    'evidence refs inspectable',
    'ownership/context separation visible',
    'desktop 1440x900',
    'mobile 390x844',
    'no horizontal overflow',
    'no overlapping text',
  ]) {
    addFinding(findings, manualReview.toLowerCase().includes(phrase.toLowerCase()), `manual review covers ${phrase}`, phrase)
  }

  if (changeLog) {
    const summary = changeLog.summary || {}
    const thresholdTotalOk = summary.totalEntries >= CHANGE_LOG_TOTAL_MINIMUM ||
      (summary.totalEntries === summary.availableEvidenceEntries && summary.availableEvidenceEntries < CHANGE_LOG_TOTAL_MINIMUM)
    const representedThreshold = Math.min(CHANGE_LOG_REQUIRED_TYPE_MINIMUM, summary.evidenceAvailableChangeTypes || CHANGE_LOG_REQUIRED_TYPE_MINIMUM)
    addFinding(findings, changeLog.schemaVersion === FOUNDATION_CHANGE_LOG_SCHEMA_VERSION, 'change-log API schema version is current', String(changeLog.schemaVersion || 'missing'))
    addFinding(findings, thresholdTotalOk, 'change-log has 40+ entries or all available evidence', `${summary.totalEntries || 0}/${summary.availableEvidenceEntries || 0}`)
    addFinding(findings, summary.verifiedCloseoutBackedEntries >= CHANGE_LOG_VERIFIED_CLOSEOUT_MINIMUM, '20+ verified closeout-backed entries', String(summary.verifiedCloseoutBackedEntries || 0))
    addFinding(findings, summary.representedChangeTypes >= representedThreshold, 'at least 8 required change types represented unless absent', `${summary.representedChangeTypes || 0}/${summary.evidenceAvailableChangeTypes || 0}`)
    addFinding(findings, summary.latestRecentBuildsRepresented >= CHANGE_LOG_LATEST_BUILD_MINIMUM, 'latest 5 Recent Builds represented', String(summary.latestRecentBuildsRepresented || 0))
    addFinding(findings, summary.latestChangeLogCloseoutRepresented === true, 'CHANGE-LOG-COMPREHENSIVE-001 closeout represented', String(summary.latestChangeLogCloseoutRepresented))
    addFinding(findings, summary.ownershipContextSmearing === 0, 'zero ownership/context smearing', String(summary.ownershipContextSmearing || 0))
    addFinding(findings, summary.missingTypesWithoutProof === 0, 'no silent missing categories', String(summary.missingTypesWithoutProof || 0))
    addFinding(findings, summary.privateEvidenceLeaks === 0, 'no private/local file content in changelog entries', String(summary.privateEvidenceLeaks || 0))
    addFinding(findings, Array.isArray(changeLog.groups?.recentHighlights) && changeLog.groups.recentHighlights.length > 0, 'recent highlights group exists', String(changeLog.groups?.recentHighlights?.length || 0))
    addFinding(findings, Array.isArray(changeLog.groups?.bySurface) && changeLog.groups.bySurface.length > 0, 'by-surface grouping exists', String(changeLog.groups?.bySurface?.length || 0))
    addFinding(findings, Array.isArray(changeLog.groups?.byType) && changeLog.groups.byType.length === CHANGE_LOG_REQUIRED_TYPES.length, 'by-type grouping includes all required types', String(changeLog.groups?.byType?.length || 0))
    addFinding(findings, Array.isArray(changeLog.groups?.rawEvidence) && changeLog.groups.rawEvidence.length === summary.totalEntries, 'raw evidence feed exists', String(changeLog.groups?.rawEvidence?.length || 0))
  }

  if (changesApi) {
    const first = Array.isArray(changesApi.changes) ? changesApi.changes[0] : null
    addFinding(findings, Array.isArray(changesApi.changes), '/api/foundation/changes keeps changes array', typeof changesApi.changes)
    if (first) {
      addFinding(
        findings,
        ['id', 'eventType', 'entityTable', 'entityId', 'actor', 'summary', 'metadata', 'createdAt'].every(key => Object.prototype.hasOwnProperty.call(first, key)),
        '/api/foundation/changes keeps existing event shape',
        Object.keys(first).join(','),
      )
    }
  }

  if (buildLog) {
    const latestFive = (buildLog.builds || []).slice(0, CHANGE_LOG_LATEST_BUILD_MINIMUM)
    addFinding(findings, latestFive.length === CHANGE_LOG_LATEST_BUILD_MINIMUM, 'build-log exposes latest 5 Recent Builds', String(latestFive.length))
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: CHANGE_LOG_COMPREHENSIVE_CARD_ID,
    closeoutKey: CHANGE_LOG_COMPREHENSIVE_CLOSEOUT_KEY,
    summary: changeLog?.summary || {},
    findings,
  }
}

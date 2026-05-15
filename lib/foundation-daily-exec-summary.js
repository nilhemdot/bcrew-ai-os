import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const FOUNDATION_DAILY_EXEC_SUMMARY_SCHEMA_VERSION = 1
export const DAILY_EXEC_SUMMARY_CARD_ID = 'DAILY-EXEC-SUMMARY-001'
export const DAILY_EXEC_SUMMARY_CLOSEOUT_KEY = 'daily-exec-summary-v1'
export const DAILY_EXEC_SUMMARY_ROUTE = '/foundation#daily-summary'
export const DAILY_EXEC_SUMMARY_API_PATH = '/api/foundation/daily-summary'
export const DAILY_EXEC_SUMMARY_APPROVED_PLAN_PATH = 'docs/process/approved-plans/daily-exec-summary-v1.md'
export const DAILY_EXEC_SUMMARY_APPROVAL_PATH = 'docs/process/approvals/DAILY-EXEC-SUMMARY-001.json'
export const DAILY_EXEC_SUMMARY_BASELINE_PATH = 'docs/audits/2026-04-30-daily-exec-summary-baseline.md'
export const DAILY_EXEC_SUMMARY_MANUAL_REVIEW_PATH = 'docs/audits/2026-04-30-daily-exec-summary-manual-review.md'
export const DAILY_EXEC_SUMMARY_TIMEZONE = 'America/Toronto'
export const DAILY_EXEC_SUMMARY_LATEST_BUILD_MINIMUM = 5
const DAILY_EXEC_SUMMARY_PHASE_G_COMPLETION_CARD_ID = 'SOURCE-LIFECYCLE-EXPANSION-001'
const DAILY_EXEC_SUMMARY_PHASE_G_COMPLETION_CLOSEOUT_KEY = 'source-lifecycle-expansion-v1'

const privatePathPattern = /(^|\/)(MEMORY\.md|USER\.md|IDENTITY\.md|TOOLS\.md|HEARTBEAT\.md|memory\/)/i
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/
const sectionKeys = [
  'whereWeStarted',
  'whatChanged',
  'whatShipped',
  'whatRemains',
  'whatWeLearned',
  'whatIsNext',
  'proof',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)))
}

function uniqueBy(values, getKey) {
  const seen = new Set()
  const result = []
  for (const value of values || []) {
    const key = getKey(value)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

function parseLimit(value, fallback, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(1, Math.floor(parsed)))
}

function dayKeyFor(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_EXEC_SUMMARY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}`
}

function dayKeyToUtcNoon(dayKey) {
  if (!dateKeyPattern.test(dayKey)) return new Date()
  return new Date(`${dayKey}T12:00:00Z`)
}

function shiftDayKey(dayKey, offsetDays) {
  const date = dayKeyToUtcNoon(dayKey)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function normalizeSelectedDate(value, generatedAt) {
  const raw = normalizeText(value)
  if (dateKeyPattern.test(raw)) return raw
  return dayKeyFor(generatedAt || new Date())
}

function evidenceRefForBuild(build = {}) {
  const refs = []
  if (build.shortSha) refs.push(`commit:${build.shortSha}`)
  if (build.closeoutKey) refs.push(`closeout:${build.closeoutKey}`)
  normalizeList(build.backlogIds).forEach(id => refs.push(`card:${id}`))
  normalizeList(build.proofCommands).slice(0, 3).forEach(command => refs.push(`proof:${command}`))
  return unique(refs)
}

function safeEvidenceRef(ref) {
  const value = normalizeText(ref)
  if (!value) return ''
  if (privatePathPattern.test(value)) {
    const name = value.split('/').pop() || 'private-local-doc'
    return `private-local-doc:${name}:metadata-only`
  }
  return value
}

function buildSection({ key, title, summary, items = [], evidenceRefs = [] }) {
  const itemRefs = items.flatMap(item => normalizeList(item.evidenceRefs))
  return {
    key,
    title,
    summary,
    itemCount: items.length,
    evidenceRefs: unique([...evidenceRefs, ...itemRefs].map(safeEvidenceRef)),
    items,
  }
}

function buildEmptySection(key, title, summary, refs) {
  return buildSection({
    key,
    title,
    summary,
    evidenceRefs: refs,
  })
}

function inspectPrivateEvidence(days = []) {
  const evidence = JSON.stringify(days.flatMap(day =>
    sectionKeys.flatMap(key => day.sections?.[key]?.evidenceRefs || [])
  ))
  return privatePathPattern.test(evidence) && !/metadata-only/.test(evidence) ? 1 : 0
}

function inspectOwnershipSmearing(builds = [], changeEntries = []) {
  const rows = [
    ...builds.map(build => ({
      backlogIds: build.backlogIds,
      mentionedBacklogIds: build.mentionedBacklogIds,
    })),
    ...changeEntries.map(entry => ({
      backlogIds: entry.backlogIds,
      mentionedBacklogIds: entry.mentionedBacklogIds,
    })),
  ]
  return rows.filter(row => {
    const owners = new Set(normalizeList(row.backlogIds))
    return normalizeList(row.mentionedBacklogIds).some(id => owners.has(id))
  }).length
}

function makeBuildItem(build) {
  return {
    closeoutKey: build.closeoutKey || null,
    subject: build.subject || build.whatChanged || 'Foundation build',
    occurredAt: build.committedAt || null,
    owningCards: normalizeList(build.backlogIds),
    contextCards: normalizeList(build.mentionedBacklogIds),
    reviewNext: build.reviewNext || '',
    proofStatus: build.proofStatus || '',
    knownLimits: normalizeList(build.knownLimits),
    evidenceRefs: evidenceRefForBuild(build),
  }
}

function makeChangeItem(entry) {
  return {
    id: entry.id,
    title: entry.title || entry.summary || 'Foundation change',
    summary: entry.summary || '',
    changeType: entry.changeType,
    changeTypeLabel: entry.changeTypeLabel || entry.changeType,
    surface: entry.surface || 'Foundation',
    occurredAt: entry.occurredAt || null,
    owningCards: normalizeList(entry.backlogIds),
    contextCards: normalizeList(entry.mentionedBacklogIds),
    evidenceRefs: normalizeList(entry.evidenceRefs).map(safeEvidenceRef),
  }
}

function dedupeChangeEntries(entries = []) {
  return uniqueBy(entries, entry => {
    const evidenceRefs = normalizeList(entry.evidenceRefs)
    const changeEventRef = evidenceRefs.find(ref => /^change_event:/i.test(ref))
    const entityRef = evidenceRefs.find(ref => /^entity:/i.test(ref))
    if (changeEventRef) return changeEventRef
    return [
      entry.id,
      entityRef,
      entry.occurredAt,
      entry.title,
    ].filter(Boolean).join('::')
  })
}

function buildOpenCardItems({ foundationHub = {}, selectedDateIsToday = false }) {
  const phaseOrder = normalizeList(foundationHub.foundation1100Review?.phaseGReadiness?.finalOrder)
  const cards = normalizeList(foundationHub.backlogItems)
  const phaseOpen = phaseOrder
    .map(id => cards.find(card => card.id === id))
    .filter(card => card && card.lane !== 'done')
  const nextPlanCard = foundationHub.foundation1100Review?.phaseGReadiness?.nextPlanCard
  const nextCard = cards.find(card => card.id === nextPlanCard)
  const selected = unique([
    ...(nextCard ? [nextCard] : []),
    ...phaseOpen,
  ].map(card => card.id))
    .map(id => cards.find(card => card.id === id))
    .filter(Boolean)
  if (!selectedDateIsToday) return []
  return selected.map(card => ({
    cardId: card.id,
    title: card.title,
    lane: card.lane,
    priority: card.priority,
    nextAction: card.nextAction || '',
    evidenceRefs: ['api:/api/foundation-hub', `card:${card.id}`],
  }))
}

function previousBuildBeforeDay(builds = [], dayKey) {
  const targetTime = new Date(`${dayKey}T00:00:00-04:00`).getTime()
  return builds.find(build => {
    const time = new Date(build.committedAt || 0).getTime()
    return Number.isFinite(time) && time < targetTime
  }) || null
}

function lastBuildForDay(builds = []) {
  return builds[0] || null
}

function buildDaySummary({
  dayKey,
  selectedDate,
  builds = [],
  changeEntries = [],
  allBuilds = [],
  foundationHub = {},
  currentPlanText = '',
  currentStateText = '',
}) {
  const selectedDateIsToday = dayKey === selectedDate && dayKey === dayKeyFor(new Date())
  const previousBuild = previousBuildBeforeDay(allBuilds, dayKey)
  const latestDayBuild = lastBuildForDay(builds)
  const buildItems = builds.map(makeBuildItem)
  const changeItems = changeEntries.map(makeChangeItem)
  const openItems = buildOpenCardItems({ foundationHub, selectedDateIsToday })
  const needsReviewItems = buildItems
    .filter(item => /review/i.test(item.reviewNext || ''))
    .map(item => ({
      closeoutKey: item.closeoutKey,
      reviewNext: item.reviewNext,
      owningCards: item.owningCards,
      evidenceRefs: item.evidenceRefs,
    }))
  const lessons = buildItems.flatMap(item => {
    const limitItems = normalizeList(item.knownLimits).slice(0, 3).map(limit => ({
      source: item.closeoutKey,
      lesson: limit,
      kind: 'known-limit',
      evidenceRefs: item.evidenceRefs,
    }))
    const proofItem = item.proofStatus
      ? [{
          source: item.closeoutKey,
          lesson: item.proofStatus,
          kind: 'proof-status',
          evidenceRefs: item.evidenceRefs,
        }]
      : []
    return [...limitItems, ...proofItem]
  })
  const currentNextCard = foundationHub.foundation1100Review?.phaseGReadiness?.nextPlanCard || ''
  const nextBuild = currentNextCard ||
    latestDayBuild?.reviewNext ||
    'No source-backed next card found.'

  const baselineRefs = previousBuild
    ? evidenceRefForBuild(previousBuild)
    : ['doc:docs/rebuild/current-plan.md', 'doc:docs/rebuild/current-state.md']

  return {
    date: dayKey,
    hasEvidence: builds.length > 0 || changeEntries.length > 0,
    counts: {
      shipped: buildItems.length,
      changes: changeItems.length,
      stillOpen: openItems.length,
      needsReview: needsReviewItems.length,
      lessons: lessons.length,
    },
    sections: {
      whereWeStarted: previousBuild
        ? buildSection({
            key: 'whereWeStarted',
            title: `Started after ${previousBuild.closeoutKey || previousBuild.shortSha}`,
            summary: previousBuild.reviewNext || previousBuild.proofStatus || 'Previous verified closeout is the dated baseline.',
            evidenceRefs: baselineRefs,
          })
        : buildSection({
            key: 'whereWeStarted',
            title: 'Started from current plan and current state',
            summary: currentPlanText && currentStateText
              ? 'The dated baseline comes from current plan/current state and live Foundation backlog truth.'
              : 'No prior build closeout was available for this date; current plan/state evidence is used when present.',
            evidenceRefs: baselineRefs,
          }),
      whatChanged: changeItems.length
        ? buildSection({
            key: 'whatChanged',
            title: 'What changed',
            summary: `${changeItems.length} source-backed changelog row(s) are dated ${dayKey}.`,
            items: changeItems.slice(0, 20),
            evidenceRefs: ['api:/api/foundation/change-log'],
          })
        : buildEmptySection('whatChanged', 'What changed', 'No source-backed changelog rows found for this date.', ['api:/api/foundation/change-log']),
      whatShipped: buildItems.length
        ? buildSection({
            key: 'whatShipped',
            title: 'What shipped',
            summary: `${buildItems.length} verified build closeout(s) shipped on ${dayKey}.`,
            items: buildItems,
            evidenceRefs: ['api:/api/foundation/build-log'],
          })
        : buildEmptySection('whatShipped', 'What shipped', 'No verified build closeouts found for this date.', ['api:/api/foundation/build-log']),
      whatRemains: openItems.length
        ? buildSection({
            key: 'whatRemains',
            title: 'What remains',
            summary: 'Still-open work is pulled from live Foundation backlog truth for the selected current day.',
            items: openItems,
            evidenceRefs: ['api:/api/foundation-hub'],
          })
        : buildSection({
            key: 'whatRemains',
            title: 'What remains',
            summary: latestDayBuild?.knownLimits?.length
              ? 'Remaining limits are recorded by the dated closeout(s).'
              : 'No current-day open Foundation cards were added to this dated summary.',
            items: buildItems.flatMap(item => normalizeList(item.knownLimits).map(limit => ({
              source: item.closeoutKey,
              remaining: limit,
              evidenceRefs: item.evidenceRefs,
            }))),
            evidenceRefs: buildItems.flatMap(item => item.evidenceRefs).length
              ? buildItems.flatMap(item => item.evidenceRefs)
              : ['api:/api/foundation-hub'],
          }),
      whatWeLearned: lessons.length
        ? buildSection({
            key: 'whatWeLearned',
            title: 'What we learned',
            summary: 'Lessons are copied only from known limits and proof status recorded in closeouts.',
            items: lessons.slice(0, 16),
          })
        : buildEmptySection('whatWeLearned', 'What we learned', 'No closeout known-limit or proof-status evidence found for this date.', ['api:/api/foundation/build-log']),
      whatIsNext: buildSection({
        key: 'whatIsNext',
        title: 'What is next',
        summary: nextBuild,
        items: currentNextCard
          ? [{
              nextCard: currentNextCard,
              evidenceRefs: ['api:/api/foundation-hub', `card:${currentNextCard}`],
            }]
          : [],
        evidenceRefs: latestDayBuild ? evidenceRefForBuild(latestDayBuild) : ['api:/api/foundation-hub'],
      }),
      proof: buildItems.length
        ? buildSection({
            key: 'proof',
            title: 'Proof',
            summary: 'Proof commands and closeout evidence recorded for the dated shipped builds.',
            items: buildItems.map(item => ({
              closeoutKey: item.closeoutKey,
              proofStatus: item.proofStatus,
              evidenceRefs: item.evidenceRefs,
            })),
          })
        : buildEmptySection('proof', 'Proof', 'No dated proof commands found because no build closeouts matched this day.', ['api:/api/foundation/build-log']),
    },
    buckets: {
      shippedToday: buildItems,
      stillOpen: openItems,
      needsReview: needsReviewItems,
      nextBuild: currentNextCard
        ? [{
            cardId: currentNextCard,
            evidenceRefs: ['api:/api/foundation-hub', `card:${currentNextCard}`],
          }]
        : [],
    },
  }
}

function allSectionEvidencePresent(day) {
  return sectionKeys.every(key => normalizeList(day.sections?.[key]?.evidenceRefs).length > 0)
}

export function buildFoundationDailyExecSummary({
  selectedDate,
  days = 7,
  builds = [],
  changeLog = null,
  foundationHub = {},
  currentPlanText = '',
  currentStateText = '',
  generatedAt = new Date().toISOString(),
} = {}) {
  const normalizedDate = normalizeSelectedDate(selectedDate, generatedAt)
  const boundedDays = parseLimit(days, 7, 14)
  const dayKeys = Array.from({ length: boundedDays }, (_value, index) => shiftDayKey(normalizedDate, -index))
  const sortedBuilds = [...(builds || [])].sort((a, b) => new Date(b.committedAt || 0) - new Date(a.committedAt || 0))
  const changeEntries = dedupeChangeEntries(normalizeList(changeLog?.entries))
  const summaries = dayKeys.map(dayKey => {
    const buildsForDay = sortedBuilds.filter(build => dayKeyFor(build.committedAt) === dayKey)
    const changesForDay = changeEntries.filter(entry => dayKeyFor(entry.occurredAt) === dayKey)
    return buildDaySummary({
      dayKey,
      selectedDate: normalizedDate,
      builds: buildsForDay,
      changeEntries: changesForDay,
      allBuilds: sortedBuilds,
      foundationHub,
      currentPlanText,
      currentStateText,
    })
  })
  const selectedDay = summaries[0]
  const latestBuildsAsOfSelectedDate = sortedBuilds.filter(build => {
    const buildDay = dayKeyFor(build.committedAt)
    return buildDay && buildDay <= normalizedDate
  })
  const latestFiveBuilds = latestBuildsAsOfSelectedDate.slice(0, DAILY_EXEC_SUMMARY_LATEST_BUILD_MINIMUM)
  const representedBuilds = latestFiveBuilds.filter(build =>
    summaries.some(day => day.buckets.shippedToday.some(item => item.closeoutKey === build.closeoutKey || item.occurredAt === build.committedAt))
  )
  const allBuildItems = summaries.flatMap(day => day.buckets.shippedToday)
  const allChangeItems = summaries.flatMap(day => day.sections.whatChanged.items || [])
  const privateEvidenceLeaks = inspectPrivateEvidence(summaries)
  const ownershipContextSmearing = inspectOwnershipSmearing(allBuildItems, allChangeItems)
  const latestDailyCloseoutRepresented = allBuildItems.some(item => item.closeoutKey === DAILY_EXEC_SUMMARY_CLOSEOUT_KEY)

  return {
    schemaVersion: FOUNDATION_DAILY_EXEC_SUMMARY_SCHEMA_VERSION,
    generatedAt,
    source: 'Source-backed daily executive summary derived from Recent Work, comprehensive changelog, current plan/state, live backlog status, action/research summaries, and recorded verifier proof. No narrative is generated without evidence refs.',
    query: {
      selectedDate: normalizedDate,
      days: boundedDays,
      timezone: DAILY_EXEC_SUMMARY_TIMEZONE,
    },
    summary: {
      selectedDate: normalizedDate,
      dayCount: summaries.length,
      evidenceDayCount: summaries.filter(day => day.hasEvidence).length,
      selectedDateHasEvidence: selectedDay?.hasEvidence || false,
      shippedTodayCount: selectedDay?.buckets.shippedToday.length || 0,
      stillOpenCount: selectedDay?.buckets.stillOpen.length || 0,
      needsReviewCount: selectedDay?.buckets.needsReview.length || 0,
      nextBuildCount: selectedDay?.buckets.nextBuild.length || 0,
      sectionEvidenceComplete: summaries.every(allSectionEvidencePresent),
      latestRecentBuildsRepresented: representedBuilds.length,
      latestDailyCloseoutRepresented,
      ownershipContextSmearing,
      privateEvidenceLeaks,
      actionRoutesCurated: foundationHub.foundation1100Review?.summary?.actionRoutesCurated || 0,
      researchCardsDispositionOnly: foundationHub.researchCuration?.summary?.foundation1100DispositionOnly || 0,
      currentBacklogCards: normalizeList(foundationHub.backlogItems).length,
    },
    recentDays: summaries.map(day => ({
      date: day.date,
      hasEvidence: day.hasEvidence,
      shipped: day.counts.shipped,
      changes: day.counts.changes,
      needsReview: day.counts.needsReview,
    })),
    days: summaries,
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

export async function buildDailyExecSummaryStatus({
  repoRoot = defaultRepoRoot,
  dailySummary = null,
  buildLog = null,
  changeLog = null,
  changesApi = null,
  foundationHub = null,
} = {}) {
  const findings = []
  const packageJson = await readOptionalText(repoRoot, 'package.json')
  const serverSource = await readOptionalText(repoRoot, 'server.js')
  const operatorRouteSource = await readOptionalText(repoRoot, 'lib/foundation-operator-routes.js')
  const routeSource = `${serverSource}\n${operatorRouteSource}`
  const foundationHtml = await readOptionalText(repoRoot, 'public/foundation.html')
  const foundationUi = await readOptionalText(repoRoot, 'public/foundation.js')
  const foundationData = await readOptionalText(repoRoot, 'public/foundation-data.js')
  const foundationRuntime = await readOptionalText(repoRoot, 'public/foundation-runtime-renderers.js')
  const foundationOperations = await readOptionalText(repoRoot, 'public/foundation-operations-renderers.js')
  const foundationFrontend = `${foundationUi}\n${foundationData}\n${foundationRuntime}\n${foundationOperations}`
  const foundationStyles = await readOptionalText(repoRoot, 'public/styles.css')
  const approvedPlan = await readOptionalText(repoRoot, DAILY_EXEC_SUMMARY_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, DAILY_EXEC_SUMMARY_APPROVAL_PATH)
  const baseline = await readOptionalText(repoRoot, DAILY_EXEC_SUMMARY_BASELINE_PATH)
  const manualReview = await readOptionalText(repoRoot, DAILY_EXEC_SUMMARY_MANUAL_REVIEW_PATH)

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', DAILY_EXEC_SUMMARY_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', DAILY_EXEC_SUMMARY_APPROVAL_PATH)
  addFinding(findings, Boolean(baseline), 'baseline artifact exists', DAILY_EXEC_SUMMARY_BASELINE_PATH)
  addFinding(findings, Boolean(manualReview), 'manual review artifact exists', DAILY_EXEC_SUMMARY_MANUAL_REVIEW_PATH)
  addFinding(findings, approvedPlan.includes('source-backed inputs only'), 'approved plan records source-backed input boundary', 'source-backed inputs only')
  addFinding(findings, approvedPlan.includes('No generated narrative without evidence'), 'approved plan blocks unsupported narrative', 'No generated narrative without evidence')
  addFinding(findings, approvedPlan.includes('Every summary section must carry evidence refs'), 'approved plan requires evidence refs per section', 'evidence refs')
  addFinding(findings, approvedPlan.includes('No private/local file content copied'), 'approved plan records privacy boundary', 'private/local')
  addFinding(findings, packageJson.includes('"process:daily-exec-summary-check"'), 'package script exists', 'process:daily-exec-summary-check')
  addFinding(findings, routeSource.includes("app.get('/api/foundation/daily-summary'"), 'daily summary API route exists', DAILY_EXEC_SUMMARY_API_PATH)
  addFinding(findings, foundationHtml.includes('data-section="daily-summary"'), 'Foundation nav exposes Daily Summary route', DAILY_EXEC_SUMMARY_ROUTE)
  addFinding(findings, foundationFrontend.includes('fetchFoundationDailySummary'), 'UI fetches daily summary API', 'fetchFoundationDailySummary')
  addFinding(findings, foundationFrontend.includes('renderDailySummary'), 'daily summary renderer exists', 'renderDailySummary')
  addFinding(findings, foundationFrontend.includes('data-daily-summary-section'), 'daily summary UI carries section proof selectors', 'data-daily-summary-section')
  addFinding(findings, foundationStyles.includes('.daily-summary'), 'daily summary styles exist', '.daily-summary')
  addFinding(findings, baseline.includes('Baseline source: 289dc62'), 'baseline records starting commit', '289dc62')
  addFinding(findings, baseline.includes('Closeout-backed builds available'), 'baseline records build evidence', 'build evidence')
  addFinding(findings, baseline.includes('Changelog entries available'), 'baseline records changelog evidence', 'change-log evidence')

  for (const phrase of [
    'Failures: 0',
    'selected date',
    'recent-day selector/list',
    'where we started',
    'what changed',
    'what shipped',
    'what remains',
    'what we learned',
    'what is next',
    'proof/evidence refs',
    'desktop 1440x900',
    'mobile 390x844',
    'no horizontal overflow',
    'no overlapping text',
  ]) {
    addFinding(findings, manualReview.toLowerCase().includes(phrase.toLowerCase()), `manual review covers ${phrase}`, phrase)
  }

  const phaseGReadiness = foundationHub?.foundation1100Review?.phaseGReadiness || {}
  const phaseGCompletionCard = normalizeList(foundationHub?.backlogItems).find(card => card.id === DAILY_EXEC_SUMMARY_PHASE_G_COMPLETION_CARD_ID)
  const phaseGTrack2Complete = !phaseGReadiness.nextPlanCard &&
    phaseGCompletionCard?.lane === 'done' &&
    new RegExp(DAILY_EXEC_SUMMARY_PHASE_G_COMPLETION_CLOSEOUT_KEY).test(phaseGCompletionCard?.statusNote || '')

  if (dailySummary) {
    const summary = dailySummary.summary || {}
    const selectedDay = dailySummary.days?.[0]
    addFinding(findings, dailySummary.schemaVersion === FOUNDATION_DAILY_EXEC_SUMMARY_SCHEMA_VERSION, 'daily summary API schema version is current', String(dailySummary.schemaVersion || 'missing'))
    addFinding(findings, dailySummary.query?.selectedDate === '2026-04-30', 'daily summary selected date is date-scoped', dailySummary.query?.selectedDate || 'missing')
    addFinding(findings, summary.selectedDateHasEvidence === true, 'selected date has source-backed evidence', String(summary.selectedDateHasEvidence))
    addFinding(findings, summary.sectionEvidenceComplete === true, 'every summary section has evidence refs', String(summary.sectionEvidenceComplete))
    addFinding(findings, summary.latestRecentBuildsRepresented >= DAILY_EXEC_SUMMARY_LATEST_BUILD_MINIMUM, 'latest 5 Recent Builds represented', String(summary.latestRecentBuildsRepresented || 0))
    addFinding(findings, summary.latestDailyCloseoutRepresented === true, 'DAILY-EXEC-SUMMARY-001 closeout represented after ship', String(summary.latestDailyCloseoutRepresented))
    addFinding(findings, summary.shippedTodayCount > 0, 'shipped today bucket is populated', String(summary.shippedTodayCount || 0))
    addFinding(
      findings,
      summary.stillOpenCount > 0 || phaseGTrack2Complete,
      'still open bucket is separate and populated',
      summary.stillOpenCount > 0 ? String(summary.stillOpenCount) : '0 / phase-g-track-2-complete',
    )
    addFinding(findings, summary.needsReviewCount > 0, 'needs review bucket is separate and populated', String(summary.needsReviewCount || 0))
    addFinding(
      findings,
      summary.nextBuildCount > 0 || phaseGTrack2Complete,
      'next build bucket is separate and populated',
      summary.nextBuildCount > 0 ? String(summary.nextBuildCount) : '0 / phase-g-track-2-complete',
    )
    addFinding(findings, summary.ownershipContextSmearing === 0, 'zero ownership/context smearing', String(summary.ownershipContextSmearing || 0))
    addFinding(findings, summary.privateEvidenceLeaks === 0, 'no private/local file content in daily summary', String(summary.privateEvidenceLeaks || 0))
    for (const key of sectionKeys) {
      addFinding(findings, Boolean(selectedDay?.sections?.[key]), `selected day has ${key} section`, key)
      addFinding(findings, normalizeList(selectedDay?.sections?.[key]?.evidenceRefs).length > 0, `${key} section carries evidence refs`, key)
    }
  }

  if (buildLog) {
    addFinding(findings, buildLog.schemaVersion === 2, '/api/foundation/build-log remains compatible', String(buildLog.schemaVersion || 'missing'))
    addFinding(findings, Array.isArray(buildLog.builds), '/api/foundation/build-log keeps builds array', typeof buildLog.builds)
  }
  if (changeLog) {
    addFinding(findings, changeLog.schemaVersion === 1, '/api/foundation/change-log remains compatible', String(changeLog.schemaVersion || 'missing'))
    addFinding(findings, Array.isArray(changeLog.entries), '/api/foundation/change-log keeps entries array', typeof changeLog.entries)
  }
  if (changesApi) {
    addFinding(findings, Array.isArray(changesApi.changes), '/api/foundation/changes remains backward-compatible', typeof changesApi.changes)
  }
  if (foundationHub) {
    const dailyCard = normalizeList(foundationHub.backlogItems).find(card => card.id === DAILY_EXEC_SUMMARY_CARD_ID)
    addFinding(findings, dailyCard?.lane === 'done' || dailyCard?.lane === 'scoped', 'daily summary card is present in backlog truth', `${dailyCard?.lane || 'missing'}`)
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: DAILY_EXEC_SUMMARY_CARD_ID,
    closeoutKey: DAILY_EXEC_SUMMARY_CLOSEOUT_KEY,
    summary: dailySummary?.summary || {},
    findings,
  }
}

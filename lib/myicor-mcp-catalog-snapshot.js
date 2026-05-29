import crypto from 'node:crypto'

import {
  MYICOR_SOURCE_SYSTEM_COURSE_FIXTURE,
  MYICOR_SOURCE_SYSTEM_LESSON_FIXTURE,
} from './myicor-source-system-map.js'

export const MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID = 'MYICOR-MCP-CATALOG-SNAPSHOT-001'
export const MYICOR_MCP_CATALOG_SNAPSHOT_PLAN_PATH = 'docs/process/myicor-mcp-catalog-snapshot-001-plan.md'
export const MYICOR_MCP_CATALOG_SNAPSHOT_SCRIPT_PATH = 'scripts/process-myicor-mcp-catalog-snapshot-check.mjs'
export const MYICOR_MCP_CATALOG_TARGET_KEY = 'myicor-mcp-catalog-snapshot-v1'
export const MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID = 'source-system:myicor:mcp-catalog-snapshot:v1'
export const MYICOR_MCP_CATALOG_SOURCE_ID = 'SRC-MYICRO-001'
export const MYICOR_MCP_CATALOG_SOURCE_NAME = 'MyICOR'

export const MYICOR_MCP_CATALOG_SEARCH_QUERIES = [
  'agent',
  'memory',
  'mcp',
  'orchestration',
  'Claude Code',
]

export const SOURCE_SYSTEM_VISION_CARD_IDS = [
  MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
  'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
  'SKOOL-SOURCE-SYSTEM-MAP-001',
  'SOURCE-EXTRACTION-STATE-LEDGER-001',
  'DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001',
  'DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001',
  'BUILDER-MEMORY-SYSTEM-001',
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function bool(value) {
  return Boolean(value)
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(item => stableJson(item)).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function stableCatalogHash(value) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex')
}

function slug(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function lessonIdFromUrl(value = '') {
  const match = text(value).match(/\/lessons\/([^/?#]+)/i)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

function includesAny(value = '', patterns = []) {
  const normalized = text(value).toLowerCase()
  return patterns.some(pattern => normalized.includes(String(pattern).toLowerCase()))
}

export function classifyMyicorCatalogTheme(row = {}) {
  const value = [
    row.courseName,
    row.course,
    row.title,
    row.name,
    row.type,
    list(row.categories).join(' '),
  ].filter(Boolean).join(' ')
  if (includesAny(value, ['agent', 'ai employees', 'specialist', 'smart chatbot', 'ai team'])) return 'agentic_os'
  if (includesAny(value, ['memory', 'session-log', 'session log', 'remembers', 'knowledge', 'working memory'])) return 'memory_system'
  if (includesAny(value, ['mcp', 'connector', 'connectors', 'toolbox', 'tool stack'])) return 'connector_mcp'
  if (includesAny(value, ['orchestration', 'workflow', 'process', 'sop', 'workstream', 'delegation'])) return 'workflow_orchestration'
  if (includesAny(value, ['sqlite', 'rag', 'filing cabinet', 'retrieval', 'knowledge base'])) return 'retrieval_knowledge_base'
  if (includesAny(value, ['claude code', 'skills', 'system prompt'])) return 'builder_memory'
  return 'general_productivity'
}

export function rankMyicorCatalogPriority(row = {}) {
  const value = [
    row.courseName,
    row.course,
    row.title,
    row.name,
    row.type,
    classifyMyicorCatalogTheme(row),
  ].filter(Boolean).join(' ')
  if (includesAny(value, [
    'ai team beats',
    'personal intelligence system',
    'agent (the specialist)',
    'mcp (the toolbox)',
    'orchestration (the team leader)',
    'ai employees',
    'team memory',
    'session-logs',
    'session logs',
    'build the one that manages them',
    'skills vs agents',
  ])) return 1
  if (includesAny(value, [
    'rag',
    'workflow',
    'single source of truth',
    'ssot',
    'sqlite',
    'process',
    'workstream',
    'claude code',
    'context window',
    'system prompt',
  ])) return 2
  return 3
}

export function normalizeMyicorCourseRows(courses = []) {
  return list(courses).map(course => {
    const id = text(course.id || course.course_id)
    const name = text(course.name || course.title)
    const normalized = {
      id,
      name,
      type: text(course.course_type || course.type),
      lessonCount: number(course.lesson_count ?? course.lessonCount),
      completedLessons: number(course.completed_lessons ?? course.completedLessons),
      progressPercent: number(course.progress_percent ?? course.progressPercent),
      url: text(course.url) || (id ? `https://app.myicor.com/courses/${id}` : ''),
      discoveredBy: 'myicor_mcp_get_courses',
      contentBodyCaptured: false,
    }
    normalized.theme = classifyMyicorCatalogTheme(normalized)
    normalized.priority = rankMyicorCatalogPriority(normalized)
    normalized.externalId = `course:${normalized.id || slug(normalized.name)}`
    normalized.fingerprint = stableCatalogHash({
      sourceId: MYICOR_MCP_CATALOG_SOURCE_ID,
      kind: 'course',
      id: normalized.id,
      name: normalized.name,
      type: normalized.type,
      lessonCount: normalized.lessonCount,
      completedLessons: normalized.completedLessons,
      progressPercent: normalized.progressPercent,
      url: normalized.url,
    })
    return normalized
  }).filter(course => course.id || course.name)
}

export function normalizeMyicorLessonRows({ course = {}, lessons = [] } = {}) {
  const courseId = text(course.id || course.course_id)
  const courseName = text(course.name || course.title)
  const courseUrl = text(course.url)
  return list(lessons).map(lesson => {
    const url = text(lesson.url)
    const lessonId = text(lesson.lessonId || lesson.lesson_id || lesson.id || lessonIdFromUrl(url))
    const normalized = {
      courseId,
      courseName,
      courseType: text(course.course_type || course.type),
      courseUrl,
      lessonId,
      title: text(lesson.title || lesson.name),
      type: text(lesson.type),
      order: number(lesson.order, null),
      timeEstimateMinutes: lesson.time_estimate_minutes == null && lesson.timeEstimateMinutes == null
        ? null
        : number(lesson.time_estimate_minutes ?? lesson.timeEstimateMinutes, null),
      completed: bool(lesson.completed),
      progressPercent: number(lesson.progress_percent ?? lesson.progressPercent),
      url: url || (lessonId ? `https://app.myicor.com/lessons/${lessonId}` : ''),
      discoveredBy: 'myicor_mcp_get_lessons',
      contentBodyCaptured: false,
      extractionRoute: 'exact_source_packet_required_before_lesson_content',
    }
    normalized.theme = classifyMyicorCatalogTheme(normalized)
    normalized.priority = rankMyicorCatalogPriority(normalized)
    normalized.externalId = `lesson:${normalized.lessonId || slug(`${courseName}-${normalized.title}`)}`
    normalized.fingerprint = stableCatalogHash({
      sourceId: MYICOR_MCP_CATALOG_SOURCE_ID,
      kind: 'lesson',
      courseId: normalized.courseId,
      courseName: normalized.courseName,
      lessonId: normalized.lessonId,
      title: normalized.title,
      type: normalized.type,
      order: normalized.order,
      timeEstimateMinutes: normalized.timeEstimateMinutes,
      completed: normalized.completed,
      progressPercent: normalized.progressPercent,
      url: normalized.url,
    })
    return normalized
  }).filter(lesson => lesson.lessonId || lesson.title)
}

export function normalizeMyicorResourceRows(searches = []) {
  return list(searches).flatMap(search => {
    const query = text(search.query)
    return list(search.results).map(resource => {
      const url = text(resource.url)
      const title = text(resource.title)
      const normalized = {
        query,
        title,
        type: text(resource.type),
        author: text(resource.author),
        durationMinutes: resource.duration_minutes == null ? null : number(resource.duration_minutes, null),
        url,
        categories: list(resource.categories).map(text).filter(Boolean),
        keywords: list(resource.keywords).map(text).filter(Boolean),
        publishedDate: text(resource.published_date || resource.publishedDate),
        discoveredBy: 'myicor_mcp_search_learning_resources',
        contentBodyCaptured: false,
      }
      normalized.theme = classifyMyicorCatalogTheme(normalized)
      normalized.priority = rankMyicorCatalogPriority(normalized)
      normalized.externalId = `resource:${slug(query)}:${stableCatalogHash(url || title).slice(0, 16)}`
      normalized.fingerprint = stableCatalogHash({
        sourceId: MYICOR_MCP_CATALOG_SOURCE_ID,
        kind: 'resource',
        query,
        title: normalized.title,
        type: normalized.type,
        url: normalized.url,
        categories: normalized.categories,
        keywords: normalized.keywords,
        publishedDate: normalized.publishedDate,
      })
      return normalized
    }).filter(resource => resource.url || resource.title)
  })
}

function fixtureCoursesByName() {
  return new Map(normalizeMyicorCourseRows(MYICOR_SOURCE_SYSTEM_COURSE_FIXTURE).map(course => [course.name, course]))
}

export function buildMyicorMcpCatalogFixtureInput() {
  const courses = normalizeMyicorCourseRows(MYICOR_SOURCE_SYSTEM_COURSE_FIXTURE)
  const byName = fixtureCoursesByName()
  const lessonsByCourseId = {}
  for (const lesson of MYICOR_SOURCE_SYSTEM_LESSON_FIXTURE) {
    const course = byName.get(lesson.course) || { id: slug(lesson.course), name: lesson.course, type: '' }
    if (!lessonsByCourseId[course.id]) lessonsByCourseId[course.id] = { course, lessons: [] }
    lessonsByCourseId[course.id].lessons.push({
      ...lesson,
      lesson_id: lesson.lessonId,
      url: lesson.url || `https://app.myicor.com/lessons/${lesson.lessonId}`,
    })
  }
  const resourceSearches = [
    {
      query: 'agent',
      results: [
        {
          title: 'I Built 30 Claude AI Agents. They Replaced My PKM Tools.',
          type: 'Video',
          url: 'https://app.myicor.com/resources/i-built-30-claude-ai-agents-they-replaced-my-pkm',
          categories: ['PKM'],
          published_date: '2026-03-21T19:00:00+00:00',
        },
        {
          title: 'Stop Managing Your AI Agents. Build the One That Manages Them for You.',
          type: 'Article',
          url: 'https://app.myicor.com/resources/stop-managing-your-ai-agents-build-the-one-that-manages-them-for-you',
          categories: ['PPM'],
          published_date: '2026-03-06T18:00:00+00:00',
        },
      ],
    },
  ]
  return {
    courses,
    lessonsByCourseId,
    resourceSearches,
  }
}

function stateForFingerprint(row = {}, priorItemsByExternalId = new Map()) {
  const existing = priorItemsByExternalId.get(row.externalId)
  if (!existing) return 'new'
  return existing.fingerprint === row.fingerprint ? 'known_unchanged' : 'changed'
}

function addState(rows = [], kind = '', priorItemsByExternalId = new Map()) {
  return list(rows).map(row => ({
    ...row,
    kind,
    sourceState: stateForFingerprint(row, priorItemsByExternalId),
    extractionStatus: 'metadata_mapped_content_not_extracted',
    implementedStatus: 'not_cleared',
    browserGapFillAllowed: false,
  }))
}

function countBy(rows = [], key = '') {
  return list(rows).reduce((acc, row) => {
    const value = row?.[key] || 'unknown'
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

export function buildMyicorMcpCatalogSnapshot({
  courses = [],
  lessonsByCourseId = {},
  resourceSearches = [],
  priorItemsByExternalId = new Map(),
  liveMcp = false,
  capturedAt = new Date().toISOString(),
} = {}) {
  const courseRows = addState(normalizeMyicorCourseRows(courses), 'course', priorItemsByExternalId)
  const lessonRows = Object.values(lessonsByCourseId || {}).flatMap(entry => {
    const course = entry.course || {}
    return normalizeMyicorLessonRows({ course, lessons: entry.lessons || [] })
  })
  const resourceRows = normalizeMyicorResourceRows(resourceSearches)
  const lessons = addState(lessonRows, 'lesson', priorItemsByExternalId)
  const resources = addState(resourceRows, 'resource', priorItemsByExternalId)
  const allRows = [...courseRows, ...lessons, ...resources]
  const stateCounts = countBy(allRows, 'sourceState')
  const themeCounts = countBy([...lessons, ...resources], 'theme')
  const priorityCandidates = [...lessons, ...resources]
    .filter(row => Number(row.priority || 3) <= 2)
    .sort((a, b) => Number(a.priority || 3) - Number(b.priority || 3) || text(a.courseName).localeCompare(text(b.courseName)) || text(a.title).localeCompare(text(b.title)))
    .slice(0, 20)
  const fingerprint = stableCatalogHash({
    sourceId: MYICOR_MCP_CATALOG_SOURCE_ID,
    capturedAt: capturedAt.slice(0, 10),
    courses: courseRows.map(row => row.fingerprint).sort(),
    lessons: lessons.map(row => row.fingerprint).sort(),
    resources: resources.map(row => row.fingerprint).sort(),
  })

  return {
    ok: true,
    cardId: MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
    sourceId: MYICOR_MCP_CATALOG_SOURCE_ID,
    sourceName: MYICOR_MCP_CATALOG_SOURCE_NAME,
    targetKey: MYICOR_MCP_CATALOG_TARGET_KEY,
    reportArtifactId: MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID,
    capturedAt,
    liveMcp: Boolean(liveMcp),
    routePolicy: {
      defaultRoute: 'myicor_mcp_readonly_catalog_first',
      browserFallback: 'visible_local_isolated_browser_after_exact_source_packet_approval',
      contentExtractionAllowedInThisSlice: false,
      lessonBodyCaptured: false,
      videoAudioCaptured: false,
      screenshotCaptured: false,
      browserbaseAllowed: false,
      normalChromeProfileAllowed: false,
      atomVectorWritesAllowed: false,
      externalWritesAllowed: false,
      rawSecretsPrinted: false,
    },
    counts: {
      courseCount: courseRows.length,
      lessonCount: lessons.length,
      resourceCount: resources.length,
      totalItemCount: allRows.length,
      highPriorityCandidateCount: priorityCandidates.filter(row => Number(row.priority || 3) === 1).length,
      changedCount: number(stateCounts.changed),
      newCount: number(stateCounts.new),
      knownUnchangedCount: number(stateCounts.known_unchanged),
    },
    stateCounts,
    themeCounts,
    catalogFingerprint: fingerprint,
    courses: courseRows,
    lessons,
    resources,
    priorityCandidates,
    stateLedger: {
      states: [
        'new',
        'known_unchanged',
        'changed',
        'graded_keep',
        'graded_ignore',
        'implemented_cleared',
        'needs_browser_gap_fill',
        'blocked_by_boundary',
      ],
      extractionStatus: [
        'metadata_mapped_content_not_extracted',
        'queued_for_exact_packet',
        'extracted_with_evidence',
        'ignored_or_cleared',
      ],
      nextLedgerCardId: 'SOURCE-EXTRACTION-STATE-LEDGER-001',
    },
    nextActions: [
      {
        cardId: 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
        action: 'Approve one exact high-value lesson/resource content packet if Steve wants content extraction next.',
      },
      {
        cardId: 'SKOOL-SOURCE-SYSTEM-MAP-001',
        action: 'Reuse this source-map/delta pattern for approved free and paid Skool communities.',
      },
      {
        cardId: 'DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001',
        action: 'Feed new/changed/kept source items into daily Dev Director review while suppressing ignored or implemented-cleared items.',
      },
    ],
  }
}

export function buildMyicorMcpCatalogSourceCrawlItems(snapshot = {}) {
  const rows = [
    ...list(snapshot.courses),
    ...list(snapshot.lessons),
    ...list(snapshot.resources),
  ]
  return rows.map(row => {
    const itemKey = `${MYICOR_MCP_CATALOG_TARGET_KEY}:${stableCatalogHash(row.externalId).slice(0, 20)}`
    return {
      itemKey,
      targetKey: MYICOR_MCP_CATALOG_TARGET_KEY,
      sourceId: MYICOR_MCP_CATALOG_SOURCE_ID,
      externalId: row.externalId,
      itemType: `myicor_${row.kind}_metadata`,
      status: 'succeeded',
      fingerprint: row.fingerprint,
      artifactId: MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID,
      processedAt: snapshot.capturedAt,
      metadata: {
        cardId: MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
        sourceName: MYICOR_MCP_CATALOG_SOURCE_NAME,
        catalogFingerprint: snapshot.catalogFingerprint,
        kind: row.kind,
        sourceState: row.sourceState,
        extractionStatus: row.extractionStatus,
        implementedStatus: row.implementedStatus,
        theme: row.theme,
        priority: row.priority,
        title: row.title || row.name,
        courseId: row.courseId || row.id || null,
        courseName: row.courseName || row.name || null,
        lessonId: row.lessonId || null,
        url: row.url || null,
        discoveredBy: row.discoveredBy,
        contentBodyCaptured: false,
        browserGapFillAllowed: false,
      },
    }
  })
}

export function buildMyicorMcpCatalogReportArtifact(snapshot = {}) {
  return {
    reportArtifactId: MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID,
    reportType: 'proof',
    scopeKey: 'myicor-mcp-catalog-snapshot-v1',
    department: 'foundation',
    title: 'MyICOR MCP Catalog Snapshot V1',
    status: 'generated',
    sourceIds: [MYICOR_MCP_CATALOG_SOURCE_ID],
    sourceCoverage: [
      {
        sourceId: MYICOR_MCP_CATALOG_SOURCE_ID,
        sourceName: MYICOR_MCP_CATALOG_SOURCE_NAME,
        route: 'mcp_readonly_catalog',
        surfaces: ['courses', 'lessons', 'learning_resources'],
        contentBodyCaptured: false,
      },
    ],
    topFindings: list(snapshot.priorityCandidates).slice(0, 10).map(row => ({
      title: row.title,
      courseName: row.courseName || null,
      url: row.url,
      theme: row.theme,
      priority: row.priority,
      sourceState: row.sourceState,
    })),
    actionRequiredItems: list(snapshot.nextActions),
    openQuestions: [
      {
        question: 'Which exact MyICOR lesson should be approved first for content extraction, if any?',
        blockerCardId: 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
      },
    ],
    structuredOutputJson: {
      cardId: MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
      sourceId: MYICOR_MCP_CATALOG_SOURCE_ID,
      targetKey: MYICOR_MCP_CATALOG_TARGET_KEY,
      capturedAt: snapshot.capturedAt,
      liveMcp: snapshot.liveMcp,
      counts: snapshot.counts,
      stateCounts: snapshot.stateCounts,
      themeCounts: snapshot.themeCounts,
      catalogFingerprint: snapshot.catalogFingerprint,
      courses: list(snapshot.courses).map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        lessonCount: row.lessonCount,
        progressPercent: row.progressPercent,
        url: row.url,
        sourceState: row.sourceState,
        fingerprint: row.fingerprint,
      })),
      priorityCandidates: list(snapshot.priorityCandidates).map(row => ({
        kind: row.kind,
        courseName: row.courseName || null,
        lessonId: row.lessonId || null,
        title: row.title,
        type: row.type,
        url: row.url,
        theme: row.theme,
        priority: row.priority,
        sourceState: row.sourceState,
        extractionStatus: row.extractionStatus,
      })),
      routePolicy: snapshot.routePolicy,
      stateLedger: snapshot.stateLedger,
      resources: list(snapshot.resources).map(row => ({
        query: row.query,
        title: row.title,
        type: row.type,
        url: row.url,
        categories: row.categories,
        publishedDate: row.publishedDate,
        theme: row.theme,
        priority: row.priority,
        sourceState: row.sourceState,
        fingerprint: row.fingerprint,
      })),
    },
    metadata: {
      cardId: MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
      targetKey: MYICOR_MCP_CATALOG_TARGET_KEY,
      catalogFingerprint: snapshot.catalogFingerprint,
      route: 'myicor_mcp_readonly_catalog_first',
      liveMcp: Boolean(snapshot.liveMcp),
      contentBodyCaptured: false,
      lessonBodyCaptured: false,
      videoAudioCaptured: false,
      screenshotCaptured: false,
      externalWritesAllowed: false,
      browserbaseAllowed: false,
      normalChromeProfileAllowed: false,
      rawSecretPrinted: false,
    },
  }
}

export function buildSourceSystemVisionBacklogCards() {
  return [
    {
      id: MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
      title: 'Persist MyICOR MCP catalog snapshot and delta state',
      team: 'foundation',
      lane: 'scoped',
      priority: 'P0',
      rank: 8,
      source: 'Steve May 29 source-system operating vision',
      summary: 'Persist the MyICOR MCP course, lesson, and learning-resource metadata map into the source-state ledger with fingerprints, new/changed/known state, and a reviewable report artifact without extracting lesson content.',
      whyItMatters: 'The system needs to know what MyICOR contains and what changed before sending anything to Dev Director or opening paid lesson pages. This is the first concrete memory/state slice for paid source systems.',
      nextAction: 'Run `npm run process:myicor-mcp-catalog-snapshot-check -- --live-mcp --apply --json`, then review the priority candidates before approving one exact lesson extraction packet.',
      statusNote: 'MCP read-only catalog snapshot only. No lesson bodies, scripts, videos, screenshots, downloads, browser crawl, atom/vector writes, external writes, Browserbase, or normal Chrome profile use.',
    },
    {
      id: 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
      title: 'Run one approved MyICOR lesson extraction proof',
      team: 'foundation',
      lane: 'done',
      priority: 'P0',
      rank: 8,
      source: 'Steve May 29 exact MyICOR source-packet approval',
      summary: 'Run one exact approved MyICOR resource extraction through MCP metadata first and local isolated browser gap-fill second, then persist report/source-state proof for Director review.',
      whyItMatters: 'This proves the paid-source pattern Steve wants: a source can be logged in, read like a human inside a governed local browser, extracted once with artifacts and hashes, and remembered by the source ledger without broad crawling or expensive hosted browser loops.',
      nextAction: 'Use source-system:myicor:approved-lesson-extract-proof:v1 in the daily source review / Dev Director proposal bundle. Approve the next exact MyICOR or Skool packet before any broader crawl.',
      statusNote: 'V1 built on 2026-05-29 under myicor-approved-lesson-extract-proof-v1. Exact resource: Stop Managing Your AI Agents. Build the One That Manages Them for You. Report artifact: source-system:myicor:approved-lesson-extract-proof:v1. Source target/item: myicor-approved-lesson-extract-proof-v1 with extracted_with_evidence and graded_keep state. Proof: npm run process:myicor-approved-lesson-extract-proof-check -- --live-mcp --live-browser --headless --apply --json. Raw text and screenshot artifacts stay local-only under .openclaw. No broad crawl, adjacent navigation, clicks, forms, downloads, posts/comments/messages, profile/account/credential mutation, external writes, Browserbase, normal Chrome, atoms, or vectors.',
    },
    {
      id: 'SKOOL-SOURCE-SYSTEM-MAP-001',
      title: 'Map approved Skool communities as source systems',
      team: 'foundation',
      lane: 'done',
      priority: 'P0',
      rank: 9,
      source: 'Steve May 29 Skool source-system vision',
      summary: 'Build the source-system map for approved free and paid Skool communities: joined/access state, classroom/course inventory, community thread inventory, resource links, fingerprints, deltas, grades, and exact extraction packets.',
      whyItMatters: 'Skool should not be blind browser scraping. AIOS needs to know what communities/classes exist, what has already been extracted, what changed, and what is worth keeping before running any broad community/course extraction.',
      nextAction: 'Use the Skool source-system map to create exact approved public/free or paid/private packets. Do not run Skool extraction until SOURCE-SESSION-BROKER-001 and the specific source packet show session, owner/use boundary, allowed surfaces, and stop conditions.',
      statusNote: 'V1 built on 2026-05-29 under skool-source-system-map-v1. Readback maps four governed Skool targets with zero source items and zero extracted Skool content rows: one public-read packet-gated target, two paid/private/member blocked Mark targets, and one blocked corpus access-path lane. Report artifact: source-system:skool:source-system-map:v1. Plan/doc: docs/process/skool-source-system-map-001-plan.md. Proof: npm run process:skool-source-system-map-check -- --apply --json. No Skool browser session, login, join, course crawl, member read, download, post/comment/message, source row mutation, atom/vector write, external write, Browserbase, or normal Chrome profile was used.',
    },
    {
      id: 'SOURCE-EXTRACTION-STATE-LEDGER-001',
      title: 'Build source extraction state ledger',
      team: 'foundation',
      lane: 'done',
      priority: 'P0',
      rank: 10,
      source: 'Steve May 29 extracted/not-extracted state correction',
      summary: 'Create the reusable source-state model that marks each source item as discovered, metadata mapped, new, known unchanged, changed, queued, extracted, graded keep, ignored, implemented cleared, or blocked.',
      whyItMatters: 'Without a state ledger, the system keeps rereading trash, forgetting extracted material, and resurfacing implemented ideas. This is the memory layer that makes source systems compounding instead of repetitive.',
      nextAction: 'Use the V1 ledger for SKOOL-SOURCE-SYSTEM-MAP-001, then wire DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001 to consume new/changed/kept items while suppressing ignored/implemented-cleared history.',
      statusNote: 'V1 built on 2026-05-29 under source-extraction-state-ledger-v1. The ledger reads source_crawl_targets/source_crawl_items into discovery, extraction, and review/suppression states, persists report source-system:extraction-state-ledger:v1, keeps the MyICOR catalog target metadata-only with 296 mapped rows / 0 catalog-extracted rows, and now records 1 MyICOR source-wide extracted_with_evidence row from MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001. No source row mutation, atom/vector writes, browser sessions, external writes, deletion, or auto-suppression. Plan/doc: docs/process/source-extraction-state-ledger-001-plan.md. Proof: npm run process:source-extraction-state-ledger-check -- --apply --json.',
    },
    {
      id: 'DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001',
      title: 'Build daily Dev Director source review loop',
      team: 'foundation',
      lane: 'done',
      priority: 'P0',
      rank: 11,
      source: 'Steve May 29 Dev Director daily loop vision',
      summary: 'Make the daily Dev Director review old and new source intelligence together, enrich build opportunities, add new opportunities, suppress ignored trash, and clear implemented/documented items while retaining system memory for future upgrade recommendations.',
      whyItMatters: 'Director recommendations should improve as new evidence arrives instead of reviewing the same weak items forever or forgetting what AIOS already built.',
      nextAction: 'Use this daily source review artifact to drive DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001 and BUILDER-MEMORY-SYSTEM-001. Do not auto-promote Director recommendations; extracted evidence and Steve approval remain required.',
      statusNote: 'V1 built on 2026-05-29 under dev-director-daily-source-review-loop-v1. Daily review consumes Director + source ledger + MyICOR catalog + exact MyICOR extraction proof + Skool map and persists report director:dev-daily-source-review-loop:v1. It separates existing Director recommendations, 1 exact extracted MyICOR evidence candidate, new/changed/kept ledger candidates, MyICOR exact packet candidates, Skool packet/blocker targets, blocked approvals, and suppressed searchable history. Proof: npm run process:dev-director-daily-source-review-loop-check -- --apply --json. No auto backlog promotion, source extraction, browser session, source row mutation, atom/vector write, deletion, external write, or automatic suppression apply was performed.',
    },
    {
      id: 'DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001',
      title: 'Clean Dev page around live system truth',
      team: 'foundation',
      lane: 'done',
      priority: 'P0',
      rank: 12,
      source: 'Steve May 29 Dev page truth cleanup vision',
      summary: 'Organize the Dev page so it shows what systems are built, what is running, what source data is coming in, what is blocked, what changed today, and what proof backs each claim.',
      whyItMatters: 'Steve needs the Dev page to be the command surface for truth, not a graveyard of old cards or a place where running systems are invisible.',
      nextAction: 'Use the Dev page System Truth section as the operator readback while BUILDER-MEMORY-SYSTEM-001 scopes the builder startup packet.',
      statusNote: 'V1 built on 2026-05-29 under dev-page-system-truth-cleanup-v1. Dev Hub payload now exposes systemTruth and /dev renders the System Truth section from source-backed reports. Readback includes 7 systems, 6 reports, source-ledger items, 1 extracted evidence candidate, MyICOR packet candidates, Skool targets, Director candidates, blocked/approval rows, proof commands, and no-hidden-run guardrails. Report artifact: dev-page:system-truth-cleanup:v1. Plan/doc: docs/process/dev-page-system-truth-cleanup-001-plan.md. Proof: npm run process:dev-page-system-truth-cleanup-check -- --apply --json. No browser session, Browserbase default, source extraction, source row mutation, atom/vector write, external write, or auto-promotion was performed.',
    },
    {
      id: 'BUILDER-MEMORY-SYSTEM-001',
      title: 'Build builder memory so agents stop starting from scratch',
      team: 'foundation',
      lane: 'done',
      priority: 'P0',
      rank: 13,
      source: 'Steve May 29 repeated-context memory correction',
      summary: 'Build the builder-facing memory layer that loads the current sprint, source-state, decisions, handoffs, active blockers, proof status, and relevant code maps before a Codex/Claude/Harlan build run starts.',
      whyItMatters: 'Steve keeps restating the same vision because new agents lose context. The system needs durable builder memory that is retrieved from repo/live state, not chat luck.',
      nextAction: 'Use builder-memory:startup-packet:v1 as the first builder readback before exact MyICOR/Skool extraction packets or source-browser runtime work.',
      statusNote: 'V1 built on 2026-05-29 under builder-memory-system-v1. Builder startup packet now persists builder-memory:startup-packet:v1 from live sprint, backlog, Dev page truth, daily source review, source ledger, MyICOR catalog, exact MyICOR extraction proof, and Skool reports. It includes load order, startup checklist, guardrails, stale-claim rejection rules, proof commands, active blocker, source-system counts, extracted evidence count, and next cards. Private MEMORY.md/USER.md/daily memory and secrets are explicitly excluded from repo truth. Proof: npm run process:builder-memory-system-check -- --apply --json. No browser session, Browserbase default, source extraction, source row mutation, atom/vector write, external write, or auto-promotion was performed.',
    },
  ]
}

export function evaluateMyicorMcpCatalogSnapshot(snapshot = {}, { requireLiveFullCatalog = false } = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  add(snapshot.sourceId === MYICOR_MCP_CATALOG_SOURCE_ID, 'snapshot uses registered MyICOR source contract', snapshot.sourceId || 'missing')
  add(snapshot.routePolicy?.defaultRoute === 'myicor_mcp_readonly_catalog_first', 'route is MyICOR MCP read-only catalog first', snapshot.routePolicy?.defaultRoute || 'missing')
  add(snapshot.routePolicy?.contentExtractionAllowedInThisSlice === false && snapshot.routePolicy?.lessonBodyCaptured === false, 'snapshot does not capture lesson content', JSON.stringify(snapshot.routePolicy || {}))
  add(snapshot.routePolicy?.browserbaseAllowed === false && snapshot.routePolicy?.normalChromeProfileAllowed === false, 'Browserbase and normal Chrome are blocked', JSON.stringify(snapshot.routePolicy || {}))
  add(snapshot.routePolicy?.externalWritesAllowed === false && snapshot.routePolicy?.rawSecretsPrinted === false, 'no external writes or raw secret output', JSON.stringify(snapshot.routePolicy || {}))
  add(number(snapshot.counts?.courseCount) >= 15, 'snapshot includes MyICOR course catalog scale', `${snapshot.counts?.courseCount || 0} courses`)
  add(number(snapshot.counts?.lessonCount) >= (requireLiveFullCatalog ? 250 : 8), 'snapshot includes lesson metadata map', `${snapshot.counts?.lessonCount || 0} lessons`)
  add(number(snapshot.counts?.resourceCount) >= (requireLiveFullCatalog ? 3 : 1), 'snapshot includes learning-resource metadata search', `${snapshot.counts?.resourceCount || 0} resources`)
  add(list(snapshot.priorityCandidates).some(row => row.theme === 'agentic_os'), 'priority candidates include agentic OS signals', 'agentic_os')
  add(list(snapshot.priorityCandidates).some(row => row.theme === 'memory_system'), 'priority candidates include memory-system signals', 'memory_system')
  add(list(snapshot.priorityCandidates).some(row => row.theme === 'connector_mcp'), 'priority candidates include MCP/connector signals', 'connector_mcp')
  add(list(snapshot.stateLedger?.states).includes('implemented_cleared') && list(snapshot.stateLedger?.states).includes('graded_ignore'), 'state ledger supports ignored and implemented-cleared suppression', list(snapshot.stateLedger?.states).join(', '))
  add(/^[0-9a-f]{64}$/i.test(snapshot.catalogFingerprint || ''), 'snapshot has stable catalog fingerprint', snapshot.catalogFingerprint || 'missing')
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    checks,
    failed,
  }
}

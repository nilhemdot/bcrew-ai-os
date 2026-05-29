export const MYICOR_SOURCE_SYSTEM_MAP_CARD_ID = 'MYICOR-SOURCE-SYSTEM-MAP-001'
export const MYICOR_SOURCE_SYSTEM_MAP_PLAN_PATH = 'docs/process/myicor-source-system-map-001-plan.md'
export const MYICOR_SOURCE_SYSTEM_MAP_SCRIPT_PATH = 'scripts/process-myicor-source-system-map-check.mjs'

export const MYICOR_SOURCE_SYSTEM_MCP_TOOLS = [
  'get_courses',
  'get_lessons',
  'search_learning_resources',
  'get_trend_reports',
  'get_trend_report',
  'get_my_workstreams',
  'get_workstream_details',
  'get_my_tools',
  'get_my_tool_stack_gaps',
  'get_lifecycle_catalog',
  'get_trusted_sources',
]

export const MYICOR_SOURCE_SYSTEM_COURSE_FIXTURE = [
  { id: '9a7f1c96-709e-458a-b1c9-20e92687b5e8', name: 'Note-Taking like a Pro', lessonCount: 11, type: 'icor_journey' },
  { id: '2c51810c-62c7-49cf-a1c3-5013731c3943', name: 'PKM like a Pro', lessonCount: 17, type: 'icor_journey' },
  { id: '391f3b6c-d6c9-49b5-8fff-73f9f7bb7822', name: 'Task Management like a Pro', lessonCount: 17, type: 'icor_journey' },
  { id: 'cf362502-5952-44cb-ae20-0355930f820e', name: 'Project Management like a Pro', lessonCount: 7, type: 'icor_journey' },
  { id: '84423474-f89b-422c-a4c1-ffc35bd24030', name: 'Automation like a Pro', lessonCount: 9, type: 'icor_journey' },
  { id: 'aa4f2f9a-7074-4556-a2c8-e7d0a8d54285', name: 'Email Management like a Pro', lessonCount: 20, type: 'standalone' },
  { id: '44b0b108-2812-4c8d-b6b3-e1acc52f20d5', name: 'AI Mastery', lessonCount: 18, type: 'mastery' },
  { id: '695ce1f4-c7ea-4dc9-b818-c72d7a62aba0', name: 'Claude Mastery for Professionals', lessonCount: 37, type: 'mastery' },
  { id: 'd8ae9aa7-b147-4e61-9635-26b6bc3e0fa7', name: 'Apple Notes Mastery', lessonCount: 19, type: 'standalone' },
  { id: 'a5736ea6-739d-4b6d-abb5-1db7df01f451', name: 'Miro Mastery', lessonCount: 15, type: 'standalone' },
  { id: '482ca382-5bab-4db5-8b21-d3d88c567d90', name: 'Heptabase Mastery', lessonCount: 23, type: 'standalone' },
  { id: '5efb0d99-1bbb-4433-9127-8f78224ac5f2', name: 'Heptabase like a Pro', lessonCount: 13, type: 'standalone' },
  { id: '00bc2002-cfe5-485d-abab-d5b5bafe7aae', name: 'ClickUp like a Pro', lessonCount: 19, type: 'standalone' },
  { id: '72a16184-0c4c-4354-a155-f03d7b03ac3e', name: 'ICOR Journey Kickstart', lessonCount: 8, type: 'standalone' },
  { id: '070791f7-4af3-4bc2-9b77-ff8a025141f1', name: 'myPKA System', lessonCount: 32, type: 'workshop' },
]

export const MYICOR_SOURCE_SYSTEM_LESSON_FIXTURE = [
  { course: 'AI Mastery', lessonId: '2329', title: 'Agent (The Specialist)', type: 'concept', priority: 1 },
  { course: 'AI Mastery', lessonId: '2362', title: 'MCP (The Toolbox)', type: 'concept', priority: 1 },
  { course: 'AI Mastery', lessonId: '2330', title: 'Orchestration (The Team Leader)', type: 'concept', priority: 1 },
  { course: 'AI Mastery', lessonId: '2331', title: 'RAG (The Filing Cabinet)', type: 'concept', priority: 2 },
  { course: 'AI Mastery', lessonId: '2337', title: 'Workflow 5: The Orchestration Workflow', type: 'workflow', priority: 1 },
  { course: 'Claude Mastery for Professionals', lessonId: '2359', title: 'MCPs: Where Everything Comes Together', type: 'concept', priority: 1 },
  { course: 'Claude Mastery for Professionals', lessonId: '2382', title: 'Building a Team of AI Employees That Actually Work', type: 'workflow', priority: 1 },
  { course: 'Claude Mastery for Professionals', lessonId: '2387', title: "Building a Personal Intelligence System: Inside Paco's 17-Agent Mindset Architecture", type: 'workflow', priority: 1 },
  { course: 'myPKA System', lessonId: '2467', title: 'Why an AI Team Beats a Smart Chatbot', type: 'workshop', priority: 1 },
  { course: 'myPKA System', lessonId: '2475', title: 'Team Knowledge - Three Forms of Team Memory', type: 'workshop', priority: 1 },
  { course: 'myPKA System', lessonId: '2490', title: 'Session-Logs - How the Team Remembers Itself', type: 'workshop', priority: 1 },
  { course: 'myPKA System', lessonId: '2486', title: 'From Markdown to SQLite - Upgrading What the Team Can Ask', type: 'workshop', priority: 2 },
  { course: 'myPKA System', lessonId: '2501', title: 'Install an Expansion - Grow Your Team On Demand', type: 'workshop', priority: 2 },
  { course: 'Automation like a Pro', lessonId: '52', title: 'Process, Workflow, Workstream, Procedure, and SOP', type: 'concept', priority: 2 },
  { course: 'Automation like a Pro', lessonId: '696', title: 'The Concept of Single Source Of Truth (SSOT) in ICOR', type: 'concept', priority: 2 },
  { course: 'Automation like a Pro', lessonId: '699', title: 'How to Map Your Business Processes', type: 'workflow', priority: 2 },
]

function list(value) {
  return Array.isArray(value) ? value : []
}
function text(value) {
  return String(value || '').trim()
}

function includesAny(value = '', patterns = []) {
  const source = text(value).toLowerCase()
  return patterns.some(pattern => source.includes(String(pattern).toLowerCase()))
}

function classifyLesson(row = {}) {
  const value = `${row.course || ''} ${row.title || ''} ${row.type || ''}`
  if (includesAny(value, ['agent', 'ai employees', 'specialist', 'team beats'])) return 'agentic_os'
  if (includesAny(value, ['memory', 'session-log', 'remembers', 'knowledge'])) return 'memory_system'
  if (includesAny(value, ['mcp', 'connectors', 'toolbox'])) return 'connector_mcp'
  if (includesAny(value, ['orchestration', 'workflow', 'process', 'sop', 'workstream'])) return 'workflow_orchestration'
  if (includesAny(value, ['sqlite', 'rag', 'filing cabinet'])) return 'retrieval_knowledge_base'
  return 'general_productivity'
}

function buildCourseRows(courses = MYICOR_SOURCE_SYSTEM_COURSE_FIXTURE) {
  return list(courses).map(course => ({
    id: course.id || '',
    name: course.name || '',
    type: course.type || course.course_type || '',
    lessonCount: Number(course.lessonCount ?? course.lesson_count ?? 0),
    progressPercent: Number(course.progressPercent ?? course.progress_percent ?? 0),
    sourceUrl: course.url || (course.id ? `https://app.myicor.com/courses/${course.id}` : ''),
    discoveredBy: 'myicor_mcp_get_courses',
    contentBodyAvailableFromMcp: false,
  }))
}

function buildLessonRows(lessons = MYICOR_SOURCE_SYSTEM_LESSON_FIXTURE) {
  return list(lessons).map(lesson => ({
    course: lesson.course || '',
    lessonId: String(lesson.lessonId || lesson.id || ''),
    title: lesson.title || '',
    type: lesson.type || '',
    priority: Number(lesson.priority || 3),
    url: lesson.url || (lesson.lessonId ? `https://app.myicor.com/lessons/${lesson.lessonId}` : ''),
    theme: classifyLesson(lesson),
    discoveredBy: 'myicor_mcp_get_lessons',
    contentBodyAvailableFromMcp: false,
    extractionRoute: 'visible_source_browser_after_source_packet_approval',
  }))
}

function buildMonitorStates() {
  return [
    { state: 'new', meaning: 'First seen in MCP catalog or browser map; not graded yet.' },
    { state: 'known_unchanged', meaning: 'Fingerprint unchanged since last scan; do not re-extract.' },
    { state: 'changed', meaning: 'Title, lesson count, URL, metadata, or content fingerprint changed; regrade.' },
    { state: 'graded_keep', meaning: 'Worth keeping in Dev Director source memory and monitoring.' },
    { state: 'graded_ignore', meaning: 'Low relevance; suppress unless metadata changes materially.' },
    { state: 'implemented_cleared', meaning: 'Useful idea was implemented or rejected with reason; avoid re-recommending.' },
    { state: 'needs_browser_gap_fill', meaning: 'MCP metadata is insufficient; exact visible browser extraction packet needed.' },
    { state: 'blocked_by_boundary', meaning: 'Requires approval, content-use decision, or source-session repair.' },
  ]
}

export function buildMyicorSourceSystemMap(input = {}) {
  const courseRows = buildCourseRows(input.courses || MYICOR_SOURCE_SYSTEM_COURSE_FIXTURE)
  const lessonRows = buildLessonRows(input.lessons || MYICOR_SOURCE_SYSTEM_LESSON_FIXTURE)
  const themeCounts = lessonRows.reduce((acc, row) => {
    acc[row.theme] = (acc[row.theme] || 0) + 1
    return acc
  }, {})
  const firstExtractionCandidates = lessonRows
    .filter(row => row.priority === 1)
    .sort((a, b) => a.course.localeCompare(b.course) || a.title.localeCompare(b.title))
    .slice(0, 8)
  return {
    ok: true,
    cardId: MYICOR_SOURCE_SYSTEM_MAP_CARD_ID,
    status: 'ready_for_metadata_map_then_exact_lesson_packet',
    sourceId: 'SRC-MYICRO-001',
    sourceName: 'MyICOR',
    routePolicy: {
      defaultRoute: 'mcp_catalog_first',
      browserFallback: 'visible_local_isolated_browser_for_mcp_gaps_after_packet_approval',
      normalChromeProfileAllowed: false,
      browserbaseAllowed: false,
      broadCrawlAllowed: false,
      contentExtractionAllowedInThisSlice: false,
      externalWritesAllowed: false,
      rawSecretsPrinted: false,
    },
    mcpCoverage: {
      tools: MYICOR_SOURCE_SYSTEM_MCP_TOOLS,
      covers: [
        'course_catalog',
        'lesson_metadata',
        'completion_progress',
        'learning_resource_search',
        'trend_reports',
        'workstreams',
        'tool_stack',
        'lifecycle_catalog',
        'trusted_sources',
      ],
      gaps: [
        'full_lesson_body_or_script',
        'video_or_audio_playback_capture',
        'coaching_call_recording_inventory_if_not_exposed_as_learning_resource',
        'embedded_resource_follow_links',
        'visual_walkthrough_evidence',
      ],
    },
    catalog: {
      courseCount: courseRows.length,
      lessonCount: courseRows.reduce((sum, row) => sum + Number(row.lessonCount || 0), 0),
      courses: courseRows,
      priorityLessons: lessonRows,
      themeCounts,
    },
    stateModel: {
      fingerprintFields: ['sourceId', 'courseId', 'lessonId', 'title', 'type', 'url', 'lessonCount', 'updatedAtOrLastSeen'],
      states: buildMonitorStates(),
      scanCadence: {
        mcpCatalog: 'daily_when_source_enabled',
        browserGapFill: 'only_exact_packet_or_changed_high_value_item',
        deepReextract: 'only_changed_or_manually_reopened_item',
      },
    },
    directorRouting: {
      proposedOnly: true,
      suppressClearedItems: true,
      keepReasons: [
        'agentic_os_architecture',
        'memory_system_design',
        'connector_mcp_pattern',
        'workflow_orchestration',
        'retrieval_or_knowledge_base_design',
      ],
      outputTargets: [
        'source_state_ledger',
        'Dev Director evidence bundle',
        'approved extraction queue',
        'implementation-cleared suppression list',
      ],
    },
    firstExtractionCandidates,
    nextCards: [
      {
        id: 'MYICOR-MCP-CATALOG-SNAPSHOT-001',
        purpose: 'Persist the MCP course/lesson/resource map and first diff state with no course content extraction.',
        route: 'myicor:mcp-call get_courses/get_lessons/search_learning_resources',
      },
      {
        id: 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
        purpose: 'Extract one exact approved high-value lesson through visible isolated browser or approved MCP content route.',
        route: 'visible_local_browser_or_mcp_content_if_available',
      },
      {
        id: 'SKOOL-SOURCE-SYSTEM-MAP-001',
        purpose: 'Reuse the same state-map/delta-monitor pattern for approved Skool course/community systems.',
        route: 'source_session_broker_plus_visible_browser_after_packet',
      },
    ],
  }
}

export function evaluateMyicorSourceSystemMap(snapshot = buildMyicorSourceSystemMap()) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  add(snapshot.sourceId === 'SRC-MYICRO-001', 'map is tied to the MyICOR source contract', snapshot.sourceId || 'missing')
  add(snapshot.routePolicy?.defaultRoute === 'mcp_catalog_first', 'route is MCP catalog first', snapshot.routePolicy?.defaultRoute || 'missing')
  add(snapshot.routePolicy?.browserFallback === 'visible_local_isolated_browser_for_mcp_gaps_after_packet_approval', 'browser fallback is visible local isolated browser after approval', snapshot.routePolicy?.browserFallback || 'missing')
  add(snapshot.routePolicy?.browserbaseAllowed === false && snapshot.routePolicy?.normalChromeProfileAllowed === false, 'Browserbase and normal Chrome profile are blocked', JSON.stringify(snapshot.routePolicy || {}))
  add(snapshot.routePolicy?.contentExtractionAllowedInThisSlice === false && snapshot.routePolicy?.externalWritesAllowed === false, 'map slice does not extract content or write externally', JSON.stringify(snapshot.routePolicy || {}))
  add(list(snapshot.mcpCoverage?.tools).includes('get_courses') && list(snapshot.mcpCoverage?.tools).includes('get_lessons'), 'MCP coverage includes course and lesson metadata tools', list(snapshot.mcpCoverage?.tools).join(', '))
  add(list(snapshot.mcpCoverage?.gaps).includes('full_lesson_body_or_script'), 'MCP gaps honestly include full lesson body/script', list(snapshot.mcpCoverage?.gaps).join(', '))
  add(Number(snapshot.catalog?.courseCount || 0) >= 15 && Number(snapshot.catalog?.lessonCount || 0) >= 250, 'catalog fixture proves broad MyICOR map scale', `${snapshot.catalog?.courseCount || 0} courses / ${snapshot.catalog?.lessonCount || 0} lessons`)
  add(list(snapshot.catalog?.priorityLessons).some(row => row.theme === 'agentic_os'), 'priority lessons include agentic OS signals', 'agentic_os')
  add(list(snapshot.catalog?.priorityLessons).some(row => row.theme === 'memory_system'), 'priority lessons include memory-system signals', 'memory_system')
  add(list(snapshot.catalog?.priorityLessons).some(row => row.theme === 'connector_mcp'), 'priority lessons include MCP/connector signals', 'connector_mcp')
  add(list(snapshot.stateModel?.states).some(row => row.state === 'implemented_cleared') && list(snapshot.stateModel?.states).some(row => row.state === 'graded_ignore'), 'state model can suppress useless or already-implemented items', list(snapshot.stateModel?.states).map(row => row.state).join(', '))
  add(snapshot.directorRouting?.proposedOnly === true && snapshot.directorRouting?.suppressClearedItems === true, 'Director routing is proposal-only and suppresses cleared items', JSON.stringify(snapshot.directorRouting || {}))
  add(list(snapshot.firstExtractionCandidates).some(row => /AI Team Beats|Personal Intelligence System|Agent \(The Specialist\)/i.test(row.title)), 'first extraction candidates include exact high-value lessons', list(snapshot.firstExtractionCandidates).map(row => row.title).join(' | '))
  add(list(snapshot.nextCards).some(row => row.id === 'MYICOR-MCP-CATALOG-SNAPSHOT-001') && list(snapshot.nextCards).some(row => row.id === 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001'), 'next cards split catalog snapshot from lesson extraction proof', list(snapshot.nextCards).map(row => row.id).join(', '))

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    checks,
    failed,
  }
}

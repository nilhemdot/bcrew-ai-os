import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const MEMORY_004_CARD_ID = 'MEMORY-004'
export const MEMORY_004_CLOSEOUT_KEY = 'memory-004-lessons-ip-workflow-v1'
export const MEMORY_004_PLAN_PATH = 'docs/process/memory-004-lessons-ip-workflow-plan.md'
export const MEMORY_004_APPROVAL_PATH = 'docs/process/approvals/MEMORY-004.json'
export const MEMORY_004_SCRIPT_PATH = 'scripts/process-memory-004-lessons-ip-check.mjs'
export const MEMORY_004_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-memory-004-lessons-ip-workflow-closeout.md'
export const MEMORY_004_MANIFEST_PATH = 'docs/conversation-archive/LESSONS-IP-MANIFEST.json'
export const MEMORY_004_README_PATH = 'docs/conversation-archive/LESSONS-IP-README.md'
export const MEMORY_004_SPRINT_ID = 'FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19'
export const MEMORY_004_NEXT_CARD_ID = 'PILLAR-4-SYSTEM-CAPABILITIES-001'
export const MEMORY_003_MANIFEST_PATH = 'docs/conversation-archive/MANIFEST.json'

export const MEMORY_004_OUTPUT_TYPES = [
  'lesson_record',
  'implementation_timeline',
  'case_study_candidate',
  'training_asset_candidate',
  'sales_asset_candidate',
  'quote_clip_review_candidate',
]

export const MEMORY_004_PRIVACY_RULES = [
  'Generated outputs are source-linked metadata and synthesized labels only; they must not copy raw private transcript text.',
  'Private conversation review stays local/private unless Steve explicitly approves external model/provider use.',
  'Quote or clip capture stores candidate source references only until a human approves exact excerpt use.',
  'Reconstructed conversations can inform lessons, but cannot be quoted as exact transcript evidence.',
  'Every reusable IP candidate needs source record IDs, approval posture, and redaction posture before content production.',
]

export const MEMORY_004_NOT_NEXT_BOUNDARIES = [
  'Do not produce polished ebooks, sales copy, or training modules in this card.',
  'Do not upload private conversations or archived chat text to external providers.',
  'Do not store raw private transcript excerpts, quote text, or local memory content in generated outputs.',
  'Do not mutate source systems, Drive permissions, credentials, provider config, public surfaces, or external destinations.',
  'Do not start Value Builder split.',
]

export const MEMORY_004_PROOF_COMMANDS = [
  'node --check lib/memory-004-lessons-ip.js scripts/process-memory-004-lessons-ip-check.mjs',
  'npm run process:memory-004-lessons-ip-check -- --write-report --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MEMORY-004 --planApprovalRef=docs/process/approvals/MEMORY-004.json --closeoutKey=memory-004-lessons-ip-workflow-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=MEMORY-004 --closeoutKey=memory-004-lessons-ip-workflow-v1',
  'npm run process:foundation-ship -- --card=MEMORY-004 --planApprovalRef=docs/process/approvals/MEMORY-004.json --closeoutKey=memory-004-lessons-ip-workflow-v1 --commitRef=HEAD',
]

export const MEMORY_004_CHANGED_FILES = [
  'lib/memory-004-lessons-ip.js',
  MEMORY_004_SCRIPT_PATH,
  MEMORY_004_MANIFEST_PATH,
  MEMORY_004_README_PATH,
  MEMORY_004_PLAN_PATH,
  MEMORY_004_APPROVAL_PATH,
  MEMORY_004_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

const TOPIC_LABELS = {
  audit: 'Audit and quality system',
  backlog: 'Backlog and sprint control',
  extraction: 'Extraction engine',
  foundation: 'Foundation rebuild',
  memory: 'Memory and conversation capture',
  source: 'Source truth and provenance',
  strategy: 'Strategy and operator decisions',
  agents: 'Agents and runtime boundaries',
  meetings: 'Meetings and transcript flow',
  sales: 'Sales and operator surfaces',
}

const CASE_STUDY_BLUEPRINTS = [
  {
    id: 'foundation-rebuild-operating-system',
    title: 'Rebuilding Foundation into a governed operating system',
    requiredTopics: ['foundation', 'backlog', 'audit'],
    outputType: 'case_study_candidate',
  },
  {
    id: 'extractor-from-chaos-to-proof',
    title: 'Turning extraction from broad scraping into governed proof lanes',
    requiredTopics: ['extraction', 'source', 'foundation'],
    outputType: 'case_study_candidate',
  },
  {
    id: 'audit-green-lock-lessons',
    title: 'Green means green: repairing false-green and repeated-failure loops',
    requiredTopics: ['audit', 'foundation'],
    outputType: 'training_asset_candidate',
  },
  {
    id: 'old-system-salvage-pattern',
    title: 'Salvaging the old research team without rebuilding agent sprawl',
    requiredTopics: ['agents', 'source', 'memory'],
    outputType: 'training_asset_candidate',
  },
  {
    id: 'source-backed-decision-loop',
    title: 'From source evidence to decisions, routes, and accountability',
    requiredTopics: ['source', 'strategy', 'backlog'],
    outputType: 'sales_asset_candidate',
  },
]

function text(value) {
  return String(value || '').trim()
}

function unique(values = []) {
  return Array.from(new Set(values.map(text).filter(Boolean)))
}

function sha256(value = '') {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function compactRecord(record = {}) {
  return {
    archiveId: record.archiveId,
    path: record.path,
    title: record.title,
    date: record.date || null,
    sourceType: record.sourceType,
    fidelityClass: record.fidelityClass,
    exactTranscript: Boolean(record.exactTranscript),
    privacyClass: record.privacyClass || 'internal_repo',
    contentSha256: record.contentSha256,
    linkedBacklogIds: unique(record.linkedBacklogIds || []),
    linkedDecisionIds: unique(record.linkedDecisionIds || []),
    topics: unique(record.topics || []),
  }
}

function getRecords(manifest = {}) {
  return Array.isArray(manifest.records)
    ? manifest.records.filter(record => record && record.archiveId && record.path && !record.skipReason)
    : []
}

function topicScore(record = {}, desired = []) {
  const topics = new Set(record.topics || [])
  return desired.reduce((score, topic) => score + (topics.has(topic) ? 1 : 0), 0)
}

function recordSignalScore(record = {}, desiredTopics = []) {
  return (
    topicScore(record, desiredTopics) * 10 +
    Math.min(10, (record.linkedBacklogIds || []).length) +
    Math.min(4, (record.linkedDecisionIds || []).length * 2) +
    (record.fidelityClass === 'extracted_doctrine' ? 5 : 0) +
    (record.exactTranscript ? 3 : 0)
  )
}

function topRecords(records = [], desiredTopics = [], limit = 8) {
  return [...records]
    .map(record => ({ record, score: recordSignalScore(record, desiredTopics) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || text(b.record.date).localeCompare(text(a.record.date)))
    .slice(0, limit)
    .map(row => compactRecord(row.record))
}

function buildLessonCandidates(records = []) {
  const topicRows = Object.entries(TOPIC_LABELS)
    .map(([topic, label]) => {
      const sources = topRecords(records, [topic], 6)
      return {
        id: `lesson-${topic}`,
        outputType: 'lesson_record',
        title: `${label} lessons`,
        lessonFocus: `Extract reusable operating lessons from ${label.toLowerCase()} conversations and closeouts.`,
        sourceRecordIds: sources.map(record => record.archiveId),
        sourcePaths: sources.map(record => record.path),
        linkedBacklogIds: unique(sources.flatMap(record => record.linkedBacklogIds)).slice(0, 12),
        linkedDecisionIds: unique(sources.flatMap(record => record.linkedDecisionIds)).slice(0, 8),
        approvalStatus: 'draft_metadata_only',
        redactionPosture: 'source_linked_no_raw_private_text',
        nextAction: 'Promote specific lessons into backlog cards, verifier rules, Plan Critic rules, durable doctrine, or approved content briefs.',
      }
    })
    .filter(row => row.sourceRecordIds.length >= 2)
  return topicRows.slice(0, 10)
}

function buildTimelineMilestones(records = []) {
  const byDate = new Map()
  for (const record of records) {
    const date = record.date || 'undated'
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(record)
  }
  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, rows]) => {
      const topics = unique(rows.flatMap(record => record.topics || [])).slice(0, 8)
      const sourceRows = rows
        .sort((a, b) => recordSignalScore(b, topics) - recordSignalScore(a, topics))
        .slice(0, 8)
        .map(compactRecord)
      return {
        id: `timeline-${date}`,
        outputType: 'implementation_timeline',
        date,
        title: date === 'undated' ? 'Undated archive evidence' : `Implementation evidence for ${date}`,
        sourceRecordIds: sourceRows.map(record => record.archiveId),
        sourcePaths: sourceRows.map(record => record.path),
        topics,
        linkedBacklogIds: unique(sourceRows.flatMap(record => record.linkedBacklogIds)).slice(0, 12),
        approvalStatus: 'draft_metadata_only',
        redactionPosture: 'source_linked_no_raw_private_text',
      }
    })
    .filter(row => row.sourceRecordIds.length)
    .slice(-14)
}

function buildCaseStudyCandidates(records = []) {
  return CASE_STUDY_BLUEPRINTS.map(blueprint => {
    const sources = topRecords(records, blueprint.requiredTopics, 10)
    return {
      id: `ip-${blueprint.id}`,
      outputType: blueprint.outputType,
      title: blueprint.title,
      sourceRecordIds: sources.map(record => record.archiveId),
      sourcePaths: sources.map(record => record.path),
      requiredTopics: blueprint.requiredTopics,
      linkedBacklogIds: unique(sources.flatMap(record => record.linkedBacklogIds)).slice(0, 14),
      approvalStatus: sources.length >= 3 ? 'ready_for_human_outline' : 'needs_more_sources',
      redactionPosture: 'outline_only_until_source_review',
      nextAction: 'Draft outline from source IDs only; exact quotes or clips require separate approval.',
    }
  })
}

function buildQuoteClipReviewQueue(records = []) {
  return records
    .filter(record => record.exactTranscript || record.fidelityClass === 'reconstructed_near_verbatim')
    .sort((a, b) =>
      Number(b.exactTranscript) - Number(a.exactTranscript) ||
      recordSignalScore(b, ['foundation', 'extraction', 'audit', 'source']) - recordSignalScore(a, ['foundation', 'extraction', 'audit', 'source'])
    )
    .slice(0, 12)
    .map(record => ({
      id: `quote-review-${record.archiveId}`,
      outputType: 'quote_clip_review_candidate',
      title: `Review quote/clip potential: ${record.title}`,
      sourceRecordIds: [record.archiveId],
      sourcePaths: [record.path],
      fidelityClass: record.fidelityClass,
      exactTranscript: Boolean(record.exactTranscript),
      quoteCaptureAllowed: record.exactTranscript ? 'exact_transcript_manual_review' : 'manual_reconstruction_review_required',
      approvalStatus: 'human_review_required',
      redactionPosture: 'no_quote_text_stored',
      nextAction: record.exactTranscript
        ? 'Human can inspect the source and approve exact excerpt use.'
        : 'Use only as context unless a native exact transcript is later attached.',
    }))
}

export async function readConversationArchiveManifest({ repoRoot, manifestPath = MEMORY_003_MANIFEST_PATH } = {}) {
  const fullPath = path.join(repoRoot || process.cwd(), manifestPath)
  return JSON.parse(await fs.readFile(fullPath, 'utf8'))
}

export function buildLessonsIpSnapshot({ manifest, generatedAt = new Date().toISOString() } = {}) {
  const records = getRecords(manifest)
  const lessons = buildLessonCandidates(records)
  const timeline = buildTimelineMilestones(records)
  const assets = buildCaseStudyCandidates(records)
  const quoteQueue = buildQuoteClipReviewQueue(records)
  const allOutputs = [...lessons, ...timeline, ...assets, ...quoteQueue]
  return {
    manifestVersion: 1,
    generatedAt,
    cardId: MEMORY_004_CARD_ID,
    closeoutKey: MEMORY_004_CLOSEOUT_KEY,
    inputManifest: {
      path: MEMORY_003_MANIFEST_PATH,
      cardId: manifest?.cardId || null,
      closeoutKey: manifest?.closeoutKey || null,
      recordCount: manifest?.summary?.recordCount || records.length,
      contentHash: sha256(JSON.stringify({
        generatedAt: manifest?.generatedAt,
        summary: manifest?.summary,
        records: records.map(record => [record.archiveId, record.contentSha256]),
      })),
    },
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    externalModelUse: false,
    privacyBoundary: 'Local metadata-only extraction from the committed conversation archive. No raw private transcript text, local memory, or external model upload.',
    outputTypes: MEMORY_004_OUTPUT_TYPES,
    privacyRules: MEMORY_004_PRIVACY_RULES,
    summary: {
      inputRecordCount: records.length,
      lessonCandidateCount: lessons.length,
      timelineMilestoneCount: timeline.length,
      reusableAssetCandidateCount: assets.length,
      quoteClipReviewCandidateCount: quoteQueue.length,
      sourceLinkedOutputCount: allOutputs.filter(output => output.sourceRecordIds?.length).length,
    },
    lessons,
    timeline,
    reusableAssets: assets,
    quoteClipReviewQueue: quoteQueue,
  }
}

function hasRawContent(value) {
  if (Array.isArray(value)) return value.some(hasRawContent)
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(([key, child]) => {
    if (/^(rawText|sourceExcerpt|quoteText|transcriptText|privateContent)$/i.test(key) && text(child)) return true
    return hasRawContent(child)
  })
}

export function evaluateLessonsIpSnapshot(snapshot = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const outputs = [
    ...(snapshot.lessons || []),
    ...(snapshot.timeline || []),
    ...(snapshot.reusableAssets || []),
    ...(snapshot.quoteClipReviewQueue || []),
  ]
  const allowedTypes = new Set(MEMORY_004_OUTPUT_TYPES)
  const sourceLinked = outputs.filter(output => Array.isArray(output.sourceRecordIds) && output.sourceRecordIds.length)
  const unsupported = outputs.filter(output => !allowedTypes.has(output.outputType))
  const quoteViolations = (snapshot.quoteClipReviewQueue || []).filter(output =>
    !['exact_transcript_manual_review', 'manual_reconstruction_review_required'].includes(output.quoteCaptureAllowed)
  )

  add(snapshot.inputManifest?.path === MEMORY_003_MANIFEST_PATH, 'input manifest is MEMORY-003 archive truth', snapshot.inputManifest?.path || 'missing')
  add(Number(snapshot.inputManifest?.recordCount || 0) >= 20, 'archive has enough input records', String(snapshot.inputManifest?.recordCount || 0))
  add((snapshot.lessons || []).length >= 4, 'lesson candidates exist', String((snapshot.lessons || []).length))
  add((snapshot.timeline || []).length >= 5, 'timeline milestones exist', String((snapshot.timeline || []).length))
  add((snapshot.reusableAssets || []).length >= 3, 'reusable IP candidates exist', String((snapshot.reusableAssets || []).length))
  add((snapshot.quoteClipReviewQueue || []).length >= 2, 'quote/clip review queue exists without storing quote text', String((snapshot.quoteClipReviewQueue || []).length))
  add(outputs.length > 0 && sourceLinked.length === outputs.length, 'every output is source-linked', `${sourceLinked.length}/${outputs.length}`)
  add(unsupported.length === 0, 'all output types are supported', unsupported.map(output => output.outputType).join(', '))
  add(snapshot.externalModelUse === false, 'external model use is explicitly off', String(snapshot.externalModelUse))
  add(!hasRawContent(snapshot), 'generated outputs contain no raw private transcript or quote text', 'metadata-only')
  add(quoteViolations.length === 0, 'quote/clip candidates require exact transcript or manual reconstruction review', quoteViolations.map(output => output.id).join(', '))

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }
}

export function buildLessonsIpManifestJson(snapshot) {
  return `${JSON.stringify(snapshot)}\n`
}

export function buildLessonsIpMarkdown(snapshot = {}) {
  const lines = []
  lines.push('# Conversation Lessons And IP Workflow')
  lines.push('')
  lines.push('Generated from the committed conversation archive. This is metadata-only source routing, not polished content and not a private transcript dump.')
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Input records: ${snapshot.summary?.inputRecordCount || 0}`)
  lines.push(`- Lesson candidates: ${snapshot.summary?.lessonCandidateCount || 0}`)
  lines.push(`- Timeline milestones: ${snapshot.summary?.timelineMilestoneCount || 0}`)
  lines.push(`- Reusable asset candidates: ${snapshot.summary?.reusableAssetCandidateCount || 0}`)
  lines.push(`- Quote/clip review candidates: ${snapshot.summary?.quoteClipReviewCandidateCount || 0}`)
  lines.push('')
  lines.push('## Privacy Rules')
  lines.push('')
  for (const rule of MEMORY_004_PRIVACY_RULES) lines.push(`- ${rule}`)
  lines.push('')
  lines.push('## Lesson Candidate Lanes')
  lines.push('')
  for (const lesson of snapshot.lessons || []) {
    lines.push(`- ${lesson.title}: ${lesson.sourceRecordIds.length} source records; next: ${lesson.nextAction}`)
  }
  lines.push('')
  lines.push('## Reusable IP Candidates')
  lines.push('')
  for (const asset of snapshot.reusableAssets || []) {
    lines.push(`- ${asset.title}: ${asset.approvalStatus}; sources=${asset.sourceRecordIds.length}`)
  }
  lines.push('')
  lines.push('## Quote/Clip Review Queue')
  lines.push('')
  for (const item of snapshot.quoteClipReviewQueue || []) {
    lines.push(`- ${item.title}: ${item.quoteCaptureAllowed}; ${item.redactionPosture}`)
  }
  lines.push('')
  lines.push('## Not Next')
  lines.push('')
  for (const item of MEMORY_004_NOT_NEXT_BOUNDARIES) lines.push(`- ${item}`)
  lines.push('')
  return `${lines.join('\n')}\n`
}

export function buildLessonsIpDogfoodProof() {
  const good = {
    inputManifest: { path: MEMORY_003_MANIFEST_PATH, recordCount: 25 },
    externalModelUse: false,
    lessons: [
      { id: 'lesson-foundation', outputType: 'lesson_record', sourceRecordIds: ['conv-1'], redactionPosture: 'source_linked_no_raw_private_text' },
      { id: 'lesson-audit', outputType: 'lesson_record', sourceRecordIds: ['conv-2'], redactionPosture: 'source_linked_no_raw_private_text' },
      { id: 'lesson-source', outputType: 'lesson_record', sourceRecordIds: ['conv-3'], redactionPosture: 'source_linked_no_raw_private_text' },
      { id: 'lesson-extraction', outputType: 'lesson_record', sourceRecordIds: ['conv-4'], redactionPosture: 'source_linked_no_raw_private_text' },
    ],
    timeline: [
      { id: 'timeline-2026-05-19', outputType: 'implementation_timeline', sourceRecordIds: ['conv-1'] },
      { id: 'timeline-2026-05-18', outputType: 'implementation_timeline', sourceRecordIds: ['conv-2'] },
      { id: 'timeline-2026-05-17', outputType: 'implementation_timeline', sourceRecordIds: ['conv-3'] },
      { id: 'timeline-2026-05-16', outputType: 'implementation_timeline', sourceRecordIds: ['conv-4'] },
      { id: 'timeline-2026-05-15', outputType: 'implementation_timeline', sourceRecordIds: ['conv-5'] },
    ],
    reusableAssets: [
      { id: 'ip-1', outputType: 'case_study_candidate', sourceRecordIds: ['conv-1'] },
      { id: 'ip-2', outputType: 'training_asset_candidate', sourceRecordIds: ['conv-2'] },
      { id: 'ip-3', outputType: 'sales_asset_candidate', sourceRecordIds: ['conv-3'] },
    ],
    quoteClipReviewQueue: [
      { id: 'quote-1', outputType: 'quote_clip_review_candidate', sourceRecordIds: ['conv-1'], quoteCaptureAllowed: 'exact_transcript_manual_review' },
      { id: 'quote-2', outputType: 'quote_clip_review_candidate', sourceRecordIds: ['conv-2'], quoteCaptureAllowed: 'manual_reconstruction_review_required' },
    ],
  }
  const missingSource = structuredClone(good)
  missingSource.lessons[0].sourceRecordIds = []
  const rawTextLeak = structuredClone(good)
  rawTextLeak.quoteClipReviewQueue[0].quoteText = 'private quote should not be stored'
  const externalModel = structuredClone(good)
  externalModel.externalModelUse = true
  const unsupportedQuote = structuredClone(good)
  unsupportedQuote.quoteClipReviewQueue[0].quoteCaptureAllowed = 'auto_quote_allowed'

  const rows = [
    ['good', evaluateLessonsIpSnapshot(good).ok],
    ['missingSource', !evaluateLessonsIpSnapshot(missingSource).ok],
    ['rawTextLeak', !evaluateLessonsIpSnapshot(rawTextLeak).ok],
    ['externalModel', !evaluateLessonsIpSnapshot(externalModel).ok],
    ['unsupportedQuote', !evaluateLessonsIpSnapshot(unsupportedQuote).ok],
  ]
  return {
    ok: rows.every(([, ok]) => ok),
    invariant: 'Good metadata-only lesson/IP output passes; missing source links, raw private quote text, external model use, and unapproved quote capture fail closed.',
    rows: Object.fromEntries(rows),
  }
}

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const MEMORY_003_CARD_ID = 'MEMORY-003'
export const MEMORY_003_CLOSEOUT_KEY = 'memory-003-conversation-archive-v1'
export const MEMORY_003_PLAN_PATH = 'docs/process/memory-003-conversation-archive-plan.md'
export const MEMORY_003_APPROVAL_PATH = 'docs/process/approvals/MEMORY-003.json'
export const MEMORY_003_SCRIPT_PATH = 'scripts/process-memory-003-conversation-archive-check.mjs'
export const MEMORY_003_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-memory-003-conversation-archive-closeout.md'
export const MEMORY_003_MANIFEST_PATH = 'docs/conversation-archive/MANIFEST.json'
export const MEMORY_003_README_PATH = 'docs/conversation-archive/README.md'
export const MEMORY_003_SPRINT_ID = 'FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19'
export const MEMORY_003_NEXT_CARD_ID = 'MEMORY-004'

export const MEMORY_003_FIDELITY_CLASSES = [
  {
    id: 'raw_native_export',
    label: 'Raw native export',
    exactTranscript: true,
    description: 'Unmodified transcript exported directly from the source tool.',
  },
  {
    id: 'provider_session_export',
    label: 'Provider/session export',
    exactTranscript: true,
    description: 'A provider or runtime session export with source metadata and no assistant reconstruction.',
  },
  {
    id: 'reconstructed_near_verbatim',
    label: 'Reconstructed near-verbatim transcript',
    exactTranscript: false,
    description: 'A high-fidelity reconstruction from visible context. Useful evidence, but not a native transcript.',
  },
  {
    id: 'summary_checkpoint',
    label: 'Summary/checkpoint',
    exactTranscript: false,
    description: 'A handoff or checkpoint preserving decisions, context, and next steps without claiming full transcript fidelity.',
  },
  {
    id: 'extracted_doctrine',
    label: 'Extracted doctrine',
    exactTranscript: false,
    description: 'A promoted lesson, doctrine, or decision extracted from a conversation or transcript.',
  },
]

export const MEMORY_003_INGEST_PATHS = [
  {
    id: 'codex-main-session-handoff',
    sourceType: 'assistant_chat',
    status: 'manual_export_supported',
    fidelityClasses: ['raw_native_export', 'provider_session_export', 'reconstructed_near_verbatim', 'summary_checkpoint'],
    privacyBoundary: 'Local/private by default. Only metadata and explicitly written repo handoffs enter tracked repo truth.',
    nextTrigger: 'When a long main-session chat closes, save a handoff or full-convo artifact and regenerate the manifest.',
  },
  {
    id: 'google-meet-transcript-archive',
    sourceType: 'meeting_transcript',
    status: 'existing_governed_archive',
    fidelityClasses: ['raw_native_export', 'summary_checkpoint'],
    privacyBoundary: 'Use SRC-MEETINGS-001 and shared communication artifacts. Broad team/agent query access remains separately gated.',
    nextTrigger: 'Current-day meeting sync or meeting-transcript backfill writes local archive/ledger rows.',
  },
  {
    id: 'gmail-missive-slack-thread-archive',
    sourceType: 'shared_comms_thread',
    status: 'existing_governed_archive',
    fidelityClasses: ['provider_session_export', 'summary_checkpoint'],
    privacyBoundary: 'Existing governed sync lanes read approved source data and write local archive/ledger rows only.',
    nextTrigger: 'Current-day shared-comms sync captures thread artifacts or source_crawl item evidence.',
  },
  {
    id: 'native-provider-session-import',
    sourceType: 'assistant_chat',
    status: 'future_ingest_path',
    fidelityClasses: ['raw_native_export', 'provider_session_export'],
    privacyBoundary: 'No external upload. Native transcript import must preserve source, session id, timestamps, and redaction posture.',
    nextTrigger: 'Build only when a native transcript export is available or a provider/runtime exposes a safe local export.',
  },
]

export const MEMORY_003_NOT_NEXT_BOUNDARIES = [
  'Do not upload private conversations to external providers.',
  'Do not read or commit MEMORY.md, USER.md, memory/*.md, local chat databases, tokens, or private runtime state.',
  'Do not claim reconstructed handoffs are raw native transcripts.',
  'Do not run summarization/model extraction over private chats.',
  'Do not ingest new private broad conversation data.',
  'Do not mutate source systems, Drive permissions, credentials, provider config, or external destinations.',
  'Do not start MEMORY-004 lessons/IP extraction before the archive model is closed.',
]

export const MEMORY_003_PROOF_COMMANDS = [
  'node --check lib/memory-003-conversation-archive.js scripts/process-memory-003-conversation-archive-check.mjs',
  'npm run process:memory-003-conversation-archive-check -- --write-report --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MEMORY-003 --planApprovalRef=docs/process/approvals/MEMORY-003.json --closeoutKey=memory-003-conversation-archive-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=MEMORY-003 --closeoutKey=memory-003-conversation-archive-v1',
  'npm run process:foundation-ship -- --card=MEMORY-003 --planApprovalRef=docs/process/approvals/MEMORY-003.json --closeoutKey=memory-003-conversation-archive-v1 --commitRef=HEAD',
]

export const MEMORY_003_CHANGED_FILES = [
  'lib/memory-003-conversation-archive.js',
  MEMORY_003_SCRIPT_PATH,
  MEMORY_003_MANIFEST_PATH,
  MEMORY_003_README_PATH,
  MEMORY_003_PLAN_PATH,
  MEMORY_003_APPROVAL_PATH,
  MEMORY_003_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

const ARCHIVE_SCAN_ROOTS = [
  'docs/handoffs',
  'docs/_archive/handoffs',
  'docs/_archive/audits',
]

const PRIVATE_LOCAL_PATH_RE = /^(memory\/|MEMORY\.md$|USER\.md$|IDENTITY\.md$|TOOLS\.md$|HEARTBEAT\.md$|\.openclaw\/|\.claude\/)/i
const SECRET_RE = /(sk-[A-Za-z0-9_-]{20,}|api[_-]?key\s*[:=]|token\s*[:=]|refresh[_-]?token\s*[:=]|client[_-]?secret\s*[:=])/i
const BACKLOG_ID_RE = /\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}\b/g
const DECISION_ID_RE = /\bDECISION-\d{3}\b/g

function text(value) {
  return String(value || '').trim()
}

function slug(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sha256(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function countBy(rows = [], keyFn) {
  const counts = {}
  for (const row of rows) {
    const key = keyFn(row) || 'unknown'
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)))
}

async function pathExists(fullPath) {
  try {
    await fs.access(fullPath)
    return true
  } catch {
    return false
  }
}

async function listFiles(root, relativeDir) {
  const fullDir = path.join(root, relativeDir)
  if (!await pathExists(fullDir)) return []
  const entries = await fs.readdir(fullDir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, relativePath))
    } else if (entry.isFile()) {
      files.push(relativePath)
    }
  }
  return files
}

function extractDateFromPath(relativePath = '') {
  const match = String(relativePath).match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  return match ? match[1] : null
}

function extractTitle(relativePath = '', content = '') {
  const title = String(content).split(/\r?\n/).find(line => /^#\s+/.test(line))
  if (title) return title.replace(/^#\s+/, '').trim()
  return path.basename(relativePath, path.extname(relativePath)).replace(/[-_]+/g, ' ')
}

function classifyFidelity(relativePath = '', content = '') {
  const source = `${relativePath}\n${content.slice(0, 4000)}`.toLowerCase()
  if (source.includes('raw native export')) return 'raw_native_export'
  if (source.includes('provider/session export') || source.includes('session export')) return 'provider_session_export'
  if (source.includes('reconstructed') || source.includes('near-verbatim') || /full-convo/.test(source)) return 'reconstructed_near_verbatim'
  if (source.includes('doctrine') || source.includes('lessons learned') || source.includes('promoted')) return 'extracted_doctrine'
  return 'summary_checkpoint'
}

function classifySourceType(relativePath = '', content = '') {
  const source = `${relativePath}\n${content.slice(0, 5000)}`.toLowerCase()
  if (source.includes('meeting transcript') || source.includes('google meet') || source.includes('gemini meeting')) return 'meeting_transcript'
  if (source.includes('harlan')) return 'assistant_chat'
  if (source.includes('codex') || source.includes('claude') || source.includes('chat')) return 'assistant_chat'
  if (source.includes('gmail') || source.includes('missive') || source.includes('slack')) return 'shared_comms_thread'
  if (source.includes('audit')) return 'audit_conversation'
  return 'operator_handoff'
}

function classifyPrivacy(relativePath = '', content = '') {
  const source = `${relativePath}\n${content.slice(0, 3000)}`.toLowerCase()
  if (source.includes('private') || source.includes('steve') || source.includes('harlan') || source.includes('full-convo')) {
    return 'internal_private'
  }
  return 'internal_repo'
}

function extractTopics(relativePath = '', content = '') {
  const source = `${relativePath}\n${content.slice(0, 8000)}`.toLowerCase()
  const topics = []
  const topicMap = [
    ['foundation', 'foundation'],
    ['source', 'source'],
    ['extract', 'extraction'],
    ['meeting', 'meetings'],
    ['gmail', 'gmail'],
    ['missive', 'missive'],
    ['slack', 'slack'],
    ['audit', 'audit'],
    ['strategy', 'strategy'],
    ['sales', 'sales'],
    ['finance', 'finance'],
    ['agent', 'agents'],
    ['memory', 'memory'],
    ['backlog', 'backlog'],
  ]
  for (const [needle, topic] of topicMap) {
    if (source.includes(needle)) topics.push(topic)
  }
  return Array.from(new Set(topics)).sort().slice(0, 10)
}

function uniqueMatches(content = '', re) {
  return Array.from(new Set(String(content).match(re) || [])).sort()
}

function isCandidate(relativePath = '', content = '') {
  if (PRIVATE_LOCAL_PATH_RE.test(relativePath)) return false
  if (!/\.(md|json)$/i.test(relativePath)) return false
  if (/MANIFEST\.md$/.test(relativePath)) return false
  const source = `${relativePath}\n${content.slice(0, 3000)}`.toLowerCase()
  return /full-convo|conversation|chat|transcript|checkpoint|handoff|audit|meeting|source-note|sprint/.test(source)
}

function buildRecord(relativePath = '', content = '') {
  const lineCount = content ? content.split(/\r?\n/).length : 0
  const backlogIds = uniqueMatches(content, BACKLOG_ID_RE).slice(0, 30)
  const decisionIds = uniqueMatches(content, DECISION_ID_RE).slice(0, 30)
  const date = extractDateFromPath(relativePath)
  const fidelityClass = classifyFidelity(relativePath, content)
  return {
    archiveId: `conv-${sha256(relativePath).slice(0, 12)}`,
    path: relativePath,
    title: extractTitle(relativePath, content),
    date,
    sourceType: classifySourceType(relativePath, content),
    fidelityClass,
    exactTranscript: MEMORY_003_FIDELITY_CLASSES.find(item => item.id === fidelityClass)?.exactTranscript === true,
    privacyClass: classifyPrivacy(relativePath, content),
    redactionRule: 'repo artifact metadata only; private/local memory files are excluded',
    lineCount,
    byteCount: Buffer.byteLength(content, 'utf8'),
    contentSha256: sha256(content),
    linkedBacklogIds: backlogIds,
    linkedDecisionIds: decisionIds,
    topics: extractTopics(relativePath, content),
  }
}

export async function buildConversationArchiveSnapshot(options = {}) {
  const repoRoot = options.repoRoot || process.cwd()
  const files = []
  for (const root of ARCHIVE_SCAN_ROOTS) {
    files.push(...await listFiles(repoRoot, root))
  }
  const records = []
  const skippedSecretLike = []
  for (const relativePath of files.sort()) {
    const content = await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
    if (!isCandidate(relativePath, content)) continue
    if (SECRET_RE.test(content)) {
      skippedSecretLike.push(relativePath)
      continue
    }
    records.push(buildRecord(relativePath, content))
  }

  const browse = {
    byDate: countBy(records, record => record.date || 'undated'),
    bySourceType: countBy(records, record => record.sourceType),
    byFidelityClass: countBy(records, record => record.fidelityClass),
    byPrivacyClass: countBy(records, record => record.privacyClass),
    byTopic: countBy(records.flatMap(record => record.topics), topic => topic),
  }

  return {
    manifestVersion: 1,
    generatedAt: new Date().toISOString(),
    cardId: MEMORY_003_CARD_ID,
    closeoutKey: MEMORY_003_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesSourceSystems: false,
    privacyBoundary: 'This manifest indexes tracked repo artifacts only. It does not read local-only memory, raw chat databases, private runtime state, or secret files.',
    fidelityClasses: MEMORY_003_FIDELITY_CLASSES,
    ingestPaths: MEMORY_003_INGEST_PATHS,
    summary: {
      recordCount: records.length,
      exactTranscriptCount: records.filter(record => record.exactTranscript).length,
      reconstructedCount: records.filter(record => record.fidelityClass === 'reconstructed_near_verbatim').length,
      summaryCheckpointCount: records.filter(record => record.fidelityClass === 'summary_checkpoint').length,
      extractedDoctrineCount: records.filter(record => record.fidelityClass === 'extracted_doctrine').length,
      skippedSecretLikeCount: skippedSecretLike.length,
      linkedBacklogRecordCount: records.filter(record => record.linkedBacklogIds.length > 0).length,
      linkedDecisionRecordCount: records.filter(record => record.linkedDecisionIds.length > 0).length,
    },
    browse,
    records,
    skippedSecretLike,
  }
}

export function evaluateConversationArchiveSnapshot(snapshot = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const records = Array.isArray(snapshot.records) ? snapshot.records : []
  const fidelityIds = new Set((snapshot.fidelityClasses || []).map(item => item.id))
  const ingestIds = new Set((snapshot.ingestPaths || []).map(item => item.id))

  add(records.length >= 20, 'archive has a useful browsable record set', `${records.length} records`)
  add(MEMORY_003_FIDELITY_CLASSES.every(item => fidelityIds.has(item.id)), 'all transcript fidelity classes are defined', Array.from(fidelityIds).join(', '))
  add(records.some(record => record.fidelityClass === 'reconstructed_near_verbatim'), 'reconstructed transcript artifacts are explicitly labeled', 'reconstructed_near_verbatim')
  add(records.some(record => record.fidelityClass === 'summary_checkpoint'), 'summary checkpoint artifacts are explicitly labeled', 'summary_checkpoint')
  add(records.every(record => record.path && record.title && record.sourceType && record.fidelityClass && record.privacyClass), 'every record has browse metadata', `${records.length} records`)
  add(records.every(record => record.contentSha256 && Number(record.lineCount) > 0 && Number(record.byteCount) > 0), 'every record has metadata-only content proof', `${records.length} records`)
  add(records.every(record => !PRIVATE_LOCAL_PATH_RE.test(record.path)), 'private local memory paths are excluded', 'memory/, MEMORY.md, USER.md, runtime state excluded')
  add(Array.isArray(snapshot.skippedSecretLike), 'secret-like tracked artifacts are quarantined instead of indexed', `${snapshot.summary?.skippedSecretLikeCount || 0} skipped`)
  add(ingestIds.has('codex-main-session-handoff') && ingestIds.has('google-meet-transcript-archive') && ingestIds.has('native-provider-session-import'), 'ingest paths cover assistant chats, meetings, and future native exports', Array.from(ingestIds).join(', '))
  add(records.some(record => record.linkedBacklogIds.length > 0), 'archive links conversations to backlog IDs', `${snapshot.summary?.linkedBacklogRecordCount || 0} records`)
  add(snapshot.reportOnly === true && snapshot.readOnly === true && snapshot.autoFixes === false && snapshot.writesSourceSystems === false, 'archive snapshot is read-only/report-only', JSON.stringify({ reportOnly: snapshot.reportOnly, readOnly: snapshot.readOnly }))

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    checks,
    failed,
    summary: snapshot.summary || {},
  }
}

export function buildConversationArchiveDogfoodProof() {
  const raw = buildRecord('docs/handoffs/2026-05-19-native-export.md', '# Raw Native Export\n\nraw native export\n')
  const reconstructed = buildRecord('docs/handoffs/2026-05-19-full-convo-reconstructed.md', '# Reconstructed\n\nreconstructed near-verbatim transcript\n')
  const summary = buildRecord('docs/handoffs/2026-05-19-main-chat-checkpoint.md', '# Checkpoint\n\nSummary and next steps from a chat.\n')
  const doctrine = buildRecord('docs/handoffs/2026-05-19-doctrine-promotion.md', '# Doctrine\n\nlessons learned promoted into doctrine.\n')
  const privateExcluded = !isCandidate('memory/2026-05-19.md', '# private memory\n')
  const reconstructedIsNotExact = reconstructed.fidelityClass === 'reconstructed_near_verbatim' && reconstructed.exactTranscript === false
  const summaryIsNotTranscript = summary.fidelityClass === 'summary_checkpoint' && summary.exactTranscript === false
  const rawIsExact = raw.fidelityClass === 'raw_native_export' && raw.exactTranscript === true
  const doctrineClassified = doctrine.fidelityClass === 'extracted_doctrine'
  const ok = rawIsExact && reconstructedIsNotExact && summaryIsNotTranscript && privateExcluded && doctrineClassified

  return {
    ok,
    rawIsExact,
    reconstructedIsNotExact,
    summaryIsNotTranscript,
    privateExcluded,
    doctrineClassified,
    invariant: 'Only raw/provider exports can claim exact transcript fidelity; reconstructed and summary artifacts stay explicitly labeled.',
  }
}

export function buildConversationArchiveManifestMarkdown(snapshot = {}) {
  const summary = snapshot.summary || {}
  const bySourceType = snapshot.browse?.bySourceType || {}
  const byFidelityClass = snapshot.browse?.byFidelityClass || {}
  const topRecords = [...(snapshot.records || [])]
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')) || String(left.title || '').localeCompare(String(right.title || '')))
    .slice(0, 40)

  const lines = [
    '# Conversation Archive',
    '',
    'Generated from tracked repo artifacts. Private local memory files, raw chat databases, tokens, and runtime state are excluded.',
    '',
    '## Summary',
    '',
    `- Records: ${summary.recordCount || 0}`,
    `- Reconstructed transcripts: ${summary.reconstructedCount || 0}`,
    `- Summary/checkpoints: ${summary.summaryCheckpointCount || 0}`,
    `- Extracted doctrine artifacts: ${summary.extractedDoctrineCount || 0}`,
    `- Records linked to backlog IDs: ${summary.linkedBacklogRecordCount || 0}`,
    '',
    '## Fidelity Classes',
    '',
    ...MEMORY_003_FIDELITY_CLASSES.map(item => `- ${item.id}: ${item.label}; exactTranscript=${item.exactTranscript ? 'yes' : 'no'}`),
    '',
    '## Browse Counts',
    '',
    'Source types:',
    ...Object.entries(bySourceType).map(([key, count]) => `- ${key}: ${count}`),
    '',
    'Fidelity:',
    ...Object.entries(byFidelityClass).map(([key, count]) => `- ${key}: ${count}`),
    '',
    '## Recent / High-Signal Records',
    '',
    ...topRecords.map(record => `- ${record.date || 'undated'} | ${record.fidelityClass} | ${record.sourceType} | ${record.path}`),
    '',
    '## Ingest Paths',
    '',
    ...MEMORY_003_INGEST_PATHS.map(pathInfo => `- ${pathInfo.id}: ${pathInfo.status}; ${pathInfo.privacyBoundary}`),
    '',
  ]
  return `${lines.join('\n')}\n`
}

export function buildConversationArchiveManifestJson(snapshot = {}) {
  return `${JSON.stringify(snapshot)}\n`
}

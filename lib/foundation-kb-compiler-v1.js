import { evaluateKnowledgeBaseQualityGate } from './foundation-knowledge-base-quality-gate.js'

export const FOUNDATION_KB_COMPILER_V1_CARD_ID = 'FOUNDATION-KB-COMPILER-V1-001'
export const FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY = 'foundation-kb-compiler-v1'
export const FOUNDATION_KB_COMPILER_V1_PLAN_PATH = 'docs/process/foundation-kb-compiler-v1-001-plan.md'
export const FOUNDATION_KB_COMPILER_V1_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-KB-COMPILER-V1-001.json'
export const FOUNDATION_KB_COMPILER_V1_SCRIPT_PATH = 'scripts/process-foundation-kb-compiler-v1-check.mjs'
export const FOUNDATION_KB_COMPILER_V1_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-foundation-kb-compiler-v1-closeout.md'
export const FOUNDATION_KB_COMPILER_V1_SPRINT_ID = 'foundation-kb-compiler-v1-2026-05-18'
export const FOUNDATION_KB_COMPILER_V1_COMPILER_VERSION = 'foundation-kb-compiler-v1'

export const FOUNDATION_KB_COMPILER_V1_CHANGED_FILES = [
  'lib/foundation-kb-compiler-v1.js',
  'scripts/process-foundation-kb-compiler-v1-check.mjs',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'docs/process/foundation-kb-compiler-v1-001-plan.md',
  'docs/process/approvals/FOUNDATION-KB-COMPILER-V1-001.json',
  'docs/_archive/handoffs/2026-05-18-foundation-kb-compiler-v1-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const FOUNDATION_KB_COMPILER_V1_PROOF_COMMANDS = [
  'node --check lib/foundation-kb-compiler-v1.js lib/foundation-intelligence-audit-verifier.js scripts/process-foundation-kb-compiler-v1-check.mjs scripts/foundation-verify.mjs',
  'npm run process:foundation-kb-compiler-v1-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=FOUNDATION-KB-COMPILER-V1-001 --planApprovalRef=docs/process/approvals/FOUNDATION-KB-COMPILER-V1-001.json --closeoutKey=foundation-kb-compiler-v1 --commitRef=HEAD',
]

export const FOUNDATION_KB_COMPILER_V1_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No transcript fetch, screenshot capture, crawl, summarization, or model call.',
  'No auth-required or paid extraction.',
  'No external writes.',
  'No Research Inbox write, atom creation, backlog mutation, query index write, vector table write, or compiled page write.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.',
  'Do not mutate Google Drive permissions.',
  'No live Agent Feedback auto-send.',
]

const SOURCE_TYPE_LABELS = {
  atom: 'Atom',
  synthesis_fact: 'Synthesis fact',
  decision: 'Decision',
  doc: 'Document',
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function unique(values = []) {
  return [...new Set(values.map(value => text(value)).filter(Boolean))]
}

function normalizePrivacyTier(value, minTier = 1) {
  const normalized = text(value)
  if (['public', 'internal', 'restricted', 'owner_private'].includes(normalized)) return normalized
  if (Number(minTier) >= 3) return 'restricted'
  if (Number(minTier) === 2) return 'internal'
  return 'internal'
}

function maxPrivacyTier(records = []) {
  const rank = { public: 0, internal: 1, restricted: 2, owner_private: 3 }
  return records.reduce((current, record) => {
    const next = normalizePrivacyTier(record.privacyTier, record.minTier)
    return rank[next] > rank[current] ? next : current
  }, 'internal')
}

function stableCitationId(record, index) {
  const key = text(record.recordId || record.id || record.title || `record-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  return `cite-${key || index + 1}`
}

function normalizeRecord(record = {}, index = 0) {
  const recordType = text(record.recordType || record.type || 'source_record')
  const recordId = text(record.recordId || record.id || record.atomId || record.factId || record.decisionId || record.docId)
  const sourceId = text(record.sourceId || record.source_id)
  const title = text(record.title)
  const claim = text(record.claim || record.derivedClaim || record.summary || record.content)
  const evidenceRef = text(record.evidenceRef || record.sourceUrl || record.sourceRef || record.artifactId || record.evidenceId || record.targetDocPath)
  const citationId = stableCitationId({ recordId, title }, index)

  return {
    recordType,
    recordId,
    title,
    claim,
    sourceId,
    citationId,
    evidenceRef,
    capturedAt: record.capturedAt || record.asOf || record.updatedAt || record.createdAt || '2026-05-18T00:00:00.000-04:00',
    privacyTier: normalizePrivacyTier(record.privacyTier, record.minTier),
    minTier: Number(record.minTier || 1),
    status: text(record.status || 'active'),
    sourceLabel: SOURCE_TYPE_LABELS[recordType] || recordType,
  }
}

function validateSourceRecord(record = {}) {
  const failures = []
  if (!text(record.recordId)) failures.push('missing_record_id')
  if (!text(record.title)) failures.push('missing_title')
  if (!text(record.claim)) failures.push('missing_claim')
  if (!text(record.sourceId)) failures.push('missing_source_id')
  if (!text(record.evidenceRef)) failures.push('missing_evidence_ref')
  if (!text(record.citationId)) failures.push('missing_citation_id')
  return {
    ok: failures.length === 0,
    failures,
  }
}

export function normalizeFoundationKbCompilerV1Records(records = []) {
  return list(records).map(normalizeRecord)
}

export function buildFoundationKbCompilerV1FixtureRecords() {
  return [
    {
      recordType: 'synthesis_fact',
      recordId: 'fact:strategy-source',
      title: 'Strategy docs are governed source truth',
      claim: 'Business Strategy Docs are the governed source for vision, engine, priorities, mandates, and assumptions.',
      sourceId: 'SRC-STRATEGY-001',
      evidenceRef: 'docs/business-strategy.md',
      minTier: 1,
      asOf: '2026-05-17T00:00:00.000-04:00',
    },
    {
      recordType: 'decision',
      recordId: 'DEC-005',
      title: 'Live values come from source contracts',
      claim: 'Live operating values must render from source IDs instead of markdown snapshots.',
      sourceId: 'SRC-STRATEGY-001',
      evidenceRef: 'Strategy lock pass on live source-of-truth rendering',
      minTier: 1,
      updatedAt: '2026-04-22T04:04:12.672Z',
    },
    {
      recordType: 'atom',
      recordId: 'atom:source-backed-proof',
      title: 'Source-backed atoms feed compiled knowledge',
      claim: 'Recurring operational evidence can become compiled knowledge only when it keeps source IDs, citations, and freshness metadata.',
      sourceId: 'SRC-MEETINGS-001',
      evidenceRef: 'artifact://meeting/source-backed-proof',
      minTier: 1,
      updatedAt: '2026-05-17T14:58:43.999Z',
    },
  ]
}

export function compileFoundationKbDraft(input = {}) {
  const records = normalizeFoundationKbCompilerV1Records(input.records || buildFoundationKbCompilerV1FixtureRecords())
  const recordValidations = records.map(validateSourceRecord)
  const validRecords = records.filter((record, index) => recordValidations[index]?.ok)
  const sourceIds = unique(validRecords.map(record => record.sourceId))
  const now = input.compiledAt || '2026-05-18T00:00:00.000-04:00'
  const staleAfter = input.staleAfter || '2026-06-18T00:00:00.000-04:00'
  const privacyTier = input.privacyTier || maxPrivacyTier(validRecords)
  const content = [
    '# Foundation KB Compiler V1 Draft',
    '',
    ...validRecords.map((record, index) => [
      `## ${index + 1}. ${record.title}`,
      '',
      `${record.claim} [${record.citationId}]`,
      '',
      `Source: ${record.sourceId}`,
    ].join('\n')),
  ].join('\n')
  const citations = validRecords.map(record => ({
    id: record.citationId,
    sourceId: record.sourceId,
    url: /^https?:\/\//.test(record.evidenceRef) ? record.evidenceRef : undefined,
    artifactId: /^https?:\/\//.test(record.evidenceRef) ? undefined : record.evidenceRef,
    capturedAt: record.capturedAt,
  }))
  const claims = validRecords.map((record, index) => ({
    id: `claim-${index + 1}`,
    text: record.claim,
    claimType: record.recordType === 'decision' ? 'doctrine' : 'claim',
    sourceId: record.sourceId,
    citationId: record.citationId,
  }))
  const page = {
    frontmatter: {
      pageId: input.pageId || 'kb-foundation-compiler-v1-draft',
      title: input.title || 'Foundation KB Compiler V1 Draft',
      owner: 'Foundation',
      sourceIds,
      privacyTier,
      compilerVersion: FOUNDATION_KB_COMPILER_V1_COMPILER_VERSION,
      lastCompiledAt: now,
      staleAfter,
    },
    pageRole: 'root',
    linkedFrom: [],
    linksTo: [],
    citations,
    claims,
    contradictions: [],
    content,
  }
  const gate = evaluateKnowledgeBaseQualityGate({
    status: 'ready',
    ownerLayer: 'Foundation',
    proposalOnly: true,
    implementationWritesStarted: input.compiledPageWriteStarted === true,
    liveExtractionStarted: input.liveExtractionStarted === true,
    modelCallsStarted: input.modelCallsStarted === true,
    externalWritesStarted: input.externalWritesStarted === true,
    policy: {
      now,
      maxPageChars: 12000,
      maxClaims: 80,
      maxAgentConsumptionTier: 'restricted',
      requireFrontmatterFields: ['pageId', 'title', 'owner', 'sourceIds', 'privacyTier', 'compilerVersion', 'lastCompiledAt', 'staleAfter'],
      requireCitationPerClaim: true,
      allowRootOrphans: true,
    },
    pages: [page],
  })
  const failures = [
    ...recordValidations.flatMap((validation, index) =>
      validation.failures.map(failure => `${records[index]?.recordId || `record-${index + 1}`}:${failure}`)
    ),
    ...gate.violations.map(violation => `${violation.pageId}:${violation.ruleId}`),
  ]

  return {
    cardId: FOUNDATION_KB_COMPILER_V1_CARD_ID,
    closeoutKey: FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY,
    status: failures.length ? 'fail_closed' : 'draft_ready',
    proposalOnly: true,
    writesCompiledPage: false,
    writesQueryIndex: false,
    writesResearchInbox: false,
    writesAtoms: false,
    writesBacklog: false,
    liveExtractionStarted: input.liveExtractionStarted === true,
    modelCallsStarted: input.modelCallsStarted === true,
    externalWritesStarted: input.externalWritesStarted === true,
    sourceRecords: records,
    recordValidations,
    compiledPageDraft: page,
    qualityGate: gate,
    failures,
    summary: {
      sourceRecordCount: records.length,
      validSourceRecordCount: validRecords.length,
      sourceIds,
      sourceTypes: unique(validRecords.map(record => record.recordType)),
      claimCount: claims.length,
      citationCount: citations.length,
      privacyTier,
      qualityGateStatus: gate.status,
      qualityGateViolations: gate.summary.violationCount,
    },
  }
}

export function buildFoundationKbCompilerV1DogfoodProof() {
  const healthy = compileFoundationKbDraft()
  const missingSourceId = compileFoundationKbDraft({
    records: buildFoundationKbCompilerV1FixtureRecords().map((record, index) =>
      index === 0 ? { ...record, sourceId: '' } : record
    ),
  })
  const missingCitation = compileFoundationKbDraft({
    records: buildFoundationKbCompilerV1FixtureRecords().map((record, index) =>
      index === 1 ? { ...record, evidenceRef: '' } : record
    ),
  })
  const staleDraft = compileFoundationKbDraft({
    staleAfter: '2026-05-01T00:00:00.000-04:00',
  })
  const unsafeLiveRun = compileFoundationKbDraft({
    liveExtractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
    compiledPageWriteStarted: true,
  })

  return {
    ok: healthy.status === 'draft_ready' &&
      healthy.qualityGate.ok === true &&
      missingSourceId.status === 'fail_closed' &&
      missingCitation.status === 'fail_closed' &&
      staleDraft.status === 'fail_closed' &&
      unsafeLiveRun.status === 'fail_closed' &&
      healthy.writesCompiledPage === false &&
      healthy.writesResearchInbox === false &&
      healthy.writesBacklog === false,
    healthy,
    rejectedCases: {
      missingSourceId: missingSourceId.status,
      missingCitation: missingCitation.status,
      staleDraft: staleDraft.status,
      unsafeLiveRun: unsafeLiveRun.status,
    },
    invariant: 'Existing source-backed records compile to a proposal-only draft; missing source IDs, missing citations, stale freshness, live extraction/model/external-write attempts, and compiled-page writes fail closed.',
  }
}

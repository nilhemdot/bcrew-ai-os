export const FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-008'
export const FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SPRINT_ID = 'foundation-db-shared-comms-coverage-split-2026-05-15'
export const FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CLOSEOUT_KEY = 'foundation-shared-comms-coverage-split-v1'
export const FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-shared-comms-coverage-split-008-plan.md'
export const FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-008.json'
export const FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-shared-comms-coverage-split-check.mjs'
export const FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_BEFORE_LINES = 11464

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addEvaluationCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function createEmptySourceCoverage(sourceId, initial = {}) {
  return {
    sourceId,
    totalArtifacts: Number(initial.totalArtifacts || 0),
    artifactsWithCandidates: Number(initial.artifactsWithCandidates || 0),
    artifactsWithoutCandidates: Number(initial.artifactsWithoutCandidates || 0),
    artifactsProcessed: Number(initial.artifactsProcessed || 0),
    artifactsPendingProcessing: Number(initial.artifactsPendingProcessing || 0),
    processingCoveragePercent: 0,
    extractionCoveragePercent: 0,
    totalCandidates: Number(initial.totalCandidates || 0),
    artifactTypes: {},
    candidateTypes: {},
    oldestArtifactAt: null,
    newestArtifactAt: null,
    firstIngestedAt: null,
    lastIngestedAt: null,
  }
}

function getOrCreateSourceCoverage(bySource, sourceId, initial = {}) {
  const source = String(sourceId || '').trim()
  if (!bySource[source]) {
    bySource[source] = createEmptySourceCoverage(source, initial)
  }
  return bySource[source]
}

function updateBoundaryTimestamp(target, field, value) {
  if (!value) return
  if (!target[field]) {
    target[field] = value
    return
  }
  if (field.startsWith('oldest') || field.startsWith('first')) {
    target[field] = new Date(value) < new Date(target[field]) ? value : target[field]
  } else {
    target[field] = new Date(value) > new Date(target[field]) ? value : target[field]
  }
}

function calculateCoveragePercent(part, total) {
  const normalizedTotal = Number(total || 0)
  if (!normalizedTotal) return 0
  return Math.round((Number(part || 0) / normalizedTotal) * 1000) / 10
}

export function buildSharedCommunicationCoverageSnapshotFromRows({
  artifactRows = [],
  candidateRows = [],
  candidateArtifactRows = [],
  processingArtifactRows = [],
  latestSynthesisRows = [],
} = {}) {
  const bySource = {}
  let totalArtifacts = 0
  let totalCandidates = 0

  for (const row of artifactRows) {
    const source = row.source_id
    const total = Number(row.total || 0)
    totalArtifacts += total
    const target = getOrCreateSourceCoverage(bySource, source)
    target.totalArtifacts += total
    target.artifactTypes[row.artifact_type] = {
      total,
      artifactsWithCandidates: 0,
      artifactsWithoutCandidates: total,
      artifactsProcessed: 0,
      artifactsPendingProcessing: total,
      processingCoveragePercent: 0,
      extractionCoveragePercent: 0,
      oldestArtifactAt: row.oldest_artifact_at ?? null,
      newestArtifactAt: row.newest_artifact_at ?? null,
      firstIngestedAt: row.first_ingested_at ?? null,
      lastIngestedAt: row.last_ingested_at ?? null,
    }

    for (const [field, value] of [
      ['oldestArtifactAt', row.oldest_artifact_at],
      ['newestArtifactAt', row.newest_artifact_at],
      ['firstIngestedAt', row.first_ingested_at],
      ['lastIngestedAt', row.last_ingested_at],
    ]) {
      updateBoundaryTimestamp(target, field, value)
    }
  }

  for (const row of candidateRows) {
    const source = row.source_id
    const total = Number(row.total || 0)
    totalCandidates += total
    const target = getOrCreateSourceCoverage(bySource, source)
    target.totalCandidates += total
    target.candidateTypes[`${row.candidate_type}:${row.status}`] = total
  }

  for (const row of candidateArtifactRows) {
    const source = row.source_id
    const totalArtifactsForType = Number(row.total_artifacts || 0)
    const withCandidatesForType = Number(row.artifacts_with_candidates || 0)
    const withoutCandidatesForType = Math.max(0, totalArtifactsForType - withCandidatesForType)
    const target = getOrCreateSourceCoverage(bySource, source, { totalArtifacts: totalArtifactsForType })
    target.artifactsWithCandidates += withCandidatesForType
    target.artifactsWithoutCandidates += withoutCandidatesForType
    if (!target.artifactTypes[row.artifact_type]) {
      target.artifactTypes[row.artifact_type] = {
        total: totalArtifactsForType,
        oldestArtifactAt: null,
        newestArtifactAt: null,
        firstIngestedAt: null,
        lastIngestedAt: null,
      }
    }
    target.artifactTypes[row.artifact_type].artifactsWithCandidates = withCandidatesForType
    target.artifactTypes[row.artifact_type].artifactsWithoutCandidates = withoutCandidatesForType
    target.artifactTypes[row.artifact_type].extractionCoveragePercent = calculateCoveragePercent(withCandidatesForType, totalArtifactsForType)
  }

  for (const row of processingArtifactRows) {
    const source = row.source_id
    const target = getOrCreateSourceCoverage(bySource, source)
    const totalArtifactsForType = Number(target.artifactTypes?.[row.artifact_type]?.total || 0)
    const processedForType = Number(row.artifacts_processed || 0)
    const pendingForType = Math.max(0, totalArtifactsForType - processedForType)
    target.artifactsProcessed += processedForType
    target.artifactsPendingProcessing += pendingForType
    if (!target.artifactTypes[row.artifact_type]) {
      target.artifactTypes[row.artifact_type] = {
        total: totalArtifactsForType,
        artifactsWithCandidates: 0,
        artifactsWithoutCandidates: totalArtifactsForType,
        artifactsProcessed: 0,
        artifactsPendingProcessing: totalArtifactsForType,
        processingCoveragePercent: 0,
        extractionCoveragePercent: 0,
        oldestArtifactAt: null,
        newestArtifactAt: null,
        firstIngestedAt: null,
        lastIngestedAt: null,
      }
    }
    target.artifactTypes[row.artifact_type].artifactsProcessed = processedForType
    target.artifactTypes[row.artifact_type].artifactsPendingProcessing = pendingForType
    target.artifactTypes[row.artifact_type].processingCoveragePercent = calculateCoveragePercent(processedForType, totalArtifactsForType)
  }

  for (const source of Object.values(bySource)) {
    source.extractionCoveragePercent = calculateCoveragePercent(source.artifactsWithCandidates, source.totalArtifacts)
    source.processingCoveragePercent = calculateCoveragePercent(source.artifactsProcessed, source.totalArtifacts)
    if (!source.artifactsPendingProcessing) {
      source.artifactsPendingProcessing = Math.max(0, source.totalArtifacts - source.artifactsProcessed)
    }
  }

  const latestSynthesis = latestSynthesisRows[0]
  return {
    generatedAt: new Date().toISOString(),
    totalArtifacts,
    totalCandidates,
    sources: Object.values(bySource),
    latestSynthesisRun: latestSynthesis
      ? {
          runId: latestSynthesis.run_id,
          title: latestSynthesis.title,
          candidatesRead: latestSynthesis.candidates_read,
          generatedAt: latestSynthesis.generated_at,
          outputPath: latestSynthesis.output_path,
        }
      : null,
  }
}

export async function getSharedCommunicationCoverageSnapshotFromDb({ pool } = {}) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('Shared communication coverage requires a queryable pool.')
  }

  const [
    artifactResult,
    candidateResult,
    candidateArtifactResult,
    processingArtifactResult,
    latestSynthesisResult,
  ] = await Promise.all([
    pool.query(
      `
        SELECT source_id, artifact_type, COUNT(*)::int AS total,
               MIN(artifact_updated_at) AS oldest_artifact_at,
               MAX(artifact_updated_at) AS newest_artifact_at,
               MIN(ingested_at) AS first_ingested_at,
               MAX(ingested_at) AS last_ingested_at
        FROM shared_communication_artifacts
        GROUP BY source_id, artifact_type
        ORDER BY source_id ASC, artifact_type ASC
      `
    ),
    pool.query(
      `
        SELECT source_id, candidate_type, status, COUNT(*)::int AS total
        FROM shared_communication_candidates
        GROUP BY source_id, candidate_type, status
        ORDER BY source_id ASC, candidate_type ASC, status ASC
      `
    ),
    pool.query(
      `
        SELECT artifact.source_id,
               artifact.artifact_type,
               COUNT(DISTINCT artifact.artifact_id)::int AS total_artifacts,
               COUNT(DISTINCT candidate.artifact_id)::int AS artifacts_with_candidates
        FROM shared_communication_artifacts artifact
        LEFT JOIN (
          SELECT DISTINCT artifact_id
          FROM shared_communication_candidates
          WHERE status <> 'rejected'
        ) candidate ON candidate.artifact_id = artifact.artifact_id
        GROUP BY artifact.source_id, artifact.artifact_type
        ORDER BY artifact.source_id ASC, artifact.artifact_type ASC
      `
    ),
    pool.query(
      `
        SELECT artifact.source_id,
               artifact.artifact_type,
               COUNT(DISTINCT processing.artifact_id)::int AS artifacts_processed
        FROM shared_communication_artifacts artifact
        LEFT JOIN shared_communication_artifact_processing_runs processing
          ON processing.artifact_id = artifact.artifact_id
         AND processing.status = 'succeeded'
         AND processing.processing_type = 'candidate_extraction'
         AND COALESCE(processing.artifact_content_hash, '') = COALESCE(artifact.content_hash, '')
        GROUP BY artifact.source_id, artifact.artifact_type
        ORDER BY artifact.source_id ASC, artifact.artifact_type ASC
      `
    ),
    pool.query(
      `
        SELECT run_id, title, candidates_read, generated_at, output_path
        FROM shared_communication_synthesis_runs
        ORDER BY generated_at DESC, created_at DESC
        LIMIT 1
      `
    ),
  ])

  return buildSharedCommunicationCoverageSnapshotFromRows({
    artifactRows: artifactResult.rows,
    candidateRows: candidateResult.rows,
    candidateArtifactRows: candidateArtifactResult.rows,
    processingArtifactRows: processingArtifactResult.rows,
    latestSynthesisRows: latestSynthesisResult.rows,
  })
}

export function evaluateFoundationSharedCommsCoverageSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  beforeLines = FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_BEFORE_LINES,
  afterLines = countTextLines(foundationDbSource),
} = {}) {
  const checks = []
  addEvaluationCheck(
    checks,
    moduleSource.includes('getSharedCommunicationCoverageSnapshotFromDb') &&
      moduleSource.includes('buildSharedCommunicationCoverageSnapshotFromRows') &&
      moduleSource.includes('evaluateFoundationSharedCommsCoverageSplit') &&
      moduleSource.includes('buildFoundationSharedCommsCoverageSplitDogfoodProof'),
    'shared-comms coverage module owns the extracted behavior and proof helpers',
    'module exports are present',
  )
  addEvaluationCheck(
    checks,
    moduleSource.includes('shared_communication_artifacts') &&
      moduleSource.includes('shared_communication_candidates') &&
      moduleSource.includes('shared_communication_artifact_processing_runs') &&
      moduleSource.includes('shared_communication_synthesis_runs'),
    'shared-comms coverage SQL moved into the module',
    'coverage tables are referenced in module',
  )
  addEvaluationCheck(
    checks,
    foundationDbSource.includes('./foundation-shared-comms-coverage.js') &&
      foundationDbSource.includes('getSharedCommunicationCoverageSnapshotFromDb') &&
      foundationDbSource.includes('return getSharedCommunicationCoverageSnapshotFromDb({ pool })'),
    'foundation-db delegates the public coverage export',
    'wrapper import and delegation present',
  )
  addEvaluationCheck(
    checks,
    !/export\s+async\s+function\s+getSharedCommunicationCoverageSnapshot\s*\(\)\s*{\s*const\s*\[/s.test(foundationDbSource) &&
      !foundationDbSource.includes('FROM shared_communication_artifacts\n        GROUP BY source_id, artifact_type'),
    'foundation-db no longer owns inline shared-comms coverage aggregation',
    'inline coverage query block absent',
  )
  addEvaluationCheck(
    checks,
    planSource.toLowerCase().includes('no new responsibility') &&
      planSource.includes('lib/foundation-shared-comms-coverage.js'),
    'plan contains the large-file split guardrail',
    'plan states no new DB monolith responsibility',
  )
  addEvaluationCheck(
    checks,
    !/upsertFoundationCurrentSprintOverlay|updateBacklogItem|createBacklogItem|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items/i.test(scriptSource),
    'focused proof stays read-only',
    'script does not import or call live-state mutators',
  )
  addEvaluationCheck(
    checks,
    Number(afterLines || 0) > 0 && Number(afterLines || 0) < Number(beforeLines || 0),
    'foundation-db line count decreases after the split',
    `${beforeLines}->${afterLines}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    beforeLines,
    afterLines,
  }
}

export async function buildFoundationSharedCommsCoverageSplitDogfoodProof({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  beforeLines = FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_BEFORE_LINES,
  afterLines = countTextLines(foundationDbSource),
} = {}) {
  const unsplit = evaluateFoundationSharedCommsCoverageSplit({
    foundationDbSource: `
      export async function getSharedCommunicationCoverageSnapshot() {
        const [artifactResult] = await Promise.all([])
        await pool.query('FROM shared_communication_artifacts\\n        GROUP BY source_id, artifact_type')
      }
    `,
    moduleSource: '',
    scriptSource: '',
    planSource: '',
    beforeLines,
    afterLines: beforeLines,
  })
  const split = evaluateFoundationSharedCommsCoverageSplit({
    foundationDbSource,
    moduleSource,
    scriptSource,
    planSource,
    beforeLines,
    afterLines,
  })
  const fixture = buildSharedCommunicationCoverageSnapshotFromRows({
    artifactRows: [
      {
        source_id: 'SRC-MISSIVE-001',
        artifact_type: 'missive_thread',
        total: 4,
        oldest_artifact_at: '2026-05-01T00:00:00.000Z',
        newest_artifact_at: '2026-05-04T00:00:00.000Z',
        first_ingested_at: '2026-05-01T01:00:00.000Z',
        last_ingested_at: '2026-05-04T01:00:00.000Z',
      },
    ],
    candidateRows: [
      { source_id: 'SRC-MISSIVE-001', candidate_type: 'task', status: 'review', total: 2 },
      { source_id: 'SRC-MISSIVE-001', candidate_type: 'decision', status: 'applied', total: 1 },
    ],
    candidateArtifactRows: [
      { source_id: 'SRC-MISSIVE-001', artifact_type: 'missive_thread', total_artifacts: 4, artifacts_with_candidates: 3 },
    ],
    processingArtifactRows: [
      { source_id: 'SRC-MISSIVE-001', artifact_type: 'missive_thread', artifacts_processed: 2 },
    ],
    latestSynthesisRows: [
      {
        run_id: 'synthesis-run-1',
        title: 'Synthetic synthesis',
        candidates_read: 3,
        generated_at: '2026-05-05T00:00:00.000Z',
        output_path: 'docs/handoffs/synthetic.md',
      },
    ],
  })
  const source = fixture.sources.find(item => item.sourceId === 'SRC-MISSIVE-001')
  const syntheticBehaviorOk = fixture.totalArtifacts === 4 &&
    fixture.totalCandidates === 3 &&
    source?.artifactsWithCandidates === 3 &&
    source?.artifactsWithoutCandidates === 1 &&
    source?.artifactsProcessed === 2 &&
    source?.artifactsPendingProcessing === 2 &&
    source?.extractionCoveragePercent === 75 &&
    source?.processingCoveragePercent === 50 &&
    source?.candidateTypes?.['task:review'] === 2 &&
    fixture.latestSynthesisRun?.runId === 'synthesis-run-1'

  return {
    ok: unsplit.ok === false && split.ok === true && syntheticBehaviorOk,
    unsplit,
    split,
    syntheticBehaviorOk,
    fixture,
    dogfoodInvariant: 'Old inline shared-comms coverage ownership fails; split module ownership passes and preserves coverage aggregation math.',
  }
}

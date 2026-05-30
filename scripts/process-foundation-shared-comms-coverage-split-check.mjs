#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_APPROVAL_PATH,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_BEFORE_LINES,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_PLAN_PATH,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SCRIPT_PATH,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SPRINT_ID,
  buildFoundationSharedCommsCoverageSplitDogfoodProof,
  evaluateFoundationSharedCommsCoverageSplit,
  getSharedCommunicationCoverageSnapshotFromDb,
} from '../lib/foundation-shared-comms-coverage.js'
import {
  getActiveFoundationCurrentSprint,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

const repoRoot = process.cwd()

function hasArg(name) {
  return process.argv.includes(name) || process.argv.includes(`${name}=true`)
}

function addFinding(findings, ok, check, detail) {
  findings.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function containsJoinedToken(source, parts) {
  return String(source || '').includes(parts.join(''))
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function lineCount(relativePath) {
  const source = await readRepoFile(relativePath)
  return source.split('\n').length
}

function buildFakePool() {
  return {
    async query(sql) {
      const text = String(sql || '')
      if (text.includes('COUNT(*)::int AS total') && text.includes('FROM shared_communication_artifacts') && text.includes('MIN(artifact_updated_at)')) {
        return {
          rows: [
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
        }
      }
      if (text.includes('FROM shared_communication_candidates') && text.includes('GROUP BY source_id, candidate_type, status')) {
        return {
          rows: [
            { source_id: 'SRC-MISSIVE-001', candidate_type: 'task', status: 'review', total: 2 },
            { source_id: 'SRC-MISSIVE-001', candidate_type: 'decision', status: 'applied', total: 1 },
          ],
        }
      }
      if (text.includes('COUNT(DISTINCT artifact.artifact_id)::int AS total_artifacts')) {
        return {
          rows: [
            { source_id: 'SRC-MISSIVE-001', artifact_type: 'missive_thread', total_artifacts: 4, artifacts_with_candidates: 3 },
          ],
        }
      }
      if (text.includes('COUNT(DISTINCT processing.artifact_id)::int AS artifacts_processed')) {
        return {
          rows: [
            { source_id: 'SRC-MISSIVE-001', artifact_type: 'missive_thread', artifacts_processed: 2 },
          ],
        }
      }
      if (text.includes('FROM shared_communication_synthesis_runs')) {
        return {
          rows: [
            {
              run_id: 'synthesis-run-1',
              title: 'Synthetic synthesis',
              candidates_read: 3,
              generated_at: '2026-05-05T00:00:00.000Z',
              output_path: 'docs/handoffs/synthetic.md',
            },
          ],
        }
      }
      throw new Error(`Unexpected fake query: ${text.slice(0, 120)}`)
    },
  }
}

async function main() {
  const foundationDbSource = await readRepoFile('lib/foundation-db.js')
  const moduleSource = await readRepoFile('lib/foundation-shared-comms-coverage.js')
  const scriptSource = await readRepoFile(FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SCRIPT_PATH)
  const planSource = await readRepoFile(FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_PLAN_PATH)
  const afterLines = await lineCount('lib/foundation-db.js')
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID])
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_APPROVAL_PATH,
    cardId: FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID,
  })
  const evaluation = evaluateFoundationSharedCommsCoverageSplit({
    foundationDbSource,
    moduleSource,
    scriptSource,
    planSource,
    beforeLines: FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_BEFORE_LINES,
    afterLines,
  })
  const dogfood = await buildFoundationSharedCommsCoverageSplitDogfoodProof({
    foundationDbSource,
    moduleSource,
    scriptSource,
    planSource,
    beforeLines: FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_BEFORE_LINES,
    afterLines,
  })
  const fakeSnapshot = await getSharedCommunicationCoverageSnapshotFromDb({ pool: buildFakePool() })
  const fakeSource = fakeSnapshot.sources.find(source => source.sourceId === 'SRC-MISSIVE-001')
  const fakeSnapshotOk = fakeSnapshot.totalArtifacts === 4 &&
    fakeSnapshot.totalCandidates === 3 &&
    fakeSource?.artifactsWithCandidates === 3 &&
    fakeSource?.artifactsWithoutCandidates === 1 &&
    fakeSource?.artifactsProcessed === 2 &&
    fakeSource?.artifactsPendingProcessing === 2 &&
    fakeSource?.extractionCoveragePercent === 75 &&
    fakeSource?.processingCoveragePercent === 50 &&
    fakeSource?.candidateTypes?.['task:review'] === 2 &&
    fakeSnapshot.latestSynthesisRun?.runId === 'synthesis-run-1'
  const activeItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID)
  const currentSprintOk = activeSprint.sprint?.sprintId === FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SPRINT_ID &&
    ['building_now', 'done_this_sprint'].includes(activeItem?.stage)
  const latestPlanCritic = planCriticRuns[0] || null
  const planCriticOk = latestPlanCritic?.status === 'pass' && Number(latestPlanCritic?.score) >= 9.8
  const packageJson = JSON.parse(await readRepoFile('package.json'))

  const findings = []
  addFinding(findings, approval.ok, 'approval file validates', approval.ok ? approval.mode : approval.failures.map(f => f.check).join(', '))
  addFinding(findings, currentSprintOk, 'Current Sprint has the card building or done', activeItem ? `${activeSprint.sprint?.sprintId}:${activeItem.stage}` : 'missing active item')
  addFinding(findings, planCriticOk, 'Plan Critic pass is logged', latestPlanCritic ? `${latestPlanCritic.status} ${latestPlanCritic.score}` : 'missing')
  addFinding(findings, evaluation.ok, 'module extraction shape is valid', JSON.stringify(evaluation))
  addFinding(findings, dogfood.ok, 'dogfood rejects old inline shared-comms coverage ownership', JSON.stringify(dogfood))
  addFinding(findings, fakeSnapshotOk, 'synthetic shared-comms coverage math is preserved', JSON.stringify(fakeSnapshot))
  const liveConnectorTokens = [
    ['missive', 'Request'],
    ['list', 'Missive', 'Inbox'],
    ['..', '/lib/', 'missive'],
    ['..', '/lib/', 'gmail'],
    ['..', '/lib/', 'slack'],
    ['google', '-delegated'],
  ]
  const hasLiveConnectorToken = liveConnectorTokens.some(parts => containsJoinedToken(scriptSource, parts))
  addFinding(findings, !hasLiveConnectorToken, 'focused proof avoids live connectors', 'script uses synthetic fake pool only')
  const mutatorTokens = [
    ['upsert', 'FoundationCurrentSprintOverlay'],
    ['update', 'BacklogItem'],
    ['create', 'BacklogItem'],
  ]
  const hasMutatorToken = mutatorTokens.some(parts => containsJoinedToken(scriptSource, parts))
  addFinding(
    findings,
    !hasMutatorToken,
    'focused proof is read-only',
    'script does not import or call live DB mutators',
  )
  addFinding(findings, packageJson.scripts?.['process:foundation-shared-comms-coverage-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-shared-comms-coverage-split-check'] || 'missing')
  addFinding(findings, await fileExists(FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_PLAN_PATH), 'plan exists', FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_PLAN_PATH)
  addFinding(findings, await fileExists(FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_APPROVAL_PATH), 'approval exists', FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_APPROVAL_PATH)
  addFinding(findings, foundationDbSource.includes('return getSharedCommunicationCoverageSnapshotFromDb({ pool })'), 'foundation-db.js delegates public export', 'wrapper present')
  addFinding(findings, afterLines < FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_BEFORE_LINES, 'foundation-db.js line count decreased', `${FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_BEFORE_LINES}->${afterLines}`)
  addFinding(findings, FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CLOSEOUT_KEY === 'foundation-shared-comms-coverage-split-v1', 'closeout key is stable', FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CLOSEOUT_KEY)

  const failures = findings.filter(finding => !finding.ok)
  const summary = {
    ok: failures.length === 0,
    cardId: FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CLOSEOUT_KEY,
    afterLines,
    beforeLines: FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_BEFORE_LINES,
    dogfood,
    fakeSnapshot,
    evaluation,
    findings,
    failures,
  }

  if (hasArg('--json')) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation shared-comms coverage split check: ${summary.ok ? 'PASS' : 'FAIL'}`)
    findings.forEach(finding => console.log(`${finding.ok ? 'PASS' : 'FAIL'} ${finding.check} -> ${finding.detail}`))
  }

  process.exit(summary.ok ? 0 : 1)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  closeFoundationDb,
  initFoundationDb,
  recordRetrievalRun,
  searchIntelligenceChunks,
  searchIntelligenceEvidenceHybrid,
} from '../lib/foundation-db.js'
import { callEmbedding } from '../lib/llm-router.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const DEFAULT_FIXTURE = 'docs/specs/2026-04-27-intelligence-retrieval-eval-baseline.json'
const EMBEDDING_DIMENSIONS = 1536

function parseArgs(argv) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function uniqueText(values) {
  return Array.from(new Set((values || []).map(value => String(value || '').trim()).filter(Boolean)))
}

function normalizeText(value) {
  return String(value || '').toLowerCase()
}

async function loadFixture(relativePath) {
  const fullPath = path.resolve(repoRoot, relativePath || DEFAULT_FIXTURE)
  const text = await fs.readFile(fullPath, 'utf8')
  const fixture = JSON.parse(text)
  fixture.fixturePath = path.relative(repoRoot, fullPath)
  return fixture
}

function validateFixture(fixture) {
  if (!fixture?.id) throw new Error('Retrieval eval fixture requires id.')
  if (!Array.isArray(fixture.cases) || fixture.cases.length < 20) {
    throw new Error('Retrieval eval fixture requires at least 20 cases.')
  }
  const distinctSources = new Set(fixture.cases.map(item => item.sourceId).filter(Boolean))
  if (distinctSources.size < Number(fixture.requiredDistinctSources || 3)) {
    throw new Error('Retrieval eval fixture must cover at least 3 source IDs.')
  }
  fixture.cases.forEach(item => {
    if (!item.id || !item.query || !item.sourceId || !item.expectedAtomId) {
      throw new Error(`Retrieval eval case is incomplete: ${JSON.stringify(item)}`)
    }
  })
}

function resultMatchesCase(result, testCase) {
  if (!result) return false
  if (testCase.expectedAtomId && result.atomId !== testCase.expectedAtomId) return false
  if (testCase.expectedCandidateKey && result.candidateKey !== testCase.expectedCandidateKey) return false
  if (testCase.expectedChunkId && result.chunk?.chunkId !== testCase.expectedChunkId && result.chunkId !== testCase.expectedChunkId) return false
  return true
}

function evaluateCase({ testCase, lexicalResults, hybridResults, maxTier }) {
  const lexicalRank = lexicalResults.findIndex(result => resultMatchesCase(result, testCase)) + 1
  const hybridRank = hybridResults.results.findIndex(result => resultMatchesCase(result, testCase)) + 1
  const hybridMatch = hybridRank > 0 ? hybridResults.results[hybridRank - 1] : null
  const requiredMatchedBy = Array.isArray(testCase.requiredMatchedBy) ? testCase.requiredMatchedBy : []
  const matchedBy = Array.isArray(hybridMatch?.matchedBy) ? hybridMatch.matchedBy : []
  const titleNeedle = normalizeText(testCase.expectedTitleIncludes)
  const titleOk = titleNeedle
    ? normalizeText(hybridMatch?.title).includes(titleNeedle)
    : true
  const matchedByOk = requiredMatchedBy.every(lane => matchedBy.includes(lane))
  const sourceOk = hybridMatch?.sourceId === testCase.sourceId
  const tierOk = Number(hybridMatch?.minTier || 99) <= maxTier
  const lexicalOk = lexicalRank > 0 && lexicalRank <= Number(testCase.mustAppearInTopN || 10)
  const hybridOk = hybridRank > 0 && hybridRank <= Number(testCase.mustAppearInTopN || 10)
  const passed = lexicalOk && hybridOk && matchedByOk && sourceOk && tierOk && titleOk

  return {
    id: testCase.id,
    sourceId: testCase.sourceId,
    expectedAtomId: testCase.expectedAtomId,
    passed,
    lexicalRank: lexicalRank || null,
    hybridRank: hybridRank || null,
    sourceOk,
    tierOk,
    titleOk,
    matchedByOk,
    matchedBy,
  }
}

function safeRunSummary(run = {}) {
  return {
    runId: run.runId,
    runType: run.runType,
    status: run.status,
    requestedBy: run.requestedBy,
    sourceIds: run.sourceIds || [],
    searchResultCount: run.searchResultCount,
    maxTier: run.maxTier,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  }
}

async function recordEvalRun({ fixture, status, caseResults, embeddingCallId, startedAt }) {
  const passedCases = caseResults.filter(item => item.passed).length
  const failedCases = caseResults.filter(item => !item.passed)
  const sourceIds = uniqueText(fixture.cases.map(item => item.sourceId))
  const runId = `retrieval-eval-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
  return recordRetrievalRun({
    runId,
    runType: 'retrieval_eval',
    status,
    requestedBy: 'retrieval-eval',
    sourceIds,
    searchQuery: fixture.id,
    searchResultCount: passedCases,
    maxTier: fixture.maxTier || 1,
    metadata: {
      fixtureId: fixture.id,
      fixturePath: fixture.fixturePath,
      command: 'npm run intelligence:retrieval-eval',
      totalCases: fixture.cases.length,
      passedCases,
      failedCases: failedCases.map(item => item.id),
      passRate: caseResults.length ? passedCases / caseResults.length : 0,
      requiredDistinctSources: fixture.requiredDistinctSources || 3,
      distinctSources: sourceIds.length,
      embeddingCallId,
      caseResults,
    },
    startedAt,
    finishedAt: new Date().toISOString(),
  }, 'retrieval-eval')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const fixture = await loadFixture(args.fixture || DEFAULT_FIXTURE)
  validateFixture(fixture)

  const maxTier = Number(fixture.maxTier || 1)
  const limit = Number(fixture.limit || 10)
  const startedAt = new Date().toISOString()
  await initFoundationDb()

  let caseResults = []
  let embeddingCallId = null
  let recordedRun = false
  try {
    const embeddingResult = await callEmbedding({
      input: fixture.cases.map(item => item.query),
      dimensions: EMBEDDING_DIMENSIONS,
      metadata: {
        fixtureId: fixture.id,
        purpose: 'retrieval_eval_baseline',
        caseIds: fixture.cases.map(item => item.id),
      },
    })
    embeddingCallId = embeddingResult.call?.callId || null

    for (let index = 0; index < fixture.cases.length; index += 1) {
      const testCase = fixture.cases[index]
      const [lexicalResults, hybridResults] = await Promise.all([
        searchIntelligenceChunks({
          query: testCase.query,
          maxTier,
          limit,
        }),
        searchIntelligenceEvidenceHybrid({
          query: testCase.query,
          queryEmbedding: embeddingResult.embeddings[index],
          maxTier,
          limit,
        }),
      ])
      caseResults.push(evaluateCase({
        testCase,
        lexicalResults,
        hybridResults,
        maxTier,
      }))
    }

    const passedCases = caseResults.filter(item => item.passed).length
    const passRate = passedCases / caseResults.length
    const status = passRate >= Number(fixture.minPassRate || 1) ? 'succeeded' : 'failed'
    const run = await recordEvalRun({
      fixture,
      status,
      caseResults,
      embeddingCallId,
      startedAt,
    })
    recordedRun = true

    const summary = {
      fixtureId: fixture.id,
      totalCases: fixture.cases.length,
      passedCases,
      failedCases: caseResults.filter(item => !item.passed).map(item => item.id),
      passRate,
      distinctSources: uniqueText(fixture.cases.map(item => item.sourceId)).length,
      caseResults,
      run: safeRunSummary(run),
    }

    console.log(JSON.stringify(summary, null, 2))
    if (status !== 'succeeded') {
      throw new Error(`Retrieval eval failed ${fixture.cases.length - passedCases}/${fixture.cases.length} cases.`)
    }
  } catch (error) {
    if (caseResults.length && !recordedRun) {
      await recordEvalRun({
        fixture,
        status: 'failed',
        caseResults,
        embeddingCallId,
        startedAt,
      })
    }
    throw error
  }
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })

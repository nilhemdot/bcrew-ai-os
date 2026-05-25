#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildFoundationDataSourcesV2Snapshot,
  FOUNDATION_DATA_SOURCES_V2_API_PATH,
  FOUNDATION_DATA_SOURCES_V2_ROUTE,
} from '../lib/foundation-data-sources-v2.js'
import {
  closeFoundationDb,
  getFoundationSnapshot,
} from '../lib/foundation-db.js'
import {
  getFoundationJobDefinitions,
} from '../lib/foundation-jobs.js'
import {
  getGroupedSourceSystems,
  getSourceConnectors,
  getSourceContracts,
} from '../lib/source-contracts.js'
import { buildSourceConnectorMatrixSnapshot } from '../lib/source-connector-matrix.js'
import { buildSourceHubRoutingMatrixSnapshot } from '../lib/source-hub-routing-matrix.js'
import { buildSourceLifecycleStatus } from '../lib/source-lifecycle.js'

const __filename = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(__filename), '..')

function readRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function assertFinding(findings, condition, label, detail = '') {
  findings.push({
    ok: Boolean(condition),
    label,
    detail,
  })
}

function includesAll(source, values) {
  return values.every(value => source.includes(value))
}

function visibleCopyForSource(source = {}) {
  const stageDetails = Object.values(source.stages || {}).map(stage => `${stage.detail || ''} ${stage.label || ''}`)
  return [
    source.title,
    source.plainName,
    source.plainPurpose,
    source.statusText,
    source.statusDetail,
    ...stageDetails,
    ...(source.blockers || []),
  ].join(' ')
}

async function runCheck() {
  const json = process.argv.includes('--json')
  const foundationSnapshot = await getFoundationSnapshot()
  const extractionControl = foundationSnapshot.extractionControl || {}
  const sourceContracts = getSourceContracts()
  const sourceLifecycle = buildSourceLifecycleStatus({
    sources: sourceContracts,
    connectors: getSourceConnectors(),
    groupedSystems: getGroupedSourceSystems(),
    extractionControl,
    foundationJobs: getFoundationJobDefinitions(),
  })
  const sourceConnectorMatrix = buildSourceConnectorMatrixSnapshot({
    sources: sourceContracts,
    connectors: getSourceConnectors(),
    extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
  })
  const sourceHubRoutingMatrix = buildSourceHubRoutingMatrixSnapshot({
    connectorMatrix: sourceConnectorMatrix,
  })
  const snapshot = buildFoundationDataSourcesV2Snapshot({
    sourceContracts,
    sourceConnectorMatrix,
    sourceHubRoutingMatrix,
    sourceLifecycle,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
  })

  const foundationHtml = readRepo('public/foundation.html')
  const routerSource = readRepo('public/foundation-router.js')
  const dataSource = readRepo('public/foundation-data.js')
  const routesSource = readRepo('lib/foundation-source-routes.js')
  const rendererSource = readRepo('public/foundation-data-sources-v2-renderers.js')
  const styleManifest = readRepo('public/styles.css')
  const styleSource = readRepo('public/styles-foundation-data-sources-v2.css')

  const findings = []
  assertFinding(findings, snapshot.apiPath === FOUNDATION_DATA_SOURCES_V2_API_PATH, 'API path is stable', FOUNDATION_DATA_SOURCES_V2_API_PATH)
  assertFinding(findings, snapshot.route === FOUNDATION_DATA_SOURCES_V2_ROUTE, 'Foundation hash route is stable', FOUNDATION_DATA_SOURCES_V2_ROUTE)
  assertFinding(findings, snapshot.summary.total > 0, 'snapshot has source cards', `${snapshot.summary.total} sources`)
  assertFinding(findings, snapshot.sources.every(source => source.stages?.connected && source.stages?.extracting && source.stages?.synthesizing && source.stages?.routing), 'every source has the four plain stages')
  assertFinding(findings, snapshot.sources.some(source => source.hubTags?.length), 'hub tags are present on source cards')
  assertFinding(findings, snapshot.sources.some(source => source.childTargets?.length), 'child extraction targets appear where source truth has them')
  assertFinding(findings, !snapshot.sources.some(source => /intelligence_atoms|foundation_job_runs|source-backed|ranked candidates/i.test(visibleCopyForSource(source))), 'normal card copy avoids table/job jargon')
  assertFinding(findings, routesSource.includes("app.get('/api/foundation/data-sources'"), 'compact API route registered')
  assertFinding(findings, dataSource.includes('fetchFoundationDataSourcesV2'), 'Foundation frontend has fetch helper')
  assertFinding(findings, includesAll(foundationHtml, ['data-section="data-sources-v2"', 'foundation-data-sources-v2-renderers.js']), 'Foundation shell exposes Data Sources V2 nav and renderer')
  assertFinding(findings, routerSource.includes("section === 'data-sources-v2'") && routerSource.includes('renderFoundationDataSourcesV2()'), 'Foundation router dispatches the new hash route')
  assertFinding(findings, snapshot.labels?.connected === 'Can read it' && snapshot.labels?.synthesizing === 'Turned into ideas' && rendererSource.includes('source.stageLabels'), 'renderer uses plain stage language from the API')
  assertFinding(findings, styleManifest.includes('styles-foundation-data-sources-v2.css') && styleSource.includes('.fds-source-card'), 'isolated CSS module is wired')

  const ok = findings.every(finding => finding.ok)
  const output = {
    ok,
    route: FOUNDATION_DATA_SOURCES_V2_ROUTE,
    apiPath: FOUNDATION_DATA_SOURCES_V2_API_PATH,
    summary: snapshot.summary,
    sampleSources: snapshot.sources.slice(0, 5).map(source => ({
      sourceId: source.sourceId,
      title: source.title,
      statusText: source.statusText,
      hubTags: source.hubTags.slice(0, 6),
      lastExtractedAt: source.lastExtractedAt,
      lastSynthesizedAt: source.lastSynthesizedAt,
    })),
    findings,
  }

  if (json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(ok ? 'Foundation Data Sources V2 check passed.' : 'Foundation Data Sources V2 check failed.')
    findings.forEach(finding => {
      console.log(`${finding.ok ? 'PASS' : 'FAIL'} ${finding.label}${finding.detail ? ` - ${finding.detail}` : ''}`)
    })
  }

  if (!ok) process.exitCode = 1
}

async function main() {
  try {
    await runCheck()
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

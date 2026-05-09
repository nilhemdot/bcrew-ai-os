#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { promisify } from 'node:util'

import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  buildFoundationReadinessStatus,
} from '../lib/foundation-readiness-gates.js'
import {
  DRIVE_ACCESS_PREFLIGHT_STATES,
  DRIVE_ACCESS_REQUEST_CARD_ID,
  DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
  DRIVE_ACCESS_REQUEST_SUMMARY_MARKER,
  buildDriveFilePreflight,
  buildSyntheticDriveAccessPreflightProof,
  hashProofObject,
  hashProofValue,
  normalizeDriveActor,
} from '../lib/drive-access-preflight.js'
import {
  closeFoundationDb,
  initFoundationDb,
  listFoundationUsers,
  listMeetingRawDriveFileCandidates,
  recordDriveAccessPreflightRun,
  updateBacklogItem,
} from '../lib/foundation-db.js'
import {
  buildMeetingRawFileInventory,
} from '../lib/meeting-vault-acl.js'

const execFile = promisify(execFileCallback)

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

async function currentHead() {
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'])
    return stdout.trim()
  } catch {
    return null
  }
}

async function readText(path) {
  return fs.readFile(path, 'utf8')
}

async function readJson(path) {
  return JSON.parse(await readText(path))
}

async function fetchJson(baseUrl, pathname, timeoutMs = 120000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(pathname, baseUrl), { signal: controller.signal })
    const text = await response.text()
    if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}: ${text.slice(0, 240)}`)
    return text ? JSON.parse(text) : {}
  } finally {
    clearTimeout(timeout)
  }
}

function countByState(preflights, state) {
  return preflights.filter(item => item.state === state).length
}

function countAccessPlan(preflights, action) {
  return preflights.filter(item => item.accessRequestPlan?.action === action).length
}

function safePreflightItem(preflight) {
  return {
    state: preflight.state,
    sourceId: preflight.sourceId || null,
    artifactId: preflight.artifactId || null,
    fileRefHash: preflight.fileRefHash || null,
    sourceAccountHash: preflight.sourceAccountHash || null,
    ownerHash: preflight.ownerHash || null,
    ownerAmbiguous: Boolean(preflight.ownerAmbiguous),
    missingCrewbert: Boolean(preflight.missingCrewbert),
    permissionSummary: preflight.permissionSummary || {},
    proposedOperationTypes: (preflight.proposedOperations || [])
      .map(operation => operation.operationType)
      .filter(Boolean),
    accessRequestPlan: {
      action: preflight.accessRequestPlan?.action || null,
      blockerCard: preflight.accessRequestPlan?.blockerCard || null,
    },
    metadata: {
      purpose: preflight.metadata?.purpose || 'drive_access_preflight',
      mimeType: preflight.metadata?.mimeType || null,
      errorClass: preflight.metadata?.errorClass || null,
      googleStatus: preflight.metadata?.googleStatus || null,
      modifiedTimePresent: Boolean(preflight.metadata?.modifiedTimePresent),
    },
  }
}

async function buildRepoInputs() {
  const [packageJson, securityAccessSource, security002ScriptSource, doneTestScriptSource] = await Promise.all([
    readJson('package.json'),
    readText('lib/security-access.js'),
    readText('scripts/process-security-002-check.mjs'),
    readText('scripts/process-foundation-done-test.mjs'),
  ])
  return {
    packageJson,
    securityAccessHasRegistry: securityAccessSource.includes('SECURITY_ROUTE_POSTURES') &&
      securityAccessSource.includes('assertTier') &&
      securityAccessSource.includes('buildRedactedCollectionResponse'),
    securityScriptHasExternalDenials: security002ScriptSource.includes('John cannot read Foundation Hub') &&
      security002ScriptSource.includes('John cannot read shared-comms archive') &&
      security002ScriptSource.includes('does not read client maxTier'),
    scriptHasSummaryMarker: doneTestScriptSource.includes('FOUNDATION_DONE_TEST_SUMMARY'),
    scriptSupportsReportOnly: doneTestScriptSource.includes('report-only') &&
      doneTestScriptSource.includes('reportOnly'),
  }
}

async function buildReadinessStatus(baseUrl, repoHead) {
  const [foundationHub, repo] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    buildRepoInputs(),
  ])
  return buildFoundationReadinessStatus({
    foundationHub,
    closeouts: getFoundationBuildCloseouts(),
    repo,
    repoHead,
  })
}

function noRawProof(summary) {
  const proofText = JSON.stringify(summary)
  const forbidden = [
    /content_text/i,
    /webViewLink/i,
    /sourceUrl/i,
    /title/i,
    /emailAddress/i,
    /https:\/\/docs\.google\.com/i,
  ]
  return forbidden.filter(pattern => pattern.test(proofText)).map(pattern => String(pattern))
}

async function closeCardIfHealthy(summary) {
  if (summary.status !== 'healthy') return
  await updateBacklogItem(DRIVE_ACCESS_REQUEST_CARD_ID, {
    lane: 'done',
    nextAction: 'Keep DRIVE-ACCESS-REQUEST-001 closed as the dry-run delegated Drive preflight layer. MEETING-VAULT-ACL-001 remains the raw meeting ACL safety blocker until Phase A proves every file safe or a separately approved Phase B applies and rechecks repairs.',
    statusNote: 'Closed on 2026-05-09 under `drive-access-request-v1`. V1 adds `lib/drive-access-preflight.js`, metadata-only Drive actor/preflight proof, missing-access and owner-ambiguity classification, request-access-needed classification without sending emails, dry-run ledger rows in `drive_access_preflight_runs` / `drive_access_preflight_items`, `scripts/process-drive-access-request-check.mjs`, readiness/verifier coverage, and no Google Drive permission mutations. Proof commands: `npm run process:drive-access-request-check`, `npm run process:foundation-done-test -- --report-only`, `npm run backlog:hygiene -- --json`, and `npm run foundation:verify`.',
  }, 'drive-access-request-check')
}

async function main() {
  const args = parseArgs()
  const jsonOnly = boolArg(args.json)
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const candidateLimit = Math.min(5000, Math.max(1, Number(args.candidateLimit || args['candidate-limit'] || 5000) || 5000))
  const preflightLimit = Math.min(candidateLimit, Math.max(1, Number(args.preflightLimit || args['preflight-limit'] || 25) || 25))
  const repoHead = await currentHead()

  await initFoundationDb()
  try {
    const synthetic = buildSyntheticDriveAccessPreflightProof()
    const users = await listFoundationUsers({ activeOnly: false })
    const crewbert = users.find(user => user.email === 'crewbert@bensoncrew.ca') || null
    const frontOffice = users.find(user => user.email === 'ai@bensoncrew.ca') || null
    const meetingActors = users.filter(user => user.meetingSyncEnabled)
    const actorProof = {
      actorCount: users.length,
      meetingSyncActorCount: meetingActors.length,
      crewbertPresent: Boolean(crewbert),
      frontOfficePresent: Boolean(frontOffice),
      crewbertHash: crewbert ? hashProofValue(crewbert.email, 'acct') : null,
      frontOfficeHash: frontOffice ? hashProofValue(frontOffice.email, 'acct') : null,
      meetingSyncActorHashes: meetingActors.map(user => normalizeDriveActor(user.email).emailHash).sort(),
    }

    const candidates = await listMeetingRawDriveFileCandidates({ limit: candidateLimit })
    const inventory = buildMeetingRawFileInventory(candidates)
    const sampledFiles = inventory.items.slice(0, preflightLimit)
    const preflights = []
    for (const file of sampledFiles) {
      preflights.push(await buildDriveFilePreflight({
        fileId: file.fileId,
        intendedActor: file.sourceAccount,
        sourceAccount: file.sourceAccount,
        purpose: 'drive_access_request_preflight',
        sourceId: file.sourceId,
        artifactId: file.artifactId,
      }))
    }

    const safeItems = preflights.map(safePreflightItem)
    const dryRunHash = hashProofObject({
      policyVersion: DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
      actorProof,
      inventory: {
        totalCandidates: inventory.totalCandidates,
        sampledFileCount: sampledFiles.length,
      },
      items: safeItems,
    })
    const stateCounts = Object.fromEntries(Object.values(DRIVE_ACCESS_PREFLIGHT_STATES).map(state => [
      state,
      countByState(preflights, state),
    ]))
    const repairableCount = countByState(preflights, DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_REPAIRABLE)
    const safeCount = countByState(preflights, DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE)
    const missingAccessCount = countByState(preflights, DRIVE_ACCESS_PREFLIGHT_STATES.MISSING_ACCESS) +
      countByState(preflights, DRIVE_ACCESS_PREFLIGHT_STATES.REQUEST_ACCESS_REQUIRED)
    const ownerAmbiguousCount = countByState(preflights, DRIVE_ACCESS_PREFLIGHT_STATES.OWNER_AMBIGUOUS)
    const requestAccessNeededCount = countAccessPlan(preflights, 'request_access_needed')
    const blockedCount = preflights.filter(item =>
      ![
        DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE,
        DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_REPAIRABLE,
        DRIVE_ACCESS_PREFLIGHT_STATES.MISSING_ACCESS,
        DRIVE_ACCESS_PREFLIGHT_STATES.REQUEST_ACCESS_REQUIRED,
        DRIVE_ACCESS_PREFLIGHT_STATES.OWNER_AMBIGUOUS,
      ].includes(item.state)
    ).length

    const proofSummary = {
      cardId: DRIVE_ACCESS_REQUEST_CARD_ID,
      closeoutKey: DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
      repoHead,
      syntheticOk: synthetic.ok,
      actorProof,
      inventory: {
        totalCandidates: inventory.totalCandidates,
        returnedCandidates: inventory.returnedCandidates,
        sampledFileCount: sampledFiles.length,
        inventoryComplete: inventory.complete,
      },
      stateCounts,
      safeCount,
      repairableCount,
      missingAccessCount,
      ownerAmbiguousCount,
      requestAccessNeededCount,
      blockedCount,
      dryRunHash,
    }
    const rawFindings = noRawProof(proofSummary)
    const findings = []
    if (!synthetic.ok) findings.push({ check: 'synthetic preflight fixtures classify safe/unsafe/ambiguous/missing access', detail: 'fixture proof failed' })
    if (!actorProof.crewbertPresent) findings.push({ check: 'Crewbert system actor exists', detail: 'crewbert@bensoncrew.ca missing from users table' })
    if (!actorProof.frontOfficePresent) findings.push({ check: 'front-office actor exists', detail: 'ai@bensoncrew.ca missing from users table' })
    if (inventory.totalCandidates <= 0) findings.push({ check: 'meeting raw file candidates exist for preflight', detail: 'no meeting raw file refs discovered' })
    if (!sampledFiles.length) findings.push({ check: 'preflight inspected at least one candidate', detail: 'sample was empty' })
    if (rawFindings.length) findings.push({ check: 'proof output is metadata-only', detail: rawFindings.join(', ') })

    proofSummary.status = findings.length ? 'blocked' : 'healthy'

    await recordDriveAccessPreflightRun({
      cardId: DRIVE_ACCESS_REQUEST_CARD_ID,
      policyVersion: DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
      status: proofSummary.status,
      actorEmailHash: actorProof.frontOfficeHash,
      actorCount: actorProof.actorCount,
      candidateCount: inventory.totalCandidates,
      inspectedFileCount: sampledFiles.length,
      safeCount,
      repairableCount,
      missingAccessCount,
      ownerAmbiguousCount,
      requestAccessNeededCount,
      blockedCount,
      dryRunHash,
      summary: proofSummary,
      items: safeItems,
    }, 'drive-access-request-check')

    await closeCardIfHealthy(proofSummary)

    try {
      const readiness = await buildReadinessStatus(baseUrl, repoHead)
      proofSummary.readinessStillNamesDriveAccessRequest = (readiness.blockingCards || []).includes(DRIVE_ACCESS_REQUEST_CARD_ID)
      proofSummary.remainingReadinessBlockers = readiness.blockingCards || []
      if (proofSummary.status === 'healthy' && proofSummary.readinessStillNamesDriveAccessRequest) {
        proofSummary.status = 'blocked'
        findings.push({
          check: 'foundation readiness no longer names DRIVE-ACCESS-REQUEST-001',
          detail: (readiness.blockingCards || []).join(', ') || 'missing readiness blockers',
        })
      }
    } catch (error) {
      proofSummary.status = 'blocked'
      findings.push({
        check: 'readiness status can be evaluated',
        detail: error instanceof Error ? error.message : String(error),
      })
    }

    if (!jsonOnly) {
      console.log('Drive access request preflight proof')
      console.log(`  Card: ${DRIVE_ACCESS_REQUEST_CARD_ID}`)
      console.log(`  Closeout: ${DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY}`)
      console.log(`  Repo: ${repoHead ? repoHead.slice(0, 7) : 'unknown'}`)
      console.log(`  Status: ${proofSummary.status}`)
      console.log(`  Actors: ${actorProof.actorCount}; meeting-sync actors=${actorProof.meetingSyncActorCount}; crewbert=${actorProof.crewbertPresent ? 'present' : 'missing'}; front-office=${actorProof.frontOfficePresent ? 'present' : 'missing'}`)
      console.log(`  Inventory: candidates=${inventory.totalCandidates}; sampled=${sampledFiles.length}; complete=${inventory.complete ? 'yes' : 'no'}`)
      console.log(`  Preflight states: safe=${safeCount}; repairable=${repairableCount}; missingAccess=${missingAccessCount}; ownerAmbiguous=${ownerAmbiguousCount}; requestAccessNeeded=${requestAccessNeededCount}; blocked=${blockedCount}`)
      console.log(`  Dry-run hash: ${dryRunHash}`)
      console.log(`  Readiness still names DRIVE-ACCESS-REQUEST-001: ${proofSummary.readinessStillNamesDriveAccessRequest ? 'yes' : 'no'}`)
      for (const finding of findings) {
        console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
      }
    } else {
      console.log(JSON.stringify({ summary: proofSummary, findings }, null, 2))
    }

    console.log(`${DRIVE_ACCESS_REQUEST_SUMMARY_MARKER} ${JSON.stringify(proofSummary)}`)
    if (proofSummary.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

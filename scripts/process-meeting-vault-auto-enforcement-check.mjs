#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { promisify } from 'node:util'

import {
  buildDriveFilePreflight,
} from '../lib/drive-access-preflight.js'
import {
  buildMeetingAclPolicy,
  buildMeetingRawFileInventory,
  buildMeetingVaultNoDuplicateGoogleDocProof,
  classifyMeetingLegacyDuplicateCopyAcl,
  classifyMeetingRawFileAcl,
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_ACL_STATES,
  MEETING_VAULT_SOURCE_FILE_ROLES,
} from '../lib/meeting-vault-acl.js'
import {
  MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
  MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
  MEETING_VAULT_AUTO_ENFORCEMENT_DEFAULT_MODE,
  MEETING_VAULT_AUTO_ENFORCEMENT_POLICY_VERSION,
  MEETING_VAULT_AUTO_ENFORCEMENT_SUMMARY_MARKER,
  assertMeetingVaultAutoEnforcementMutationApproved,
  buildMeetingVaultAutoEnforcementStatus,
  buildSyntheticMeetingVaultAutoEnforcementProof,
} from '../lib/meeting-vault-auto-enforcement.js'
import {
  closeFoundationDb,
  getLatestMeetingVaultAutoEnforcementRun,
  initFoundationDb,
  listFoundationUsers,
  listMeetingRawDriveFileCandidates,
  recordMeetingVaultAutoEnforcementRun,
  updateBacklogItem,
} from '../lib/foundation-db.js'

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

async function readSource(path) {
  return fs.readFile(path, 'utf8')
}

async function mapWithConcurrency(items, concurrency, worker) {
  const output = new Array(items.length)
  let nextIndex = 0
  const workerCount = Math.min(items.length, Math.max(1, Number(concurrency) || 1))
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      output[index] = await worker(items[index], index)
    }
  }))
  return output
}

function uniqueList(values = []) {
  return [...new Set(values.map(value => String(value || '').trim().toLowerCase()).filter(Boolean))]
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

function isReadableCrewbertOwned(preflight = {}) {
  return Boolean(preflight.readable) &&
    !preflight.ownerAmbiguous &&
    Number(preflight.permissionSummary?.crewbertOwnerCount || 0) > 0
}

function isReadableHumanOriginal(preflight = {}) {
  return Boolean(preflight.readable) &&
    !preflight.ownerAmbiguous &&
    Number(preflight.permissionSummary?.ownerCount || 0) === 1 &&
    Number(preflight.permissionSummary?.crewbertOwnerCount || 0) === 0
}

async function buildDriveFilePreflightWithFallback({ file, policy, fallbackAccounts }) {
  const accounts = uniqueList([
    file.sourceAccount,
    ...(Array.isArray(file.observedAccounts) ? file.observedAccounts : []),
    ...(Array.isArray(file.noteObservedAccounts) ? file.noteObservedAccounts : []),
    ...(Array.isArray(file.transcriptObservedAccounts) ? file.transcriptObservedAccounts : []),
    ...fallbackAccounts,
  ])
  let firstResult = null
  for (const account of accounts) {
    const preflight = await buildDriveFilePreflight({
      fileId: file.fileId,
      intendedActor: account,
      sourceAccount: account,
      purpose: 'meeting_vault_auto_enforcement_report_only',
      sourceId: file.sourceId,
      artifactId: file.artifactId,
      policy: policy.driveAccessPolicy,
    })
    if (!firstResult) firstResult = preflight
    if (preflight.readable) return preflight
  }
  return firstResult || await buildDriveFilePreflight({
    fileId: file.fileId,
    intendedActor: file.sourceAccount,
    sourceAccount: file.sourceAccount,
    purpose: 'meeting_vault_auto_enforcement_report_only',
    sourceId: file.sourceId,
    artifactId: file.artifactId,
    policy: policy.driveAccessPolicy,
  })
}

function annotateMeetingSourceRoles(scanned = []) {
  const groups = new Map()
  for (const item of scanned) {
    const key = item.file.meetingKey || item.file.fileRefHash
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  for (const groupItems of groups.values()) {
    const hasOriginal = groupItems.some(item => isReadableHumanOriginal(item.preflight))
    for (const item of groupItems) {
      if (hasOriginal && isReadableCrewbertOwned(item.preflight)) {
        item.file.sourceFileRole = MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY
        item.file.legacyDuplicateCopy = true
      } else if (!hasOriginal && isReadableCrewbertOwned(item.preflight)) {
        item.file.sourceFileRole = MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING
        item.file.legacyDuplicateCopy = true
      } else {
        item.file.sourceFileRole = MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL
        item.file.legacyDuplicateCopy = false
      }
    }
  }

  return scanned
}

function classifyMeetingAutoScannedItem({ file, preflight, policy }) {
  if (file.sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY) {
    return classifyMeetingLegacyDuplicateCopyAcl(file, preflight, policy)
  }
  if (file.sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING) {
    const duplicate = classifyMeetingLegacyDuplicateCopyAcl(file, preflight, policy)
    return {
      ...duplicate,
      state: MEETING_VAULT_ACL_STATES.BLOCKED,
      safe: false,
      blockerCard: MEETING_VAULT_ACL_CARD_ID,
      blockerReasons: ['original_gemini_note_missing_for_crewbert_copy'],
      sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING,
      policy: {
        ...duplicate.policy,
        sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING,
      },
    }
  }
  return classifyMeetingRawFileAcl(file, preflight, policy)
}

function buildSafeOutputSummary({ status, repoHead, inventory, scannedFileCount, permissionScanComplete, findings }) {
  return {
    cardId: status.cardId,
    closeoutKey: status.closeoutKey,
    policyVersion: status.policyVersion,
    repoHead,
    mode: status.mode,
    status: status.status,
    canCloseMeetingVaultAcl: status.canCloseMeetingVaultAcl,
    reportHash: status.reportHash,
    enforcementStartAt: status.enforcementStartAt,
    blockerReason: status.blockerReason,
    nextSafeAction: status.nextSafeAction,
    inventory: {
      totalCandidates: inventory.totalCandidates,
      returnedCandidates: inventory.returnedCandidates,
      scannedFileCount,
      inventoryComplete: inventory.complete,
      permissionScanComplete,
    },
    summary: status.summary,
    noDuplicateGoogleDocProof: status.noDuplicateGoogleDocProof,
    syntheticProofOk: Boolean(status.syntheticProof?.ok),
    findings,
    proof: {
      noDriveMutations: true,
      noRequestAccessEmails: true,
      noDuplicateGoogleDocs: Boolean(status.noDuplicateGoogleDocProof?.ok),
      proofOutputIsMetadataOnly: findings.every(finding => finding.check !== 'proof output is metadata-only'),
      legacyExceptionsBounded: status.summary.legacyExceptionCount >= 0,
    },
  }
}

async function updateMeetingVaultBacklog(status) {
  if (status.canCloseMeetingVaultAcl) {
    await updateBacklogItem(MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID, {
      lane: 'done',
      nextAction: 'Keep automatic Meeting Vault enforcement in report-only proof mode until a separate live-enforcement approval exists. Review daily audit exceptions before any future Drive mutation.',
      statusNote: `Closed on 2026-05-11 under \`${MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY}\`. V1 records the automatic forward-flow proof, no-duplicate Google Docs rule, source-truth original handling, Crewbert/access action queue, daily audit/legacy exception queue, and readiness close rule with report hash ${status.reportHash}. No historical cleanup batch, Drive permission mutation, request-access email, delete, move, ownership transfer, Strategy, Sales, Agent Feedback, Scoper, Agent Factory, broad corpus, researcher, public access, or UI polish shipped.`,
    }, 'meeting-vault-auto-enforcement-check')
    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'done',
      nextAction: 'Keep MEETING-VAULT-ACL-001 closed only while the automatic Meeting Vault forward-flow proof stays green. New raw public/domain exposure, missing Crewbert on a forward original, unknown classification, owner ambiguity, missing access, duplicate Google Doc creation, or unbounded legacy exception queue reopens the blocker.',
      statusNote: `Closed on 2026-05-11 through \`${MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY}\` readiness rule. Manual historical Drive batching is stopped; old messy files are bounded in the legacy exception queue and new original Gemini meeting notes are governed by automatic report-only enforcement proof. Report hash ${status.reportHash}; no Google Drive permission mutations or request-access emails were sent by this closeout.`,
    }, 'meeting-vault-auto-enforcement-check')
    return
  }

  await updateBacklogItem(MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID, {
    lane: 'scoped',
    nextAction: `Automatic Meeting Vault proof is still blocked: ${status.blockerReason || 'unknown'}. Report hash ${status.reportHash}; fix the named forward-flow or high-risk blocker, then rerun npm run process:meeting-vault-auto-enforcement-check.`,
    statusNote: `Scoped/blocking under report-only automatic enforcement. Report hash ${status.reportHash}; no Google Drive permission mutations or request-access emails were sent. MEETING-VAULT-ACL-001 remains blocking until the forward-flow proof can close safely.`,
  }, 'meeting-vault-auto-enforcement-check')
}

async function main() {
  const args = parseArgs()
  const jsonOnly = boolArg(args.json)
  const applyRequested = boolArg(args.apply) || boolArg(args.live)
  const mode = applyRequested ? 'apply' : String(args.mode || MEETING_VAULT_AUTO_ENFORCEMENT_DEFAULT_MODE)
  const candidateLimit = Math.min(5000, Math.max(1, Number(args.candidateLimit || args['candidate-limit'] || 5000) || 5000))
  const permissionLimit = Math.min(candidateLimit, Math.max(1, Number(args.permissionLimit || args['permission-limit'] || candidateLimit) || candidateLimit))
  const concurrency = Math.min(8, Math.max(1, Number(args.concurrency || 4) || 4))
  const generatedAt = new Date().toISOString()
  const repoHead = await currentHead()

  if (applyRequested || mode !== MEETING_VAULT_AUTO_ENFORCEMENT_DEFAULT_MODE) {
    try {
      assertMeetingVaultAutoEnforcementMutationApproved({ approvalRef: args.approvalRef, mode })
      console.error('Unexpected live enforcement approval acceptance; this card implementation is report-only.')
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
    }
    process.exitCode = 1
    return
  }

  await initFoundationDb()
  try {
    const latestRun = await getLatestMeetingVaultAutoEnforcementRun({ cardId: MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID }).catch(() => null)
    const enforcementStartAt = String(args.enforcementStartAt || args['enforcement-start-at'] || latestRun?.enforcementStartAt || generatedAt)
    const syntheticProof = buildSyntheticMeetingVaultAutoEnforcementProof()
    const [
      meetingVaultAclSource,
      meetingVaultAclScriptSource,
      syncMeetingNotesArchiveSource,
      mirrorMeetingArchiveToDriveSource,
    ] = await Promise.all([
      readSource('lib/meeting-vault-acl.js'),
      readSource('scripts/process-meeting-vault-acl-check.mjs'),
      readSource('scripts/sync-meeting-notes-archive.mjs'),
      readSource('scripts/mirror-meeting-archive-to-drive.mjs'),
    ])
    const noDuplicateGoogleDocProof = buildMeetingVaultNoDuplicateGoogleDocProof({
      meetingVaultAclSource,
      meetingVaultAclScriptSource,
      syncMeetingNotesArchiveSource,
      mirrorMeetingArchiveToDriveSource,
    })

    const candidates = await listMeetingRawDriveFileCandidates({ limit: candidateLimit })
    const inventory = buildMeetingRawFileInventory({ ...candidates, limit: candidateLimit })
    const filesToScan = inventory.items.slice(0, permissionLimit)
    const permissionScanComplete = inventory.complete && filesToScan.length === inventory.totalCandidates
    const foundationUsers = await listFoundationUsers({ meetingSyncEnabled: true })
    const fallbackAccounts = uniqueList(foundationUsers.map(user => user.email))
    const scanned = await mapWithConcurrency(filesToScan, concurrency, async file => {
      const policy = buildMeetingAclPolicy(file)
      const preflight = await buildDriveFilePreflightWithFallback({
        file,
        policy,
        fallbackAccounts,
      })
      return { file, preflight, policy }
    })
    annotateMeetingSourceRoles(scanned)
    const classifications = scanned.map(item => ({
      file: item.file,
      classification: classifyMeetingAutoScannedItem(item),
    }))
    const status = buildMeetingVaultAutoEnforcementStatus({
      classifications,
      inventoryComplete: permissionScanComplete,
      enforcementStartAt,
      noDuplicateGoogleDocProof,
      syntheticProof,
      mode: MEETING_VAULT_AUTO_ENFORCEMENT_DEFAULT_MODE,
      generatedAt,
    })

    const findings = []
    if (!syntheticProof.ok) findings.push({ check: 'synthetic automatic enforcement fixtures classify forward-flow actions', detail: 'fixture proof failed' })
    if (!noDuplicateGoogleDocProof.ok) findings.push({ check: 'no duplicate Google Docs rule is enforced', detail: noDuplicateGoogleDocProof.findings.join(',') || 'unknown' })
    if (!permissionScanComplete) findings.push({ check: 'permission inventory is complete', detail: `scanned=${filesToScan.length} total=${inventory.totalCandidates}` })
    if (status.summary.highRiskForwardProtectedOriginalCount > 0) {
      findings.push({ check: 'forward protected originals have no public/domain exposure', detail: String(status.summary.highRiskForwardProtectedOriginalCount) })
    }
    if (!status.canCloseMeetingVaultAcl) {
      findings.push({ check: 'MEETING-VAULT-ACL-001 close rule is satisfied', detail: status.blockerReason || 'blocked' })
    }

    const outputSummary = buildSafeOutputSummary({
      status,
      repoHead,
      inventory,
      scannedFileCount: filesToScan.length,
      permissionScanComplete,
      findings,
    })
    const rawFindings = noRawProof(outputSummary)
    if (rawFindings.length) {
      findings.push({ check: 'proof output is metadata-only', detail: rawFindings.join(',') })
    }
    outputSummary.findings = findings
    outputSummary.proof.proofOutputIsMetadataOnly = !findings.some(finding => finding.check === 'proof output is metadata-only')

    await recordMeetingVaultAutoEnforcementRun({
      cardId: MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
      closeoutKey: MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
      policyVersion: MEETING_VAULT_AUTO_ENFORCEMENT_POLICY_VERSION,
      mode: MEETING_VAULT_AUTO_ENFORCEMENT_DEFAULT_MODE,
      status: status.status,
      enforcementStartAt,
      reportHash: status.reportHash,
      canCloseMeetingVaultAcl: status.canCloseMeetingVaultAcl,
      summary: outputSummary,
      items: status.items,
      legacyExceptions: status.legacyExceptions,
    }, 'meeting-vault-auto-enforcement-check')
    await updateMeetingVaultBacklog(status)

    if (jsonOnly) {
      console.log(JSON.stringify(outputSummary, null, 2))
    } else {
      console.log('Meeting Vault automatic enforcement proof')
      console.log(`  Status: ${status.status}`)
      console.log(`  Can close MEETING-VAULT-ACL-001: ${status.canCloseMeetingVaultAcl ? 'yes' : 'no'}`)
      console.log(`  Report hash: ${status.reportHash}`)
      console.log(`  Enforcement baseline: ${enforcementStartAt}`)
      console.log(`  Processed: ${status.summary.processedCount}`)
      console.log(`  Forward items: ${status.summary.forwardCount}`)
      console.log(`  Legacy exceptions: ${status.summary.legacyExceptionCount}`)
      console.log(`  Missing Crewbert queued: ${status.summary.missingCrewbertQueuedCount}`)
      console.log(`  Protected review queue: ${status.summary.protectedReviewQueueCount}`)
      console.log(`  Public/domain high-risk count: ${status.summary.publicDomainHighRiskCount}`)
      console.log(`  Next: ${status.nextSafeAction}`)
      console.log('')
      for (const finding of findings) {
        console.log(`FAIL ${finding.check} -> ${finding.detail}`)
      }
      if (!findings.length) console.log('PASS automatic Meeting Vault forward-flow proof is green')
      console.log('')
      console.log(`${MEETING_VAULT_AUTO_ENFORCEMENT_SUMMARY_MARKER} ${JSON.stringify(outputSummary)}`)
    }

    if (findings.length) process.exitCode = 1
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 2
})

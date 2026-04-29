import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const APPROVAL_SCHEMA_VERSION = 2
export const APPROVAL_LEGACY_LEDGER_PATH = 'docs/process/approval-legacy-exceptions.json'
export const PHASE_1_ENFORCEMENT_PLAN_REF = 'docs/process/approved-plans/phase-1-enforcement-v1.md'
export const PHASE_1_ENFORCEMENT_PLAN_SHA256 = 'e80b85420fda0e008b5db13edaec8724f1635617f62e6d46c6dd96c10f9f9101'
export const PHASE_1_ENFORCEMENT_CARD_IDS = [
  'APPROVAL-FILE-INTEGRITY-001',
  'BUILD-LOG-BACKLOG-ID-FIX-001',
  'CLOSEOUT-BACKFILL-001',
  'PRE-COMMIT-HOOK-INSTALL-001',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeRelativePath(value) {
  return normalizeText(value).replace(/\\/g, '/').replace(/^\.\//, '')
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = stableValue(value[key])
      return acc
    }, {})
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value))
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

async function sha256File(filePath) {
  return sha256Text(await fs.readFile(filePath, 'utf8'))
}

function resolveInsideRepo(repoRoot, relativePath) {
  const normalized = normalizeRelativePath(relativePath)
  const absolutePath = path.resolve(repoRoot, normalized)
  if (!absolutePath.startsWith(path.resolve(repoRoot))) {
    throw new Error(`Path must live inside the repo: ${relativePath}`)
  }
  return { normalized, absolutePath }
}

export function calculateApprovalDigest(approval) {
  const { approvalDigest, ...digestInput } = approval || {}
  return sha256Text(stableStringify(digestInput))
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function readLegacyLedger(repoRoot) {
  try {
    const { absolutePath } = resolveInsideRepo(repoRoot, APPROVAL_LEGACY_LEDGER_PATH)
    const ledger = await readJsonFile(absolutePath)
    return Array.isArray(ledger.legacyApprovals) ? ledger.legacyApprovals : []
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}

function findLegacyApprovalEntry(legacyApprovals, approvalRef, cardId) {
  const normalizedRef = normalizeRelativePath(approvalRef)
  return legacyApprovals.find(entry =>
    entry?.cardId === cardId &&
      normalizeRelativePath(entry.approvalRef) === normalizedRef &&
      entry.legacyAccepted === true
  ) || null
}

function validateRequiredApprovalFields(approval, cardId, checks) {
  checks.push({
    ok: approval?.cardId === cardId,
    check: 'approval card matches requested card',
    detail: approval?.cardId || 'missing cardId',
  })
  checks.push({
    ok: Number(approval?.score) >= 9.8,
    check: 'approval score is at least 9.8',
    detail: String(approval?.score ?? 'missing'),
  })
  checks.push({
    ok: Boolean(normalizeText(approval?.approvedBy)),
    check: 'approval has an approver',
    detail: approval?.approvedBy || 'missing approvedBy',
  })
  checks.push({
    ok: !Number.isNaN(new Date(approval?.approvedAt).getTime()),
    check: 'approval has a valid timestamp',
    detail: approval?.approvedAt || 'missing approvedAt',
  })
}

export async function validatePlanApprovalFile({
  repoRoot,
  approvalRef,
  cardId,
} = {}) {
  const checks = []
  const root = repoRoot || process.cwd()
  const normalizedApprovalRef = normalizeRelativePath(approvalRef)
  if (!normalizedApprovalRef) {
    return {
      ok: false,
      approval: null,
      approvalRef: normalizedApprovalRef,
      mode: 'missing',
      checks: [{ ok: false, check: 'approval file argument is present', detail: 'missing approval ref' }],
      failures: [{ ok: false, check: 'approval file argument is present', detail: 'missing approval ref' }],
    }
  }

  let approval = null
  try {
    const { absolutePath } = resolveInsideRepo(root, normalizedApprovalRef)
    approval = await readJsonFile(absolutePath)
    checks.push({ ok: true, check: 'approval file can be read', detail: normalizedApprovalRef })
  } catch (error) {
    checks.push({
      ok: false,
      check: 'approval file can be read',
      detail: error instanceof Error ? error.message : String(error),
    })
    return {
      ok: false,
      approval: null,
      approvalRef: normalizedApprovalRef,
      mode: 'unreadable',
      checks,
      failures: checks.filter(check => !check.ok),
    }
  }

  validateRequiredApprovalFields(approval, cardId, checks)

  if (Number(approval.approvalSchemaVersion) === APPROVAL_SCHEMA_VERSION) {
    const approvedPlanRef = normalizeRelativePath(approval.approvedPlanRef)
    let planHash = ''
    try {
      const { absolutePath } = resolveInsideRepo(root, approvedPlanRef)
      planHash = await sha256File(absolutePath)
      checks.push({ ok: true, check: 'approved plan snapshot exists', detail: approvedPlanRef })
    } catch (error) {
      checks.push({
        ok: false,
        check: 'approved plan snapshot exists',
        detail: error instanceof Error ? error.message : String(error),
      })
    }
    checks.push({
      ok: Boolean(approvedPlanRef),
      check: 'approval records approved plan ref',
      detail: approvedPlanRef || 'missing approvedPlanRef',
    })
    checks.push({
      ok: Boolean(approval.approvedPlanSha256) && normalizeText(approval.approvedPlanSha256) === planHash,
      check: 'approved plan hash matches snapshot',
      detail: approval.approvedPlanSha256 ? `${approval.approvedPlanSha256.slice(0, 12)}...` : 'missing approvedPlanSha256',
    })
    checks.push({
      ok: /^[0-9a-f]{40}$/i.test(normalizeText(approval.approvedRepoHead)),
      check: 'approval records repo head at approval',
      detail: approval.approvedRepoHead || 'missing approvedRepoHead',
    })
    checks.push({
      ok: normalizeText(approval.approvalDigest) === calculateApprovalDigest(approval),
      check: 'approval digest matches approval content',
      detail: approval.approvalDigest ? `${approval.approvalDigest.slice(0, 12)}...` : 'missing approvalDigest',
    })
    if (approval.bootstrapFromLegacy) {
      checks.push({
        ok: PHASE_1_ENFORCEMENT_CARD_IDS.includes(cardId),
        check: 'bootstrap approval is limited to Phase 1 enforcement',
        detail: cardId || 'missing cardId',
      })
    }
  } else {
    const legacyApprovals = await readLegacyLedger(root)
    const legacyEntry = findLegacyApprovalEntry(legacyApprovals, normalizedApprovalRef, cardId)
    checks.push({
      ok: Boolean(legacyEntry),
      check: 'legacy approval is explicitly listed',
      detail: legacyEntry ? legacyEntry.reason : 'missing legacy ledger entry',
    })
    if (legacyEntry) {
      checks.push({
        ok: Number(approval.score) >= 9.8,
        check: 'legacy approval keeps 9.8 score',
        detail: String(approval.score ?? 'missing'),
      })
    }
  }

  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    approval,
    approvalRef: normalizedApprovalRef,
    mode: Number(approval?.approvalSchemaVersion) === APPROVAL_SCHEMA_VERSION ? 'v2' : 'explicit-legacy',
    checks,
    failures,
  }
}

export async function buildSyntheticApprovalIntegrityStatus() {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bcrew-approval-integrity-'))
  try {
    await fs.mkdir(path.join(tmpRoot, 'docs/process/approved-plans'), { recursive: true })
    await fs.mkdir(path.join(tmpRoot, 'docs/process/approvals'), { recursive: true })
    const planRef = 'docs/process/approved-plans/synthetic-plan.md'
    const approvalRef = 'docs/process/approvals/SYNTHETIC-APPROVAL.json'
    const planPath = path.join(tmpRoot, planRef)
    await fs.writeFile(planPath, 'approved synthetic plan\n', 'utf8')
    const planSha = await sha256File(planPath)
    const approval = {
      cardId: 'APPROVAL-FILE-INTEGRITY-001',
      score: 9.8,
      approvedBy: 'Steve',
      approvedAt: '2026-04-29T22:24:00Z',
      approvalSource: 'Synthetic approval-integrity proof.',
      notes: 'Synthetic v2 approval used only by verifier.',
      approvalSchemaVersion: APPROVAL_SCHEMA_VERSION,
      approvedPlanRef: planRef,
      approvedPlanSha256: planSha,
      approvedRepoHead: '870c865d9d80bac14cc647ff932c39e00221086d',
      bootstrapFromLegacy: true,
    }
    approval.approvalDigest = calculateApprovalDigest(approval)
    await fs.writeFile(path.join(tmpRoot, approvalRef), `${JSON.stringify(approval, null, 2)}\n`, 'utf8')

    const clean = await validatePlanApprovalFile({
      repoRoot: tmpRoot,
      approvalRef,
      cardId: approval.cardId,
    })
    await fs.writeFile(planPath, 'tampered synthetic plan\n', 'utf8')
    const tampered = await validatePlanApprovalFile({
      repoRoot: tmpRoot,
      approvalRef,
      cardId: approval.cardId,
    })

    return {
      ok: clean.ok && !tampered.ok && tampered.failures.some(failure => failure.check === 'approved plan hash matches snapshot'),
      clean,
      tampered,
    }
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {})
  }
}

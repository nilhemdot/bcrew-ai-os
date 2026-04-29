import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

const DAY_MS = 24 * 60 * 60 * 1000

async function readJson(relativePath, repoRoot = defaultRepoRoot) {
  const absolutePath = path.join(repoRoot, relativePath)
  const raw = await fs.readFile(absolutePath, 'utf8')
  return JSON.parse(raw)
}

async function exists(relativePath, repoRoot = defaultRepoRoot) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function daysSince(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor((Date.now() - date.getTime()) / DAY_MS)
}

function countBy(values, keyFn) {
  return (values || []).reduce((acc, value) => {
    const key = keyFn(value)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

export async function buildDocArchiveCleanupStatus({ repoRoot = defaultRepoRoot } = {}) {
  const manifest = await readJson('docs/process/doc-archive-manifest.json', repoRoot).catch(() => null)
  const findings = []
  const movedFiles = manifest?.movedFiles || []

  for (const record of movedFiles) {
    const sourceExists = await exists(record.from, repoRoot)
    const archiveExists = await exists(record.to, repoRoot)
    if (!archiveExists) {
      findings.push({
        severity: 'critical',
        type: 'missing_archived_file',
        issue: `${record.to} is missing after archive cleanup.`,
        recommendedAction: 'Restore the archived file or correct the manifest.',
      })
    }
    if (sourceExists) {
      findings.push({
        severity: 'warning',
        type: 'source_still_present',
        issue: `${record.from} still exists in an active evidence folder after archive cleanup.`,
        recommendedAction: 'Move it to the archive path or explain why it is protected.',
      })
    }
  }

  return {
    status: findings.some(finding => finding.severity === 'critical') ? 'critical' : 'healthy',
    manifestPath: 'docs/process/doc-archive-manifest.json',
    archiveRoot: 'docs/_archive',
    generatedAt: manifest?.generatedAt || null,
    summary: {
      archivedFileCount: movedFiles.length,
      handoffCount: movedFiles.filter(file => file.type === 'handoff').length,
      auditCount: movedFiles.filter(file => file.type === 'audit').length,
      researchDocCount: movedFiles.filter(file => file.type === 'research').length,
      protectedFileCount: (manifest?.protectedFiles || []).length,
      findingCount: findings.length,
    },
    findings,
    knownLimits: [
      'Archived files remain searchable evidence. They are not active doctrine unless a current doc or backlog card promotes them.',
      'Protected evidence files stay in their active folder only when current source contracts, verifier checks, or rebuild docs still link to them.',
    ],
  }
}

export function buildResearchCurationStatus({ backlogItems = [] } = {}) {
  const researchCards = (backlogItems || []).filter(item => item.lane === 'research')
  const taggedCards = researchCards.map(item => ({
    id: item.id,
    title: item.title,
    curationState: 'leave_parked',
    subTag: /audit|review|research/i.test(`${item.title} ${item.summary || ''}`) ? 'research' : 'future-build',
    plainEnglish: 'Preserved in Research. This card is not auto-closed by Phase D.',
  }))

  return {
    status: 'healthy',
    visibleHome: 'Foundation > Backlog > Research Curation',
    summary: {
      researchCardCount: researchCards.length,
      preservedCardCount: taggedCards.length,
      autoClosedCount: 0,
      byCurationState: countBy(taggedCards, card => card.curationState),
      bySubTag: countBy(taggedCards, card => card.subTag),
    },
    cards: taggedCards,
    knownLimits: [
      'V1 labels research cards for visibility. It does not decide whether Steve still wants each idea.',
      'Promoting or closing research cards remains a later reviewed backlog action.',
    ],
  }
}

export async function buildExceptionCurationStatus({ repoRoot = defaultRepoRoot } = {}) {
  const exceptionLedger = await readJson('docs/process/verifier-exceptions.json', repoRoot).catch(() => null)
  const curation = await readJson('docs/process/verifier-exception-curation.json', repoRoot).catch(() => null)
  const exceptions = exceptionLedger?.exceptions || []
  const decisions = curation?.decisions || []
  const decisionByCard = new Map(decisions.map(decision => [decision.cardId, decision]))
  const findings = []

  for (const exception of exceptions) {
    if (!decisionByCard.has(exception.cardId)) {
      findings.push({
        severity: 'critical',
        type: 'missing_exception_curation',
        issue: `${exception.cardId} has a verifier exception but no curation decision.`,
        recommendedAction: 'Classify it as add real verifier coverage, retire/restructure, or re-approve with reason.',
      })
    }
  }

  const approvedAtDays = exceptions
    .map(exception => daysSince(exception.approvedAt))
    .filter(value => typeof value === 'number')
  const oldestOpenEndedDays = approvedAtDays.length ? Math.max(...approvedAtDays) : null
  const maxOpenEndedDays = Number(exceptionLedger?.maxOpenEndedDays || 90)
  const daysUntilStale = typeof oldestOpenEndedDays === 'number'
    ? Math.max(0, maxOpenEndedDays - oldestOpenEndedDays)
    : null

  return {
    status: findings.some(finding => finding.severity === 'critical') ? 'critical' : daysUntilStale !== null && daysUntilStale <= 14 ? 'warning' : 'healthy',
    ledgerPath: 'docs/process/verifier-exceptions.json',
    curationPath: 'docs/process/verifier-exception-curation.json',
    deadline: curation?.deadline || null,
    summary: {
      exceptionCount: exceptions.length,
      curatedCount: decisions.length,
      openEndedExceptionCount: exceptions.filter(exception => exception.expiresAt === null).length,
      daysUntilStale,
      byDecision: countBy(decisions, decision => decision.decision),
      findingCount: findings.length,
    },
    findings,
    knownLimits: [
      'Curation decisions do not clear verifier exceptions by themselves. The later cleanup still needs real coverage, card retirement, or explicit re-approval.',
      'The 2026-07-27 deadline is not silently extended by this curation pass.',
    ],
  }
}

export function buildHitListReconcileStatus({ backlogItems = [], snapshot = null } = {}) {
  const findings = []
  const backlogById = new Map((backlogItems || []).map(item => [item.id, item]))
  const entries = snapshot?.entries || []

  for (const entry of entries) {
    const card = backlogById.get(entry.cardId)
    if (!card) {
      findings.push({
        severity: 'critical',
        type: 'missing_hit_list_card',
        issue: `${entry.cardId} is on the canonical hit-list snapshot but missing from live Backlog.`,
        recommendedAction: 'Create the card or update the snapshot with an explicit reason.',
      })
      continue
    }
    if (entry.expectedLane && card.lane !== entry.expectedLane) {
      findings.push({
        severity: 'warning',
        type: 'hit_list_lane_mismatch',
        issue: `${entry.cardId} is ${card.lane}; snapshot expected ${entry.expectedLane}.`,
        recommendedAction: 'Update the card state or refresh the hit-list snapshot.',
      })
    }
  }

  const snapshotAgeDays = daysSince(snapshot?.importedAt)
  if (typeof snapshotAgeDays === 'number' && snapshotAgeDays > 14) {
    findings.push({
      severity: 'warning',
      type: 'hit_list_snapshot_stale',
      issue: `Hit-list snapshot is ${snapshotAgeDays} days old.`,
      recommendedAction: 'Manually re-import Steve’s canonical Google Doc snapshot before relying on it.',
    })
  }

  return {
    status: findings.some(finding => finding.severity === 'critical') ? 'critical' : findings.length ? 'warning' : 'healthy',
    snapshotPath: 'docs/process/hit-list-snapshot.json',
    importedAt: snapshot?.importedAt || null,
    privacyBoundary: 'V1 uses a repo-tracked snapshot. It does not auto-read Steve’s Google Doc.',
    summary: {
      hitListCardCount: entries.length,
      matchedCardCount: entries.length - findings.filter(finding => finding.type === 'missing_hit_list_card').length,
      snapshotAgeDays,
      findingCount: findings.length,
    },
    findings,
    knownLimits: [
      'Snapshot can drift when Steve updates the Google Doc. V1 warns after 14 days and does not auto-import private docs.',
    ],
  }
}

export async function buildHitListReconcileStatusFromFile({ repoRoot = defaultRepoRoot, backlogItems = [] } = {}) {
  const snapshot = await readJson('docs/process/hit-list-snapshot.json', repoRoot).catch(() => null)
  return buildHitListReconcileStatus({ backlogItems, snapshot })
}

export async function buildArchiveRetireStatus({ repoRoot = defaultRepoRoot } = {}) {
  const manifest = await readJson('docs/process/archive-retire-manifest.json', repoRoot).catch(() => null)
  const rebuildManifest = await readJson('docs/process/rebuild-doc-retire-manifest.json', repoRoot).catch(() => null)
  const findings = []

  for (const record of rebuildManifest?.movedFiles || []) {
    const targetExists = await exists(record.to, repoRoot)
    const sourceExists = await exists(record.from, repoRoot)
    if (!targetExists) {
      findings.push({
        severity: 'critical',
        type: 'missing_retired_rebuild_doc',
        issue: `${record.to} is missing after rebuild-doc retire.`,
        recommendedAction: 'Restore the retired doc or correct the manifest.',
      })
    }
    if (sourceExists) {
      findings.push({
        severity: 'warning',
        type: 'source_rebuild_doc_still_active',
        issue: `${record.from} still exists after retire.`,
        recommendedAction: 'Move it to plan history or mark it as intentionally active.',
      })
    }
  }

  for (const entry of manifest?.refusedEntries || []) {
    findings.push({
      severity: 'info',
      type: 'refused_unallowlisted_delete',
      issue: `${entry.path} was refused by the delete allowlist.`,
      recommendedAction: 'Review manually if it should ever be deleted.',
    })
  }

  return {
    status: findings.some(finding => finding.severity === 'critical') ? 'critical' : 'healthy',
    archiveRetireManifestPath: 'docs/process/archive-retire-manifest.json',
    rebuildRetireManifestPath: 'docs/process/rebuild-doc-retire-manifest.json',
    summary: {
      retiredRebuildDocCount: (rebuildManifest?.movedFiles || []).length,
      safeDeleteEntryCount: manifest?.summary?.safeDeleteEntryCount || 0,
      deletedCount: manifest?.summary?.deletedCount || 0,
      refusedCount: manifest?.summary?.refusedCount || 0,
      bytesDeleted: manifest?.summary?.bytesDeleted || 0,
      findingCount: findings.length,
    },
    findings,
    knownLimits: [
      'ARCHIVE-RETIRE-001 is the only Phase D delete card. It refuses anything outside the safe-delete allowlist.',
      'If no safe-delete archive exists, the correct v1 behavior is to record that nothing was deleted.',
    ],
  }
}

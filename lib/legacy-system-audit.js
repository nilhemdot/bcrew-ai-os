import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const LEGACY_SYSTEM_AUDIT_CARD_ID = 'LEGACY-SYSTEM-AUDIT-001'
export const LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY = 'legacy-system-audit-v1'
export const LEGACY_SYSTEM_AUDIT_PLAN_PATH = 'docs/process/legacy-system-audit-001-plan.md'
export const LEGACY_SYSTEM_AUDIT_APPROVAL_PATH = 'docs/process/approvals/LEGACY-SYSTEM-AUDIT-001.json'
export const LEGACY_SYSTEM_AUDIT_SCRIPT_PATH = 'scripts/process-legacy-system-audit-check.mjs'
export const LEGACY_SYSTEM_AUDIT_REPORT_PATH = 'docs/audits/2026-05-19-legacy-system-audit.md'
export const LEGACY_SYSTEM_AUDIT_JSON_PATH = 'docs/audits/2026-05-19-legacy-system-audit.json'
export const LEGACY_SYSTEM_AUDIT_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-legacy-system-audit-closeout.md'
export const LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID = 'STRATEGIC-INTEL-001'
export const LEGACY_SYSTEM_AUDIT_SPRINT_ID = 'FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19'

export const LEGACY_SYSTEM_AUDIT_PROOF_COMMANDS = [
  `npm run process:legacy-system-audit-check -- --write-report --close-card --json`,
  `npm run process:system-health-nightly-audit-check -- --json`,
  `npm run process:build-lane-repeated-failure-action-gate-check -- --json`,
  `npm run backlog:hygiene -- --json`,
  `npm run foundation:verify -- --json-summary`,
  `npm run process:foundation-ship -- --card=${LEGACY_SYSTEM_AUDIT_CARD_ID} --planApprovalRef=${LEGACY_SYSTEM_AUDIT_APPROVAL_PATH} --closeoutKey=${LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const LEGACY_SYSTEM_AUDIT_CHANGED_FILES = [
  'lib/legacy-system-audit.js',
  LEGACY_SYSTEM_AUDIT_SCRIPT_PATH,
  LEGACY_SYSTEM_AUDIT_REPORT_PATH,
  LEGACY_SYSTEM_AUDIT_JSON_PATH,
  LEGACY_SYSTEM_AUDIT_PLAN_PATH,
  LEGACY_SYSTEM_AUDIT_APPROVAL_PATH,
  LEGACY_SYSTEM_AUDIT_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
]

export const LEGACY_SYSTEM_AUDIT_NOT_NEXT_BOUNDARIES = [
  'Do not import old-system code.',
  'Do not run old agents, old crawlers, browser automation, or old scheduled jobs.',
  'Do not copy private runtime memory, credentials, media, or message contents into repo artifacts.',
  'Do not mutate credentials, provider config, Drive permissions, or external systems.',
  'Do not start paid/private source extraction or Value Builder split.',
]

export const LEGACY_SYSTEM_AUDIT_ROOTS = Object.freeze([
  {
    rootId: 'bcrew-buddy-reference',
    label: 'BCrew-Buddy old operating system',
    relativeToHome: 'bcrew-buddy-reference',
    posture: 'pattern_harvest',
    evidencePaths: [
      'docs/agent-inventory.md',
      'docs/team-reference.md',
      'docs/architecture/intelligence-loop.md',
      'docs/system-capabilities.md',
      'archive/review-loop-architecture.md',
      'archive/full_audit.cjs',
      'archive/batch-youtube-extract.cjs',
      'archive/fire-scouts.cjs',
      'scripts/atom-extractor.cjs',
      'src/web-extractor.ts',
    ],
  },
  {
    rootId: 'old-bcrew-skills',
    label: 'Old BCrew skill/team library',
    relativeToHome: '.inspection/bcrew-skills',
    posture: 'skill_contract_harvest',
    evidencePaths: [
      'bcrew-director-intelligence/SKILL.md',
      'bcrew-course-scout/SKILL.md',
      'bcrew-external-scout/SKILL.md',
      'bcrew-internal-email/SKILL.md',
      'bcrew-internal-slack/SKILL.md',
      'bcrew-internal-meetings/SKILL.md',
      'bcrew-strategy/SKILL.md',
      'knowledge/intelligence-sources.md',
      'knowledge/company-meetings.md',
    ],
  },
  {
    rootId: 'fub-zahnd-processor',
    label: 'FUB/Zahnd processor and SQL schema',
    relativeToHome: '.inspection/FUBZahnd',
    posture: 'schema_pattern_harvest',
    evidencePaths: [
      'FUBProcessor.cs',
      'Program.cs',
      'Models/People.cs',
      'Models/Deals.cs',
      'Models/Tasks.cs',
      'Database/fub/Tables/Person.sql',
      'Database/fub/Tables/Deal.sql',
      'Database/fub/Stored Procedures/up_GSheetRetrievePeople.sql',
      'Database/fub/Stored Procedures/up_RetrieveDealStageSummary.sql',
    ],
  },
  {
    rootId: 'zahnd-team-dashboard',
    label: 'Zahnd/Benson dashboard prototype',
    relativeToHome: '.inspection/zahnd-team-dashboard',
    posture: 'ui_and_kpi_pattern_harvest',
    evidencePaths: [
      'ARCHITECTURE.md',
      'index.html',
      'src/App.tsx',
      'src/main.tsx',
      'src/components',
      'src/pages',
      'package.json',
    ],
  },
  {
    rootId: 'openclaw-workspace',
    label: 'OpenClaw local workspace/runtime',
    relativeToHome: '.openclaw',
    posture: 'metadata_only_runtime_boundary',
    evidencePaths: [
      'workspace/AGENTS.md',
      'workspace/SOUL.md',
      'workspace/TOOLS.md',
      'workspace/HEARTBEAT.md',
      'openclaw.json',
      'logs/config-health.json',
    ],
    metadataOnly: true,
  },
  {
    rootId: 'unchained-realtor',
    label: 'Unchained Realtor product strategy notes',
    relativeToHome: 'unchained-realtor',
    posture: 'business_strategy_harvest',
    evidencePaths: [
      'ME.md',
      'STRATEGY.md',
      'BACKLOG.md',
    ],
  },
])

export const LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS = [
  'OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001',
  'WEB-GODMODE-001',
  'LOOM-001',
  'MEETING-VIDEO-001',
  'SKOOL-WORKER-001',
  'MYICRO-TRAINING-001',
  'DRIVE-WORKER-001',
  'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001',
  'SOURCE-012',
  'SOURCE-019',
  'SOURCE-020',
  'DATA-002',
  'DATA-003',
  'STRATEGIC-INTEL-001',
  'DECISION-008',
  'INTEL-SCOPER-001',
  'FOUNDATION-DEEP-AUDITOR-REAL-LOOP-001',
  'FOUNDATION-OPERATOR-PULSE-001',
  'PILLAR-5-AGENT-INVENTORY-001',
  'ROLE-ASSISTANT-CONTRACTS-001',
  'MEMORY-003',
  'MEMORY-004',
]

const FINDING_TYPES = Object.freeze([
  'promote',
  'backlog',
  'source_note',
  'spec',
  'evidence_only',
  'duplicate',
  'reject',
  'approval_bound',
])

function sha256(value = '') {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function homePath(relativeToHome = '') {
  return path.join(os.homedir(), relativeToHome)
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function statSafe(targetPath) {
  try {
    return await fs.stat(targetPath)
  } catch {
    return null
  }
}

async function readTextSafe(targetPath, { maxBytes = 512000 } = {}) {
  try {
    const stat = await fs.stat(targetPath)
    if (!stat.isFile() || stat.size > maxBytes) return ''
    return await fs.readFile(targetPath, 'utf8')
  } catch {
    return ''
  }
}

async function walkFiles(rootPath, { limit = 10000 } = {}) {
  const files = []
  async function visit(currentPath) {
    if (files.length >= limit) return
    let entries = []
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (['.git', 'node_modules', 'dist', '.next', 'coverage'].includes(entry.name)) continue
      const full = path.join(currentPath, entry.name)
      if (entry.isDirectory()) await visit(full)
      else if (entry.isFile()) files.push(full)
      if (files.length >= limit) break
    }
  }
  await visit(rootPath)
  return files
}

function classifyRootFindings(rootId) {
  const rows = {
    'bcrew-buddy-reference': [
      ['promote', 'source scan -> scored finding -> director synthesis -> action/backlog loop', ['STRATEGIC-INTEL-001', 'INTEL-SCOPER-001', 'DECISION-008']],
      ['backlog', 'browser/page/video extraction kernel should be rebuilt under governed source posture', ['WEB-GODMODE-001', 'LOOM-001', 'SKOOL-WORKER-001', 'MYICRO-TRAINING-001']],
      ['reject', 'free-floating agent sprawl and report piles without owner/action routing', []],
    ],
    'old-bcrew-skills': [
      ['promote', 'role/team skill contracts and evaluation assertions as reusable agent contract inputs', ['PILLAR-5-AGENT-INVENTORY-001', 'ROLE-ASSISTANT-CONTRACTS-001']],
      ['source_note', 'internal email/slack/meeting/source scout boundaries inform shared communications contracts', ['SOURCE-019', 'SOURCE-020']],
      ['reject', 'skill memory/state files as active truth; generated inventory must own status', []],
    ],
    'fub-zahnd-processor': [
      ['source_note', 'FUB SQL/table/procedure shape is evidence for connector/source contracts only', ['SOURCE-012', 'SOURCE-020']],
      ['backlog', 'deal/person/task data model mapping belongs in source trust and extraction adapter hardening', ['DATA-002', 'SOURCE-020']],
      ['reject', 'old .NET processor/runtime code import; rebuild adapters in current governed runtime only', []],
    ],
    'zahnd-team-dashboard': [
      ['promote', 'resource-center/dashboard IA patterns can inform live source-backed operator surfaces', ['DATA-003', 'FOUNDATION-OPERATOR-PULSE-001']],
      ['evidence_only', 'built dist assets and node_modules are evidence only, not source truth', []],
      ['reject', 'static dashboard copy as current operational truth', []],
    ],
    'openclaw-workspace': [
      ['promote', 'local workspace doctrine around memory, heartbeat, identity, and tool boundaries', ['MEMORY-003', 'MEMORY-004', 'FOUNDATION-DEEP-AUDITOR-REAL-LOOP-001']],
      ['approval_bound', 'runtime configs, credentials, message media, and local memory stay metadata-only unless explicitly approved', []],
      ['reject', 'copying local runtime state into repo docs or treating it as shared truth', []],
    ],
    'unchained-realtor': [
      ['promote', 'Steve-facing content/product strategy should route to source-backed strategic intelligence and content atoms', ['STRATEGIC-INTEL-001', 'DATA-003']],
      ['backlog', 'Top Dollar / Unchained extraction belongs behind approved source scope and content rights', ['WEB-GODMODE-001', 'DRIVE-WORKER-001']],
      ['evidence_only', 'private product notes are local evidence until promoted into source-backed product backlog truth', []],
    ],
  }[rootId] || []
  return rows.map(([classification, finding, promotedTo]) => ({
    classification,
    finding,
    promotedTo,
  }))
}

async function buildRootSnapshot(root) {
  const rootPath = homePath(root.relativeToHome)
  const present = await exists(rootPath)
  const files = present ? await walkFiles(rootPath, { limit: 12000 }) : []
  const extensions = {}
  let totalBytes = 0
  for (const file of files) {
    const stat = await statSafe(file)
    totalBytes += stat?.size || 0
    const ext = path.extname(file).toLowerCase() || '[none]'
    extensions[ext] = (extensions[ext] || 0) + 1
  }
  const evidence = []
  for (const evidencePath of root.evidencePaths) {
    const full = path.join(rootPath, evidencePath)
    const stat = await statSafe(full)
    const text = root.metadataOnly ? '' : await readTextSafe(full)
    evidence.push({
      path: `~/${root.relativeToHome}/${evidencePath}`,
      exists: Boolean(stat),
      kind: stat?.isDirectory() ? 'directory' : stat?.isFile() ? 'file' : 'missing',
      bytes: stat?.isFile() ? stat.size : 0,
      lineCount: text ? text.split(/\r?\n/).length : 0,
      sha256: text ? sha256(text) : '',
      metadataOnly: Boolean(root.metadataOnly),
    })
  }
  return {
    rootId: root.rootId,
    label: root.label,
    path: `~/${root.relativeToHome}`,
    posture: root.posture,
    present,
    fileCount: files.length,
    totalBytes,
    extensionCounts: Object.fromEntries(Object.entries(extensions).sort((a, b) => b[1] - a[1]).slice(0, 12)),
    evidence,
    findings: classifyRootFindings(root.rootId),
  }
}

export async function buildLegacySystemAuditSnapshot({ generatedAt = new Date().toISOString() } = {}) {
  const roots = []
  for (const root of LEGACY_SYSTEM_AUDIT_ROOTS) {
    roots.push(await buildRootSnapshot(root))
  }
  const findings = roots.flatMap(root => root.findings.map(finding => ({
    rootId: root.rootId,
    rootLabel: root.label,
    ...finding,
  })))
  return {
    generatedAt,
    cardId: LEGACY_SYSTEM_AUDIT_CARD_ID,
    closeoutKey: LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY,
    privacyBoundary: 'sanitized metadata and classification only; no raw credentials, private messages, media, or old runtime state copied',
    roots,
    findings,
    promotedCards: LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS,
    summary: {
      rootCount: roots.length,
      presentRootCount: roots.filter(root => root.present).length,
      totalFileCount: roots.reduce((sum, root) => sum + root.fileCount, 0),
      evidenceCount: roots.reduce((sum, root) => sum + root.evidence.length, 0),
      evidenceFoundCount: roots.reduce((sum, root) => sum + root.evidence.filter(row => row.exists).length, 0),
      findingCount: findings.length,
      promotedFindingCount: findings.filter(row => ['promote', 'backlog', 'source_note', 'spec'].includes(row.classification)).length,
      rejectedOrEvidenceOnlyCount: findings.filter(row => ['reject', 'evidence_only', 'approval_bound', 'duplicate'].includes(row.classification)).length,
      unclassifiedFindingCount: findings.filter(row => !FINDING_TYPES.includes(row.classification)).length,
      promotedCardCount: LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS.length,
    },
    boundaries: {
      importedOldCode: false,
      ranOldAgents: false,
      mutatedOldRoots: false,
      copiedPrivateRuntimeContent: false,
      externalWrites: false,
      credentialMutation: false,
      providerAccess: false,
    },
  }
}

export function evaluateLegacySystemAuditSnapshot(snapshot = {}, { backlogItems = [] } = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const roots = Array.isArray(snapshot.roots) ? snapshot.roots : []
  const findings = Array.isArray(snapshot.findings) ? snapshot.findings : []
  const backlogIds = new Set((backlogItems || []).map(item => item.id))
  const promotedIds = Array.isArray(snapshot.promotedCards) ? snapshot.promotedCards : []
  const findingPromotedIds = Array.from(new Set(findings.flatMap(finding => finding.promotedTo || [])))
  const allPromotedIds = Array.from(new Set([...promotedIds, ...findingPromotedIds]))

  add(snapshot.cardId === LEGACY_SYSTEM_AUDIT_CARD_ID, 'snapshot is for LEGACY-SYSTEM-AUDIT-001', snapshot.cardId || 'missing')
  add(roots.length >= LEGACY_SYSTEM_AUDIT_ROOTS.length, 'all required legacy roots are represented', `${roots.length}/${LEGACY_SYSTEM_AUDIT_ROOTS.length}`)
  add(roots.filter(root => root.present).length >= 5, 'legacy roots are present enough for bounded audit', `${roots.filter(root => root.present).length}/${roots.length}`)
  add(roots.every(root => Array.isArray(root.evidence) && root.evidence.length >= 3), 'each root has targeted evidence rows', roots.map(root => `${root.rootId}:${root.evidence?.length || 0}`).join(', '))
  add((snapshot.summary?.evidenceFoundCount || 0) >= 20, 'targeted evidence files/directories are found', `${snapshot.summary?.evidenceFoundCount || 0}/${snapshot.summary?.evidenceCount || 0}`)
  add(findings.length >= 15, 'salvage findings are populated', `${findings.length} findings`)
  add(findings.every(finding => FINDING_TYPES.includes(finding.classification)), 'every finding is classified', `${snapshot.summary?.unclassifiedFindingCount || 0} unclassified`)
  add(findings.some(finding => finding.classification === 'reject'), 'old-system anti-patterns are explicitly rejected', 'reject rows present')
  add(findings.some(finding => finding.classification === 'approval_bound'), 'private/provider/runtime work is approval-bound', 'approval-bound rows present')
  add(promotedIds.length >= 12 && promotedIds.every(id => backlogIds.has(id)), 'promoted cards exist in live backlog truth', promotedIds.filter(id => !backlogIds.has(id)).join(', ') || `${promotedIds.length} cards`)
  add(findingPromotedIds.every(id => backlogIds.has(id)), 'every finding promoted-to id exists in live backlog truth', findingPromotedIds.filter(id => !backlogIds.has(id)).join(', ') || `${findingPromotedIds.length} finding target(s)`)
  add(allPromotedIds.length >= 18, 'salvage map routes into enough live destinations', `${allPromotedIds.length} destination(s)`)
  add(Object.values(snapshot.boundaries || {}).every(value => value === false), 'audit has no old-code import, runtime, credential, provider, or external side effects', JSON.stringify(snapshot.boundaries || {}))

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    summary: snapshot.summary || {},
  }
}

export function buildLegacySystemAuditMarkdown(snapshot = {}, backlogItems = []) {
  const cardById = new Map((backlogItems || []).map(item => [item.id, item]))
  const rootSections = (snapshot.roots || []).map(root => {
    const evidenceRows = (root.evidence || []).map(row =>
      `- ${row.exists ? 'found' : 'missing'} ${row.path} (${row.kind}, ${row.bytes || 0}B${row.sha256 ? `, sha256 ${row.sha256.slice(0, 12)}...` : ''}${row.metadataOnly ? ', metadata-only' : ''})`
    ).join('\n')
    const findings = (root.findings || []).map(row =>
      `- **${row.classification}**: ${row.finding}${row.promotedTo?.length ? ` -> ${row.promotedTo.map(id => `\`${id}\``).join(', ')}` : ''}`
    ).join('\n')
    return `## ${root.label}

- Root: \`${root.path}\`
- Posture: ${root.posture}
- Present: ${root.present ? 'yes' : 'no'}
- Files scanned: ${root.fileCount}
- Top extensions: ${Object.entries(root.extensionCounts || {}).map(([ext, count]) => `${ext}=${count}`).join(', ') || 'none'}

### Evidence

${evidenceRows}

### Salvage Disposition

${findings}`
  }).join('\n\n')

  const promotedCards = (snapshot.promotedCards || []).map(id => {
    const card = cardById.get(id)
    return `- \`${id}\`: ${card?.lane || 'missing'} / ${card?.priority || 'n/a'} / ${card?.title || 'missing'}`
  }).join('\n')

  return `# Legacy System Audit - 2026-05-19

Card: \`${LEGACY_SYSTEM_AUDIT_CARD_ID}\`
Closeout key: \`${LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY}\`

## Summary

- Roots represented: ${snapshot.summary?.rootCount || 0}
- Roots present: ${snapshot.summary?.presentRootCount || 0}
- Files scanned: ${snapshot.summary?.totalFileCount || 0}
- Evidence found: ${snapshot.summary?.evidenceFoundCount || 0}/${snapshot.summary?.evidenceCount || 0}
- Findings classified: ${snapshot.summary?.findingCount || 0}
- Promoted cards checked: ${snapshot.summary?.promotedCardCount || 0}
- Privacy boundary: ${snapshot.privacyBoundary || 'metadata only'}

## Boundaries

- Old code imported: ${snapshot.boundaries?.importedOldCode ? 'yes' : 'no'}
- Old agents run: ${snapshot.boundaries?.ranOldAgents ? 'yes' : 'no'}
- Old roots mutated: ${snapshot.boundaries?.mutatedOldRoots ? 'yes' : 'no'}
- Private runtime content copied: ${snapshot.boundaries?.copiedPrivateRuntimeContent ? 'yes' : 'no'}
- External writes: ${snapshot.boundaries?.externalWrites ? 'yes' : 'no'}
- Credential/provider mutation: ${snapshot.boundaries?.credentialMutation || snapshot.boundaries?.providerAccess ? 'yes' : 'no'}

${rootSections}

## Promoted Live Cards

${promotedCards}

## Senior Call

Keep the old-system gold as patterns, schemas, source notes, specs, and backlog truth. Do not copy old runtime code or agent sprawl. The next active card should use this salvage map to define the strategic intelligence loop, not restart broad extraction or Value Builder split.
`
}

export function buildLegacySystemAuditDogfoodProof() {
  const healthy = {
    cardId: LEGACY_SYSTEM_AUDIT_CARD_ID,
    roots: LEGACY_SYSTEM_AUDIT_ROOTS.map(root => ({
      rootId: root.rootId,
      present: true,
      evidence: root.evidencePaths.slice(0, 3).map(pathPart => ({ path: pathPart, exists: true })),
      findings: classifyRootFindings(root.rootId),
    })),
    findings: LEGACY_SYSTEM_AUDIT_ROOTS.flatMap(root => classifyRootFindings(root.rootId).map(row => ({ rootId: root.rootId, ...row }))),
    promotedCards: LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS,
    summary: {
      evidenceFoundCount: 24,
      evidenceCount: 24,
      unclassifiedFindingCount: 0,
    },
    boundaries: {
      importedOldCode: false,
      ranOldAgents: false,
      mutatedOldRoots: false,
      copiedPrivateRuntimeContent: false,
      externalWrites: false,
      credentialMutation: false,
      providerAccess: false,
    },
  }
  const backlogItems = LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS.map(id => ({ id }))
  const missingRoot = evaluateLegacySystemAuditSnapshot({ ...healthy, roots: healthy.roots.slice(0, 2) }, { backlogItems })
  const unclassified = evaluateLegacySystemAuditSnapshot({
    ...healthy,
    findings: [...healthy.findings, { rootId: 'test', classification: 'unknown', finding: 'bad row' }],
    summary: { ...healthy.summary, unclassifiedFindingCount: 1 },
  }, { backlogItems })
  const unsafeImport = evaluateLegacySystemAuditSnapshot({
    ...healthy,
    boundaries: { ...healthy.boundaries, importedOldCode: true },
  }, { backlogItems })
  const ok = missingRoot.ok === false && unclassified.ok === false && unsafeImport.ok === false
  return {
    ok,
    missingRootRejected: !missingRoot.ok,
    unclassifiedRejected: !unclassified.ok,
    unsafeImportRejected: !unsafeImport.ok,
    invariant: ok
      ? 'legacy audit dogfood rejects missing roots, unclassified findings, and old-code/runtime import side effects'
      : 'legacy audit dogfood did not reject every unsafe fixture',
  }
}

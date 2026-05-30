#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import { getBacklogItemsByIds } from '../lib/foundation-backlog-sprint-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const CARD_ID = 'OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001'
const CLOSEOUT_KEY = 'old-system-research-team-harvest-v1'
const PLAN_PATH = 'docs/process/old-system-research-team-harvest-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001.json'
const REPORT_PATH = 'docs/audits/2026-05-19-old-system-research-team-harvest.md'
const JSON_PATH = 'docs/audits/2026-05-19-old-system-research-team-harvest.json'
const DEFAULT_OLD_REPO = path.join(os.homedir(), 'bcrew-buddy-reference')

const PROMOTED_CARD_IDS = [
  'WEB-GODMODE-001',
  'LOOM-001',
  'MEETING-VIDEO-001',
  'SKOOL-WORKER-001',
  'MYICRO-TRAINING-001',
  'DRIVE-WORKER-001',
  'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001',
  'FOUNDATION-OPERATOR-PULSE-001',
  'SOURCE-019',
  'SOURCE-020',
  'DATA-002',
]

const KEY_EVIDENCE_PATHS = [
  'docs/agent-inventory.md',
  'docs/team-reference.md',
  'docs/architecture/intelligence-loop.md',
  'skills/bcrew-external-scout/SKILL.md',
  'skills/bcrew-course-scout/SKILL.md',
  'skills/bcrew-platform-intel/SKILL.md',
  'skills/bcrew-director-intelligence/SKILL.md',
  'skills/bcrew-internal-skool/SKILL.md',
  'archive/batch-youtube-extract.cjs',
  'archive/fire-scouts.cjs',
  'scripts/atom-extractor.cjs',
  'src/web-extractor.ts',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    apply: false,
    oldRepo: process.env.OLD_BCREW_BUDDY_REPO || DEFAULT_OLD_REPO,
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--apply') args.apply = true
    else if (arg.startsWith('--oldRepo=')) args.oldRepo = arg.slice('--oldRepo='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '')
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readTextSafe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

async function readJsonSafe(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

async function walk(dir, { limit = 5000 } = {}) {
  const out = []
  async function visit(current) {
    if (out.length >= limit) return
    let entries = []
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) await visit(full)
      else if (entry.isFile()) out.push(full)
      if (out.length >= limit) break
    }
  }
  await visit(dir)
  return out
}

function classifySkill({ relativePath, text }) {
  const source = `${relativePath}\n${text}`.toLowerCase()
  const flags = []
  if (/scout|research|intel|intelligence|synthesis|director|brief|course|youtube|skool|loom|video|extract|source|web|browser|platform/.test(source)) flags.push('research_or_intel')
  if (/external|course|platform|community|skills|lead gen|marketing|ecosystem|industry/.test(source)) flags.push('external_scouting')
  if (/internal|gmail|email|slack|meeting|missive|skool/.test(source)) flags.push('internal_source_scouting')
  if (/director|brief|synthesis|score|prioritize|recommend|decision|action/.test(source)) flags.push('synthesis_or_director')
  if (/youtube|video|transcript|browser|web|course|skool|loom|myicor|extract/.test(source)) flags.push('extractor_pattern')
  return {
    relativePath,
    name: relativePath.split('/').slice(-2, -1)[0] || path.basename(relativePath),
    flags,
    disposition: flags.length ? 'harvest' : 'retire_or_ignore',
  }
}

function buildPatternMatrix({ skills, evidence }) {
  return {
    keep: [
      {
        pattern: 'source scan -> scored finding -> synthesis -> action/backlog',
        evidence: ['skills/bcrew-external-scout/SKILL.md', 'skills/bcrew-director-intelligence/SKILL.md', 'scripts/atom-extractor.cjs'],
        promotedTo: ['WEB-GODMODE-001', 'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001', 'FOUNDATION-OPERATOR-PULSE-001'],
      },
      {
        pattern: 'course/video scout with transcript/resource extraction and usefulness scoring',
        evidence: ['skills/bcrew-course-scout/SKILL.md', 'archive/batch-youtube-extract.cjs', 'docs/archive/youtube-deep-analysis.md'],
        promotedTo: ['WEB-GODMODE-001', 'LOOM-001', 'SKOOL-WORKER-001', 'MYICRO-TRAINING-001'],
      },
      {
        pattern: 'internal source scouts for Gmail/Missive/Slack/meetings feeding director synthesis',
        evidence: ['skills/bcrew-internal-email/SKILL.md', 'skills/bcrew-internal-slack/SKILL.md', 'skills/bcrew-internal-meetings/SKILL.md'],
        promotedTo: ['SOURCE-019', 'SOURCE-020', 'DATA-002'],
      },
    ],
    rebuild: [
      {
        pattern: 'browser/page/video observation kernel',
        oldShape: 'web/browser/course scripts plus human auth state',
        newShape: 'governed WEB-GODMODE kernel with approved source boundary, screenshots, transcript discovery, ledger, cost/runtime, and stop controls',
        promotedTo: 'WEB-GODMODE-001',
      },
      {
        pattern: 'training corpus extraction',
        oldShape: 'YouTube/course reports and MyICOR/Skool screenshots',
        newShape: 'bounded Loom/Skool/Mycro proofs with source rights, transcript-first behavior, screenshots where allowed, and review routing',
        promotedTo: 'LOOM-001 / SKOOL-WORKER-001 / MYICRO-TRAINING-001',
      },
      {
        pattern: 'research inbox and daily review',
        oldShape: 'reports pile up in docs/archive/intelligence',
        newShape: 'Build Intel daily extraction review queue with promote/archive decisions and backlog/action links',
        promotedTo: 'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001',
      },
    ],
    retire: [
      'free-floating agent sprawl without live source contracts',
      'prompt-only scheduler truth with stale docs as outputs',
      'VPS/local split-brain runtime state',
      'browser/auth scripts that run outside approved source posture',
      'report piles without owner/action/review decision',
    ],
    approvalBound: [
      'paid/private source login and browser session access',
      'bulk Skool/Loom/Mycro extraction',
      'screenshots or video/audio capture where source rights are unclear',
      'external sends, public posting, permission mutation, credential mutation',
    ],
    counts: {
      harvestedSkillCount: skills.filter(skill => skill.disposition === 'harvest').length,
      keyEvidenceFound: evidence.filter(row => row.exists).length,
    },
  }
}

async function buildHarvest({ oldRepo }) {
  const files = await walk(oldRepo)
  const skillFiles = files.filter(file => /\/skills\/[^/]+\/SKILL\.md$/.test(file))
  const skills = []
  for (const file of skillFiles) {
    const relativePath = normalizePath(path.relative(oldRepo, file))
    const text = await readTextSafe(file)
    skills.push(classifySkill({ relativePath, text }))
  }

  const agentData = await readJsonSafe(path.join(oldRepo, 'dashboard/agent-data.json'))
  const agentRecords = Array.isArray(agentData)
    ? agentData
    : Array.isArray(agentData?.agents)
      ? agentData.agents
      : Array.isArray(agentData?.aiAgents)
        ? agentData.aiAgents
        : []
  const evidence = []
  for (const relativePath of KEY_EVIDENCE_PATHS) {
    const full = path.join(oldRepo, relativePath)
    const text = await readTextSafe(full)
    evidence.push({
      path: `~/bcrew-buddy-reference/${relativePath}`,
      exists: Boolean(text),
      bytes: Buffer.byteLength(text),
      sha256: text ? sha256Text(text) : '',
    })
  }

  const matrix = buildPatternMatrix({ skills, evidence })
  return {
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    oldRepo: '~/bcrew-buddy-reference',
    summary: {
      agentRecordCount: agentRecords.length,
      skillCount: skills.length,
      harvestedSkillCount: matrix.counts.harvestedSkillCount,
      keyEvidenceFound: matrix.counts.keyEvidenceFound,
      promotedCardCount: PROMOTED_CARD_IDS.length,
    },
    skills: skills
      .filter(skill => skill.disposition === 'harvest')
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    evidence,
    matrix,
    promotedCards: PROMOTED_CARD_IDS,
    boundaries: {
      importedOldCode: false,
      mutatedOldRepo: false,
      externalWrites: false,
      paidOrPrivateExtraction: false,
      notes: 'This card harvests patterns only. It does not run old agents, import old code, or crawl private sources.',
    },
  }
}

function renderReport(harvest, cards = []) {
  const cardMap = new Map(cards.map(card => [card.id, card]))
  const promoted = harvest.promotedCards.map(id => `- \`${id}\`: ${cardMap.get(id)?.lane || 'missing'} / ${cardMap.get(id)?.priority || 'n/a'} / ${cardMap.get(id)?.title || 'missing'}`).join('\n')
  const skillLines = harvest.skills.slice(0, 80).map(skill => `- ${skill.name}: ${skill.flags.join(', ')} (${skill.relativePath})`).join('\n')
  const evidenceLines = harvest.evidence.map(row => `- ${row.exists ? 'found' : 'missing'} ${row.path} (${row.bytes}B${row.sha256 ? `, sha256 ${row.sha256.slice(0, 12)}...` : ''})`).join('\n')
  const keep = harvest.matrix.keep.map(row => `- ${row.pattern} -> ${row.promotedTo.map(id => `\`${id}\``).join(', ')}\n  Evidence: ${row.evidence.join(', ')}`).join('\n')
  const rebuild = harvest.matrix.rebuild.map(row => `- ${row.pattern}: ${row.oldShape} -> ${row.newShape} (${row.promotedTo})`).join('\n')
  const retire = harvest.matrix.retire.map(item => `- ${item}`).join('\n')
  const approval = harvest.matrix.approvalBound.map(item => `- ${item}`).join('\n')
  return `# Old System Research Team Harvest - 2026-05-19

Card: \`${CARD_ID}\`
Closeout key: \`${CLOSEOUT_KEY}\`
Old repo: \`${harvest.oldRepo}\`

## Summary

- Old agent records reviewed: ${harvest.summary.agentRecordCount}
- Skills reviewed: ${harvest.summary.skillCount}
- Research/intel/extraction skills harvested: ${harvest.summary.harvestedSkillCount}
- Key evidence files found: ${harvest.summary.keyEvidenceFound}/${KEY_EVIDENCE_PATHS.length}
- Promoted live cards checked: ${harvest.summary.promotedCardCount}
- Boundary: pattern harvest only; no old-code import, no old-agent execution, no private crawl.

## Keep

${keep}

## Rebuild

${rebuild}

## Retire

${retire}

## Approval-Bound

${approval}

## Promoted Cards

${promoted}

## Harvested Skill Matrix

${skillLines || '- none'}

## Evidence Files

${evidenceLines}
`
}

async function writeHarvestArtifacts({ harvest, cards }) {
  const markdown = renderReport(harvest, cards)
  await fs.mkdir(path.join(repoRoot, 'docs/audits'), { recursive: true })
  await fs.writeFile(path.join(repoRoot, REPORT_PATH), markdown, 'utf8')
  await fs.writeFile(path.join(repoRoot, JSON_PATH), `${JSON.stringify(harvest, null, 2)}\n`, 'utf8')
  return { markdown, json: harvest }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const oldRepo = path.resolve(args.oldRepo.replace(/^~/, os.homedir()))
  const approval = await validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID })
  const cards = await getBacklogItemsByIds([CARD_ID, ...PROMOTED_CARD_IDS])
  const card = cards.find(row => row.id === CARD_ID) || null
  const packageJson = await readJsonSafe(path.join(repoRoot, 'package.json'))

  let artifact = null
  if (args.apply) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: 'scripts/process-old-system-research-team-harvest-check.mjs',
      operation: 'write old-system research harvest report artifacts',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
    const harvest = await buildHarvest({ oldRepo })
    artifact = await writeHarvestArtifacts({ harvest, cards })
  } else if (await exists(path.join(repoRoot, JSON_PATH))) {
    const json = await readJsonSafe(path.join(repoRoot, JSON_PATH))
    const markdown = await readTextSafe(path.join(repoRoot, REPORT_PATH))
    artifact = { json, markdown }
  }
  await closeFoundationDb()

  const json = artifact?.json || null
  const markdown = artifact?.markdown || ''
  const promotedCardRows = cards.filter(row => PROMOTED_CARD_IDS.includes(row.id))
  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(row => row.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, Boolean(card) && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, packageJson?.scripts?.['process:old-system-research-team-harvest-check']?.includes('scripts/process-old-system-research-team-harvest-check.mjs'), 'package script exists', packageJson?.scripts?.['process:old-system-research-team-harvest-check'] || 'missing')
  addCheck(checks, await exists(oldRepo), 'old reference repo exists', oldRepo)
  addCheck(checks, Boolean(json) && Boolean(markdown), 'harvest artifacts exist or were generated', `${REPORT_PATH} / ${JSON_PATH}`)
  addCheck(checks, (json?.summary?.agentRecordCount || 0) >= 80 && (json?.summary?.skillCount || 0) >= 80, 'old agent/skill surface is broad enough', `${json?.summary?.agentRecordCount || 0} agents / ${json?.summary?.skillCount || 0} skills`)
  addCheck(checks, (json?.summary?.harvestedSkillCount || 0) >= 40, 'research/intel/extraction skill harvest is broad enough', `${json?.summary?.harvestedSkillCount || 0} harvested`)
  addCheck(checks, (json?.summary?.keyEvidenceFound || 0) >= 9, 'key old-system evidence files are present', `${json?.summary?.keyEvidenceFound || 0}/${KEY_EVIDENCE_PATHS.length}`)
  addCheck(checks, promotedCardRows.length === PROMOTED_CARD_IDS.length, 'all promoted cards exist in live backlog', promotedCardRows.map(row => row.id).join(', '))
  addCheck(checks, json?.matrix?.keep?.length >= 3 && json?.matrix?.rebuild?.length >= 3 && json?.matrix?.retire?.length >= 4, 'keep/rebuild/retire matrix is populated', JSON.stringify({
    keep: json?.matrix?.keep?.length || 0,
    rebuild: json?.matrix?.rebuild?.length || 0,
    retire: json?.matrix?.retire?.length || 0,
  }))
  addCheck(checks, json?.boundaries?.importedOldCode === false && json?.boundaries?.mutatedOldRepo === false && json?.boundaries?.paidOrPrivateExtraction === false, 'harvest did not import old code or run private extraction', JSON.stringify(json?.boundaries || {}))
  addCheck(checks, markdown.includes('## Keep') && markdown.includes('## Rebuild') && markdown.includes('## Retire') && markdown.includes('## Approval-Bound'), 'markdown report captures keep/rebuild/retire/approval-bound sections', REPORT_PATH)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    reportPath: REPORT_PATH,
    jsonPath: JSON_PATH,
    summary: json?.summary || null,
    promotedCards: PROMOTED_CARD_IDS,
    checks,
    failed,
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Old-system research team harvest check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

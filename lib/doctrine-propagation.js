import fs from 'node:fs/promises'
import path from 'node:path'

export const DEFAULT_BCREW_FOUNDATION_SKILL_PATH =
  process.env.BCREW_FOUNDATION_SKILL_PATH ||
  '/Users/bensoncrew/.codex/skills/bcrew-foundation/SKILL.md'

export const GENERATED_DOCTRINE_START = '<!-- BEGIN GENERATED BCrew Foundation Doctrine -->'
export const GENERATED_DOCTRINE_END = '<!-- END GENERATED BCrew Foundation Doctrine -->'

export const DOCTRINE_PROPAGATION_SOURCES = [
  {
    id: 'backlog-pulled-work',
    title: 'All durable Foundation work is backlog-pulled',
    plainEnglish: 'Every durable build starts from a real backlog card. If the work is not in Backlog, scope the card before coding.',
    requiredPhrases: ['backlog-pulled', 'real backlog card', 'scope the card before coding'],
  },
  {
    id: 'plan-gate-98',
    title: 'Scope, plan, review, 9.8, then execute',
    plainEnglish: 'No durable build starts until the plan has the seven required fields and Steve/reviewer scores it 9.8 or higher.',
    requiredPhrases: ['9.8', 'seven required fields', 'No durable build starts'],
  },
  {
    id: 'plain-english-first',
    title: 'Plain English first',
    plainEnglish: 'Operator-facing copy must say what is wrong, what it means, and what to do next without making Steve translate jargon.',
    requiredPhrases: ['Plain English first', 'what to do next', 'translate jargon'],
  },
  {
    id: 'always-state-next',
    title: 'Always state what is next',
    plainEnglish: 'Every build closeout and review must include the next concrete card or slice, plus what is not next when drift risk exists.',
    requiredPhrases: ['Always state what is next', 'next concrete card', 'what is not next'],
  },
  {
    id: 'live-backlog-truth',
    title: 'Live Backlog is task truth',
    plainEnglish: 'The Rebuild Plan is doctrine and phase gates; live Backlog is task truth. When they disagree, expose the drift.',
    requiredPhrases: ['Live Backlog is task truth', 'Rebuild Plan is doctrine', 'expose the drift'],
  },
  {
    id: 'post-ship-proof',
    title: 'Ships must prove their claimed artifacts',
    plainEnglish: 'A closeout is not trusted until its claimed files, docs, commands, routes, cards, and visible surfaces exist and pass the gates.',
    requiredPhrases: ['claimed files', 'visible surfaces', 'pass the gates'],
  },
  {
    id: 'private-memory-boundary',
    title: 'Private memory stays private',
    plainEnglish: 'Private memory files can trigger a doctrine review, but their content is not copied into tracked repo docs or shared skill output.',
    requiredPhrases: ['Private memory stays private', 'trigger a doctrine review', 'not copied'],
  },
  {
    id: 'hit-list-sequence',
    title: 'Canonical hit list controls sequence',
    plainEnglish: 'During the enforcement cleanup, do not skip ahead. The canonical hit list controls which phase and card comes next.',
    requiredPhrases: ['canonical hit list', 'do not skip ahead', 'comes next'],
  },
]

const TIER_TWO_SURFACES = [
  {
    path: 'SOUL.md',
    label: 'SOUL.md',
    purpose: 'assistant behavior',
    reviewSignals: [
      ['helpful', 'resourceful'],
      ['private', 'respect'],
    ],
  },
  {
    path: 'docs/users/steve.md',
    label: 'docs/users/steve.md',
    purpose: 'shared Steve-facing profile',
    reviewSignals: [
      ['system-facing preferences', 'shared Foundation operating expectations'],
      ['visible Foundation profile', 'local `USER.md`'],
    ],
  },
  {
    path: 'docs/agents/harlan.md',
    label: 'docs/agents/harlan.md',
    purpose: 'personal-agent persona boundary',
    reviewSignals: [
      ['Personal agent', 'Owner: Steve'],
      ['not the whole BCrew AI OS', 'not the system orchestrator'],
      ['Update Trigger', 'permissions'],
    ],
  },
  {
    path: 'docs/agents/crewbert.md',
    label: 'docs/agents/crewbert.md',
    purpose: 'system-agent persona boundary',
    reviewSignals: [
      ['System agent', 'Owner: BCrew AI OS'],
      ['separate from Harlan', 'system infrastructure'],
      ['Update Trigger', 'permission'],
    ],
  },
  {
    path: 'docs/agents/personal-agent-onboarding.md',
    label: 'docs/agents/personal-agent-onboarding.md',
    purpose: 'personal-agent onboarding doctrine',
    reviewSignals: [
      ['private-context boundaries', 'approval boundaries'],
      ['private profile', 'not committed into this repo'],
      ['one nugget per day maximum', 'source-backed'],
    ],
  },
]

const PRIVATE_MEMORY_ROOT_FILES = [
  'MEMORY.md',
  'USER.md',
  'TOOLS.md',
  'IDENTITY.md',
  'HEARTBEAT.md',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function generatedSectionRegex() {
  return new RegExp(`${escapeRegExp(GENERATED_DOCTRINE_START)}[\\s\\S]*?${escapeRegExp(GENERATED_DOCTRINE_END)}`)
}

export function buildGeneratedDoctrineSection({ generatedAt = new Date().toISOString() } = {}) {
  const lines = [
    GENERATED_DOCTRINE_START,
    '',
    '## Generated Foundation Doctrine',
    '',
    `Generated at: ${generatedAt}`,
    '',
    'Source rule: this list is maintained in `lib/doctrine-propagation.js` as plain-English doctrine summaries. Private memory files may trigger review, but their content is not copied here.',
    '',
  ]

  for (const doctrine of DOCTRINE_PROPAGATION_SOURCES) {
    lines.push(`- **${doctrine.title}** (${doctrine.id}): ${doctrine.plainEnglish}`)
  }

  lines.push('', GENERATED_DOCTRINE_END)
  return lines.join('\n')
}

export function injectGeneratedDoctrineSection(skillSource, options = {}) {
  const section = buildGeneratedDoctrineSection(options)
  const source = String(skillSource || '')
  const regex = generatedSectionRegex()
  if (regex.test(source)) {
    return source.replace(regex, section)
  }
  const guardrailHeading = '\n## Guardrails\n'
  if (source.includes(guardrailHeading)) {
    return source.replace(guardrailHeading, `\n${section}\n${guardrailHeading}`)
  }
  return `${source.trimEnd()}\n\n${section}\n`
}

export function evaluateDoctrineSkillSource(skillSource, { includeSynthetic = true } = {}) {
  const findings = []
  const source = String(skillSource || '')
  const sectionMatch = source.match(generatedSectionRegex())
  const generatedSection = sectionMatch ? sectionMatch[0] : ''

  if (!generatedSection) {
    findings.push({
      severity: 'critical',
      type: 'missing_generated_section',
      issue: 'The bcrew-foundation skill is missing the generated Foundation doctrine section.',
      recommendedAction: 'Run npm run doctrine:propagation-check -- --apply to regenerate the marked section.',
    })
  }

  for (const doctrine of DOCTRINE_PROPAGATION_SOURCES) {
    const missingPhrases = doctrine.requiredPhrases.filter(phrase => !generatedSection.includes(phrase))
    if (!missingPhrases.length) continue
    findings.push({
      severity: 'critical',
      type: 'missing_doctrine',
      doctrineId: doctrine.id,
      issue: `Skill doctrine is missing: ${doctrine.title}.`,
      recommendedAction: `Regenerate the skill doctrine section. Missing phrase(s): ${missingPhrases.join(', ')}.`,
    })
  }

  if (includeSynthetic) {
    const synthetic = evaluateDoctrineSkillSource(
      `${GENERATED_DOCTRINE_START}\n- Synthetic section without the required 9.8 rule.\n${GENERATED_DOCTRINE_END}`,
      { includeSynthetic: false },
    )
    if (!synthetic.some(finding => finding.type === 'missing_doctrine' && finding.doctrineId === 'plan-gate-98')) {
      findings.push({
        severity: 'critical',
        type: 'synthetic_detector_failed',
        issue: 'The synthetic stale-skill case was not caught.',
        recommendedAction: 'Fix the doctrine propagation detector before trusting this gate.',
      })
    }
  }

  return findings
}

async function statIfExists(filePath) {
  try {
    const stat = await fs.stat(filePath)
    return {
      path: filePath,
      exists: true,
      mtimeMs: stat.mtimeMs,
      mtime: stat.mtime.toISOString(),
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        path: filePath,
        exists: false,
        mtimeMs: 0,
        mtime: null,
      }
    }
    throw error
  }
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    if (error && error.code === 'ENOENT') return ''
    throw error
  }
}

function hasSemanticSignal(source, signalGroup) {
  const haystack = String(source || '').toLowerCase()
  return signalGroup.some(signal => haystack.includes(String(signal || '').toLowerCase()))
}

async function buildTierTwoReviewFindings({ repoRoot = process.cwd() } = {}) {
  const findings = []
  for (const surface of TIER_TWO_SURFACES) {
    const source = await readIfExists(path.join(repoRoot, surface.path))
    if (!source) {
      findings.push({
        severity: 'warning',
        type: 'tier_two_surface_missing',
        surface: surface.label,
        issue: `${surface.label} was not found for review.`,
        recommendedAction: 'Confirm whether this surface moved before updating doctrine propagation.',
      })
      continue
    }
    const missingSignals = (surface.reviewSignals || []).filter(group => !hasSemanticSignal(source, group))
    if (!missingSignals.length) continue
    findings.push({
      severity: 'warning',
      type: 'tier_two_review_needed',
      surface: surface.label,
      issue: `${surface.label} may need human review after doctrine changes.`,
      recommendedAction: `Review ${surface.label}; v2 checks semantic signals but does not auto-edit tier-two surfaces.`,
    })
  }
  return findings
}

async function listPrivateMemorySignalPaths({ repoRoot = process.cwd() } = {}) {
  const paths = new Set(PRIVATE_MEMORY_ROOT_FILES)
  const memoryDir = path.join(repoRoot, 'memory')
  try {
    const entries = await fs.readdir(memoryDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      paths.add(path.join('memory', entry.name))
    }
  } catch (error) {
    if (!error || error.code !== 'ENOENT') throw error
  }
  return Array.from(paths).sort()
}

async function buildPrivateMemoryStats({ repoRoot = process.cwd(), generatedAtMs = 0 } = {}) {
  const stats = []
  for (const relativePath of await listPrivateMemorySignalPaths({ repoRoot })) {
    const stat = await statIfExists(path.join(repoRoot, relativePath))
    stats.push({
      relativePath,
      exists: stat.exists,
      mtime: stat.mtime,
      changedAfterGeneratedSkill: Boolean(generatedAtMs && stat.mtimeMs > generatedAtMs),
      contentMode: 'metadata-only',
      contentCopied: false,
    })
  }
  return stats
}

function getGeneratedAtMs(skillSource) {
  const match = String(skillSource || '').match(/Generated at:\s*([^\n]+)/)
  if (!match) return 0
  const time = new Date(match[1].trim()).getTime()
  return Number.isFinite(time) ? time : 0
}

export async function buildDoctrinePropagationStatus({
  repoRoot = process.cwd(),
  skillPath = DEFAULT_BCREW_FOUNDATION_SKILL_PATH,
  apply = false,
  includeSynthetic = true,
} = {}) {
  let skillSource = await readIfExists(skillPath)
  let applied = false

  if (apply) {
    const nextSource = injectGeneratedDoctrineSection(skillSource)
    if (nextSource !== skillSource) {
      await fs.writeFile(skillPath, nextSource, 'utf8')
      skillSource = nextSource
      applied = true
    }
  }

  const findings = evaluateDoctrineSkillSource(skillSource, { includeSynthetic })
  const generatedAtMs = getGeneratedAtMs(skillSource)
  const [tierTwoFindings, privateMemoryStats] = await Promise.all([
    buildTierTwoReviewFindings({ repoRoot }),
    buildPrivateMemoryStats({ repoRoot, generatedAtMs }),
  ])
  const privateMemoryChangedAfterSkill = privateMemoryStats.some(item => item.changedAfterGeneratedSkill)
  if (privateMemoryChangedAfterSkill) {
    findings.push({
      severity: 'warning',
      type: 'private_memory_newer_than_skill',
      issue: 'Private memory changed after the generated skill doctrine section.',
      recommendedAction: 'Review whether the hardcoded doctrine source list needs a new plain-English rule. Do not copy private memory content.',
    })
  }
  findings.push(...tierTwoFindings)

  const critical = findings.filter(finding => finding.severity === 'critical')
  const warnings = findings.filter(finding => finding.severity === 'warning')

  return {
    status: critical.length ? 'risk' : warnings.length ? 'watch' : 'healthy',
    skillPath,
    applied,
    generatedSectionPresent: generatedSectionRegex().test(skillSource),
    generatedAt: generatedAtMs ? new Date(generatedAtMs).toISOString() : null,
    doctrineCount: DOCTRINE_PROPAGATION_SOURCES.length,
    tierTwoSurfaceCount: TIER_TWO_SURFACES.length,
    privateMemoryFileCount: privateMemoryStats.filter(item => item.exists).length,
    privateMemorySignalMode: 'metadata-only',
    summary: {
      criticalFindings: critical.length,
      warningFindings: warnings.length,
      doctrineCount: DOCTRINE_PROPAGATION_SOURCES.length,
      privateMemoryChangedAfterSkill,
      privateMemorySignalsChecked: privateMemoryStats.filter(item => item.exists).length,
      privateMemoryContentCopied: false,
    },
    doctrines: DOCTRINE_PROPAGATION_SOURCES.map(doctrine => ({
      id: doctrine.id,
      title: doctrine.title,
      plainEnglish: doctrine.plainEnglish,
    })),
    privateMemoryStats,
    findings,
  }
}

export function buildSyntheticStaleSkillSource() {
  return `${GENERATED_DOCTRINE_START}

## Generated Foundation Doctrine

- Synthetic stale doctrine section. It intentionally omits the 9.8 gate.

${GENERATED_DOCTRINE_END}
`
}

import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import {
  buildResearchInboxPromotionProposal,
  validateResearchInboxItem,
} from './research-inbox.js'

const execFile = promisify(execFileCallback)

export const GSTACK_BUILD_INTEL_CLOSEOUT_KEY = 'gstack-build-intel-extraction-v1'
export const GSTACK_BUILD_INTEL_SPRINT_ID = 'gstack-build-intel-extraction-2026-05-13'
export const GSTACK_BUILD_INTEL_SCRIPT_PATH = 'scripts/process-gstack-build-intel-check.mjs'
export const GSTACK_BUILD_INTEL_REPORT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-13-gstack-build-intel-extraction.md'
export const GSTACK_BUILD_INTEL_SOURCE_NOTE_PATH = 'docs/source-notes/github-build-intel.md'
export const GSTACK_BUILD_INTEL_SOURCE_ID = 'SRC-GITHUB-BUILD-INTEL-001'
export const GSTACK_BUILD_INTEL_REPO_URL = 'https://github.com/garrytan/gstack'
export const GSTACK_BUILD_INTEL_LOCAL_MIRROR = '/tmp/gstack-research'
export const GSTACK_BUILD_INTEL_EXPECTED_COMMIT = 'dc6252d1df7f1f650ea6e9b2bba7d08fab5de902'

export const GSTACK_BUILD_INTEL_CARD_IDS = [
  'PUBLIC-DEV-COMMUNITY-WATCHLIST-001',
  'GSTACK-EXTRACTION-001',
  'BUILD-INTEL-GITHUB-MONITOR-001',
  'SKILL-IMPROVER-GSTACK-ENRICHMENT-001',
  'REVIEW-GATE-UPGRADE-001',
  'BROWSER-QA-PROOF-001',
]

export const GSTACK_BUILD_INTEL_NEXT_REVIEW = 'Sprint review: decide whether to build FRONTEND-DESIGN-PIPELINE-001, Context Save/Restore, or Eval Harness next; do not install GStack or open autonomous dev.'

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.txt',
  '.json',
  '.yaml',
  '.yml',
  '.js',
  '.ts',
  '.tsx',
  '.css',
  '.html',
  '.sh',
])

const CATEGORY_RULES = [
  {
    key: 'skill_routing',
    label: 'Skill routing and specialist workflows',
    patterns: [/\/SKILL\.md$/i, /^SKILL\.md$/i, /^AGENTS\.md$/i, /^docs\/skills\.md$/i],
  },
  {
    key: 'browser_qa',
    label: 'Browser QA and proof tooling',
    patterns: [/^browse\//i, /^browser-skills\//i, /^BROWSER\.md$/i, /^open-gstack-browser\//i, /playwright/i, /browser/i],
  },
  {
    key: 'frontend_design',
    label: 'Frontend design and design-to-code workflow',
    patterns: [/^design\//i, /^design-/i, /^plan-design-review\//i, /^design-review\//i, /^DESIGN\.md$/i, /^docs\/designs\//i],
  },
  {
    key: 'review_gates',
    label: 'Review gates and ship discipline',
    patterns: [/^review\//i, /^ship\//i, /^qa\//i, /^qa-only\//i, /^land-and-deploy\//i, /^canary\//i],
  },
  {
    key: 'context_memory',
    label: 'Context save, restore, and private memory',
    patterns: [/^context-save\//i, /^context-restore\//i, /gbrain/i, /memory/i, /learn/i],
  },
  {
    key: 'guard_freeze',
    label: 'Guard/freeze safety rails',
    patterns: [/^guard\//i, /^freeze\//i, /^careful\//i, /safety/i],
  },
  {
    key: 'eval_harness',
    label: 'Eval, benchmark, and regression harnesses',
    patterns: [/^evals\//i, /^benchmarks?\//i, /^benchmark/i, /^scripts\/eval/i, /test\//i],
  },
  {
    key: 'openclaw_dispatch',
    label: 'OpenClaw and multi-agent dispatch tiers',
    patterns: [/^openclaw\//i, /^docs\/OPENCLAW\.md$/i, /^hosts\/openclaw/i],
  },
  {
    key: 'github_community_monitor',
    label: 'GitHub/community release monitoring',
    patterns: [/^\.github\//i, /community/i, /release/i, /upgrade/i],
  },
]

const PATTERN_DEFINITIONS = [
  {
    patternId: 'skill_improver_operating_rules',
    title: 'Treat skills as operating rules with routing, trigger, and safety metadata',
    category: 'skill_routing',
    relatedCards: ['SKILL-IMPROVER-001', 'SKILL-IMPROVER-GSTACK-ENRICHMENT-001'],
    evidence: ['README.md', 'AGENTS.md', 'codex/SKILL.md', 'review/SKILL.md'],
    aiosFit: 'Useful for AIOS only as a reviewed skill-improvement proposal. It should sharpen Codex behavior and routing, not create another autonomous agent layer.',
    risk: 'Copying every specialist role would repeat old-system agent sprawl and make process look mature without deterministic code boundaries.',
    recommendedRoute: 'enrich_existing_card',
    valueScore: 9,
    implementationComplexity: 4,
    doctrineFit: 8,
  },
  {
    patternId: 'review_gate_checklists',
    title: 'Use review gates as deterministic checklists before adding reviewer agents',
    category: 'review_gates',
    relatedCards: ['REVIEW-GATE-UPGRADE-001', 'VERIFIER-INCREMENTAL-COVERAGE-001'],
    evidence: ['review/checklist.md', 'review/design-checklist.md', 'ship/SKILL.md', 'qa/SKILL.md'],
    aiosFit: 'High. AIOS already values proof gates. The useful move is converting GStack review categories into scoped process/verifier checks.',
    risk: 'Turning each checklist into a named agent would add personas without improving proof.',
    recommendedRoute: 'enrich_existing_card',
    valueScore: 9,
    implementationComplexity: 5,
    doctrineFit: 9,
  },
  {
    patternId: 'browser_qa_proof_loop',
    title: 'Make browser QA proof a normal frontend shipping requirement',
    category: 'browser_qa',
    relatedCards: ['BROWSER-QA-PROOF-001', 'FOUNDATION-UI-COMPLETE-001'],
    evidence: ['BROWSER.md', 'browse/SKILL.md', 'browse/test/security-live-playwright.test.ts', 'open-gstack-browser/SKILL.md'],
    aiosFit: 'High for dashboard/frontend work. AIOS should require real route interaction, screenshot or nonblank proof, and viewport checks when UI behavior changes.',
    risk: 'Over-applying browser proof to backend-only work would slow safe foundation sprints.',
    recommendedRoute: 'enrich_existing_card',
    valueScore: 10,
    implementationComplexity: 5,
    doctrineFit: 9,
  },
  {
    patternId: 'frontend_design_pipeline',
    title: 'Design variants, gallery, visual diff, and design-to-code proof before UI signoff',
    category: 'frontend_design',
    relatedCards: ['BROWSER-QA-PROOF-001', 'FRONTEND-DESIGN-PIPELINE-001'],
    evidence: ['design/src/design-to-code.ts', 'design/src/variants.ts', 'design/src/gallery.ts', 'design/src/diff.ts', 'design-shotgun/SKILL.md'],
    aiosFit: 'Strong future fit. AIOS should mine the design workflow pattern, not GStack visual style, when frontend work resumes.',
    risk: 'Installing a full design factory before active UI work would distract from source/action routing foundation.',
    recommendedRoute: 'propose_new_card',
    valueScore: 8,
    implementationComplexity: 7,
    doctrineFit: 7,
  },
  {
    patternId: 'context_save_restore',
    title: 'Make long-session context save and restore a compact, repeatable closeout',
    category: 'context_memory',
    relatedCards: ['CONTEXT-SAVE-RESTORE-001', 'FEEDBACK-CAPTURE-001'],
    evidence: ['context-save/SKILL.md', 'context-restore/SKILL.md', 'USING_GBRAIN_WITH_GSTACK.md', 'docs/gbrain-sync.md'],
    aiosFit: 'Medium-high. AIOS already has handoffs and memory files; the improvement is a smaller standard that catches decisions, changed files, remaining work, and next action.',
    risk: 'Memory sync can blur private workspace truth and repo truth if boundaries are not explicit.',
    recommendedRoute: 'propose_new_card',
    valueScore: 7,
    implementationComplexity: 4,
    doctrineFit: 8,
  },
  {
    patternId: 'guard_freeze_safety',
    title: 'Use guard/freeze boundaries for risky concurrent or scoped work',
    category: 'guard_freeze',
    relatedCards: ['AIOS-GUARD-FREEZE-001', 'PROCESS-ACK-STATES-001'],
    evidence: ['guard/SKILL.md', 'freeze/SKILL.md', 'careful/SKILL.md', 'freeze/bin/check-freeze.sh'],
    aiosFit: 'Good as a safety-rail proposal for active-builder conflicts, destructive commands, and scoped edits.',
    risk: 'Hook-style restrictions are not a security boundary and can be bypassed by shell commands if treated as enforcement.',
    recommendedRoute: 'propose_new_card',
    valueScore: 7,
    implementationComplexity: 5,
    doctrineFit: 8,
  },
  {
    patternId: 'eval_and_benchmark_harness',
    title: 'Add lightweight evals only where they protect a real workflow boundary',
    category: 'eval_harness',
    relatedCards: ['AIOS-EVAL-HARNESS-001', 'VERIFIER-INCREMENTAL-COVERAGE-001'],
    evidence: ['evals/', 'benchmark/SKILL.md', 'scripts/eval-summary.ts', 'docs/evals/security-bench-ensemble-v2.json'],
    aiosFit: 'Useful after core primitives stabilize. Start with small checks for extraction quality, skill changes, and handoff completeness.',
    risk: 'A broad eval platform before real workloads would become another dashboard of theater.',
    recommendedRoute: 'propose_new_card',
    valueScore: 6,
    implementationComplexity: 6,
    doctrineFit: 7,
  },
  {
    patternId: 'openclaw_dispatch_tiers',
    title: 'Translate simple/medium/heavy/full dispatch tiers into AIOS work routing',
    category: 'openclaw_dispatch',
    relatedCards: ['OPENCLAW-DISPATCH-TIERS-001', 'SPRINT-MASTER-ADVISOR-001'],
    evidence: ['docs/OPENCLAW.md', 'openclaw/gstack-lite-CLAUDE.md', 'openclaw/gstack-full-CLAUDE.md', 'openclaw/gstack-plan-CLAUDE.md'],
    aiosFit: 'Medium. The tiering idea is useful, but AIOS should translate it into Foundation language and keep Steve approval on sprint selection.',
    risk: 'Dispatch tiers can become autonomous dev if they open work without explicit sprint approval.',
    recommendedRoute: 'propose_new_card',
    valueScore: 6,
    implementationComplexity: 5,
    doctrineFit: 6,
  },
  {
    patternId: 'public_github_monitoring',
    title: 'Monitor public GitHub and dev communities as Build Intel, not marketing content',
    category: 'github_community_monitor',
    relatedCards: ['PUBLIC-DEV-COMMUNITY-WATCHLIST-001', 'BUILD-INTEL-GITHUB-MONITOR-001'],
    evidence: ['.github/workflows/', 'gstack-upgrade/SKILL.md', 'bin/gstack-community-dashboard', 'docs/designs/SELF_LEARNING_V0.md'],
    aiosFit: 'High. Steve explicitly wants GitHub, Codex Community, Claude Code Community, OpenClaw, and similar sources monitored for implementation lessons.',
    risk: 'Broad crawling can create idea spam or accidentally pull private/community content without approval.',
    recommendedRoute: 'enrich_existing_card',
    valueScore: 9,
    implementationComplexity: 5,
    doctrineFit: 9,
  },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(item => normalizeText(item)).filter(Boolean)
  const text = normalizeText(value)
  return text ? [text] : []
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)))
}

function isTextPath(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase()) ||
    filePath.endsWith('/SKILL.md') ||
    filePath.endsWith('/SKILL.md.tmpl')
}

async function pathExists(filePath) {
  try {
    await fs.stat(filePath)
    return true
  } catch {
    return false
  }
}

async function listFilesRecursive(rootDir, dir = rootDir, result = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await listFilesRecursive(rootDir, absolutePath, result)
    } else if (entry.isFile()) {
      result.push(path.relative(rootDir, absolutePath).replace(/\\/g, '/'))
    }
  }
  return result
}

async function readMaybe(rootDir, relativePath) {
  try {
    return await fs.readFile(path.join(rootDir, relativePath), 'utf8')
  } catch {
    return ''
  }
}

async function getRepoCommit(rootDir) {
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], {
      cwd: rootDir,
      maxBuffer: 1024 * 64,
    })
    return normalizeText(stdout)
  } catch {
    return ''
  }
}

function categorizeFile(relativePath) {
  return CATEGORY_RULES
    .filter(rule => rule.patterns.some(pattern => pattern.test(relativePath)))
    .map(rule => rule.key)
}

function buildCategoryCounts(files = []) {
  const counts = Object.fromEntries(CATEGORY_RULES.map(rule => [rule.key, 0]))
  for (const file of files) {
    for (const category of categorizeFile(file)) counts[category] += 1
  }
  return counts
}

function evidenceExists(filesSet, evidencePath) {
  const normalized = evidencePath.replace(/\/$/, '')
  if (filesSet.has(normalized)) return true
  if (evidencePath.endsWith('/')) {
    return Array.from(filesSet).some(file => file.startsWith(evidencePath))
  }
  return false
}

function buildSourceMap({ files = [], commit = '', repoAvailable = false } = {}) {
  const textFiles = files.filter(isTextPath)
  const skillFiles = files.filter(file => /(^|\/)SKILL\.md$/i.test(file))
  const categoryCounts = buildCategoryCounts(files)
  const highSignalFiles = files
    .filter(file => categorizeFile(file).length)
    .slice(0, 80)
  return {
    sourceId: GSTACK_BUILD_INTEL_SOURCE_ID,
    repoUrl: GSTACK_BUILD_INTEL_REPO_URL,
    localMirror: GSTACK_BUILD_INTEL_LOCAL_MIRROR,
    sourceCommit: commit || GSTACK_BUILD_INTEL_EXPECTED_COMMIT,
    expectedCommit: GSTACK_BUILD_INTEL_EXPECTED_COMMIT,
    repoAvailable,
    fileCount: files.length,
    textFileCount: textFiles.length,
    skillFileCount: skillFiles.length,
    categoryCounts,
    highSignalFiles,
  }
}

function buildPatternScorecard({ files = [], commit = GSTACK_BUILD_INTEL_EXPECTED_COMMIT } = {}) {
  const filesSet = new Set(files)
  return PATTERN_DEFINITIONS.map(pattern => {
    const evidence = pattern.evidence.map(evidencePath => ({
      path: evidencePath,
      exists: evidenceExists(filesSet, evidencePath),
      sourceCommit: commit,
    }))
    const evidenceHitCount = evidence.filter(item => item.exists).length
    const totalScore = pattern.valueScore + pattern.doctrineFit - pattern.implementationComplexity
    return {
      ...pattern,
      evidence,
      evidenceHitCount,
      evidenceComplete: evidenceHitCount >= Math.min(2, evidence.length),
      totalScore,
      proposalOnly: true,
      writesBacklog: false,
      codeImportAllowed: false,
    }
  }).sort((left, right) => right.totalScore - left.totalScore)
}

export function buildPublicDeveloperCommunityWatchlist() {
  return {
    cardId: 'PUBLIC-DEV-COMMUNITY-WATCHLIST-001',
    proposalOnly: true,
    publicOnly: true,
    noPrivateScraping: true,
    noAutoBacklogMutation: true,
    sources: [
      {
        sourceId: GSTACK_BUILD_INTEL_SOURCE_ID,
        label: 'Public GitHub build intelligence',
        seed: GSTACK_BUILD_INTEL_REPO_URL,
        allowedMetadata: ['repo_url', 'commit_sha', 'license', 'stars_forks_snapshot', 'file_paths', 'release_notes', 'public_issues_discussions'],
        blocked: ['private_repo_content', 'credentialed_scraping', 'wholesale_code_import', 'auto_install'],
        cadence: 'manual_first_then_weekly_proposal',
      },
      {
        sourceId: 'SRC-CODEX-COMMUNITY-BUILD-INTEL-001',
        label: 'Codex Community public Build Intel',
        seed: 'public community posts and official public docs only',
        allowedMetadata: ['public_url', 'topic', 'date_checked', 'implementation_pattern', 'related_cards'],
        blocked: ['private messages', 'login-gated scraping', 'auto-created backlog'],
        cadence: 'manual_first',
      },
      {
        sourceId: 'SRC-CLAUDE-CODE-COMMUNITY-BUILD-INTEL-001',
        label: 'Claude Code Community public Build Intel',
        seed: 'public community posts and public repos only',
        allowedMetadata: ['public_url', 'topic', 'date_checked', 'implementation_pattern', 'related_cards'],
        blocked: ['private messages', 'login-gated scraping', 'auto-created backlog'],
        cadence: 'manual_first',
      },
      {
        sourceId: 'SRC-OPENCLAW-COMMUNITY-BUILD-INTEL-001',
        label: 'OpenClaw public Build Intel',
        seed: 'public OpenClaw repo/community signals',
        allowedMetadata: ['public_url', 'release_or_doc', 'dispatch_pattern', 'related_cards'],
        blocked: ['private messages', 'login-gated scraping', 'auto-created backlog'],
        cadence: 'manual_first',
      },
    ],
  }
}

function buildResearchInboxRows({ scorecard = [], commit = GSTACK_BUILD_INTEL_EXPECTED_COMMIT } = {}) {
  return scorecard.slice(0, 7).map(pattern => {
    const firstEvidence = pattern.evidence.find(item => item.exists) || pattern.evidence[0]
    const sourceRef = `${GSTACK_BUILD_INTEL_SOURCE_ID}:${pattern.patternId}@${commit}`
    const item = {
      id: `gstack_${pattern.patternId}`,
      sourceRef,
      sourceType: 'github',
      whySteveCared: 'Steve asked AIOS to monitor public GitHub and AI coding communities for implementation lessons that improve how existing Foundation ideas are built.',
      plainEnglishTakeaway: pattern.title,
      systemFit: pattern.aiosFit,
      relatedCards: pattern.relatedCards,
      recommendation: pattern.recommendedRoute === 'propose_new_card'
        ? `Review whether ${pattern.relatedCards.at(-1)} should become a scoped AIOS card.`
        : `Enrich ${pattern.relatedCards.join(', ')} with this GStack-derived implementation pattern.`,
      evidenceLinks: [`${GSTACK_BUILD_INTEL_REPO_URL}/blob/${commit}/${firstEvidence?.path || 'README.md'}`],
      owner: 'Steve+Codex',
      proposedDisposition: pattern.recommendedRoute,
      status: 'proposal_ready',
      autoCreateBacklogCard: false,
      acceptanceCriteria: [
        'Steve+Codex review the proposal before any backlog mutation.',
        'Any adopted work cites GStack path evidence and AIOS doctrine fit.',
        'No GStack code is copied wholesale into AIOS runtime.',
      ],
    }
    return {
      item,
      validation: validateResearchInboxItem(item),
      promotionProposal: buildResearchInboxPromotionProposal(item),
    }
  })
}

function buildReviewGateUpgrade(scorecard = []) {
  const reviewPatterns = scorecard.filter(pattern => ['review_gates', 'frontend_design', 'browser_qa'].includes(pattern.category))
  return {
    cardId: 'REVIEW-GATE-UPGRADE-001',
    proposalOnly: true,
    gatesAsCodeFirst: true,
    newAgentRequired: false,
    recommendedUpgrades: [
      {
        gate: 'pre_landing_review',
        sourcePattern: 'review_gate_checklists',
        route: 'convert high-confidence categories into process/verifier checks before creating reviewer agents',
      },
      {
        gate: 'frontend_design_review',
        sourcePattern: 'frontend_design_pipeline',
        route: 'use design checklist and browser proof when UI files change',
      },
      {
        gate: 'browser_qa',
        sourcePattern: 'browser_qa_proof_loop',
        route: 'require browser interaction proof for dashboard/frontend behavior changes',
      },
    ],
    evidencePatterns: reviewPatterns.map(pattern => pattern.patternId),
  }
}

function buildBrowserQaProofStandard(scorecard = []) {
  const browserPattern = scorecard.find(pattern => pattern.patternId === 'browser_qa_proof_loop')
  return {
    cardId: 'BROWSER-QA-PROOF-001',
    proposalOnly: true,
    appliesWhen: [
      'Foundation/dashboard route behavior changes',
      'frontend layout, navigation, modal, form, or chart changes',
      'visual proof is part of the card acceptance criteria',
    ],
    notRequiredWhen: [
      'backend-only source contracts',
      'DB-only sprint state changes',
      'docs-only process doctrine',
    ],
    minimumProof: [
      'open the route in a real browser or in-app browser',
      'capture desktop and mobile screenshots or equivalent viewport proof',
      'prove nonblank content and no incoherent overlap',
      'exercise at least one primary interaction when the UI is interactive',
    ],
    sourceEvidence: browserPattern?.evidence || [],
  }
}

function buildSkillImproverEnrichment(scorecard = []) {
  const skillPattern = scorecard.find(pattern => pattern.patternId === 'skill_improver_operating_rules')
  return {
    cardId: 'SKILL-IMPROVER-GSTACK-ENRICHMENT-001',
    proposalOnly: true,
    writesSkills: false,
    defaultToCode: true,
    recommendedSkillChecks: [
      'Does the skill name when it should be used and when it should stay silent?',
      'Does the skill route deterministic work to code instead of an LLM persona?',
      'Does the skill include proof expectations and not-next boundaries?',
      'Does the skill avoid copying private memory or another repo doctrine into AIOS truth?',
    ],
    sourceEvidence: skillPattern?.evidence || [],
  }
}

export async function buildGStackBuildIntelSnapshot({
  repoRoot = GSTACK_BUILD_INTEL_LOCAL_MIRROR,
  allowMissingRepo = false,
} = {}) {
  const repoAvailable = await pathExists(repoRoot)
  let files = []
  let readme = ''
  let license = ''
  let commit = ''

  if (repoAvailable) {
    files = await listFilesRecursive(repoRoot)
    commit = await getRepoCommit(repoRoot)
    readme = await readMaybe(repoRoot, 'README.md')
    license = await readMaybe(repoRoot, 'LICENSE')
  } else if (!allowMissingRepo) {
    return {
      status: 'blocked',
      blocker: `Local GStack mirror missing at ${repoRoot}`,
      closeoutKey: GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
      proposalOnly: true,
      writesBacklog: false,
      sourceMap: buildSourceMap({ files, repoAvailable: false }),
    }
  }

  const sourceCommit = commit || GSTACK_BUILD_INTEL_EXPECTED_COMMIT
  const sourceMap = buildSourceMap({ files, commit: sourceCommit, repoAvailable })
  const patternScorecard = buildPatternScorecard({ files, commit: sourceCommit })
  const researchInboxRows = buildResearchInboxRows({ scorecard: patternScorecard, commit: sourceCommit })
  const proposalCount = researchInboxRows.length
  const enrichExistingCount = researchInboxRows.filter(row => row.item.proposedDisposition === 'enrich_existing_card').length
  const proposeNewCardCount = researchInboxRows.filter(row => row.item.proposedDisposition === 'propose_new_card').length
  const watchlist = buildPublicDeveloperCommunityWatchlist()

  return {
    status: repoAvailable || allowMissingRepo ? 'ready' : 'blocked',
    closeoutKey: GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
    sprintId: GSTACK_BUILD_INTEL_SPRINT_ID,
    cardIds: GSTACK_BUILD_INTEL_CARD_IDS,
    sourceId: GSTACK_BUILD_INTEL_SOURCE_ID,
    sourceUrl: GSTACK_BUILD_INTEL_REPO_URL,
    sourceCommit,
    sourceLicense: /MIT License/i.test(license) ? 'MIT' : normalizeText(license.split('\n')[0]) || 'unknown',
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    codeImported: false,
    installStarted: false,
    privateScrapeStarted: false,
    paidAuthUsed: false,
    autonomousDevEnabled: false,
    sourceMap,
    publicDeveloperCommunityWatchlist: watchlist,
    patternScorecard,
    researchInboxRows,
    researchInboxProposals: {
      proposalCount,
      enrichExistingCount,
      proposeNewCardCount,
      writesBacklog: false,
      autoCreatesBacklog: false,
    },
    skillImproverEnrichment: buildSkillImproverEnrichment(patternScorecard),
    reviewGateUpgrade: buildReviewGateUpgrade(patternScorecard),
    browserQaProof: buildBrowserQaProofStandard(patternScorecard),
    frontendDesignPipelineCandidate: patternScorecard.find(pattern => pattern.patternId === 'frontend_design_pipeline') || null,
    readmeEvidenceFound: /virtual engineering team|twenty-three specialists|browser/i.test(readme),
    nextReview: GSTACK_BUILD_INTEL_NEXT_REVIEW,
  }
}

export function renderGStackBuildIntelReport(snapshot = {}) {
  const sourceMap = snapshot.sourceMap || {}
  const scorecard = Array.isArray(snapshot.patternScorecard) ? snapshot.patternScorecard : []
  const inboxRows = Array.isArray(snapshot.researchInboxRows) ? snapshot.researchInboxRows : []
  const watchlistSources = Array.isArray(snapshot.publicDeveloperCommunityWatchlist?.sources)
    ? snapshot.publicDeveloperCommunityWatchlist.sources
    : []
  const rows = scorecard.map(pattern => {
    const evidenceRows = Array.isArray(pattern.evidence) ? pattern.evidence : []
    const evidence = evidenceRows
      .map(item => `${item.exists ? 'yes' : 'no'}:${item.path}`)
      .join(', ')
    return `| ${pattern.patternId} | ${pattern.totalScore} | ${pattern.recommendedRoute} | ${pattern.relatedCards.join(', ')} | ${evidence} |`
  }).join('\n')
  const proposals = inboxRows.map(row => {
    return `- ${row.item.id}: ${row.item.proposedDisposition} -> ${row.item.relatedCards.join(', ')}`
  }).join('\n')
  const watchlist = watchlistSources.map(source => {
    return `- ${source.sourceId}: ${source.label}; cadence ${source.cadence}; blocked ${source.blocked.join(', ')}`
  }).join('\n')

  return `# GStack Build Intel Extraction - 2026-05-13

Closeout key: \`${GSTACK_BUILD_INTEL_CLOSEOUT_KEY}\`  
Source: \`${GSTACK_BUILD_INTEL_SOURCE_ID}\`  
Repo: ${GSTACK_BUILD_INTEL_REPO_URL}  
Commit inspected: \`${snapshot.sourceCommit || GSTACK_BUILD_INTEL_EXPECTED_COMMIT}\`

## Summary

This is a read-only, proposal-only extraction of public GStack implementation patterns into AIOS. It does not install GStack, copy code, scrape private communities, use paid auth, open a sprint, or mutate backlog from findings.

## Source Map

- Repo available during proof: ${sourceMap.repoAvailable === true ? 'yes' : 'no'}
- Files inventoried: ${sourceMap.fileCount || 0}
- Text files inventoried: ${sourceMap.textFileCount || 0}
- Skill files inventoried: ${sourceMap.skillFileCount || 0}
- Browser QA files: ${sourceMap.categoryCounts?.browser_qa || 0}
- Frontend/design files: ${sourceMap.categoryCounts?.frontend_design || 0}
- Review-gate files: ${sourceMap.categoryCounts?.review_gates || 0}

## Public Developer Community Watchlist

${watchlist}

## Pattern Scorecard

| Pattern | Score | Route | Related Cards | Evidence |
| --- | ---: | --- | --- | --- |
${rows}

## Research Inbox Proposals

${proposals}

## Adopt

- Browser QA proof expectations for UI/dashboard work.
- Review gates as deterministic checklists and proof paths.
- Skill-improver checks that keep code-first boundaries.
- Public GitHub/community monitoring as Build Intel.

## Reject Or Defer

- Do not copy GStack skills wholesale.
- Do not install GStack into AIOS runtime.
- Do not treat GStack's visual style as AIOS design direction.
- Do not create autonomous dev loops from public repo findings.
- Defer frontend design pipeline work until UI work is active or Steve approves it as a standalone sprint.

## Next

${snapshot.nextReview || GSTACK_BUILD_INTEL_NEXT_REVIEW}
`
}

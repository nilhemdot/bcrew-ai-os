import {
  listCreatorWatchlistEntries,
} from './build-intel-watchlist.js'
import {
  buildCourseSourceAuthBoundarySnapshot,
} from './course-source-auth-boundary.js'
import {
  YOUTUBE_BUILD_INTEL_SOURCE_ID,
  buildYoutubeBuildIntelBatchSnapshot,
} from './youtube-build-intel-batch.js'

export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID = 'MATT-POCOCK-CLAUDE-FOLDER-EVAL-001'
export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY = 'matt-pocock-claude-folder-eval-v1'
export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_PLAN_PATH = 'docs/process/matt-pocock-claude-folder-eval-001-plan.md'
export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_PACKET_PATH = 'docs/process/matt-pocock-claude-folder-eval-001-packet.md'
export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_APPROVAL_PATH = 'docs/process/approvals/MATT-POCOCK-CLAUDE-FOLDER-EVAL-001.json'
export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_SCRIPT_PATH = 'scripts/process-matt-pocock-claude-folder-eval-check.mjs'
export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-matt-pocock-claude-folder-eval-closeout.md'
export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_SPRINT_ID = 'matt-pocock-claude-folder-eval-2026-05-18'
export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID = 'FOUNDATION-KB-ACTION-REVIEW-SPRINT-001'
export const MATT_POCOCK_CREATOR_ID = 'matt-pocock-total-typescript'
export const MATT_POCOCK_GITHUB_REPO = 'mattpocock/skills'
export const MATT_POCOCK_GITHUB_URL = `https://github.com/${MATT_POCOCK_GITHUB_REPO}`
export const MATT_POCOCK_REPO_COMMIT = '67bce91c80cd1020a4f068ced32d0281656842ad'
export const MATT_POCOCK_REPO_LOOKUP_AT = '2026-05-18T19:15:00.000-04:00'

export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_CHANGED_FILES = [
  'lib/matt-pocock-claude-folder-eval.js',
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_SCRIPT_PATH,
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_PLAN_PATH,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_PACKET_PATH,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_APPROVAL_PATH,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const MATT_POCOCK_CLAUDE_FOLDER_EVAL_PROOF_COMMANDS = [
  'node --check lib/matt-pocock-claude-folder-eval.js lib/foundation-intelligence-audit-verifier.js scripts/process-matt-pocock-claude-folder-eval-check.mjs scripts/foundation-verify.mjs',
  'npm run process:matt-pocock-claude-folder-eval-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 --planApprovalRef=docs/process/approvals/MATT-POCOCK-CLAUDE-FOLDER-EVAL-001.json --closeoutKey=matt-pocock-claude-folder-eval-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 --closeoutKey=matt-pocock-claude-folder-eval-v1',
  'npm run process:foundation-ship -- --card=MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 --planApprovalRef=docs/process/approvals/MATT-POCOCK-CLAUDE-FOLDER-EVAL-001.json --closeoutKey=matt-pocock-claude-folder-eval-v1 --commitRef=HEAD',
]

export const MATT_POCOCK_NOT_NEXT_BOUNDARIES = [
  'No npm/npx installer run, repo install, plugin install, skill symlink, Claude/Codex config mutation, or imported skill code.',
  'No blind copy of SKILL.md files, raw repo content, scripts, or prompts into AIOS runtime surfaces.',
  'No public YouTube transcript fetch, screenshots/keyframes, downloads, summaries, model calls, or video extraction.',
  'No Total TypeScript paid-course access, private auth, authorized browser session, comments/community data, or paid content inspection.',
  'No Research Inbox write, KB page write, atom row write, synthesis fact write, action-route row write, vector/query-index write, or backlog mutation from source content.',
  'No MEETING-VAULT-ACL-001 Phase B or Drive permissions mutation.',
  'No Drive/Gmail/ClickUp/Slack/Agent Feedback mutation, external write, live agent launch, hidden subagent, or parallel builder launch.',
]

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  publicGithubMetadataLookup: false,
  repoInstalled: false,
  npxInstallerRun: false,
  pluginInstalled: false,
  skillSymlinksWritten: 0,
  claudeConfigMutated: false,
  codexConfigMutated: false,
  codeImported: false,
  publicYoutubeTranscriptFetched: false,
  screenshotsCaptured: 0,
  keyframesCaptured: 0,
  videoDownloaded: false,
  modelCallsStarted: false,
  paidCourseAuthUsed: false,
  privateAuthUsed: false,
  authorizedBrowserOpened: false,
  researchInboxWritten: false,
  kbDraftsCreated: 0,
  atomsCreated: 0,
  synthesisFactsCreated: 0,
  actionRoutesCreated: 0,
  vectorWrites: 0,
  queryIndexWrites: 0,
  backlogMutatedFromSourceContent: false,
  externalWritesStarted: false,
})

export const MATT_POCOCK_PUBLIC_SOURCE_EVIDENCE = [
  {
    sourceKey: 'matt-pocock-github-repo-api',
    sourceType: 'public_github_repo_metadata',
    url: 'https://api.github.com/repos/mattpocock/skills',
    repo: MATT_POCOCK_GITHUB_REPO,
    description: 'Skills for Real Engineers. Straight from my .claude directory.',
    defaultBranch: 'main',
    license: 'MIT',
    starsAtLookup: 91765,
    forksAtLookup: 8049,
    openIssuesAtLookup: 40,
    createdAt: '2026-02-03T11:15:53Z',
    pushedAt: '2026-05-18T12:21:29Z',
    updatedAt: '2026-05-18T23:13:03Z',
    lookupMethod: 'public GitHub REST API metadata only',
    lookupAt: MATT_POCOCK_REPO_LOOKUP_AT,
  },
  {
    sourceKey: 'matt-pocock-github-main-commit',
    sourceType: 'public_github_commit_metadata',
    url: 'https://api.github.com/repos/mattpocock/skills/commits/main',
    commit: MATT_POCOCK_REPO_COMMIT,
    committedAt: '2026-05-18T12:21:28Z',
    message: 'Fix typo in README.md regarding ticket labels',
    lookupMethod: 'public GitHub REST API commit metadata only',
    lookupAt: MATT_POCOCK_REPO_LOOKUP_AT,
  },
  {
    sourceKey: 'matt-pocock-github-tree',
    sourceType: 'public_github_tree_metadata',
    url: 'https://api.github.com/repos/mattpocock/skills/git/trees/main?recursive=1',
    blobCount: 66,
    skillFileCount: 28,
    scriptFileCount: 4,
    adrCount: 1,
    lookupMethod: 'public GitHub tree metadata only',
    lookupAt: MATT_POCOCK_REPO_LOOKUP_AT,
  },
  {
    sourceKey: 'matt-pocock-plugin-json',
    sourceType: 'public_repo_file_metadata',
    url: 'https://raw.githubusercontent.com/mattpocock/skills/main/.claude-plugin/plugin.json',
    pluginName: 'mattpocock-skills',
    exposedSkillCount: 14,
    lookupMethod: 'public raw GitHub file metadata and skill list only',
    lookupAt: MATT_POCOCK_REPO_LOOKUP_AT,
  },
  {
    sourceKey: 'matt-pocock-license',
    sourceType: 'public_repo_license_metadata',
    url: 'https://raw.githubusercontent.com/mattpocock/skills/main/LICENSE',
    license: 'MIT',
    copyright: 'Copyright (c) 2026 Matt Pocock',
    lookupMethod: 'public raw GitHub license metadata only',
    lookupAt: MATT_POCOCK_REPO_LOOKUP_AT,
  },
]

export const MATT_POCOCK_INSPECTED_PUBLIC_FILES = [
  'README.md',
  'CLAUDE.md',
  'CONTEXT.md',
  '.claude-plugin/plugin.json',
  'LICENSE',
  'docs/adr/0001-explicit-setup-pointer-only-for-hard-dependencies.md',
  'skills/engineering/tdd/SKILL.md',
  'skills/engineering/diagnose/SKILL.md',
  'skills/engineering/grill-with-docs/SKILL.md',
  'skills/engineering/improve-codebase-architecture/SKILL.md',
  'skills/engineering/setup-matt-pocock-skills/SKILL.md',
  'skills/engineering/to-issues/SKILL.md',
  'skills/engineering/to-prd/SKILL.md',
  'skills/engineering/triage/SKILL.md',
  'skills/productivity/handoff/SKILL.md',
  'skills/misc/git-guardrails-claude-code/SKILL.md',
  'scripts/list-skills.sh',
  'scripts/link-skills.sh',
]

export const MATT_POCOCK_PLUGIN_SKILLS = [
  'diagnose',
  'grill-with-docs',
  'triage',
  'improve-codebase-architecture',
  'setup-matt-pocock-skills',
  'tdd',
  'to-issues',
  'to-prd',
  'zoom-out',
  'prototype',
  'caveman',
  'grill-me',
  'handoff',
  'write-a-skill',
]

export const MATT_POCOCK_PATTERN_CANDIDATES = [
  {
    patternId: 'small_composable_skills',
    sourceSignal: 'README and plugin catalog organize skills as small reusable behaviors rather than one monolithic agent mode.',
    aiosUse: 'AIOS capabilities should stay registry-owned, narrow, and composable instead of becoming one broad prompt blob.',
    route: 'enrich AGENT-CAPABILITY-REGISTRY-001 / AGENT-TEMPLATE-RUNTIME-CONTRACT-001 if reopened',
  },
  {
    patternId: 'setup_before_dependent_skills',
    sourceSignal: 'setup skill and ADR separate hard dependencies from soft domain-doc dependencies.',
    aiosUse: 'Foundation agents should run explicit setup/readiness gates before tools claim issue-tracker, label, source, or domain-doc authority.',
    route: 'future capability setup gate proposal',
  },
  {
    patternId: 'domain_glossary_and_adr_memory',
    sourceSignal: 'CONTEXT.md, docs/adr, and grill-with-docs keep project language and durable decisions in markdown.',
    aiosUse: 'Useful pattern, but AIOS must map it to source-backed KB/compiler quality gates instead of loose markdown drift.',
    route: 'FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001 / KNOWLEDGE-BASE-QUALITY-GATE-001 enrichment',
  },
  {
    patternId: 'feedback_loop_first_debugging',
    sourceSignal: 'diagnose and tdd skills center deterministic feedback loops and behavior tests.',
    aiosUse: 'Matches Foundation proof doctrine: focused behavior proof first, full ship gate second.',
    route: 'Plan Critic and focused proof doctrine enrichment',
  },
  {
    patternId: 'handoff_compaction_not_long_term_memory',
    sourceSignal: 'handoff skill creates a compact continuation document and avoids duplicating existing artifacts.',
    aiosUse: 'Good for chat continuity, but not a replacement for AIOS live backlog, source registry, or KB atoms.',
    route: 'chat archive / handoff discipline enrichment',
  },
  {
    patternId: 'ninety_day_context_claim_unverified',
    sourceSignal: 'Public repo scan did not find a 90-day context-retention pattern.',
    aiosUse: 'Do not promote a 90-day context claim until a source-backed artifact proves it.',
    route: 'blocked claim, no implementation',
  },
]

function text(value) {
  return String(value || '').trim()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function unsafeSideEffects(sideEffects = {}) {
  return Object.entries({ ...DEFAULT_SIDE_EFFECTS, ...sideEffects })
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
}

function copiedContentViolations(contentArtifacts = []) {
  const unsafeKeys = /rawSkill|skillMarkdown|rawReadme|rawScript|copiedPrompt|copiedCode|courseContent|transcript|videoSummary/i
  const violations = []
  for (const [index, artifact] of (contentArtifacts || []).entries()) {
    for (const [key, value] of Object.entries(artifact || {})) {
      const hasValue = Array.isArray(value) ? value.length > 0 : Boolean(text(value))
      if (unsafeKeys.test(key) && hasValue) violations.push(`${index}.${key}`)
    }
  }
  return violations
}

function findMattPocockWatchlistEntry(watchlistEntries = listCreatorWatchlistEntries({ sourceCategory: 'build_intel' })) {
  return (watchlistEntries || []).find(entry => entry.creatorId === MATT_POCOCK_CREATOR_ID) || null
}

function githubPlatform(entry = {}) {
  return (entry.platforms || []).find(platform =>
    platform.type === 'github' &&
      platform.url === 'https://github.com/mattpocock' &&
      platform.accessBoundary === 'public_lookup_required'
  ) || null
}

function youtubePlatform(entry = {}) {
  return (entry.platforms || []).find(platform =>
    platform.type === 'youtube' &&
      platform.url === 'https://www.youtube.com/@mattpocockuk' &&
      platform.accessBoundary === 'public_lookup_required'
  ) || null
}

function evidenceByKey(evidence = MATT_POCOCK_PUBLIC_SOURCE_EVIDENCE) {
  return Object.fromEntries((evidence || []).map(row => [row.sourceKey, row]))
}

function buildSourcePacket({ evidence = MATT_POCOCK_PUBLIC_SOURCE_EVIDENCE } = {}) {
  const byKey = evidenceByKey(evidence)
  return {
    sourceId: 'SRC-GITHUB-BUILD-INTEL-001',
    relatedYoutubeSourceId: YOUTUBE_BUILD_INTEL_SOURCE_ID,
    creatorId: MATT_POCOCK_CREATOR_ID,
    creatorName: 'Matt Pocock / Total TypeScript',
    repo: {
      fullName: byKey['matt-pocock-github-repo-api']?.repo || '',
      url: MATT_POCOCK_GITHUB_URL,
      description: byKey['matt-pocock-github-repo-api']?.description || '',
      defaultBranch: byKey['matt-pocock-github-repo-api']?.defaultBranch || '',
      license: byKey['matt-pocock-github-repo-api']?.license || '',
      starsAtLookup: byKey['matt-pocock-github-repo-api']?.starsAtLookup || 0,
      forksAtLookup: byKey['matt-pocock-github-repo-api']?.forksAtLookup || 0,
      openIssuesAtLookup: byKey['matt-pocock-github-repo-api']?.openIssuesAtLookup || 0,
      pushedAt: byKey['matt-pocock-github-repo-api']?.pushedAt || '',
      commit: byKey['matt-pocock-github-main-commit']?.commit || '',
    },
    tree: {
      blobCount: byKey['matt-pocock-github-tree']?.blobCount || 0,
      skillFileCount: byKey['matt-pocock-github-tree']?.skillFileCount || 0,
      scriptFileCount: byKey['matt-pocock-github-tree']?.scriptFileCount || 0,
      adrCount: byKey['matt-pocock-github-tree']?.adrCount || 0,
      inspectedFiles: [...MATT_POCOCK_INSPECTED_PUBLIC_FILES],
    },
    plugin: {
      name: byKey['matt-pocock-plugin-json']?.pluginName || '',
      exposedSkillCount: byKey['matt-pocock-plugin-json']?.exposedSkillCount || 0,
      skills: [...MATT_POCOCK_PLUGIN_SKILLS],
    },
    sourceEvidence: clone(evidence),
    sourceClaims: {
      publicRepoMetadataVerified: true,
      licenseVerified: true,
      skillCatalogVerified: true,
      repoInstalled: false,
      codeImported: false,
      publicYoutubeExtractionRun: false,
      paidCourseInspected: false,
      ninetyDayContextHandlingVerified: false,
      noNinetyDayContextPatternFound: true,
    },
  }
}

export function buildMattPocockClaudeFolderEvalSnapshot({
  watchlistEntries = listCreatorWatchlistEntries({ sourceCategory: 'build_intel' }),
  sourceAuthBoundary = buildCourseSourceAuthBoundarySnapshot(),
  youtubeBatch = buildYoutubeBuildIntelBatchSnapshot(),
  evidence = MATT_POCOCK_PUBLIC_SOURCE_EVIDENCE,
  sourcePacket = buildSourcePacket({ evidence }),
  sideEffects = {},
  contentArtifacts = [],
  outputWrites = {},
  outputTarget = 'proposal_packet_only',
} = {}) {
  const findings = []
  const entry = findMattPocockWatchlistEntry(watchlistEntries)
  const github = githubPlatform(entry)
  const youtube = youtubePlatform(entry)
  const publicYoutubeRow = (sourceAuthBoundary.rows || []).find(row => row.sourceId === YOUTUBE_BUILD_INTEL_SOURCE_ID)
  const queueSpec = (youtubeBatch.queueSpecs || []).find(spec => spec.creatorId === MATT_POCOCK_CREATOR_ID)
  const effects = { ...DEFAULT_SIDE_EFFECTS, ...(sideEffects || {}) }
  const copiedViolations = copiedContentViolations(contentArtifacts)
  const unsafeEffects = unsafeSideEffects(effects)
  const unsafeWrites = Object.entries(outputWrites || {})
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)

  addFinding(findings, Boolean(entry), 'Matt Pocock creator watchlist entry exists', entry?.creatorId || 'missing')
  addFinding(findings, entry?.accessBoundary === 'mixed_public_and_paid_authorized_required', 'creator keeps public and paid/auth boundaries separate', entry?.accessBoundary || 'missing')
  addFinding(findings, Boolean(github), 'public GitHub profile source is registered', github?.url || 'missing')
  addFinding(findings, Boolean(youtube), 'public YouTube source is registered for later approved extraction', youtube?.url || 'missing')
  addFinding(findings, publicYoutubeRow?.sourceClass === 'public_no_auth' && publicYoutubeRow?.extractionAllowed === false, 'public YouTube remains no-auth metadata with runtime extraction blocked', publicYoutubeRow ? `${publicYoutubeRow.sourceClass}/${publicYoutubeRow.extractionAllowed}` : 'missing')
  addFinding(findings, queueSpec?.runtimeApprovalRequired === true && queueSpec?.liveExtractionApproved === false, 'Matt Pocock YouTube queue spec exists but does not approve extraction', queueSpec ? queueSpec.queueKey : 'missing')
  addFinding(findings, sourcePacket.repo?.fullName === MATT_POCOCK_GITHUB_REPO && sourcePacket.repo?.url === MATT_POCOCK_GITHUB_URL, 'GitHub repo identity is exact', `${sourcePacket.repo?.fullName || 'missing'} ${sourcePacket.repo?.url || ''}`)
  addFinding(findings, sourcePacket.repo?.license === 'MIT', 'repo license is classified as MIT', sourcePacket.repo?.license || 'missing')
  addFinding(findings, /^[0-9a-f]{40}$/i.test(sourcePacket.repo?.commit || ''), 'source commit SHA is recorded', sourcePacket.repo?.commit || 'missing')
  addFinding(findings, Number(sourcePacket.repo?.starsAtLookup || 0) > 0, 'star count is recorded as lookup-time metadata only', String(sourcePacket.repo?.starsAtLookup || 0))
  addFinding(findings, Number(sourcePacket.tree?.skillFileCount || 0) >= 20 && Number(sourcePacket.plugin?.exposedSkillCount || 0) === 14, 'skill catalog shape is captured', `${sourcePacket.tree?.skillFileCount || 0} skill files / ${sourcePacket.plugin?.exposedSkillCount || 0} exposed`)
  addFinding(findings, sourcePacket.tree?.inspectedFiles?.includes('CLAUDE.md') && sourcePacket.tree?.inspectedFiles?.includes('CONTEXT.md') && sourcePacket.tree?.inspectedFiles?.includes('skills/engineering/tdd/SKILL.md'), 'agent instructions, markdown memory, and engineering skills were inspected', (sourcePacket.tree?.inspectedFiles || []).slice(0, 4).join(', '))
  addFinding(findings, sourcePacket.plugin?.skills?.includes('setup-matt-pocock-skills') && sourcePacket.plugin?.skills?.includes('handoff'), 'setup and handoff patterns are represented in plugin skills', (sourcePacket.plugin?.skills || []).join(', '))
  addFinding(findings, sourcePacket.sourceClaims?.repoInstalled === false && sourcePacket.sourceClaims?.codeImported === false, 'repo was evaluated without install/import', JSON.stringify(sourcePacket.sourceClaims || {}))
  addFinding(findings, sourcePacket.sourceClaims?.ninetyDayContextHandlingVerified === false && sourcePacket.sourceClaims?.noNinetyDayContextPatternFound === true, '90-day context claim stays unverified instead of invented', JSON.stringify(sourcePacket.sourceClaims || {}))
  addFinding(findings, MATT_POCOCK_PATTERN_CANDIDATES.length >= 5 && MATT_POCOCK_PATTERN_CANDIDATES.some(pattern => pattern.patternId === 'ninety_day_context_claim_unverified'), 'transfer candidates include useful patterns and blocked claims', MATT_POCOCK_PATTERN_CANDIDATES.map(pattern => pattern.patternId).join(', '))
  addFinding(findings, unsafeEffects.length === 0, 'no install, extraction, auth, model, config, or external-write side effects', unsafeEffects.join(', ') || 'none')
  addFinding(findings, copiedViolations.length === 0, 'no raw skill/repo/course/transcript content copied into outputs', copiedViolations.join(', ') || 'none')
  addFinding(findings, unsafeWrites.length === 0 && outputTarget === 'proposal_packet_only', 'outputs are proposal packet only with no downstream writes', unsafeWrites.join(', ') || outputTarget)

  const failures = findings.filter(finding => !finding.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'ready',
    cardId: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
    closeoutKey: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY,
    sourceId: 'SRC-GITHUB-BUILD-INTEL-001',
    creatorId: MATT_POCOCK_CREATOR_ID,
    proposalOnly: true,
    publicSourceEvalOnly: true,
    publicGithubLookupCompleted: true,
    installApprovedByThisCard: false,
    runtimeExtractionApprovedByThisCard: false,
    writesBacklogFromSourceContent: false,
    outputTarget,
    sourcePacket,
    patternCandidates: clone(MATT_POCOCK_PATTERN_CANDIDATES),
    sideEffects: effects,
    contentArtifacts,
    outputWrites,
    findings,
    failures,
    summary: {
      findingCount: findings.length,
      failureCount: failures.length,
      inspectedFileCount: sourcePacket.tree?.inspectedFiles?.length || 0,
      skillFileCount: sourcePacket.tree?.skillFileCount || 0,
      exposedSkillCount: sourcePacket.plugin?.exposedSkillCount || 0,
      patternCandidateCount: MATT_POCOCK_PATTERN_CANDIDATES.length,
      unsafeSideEffectCount: unsafeEffects.length,
      copiedContentViolationCount: copiedViolations.length,
      unsafeWriteCount: unsafeWrites.length,
      ninetyDayContextHandlingVerified: sourcePacket.sourceClaims?.ninetyDayContextHandlingVerified === true,
    },
  }
}

export function buildMattPocockClaudeFolderEvalDogfoodProof() {
  const healthy = buildMattPocockClaudeFolderEvalSnapshot()
  const missingRepo = buildMattPocockClaudeFolderEvalSnapshot({
    sourcePacket: {
      ...buildSourcePacket(),
      repo: { ...buildSourcePacket().repo, fullName: '', url: '' },
    },
  })
  const wrongLicense = buildMattPocockClaudeFolderEvalSnapshot({
    sourcePacket: {
      ...buildSourcePacket(),
      repo: { ...buildSourcePacket().repo, license: 'unknown' },
    },
  })
  const installStarted = buildMattPocockClaudeFolderEvalSnapshot({
    sideEffects: { npxInstallerRun: true, pluginInstalled: true, skillSymlinksWritten: 2 },
  })
  const copiedSkill = buildMattPocockClaudeFolderEvalSnapshot({
    contentArtifacts: [{ rawSkillMarkdown: 'copied SKILL.md body would live here' }],
  })
  const falseNinetyDayClaim = buildMattPocockClaudeFolderEvalSnapshot({
    sourcePacket: {
      ...buildSourcePacket(),
      sourceClaims: {
        ...buildSourcePacket().sourceClaims,
        ninetyDayContextHandlingVerified: true,
        noNinetyDayContextPatternFound: false,
      },
    },
  })
  const downstreamWrite = buildMattPocockClaudeFolderEvalSnapshot({
    outputWrites: { researchInboxWrite: true, atomWrite: true },
  })

  const rejectedCases = {
    missingRepo: missingRepo.ok === false,
    wrongLicense: wrongLicense.ok === false,
    installStarted: installStarted.ok === false,
    copiedSkill: copiedSkill.ok === false,
    falseNinetyDayClaim: falseNinetyDayClaim.ok === false,
    downstreamWrite: downstreamWrite.ok === false,
  }
  return {
    ok: healthy.ok === true && Object.values(rejectedCases).every(Boolean),
    mode: 'matt-pocock-claude-folder-eval-dogfood',
    healthy: { ok: healthy.ok, status: healthy.status, findings: healthy.summary.findingCount },
    rejectedCases,
  }
}

export function renderMattPocockClaudeFolderEvalReport(snapshot = buildMattPocockClaudeFolderEvalSnapshot()) {
  const rows = [
    `# MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 Packet`,
    '',
    `Card: \`${MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID}\``,
    `Closeout key: \`${MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY}\``,
    'Mode: public GitHub/source eval only',
    '',
    '## Source Identity',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Creator | ${snapshot.sourcePacket.creatorName} |`,
    `| Creator watchlist ID | \`${snapshot.creatorId}\` |`,
    `| Repo | ${snapshot.sourcePacket.repo.url} |`,
    `| Commit inspected | \`${snapshot.sourcePacket.repo.commit}\` |`,
    `| License | ${snapshot.sourcePacket.repo.license} |`,
    `| Stars at lookup | ${snapshot.sourcePacket.repo.starsAtLookup} |`,
    `| Skill files | ${snapshot.sourcePacket.tree.skillFileCount} |`,
    `| Plugin-exposed skills | ${snapshot.sourcePacket.plugin.exposedSkillCount} |`,
    '',
    '## What Transfers',
    '',
    '| Pattern | AIOS use | Route |',
    '| --- | --- | --- |',
    ...snapshot.patternCandidates.map(pattern => `| ${pattern.patternId} | ${pattern.aiosUse} | ${pattern.route} |`),
    '',
    '## Boundaries',
    '',
    ...MATT_POCOCK_NOT_NEXT_BOUNDARIES.map(boundary => `- ${boundary}`),
    '',
    '## Unverified',
    '',
    '- No 90-day context-retention pattern was found in the public repo scan. Treat that claim as blocked until a source-backed artifact proves it.',
    '- Public YouTube/course content was not extracted.',
    '- Repo code/skills were not installed, imported, or copied into AIOS.',
  ]
  return `${rows.join('\n')}\n`
}

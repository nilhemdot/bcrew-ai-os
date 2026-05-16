export const FOUNDATION_IDENTITY_CARD_ID = 'FOUNDATION-IDENTITY-001'
export const FOUNDATION_IDENTITY_CLOSEOUT_KEY = 'foundation-identity-surface-v1'
export const FOUNDATION_IDENTITY_PLAN_PATH = 'docs/process/foundation-identity-001-plan.md'
export const FOUNDATION_IDENTITY_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-IDENTITY-001.json'
export const FOUNDATION_IDENTITY_SCRIPT_PATH = 'scripts/process-foundation-identity-check.mjs'
export const FOUNDATION_IDENTITY_SPRINT_ID = 'foundation-identity-visibility-2026-05-16'
export const FOUNDATION_IDENTITY_SCHEMA_VERSION = 1

const REPO_VISIBLE_DOCS = [
  {
    path: 'docs/users/steve.md',
    role: 'Repo-visible Steve profile',
    visibility: 'repo-visible',
    contentMode: 'tracked-doc',
  },
  {
    path: 'AGENTS.md',
    role: 'Workspace operating rules',
    visibility: 'repo-visible',
    contentMode: 'tracked-doc',
  },
  {
    path: 'SOUL.md',
    role: 'Workspace assistant identity',
    visibility: 'repo-visible',
    contentMode: 'tracked-doc',
  },
  {
    path: 'docs/process/personal-workspace-boundary.md',
    role: 'Private workspace boundary doctrine',
    visibility: 'repo-visible',
    contentMode: 'tracked-doc',
  },
  {
    path: 'docs/process/doctrine-propagation.md',
    role: 'Doctrine propagation privacy rule',
    visibility: 'repo-visible',
    contentMode: 'tracked-doc',
  },
]

const FORBIDDEN_PRIVATE_CONTENT_KEYS = new Set([
  'body',
  'content',
  'excerpt',
  'markdown',
  'raw',
  'rawText',
  'secret',
  'summary',
  'text',
  'token',
  'value',
])

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizePath(value) {
  return normalizeText(value).replace(/\\/g, '/').replace(/^\.\//, '')
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function summarizeChecks(checks = []) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

function findTrackedDoc(trackedDocs = [], relativePath = '') {
  const normalized = normalizePath(relativePath)
  return (Array.isArray(trackedDocs) ? trackedDocs : [])
    .find(doc => normalizePath(doc?.path) === normalized) || null
}

function toRepoDocReference(docConfig, trackedDocs = []) {
  const trackedDoc = findTrackedDoc(trackedDocs, docConfig.path)
  return {
    path: docConfig.path,
    title: trackedDoc?.title || docConfig.path,
    role: trackedDoc?.role || docConfig.role,
    visibility: docConfig.visibility,
    contentMode: docConfig.contentMode,
    exists: Boolean(trackedDoc),
    updatedAt: trackedDoc?.updatedAt || null,
    lines: typeof trackedDoc?.lines === 'number' ? trackedDoc.lines : null,
  }
}

function toPrivateDocReference(doc = {}) {
  return {
    path: normalizePath(doc.path),
    title: doc.title || normalizePath(doc.path),
    role: doc.role || 'Local-private workspace file',
    visibility: 'local-private',
    contentMode: 'metadata-only',
    contentCopied: false,
    exists: true,
    updatedAt: doc.updatedAt || null,
    lines: typeof doc.lines === 'number' ? doc.lines : null,
    whyHidden: doc.whyHidden || 'Local-only by policy.',
  }
}

function summarizeDailyMemoryMetadata(privateMetadata = []) {
  const daily = (Array.isArray(privateMetadata) ? privateMetadata : [])
    .filter(item => normalizePath(item?.relativePath).startsWith('memory/') && normalizePath(item?.relativePath).endsWith('.md'))
  const latestMtime = daily.reduce((max, item) => Math.max(max, Number(item.mtimeMs) || 0), 0)
  return {
    pathPattern: 'memory/*.md',
    visibility: 'local-private',
    contentMode: 'metadata-only',
    contentCopied: false,
    contentRead: false,
    fileCount: daily.length,
    existingFileCount: daily.filter(item => item.exists === true).length,
    latestUpdatedAt: latestMtime ? new Date(latestMtime).toISOString() : null,
  }
}

function buildRuntimeCapabilitySummary(skills = [], plugins = []) {
  const skillItems = Array.isArray(skills) ? skills : []
  const pluginItems = Array.isArray(plugins) ? plugins : []
  const bcrewFoundationSkill = skillItems.find(skill =>
    /bcrew-foundation/i.test(`${skill?.id || ''} ${skill?.title || ''} ${skill?.path || ''}`)
  ) || null
  const workspaceSkills = skillItems.filter(skill => skill?.scope === 'Workspace skill')
  const systemSkills = skillItems.filter(skill => skill?.scope === 'System skill')
  const pluginSkillCount = pluginItems.reduce((count, plugin) => count + Number(plugin?.skillCount || 0), 0)

  return {
    skills: {
      total: skillItems.length,
      workspace: workspaceSkills.length,
      system: systemSkills.length,
      bcrewFoundationSkill: bcrewFoundationSkill
        ? {
            detected: true,
            id: bcrewFoundationSkill.id,
            title: bcrewFoundationSkill.title,
            scope: bcrewFoundationSkill.scope,
            path: bcrewFoundationSkill.path,
            updatedAt: bcrewFoundationSkill.updatedAt || null,
          }
        : {
            detected: false,
            id: 'bcrew-foundation',
            title: 'BCrew Foundation Skill',
            scope: 'Workspace skill',
            path: '',
            updatedAt: null,
          },
    },
    plugins: {
      total: pluginItems.length,
      skillCount: pluginSkillCount,
      sourceTruthApproved: false,
      boundary: 'Installed plugins are runtime capabilities, not business source-truth signoff.',
    },
  }
}

function privateValueHasForbiddenContent(value, pathParts = []) {
  if (Array.isArray(value)) {
    return value.some((item, index) => privateValueHasForbiddenContent(item, pathParts.concat(String(index))))
  }
  if (!value || typeof value !== 'object') return false

  return Object.entries(value).some(([key, child]) => {
    const lowerKey = key.toLowerCase()
    if (FORBIDDEN_PRIVATE_CONTENT_KEYS.has(lowerKey)) return true
    return privateValueHasForbiddenContent(child, pathParts.concat(key))
  })
}

export function buildFoundationIdentitySurface({
  trackedDocs = [],
  privateLocalDocs = [],
  personalWorkspaceBoundary = {},
  skills = [],
  plugins = [],
} = {}) {
  const workspaceRuntimeDocs = REPO_VISIBLE_DOCS.map(doc => toRepoDocReference(doc, trackedDocs))
  const repoVisibleProfile = workspaceRuntimeDocs.find(doc => doc.path === 'docs/users/steve.md') || null
  const localPrivateRootDocs = (Array.isArray(privateLocalDocs) ? privateLocalDocs : []).map(toPrivateDocReference)
  const localPrivateMemory = {
    status: personalWorkspaceBoundary?.status || 'unknown',
    realPrivateProofMode: personalWorkspaceBoundary?.realPrivateProofMode || 'metadata-only',
    realPrivateFilesRead: personalWorkspaceBoundary?.realPrivateFilesRead === true,
    realPrivateContentCopied: personalWorkspaceBoundary?.realPrivateContentCopied === true,
    contentMode: 'metadata-only',
    contentCopied: false,
    rootDocs: localPrivateRootDocs,
    dailyMemory: summarizeDailyMemoryMetadata(personalWorkspaceBoundary?.privateMetadata || []),
    privatePathRuleCount: Array.isArray(personalWorkspaceBoundary?.privatePathRules)
      ? personalWorkspaceBoundary.privatePathRules.length
      : 0,
  }
  const runtimeCapabilities = buildRuntimeCapabilitySummary(skills, plugins)
  const status = repoVisibleProfile?.exists &&
    localPrivateMemory.realPrivateProofMode === 'metadata-only' &&
    localPrivateMemory.realPrivateFilesRead === false &&
    localPrivateMemory.realPrivateContentCopied === false &&
    localPrivateMemory.contentCopied === false &&
    runtimeCapabilities.skills.bcrewFoundationSkill.detected
    ? 'healthy'
    : 'review'

  return {
    schemaVersion: FOUNDATION_IDENTITY_SCHEMA_VERSION,
    status,
    visibilityMode: 'owner-only-metadata-safe',
    plainEnglish: 'Foundation shows the active guidance stack without copying private local memory content into shared system truth.',
    repoVisibleProfile,
    workspaceRuntimeDocs,
    localPrivateMemory,
    runtimeCapabilities,
    privacyBoundary: {
      realPrivateFilesRead: localPrivateMemory.realPrivateFilesRead,
      realPrivateContentCopied: localPrivateMemory.realPrivateContentCopied,
      contentMode: 'metadata-only',
      contentCopied: false,
      localOnlyFilesAreProofSignals: true,
      pluginsAreSourceTruth: false,
    },
  }
}

export function validateFoundationIdentitySurface(surface = {}) {
  const checks = []
  addCheck(checks, surface.schemaVersion === FOUNDATION_IDENTITY_SCHEMA_VERSION, 'schema version is current', String(surface.schemaVersion || 'missing'))
  addCheck(checks, surface.visibilityMode === 'owner-only-metadata-safe', 'visibility mode is owner-only metadata-safe', surface.visibilityMode || 'missing')
  addCheck(
    checks,
    surface.repoVisibleProfile?.path === 'docs/users/steve.md' &&
      surface.repoVisibleProfile?.visibility === 'repo-visible' &&
      surface.repoVisibleProfile?.exists === true,
    'repo-visible Steve profile is docs/users/steve.md',
    surface.repoVisibleProfile?.path || 'missing',
  )
  const rootDocs = Array.isArray(surface.localPrivateMemory?.rootDocs) ? surface.localPrivateMemory.rootDocs : []
  const userDoc = rootDocs.find(doc => doc.path === 'USER.md') || null
  addCheck(
    checks,
    userDoc?.visibility === 'local-private' &&
      userDoc?.contentMode === 'metadata-only' &&
      userDoc?.contentCopied === false,
    'USER.md remains local-private metadata-only',
    userDoc ? `${userDoc.visibility}/${userDoc.contentMode}` : 'missing USER.md',
  )
  addCheck(
    checks,
    surface.localPrivateMemory?.dailyMemory?.pathPattern === 'memory/*.md' &&
      surface.localPrivateMemory?.dailyMemory?.contentMode === 'metadata-only' &&
      surface.localPrivateMemory?.dailyMemory?.contentCopied === false &&
      surface.localPrivateMemory?.dailyMemory?.contentRead === false,
    'daily memory files are represented by metadata/counts only',
    JSON.stringify(surface.localPrivateMemory?.dailyMemory || {}),
  )
  addCheck(
    checks,
    surface.localPrivateMemory?.realPrivateFilesRead === false &&
      surface.localPrivateMemory?.realPrivateContentCopied === false &&
      surface.localPrivateMemory?.contentCopied === false,
    'real private file content is not read or copied',
    `read=${surface.localPrivateMemory?.realPrivateFilesRead} copied=${surface.localPrivateMemory?.realPrivateContentCopied}`,
  )
  addCheck(
    checks,
    privateValueHasForbiddenContent(surface.localPrivateMemory) === false,
    'local-private identity payload has no content-like fields',
    'private payload keys checked recursively',
  )
  addCheck(
    checks,
    surface.runtimeCapabilities?.skills?.bcrewFoundationSkill?.detected === true,
    'bcrew-foundation skill is detected',
    surface.runtimeCapabilities?.skills?.bcrewFoundationSkill?.id || 'missing',
  )
  addCheck(
    checks,
    Number(surface.runtimeCapabilities?.plugins?.total || 0) >= 0 &&
      surface.runtimeCapabilities?.plugins?.sourceTruthApproved === false &&
      /not business source-truth signoff/i.test(surface.runtimeCapabilities?.plugins?.boundary || ''),
    'plugins remain runtime capabilities, not source-truth signoff',
    surface.runtimeCapabilities?.plugins?.boundary || 'missing boundary',
  )
  addCheck(
    checks,
    surface.privacyBoundary?.contentMode === 'metadata-only' &&
      surface.privacyBoundary?.contentCopied === false &&
      surface.privacyBoundary?.pluginsAreSourceTruth === false,
    'privacy boundary summarizes metadata-only and plugin/source distinction',
    JSON.stringify(surface.privacyBoundary || {}),
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summarizeChecks(checks),
  }
}

export function buildFoundationIdentityDogfoodProof() {
  const baseBoundary = {
    status: 'healthy',
    realPrivateProofMode: 'metadata-only',
    realPrivateFilesRead: false,
    realPrivateContentCopied: false,
    privatePathRules: [{ pattern: 'memory/*.md' }],
    privateMetadata: [
      {
        relativePath: 'memory/2026-05-16.md',
        className: 'private-local-memory',
        exists: true,
        size: 123,
        mtimeMs: 1778920000000,
        contentRead: false,
        contentCopied: false,
      },
    ],
  }
  const safe = buildFoundationIdentitySurface({
    trackedDocs: REPO_VISIBLE_DOCS.map(doc => ({
      path: doc.path,
      title: doc.path,
      role: doc.role,
      updatedAt: '2026-05-16T00:00:00.000Z',
      lines: 10,
    })),
    privateLocalDocs: [
      {
        path: 'USER.md',
        title: 'USER',
        role: 'Private human context',
        updatedAt: '2026-05-16T00:00:00.000Z',
        lines: 10,
        whyHidden: 'Local-only by policy.',
      },
    ],
    personalWorkspaceBoundary: baseBoundary,
    skills: [
      {
        id: 'bcrew-foundation',
        title: 'bcrew-foundation',
        scope: 'Workspace skill',
        path: '~/.codex/skills/bcrew-foundation/SKILL.md',
      },
    ],
    plugins: [{ id: 'github', title: 'GitHub', skillCount: 2 }],
  })
  const leaky = {
    ...safe,
    localPrivateMemory: {
      ...safe.localPrivateMemory,
      rootDocs: [
        {
          ...safe.localPrivateMemory.rootDocs[0],
          content: 'SYNTHETIC_PRIVATE_SENTINEL_FOUNDATION_IDENTITY',
        },
      ],
    },
  }
  const missingSkill = {
    ...safe,
    runtimeCapabilities: {
      ...safe.runtimeCapabilities,
      skills: {
        ...safe.runtimeCapabilities.skills,
        bcrewFoundationSkill: {
          ...safe.runtimeCapabilities.skills.bcrewFoundationSkill,
          detected: false,
        },
      },
    },
  }
  const pluginSourceTruth = {
    ...safe,
    runtimeCapabilities: {
      ...safe.runtimeCapabilities,
      plugins: {
        ...safe.runtimeCapabilities.plugins,
        sourceTruthApproved: true,
      },
    },
  }
  const safeValidation = validateFoundationIdentitySurface(safe)
  const leakyValidation = validateFoundationIdentitySurface(leaky)
  const missingSkillValidation = validateFoundationIdentitySurface(missingSkill)
  const pluginValidation = validateFoundationIdentitySurface(pluginSourceTruth)

  return {
    ok: safeValidation.ok === true &&
      leakyValidation.ok === false &&
      missingSkillValidation.ok === false &&
      pluginValidation.ok === false,
    safeValidation,
    leakyValidation,
    missingSkillValidation,
    pluginValidation,
    dogfoodInvariant: 'Safe metadata-only identity passes; synthetic private content, missing bcrew-foundation, or plugin-as-source-truth cases fail.',
  }
}

export function evaluateFoundationIdentitySource({
  serverSource = '',
  rendererSource = '',
  sourceTrustVerifierSource = '',
  moduleSource = '',
  proofScriptSource = '',
  planSource = '',
  packageScripts = {},
} = {}) {
  const checks = []
  addCheck(
    checks,
    moduleSource.includes('buildFoundationIdentitySurface') &&
      moduleSource.includes('validateFoundationIdentitySurface') &&
      moduleSource.includes('buildFoundationIdentityDogfoodProof') &&
      moduleSource.includes('metadata-only') &&
      moduleSource.includes('pluginsAreSourceTruth: false'),
    'identity module owns builder, validator, dogfood, and privacy boundary',
    moduleSource.includes(FOUNDATION_IDENTITY_CARD_ID) ? FOUNDATION_IDENTITY_CARD_ID : 'module marker missing',
  )
  addCheck(
    checks,
    serverSource.includes('buildFoundationIdentitySurface') &&
      serverSource.includes('identity,') &&
      serverSource.includes('buildPersonalWorkspaceBoundaryStatus'),
    'server wires identity into /api/system-inventory without owning behavior',
    serverSource.includes('identity,') ? 'identity payload wired' : 'identity payload missing',
  )
  addCheck(
    checks,
    rendererSource.includes('renderFoundationIdentityPanel') &&
      rendererSource.includes('Workspace Identity') &&
      rendererSource.includes('metadata-only') &&
      rendererSource.includes('bcrew-foundation'),
    'System Inventory renders Workspace Identity panel',
    rendererSource.includes('renderFoundationIdentityPanel') ? 'renderer present' : 'renderer missing',
  )
  addCheck(
    checks,
    sourceTrustVerifierSource.includes('validateFoundationIdentitySurface') &&
      sourceTrustVerifierSource.includes('System Inventory exposes metadata-only Foundation identity surface'),
    'foundation verifier requires identity payload shape',
    sourceTrustVerifierSource.includes('validateFoundationIdentitySurface') ? 'validator wired' : 'validator missing',
  )
  addCheck(
    checks,
    proofScriptSource.includes('process:foundation-identity-check') &&
      proofScriptSource.includes('synthetic leaking payload fails closed') &&
      packageScripts['process:foundation-identity-check'] === `node --env-file-if-exists=.env ${FOUNDATION_IDENTITY_SCRIPT_PATH}`,
    'focused proof script and package command are registered',
    packageScripts['process:foundation-identity-check'] || 'missing package script',
  )
  addCheck(
    checks,
    planSource.includes(FOUNDATION_IDENTITY_CARD_ID) &&
      planSource.includes('full gate') &&
      planSource.includes('No shared-context `MEMORY.md` exposure') &&
      planSource.includes('No Drive permissions mutation'),
    'plan keeps full gate and privacy not-next boundaries',
    planSource.includes(FOUNDATION_IDENTITY_CARD_ID) ? 'plan marker present' : 'plan marker missing',
  )
  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summarizeChecks(checks),
  }
}

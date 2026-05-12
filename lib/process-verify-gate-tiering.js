export const VERIFY_GATE_TIERING_CARD_ID = 'VERIFY-GATE-TIERING-001'
export const VERIFY_GATE_TIERING_CLOSEOUT_KEY = 'verify-gate-tiering-v1'
export const VERIFY_GATE_TIERING_PLAN_PATH = 'docs/process/verify-gate-tiering-001-plan.md'
export const VERIFY_GATE_TIERING_SCRIPT_PATH = 'scripts/process-verify-gate-tiering-check.mjs'
export const VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND = 'npm run process:verify-gate-tiering-check'

export const VERIFY_GATE_LEVELS = {
  none: 0,
  static: 1,
  focused: 2,
  full: 3,
}

const FULL_GATE_RULES = [
  {
    test: file => file === 'server.js',
    reason: 'server route/runtime access changed',
  },
  {
    test: file => file === 'package.json' || file === 'package-lock.json',
    reason: 'dependency or package command surface changed',
  },
  {
    test: file => file === 'scripts/foundation-verify.mjs',
    reason: 'canonical Foundation verifier changed',
  },
  {
    test: file => file === 'lib/foundation-db.js',
    reason: 'Foundation database/backlog seed changed',
  },
  {
    test: file => file === 'lib/foundation-readiness-gates.js',
    reason: 'Foundation readiness gate changed',
  },
  {
    test: file => file === 'lib/security-access.js',
    reason: 'security access enforcement changed',
  },
  {
    test: file => /^lib\/(?:intelligence|extraction|source-|meeting-vault|runtime-process-control)/.test(file),
    reason: 'Foundation behavior substrate changed',
  },
  {
    test: file => /^scripts\/(?:intelligence|extract|sync|run-|foundation-worker|process-security-002)/.test(file),
    reason: 'runtime, extraction, security, or intelligence proof path changed',
  },
]

const FOCUSED_GATE_RULES = [
  {
    test: file => file === 'lib/process-git-hooks.js' || file === 'lib/process-verify-gate-tiering.js',
    reason: 'Foundation hook/gate policy changed',
  },
  {
    test: file => file === VERIFY_GATE_TIERING_SCRIPT_PATH,
    reason: 'focused verification proof script changed',
  },
  {
    test: file => file === 'lib/foundation-current-sprint.js',
    reason: 'Current Sprint command defaults changed',
  },
  {
    test: file => file === 'lib/foundation-build-log.js',
    reason: 'Foundation Recent Work closeout metadata changed',
  },
  {
    test: file => /^docs\/(?:rebuild|process|audits|handoffs)\//.test(file),
    reason: 'Foundation doctrine/process document changed',
  },
  {
    test: file => /^scripts\/process-[^/]*\.mjs$/.test(file),
    reason: 'focused process proof changed',
  },
  {
    test: file => /^scripts\/[^/]*(?:backlog|doctrine)[^/]*\.mjs$/.test(file),
    reason: 'backlog or doctrine process proof changed',
  },
  {
    test: file => /^public\/(?:foundation|ops)[^/]*\.(?:html|js)$/.test(file),
    reason: 'Foundation/Ops operator surface changed',
  },
]

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function isJavaScriptFile(filePath) {
  return /\.(?:mjs|js)$/i.test(filePath)
}

function isJsonFile(filePath) {
  return /\.json$/i.test(filePath)
}

function dedupeList(values) {
  return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)))
}

function classifyOneFile(filePath) {
  const file = normalizePath(filePath)
  if (!file) return { file, level: 'none', reason: 'empty path' }

  const fullRule = FULL_GATE_RULES.find(rule => rule.test(file))
  if (fullRule) {
    return { file, level: 'full', reason: fullRule.reason }
  }

  const focusedRule = FOCUSED_GATE_RULES.find(rule => rule.test(file))
  if (focusedRule) {
    return { file, level: 'focused', reason: focusedRule.reason }
  }

  if (isJavaScriptFile(file) || isJsonFile(file)) {
    return { file, level: 'static', reason: 'code/config file needs syntax validation' }
  }

  return { file, level: 'none', reason: 'not a Foundation verification gate input' }
}

function highestLevel(classifications) {
  let highest = 'none'
  for (const item of classifications) {
    if (VERIFY_GATE_LEVELS[item.level] > VERIFY_GATE_LEVELS[highest]) highest = item.level
  }
  return highest
}

function buildCommands({ level, files }) {
  const jsFiles = files.filter(isJavaScriptFile)
  const jsonFiles = files.filter(isJsonFile)
  const commands = []

  if (jsFiles.length) {
    commands.push(`node --check ${jsFiles.join(' ')}`)
  }
  if (jsonFiles.length) {
    commands.push('JSON.parse changed JSON files')
  }

  if (level === 'focused') {
    commands.push(VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND)
    if (files.some(file =>
      file.startsWith('docs/rebuild/') ||
      file.startsWith('docs/process/') ||
      file === 'lib/foundation-current-sprint.js' ||
      file === 'lib/process-git-hooks.js' ||
      file === 'lib/process-verify-gate-tiering.js'
    )) {
      commands.push('npm run backlog:hygiene -- --json')
    }
  }

  if (level === 'full') {
    commands.push('npm run process:foundation-ship -- --card=<shipping-card> --closeoutKey=<closeout-key>')
  }

  return dedupeList(commands)
}

export function classifyVerificationGateForFiles(files = []) {
  const normalizedFiles = dedupeList(files.map(normalizePath))
  const classifications = normalizedFiles.map(classifyOneFile)
  const level = highestLevel(classifications)
  const gateFiles = classifications
    .filter(item => VERIFY_GATE_LEVELS[item.level] > 0)
    .map(item => item.file)
  return {
    level,
    fullVerifyRequired: level === 'full',
    focusedProofAllowed: level === 'focused' || level === 'static',
    files: normalizedFiles,
    gateFiles,
    classifications,
    reasons: dedupeList(classifications
      .filter(item => VERIFY_GATE_LEVELS[item.level] > 0)
      .map(item => `${item.file}: ${item.reason}`)),
    commands: buildCommands({ level, files: gateFiles }),
  }
}

export function buildVerifyGateTieringSummary(result = {}) {
  const level = result.level || 'none'
  const commandText = Array.isArray(result.commands) && result.commands.length
    ? result.commands.join('; ')
    : 'no verification command required'
  const reasonText = Array.isArray(result.reasons) && result.reasons.length
    ? result.reasons.join(' | ')
    : 'no protected Foundation verification inputs changed'
  return `gate=${level}; commands=${commandText}; reasons=${reasonText}`
}

export function buildSyntheticVerifyGateTieringProof() {
  const cases = [
    {
      name: 'foundation process docs use focused proof',
      files: [VERIFY_GATE_TIERING_PLAN_PATH, 'docs/rebuild/current-plan.md'],
      expectedLevel: 'focused',
      expectedFull: false,
    },
    {
      name: 'current sprint command defaults use focused proof',
      files: ['lib/foundation-current-sprint.js', 'public/foundation.js'],
      expectedLevel: 'focused',
      expectedFull: false,
    },
    {
      name: 'hook and focused gate policy use focused proof',
      files: ['lib/process-git-hooks.js', 'lib/process-verify-gate-tiering.js', VERIFY_GATE_TIERING_SCRIPT_PATH],
      expectedLevel: 'focused',
      expectedFull: false,
    },
    {
      name: 'canonical verifier requires full Foundation ship gate',
      files: ['scripts/foundation-verify.mjs'],
      expectedLevel: 'full',
      expectedFull: true,
    },
    {
      name: 'server/security changes require full Foundation ship gate',
      files: ['server.js', 'lib/security-access.js'],
      expectedLevel: 'full',
      expectedFull: true,
    },
    {
      name: 'Foundation DB changes require full Foundation ship gate',
      files: ['lib/foundation-db.js'],
      expectedLevel: 'full',
      expectedFull: true,
    },
    {
      name: 'unprotected docs do not force a gate',
      files: ['README.md'],
      expectedLevel: 'none',
      expectedFull: false,
    },
  ]

  const results = cases.map(testCase => {
    const actual = classifyVerificationGateForFiles(testCase.files)
    return {
      ...testCase,
      actualLevel: actual.level,
      actualFull: actual.fullVerifyRequired,
      commands: actual.commands,
      ok: actual.level === testCase.expectedLevel && actual.fullVerifyRequired === testCase.expectedFull,
    }
  })

  return {
    ok: results.every(result => result.ok),
    cases: results,
  }
}

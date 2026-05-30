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
    test: (file, context) => file === 'lib/foundation-db.js' && isFoundationDbBacklogCaptureOnlyDiff(getDiffForFile(context, file)),
    reason: 'additive backlog-card seed capture only',
  },
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

function getDiffForFile(context = {}, file = '') {
  const diffsByFile = context.diffsByFile || context.fileDiffs || context.diffs || {}
  if (diffsByFile instanceof Map) return String(diffsByFile.get(file) || '')
  return String(diffsByFile[file] || '')
}

export function isDeletedProtectedFileDiff(diffText = '') {
  const text = String(diffText || '')
  return /(?:^|\n)deleted file mode\s+\d+/i.test(text) ||
    /(?:^|\n)\+\+\+\s+\/dev\/null(?:\n|$)/.test(text)
}

export function isFoundationDbBacklogCaptureOnlyDiff(diffText = '') {
  const lines = String(diffText || '').split('\n')
  const changedLines = lines.filter(line =>
    (line.startsWith('+') && !line.startsWith('+++')) ||
    (line.startsWith('-') && !line.startsWith('---'))
  )
  if (!changedLines.length) return false
  if (changedLines.some(line => line.startsWith('-'))) return false

  let addedIdCount = 0
  const safeStructuralLine = /^\+\s*(?:\{|\},?)\s*$/
  const safeStringFieldLine = /^\+\s{4}(?:id|title|team|lane|priority|source|summary|whyItMatters|nextAction|statusNote|owner):\s*(?:'[^']*'|"[^"]*"|`[^`]*`),?\s*$/
  const safeRankLine = /^\+\s{4}rank:\s*(?:\d+|null),?\s*$/
  for (const line of changedLines) {
    if (safeStructuralLine.test(line) || safeStringFieldLine.test(line) || safeRankLine.test(line)) {
      if (/^\+\s{4}id:\s*['"`][A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}['"`],?\s*$/.test(line)) addedIdCount += 1
      continue
    }
    return false
  }

  return addedIdCount > 0
}

function classifyOneFile(filePath, context = {}) {
  const file = normalizePath(filePath)
  if (!file) return { file, level: 'none', reason: 'empty path' }

  const diffText = getDiffForFile(context, file)
  const focusedRule = FOCUSED_GATE_RULES.find(rule => rule.test(file, context))
  const fullRule = FULL_GATE_RULES.find(rule => rule.test(file))
  const deleted = isDeletedProtectedFileDiff(diffText)
  if (deleted && (focusedRule || fullRule || isJavaScriptFile(file) || isJsonFile(file))) {
    return {
      file,
      level: 'full',
      reason: 'protected Foundation file deletion requires full ship gate after gate repoint',
      deleted: true,
    }
  }

  if (focusedRule) {
    return { file, level: 'focused', reason: focusedRule.reason, deleted: false }
  }

  if (fullRule) {
    return { file, level: 'full', reason: fullRule.reason, deleted: false }
  }

  if (isJavaScriptFile(file) || isJsonFile(file)) {
    return { file, level: 'static', reason: 'code/config file needs syntax validation', deleted: false }
  }

  return { file, level: 'none', reason: 'not a Foundation verification gate input', deleted: false }
}

function highestLevel(classifications) {
  let highest = 'none'
  for (const item of classifications) {
    if (VERIFY_GATE_LEVELS[item.level] > VERIFY_GATE_LEVELS[highest]) highest = item.level
  }
  return highest
}

function buildCommands({ level, classifications }) {
  const activeFiles = classifications
    .filter(item => VERIFY_GATE_LEVELS[item.level] > 0 && item.deleted !== true)
    .map(item => item.file)
  const files = classifications
    .filter(item => VERIFY_GATE_LEVELS[item.level] > 0)
    .map(item => item.file)
  const jsFiles = activeFiles.filter(isJavaScriptFile)
  const jsonFiles = activeFiles.filter(isJsonFile)
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
      file === 'lib/foundation-db.js' ||
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

export function classifyVerificationGateForFiles(files = [], context = {}) {
  const normalizedFiles = dedupeList(files.map(normalizePath))
  const classifications = normalizedFiles.map(file => classifyOneFile(file, context))
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
    commands: buildCommands({ level, classifications }),
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
      name: 'additive Foundation DB backlog-card capture uses focused proof',
      files: ['lib/foundation-db.js'],
      diffsByFile: {
        'lib/foundation-db.js': [
          'diff --git a/lib/foundation-db.js b/lib/foundation-db.js',
          '@@ -10,0 +11,12 @@',
          '+  {',
          "+    id: 'JUNK-CAPTURE-001',",
          "+    title: 'Capture a scoped backlog card',",
          "+    team: 'foundation',",
          "+    lane: 'scoped',",
          "+    priority: 'P0',",
          '+    rank: 99,',
          "+    source: 'Synthetic gate proof',",
          "+    summary: 'Prove additive card capture is focused.',",
          "+    whyItMatters: 'The gate should not waste full verification on scoped card capture.',",
          "+    nextAction: 'Run focused proof.',",
          "+    statusNote: 'Synthetic only.',",
          '+  },',
        ].join('\n'),
      },
      expectedLevel: 'focused',
      expectedFull: false,
    },
    {
      name: 'Foundation DB schema or function changes require full Foundation ship gate',
      files: ['lib/foundation-db.js'],
      diffsByFile: {
        'lib/foundation-db.js': [
          'diff --git a/lib/foundation-db.js b/lib/foundation-db.js',
          '@@ -10,0 +11,2 @@',
          '+export async function mutateFoundationDb() {',
          '+  return true',
        ].join('\n'),
      },
      expectedLevel: 'full',
      expectedFull: true,
    },
    {
      name: 'deleted protected process checker requires full repoint gate',
      files: ['scripts/process-old-cleanup-check.mjs'],
      diffsByFile: {
        'scripts/process-old-cleanup-check.mjs': [
          'diff --git a/scripts/process-old-cleanup-check.mjs b/scripts/process-old-cleanup-check.mjs',
          'deleted file mode 100755',
          '--- a/scripts/process-old-cleanup-check.mjs',
          '+++ /dev/null',
          '@@ -1,2 +0,0 @@',
          '-#!/usr/bin/env node',
          '-console.log("old checker")',
        ].join('\n'),
      },
      expectedLevel: 'full',
      expectedFull: true,
      forbiddenCommandText: 'node --check scripts/process-old-cleanup-check.mjs',
    },
    {
      name: 'unprotected docs do not force a gate',
      files: ['README.md'],
      expectedLevel: 'none',
      expectedFull: false,
    },
  ]

  const results = cases.map(testCase => {
    const actual = classifyVerificationGateForFiles(testCase.files, { diffsByFile: testCase.diffsByFile || {} })
    const commandText = actual.commands.join('\n')
    const commandOk = testCase.forbiddenCommandText
      ? !commandText.includes(testCase.forbiddenCommandText)
      : true
    return {
      ...testCase,
      actualLevel: actual.level,
      actualFull: actual.fullVerifyRequired,
      commands: actual.commands,
      commandOk,
      ok: actual.level === testCase.expectedLevel &&
        actual.fullVerifyRequired === testCase.expectedFull &&
        commandOk,
    }
  })

  return {
    ok: results.every(result => result.ok),
    cases: results,
  }
}

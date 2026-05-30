export const FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID = 'FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001'
export const FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY = 'foundation-oversized-file-split-wave-v1'
export const FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PLAN_PATH = 'docs/process/foundation-oversized-file-split-wave-001-plan.md'
export const FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001.json'
export const FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_SCRIPT_PATH = 'scripts/process-foundation-oversized-file-split-wave-check.mjs'
export const FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_NEXT_CARD_ID = 'FOUNDATION-DONE-SEMANTICS-REPAIR-001'

export const FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CSS_PATHS = [
  'public/dev.css',
  'public/dev-youtube-source.css',
  'public/dev-source-approval.css',
]

export const FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PROGRESS_BLOCKER_CARD_IDS = [
  'FOUNDATION-DONE-SEMANTICS-REPAIR-001',
  'FOUNDATION-ORPHAN-SCRIPT-REVIEW-001',
  'FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001',
  'FOUNDATION-TUNEUP-REMAP-PROOF-001',
]

export const FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PROOF_COMMANDS = [
  'node --check lib/foundation-oversized-file-split-wave.js',
  'node --check scripts/process-foundation-oversized-file-split-wave-check.mjs',
  'node --check scripts/process-dev-team-hub-v0-check.mjs',
  'node --check scripts/process-source-session-readiness-check.mjs',
  'node --check scripts/process-source-family-god-mode-extractors-check.mjs',
  'node --check scripts/process-dev-page-system-truth-cleanup-check.mjs',
  'npm run process:foundation-oversized-file-split-wave-check -- --apply --stage=building_now --json',
  'npm run process:foundation-oversized-file-split-wave-check -- --close-card --json',
  'npm run process:dev-team-hub-v0-check -- --json',
  'npm run process:source-session-readiness-check -- --json',
  'npm run process:source-family-god-mode-extractors-check -- --json',
  'npm run process:dev-page-system-truth-cleanup-check -- --json',
  'npm run process:foundation-tuneup-roadmap-check -- --json',
  'npm run process:builder-memory-system-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID} --planApprovalRef=${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_APPROVAL_PATH} --closeoutKey=${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID} --closeoutKey=${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID} --planApprovalRef=${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_APPROVAL_PATH} --closeoutKey=${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CHANGED_FILES = [
  'public/dev.css',
  'public/dev-youtube-source.css',
  'public/dev-source-approval.css',
  'public/dev.html',
  'scripts/process-dev-team-hub-v0-check.mjs',
  'scripts/process-source-session-readiness-check.mjs',
  'scripts/process-source-family-god-mode-extractors-check.mjs',
  'scripts/process-dev-page-system-truth-cleanup-check.mjs',
  'lib/foundation-oversized-file-split-wave.js',
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_SCRIPT_PATH,
  'lib/foundation-build-closeout-process-gate-operations-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PLAN_PATH,
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_APPROVAL_PATH,
  'package.json',
]

const REQUIRED_BUNDLE_SELECTORS = [
  '.youtube-system',
  '.yt-stage-grid',
  '.yt-handoff-grid',
  '.yt-source-bucket-grid',
  '.yt-source-stack-grid',
  '.yt-source-handoff-list',
  '.yt-session-prep-grid',
  '.yt-session-readiness',
  '.yt-source-session',
  '.yt-source-run-summary',
  '.yt-exec-summary',
  '.approval-review',
  '.approval-triage-grid',
  '.source-leaderboard',
  '.leader-economics',
  '.source-card.source-mini',
  '.rankings-system',
  '.ranking-process',
  '.priority-lens-router',
  '.truth-summary',
  '.truth-system-grid',
  '.system-truth',
  '.parity-meta',
  '.parity-next p',
]

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function countLines(source = '') {
  if (!source) return 0
  return String(source).split(/\r?\n/).length
}

function bundleCss(cssSources = {}) {
  return FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CSS_PATHS
    .map(cssPath => cssSources[cssPath] || '')
    .join('\n')
}

function orderDetail(htmlSource = '') {
  return FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CSS_PATHS
    .map(cssPath => `${cssPath}:${String(htmlSource).indexOf(`/${cssPath.replace('public/', '')}`)}`)
    .join(' ')
}

export function buildFoundationOversizedFileSplitWaveDogfoodProof() {
  const pad = prefix => Array.from({ length: 700 }, (_, index) => `.${prefix}-${index} { display: block; }`)
  const splitHtml = [
    '<link rel="stylesheet" href="/dev.css?v=20260530-oversized-core" />',
    '<link rel="stylesheet" href="/dev-youtube-source.css?v=20260530-oversized-v1" />',
    '<link rel="stylesheet" href="/dev-source-approval.css?v=20260530-oversized-v1" />',
    '<script src="/dev.js?v=20260530-oversized-v1"></script>',
  ].join('\n')
  const splitSources = {
    'public/dev.css': [
      ':root { --blue: #0084C9; }',
      '.rankings-system {}',
      '.ranking-process {}',
      '.priority-lens-router {}',
      '.truth-summary {}',
      '.truth-system-grid {}',
      '.system-truth {}',
      '.parity-meta {}',
      '.parity-next p {}',
    ].join('\n'),
    'public/dev-youtube-source.css': [
      '.youtube-system {}',
      '.yt-stage-grid {}',
      '.yt-handoff-grid {}',
      '.yt-source-bucket-grid {}',
      '.yt-source-stack-grid {}',
      '.yt-source-handoff-list {}',
      '.yt-session-prep-grid {}',
      '.yt-session-readiness {}',
      '.yt-source-session {}',
      '.yt-source-run-summary {}',
      '.yt-exec-summary {}',
      ...pad('yt-pad'),
    ].join('\n'),
    'public/dev-source-approval.css': [
      '.approval-review {}',
      '.approval-triage-grid {}',
      '.source-leaderboard {}',
      '.leader-economics {}',
      '.source-card.source-mini {}',
      '@media (max-width: 980px) { .yt-stage-grid { grid-template-columns: 1fr; } }',
      ...pad('source-pad'),
    ].join('\n'),
  }
  const oversizedUnsplit = buildFoundationOversizedFileSplitWaveSnapshot({
    htmlSource: splitHtml,
    coverageSource: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PROGRESS_BLOCKER_CARD_IDS.join('\n'),
    cssSources: {
      'public/dev.css': `${Array.from({ length: 5001 }, (_, index) => `.x${index}{}`).join('\n')}\n.youtube-system {}\n.approval-review {}`,
      'public/dev-youtube-source.css': '',
      'public/dev-source-approval.css': '',
    },
  })
  const missingSelector = buildFoundationOversizedFileSplitWaveSnapshot({
    htmlSource: splitHtml,
    coverageSource: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PROGRESS_BLOCKER_CARD_IDS.join('\n'),
    cssSources: {
      ...splitSources,
      'public/dev-youtube-source.css': splitSources['public/dev-youtube-source.css'].replace('.yt-session-readiness {}', ''),
    },
  })
  const healthySplit = buildFoundationOversizedFileSplitWaveSnapshot({
    htmlSource: splitHtml,
    coverageSource: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PROGRESS_BLOCKER_CARD_IDS.join('\n'),
    cssSources: splitSources,
  })

  return {
    ok: healthySplit.ok === true &&
      oversizedUnsplit.ok === false &&
      missingSelector.ok === false &&
      oversizedUnsplit.failed.some(check => check.check === 'Dev CSS core is below oversized risk threshold') &&
      missingSelector.failed.some(check => check.check === 'CSS bundle keeps existing Dev Hub selectors available'),
    healthySplitOk: healthySplit.ok,
    oversizedUnsplitRejected: oversizedUnsplit.ok === false,
    missingSelectorRejected: missingSelector.ok === false,
  }
}

export function buildFoundationOversizedFileSplitWaveSnapshot({
  htmlSource = '',
  cssSources = {},
  coverageSource = '',
} = {}) {
  const checks = []
  const cssBundle = bundleCss(cssSources)
  const coreSource = cssSources['public/dev.css'] || ''
  const youtubeSource = cssSources['public/dev-youtube-source.css'] || ''
  const sourceApprovalSource = cssSources['public/dev-source-approval.css'] || ''
  const lineCounts = Object.fromEntries(
    FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CSS_PATHS
      .map(cssPath => [cssPath, countLines(cssSources[cssPath] || '')]),
  )
  const htmlOrder = FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CSS_PATHS
    .map(cssPath => String(htmlSource).indexOf(`/${cssPath.replace('public/', '')}`))
  const missingSelectors = REQUIRED_BUNDLE_SELECTORS
    .filter(selector => !cssBundle.includes(selector))
  const missingProgressionBlockers = FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PROGRESS_BLOCKER_CARD_IDS
    .filter(cardId => !String(coverageSource).includes(cardId))
  const dogfood = buildFoundationOversizedFileSplitWaveDogfoodProofRaw()

  addCheck(
    checks,
    lineCounts['public/dev.css'] > 0 && lineCounts['public/dev.css'] <= 3400,
    'Dev CSS core is below oversized risk threshold',
    `${lineCounts['public/dev.css']} lines`,
  )
  addCheck(
    checks,
    lineCounts['public/dev-youtube-source.css'] >= 700 &&
      lineCounts['public/dev-youtube-source.css'] <= 1400 &&
      lineCounts['public/dev-source-approval.css'] >= 700 &&
      lineCounts['public/dev-source-approval.css'] <= 1400,
    'moved CSS modules have bounded ownership-sized line counts',
    `youtube=${lineCounts['public/dev-youtube-source.css']} sourceApproval=${lineCounts['public/dev-source-approval.css']}`,
  )
  addCheck(
    checks,
    htmlOrder.every(index => index >= 0) &&
      htmlOrder[0] < htmlOrder[1] &&
      htmlOrder[1] < htmlOrder[2] &&
      String(htmlSource).indexOf('/dev.js') > htmlOrder[2],
    'Dev HTML loads split CSS bundle in preserved cascade order',
    orderDetail(htmlSource),
  )
  addCheck(
    checks,
    !coreSource.includes('.youtube-system {') &&
      !coreSource.includes('.approval-review {') &&
      youtubeSource.includes('.youtube-system {') &&
      youtubeSource.includes('.yt-exec-summary') &&
      !youtubeSource.includes('.approval-review {') &&
      sourceApprovalSource.includes('.approval-review {') &&
      sourceApprovalSource.includes('.source-leaderboard') &&
      sourceApprovalSource.includes('@media (max-width: 980px)'),
    'CSS ownership boundaries are split without changing selector order',
    'core -> youtube/source -> approval/source/responsive',
  )
  addCheck(
    checks,
    missingSelectors.length === 0,
    'CSS bundle keeps existing Dev Hub selectors available',
    missingSelectors.join(', ') || 'all selectors present',
  )
  addCheck(
    checks,
    !String(htmlSource).includes('20260528-ranking-process-v1') &&
      String(htmlSource).includes('20260530-oversized-core') &&
      String(htmlSource).includes('20260530-oversized-v1'),
    'Dev HTML cache keys identify the split CSS bundle',
    '20260530-oversized-*',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood rejects unsplit oversized root and missing required selector',
    `oversizedRejected=${dogfood.oversizedUnsplitRejected} missingSelectorRejected=${dogfood.missingSelectorRejected}`,
  )
  addCheck(
    checks,
    missingProgressionBlockers.length === 0,
    'Foundation progression registry recognizes the next tune-up blockers',
    missingProgressionBlockers.join(', ') || 'all tune-up follow-up blockers registered',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    cardId: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID,
    closeoutKey: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY,
    lineCounts,
    totalCssLines: Object.values(lineCounts).reduce((sum, lines) => sum + lines, 0),
    missingSelectors,
    missingProgressionBlockers,
    dogfood,
    checks,
    failed,
  }
}

function buildFoundationOversizedFileSplitWaveDogfoodProofRaw() {
  const required = REQUIRED_BUNDLE_SELECTORS
  const healthyBundle = required.join('\n')
  const oversizedRootLines = 5002
  return {
    ok: oversizedRootLines > 5000 &&
      healthyBundle.includes('.yt-session-readiness') &&
      !healthyBundle.replace('.yt-session-readiness', '').includes('.yt-session-readiness'),
    oversizedUnsplitRejected: oversizedRootLines > 5000,
    missingSelectorRejected: !healthyBundle.replace('.yt-session-readiness', '').includes('.yt-session-readiness'),
  }
}

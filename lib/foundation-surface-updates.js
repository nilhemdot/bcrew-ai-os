export const FOUNDATION_SURFACE_UPDATES_CARD_ID = 'FOUNDATION-SURFACE-UPDATES-001'
export const FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY = 'foundation-surface-updates-v1'
export const FOUNDATION_SURFACE_UPDATES_PLAN_PATH = 'docs/process/foundation-surface-updates-001-plan.md'
export const FOUNDATION_SURFACE_UPDATES_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-SURFACE-UPDATES-001.json'
export const FOUNDATION_SURFACE_UPDATES_SCRIPT_PATH = 'scripts/process-foundation-surface-updates-check.mjs'
export const FOUNDATION_SURFACE_UPDATES_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-20-foundation-surface-updates-closeout.md'
export const FOUNDATION_SURFACE_UPDATES_SPRINT_ID = 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20'

export const FOUNDATION_SURFACE_UPDATES_CHANGED_FILES = [
  'public/foundation-current-state-renderers.js',
  'public/foundation-operations-renderers.js',
  'public/foundation.js',
  'lib/foundation-verifier-operator-live-surface-assurance.js',
  'lib/foundation-recent-builds-verifier.js',
  'lib/foundation-surface-updates.js',
  'scripts/process-foundation-surface-updates-check.mjs',
  'docs/process/foundation-surface-updates-001-plan.md',
  'docs/process/approvals/FOUNDATION-SURFACE-UPDATES-001.json',
  'docs/_archive/handoffs/2026-05-20-foundation-surface-updates-closeout.md',
  'lib/foundation-build-closeout-foundation-surface-records.js',
  'package.json',
]

export const FOUNDATION_SURFACE_UPDATES_PROOF_COMMANDS = [
  'npm run process:foundation-surface-updates-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=FOUNDATION-SURFACE-UPDATES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SURFACE-UPDATES-001.json --closeoutKey=foundation-surface-updates-v1',
  'npm run process:fanout-check -- --card=FOUNDATION-SURFACE-UPDATES-001 --closeoutKey=foundation-surface-updates-v1',
  'npm run process:foundation-ship -- --card=FOUNDATION-SURFACE-UPDATES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SURFACE-UPDATES-001.json --closeoutKey=foundation-surface-updates-v1 --commitRef=HEAD',
]

function includesAll(source = '', terms = []) {
  const text = String(source || '')
  return terms.every(term => text.includes(term))
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

export function classifyFoundationSurfaceLocation(value = '') {
  const text = String(value || '').trim()
  if (!text) return { kind: 'missing', label: 'Missing location', href: null, clickable: false }

  const backlogMatch = text.match(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}\b/)
  if (/^\/foundation#/i.test(text)) return { kind: 'app', label: text, href: text, clickable: true }
  if (/Foundation\s*>\s*Backlog/i.test(text) && backlogMatch) {
    return { kind: 'backlog', label: text, href: `/foundation#backlog:${backlogMatch[0]}`, clickable: true }
  }
  if (/Foundation\s*>\s*Systems/i.test(text)) return { kind: 'app', label: text, href: '/foundation#systems', clickable: true }
  if (/Foundation\s*>\s*(Recent Work|Recent Builds)/i.test(text)) return { kind: 'app', label: text, href: '/foundation#build-log', clickable: true }
  if (/Foundation\s*>\s*Overview/i.test(text)) return { kind: 'app', label: text, href: '/foundation#current-state', clickable: true }
  if (/Foundation\s*>\s*Backlog/i.test(text)) return { kind: 'app', label: text, href: '/foundation#backlog', clickable: true }
  if (/^docs\/.+\.(md|json)$/i.test(text)) return { kind: 'doc', label: text, href: `/doc?path=${encodeURIComponent(text)}`, clickable: true }
  if (/^(public|lib|scripts|server|package\.json|docs\/process)\b/i.test(text)) return { kind: 'repo', label: text, href: null, clickable: false }
  return { kind: 'note', label: text, href: null, clickable: false }
}

export function buildFoundationSurfaceUpdatesDogfoodProof() {
  const samples = [
    'Foundation > Systems > Runtime Health',
    'Foundation > Backlog > FOUNDATION-SURFACE-UPDATES-001',
    'Foundation > Recent Work',
    'docs/process/foundation-surface-updates-001-plan.md',
    'public/foundation-operations-renderers.js',
  ].map(classifyFoundationSurfaceLocation)

  const missingClickable = samples.filter(item => ['app', 'backlog', 'doc'].includes(item.kind) && !item.clickable)
  const repoMislinked = samples.filter(item => item.kind === 'repo' && item.href)
  const textOnlyFailure = samples.filter(item => item.clickable).length < 4

  return {
    ok: missingClickable.length === 0 && repoMislinked.length === 0 && textOnlyFailure === false,
    samples,
    dogfoodInvariant: 'App/doc/backlog locations become clickable; repo/proof locations stay visible without fake browser links.',
  }
}

export function evaluateFoundationSurfaceUpdates({
  currentStateSource = '',
  operationsSource = '',
  foundationClientSource = '',
  operatorAssuranceSource = '',
  recentBuildsVerifierSource = '',
  closeoutRegistrySource = '',
  packageJson = {},
} = {}) {
  const checks = []
  addCheck(
    checks,
    includesAll(currentStateSource, [
      'renderFoundationOperatorPathPanel',
      'Overview -> Systems -> Backlog -> Recent Work',
      '/foundation#systems',
      '/foundation#backlog',
      '/foundation#build-log',
      'operator-surface-path',
    ]),
    'Overview renders a plain-English operator path with app breadcrumbs',
    'Overview, Systems, Backlog, Recent Work',
  )
  addCheck(
    checks,
    includesAll(operationsSource, [
      'resolveBuildLocationHref',
      'renderBuildLocationList',
      '/doc?path=',
      '/foundation#backlog:',
      'build-log-location-link',
    ]) && operationsSource.includes("renderBuildFact('Where it lives', renderBuildLocationList"),
    'Recent Work where-it-lives metadata becomes app/doc/backlog links',
    'location renderer markers present',
  )
  addCheck(
    checks,
    includesAll(foundationClientSource, [
      'Moved to done signal',
      "item.lane === 'done'",
      'done/last-updated signal',
    ]),
    'Backlog done rows show an honest done-date signal',
    'done date helper markers present',
  )
  addCheck(
    checks,
    operatorAssuranceSource.includes('foundationSurfaceUpdatesShipped') &&
      operatorAssuranceSource.includes(FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY) &&
      operatorAssuranceSource.includes('Foundation operator UX and Recent Work follow-up is closed or live'),
    'operator live-surface verifier accepts the shipped surface card',
    FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY,
  )
  addCheck(
    checks,
    recentBuildsVerifierSource.includes("{ id: 'FOUNDATION-SURFACE-UPDATES-001', lanes: ['scoped', 'done'] }"),
    'Recent Builds verifier allows the surface card to move from scoped to done',
    'scoped/done lane expectation',
  )
  addCheck(
    checks,
    closeoutRegistrySource.includes(FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY) &&
      closeoutRegistrySource.includes('Foundation > Overview') &&
      closeoutRegistrySource.includes('Foundation > Recent Work') &&
      closeoutRegistrySource.includes(FOUNDATION_SURFACE_UPDATES_CARD_ID),
    'closeout registry exposes the shipped surface update',
    FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-surface-updates-check'] === `node --env-file-if-exists=.env ${FOUNDATION_SURFACE_UPDATES_SCRIPT_PATH}`,
    'package exposes focused proof script',
    packageJson.scripts?.['process:foundation-surface-updates-check'] || 'missing',
  )

  const dogfood = buildFoundationSurfaceUpdatesDogfoodProof()
  addCheck(checks, dogfood.ok, 'dogfood proves location classification semantics', dogfood.dogfoodInvariant)

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    dogfood,
    summary: {
      checkCount: checks.length,
      failedCount: failed.length,
    },
  }
}

export function renderFoundationSurfaceUpdatesCloseout({ generatedAt = new Date().toISOString(), evaluation = {}, planSummary = {} } = {}) {
  const planCriticProof = typeof planSummary === 'string'
    ? planSummary
    : `${planSummary.status || 'unknown'} ${planSummary.score ?? 'unknown'}/10`
  return [
    '# FOUNDATION-SURFACE-UPDATES-001 Closeout',
    '',
    `Generated: ${generatedAt}`,
    `Closeout key: ${FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY}`,
    '',
    '## What Shipped',
    '',
    '- Foundation Overview now gives Steve a plain-English operator path: Overview -> Systems -> Backlog -> Recent Work.',
    '- Recent Work where-it-lives entries render app/doc/backlog breadcrumbs where a safe local link exists.',
    '- Repo/code/proof locations remain visible without pretending to be browser routes.',
    '- Backlog done rows now show a moved-to-done or done/last-updated signal.',
    '- Verifier expectations now allow this card to close instead of staying permanently scoped.',
    '',
    '## Proof',
    '',
    `- Focused proof: ${evaluation.ok ? 'healthy' : 'risk'} (${evaluation.summary?.failedCount ?? 'unknown'} failed)`,
    `- Plan Critic: ${planCriticProof}`,
    ...FOUNDATION_SURFACE_UPDATES_PROOF_COMMANDS.map(command => `- \`${command}\``),
    '',
    '## Boundaries',
    '',
    '- No broad redesign shipped.',
    '- No new source, extractor, agent, or value workflow shipped.',
    '- No external writes, sends, Drive permission changes, credential mutation, provider access, paid work, or browser-auth work shipped.',
    '',
    '## Next',
    '',
    'Roll the next approved Foundation sprint from live backlog truth and keep working under the park-and-continue rule.',
    '',
  ].join('\n')
}

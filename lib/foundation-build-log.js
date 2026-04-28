export const FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION = 2

const closeoutRecords = [
  {
    key: 'foundation-surface-sweep-v1',
    backlogIds: ['FOUNDATION-SWEEP-001'],
    match: {
      shortShas: ['7e97658'],
      subjectIncludes: ['Close Foundation surface sweep'],
    },
    systemArea: 'Foundation visibility',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Mapped every Foundation nav page to its backing API, docs, tables, source IDs, and backlog owner, then added stale source-crawl run detection.',
    whatItDoes: 'Lets Runtime Health show whether Foundation surfaces are still backed by live truth and whether a crawl/job has silently rotted.',
    whyItMatters: 'Steve no longer has to discover stale pages or stuck crawl runs by reading code, chat history, or raw database rows.',
    whereItLives: [
      'Foundation > Runtime Health > Foundation Surface Sweep',
      'lib/foundation-surface-map.js',
      'lib/foundation-db.js',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'passed 99/99 after dashboard restart',
    reviewNext: 'Review Runtime Health when nav pages, source contracts, jobs, docs, or hub links change.',
    knownLimits: [
      'Existing seed/live backlog drift is still reported, not solved.',
      'Health Auditor and Cleanup Agent remain deferred future cards.',
    ],
  },
  {
    key: 'foundation-recent-builds-v2',
    backlogIds: ['FOUNDATION-CHANGELOG-002'],
    match: {
      subjectIncludes: ['FOUNDATION-CHANGELOG-002'],
    },
    systemArea: 'Foundation visibility',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Upgraded Recent Builds from a commit/file list into an operator changelog with closeout records, backlog links, proof commands, review-next notes, and known limits.',
    whatItDoes: 'Groups recent repo work by day and system area so Steve can see what shipped, what it does, where it lives, and what to inspect next.',
    whyItMatters: 'A heavy AI build day has to explain itself through Foundation instead of relying on long chat memory or raw git logs.',
    whereItLives: [
      'Foundation > Recent Builds',
      '/api/foundation/build-log',
      'lib/foundation-build-log.js',
      'public/foundation.js',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'passed 103/103 after dashboard restart',
    reviewNext: 'Open Recent Builds and confirm the newest Foundation Visibility group answers what changed, proof, backlog status, and what remains.',
    knownLimits: [
      'This is a repo-truth closeout layer, not a separate build-record database yet.',
      'Older commits without closeout metadata still show derived summaries until major closeouts are backfilled.',
    ],
  },
  {
    key: 'slack-current-day-channel-proof',
    backlogIds: ['EXTRACTION-TEAM-001', 'EXTRACT-CONTROL-001'],
    match: {
      subjectIncludes: ['EXTRACTION-TEAM-001 Slack current-day item proof'],
    },
    systemArea: 'Foundation extraction',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Hardened the Slack current-day extraction lane so each channel writes source_crawl_items, then exposed extraction item summaries and health findings in Runtime Health.',
    whatItDoes: 'Turns a stale or opaque Slack crawl into visible channel-level proof: succeeded channels, skipped channels, failed channel items, stale reaped runs, and schedule mismatches can be inspected from Foundation.',
    whyItMatters: 'A green or failed target run alone is not enough for operations monitoring. Steve needs to see what was actually crawled, what was skipped, and whether stale runner state is still hiding.',
    whereItLives: [
      'Foundation > Runtime Health > Extraction Control',
      'scripts/sync-slack-archive.mjs',
      'scripts/run-extraction-target.mjs',
      'lib/foundation-db.js',
      'public/foundation.js',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: [
      'npm run extraction:target -- --target=slack-current-day --force=true --actor=codex-slack-proof',
      'npm run foundation:verify',
    ],
    proofStatus: 'Slack proof run succeeded with 61 channel items; foundation:verify passed 106/106 after dashboard restart.',
    reviewNext: 'Review Runtime Health for extraction targets with failed/skipped items and reconcile the Foundation-job next run against target next_run_at.',
    knownLimits: [
      'This improves one Slack current-day lane; it is not broad Slack history backfill.',
      'Schedule reconciliation, failed-item retry/backoff, and coverage-by-target views remain open.',
      'Drive, email attachment, meeting video, multimodal, Scoper, Strategy UI, Agent Factory, Health Auditor, and Cleanup Agent work remain out of this slice.',
    ],
  },
]

function normalizeList(values) {
  return (Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean)
}

function unique(values) {
  const seen = new Set()
  return normalizeList(values).filter(value => {
    const key = value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractBacklogIds(text) {
  const matches = String(text || '').match(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}\b/g)
  return unique(matches || [])
}

function matchesSubject(subject, phrases) {
  const normalizedSubject = String(subject || '').toLowerCase()
  return normalizeList(phrases).some(phrase => normalizedSubject.includes(phrase.toLowerCase()))
}

function closeoutMatchesCommit(closeout, commit = {}) {
  const match = closeout.match || {}
  const sha = String(commit.sha || '')
  const shortSha = String(commit.shortSha || '')
  if (normalizeList(match.shas).some(value => sha === value || sha.startsWith(value))) return true
  if (normalizeList(match.shortShas).some(value => shortSha === value || sha.startsWith(value))) return true
  if (matchesSubject(commit.subject, match.subjectIncludes)) return true
  return false
}

function inferOperatorStatus(subject) {
  if (/(close|closed|done|ship|shipped|accept|accepted|verify|verified)/i.test(subject || '')) {
    return 'shipped'
  }
  if (/(harden|repair|fix|guard|tighten)/i.test(subject || '')) return 'hardened'
  if (/(pin|record|checkpoint|document)/i.test(subject || '')) return 'recorded'
  return 'repo-change'
}

function defaultWhatItDoes(build) {
  const groups = normalizeList(build.fileGroups)
  if (groups.length) return `Updates ${groups.join(', ')}.`
  return 'Updates repo truth.'
}

function defaultWhereItLives(build) {
  const files = normalizeList(build.primaryFiles)
  if (files.length) return files
  const groups = normalizeList(build.fileGroups)
  return groups.length ? groups : ['Repo']
}

export function getFoundationBuildCloseouts() {
  return closeoutRecords.map(record => ({
    ...record,
    backlogIds: normalizeList(record.backlogIds),
    whereItLives: normalizeList(record.whereItLives),
    proofCommands: normalizeList(record.proofCommands),
    knownLimits: normalizeList(record.knownLimits),
  }))
}

export function getFoundationBuildCloseoutValidation() {
  const closeouts = getFoundationBuildCloseouts()
  const requiredTextFields = [
    'key',
    'systemArea',
    'status',
    'acceptanceState',
    'whatChanged',
    'whatItDoes',
    'whyItMatters',
    'proofStatus',
    'reviewNext',
  ]
  const invalid = closeouts.filter(record =>
    requiredTextFields.some(field => !String(record[field] || '').trim()) ||
      !record.backlogIds.length ||
      !record.whereItLives.length ||
      !record.proofCommands.length
  )

  return {
    schemaVersion: FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
    closeoutCount: closeouts.length,
    invalidCloseoutKeys: invalid.map(record => record.key || '<missing-key>'),
    backlogIds: unique(closeouts.flatMap(record => record.backlogIds)),
  }
}

export function enrichFoundationBuildLogCommit(build) {
  const closeout = getFoundationBuildCloseouts().find(record => closeoutMatchesCommit(record, build)) || null
  const closeoutText = closeout
    ? [
        closeout.backlogIds.join(' '),
        closeout.whatChanged,
        closeout.whatItDoes,
        closeout.whyItMatters,
        closeout.reviewNext,
        closeout.knownLimits.join(' '),
      ].join(' ')
    : ''
  const inferredBacklogIds = extractBacklogIds([
    build.subject,
    normalizeList(build.files).join(' '),
    closeoutText,
  ].filter(Boolean).join(' '))
  const backlogIds = unique([
    ...(closeout ? closeout.backlogIds : []),
    ...inferredBacklogIds,
  ])
  const systemArea = closeout?.systemArea || normalizeList(build.areas)[0] || 'Repo'
  const status = closeout?.status || inferOperatorStatus(build.subject)

  return {
    ...build,
    operatorCloseout: Boolean(closeout),
    closeoutKey: closeout?.key || null,
    schemaVersion: closeout ? FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION : null,
    systemArea,
    primaryArea: systemArea,
    operatorStatus: status,
    acceptanceState: closeout?.acceptanceState || (status === 'repo-change' ? 'No v2 closeout attached' : 'Derived from commit'),
    backlogIds,
    whatChanged: closeout?.whatChanged || (build.subject ? `${build.subject}.` : 'Repo update.'),
    whatItDoes: closeout?.whatItDoes || defaultWhatItDoes(build),
    whyItMatters: closeout?.whyItMatters || 'Keeps the active repo moving, but this commit does not yet have a major-build closeout record.',
    whereItLives: closeout?.whereItLives || defaultWhereItLives(build),
    proofCommands: closeout?.proofCommands || [],
    proofStatus: closeout?.proofStatus || 'No explicit proof command attached.',
    reviewNext: closeout?.reviewNext || 'Review changed files only if this commit affects an active surface.',
    knownLimits: closeout?.knownLimits || [],
  }
}

export function attachBacklogCardsToBuilds(builds, backlogItems = []) {
  const backlogMap = new Map((backlogItems || []).map(item => [item.id, item]))
  return (builds || []).map(build => ({
    ...build,
    relatedBacklog: normalizeList(build.backlogIds).map(id => {
      const item = backlogMap.get(id)
      return item
        ? {
            id: item.id,
            title: item.title,
            scope: item.scope || item.team || null,
            lane: item.lane,
            priority: item.priority,
            owner: item.owner || null,
            updatedAt: item.updatedAt || item.updated_at || null,
          }
        : {
            id,
            title: null,
            scope: null,
            lane: null,
            priority: null,
            owner: null,
            updatedAt: null,
          }
    }),
  }))
}

export function summarizeFoundationBuildLog(builds = []) {
  const records = builds || []
  const closeoutBuilds = records.filter(build => build.operatorCloseout)
  const backlogLinked = records.filter(build => normalizeList(build.backlogIds).length)
  const proofLinked = records.filter(build => normalizeList(build.proofCommands).length)
  const reviewNext = records.filter(build => String(build.reviewNext || '').trim())
  const systemAreas = unique(records.map(build => build.systemArea || build.primaryArea || 'Repo'))
  const days = unique(records.map(build => String(build.committedAt || '').slice(0, 10)).filter(Boolean))

  return {
    totalBuilds: records.length,
    closeoutBuilds: closeoutBuilds.length,
    backlogLinkedBuilds: backlogLinked.length,
    proofLinkedBuilds: proofLinked.length,
    reviewNextBuilds: reviewNext.length,
    systemAreas,
    dayCount: days.length,
  }
}

export function groupFoundationBuildLog(builds = []) {
  const dayMap = new Map()
  ;(builds || []).forEach(build => {
    const day = String(build.committedAt || '').slice(0, 10) || 'unknown-date'
    const area = build.systemArea || build.primaryArea || 'Repo'
    if (!dayMap.has(day)) dayMap.set(day, new Map())
    const areaMap = dayMap.get(day)
    if (!areaMap.has(area)) areaMap.set(area, [])
    areaMap.get(area).push(build)
  })

  return Array.from(dayMap.entries()).map(([day, areaMap]) => ({
    day,
    systemGroups: Array.from(areaMap.entries()).map(([systemArea, groupBuilds]) => ({
      systemArea,
      builds: groupBuilds,
    })),
  }))
}

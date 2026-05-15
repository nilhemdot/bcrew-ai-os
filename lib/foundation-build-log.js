import {
  FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
  closeoutRecords,
} from './foundation-build-closeout-records.js'

export { FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION }

export const CLOSEOUT_OWNERSHIP_GUARD_CARD_ID = 'CLOSEOUT-OWNERSHIP-GUARD-001'

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
    mentionedBacklogIds: unique(record.mentionedBacklogIds || []),
    whereItLives: normalizeList(record.whereItLives),
    proofCommands: normalizeList(record.proofCommands),
    knownLimits: normalizeList(record.knownLimits),
  }))
}

function findCloseoutOwnershipOverlaps(record = {}) {
  const ownedIds = unique(record.backlogIds)
  const mentionedIds = unique(record.mentionedBacklogIds || [])
  const mentionedLookup = new Set(mentionedIds.map(id => id.toLowerCase()))
  return ownedIds.filter(id => mentionedLookup.has(id.toLowerCase()))
}

export function validateFoundationBuildCloseouts(records = []) {
  const closeouts = (Array.isArray(records) ? records : []).map(record => ({
    ...record,
    backlogIds: normalizeList(record.backlogIds),
    mentionedBacklogIds: unique(record.mentionedBacklogIds || []),
    whereItLives: normalizeList(record.whereItLives),
    proofCommands: normalizeList(record.proofCommands),
    knownLimits: normalizeList(record.knownLimits),
  }))
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
  const ownershipOverlapViolations = closeouts
    .map(record => ({
      key: record.key || '<missing-key>',
      overlappingBacklogIds: findCloseoutOwnershipOverlaps(record),
    }))
    .filter(violation => violation.overlappingBacklogIds.length > 0)
  const invalidKeys = unique([
    ...invalid.map(record => record.key || '<missing-key>'),
    ...ownershipOverlapViolations.map(violation => violation.key),
  ])

  return {
    schemaVersion: FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
    closeoutCount: closeouts.length,
    invalidCloseoutKeys: invalidKeys,
    ownershipOverlapViolations,
    backlogIds: unique(closeouts.flatMap(record => record.backlogIds)),
  }
}

export function getFoundationBuildCloseoutValidation() {
  return validateFoundationBuildCloseouts(getFoundationBuildCloseouts())
}

function enrichFoundationBuildLogCommitWithCloseout(build, closeout = null) {
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
  const backlogIds = closeout ? unique(closeout.backlogIds) : inferredBacklogIds
  const mentionedBacklogIds = closeout
    ? unique([
        ...(closeout.mentionedBacklogIds || []),
        ...inferredBacklogIds.filter(id => !backlogIds.includes(id)),
      ])
    : []
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
    mentionedBacklogIds,
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

export function enrichFoundationBuildLogCommit(build) {
  const closeout = getFoundationBuildCloseouts().find(record => closeoutMatchesCommit(record, build)) || null
  return enrichFoundationBuildLogCommitWithCloseout(build, closeout)
}

export function enrichFoundationBuildLogCommitEntries(build) {
  const closeouts = getFoundationBuildCloseouts().filter(record => closeoutMatchesCommit(record, build))
  if (!closeouts.length) return [enrichFoundationBuildLogCommitWithCloseout(build, null)]
  return closeouts.map(closeout => enrichFoundationBuildLogCommitWithCloseout(build, closeout))
}

export function attachBacklogCardsToBuilds(builds, backlogItems = []) {
  const backlogMap = new Map((backlogItems || []).map(item => [item.id, item]))
  const mapBacklogId = id => {
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
  }
  return (builds || []).map(build => ({
    ...build,
    relatedBacklog: normalizeList(build.backlogIds).map(mapBacklogId),
    mentionedBacklog: normalizeList(build.mentionedBacklogIds).map(mapBacklogId),
  }))
}

export function buildSyntheticBuildLogOwnershipProof() {
  const build = {
    sha: 'synthetic000000000000000000000000000000000000',
    shortSha: 'synthetic',
    subject: 'Synthetic same-commit closeout mentions SYNTHETIC-B while owning SYNTHETIC-A',
    files: ['docs/process/synthetic.md'],
    areas: ['Foundation process'],
  }
  const closeoutA = {
    key: 'synthetic-a',
    backlogIds: ['SYNTHETIC-A'],
    mentionedBacklogIds: ['SYNTHETIC-B'],
    whatChanged: 'Changed A and mentioned SYNTHETIC-B as context.',
    whatItDoes: 'Proves ownership stays exact.',
    whyItMatters: 'Synthetic proof for build-log backlog-ID cleanup.',
    reviewNext: 'No next action.',
    knownLimits: [],
    systemArea: 'Foundation process',
    status: 'shipped',
    acceptanceState: 'Verified',
    whereItLives: ['Synthetic'],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'Synthetic proof.',
  }
  const closeoutB = {
    ...closeoutA,
    key: 'synthetic-b',
    backlogIds: ['SYNTHETIC-B'],
    mentionedBacklogIds: ['SYNTHETIC-A'],
    whatChanged: 'Changed B and mentioned SYNTHETIC-A as context.',
  }
  const enrichedA = enrichFoundationBuildLogCommitWithCloseout(build, closeoutA)
  const enrichedB = enrichFoundationBuildLogCommitWithCloseout(build, closeoutB)
  return {
    ok: enrichedA.backlogIds.length === 1 &&
      enrichedA.backlogIds[0] === 'SYNTHETIC-A' &&
      enrichedB.backlogIds.length === 1 &&
      enrichedB.backlogIds[0] === 'SYNTHETIC-B' &&
      enrichedA.mentionedBacklogIds.includes('SYNTHETIC-B') &&
      enrichedB.mentionedBacklogIds.includes('SYNTHETIC-A'),
    entries: [enrichedA, enrichedB],
  }
}

export function buildSyntheticBuildLogCloseoutValidationProof() {
  const baseRecord = {
    key: 'synthetic-clean-closeout',
    backlogIds: ['SYNTHETIC-A'],
    mentionedBacklogIds: ['SYNTHETIC-B'],
    whatChanged: 'Changed A and mentioned B only as context.',
    whatItDoes: 'Proves clean closeout ownership validates.',
    whyItMatters: 'Synthetic proof for closeout ownership guard.',
    reviewNext: 'No next action.',
    knownLimits: [],
    systemArea: 'Foundation process',
    status: 'shipped',
    acceptanceState: 'Verified',
    whereItLives: ['Synthetic'],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'Synthetic proof.',
  }
  const clean = validateFoundationBuildCloseouts([baseRecord])
  const overlapping = validateFoundationBuildCloseouts([
    {
      ...baseRecord,
      key: 'synthetic-overlap-closeout',
      backlogIds: ['SYNTHETIC-A'],
      mentionedBacklogIds: ['synthetic-a', 'SYNTHETIC-B'],
    },
  ])
  return {
    ok: clean.invalidCloseoutKeys.length === 0 &&
      overlapping.invalidCloseoutKeys.includes('synthetic-overlap-closeout') &&
      overlapping.ownershipOverlapViolations[0]?.overlappingBacklogIds.includes('SYNTHETIC-A'),
    clean,
    overlapping,
    invariant: 'Closeout validation accepts context-only mentions but rejects any owned card also listed as mentioned context.',
  }
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

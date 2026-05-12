export const PER_USER_CHANGELOG_CARD_ID = 'PER-USER-CHANGELOG-001'
export const PER_USER_CHANGELOG_CLOSEOUT_KEY = 'per-user-changelog-v1'
export const PER_USER_CHANGELOG_PLAN_PATH = 'docs/process/per-user-changelog-001-plan.md'
export const PER_USER_CHANGELOG_APPROVAL_PATH = 'docs/process/approvals/PER-USER-CHANGELOG-001.json'
export const PER_USER_CHANGELOG_SCRIPT_PATH = 'scripts/process-per-user-changelog-check.mjs'
export const PER_USER_CHANGELOG_SUMMARY_MARKER = 'PER_USER_CHANGELOG_SUMMARY'
export const PER_USER_CHANGELOG_NEXT_CARD_ID = 'DECISION-RESTRICTED-QUEUE-001'

export const PER_USER_CHANGELOG_EVENT_BUCKETS = [
  { key: 'changed', label: 'Changed or wrote', covered: true },
  { key: 'approved', label: 'Approved or locked', covered: true },
  { key: 'applied', label: 'Applied', covered: true },
  { key: 'system', label: 'System/process activity', covered: true },
  { key: 'viewed', label: 'Viewed', covered: false },
  { key: 'ignored', label: 'Ignored or dismissed', covered: false },
  { key: 'received', label: 'Received or was sent', covered: false },
]

const missingCoverageKeys = PER_USER_CHANGELOG_EVENT_BUCKETS
  .filter(bucket => !bucket.covered)
  .map(bucket => bucket.key)

const systemActorPattern = /^(system|foundation-worker|worker|dashboard|scheduler|cron)$/i
const agentActorPattern = /^(codex|claude|openclaw|agent|harlan|crewbert)([-_\s].*)?$/i
const privateMetadataKeyPattern = /(token|secret|cookie|password|authorization|credential|private|memory|raw|body|content|transcript)/i

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeActor(value) {
  const normalized = normalizeText(value)
  return normalized || 'system'
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase()
}

function compactDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)))
}

function safeMetadataKeys(metadata = {}) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
  return Object.keys(metadata)
    .map(key => normalizeText(key))
    .filter(Boolean)
    .filter(key => !privateMetadataKeyPattern.test(key))
    .sort((a, b) => a.localeCompare(b))
}

function classifyActivityType(eventType) {
  const value = normalizeText(eventType).toLowerCase()
  if (!value) return 'other'
  if (value.includes('approved') || value.includes('locked') || value.includes('classified')) return 'approved'
  if (value.includes('applied')) return 'applied'
  if (
    value.startsWith('job_run_') ||
    value === 'foundation_job_control_updated' ||
    value.includes('credential') ||
    value.includes('route_probe') ||
    value.includes('runtime')
  ) return 'system'
  if (
    value.includes('created') ||
    value.includes('updated') ||
    value.includes('changed') ||
    value.includes('proposed') ||
    value.includes('recorded') ||
    value.includes('curated') ||
    value.includes('cleared') ||
    value.includes('rejected') ||
    value.includes('failed') ||
    value.includes('succeeded') ||
    value.includes('superseded') ||
    value.includes('reopened') ||
    value.includes('resolved')
  ) return 'changed'
  return 'other'
}

function buildUserIndexes(users = []) {
  const byEmail = new Map()
  const byName = new Map()
  for (const user of users || []) {
    const email = normalizeEmail(user.email)
    const name = normalizeText(user.name).toLowerCase()
    if (email) byEmail.set(email, user)
    if (name) byName.set(name, user)
  }
  return { byEmail, byName }
}

function resolveActorProfile(actor, userIndexes) {
  const actorKey = normalizeActor(actor)
  const actorEmail = normalizeEmail(actorKey)
  const actorName = actorKey.toLowerCase()
  const user = userIndexes.byEmail.get(actorEmail) || userIndexes.byName.get(actorName) || null

  if (user) {
    return {
      actorKey,
      displayName: normalizeText(user.name) || user.email || actorKey,
      actorKind: 'known_user',
      email: user.email || null,
      tier: user.tier ?? null,
      userType: user.userType || null,
      active: user.active !== false,
    }
  }

  if (systemActorPattern.test(actorKey)) {
    return {
      actorKey,
      displayName: actorKey === 'system' ? 'System' : actorKey,
      actorKind: 'system',
      email: null,
      tier: null,
      userType: 'system',
      active: true,
    }
  }

  if (agentActorPattern.test(actorKey)) {
    return {
      actorKey,
      displayName: actorKey,
      actorKind: 'agent',
      email: null,
      tier: null,
      userType: 'agent',
      active: true,
    }
  }

  return {
    actorKey,
    displayName: actorKey,
    actorKind: 'unknown_actor',
    email: null,
    tier: null,
    userType: null,
    active: null,
  }
}

function buildActivityEntry(event, actorProfile) {
  const activityType = classifyActivityType(event.eventType)
  const metadataKeys = safeMetadataKeys(event.metadata)
  return {
    id: event.id == null ? `${actorProfile.actorKey}:${event.eventType}:${event.entityId}` : String(event.id),
    actorKey: actorProfile.actorKey,
    actorKind: actorProfile.actorKind,
    activityType,
    eventType: normalizeText(event.eventType),
    entityTable: normalizeText(event.entityTable),
    entityId: normalizeText(event.entityId),
    summary: normalizeText(event.summary),
    occurredAt: compactDate(event.createdAt) || event.createdAt || null,
    metadataKeys,
    metadataKeyCount: metadataKeys.length,
    metadataValuesIncluded: false,
  }
}

function emptyCounts() {
  return {
    changed: 0,
    approved: 0,
    applied: 0,
    system: 0,
    other: 0,
  }
}

function makeActorRow(profile) {
  return {
    ...profile,
    eventCount: 0,
    latestAt: null,
    counts: emptyCounts(),
    eventTypes: [],
    entityTables: [],
    recentActivity: [],
  }
}

function sortByLatestThenName(left, right) {
  const leftTime = new Date(left.latestAt || 0).getTime()
  const rightTime = new Date(right.latestAt || 0).getTime()
  if (leftTime !== rightTime) return rightTime - leftTime
  return String(left.displayName || left.actorKey).localeCompare(String(right.displayName || right.actorKey))
}

export function buildPerUserChangelogSnapshot({
  users = [],
  changeEvents = [],
  limit = 100,
  now = new Date(),
} = {}) {
  const boundedLimit = Math.min(500, Math.max(1, Number(limit) || 100))
  const userIndexes = buildUserIndexes(users)
  const rowsByActor = new Map()

  for (const user of users || []) {
    const profile = resolveActorProfile(user.email || user.name, userIndexes)
    if (profile.actorKey && !rowsByActor.has(profile.actorKey)) {
      rowsByActor.set(profile.actorKey, makeActorRow(profile))
    }
  }

  const events = (changeEvents || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, boundedLimit)

  const allActivity = []
  for (const event of events) {
    const profile = resolveActorProfile(event.actor, userIndexes)
    if (!rowsByActor.has(profile.actorKey)) rowsByActor.set(profile.actorKey, makeActorRow(profile))
    const row = rowsByActor.get(profile.actorKey)
    const entry = buildActivityEntry(event, profile)

    row.eventCount += 1
    row.latestAt = row.latestAt && new Date(row.latestAt).getTime() > new Date(entry.occurredAt || 0).getTime()
      ? row.latestAt
      : entry.occurredAt
    row.counts[entry.activityType] = (row.counts[entry.activityType] || 0) + 1
    row.eventTypes = unique([...row.eventTypes, entry.eventType]).sort((a, b) => a.localeCompare(b))
    row.entityTables = unique([...row.entityTables, entry.entityTable]).sort((a, b) => a.localeCompare(b))
    if (row.recentActivity.length < 8) row.recentActivity.push(entry)
    allActivity.push(entry)
  }

  const actors = Array.from(rowsByActor.values()).sort(sortByLatestThenName)
  const activeActors = actors.filter(actor => actor.eventCount > 0)
  const knownUserActors = activeActors.filter(actor => actor.actorKind === 'known_user')
  const systemActors = activeActors.filter(actor => actor.actorKind === 'system')
  const agentActors = activeActors.filter(actor => actor.actorKind === 'agent')
  const unknownActors = activeActors.filter(actor => actor.actorKind === 'unknown_actor')
  const coverage = PER_USER_CHANGELOG_EVENT_BUCKETS.map(bucket => ({
    ...bucket,
    status: bucket.covered ? 'tracked' : 'missing',
    eventCount: bucket.covered
      ? activeActors.reduce((sum, actor) => sum + Number(actor.counts[bucket.key] || 0), 0)
      : 0,
    repairPath: bucket.covered
      ? 'Covered by existing change_events records.'
      : `Needs a later event writer before ${bucket.key} history can be called complete.`,
  }))

  return {
    schemaVersion: 1,
    cardId: PER_USER_CHANGELOG_CARD_ID,
    closeoutKey: PER_USER_CHANGELOG_CLOSEOUT_KEY,
    generatedAt: compactDate(now) || new Date().toISOString(),
    status: missingCoverageKeys.length ? 'partial' : 'healthy',
    source: 'Existing Foundation change_events grouped by actor; no new audit table in v1.',
    summary: {
      userCount: (users || []).length,
      actorCount: activeActors.length,
      knownUserActorCount: knownUserActors.length,
      systemActorCount: systemActors.length,
      agentActorCount: agentActors.length,
      unknownActorCount: unknownActors.length,
      eventCount: events.length,
      changedCount: activeActors.reduce((sum, actor) => sum + actor.counts.changed, 0),
      approvedCount: activeActors.reduce((sum, actor) => sum + actor.counts.approved, 0),
      appliedCount: activeActors.reduce((sum, actor) => sum + actor.counts.applied, 0),
      systemCount: activeActors.reduce((sum, actor) => sum + actor.counts.system, 0),
      metadataValuesIncluded: false,
      missingCoverageCount: missingCoverageKeys.length,
      nextCardId: PER_USER_CHANGELOG_NEXT_CARD_ID,
    },
    coverage,
    missingCoverage: coverage.filter(item => item.status === 'missing'),
    actors,
    activeActors,
    recentActivity: allActivity.slice(0, Math.min(20, boundedLimit)),
    boundaries: [
      'V1 reuses change_events; it does not create a second audit-log writer.',
      'Metadata values, request bodies, cookies, tokens, raw content, and local memory content are not copied into this snapshot.',
      'Viewed, ignored, and received history are explicit missing coverage until real event writers exist.',
      'This is an owner-only Foundation audit view, not a team activity feed.',
    ],
  }
}

export function buildSyntheticPerUserChangelogProof() {
  const users = [
    {
      email: 'steve@bensoncrew.ca',
      name: 'Steve Zahnd',
      tier: 1,
      userType: 'owner',
      active: true,
    },
    {
      email: 'ops@bensoncrew.ca',
      name: 'Ops User',
      tier: 2,
      userType: 'ops',
      active: true,
    },
  ]
  const changeEvents = [
    {
      id: 1,
      eventType: 'doc_update_approved',
      entityTable: 'pending_doc_updates',
      entityId: 'DOC-1',
      actor: 'steve@bensoncrew.ca',
      summary: 'Steve approved a doc update',
      metadata: {
        decisionId: 'DEC-1',
        rawContent: 'must-not-copy',
        token: 'must-not-copy',
      },
      createdAt: '2026-05-12T15:00:00Z',
    },
    {
      id: 2,
      eventType: 'doc_update_applied',
      entityTable: 'pending_doc_updates',
      entityId: 'DOC-1',
      actor: 'ops@bensoncrew.ca',
      summary: 'Ops applied a doc update',
      metadata: {
        targetDocPath: 'docs/rebuild/current-state.md',
      },
      createdAt: '2026-05-12T15:05:00Z',
    },
    {
      id: 3,
      eventType: 'backlog_updated',
      entityTable: 'backlog_items',
      entityId: 'CARD-1',
      actor: 'codex',
      summary: 'Codex updated a backlog card',
      metadata: {
        lane: 'done',
      },
      createdAt: '2026-05-12T15:10:00Z',
    },
    {
      id: 4,
      eventType: 'job_run_succeeded',
      entityTable: 'foundation_job_runs',
      entityId: 'JOB-1',
      actor: 'system',
      summary: 'Scheduled job succeeded',
      metadata: {
        jobKey: 'verification-runs',
      },
      createdAt: '2026-05-12T15:15:00Z',
    },
    {
      id: 5,
      eventType: 'review_queue_changed',
      entityTable: 'review_queue',
      entityId: 'RQ-1',
      actor: 'external-helper@example.com',
      summary: 'Unknown actor changed review queue',
      metadata: {
        fingerprint: 'abc123',
      },
      createdAt: '2026-05-12T15:20:00Z',
    },
  ]

  const snapshot = buildPerUserChangelogSnapshot({
    users,
    changeEvents,
    limit: 10,
    now: new Date('2026-05-12T15:30:00Z'),
  })
  const steve = snapshot.activeActors.find(actor => actor.email === 'steve@bensoncrew.ca')
  const ops = snapshot.activeActors.find(actor => actor.email === 'ops@bensoncrew.ca')
  const codex = snapshot.activeActors.find(actor => actor.actorKey === 'codex')
  const system = snapshot.activeActors.find(actor => actor.actorKey === 'system')
  const unknown = snapshot.activeActors.find(actor => actor.actorKey === 'external-helper@example.com')
  const steveEntry = steve?.recentActivity?.[0] || null
  const copiedMetadataValue = snapshot.recentActivity.some(entry =>
    JSON.stringify(entry).includes('must-not-copy')
  )

  const ok = snapshot.status === 'partial' &&
    snapshot.summary.eventCount === 5 &&
    snapshot.summary.knownUserActorCount === 2 &&
    snapshot.summary.agentActorCount === 1 &&
    snapshot.summary.systemActorCount === 1 &&
    snapshot.summary.unknownActorCount === 1 &&
    steve?.counts.approved === 1 &&
    ops?.counts.applied === 1 &&
    codex?.counts.changed === 1 &&
    system?.counts.system === 1 &&
    unknown?.counts.changed === 1 &&
    steveEntry?.metadataValuesIncluded === false &&
    !copiedMetadataValue &&
    missingCoverageKeys.every(key => snapshot.missingCoverage.some(item => item.key === key))

  return {
    ok,
    snapshot,
    summary: snapshot.summary,
  }
}

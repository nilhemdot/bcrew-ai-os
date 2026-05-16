export const FOUNDATION_DECISION_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-002'
export const FOUNDATION_DECISION_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-decision-store-split-v1'
export const FOUNDATION_DECISION_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-decision-store-split-001-plan.md'
export const FOUNDATION_DECISION_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-002.json'
export const FOUNDATION_DECISION_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-decision-store-split-check.mjs'
export const FOUNDATION_DECISION_STORE_SPLIT_SPRINT_ID = 'foundation-decision-store-split-2026-05-15'
export const FOUNDATION_DECISION_STORE_SPLIT_BEFORE_LINES = 18800

const DEFAULT_CANONICAL_DECISION_CATEGORIES = ['strategy', 'system', 'execution', 'people']

function assertFunction(value, label) {
  if (typeof value !== 'function') throw new Error(`Foundation decision store requires ${label}.`)
}

function assertPool(value) {
  if (!value || typeof value.query !== 'function') throw new Error('Foundation decision store requires a pool.')
}

function getCanonicalCategories(categories = DEFAULT_CANONICAL_DECISION_CATEGORIES) {
  const values = Array.isArray(categories) && categories.length ? categories : DEFAULT_CANONICAL_DECISION_CATEGORIES
  return values.map(value => String(value || '').trim()).filter(Boolean)
}

export function mapDecisionRow(row = {}) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    status: row.status,
    summary: row.summary,
    rationale: row.rationale,
    sourceRef: row.source_ref ?? row.sourceRef,
    decisionOwner: row.decision_owner ?? row.decisionOwner,
    confirmedBy: row.confirmed_by ?? row.confirmedBy,
    participantNames: row.participant_names ?? row.participantNames ?? [],
    contextRef: row.context_ref ?? row.contextRef,
    evidenceNotes: row.evidence_notes ?? row.evidenceNotes,
    classifiedAt: row.classified_at ?? row.classifiedAt,
    classifiedBy: row.classified_by ?? row.classifiedBy,
    supersedesIds: row.supersedes_ids ?? row.supersedesIds ?? [],
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

export function mapOpenQuestionRow(row = {}) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    owner: row.owner,
    status: row.status || 'open',
    resolvedAt: row.resolved_at ?? row.resolvedAt,
    resolvedBy: row.resolved_by ?? row.resolvedBy,
    resolutionNote: row.resolution_note ?? row.resolutionNote,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

export function mapPendingDocUpdateRow(row = {}) {
  return {
    id: row.id,
    decisionId: row.decision_id ?? row.decisionId,
    decisionTitle: row.decision_title ?? row.decisionTitle,
    decisionCategory: row.decision_category ?? row.decisionCategory,
    decisionStatus: row.decision_status ?? row.decisionStatus,
    decisionSourceRef: row.decision_source_ref ?? row.decisionSourceRef,
    decisionOwner: row.decision_owner ?? row.decisionOwner,
    decisionConfirmedBy: row.decision_confirmed_by ?? row.decisionConfirmedBy,
    decisionParticipantNames: row.decision_participant_names ?? row.decisionParticipantNames ?? [],
    decisionContextRef: row.decision_context_ref ?? row.decisionContextRef,
    decisionEvidenceNotes: row.decision_evidence_notes ?? row.decisionEvidenceNotes,
    decisionRationale: row.decision_rationale ?? row.decisionRationale,
    targetDocPath: row.target_doc_path ?? row.targetDocPath,
    targetSection: row.target_section ?? row.targetSection,
    summary: row.summary,
    currentText: row.current_text ?? row.currentText,
    proposedText: row.proposed_text ?? row.proposedText,
    proposedDiff: row.proposed_diff ?? row.proposedDiff,
    status: row.status,
    proposedAt: row.proposed_at ?? row.proposedAt,
    proposedBy: row.proposed_by ?? row.proposedBy,
    reviewedAt: row.reviewed_at ?? row.reviewedAt,
    reviewedBy: row.reviewed_by ?? row.reviewedBy,
    appliedAt: row.applied_at ?? row.appliedAt,
    appliedCommit: row.applied_commit ?? row.appliedCommit,
    expiresAt: row.expires_at ?? row.expiresAt,
    metadata: row.metadata || {},
  }
}

function getDecisionTextTokens(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(token => token.length >= 4 && [
      'that', 'this', 'with', 'from', 'into', 'then', 'than', 'they', 'them',
      'have', 'will', 'when', 'where', 'what', 'which', 'should', 'stays',
      'stay', 'only', 'just', 'real', 'live', 'work', 'works', 'using', 'used',
      'system', 'strategy', 'decision', 'decisions', 'docs', 'doc', 'current',
    ].indexOf(token) === -1)
}

function getDecisionKeywordSet(item) {
  const tokens = getDecisionTextTokens((item && item.title) || '').concat(
    getDecisionTextTokens((item && item.summary) || '')
  )
  return Array.from(new Set(tokens))
}

function hasDecisionRelationshipLink(left, right) {
  const leftIds = (left && left.supersedesIds) || []
  const rightIds = (right && right.supersedesIds) || []
  return leftIds.indexOf(right.id) !== -1 || rightIds.indexOf(left.id) !== -1
}

function getDecisionReviewPriority(type) {
  if (type === 'needs_lock') return 0
  if (type === 'missing_source_ref') return 1
  if (type === 'missing_provenance') return 2
  if (type === 'broken_supersedes_link') return 3
  if (type === 'orphan_doc_update') return 4
  if (type === 'possible_relationship') return 5
  return 9
}

export function buildDecisionTraceabilitySnapshot(decisions, pendingDocUpdates, recentChanges) {
  const decisionList = Array.isArray(decisions) ? decisions : []
  const updates = Array.isArray(pendingDocUpdates) ? pendingDocUpdates : []
  const changes = Array.isArray(recentChanges) ? recentChanges : []

  const byDecision = {}
  const linkedDecisionIds = new Set()

  decisionList.forEach(decision => {
    const linkedUpdates = updates.filter(update => update.decisionId === decision.id)
    if (linkedUpdates.length) linkedDecisionIds.add(decision.id)

    const linkedUpdateIds = new Set(linkedUpdates.map(update => update.id))
    const decisionEvents = changes.filter(change =>
      change.entityTable === 'decisions' && change.entityId === decision.id
    )
    const docEvents = changes.filter(change => {
      if (String(change.eventType || '').indexOf('doc_update_') !== 0) return false
      if (linkedUpdateIds.has(change.entityId)) return true
      return change.metadata && change.metadata.decisionId === decision.id
    })

    const affectedDocs = Array.from(new Set(linkedUpdates.map(update => update.targetDocPath).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))

    const openDocUpdates = linkedUpdates.filter(update =>
      update.status === 'pending' || update.status === 'approved' || update.status === 'failed'
    )
    const appliedDocUpdates = linkedUpdates.filter(update => update.status === 'applied')

    const latestDocTouch = linkedUpdates.slice().sort((a, b) =>
      new Date(b.appliedAt || b.reviewedAt || b.proposedAt || 0).getTime() -
      new Date(a.appliedAt || a.reviewedAt || a.proposedAt || 0).getTime()
    )[0] || null

    const latestDecisionEvent = decisionEvents.slice().sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0] || null

    const latestDocEvent = docEvents.slice().sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0] || null

    byDecision[decision.id] = {
      decisionId: decision.id,
      linkedDocUpdateCount: linkedUpdates.length,
      openDocUpdateCount: openDocUpdates.length,
      appliedDocUpdateCount: appliedDocUpdates.length,
      affectedDocs,
      latestDecisionEventAt: latestDecisionEvent ? latestDecisionEvent.createdAt : null,
      latestDocEventAt: latestDocEvent ? latestDocEvent.createdAt : null,
      latestApprovalBy: latestDocTouch ? (latestDocTouch.reviewedBy || latestDocTouch.proposedBy || null) : null,
      latestAppliedCommit: latestDocTouch ? (latestDocTouch.appliedCommit || null) : null,
      traceStatus: linkedUpdates.length ? 'linked' : 'unlinked',
    }
  })

  const docs = {}
  updates.forEach(update => {
    const key = String(update.targetDocPath || '').trim()
    if (!key) return
    if (!docs[key]) {
      docs[key] = {
        targetDocPath: key,
        linkedDecisionIds: [],
        pendingDocUpdateCount: 0,
        appliedDocUpdateCount: 0,
        latestDocEventAt: null,
      }
    }
    if (update.decisionId && docs[key].linkedDecisionIds.indexOf(update.decisionId) === -1) {
      docs[key].linkedDecisionIds.push(update.decisionId)
    }
    if (update.status === 'applied') docs[key].appliedDocUpdateCount += 1
    if (update.status === 'pending' || update.status === 'approved' || update.status === 'failed') {
      docs[key].pendingDocUpdateCount += 1
    }
  })

  changes.forEach(change => {
    if (String(change.eventType || '').indexOf('doc_update_') !== 0) return
    const targetDocPath = change.metadata && change.metadata.targetDocPath
    if (!targetDocPath || !docs[targetDocPath]) return
    const current = docs[targetDocPath].latestDocEventAt
    if (!current || new Date(change.createdAt).getTime() > new Date(current).getTime()) {
      docs[targetDocPath].latestDocEventAt = change.createdAt
    }
  })

  return {
    summary: {
      totalDecisions: decisionList.length,
      linkedDecisions: linkedDecisionIds.size,
      unlinkedDecisions: decisionList.length - linkedDecisionIds.size,
      totalDocUpdates: updates.length,
      linkedDocUpdates: updates.filter(update => Boolean(update.decisionId)).length,
      orphanDocUpdates: updates.filter(update => !update.decisionId).length,
      affectedDocs: Object.keys(docs).length,
    },
    byDecision,
    byDocPath: docs,
  }
}

export function buildDecisionReviewSnapshot(decisions, pendingDocUpdates) {
  const decisionList = Array.isArray(decisions)
    ? decisions.slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    : []
  const updates = Array.isArray(pendingDocUpdates) ? pendingDocUpdates : []
  const byId = {}
  decisionList.forEach(item => {
    byId[item.id] = item
  })

  const reviewItems = []

  decisionList.forEach(item => {
    if (item.status === 'proposed') {
      reviewItems.push({
        key: `proposed-${item.id}`,
        tone: 'pending',
        type: 'needs_lock',
        title: `${item.id} still needs lock / cleanup`,
        meta: `${item.category} decision`,
        detail: 'This decision is still proposed. It needs either a lock, a merge, or a rejection path.',
        relatedDecisionIds: [item.id],
        nextStep: 'Review whether this should lock, merge into an existing decision, or be rejected.',
      })
    }

    if (!item.sourceRef) {
      reviewItems.push({
        key: `source-ref-${item.id}`,
        tone: 'pending',
        type: 'missing_source_ref',
        title: `${item.id} is missing source evidence`,
        meta: `${item.status} · ${item.category}`,
        detail: 'This decision does not have a source reference yet. That weakens provenance and later review.',
        relatedDecisionIds: [item.id],
        nextStep: 'Add the exact meeting, audit, chat, or source reference that justified this decision.',
      })
    }

    if (item.status === 'locked') {
      const missingParts = []
      if (!item.decisionOwner) missingParts.push('decision owner')
      if (!item.confirmedBy) missingParts.push('confirmed by')
      if (!item.participantNames || !item.participantNames.length) missingParts.push('participants')
      if (!item.contextRef) missingParts.push('context ref')

      if (missingParts.length) {
        reviewItems.push({
          key: `provenance-${item.id}`,
          tone: 'pending',
          type: 'missing_provenance',
          title: `${item.id} has incomplete decision provenance`,
          meta: `${item.category} · locked`,
          detail: `Missing: ${missingParts.join(', ')}.`,
          relatedDecisionIds: [item.id],
          nextStep: 'Fill in the owner, confirmer, participants, and context so this lock has durable provenance.',
        })
      }
    }

    ;(item.supersedesIds || []).forEach(targetId => {
      if (!byId[targetId]) {
        reviewItems.push({
          key: `broken-link-${item.id}-${targetId}`,
          tone: 'missing',
          type: 'broken_supersedes_link',
          title: `${item.id} points at a missing superseded decision`,
          meta: `${item.status} · ${item.category}`,
          detail: `Supersedes target ${targetId} is not present in the live decision log.`,
          relatedDecisionIds: [item.id],
          nextStep: 'Fix the supersedes link or remove it if the old decision was referenced by mistake.',
        })
      }
    })
  })

  updates.forEach(item => {
    if (item.status === 'pending' && !item.decisionId) {
      reviewItems.push({
        key: `orphan-doc-${item.id}`,
        tone: 'pending',
        type: 'orphan_doc_update',
        title: `${item.id} has no linked decision`,
        meta: 'Pending doc proposal',
        detail: 'This doc update proposal is reviewable, but it is not linked back to a decision yet.',
        relatedDecisionIds: [],
        nextStep: 'Link this proposal to the decision that actually justified the doc change.',
      })
    }
  })

  const activeDecisions = decisionList.filter(item => item.status !== 'superseded')

  for (let index = 0; index < activeDecisions.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < activeDecisions.length; compareIndex += 1) {
      const left = activeDecisions[index]
      const right = activeDecisions[compareIndex]
      if (left.category !== right.category) continue
      if (hasDecisionRelationshipLink(left, right)) continue

      const leftTokens = getDecisionKeywordSet(left)
      const rightTokens = getDecisionKeywordSet(right)
      const shared = leftTokens.filter(token => rightTokens.indexOf(token) !== -1)

      if (shared.length >= 3) {
        reviewItems.push({
          key: `overlap-${left.id}-${right.id}`,
          tone: 'planned',
          type: 'possible_relationship',
          title: `${left.id} and ${right.id} may need an explicit relationship`,
          meta: `${left.category} decisions`,
          detail: `Shared terms: ${shared.slice(0, 5).join(', ')}. These do not look broken, but they may need an explicit clarify / related / supersedes relationship so the log reads cleanly.`,
          relatedDecisionIds: [left.id, right.id],
          nextStep: 'Review whether they should stay separate, get a relationship note, or eventually be linked through clarification or supersession.',
        })
      }
    }
  }

  reviewItems.sort((a, b) => {
    const priorityDiff = getDecisionReviewPriority(a.type) - getDecisionReviewPriority(b.type)
    if (priorityDiff) return priorityDiff
    return String(a.title || '').localeCompare(String(b.title || ''))
  })

  const counts = {
    needsLock: reviewItems.filter(item => item.type === 'needs_lock').length,
    missingSourceRef: reviewItems.filter(item => item.type === 'missing_source_ref').length,
    missingProvenance: reviewItems.filter(item => item.type === 'missing_provenance').length,
    brokenSupersedesLink: reviewItems.filter(item => item.type === 'broken_supersedes_link').length,
    orphanDocUpdate: reviewItems.filter(item => item.type === 'orphan_doc_update').length,
    possibleRelationship: reviewItems.filter(item => item.type === 'possible_relationship').length,
  }

  return {
    total: reviewItems.length,
    status: reviewItems.length ? 'pending' : 'connected',
    counts,
    items: reviewItems,
  }
}

export function normalizeDecisionIdList(ids, currentId = null) {
  const seen = new Set()
  const normalizedCurrentId = currentId ? String(currentId).trim().toUpperCase() : null
  return (ids || [])
    .map(value => String(value || '').trim().toUpperCase())
    .filter(value => value && value !== normalizedCurrentId)
    .filter(value => {
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })
}

export function normalizeDecisionCategory(value, fallback = null, categories = DEFAULT_CANONICAL_DECISION_CATEGORIES) {
  const canonicalCategories = getCanonicalCategories(categories)
  const normalized = String(value ?? '').trim()
  if (!normalized && fallback) return fallback
  if (!canonicalCategories.includes(normalized)) {
    throw new Error(`Unsupported decision category: ${normalized || '<blank>'}`)
  }
  return normalized
}

export function normalizeStringList(values) {
  const seen = new Set()
  return (Array.isArray(values) ? values : [])
    .map(value => String(value ?? '').trim())
    .filter(Boolean)
    .filter(value => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function assertPendingDocUpdateCanApprove(status, id = 'pending doc update') {
  if (!['pending', 'failed'].includes(status)) {
    throw new Error(`Pending doc update ${id} cannot be approved from ${status}`)
  }
}

function assertPendingDocUpdateCanReject(status, id = 'pending doc update') {
  if (!['pending', 'approved', 'failed'].includes(status)) {
    throw new Error(`Pending doc update ${id} cannot be rejected from ${status}`)
  }
}

function assertPendingDocUpdateCanFail(status, id = 'pending doc update') {
  if (!['approved', 'failed'].includes(status)) {
    throw new Error(`Pending doc update ${id} cannot be marked failed from ${status}`)
  }
}

function assertPendingDocUpdateCanApply(status, id = 'pending doc update') {
  if (!['approved', 'failed'].includes(status)) {
    throw new Error(`Pending doc update ${id} cannot be applied from ${status}`)
  }
}

export function createFoundationDecisionStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  getNextPrefixedId,
  canonicalDecisionCategories = DEFAULT_CANONICAL_DECISION_CATEGORIES,
} = {}) {
  assertPool(pool)
  assertFunction(withFoundationTransaction, 'withFoundationTransaction')
  assertFunction(insertChangeEvent, 'insertChangeEvent')
  assertFunction(getNextPrefixedId, 'getNextPrefixedId')

  function normalizeCategory(value, fallback = null) {
    return normalizeDecisionCategory(value, fallback, canonicalDecisionCategories)
  }

  async function markSupersededDecisions(client, supersedesIds, sourceDecisionId, actor) {
    const normalizedIds = normalizeDecisionIdList(supersedesIds, sourceDecisionId)
    if (!normalizedIds.length) return []

    const existingResult = await client.query(
      `
        SELECT id, status
        FROM decisions
        WHERE id = ANY($1::text[])
      `,
      [normalizedIds]
    )

    const foundIds = new Set(existingResult.rows.map(row => row.id))

    for (const row of existingResult.rows) {
      if (row.status === 'superseded') continue

      await client.query(
        `
          UPDATE decisions
          SET status = 'superseded',
              updated_at = NOW()
          WHERE id = $1
        `,
        [row.id]
      )

      await insertChangeEvent(client, {
        eventType: 'decision_superseded',
        entityTable: 'decisions',
        entityId: row.id,
        actor,
        summary: `Decision ${row.id} superseded by ${sourceDecisionId}`,
        metadata: {
          supersededBy: sourceDecisionId,
        },
      })
    }

    return normalizedIds.filter(id => foundIds.has(id))
  }

  async function lockDecisionFromDocUpdate(client, decisionId, docUpdateId, actor) {
    const decisionResult = await client.query(
      `
        SELECT id, status, supersedes_ids
        FROM decisions
        WHERE id = $1
        FOR UPDATE
      `,
      [decisionId],
    )
    const decision = decisionResult.rows[0]
    if (!decision) return { appliedSupersedesIds: [], supersedesIds: [] }

    await client.query(
      `
        UPDATE decisions
        SET status = CASE WHEN status = 'proposed' THEN 'locked' ELSE status END,
            updated_at = NOW()
        WHERE id = $1
      `,
      [decisionId]
    )

    const supersedesIds = normalizeDecisionIdList(decision.supersedes_ids || [], decisionId)
    const shouldApplySupersedes = (decision.status === 'proposed' || decision.status === 'locked') && supersedesIds.length
    const appliedSupersedesIds = shouldApplySupersedes
      ? await markSupersededDecisions(client, supersedesIds, decisionId, actor)
      : []

    await insertChangeEvent(client, {
      eventType: 'decision_locked',
      entityTable: 'decisions',
      entityId: decisionId,
      actor,
      summary: appliedSupersedesIds.length
        ? `Locked decision ${decisionId} from doc update ${docUpdateId} - supersedes ${appliedSupersedesIds.join(', ')}`
        : `Locked decision ${decisionId}`,
      metadata: {
        docUpdateId,
        supersedesIds,
        appliedSupersedesIds,
      },
    })

    return { appliedSupersedesIds, supersedesIds }
  }

  async function createDecision(input, actor = 'steve') {
    return withFoundationTransaction(async client => {
      const id = await getNextPrefixedId(client, 'decisions', 'DEC')
      const category = normalizeCategory(input.category)
      const supersedesIds = normalizeDecisionIdList(input.supersedesIds, id)
      const participantNames = normalizeStringList(input.participantNames)
      const result = await client.query(
        `
          INSERT INTO decisions (
            id, category, title, status, summary, rationale, source_ref,
            decision_owner, confirmed_by, participant_names, context_ref, evidence_notes,
            classified_at, classified_by, supersedes_ids
          )
          VALUES ($1,$2,$3,'proposed',$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13)
          RETURNING *
        `,
        [
          id,
          category,
          input.title,
          input.summary,
          input.rationale ?? null,
          input.sourceRef ?? null,
          input.decisionOwner ?? null,
          input.confirmedBy ?? null,
          participantNames,
          input.contextRef ?? null,
          input.evidenceNotes ?? null,
          actor,
          supersedesIds,
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'decision_proposed',
        entityTable: 'decisions',
        entityId: id,
        actor,
        summary: `Proposed decision ${id}: ${input.title}`,
        metadata: {
          category,
          supersedesIds,
          decisionOwner: input.decisionOwner ?? null,
          confirmedBy: input.confirmedBy ?? null,
          participantNames,
          contextRef: input.contextRef ?? null,
        },
      })

      return mapDecisionRow(result.rows[0])
    })
  }

  async function updateDecision(id, input, actor = 'steve') {
    return withFoundationTransaction(async client => {
      const existingResult = await client.query(`SELECT * FROM decisions WHERE id = $1`, [id])
      const existing = existingResult.rows[0]
      if (!existing) throw new Error(`Decision not found: ${id}`)

      const nextCategory = normalizeCategory(input.category ?? existing.category)
      const nextStatus = input.status ?? existing.status
      const nextSupersedesIds = normalizeDecisionIdList(input.supersedesIds ?? existing.supersedes_ids ?? [], id)
      const hasDecisionOwner = Object.prototype.hasOwnProperty.call(input, 'decisionOwner')
      const hasConfirmedBy = Object.prototype.hasOwnProperty.call(input, 'confirmedBy')
      const hasParticipantNames = Object.prototype.hasOwnProperty.call(input, 'participantNames')
      const hasContextRef = Object.prototype.hasOwnProperty.call(input, 'contextRef')
      const hasEvidenceNotes = Object.prototype.hasOwnProperty.call(input, 'evidenceNotes')
      const nextDecisionOwner = hasDecisionOwner ? (input.decisionOwner ?? null) : (existing.decision_owner ?? null)
      const nextConfirmedBy = hasConfirmedBy ? (input.confirmedBy ?? null) : (existing.confirmed_by ?? null)
      const nextParticipantNames = hasParticipantNames
        ? normalizeStringList(input.participantNames)
        : normalizeStringList(existing.participant_names)
      const nextContextRef = hasContextRef ? (input.contextRef ?? null) : (existing.context_ref ?? null)
      const nextEvidenceNotes = hasEvidenceNotes ? (input.evidenceNotes ?? null) : (existing.evidence_notes ?? null)

      const result = await client.query(
        `
          UPDATE decisions
          SET category = $2,
              status = $3,
              rationale = CASE WHEN $4 THEN $5 ELSE rationale END,
              source_ref = CASE WHEN $6 THEN $7 ELSE source_ref END,
              classified_at = CASE WHEN $2 IS DISTINCT FROM category THEN NOW() ELSE classified_at END,
              classified_by = CASE WHEN $2 IS DISTINCT FROM category THEN $8 ELSE classified_by END,
              supersedes_ids = $9,
              decision_owner = $10,
              confirmed_by = $11,
              participant_names = $12,
              context_ref = $13,
              evidence_notes = $14,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [
          id,
          nextCategory,
          nextStatus,
          Object.prototype.hasOwnProperty.call(input, 'rationale'),
          input.rationale ?? null,
          Object.prototype.hasOwnProperty.call(input, 'sourceRef'),
          input.sourceRef ?? null,
          actor,
          nextSupersedesIds,
          nextDecisionOwner,
          nextConfirmedBy,
          nextParticipantNames,
          nextContextRef,
          nextEvidenceNotes,
        ]
      )

      const shouldApplySupersedes = (nextStatus === 'locked' || existing.status === 'locked') && nextSupersedesIds.length
      const appliedSupersedesIds = shouldApplySupersedes
        ? await markSupersededDecisions(client, nextSupersedesIds, id, actor)
        : []

      let eventType = 'decision_classified'
      let summary = `Updated decision ${id}`

      if (existing.status !== nextStatus && nextStatus === 'locked') {
        eventType = 'decision_locked'
        summary = `Locked decision ${id}`
      } else if (existing.status !== nextStatus && nextStatus === 'superseded') {
        eventType = 'decision_superseded'
        summary = `Superseded decision ${id}`
      } else if (existing.category !== nextCategory) {
        eventType = 'decision_classified'
        summary = `Reclassified decision ${id} as ${nextCategory}`
      }

      if (appliedSupersedesIds.length) {
        summary += ` · supersedes ${appliedSupersedesIds.join(', ')}`
      }

      await insertChangeEvent(client, {
        eventType,
        entityTable: 'decisions',
        entityId: id,
        actor,
        summary,
        metadata: {
          before: {
            category: existing.category,
            status: existing.status,
            supersedesIds: existing.supersedes_ids || [],
            decisionOwner: existing.decision_owner ?? null,
            confirmedBy: existing.confirmed_by ?? null,
            participantNames: existing.participant_names || [],
            contextRef: existing.context_ref ?? null,
          },
          after: {
            category: nextCategory,
            status: nextStatus,
            supersedesIds: nextSupersedesIds,
            decisionOwner: nextDecisionOwner,
            confirmedBy: nextConfirmedBy,
            participantNames: nextParticipantNames,
            contextRef: nextContextRef,
          },
        },
      })

      return mapDecisionRow(result.rows[0])
    })
  }

  async function createOpenQuestion(input, actor = 'steve') {
    return withFoundationTransaction(async client => {
      const id = await getNextPrefixedId(client, 'open_questions', 'Q')
      const result = await client.query(
        `
          INSERT INTO open_questions (
            id, title, summary, owner, status
          )
          VALUES ($1,$2,$3,$4,'open')
          RETURNING *
        `,
        [id, input.title, input.summary, input.owner ?? null]
      )

      await insertChangeEvent(client, {
        eventType: 'question_created',
        entityTable: 'open_questions',
        entityId: id,
        actor,
        summary: `Opened question ${id}: ${input.title}`,
        metadata: {},
      })

      return mapOpenQuestionRow(result.rows[0])
    })
  }

  async function updateOpenQuestion(id, input, actor = 'steve') {
    return withFoundationTransaction(async client => {
      const existingResult = await client.query(`SELECT * FROM open_questions WHERE id = $1`, [id])
      const existing = existingResult.rows[0]
      if (!existing) throw new Error(`Open question not found: ${id}`)

      const nextStatus = input.status ?? existing.status ?? 'open'
      const resolving = existing.status !== 'resolved' && nextStatus === 'resolved'
      const reopening = existing.status === 'resolved' && nextStatus === 'open'

      const result = await client.query(
        `
          UPDATE open_questions
          SET title = COALESCE($2, title),
              summary = COALESCE($3, summary),
              owner = COALESCE($4, owner),
              status = $5,
              resolved_at = CASE
                WHEN $5 = 'resolved' AND resolved_at IS NULL THEN NOW()
                WHEN $5 = 'open' THEN NULL
                ELSE resolved_at
              END,
              resolved_by = CASE
                WHEN $5 = 'resolved' AND resolved_by IS NULL THEN $6
                WHEN $5 = 'open' THEN NULL
                ELSE resolved_by
              END,
              resolution_note = CASE
                WHEN $5 = 'resolved' THEN COALESCE($7, resolution_note)
                WHEN $5 = 'open' THEN NULL
                ELSE resolution_note
              END,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [id, input.title ?? null, input.summary ?? null, input.owner ?? null, nextStatus, actor, input.resolutionNote ?? null]
      )

      let eventType = 'question_updated'
      let summary = `Updated question ${id}`
      if (resolving) {
        eventType = 'question_resolved'
        summary = `Resolved question ${id}`
      } else if (reopening) {
        eventType = 'question_reopened'
        summary = `Reopened question ${id}`
      }

      await insertChangeEvent(client, {
        eventType,
        entityTable: 'open_questions',
        entityId: id,
        actor,
        summary,
        metadata: {
          before: { status: existing.status || 'open', owner: existing.owner },
          after: { status: nextStatus, owner: input.owner ?? existing.owner },
        },
      })

      return mapOpenQuestionRow(result.rows[0])
    })
  }

  async function listPendingDocUpdates() {
    const result = await pool.query(
      `
        SELECT p.id, p.decision_id, d.title AS decision_title, d.category AS decision_category, d.status AS decision_status,
               d.source_ref AS decision_source_ref, d.decision_owner AS decision_owner, d.confirmed_by AS decision_confirmed_by,
               d.participant_names AS decision_participant_names, d.context_ref AS decision_context_ref,
               d.evidence_notes AS decision_evidence_notes, d.rationale AS decision_rationale,
               p.target_doc_path, p.target_section, p.summary,
               p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
               p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
        FROM pending_doc_updates p
        LEFT JOIN decisions d ON d.id = p.decision_id
        ORDER BY p.proposed_at DESC
      `
    )

    return result.rows.map(mapPendingDocUpdateRow)
  }

  async function getPendingDocUpdate(id) {
    const result = await pool.query(
      `
        SELECT p.id, p.decision_id, d.title AS decision_title, d.category AS decision_category, d.status AS decision_status,
               d.source_ref AS decision_source_ref, d.decision_owner AS decision_owner, d.confirmed_by AS decision_confirmed_by,
               d.participant_names AS decision_participant_names, d.context_ref AS decision_context_ref,
               d.evidence_notes AS decision_evidence_notes, d.rationale AS decision_rationale,
               p.target_doc_path, p.target_section, p.summary,
               p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
               p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
        FROM pending_doc_updates p
        LEFT JOIN decisions d ON d.id = p.decision_id
        WHERE p.id = $1
      `,
      [id]
    )

    return result.rows[0] ? mapPendingDocUpdateRow(result.rows[0]) : null
  }

  async function createPendingDocUpdate(input, actor = 'steve') {
    return withFoundationTransaction(async client => {
      const id = await getNextPrefixedId(client, 'pending_doc_updates', 'DU')
      const result = await client.query(
        `
          INSERT INTO pending_doc_updates (
            id, decision_id, target_doc_path, target_section, summary,
            current_text, proposed_text, proposed_diff, proposed_by, expires_at, metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW() + INTERVAL '72 hours',$10::jsonb)
          RETURNING *
        `,
        [
          id,
          input.decisionId ?? null,
          input.targetDocPath,
          input.targetSection ?? null,
          input.summary,
          input.currentText ?? null,
          input.proposedText,
          input.proposedDiff ?? null,
          actor,
          JSON.stringify(input.metadata || {}),
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'doc_update_proposed',
        entityTable: 'pending_doc_updates',
        entityId: id,
        actor,
        summary: `Proposed doc update ${id} for ${input.targetDocPath}`,
        metadata: {
          decisionId: input.decisionId ?? null,
          targetDocPath: input.targetDocPath,
          targetSection: input.targetSection ?? null,
        },
      })

      return mapPendingDocUpdateRow({ ...result.rows[0], decision_title: null })
    })
  }

  async function approvePendingDocUpdate(id, actor = 'steve') {
    return withFoundationTransaction(async client => {
      const existingResult = await client.query(
        `SELECT id, status FROM pending_doc_updates WHERE id = $1 FOR UPDATE`,
        [id]
      )
      const existing = existingResult.rows[0]
      if (!existing) throw new Error(`Pending doc update not found: ${id}`)
      assertPendingDocUpdateCanApprove(existing.status, id)

      const result = await client.query(
        `
          UPDATE pending_doc_updates
          SET status = 'approved',
              reviewed_at = NOW(),
              reviewed_by = $2,
              metadata = metadata - 'errorDetail' - 'partialWrite'
          WHERE id = $1
          RETURNING *
        `,
        [id, actor]
      )

      const row = result.rows[0]
      if (!row) throw new Error(`Pending doc update not found: ${id}`)

      await insertChangeEvent(client, {
        eventType: 'doc_update_approved',
        entityTable: 'pending_doc_updates',
        entityId: id,
        actor,
        summary: `Approved doc update ${id}`,
        metadata: {
          decisionId: row.decision_id ?? null,
          targetDocPath: row.target_doc_path,
          targetSection: row.target_section ?? null,
        },
      })

      return mapPendingDocUpdateRow({ ...row, decision_title: null })
    })
  }

  async function rejectPendingDocUpdate(id, actor = 'steve') {
    return withFoundationTransaction(async client => {
      const existingResult = await client.query(
        `SELECT id, status FROM pending_doc_updates WHERE id = $1 FOR UPDATE`,
        [id]
      )
      const existing = existingResult.rows[0]
      if (!existing) throw new Error(`Pending doc update not found: ${id}`)
      assertPendingDocUpdateCanReject(existing.status, id)

      const result = await client.query(
        `
          UPDATE pending_doc_updates
          SET status = 'rejected',
              reviewed_at = NOW(),
              reviewed_by = $2
          WHERE id = $1
          RETURNING *
        `,
        [id, actor]
      )

      const row = result.rows[0]
      if (!row) throw new Error(`Pending doc update not found: ${id}`)

      await insertChangeEvent(client, {
        eventType: 'doc_update_rejected',
        entityTable: 'pending_doc_updates',
        entityId: id,
        actor,
        summary: `Rejected doc update ${id}`,
        metadata: {
          decisionId: row.decision_id ?? null,
          targetDocPath: row.target_doc_path,
          targetSection: row.target_section ?? null,
        },
      })

      return mapPendingDocUpdateRow({ ...row, decision_title: null })
    })
  }

  async function markPendingDocUpdateFailed(id, metadata, actor = 'system') {
    return withFoundationTransaction(async client => {
      const existingResult = await client.query(
        `SELECT id, status FROM pending_doc_updates WHERE id = $1 FOR UPDATE`,
        [id]
      )
      const existing = existingResult.rows[0]
      if (!existing) throw new Error(`Pending doc update not found: ${id}`)
      assertPendingDocUpdateCanFail(existing.status, id)

      const result = await client.query(
        `
          UPDATE pending_doc_updates
          SET status = 'failed',
              reviewed_at = NOW(),
              reviewed_by = $2,
              metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
          WHERE id = $1
          RETURNING *
        `,
        [id, actor, JSON.stringify(metadata || {})]
      )

      const row = result.rows[0]
      if (!row) throw new Error(`Pending doc update not found: ${id}`)

      await insertChangeEvent(client, {
        eventType: 'doc_update_failed',
        entityTable: 'pending_doc_updates',
        entityId: id,
        actor,
        summary: `Doc update ${id} failed during apply`,
        metadata: {
          ...(metadata || {}),
          decisionId: row.decision_id ?? null,
          targetDocPath: row.target_doc_path,
          targetSection: row.target_section ?? null,
        },
      })

      return mapPendingDocUpdateRow({ ...row, decision_title: null })
    })
  }

  async function markPendingDocUpdateApplied(id, appliedCommit, actor = 'system') {
    return withFoundationTransaction(async client => {
      const pendingResult = await client.query(`SELECT * FROM pending_doc_updates WHERE id = $1 FOR UPDATE`, [id])
      const pending = pendingResult.rows[0]
      if (!pending) throw new Error(`Pending doc update not found: ${id}`)
      assertPendingDocUpdateCanApply(pending.status, id)

      const result = await client.query(
        `
          UPDATE pending_doc_updates
          SET status = 'applied',
              reviewed_at = COALESCE(reviewed_at, NOW()),
              reviewed_by = COALESCE(reviewed_by, $2),
              applied_at = NOW(),
              applied_commit = $3,
              metadata = metadata - 'errorDetail' - 'partialWrite'
          WHERE id = $1
          RETURNING *
        `,
        [id, actor, appliedCommit]
      )

      const decisionLock = pending.decision_id
        ? await lockDecisionFromDocUpdate(client, pending.decision_id, id, actor)
        : { appliedSupersedesIds: [], supersedesIds: [] }

      await insertChangeEvent(client, {
        eventType: 'doc_update_applied',
        entityTable: 'pending_doc_updates',
        entityId: id,
        actor,
        summary: `Applied doc update ${id}`,
        metadata: {
          appliedCommit,
          decisionId: pending.decision_id ?? null,
          decisionSupersedesIds: decisionLock.supersedesIds,
          appliedSupersedesIds: decisionLock.appliedSupersedesIds,
          targetDocPath: pending.target_doc_path,
          targetSection: pending.target_section ?? null,
        },
      })

      return mapPendingDocUpdateRow({ ...result.rows[0], decision_title: null })
    })
  }

  return {
    createDecision,
    updateDecision,
    createOpenQuestion,
    updateOpenQuestion,
    listPendingDocUpdates,
    getPendingDocUpdate,
    createPendingDocUpdate,
    approvePendingDocUpdate,
    rejectPendingDocUpdate,
    markPendingDocUpdateFailed,
    markPendingDocUpdateApplied,
  }
}

function captureRejection(fn) {
  try {
    const result = fn()
    return { ok: false, rejected: false, result }
  } catch (error) {
    return {
      ok: true,
      rejected: true,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

export function buildFoundationDecisionStoreSplitDogfoodProof() {
  const unsupportedCategory = captureRejection(() => normalizeDecisionCategory('random'))
  const normalizedSupersedes = normalizeDecisionIdList(['dec-1', 'DEC-1', 'DEC-2', 'DEC-3', 'DEC-3'], 'DEC-2')
  const approveApplied = captureRejection(() => assertPendingDocUpdateCanApprove('applied', 'DU-DOGFOOD'))
  const applyPending = captureRejection(() => assertPendingDocUpdateCanApply('pending', 'DU-DOGFOOD'))
  const failPending = captureRejection(() => assertPendingDocUpdateCanFail('pending', 'DU-DOGFOOD'))
  const rejectApplied = captureRejection(() => assertPendingDocUpdateCanReject('applied', 'DU-DOGFOOD'))
  const traceability = buildDecisionTraceabilitySnapshot(
    [
      mapDecisionRow({
        id: 'DEC-1',
        category: 'system',
        title: 'Use decision store',
        status: 'locked',
        summary: 'Split decision store',
        source_ref: 'dogfood',
        supersedes_ids: [],
      }),
    ],
    [
      mapPendingDocUpdateRow({
        id: 'DU-1',
        decision_id: 'DEC-1',
        target_doc_path: 'docs/example.md',
        status: 'applied',
        applied_commit: 'abc123',
        proposed_at: '2026-05-15T00:00:00.000Z',
      }),
    ],
    [
      {
        eventType: 'doc_update_applied',
        entityTable: 'pending_doc_updates',
        entityId: 'DU-1',
        createdAt: '2026-05-15T00:00:01.000Z',
        metadata: {
          decisionId: 'DEC-1',
          targetDocPath: 'docs/example.md',
        },
      },
    ],
  )

  const ok = unsupportedCategory.rejected === true &&
    normalizedSupersedes.join(',') === 'DEC-1,DEC-3' &&
    approveApplied.rejected === true &&
    applyPending.rejected === true &&
    failPending.rejected === true &&
    rejectApplied.rejected === true &&
    traceability.summary.linkedDecisions === 1 &&
    traceability.byDecision['DEC-1']?.traceStatus === 'linked'

  return {
    ok,
    invariant: 'Decision store rejects unsupported categories and invalid pending-doc-update transitions while preserving traceability mapping.',
    unsupportedCategory,
    normalizedSupersedes,
    invalidTransitions: {
      approveApplied,
      applyPending,
      failPending,
      rejectApplied,
    },
    traceabilitySummary: traceability.summary,
  }
}

// Foundation Decisions / Open Questions renderers.
// Loaded after foundation.js so route owners can call these browser-global helpers.

function formatDecisionStatusLabel(status) {
  if (status === 'locked') return 'Current'
  if (status === 'proposed') return 'Proposed'
  if (status === 'superseded') return 'Superseded'
  return status || 'Unknown'
}

function renderDecisionMemoryCard(item, hub, pendingUpdates, replacedBy) {
  var details = document.createElement('details')
  details.className = 'decision-item decision-item-' + item.status

  var summary = document.createElement('summary')
  summary.className = 'decision-item-summary'

  var left = document.createElement('div')
  left.className = 'decision-item-summary-left'

  var title = document.createElement('div')
  title.className = 'decision-item-summary-title'
  title.textContent = item.title
  left.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'decision-item-summary-meta'
  meta.textContent = item.id + ' · ' + item.category
  left.appendChild(meta)

  if (item.summary) {
    var excerpt = document.createElement('div')
    excerpt.className = 'decision-item-summary-copy'
    excerpt.textContent = item.summary
    left.appendChild(excerpt)
  }

  summary.appendChild(left)

  var right = document.createElement('div')
  right.className = 'decision-item-summary-right'

  if (item.updatedAt || item.createdAt) {
    var stamp = document.createElement('span')
    stamp.className = 'decision-item-summary-stamp'
    stamp.textContent = formatDate(item.updatedAt || item.createdAt)
    right.appendChild(stamp)
  }

  var status = document.createElement('span')
  status.className = 'status-pill status-pill-static status-' + item.status
  status.textContent = formatDecisionStatusLabel(item.status)
  right.appendChild(status)

  summary.appendChild(right)
  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'decision-item-body'

  var card = document.createElement('article')
  card.className = 'decision-card decision-card-memory decision-card-' + item.status

  var fullSummary = document.createElement('p')
  fullSummary.className = 'decision-copy'
  fullSummary.textContent = item.summary
  card.appendChild(fullSummary)

  if (item.rationale) {
    card.appendChild(renderLabeledCopy('decision-rationale', 'Why', item.rationale))
  }

  if (item.sourceRef) {
    card.appendChild(renderLabeledCopy('decision-source', 'Source', item.sourceRef))
  }

  if (item.contextRef) {
    card.appendChild(renderLabeledCopy('decision-source', 'Context', item.contextRef))
  }

  if (item.evidenceNotes) {
    card.appendChild(renderLabeledCopy('decision-rationale', 'Evidence Notes', item.evidenceNotes))
  }

  var metaRow = document.createElement('div')
  metaRow.className = 'decision-memory-meta'

  if (item.decisionOwner) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Owner', item.decisionOwner))
  }
  if (item.confirmedBy) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Confirmed By', item.confirmedBy))
  }
  if (item.participantNames && item.participantNames.length) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Participants', item.participantNames.join(', ')))
  }
  if (item.createdAt) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Created', formatDate(item.createdAt)))
  }
  if (item.classifiedAt) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Classified', formatDate(item.classifiedAt)))
  }
  if (item.classifiedBy) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Recorded By', item.classifiedBy))
  }
  if (item.updatedAt) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Updated', formatDate(item.updatedAt)))
  }
  if (item.supersedesIds && item.supersedesIds.length) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Supersedes', item.supersedesIds.join(', ')))
  }
  if (replacedBy && replacedBy.length) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Replaced By', replacedBy.map(function(decision) {
      return decision.id
    }).join(', ')))
  }
  if (metaRow.childNodes.length) {
    card.appendChild(metaRow)
  }

  var traceMap = hub && hub.decisionTraceability && hub.decisionTraceability.byDecision
    ? hub.decisionTraceability.byDecision
    : {}
  var trace = traceMap[item.id]
  if (trace) {
    var traceBlock = document.createElement('details')
    traceBlock.className = 'memory-inline-editor'

    var traceSummary = document.createElement('summary')
    traceSummary.textContent = 'Decision Trace'
    traceBlock.appendChild(traceSummary)

    var traceBody = document.createElement('div')
    traceBody.className = 'memory-related-updates'
    traceBody.appendChild(renderLabeledCopy('decision-meta', 'Trace status', trace.traceStatus === 'linked' ? 'Linked to docs' : 'No linked doc updates yet'))
    traceBody.appendChild(renderLabeledCopy('decision-meta', 'Linked doc updates', String(trace.linkedDocUpdateCount || 0)))
    traceBody.appendChild(renderLabeledCopy('decision-meta', 'Open linked updates', String(trace.openDocUpdateCount || 0)))
    traceBody.appendChild(renderLabeledCopy('decision-meta', 'Applied linked updates', String(trace.appliedDocUpdateCount || 0)))
    traceBody.appendChild(renderLabeledCopy('decision-meta', 'Affected docs', trace.affectedDocs && trace.affectedDocs.length ? trace.affectedDocs.join(', ') : '—'))
    if (trace.latestDecisionEventAt) {
      traceBody.appendChild(renderLabeledCopy('decision-meta', 'Last decision event', formatDate(trace.latestDecisionEventAt)))
    }
    if (trace.latestDocEventAt) {
      traceBody.appendChild(renderLabeledCopy('decision-meta', 'Last linked doc event', formatDate(trace.latestDocEventAt)))
    }
    if (trace.latestApprovalBy) {
      traceBody.appendChild(renderLabeledCopy('decision-meta', 'Last review / approval by', trace.latestApprovalBy))
    }
    if (trace.latestAppliedCommit) {
      traceBody.appendChild(renderLabeledCopy('decision-meta', 'Last applied commit', trace.latestAppliedCommit))
    }
    traceBlock.appendChild(traceBody)
    card.appendChild(traceBlock)
  }

  var relatedUpdates = (pendingUpdates || []).filter(function(update) {
    return update.decisionId === item.id
  })
  if (relatedUpdates.length) {
    var updatesBlock = document.createElement('details')
    updatesBlock.className = 'memory-inline-editor'

    var updatesSummary = document.createElement('summary')
    updatesSummary.textContent = 'Pending Doc Updates (' + relatedUpdates.length + ')'
    updatesBlock.appendChild(updatesSummary)

    var updatesWrap = document.createElement('div')
    updatesWrap.className = 'memory-related-updates'
    relatedUpdates.forEach(function(update) {
      updatesWrap.appendChild(renderPendingDocUpdateCard(update))
    })
    updatesBlock.appendChild(updatesWrap)
    card.appendChild(updatesBlock)
  }

  card.appendChild(renderDecisionEditor(item, hub))

  if (item.status !== 'superseded') {
    card.appendChild(renderDocProposalForm(item))
  }

  body.appendChild(card)
  details.appendChild(body)
  return details
}

function renderCaptureItem(item) {
  var card = document.createElement('article')
  card.className = 'capture-card'

  var title = document.createElement('h5')
  title.textContent = item.title
  card.appendChild(title)

  var id = document.createElement('div')
  id.className = 'decision-id'
  id.textContent = item.id
  card.appendChild(id)

  var summary = document.createElement('p')
  summary.textContent = item.summary
  card.appendChild(summary)

  if (item.owner) {
    card.appendChild(renderLabeledCopy('capture-owner', 'Owner', item.owner))
  }

  return card
}

function renderOpenQuestionCard(item) {
  var details = document.createElement('details')
  details.className = 'decision-item decision-item-' + (item.status === 'resolved' ? 'superseded' : 'locked')

  var summary = document.createElement('summary')
  summary.className = 'decision-item-summary'

  var left = document.createElement('div')
  left.className = 'decision-item-summary-left'

  var title = document.createElement('div')
  title.className = 'decision-item-summary-title'
  title.textContent = item.title
  left.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'decision-item-summary-meta'
  meta.textContent = [item.id, item.owner || null].filter(Boolean).join(' · ')
  left.appendChild(meta)

  if (item.summary) {
    var excerpt = document.createElement('div')
    excerpt.className = 'decision-item-summary-copy'
    excerpt.textContent = item.summary
    left.appendChild(excerpt)
  }

  summary.appendChild(left)

  var right = document.createElement('div')
  right.className = 'decision-item-summary-right'

  if (item.updatedAt || item.createdAt) {
    var stamp = document.createElement('span')
    stamp.className = 'decision-item-summary-stamp'
    stamp.textContent = formatDate(item.updatedAt || item.createdAt)
    right.appendChild(stamp)
  }

  var status = document.createElement('span')
  status.className = 'status-pill status-pill-static status-' + (item.status === 'resolved' ? 'connected' : 'pending')
  status.textContent = item.status === 'resolved' ? 'Resolved' : 'Open'
  right.appendChild(status)

  summary.appendChild(right)
  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'decision-item-body'

  var card = document.createElement('article')
  card.className = 'decision-card decision-card-memory'

  var fullSummary = document.createElement('p')
  fullSummary.className = 'decision-copy'
  fullSummary.textContent = item.summary
  card.appendChild(fullSummary)

  if (item.owner) {
    card.appendChild(renderLabeledCopy('capture-owner', 'Owner', item.owner))
  }

  var metaRow = document.createElement('div')
  metaRow.className = 'decision-memory-meta'

  if (item.createdAt) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Opened', formatDate(item.createdAt)))
  }
  if (item.updatedAt && item.updatedAt !== item.createdAt) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Updated', formatDate(item.updatedAt)))
  }
  if (item.resolvedAt) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Resolved', formatDate(item.resolvedAt)))
  }
  if (item.resolvedBy) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Resolved By', item.resolvedBy))
  }

  if (metaRow.childNodes.length) {
    card.appendChild(metaRow)
  }

  if (item.status === 'resolved' && item.resolutionNote) {
    card.appendChild(renderLabeledCopy('decision-rationale', 'Resolution', item.resolutionNote))
  }

  card.appendChild(renderQuestionEditor(item))
  body.appendChild(card)
  details.appendChild(body)
  return details
}

function parseCommaList(value, transform) {
  var seen = {}
  return (value || '')
    .split(',')
    .map(function(part) { return part.trim() })
    .map(function(part) { return transform ? transform(part) : part })
    .filter(function(part) { return part })
    .filter(function(part) {
      if (seen[part]) return false
      seen[part] = true
      return true
    })
}

function parseDecisionIdList(value) {
  return parseCommaList(value, function(part) {
    return part.toUpperCase()
  })
}

function getDecisionSortTimestamp(item) {
  var stamp = item && (item.createdAt || item.updatedAt || item.classifiedAt)
  var value = stamp ? new Date(stamp).getTime() : 0
  return Number.isFinite(value) ? value : 0
}

function sortDecisionsNewestFirst(items) {
  return (items || []).slice().sort(function(a, b) {
    var stampDiff = getDecisionSortTimestamp(b) - getDecisionSortTimestamp(a)
    if (stampDiff) return stampDiff
    return String(b.id || '').localeCompare(String(a.id || ''))
  })
}

function getDecisionTextTokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(function(token) {
      return token.length >= 4 && [
        'that', 'this', 'with', 'from', 'into', 'then', 'than', 'they', 'them',
        'have', 'will', 'when', 'where', 'what', 'which', 'should', 'stays',
        'stay', 'only', 'just', 'real', 'live', 'work', 'works', 'using', 'used',
        'system', 'strategy', 'decision', 'decisions', 'docs', 'doc', 'current',
      ].indexOf(token) === -1
    })
}

function getDecisionKeywordSet(item) {
  var set = {}
  getDecisionTextTokens((item && item.title) || '').concat(getDecisionTextTokens((item && item.summary) || '')).forEach(function(token) {
    set[token] = true
  })
  return Object.keys(set)
}

function hasDecisionLink(a, b) {
  var aIds = (a && a.supersedesIds) || []
  var bIds = (b && b.supersedesIds) || []
  return aIds.indexOf(b.id) !== -1 || bIds.indexOf(a.id) !== -1
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

function getDecisionReviewSnapshot(hub) {
  if (
    hub &&
    hub.decisionReview &&
    typeof hub.decisionReview.total === 'number' &&
    hub.decisionReview.counts &&
    Array.isArray(hub.decisionReview.items)
  ) {
    return hub.decisionReview
  }

  var decisions = sortDecisionsNewestFirst((hub && hub.decisions) || [])
  var pendingDocUpdates = (hub && hub.pendingDocUpdates) || []
  var byId = {}
  decisions.forEach(function(item) {
    byId[item.id] = item
  })

  var reviewItems = []

  decisions.forEach(function(item) {
    if (item.status === 'proposed') {
      reviewItems.push({
        key: 'proposed-' + item.id,
        tone: 'pending',
        type: 'needs_lock',
        title: item.id + ' still needs lock / cleanup',
        meta: item.category + ' decision',
        detail: 'This decision is still proposed. It needs either a lock, a merge, or a rejection path.',
        relatedDecisionIds: [item.id],
        nextStep: 'Review whether this should lock, merge into an existing decision, or be rejected.',
      })
    }

    if (!item.sourceRef) {
      reviewItems.push({
        key: 'source-ref-' + item.id,
        tone: 'pending',
        type: 'missing_source_ref',
        title: item.id + ' is missing source evidence',
        meta: item.status + ' · ' + item.category,
        detail: 'This decision does not have a source reference yet. That weakens provenance and later review.',
        relatedDecisionIds: [item.id],
        nextStep: 'Add the exact meeting, audit, chat, or source reference that justified this decision.',
      })
    }

    if (item.status === 'locked') {
      var missingParts = []
      if (!item.decisionOwner) missingParts.push('decision owner')
      if (!item.confirmedBy) missingParts.push('confirmed by')
      if (!item.participantNames || !item.participantNames.length) missingParts.push('participants')
      if (!item.contextRef) missingParts.push('context ref')

      if (missingParts.length) {
        reviewItems.push({
          key: 'provenance-' + item.id,
          tone: 'pending',
          type: 'missing_provenance',
          title: item.id + ' has incomplete decision provenance',
          meta: item.category + ' · locked',
          detail: 'Missing: ' + missingParts.join(', ') + '.',
          relatedDecisionIds: [item.id],
          nextStep: 'Fill in the owner, confirmer, participants, and context so this lock has durable provenance.',
        })
      }
    }

    ;(item.supersedesIds || []).forEach(function(targetId) {
      if (!byId[targetId]) {
        reviewItems.push({
          key: 'broken-link-' + item.id + '-' + targetId,
          tone: 'missing',
          type: 'broken_supersedes_link',
          title: item.id + ' points at a missing superseded decision',
          meta: item.status + ' · ' + item.category,
          detail: 'Supersedes target ' + targetId + ' is not present in the live decision log.',
          relatedDecisionIds: [item.id],
          nextStep: 'Fix the supersedes link or remove it if the old decision was referenced by mistake.',
        })
      }
    })
  })

  pendingDocUpdates.forEach(function(item) {
    if (item.status === 'pending' && !item.decisionId) {
      reviewItems.push({
        key: 'orphan-doc-' + item.id,
        tone: 'pending',
        type: 'orphan_doc_update',
        title: item.id + ' has no linked decision',
        meta: 'Pending doc proposal',
        detail: 'This doc update proposal is reviewable, but it is not linked back to a decision yet.',
        relatedDecisionIds: [],
        nextStep: 'Link this proposal to the decision that actually justified the doc change.',
      })
    }
  })

  var activeDecisions = decisions.filter(function(item) {
    return item.status !== 'superseded'
  })

  for (var i = 0; i < activeDecisions.length; i += 1) {
    for (var j = i + 1; j < activeDecisions.length; j += 1) {
      var left = activeDecisions[i]
      var right = activeDecisions[j]
      if (left.category !== right.category) continue
      if (hasDecisionLink(left, right)) continue

      var leftTokens = getDecisionKeywordSet(left)
      var rightTokens = getDecisionKeywordSet(right)
      var shared = leftTokens.filter(function(token) {
        return rightTokens.indexOf(token) !== -1
      })

      if (shared.length >= 3) {
        reviewItems.push({
          key: 'overlap-' + left.id + '-' + right.id,
          tone: 'planned',
          type: 'possible_relationship',
          title: left.id + ' and ' + right.id + ' may need an explicit relationship',
          meta: left.category + ' decisions',
          detail: 'Shared terms: ' + shared.slice(0, 5).join(', ') + '. These do not look broken, but they may need an explicit clarify / related / supersedes relationship so the log reads cleanly.',
          relatedDecisionIds: [left.id, right.id],
          nextStep: 'Review whether they should stay separate, get a relationship note, or eventually be linked through clarification or supersession.',
        })
      }
    }
  }

  reviewItems.sort(function(a, b) {
    var priorityDiff = getDecisionReviewPriority(a.type) - getDecisionReviewPriority(b.type)
    if (priorityDiff) return priorityDiff
    return String(a.title || '').localeCompare(String(b.title || ''))
  })

  var byType = {}
  reviewItems.forEach(function(item) {
    byType[item.type] = (byType[item.type] || 0) + 1
  })

  return {
    total: reviewItems.length,
    status: reviewItems.length ? 'pending' : 'connected',
    counts: {
      needsLock: byType.needs_lock || 0,
      missingSourceRef: byType.missing_source_ref || 0,
      missingProvenance: byType.missing_provenance || 0,
      brokenSupersedesLink: byType.broken_supersedes_link || 0,
      orphanDocUpdate: byType.orphan_doc_update || 0,
      possibleRelationship: byType.possible_relationship || 0,
    },
    items: reviewItems,
  }
}

function buildDecisionReplacementMap(decisions) {
  var replacementMap = {}

  ;(decisions || []).forEach(function(item) {
    ;(item.supersedesIds || []).forEach(function(id) {
      var cleanId = String(id || '').trim().toUpperCase()
      if (!cleanId) return
      if (!replacementMap[cleanId]) replacementMap[cleanId] = []
      replacementMap[cleanId].push(item)
    })
  })

  Object.keys(replacementMap).forEach(function(id) {
    replacementMap[id] = sortDecisionsNewestFirst(replacementMap[id])
  })

  return replacementMap
}

function filterDecisionItems(items, viewState) {
  var query = String((viewState && viewState.query) || '').trim().toLowerCase()
  var category = (viewState && viewState.category) || 'all'
  var view = (viewState && viewState.view) || 'current'

  return sortDecisionsNewestFirst(items).filter(function(item) {
    if (category !== 'all' && item.category !== category) return false

    if (view === 'current' && item.status === 'superseded') return false
    if (view === 'proposed' && item.status !== 'proposed') return false
    if (view === 'superseded' && item.status !== 'superseded') return false

    if (!query) return true

    var haystack = [
      item.id,
      item.title,
      item.category,
      item.status,
      item.summary,
      item.rationale,
      item.sourceRef,
      (item.supersedesIds || []).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.indexOf(query) !== -1
  })
}

function getDecisionStageGroups(items, view) {
  var groups

  if (view === 'proposed') {
    groups = [
      {
        key: 'review',
        label: 'Pending Review',
        intro: 'Proposed decisions that still need confirmation, cleanup, or a clear lock-in step.',
        statuses: ['proposed'],
      },
    ]
  } else if (view === 'superseded') {
    groups = [
      {
        key: 'history',
        label: 'Superseded History',
        intro: 'Old agreements kept for traceability so the team can see what changed and what replaced it.',
        statuses: ['superseded'],
      },
    ]
  } else if (view === 'all') {
    groups = [
      {
        key: 'current',
        label: 'Current Agreements',
        intro: 'Locked decisions that represent the current live agreement the team should actually follow.',
        statuses: ['locked'],
      },
      {
        key: 'review',
        label: 'Pending Review',
        intro: 'Proposed decisions that still need confirmation, cleanup, or a clear lock-in step.',
        statuses: ['proposed'],
      },
      {
        key: 'history',
        label: 'Superseded History',
        intro: 'Old agreements kept for traceability so the team can see what changed and what replaced it.',
        statuses: ['superseded'],
      },
    ]
  } else {
    groups = [
      {
        key: 'current',
        label: 'Current Agreements',
        intro: 'Locked decisions that represent the current live agreement the team should actually follow.',
        statuses: ['locked'],
      },
      {
        key: 'review',
        label: 'Pending Review',
        intro: 'Proposed decisions that still need confirmation, cleanup, or a clear lock-in step.',
        statuses: ['proposed'],
      },
    ]
  }

  return groups.map(function(group) {
    return {
      key: group.key,
      label: group.label,
      intro: group.intro,
      items: (items || []).filter(function(item) {
        return group.statuses.indexOf(item.status) !== -1
      }),
    }
  }).filter(function(group) {
    return group.items.length
  })
}

function renderDecisionStack(group, hub, pendingUpdates, replacementMap) {
  var details = document.createElement('details')
  details.className = 'decision-stack'

  var summary = document.createElement('summary')
  summary.className = 'decision-stack-summary decision-stack-summary-' + group.key

  var left = document.createElement('div')
  left.className = 'decision-stack-summary-left'

  var title = document.createElement('div')
  title.className = 'decision-stack-title'
  title.textContent = group.label
  left.appendChild(title)

  var intro = document.createElement('div')
  intro.className = 'decision-stack-intro'
  intro.textContent = group.intro
  left.appendChild(intro)

  summary.appendChild(left)

  var count = document.createElement('span')
  count.className = 'decision-stack-count'
  count.textContent = group.items.length
  summary.appendChild(count)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'decision-stack-body'

  group.items.forEach(function(item) {
    body.appendChild(renderDecisionMemoryCard(item, hub, pendingUpdates, replacementMap[item.id] || []))
  })

  details.appendChild(body)
  return details
}

function renderDecisionReviewItem(item, index) {
  var card = document.createElement('article')
  card.className = 'doc-update-card'

  var top = document.createElement('div')
  top.className = 'decision-top'

  var titleWrap = document.createElement('div')
  var title = document.createElement('h4')
  title.textContent = item.title
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'decision-id'
  meta.textContent = 'Step ' + (index + 1) + ' · ' + item.meta
  titleWrap.appendChild(meta)
  top.appendChild(titleWrap)

  top.appendChild(renderSourceTag(item.tone === 'missing' ? 'Needs fix' : item.tone === 'pending' ? 'Needs review' : 'Review later', item.tone))
  card.appendChild(top)

  var detail = document.createElement('p')
  detail.className = 'source-card-copy'
  detail.textContent = item.detail
  card.appendChild(detail)

  if (item.nextStep) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Next step', item.nextStep))
  }

  if (item.relatedDecisionIds && item.relatedDecisionIds.length) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Decision IDs', item.relatedDecisionIds.join(', ')))
  }

  return card
}

function renderDecisionReviewPanel(hub) {
  var snapshot = getDecisionReviewSnapshot(hub)
  var traceability = hub && hub.decisionTraceability ? hub.decisionTraceability : { summary: {} }
  var backlogIds = ['DECISION-001', 'DECISION-002', 'DECISION-003', 'DECISION-005', 'MEMORY-005']
  var relatedBacklogItems = (hub.backlogItems || []).filter(function(item) {
    return backlogIds.indexOf(item.id) !== -1
  })

  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Decision Cleanup'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'What still needs review'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'This is the first live contradiction / traceability queue. It only flags concrete review items, not speculative AI guesses.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  panel.appendChild(renderOverviewStatusPanel([
    {
      label: 'Live review items',
      status: snapshot.status,
      detail: snapshot.total
        ? snapshot.total + ' decision cleanup item' + (snapshot.total === 1 ? '' : 's') + ' are live right now.'
        : 'No live contradiction or traceability review items are currently detected.',
    },
    {
      label: 'Needs lock',
      status: snapshot.counts.needsLock ? 'pending' : 'connected',
      detail: snapshot.counts.needsLock
        ? snapshot.counts.needsLock + ' proposed decision' + (snapshot.counts.needsLock === 1 ? '' : 's') + ' still need lock / merge / rejection.'
        : 'No proposed decisions are waiting on lock right now.',
    },
    {
      label: 'Relationship review',
      status: snapshot.counts.possibleRelationship ? 'pending' : 'connected',
      detail: snapshot.counts.possibleRelationship
        ? snapshot.counts.possibleRelationship + ' related decision pair' + (snapshot.counts.possibleRelationship === 1 ? '' : 's') + ' should be reviewed.'
        : 'No relationship-review pairs are currently detected.',
    },
    {
      label: 'Traceability gaps',
      status: (snapshot.counts.missingSourceRef || snapshot.counts.missingProvenance || snapshot.counts.brokenSupersedesLink || snapshot.counts.orphanDocUpdate) ? 'pending' : 'connected',
      detail: 'Missing source refs: ' + snapshot.counts.missingSourceRef +
        ' · incomplete provenance: ' + snapshot.counts.missingProvenance +
        ' · broken supersedes links: ' + snapshot.counts.brokenSupersedesLink +
        ' · orphan doc updates: ' + snapshot.counts.orphanDocUpdate,
    },
    {
      label: 'Decision-to-doc links',
      status: traceability.summary && traceability.summary.orphanDocUpdates ? 'pending' : (traceability.summary && traceability.summary.linkedDocUpdates ? 'connected' : 'neutral'),
      detail: (traceability.summary && traceability.summary.linkedDecisions ? traceability.summary.linkedDecisions : 0) + ' linked decision' + (((traceability.summary && traceability.summary.linkedDecisions) || 0) === 1 ? '' : 's') +
        ' · ' + (traceability.summary && traceability.summary.linkedDocUpdates ? traceability.summary.linkedDocUpdates : 0) + ' linked doc update' + (((traceability.summary && traceability.summary.linkedDocUpdates) || 0) === 1 ? '' : 's') +
        ' · ' + (traceability.summary && traceability.summary.affectedDocs ? traceability.summary.affectedDocs : 0) + ' affected doc' + (((traceability.summary && traceability.summary.affectedDocs) || 0) === 1 ? '' : 's'),
    },
  ], {
    eyebrow: 'Review Queue',
    title: 'Decision conflict and traceability watch',
    intro: 'This makes contradiction cleanup visible before the full engine exists.',
  }))

  var queue = document.createElement('details')
  queue.className = 'decision-stack'
  queue.open = snapshot.total > 0

  var summary = document.createElement('summary')
  summary.className = 'decision-stack-summary decision-stack-summary-review'
  var summaryLeft = document.createElement('div')
  summaryLeft.className = 'decision-stack-summary-left'
  var summaryTitle = document.createElement('div')
  summaryTitle.className = 'decision-stack-title'
  summaryTitle.textContent = 'Current Review Queue'
  summaryLeft.appendChild(summaryTitle)
  var summaryIntro = document.createElement('div')
  summaryIntro.className = 'decision-stack-intro'
  summaryIntro.textContent = snapshot.total
    ? 'Start at the top and work down. Hard fixes come first, relationship cleanup comes later.'
    : 'Nothing is actively flagged right now. The backlog under this queue is the next build work.'
  summaryLeft.appendChild(summaryIntro)
  summary.appendChild(summaryLeft)
  var count = document.createElement('span')
  count.className = 'decision-stack-count'
  count.textContent = snapshot.total
  summary.appendChild(count)
  queue.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'decision-stack-body'
  if (snapshot.total) {
    snapshot.items.forEach(function(item, index) {
      body.appendChild(renderDecisionReviewItem(item, index))
    })
  } else {
    var empty = document.createElement('div')
    empty.className = 'decision-empty-state'
    empty.textContent = 'No live review items. The next work is still building deeper contradiction logic, provenance, and temporal truth.'
    body.appendChild(empty)
  }
  queue.appendChild(body)
  panel.appendChild(queue)

  if (relatedBacklogItems.length) {
    var backlogQueue = document.createElement('details')
    backlogQueue.className = 'decision-stack'

    var backlogSummary = document.createElement('summary')
    backlogSummary.className = 'decision-stack-summary decision-stack-summary-history'

    var backlogSummaryLeft = document.createElement('div')
    backlogSummaryLeft.className = 'decision-stack-summary-left'

    var backlogSummaryTitle = document.createElement('div')
    backlogSummaryTitle.className = 'decision-stack-title'
    backlogSummaryTitle.textContent = 'Backlog Behind This Queue'
    backlogSummaryLeft.appendChild(backlogSummaryTitle)

    var backlogSummaryIntro = document.createElement('div')
    backlogSummaryIntro.className = 'decision-stack-intro'
    backlogSummaryIntro.textContent = 'These are the exact build cards behind contradiction cleanup, provenance, and temporal truth.'
    backlogSummaryLeft.appendChild(backlogSummaryIntro)

    backlogSummary.appendChild(backlogSummaryLeft)

    var backlogCount = document.createElement('span')
    backlogCount.className = 'decision-stack-count'
    backlogCount.textContent = relatedBacklogItems.length
    backlogSummary.appendChild(backlogCount)

    backlogQueue.appendChild(backlogSummary)

    var backlogBody = document.createElement('div')
    backlogBody.className = 'decision-stack-body'
    sortBacklogItems(relatedBacklogItems).forEach(function(item) {
      backlogBody.appendChild(renderBacklogAccordionItem(item))
    })
    backlogQueue.appendChild(backlogBody)
    panel.appendChild(backlogQueue)
  }

  return panel
}

function getOpenQuestionSortTimestamp(item) {
  var stamp = item && (item.updatedAt || item.resolvedAt || item.createdAt)
  var value = stamp ? new Date(stamp).getTime() : 0
  return Number.isFinite(value) ? value : 0
}

function sortOpenQuestionsNewestFirst(items) {
  return (items || []).slice().sort(function(a, b) {
    var stampDiff = getOpenQuestionSortTimestamp(b) - getOpenQuestionSortTimestamp(a)
    if (stampDiff) return stampDiff
    return String(b.id || '').localeCompare(String(a.id || ''))
  })
}

function getOpenQuestionGroups(items) {
  return [
    {
      key: 'open',
      label: 'Still Open',
      intro: 'Questions that still block a clean decision, schema boundary, or trust rule.',
      items: sortOpenQuestionsNewestFirst((items || []).filter(function(item) {
        return item.status !== 'resolved'
      })),
    },
    {
      key: 'resolved',
      label: 'Resolved History',
      intro: 'Questions that were answered, merged, or closed so the review trail stays visible.',
      items: sortOpenQuestionsNewestFirst((items || []).filter(function(item) {
        return item.status === 'resolved'
      })),
    },
  ].filter(function(group) {
    return group.items.length
  })
}

function renderOpenQuestionStack(group) {
  var details = document.createElement('details')
  details.className = 'decision-stack'

  var summary = document.createElement('summary')
  summary.className = 'decision-stack-summary decision-stack-summary-' + group.key

  var left = document.createElement('div')
  left.className = 'decision-stack-summary-left'

  var title = document.createElement('div')
  title.className = 'decision-stack-title'
  title.textContent = group.label
  left.appendChild(title)

  var intro = document.createElement('div')
  intro.className = 'decision-stack-intro'
  intro.textContent = group.intro
  left.appendChild(intro)
  summary.appendChild(left)

  var count = document.createElement('span')
  count.className = 'decision-stack-count'
  count.textContent = group.items.length
  summary.appendChild(count)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'decision-stack-body'

  group.items.forEach(function(item) {
    body.appendChild(renderOpenQuestionCard(item))
  })

  details.appendChild(body)
  return details
}

function renderDecisionCreatePanel(hub) {
  var panel = document.createElement('section')
  panel.className = 'panel memory-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Create'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Log Decision'
  left.appendChild(title)
  header.appendChild(left)
  panel.appendChild(header)

  var form = document.createElement('form')
  form.className = 'memory-form-grid'

  var titleInput = buildInput('text', 'Decision title')
  form.appendChild(buildField('Title', titleInput))

  var categorySelect = buildSelect((hub.meta && hub.meta.canonicalDecisionCategories || []).map(function(category, index) {
    return { value: category, label: category, selected: index === 0 }
  }))
  form.appendChild(buildField('Category', categorySelect))

  var summaryInput = buildTextarea('Summary', 3)
  form.appendChild(buildField('Summary', summaryInput))

  var rationaleInput = buildTextarea('Why this decision exists', 3)
  form.appendChild(buildField('Rationale', rationaleInput))

  var sourceRefInput = buildInput('text', 'Optional source or reference')
  form.appendChild(buildField('Source Ref', sourceRefInput))

  var decisionOwnerInput = buildInput('text', 'Steve')
  form.appendChild(buildField('Decision Owner', decisionOwnerInput))

  var confirmedByInput = buildInput('text', 'Steve')
  form.appendChild(buildField('Confirmed By', confirmedByInput))

  var participantsInput = buildInput('text', 'Steve, Codex')
  form.appendChild(buildField('Participants', participantsInput))

  var contextRefInput = buildInput('text', 'Meeting, audit, thread, or session link')
  form.appendChild(buildField('Context Ref', contextRefInput))

  var evidenceNotesInput = buildTextarea('Why this is trustworthy / what supports it', 3)
  form.appendChild(buildField('Evidence Notes', evidenceNotesInput))

  var supersedesInput = buildInput('text', 'DEC-001, DEC-004')
  form.appendChild(buildField('Supersedes', supersedesInput))

  var actions = document.createElement('div')
  actions.className = 'memory-form-actions'

  var submit = document.createElement('button')
  submit.type = 'submit'
  submit.className = 'memory-button'
  submit.textContent = 'Create Decision'
  actions.appendChild(submit)

  form.appendChild(actions)

  var status = document.createElement('p')
  status.className = 'form-status'
  form.appendChild(status)

  form.addEventListener('submit', function(event) {
    event.preventDefault()
    submit.disabled = true
    setFormStatus(status, 'Creating decision…')
    foundationMutation('/api/foundation/decisions', 'POST', {
      title: titleInput.value.trim(),
      category: categorySelect.value,
      summary: summaryInput.value.trim(),
      rationale: rationaleInput.value.trim(),
      sourceRef: sourceRefInput.value.trim(),
      decisionOwner: decisionOwnerInput.value.trim(),
      confirmedBy: confirmedByInput.value.trim(),
      participantNames: parseCommaList(participantsInput.value),
      contextRef: contextRefInput.value.trim(),
      evidenceNotes: evidenceNotesInput.value.trim(),
      supersedesIds: parseDecisionIdList(supersedesInput.value),
    }).then(function() {
      form.reset()
      categorySelect.value = (hub.meta && hub.meta.canonicalDecisionCategories && hub.meta.canonicalDecisionCategories[0]) || 'strategy'
      setFormStatus(status, 'Decision created.', 'success')
      renderDecisions()
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to create decision.', 'error')
    }).finally(function() {
      submit.disabled = false
    })
  })

  panel.appendChild(form)
  return panel
}

function renderDecisionEditor(item, hub) {
  var details = document.createElement('details')
  details.className = 'memory-inline-editor'

  var summary = document.createElement('summary')
  summary.textContent = 'Update'
  details.appendChild(summary)

  var wrap = document.createElement('div')
  wrap.className = 'memory-inline-grid'

  var categorySelect = buildSelect((hub.meta && hub.meta.canonicalDecisionCategories || []).map(function(category) {
    return { value: category, label: category, selected: category === item.category }
  }))
  wrap.appendChild(buildField('Category', categorySelect))

  var statusSelect = buildSelect([
    { value: 'proposed', label: 'proposed', selected: item.status === 'proposed' },
    { value: 'locked', label: 'locked', selected: item.status === 'locked' },
    { value: 'superseded', label: 'superseded', selected: item.status === 'superseded' },
  ])
  wrap.appendChild(buildField('Status', statusSelect))

  var sourceRefInput = buildInput('text', 'Source ref')
  sourceRefInput.value = item.sourceRef || ''
  wrap.appendChild(buildField('Source Ref', sourceRefInput))

  var decisionOwnerInput = buildInput('text', 'Decision owner')
  decisionOwnerInput.value = item.decisionOwner || ''
  wrap.appendChild(buildField('Decision Owner', decisionOwnerInput))

  var confirmedByInput = buildInput('text', 'Confirmed by')
  confirmedByInput.value = item.confirmedBy || ''
  wrap.appendChild(buildField('Confirmed By', confirmedByInput))

  var participantsInput = buildInput('text', 'Steve, Codex')
  participantsInput.value = (item.participantNames || []).join(', ')
  wrap.appendChild(buildField('Participants', participantsInput))

  var contextRefInput = buildInput('text', 'Meeting, audit, thread, or session link')
  contextRefInput.value = item.contextRef || ''
  wrap.appendChild(buildField('Context Ref', contextRefInput))

  var evidenceNotesInput = buildTextarea('Evidence notes', 3)
  evidenceNotesInput.value = item.evidenceNotes || ''
  wrap.appendChild(buildField('Evidence Notes', evidenceNotesInput))

  var supersedesInput = buildInput('text', 'DEC-001, DEC-004')
  supersedesInput.value = (item.supersedesIds || []).join(', ')
  wrap.appendChild(buildField('Supersedes', supersedesInput))

  var save = document.createElement('button')
  save.type = 'button'
  save.className = 'memory-button'
  save.textContent = 'Save'
  wrap.appendChild(save)

  var status = document.createElement('p')
  status.className = 'form-status'
  wrap.appendChild(status)

  save.addEventListener('click', function() {
    save.disabled = true
    setFormStatus(status, 'Saving…')
    foundationMutation('/api/foundation/decisions/' + encodeURIComponent(item.id), 'PATCH', {
      category: categorySelect.value,
      status: statusSelect.value,
      sourceRef: sourceRefInput.value.trim(),
      decisionOwner: decisionOwnerInput.value.trim(),
      confirmedBy: confirmedByInput.value.trim(),
      participantNames: parseCommaList(participantsInput.value),
      contextRef: contextRefInput.value.trim(),
      evidenceNotes: evidenceNotesInput.value.trim(),
      supersedesIds: parseDecisionIdList(supersedesInput.value),
    }).then(function() {
      setFormStatus(status, 'Saved.', 'success')
      renderDecisions()
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to save.', 'error')
    }).finally(function() {
      save.disabled = false
    })
  })

  details.appendChild(wrap)
  return details
}

function renderDocProposalForm(item) {
  var details = document.createElement('details')
  details.className = 'memory-inline-editor'

  var summary = document.createElement('summary')
  summary.textContent = 'Propose Doc Update'
  details.appendChild(summary)

  var wrap = document.createElement('div')
  wrap.className = 'memory-inline-grid'

  var pathSelect = buildSelect([
    { value: 'docs/strategy/quarterly-priorities.md', label: 'Quarterly Priorities' },
    { value: 'docs/strategy/strategic-issues.md', label: 'Strategic Issues' },
    { value: 'docs/strategy/department-mandates.md', label: 'Department Mandates' },
  ])
  wrap.appendChild(buildField('Target Doc', pathSelect))

  var sectionInput = buildInput('text', 'Heading text')
  wrap.appendChild(buildField('Target Section', sectionInput))

  var summaryInput = buildInput('text', 'Proposal summary')
  wrap.appendChild(buildField('Summary', summaryInput))

  var proposedText = buildTextarea('Replacement section body', 6)
  wrap.appendChild(buildField('Proposed Text', proposedText))

  var save = document.createElement('button')
  save.type = 'button'
  save.className = 'memory-button'
  save.textContent = 'Create Proposal'
  wrap.appendChild(save)

  var status = document.createElement('p')
  status.className = 'form-status'
  wrap.appendChild(status)

  save.addEventListener('click', function() {
    save.disabled = true
    setFormStatus(status, 'Creating proposal…')
    foundationMutation('/api/foundation/doc-updates', 'POST', {
      decisionId: item.id,
      targetDocPath: pathSelect.value,
      targetSection: sectionInput.value.trim(),
      summary: summaryInput.value.trim() || ('Update tied to ' + item.id),
      proposedText: proposedText.value.trim(),
    }).then(function() {
      setFormStatus(status, 'Proposal created.', 'success')
      renderDecisions()
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to create proposal.', 'error')
    }).finally(function() {
      save.disabled = false
    })
  })

  details.appendChild(wrap)
  return details
}

function renderPendingDocUpdateCard(item) {
  var card = document.createElement('article')
  card.className = 'doc-update-card'

  var top = document.createElement('div')
  top.className = 'decision-top'

  var titleWrap = document.createElement('div')
  var title = document.createElement('h4')
  title.textContent = item.summary
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'decision-id'
  meta.textContent = item.id + ' · ' + item.status
  titleWrap.appendChild(meta)
  top.appendChild(titleWrap)
  card.appendChild(top)

  var decisionLine = item.decisionId || '—'
  if (item.decisionTitle) decisionLine += ' · ' + item.decisionTitle
  card.appendChild(renderLabeledCopy('decision-meta', 'Decision', decisionLine))
  if (item.decisionCategory || item.decisionStatus) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Decision state', [item.decisionCategory, item.decisionStatus].filter(Boolean).join(' · ')))
  }
  card.appendChild(renderLabeledCopy('decision-meta', 'Target', item.targetDocPath))
  card.appendChild(renderLabeledCopy('decision-meta', 'Section', item.targetSection || '—'))
  if (item.decisionSourceRef) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Decision source', item.decisionSourceRef))
  }
  if (item.decisionContextRef) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Decision context', item.decisionContextRef))
  }
  if (item.decisionOwner || item.decisionConfirmedBy) {
    card.appendChild(renderLabeledCopy(
      'decision-meta',
      'Decision approval',
      [item.decisionOwner ? 'Owner: ' + item.decisionOwner : '', item.decisionConfirmedBy ? 'Confirmed: ' + item.decisionConfirmedBy : ''].filter(Boolean).join(' · ')
    ))
  }
  if (item.reviewedBy || item.reviewedAt || item.appliedAt) {
    var reviewParts = []
    if (item.reviewedBy) reviewParts.push('Reviewed by ' + item.reviewedBy)
    if (item.reviewedAt) reviewParts.push(formatDate(item.reviewedAt))
    if (item.appliedAt) reviewParts.push('Applied ' + formatDate(item.appliedAt))
    card.appendChild(renderLabeledCopy('decision-meta', 'Doc update path', reviewParts.join(' · ')))
  }
  if (item.decisionRationale) {
    card.appendChild(renderLabeledCopy('decision-rationale', 'Why', item.decisionRationale))
  }
  if (item.decisionEvidenceNotes) {
    card.appendChild(renderLabeledCopy('decision-rationale', 'Evidence Notes', item.decisionEvidenceNotes))
  }

  var diff = document.createElement('details')
  diff.className = 'memory-inline-editor'
  var diffSummary = document.createElement('summary')
  diffSummary.textContent = 'Review Diff'
  diff.appendChild(diffSummary)
  var diffBody = document.createElement('pre')
  diffBody.className = 'doc-update-diff'
  diffBody.textContent = item.proposedDiff || item.proposedText || ''
  diff.appendChild(diffBody)
  card.appendChild(diff)

  var actions = document.createElement('div')
  actions.className = 'memory-form-actions'

  function makeAction(label, endpoint, tone) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'memory-button' + (tone ? ' memory-button-' + tone : '')
    button.textContent = label
    button.addEventListener('click', function() {
      button.disabled = true
      foundationMutation(endpoint, 'POST', {}).then(function() {
        renderDecisions()
      }).catch(function(error) {
        window.alert(error.message || 'Action failed.')
      }).finally(function() {
        button.disabled = false
      })
    })
    return button
  }

  if (item.status === 'pending' || item.status === 'failed') {
    actions.appendChild(makeAction('Approve', '/api/foundation/doc-updates/' + encodeURIComponent(item.id) + '/approve'))
  }
  if (item.status === 'approved' || item.status === 'failed') {
    actions.appendChild(makeAction('Apply', '/api/foundation/doc-updates/' + encodeURIComponent(item.id) + '/apply'))
  }
  if (item.status !== 'applied' && item.status !== 'rejected') {
    actions.appendChild(makeAction('Reject', '/api/foundation/doc-updates/' + encodeURIComponent(item.id) + '/reject', 'secondary'))
  }

  card.appendChild(actions)
  return card
}

function renderQuestionCreatePanel() {
  var panel = document.createElement('section')
  panel.className = 'panel memory-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Create'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'New Open Question'
  left.appendChild(title)
  header.appendChild(left)
  panel.appendChild(header)

  var form = document.createElement('form')
  form.className = 'memory-form-grid'

  var titleInput = buildInput('text', 'Question title')
  form.appendChild(buildField('Title', titleInput))

  var ownerInput = buildInput('text', 'Owner')
  form.appendChild(buildField('Owner', ownerInput))

  var summaryInput = buildTextarea('What needs an answer?', 4)
  form.appendChild(buildField('Summary', summaryInput))

  var actions = document.createElement('div')
  actions.className = 'memory-form-actions'

  var submit = document.createElement('button')
  submit.type = 'submit'
  submit.className = 'memory-button'
  submit.textContent = 'Create Question'
  actions.appendChild(submit)
  form.appendChild(actions)

  var status = document.createElement('p')
  status.className = 'form-status'
  form.appendChild(status)

  form.addEventListener('submit', function(event) {
    event.preventDefault()
    submit.disabled = true
    setFormStatus(status, 'Creating question…')
    foundationMutation('/api/foundation/questions', 'POST', {
      title: titleInput.value.trim(),
      summary: summaryInput.value.trim(),
      owner: ownerInput.value.trim(),
    }).then(function() {
      form.reset()
      setFormStatus(status, 'Question created.', 'success')
      renderOpenQuestions()
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to create question.', 'error')
    }).finally(function() {
      submit.disabled = false
    })
  })

  panel.appendChild(form)
  return panel
}

function renderQuestionEditor(item) {
  var details = document.createElement('details')
  details.className = 'memory-inline-editor'

  var summary = document.createElement('summary')
  summary.textContent = item.status === 'resolved' ? 'Reopen / Edit' : 'Resolve / Edit'
  details.appendChild(summary)

  var wrap = document.createElement('div')
  wrap.className = 'memory-inline-grid'

  var ownerInput = buildInput('text', 'Owner')
  ownerInput.value = item.owner || ''
  wrap.appendChild(buildField('Owner', ownerInput))

  var summaryInput = buildTextarea('Summary', 4)
  summaryInput.value = item.summary || ''
  wrap.appendChild(buildField('Summary', summaryInput))

  var statusSelect = buildSelect([
    { value: 'open', label: 'open', selected: item.status !== 'resolved' },
    { value: 'resolved', label: 'resolved', selected: item.status === 'resolved' },
  ])
  wrap.appendChild(buildField('Status', statusSelect))

  var resolutionInput = buildTextarea('Resolution note', 3)
  resolutionInput.value = item.resolutionNote || ''
  wrap.appendChild(buildField('Resolution Note', resolutionInput))

  var save = document.createElement('button')
  save.type = 'button'
  save.className = 'memory-button'
  save.textContent = 'Save'
  wrap.appendChild(save)

  var status = document.createElement('p')
  status.className = 'form-status'
  wrap.appendChild(status)

  save.addEventListener('click', function() {
    save.disabled = true
    setFormStatus(status, 'Saving…')
    foundationMutation('/api/foundation/questions/' + encodeURIComponent(item.id), 'PATCH', {
      owner: ownerInput.value.trim(),
      summary: summaryInput.value.trim(),
      status: statusSelect.value,
      resolutionNote: resolutionInput.value.trim(),
    }).then(function() {
      setFormStatus(status, 'Saved.', 'success')
      renderOpenQuestions()
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to save.', 'error')
    }).finally(function() {
      save.disabled = false
    })
  })

  details.appendChild(wrap)
  return details
}

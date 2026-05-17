function formatCurrentStateDate(value) {
  return typeof formatDate === 'function' ? formatDate(value) : new Date(value).toLocaleString()
}

function slugifyCurrentState(value) {
  return typeof slugify === 'function'
    ? slugify(value)
    : String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function renderFoundationSequenceCard(step, index) {
  var article = document.createElement('article')
  article.className = 'foundation-sequence-card'

  var num = document.createElement('div')
  num.className = 'foundation-sequence-num'
  num.textContent = String(index + 1).padStart(2, '0')
  article.appendChild(num)

  var title = document.createElement('h4')
  title.textContent = step.title
  article.appendChild(title)

  var body = document.createElement('p')
  body.textContent = step.body
  article.appendChild(body)

  if (step.href) {
    var actions = document.createElement('div')
    actions.className = 'foundation-shortcut-actions'
    actions.appendChild(createActionLink(step.cta || 'Open', step.href))
    article.appendChild(actions)
  }

  return article
}

function renderCurrentStateLevelCard(item) {
  var article = document.createElement('article')
  article.className = 'section-card current-state-level-card'

  var title = document.createElement('h4')
  title.textContent = item.title
  article.appendChild(title)

  var body = document.createElement('p')
  body.className = 'current-state-card-copy'
  body.textContent = item.body
  article.appendChild(body)

  if (item.note) {
    var note = document.createElement('p')
    note.className = 'current-state-card-note'
    note.textContent = item.note
    article.appendChild(note)
  }

  return article
}

function getCurrentStateSourceHref(sourceId) {
  if (sourceId === 'SRC-STRATEGY-001') return '/foundation#source-docs:SRC-STRATEGY-001'
  if (sourceId === 'SRC-FREEDOM-COMMUNITY-001') return '/foundation#source-sheets:SRC-FREEDOM-COMMUNITY-001'
  if (sourceId === 'SRC-OWNERS-001') return '/foundation#source-sheets:SRC-OWNERS-001'
  if (sourceId === 'SRC-FINANCE-001') return '/foundation#source-sheets:SRC-FINANCE-001'
  if (sourceId === 'SRC-FUB-001') return '/foundation#source-apis:SRC-FUB-001'
  if (sourceId === 'SRC-FREEDOM-BHAG-001') return '/foundation#source-sheets:SRC-FREEDOM-BHAG-001'
  if (sourceId === 'SRC-FREEDOM-ENGINE-001') return '/foundation#source-sheets:SRC-FREEDOM-ENGINE-001'
  return '/foundation#source-overview'
}

function renderCurrentStateSourceStamp(sourceId) {
  if (!sourceId) return null

  var sourceIds = Array.isArray(sourceId) ? sourceId : [sourceId]

  var wrap = document.createElement('div')
  wrap.className = 'current-state-source-stamp'

  var label = document.createElement('span')
  label.className = 'current-state-source-label'
  label.textContent = 'Source ID'
  wrap.appendChild(label)

  sourceIds.forEach(function(id, index) {
    if (index > 0) {
      wrap.appendChild(document.createTextNode(' · '))
    }

    var link = document.createElement('a')
    link.className = 'inline-link'
    link.href = getCurrentStateSourceHref(id)
    link.textContent = id
    wrap.appendChild(link)
  })

  return wrap
}

function buildCurrentStateSourceLinks(sourceId) {
  if (!sourceId) return '—'

  var sourceIds = Array.isArray(sourceId) ? sourceId : [sourceId]
  return sourceIds.map(function(id) {
    return '[' + id + '](' + getCurrentStateSourceHref(id) + ')'
  }).join(' + ')
}

function buildBacklogFocusHref(ids) {
  var list = (ids || []).filter(Boolean)
  if (!list.length) return '/foundation#backlog'
  return '/foundation#backlog:' + list.join(',')
}

function getCurrentStateBacklogItems(hub, ids) {
  if (!hub || !Array.isArray(hub.backlogItems) || !Array.isArray(ids) || !ids.length) return []
  return hub.backlogItems.filter(function(item) {
    return ids.indexOf(item.id) !== -1
  })
}

function getCurrentStateActiveBacklogItems(hub, ids) {
  return getCurrentStateBacklogItems(hub, ids).filter(function(item) {
    return item.lane !== 'done'
  })
}

function renderCurrentStateStatus(statusKey, label) {
  var wrap = document.createElement('span')
  wrap.className = 'current-state-dot current-state-dot-' + statusKey
  wrap.title = label
  wrap.setAttribute('aria-label', label)
  return wrap
}

function renderCurrentStateBacklogCell(hub, ids) {
  var wrap = document.createElement('div')
  wrap.className = 'current-state-backlog'

  var activeItems = getCurrentStateActiveBacklogItems(hub, ids)
  if (!activeItems.length) {
    wrap.textContent = '0 active'
    return wrap
  }

  var link = document.createElement('a')
  link.className = 'inline-link'
  link.href = buildBacklogFocusHref(activeItems.map(function(item) { return item.id }))
  link.textContent = activeItems.length + ' active'
  wrap.appendChild(link)

  var meta = document.createElement('div')
  meta.className = 'current-state-backlog-meta'
  meta.textContent = activeItems.map(function(item) { return item.id }).join(', ')
  wrap.appendChild(meta)

  return wrap
}

function renderCurrentStateCloseoutCard(item, hub) {
  var article = document.createElement('article')
  article.className = 'section-card foundation-closeout-card'

  var top = document.createElement('div')
  top.className = 'foundation-closeout-top'
  top.appendChild(renderCurrentStateStatus(item.statusKey, item.statusLabel))

  var label = document.createElement('div')
  label.className = 'foundation-closeout-label'
  label.textContent = item.label
  top.appendChild(label)
  article.appendChild(top)

  var title = document.createElement('h4')
  title.textContent = item.title
  article.appendChild(title)

  if (item.detail) {
    var detail = document.createElement('p')
    detail.className = 'foundation-closeout-detail'
    detail.textContent = item.detail
    article.appendChild(detail)
  }

  var list = document.createElement('div')
  list.className = 'foundation-closeout-list'

  ;(item.rows || []).forEach(function(row) {
    var rowWrap = document.createElement('div')
    rowWrap.className = 'foundation-closeout-row'

    var rowTitle = document.createElement('div')
    rowTitle.className = 'foundation-closeout-row-title'
    rowTitle.textContent = row.title
    rowWrap.appendChild(rowTitle)

    var rowBody = document.createElement('p')
    rowBody.className = 'foundation-closeout-row-body'
    rowBody.textContent = row.body
    rowWrap.appendChild(rowBody)

    var backlog = renderCurrentStateBacklogCell(hub, row.backlogIds || [])
    backlog.classList.add('foundation-closeout-row-backlog')
    rowWrap.appendChild(backlog)

    list.appendChild(rowWrap)
  })

  article.appendChild(list)
  return article
}

function renderCurrentStateCloseoutBoard(items, hub) {
  if (!items || !items.length) return null

  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')

  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Foundation Reality'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Closed, Partial, And Not Built Yet'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'This is the blunt read. Something is only green if it is actually closed enough for this rebuild pass.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'foundation-closeout-grid'
  items.forEach(function(item) {
    grid.appendChild(renderCurrentStateCloseoutCard(item, hub))
  })
  panel.appendChild(grid)

  return panel
}

function renderCurrentStateInfoList(items) {
  var wrap = document.createElement('div')
  wrap.className = 'current-state-info-list'

  ;(items || []).forEach(function(item) {
    if (!item || !item.label || !item.body) return

    var row = document.createElement('div')
    row.className = 'current-state-info-row'

    var label = document.createElement('span')
    label.className = 'current-state-info-label'
    label.textContent = item.label + ':'
    row.appendChild(label)

    var body = document.createElement('span')
    body.className = 'current-state-info-body'
    body.textContent = item.body
    row.appendChild(body)

    wrap.appendChild(row)
  })

  return wrap
}

function renderCurrentStatePackageParts(parts) {
  if (!parts || !parts.length) return null

  var wrap = document.createElement('div')
  wrap.className = 'current-state-package-parts'

  var label = document.createElement('div')
  label.className = 'current-state-package-label'
  label.textContent = 'Package parts'
  wrap.appendChild(label)

  parts.forEach(function(part) {
    if (!part || !part.sourceId) return

    var row = document.createElement('div')
    row.className = 'current-state-package-row'

    row.appendChild(renderCurrentStateStatus(part.statusKey || 'pending', part.statusLabel || 'Open'))

    var textWrap = document.createElement('div')
    textWrap.className = 'current-state-package-text'

    var top = document.createElement('div')
    top.className = 'current-state-package-top'

    var link = document.createElement('a')
    link.className = 'inline-link'
    link.href = getCurrentStateSourceHref(part.sourceId)
    link.textContent = part.sourceId
    top.appendChild(link)

    var state = document.createElement('span')
    state.className = 'current-state-package-state'
    state.textContent = part.statusLabel || 'Open'
    top.appendChild(state)
    textWrap.appendChild(top)

    if (part.body) {
      var body = document.createElement('div')
      body.className = 'current-state-package-body'
      body.textContent = part.body
      textWrap.appendChild(body)
    }

    if (part.next) {
      var next = document.createElement('div')
      next.className = 'current-state-package-next'
      next.textContent = 'Next: ' + part.next
      textWrap.appendChild(next)
    }

    row.appendChild(textWrap)
    wrap.appendChild(row)
  })

  return wrap
}

function renderCurrentStatePackageDetailTable(parts, claimedFocusIds) {
  var wrap = document.createElement('div')
  wrap.className = 'current-state-detail-wrap'

  var table = document.createElement('table')
  table.className = 'md-table current-state-package-table'

  var colgroup = document.createElement('colgroup')
  ;['25%', '16%', '31%', '28%'].forEach(function(width) {
    var col = document.createElement('col')
    col.style.width = width
    colgroup.appendChild(col)
  })
  table.appendChild(colgroup)

  var thead = document.createElement('thead')
  var headerRow = document.createElement('tr')
  ;['Source', 'State', 'What Exists Now', 'Next'].forEach(function(label) {
    var th = document.createElement('th')
    th.textContent = label
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  ;(parts || []).forEach(function(part) {
    var tr = document.createElement('tr')
    if (part.sourceId && claimedFocusIds && !claimedFocusIds.has(part.sourceId)) {
      tr.id = part.sourceId
      claimedFocusIds.add(part.sourceId)
    }

    var sourceCell = document.createElement('td')
    var sourceLink = document.createElement('a')
    sourceLink.className = 'inline-link'
    sourceLink.href = getCurrentStateSourceHref(part.sourceId)
    sourceLink.textContent = part.sourceId
    sourceCell.appendChild(sourceLink)
    if (part.role) {
      var role = document.createElement('div')
      role.className = 'current-state-package-meta'
      role.textContent = part.role
      sourceCell.appendChild(role)
    }
    tr.appendChild(sourceCell)

    var stateCell = document.createElement('td')
    var stateWrap = document.createElement('div')
    stateWrap.className = 'current-state-package-state-cell'
    stateWrap.appendChild(renderCurrentStateStatus(part.statusKey || 'pending', part.statusLabel || 'Open'))
    var stateText = document.createElement('span')
    stateText.className = 'current-state-package-state'
    stateText.textContent = part.statusLabel || 'Open'
    stateWrap.appendChild(stateText)
    stateCell.appendChild(stateWrap)
    tr.appendChild(stateCell)

    var bodyCell = document.createElement('td')
    bodyCell.className = 'current-state-package-body'
    bodyCell.textContent = part.body || '—'
    tr.appendChild(bodyCell)

    var nextCell = document.createElement('td')
    nextCell.className = 'current-state-package-next'
    nextCell.textContent = part.next || '—'
    tr.appendChild(nextCell)

    tbody.appendChild(tr)
  })

  table.appendChild(tbody)
  wrap.appendChild(table)
  return wrap
}

function renderCurrentStateSurfaceTable(rows) {
  var wrap = document.createElement('div')
  wrap.className = 'md-table-wrap'
  var focusId = getSectionFocus()
  var focusSlug = focusId ? slugifyCurrentState(focusId) : ''
  var claimedFocusIds = new Set()

  function rowMatchesFocus(row) {
    if (!focusId) return false
    var identifiers = [
      row.title,
      'current-state-surface-' + slugifyCurrentState(row.title || ''),
    ]
    if (Array.isArray(row.sourceId)) {
      identifiers = identifiers.concat(row.sourceId)
    } else if (row.sourceId) {
      identifiers.push(row.sourceId)
    }
    ;(row.packageParts || []).forEach(function(part) {
      if (part.sourceId) identifiers.push(part.sourceId)
      if (part.role) identifiers.push(part.role)
    })
    return identifiers.some(function(identifier) {
      var value = String(identifier || '')
      return value === focusId || slugifyCurrentState(value) === focusSlug
    })
  }

  var table = document.createElement('table')
  table.className = 'md-table current-state-master-table'

  var colgroup = document.createElement('colgroup')
  ;['26%', '34%', '22%', '18%'].forEach(function(width) {
    var col = document.createElement('col')
    col.style.width = width
    colgroup.appendChild(col)
  })
  table.appendChild(colgroup)

  var thead = document.createElement('thead')
  var headRow = document.createElement('tr')
  ;['Area', 'What Exists Now', 'Next Level / Closeout', 'Later / Not A Blocker'].forEach(function(label) {
    var th = document.createElement('th')
    th.textContent = label
    headRow.appendChild(th)
  })
  thead.appendChild(headRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')

  function getSourceToggleText(count, shouldOpen) {
    var label = count + ' source' + (count === 1 ? '' : 's')
    return label + ' - ' + (shouldOpen ? 'click to collapse' : 'click to expand')
  }

  rows.forEach(function(row) {
    var hasParts = Array.isArray(row.packageParts) && row.packageParts.length
    var shouldOpen = hasParts && rowMatchesFocus(row)
    var summaryRow = document.createElement('tr')
    summaryRow.className = 'current-state-master-row' + (hasParts ? ' current-state-master-row-expandable' : '')
    summaryRow.id = 'current-state-surface-' + slugifyCurrentState(row.title || '')

    var detailRow = null

    var surfaceCell = document.createElement('td')
    var surfaceTop = document.createElement('div')
    surfaceTop.className = 'current-state-surface-top'
    surfaceTop.appendChild(renderCurrentStateStatus(row.statusKey, row.statusLabel))

    var surfaceTitle = document.createElement('div')
    surfaceTitle.className = 'current-state-surface-title'
    surfaceTitle.textContent = row.title
    surfaceTop.appendChild(surfaceTitle)
    surfaceCell.appendChild(surfaceTop)

    if (row.surfaceType) {
      var surfaceType = document.createElement('div')
      surfaceType.className = 'current-state-surface-kind'
      surfaceType.textContent = row.surfaceType
      surfaceCell.appendChild(surfaceType)
    }

    if (row.statusLabel) {
      var statusText = document.createElement('div')
      statusText.className = 'current-state-surface-status-label'
      statusText.textContent = row.statusLabel
      surfaceCell.appendChild(statusText)
    }

    if (row.levelLabel) {
      var levelText = document.createElement('div')
      levelText.className = 'current-state-surface-level'
      levelText.textContent = row.levelLabel
      surfaceCell.appendChild(levelText)
    }

    if (hasParts) {
      var toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.className = 'current-state-expand-button'
      toggle.textContent = getSourceToggleText(row.packageParts.length || 0, shouldOpen)
      toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false')
      surfaceCell.appendChild(toggle)

      detailRow = document.createElement('tr')
      detailRow.className = 'current-state-master-detail-row'
      if (!shouldOpen) detailRow.hidden = true

      var detailCell = document.createElement('td')
      detailCell.colSpan = 4
      detailCell.appendChild(renderCurrentStatePackageDetailTable(row.packageParts, claimedFocusIds))
      detailRow.appendChild(detailCell)

      function toggleDetailRow() {
        var isOpen = !detailRow.hidden
        detailRow.hidden = isOpen
        toggle.textContent = getSourceToggleText(row.packageParts.length || 0, !isOpen)
        toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true')
      }

      toggle.addEventListener('click', function(event) {
        event.stopPropagation()
        toggleDetailRow()
      })

      summaryRow.addEventListener('click', function(event) {
        var interactive = event.target.closest('a, button, input, textarea, select, summary, [role="button"]')
        if (interactive) return
        toggleDetailRow()
      })
    }
    summaryRow.appendChild(surfaceCell)

    var currentCell = document.createElement('td')
    currentCell.className = 'current-state-table-copy'
    currentCell.textContent = row.current || row.currentSummary || ''
    summaryRow.appendChild(currentCell)

    var nextCell = document.createElement('td')
    nextCell.className = 'current-state-table-copy'
    nextCell.textContent = row.next || ''
    summaryRow.appendChild(nextCell)

    var laterCell = document.createElement('td')
    laterCell.className = 'current-state-table-copy'
    laterCell.textContent = row.later || ''
    summaryRow.appendChild(laterCell)

    tbody.appendChild(summaryRow)
    if (detailRow) tbody.appendChild(detailRow)
  })

  table.appendChild(tbody)
  wrap.appendChild(table)
  return wrap
}

function renderCurrentStateLevelGuide(currentPath) {
  return renderTable([
    '| Level | Name | What advances |',
    '| --- | --- | --- |',
    '| Level 1 | Connected | AIOS can reach and read the source. |',
    '| Level 2 | Trusted | The trusted unit, fields, and meaning are signed off. |',
    '| Level 3 | Monitored | Refresh, freshness, stale state, and drift are visible. |',
    '| Level 4 | Extracted | Content is filed as governed artifacts/atoms with provenance. |',
    '| Level 5 | Synthesized | Evidence becomes useful source-backed intelligence. |',
    '| Level 6 | Routed | Intelligence becomes owner-bound decisions, tasks, questions, contradictions, or actions. |',
    '| Level 7 | Governed Apply | Approved writes or workflow changes can happen safely and audibly. |',
    '| Level 8 | Closed Loop | Resolution is captured; stale findings stop reappearing; history stays intact. |',
  ], currentPath)
}

function getPhaseGCard(hub, cardId) {
  return ((hub && hub.backlogItems) || []).find(function(item) {
    return item.id === cardId
  }) || null
}

function getPhaseGNextCard(hub) {
  var cards = phaseGOperatorOrder.map(function(cardId) {
    return getPhaseGCard(hub, cardId)
  }).filter(Boolean)
  return cards.find(function(card) {
    return card.lane !== 'done'
  }) || cards[cards.length - 1] || null
}

function getPhaseGFollowingCard(hub, cardId) {
  var index = phaseGOperatorOrder.indexOf(cardId)
  if (index === -1) return null
  for (var i = index + 1; i < phaseGOperatorOrder.length; i += 1) {
    var card = getPhaseGCard(hub, phaseGOperatorOrder[i])
    if (card && card.lane !== 'done') return card
  }
  return null
}

function getCurrentSprintStageItems(currentSprint, stageKey) {
  var stages = (currentSprint && currentSprint.stages) || []
  var stage = stages.find(function(item) {
    return item.key === stageKey
  })
  return stage && Array.isArray(stage.items) ? stage.items : []
}

function renderFoundationCurrentTruthPanel(hub) {
  var currentSprint = hub && hub.currentSprint
  var activeBlocker = currentSprint && currentSprint.activeBlocker
  var summary = (currentSprint && currentSprint.summary) || {}
  var buildingNow = getCurrentSprintStageItems(currentSprint, 'building_now')
  var sprintReady = getCurrentSprintStageItems(currentSprint, 'sprint_ready')
  var returned = getCurrentSprintStageItems(currentSprint, 'returned')
  var activeCard = buildingNow[0] || sprintReady[0] || returned[0] || null
  var activeCardId = (activeCard && activeCard.cardId) || (activeBlocker && activeBlocker.cardId) || ''
  var activeCardTitle = (activeCard && activeCard.title) || (activeBlocker && activeBlocker.title) || 'No active blocker resolved from live backlog.'

  var items = [
    {
      label: 'Current sprint',
      status: currentSprint && currentSprint.status === 'healthy' ? 'connected' : 'risk',
      detail: (currentSprint && currentSprint.goal) || 'No active Current Sprint overlay is available.',
    },
    {
      label: 'Current card',
      status: activeCardId ? 'pending' : 'risk',
      detail: activeCardId ? activeCardId + ' - ' + activeCardTitle : activeCardTitle,
    },
  ]
  if (Number(summary.doneThisSprintCount || 0) > 0) {
    items.push({
      label: 'Done this sprint',
      status: Number(summary.doneThisSprintCount || 0) > 0 ? 'connected' : 'planned',
      detail: String(summary.doneThisSprintCount || 0) + ' card(s) completed inside this sprint. Older done cards live in Recent Work below.',
    })
  }
  items.push(
    {
      label: 'Safety rule',
      status: 'connected',
      detail: 'Sprint Ready requires existing code, docs, scripts, doctrine, exact gap, proof commands, and not-next boundaries before build.',
    },
  )

  var panel = renderOverviewStatusPanel(items, {
    eyebrow: 'Current Truth',
    title: 'What to work on next',
    intro: 'This is the first check before clicking deeper pages. The live Backlog stays task truth; this panel shows the active Current Sprint move.',
  })

  if (!panel) return panel

  var actions = document.createElement('div')
  actions.className = 'doc-source-actions'
  if (activeCardId) {
    actions.appendChild(createActionLink('Open Current Card', '/foundation#backlog:' + encodeURIComponent(activeCardId), 'doc-source-link'))
  }
  actions.appendChild(createActionLink('Open Recent Work', '/foundation#build-log', 'doc-source-link'))
  actions.appendChild(createActionLink('Open Current Sprint', '/foundation#build-log', 'doc-source-link'))
  panel.appendChild(actions)
  return panel
}

function renderFoundationExecutionOrderPanel(currentPath) {
  var nextPanel = document.createElement('section')
  nextPanel.className = 'panel'
  var nextHeader = document.createElement('div')
  nextHeader.className = 'panel-header'
  var nextLeft = document.createElement('div')
  var nextEyebrow = document.createElement('div')
  nextEyebrow.className = 'eyebrow'
  nextEyebrow.textContent = 'Next'
  nextLeft.appendChild(nextEyebrow)
  var nextTitle = document.createElement('h3')
  nextTitle.textContent = 'Foundation Execution Order'
  nextLeft.appendChild(nextTitle)
  var nextIntro = document.createElement('p')
  nextIntro.className = 'section-intro'
  nextIntro.textContent = 'Start here when deciding what to work on next. This is the command order; the live Backlog is task truth, and the Rebuild Plan explains doctrine and phase gates.'
  nextLeft.appendChild(nextIntro)
  nextHeader.appendChild(nextLeft)
  nextPanel.appendChild(nextHeader)

  nextPanel.appendChild(renderTable([
    '| Order | Work | Why it is next |',
    '| --- | --- | --- |',
    '| 1 | Keep source truth clean | Closed source packages stay closed unless new evidence proves drift. New questions route to Data Sources or Backlog. |',
    '| 2 | Monitor capture and extraction | Current-day and history missions should keep filing source-backed artifacts, candidates, skip reasons, and run evidence. |',
    '| 3 | Harden missing corpus lanes | Build the next Drive, email, video, browser, Mycro, Skool, Loom, Zoom, vision-OCR, Slides, Sheets, and Office extraction slices in governed bites. |',
    '| 4 | Add freshness and health checks | KPI, finance, Drive/video corpus, connectors, schema drift, and extraction queues need visible Level 3 health before hubs depend on them continuously. |',
    '| 5 | Close the action loop | Level 6-8 work: Action Router, approval-gated writeback, resolution awareness, temporal truth, and richer provenance make Foundation more than a reading layer. |',
  ], currentPath))

  return nextPanel
}

function renderCurrentStateSurfaceCard(item) {
  var article = document.createElement('article')
  article.className = 'section-card current-state-surface-card'

  var title = document.createElement('h4')
  title.textContent = item.title
  article.appendChild(title)

  var stamp = renderCurrentStateSourceStamp(item.sourceId)
  if (stamp) article.appendChild(stamp)

  article.appendChild(renderLabeledCopy('current-state-card-copy', 'Current', item.current))
  article.appendChild(renderLabeledCopy('current-state-card-copy', 'Target now', item.target))
  article.appendChild(renderLabeledCopy('current-state-card-copy', 'Later', item.later))

  if (item.href) {
    var actions = document.createElement('div')
    actions.className = 'foundation-shortcut-actions'
    actions.appendChild(createActionLink(item.cta || 'Open', item.href))
    article.appendChild(actions)
  }

  return article
}

function renderCurrentStateSimpleCard(item) {
  var article = document.createElement('article')
  article.className = 'section-card current-state-simple-card'

  var title = document.createElement('h4')
  title.textContent = item.title
  article.appendChild(title)

  var stamp = renderCurrentStateSourceStamp(item.sourceId)
  if (stamp) article.appendChild(stamp)

  var body = document.createElement('p')
  body.className = 'current-state-card-copy'
  body.textContent = item.body
  article.appendChild(body)

  if (item.href) {
    var actions = document.createElement('div')
    actions.className = 'foundation-shortcut-actions'
    actions.appendChild(createActionLink(item.cta || 'Open', item.href))
    article.appendChild(actions)
  }

  return article
}

function summarizeStructureWorkbooks(structureStatus) {
  if (!structureStatus || !structureStatus.workbooks || !structureStatus.workbooks.length) {
    return 'Structure watch is not readable yet.'
  }

  var drifted = structureStatus.workbooks.filter(function(workbook) {
    return workbook.status !== 'ok'
  })
  if (!drifted.length) {
    return structureStatus.workbooks.map(function(workbook) {
      return workbook.label
    }).join(', ') + ' all match the current baseline.'
  }

  return drifted.map(function(workbook) {
    return workbook.label + ' (' + workbook.failedChecks + ' drift check' + (workbook.failedChecks === 1 ? '' : 's') + ')'
  }).join(' · ') + ' need review.'
}

function renderCurrentStateChangeWatchPanel(hub, structureStatus) {
  var decisionBacklogIds = ['DECISION-001', 'DECISION-002', 'DECISION-003', 'DECISION-005', 'MEMORY-005']
  var decisionReview = getDecisionReviewSnapshot(hub)
  var pendingStrategyUpdates = (hub.pendingDocUpdates || []).filter(function(item) {
    return item.status === 'pending' && isStrategyPacketDocPath(item.targetDocPath)
  })
  var appliedStrategyUpdates = (hub.pendingDocUpdates || []).filter(function(item) {
    return item.status === 'applied' && isStrategyPacketDocPath(item.targetDocPath)
  })
  var decisions = hub.decisions || []
  var lockedDecisions = decisions.filter(function(item) { return item.status === 'locked' }).length
  var proposedDecisions = decisions.filter(function(item) { return item.status === 'proposed' }).length
  var supersededDecisions = decisions.filter(function(item) { return item.status === 'superseded' }).length
  var relatedDecisions = decisions.filter(function(item) {
    return Array.isArray(item.supersedesIds) && item.supersedesIds.length
  }).length

  var panel = renderOverviewStatusPanel([
    {
      label: 'Strategy doc watch',
      status: pendingStrategyUpdates.length ? 'pending' : 'connected',
      detail: pendingStrategyUpdates.length
        ? pendingStrategyUpdates.length + ' strategy doc proposal' + (pendingStrategyUpdates.length === 1 ? '' : 's') + ' still need review. ' + appliedStrategyUpdates.length + ' applied update' + (appliedStrategyUpdates.length === 1 ? '' : 's') + ' are already visible in history.'
        : 'No open strategy doc proposals right now. ' + appliedStrategyUpdates.length + ' applied update' + (appliedStrategyUpdates.length === 1 ? '' : 's') + ' are already visible in history.',
    },
    {
      label: 'Sheet structure watch',
      status: structureStatus && structureStatus.status === 'ok' ? 'connected' : 'pending',
      detail: summarizeStructureWorkbooks(structureStatus),
    },
    {
      label: 'Decision cleanup watch',
      status: decisionReview.total ? 'pending' : 'connected',
      detail: 'Decision log is live (' + lockedDecisions + ' locked, ' + proposedDecisions + ' proposed, ' + supersededDecisions + ' superseded, ' + relatedDecisions + ' linked). Current review items: ' + decisionReview.total + '. The first contradiction queue is live. Deeper relationship cleanup, provenance, and temporal truth are still backlog work.',
    },
  ], {
    eyebrow: 'Change Infrastructure',
    title: 'Early drift guards',
    intro: 'These first-pass guards make strategy doc proposals, sheet structure drift, and decision cleanup visible. They are useful, but they are not the full Foundation closeout gate.',
  })

  if (!panel) return null

  var actions = document.createElement('div')
  actions.className = 'doc-source-actions'
  ;[
    { href: '/foundation#decisions', label: 'Open Decisions' },
    { href: '/foundation#source-overview', label: 'Open Data Sources' },
    { href: '/foundation#rebuild-plan', label: 'Open Rebuild Plan' },
  ].forEach(function(action) {
    var link = document.createElement('a')
    link.className = 'doc-source-link'
    link.href = action.href
    link.textContent = action.label
    actions.appendChild(link)
  })
  panel.appendChild(actions)

  var relatedBacklogItems = (hub.backlogItems || []).filter(function(item) {
    return decisionBacklogIds.indexOf(item.id) !== -1
  })

  if (relatedBacklogItems.length) {
    var queue = document.createElement('details')
    queue.className = 'decision-stack'

    var summary = document.createElement('summary')
    summary.className = 'decision-stack-summary decision-stack-summary-history'

    var summaryLeft = document.createElement('div')
    summaryLeft.className = 'decision-stack-summary-left'

    var title = document.createElement('div')
    title.className = 'decision-stack-title'
    title.textContent = 'Related Decision Cleanup Backlog'
    summaryLeft.appendChild(title)

    var intro = document.createElement('div')
    intro.className = 'decision-stack-intro'
    intro.textContent = 'These are support cards behind traceability, contradiction cleanup, provenance, and temporal truth. Done cards are shown as proof, not do-now work.'
    summaryLeft.appendChild(intro)

    summary.appendChild(summaryLeft)

    var count = document.createElement('span')
    count.className = 'decision-stack-count'
    count.textContent = relatedBacklogItems.length
    summary.appendChild(count)

    queue.appendChild(summary)

    var body = document.createElement('div')
    body.className = 'decision-stack-body'
    sortBacklogItems(relatedBacklogItems).forEach(function(item) {
      body.appendChild(renderBacklogAccordionItem(item))
    })
    queue.appendChild(body)
    panel.appendChild(queue)
  }

  return panel
}

function renderOwnersReviewQueuePanel(payload) {
  var queue = payload && payload.reviewQueue ? payload.reviewQueue : null
  if (!queue) return null
  function freshnessStatusToCardStatus(freshness) {
    var status = freshness && freshness.status ? freshness.status : 'clear'
    if (status === 'stale' || status === 'missing') return 'risk'
    if (status === 'warning') return 'pending'
    return 'connected'
  }
  function shorten(text, max) {
    var value = String(text || '').trim()
    if (!value) return 'Review item is open.'
    if (value.length <= max) return value
    return value.slice(0, max - 1).trim() + '…'
  }

  var panel = renderOverviewStatusPanel([
    {
      label: 'Open items',
      status: queue.stats && queue.stats.openItems ? 'pending' : 'connected',
      detail: (queue.stats && queue.stats.openItems ? queue.stats.openItems : 0) + ' Owners review item' + ((queue.stats && queue.stats.openItems) === 1 ? '' : 's') + ' are still open.',
    },
    {
      label: 'Queued now',
      status: queue.stats && queue.stats.queuedReview ? 'pending' : 'connected',
      detail: (queue.stats && queue.stats.queuedReview ? queue.stats.queuedReview : 0) + ' row-specific re-review trigger' + ((queue.stats && queue.stats.queuedReview) === 1 ? '' : 's') + ' are waiting right now.',
    },
    {
      label: 'Needs fixing',
      status: queue.stats && queue.stats.needsFixing ? 'pending' : 'connected',
      detail: (queue.stats && queue.stats.needsFixing ? queue.stats.needsFixing : 0) + ' item' + ((queue.stats && queue.stats.needsFixing) === 1 ? '' : 's') + ' still need source fixes before re-review.',
    },
    {
      label: 'Queue freshness',
      status: freshnessStatusToCardStatus(queue.freshness),
      detail: queue.freshness
        ? queue.freshness.label + (queue.freshness.reason ? ' · ' + queue.freshness.reason : '')
        : 'Freshness rules are loading.',
    },
  ], {
    eyebrow: 'Owners Review Queue',
    title: 'One Inbox For Owners Review Work',
    intro: 'This is the live governed queue behind the temporary Admin and Conditional sheet lanes.',
  })

  if (!panel) return null

  var actions = document.createElement('div')
  actions.className = 'doc-source-actions'
  ;[
    { href: getCurrentStateSourceHref('SRC-OWNERS-001'), label: 'Open Owners source' },
    { href: getCurrentStateSourceHref('SRC-FUB-001'), label: 'Open FUB source' },
    { href: '/foundation#rebuild-plan', label: 'Open Rebuild Plan' },
  ].forEach(function(action) {
    var link = document.createElement('a')
    link.className = 'doc-source-link'
    link.href = action.href
    link.textContent = action.label
    actions.appendChild(link)
  })
  panel.appendChild(actions)

  var sections = queue.sections || {}
  var cards = []

  if (sections.admin) {
    cards.push({
      title: 'Admin deal lane',
      body: (sections.admin.openItems || 0) + ' open item' + ((sections.admin.openItems || 0) === 1 ? '' : 's') + '. ' +
        (sections.admin.queuedReview || 0) + ' queued. ' +
        (sections.admin.needsFixing || 0) + ' need fixing. Freshness: ' + ((sections.admin.freshness && sections.admin.freshness.label) || 'Clear') + '.',
      meta: 'Firm / exception rows in CC:CE',
      href: getCurrentStateSourceHref('SRC-OWNERS-001'),
      cta: 'Open Owners source',
    })
  }

  if (sections.conditional) {
    cards.push({
      title: 'Conditional lane',
      body: (sections.conditional.openItems || 0) + ' open item' + ((sections.conditional.openItems || 0) === 1 ? '' : 's') + '. ' +
        (sections.conditional.queuedReview || 0) + ' queued. ' +
        (sections.conditional.needsFixing || 0) + ' need fixing. Freshness: ' + ((sections.conditional.freshness && sections.conditional.freshness.label) || 'Clear') + '.',
      meta: 'Conditional rows in Q:U',
      href: getCurrentStateSourceHref('SRC-OWNERS-001'),
      cta: 'Open Owners source',
    })
  }

  if (sections.fubDrift) {
    cards.push({
      title: 'FUB drift lane',
      body: (sections.fubDrift.openItems || 0) + ' open item' + ((sections.fubDrift.openItems || 0) === 1 ? '' : 's') + '. ' +
        (sections.fubDrift.queuedReview || 0) + ' queued. ' +
        (sections.fubDrift.needsFixing || 0) + ' need fixing. Freshness: ' + ((sections.fubDrift.freshness && sections.fubDrift.freshness.label) || 'Clear') + '.',
      meta: 'Governed FUB taxonomy drift',
      href: getCurrentStateSourceHref('SRC-FUB-001'),
      cta: 'Open FUB source',
    })
  }

  if (sections.ownersGovernance) {
    cards.push({
      title: 'Owners governance lane',
      body: (sections.ownersGovernance.openItems || 0) + ' open item' + ((sections.ownersGovernance.openItems || 0) === 1 ? '' : 's') + '. ' +
        (sections.ownersGovernance.queuedReview || 0) + ' queued. ' +
        (sections.ownersGovernance.needsFixing || 0) + ' need fixing. Freshness: ' + ((sections.ownersGovernance.freshness && sections.ownersGovernance.freshness.label) || 'Clear') + '.',
      meta: 'Governed Owners dropdown drift',
      href: getCurrentStateSourceHref('SRC-OWNERS-001'),
      cta: 'Open Owners source',
    })
  }

  var sampleItems = []
  ;['admin', 'conditional', 'fubDrift', 'ownersGovernance'].forEach(function(key) {
    var items = sections[key] && Array.isArray(sections[key].items) ? sections[key].items : []
    items.slice(0, key === 'admin' ? 3 : 2).forEach(function(item) {
      var href = key === 'fubDrift' ? getCurrentStateSourceHref('SRC-FUB-001') : getCurrentStateSourceHref('SRC-OWNERS-001')
      var cta = key === 'fubDrift' ? 'Open FUB source' : 'Open Owners source'
      sampleItems.push({
        title: item.title,
        body: shorten(item.findingsPreview, 220),
        meta: item.owner + ' · ' + (item.reviewStatus || 'Not Reviewed'),
        href: href,
        cta: cta,
      })
    })
  })

  var grid = document.createElement('div')
  grid.className = 'foundation-shortcut-grid owners-review-queue-grid'
  cards.concat(sampleItems).forEach(function(item) {
    grid.appendChild(renderFoundationShortcutCard(item))
  })
  panel.appendChild(grid)

  return panel
}

function getCurrentStateSurfaceRowsFromPayload(hub) {
  var summary = hub && hub.currentStateSummary
  if (!summary || !Array.isArray(summary.surfaceRows)) return []
  return summary.surfaceRows
}

function renderCurrentStateMissingSummaryPanel() {
  var wrap = document.createElement('div')
  wrap.className = 'notice notice-warning'

  var title = document.createElement('strong')
  title.textContent = 'Current State summary payload unavailable.'
  wrap.appendChild(title)

  var body = document.createElement('p')
  body.textContent = 'Foundation Overview is not showing stale static readiness claims. Check /api/foundation-hub currentStateSummary before trusting this section.'
  wrap.appendChild(body)

  return wrap
}

function renderCurrentState() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading current state.</p>'

  Promise.all([
    fetchDoc('docs/rebuild/current-state.md'),
    fetchFoundationHub(),
    fetchSheetStructureStatus().catch(function() { return null }),
  ]).then(function(results) {
    var doc = results[0]
    var hub = results[1]
    var currentPath = 'docs/rebuild/current-state.md'
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Foundation Overview'
    heroInner.appendChild(heroTitle)

    var heroCopy = document.createElement('p')
    heroCopy.className = 'hero-copy'
    heroCopy.textContent = 'Foundation operating view: trusted sources, capture and extraction systems, governance gaps, and where unresolved work belongs.'
    heroInner.appendChild(heroCopy)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = 'Updated ' + formatCurrentStateDate(doc.meta.updatedAt)
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)

    container.appendChild(hero)

    container.appendChild(renderFoundationCurrentTruthPanel(hub))
    container.appendChild(renderFoundationExecutionOrderPanel(currentPath))

    var surfacesPanel = document.createElement('section')
    surfacesPanel.className = 'panel'
    var surfacesHeader = document.createElement('div')
    surfacesHeader.className = 'panel-header'
    var surfacesLeft = document.createElement('div')
    var surfacesEyebrow = document.createElement('div')
    surfacesEyebrow.className = 'eyebrow'
    surfacesEyebrow.textContent = 'Foundation Systems'
    surfacesLeft.appendChild(surfacesEyebrow)
    var surfacesTitle = document.createElement('h3')
    surfacesTitle.textContent = 'System Maturity'
    surfacesLeft.appendChild(surfacesTitle)
    var surfacesIntro = document.createElement('p')
    surfacesIntro.className = 'section-intro'
    surfacesIntro.textContent = 'This is the one system-status view. It shows each Foundation system or source package, its proven level, what can be trusted now, and what must happen before the next level. Runtime Health is the job/debug page; Backlog is the build queue.'
    surfacesLeft.appendChild(surfacesIntro)
    surfacesHeader.appendChild(surfacesLeft)
    surfacesPanel.appendChild(surfacesHeader)

    var levelGuide = document.createElement('details')
    levelGuide.className = 'current-state-level-guide'
    var levelGuideSummary = document.createElement('summary')
    levelGuideSummary.textContent = 'Show maturity level key'
    levelGuide.appendChild(levelGuideSummary)
    var levelGuideIntro = document.createElement('p')
    levelGuideIntro.className = 'section-intro'
    levelGuideIntro.textContent = 'The level shown on each row is the highest capability proven for that area. Human-led strategy can use Level 2 with caveats; always-on read hubs should depend on Level 3; operational inboxes need Level 6; AIOS source changes need Level 7; true Foundation closure is Level 8.'
    levelGuide.appendChild(levelGuideIntro)
    levelGuide.appendChild(renderCurrentStateLevelGuide(currentPath))
    surfacesPanel.appendChild(levelGuide)

    var legend = document.createElement('div')
    legend.className = 'current-state-legend'
    ;[
      { key: 'connected', label: 'Ready' },
      { key: 'pending', label: 'Open now' },
      { key: 'planned', label: 'Later' },
    ].forEach(function(item) {
      var chip = document.createElement('div')
      chip.className = 'current-state-legend-chip'
      chip.appendChild(renderCurrentStateStatus(item.key, item.label))

      var label = document.createElement('span')
      label.textContent = item.label
      chip.appendChild(label)
      legend.appendChild(chip)
    })
    surfacesPanel.appendChild(legend)

    var surfaceRows = getCurrentStateSurfaceRowsFromPayload(hub)
    if (surfaceRows.length) {
      surfacesPanel.appendChild(renderCurrentStateSurfaceTable(surfaceRows))
    } else {
      surfacesPanel.appendChild(renderCurrentStateMissingSummaryPanel())
    }
    container.appendChild(surfacesPanel)

    var workPanel = document.createElement('section')
    workPanel.className = 'panel'
    var workHeader = document.createElement('div')
    workHeader.className = 'panel-header'
    var workLeft = document.createElement('div')
    var workEyebrow = document.createElement('div')
    workEyebrow.className = 'eyebrow'
    workEyebrow.textContent = 'Operational Work'
    workLeft.appendChild(workEyebrow)
    var workTitle = document.createElement('h3')
    workTitle.textContent = 'Live Inboxes Are Separate'
    workLeft.appendChild(workTitle)
    var workIntro = document.createElement('p')
    workIntro.className = 'section-intro'
    workIntro.textContent = 'Foundation Overview is for status and closeout clarity. Live cleanup cards and build work belong in their own hubs.'
    workLeft.appendChild(workIntro)
    workHeader.appendChild(workLeft)
    workPanel.appendChild(workHeader)

    workPanel.appendChild(renderTable([
      '| Inbox | Use it for | Open |',
      '| --- | --- | --- |',
      '| Ops Hub | Admin, Conditional, FUB drift, People, and re-review cleanup cards. | [Open Ops Hub](/ops) |',
      '| Foundation Backlog | Scoped build work such as GOD-mode extraction, KPI health, action routing, and source hardening. | [Open Backlog](/foundation#backlog) |',
      '| Data Sources | Source contracts, connection proof, status, and source notes. | [Open Data Sources](/foundation#source-overview) |',
    ], currentPath))
    container.appendChild(workPanel)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Current State could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

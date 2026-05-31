// Foundation Source Lifecycle renderers.
// Loaded after foundation.js so shared source helpers remain available as browser globals.

function sourceLifecycleTone(value) {
  var normalized = String(value || '').toLowerCase()
  if (normalized === 'active' || normalized === 'extracted' || normalized === 'reviewed' || normalized === 'yes') return 'connected'
  if (normalized === 'connected' || normalized === 'verified' || normalized === 'visible') return 'planned'
  if (normalized.indexOf('park') !== -1 || normalized.indexOf('block') !== -1 || normalized.indexOf('pause') !== -1 || normalized === 'needs-review') return 'pending'
  if (normalized === 'no' || normalized === 'missing') return 'missing'
  return 'neutral'
}

function renderSourceLifecycleHero(lifecycle) {
  var summary = lifecycle.summary || {}
  var hero = document.createElement('section')
  hero.className = 'hero source-lifecycle-hero'
  hero.setAttribute('data-source-lifecycle-section', 'hero')

  var heroInner = document.createElement('div')
  heroInner.className = 'hero-inner'

  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Source Control'
  heroInner.appendChild(eyebrow)

  var title = document.createElement('h1')
  title.textContent = 'Source Lifecycle'
  heroInner.appendChild(title)

  var meta = document.createElement('p')
  meta.className = 'hero-copy'
  meta.textContent = [
    (summary.sourceContractCount || 0) + ' source contracts',
    (summary.extractionTargetCount || 0) + ' extraction targets',
    (summary.parkedOrBlockedVisible || 0) + ' parked or blocked signals visible',
  ].join(' · ')
  heroInner.appendChild(meta)

  var note = document.createElement('p')
  note.className = 'hero-copy'
  note.textContent = 'This view shows whether each source lane is connected, verified, extracted, reviewed, retried, or parked. It does not start new ingestion.'
  heroInner.appendChild(note)

  hero.appendChild(heroInner)
  return hero
}

function renderSourceLifecycleSummary(lifecycle) {
  var summary = lifecycle.summary || {}
  return renderOverviewStatusPanel([
    {
      label: 'Source contracts',
      status: summary.allSourceContractsCovered ? 'connected' : 'risk',
      detail: (summary.sourceContractCount || 0) + ' contracts covered from source truth. Required minimum is 35.',
    },
    {
      label: 'Extraction targets',
      status: summary.allExtractionTargetsCovered ? 'connected' : 'risk',
      detail: (summary.extractionTargetCount || 0) + ' governed targets visible. Required count is 12.',
    },
    {
      label: 'Caps and schedules',
      status: summary.extractionCapsUnchanged ? 'connected' : 'risk',
      detail: summary.extractionCapsUnchanged
        ? 'Budgets, schedules, and target states match the approved baseline.'
        : (summary.targetBaselineChanges || 0) + ' target baseline change(s) need review.',
    },
    {
      label: 'Parked lanes',
      status: summary.parkedOrBlockedVisible > 0 ? 'pending' : 'risk',
      detail: (summary.parkedOrBlockedVisible || 0) + ' parked, blocked, planned, or paused signals are visible instead of hidden.',
    },
  ], {
    eyebrow: 'Lifecycle Proof',
    title: 'Control status',
    intro: 'These checks prove this is a visibility layer over existing source contracts and extraction control, not a new ingestion lane.',
  })
}

function renderFoundationUiCompletePanel(scan) {
  if (!scan || !scan.summary || !Array.isArray(scan.sections)) return null
  var summary = scan.summary || {}
  var panel = document.createElement('section')
  panel.className = 'panel foundation-ui-complete-panel'
  panel.setAttribute('data-source-lifecycle-section', 'foundation-ui-complete')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Foundation 30-Second Read'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Foundation depth status'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = (summary.sourceCount || 0) + ' sources, '
    + (summary.sourceGapCount || 0) + ' source maturity gaps, '
    + (summary.extractionGapCount || 0) + ' extraction attention rows, '
    + (summary.avatarCount || 0) + ' avatars, '
    + (summary.brandCount || 0) + ' brands, '
    + (summary.verificationCandidateCount || 0) + ' stale-review candidates, '
    + (summary.restrictedDecisionCount || 0) + ' restricted decisions.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag(scan.status || 'unknown', scan.status === 'healthy' ? 'connected' : 'missing'))
  right.appendChild(renderSourceTag((summary.reviewSectionCount || 0) + ' review sections', summary.reviewSectionCount ? 'pending' : 'connected'))
  right.appendChild(renderSourceTag((summary.riskSectionCount || 0) + ' risk sections', summary.riskSectionCount ? 'missing' : 'connected'))
  right.appendChild(renderSourceTag(summary.sprintComplete ? 'sprint complete' : 'sprint open', summary.sprintComplete ? 'connected' : 'pending'))
  header.appendChild(right)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'foundation-ui-complete-grid'
  scan.sections.forEach(function(section) {
    var article = document.createElement('article')
    article.className = 'foundation-ui-complete-card foundation-ui-complete-card-' + (section.tone || 'neutral')
    article.setAttribute('data-foundation-ui-complete-section', section.id)

    var top = document.createElement('div')
    top.className = 'source-lifecycle-card-top'
    var name = document.createElement('h4')
    name.textContent = section.label
    top.appendChild(name)
    top.appendChild(renderSourceTag(section.status || 'visible', section.tone || 'neutral'))
    article.appendChild(top)

    var metric = document.createElement('p')
    metric.className = 'foundation-ui-complete-metric'
    metric.textContent = section.metric || 'Visible'
    article.appendChild(metric)

    var detail = document.createElement('p')
    detail.textContent = section.detail || ''
    article.appendChild(detail)

    var action = document.createElement('p')
    action.className = 'source-lifecycle-small'
    action.textContent = section.nextAction || ''
    article.appendChild(action)

    if (section.anchor) {
      var jump = document.createElement('button')
      jump.type = 'button'
      jump.className = 'button button-small'
      jump.textContent = 'View'
      jump.addEventListener('click', function() {
        var target = document.querySelector('[data-source-lifecycle-section="' + section.anchor + '"]')
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      article.appendChild(jump)
    }

    grid.appendChild(article)
  })
  panel.appendChild(grid)

  if ((scan.topVisibleGaps || []).length) {
    panel.appendChild(renderSourceBulletGroup('Top visible gaps', (scan.topVisibleGaps || []).slice(0, 10).map(function(item) {
      return item.label + ' - ' + item.detail
    })))
  }

  if ((scan.boundaries || []).length) {
    panel.appendChild(renderSourceBulletGroup('Boundaries', scan.boundaries))
  }

  return panel
}

function renderSourceMaturityStageCell(row, stageKey) {
  var stage = row.stages && row.stages[stageKey] ? row.stages[stageKey] : {}
  var cell = document.createElement('td')
  cell.className = 'source-maturity-stage-cell ' + (stage.ok ? 'is-complete' : 'is-gap')
  cell.title = stage.detail || stageKey
  var mark = document.createElement('span')
  mark.className = 'source-maturity-mark'
  mark.textContent = stage.ok ? 'Yes' : 'No'
  cell.appendChild(mark)
  return cell
}

function renderSourceMaturityGridPanel(grid) {
  if (!grid || !Array.isArray(grid.rows) || !grid.rows.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel source-maturity-panel'
  panel.setAttribute('data-source-lifecycle-section', 'source-maturity-grid')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Source Maturity'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Seven-stage source grid'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'This is the Foundation finish-line map: connected, trusted, monitored, extracted, atomized, synthesized, and routed. Routed rows show pending, approved, and applied action state so a source cannot hide behind routed-only progress.'
  left.appendChild(intro)
  header.appendChild(left)

  var summary = grid.summary || {}
  var routeReview = summary.routeReview || {}
  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag((summary.completeSources || 0) + ' complete', summary.gapSources ? 'pending' : 'connected'))
  right.appendChild(renderSourceTag((summary.gapSources || 0) + ' gaps', summary.gapSources ? 'missing' : 'connected'))
  right.appendChild(renderSourceTag((summary.deferredSources || 0) + ' deferred', summary.deferredSources ? 'pending' : 'neutral'))
  right.appendChild(renderSourceTag((routeReview.pendingRoutes || 0) + ' pending routes', routeReview.pendingRoutes ? 'pending' : 'connected'))
  right.appendChild(renderSourceTag((routeReview.appliedRoutes || 0) + ' applied routes', routeReview.appliedRoutes ? 'connected' : 'pending'))
  header.appendChild(right)
  panel.appendChild(header)

  var tableWrap = document.createElement('div')
  tableWrap.className = 'source-maturity-table-wrap'
  var table = document.createElement('table')
  table.className = 'source-maturity-table'

  var thead = document.createElement('thead')
  var headerRow = document.createElement('tr')
  ;['Source'].concat(grid.stageKeys || []).concat(['Next gap']).forEach(function(label) {
    var th = document.createElement('th')
    var definition = (grid.definitions || []).find(function(item) { return item.key === label })
    th.textContent = definition ? definition.label : label
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  grid.rows.forEach(function(row) {
    var tr = document.createElement('tr')
    tr.setAttribute('data-source-id', row.sourceId)
    var sourceCell = document.createElement('td')
    sourceCell.className = 'source-maturity-source-cell'
    var name = document.createElement('strong')
    name.textContent = row.sourceId
    sourceCell.appendChild(name)
    var detail = document.createElement('span')
    detail.textContent = [row.title, row.unitName].filter(Boolean).join(' · ')
    sourceCell.appendChild(detail)
    tr.appendChild(sourceCell)

    ;(grid.stageKeys || []).forEach(function(stageKey) {
      tr.appendChild(renderSourceMaturityStageCell(row, stageKey))
    })

    var gapCell = document.createElement('td')
    gapCell.className = 'source-maturity-gap-cell'
    gapCell.appendChild(renderSourceTag(row.nextGap || 'unknown', row.tone || 'pending'))
    var gapDetail = row.stages && row.stages[row.nextGap] ? row.stages[row.nextGap].detail : ''
    if (gapDetail) {
      var gapCopy = document.createElement('span')
      gapCopy.textContent = gapDetail
      gapCell.appendChild(gapCopy)
    }
    tr.appendChild(gapCell)
    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  tableWrap.appendChild(table)
  panel.appendChild(tableWrap)

  if ((grid.topGaps || []).length) {
    var gaps = renderSourceBulletGroup('Top visible gaps', (grid.topGaps || []).slice(0, 8).map(function(gap) {
      return gap.sourceId + ' -> ' + gap.nextGap + ': ' + gap.detail
    }))
    panel.appendChild(gaps)
  }

  return panel
}

function renderConnectorFlowCell(ok, label) {
  var cell = document.createElement('td')
  cell.className = ok ? 'source-maturity-stage-cell is-complete' : 'source-maturity-stage-cell is-gap'
  cell.textContent = ok ? 'Yes' : 'No'
  cell.title = label || ''
  return cell
}

function renderSourceConnectorMatrixPanel(matrix) {
  if (!matrix || !Array.isArray(matrix.rows) || !matrix.rows.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel source-maturity-panel'
  panel.setAttribute('data-source-lifecycle-section', 'source-connector-matrix')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Connector Matrix'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Old-system connectors vs source truth'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  var summary = matrix.summary || {}
  intro.textContent = (summary.rowCount || 0) + ' connector rows with atom-flow columns. Missing/blocked: '
    + (summary.requiredMissingOrBlockedCount || 0) + '. Atom-flow gaps: '
    + (summary.atomFlowGapCount || 0) + '.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag((summary.connectedCount || 0) + ' connected', 'connected'))
  right.appendChild(renderSourceTag((summary.missingContractCount || 0) + ' missing contracts', summary.missingContractCount ? 'missing' : 'connected'))
  right.appendChild(renderSourceTag((summary.blockedCount || 0) + ' blocked', summary.blockedCount ? 'missing' : 'neutral'))
  header.appendChild(right)
  panel.appendChild(header)

  var tableWrap = document.createElement('div')
  tableWrap.className = 'source-maturity-table-wrap'
  var table = document.createElement('table')
  table.className = 'source-maturity-table'
  var thead = document.createElement('thead')
  var headerRow = document.createElement('tr')
  ;['Connector', 'Decision', 'Contract', 'API', 'Target', 'Artifacts', 'Candidates', 'Atoms', 'Synth', 'Route', 'Blocker'].forEach(function(label) {
    var th = document.createElement('th')
    th.textContent = label
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  matrix.rows.forEach(function(row) {
    var tr = document.createElement('tr')
    tr.setAttribute('data-source-connector-row', row.key)
    var sourceCell = document.createElement('td')
    sourceCell.className = 'source-maturity-source-cell'
    var name = document.createElement('strong')
    name.textContent = row.label
    sourceCell.appendChild(name)
    var detail = document.createElement('span')
    detail.textContent = row.sourceId + ' · ' + row.connectorId
    sourceCell.appendChild(detail)
    tr.appendChild(sourceCell)

    var decisionCell = document.createElement('td')
    decisionCell.appendChild(renderSourceTag(row.decision || 'unknown', row.decision === 'connected' ? 'connected' : row.decision === 'blocked' ? 'missing' : 'pending'))
    tr.appendChild(decisionCell)
    tr.appendChild(renderConnectorFlowCell(row.hasContract, row.contractStatus))
    tr.appendChild(renderConnectorFlowCell(row.hasConnector, row.connectorStatus))
    tr.appendChild(renderConnectorFlowCell(row.hasExtractionTarget, row.extractionTargetCount + ' target(s)'))
    tr.appendChild(renderConnectorFlowCell(row.hasArtifacts, (row.artifactCount || 0) + ' artifact(s)'))
    tr.appendChild(renderConnectorFlowCell(row.hasCandidates, (row.candidateCount || 0) + ' candidate(s)'))
    tr.appendChild(renderConnectorFlowCell(row.hasPromotedAtoms, (row.promotedAtomCount || 0) + ' atom(s)'))
    tr.appendChild(renderConnectorFlowCell(row.hasSynthesis, (row.synthesisFactCount || 0) + ' fact(s)'))
    tr.appendChild(renderConnectorFlowCell(row.hasRouting, (row.routeCount || 0) + ' route(s)'))
    var blockerCell = document.createElement('td')
    blockerCell.className = 'source-extraction-next-cell'
    blockerCell.textContent = row.blockedReason || 'None'
    tr.appendChild(blockerCell)
    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  tableWrap.appendChild(table)
  panel.appendChild(tableWrap)
  return panel
}

function renderSourceHubRoutingMatrixPanel(matrix) {
  if (!matrix || !Array.isArray(matrix.rows) || !matrix.rows.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel source-maturity-panel'
  panel.setAttribute('data-source-lifecycle-section', 'source-hub-routing-matrix')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Hub Routing Matrix'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Routed to where'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  var summary = matrix.summary || {}
  intro.textContent = (summary.rowCount || 0) + ' source classes across '
    + (summary.hubCount || 0) + ' hubs. Routes: '
    + (summary.routeCellCount || 0) + ', candidates: '
    + (summary.candidateCellCount || 0) + ', blocked: '
    + (summary.blockedCellCount || 0) + '.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag((summary.routeCellCount || 0) + ' route', 'connected'))
  right.appendChild(renderSourceTag((summary.candidateCellCount || 0) + ' candidate', 'pending'))
  right.appendChild(renderSourceTag((summary.blockedCellCount || 0) + ' blocked', summary.blockedCellCount ? 'missing' : 'neutral'))
  header.appendChild(right)
  panel.appendChild(header)

  var tableWrap = document.createElement('div')
  tableWrap.className = 'source-maturity-table-wrap'
  var table = document.createElement('table')
  table.className = 'source-maturity-table'
  var thead = document.createElement('thead')
  var headerRow = document.createElement('tr')
  ;['Source'].concat(matrix.columns || []).forEach(function(label) {
    var th = document.createElement('th')
    th.textContent = label
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  matrix.rows.forEach(function(row) {
    var tr = document.createElement('tr')
    tr.setAttribute('data-source-hub-routing-row', row.sourceKey)
    var sourceCell = document.createElement('td')
    sourceCell.className = 'source-maturity-source-cell'
    var name = document.createElement('strong')
    name.textContent = row.label
    sourceCell.appendChild(name)
    var detail = document.createElement('span')
    detail.textContent = row.sourceReadiness || row.decision || ''
    sourceCell.appendChild(detail)
    tr.appendChild(sourceCell)
    ;(row.cells || []).forEach(function(cell) {
      var cellEl = document.createElement('td')
      cellEl.appendChild(renderSourceTag(cell.state, cell.state === 'route' ? 'connected' : cell.state === 'blocked' ? 'missing' : cell.state === 'candidate' ? 'pending' : 'neutral'))
      cellEl.title = cell.reason || ''
      tr.appendChild(cellEl)
    })
    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  tableWrap.appendChild(table)
  panel.appendChild(tableWrap)
  return panel
}

function renderSourceExtractionCoveragePanel(coverage) {
  if (!coverage || !Array.isArray(coverage.rows) || !coverage.rows.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel source-extraction-panel'
  panel.setAttribute('data-source-lifecycle-section', 'source-extraction-coverage')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Extraction Coverage'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Source-level extraction coverage'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  var summary = coverage.summary || {}
  intro.textContent = (summary.sourceCount || 0) + ' sources, '
    + (summary.sourcesWithTarget || 0) + ' with governed targets, '
    + (summary.sourcesWithLastSuccess || 0) + ' with last success, '
    + (summary.sourcesWithFailure || 0) + ' failure/gap, '
    + (summary.sourcesDeferred || 0) + ' deferred, '
    + (summary.sourcesNotRequired || 0) + ' not required. Last 24h: '
    + (summary.last24hRuns || 0) + ' runs and '
    + (summary.last24hItems || 0) + ' item updates.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag((summary.sourcesWithLastSuccess || 0) + ' last success', 'connected'))
  right.appendChild(renderSourceTag((summary.sourcesWithFailure || 0) + ' failure/gap', summary.sourcesWithFailure ? 'missing' : 'connected'))
  right.appendChild(renderSourceTag((summary.sourcesPending || 0) + ' pending', summary.sourcesPending ? 'pending' : 'neutral'))
  header.appendChild(right)
  panel.appendChild(header)

  var tableWrap = document.createElement('div')
  tableWrap.className = 'source-extraction-table-wrap'
  var table = document.createElement('table')
  table.className = 'source-extraction-table'

  var thead = document.createElement('thead')
  var headerRow = document.createElement('tr')
  ;['Source', 'State', 'Targets', 'Last success', 'Last failure', '24h', 'Next safe action'].forEach(function(label) {
    var th = document.createElement('th')
    th.textContent = label
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  coverage.rows.forEach(function(row) {
    var tr = document.createElement('tr')
    tr.setAttribute('data-source-id', row.sourceId)

    var sourceCell = document.createElement('td')
    sourceCell.className = 'source-extraction-source-cell'
    var sourceName = document.createElement('strong')
    sourceName.textContent = row.sourceId
    sourceCell.appendChild(sourceName)
    var sourceDetail = document.createElement('span')
    sourceDetail.textContent = [row.title, row.unitName].filter(Boolean).join(' · ')
    sourceCell.appendChild(sourceDetail)
    tr.appendChild(sourceCell)

    var stateCell = document.createElement('td')
    stateCell.className = 'source-extraction-state-cell'
    stateCell.appendChild(renderSourceTag(row.label || row.extractionState || 'unknown', row.tone || 'pending'))
    var reason = document.createElement('span')
    reason.textContent = row.reason || ''
    stateCell.appendChild(reason)
    tr.appendChild(stateCell)

    var targetCell = document.createElement('td')
    targetCell.textContent = (row.targetKeys || []).length ? row.targetKeys.join(', ') : 'None'
    tr.appendChild(targetCell)

    var successCell = document.createElement('td')
    successCell.textContent = formatDate(row.latestSuccessAt)
    tr.appendChild(successCell)

    var failureCell = document.createElement('td')
    failureCell.textContent = formatDate(row.latestFailureAt)
    tr.appendChild(failureCell)

    var last24Cell = document.createElement('td')
    var last24 = row.last24h || {}
    last24Cell.textContent = (last24.runs || 0) + ' runs · ' + (last24.items || 0) + ' items'
    tr.appendChild(last24Cell)

    var nextCell = document.createElement('td')
    nextCell.className = 'source-extraction-next-cell'
    var commands = Array.isArray(row.nextSafeCommands) ? row.nextSafeCommands : []
    nextCell.textContent = commands.length ? commands.slice(0, 2).join(' ') : (row.nextBiteAt ? 'Next bite ' + formatDate(row.nextBiteAt) : 'No action recorded')
    tr.appendChild(nextCell)

    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  tableWrap.appendChild(table)
  panel.appendChild(tableWrap)

  if ((coverage.topAttention || []).length) {
    var attention = renderSourceBulletGroup('Top extraction coverage attention', (coverage.topAttention || []).slice(0, 8).map(function(item) {
      return item.sourceId + ' - ' + item.extractionState + ': ' + item.reason
    }))
    panel.appendChild(attention)
  }

  return panel
}

function sourceCoverageCloseoutTone(decision) {
  if (decision === 'covered_for_v1' || decision === 'not_required_for_v1') return 'connected'
  if (decision === 'deferred_with_blocker') return 'pending'
  if (decision === 'advance_extraction_gap') return 'missing'
  if (decision === 'advance_maturity_gap') return 'pending'
  return 'neutral'
}

function sourceCoverageCloseoutLabel(decision) {
  var labels = {
    covered_for_v1: 'Covered for v1',
    advance_extraction_gap: 'Extraction follow-up',
    advance_maturity_gap: 'Maturity follow-up',
    deferred_with_blocker: 'Deferred with blocker',
    not_required_for_v1: 'Not required for v1',
  }
  return labels[decision] || decision || 'Unknown'
}

function renderSourceCoverageCloseoutPanel(closeout) {
  if (!closeout || !Array.isArray(closeout.rows) || !closeout.rows.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel source-coverage-closeout-panel'
  panel.setAttribute('data-source-lifecycle-section', 'source-coverage-closeout')

  var summary = closeout.summary || {}
  var decisionCounts = summary.decisionCounts || {}
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Source Closeout'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Gap decisions by source'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = (summary.sourceCount || 0) + ' sources, '
    + (summary.closedDecisionCount || 0) + ' closed for this pass, '
    + (summary.routedDecisionCount || 0) + ' routed to follow-up, '
    + (summary.extractionGapFollowupCount || 0) + ' extraction gaps, '
    + (summary.maturityGapFollowupCount || 0) + ' maturity gaps.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag((decisionCounts.covered_for_v1 || 0) + ' covered', 'connected'))
  right.appendChild(renderSourceTag((decisionCounts.advance_extraction_gap || 0) + ' extraction', decisionCounts.advance_extraction_gap ? 'missing' : 'connected'))
  right.appendChild(renderSourceTag((decisionCounts.advance_maturity_gap || 0) + ' maturity', decisionCounts.advance_maturity_gap ? 'pending' : 'connected'))
  right.appendChild(renderSourceTag((decisionCounts.deferred_with_blocker || 0) + ' deferred', decisionCounts.deferred_with_blocker ? 'pending' : 'neutral'))
  header.appendChild(right)
  panel.appendChild(header)

  var tableWrap = document.createElement('div')
  tableWrap.className = 'source-coverage-closeout-table-wrap'
  var table = document.createElement('table')
  table.className = 'source-coverage-closeout-table'

  var thead = document.createElement('thead')
  var headerRow = document.createElement('tr')
  ;['Source', 'Decision', 'Maturity gap', 'Extraction state', 'Next card', 'Operator action'].forEach(function(label) {
    var th = document.createElement('th')
    th.textContent = label
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  closeout.rows.forEach(function(row) {
    var tr = document.createElement('tr')
    tr.setAttribute('data-source-id', row.sourceId)

    var sourceCell = document.createElement('td')
    sourceCell.className = 'source-coverage-closeout-source-cell'
    var sourceName = document.createElement('strong')
    sourceName.textContent = row.sourceId
    sourceCell.appendChild(sourceName)
    var sourceDetail = document.createElement('span')
    sourceDetail.textContent = [row.title, row.unitName].filter(Boolean).join(' · ')
    sourceCell.appendChild(sourceDetail)
    tr.appendChild(sourceCell)

    var decisionCell = document.createElement('td')
    decisionCell.className = 'source-coverage-closeout-decision-cell'
    decisionCell.appendChild(renderSourceTag(sourceCoverageCloseoutLabel(row.decision), sourceCoverageCloseoutTone(row.decision)))
    var reason = document.createElement('span')
    reason.textContent = row.reason || ''
    decisionCell.appendChild(reason)
    tr.appendChild(decisionCell)

    var maturityCell = document.createElement('td')
    maturityCell.textContent = row.maturityNextGap || 'unknown'
    tr.appendChild(maturityCell)

    var extractionCell = document.createElement('td')
    extractionCell.textContent = row.extractionState || 'unknown'
    tr.appendChild(extractionCell)

    var nextCardCell = document.createElement('td')
    nextCardCell.textContent = row.nextCardId || 'None'
    tr.appendChild(nextCardCell)

    var actionCell = document.createElement('td')
    actionCell.className = 'source-coverage-closeout-action-cell'
    actionCell.textContent = row.operatorAction || ''
    tr.appendChild(actionCell)

    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  tableWrap.appendChild(table)
  panel.appendChild(tableWrap)

  if ((closeout.routedRows || []).length) {
    var routed = renderSourceBulletGroup('Routed source rows', (closeout.routedRows || []).slice(0, 8).map(function(row) {
      return row.sourceId + ' -> ' + row.nextCardId + ': ' + row.reason
    }))
    panel.appendChild(routed)
  }

  return panel
}

function renderMarketingSourceMapPanel(map) {
  if (!map || !Array.isArray(map.lanes) || !map.lanes.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel marketing-source-map-panel'
  panel.setAttribute('data-source-lifecycle-section', 'marketing-source-map')

  var summary = map.summary || {}
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Marketing Sources'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Brand-lane source map'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = (summary.laneCount || 0) + ' brand lanes, '
    + (summary.uniqueSourceCount || 0) + ' unique source contracts, '
    + (summary.avatarCount || 0) + ' imported avatars, '
    + (summary.avatarAssignmentCount || 0) + ' avatar assignments. '
    + 'Production built: ' + (summary.marketingProductionBuilt ? 'yes' : 'no') + '.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag((summary.mappedSourceRefs || 0) + ' mapped refs', 'connected'))
  right.appendChild(renderSourceTag((summary.pendingSourceRefs || 0) + ' pending refs', summary.pendingSourceRefs ? 'pending' : 'connected'))
  right.appendChild(renderSourceTag((summary.gapSourceRefs || 0) + ' gap refs', summary.gapSourceRefs ? 'missing' : 'connected'))
  header.appendChild(right)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'marketing-source-map-grid'
  map.lanes.forEach(function(lane) {
    var article = document.createElement('article')
    article.className = 'marketing-source-map-lane'
    article.setAttribute('data-brand-lane-id', lane.laneId)

    var top = document.createElement('div')
    top.className = 'source-lifecycle-card-top'
    var name = document.createElement('h4')
    name.textContent = lane.label
    top.appendChild(name)
    top.appendChild(renderSourceTag(lane.status, lane.tone || 'pending'))
    article.appendChild(top)

    var purpose = document.createElement('p')
    purpose.textContent = lane.purpose
    article.appendChild(purpose)

    var meta = document.createElement('div')
    meta.className = 'source-card-meta-grid'
    meta.appendChild(renderSourceMetaItem('Avatars', String(lane.avatarCount || 0)))
    meta.appendChild(renderSourceMetaItem('Mapped', String(lane.mappedSourceCount || 0)))
    meta.appendChild(renderSourceMetaItem('Pending', String(lane.pendingSourceCount || 0)))
    meta.appendChild(renderSourceMetaItem('Gaps', String(lane.gapSourceCount || 0)))
    article.appendChild(meta)

    var sourceNames = (lane.sourceRefs || []).map(function(ref) {
      return ref.sourceId + ' · ' + ref.title + ' · ' + ref.state
    })
    if (sourceNames.length) article.appendChild(renderSourceBulletGroup('Source contracts', sourceNames))
    if ((lane.avatarIds || []).length) article.appendChild(renderSourceBulletGroup('Avatar IDs', lane.avatarIds))
    grid.appendChild(article)
  })
  panel.appendChild(grid)

  if ((map.boundary || []).length) {
    panel.appendChild(renderSourceBulletGroup('Boundaries', map.boundary))
  }

  return panel
}

function renderBrandStackPanel(stack) {
  if (!stack || !Array.isArray(stack.brands) || !stack.brands.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel brand-stack-panel'
  panel.setAttribute('data-source-lifecycle-section', 'brand-stack')

  var summary = stack.summary || {}
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Brand Stack'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Brand entities and Guardian boundaries'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = (summary.brandCount || 0) + ' brand entities, '
    + (summary.guardianBoundaryCount || 0) + ' Guardian boundaries, '
    + (summary.sourceRefCount || 0) + ' source refs, '
    + (summary.avatarAssignmentCount || 0) + ' avatar assignments. '
    + 'Guardian enforcement built: ' + (summary.brandGuardianEnforcementBuilt ? 'yes' : 'no') + '.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag((summary.activeBrandCount || 0) + ' active', 'connected'))
  right.appendChild(renderSourceTag((summary.reviewRequiredBrandCount || 0) + ' review required', summary.reviewRequiredBrandCount ? 'pending' : 'connected'))
  right.appendChild(renderSourceTag((summary.missingSourceRefCount || 0) + ' missing refs', summary.missingSourceRefCount ? 'missing' : 'connected'))
  header.appendChild(right)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'brand-stack-grid'
  stack.brands.forEach(function(brand) {
    var article = document.createElement('article')
    article.className = 'brand-stack-card'
    article.setAttribute('data-brand-id', brand.brandId)

    var top = document.createElement('div')
    top.className = 'source-lifecycle-card-top'
    var name = document.createElement('h4')
    name.textContent = brand.label
    top.appendChild(name)
    top.appendChild(renderSourceTag(brand.status, brand.status === 'active' ? 'connected' : 'pending'))
    article.appendChild(top)

    var role = document.createElement('p')
    role.textContent = brand.role
    article.appendChild(role)

    var meta = document.createElement('div')
    meta.className = 'source-card-meta-grid'
    meta.appendChild(renderSourceMetaItem('Sources', String(brand.sourceRefCount || 0)))
    meta.appendChild(renderSourceMetaItem('Avatars', String(brand.avatarCount || 0)))
    meta.appendChild(renderSourceMetaItem('Gaps', String(brand.gapSourceCount || 0)))
    meta.appendChild(renderSourceMetaItem('Boundary', brand.guardianBoundaryDefined ? 'defined' : 'missing'))
    article.appendChild(meta)

    article.appendChild(renderSourceBulletGroup('Audience boundary', [brand.audienceBoundary]))
    article.appendChild(renderSourceBulletGroup('Guardian rules', (brand.guardianRules || []).slice(0, 3)))
    if ((brand.sourceIds || []).length) article.appendChild(renderSourceBulletGroup('Source IDs', brand.sourceIds))
    grid.appendChild(article)
  })
  panel.appendChild(grid)

  if ((stack.boundary || []).length) {
    panel.appendChild(renderSourceBulletGroup('Not built by this card', stack.boundary))
  }

  return panel
}

function renderTierBehavioralCompletionPanel(proof) {
  if (!proof || !Array.isArray(proof.surfaces) || !proof.surfaces.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel tier-behavior-panel'
  panel.setAttribute('data-source-lifecycle-section', 'tier-behavioral-completion')

  var summary = proof.summary || {}
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Tier Behavior'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'First non-owner read decisions'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = (summary.surfaceCount || 0) + ' surfaces checked, '
    + (summary.nonOwnerAllowedSurfaceCount || 0) + ' role-filtered non-owner reads, '
    + (summary.ownerOnlySurfaceCount || 0) + ' owner-only reads, '
    + (summary.redactionReadyOwnerOnlySurfaceCount || 0) + ' redaction-ready reads still closed. '
    + 'Subject-person proof: ' + (summary.subjectPersonProofOk ? 'pass' : 'risk') + '.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag(proof.status || 'unknown', proof.status === 'healthy' ? 'connected' : 'missing'))
  right.appendChild(renderSourceTag((summary.missingRoutePostureCount || 0) + ' missing route postures', summary.missingRoutePostureCount ? 'missing' : 'connected'))
  right.appendChild(renderSourceTag((summary.failedSurfaceCount || 0) + ' failed surfaces', summary.failedSurfaceCount ? 'missing' : 'connected'))
  header.appendChild(right)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'tier-behavior-grid'
  proof.surfaces.forEach(function(surface) {
    var article = document.createElement('article')
    article.className = 'tier-behavior-card'
    article.setAttribute('data-tier-surface-id', surface.id)

    var top = document.createElement('div')
    top.className = 'source-lifecycle-card-top'
    var name = document.createElement('h4')
    name.textContent = surface.label
    top.appendChild(name)
    top.appendChild(renderSourceTag(surface.decision, surface.ok ? 'connected' : 'missing'))
    article.appendChild(top)

    var route = document.createElement('p')
    route.className = 'source-lifecycle-small'
    route.textContent = surface.method + ' ' + surface.path + ' · ' + surface.policy
    article.appendChild(route)

    var reason = document.createElement('p')
    reason.textContent = surface.rationale
    article.appendChild(reason)

    var meta = document.createElement('div')
    meta.className = 'source-card-meta-grid'
    meta.appendChild(renderSourceMetaItem('Route posture', surface.routeRegistered ? 'explicit' : 'missing'))
    meta.appendChild(renderSourceMetaItem('Non-owner', surface.hasNonOwnerAllowed ? 'allowed by role' : 'closed'))
    meta.appendChild(renderSourceMetaItem('Required tier', surface.requiredTier ? String(surface.requiredTier) : 'none'))
    meta.appendChild(renderSourceMetaItem('Status', surface.ok ? 'pass' : 'risk'))
    article.appendChild(meta)

    var allowed = (surface.actorResults || [])
      .filter(function(result) { return result.actualAllowed })
      .map(function(result) { return result.actorKey })
    if (allowed.length) article.appendChild(renderSourceBulletGroup('Allowed actors in proof', allowed))
    grid.appendChild(article)
  })
  panel.appendChild(grid)

  if ((proof.boundary || []).length) {
    panel.appendChild(renderSourceBulletGroup('Boundaries', proof.boundary))
  }

  return panel
}

function renderVerificationRunsPanel(run) {
  if (!run || !run.summary) return null
  var candidates = Array.isArray(run.topCandidates) ? run.topCandidates : []
  var summary = run.summary || {}
  var panel = document.createElement('section')
  panel.className = 'panel verification-runs-panel'
  panel.setAttribute('data-source-lifecycle-section', 'verification-runs')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Verification Runs'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Stale research and finding review'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = (summary.candidateCount || 0) + ' review candidates: '
    + (summary.staleResearchCount || 0) + ' research, '
    + (summary.staleSynthesisCount || 0) + ' synthesized findings, '
    + (summary.staleActionRouteCount || 0) + ' action routes, '
    + (summary.backlogHygieneCandidateCount || 0) + ' backlog hygiene. '
    + 'Proposed-only: ' + (summary.proposedOnly ? 'yes' : 'no') + '.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag(run.status || 'unknown', run.status === 'healthy' ? 'connected' : 'pending'))
  right.appendChild(renderSourceTag((summary.riskCandidateCount || 0) + ' risk', summary.riskCandidateCount ? 'missing' : 'connected'))
  right.appendChild(renderSourceTag((summary.autoExpiredCount || 0) + ' auto-expired', summary.autoExpiredCount ? 'missing' : 'connected'))
  header.appendChild(right)
  panel.appendChild(header)

  var meta = document.createElement('div')
  meta.className = 'source-card-meta-grid'
  meta.appendChild(renderSourceMetaItem('Finding threshold', String((run.thresholds || {}).staleFindingDays || 0) + 'd'))
  meta.appendChild(renderSourceMetaItem('Research threshold', String((run.thresholds || {}).researchReviewDays || 0) + 'd'))
  meta.appendChild(renderSourceMetaItem('Route threshold', String((run.thresholds || {}).actionRouteDays || 0) + 'd'))
  meta.appendChild(renderSourceMetaItem('Next card', summary.nextCardId || 'unknown'))
  panel.appendChild(meta)

  var grid = document.createElement('div')
  grid.className = 'verification-runs-grid'
  candidates.slice(0, 12).forEach(function(candidate) {
    var article = document.createElement('article')
    article.className = 'verification-runs-card'
    article.setAttribute('data-verification-candidate-id', candidate.id)

    var top = document.createElement('div')
    top.className = 'source-lifecycle-card-top'
    var name = document.createElement('h4')
    name.textContent = candidate.label || candidate.sourceId || candidate.id
    top.appendChild(name)
    top.appendChild(renderSourceTag(candidate.sourceType || 'candidate', candidate.severity === 'risk' ? 'missing' : 'pending'))
    article.appendChild(top)

    var reason = document.createElement('p')
    reason.textContent = candidate.reason || 'Review this candidate.'
    article.appendChild(reason)

    var cardMeta = document.createElement('div')
    cardMeta.className = 'source-card-meta-grid'
    cardMeta.appendChild(renderSourceMetaItem('Owner', candidate.owner || 'unknown'))
    cardMeta.appendChild(renderSourceMetaItem('Age', candidate.ageDays === null || candidate.ageDays === undefined ? 'unknown' : String(candidate.ageDays) + 'd'))
    cardMeta.appendChild(renderSourceMetaItem('Status', candidate.status || 'unknown'))
    cardMeta.appendChild(renderSourceMetaItem('Action', candidate.proposedAction || 'review'))
    article.appendChild(cardMeta)

    grid.appendChild(article)
  })

  if (!candidates.length) {
    var empty = document.createElement('p')
    empty.className = 'section-intro'
    empty.textContent = 'No stale verification candidates are currently visible.'
    grid.appendChild(empty)
  }

  panel.appendChild(grid)

  if ((run.boundary || []).length) {
    panel.appendChild(renderSourceBulletGroup('Boundaries', run.boundary))
  }

  return panel
}

function renderPerUserChangelogPanel(log) {
  if (!log || !log.summary) return null
  var actors = Array.isArray(log.activeActors) ? log.activeActors : []
  var missingCoverage = Array.isArray(log.missingCoverage) ? log.missingCoverage : []
  var summary = log.summary || {}
  var panel = document.createElement('section')
  panel.className = 'panel per-user-changelog-panel'
  panel.setAttribute('data-source-lifecycle-section', 'per-user-changelog')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Per-User Changelog'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Write and approval activity'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = (summary.eventCount || 0) + ' recent change events across '
    + (summary.actorCount || 0) + ' active actors: '
    + (summary.changedCount || 0) + ' changed, '
    + (summary.approvedCount || 0) + ' approved, '
    + (summary.appliedCount || 0) + ' applied, '
    + (summary.systemCount || 0) + ' system.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag(log.status || 'unknown', log.status === 'healthy' ? 'connected' : 'pending'))
  right.appendChild(renderSourceTag((summary.unknownActorCount || 0) + ' unknown actors', summary.unknownActorCount ? 'pending' : 'connected'))
  right.appendChild(renderSourceTag((summary.missingCoverageCount || 0) + ' missing coverage', summary.missingCoverageCount ? 'pending' : 'connected'))
  header.appendChild(right)
  panel.appendChild(header)

  var meta = document.createElement('div')
  meta.className = 'source-card-meta-grid'
  meta.appendChild(renderSourceMetaItem('Known users', String(summary.knownUserActorCount || 0)))
  meta.appendChild(renderSourceMetaItem('Agents', String(summary.agentActorCount || 0)))
  meta.appendChild(renderSourceMetaItem('System actors', String(summary.systemActorCount || 0)))
  meta.appendChild(renderSourceMetaItem('Next card', summary.nextCardId || 'unknown'))
  panel.appendChild(meta)

  var grid = document.createElement('div')
  grid.className = 'per-user-changelog-grid'
  actors.slice(0, 12).forEach(function(actor) {
    var article = document.createElement('article')
    article.className = 'per-user-changelog-card'
    article.setAttribute('data-per-user-actor', actor.actorKey)

    var top = document.createElement('div')
    top.className = 'source-lifecycle-card-top'
    var name = document.createElement('h4')
    name.textContent = actor.displayName || actor.actorKey
    top.appendChild(name)
    top.appendChild(renderSourceTag(actor.actorKind || 'actor', actor.actorKind === 'unknown_actor' ? 'pending' : 'connected'))
    article.appendChild(top)

    var detail = document.createElement('p')
    detail.textContent = (actor.eventCount || 0) + ' event(s)'
      + (actor.latestAt ? ' · latest ' + formatDate(actor.latestAt) : '')
    article.appendChild(detail)

    var actorMeta = document.createElement('div')
    actorMeta.className = 'source-card-meta-grid'
    actorMeta.appendChild(renderSourceMetaItem('Changed', String((actor.counts || {}).changed || 0)))
    actorMeta.appendChild(renderSourceMetaItem('Approved', String((actor.counts || {}).approved || 0)))
    actorMeta.appendChild(renderSourceMetaItem('Applied', String((actor.counts || {}).applied || 0)))
    actorMeta.appendChild(renderSourceMetaItem('System', String((actor.counts || {}).system || 0)))
    article.appendChild(actorMeta)

    var activity = (actor.recentActivity || []).slice(0, 3).map(function(item) {
      return (item.activityType || 'activity') + ': ' + (item.summary || item.eventType || item.entityId)
    })
    if (activity.length) article.appendChild(renderSourceBulletGroup('Latest activity', activity))
    grid.appendChild(article)
  })

  if (!actors.length) {
    var empty = document.createElement('p')
    empty.className = 'section-intro'
    empty.textContent = 'No per-user change events are currently visible.'
    grid.appendChild(empty)
  }
  panel.appendChild(grid)

  if (missingCoverage.length) {
    panel.appendChild(renderSourceBulletGroup('Still missing from old-system parity', missingCoverage.map(function(item) {
      return item.label + ': ' + item.repairPath
    })))
  }

  if ((log.boundaries || []).length) {
    panel.appendChild(renderSourceBulletGroup('Boundaries', log.boundaries))
  }

  return panel
}

function renderRestrictedDecisionQueuePanel(queue) {
  if (!queue || !queue.summary) return null
  var items = Array.isArray(queue.queueItems) ? queue.queueItems : []
  var summary = queue.summary || {}
  var panel = document.createElement('section')
  panel.className = 'panel restricted-decision-queue-panel'
  panel.setAttribute('data-source-lifecycle-section', 'restricted-decision-queue')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Restricted Decision Queue'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Owner-only decision routing'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = (summary.restrictedCount || 0) + ' restricted decisions, '
    + (summary.generalCount || 0) + ' general decisions, '
    + (summary.matchedCategoryCount || 0) + ' restricted rule groups. '
    + 'Owner-only: ' + (summary.ownerOnly ? 'yes' : 'no') + '.'
  left.appendChild(intro)
  header.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-lifecycle-evidence'
  right.appendChild(renderSourceTag(queue.status || 'unknown', queue.status === 'healthy' ? 'connected' : 'pending'))
  right.appendChild(renderSourceTag((summary.proposedRestrictedCount || 0) + ' proposed', summary.proposedRestrictedCount ? 'pending' : 'connected'))
  right.appendChild(renderSourceTag((summary.autoApplies ? 'auto-apply risk' : 'no auto-apply'), summary.autoApplies ? 'missing' : 'connected'))
  header.appendChild(right)
  panel.appendChild(header)

  var meta = document.createElement('div')
  meta.className = 'source-card-meta-grid'
  meta.appendChild(renderSourceMetaItem('Termination/comp/perf', (queue.matchedCategories || []).length ? (queue.matchedCategories || []).join(', ') : 'none visible'))
  meta.appendChild(renderSourceMetaItem('Locked restricted', String(summary.lockedRestrictedCount || 0)))
  meta.appendChild(renderSourceMetaItem('General context', 'restricted filtered out'))
  meta.appendChild(renderSourceMetaItem('Next card', summary.nextCardId || 'unknown'))
  panel.appendChild(meta)

  var grid = document.createElement('div')
  grid.className = 'restricted-decision-queue-grid'
  items.slice(0, 12).forEach(function(item) {
    var article = document.createElement('article')
    article.className = 'restricted-decision-queue-card'
    article.setAttribute('data-restricted-decision-id', item.id)

    var top = document.createElement('div')
    top.className = 'source-lifecycle-card-top'
    var name = document.createElement('h4')
    name.textContent = item.id + ': ' + (item.title || 'Restricted decision')
    top.appendChild(name)
    top.appendChild(renderSourceTag((item.restriction && item.restriction.restrictionStatus) || 'restricted', 'missing'))
    article.appendChild(top)

    var detail = document.createElement('p')
    detail.textContent = item.summary || (item.restriction && item.restriction.reason) || 'Restricted decision needs owner-only review.'
    article.appendChild(detail)

    var itemMeta = document.createElement('div')
    itemMeta.className = 'source-card-meta-grid'
    itemMeta.appendChild(renderSourceMetaItem('Status', item.status || 'unknown'))
    itemMeta.appendChild(renderSourceMetaItem('Category', item.category || 'unknown'))
    itemMeta.appendChild(renderSourceMetaItem('Owner', item.decisionOwner || 'unassigned'))
    itemMeta.appendChild(renderSourceMetaItem('Route', (item.restriction && item.restriction.route) || 'owner_only_restricted_review'))
    article.appendChild(itemMeta)

    var matches = ((item.restriction && item.restriction.matchedCategories) || []).map(function(category) {
      return category.replace(/_/g, ' ')
    })
    if (matches.length) article.appendChild(renderSourceBulletGroup('Matched restricted rules', matches))
    grid.appendChild(article)
  })

  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'section-intro'
    empty.textContent = 'No restricted decisions are currently visible. The filter is still active for future decisions.'
    grid.appendChild(empty)
  }
  panel.appendChild(grid)

  if ((queue.routingRules || []).length) {
    panel.appendChild(renderSourceBulletGroup('Routing rules', queue.routingRules.map(function(rule) {
      return rule.decision
    })))
  }

  if ((queue.boundaries || []).length) {
    panel.appendChild(renderSourceBulletGroup('Boundaries', queue.boundaries))
  }

  return panel
}

function renderSourceLifecycleDefinitions(definitions) {
  var panel = document.createElement('section')
  panel.className = 'panel'
  panel.setAttribute('data-source-lifecycle-section', 'definitions')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Lifecycle Definitions'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'What each status means'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'A lane can be readable before it is reviewed, and visible before it is approved for more extraction.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'source-lifecycle-definition-grid'
  ;(definitions || []).forEach(function(definition) {
    var item = document.createElement('article')
    item.className = 'source-lifecycle-definition'
    item.appendChild(renderSourceTag(definition.label, sourceLifecycleTone(definition.key)))
    var copy = document.createElement('p')
    copy.textContent = definition.definition
    item.appendChild(copy)
    grid.appendChild(item)
  })
  panel.appendChild(grid)
  return panel
}

function renderSourceLifecycleEvidence(refs) {
  var list = document.createElement('div')
  list.className = 'source-lifecycle-evidence'
  ;(refs || []).slice(0, 8).forEach(function(ref) {
    var item = document.createElement('span')
    item.textContent = ref
    list.appendChild(item)
  })
  return list
}

function renderSourceLifecycleLaneCard(lane) {
  var article = document.createElement('article')
  article.className = 'source-lifecycle-card'
  article.setAttribute('data-source-lifecycle-lane', lane.key)

  var top = document.createElement('div')
  top.className = 'source-lifecycle-card-top'
  var title = document.createElement('h4')
  title.textContent = lane.title
  top.appendChild(title)
  top.appendChild(renderSourceTag(lane.status, sourceLifecycleTone(lane.status)))
  article.appendChild(top)

  var copy = document.createElement('p')
  copy.textContent = lane.description
  article.appendChild(copy)

  var meta = document.createElement('div')
  meta.className = 'source-card-meta-grid'
  meta.appendChild(renderSourceMetaItem('Sources', String((lane.sourceIds || []).length)))
  meta.appendChild(renderSourceMetaItem('Targets', String((lane.targetKeys || []).length)))
  meta.appendChild(renderSourceMetaItem('Parked signals', String(lane.parkedCount || 0)))
  meta.appendChild(renderSourceMetaItem('Proof state', lane.complete ? 'Complete' : 'Needs review'))
  article.appendChild(meta)
  article.appendChild(renderSourceLifecycleEvidence(lane.evidenceRefs || []))
  return article
}

function renderSourceLifecycleLanes(lifecycle) {
  var panel = document.createElement('section')
  panel.className = 'panel'
  panel.setAttribute('data-source-lifecycle-section', 'active-source-lanes')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Included Lanes'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Connected, extracted, or parked'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'The slice includes the lanes below and shows their proof without activating excluded source work.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'source-lifecycle-grid'
  ;(lifecycle.lanes || []).forEach(function(lane) {
    grid.appendChild(renderSourceLifecycleLaneCard(lane))
  })
  panel.appendChild(grid)
  return panel
}

function renderSourceLifecycleTargetCard(target) {
  var article = document.createElement('article')
  article.className = 'source-lifecycle-target'
  article.setAttribute('data-source-lifecycle-target', target.targetKey)

  var top = document.createElement('div')
  top.className = 'source-lifecycle-card-top'
  var title = document.createElement('h4')
  title.textContent = target.title || target.targetKey
  top.appendChild(title)
  top.appendChild(renderSourceTag(target.status, sourceLifecycleTone(target.status)))
  article.appendChild(top)

  var body = document.createElement('p')
  body.textContent = [
    target.sourceId,
    target.lane,
    target.targetType,
    target.parkedReason ? 'parked: ' + target.parkedReason : target.lifecycleStage,
  ].filter(Boolean).join(' · ')
  article.appendChild(body)

  var meta = document.createElement('div')
  meta.className = 'source-card-meta-grid'
  meta.appendChild(renderSourceMetaItem('Runtime', target.runtimeMode || 'Not set'))
  meta.appendChild(renderSourceMetaItem('Schedule', target.schedulerMode || 'Not set'))
  meta.appendChild(renderSourceMetaItem('Succeeded', String(target.counts && target.counts.succeededItems || 0)))
  meta.appendChild(renderSourceMetaItem('Skipped', String(target.counts && target.counts.skippedItems || 0)))
  article.appendChild(meta)

  var capValues = Object.keys(target.budgetCaps || {}).map(function(key) {
    return key + '=' + target.budgetCaps[key]
  })
  if (capValues.length) {
    var caps = document.createElement('p')
    caps.className = 'source-lifecycle-caps'
    caps.textContent = capValues.join(' · ')
    article.appendChild(caps)
  }

  if ((target.reasonSummary || []).length) {
    var reasons = document.createElement('ul')
    reasons.className = 'source-lifecycle-reasons'
    target.reasonSummary.slice(0, 4).forEach(function(reason) {
      var item = document.createElement('li')
      item.textContent = reason.status + ': ' + reason.reason + ' (' + reason.count + ')'
      reasons.appendChild(item)
    })
    article.appendChild(reasons)
  }

  article.appendChild(renderSourceLifecycleEvidence(target.evidenceRefs || []))
  return article
}

function renderSourceLifecycleTargets(lifecycle) {
  var panel = document.createElement('section')
  panel.className = 'panel'
  panel.setAttribute('data-source-lifecycle-section', 'extraction-caps')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Extraction Control'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Targets, caps, and parked states'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Caps are shown from the existing target ledger. This card does not add targets or raise quotas.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'source-lifecycle-target-grid'
  ;(lifecycle.targets || []).forEach(function(target) {
    grid.appendChild(renderSourceLifecycleTargetCard(target))
  })
  panel.appendChild(grid)
  return panel
}

function renderSourceLifecycleParked(lifecycle) {
  var parkedSources = (lifecycle.sources || []).filter(function(source) {
    return source.lifecycle && source.lifecycle.parked === 'yes'
  })
  if (!parkedSources.length) return null

  var panel = document.createElement('section')
  panel.className = 'panel'
  panel.setAttribute('data-source-lifecycle-section', 'parked-blocked-lanes')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Parked / Blocked'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Visible but not started'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'These lanes stay visible with a reason. They are not extraction approval.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var list = document.createElement('div')
  list.className = 'source-lifecycle-parked-list'
  parkedSources.forEach(function(source) {
    var row = document.createElement('article')
    row.className = 'source-lifecycle-parked-row'
    var titleRow = document.createElement('div')
    titleRow.className = 'source-lifecycle-card-top'
    var name = document.createElement('h4')
    name.textContent = source.sourceId + ' · ' + source.title
    titleRow.appendChild(name)
    titleRow.appendChild(renderSourceTag(source.lifecycleStage, sourceLifecycleTone(source.lifecycleStage)))
    row.appendChild(titleRow)
    var detail = document.createElement('p')
    detail.textContent = source.noTargetReason || source.validation || source.status
    row.appendChild(detail)
    row.appendChild(renderSourceLifecycleEvidence(source.evidenceRefs || []))
    list.appendChild(row)
  })
  panel.appendChild(list)
  return panel
}

function renderSourceLifecycleScope(lifecycle) {
  var panel = document.createElement('section')
  panel.className = 'panel'
  panel.setAttribute('data-source-lifecycle-section', 'scope-boundary')

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Scope Boundary'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Excluded lanes stay excluded'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'This proof keeps source lifecycle visibility separate from Strategy, Scoper, Agent Factory, corpus expansion, and new source builds.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'source-lifecycle-scope-grid'
  ;(lifecycle.scope && lifecycle.scope.hardConstraints || []).forEach(function(item) {
    var tag = document.createElement('span')
    tag.className = 'source-lifecycle-scope-item'
    tag.textContent = item
    grid.appendChild(tag)
  })
  ;(lifecycle.scope && lifecycle.scope.excludedLanes || []).forEach(function(item) {
    var tag = document.createElement('span')
    tag.className = 'source-lifecycle-scope-item source-lifecycle-scope-excluded'
    tag.textContent = item
    grid.appendChild(tag)
  })
  panel.appendChild(grid)
  return panel
}

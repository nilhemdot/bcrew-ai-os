var foundationDataSourcesV2State = {
  selectedSourceId: '',
}

function fdsCreate(tag, className, text) {
  var node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined && text !== null) node.textContent = text
  return node
}

function fdsFormatDate(value) {
  if (!value) return 'Not yet'
  var date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not yet'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function fdsStateLabel(state) {
  if (state === 'ready') return 'Working'
  if (state === 'partial') return 'Partly working'
  if (state === 'blocked') return 'Needs help'
  if (state === 'planned') return 'Not started'
  return 'Unknown'
}

function fdsStatusClass(value) {
  if (value === 'ready') return 'fds-ready'
  if (value === 'blocked') return 'fds-blocked'
  if (value === 'planned') return 'fds-planned'
  return 'fds-partial'
}

function fdsAppendTags(parent, values, limit) {
  var list = Array.isArray(values) ? values.filter(Boolean) : []
  var shown = list.slice(0, limit || 6)
  shown.forEach(function(value) {
    parent.appendChild(fdsCreate('span', 'fds-tag', value))
  })
  if (list.length > shown.length) {
    parent.appendChild(fdsCreate('span', 'fds-tag fds-tag-muted', '+' + (list.length - shown.length)))
  }
}

function fdsRenderSummaryTile(label, value, detail) {
  var tile = fdsCreate('article', 'fds-summary-tile')
  tile.appendChild(fdsCreate('strong', '', String(value || 0)))
  tile.appendChild(fdsCreate('span', '', label))
  if (detail) tile.appendChild(fdsCreate('p', '', detail))
  return tile
}

function fdsRenderHero(data) {
  var hero = fdsCreate('section', 'fds-hero')
  var copy = fdsCreate('div', 'fds-hero-copy')
  copy.appendChild(fdsCreate('span', 'fds-eyebrow', 'Foundation shared layer'))
  copy.appendChild(fdsCreate('h1', '', 'Shared Data Sources.'))
  copy.appendChild(fdsCreate('p', '', 'Foundation reads approved sources once, turns the useful parts into clean intelligence, and lets every hub use the same truth instead of building separate copies.'))
  hero.appendChild(copy)

  var summary = data.summary || {}
  var tiles = fdsCreate('div', 'fds-summary-grid')
  tiles.appendChild(fdsRenderSummaryTile('sources tracked', summary.total, 'Known shared source families.'))
  tiles.appendChild(fdsRenderSummaryTile('live', summary.ready, 'Can read, synthesize, and route.'))
  tiles.appendChild(fdsRenderSummaryTile('need work', Number(summary.partial || 0) + Number(summary.blocked || 0), 'Partly working or blocked.'))
  tiles.appendChild(fdsRenderSummaryTile('routing', summary.routing, 'Already sending findings to hubs.'))
  hero.appendChild(tiles)
  return hero
}

function fdsRenderStageStrip(source) {
  var strip = fdsCreate('div', 'fds-stage-strip')
  var labels = source.stageLabels || {}
  ;['connected', 'extracting', 'synthesizing', 'routing'].forEach(function(key) {
    var stage = (source.stages || {})[key] || {}
    var item = fdsCreate('div', 'fds-stage-dot ' + fdsStatusClass(stage.state))
    item.appendChild(fdsCreate('span', '', labels[key] || key))
    item.appendChild(fdsCreate('strong', '', fdsStateLabel(stage.state)))
    strip.appendChild(item)
  })
  return strip
}

function fdsRenderSourceCard(source) {
  var selected = foundationDataSourcesV2State.selectedSourceId === source.sourceId
  var button = fdsCreate('button', 'fds-source-card ' + fdsStatusClass(source.status) + (selected ? ' is-selected' : ''))
  button.type = 'button'
  button.setAttribute('data-source-id', source.sourceId)
  button.addEventListener('click', function() {
    foundationDataSourcesV2State.selectedSourceId = source.sourceId
    renderFoundationDataSourcesV2()
  })

  var top = fdsCreate('div', 'fds-card-top')
  var titleBlock = fdsCreate('div', 'fds-card-title-block')
  titleBlock.appendChild(fdsCreate('span', 'fds-status-line', source.statusText || 'Status unknown'))
  titleBlock.appendChild(fdsCreate('h3', '', source.plainName || source.title || 'Source'))
  top.appendChild(titleBlock)
  button.appendChild(top)

  button.appendChild(fdsCreate('p', 'fds-source-purpose', source.plainPurpose || 'Shared Foundation source.'))
  button.appendChild(fdsRenderStageStrip(source))

  var meta = fdsCreate('div', 'fds-card-meta')
  meta.appendChild(fdsCreate('span', '', 'Extracted ' + fdsFormatDate(source.lastExtractedAt)))
  meta.appendChild(fdsCreate('span', '', 'Ideas ' + fdsFormatDate(source.lastSynthesizedAt)))
  button.appendChild(meta)

  var tags = fdsCreate('div', 'fds-tag-row')
  fdsAppendTags(tags, source.hubTags || [], 5)
  button.appendChild(tags)

  if (source.blockers && source.blockers.length) {
    button.appendChild(fdsCreate('p', 'fds-card-need', source.blockers[0]))
  }

  return button
}

function fdsRenderSourceGrid(data) {
  var section = fdsCreate('section', 'fds-section')
  var head = fdsCreate('div', 'fds-section-head')
  head.appendChild(fdsCreate('span', 'fds-eyebrow', 'What Foundation can read'))
  head.appendChild(fdsCreate('h2', '', 'Data Sources'))
  head.appendChild(fdsCreate('p', '', 'A source is where information comes from. The card shows whether Foundation can read it, mine it, turn it into ideas, and send those ideas to hubs.'))
  section.appendChild(head)

  var grid = fdsCreate('div', 'fds-source-grid')
  ;(data.sources || []).forEach(function(source) {
    grid.appendChild(fdsRenderSourceCard(source))
  })
  section.appendChild(grid)
  return section
}

function fdsRenderDetailStage(key, stage, labels) {
  var card = fdsCreate('article', 'fds-detail-stage ' + fdsStatusClass(stage.state))
  card.appendChild(fdsCreate('span', 'fds-eyebrow', labels[key] || key))
  card.appendChild(fdsCreate('h4', '', fdsStateLabel(stage.state)))
  card.appendChild(fdsCreate('p', '', stage.detail || 'No detail recorded yet.'))
  var at = stage.latestRunAt || stage.lastSynthesizedAt || stage.at
  if (at) card.appendChild(fdsCreate('small', '', fdsFormatDate(at)))
  return card
}

function fdsRenderTarget(target) {
  var card = fdsCreate('article', 'fds-target-card')
  card.appendChild(fdsCreate('span', 'fds-status-line', target.plainStatus || target.status || 'Unknown'))
  card.appendChild(fdsCreate('h4', '', target.title || 'Source target'))
  card.appendChild(fdsCreate('p', '', target.detail || 'No details are visible yet.'))
  card.appendChild(fdsCreate('small', '', 'Last run ' + fdsFormatDate(target.latestRunAt)))
  return card
}

function fdsRenderDetail(data) {
  var sources = data.sources || []
  var selected = sources.find(function(source) {
    return source.sourceId === foundationDataSourcesV2State.selectedSourceId
  }) || sources[0]
  if (!selected) return fdsCreate('section', 'fds-detail-empty', 'No source selected.')
  foundationDataSourcesV2State.selectedSourceId = selected.sourceId

  var section = fdsCreate('section', 'fds-detail')
  var header = fdsCreate('div', 'fds-detail-header')
  var copy = fdsCreate('div', '')
  copy.appendChild(fdsCreate('span', 'fds-eyebrow', 'Selected source'))
  copy.appendChild(fdsCreate('h2', '', selected.plainName || selected.title || 'Source'))
  copy.appendChild(fdsCreate('p', '', selected.statusDetail || selected.plainPurpose || 'Source status is available.'))
  header.appendChild(copy)
  var action = fdsCreate('a', 'fds-detail-link', 'Open technical view')
  action.href = selected.drilldownHref || '/foundation#source-lifecycle'
  header.appendChild(action)
  section.appendChild(header)

  var stageGrid = fdsCreate('div', 'fds-detail-stage-grid')
  var labels = selected.stageLabels || {}
  ;['connected', 'extracting', 'synthesizing', 'routing'].forEach(function(key) {
    stageGrid.appendChild(fdsRenderDetailStage(key, (selected.stages || {})[key] || {}, labels))
  })
  section.appendChild(stageGrid)

  var lower = fdsCreate('div', 'fds-detail-lower')

  var targetsPanel = fdsCreate('div', 'fds-detail-panel')
  targetsPanel.appendChild(fdsCreate('span', 'fds-eyebrow', 'What it reads'))
  targetsPanel.appendChild(fdsCreate('h3', '', 'Child targets'))
  if (selected.childTargets && selected.childTargets.length) {
    var targetGrid = fdsCreate('div', 'fds-target-grid')
    selected.childTargets.slice(0, 6).forEach(function(target) {
      targetGrid.appendChild(fdsRenderTarget(target))
    })
    targetsPanel.appendChild(targetGrid)
  } else {
    targetsPanel.appendChild(fdsCreate('p', 'fds-muted-copy', 'No child extraction target is visible yet.'))
  }
  lower.appendChild(targetsPanel)

  var routingPanel = fdsCreate('div', 'fds-detail-panel')
  routingPanel.appendChild(fdsCreate('span', 'fds-eyebrow', 'Where findings can go'))
  routingPanel.appendChild(fdsCreate('h3', '', 'Hub use'))
  var tags = fdsCreate('div', 'fds-tag-row fds-tag-row-large')
  fdsAppendTags(tags, selected.hubTags || [], 12)
  routingPanel.appendChild(tags)
  if (selected.blockers && selected.blockers.length) {
    var blockerList = fdsCreate('div', 'fds-blocker-list')
    blockerList.appendChild(fdsCreate('strong', '', 'Needs attention'))
    selected.blockers.slice(0, 3).forEach(function(blocker) {
      blockerList.appendChild(fdsCreate('p', '', blocker))
    })
    routingPanel.appendChild(blockerList)
  }
  lower.appendChild(routingPanel)

  section.appendChild(lower)
  return section
}

function renderFoundationDataSourcesV2() {
  var root = document.getElementById('found-content')
  if (!root) return
  root.innerHTML = '<div class="panel"><p>Loading shared data sources.</p></div>'

  fetchFoundationDataSourcesV2().then(function(data) {
    if (!foundationDataSourcesV2State.selectedSourceId && data.sources && data.sources[0]) {
      foundationDataSourcesV2State.selectedSourceId = data.sources[0].sourceId
    }

    root.innerHTML = ''
    var page = fdsCreate('div', 'fds-page')
    page.appendChild(fdsRenderHero(data))
    page.appendChild(fdsRenderSourceGrid(data))
    page.appendChild(fdsRenderDetail(data))
    root.appendChild(page)
  }).catch(function(error) {
    root.innerHTML = ''
    var panel = fdsCreate('section', 'panel')
    panel.appendChild(fdsCreate('h3', '', 'Data sources failed to load'))
    panel.appendChild(fdsCreate('p', 'section-intro', error.message || 'Unknown error'))
    root.appendChild(panel)
  })
}

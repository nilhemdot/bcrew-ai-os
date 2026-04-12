function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return date.toLocaleString()
}

function renderMeta(meta) {
  if (!meta.exists) return 'Missing'
  return meta.path + ' · ' + meta.lines + ' lines · updated ' + formatDate(meta.updatedAt)
}

function isInternalMarkdownPath(href) {
  return (
    typeof href === 'string' &&
    !/^(https?:|mailto:|tel:|#)/i.test(href) &&
    /\.md([?#].*)?$/i.test(href)
  )
}

function normalizeDocPath(pathValue) {
  var parts = []

  pathValue.split('/').forEach(function(part) {
    if (!part || part === '.') return
    if (part === '..') {
      parts.pop()
      return
    }
    parts.push(part)
  })

  return parts.join('/')
}

function buildDocHref(href, currentPath) {
  if (!isInternalMarkdownPath(href)) return href

  var cleanHref = href.trim()
  var anchor = ''
  var anchorIndex = cleanHref.indexOf('#')

  if (anchorIndex !== -1) {
    anchor = cleanHref.slice(anchorIndex + 1)
    cleanHref = cleanHref.slice(0, anchorIndex)
  }

  var basePath = cleanHref
  if (!cleanHref.startsWith('docs/')) {
    var currentDir = (currentPath || 'docs/business-strategy.md').split('/').slice(0, -1).join('/')
    basePath = normalizeDocPath(currentDir + '/' + cleanHref)
  }

  var docHref = '/doc?path=' + encodeURIComponent(basePath)
  return anchor ? docHref + '&anchor=' + encodeURIComponent(anchor) : docHref
}

var sectionSupportDocs = {
  'North Star': {
    label: 'Open BHAG model',
    path: 'docs/strategy/bhag-model.md',
  },
  'The Engine': {
    label: 'Open agent engine doc',
    path: 'docs/strategy/agent-engine.md',
  },
  'Two Brands': {
    label: 'Open MarketMasters doc',
    path: 'docs/strategy/marketmasters.md',
  },
  'Governance': {
    label: 'Open governance doc',
    path: 'docs/strategy/governance.md',
  },
  'Current Quarter': {
    label: 'Open quarterly priorities doc',
    path: 'docs/strategy/quarterly-priorities.md',
  },
}

function appendFormattedText(text, parent, currentPath) {
  var re = /(\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g
  var last = 0
  var m

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)))

    if (m[2]) {
      var strong = document.createElement('strong')
      strong.textContent = m[2]
      parent.appendChild(strong)
    } else if (m[3]) {
      var code = document.createElement('code')
      code.textContent = m[3]
      parent.appendChild(code)
    } else if (m[4] && m[5]) {
      var link = document.createElement('a')
      link.textContent = m[4]
      link.setAttribute('href', buildDocHref(m[5], currentPath))
      link.className = 'md-link'
      parent.appendChild(link)
    }

    last = re.lastIndex
  }

  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)))
}

function renderStatusCard(item) {
  var card = document.createElement('article')
  card.className = 'status-card status-' + item.status

  var top = document.createElement('div')
  top.className = 'status-top'

  var label = document.createElement('span')
  label.className = 'status-label'
  label.textContent = item.label
  top.appendChild(label)

  var pill = document.createElement('span')
  pill.className = 'status-pill'
  pill.textContent = item.status
  top.appendChild(pill)

  card.appendChild(top)

  var detail = document.createElement('p')
  detail.textContent = item.detail
  card.appendChild(detail)

  return card
}

function isTableRow(line) {
  return line.trim().startsWith('|') && line.trim().endsWith('|')
}

function isSeparatorRow(line) {
  return /^\|[\s\-:|]+\|$/.test(line.trim())
}

function parseTableCells(line) {
  return line.split('|').slice(1, -1).map(function(cell) {
    return cell.trim()
  })
}

function renderTable(rows, currentPath) {
  var table = document.createElement('table')
  table.className = 'md-table'

  var thead = document.createElement('thead')
  var tbody = document.createElement('tbody')
  var headerCells = parseTableCells(rows[0])
  var headerRow = document.createElement('tr')

  headerCells.forEach(function(cell) {
    var th = document.createElement('th')
    appendFormattedText(cell, th, currentPath)
    headerRow.appendChild(th)
  })

  thead.appendChild(headerRow)
  table.appendChild(thead)

  for (var i = 2; i < rows.length; i++) {
    var tr = document.createElement('tr')
    var cells = parseTableCells(rows[i])

    cells.forEach(function(cell) {
      var td = document.createElement('td')
      appendFormattedText(cell, td, currentPath)
      tr.appendChild(td)
    })

    tbody.appendChild(tr)
  }

  table.appendChild(tbody)
  return table
}

function renderMarkdownBlock(markdown, currentPath) {
  var container = document.createElement('div')
  container.className = 'markdown-block'
  var lines = markdown.split('\n')
  var i = 0

  while (i < lines.length) {
    var line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (/^---+$/.test(line.trim())) {
      container.appendChild(document.createElement('hr'))
      i++
      continue
    }

    if (line.startsWith('### ')) {
      var h = document.createElement('h5')
      h.className = 'md-subheading'
      appendFormattedText(line.slice(4).trim(), h, currentPath)
      container.appendChild(h)
      i++
      continue
    }

    if (isTableRow(line)) {
      var tableRows = []
      while (i < lines.length && isTableRow(lines[i])) {
        if (!isSeparatorRow(lines[i])) {
          tableRows.push(lines[i])
        } else {
          tableRows.splice(1, 0, lines[i])
        }
        i++
      }
      if (tableRows.length >= 2) container.appendChild(renderTable(tableRows, currentPath))
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      var ol = document.createElement('ol')
      ol.className = 'md-ol'
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        var oli = document.createElement('li')
        appendFormattedText(lines[i].replace(/^\d+\.\s/, ''), oli, currentPath)
        ol.appendChild(oli)
        i++
      }
      container.appendChild(ol)
      continue
    }

    if (line.startsWith('- ')) {
      var ul = document.createElement('ul')
      while (i < lines.length && lines[i].startsWith('- ')) {
        var li = document.createElement('li')
        appendFormattedText(lines[i].slice(2), li, currentPath)
        ul.appendChild(li)
        i++
      }
      container.appendChild(ul)
      continue
    }

    var p = document.createElement('p')
    appendFormattedText(line, p, currentPath)
    container.appendChild(p)
    i++
  }

  return container
}

function renderSection(section, currentPath) {
  var article = document.createElement('article')
  article.className = 'section-card'

  var title = document.createElement('h4')
  appendFormattedText(section.title, title, currentPath)
  article.appendChild(title)
  article.appendChild(renderMarkdownBlock(section.content, currentPath))

  var supportDoc = sectionSupportDocs[section.title]
  if (supportDoc) {
    var supportLink = document.createElement('a')
    supportLink.className = 'section-support-link'
    supportLink.href = buildDocHref(supportDoc.path, currentPath)
    supportLink.textContent = supportDoc.label
    article.appendChild(supportLink)
  }

  return article
}

function renderDocCard(doc) {
  var article = document.createElement('article')
  article.className = 'section-card'

  var title = document.createElement('h4')
  var titleLink = document.createElement('a')
  titleLink.className = 'section-link'
  titleLink.href = buildDocHref(doc.meta.path, doc.meta.path)
  titleLink.textContent = doc.meta.path
  title.appendChild(titleLink)
  article.appendChild(title)

  var meta = document.createElement('p')
  meta.className = 'support-meta'
  meta.textContent = doc.meta.exists
    ? doc.meta.lines + ' lines · updated ' + formatDate(doc.meta.updatedAt)
    : 'Missing'
  article.appendChild(meta)

  if (doc.meta.exists) {
    var openLink = document.createElement('a')
    openLink.className = 'support-open-link'
    openLink.href = buildDocHref(doc.meta.path, doc.meta.path)
    openLink.textContent = 'Open full doc'
    article.appendChild(openLink)
  }

  doc.sections.slice(0, 3).forEach(function(section) {
    var sub = document.createElement('div')
    sub.className = 'support-section'

    var subTitle = document.createElement('h5')
    appendFormattedText(section.title, subTitle, doc.meta.path)
    sub.appendChild(subTitle)
    sub.appendChild(renderMarkdownBlock(section.content, doc.meta.path))
    article.appendChild(sub)
  })

  return article
}

function renderBacklogItem(item) {
  var card = document.createElement('article')
  card.className = 'backlog-card'

  var meta = document.createElement('div')
  meta.className = 'backlog-card-meta'

  var priority = document.createElement('span')
  priority.className = 'backlog-pill backlog-priority-' + item.priority.toLowerCase()
  priority.textContent = item.priority
  meta.appendChild(priority)

  if (item.rank) {
    var rank = document.createElement('span')
    rank.className = 'backlog-rank'
    rank.textContent = '#' + item.rank
    meta.appendChild(rank)
  }

  card.appendChild(meta)

  var title = document.createElement('h5')
  title.textContent = item.title
  card.appendChild(title)

  var id = document.createElement('div')
  id.className = 'backlog-id'
  id.textContent = item.id
  card.appendChild(id)

  var summary = document.createElement('p')
  summary.className = 'backlog-copy'
  summary.textContent = item.summary
  card.appendChild(summary)

  var why = document.createElement('p')
  why.className = 'backlog-copy backlog-copy-secondary'
  why.textContent = item.whyItMatters
  card.appendChild(why)

  var nextAction = document.createElement('p')
  nextAction.className = 'backlog-next'
  nextAction.innerHTML = '<strong>Next:</strong> ' + item.nextAction
  card.appendChild(nextAction)

  if (item.statusNote) {
    var note = document.createElement('p')
    note.className = 'backlog-note'
    note.textContent = item.statusNote
    card.appendChild(note)
  }

  return card
}

var backlogLanes = [
  { key: 'research', label: 'Research' },
  { key: 'scoped', label: 'Scoped' },
  { key: 'ranked', label: 'Ranked' },
  { key: 'executing', label: 'Executing' },
  { key: 'parked', label: 'Parked' },
]

function renderTeamBoard(team, items) {
  var board = document.createElement('section')
  board.className = 'team-board'

  var header = document.createElement('div')
  header.className = 'team-board-header'

  var title = document.createElement('h4')
  title.textContent = team === 'dev' ? 'Dev Team' : 'Marketing Team'
  header.appendChild(title)

  var count = document.createElement('span')
  count.className = 'team-board-count'
  count.textContent = items.length + ' items'
  header.appendChild(count)

  board.appendChild(header)

  var laneGrid = document.createElement('div')
  laneGrid.className = 'backlog-board'

  backlogLanes.forEach(function(lane) {
    var laneEl = document.createElement('div')
    laneEl.className = 'backlog-lane'

    var laneTop = document.createElement('div')
    laneTop.className = 'backlog-lane-top'

    var laneTitle = document.createElement('h5')
    laneTitle.textContent = lane.label
    laneTop.appendChild(laneTitle)

    var laneCount = document.createElement('span')
    laneCount.className = 'backlog-lane-count'
    var laneItems = items.filter(function(item) { return item.lane === lane.key })
    laneCount.textContent = laneItems.length
    laneTop.appendChild(laneCount)

    laneEl.appendChild(laneTop)

    var laneCards = document.createElement('div')
    laneCards.className = 'backlog-lane-cards'

    if (!laneItems.length) {
      var empty = document.createElement('p')
      empty.className = 'lane-empty'
      empty.textContent = 'Nothing here yet.'
      laneCards.appendChild(empty)
    } else {
      laneItems.forEach(function(item) {
        laneCards.appendChild(renderBacklogItem(item))
      })
    }

    laneEl.appendChild(laneCards)
    laneGrid.appendChild(laneEl)
  })

  board.appendChild(laneGrid)
  return board
}

function renderDecisionCard(item) {
  var card = document.createElement('article')
  card.className = 'decision-card'

  var top = document.createElement('div')
  top.className = 'decision-top'

  var titleWrap = document.createElement('div')
  var title = document.createElement('h4')
  title.textContent = item.title
  titleWrap.appendChild(title)

  var id = document.createElement('div')
  id.className = 'decision-id'
  id.textContent = item.id + ' · ' + item.category
  titleWrap.appendChild(id)
  top.appendChild(titleWrap)

  var status = document.createElement('span')
  status.className = 'status-pill status-pill-static status-' + item.status
  status.textContent = item.status
  top.appendChild(status)

  card.appendChild(top)

  var summary = document.createElement('p')
  summary.className = 'decision-copy'
  summary.textContent = item.summary
  card.appendChild(summary)

  if (item.rationale) {
    var rationale = document.createElement('p')
    rationale.className = 'decision-rationale'
    rationale.innerHTML = '<strong>Why:</strong> ' + item.rationale
    card.appendChild(rationale)
  }

  if (item.sourceRef) {
    var source = document.createElement('p')
    source.className = 'decision-source'
    source.innerHTML = '<strong>Source:</strong> ' + item.sourceRef
    card.appendChild(source)
  }

  return card
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
    var owner = document.createElement('p')
    owner.className = 'capture-owner'
    owner.innerHTML = '<strong>Owner:</strong> ' + item.owner
    card.appendChild(owner)
  }

  return card
}

function groupBacklogByTeam(items) {
  return {
    dev: items.filter(function(item) { return item.team === 'dev' }),
    marketing: items.filter(function(item) { return item.team === 'marketing' }),
  }
}

async function init() {
  var responses = await Promise.all([
    fetch('/api/source-of-truth'),
    fetch('/api/foundation-hub'),
  ])

  var sourceRes = responses[0]
  var hubRes = responses[1]

  if (!sourceRes.ok) throw new Error('Source of truth API failed.')
  if (!hubRes.ok) throw new Error('Foundation hub API failed.')

  var data = await sourceRes.json()
  var hub = await hubRes.json()

  document.getElementById('hero-copy').textContent =
    'Foundation layer of the BCrew AI OS. Strategy docs, source contracts, business memory, and ranked work are now visible in one place.'

  var statusGrid = document.getElementById('status-grid')
  data.systemStatus.forEach(function(item) {
    statusGrid.appendChild(renderStatusCard(item))
  })

  document.getElementById('business-meta').textContent = renderMeta(data.foundation.businessStrategy.meta)
  document.getElementById('registry-meta').textContent = renderMeta(data.foundation.sourceRegistry.meta)

  var businessSections = document.getElementById('business-sections')
  data.foundation.businessStrategy.sections.forEach(function(section) {
    businessSections.appendChild(renderSection(section, data.foundation.businessStrategy.meta.path))
  })

  var supporting = document.getElementById('supporting-strategy')
  data.foundation.supportingStrategy.forEach(function(doc) {
    supporting.appendChild(renderDocCard(doc))
  })

  var registrySections = document.getElementById('registry-sections')
  if (!data.foundation.sourceRegistry.meta.exists) {
    var notice = document.createElement('p')
    notice.textContent = 'Source registry not found. Create docs/source-registry.md.'
    registrySections.appendChild(notice)
  } else {
    registrySections.className = 'section-list'
    data.foundation.sourceRegistry.sections.forEach(function(section) {
      registrySections.appendChild(renderSection(section, data.foundation.sourceRegistry.meta.path))
    })
  }

  document.getElementById('memory-meta').textContent = hub.memoryStatus.length + ' components tracked'
  var memoryGrid = document.getElementById('memory-grid')
  hub.memoryStatus.forEach(function(item) {
    memoryGrid.appendChild(renderStatusCard({
      label: item.label,
      status: item.status,
      detail: item.detail,
    }))
  })

  var backlogGroups = groupBacklogByTeam(hub.backlogItems)
  document.getElementById('backlog-meta').textContent = hub.backlogItems.length + ' active items'
  var teamBacklogGrid = document.getElementById('team-backlog-grid')
  teamBacklogGrid.appendChild(renderTeamBoard('dev', backlogGroups.dev))
  teamBacklogGrid.appendChild(renderTeamBoard('marketing', backlogGroups.marketing))

  document.getElementById('decisions-meta').textContent = hub.decisions.length + ' locked decisions'
  var decisionList = document.getElementById('decision-list')
  hub.decisions.forEach(function(item) {
    decisionList.appendChild(renderDecisionCard(item))
  })

  var openQuestions = document.getElementById('open-questions-list')
  hub.openQuestions.forEach(function(item) {
    openQuestions.appendChild(renderCaptureItem(item))
  })

  var parkingLot = document.getElementById('parking-lot-list')
  hub.parkingLot.forEach(function(item) {
    parkingLot.appendChild(renderCaptureItem(item))
  })
}

init().catch(function(error) {
  document.getElementById('hero-copy').textContent = 'Failed to load dashboard: ' + error.message
})

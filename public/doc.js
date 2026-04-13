function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date) + ' ET'
}

function formatAsOfDate(value) {
  if (!value) return ''

  var date = new Date(value)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key)
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

function resolveDocPath(href, currentPath) {
  if (typeof href !== 'string') return href
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) return href
  if (!/\.md([?#].*)?$/i.test(href)) return href

  var cleanHref = href.trim()
  var anchor = ''
  var anchorIndex = cleanHref.indexOf('#')

  if (anchorIndex !== -1) {
    anchor = cleanHref.slice(anchorIndex + 1)
    cleanHref = cleanHref.slice(0, anchorIndex)
  }

  var basePath = cleanHref
  if (!cleanHref.startsWith('docs/')) {
    var currentDir = currentPath.split('/').slice(0, -1).join('/')
    basePath = normalizeDocPath(currentDir + '/' + cleanHref)
  }

  var docHref = '/doc?path=' + encodeURIComponent(basePath)
  return anchor ? docHref + '&anchor=' + encodeURIComponent(anchor) : docHref
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
      link.setAttribute('href', resolveDocPath(m[5], currentPath))
      link.className = 'md-link'
      parent.appendChild(link)
    }

    last = re.lastIndex
  }

  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)))
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

  var wrap = document.createElement('div')
  wrap.className = 'md-table-wrap'
  wrap.appendChild(table)
  return wrap
}

function renderInlineSourceCard(groupTitle, rows, options, sourceContractMap) {
  var hideTitle = options && options.hideTitle
  var card = document.createElement('section')
  card.className = 'doc-source-card doc-source-card-inline'

  var asOfValues = rows
    .map(function(row) { return formatAsOfDate(row.asOf) })
    .filter(Boolean)
  var uniqueAsOfValues = Array.from(new Set(asOfValues))

  var cardTop = document.createElement('div')
  cardTop.className = 'doc-source-card-top'

  var titleWrap = document.createElement('div')
  if (!hideTitle) {
    var title = document.createElement('h5')
    title.textContent = groupTitle
    titleWrap.appendChild(title)
  }

  var sourceId = document.createElement('div')
  sourceId.className = 'doc-source-id'
  sourceId.textContent = rows[0].sourceId
  titleWrap.appendChild(sourceId)
  appendSourceActions(titleWrap, getSourceActionsForIds([rows[0].sourceId], sourceContractMap))
  cardTop.appendChild(titleWrap)

  if (uniqueAsOfValues.length) {
    var asOf = document.createElement('div')
    asOf.className = 'doc-source-asof'
    asOf.textContent = 'As of ' + uniqueAsOfValues.join(', ') + ' (Eastern Time)'
    cardTop.appendChild(asOf)
  }

  card.appendChild(cardTop)

  var table = document.createElement('table')
  table.className = 'doc-source-table'

  var tbody = document.createElement('tbody')
  rows.forEach(function(row) {
    var tr = document.createElement('tr')

    var label = document.createElement('th')
    label.textContent = row.label
    tr.appendChild(label)

    var value = document.createElement('td')
    value.textContent = row.value
    tr.appendChild(value)

    tbody.appendChild(tr)
  })

  table.appendChild(tbody)
  card.appendChild(table)

  if (rows[0].detail) {
    var detail = document.createElement('p')
    detail.className = 'doc-source-detail'
    detail.textContent = rows[0].detail
    card.appendChild(detail)
  }

  return card
}

function sortSnapshotRows(rows) {
  return rows.slice().sort(function(a, b) {
    return (a.sortOrder || 0) - (b.sortOrder || 0)
  })
}

function parseBhagTargetNumber(value) {
  if (!value) return null

  var cleaned = String(value).trim()
  var multiplier = 1

  if (/B\b/i.test(cleaned)) multiplier = 1000000000
  else if (/M\b/i.test(cleaned)) multiplier = 1000000
  else if (/K\b/i.test(cleaned)) multiplier = 1000

  var numeric = cleaned.replace(/[^0-9.]/g, '')
  if (!numeric) return null

  var parsed = Number(numeric)
  if (!Number.isFinite(parsed)) return null

  return parsed * multiplier
}

function formatBhagGrowthPercent(previousValue, currentValue) {
  if (!Number.isFinite(previousValue) || !Number.isFinite(currentValue) || previousValue <= 0) return '—'

  var growth = ((currentValue - previousValue) / previousValue) * 100
  if (!Number.isFinite(growth)) return '—'

  return Math.round(growth) + '%'
}

function formatSourceSummary(cardGroups) {
  return cardGroups
    .map(function(group) { return group.sourceId })
    .filter(function(value, index, array) {
      return value && array.indexOf(value) === index
    })
    .join(' · ')
}

function buildSourceContractMap(sourceContracts) {
  var map = {}
  ;(sourceContracts || []).forEach(function(contract) {
    map[contract.sourceId] = contract
  })
  return map
}

function getSourceActionsForIds(sourceIds, sourceContractMap) {
  var seen = {}
  var actions = []

  ;(sourceIds || []).forEach(function(sourceId) {
    var contract = sourceContractMap && sourceContractMap[sourceId]
    ;((contract && contract.actions) || []).forEach(function(action) {
      var key = action.label + '|' + action.href
      if (seen[key]) return
      seen[key] = true
      actions.push(action)
    })
  })

  return actions
}

function appendSourceActions(target, actions) {
  if (!actions || !actions.length) return

  var actionRow = document.createElement('div')
  actionRow.className = 'doc-source-actions'

  actions.forEach(function(action) {
    var link = document.createElement('a')
    link.className = 'doc-source-link'
    link.href = action.href
    if (/^https?:/i.test(action.href)) {
      link.target = '_blank'
      link.rel = 'noreferrer'
    }
    link.textContent = action.label
    actionRow.appendChild(link)
  })

  target.appendChild(actionRow)
}

function getBhagPaceExplanation(groupTitle) {
  if (groupTitle === 'Team Goal: $2B') {
    return 'Pace compares actual YTD executed volume to where we should be by today. Actual volume uses Date Firm (Executed) and Volume Credit.'
  }

  if (groupTitle === 'Community Goal: 10,000 Agents') {
    return 'Pace compares the current community count to where we should be by today, based on progress toward the year-end target.'
  }

  return 'Pace shows whether current results are ahead of or behind the prorated target-to-date.'
}

function getDirectionalClass(value) {
  if (/^(Ahead|Above target)/i.test(value)) return 'engine-summary-value-positive'
  if (/^(Behind|Below target)/i.test(value)) return 'engine-summary-value-negative'
  return ''
}

function getEngineMetricExplanation(metricKey) {
  if (metricKey === 'Required Start-of-Year Agents') {
    return 'The number of active agents the model says we need in place when next year starts.'
  }

  if (metricKey === 'Current Active Agents') {
    return 'The current active, capacity-producing agent count from the live Agent Engine tab.'
  }

  if (metricKey === 'Capacity Gap') {
    return 'The difference between the required start-of-year agent count and the active agents we have now.'
  }

  if (metricKey === 'Required Recruiting Pace') {
    return 'The monthly recruiting pace the current model needs in order to close the gap and start next year correctly.'
  }

  if (metricKey === 'Current Recruiting Pace') {
    return 'The recent 6-month rolling recruiting pace from the live Agent Engine tab.'
  }

  if (metricKey === 'Production Gap') {
    return 'The difference between current average monthly GCI per active agent and the model target.'
  }

  if (metricKey === 'Production Target / Agent') {
    return 'The monthly GCI per active agent the current model assumes.'
  }

  if (metricKey === 'Live Attrition Pressure') {
    return 'This is the live operating attrition signal from the Agent Engine tab. It is not the same as the planning attrition assumption still buried in the formula.'
  }

  if (metricKey === 'Planning Attrition Assumption') {
    return 'This still needs to be exposed cleanly from the source of truth. Right now the formula uses it, but the system cannot read it directly yet.'
  }

  if (metricKey === 'Actual Split') {
    return 'The live average split currently being realized in the Agent Engine tab.'
  }

  if (metricKey === 'Target Split') {
    return 'The model target split used for planning.'
  }

  if (metricKey === 'Split Gap') {
    return 'The difference between the current live split and the model target split.'
  }

  return ''
}

function closeBhagInfoPopovers() {
  document.querySelectorAll('.bhag-info-popover-open').forEach(function(popover) {
    popover.classList.remove('bhag-info-popover-open')
  })
}

function ensureBhagInfoPopoverHandler() {
  if (document.__bhagInfoPopoverHandlerBound) return
  document.__bhagInfoPopoverHandlerBound = true

  document.addEventListener('click', function(event) {
    if (event.target.closest('.bhag-info-popover')) return
    closeBhagInfoPopovers()
  })
}

function appendBhagInfoBadge(target, explanation) {
  if (!explanation) return

  ensureBhagInfoPopoverHandler()

  var popover = document.createElement('span')
  popover.className = 'bhag-info-popover'

  var badge = document.createElement('button')
  badge.className = 'bhag-info-badge'
  badge.type = 'button'
  badge.textContent = 'i'
  badge.setAttribute('aria-label', 'Show pace calculation details')

  var panel = document.createElement('span')
  panel.className = 'bhag-info-panel'
  panel.textContent = explanation

  badge.addEventListener('click', function(event) {
    event.preventDefault()
    event.stopPropagation()
    var willOpen = !popover.classList.contains('bhag-info-popover-open')
    closeBhagInfoPopovers()
    if (willOpen) popover.classList.add('bhag-info-popover-open')
  })

  popover.appendChild(badge)
  popover.appendChild(panel)
  target.appendChild(popover)
}

function renderBhagSummaryCard(groupTitle, cardGroups, sourceContractMap) {
  var rows = sortSnapshotRows(
    cardGroups.reduce(function(all, group) {
      return all.concat(group.rows || [])
    }, [])
  )
  var yearRows = rows.filter(function(row) {
    return /^\d{4}$/.test(row.label)
  })

  if (!yearRows.length) return null

  var summaryMap = {}
  rows.forEach(function(row) {
    if (!/^\d{4}$/.test(row.label)) summaryMap[row.label] = row.value
  })
  var startedKey = Object.keys(summaryMap).find(function(key) {
    return /^Started \d{4}$/.test(key)
  })
  var currentYearLabel = startedKey ? startedKey.replace('Started ', '') : (yearRows[0] ? yearRows[0].label : '')

  var asOfValues = rows
    .map(function(row) { return formatAsOfDate(row.asOf) })
    .filter(Boolean)
  var uniqueAsOfValues = Array.from(new Set(asOfValues))

  var card = document.createElement('section')
  card.className = 'doc-source-card bhag-summary-card'

  var cardTop = document.createElement('div')
  cardTop.className = 'doc-source-card-top'

  var titleWrap = document.createElement('div')
  var source = document.createElement('div')
  source.className = 'doc-source-id'
  source.textContent = formatSourceSummary(cardGroups)
  titleWrap.appendChild(source)
  appendSourceActions(
    titleWrap,
    getSourceActionsForIds(
      cardGroups.map(function(group) { return group.sourceId }),
      sourceContractMap
    )
  )

  cardTop.appendChild(titleWrap)

  if (uniqueAsOfValues.length) {
    var asOf = document.createElement('div')
    asOf.className = 'doc-source-asof'
    asOf.textContent = 'As of ' + uniqueAsOfValues.join(', ') + ' (Eastern Time)'
    cardTop.appendChild(asOf)
  }

  card.appendChild(cardTop)

  var tableWrap = document.createElement('div')
  tableWrap.className = 'md-table-wrap'

  var table = document.createElement('table')
  table.className = 'md-table bhag-summary-table'

  var thead = document.createElement('thead')
  var headRow = document.createElement('tr')
  ;['Year', 'Target', 'Target Growth', 'Should Be', 'Current', 'Pace']
    .filter(Boolean)
    .forEach(function(label) {
      var th = document.createElement('th')
      th.textContent = label
      headRow.appendChild(th)
    })
  thead.appendChild(headRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  yearRows.forEach(function(row, index) {
    var tr = document.createElement('tr')
    if (row.label === currentYearLabel) tr.className = 'bhag-summary-row-current'
    var year = document.createElement('th')
    year.textContent = row.label
    tr.appendChild(year)

    var target = document.createElement('td')
    target.textContent = row.value
    tr.appendChild(target)

    var explicitGrowth = summaryMap['Growth ' + row.label]
    var fallbackGrowth = index === 0
      ? 'Base Year'
      : formatBhagGrowthPercent(
        parseBhagTargetNumber(yearRows[index - 1].value),
        parseBhagTargetNumber(row.value)
      )

    var growth = document.createElement('td')
    growth.textContent = explicitGrowth && explicitGrowth !== '—'
      ? explicitGrowth
      : fallbackGrowth
    tr.appendChild(growth)

    var shouldBe = document.createElement('td')
    shouldBe.textContent = row.label === currentYearLabel ? summaryMap['Should Be'] || '—' : '—'
    tr.appendChild(shouldBe)

    var current = document.createElement('td')
    current.textContent = row.label === currentYearLabel ? summaryMap['Actual'] || '—' : '—'
    tr.appendChild(current)

    var pace = document.createElement('td')
    if (row.label === currentYearLabel) {
      var paceWrap = document.createElement('span')
      paceWrap.className = 'bhag-pace-wrap'

      var paceValue = document.createElement('span')
      paceValue.textContent = summaryMap['Pace'] || '—'
      paceWrap.appendChild(paceValue)
      appendBhagInfoBadge(paceWrap, getBhagPaceExplanation(groupTitle))
      pace.appendChild(paceWrap)
    } else {
      pace.textContent = '—'
    }
    if (row.label === currentYearLabel) {
      var paceText = summaryMap['Pace'] || ''
      if (/^Ahead by/i.test(paceText)) pace.className = 'bhag-pace bhag-pace-positive'
      else if (/^Behind by/i.test(paceText)) pace.className = 'bhag-pace bhag-pace-negative'
      else pace.className = 'bhag-pace'
    }
    tr.appendChild(pace)

    tbody.appendChild(tr)
  })

  table.appendChild(tbody)
  tableWrap.appendChild(table)
  card.appendChild(tableWrap)

  if (rows[0].detail) {
    var detail = document.createElement('p')
    detail.className = 'doc-source-detail'
    detail.textContent = rows[0].detail
    card.appendChild(detail)
  }

  return card
}

function renderEnginePathCard(groupTitle, cardGroups, sourceContractMap) {
  var rows = sortSnapshotRows(
    cardGroups.reduce(function(all, group) {
      return all.concat(group.rows || [])
    }, [])
  )

  if (!rows.length) return null

  var summaryMap = {}
  rows.forEach(function(row) {
    summaryMap[row.label] = row.value
  })

  var yearRows = rows.filter(function(row) {
    return /^\d{4}$/.test(row.label)
  })

  if (!yearRows.length) return null

  var nextYearLabel = String(Number(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
  }).format(new Date())) + 1)

  var asOfValues = rows
    .map(function(row) {
      return row.asOf ? formatAsOfDate(row.asOf) : ''
    })
    .filter(Boolean)
  var uniqueAsOfValues = Array.from(new Set(asOfValues))

  var card = document.createElement('section')
  card.className = 'doc-source-card engine-summary-card'

  var top = document.createElement('div')
  top.className = 'doc-source-card-top'

  var titleWrap = document.createElement('div')
  var source = document.createElement('div')
  source.className = 'doc-source-id'
  source.textContent = formatSourceSummary(cardGroups)
  titleWrap.appendChild(source)
  appendSourceActions(
    titleWrap,
    getSourceActionsForIds(
      cardGroups.map(function(group) { return group.sourceId }),
      sourceContractMap
    )
  )
  top.appendChild(titleWrap)

  if (uniqueAsOfValues.length) {
    var asOf = document.createElement('div')
    asOf.className = 'doc-source-asof'
    asOf.textContent = 'As of ' + uniqueAsOfValues.join(', ') + ' (Eastern Time)'
    top.appendChild(asOf)
  }

  card.appendChild(top)

  var tableWrap = document.createElement('div')
  tableWrap.className = 'md-table-wrap'

  var table = document.createElement('table')
  table.className = 'md-table engine-path-table'

  var thead = document.createElement('thead')
  var headRow = document.createElement('tr')
  ;['Year', 'Volume Target', 'Required Agents'].forEach(function(label) {
    var th = document.createElement('th')
    th.textContent = label
    headRow.appendChild(th)
  })
  thead.appendChild(headRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  yearRows.forEach(function(row) {
    var tr = document.createElement('tr')
    if (row.label === nextYearLabel) tr.className = 'engine-path-row-current'

    var year = document.createElement('th')
    year.textContent = row.label
    tr.appendChild(year)

    var target = document.createElement('td')
    target.textContent = row.value
    tr.appendChild(target)

    var required = document.createElement('td')
    required.textContent = summaryMap['Required Agents ' + row.label] || '—'
    tr.appendChild(required)

    tbody.appendChild(tr)
  })

  table.appendChild(tbody)
  tableWrap.appendChild(table)
  card.appendChild(tableWrap)

  if (rows[0].detail) {
    var detail = document.createElement('p')
    detail.className = 'doc-source-detail'
    detail.textContent = rows[0].detail
    card.appendChild(detail)
  }

  return card
}

function renderEngineRequirementCard(groupTitle, cardGroups, sourceContractMap) {
  var rows = sortSnapshotRows(
    cardGroups.reduce(function(all, group) {
      return all.concat(group.rows || [])
    }, [])
  )

  if (!rows.length) return null

  var asOfValues = rows
    .map(function(row) {
      return row.asOf ? formatAsOfDate(row.asOf) : ''
    })
    .filter(Boolean)
  var uniqueAsOfValues = Array.from(new Set(asOfValues))

  var card = document.createElement('section')
  card.className = 'doc-source-card engine-summary-card'

  var top = document.createElement('div')
  top.className = 'doc-source-card-top'

  var titleWrap = document.createElement('div')
  var source = document.createElement('div')
  source.className = 'doc-source-id'
  source.textContent = formatSourceSummary(cardGroups)
  titleWrap.appendChild(source)
  appendSourceActions(
    titleWrap,
    getSourceActionsForIds(
      cardGroups.map(function(group) { return group.sourceId }),
      sourceContractMap
    )
  )
  top.appendChild(titleWrap)

  if (uniqueAsOfValues.length) {
    var asOf = document.createElement('div')
    asOf.className = 'doc-source-asof'
    asOf.textContent = 'As of ' + uniqueAsOfValues.join(', ') + ' (Eastern Time)'
    top.appendChild(asOf)
  }

  card.appendChild(top)

  var grid = document.createElement('div')
  grid.className = 'engine-summary-grid'

  ;[
    {
      title: 'Model Inputs',
      metrics: [
        'Next-Year Volume Target',
        'Current Productivity Assumption',
        'Production Target / Agent',
        'Target Split',
      ],
    },
    {
      title: 'Current Reality',
      metrics: [
        'Current Active Agents',
        'Current Recruiting Pace',
        'Current Avg Production / Agent',
        'Actual Split',
      ],
    },
    {
      title: 'Gap To Close',
      metrics: [
        'Required Start-of-Year Agents',
        'Capacity Gap',
        'Required Recruiting Pace',
        'Production Gap',
        'Split Gap',
      ],
    },
    {
      title: 'Current Pressures',
      metrics: [
        'Planning Attrition Assumption',
        'Live Attrition Pressure',
        'Avg Additions / Month',
        'Avg Attrition / Month',
      ],
    },
  ].forEach(function(sectionDef) {
    var section = document.createElement('section')
    section.className = 'engine-summary-section'

    var heading = document.createElement('div')
    heading.className = 'engine-summary-heading'
    heading.textContent = sectionDef.title
    section.appendChild(heading)

    sectionDef.metrics.forEach(function(metricKey) {
      var row = document.createElement('div')
      row.className = 'engine-summary-metric'

      var labelWrap = document.createElement('span')
      labelWrap.className = 'engine-summary-label-wrap'

      var label = document.createElement('span')
      label.className = 'engine-summary-label'
      label.textContent = metricKey
      labelWrap.appendChild(label)

      var explanation = getEngineMetricExplanation(metricKey)
      if (explanation) appendBhagInfoBadge(labelWrap, explanation)
      row.appendChild(labelWrap)

      var value = document.createElement('span')
      value.className = 'engine-summary-value'
      var metricRow = rows.find(function(sourceRow) { return sourceRow.label === metricKey })
      value.textContent = metricRow ? metricRow.value : '—'
      var directionalClass = getDirectionalClass(value.textContent)
      if (directionalClass) value.classList.add(directionalClass)
      row.appendChild(value)

      section.appendChild(row)
    })

    grid.appendChild(section)
  })

  card.appendChild(grid)

  if (rows[0].detail) {
    var detail = document.createElement('p')
    detail.className = 'doc-source-detail'
    detail.textContent = 'This ties the BHAG builder assumptions to current recruiting reality. The planning attrition assumption still needs to be exposed cleanly from the source.'
    card.appendChild(detail)
  }

  return card
}

function renderMarkdownBlock(markdown, currentPath, sourceGroups, sourceContractMap) {
  var container = document.createElement('div')
  container.className = 'markdown-block'
  var lines = markdown.split('\n')
  var i = 0
  var pendingSummaryCard = null

  function flushPendingSummaryCard() {
    if (!pendingSummaryCard) return
    container.appendChild(pendingSummaryCard)
    pendingSummaryCard = null
  }

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

    if (line.startsWith('# ')) {
      flushPendingSummaryCard()
      var h1 = document.createElement('h2')
      h1.className = 'doc-markdown-heading doc-markdown-heading-1'
      var h1Text = line.slice(2).trim()
      h1.id = slugify(h1Text)
      appendFormattedText(h1Text, h1, currentPath)
      container.appendChild(h1)
      i++
      continue
    }

    if (line.startsWith('## ')) {
      flushPendingSummaryCard()
      var h2 = document.createElement('h3')
      h2.className = 'doc-markdown-heading doc-markdown-heading-2'
      var h2Text = line.slice(3).trim()
      h2.id = slugify(h2Text)
      appendFormattedText(h2Text, h2, currentPath)
      container.appendChild(h2)
      if (sourceGroups && sourceGroups[h2Text]) {
        var isBhagDoc = currentPath === 'docs/strategy/bhag-model.md'
        var isBhagSection = h2Text === 'Team Goal: $2B' || h2Text === 'Community Goal: 10,000 Agents'
        var isEngineDoc = currentPath === 'docs/strategy/agent-engine.md'
        var isEnginePathSection = h2Text === 'Required Agent Path'
        var isEngineRequirementSection = h2Text === 'Current Requirement'

        if (isBhagDoc && isBhagSection) {
          var bhagCard = renderBhagSummaryCard(h2Text, sourceGroups[h2Text], sourceContractMap)
          if (bhagCard) {
            pendingSummaryCard = bhagCard
          }
        } else if (isEngineDoc && isEnginePathSection) {
          var enginePathCard = renderEnginePathCard(h2Text, sourceGroups[h2Text], sourceContractMap)
          if (enginePathCard) pendingSummaryCard = enginePathCard
        } else if (isEngineDoc && isEngineRequirementSection) {
          var engineRequirementCard = renderEngineRequirementCard(h2Text, sourceGroups[h2Text], sourceContractMap)
          if (engineRequirementCard) pendingSummaryCard = engineRequirementCard
        } else {
          sourceGroups[h2Text].forEach(function(cardGroup) {
            container.appendChild(renderInlineSourceCard(h2Text, cardGroup.rows, { hideTitle: true }, sourceContractMap))
          })
        }
      }
      i++
      continue
    }

    if (line.startsWith('### ')) {
      flushPendingSummaryCard()
      var h3 = document.createElement('h4')
      h3.className = 'md-subheading'
      var h3Text = line.slice(4).trim()
      h3.id = slugify(h3Text)
      appendFormattedText(h3Text, h3, currentPath)
      container.appendChild(h3)
      i++
      continue
    }

    if (isTableRow(line)) {
      flushPendingSummaryCard()
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
      flushPendingSummaryCard()
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
      flushPendingSummaryCard()
      continue
    }

    var p = document.createElement('p')
    appendFormattedText(line, p, currentPath)
    container.appendChild(p)
    flushPendingSummaryCard()
    i++
  }

  flushPendingSummaryCard()
  return container
}

function groupSourceSnapshot(rows) {
  var groups = {}

  rows.forEach(function(row) {
    if (!groups[row.groupTitle]) groups[row.groupTitle] = []

    var cards = groups[row.groupTitle]
    var existing = cards.find(function(card) {
      return card.sourceId === row.sourceId && card.detail === row.detail
    })

    if (!existing) {
      existing = {
        sourceId: row.sourceId,
        detail: row.detail,
        rows: [],
      }
      cards.push(existing)
    }

    existing.rows.push(row)
  })

  return groups
}

function isLiveDocPath(docPath) {
  return docPath === 'docs/strategy/bhag-model.md' || docPath === 'docs/strategy/agent-engine.md'
}

async function init() {
  var pathValue = getQueryParam('path')
  var anchor = getQueryParam('anchor')

  if (!pathValue) throw new Error('Missing document path.')

  var requestUrl = '/api/doc?path=' + encodeURIComponent(pathValue)
  var requestOptions = {}

  if (isLiveDocPath(pathValue)) {
    requestUrl += '&_ts=' + Date.now()
    requestOptions.cache = 'no-store'
  }

  var response = await fetch(requestUrl, requestOptions)
  if (!response.ok) throw new Error('Document failed to load.')

  var data = await response.json()

  document.title = data.title + ' · BCrew AI OS'
  document.getElementById('doc-title').textContent = data.title
  document.getElementById('doc-subtitle').textContent = 'Source: ' + data.meta.path
  document.getElementById('doc-meta').textContent =
    'Updated ' + formatDate(data.meta.updatedAt) + ' · ' + data.meta.lines + ' lines'

  var content = document.getElementById('doc-content')
  var sourceContractMap = buildSourceContractMap(data.sourceContracts || [])
  content.appendChild(renderMarkdownBlock(
    data.content,
    data.meta.path,
    groupSourceSnapshot(data.sourceSnapshot || []),
    sourceContractMap
  ))

  if (anchor) {
    setTimeout(function() {
      var target = document.getElementById(anchor)
      if (target) target.scrollIntoView({ block: 'start' })
    }, 0)
  }
}

init().catch(function(error) {
  document.getElementById('doc-title').textContent = 'Document unavailable'
  document.getElementById('doc-subtitle').textContent = error.message
})

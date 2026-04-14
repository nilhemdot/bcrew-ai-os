/* ── helpers (from app.js) ────────────────────────────────── */

function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return date.toLocaleString()
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

  var foundationSection = foundationDocPathToSection[basePath]
  if (foundationSection) {
    return '/foundation#' + foundationSection
  }

  var strategicExecutionSection = strategicExecutionDocPathToSection[basePath]
  if (strategicExecutionSection) {
    return '/strategic-execution#' + strategicExecutionSection
  }

  var docHref = '/doc?path=' + encodeURIComponent(basePath)
  return anchor ? docHref + '&anchor=' + encodeURIComponent(anchor) : docHref
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/* ── section support docs map (from app.js) ──────────────── */

var sectionSupportDocs = {
  'North Star': {
    label: 'Open BHAG model',
    path: 'docs/strategy/bhag-model.md',
  },
  'Core Values': {
    label: 'Open core values doc',
    path: 'docs/strategy/core-values.md',
  },
  'The Engine': {
    label: 'Open agent engine doc',
    path: 'docs/strategy/agent-engine.md',
  },
  'Department Mandates': {
    label: 'Open department mandates doc',
    path: 'docs/strategy/department-mandates.md',
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

var backlogLanes = [
  { key: 'research', label: 'Research' },
  { key: 'scoped', label: 'Scoped' },
  { key: 'ranked', label: 'Ranked' },
  { key: 'executing', label: 'Executing' },
  { key: 'parked', label: 'Parked' },
]

/* ── inline formatting (from app.js) ─────────────────────── */

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

/* ── table helpers (from app.js) ─────────────────────────── */

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

/* ── renderMarkdownBlock — section-level (from app.js) ───── */

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

    if (line.startsWith('### ') || line.startsWith('#### ')) {
      var level = line.startsWith('#### ') ? 4 : 3
      var h = document.createElement(level === 4 ? 'h6' : 'h5')
      h.className = 'md-subheading'
      appendFormattedText(line.slice(level + 1).trim(), h, currentPath)
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

/* ── renderDocMarkdownBlock — full-doc level (from doc.js) ── */

function renderInlineSourceCard(groupTitle, rows, options, sourceContractMap) {
  var hideTitle = options && options.hideTitle
  var card = document.createElement('section')
  card.className = 'doc-source-card doc-source-card-inline'

  var asOfValues = rows
    .map(function(row) {
      if (!row.asOf) return ''
      var date = new Date(row.asOf)
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(date)
    })
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
    .map(function(group) {
      return group.sourceId
    })
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

function getEngineMetricExplanation(metricKey, context) {
  if (metricKey === 'Required Agents This Year') {
    return 'The number of active agents the model says this year needs at the current productivity assumption.'
  }

  if (metricKey === 'Required Start-of-Year Agents') {
    return 'The number of active agents the model says we need in place when next year starts.'
  }

  if (metricKey === 'Current Active Agents') {
    return 'The current active, capacity-producing agent count from the live Agent Engine tab. Owners, leadership, and known zero-production agents are excluded.'
  }

  if (metricKey === 'Gap This Year') {
    return 'The difference between the current-year required agent count and the active agents we have now.'
  }

  if (metricKey === 'Gap to Next Year') {
    return 'The difference between the required start-of-year agent count and the active agents we have now.'
  }

  if (metricKey === 'Required Recruiting Pace') {
    if (context && context.planningAttritionAssumption && context.planningAttritionAssumption !== '—') {
      return 'The monthly recruiting pace the current model needs in order to close the gap and start next year correctly. This already includes the ' + context.planningAttritionAssumption + ' planning attrition assumption from the BHAG builder.'
    }
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
    return 'This is the live operating attrition signal from the Agent Engine tab. It is different from the planning attrition assumption used in the model.'
  }

  if (metricKey === 'Planning Attrition Assumption') {
    return 'This is the planning attrition rate from the BHAG builder. It feeds the required recruiting formula and changes the pace the model needs.'
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

function getEngineMetricDisplayLabel(metricKey, context) {
  if (metricKey === 'Average Monthly GCI') return 'Avg Monthly GCI'
  if (metricKey === 'Split to Team') return 'Team Split'
  if (metricKey === 'Current-Year Volume Target') return 'This Year Target'
  if (metricKey === 'Required Agents This Year') return 'Agents Needed This Year'
  if (metricKey === 'Current Active Agents') return 'Current Active'
  if (metricKey === 'Gap This Year') return 'Gap This Year'
  if (metricKey === 'Next-Year Volume Target') return 'Next Year Target'
  if (metricKey === 'Required Start-of-Year Agents') return 'Agents Needed Jan 1'
  if (metricKey === 'Gap to Next Year') return 'Gap to Next Year'
  if (metricKey === 'Required Recruiting Pace' && context && context.planningAttritionAssumption && context.planningAttritionAssumption !== '—') {
    return 'Recruit Pace w/ ' + context.planningAttritionAssumption + ' Attrition'
  }
  if (metricKey === 'Required Recruiting Pace') return 'Recruit Pace'
  if (metricKey === 'Production Target / Agent') return 'Prod Target / Agent'
  if (metricKey === 'Target Split') return 'Team Split Target'
  if (metricKey === 'Planning Attrition Assumption') return 'Attrition Assumption'
  return metricKey
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
    .map(function(row) {
      return row.asOf ? formatAsOfDate(row.asOf) : ''
    })
    .filter(Boolean)
  var uniqueAsOfValues = Array.from(new Set(asOfValues))

  var card = document.createElement('section')
  card.className = 'doc-source-card bhag-summary-card'

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

function renderEnginePathCard(groupTitle, cardGroups, sourceContractMap, currentRequirementGroups) {
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

  var currentYearLabel = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
  }).format(new Date())

  var currentRows = currentRequirementGroups
    ? sortSnapshotRows(
        currentRequirementGroups.reduce(function(all, group) {
          return all.concat(group.rows || [])
        }, [])
      )
    : []
  var currentActiveAgentsRow = currentRows.find(function(row) {
    return row.label === 'Current Active Agents'
  })
  var currentActiveAgentsText = currentActiveAgentsRow ? currentActiveAgentsRow.value : '—'
  var currentActiveAgentsValue = currentActiveAgentsRow
    ? parseFloat(String(currentActiveAgentsRow.value).replace(/[^0-9.-]/g, ''))
    : null

  var asOfValues = rows
    .map(function(row) {
      return row.asOf ? formatAsOfDate(row.asOf) : ''
    })
    .filter(Boolean)
  var uniqueAsOfValues = Array.from(new Set(asOfValues))

  var card = document.createElement('section')
  card.className = 'doc-source-card engine-summary-card'

  appendEngineCardTop(card, cardGroups, sourceContractMap, uniqueAsOfValues)

  var tableWrap = document.createElement('div')
  tableWrap.className = 'md-table-wrap'

  var table = document.createElement('table')
  table.className = 'md-table engine-path-table'

  var thead = document.createElement('thead')
  var headRow = document.createElement('tr')
  ;['Year', 'Target', 'Req Agents', 'Current Active', 'Gap'].forEach(function(label) {
    var th = document.createElement('th')
    th.textContent = label
    headRow.appendChild(th)
  })
  thead.appendChild(headRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  yearRows.forEach(function(row) {
    var tr = document.createElement('tr')
    if (row.label === currentYearLabel) tr.className = 'engine-path-row-current'

    var year = document.createElement('th')
    year.textContent = row.label
    tr.appendChild(year)

    var target = document.createElement('td')
    target.textContent = row.value
    tr.appendChild(target)

    var required = document.createElement('td')
    required.textContent = summaryMap['Required Agents ' + row.label] || '—'
    tr.appendChild(required)

    var current = document.createElement('td')
    current.textContent = currentActiveAgentsText
    tr.appendChild(current)

    var gap = document.createElement('td')
    var requiredAgentsValue = parseFloat(String(summaryMap['Required Agents ' + row.label] || '').replace(/[^0-9.-]/g, ''))
    if (Number.isFinite(requiredAgentsValue) && Number.isFinite(currentActiveAgentsValue)) {
      var delta = currentActiveAgentsValue - requiredAgentsValue
      gap.textContent = delta >= 0
        ? 'Ahead by ' + Math.round(delta) + ' agents'
        : 'Behind by ' + Math.round(Math.abs(delta)) + ' agents'
      gap.className = delta >= 0 ? 'engine-path-positive' : 'engine-path-negative'
    } else {
      gap.textContent = '—'
    }
    tr.appendChild(gap)

    tbody.appendChild(tr)
  })

  table.appendChild(tbody)
  tableWrap.appendChild(table)
  card.appendChild(tableWrap)

  return card
}

function appendEngineCardTop(card, cardGroups, sourceContractMap, uniqueAsOfValues) {
  var top = document.createElement('div')
  top.className = 'doc-source-card-top'

  var left = document.createElement('div')

  var source = document.createElement('div')
  source.className = 'doc-source-id'
  source.textContent = formatSourceSummary(cardGroups)
  left.appendChild(source)

  appendSourceActions(
    left,
    getSourceActionsForIds(
      cardGroups.map(function(group) { return group.sourceId }),
      sourceContractMap
    )
  )

  top.appendChild(left)

  if (uniqueAsOfValues.length) {
    var asOf = document.createElement('div')
    asOf.className = 'doc-source-asof'
    asOf.textContent = 'As of ' + uniqueAsOfValues.join(', ') + ' (Eastern Time)'
    top.appendChild(asOf)
  }

  card.appendChild(top)
}

function renderEngineInputsCard(groupTitle, cardGroups, sourceContractMap) {
  var rows = sortSnapshotRows(
    cardGroups.reduce(function(all, group) {
      return all.concat(group.rows || [])
    }, [])
  )

  if (!rows.length) return null

  var asOfValues = rows
    .map(function(row) { return row.asOf ? formatAsOfDate(row.asOf) : '' })
    .filter(Boolean)
  var uniqueAsOfValues = Array.from(new Set(asOfValues))

  function getMetric(label) {
    return rows.find(function(row) { return row.label === label }) || null
  }

  var card = document.createElement('section')
  card.className = 'doc-source-card engine-summary-card'

  appendEngineCardTop(card, cardGroups, sourceContractMap, uniqueAsOfValues)

  var grid = document.createElement('div')
  grid.className = 'engine-inputs-grid'

  ;[
    'Average Monthly GCI',
    'Split to Team',
  ].forEach(function(metricKey) {
    var metric = getMetric(metricKey)
    if (!metric) return

    var item = document.createElement('div')
    item.className = 'engine-input-card'

    var label = document.createElement('div')
    label.className = 'engine-input-label'
    label.textContent = getEngineMetricDisplayLabel(metricKey)
    item.appendChild(label)

    var value = document.createElement('div')
    value.className = 'engine-input-value'
    value.textContent = metric.value
    item.appendChild(value)

    grid.appendChild(item)
  })

  card.appendChild(grid)

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
    .map(function(row) { return row.asOf ? formatAsOfDate(row.asOf) : '' })
    .filter(Boolean)
  var uniqueAsOfValues = Array.from(new Set(asOfValues))

  function getMetric(metricKey) {
    return rows.find(function(sourceRow) { return sourceRow.label === metricKey }) || null
  }

  function getMetricValue(metricKey) {
    var metric = getMetric(metricKey)
    return metric ? metric.value : '—'
  }

  var planningAttritionAssumption = getMetricValue('Planning Attrition Assumption')

  var card = document.createElement('section')
  card.className = 'doc-source-card engine-summary-card'

  appendEngineCardTop(card, cardGroups, sourceContractMap, uniqueAsOfValues)

  var grid = document.createElement('div')
  grid.className = 'engine-summary-grid engine-summary-grid-compact'

  ;[
    {
      title: 'This Year',
      metrics: [
        'Current-Year Volume Target',
        'Required Agents This Year',
        'Current Active Agents',
        'Gap This Year',
      ],
    },
    {
      title: 'Start Next Year',
      metrics: [
        'Next-Year Volume Target',
        'Required Start-of-Year Agents',
        'Gap to Next Year',
        'Required Recruiting Pace',
      ],
    },
    {
      title: 'Assumptions In Force',
      metrics: [
        'Production Target / Agent',
        'Target Split',
        'Planning Attrition Assumption',
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
      label.textContent = getEngineMetricDisplayLabel(metricKey, {
        planningAttritionAssumption: planningAttritionAssumption,
      })
      labelWrap.appendChild(label)

      var explanation = getEngineMetricExplanation(metricKey, {
        planningAttritionAssumption: planningAttritionAssumption,
      })
      if (explanation) appendBhagInfoBadge(labelWrap, explanation)
      row.appendChild(labelWrap)

      var value = document.createElement('span')
      value.className = 'engine-summary-value'
      value.textContent = getMetricValue(metricKey)
      var directionalClass = getDirectionalClass(value.textContent)
      if (directionalClass) value.classList.add(directionalClass)
      row.appendChild(value)

      section.appendChild(row)
    })

    grid.appendChild(section)
  })

  card.appendChild(grid)

  return card
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

function renderDocMarkdownBlock(markdown, currentPath, sourceGroups, sourceContractMap) {
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
        var isEngineInputsSection = h2Text === 'Engine Inputs'
        var isEnginePathSection = h2Text === 'Required Agent Path'
        var isEngineRequirementSection = h2Text === 'Current Requirement'

        if (isBhagDoc && isBhagSection) {
          var bhagCard = renderBhagSummaryCard(h2Text, sourceGroups[h2Text], sourceContractMap)
          if (bhagCard) {
            pendingSummaryCard = bhagCard
          }
        } else if (isEngineDoc && isEngineInputsSection) {
          var engineInputsCard = renderEngineInputsCard(h2Text, sourceGroups[h2Text], sourceContractMap)
          if (engineInputsCard) pendingSummaryCard = engineInputsCard
        } else if (isEngineDoc && isEnginePathSection) {
          var enginePathCard = renderEnginePathCard(h2Text, sourceGroups[h2Text], sourceContractMap, sourceGroups['Current Requirement'])
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

    if (line.startsWith('### ') || line.startsWith('#### ')) {
      flushPendingSummaryCard()
      var level = line.startsWith('#### ') ? 4 : 3
      var heading = document.createElement(level === 4 ? 'h5' : 'h4')
      heading.className = 'md-subheading'
      var headingText = line.slice(level + 1).trim()
      heading.id = slugify(headingText)
      appendFormattedText(headingText, heading, currentPath)
      container.appendChild(heading)
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

/* ── card renderers (from app.js) ────────────────────────── */

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

function renderLabeledCopy(className, labelText, valueText) {
  var p = document.createElement('p')
  p.className = className

  var strong = document.createElement('strong')
  strong.textContent = labelText + ':'
  p.appendChild(strong)
  p.appendChild(document.createTextNode(' ' + valueText))

  return p
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

function parseQuarterLabel(title) {
  if (!title) return null

  var match = title.match(/^Current Quarter:\s*(Q[1-4])\s+(\d{4})\s*\(([^)]+)\)$/i)
  if (!match) return null

  return {
    quarter: match[1].toUpperCase(),
    year: parseInt(match[2], 10),
    range: match[3].trim(),
  }
}

function getNextQuarterInfo(currentQuarter) {
  if (!currentQuarter) return null

  var ranges = {
    Q1: 'May-Jul',
    Q2: 'Aug-Oct',
    Q3: 'Nov-Jan',
    Q4: 'Feb-Apr',
  }

  var quarterOrder = ['Q1', 'Q2', 'Q3', 'Q4']
  var currentIndex = quarterOrder.indexOf(currentQuarter.quarter)
  if (currentIndex === -1) return null

  var nextQuarter = quarterOrder[(currentIndex + 1) % quarterOrder.length]
  var nextYear = currentQuarter.quarter === 'Q4'
    ? currentQuarter.year + 1
    : currentQuarter.year

  return {
    quarter: nextQuarter,
    year: nextYear,
    range: ranges[currentQuarter.quarter],
  }
}

function extractQuarterSummaryLines(content) {
  return (content || '')
    .split('\n')
    .map(function(line) { return line.trim() })
    .filter(function(line) { return line && line !== '---' })
}

function buildQuarterMetaPill(label, value, accent) {
  var pill = document.createElement('div')
  pill.className = 'quarter-meta-pill' + (accent ? ' quarter-meta-pill-' + accent : '')

  var pillLabel = document.createElement('span')
  pillLabel.className = 'quarter-meta-label'
  pillLabel.textContent = label
  pill.appendChild(pillLabel)

  var pillValue = document.createElement('strong')
  pillValue.className = 'quarter-meta-value'
  pillValue.textContent = value
  pill.appendChild(pillValue)

  return pill
}

function buildPriorityChip(text) {
  var item = document.createElement('div')
  item.className = 'quarter-priority-item'

  var marker = document.createElement('span')
  marker.className = 'quarter-priority-marker'
  marker.textContent = 'Priority'
  item.appendChild(marker)

  var copy = document.createElement('span')
  copy.className = 'quarter-priority-copy'
  copy.textContent = text
  item.appendChild(copy)

  return item
}

function buildQuarterCadenceChip(label, value) {
  var chip = document.createElement('div')
  chip.className = 'quarter-cadence-chip'

  var chipLabel = document.createElement('span')
  chipLabel.className = 'quarter-cadence-label'
  chipLabel.textContent = label
  chip.appendChild(chipLabel)

  var chipValue = document.createElement('strong')
  chipValue.className = 'quarter-cadence-value'
  chipValue.textContent = value
  chip.appendChild(chipValue)

  return chip
}

function renderCurrentQuarterSection(section, currentPath, quarterlyDoc) {
  var article = document.createElement('article')
  article.className = 'section-card section-card-quarter'

  var title = document.createElement('h4')
  appendFormattedText(section.title, title, currentPath)
  article.appendChild(title)

  var quarterSection = quarterlyDoc && quarterlyDoc.sections && quarterlyDoc.sections.length
    ? quarterlyDoc.sections[0]
    : null
  var quarterInfo = parseQuarterLabel(quarterSection ? quarterSection.title : '')
  var nextQuarter = getNextQuarterInfo(quarterInfo)
  var summaryLines = extractQuarterSummaryLines(quarterSection ? quarterSection.content : section.content)
  var summary = summaryLines[0] || ''
  var cadenceNote = 'Benson Crew plans one month ahead of standard quarters.'
  var prioritySections = quarterlyDoc && quarterlyDoc.sections
    ? quarterlyDoc.sections.slice(1, 4)
    : []

  if (summary) {
    var themeWrap = document.createElement('div')
    themeWrap.className = 'quarter-theme'

    var themeLabel = document.createElement('div')
    themeLabel.className = 'quarter-theme-label'
    themeLabel.textContent = 'Quarter Theme'
    themeWrap.appendChild(themeLabel)

    var intro = document.createElement('p')
    intro.className = 'quarter-summary'
    intro.textContent = summary
    themeWrap.appendChild(intro)

    article.appendChild(themeWrap)
  }

  var metaRow = document.createElement('div')
  metaRow.className = 'quarter-meta-row'

  if (quarterInfo) {
    metaRow.appendChild(
      buildQuarterMetaPill(
        'Current Quarter',
        quarterInfo.quarter + ' ' + quarterInfo.year + ' · ' + quarterInfo.range,
        'current'
      )
    )
  }

  if (nextQuarter) {
    metaRow.appendChild(
      buildQuarterMetaPill(
        'Coming Up',
        nextQuarter.quarter + ' ' + nextQuarter.year + ' · ' + nextQuarter.range,
        'next'
      )
    )
  }

  article.appendChild(metaRow)

  if (prioritySections.length) {
    var priorityWrap = document.createElement('div')
    priorityWrap.className = 'quarter-priority-wrap'

    var priorityLabel = document.createElement('div')
    priorityLabel.className = 'quarter-priority-label'
    priorityLabel.textContent = 'Top Priorities'
    priorityWrap.appendChild(priorityLabel)

    var priorityRow = document.createElement('div')
    priorityRow.className = 'quarter-priority-stack'

    prioritySections.forEach(function(prioritySection) {
      var cleanedTitle = prioritySection.title.replace(/^Priority\s+\d+:\s*/, '')
      priorityRow.appendChild(buildPriorityChip(cleanedTitle))
    })

    priorityWrap.appendChild(priorityRow)
    article.appendChild(priorityWrap)
  }

  var footerNote = document.createElement('div')
  footerNote.className = 'quarter-footer-note'

  var footerLabel = document.createElement('span')
  footerLabel.className = 'quarter-footer-label'
  footerLabel.textContent = 'Planning cadence'
  footerNote.appendChild(footerLabel)

  var footerCopy = document.createElement('p')
  footerCopy.className = 'quarter-footer-copy'
  footerCopy.textContent = cadenceNote
  footerNote.appendChild(footerCopy)

  var cadenceRow = document.createElement('div')
  cadenceRow.className = 'quarter-cadence-row'
  cadenceRow.appendChild(buildQuarterCadenceChip('Q1', 'Feb-Apr'))
  cadenceRow.appendChild(buildQuarterCadenceChip('Q2', 'May-Jul'))
  cadenceRow.appendChild(buildQuarterCadenceChip('Q3', 'Aug-Oct'))
  cadenceRow.appendChild(buildQuarterCadenceChip('Q4', 'Nov-Jan'))
  footerNote.appendChild(cadenceRow)

  article.appendChild(footerNote)

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
  card.appendChild(renderLabeledCopy('backlog-next', 'Next', item.nextAction))

  if (item.statusNote) {
    var note = document.createElement('p')
    note.className = 'backlog-note'
    note.textContent = item.statusNote
    card.appendChild(note)
  }

  if (item.owner) {
    card.appendChild(renderLabeledCopy('capture-owner', 'Owner', item.owner))
  }

  card.appendChild(renderBacklogItemEditor(item))

  return card
}

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
    card.appendChild(renderLabeledCopy('decision-rationale', 'Why', item.rationale))
  }

  if (item.sourceRef) {
    card.appendChild(renderLabeledCopy('decision-source', 'Source', item.sourceRef))
  }

  return card
}

function renderDecisionMemoryCard(item, hub, pendingUpdates) {
  var card = renderDecisionCard(item)
  card.classList.add('decision-card-memory')

  var metaRow = document.createElement('div')
  metaRow.className = 'decision-memory-meta'

  if (item.createdAt) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Created', formatDate(item.createdAt)))
  }
  if (item.classifiedAt) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Classified', formatDate(item.classifiedAt)))
  }
  if (item.classifiedBy) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'By', item.classifiedBy))
  }
  if (item.supersedesIds && item.supersedesIds.length) {
    metaRow.appendChild(renderLabeledCopy('decision-meta', 'Supersedes', item.supersedesIds.join(', ')))
  }
  if (metaRow.childNodes.length) {
    card.appendChild(metaRow)
  }

  card.appendChild(renderDecisionEditor(item, hub))

  if (item.status !== 'superseded') {
    card.appendChild(renderDocProposalForm(item))
  }

  var relatedUpdates = (pendingUpdates || []).filter(function(update) {
    return update.decisionId === item.id
  })

  if (relatedUpdates.length) {
    var updatesWrap = document.createElement('div')
    updatesWrap.className = 'memory-related-updates'

    var heading = document.createElement('div')
    heading.className = 'eyebrow'
    heading.textContent = 'Pending Doc Updates'
    updatesWrap.appendChild(heading)

    relatedUpdates.forEach(function(update) {
      updatesWrap.appendChild(renderPendingDocUpdateCard(update))
    })

    card.appendChild(updatesWrap)
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
    card.appendChild(renderLabeledCopy('capture-owner', 'Owner', item.owner))
  }

  return card
}

function renderOpenQuestionCard(item) {
  var card = document.createElement('article')
  card.className = 'capture-card capture-card-memory'

  var top = document.createElement('div')
  top.className = 'decision-top'

  var titleWrap = document.createElement('div')
  var title = document.createElement('h5')
  title.textContent = item.title
  titleWrap.appendChild(title)

  var id = document.createElement('div')
  id.className = 'decision-id'
  id.textContent = item.id
  titleWrap.appendChild(id)
  top.appendChild(titleWrap)

  var status = document.createElement('span')
  status.className = 'status-pill status-pill-static status-' + (item.status === 'resolved' ? 'connected' : 'pending')
  status.textContent = item.status || 'open'
  top.appendChild(status)
  card.appendChild(top)

  var summary = document.createElement('p')
  summary.className = 'decision-copy'
  summary.textContent = item.summary
  card.appendChild(summary)

  if (item.owner) {
    card.appendChild(renderLabeledCopy('capture-owner', 'Owner', item.owner))
  }

  if (item.status === 'resolved' && item.resolutionNote) {
    card.appendChild(renderLabeledCopy('decision-rationale', 'Resolution', item.resolutionNote))
  }

  if (item.resolvedAt) {
    card.appendChild(renderLabeledCopy('decision-source', 'Resolved', formatDate(item.resolvedAt)))
  }

  card.appendChild(renderQuestionEditor(item))
  return card
}

function setFormStatus(target, message, tone) {
  target.textContent = message || ''
  target.className = 'form-status' + (tone ? ' form-status-' + tone : '')
}

function buildField(labelText, input) {
  var field = document.createElement('label')
  field.className = 'memory-field'

  var label = document.createElement('span')
  label.className = 'memory-field-label'
  label.textContent = labelText
  field.appendChild(label)

  field.appendChild(input)
  return field
}

function buildInput(type, placeholder) {
  var input = document.createElement('input')
  input.type = type || 'text'
  input.className = 'memory-input'
  if (placeholder) input.placeholder = placeholder
  return input
}

function buildTextarea(placeholder, rows) {
  var textarea = document.createElement('textarea')
  textarea.className = 'memory-textarea'
  textarea.rows = rows || 3
  if (placeholder) textarea.placeholder = placeholder
  return textarea
}

function buildSelect(options) {
  var select = document.createElement('select')
  select.className = 'memory-select'

  options.forEach(function(option) {
    var el = document.createElement('option')
    el.value = option.value
    el.textContent = option.label
    if (option.disabled) el.disabled = true
    if (option.selected) el.selected = true
    select.appendChild(el)
  })

  return select
}

function renderAdminTokenPanel() {
  var panel = document.createElement('section')
  panel.className = 'panel memory-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Write Access'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Admin Token'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Paste your admin token once to unlock Foundation writes on this browser. Reads stay open.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var form = document.createElement('div')
  form.className = 'memory-form-grid'

  var tokenInput = buildInput('password', 'Paste admin token')
  tokenInput.value = getStoredAdminToken()
  form.appendChild(buildField('Admin Token', tokenInput))

  var actions = document.createElement('div')
  actions.className = 'memory-form-actions'

  var saveButton = document.createElement('button')
  saveButton.className = 'memory-button'
  saveButton.type = 'button'
  saveButton.textContent = 'Save Token'
  actions.appendChild(saveButton)

  var clearButton = document.createElement('button')
  clearButton.className = 'memory-button memory-button-secondary'
  clearButton.type = 'button'
  clearButton.textContent = 'Clear'
  actions.appendChild(clearButton)

  form.appendChild(actions)
  panel.appendChild(form)

  var status = document.createElement('p')
  status.className = 'form-status'
  setFormStatus(status, getStoredAdminToken() ? 'Token saved for this browser.' : 'No token saved yet.', getStoredAdminToken() ? 'success' : '')
  panel.appendChild(status)

  saveButton.addEventListener('click', function() {
    setStoredAdminToken(tokenInput.value.trim())
    setFormStatus(status, tokenInput.value.trim() ? 'Token saved for this browser.' : 'Token cleared.', tokenInput.value.trim() ? 'success' : '')
  })

  clearButton.addEventListener('click', function() {
    tokenInput.value = ''
    setStoredAdminToken('')
    setFormStatus(status, 'Token cleared.', '')
  })

  return panel
}

function renderChangeEventCard(item) {
  var card = document.createElement('article')
  card.className = 'change-card'

  var top = document.createElement('div')
  top.className = 'change-top'

  var title = document.createElement('strong')
  title.textContent = item.summary
  top.appendChild(title)

  var stamp = document.createElement('span')
  stamp.className = 'change-stamp'
  stamp.textContent = formatDate(item.createdAt)
  top.appendChild(stamp)

  card.appendChild(top)

  var meta = document.createElement('div')
  meta.className = 'change-meta'
  meta.textContent = item.actor + ' · ' + item.eventType + ' · ' + item.entityId
  card.appendChild(meta)

  return card
}

function renderBacklogCreatePanel(hub) {
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
  title.textContent = 'New Backlog Item'
  left.appendChild(title)

  header.appendChild(left)
  panel.appendChild(header)

  var form = document.createElement('form')
  form.className = 'memory-form-grid'

  var prefixSelect = buildSelect((hub.meta && hub.meta.backlogIdPrefixes || []).concat(['TASK']).filter(function(value, index, array) {
    return array.indexOf(value) === index
  }).map(function(prefix, index) {
    return { value: prefix, label: prefix, selected: index === 0 }
  }))
  form.appendChild(buildField('ID Prefix', prefixSelect))

  var teamSelect = buildSelect([
    { value: 'dev', label: 'Dev', selected: true },
    { value: 'marketing', label: 'Marketing' },
  ])
  form.appendChild(buildField('Team', teamSelect))

  var laneSelect = buildSelect(backlogLanes.map(function(lane, index) {
    return { value: lane.key, label: lane.label, selected: lane.key === 'research' && index >= 0 }
  }))
  form.appendChild(buildField('Lane', laneSelect))

  var prioritySelect = buildSelect([
    { value: 'P0', label: 'P0' },
    { value: 'P1', label: 'P1', selected: true },
    { value: 'P2', label: 'P2' },
    { value: 'P3', label: 'P3' },
  ])
  form.appendChild(buildField('Priority', prioritySelect))

  var titleInput = buildInput('text', 'Title')
  form.appendChild(buildField('Title', titleInput))

  var ownerInput = buildInput('text', 'Owner')
  form.appendChild(buildField('Owner', ownerInput))

  var sourceInput = buildInput('text', 'Source')
  form.appendChild(buildField('Source', sourceInput))

  var summaryInput = buildTextarea('Short summary', 3)
  form.appendChild(buildField('Summary', summaryInput))

  var whyInput = buildTextarea('Why it matters', 3)
  form.appendChild(buildField('Why It Matters', whyInput))

  var nextInput = buildTextarea('Next action', 3)
  form.appendChild(buildField('Next Action', nextInput))

  var noteInput = buildTextarea('Status note', 2)
  form.appendChild(buildField('Status Note', noteInput))

  var actions = document.createElement('div')
  actions.className = 'memory-form-actions'

  var submit = document.createElement('button')
  submit.className = 'memory-button'
  submit.type = 'submit'
  submit.textContent = 'Create Backlog Item'
  actions.appendChild(submit)

  form.appendChild(actions)

  var status = document.createElement('p')
  status.className = 'form-status'
  form.appendChild(status)

  form.addEventListener('submit', function(event) {
    event.preventDefault()
    submit.disabled = true
    setFormStatus(status, 'Creating backlog item…')
    foundationMutation('/api/foundation/backlog', 'POST', {
      idPrefix: prefixSelect.value,
      team: teamSelect.value,
      lane: laneSelect.value,
      priority: prioritySelect.value,
      title: titleInput.value.trim(),
      owner: ownerInput.value.trim(),
      source: sourceInput.value.trim(),
      summary: summaryInput.value.trim(),
      whyItMatters: whyInput.value.trim(),
      nextAction: nextInput.value.trim(),
      statusNote: noteInput.value.trim(),
    }).then(function() {
      form.reset()
      prefixSelect.value = (hub.meta && hub.meta.backlogIdPrefixes && hub.meta.backlogIdPrefixes[0]) || 'FOUNDATION'
      teamSelect.value = 'dev'
      laneSelect.value = 'research'
      prioritySelect.value = 'P1'
      setFormStatus(status, 'Backlog item created.', 'success')
      renderBacklog()
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to create backlog item.', 'error')
    }).finally(function() {
      submit.disabled = false
    })
  })

  panel.appendChild(form)
  return panel
}

function renderBacklogItemEditor(item) {
  var details = document.createElement('details')
  details.className = 'memory-inline-editor'

  var summary = document.createElement('summary')
  summary.textContent = 'Update'
  details.appendChild(summary)

  var wrap = document.createElement('div')
  wrap.className = 'memory-inline-grid'

  var laneSelect = buildSelect(backlogLanes.map(function(lane) {
    return { value: lane.key, label: lane.label, selected: lane.key === item.lane }
  }))
  wrap.appendChild(buildField('Lane', laneSelect))

  var prioritySelect = buildSelect(['P0', 'P1', 'P2', 'P3'].map(function(priority) {
    return { value: priority, label: priority, selected: priority === item.priority }
  }))
  wrap.appendChild(buildField('Priority', prioritySelect))

  var ownerInput = buildInput('text', 'Owner')
  ownerInput.value = item.owner || ''
  wrap.appendChild(buildField('Owner', ownerInput))

  var noteInput = buildTextarea('Status note', 2)
  noteInput.value = item.statusNote || ''
  wrap.appendChild(buildField('Status Note', noteInput))

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
    foundationMutation('/api/foundation/backlog/' + encodeURIComponent(item.id), 'PATCH', {
      lane: laneSelect.value,
      priority: prioritySelect.value,
      owner: ownerInput.value.trim(),
      statusNote: noteInput.value.trim(),
    }).then(function() {
      setFormStatus(status, 'Saved.', 'success')
      renderBacklog()
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to save.', 'error')
    }).finally(function() {
      save.disabled = false
    })
  })

  details.appendChild(wrap)
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

  card.appendChild(renderLabeledCopy('decision-meta', 'Decision', item.decisionId || '—'))
  card.appendChild(renderLabeledCopy('decision-meta', 'Target', item.targetDocPath))
  card.appendChild(renderLabeledCopy('decision-meta', 'Section', item.targetSection || '—'))

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

function groupBacklogByTeam(items) {
  return {
    dev: items.filter(function(item) { return item.team === 'dev' }),
    marketing: items.filter(function(item) { return item.team === 'marketing' }),
  }
}

/* ── data cache ──────────────────────────────────────────── */

var cache = {
  sourceOfTruth: null,
  foundationHub: null,
  docs: {},
}
var FOUNDATION_ADMIN_TOKEN_KEY = 'bcrew.foundation.adminToken'

var liveDocPaths = {
  'docs/strategy/bhag-model.md': true,
  'docs/strategy/agent-engine.md': true,
}

function isLiveDocPath(docPath) {
  return !!liveDocPaths[docPath]
}

function fetchSourceOfTruth() {
  if (cache.sourceOfTruth) return Promise.resolve(cache.sourceOfTruth)

  return fetch('/api/source-of-truth').then(function(res) {
    if (!res.ok) throw new Error('Source of truth API failed.')
    return res.json()
  }).then(function(data) {
    cache.sourceOfTruth = data
    return data
  })
}

function fetchFoundationHub() {
  if (cache.foundationHub) return Promise.resolve(cache.foundationHub)

  return fetch('/api/foundation-hub').then(function(res) {
    if (!res.ok) throw new Error('Foundation hub API failed.')
    return res.json()
  }).then(function(data) {
    cache.foundationHub = data
    return data
  })
}

function fetchDoc(docPath) {
  if (!isLiveDocPath(docPath) && cache.docs[docPath]) return Promise.resolve(cache.docs[docPath])

  var requestUrl = '/api/doc?path=' + encodeURIComponent(docPath)
  var requestOptions = {}

  if (isLiveDocPath(docPath)) {
    requestUrl += '&_ts=' + Date.now()
    requestOptions.cache = 'no-store'
  }

  return fetch(requestUrl, requestOptions).then(function(res) {
    if (!res.ok) throw new Error('Document failed to load.')
    return res.json()
  }).then(function(data) {
    if (!isLiveDocPath(docPath)) cache.docs[docPath] = data
    return data
  })
}

function getStoredAdminToken() {
  try {
    return window.localStorage.getItem(FOUNDATION_ADMIN_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

function setStoredAdminToken(value) {
  try {
    if (!value) window.localStorage.removeItem(FOUNDATION_ADMIN_TOKEN_KEY)
    else window.localStorage.setItem(FOUNDATION_ADMIN_TOKEN_KEY, value)
  } catch {
    // Ignore storage failures and let the request fail visibly.
  }
}

function clearFoundationCaches() {
  cache.foundationHub = null
}

function parseApiErrorPayload(payload, fallbackMessage) {
  if (payload && payload.error && payload.error.message) return payload.error
  return { code: 'unknown_error', message: fallbackMessage || 'Request failed.' }
}

function foundationMutation(url, method, body) {
  return fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': getStoredAdminToken(),
    },
    body: JSON.stringify(body || {}),
  }).then(function(res) {
    return res.json().catch(function() { return null }).then(function(payload) {
      if (!res.ok) {
        throw parseApiErrorPayload(payload, 'Request failed.')
      }
      clearFoundationCaches()
      return payload
    })
  })
}

/* ── strategy doc path map ───────────────────────────────── */

var strategyDocPaths = {
  'bhag-model': 'docs/strategy/bhag-model.md',
  'agent-engine': 'docs/strategy/agent-engine.md',
  'governance': 'docs/strategy/governance.md',
  'departments': 'docs/strategy/department-mandates.md',
  'core-values': 'docs/strategy/core-values.md',
  'marketmasters': 'docs/strategy/marketmasters.md',
  'financial-model': 'docs/strategy/financial-model-and-assumptions.md',
  'system-strategy': 'docs/system-strategy.md',
}

var foundationDocPathToSection = {
  'docs/strategy/bhag-model.md': 'bhag-model',
  'docs/strategy/agent-engine.md': 'agent-engine',
  'docs/strategy/financial-model-and-assumptions.md': 'financial-model',
  'docs/strategy/governance.md': 'governance',
  'docs/strategy/department-mandates.md': 'departments',
  'docs/strategy/core-values.md': 'core-values',
  'docs/strategy/marketmasters.md': 'marketmasters',
  'docs/source-registry.md': 'source-registry',
}

var strategicExecutionDocPathToSection = {
  'docs/strategy/quarterly-priorities.md': 'quarterly-priorities',
  'docs/strategy/strategic-issues.md': 'strategic-issues',
}

/* ── nav label map for breadcrumb ────────────────────────── */

var sectionLabels = {
  'overview': 'Overview',
  'bhag-model': 'BHAG Model',
  'agent-engine': 'Agent Engine',
  'financial-model': 'Planning Definitions',
  'governance': 'Governance',
  'departments': 'Department Mandates',
  'core-values': 'Core Values',
  'marketmasters': 'MarketMasters',
  'backlog': 'Backlog',
  'decisions': 'Decisions',
  'open-questions': 'Open Questions',
  'system-strategy': 'System Strategy',
  'source-registry': 'Source Registry',
  'data-health': 'Data Health',
}

var strategyReviewChecklist = [
  {
    title: 'Overview Signed Off',
    tone: 'done',
    items: [
      'North Star',
      'Core Values',
      'The Engine',
      'Two Brands',
      'Governance',
      'System Rules',
      'System Role',
    ],
  },
  {
    title: 'Supporting Docs Signed Off',
    tone: 'done',
    items: [
      'BHAG Model',
      'Core Values',
      'Agent Engine',
      'Department Mandates',
      'Governance',
      'MarketMasters',
    ],
  },
  {
    title: 'Supporting Docs Still To Confirm',
    tone: 'pending',
    items: [
      'Planning Definitions',
      'System Strategy',
      'Source Registry',
    ],
  },
]

function renderReviewChecklistPanel() {
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Review Tracker'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Strategy Lock Checklist'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'This is the current sign-off state for the top-down strategy review. We only mark a section done once the wording feels right and the supporting layer earns its place.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'review-checklist-grid'

  strategyReviewChecklist.forEach(function(group) {
    var column = document.createElement('div')
    column.className = 'review-checklist-column'

    var columnTitle = document.createElement('h4')
    columnTitle.textContent = group.title
    column.appendChild(columnTitle)

    var list = document.createElement('ul')
    list.className = 'review-checklist-list'

    group.items.forEach(function(item) {
      var li = document.createElement('li')
      li.className = 'review-checklist-item review-checklist-item-' + group.tone

      var marker = document.createElement('span')
      marker.className = 'review-checklist-marker'
      marker.textContent = group.tone === 'done' ? 'Done' : 'Next'
      li.appendChild(marker)

      var text = document.createElement('span')
      text.textContent = item
      li.appendChild(text)

      list.appendChild(li)
    })

    column.appendChild(list)
    grid.appendChild(column)
  })

  panel.appendChild(grid)
  return panel
}

/* ── section renderers ───────────────────────────────────── */

function renderOverview() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading overview...</p>'

  Promise.all([fetchSourceOfTruth(), fetchFoundationHub()]).then(function(results) {
    var data = results[0]
    var hub = results[1]

    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroLeft = document.createElement('div')

    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Primary Source'
    heroLeft.appendChild(eyebrow)

    var heroTitle = document.createElement('h2')
    heroTitle.textContent = 'Business Strategy'
    heroLeft.appendChild(heroTitle)

    var heroCopy = document.createElement('p')
    heroCopy.textContent = 'Canonical strategy document for Benson Crew. The single source of truth that everything else feeds from.'
    heroLeft.appendChild(heroCopy)

    hero.appendChild(heroLeft)

    var printBtn = document.createElement('button')
    printBtn.className = 'print-button'
    printBtn.textContent = 'Print Strategy'
    printBtn.setAttribute('type', 'button')
    printBtn.addEventListener('click', function() { window.print() })
    hero.appendChild(printBtn)

    container.appendChild(hero)

    /* status grid */
    var statusGrid = document.createElement('div')
    statusGrid.className = 'status-grid'
    data.systemStatus.forEach(function(item) {
      statusGrid.appendChild(renderStatusCard(item))
    })
    container.appendChild(statusGrid)

    if (hub.recentChanges && hub.recentChanges.length) {
      var changesPanel = document.createElement('section')
      changesPanel.className = 'panel'

      var changesHeader = document.createElement('div')
      changesHeader.className = 'panel-header'

      var changesLeft = document.createElement('div')
      var changesEyebrow = document.createElement('div')
      changesEyebrow.className = 'eyebrow'
      changesEyebrow.textContent = 'System Foundation'
      changesLeft.appendChild(changesEyebrow)

      var changesTitle = document.createElement('h3')
      changesTitle.textContent = 'Recent Changes'
      changesLeft.appendChild(changesTitle)

      var changesIntro = document.createElement('p')
      changesIntro.className = 'section-intro'
      changesIntro.textContent = 'The latest Foundation mutations and doc-apply events. This is the first visible change ledger for the trust layer.'
      changesLeft.appendChild(changesIntro)

      changesHeader.appendChild(changesLeft)
      changesPanel.appendChild(changesHeader)

      var changesList = document.createElement('div')
      changesList.className = 'change-list'
      hub.recentChanges.forEach(function(item) {
        changesList.appendChild(renderChangeEventCard(item))
      })
      changesPanel.appendChild(changesList)
      container.appendChild(changesPanel)
    }

    container.appendChild(renderReviewChecklistPanel())

    /* strategy doc panel */
    var panel = document.createElement('section')
    panel.className = 'panel'

    var panelHeader = document.createElement('div')
    panelHeader.className = 'panel-header'

    var panelLeft = document.createElement('div')
    var panelEyebrow = document.createElement('div')
    panelEyebrow.className = 'eyebrow'
    panelEyebrow.textContent = 'Strategy Sections'
    panelLeft.appendChild(panelEyebrow)
    var panelTitle = document.createElement('h3')
    panelTitle.textContent = 'Business Strategy'
    panelLeft.appendChild(panelTitle)
    panelHeader.appendChild(panelLeft)

    var panelMeta = document.createElement('div')
    panelMeta.className = 'doc-meta'
    var bsMeta = data.foundation.businessStrategy.meta
    panelMeta.textContent = bsMeta.lines + ' lines · updated ' + formatDate(bsMeta.updatedAt)
    panelHeader.appendChild(panelMeta)

    panel.appendChild(panelHeader)

    var sectionList = document.createElement('div')
    sectionList.className = 'section-list'
    data.foundation.businessStrategy.sections.forEach(function(section) {
      if (section.title === 'Current Quarter') {
        return
      }

      sectionList.appendChild(renderSection(section, data.foundation.businessStrategy.meta.path))
    })
    panel.appendChild(sectionList)
    container.appendChild(panel)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load overview: ' + error.message
    container.appendChild(msg)
  })
}

function renderStrategyDoc(sectionKey) {
  var docPath = strategyDocPaths[sectionKey]
  if (!docPath) return

  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading document...</p>'

  fetchDoc(docPath).then(function(data) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = data.title
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = 'Updated ' + formatDate(data.meta.updatedAt) + ' · ' + data.meta.lines + ' lines'
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)

    if (isLiveDocPath(docPath)) {
      var refreshBtn = document.createElement('button')
      refreshBtn.className = 'print-button'
      refreshBtn.textContent = 'Refresh Data'
      refreshBtn.setAttribute('type', 'button')
      refreshBtn.addEventListener('click', function() {
        delete cache.docs[docPath]
        renderStrategyDoc(sectionKey)
      })
      hero.appendChild(refreshBtn)
    }

    container.appendChild(hero)

    /* full markdown content */
    var docPanel = document.createElement('section')
    docPanel.className = 'panel'

    var docContent = document.createElement('div')
    docContent.className = 'doc-content'
    var sourceContractMap = buildSourceContractMap(data.sourceContracts || [])
    docContent.appendChild(renderDocMarkdownBlock(
      data.content,
      data.meta.path,
      groupSourceSnapshot(data.sourceSnapshot || []),
      sourceContractMap
    ))
    docPanel.appendChild(docContent)
    container.appendChild(docPanel)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load document: ' + error.message
    container.appendChild(msg)
  })
}

function renderBacklog() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading backlog...</p>'

  fetchFoundationHub().then(function(hub) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Foundation Backlog'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = hub.backlogItems.length + ' active items across the live Foundation backlog'
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    container.appendChild(renderAdminTokenPanel())
    container.appendChild(renderBacklogCreatePanel(hub))

    /* team boards */
    var backlogGroups = groupBacklogByTeam(hub.backlogItems)
    var boardWrap = document.createElement('div')
    boardWrap.className = 'team-backlog-grid'
    boardWrap.appendChild(renderTeamBoard('dev', backlogGroups.dev))
    boardWrap.appendChild(renderTeamBoard('marketing', backlogGroups.marketing))
    container.appendChild(boardWrap)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load backlog: ' + error.message
    container.appendChild(msg)
  })
}

function renderDecisions() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading decisions...</p>'

  fetchFoundationHub().then(function(hub) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Foundation Decisions'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    var lockedCount = hub.decisions.filter(function(item) { return item.status === 'locked' }).length
    var proposedCount = hub.decisions.filter(function(item) { return item.status === 'proposed' }).length
    heroMeta.textContent = lockedCount + ' locked · ' + proposedCount + ' proposed'
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    container.appendChild(renderAdminTokenPanel())
    container.appendChild(renderDecisionCreatePanel(hub))

    /* decision cards */
    var decisionPanel = document.createElement('section')
    decisionPanel.className = 'panel'

    var decisionHeader = document.createElement('div')
    decisionHeader.className = 'panel-header'

    var decisionTitle = document.createElement('h3')
    decisionTitle.textContent = 'Decisions'
    decisionHeader.appendChild(decisionTitle)

    decisionPanel.appendChild(decisionHeader)

    var decisionList = document.createElement('div')
    decisionList.className = 'section-list'
    var pendingDocUpdates = hub.pendingDocUpdates || []
    hub.decisions.forEach(function(item) {
      decisionList.appendChild(renderDecisionMemoryCard(item, hub, pendingDocUpdates))
    })
    decisionPanel.appendChild(decisionList)
    container.appendChild(decisionPanel)

    if (pendingDocUpdates.length) {
      var updatesPanel = document.createElement('section')
      updatesPanel.className = 'panel'

      var updatesHeader = document.createElement('div')
      updatesHeader.className = 'panel-header'

      var updatesLeft = document.createElement('div')
      var updatesEyebrow = document.createElement('div')
      updatesEyebrow.className = 'eyebrow'
      updatesEyebrow.textContent = 'Review Queue'
      updatesLeft.appendChild(updatesEyebrow)

      var updatesTitle = document.createElement('h3')
      updatesTitle.textContent = 'Pending Doc Updates'
      updatesLeft.appendChild(updatesTitle)

      var updatesIntro = document.createElement('p')
      updatesIntro.className = 'section-intro'
      updatesIntro.textContent = 'Decisions can propose doc updates here. Review, approve, and explicitly apply only the changes you trust.'
      updatesLeft.appendChild(updatesIntro)

      updatesHeader.appendChild(updatesLeft)
      updatesPanel.appendChild(updatesHeader)

      var updatesList = document.createElement('div')
      updatesList.className = 'section-list'
      pendingDocUpdates.forEach(function(item) {
        updatesList.appendChild(renderPendingDocUpdateCard(item))
      })
      updatesPanel.appendChild(updatesList)
      container.appendChild(updatesPanel)
    }

    /* parking lot */
    if (hub.parkingLot && hub.parkingLot.length) {
      var parkingPanel = document.createElement('section')
      parkingPanel.className = 'panel'

      var parkingHeader = document.createElement('div')
      parkingHeader.className = 'panel-header'

      var parkingTitle = document.createElement('h3')
      parkingTitle.textContent = 'Parking Lot'
      parkingHeader.appendChild(parkingTitle)

      parkingPanel.appendChild(parkingHeader)

      var parkingList = document.createElement('div')
      parkingList.className = 'section-list'
      hub.parkingLot.forEach(function(item) {
        parkingList.appendChild(renderCaptureItem(item))
      })
      parkingPanel.appendChild(parkingList)
      container.appendChild(parkingPanel)
    }

    if (hub.recentChanges && hub.recentChanges.length) {
      var changesPanel = document.createElement('section')
      changesPanel.className = 'panel'

      var changesHeader = document.createElement('div')
      changesHeader.className = 'panel-header'

      var changesLeft = document.createElement('div')
      var changesEyebrow = document.createElement('div')
      changesEyebrow.className = 'eyebrow'
      changesEyebrow.textContent = 'Trust Layer'
      changesLeft.appendChild(changesEyebrow)

      var changesTitle = document.createElement('h3')
      changesTitle.textContent = 'Recent Changes'
      changesLeft.appendChild(changesTitle)

      changesHeader.appendChild(changesLeft)
      changesPanel.appendChild(changesHeader)

      var changesList = document.createElement('div')
      changesList.className = 'change-list'
      hub.recentChanges.forEach(function(item) {
        changesList.appendChild(renderChangeEventCard(item))
      })
      changesPanel.appendChild(changesList)
      container.appendChild(changesPanel)
    }

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load decisions: ' + error.message
    container.appendChild(msg)
  })
}

function renderOpenQuestions() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading open questions...</p>'

  fetchFoundationHub().then(function(hub) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Open Questions'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    var openCount = hub.openQuestions.filter(function(item) { return item.status !== 'resolved' }).length
    var resolvedCount = hub.openQuestions.filter(function(item) { return item.status === 'resolved' }).length
    heroMeta.textContent = openCount + ' open · ' + resolvedCount + ' resolved'
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    container.appendChild(renderAdminTokenPanel())
    container.appendChild(renderQuestionCreatePanel())

    /* question cards */
    var panel = document.createElement('section')
    panel.className = 'panel'

    var header = document.createElement('div')
    header.className = 'panel-header'

    var left = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Working List'
    left.appendChild(eyebrow)

    var title = document.createElement('h3')
    title.textContent = 'Questions'
    left.appendChild(title)
    header.appendChild(left)
    panel.appendChild(header)

    var list = document.createElement('div')
    list.className = 'section-list'
    hub.openQuestions.forEach(function(item) {
      list.appendChild(renderOpenQuestionCard(item))
    })
    panel.appendChild(list)
    container.appendChild(panel)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load open questions: ' + error.message
    container.appendChild(msg)
  })
}

function renderSourceContractCard(contract) {
  var article = document.createElement('article')
  article.className = 'section-card'

  var title = document.createElement('h4')
  title.textContent = contract.title
  article.appendChild(title)

  article.appendChild(renderLabeledCopy('decision-meta', 'Source ID', contract.sourceId))
  article.appendChild(renderLabeledCopy('decision-meta', 'Status', contract.status))
  if (contract.validation) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Validation', contract.validation))
  }
  article.appendChild(renderLabeledCopy('decision-meta', 'Owner', contract.owner || 'System'))
  article.appendChild(renderLabeledCopy('decision-meta', 'Location', contract.location))
  article.appendChild(renderLabeledCopy('decision-meta', 'Scope', contract.scope))

  var detail = document.createElement('p')
  detail.textContent = contract.owns
  article.appendChild(detail)

  if (contract.lastVerified) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Last verified', contract.lastVerified))
  }

  if (contract.validationScope) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Signed-off scope', contract.validationScope))
  }

  if (contract.boundaryNote) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Boundary note', contract.boundaryNote))
  }

  appendSourceActions(article, contract.actions || [])
  return article
}

function renderSourceValidationPanel(sourceContracts) {
  if (!sourceContracts || !sourceContracts.length) return null

  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Trust Boundary'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Validation Checklist'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Connected does not mean signed off. This checklist separates what we have fully validated from what is only readable, partially understood, or still pending.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var signedOff = sourceContracts.filter(function(contract) {
    return contract.validation === 'Signed Off' || contract.validation === 'Signed Off In Scope'
  })
  var partial = sourceContracts.filter(function(contract) {
    return contract.validation === 'Partially Signed Off'
  })
  var readableOnly = sourceContracts.filter(function(contract) {
    return contract.validation === 'Readable Only'
  })
  var notSignedOff = sourceContracts.filter(function(contract) {
    return contract.validation === 'Not Signed Off'
  })
  var boundaries = sourceContracts.filter(function(contract) {
    return !!contract.boundaryNote
  })

  function appendGroup(label, contracts, formatter) {
    if (!contracts.length) return
    var group = document.createElement('div')
    group.className = 'section-card'
    var heading = document.createElement('h4')
    heading.textContent = label
    group.appendChild(heading)
    var list = document.createElement('ul')
    list.className = 'md-list'
    contracts.forEach(function(contract) {
      var item = document.createElement('li')
      item.textContent = formatter ? formatter(contract) : contract.sourceId + ' — ' + contract.title
      list.appendChild(item)
    })
    group.appendChild(list)
    panel.appendChild(group)
  }

  appendGroup('Signed Off', signedOff, function(contract) {
    var scope = contract.validationScope ? ' ' + contract.validationScope : ''
    return contract.sourceId + ' — ' + contract.title + '.' + scope
  })

  appendGroup('Partially Signed Off', partial, function(contract) {
    var scope = contract.validationScope ? ' ' + contract.validationScope : ''
    return contract.sourceId + ' — ' + contract.title + '.' + scope
  })

  appendGroup('Readable Only', readableOnly, function(contract) {
    var scope = contract.validationScope ? ' ' + contract.validationScope : ''
    return contract.sourceId + ' — ' + contract.title + '.' + scope
  })

  appendGroup('Not Signed Off', notSignedOff, function(contract) {
    return contract.sourceId + ' — ' + contract.title + '. ' + contract.status + '.'
  })

  appendGroup('Known Source Boundaries / Overlap Notes', boundaries, function(contract) {
    return contract.sourceId + ' — ' + contract.boundaryNote
  })

  return panel
}

function renderSourceContractPanel(titleText, introText, contracts) {
  if (!contracts.length) return null

  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var headerLeft = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Structured Contracts'
  headerLeft.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = titleText
  headerLeft.appendChild(title)

  if (introText) {
    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = introText
    headerLeft.appendChild(intro)
  }

  header.appendChild(headerLeft)
  panel.appendChild(header)

  var list = document.createElement('div')
  list.className = 'section-list'
  contracts.forEach(function(contract) {
    list.appendChild(renderSourceContractCard(contract))
  })
  panel.appendChild(list)

  return panel
}

function renderSourceRegistry() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading source registry...</p>'

  fetchSourceOfTruth().then(function(data) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Source Registry'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = renderMeta(data.foundation.sourceRegistry.meta)
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var sourceContracts = data.sources || []
    var connectedContracts = sourceContracts.filter(function(contract) {
      return contract.group === 'verified'
    })
    var pendingContracts = sourceContracts.filter(function(contract) {
      return contract.group === 'pending'
    })
    var gapContracts = sourceContracts.filter(function(contract) {
      return contract.group === 'gap'
    })

    var validationPanel = renderSourceValidationPanel(sourceContracts)
    if (validationPanel) container.appendChild(validationPanel)

    var connectedPanel = renderSourceContractPanel(
      'Connected Sources',
      'These are the sources the rebuild currently knows how to reference by source ID. Use these cards to jump straight to the real source of truth.',
      connectedContracts
    )
    if (connectedPanel) container.appendChild(connectedPanel)

    var pendingPanel = renderSourceContractPanel(
      'Pending Revalidation',
      'These sources existed in the old system but still need rebuild-level verification before we trust them in automation.',
      pendingContracts
    )
    if (pendingPanel) container.appendChild(pendingPanel)

    var gapPanel = renderSourceContractPanel(
      'Known Gaps',
      'These are important business sources we know about but have not connected yet.',
      gapContracts
    )
    if (gapPanel) container.appendChild(gapPanel)

    /* registry sections */
    var panel = document.createElement('section')
    panel.className = 'panel'

    if (!data.foundation.sourceRegistry.meta.exists) {
      var notice = document.createElement('p')
      notice.textContent = 'Source registry not found. Create docs/source-registry.md.'
      panel.appendChild(notice)
    } else {
      var sectionList = document.createElement('div')
      sectionList.className = 'section-list'
      data.foundation.sourceRegistry.sections.forEach(function(section) {
        sectionList.appendChild(renderSection(section, data.foundation.sourceRegistry.meta.path))
      })
      panel.appendChild(sectionList)
    }

    container.appendChild(panel)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load source registry: ' + error.message
    container.appendChild(msg)
  })
}

function renderDataHealth() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading data health...</p>'

  fetchFoundationHub().then(function(hub) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Data Health'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = hub.memoryStatus.length + ' components tracked'
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    /* memory status grid */
    var statusGrid = document.createElement('div')
    statusGrid.className = 'status-grid'
    hub.memoryStatus.forEach(function(item) {
      statusGrid.appendChild(renderStatusCard({
        label: item.label,
        status: item.status,
        detail: item.detail,
      }))
    })
    container.appendChild(statusGrid)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load data health: ' + error.message
    container.appendChild(msg)
  })
}

/* ── router ──────────────────────────────────────────────── */

function getSection() {
  var hash = window.location.hash.replace('#', '')
  return hash || 'overview'
}

function updateNav(section) {
  var navItems = document.querySelectorAll('.found-nav-item')
  navItems.forEach(function(item) {
    item.classList.remove('found-nav-active')
    if (item.getAttribute('data-section') === section) {
      item.classList.add('found-nav-active')
    }
  })

  var breadcrumb = document.getElementById('found-breadcrumb-page')
  if (breadcrumb) {
    breadcrumb.textContent = sectionLabels[section] || section
  }
}

function route() {
  var section = getSection()

  if (section === 'quarterly-priorities' || section === 'strategic-issues') {
    window.location.replace('/strategic-execution#' + section)
    return
  }

  updateNav(section)

  /* close mobile nav on route change */
  var nav = document.getElementById('found-nav')
  if (nav) nav.classList.remove('found-nav-open')

  /* scroll to top */
  var main = document.querySelector('.found-main')
  if (main) main.scrollTop = 0

  if (section === 'overview') {
    renderOverview()
  } else if (strategyDocPaths[section]) {
    renderStrategyDoc(section)
  } else if (section === 'backlog') {
    renderBacklog()
  } else if (section === 'decisions') {
    renderDecisions()
  } else if (section === 'open-questions') {
    renderOpenQuestions()
  } else if (section === 'source-registry') {
    renderSourceRegistry()
  } else if (section === 'data-health') {
    renderDataHealth()
  } else {
    renderOverview()
  }
}

/* ── init ────────────────────────────────────────────────── */

function init() {
  /* default hash */
  if (!window.location.hash) {
    window.location.hash = '#overview'
  }

  /* mobile toggle */
  var toggleBtn = document.getElementById('found-mobile-toggle')
  var nav = document.getElementById('found-nav')
  if (toggleBtn && nav) {
    toggleBtn.addEventListener('click', function() {
      nav.classList.toggle('found-nav-open')
    })
  }

  /* route on hash change */
  window.addEventListener('hashchange', route)

  /* initial render */
  route()
}

init()

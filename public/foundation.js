/* ── helpers (from app.js) ────────────────────────────────── */

function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return date.toLocaleString()
}

function formatAsOfDate(value) {
  if (!value) return ''

  var date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + 'T12:00:00Z')
    : new Date(value)
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

function isSafeDirectHref(href) {
  if (typeof href !== 'string') return false
  var cleanHref = href.trim()
  return /^(https?:|mailto:|tel:|#)/i.test(cleanHref) || /^\/(?!\/)/.test(cleanHref)
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
  if (!isInternalMarkdownPath(href)) {
    return isSafeDirectHref(href) ? href.trim() : '#'
  }

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
  { key: 'done', label: 'Done' },
]

var backlogWorkflowStages = [
  { key: 'todo', label: 'To Do', lanes: ['research'], intro: 'Ideas and work that still need more proof, research, or shaping before they are ready.' },
  { key: 'todo-scoped', label: 'To Do Scoped', lanes: ['scoped', 'ranked'], intro: 'Work that is shaped enough to build, but is not in motion yet.' },
  { key: 'doing', label: 'Doing', lanes: ['executing'], intro: 'Live work actively being built or closed out right now.' },
  { key: 'waiting', label: 'Waiting / Parked', lanes: ['parked'], intro: 'Work intentionally held, blocked, or waiting on something outside the active build flow.' },
  { key: 'done', label: 'Done', lanes: ['done'], intro: 'Closed work that is already part of the live system.' },
]

var foundationNowSequence = [
  {
    title: 'Owners package is closed for v1',
    body: 'Owners Admin meaning, FUB joins, lead-source lineage, Admin review rules, conditional forecast sync, and Ops routing are live. Historical row cleanup, missing links, and duplicate-credit exceptions now surface as Ops findings instead of blocking source-package closeout.',
    href: '/doc?path=docs/rebuild/owners-closeout.md',
    cta: 'Open Owners Closeout',
  },
  {
    title: 'Hold finance at current-reality sign-off',
    body: 'Weekly Actuals and Cashflow Dash are signed off for current reality. Do not reopen finance unless building freshness, reconciliation, or automation hardening.',
    href: '/foundation#source-sheets:SRC-FINANCE-001',
    cta: 'Open Finance Source',
  },
  {
    title: 'KPI read rules are locked',
    body: 'SOURCE-010 is closed for first-pass KPI read discipline: pipeline, shopping list, executed deals, goals, competition, and usage each have a named truth layer.',
    href: '/foundation#source-overview',
    cta: 'Open Data Sources',
  },
  {
    title: 'Close required connectors by pillar',
    body: 'After Owners and KPI are clear, wire the sources that actually matter by pillar: company, Steve / agent brand, and MarketMasters.',
    href: '/doc?path=docs/source-notes/freedom-marketing.md',
    cta: 'Open Marketing Source Map',
  },
]

var decisionViewState = {
  query: '',
  category: 'all',
  view: 'current',
}

var fallbackBacklogScopes = [
  { key: 'foundation', label: 'Foundation / System', shortLabel: 'foundation/system', active: true },
  { key: 'strategic_execution', label: 'Strategic Execution', shortLabel: 'strategic execution', active: true },
  { key: 'marketing', label: 'Marketing', shortLabel: 'marketing', active: true },
]

var backlogScopeRegistry = fallbackBacklogScopes.slice()

var backlogViewState = {
  query: '',
  scope: 'all',
  priority: 'all',
  ids: [],
}

var actionReviewState = {
  busyRouteId: null,
  notes: {},
}

var sourceViewState = {
  query: '',
  kind: 'all',
  presence: 'all',
}

var sourceSectionConfigs = {
  'source-overview': {
    title: 'Data Sources',
    eyebrow: 'Source Layer',
    intro: 'Full source map: source systems, validation units, and the connector layer underneath them.',
    showSystems: true,
    showConnectors: true,
    showKindFilter: true,
    showOperatorNotes: true,
  },
  'source-docs': {
    title: 'Docs',
    eyebrow: 'Data Sources',
    intro: 'Repo docs and markdown-backed truth only. Use this lane to see which written packets are signed off, what they include, and what is still outside the closure.',
    showSystems: true,
    showConnectors: false,
    showKindFilter: false,
    allowedKinds: ['docs'],
  },
  'source-sheets': {
    title: 'Spreadsheets',
    eyebrow: 'Data Sources',
    intro: 'Workbook-level sources and validation units. Use this lane for sheet-by-sheet trust work.',
    showSystems: true,
    showConnectors: false,
    showKindFilter: false,
    allowedKinds: ['sheets'],
  },
  'source-apis': {
    title: 'APIs and apps',
    eyebrow: 'Data Sources',
    intro: 'External systems, APIs, and app-backed business sources. Use this lane when truth lives outside the repo and outside spreadsheets.',
    showSystems: true,
    showConnectors: false,
    showKindFilter: false,
    allowedKinds: ['api', 'apps'],
  },
  'source-connectors': {
    title: 'Connectors',
    eyebrow: 'Connector Layer',
    intro: 'Access paths and technical reach only. This lane does not prove the source itself is trusted.',
    showSystems: false,
    showConnectors: true,
    showKindFilter: false,
  },
  'source-lifecycle': {
    title: 'Source Lifecycle',
    eyebrow: 'Source Control',
    intro: 'Connect, verify, extract, review, retry, or park source lanes without starting new ingestion.',
    showSystems: false,
    showConnectors: false,
    showKindFilter: false,
  },
}

var phaseGOperatorOrder = [
  'PLAIN-ENGLISH-SWEEP-001',
  'UI-MENU-LAYOUT-POLISH-001',
  'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
  'CHANGE-LOG-COMPREHENSIVE-001',
  'DAILY-EXEC-SUMMARY-001',
  'SOURCE-LIFECYCLE-EXPANSION-001',
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
      var href = buildDocHref(m[5], currentPath)
      link.setAttribute('href', href)
      if (/^https?:\/\//i.test(href)) {
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
      }
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
    if (action.targetBlank || /^https?:/i.test(action.href)) {
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

  if (Array.isArray(item.actions) && item.actions.length) {
    var actions = document.createElement('div')
    actions.className = 'status-actions'
    item.actions.forEach(function(action) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'status-action-button' + (action.secondary ? ' status-action-button-secondary' : '')
      button.textContent = action.label
      if (action.disabled) button.disabled = true
      if (typeof action.onClick === 'function') {
        button.addEventListener('click', function() {
          action.onClick(button)
        })
      }
      actions.appendChild(button)
    })
    card.appendChild(actions)
  }

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

function compareBacklogItems(a, b) {
  var priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 }
  var laneOrder = {}
  backlogLanes.forEach(function(lane, index) {
    laneOrder[lane.key] = index
  })

  var aPriority = priorityOrder[a.priority] != null ? priorityOrder[a.priority] : 9
  var bPriority = priorityOrder[b.priority] != null ? priorityOrder[b.priority] : 9
  var priorityDelta = aPriority - bPriority
  if (priorityDelta !== 0) return priorityDelta

  var aRank = typeof a.rank === 'number' ? a.rank : Number.MAX_SAFE_INTEGER
  var bRank = typeof b.rank === 'number' ? b.rank : Number.MAX_SAFE_INTEGER
  if (aRank !== bRank) return aRank - bRank

  var aLane = laneOrder[a.lane] != null ? laneOrder[a.lane] : 99
  var bLane = laneOrder[b.lane] != null ? laneOrder[b.lane] : 99
  var laneDelta = aLane - bLane
  if (laneDelta !== 0) return laneDelta

  return String(a.title || '').localeCompare(String(b.title || ''))
}

function sortBacklogItems(items) {
  return (items || []).slice().sort(compareBacklogItems)
}

function getBacklogScopes() {
  return (backlogScopeRegistry || []).slice()
}

function getActiveBacklogScopes() {
  return getBacklogScopes().filter(function(scope) {
    return scope.active !== false
  })
}

function getBacklogScopeMeta(scopeKey) {
  return getBacklogScopes().find(function(scope) { return scope.key === scopeKey }) || null
}

function filterBacklogItems(items, viewState) {
  var query = String((viewState && viewState.query) || '').trim().toLowerCase()
  var scope = (viewState && viewState.scope) || 'all'
  var priority = (viewState && viewState.priority) || 'all'
  var ids = Array.isArray(viewState && viewState.ids) ? viewState.ids : []

  return sortBacklogItems(items).filter(function(item) {
    if (ids.length && ids.indexOf(item.id) === -1) return false
    if (scope !== 'all' && item.scope !== scope) return false
    if (priority !== 'all' && item.priority !== priority) return false
    if (!query) return true

    var haystack = [
      item.id,
      item.title,
      item.scope,
      item.lane,
      item.priority,
      item.summary,
      item.whyItMatters,
      item.nextAction,
      item.statusNote,
      item.owner,
      item.source,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.indexOf(query) !== -1
  })
}

function renderBacklogAccordionItem(item) {
  var details = document.createElement('details')
  details.className = 'backlog-item-pill'

  var summary = document.createElement('summary')
  summary.className = 'backlog-item-summary'

  var left = document.createElement('div')
  left.className = 'backlog-item-summary-left'

  var title = document.createElement('div')
  title.className = 'backlog-item-summary-title'
  title.textContent = item.title
  left.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'backlog-item-summary-meta'
  meta.textContent = [
    item.id,
    getBacklogScopeLabel(item.scope),
    getBacklogLaneLabel(item.lane),
    item.owner || null,
  ].filter(Boolean).join(' · ')
  left.appendChild(meta)
  summary.appendChild(left)

  var right = document.createElement('div')
  right.className = 'backlog-item-summary-right'

  var priority = document.createElement('span')
  priority.className = 'backlog-pill backlog-priority-' + item.priority.toLowerCase()
  priority.textContent = item.priority
  right.appendChild(priority)

  if (item.rank) {
    var rank = document.createElement('span')
    rank.className = 'backlog-rank'
    rank.textContent = '#' + item.rank
    right.appendChild(rank)
  }

  summary.appendChild(right)
  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'backlog-item-body'

  var summaryCopy = document.createElement('p')
  summaryCopy.className = 'backlog-copy'
  summaryCopy.textContent = item.summary
  body.appendChild(summaryCopy)

  if (item.whyItMatters) {
    body.appendChild(renderLabeledCopy('backlog-note', 'Why It Matters', item.whyItMatters))
  }

  if (item.nextAction) {
    body.appendChild(renderLabeledCopy('backlog-next', 'Next To Close', item.nextAction))
  }

  if (item.statusNote) {
    body.appendChild(renderLabeledCopy('backlog-note', 'Current Note', item.statusNote))
  }

  if (item.source) {
    body.appendChild(renderLabeledCopy('backlog-note', 'Source', item.source))
  }

  if (item.updatedAt || item.createdAt) {
    body.appendChild(renderLabeledCopy('backlog-note', 'Updated', formatDate(item.updatedAt || item.createdAt)))
  }

  if (item.owner) {
    body.appendChild(renderLabeledCopy('capture-owner', 'Owner', item.owner))
  }

  body.appendChild(renderBacklogItemEditor(item))
  details.appendChild(body)
  return details
}

function renderBacklogWorkflowStack(group, items) {
  var details = document.createElement('details')
  details.className = 'backlog-stack'

  var summary = document.createElement('summary')
  summary.className = 'backlog-stack-summary backlog-stack-summary-' + group.key

  var labelWrap = document.createElement('div')
  labelWrap.className = 'backlog-stack-label-wrap'

  var label = document.createElement('div')
  label.className = 'backlog-stack-title'
  label.textContent = group.label
  labelWrap.appendChild(label)

  var intro = document.createElement('div')
  intro.className = 'backlog-stack-intro'
  intro.textContent = items.length
    ? group.intro
    : 'No cards are in this stage right now.'
  labelWrap.appendChild(intro)
  summary.appendChild(labelWrap)

  var count = document.createElement('span')
  count.className = 'backlog-stack-count'
  count.textContent = items.length
  summary.appendChild(count)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'backlog-stack-body'

  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'lane-empty'
    empty.textContent = 'No cards are in this stage yet.'
    body.appendChild(empty)
  } else {
    sortBacklogItems(items).forEach(function(item) {
      body.appendChild(renderBacklogAccordionItem(item))
    })
  }

  details.appendChild(body)
  return details
}

function actionReviewTitle(route) {
  var payload = route.proposedPayload || {}
  return payload.title || route.title || route.routeId || 'Action route'
}

function actionReviewSummary(route) {
  var payload = route.proposedPayload || {}
  return payload.summary || payload.reason || route.routingReason || 'No plain-English summary has been recorded for this route yet.'
}

function actionReviewDestinationLabel(route) {
  if (route.actionReview && route.actionReview.destinationLabel) return route.actionReview.destinationLabel
  if (route.destinationTable === 'backlog_items') return 'Backlog work item'
  if (route.destinationTable === 'decisions') return 'Decision'
  if (route.destinationTable === 'open_questions') return 'Open question'
  if (route.destinationTable === 'intelligence_synthesized_items') return route.routeType === 'snooze' ? 'Snoozed finding' : 'Ignored finding'
  return route.destinationTable || 'Destination record not chosen yet'
}

function actionReviewDestinationHref(route) {
  if (!route.destinationRecordId) return ''
  if (route.destinationTable === 'backlog_items') return '/foundation#backlog:' + encodeURIComponent(route.destinationRecordId)
  if (route.destinationTable === 'decisions') return '/foundation#decisions'
  if (route.destinationTable === 'open_questions') return '/foundation#open-questions'
  return ''
}

function actionReviewTone(value) {
  var normalized = String(value || '').toLowerCase()
  if (normalized === 'applied' || normalized.includes('destination')) return 'good'
  if (normalized === 'pending' || normalized.includes('review') || normalized === 'approved') return 'pending'
  if (normalized === 'rejected' || normalized.includes('stuck')) return 'risk'
  return 'connected'
}

function renderActionReviewPill(text, tone) {
  var pill = document.createElement('span')
  pill.className = 'status-pill status-pill-static status-' + actionReviewTone(tone || text)
  pill.textContent = text
  return pill
}

function getActionReviewNote(route) {
  var key = route.routeId
  if (actionReviewState.notes[key] == null) actionReviewState.notes[key] = ''
  return actionReviewState.notes[key]
}

function setActionReviewNote(route, value) {
  actionReviewState.notes[route.routeId] = value
}

function renderActionReviewProof(route) {
  var proof = route.sourceProof || {}
  var items = Array.isArray(proof.items) ? proof.items : []
  var details = document.createElement('details')
  details.className = 'action-review-proof'

  var summary = document.createElement('summary')
  summary.textContent = items.length ? 'Source proof (' + items.length + ')' : 'Source proof'
  details.appendChild(summary)

  if (proof.summary) {
    var proofSummary = document.createElement('p')
    proofSummary.className = 'backlog-copy'
    proofSummary.textContent = proof.summary
    details.appendChild(proofSummary)
  }

  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'backlog-copy backlog-copy-secondary'
    empty.textContent = 'No readable source proof is attached yet.'
    details.appendChild(empty)
    return details
  }

  var list = document.createElement('div')
  list.className = 'action-review-proof-list'
  items.slice(0, 3).forEach(function(item) {
    var card = document.createElement('article')
    card.className = 'action-review-proof-card'

    var title = document.createElement('h5')
    title.textContent = item.title || 'Source evidence'
    card.appendChild(title)

    var meta = document.createElement('p')
    meta.className = 'backlog-copy-secondary'
    meta.textContent = [
      item.sourceId,
      item.sourceType,
      item.occurredAt ? formatDate(item.occurredAt) : null,
      item.from ? 'From: ' + item.from : null,
    ].filter(Boolean).join(' · ')
    card.appendChild(meta)

    if (item.quote) {
      var quote = document.createElement('blockquote')
      quote.textContent = item.quote
      card.appendChild(quote)
    } else if (item.context) {
      var context = document.createElement('p')
      context.className = 'backlog-copy'
      context.textContent = item.context
      card.appendChild(context)
    }

    if (item.sourceUrl) {
      var link = document.createElement('a')
      link.href = item.sourceUrl
      link.className = 'section-support-link'
      link.textContent = 'Open source'
      card.appendChild(link)
    }

    list.appendChild(card)
  })
  details.appendChild(list)
  return details
}

function reviewFoundationActionRoute(route, action) {
  var note = getActionReviewNote(route).trim()
  if (action === 'reject' && !note) {
    window.alert('Reject needs a reason so the finding is not silently lost.')
    return
  }
  var confirmCopy = action === 'approve'
    ? 'Approve this route? It will be ready to apply, but will not write a destination record yet.'
    : action === 'apply'
      ? 'Apply this approved route now? This writes the destination record, so use it only when the route is meant to become real work.'
      : 'Reject this route? The reason will be saved so the finding is not lost.'
  if (!window.confirm(confirmCopy)) return

  actionReviewState.busyRouteId = route.routeId
  renderBacklog()
  foundationMutation('/api/foundation/action-review/' + encodeURIComponent(route.routeId) + '/review', 'POST', {
    action: action,
    note: note,
    reviewedBy: 'Steve',
  }).then(function(payload) {
    cache.actionReview = payload.actionReview
    actionReviewState.busyRouteId = null
    if (action !== 'reject') actionReviewState.notes[route.routeId] = ''
    renderBacklog()
  }).catch(function(error) {
    actionReviewState.busyRouteId = null
    window.alert(error.message || 'Action Review could not save the route update.')
    renderBacklog()
  })
}

function renderActionReviewButton(route, action, label, tone) {
  var button = document.createElement('button')
  button.type = 'button'
  button.className = 'action-review-button action-review-button-' + (tone || 'neutral')
  button.textContent = actionReviewState.busyRouteId === route.routeId ? 'Working...' : label
  button.disabled = Boolean(actionReviewState.busyRouteId)
  button.addEventListener('click', function() {
    reviewFoundationActionRoute(route, action)
  })
  return button
}

function renderActionReviewCard(route) {
  var details = document.createElement('details')
  details.className = 'action-review-card'

  var summary = document.createElement('summary')
  summary.className = 'action-review-card-summary'

  var left = document.createElement('div')
  left.className = 'action-review-card-left'
  var title = document.createElement('h4')
  title.textContent = actionReviewTitle(route)
  left.appendChild(title)

  var meta = document.createElement('p')
  meta.textContent = [
    route.routeId,
    'Owner: ' + (route.owner || 'missing'),
    actionReviewDestinationLabel(route),
    route.actionReview && route.actionReview.ageDays !== null ? route.actionReview.ageDays + ' days old' : null,
  ].filter(Boolean).join(' · ')
  left.appendChild(meta)
  summary.appendChild(left)

  var pills = document.createElement('div')
  pills.className = 'action-review-card-pills'
  pills.appendChild(renderActionReviewPill(route.actionReview?.plainStatus || route.approvalStatus, route.approvalStatus))
  if (route.actionReview?.isAgedPending) pills.appendChild(renderActionReviewPill('Aged', 'pending'))
  if (route.destinationRecordId) pills.appendChild(renderActionReviewPill('Destination proof', 'applied'))
  summary.appendChild(pills)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'action-review-card-body'

  var copy = document.createElement('p')
  copy.className = 'backlog-copy'
  copy.textContent = actionReviewSummary(route)
  body.appendChild(copy)

  body.appendChild(renderLabeledCopy('backlog-note', 'What this would create', actionReviewDestinationLabel(route)))
  body.appendChild(renderLabeledCopy('backlog-note', 'Why it was routed', route.routingReason || 'No routing reason recorded.'))

  if (route.destinationRecordId) {
    var href = actionReviewDestinationHref(route)
    var destination = document.createElement('p')
    destination.className = 'backlog-next'
    var strong = document.createElement('strong')
    strong.textContent = 'Applied proof:'
    destination.appendChild(strong)
    destination.appendChild(document.createTextNode(' ' + actionReviewDestinationLabel(route) + ' ' + route.destinationRecordId))
    if (href) {
      destination.appendChild(document.createTextNode(' '))
      var link = document.createElement('a')
      link.href = href
      link.textContent = 'Open'
      destination.appendChild(link)
    }
    body.appendChild(destination)
  }

  body.appendChild(renderActionReviewProof(route))

  if (route.approvalStatus === 'pending' || route.approvalStatus === 'approved') {
    var reviewBox = document.createElement('div')
    reviewBox.className = 'action-review-controls'

    var noteLabel = document.createElement('label')
    var noteText = document.createElement('span')
    noteText.textContent = 'Review note'
    noteLabel.appendChild(noteText)
    var noteInput = document.createElement('input')
    noteInput.type = 'text'
    noteInput.placeholder = 'Reject requires a reason; approve or apply can include a note'
    noteInput.value = getActionReviewNote(route)
    noteInput.addEventListener('input', function() {
      setActionReviewNote(route, noteInput.value)
    })
    noteLabel.appendChild(noteInput)
    reviewBox.appendChild(noteLabel)

    var actions = document.createElement('div')
    actions.className = 'action-review-actions'
    if (route.approvalStatus === 'pending') {
      actions.appendChild(renderActionReviewButton(route, 'approve', 'Approve', 'primary'))
      actions.appendChild(renderActionReviewButton(route, 'reject', 'Reject', 'danger'))
    } else if (route.approvalStatus === 'approved') {
      actions.appendChild(renderActionReviewButton(route, 'apply', 'Apply approved route', 'primary'))
      actions.appendChild(renderActionReviewButton(route, 'reject', 'Reject', 'danger'))
    }
    reviewBox.appendChild(actions)
    body.appendChild(reviewBox)
  }

  details.appendChild(body)
  return details
}

function renderActionReviewPanel(actionReview) {
  var panel = document.createElement('section')
  panel.className = 'panel action-review-panel'
  panel.id = 'action-review'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var copy = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Action review'
  copy.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Action Review'
  copy.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Review system findings before they become decisions, backlog cards, questions, ignored findings, or owner actions.'
  copy.appendChild(intro)
  header.appendChild(copy)
  panel.appendChild(header)

  if (actionReview && actionReview.error) {
    var errorCopy = document.createElement('p')
    errorCopy.className = 'backlog-copy'
    errorCopy.textContent = 'Action Review could not load. No routes were changed. Details: ' + actionReview.error
    panel.appendChild(errorCopy)
    return panel
  }

  var summary = actionReview?.summary || {}
  var summaryRow = document.createElement('div')
  summaryRow.className = 'action-review-summary'
  summaryRow.appendChild(renderStatusCard({
    label: 'Needs human decision',
    status: summary.pendingRoutes ? 'pending' : 'connected',
    detail: (summary.pendingRoutes || 0) + ' pending routes waiting for a human decision.',
  }))
  summaryRow.appendChild(renderStatusCard({
    label: 'Approved, not applied',
    status: summary.approvedRoutes ? 'pending' : 'connected',
    detail: (summary.approvedRoutes || 0) + ' approved routes ready to write destination records.',
  }))
  summaryRow.appendChild(renderStatusCard({
    label: 'Applied',
    status: summary.appliedRoutesWithDestinationRecord ? 'connected' : 'pending',
    detail: (summary.appliedRoutes || 0) + ' applied routes; ' + (summary.appliedRoutesWithDestinationRecord || 0) + ' have destination proof.',
  }))
  summaryRow.appendChild(renderStatusCard({
    label: 'Old pending routes',
    status: summary.agedPendingRoutes ? 'pending' : 'connected',
    detail: (summary.agedPendingRoutes || 0) + ' pending routes are older than ' + ((actionReview?.thresholds && actionReview.thresholds.agedPendingDays) || 3) + ' days.',
  }))
  panel.appendChild(summaryRow)

  var routes = Array.isArray(actionReview?.routes) ? actionReview.routes.slice() : []
  var activeRoutes = routes.filter(function(route) {
    return route.approvalStatus === 'pending' || route.approvalStatus === 'approved'
  })
  var closedRoutes = routes.filter(function(route) {
    return route.approvalStatus === 'applied' || route.approvalStatus === 'rejected'
  })

  var activeStack = document.createElement('div')
  activeStack.className = 'action-review-stack'
  var activeTitle = document.createElement('h4')
  activeTitle.textContent = 'Needs human review'
  activeStack.appendChild(activeTitle)
  if (!activeRoutes.length) {
    var empty = document.createElement('p')
    empty.className = 'lane-empty'
    empty.textContent = 'No pending or approved routes need a human review right now.'
    activeStack.appendChild(empty)
  } else {
    activeRoutes.forEach(function(route) {
      activeStack.appendChild(renderActionReviewCard(route))
    })
  }
  panel.appendChild(activeStack)

  var closedDetails = document.createElement('details')
  closedDetails.className = 'action-review-history'
  var closedSummary = document.createElement('summary')
  closedSummary.textContent = 'Applied and rejected history (' + closedRoutes.length + ')'
  closedDetails.appendChild(closedSummary)
  var closedStack = document.createElement('div')
  closedStack.className = 'action-review-stack'
  if (!closedRoutes.length) {
    var noneClosed = document.createElement('p')
    noneClosed.className = 'lane-empty'
    noneClosed.textContent = 'No routes have been applied or rejected yet.'
    closedStack.appendChild(noneClosed)
  } else {
    closedRoutes.forEach(function(route) {
      closedStack.appendChild(renderActionReviewCard(route))
    })
  }
  closedDetails.appendChild(closedStack)
  panel.appendChild(closedDetails)
  return panel
}

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
  title.textContent = 'Temporary Write Gate'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Local same-machine use is auto-approved right now. This token box only matters if you open the system from somewhere other than the local machine before real logins exist.'
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
  setFormStatus(status, getStoredAdminToken() ? 'Remote-access token saved for this browser.' : 'Local browser access is already allowed. Token is optional unless you are coming in remotely.', getStoredAdminToken() ? 'success' : '')
  panel.appendChild(status)

  saveButton.addEventListener('click', function() {
    setStoredAdminToken(tokenInput.value.trim())
    setFormStatus(status, tokenInput.value.trim() ? 'Remote-access token saved for this browser.' : 'Token cleared. Local same-machine access still works.', tokenInput.value.trim() ? 'success' : '')
  })

  clearButton.addEventListener('click', function() {
    tokenInput.value = ''
    setStoredAdminToken('')
    setFormStatus(status, 'Token cleared. Local same-machine access still works.', '')
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

function buildStrategyLedgerItems(context) {
  var updateMap = new Map()
  ;(context.updates || []).forEach(function(item) {
    updateMap.set(item.id, item)
  })

  var items = []

  ;(context.updates || []).forEach(function(item) {
    items.push({
      kind: 'proposal',
      key: 'proposal-' + item.id,
      createdAt: item.proposedAt,
      title: item.summary,
      subtitle: item.id + ' · ' + item.status,
      targetDocPath: item.targetDocPath,
      targetSection: item.targetSection,
      decisionId: item.decisionId,
      decisionTitle: item.decisionTitle,
      decisionSourceRef: item.decisionSourceRef,
      decisionContextRef: item.decisionContextRef,
      decisionOwner: item.decisionOwner,
      decisionConfirmedBy: item.decisionConfirmedBy,
      detail: item.proposedDiff || item.proposedText || '',
    })
  })

  ;(context.changes || []).forEach(function(change) {
    var linked = updateMap.get(change.entityId)
    items.push({
      kind: 'event',
      key: 'event-' + change.id,
      createdAt: change.createdAt,
      title: change.summary,
      subtitle: change.actor + ' · ' + change.eventType,
      targetDocPath: change.metadata && change.metadata.targetDocPath
        ? change.metadata.targetDocPath
        : (linked ? linked.targetDocPath : null),
      targetSection: change.metadata && change.metadata.targetSection
        ? change.metadata.targetSection
        : (linked ? linked.targetSection : null),
      decisionId: change.metadata && change.metadata.decisionId
        ? change.metadata.decisionId
        : (linked ? linked.decisionId : null),
      decisionTitle: linked ? linked.decisionTitle : null,
      decisionSourceRef: linked ? linked.decisionSourceRef : null,
      decisionContextRef: linked ? linked.decisionContextRef : null,
      decisionOwner: linked ? linked.decisionOwner : null,
      decisionConfirmedBy: linked ? linked.decisionConfirmedBy : null,
      detail: '',
    })
  })

  items.sort(function(a, b) {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  })

  return items
}

function renderStrategyLedgerCard(item) {
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
  meta.textContent = (item.kind === 'proposal' ? 'Proposal' : 'History') + ' · ' + (item.subtitle || 'Change')
  titleWrap.appendChild(meta)
  top.appendChild(titleWrap)

  var stamp = document.createElement('span')
  stamp.className = 'change-stamp'
  stamp.textContent = formatDate(item.createdAt)
  top.appendChild(stamp)

  card.appendChild(top)

  if (item.decisionId || item.decisionTitle) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Decision', [item.decisionId, item.decisionTitle].filter(Boolean).join(' · ')))
  }
  if (item.targetDocPath) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Target', item.targetDocPath))
  }
  if (item.targetSection) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Section', item.targetSection))
  }
  if (item.decisionSourceRef) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Why / source', item.decisionSourceRef))
  }
  if (item.decisionContextRef) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Context', item.decisionContextRef))
  }
  if (item.decisionOwner || item.decisionConfirmedBy) {
    card.appendChild(renderLabeledCopy(
      'decision-meta',
      'Approval path',
      [item.decisionOwner ? 'Owner: ' + item.decisionOwner : '', item.decisionConfirmedBy ? 'Confirmed: ' + item.decisionConfirmedBy : ''].filter(Boolean).join(' · ')
    ))
  }
  if (item.kind === 'proposal' && item.detail) {
    var diff = document.createElement('details')
    diff.className = 'memory-inline-editor'
    var diffSummary = document.createElement('summary')
    diffSummary.textContent = 'What changed'
    diff.appendChild(diffSummary)
    var diffBody = document.createElement('pre')
    diffBody.className = 'doc-update-diff'
    diffBody.textContent = item.detail
    diff.appendChild(diffBody)
    card.appendChild(diff)
  }

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

  var availableScopes = ((hub.meta && hub.meta.backlogScopes) || getBacklogScopes()).filter(function(scope) {
    return scope.active !== false
  })
  var defaultScope = availableScopes.find(function(scope) { return scope.key === 'foundation' }) || availableScopes[0] || fallbackBacklogScopes[0]

  var prefixSelect = buildSelect((hub.meta && hub.meta.backlogIdPrefixes || []).concat(['TASK']).filter(function(value, index, array) {
    return array.indexOf(value) === index
  }).map(function(prefix, index) {
    return { value: prefix, label: prefix, selected: index === 0 }
  }))
  form.appendChild(buildField('ID Prefix', prefixSelect))

  var scopeSelect = buildSelect(availableScopes.map(function(scope) {
    return { value: scope.key, label: scope.label, selected: scope.key === defaultScope.key }
  }))
  form.appendChild(buildField('Scope', scopeSelect))

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
      scope: scopeSelect.value,
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
      scopeSelect.value = defaultScope.key
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

  var scopeSelect = buildSelect(getActiveBacklogScopes().map(function(scope) {
    return { value: scope.key, label: scope.label, selected: scope.key === item.scope }
  }))
  wrap.appendChild(buildField('Scope', scopeSelect))

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
      scope: scopeSelect.value,
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

function getBacklogLaneLabel(laneKey) {
  var match = backlogLanes.find(function(lane) { return lane.key === laneKey })
  return match ? match.label : laneKey
}

function getBacklogScopeLabel(scopeKey) {
  var match = getBacklogScopeMeta(scopeKey)
  return match ? match.label : (scopeKey || 'Unassigned')
}

function getBacklogScopeShortLabel(scopeKey) {
  var match = getBacklogScopeMeta(scopeKey)
  if (!match) return scopeKey || 'unassigned'
  return match.shortLabel || String(match.label || scopeKey).toLowerCase()
}

function renderOperatorToolsDrawer(titleText, introText, panels, openByDefault) {
  var details = document.createElement('details')
  details.className = 'operator-tools-drawer'
  if (openByDefault) details.open = true

  var summary = document.createElement('summary')
  summary.className = 'operator-tools-summary'

  var left = document.createElement('div')
  left.className = 'operator-tools-summary-left'

  var title = document.createElement('div')
  title.className = 'operator-tools-title'
  title.textContent = titleText || 'Operator Tools'
  left.appendChild(title)

  if (introText) {
    var intro = document.createElement('div')
    intro.className = 'operator-tools-intro'
    intro.textContent = introText
    left.appendChild(intro)
  }

  summary.appendChild(left)

  var state = document.createElement('span')
  state.className = 'operator-tools-state'
  state.textContent = 'Collapsed until needed'
  summary.appendChild(state)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'operator-tools-body'
  ;(panels || []).forEach(function(panel) {
    if (panel) body.appendChild(panel)
  })
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

function renderOverviewStatusPanel(items, options) {
  if (!items || !items.length) return null

  var opts = options || {}
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = opts.eyebrow || 'Foundation State'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = opts.title || 'System Status'
  left.appendChild(title)

  if (opts.intro) {
    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = opts.intro
    left.appendChild(intro)
  }

  header.appendChild(left)
  panel.appendChild(header)

  var statusGrid = document.createElement('div')
  statusGrid.className = 'status-grid'
  items.forEach(function(item) {
    statusGrid.appendChild(renderStatusCard(item))
  })
  panel.appendChild(statusGrid)

  return panel
}

function renderRecentChangesPanel(items, options) {
  if (!items || !items.length) return null

  var opts = options || {}
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = opts.eyebrow || 'Trust Layer'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = opts.title || 'System Activity'
  left.appendChild(title)

  if (opts.intro) {
    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = opts.intro
    left.appendChild(intro)
  }

  header.appendChild(left)
  panel.appendChild(header)

  var list = document.createElement('div')
  list.className = 'change-list'
  items.forEach(function(item) {
    list.appendChild(renderChangeEventCard(item))
  })
  panel.appendChild(list)

  return panel
}

function renderChangeLogMetric(label, value, detail) {
  var card = document.createElement('div')
  card.className = 'build-log-summary-metric'
  var strong = document.createElement('strong')
  strong.textContent = value
  card.appendChild(strong)
  var span = document.createElement('span')
  span.textContent = label
  card.appendChild(span)
  if (detail) {
    var copy = document.createElement('p')
    copy.textContent = detail
    card.appendChild(copy)
  }
  return card
}

function renderChangeLogSummary(changeLog) {
  var summary = changeLog.summary || {}
  var panel = document.createElement('section')
  panel.className = 'build-log-executive-summary change-log-summary'
  panel.setAttribute('data-change-log-section', 'summary')

  var copy = document.createElement('div')
  copy.className = 'build-log-executive-copy'
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Comprehensive Changelog'
  copy.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'What changed across Foundation'
  copy.appendChild(title)
  var intro = document.createElement('p')
  intro.textContent = 'This layer combines verified closeouts, DB trust events, and changed-file evidence. Recent Work stays the shipped-build review surface; this page tracks the broader change trail by type and surface.'
  copy.appendChild(intro)
  panel.appendChild(copy)

  var grid = document.createElement('div')
  grid.className = 'build-log-summary-grid change-log-summary-grid'
  grid.appendChild(renderChangeLogMetric('Entries', String(summary.totalEntries || 0), 'Source-backed changelog rows currently shown.'))
  grid.appendChild(renderChangeLogMetric('Verified closeout rows', String(summary.verifiedCloseoutBackedEntries || 0), 'Rows backed by v2 verified closeouts.'))
  grid.appendChild(renderChangeLogMetric('Change types', String(summary.representedChangeTypes || 0) + '/10', 'Required types represented unless evidence is absent.'))
  grid.appendChild(renderChangeLogMetric('Recent builds', String(summary.latestRecentBuildsRepresented || 0) + '/5', 'Newest Recent Work builds represented here.'))
  panel.appendChild(grid)

  return panel
}

function renderChangeLogCardLinks(values, label, className) {
  var ids = (values || []).filter(Boolean)
  if (!ids.length) return null

  var wrap = document.createElement('div')
  wrap.className = 'build-log-fact'
  wrap.setAttribute('data-change-log-owner-context', label)
  var strong = document.createElement('strong')
  strong.textContent = label
  wrap.appendChild(strong)
  var links = document.createElement('div')
  links.className = 'build-log-backlog-links'
  ids.forEach(function(id) {
    var link = document.createElement('a')
    link.className = className || 'build-log-backlog-link'
    link.href = '/foundation#backlog:' + id
    link.textContent = id
    links.appendChild(link)
  })
  wrap.appendChild(links)
  return wrap
}

function renderChangeLogEntryCard(entry) {
  var card = document.createElement('article')
  card.className = 'change-log-entry'

  var top = document.createElement('div')
  top.className = 'change-log-entry-top'
  var left = document.createElement('div')
  left.className = 'change-log-entry-copy'
  var title = document.createElement('strong')
  title.textContent = entry.title || entry.summary || 'Foundation change'
  left.appendChild(title)
  var summary = document.createElement('p')
  summary.textContent = entry.summary || 'Source-backed Foundation change.'
  left.appendChild(summary)
  top.appendChild(left)
  var stamp = document.createElement('span')
  stamp.className = 'change-stamp'
  stamp.textContent = formatDate(entry.occurredAt)
  top.appendChild(stamp)
  card.appendChild(top)

  var meta = document.createElement('div')
  meta.className = 'change-log-entry-meta'
  meta.textContent = [
    entry.changeTypeLabel || entry.changeType,
    entry.surface,
    entry.sourceKind,
    entry.commit ? 'commit ' + entry.commit : null,
    entry.closeoutKey,
  ].filter(Boolean).join(' · ')
  card.appendChild(meta)

  var ownerLinks = renderChangeLogCardLinks(entry.backlogIds, 'Owning cards', 'build-log-backlog-link')
  if (ownerLinks) card.appendChild(ownerLinks)
  var contextLinks = renderChangeLogCardLinks(entry.mentionedBacklogIds, 'Context cards', 'build-log-backlog-link build-log-context-link')
  if (contextLinks) card.appendChild(contextLinks)

  if ((entry.evidenceRefs || []).length) {
    var details = document.createElement('details')
    details.className = 'change-log-evidence'
    details.setAttribute('data-change-log-evidence-group', 'refs')
    var detailsSummary = document.createElement('summary')
    detailsSummary.textContent = 'Evidence refs'
    details.appendChild(detailsSummary)
    var list = document.createElement('ul')
    list.className = 'change-log-evidence-list'
    ;(entry.evidenceRefs || []).slice(0, 12).forEach(function(ref) {
      var item = document.createElement('li')
      item.setAttribute('data-change-log-evidence-ref', 'true')
      item.textContent = ref
      list.appendChild(item)
    })
    details.appendChild(list)
    card.appendChild(details)
  }

  return card
}

function renderChangeLogHighlights(changeLog) {
  var highlights = changeLog.groups && changeLog.groups.recentHighlights || []
  if (!highlights.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel change-log-panel'
  panel.setAttribute('data-change-log-section', 'recent-highlights')
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Recent Highlights'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Review these changes first'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Highlighted rows are recent, verified, plan/state, or process-impacting changes.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)
  var list = document.createElement('div')
  list.className = 'change-log-entry-list'
  highlights.slice(0, 8).forEach(function(entry) {
    list.appendChild(renderChangeLogEntryCard(entry))
  })
  panel.appendChild(list)
  return panel
}

function renderChangeLogGroupCard(group, mode) {
  var card = document.createElement('article')
  card.className = 'change-log-group-card'
  var top = document.createElement('div')
  top.className = 'change-log-group-top'
  var title = document.createElement('strong')
  title.textContent = group.label || group.key
  top.appendChild(title)
  var count = document.createElement('span')
  count.className = 'status-pill status-pill-static status-connected'
  count.textContent = (group.count || 0) + ' changes'
  top.appendChild(count)
  card.appendChild(top)

  if (group.absenceProof) {
    var missing = document.createElement('p')
    missing.className = 'change-log-missing-proof'
    missing.textContent = group.absenceProof.reason
    card.appendChild(missing)
  }

  var items = group.items || []
  if (items.length) {
    var list = document.createElement('ul')
    list.className = 'change-log-group-list'
    items.slice(0, 5).forEach(function(entry) {
      var item = document.createElement('li')
      item.textContent = mode === 'type'
        ? [entry.surface, entry.title].filter(Boolean).join(' · ')
        : [entry.changeTypeLabel, entry.title].filter(Boolean).join(' · ')
      list.appendChild(item)
    })
    card.appendChild(list)
  }

  return card
}

function renderChangeLogSurfaceGroups(changeLog) {
  var groups = changeLog.groups && changeLog.groups.bySurface || []
  if (!groups.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel change-log-panel'
  panel.setAttribute('data-change-log-section', 'by-surface')
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'By Surface'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Where the changes live'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Surface grouping shows whether the change affected Backlog, Recent Work, Runtime Health, System Inventory, Data Sources, docs, gates, or intelligence lanes.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)
  var grid = document.createElement('div')
  grid.className = 'change-log-group-grid'
  groups.forEach(function(group) {
    grid.appendChild(renderChangeLogGroupCard(group, 'surface'))
  })
  panel.appendChild(grid)
  return panel
}

function renderChangeLogTypeGroups(changeLog) {
  var groups = changeLog.groups && changeLog.groups.byType || []
  if (!groups.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel change-log-panel'
  panel.setAttribute('data-change-log-section', 'by-type')
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'By Type'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'What kind of change happened'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'All required change categories are listed. A missing category must show why there is no real evidence instead of disappearing.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)
  var grid = document.createElement('div')
  grid.className = 'change-log-group-grid change-log-type-grid'
  groups.forEach(function(group) {
    grid.appendChild(renderChangeLogGroupCard(group, 'type'))
  })
  panel.appendChild(grid)
  return panel
}

function renderChangeLogRawEvidence(changeLog) {
  var entries = changeLog.groups && changeLog.groups.rawEvidence || []
  if (!entries.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel change-log-panel'
  panel.setAttribute('data-change-log-section', 'raw-evidence')
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Raw Evidence Feed'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Inspectable source-backed rows'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Every row points back to a closeout, commit, changed file, or DB change event. Private/local docs stay metadata-only.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)
  var list = document.createElement('div')
  list.className = 'change-log-entry-list'
  entries.slice(0, 30).forEach(function(entry) {
    list.appendChild(renderChangeLogEntryCard(entry))
  })
  panel.appendChild(list)
  return panel
}

function formatCoverageCount(value) {
  var count = Number(value || 0)
  return count.toLocaleString()
}

function formatCoverageReason(value) {
  return String(value || 'unspecified')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getExtractionCoverageStatus(record) {
  var counts = record.counts || {}
  var retrySummary = record.retrySummary || {}
  if (record.hardeningStatus === 'blocked' || Number(retrySummary.retryBlockedItems || 0) > 0 || Number(retrySummary.retryExhaustedItems || 0) > 0) return 'risk'
  if (record.status === 'blocked' || Number(counts.failedItems || 0) > 0 || record.lastStatus === 'failed') return 'risk'
  if (record.hardeningStatus === 'retry_ready' || record.lastStatus === 'partial' || Number(counts.skippedItems || 0) > 0 || Number(counts.pendingItems || 0) > 0) return 'pending'
  if (record.status === 'active') return 'live'
  if (record.status === 'paused') return 'pending'
  return 'planned'
}

function appendExtractionCoverageMetric(container, labelText, valueText, detailText) {
  var item = document.createElement('div')
  item.className = 'extraction-coverage-metric'

  var label = document.createElement('span')
  label.textContent = labelText
  item.appendChild(label)

  var value = document.createElement('strong')
  value.textContent = valueText || 'Not available'
  item.appendChild(value)

  if (detailText) {
    var detail = document.createElement('small')
    detail.textContent = detailText
    item.appendChild(detail)
  }

  container.appendChild(item)
}

function appendExtractionCoverageChip(container, text, kind) {
  var chip = document.createElement('span')
  chip.className = 'extraction-coverage-chip' + (kind ? ' extraction-coverage-chip-' + kind : '')
  chip.textContent = text
  container.appendChild(chip)
}

function renderExtractionCoverageCard(record) {
  var counts = record.counts || {}
  var retrySummary = record.retrySummary || {}
  var status = getExtractionCoverageStatus(record)
  var card = document.createElement('article')
  card.className = 'extraction-coverage-card status-' + status

  var header = document.createElement('div')
  header.className = 'extraction-coverage-card-header'

  var titleWrap = document.createElement('div')
  var title = document.createElement('h4')
  title.textContent = record.title || record.targetKey
  titleWrap.appendChild(title)

  var meta = document.createElement('p')
  meta.textContent = [
    record.targetKey,
    record.sourceId,
    record.lane,
    record.effectiveRuntimeMode || record.runtimeMode,
  ].filter(Boolean).join(' · ')
  titleWrap.appendChild(meta)
  header.appendChild(titleWrap)

  var pill = document.createElement('span')
  pill.className = 'status-pill'
  pill.textContent = status
  header.appendChild(pill)
  card.appendChild(header)

  var metrics = document.createElement('div')
  metrics.className = 'extraction-coverage-metrics'
  appendExtractionCoverageMetric(metrics, 'Last success', formatDate(record.lastSuccessAt), record.successfulRuns ? formatCoverageCount(record.successfulRuns) + ' successful runs' : '')
  appendExtractionCoverageMetric(metrics, 'Last failure', formatDate(record.lastFailureAt), record.latestFailureStatus || record.latestFailureError || '')
  appendExtractionCoverageMetric(metrics, 'Next bite', formatDate(record.nextBiteAt), record.scheduleStatus || record.scheduleTruth || '')
  appendExtractionCoverageMetric(
    metrics,
    'Runner checkpoint',
    formatDate(record.crawlCheckpointNextRunAt),
    record.crawlCheckpointNextRunAt && record.crawlCheckpointNextRunAt !== record.nextBiteAt ? 'Target checkpoint' : 'Aligned with next bite'
  )
  appendExtractionCoverageMetric(
    metrics,
    'Items',
    formatCoverageCount(counts.totalItems),
    formatCoverageCount(counts.succeededItems) + ' succeeded · '
      + formatCoverageCount(counts.skippedItems) + ' skipped · '
      + formatCoverageCount(counts.failedItems) + ' failed'
  )
  appendExtractionCoverageMetric(
    metrics,
    'Retry state',
    formatCoverageCount(retrySummary.retryEligibleItems) + ' eligible',
    formatCoverageCount(retrySummary.retryWaitingItems) + ' waiting · '
      + formatCoverageCount(retrySummary.retryExhaustedItems) + ' exhausted · '
      + formatCoverageCount(retrySummary.retryBlockedItems) + ' blocked'
  )
  card.appendChild(metrics)

  var reasons = document.createElement('div')
  reasons.className = 'extraction-coverage-section'
  var reasonsTitle = document.createElement('h5')
  reasonsTitle.textContent = 'Top failed/skipped reasons'
  reasons.appendChild(reasonsTitle)
  var reasonChips = document.createElement('div')
  reasonChips.className = 'extraction-coverage-chip-row'
  var topReasons = Array.isArray(record.topReasons) ? record.topReasons : []
  if (topReasons.length) {
    topReasons.forEach(function(reason) {
      appendExtractionCoverageChip(
        reasonChips,
        formatCoverageCount(reason.count) + ' ' + reason.status + ' - ' + formatCoverageReason(reason.reason),
        reason.status === 'failed' ? 'risk' : 'pending'
      )
    })
  } else {
    appendExtractionCoverageChip(reasonChips, 'No failed/skipped reasons recorded', 'neutral')
  }
  reasons.appendChild(reasonChips)
  card.appendChild(reasons)

  var remaining = document.createElement('div')
  remaining.className = 'extraction-coverage-section'
  var remainingTitle = document.createElement('h5')
  remainingTitle.textContent = 'Remaining backlog'
  remaining.appendChild(remainingTitle)
  var remainingChips = document.createElement('div')
  remainingChips.className = 'extraction-coverage-chip-row'
  var indicators = Array.isArray(record.remainingBacklogIndicators) ? record.remainingBacklogIndicators : []
  if (indicators.length) {
    indicators.forEach(function(indicator) {
      appendExtractionCoverageChip(
        remainingChips,
        formatCoverageCount(indicator.count) + ' ' + formatCoverageReason(indicator.label),
        'backlog'
      )
    })
  } else {
    appendExtractionCoverageChip(remainingChips, 'No explicit backlog indicator exposed', 'neutral')
  }
  remaining.appendChild(remainingChips)
  card.appendChild(remaining)

  var retry = document.createElement('div')
  retry.className = 'extraction-coverage-section'
  var retryTitle = document.createElement('h5')
  retryTitle.textContent = 'Retry / next safe action'
  retry.appendChild(retryTitle)
  var retryChips = document.createElement('div')
  retryChips.className = 'extraction-coverage-chip-row'
  var retryReasons = Array.isArray(retrySummary.retryReasons) ? retrySummary.retryReasons : []
  if (retryReasons.length) {
    retryReasons.slice(0, 4).forEach(function(reason) {
      appendExtractionCoverageChip(
        retryChips,
        formatCoverageCount(reason.count) + ' ' + reason.retryState + ' - ' + formatCoverageReason(reason.reason),
        reason.retryState === 'blocked' || reason.retryState === 'exhausted' ? 'risk' : 'pending'
      )
    })
  }
  appendExtractionCoverageChip(retryChips, record.nextSafeCommand || 'No failed item retry action needed', record.nextSafeCommand && /^Blocked/.test(record.nextSafeCommand) ? 'risk' : 'neutral')
  retry.appendChild(retryChips)
  card.appendChild(retry)

  var findings = Array.isArray(record.healthFindings) ? record.healthFindings : []
  if (findings.length) {
    var findingLine = document.createElement('p')
    findingLine.className = 'extraction-coverage-finding-line'
    findingLine.textContent = 'Findings: ' + findings.slice(0, 2).map(function(finding) {
      return finding.detail || finding.type || 'Extraction health finding.'
    }).join(' ')
    card.appendChild(findingLine)
  }

  return card
}

function renderExtractionControlPanel(extractionControl) {
  if (!extractionControl) return null
  var targets = Array.isArray(extractionControl.coverageByTarget)
    ? extractionControl.coverageByTarget
    : []
  if (!targets.length) {
    targets = (Array.isArray(extractionControl.targets) ? extractionControl.targets : []).map(function(target) {
      return {
        targetKey: target.targetKey,
        title: target.title,
        sourceId: target.sourceId,
        lane: target.lane,
        status: target.status,
        runtimeMode: target.runtimeMode,
        effectiveRuntimeMode: target.effectiveRuntimeMode,
        scheduleStatus: target.scheduler && target.scheduler.scheduleStatus,
        scheduleTruth: target.scheduler && target.scheduler.scheduleTruth,
        nextBiteAt: target.effectiveNextRunAt || target.nextRunAt,
        lastRunAt: target.lastRunAt,
        lastStatus: target.lastStatus,
        lastError: target.lastError,
        lastSuccessAt: target.lastStatus === 'succeeded' ? target.lastRunAt : null,
        lastFailureAt: target.lastStatus === 'failed' || target.lastStatus === 'partial' ? target.lastRunAt : null,
        counts: {
          inspectedCount: target.inspectedCount,
          archivedCount: target.archivedCount,
          extractedCount: target.extractedCount,
          totalItems: target.itemSummary && target.itemSummary.totalItems,
          succeededItems: target.itemSummary && target.itemSummary.succeededItems,
          skippedItems: target.itemSummary && target.itemSummary.skippedItems,
          failedItems: target.itemSummary && target.itemSummary.failedItems,
          pendingItems: target.itemSummary && target.itemSummary.pendingItems,
        },
        topReasons: (target.itemSummary && target.itemSummary.reasons || []).filter(function(reason) {
          return reason.status === 'failed' || reason.status === 'skipped'
        }).slice(0, 5),
        remainingBacklogIndicators: [],
        retrySummary: target.itemSummary || {},
        nextSafeCommand: target.nextSafeCommand || '',
        hardeningStatus: target.hardeningStatus || '',
        healthFindings: target.healthFindings || [],
      }
    })
  }
  if (!targets.length) return null

  var summary = 'Coverage by target for current-day and bounded-backfill crawl lanes. '
    + ((extractionControl.summary && extractionControl.summary.currentDayTargets) || 0) + ' current-day, '
    + ((extractionControl.summary && extractionControl.summary.backfillTargets) || 0) + ' backfill, '
    + ((extractionControl.summary && extractionControl.summary.corpusMiningTargets) || 0) + ' corpus-mining, '
    + ((extractionControl.summary && extractionControl.summary.scheduledTargets) || 0) + ' scheduled, '
    + ((extractionControl.summary && extractionControl.summary.pausedTargets) || 0) + ' paused, '
    + ((extractionControl.summary && extractionControl.summary.recentItemFailures) || 0) + ' recent item failures, '
    + ((extractionControl.summary && extractionControl.summary.retryEligibleItems) || 0) + ' retry eligible, '
    + ((extractionControl.summary && extractionControl.summary.retryExhaustedItems) || 0) + ' exhausted, '
    + ((extractionControl.summary && extractionControl.summary.retryBlockedItems) || 0) + ' blocked, '
    + ((extractionControl.summary && extractionControl.summary.staleLeasedItems) || 0) + ' stale item leases, '
    + ((extractionControl.summary && extractionControl.summary.coverageTargetsWithRemainingBacklog) || 0) + ' targets with remaining backlog indicators, '
    + ((extractionControl.summary && extractionControl.summary.targetRiskFindings) || 0) + ' risk findings, '
    + ((extractionControl.summary && extractionControl.summary.targetWarningFindings) || 0) + ' warnings.'

  var panel = document.createElement('section')
  panel.className = 'panel extraction-coverage-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Live State'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Extraction Control: Coverage By Target'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = summary
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'extraction-coverage-grid'
  targets.forEach(function(target) {
    grid.appendChild(renderExtractionCoverageCard(target))
  })
  panel.appendChild(grid)

  return panel
}

function renderSurfaceFreshnessSweepPanel(sweep) {
  if (!sweep || !sweep.summary || !Array.isArray(sweep.surfaces)) return null
  var summary = sweep.summary.mappedSurfaceCount + ' Foundation surfaces mapped to backing APIs/docs/tables. '
    + sweep.summary.riskSurfaces + ' risk, '
    + sweep.summary.warningSurfaces + ' warning, '
    + sweep.summary.staleActiveRunCount + ' stale active source-crawl runs.'

  var items = []
  var findings = Array.isArray(sweep.findings) ? sweep.findings : []
  findings.slice(0, 6).forEach(function(finding) {
    items.push({
      label: finding.surfaceLabel + ' - ' + finding.type,
      status: finding.severity === 'risk' ? 'risk' : 'pending',
      detail: finding.detail || 'Surface freshness finding needs review.',
    })
  })

  sweep.surfaces.forEach(function(surface) {
    var owners = []
    if ((surface.backingApis || []).length) owners.push('APIs: ' + surface.backingApis.join(', '))
    if ((surface.backingDocs || []).length) owners.push('Docs: ' + surface.backingDocs.join(', '))
    if ((surface.backlogIds || []).length) owners.push('Backlog: ' + surface.backlogIds.join(', '))
    if ((surface.sourceIds || []).length) owners.push('Sources: ' + surface.sourceIds.join(', '))
    items.push({
      label: surface.label,
      status: surface.status === 'risk' ? 'risk' : surface.status === 'warning' ? 'pending' : 'live',
      detail: 'Owner: ' + surface.owner + '. ' + owners.join(' · '),
    })
  })

  return renderStatusGroupPanel(
    'Foundation Surface Sweep',
    summary,
    items
  )
}

function formatCoveragePercent(value) {
  var numeric = Number(value || 0)
  if (!Number.isFinite(numeric)) return '0%'
  return (Math.round(numeric * 10) / 10).toString().replace(/\.0$/, '') + '%'
}

function renderIntelligencePipelinePanel(coverage, synthesis) {
  if (!coverage) return null
  var sources = Array.isArray(coverage.sources) ? coverage.sources : []
  if (!sources.length) return null

  var summary = 'Archive -> candidates -> synthesis. '
    + (coverage.totalArtifacts || 0) + ' artifacts archived, '
    + (coverage.totalCandidates || 0) + ' candidates extracted'
    + (coverage.latestSynthesisRun ? ', latest synthesis ' + formatDate(coverage.latestSynthesisRun.generatedAt) + '.' : '.')

  var items = sources
    .slice()
    .sort(function(a, b) {
      return (Number(b.artifactsPendingProcessing || b.artifactsWithoutCandidates || 0)
        - Number(a.artifactsPendingProcessing || a.artifactsWithoutCandidates || 0))
    })
    .slice(0, 8)
    .map(function(source) {
      var total = Number(source.totalArtifacts || 0)
      var withCandidates = Number(source.artifactsWithCandidates || 0)
      var withoutCandidates = Number(source.artifactsWithoutCandidates || 0)
      var processed = Number(source.artifactsProcessed || 0)
      var pendingProcessing = Number(source.artifactsPendingProcessing || withoutCandidates)
      var processingPercent = Number(source.processingCoveragePercent || 0)
      var coveragePercent = Number(source.extractionCoveragePercent || 0)
      var status = processingPercent >= 75
        ? 'live'
        : processed > 0
          ? 'planned'
          : 'risk'
      var newest = source.newestArtifactAt ? ' Newest artifact ' + formatDate(source.newestArtifactAt) + '.' : ''
      return {
        label: source.sourceId,
        status: status,
        detail: total + ' archived, ' + processed + ' processed, ' + pendingProcessing
          + ' pending extraction, ' + withCandidates + ' with candidates, ' + withoutCandidates
          + ' with no active candidate yet. ' + formatCoveragePercent(processingPercent) + ' processed / '
          + formatCoveragePercent(coveragePercent) + ' yielded candidates. '
          + (source.totalCandidates || 0) + ' candidate records.' + newest,
      }
    })

  if (coverage.latestSynthesisRun || (synthesis && synthesis.latestRun)) {
    var latestRun = coverage.latestSynthesisRun || synthesis.latestRun
    var itemCount = synthesis && Array.isArray(synthesis.latestItems) ? synthesis.latestItems.length : 0
    items.unshift({
      label: 'Latest synthesis',
      status: latestRun ? 'live' : 'planned',
      detail: latestRun
        ? latestRun.runId + ' read ' + (latestRun.candidatesRead || latestRun.candidates_read || 0)
          + ' candidates and produced ' + itemCount + ' visible item' + (itemCount === 1 ? '' : 's') + '.'
        : 'No synthesis run recorded.',
    })
  }

  return renderStatusGroupPanel(
    'Intelligence Pipeline',
    summary,
    items
  )
}

function renderDriveCorpusInventoryPanel(driveCorpusInventory) {
  if (!driveCorpusInventory || !driveCorpusInventory.summary) return null
  var summaryData = driveCorpusInventory.summary
  if (!summaryData.totalItems) return null

  var summary = 'Read-only Drive corpus inventory. '
    + summaryData.totalItems + ' items recorded, '
    + summaryData.folders + ' folders, '
    + summaryData.files + ' files, '
    + summaryData.inspectedFolders + ' folders inspected, '
    + summaryData.queuedFolders + ' queued, '
    + summaryData.failedItems + ' failed.'

  var routeItems = (driveCorpusInventory.valueRoutes || []).slice(0, 8).map(function(route) {
    return {
      label: route.valueRoute,
      status: route.valueRoute === 'sensitive_skip' ? 'risk' : 'live',
      detail: route.itemCount + ' inventoried item' + (route.itemCount === 1 ? '' : 's') + ' has this candidate route from metadata only.',
    }
  })

  var pendingCount = summaryData.pendingExtraction || 0
  if (pendingCount) {
    routeItems.unshift({
      label: 'Pending future extraction',
      status: 'planned',
      detail: pendingCount + ' inventoried item' + (pendingCount === 1 ? '' : 's') + ' marked for future text/slides/PDF/video review.',
    })
  }

  return renderStatusGroupPanel(
    'Drive Corpus Candidate Inventory',
    summary,
    routeItems
  )
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
  var focusSlug = focusId ? slugify(focusId) : ''
  var claimedFocusIds = new Set()

  function rowMatchesFocus(row) {
    if (!focusId) return false
    var identifiers = [
      row.title,
      'current-state-surface-' + slugify(row.title || ''),
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
      return value === focusId || slugify(value) === focusSlug
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
    summaryRow.id = 'current-state-surface-' + slugify(row.title || '')

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
    currentCell.textContent = row.currentSummary || ''
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
    heroMeta.textContent = 'Updated ' + formatDate(doc.meta.updatedAt)
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

    var surfaceRows = [
      {
        title: 'Strategy packet',
        surfaceType: 'Package',
        sourceId: ['SRC-STRATEGY-001', 'SRC-FREEDOM-COMMUNITY-001', 'SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001', 'SRC-OWNERS-001'],
        statusKey: 'connected',
        statusLabel: 'Ready source package',
        levelLabel: 'Mixed Level 2/3 - docs monitored, inputs trusted',
        currentSummary: 'The current strategy input package is connected, verified, and understood. Strategy docs have first-pass change/watch/provenance visibility; supporting inputs are signed off for current-reality meaning. Extraction, synthesis, and action routing are later Foundation layers, not blockers to this source package closeout.',
        packageParts: [
          {
            sourceId: 'SRC-STRATEGY-001',
            statusKey: 'connected',
            statusLabel: 'Level 3',
            body: 'Canonical strategy doc and supporting docs are signed off, with first-pass change watch, decision traceability, and visible proposal/history flow.',
            role: 'Strategy docs',
            next: 'Deeper temporal truth and provenance remain later Foundation work.',
          },
          {
            sourceId: 'SRC-FREEDOM-COMMUNITY-001',
            statusKey: 'connected',
            statusLabel: 'Level 2',
            body: 'Mapped and understood for strategy use.',
            role: 'Freedom input',
            next: 'Nothing else here now.',
          },
          {
            sourceId: 'SRC-FREEDOM-BHAG-001',
            statusKey: 'connected',
            statusLabel: 'Level 2',
            body: 'Mapped and understood for strategy use.',
            role: 'Freedom input',
            next: 'Nothing else here now.',
          },
          {
            sourceId: 'SRC-FREEDOM-ENGINE-001',
            statusKey: 'connected',
            statusLabel: 'Level 2',
            body: 'Mapped and understood for strategy use.',
            role: 'Freedom input',
            next: 'Nothing else here now.',
          },
          {
            sourceId: 'SRC-OWNERS-001',
            statusKey: 'connected',
            statusLabel: 'Level 3',
            body: 'Strategy-used Owners slice is signed off through the Owners Admin package and current-reality finance/list boundaries.',
            role: 'Owners slice used in strategy',
            next: 'Nothing else blocks the current strategy-input package.',
          },
        ],
        next: 'No source sign-off closeout work remains for this package.',
        later: 'Extract and synthesize business insights through the Foundation pipeline, then deepen Freedom drift monitoring, source-backed value hardening, decision provenance, and temporal history.',
        backlogIds: ['FOUNDATION-001', 'SOURCE-014'],
      },
      {
        title: 'System strategy',
        surfaceType: 'Docs',
        statusKey: 'connected',
        statusLabel: 'Ready',
        levelLabel: 'Level 2 - doctrine signed off',
        currentSummary: 'Doctrine, boundaries, and rebuild direction are visible and signed off for this phase.',
        next: 'No closeout work right now.',
        later: 'Update only when the doctrine changes.',
        backlogIds: [],
      },
      {
        title: 'Rebuild visibility',
        surfaceType: 'System',
        statusKey: 'connected',
        statusLabel: 'Ready',
        levelLabel: 'Level 3 - visibility live',
        currentSummary: 'Foundation Overview and Rebuild Plan are live in the repo and visible in the site.',
        next: 'Keep this aligned with backlog truth.',
        later: 'Do not let side docs drift away from this page.',
        backlogIds: [],
      },
      {
        title: 'Verification baseline',
        surfaceType: 'System',
        statusKey: 'connected',
        statusLabel: 'Ready',
        levelLabel: 'Level 3 - verifier visible',
        currentSummary: 'foundation:verify exists, is visible, and is passing.',
        next: 'No baseline closeout work left.',
        later: 'Add checks only when new source surfaces close.',
        backlogIds: [],
      },
      {
        title: 'Owners Admin package',
        surfaceType: 'Package',
        sourceId: ['SRC-OWNERS-001', 'SRC-FUB-001'],
        statusKey: 'connected',
        statusLabel: 'Ready for v1',
        levelLabel: 'Level 6 - findings routed to Ops',
        currentSummary: 'Admin-tab meaning is signed off. FUB joins through Column BZ, v1 lead-source lineage, and Admin review rules are locked for v1. The review runner checks split math, governed source rules, company/agent expectation, FUB source/stage/ISA evidence, pre-2026-04-01 Freedom follow-through, and post-2026-04-01 ClickUp Deal Data Entry follow-through. Foundation deal-review jobs re-check marked Admin/Conditional rows first, then pace first-pass Admin backlog inspection at 5 newest eligible June 2025+ deals per day using Date Firm (Executed) and a 10-day maturity gate. Ops Hub owns the resulting cleanup queue.',
        packageParts: [
          {
            sourceId: 'SRC-OWNERS-001',
            statusKey: 'connected',
            statusLabel: 'Level 3',
            body: 'Admin-tab meaning is signed off and review/freshness guardrails are visible for the v1 deal-review lane.',
            role: 'Owners base source',
          },
          {
            sourceId: 'SRC-FUB-001',
            statusKey: 'connected',
            statusLabel: 'Level 6',
            body: 'FUB joins, lead-source lineage rules, and Admin review enforcement are locked for v1. Missing FUB links, invalid lead sources, and duplicate-credit edge cases now surface as routed Ops cleanup findings instead of blocking the source package.',
            role: 'Dependency source',
            next: 'Work the Ops queue as findings appear.',
          },
        ],
        next: 'No Foundation source-package closeout remains.',
        later: 'Keep source-field fixes human-owned until Ops approves assignment and approval-gated apply/writeback.',
        backlogIds: [],
      },
      {
        title: 'FUB lead-source taxonomy',
        surfaceType: 'Data source',
        sourceId: 'SRC-FUB-001',
        statusKey: 'connected',
        statusLabel: 'Ready for v1',
        levelLabel: 'Level 6 - source issues routed to Ops',
        currentSummary: 'The review tool is live, FUB source drift is clear, and v1 source-lineage/company-agent rules are locked. Lee FUBZahnd evidence plus live Supabase proof now lock LeadDate / LeadClaimedDate read semantics; exact production writer proof remains paused.',
        packageParts: [
          {
            sourceId: 'SRC-FUB-001',
            statusKey: 'connected',
            statusLabel: 'Level 6',
            body: 'FUB is readable, v1 source-lineage rules are locked, drift is visible, and invalid-source cleanup routes through Ops instead of blocking source sign-off.',
            role: 'FUB source contract',
            next: 'Keep deeper opportunity semantics and stage-table proof in Sales Hub follow-on work.',
          },
        ],
        next: 'No v1 taxonomy closeout remains. Ops Hub owns invalid-source and missing-link cleanup findings.',
        later: 'Deepen Sales Hub opportunity semantics, live stage-table proof, broader issue routing, and agent coaching support.',
        backlogIds: [],
      },
      {
        title: 'Finance sign-off',
        surfaceType: 'Data source',
        sourceId: 'SRC-FINANCE-001',
        statusKey: 'connected',
        statusLabel: 'Ready for current reality',
        levelLabel: 'Level 2 - meaning signed off',
        currentSummary: 'Weekly Actuals, Cashflow Dash, finance roll-ups, budgets, and the Unspent helper are signed off for current-reality meaning. QuickBooks is optional compliance verification, not a current rebuild dependency.',
        packageParts: [
          {
            sourceId: 'SRC-FINANCE-001',
            statusKey: 'connected',
            statusLabel: 'Level 2',
            body: 'Finance current-reality meaning is signed off across Weekly Actuals, Cashflow Dash, roll-ups, budgets, and the Unspent helper.',
            role: 'Finance source contract',
            next: 'Add freshness/payment reconciliation only when finance becomes a continuous automation reader.',
          },
        ],
        next: 'No source-signoff rediscovery work remains here.',
        later: 'Define Level 3 freshness, payment reconciliation, and automation rules only when finance automation starts reading this continuously.',
        backlogIds: ['FOUNDATION-003'],
      },
      {
        title: 'KPI source health system',
        surfaceType: 'Data source',
        sourceId: 'SRC-SUPABASE-001',
        statusKey: 'connected',
        statusLabel: 'Health probe active',
        levelLabel: 'Level 3 - read rules plus health checks',
        currentSummary: 'SRC-SUPABASE-001 is readable, first-pass KPI read rules are locked, and KPI Health now checks 14/14 tables plus 5/5 RPCs so Foundation can see source availability and drift risk.',
        packageParts: [
          {
            sourceId: 'SRC-SUPABASE-001',
            statusKey: 'connected',
            statusLabel: 'Level 3',
            body: 'KPI Supabase is readable, first-pass read rules are locked, and KPI Health verifies table/RPC availability for the current source layer.',
            role: 'KPI source contract',
            next: 'Add freshness cadence and deeper schema/code drift review before continuous Sales Hub dependency.',
          },
        ],
        next: 'No current-state source-signoff work remains.',
        later: 'Add visible freshness, deeper schema/code drift review, and future Sales Hub surfaces.',
        backlogIds: [],
      },
      {
        title: 'Meeting notes / transcript intelligence',
        surfaceType: 'Source + extraction system',
        sourceId: 'SRC-MEETINGS-001',
        statusKey: 'pending',
        statusLabel: 'Owner-usable; open hardening',
        levelLabel: 'Level 5 - archived, extracted, synthesized',
        currentSummary: 'SRC-MEETINGS-001 is readable through delegated Google Workspace. Meeting notes and standalone/embedded transcripts are archived into PostgreSQL as shared communication artifacts, tagged as broadcast/discussion/sensitive candidates, and processed by scheduled daily current-sync plus daily transcript-extraction quota missions. Latest live checkpoint showed 866 meeting notes and 649 meeting transcripts archived, with the 2026-04-26 current sync and transcript extraction runs succeeding.',
        packageParts: [
          {
            sourceId: 'SRC-MEETINGS-001',
            statusKey: 'connected',
            statusLabel: 'Level 4',
            body: 'Meeting notes and transcripts are captured from Google Drive and filed as source-backed artifacts with content hashes, metadata, transcript source, meeting class, privacy profile, and provenance.',
            role: 'Meeting source contract',
            next: 'Keep daily current sync healthy and use gap reports when transcripts are missing.',
          },
          {
            sourceId: 'SRC-MEETINGS-001',
            statusKey: 'pending',
            statusLabel: 'Level 5',
            body: 'Transcript candidate extraction runs with Foundation context and asks for subject_people, sensitivity, and min_tier metadata before synthesis/routing.',
            role: 'Meeting intelligence layer',
            next: 'Use this for Steve-owner strategy work now; do not expose raw meeting intelligence to agent/team query surfaces until SECURITY-002 lands.',
          },
        ],
        next: 'Monitor scheduled meeting current-sync and transcript-extraction runs, tune backlog quotas, and use Runtime Health for live counts/status.',
        later: 'Add rich meeting video/recording vision, Zoom/Drive video transcription, filtered summary access requests, subject-person redaction, and Action Router handoff.',
        backlogIds: ['SECURITY-002', 'MEETING-VIDEO-001', 'SYNTHESIS-ENGINE-001', 'ACTION-ROUTER-001'],
      },
      {
        title: 'Shared freshness rules',
        surfaceType: 'Rule set',
        statusKey: 'connected',
        statusLabel: 'Ready for Owners/FUB first layer',
        levelLabel: 'Level 3 - first guardrails live',
        currentSummary: 'The maturity model defines Level 3, and the first Owners/FUB freshness guardrails are live through DATA-020. Wider stale-data rollout is still later.',
        next: 'No active freshness-rule closeout remains for the current Owners/FUB layer.',
        later: 'Reuse this pattern for finance, KPI, connectors, Drive/video corpus, and future source surfaces when those readers become continuous.',
        backlogIds: ['DATA-020'],
      },
    ]

    surfacesPanel.appendChild(renderCurrentStateSurfaceTable(surfaceRows))
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

function getLiveDocLatestAsOfBySource(sourceSnapshot) {
  var latestBySource = {}

  ;(sourceSnapshot || []).forEach(function(row) {
    if (!row || !row.sourceId || !row.asOf) return
    var current = latestBySource[row.sourceId]
    if (!current || String(row.asOf) > String(current)) {
      latestBySource[row.sourceId] = row.asOf
    }
  })

  return latestBySource
}

function renderLiveDocFreshnessPanel(docPath, sourceSnapshot, sourceContracts) {
  var contractList = (sourceContracts || []).filter(function(contract) {
    return contract.updateMethod || contract.refreshSchedule || contract.manualRefresh
  })
  if (!contractList.length) return null

  var latestBySource = getLiveDocLatestAsOfBySource(sourceSnapshot)
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Live Data Status'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Live Data On This Page'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'The doc text changes when the markdown changes. The table below shows when the live numbers on this page were last pulled and how they refresh.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var rows = [
    '| Source | Last live value shown here | Updates when | Auto-refresh |',
    '| --- | --- | --- | --- |',
  ]

  function simplifyUpdateMethod(value) {
    if (!value) return '—'
    if (value === 'Live read on page load') return 'When the page loads'
    return value
  }

  function simplifyRefreshSchedule(value) {
    if (!value) return '—'
    if (value === 'On demand only. No background schedule yet.') return 'No automatic refresh yet'
    return value
  }

  function simplifySourceLabel(contract) {
    if (!contract) return '—'
    if (contract.sourceId === 'SRC-FREEDOM-COMMUNITY-001') return 'Community tracker'
    if (contract.sourceId === 'SRC-FREEDOM-BHAG-001') return 'BHAG builder'
    if (contract.sourceId === 'SRC-FREEDOM-ENGINE-001') return 'Agent Engine'
    if (contract.sourceId === 'SRC-OWNERS-001') return 'Owners Admin tab'
    return contract.unitName || contract.title || contract.sourceId
  }

  contractList.forEach(function(contract) {
    rows.push(
      '| ' +
      simplifySourceLabel(contract) +
      ' ([`' + contract.sourceId + '`](' + getCurrentStateSourceHref(contract.sourceId) + ')) | ' +
      (latestBySource[contract.sourceId] ? formatAsOfDate(latestBySource[contract.sourceId]) : 'No live date in this page') +
      ' | ' +
      simplifyUpdateMethod(contract.updateMethod) +
      ' | ' +
      simplifyRefreshSchedule(contract.refreshSchedule) +
      ' |'
    )
  })

  panel.appendChild(renderTable(rows, docPath))

  var note = document.createElement('p')
  note.className = 'section-intro'
  note.textContent = 'Current strategy rule: the page pulls live data when it loads, and you can refresh it manually. Automatic background refresh can be added later if we need it.'
  panel.appendChild(note)

  return panel
}

function renderFoundationHome() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading Foundation.</p>'

  Promise.all([fetchSourceOfTruth(), fetchFoundationHub()]).then(function(results) {
    var data = results[0]
    var hub = results[1]
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero foundation-home-hero'

    var heroLeft = document.createElement('div')

    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Live Strategy System'
    heroLeft.appendChild(eyebrow)

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Foundation'
    heroLeft.appendChild(heroTitle)

    var heroCopy = document.createElement('p')
    heroCopy.textContent = 'Use this page to see Foundation overview, source truth, live systems, and what needs Steve.'
    heroLeft.appendChild(heroCopy)
    hero.appendChild(heroLeft)

    var heroActions = document.createElement('div')
    heroActions.className = 'foundation-hero-actions'
    heroActions.appendChild(createActionLink('Overview', '/foundation#current-state', 'print-button'))
    heroActions.appendChild(createActionLink('Data Sources', '/foundation#source-overview'))
    heroActions.appendChild(createActionLink('Backlog', '/foundation#backlog'))
    hero.appendChild(heroActions)

    container.appendChild(hero)

    var snapshotPanel = renderOverviewStatusPanel(
      getFoundationHomeSnapshotItems(data, hub),
      {
        eyebrow: 'Right Now',
        title: 'Foundation Status',
        intro: 'Read this first.',
      }
    )
    if (snapshotPanel) container.appendChild(snapshotPanel)

    var sequencePanel = document.createElement('section')
    sequencePanel.className = 'panel'
    var sequenceHeader = document.createElement('div')
    sequenceHeader.className = 'panel-header'
    var sequenceLeft = document.createElement('div')
    var sequenceEyebrow = document.createElement('div')
    sequenceEyebrow.className = 'eyebrow'
    sequenceEyebrow.textContent = 'Closeout Order'
    sequenceLeft.appendChild(sequenceEyebrow)
    var sequenceTitle = document.createElement('h3')
    sequenceTitle.textContent = 'What Closes Foundation'
    sequenceLeft.appendChild(sequenceTitle)
    var sequenceIntro = document.createElement('p')
    sequenceIntro.className = 'section-intro'
    sequenceIntro.textContent = 'This is the live order. Do not skip ahead.'
    sequenceLeft.appendChild(sequenceIntro)
    sequenceHeader.appendChild(sequenceLeft)
    sequencePanel.appendChild(sequenceHeader)

    var sequenceGrid = document.createElement('div')
    sequenceGrid.className = 'foundation-sequence-grid'
    foundationNowSequence.forEach(function(step, index) {
      sequenceGrid.appendChild(renderFoundationSequenceCard(step, index))
    })
    sequencePanel.appendChild(sequenceGrid)
    container.appendChild(sequencePanel)

    var waitingPanel = renderFoundationShortcutPanel(
      'Waiting On Steve',
      'These are the review points that still need your call.',
      getFoundationHomeWaitingItems(),
      { eyebrow: 'Review' }
    )
    if (waitingPanel) container.appendChild(waitingPanel)

    var actionsPanel = renderFoundationShortcutPanel(
      'Open The Right Pages',
      'Use these four pages. Ignore the rest until you need them.',
      getFoundationHomeActionItems(),
      { eyebrow: 'Next Clicks' }
    )
    if (actionsPanel) container.appendChild(actionsPanel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Foundation home could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

/* ── section renderers ───────────────────────────────────── */

function renderOverview() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading overview.</p>'

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
    heroCopy.textContent = 'Canonical strategy packet. Supporting docs stay separate so the core stays short.'
    heroLeft.appendChild(heroCopy)

    hero.appendChild(heroLeft)

    var printBtn = document.createElement('button')
    printBtn.className = 'print-button'
    printBtn.textContent = 'Download Strategy'
    printBtn.setAttribute('type', 'button')
    printBtn.addEventListener('click', function() {
      downloadStrategyPdf()
    })
    hero.appendChild(printBtn)

    container.appendChild(hero)

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
    var strategySectionCount = data.foundation.businessStrategy.sections.length
    panelMeta.textContent = 'Full strategy packet · ' + strategySectionCount + ' sections · updated ' + formatDate(bsMeta.updatedAt)
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

    var strategyChangePanel = renderStrategyChangeWatchPanel(hub, null)
    if (strategyChangePanel) container.appendChild(strategyChangePanel)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Overview could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderStrategyDoc(sectionKey) {
  var docPath = strategyDocPaths[sectionKey]
  if (!docPath) return

  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading document.</p>'

  var loader
  if (sectionKey === 'system-strategy') {
    loader = Promise.all([fetchDoc(docPath), fetchSourceOfTruth()])
  } else if (sectionKey === 'rebuild-plan') {
    loader = Promise.all([fetchDoc(docPath), Promise.resolve(null), fetchFoundationHub()])
  } else if (isStrategyPacketDocPath(docPath)) {
    loader = Promise.all([fetchDoc(docPath), Promise.resolve(null), fetchFoundationHub()])
  } else {
    loader = Promise.all([fetchDoc(docPath)])
  }

  loader.then(function(results) {
    var data = results[0]
    var sourceData = results[1] || null
    var hub = results[2] || null
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
    heroMeta.textContent = (isLiveDocPath(docPath) ? 'Doc updated ' : 'Updated ') + formatDate(data.meta.updatedAt) + ' · ' + data.meta.lines + ' lines'
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)

    if (isLiveDocPath(docPath)) {
      var refreshBtn = document.createElement('button')
      refreshBtn.className = 'print-button'
      refreshBtn.textContent = 'Refresh Live Data'
      refreshBtn.setAttribute('type', 'button')
      refreshBtn.addEventListener('click', function() {
        delete cache.docs[docPath]
        renderStrategyDoc(sectionKey)
      })
      hero.appendChild(refreshBtn)
    }

    container.appendChild(hero)

    if (isLiveDocPath(docPath)) {
      var freshnessPanel = renderLiveDocFreshnessPanel(docPath, data.sourceSnapshot || [], data.sourceContracts || [])
      if (freshnessPanel) container.appendChild(freshnessPanel)
    }

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

    if (sectionKey === 'rebuild-plan' && hub) {
      container.appendChild(renderRebuildPlanBacklogPanel(hub))
    }

    if (hub && isStrategyPacketDocPath(docPath)) {
      var changeWatchPanel = renderStrategyChangeWatchPanel(hub, docPath)
      if (changeWatchPanel) container.appendChild(changeWatchPanel)
    }

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Document could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderRebuildPlanBacklogPanel(hub) {
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Execution Traceability'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Command Order ↔ Live Backlog'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'This is traceability, not a second priority queue. The Rebuild Plan keeps phase doctrine; this view shows the working order Steve should see.'
  left.appendChild(intro)

  header.appendChild(left)

  var action = document.createElement('a')
  action.className = 'inline-link'
  action.href = '/foundation#backlog'
  action.textContent = 'Open full backlog'
  header.appendChild(action)

  panel.appendChild(header)

  var itemsById = new Map()
  ;(hub.backlogItems || []).forEach(function(item) {
    itemsById.set(item.id, item)
  })

  rebuildPlanCommandOrderGroups.forEach(function(group) {
    var groupPanel = document.createElement('section')
    groupPanel.className = 'panel'

    var groupHeader = document.createElement('div')
    groupHeader.className = 'panel-header'

    var groupLeft = document.createElement('div')
    var groupTitle = document.createElement('h3')
    groupTitle.textContent = group.title
    groupLeft.appendChild(groupTitle)

    var groupIntro = document.createElement('p')
    groupIntro.className = 'section-intro'
    groupIntro.textContent = group.intro
    groupLeft.appendChild(groupIntro)

    groupHeader.appendChild(groupLeft)
    groupPanel.appendChild(groupHeader)

    var list = document.createElement('div')
    list.className = 'backlog-stack-list'

    var matched = group.ids
      .map(function(id) { return itemsById.get(id) || null })
      .filter(Boolean)

    if (!matched.length) {
      var empty = document.createElement('p')
      empty.className = 'section-intro'
      empty.textContent = 'No live backlog cards are mapped to this command-order step yet.'
      list.appendChild(empty)
    } else {
      matched.forEach(function(item) {
        list.appendChild(renderBacklogAccordionItem(item))
      })
    }

    groupPanel.appendChild(list)
    panel.appendChild(groupPanel)
  })

  return panel
}

function renderBacklog() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading live backlog.</p>'

  Promise.all([
    fetchFoundationHub(),
    fetchActionReview().catch(function(error) {
      return { error: error.message || 'Action Review could not load.' }
    }),
  ]).then(function(results) {
    var hub = results[0]
    var actionReview = results[1]
    var focusedIds = getSection() === 'backlog'
      ? getSectionFocus().split(',').map(function(id) { return id.trim() }).filter(Boolean)
      : []
    backlogScopeRegistry = (hub.meta && hub.meta.backlogScopes && hub.meta.backlogScopes.length)
      ? hub.meta.backlogScopes.slice()
      : fallbackBacklogScopes.slice()
    backlogViewState.ids = focusedIds
    if (focusedIds.length) {
      backlogViewState.scope = 'all'
      backlogViewState.priority = 'all'
      backlogViewState.query = ''
    }

    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = focusedIds.length ? 'Focused Backlog View' : 'Foundation Backlog'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    var scopeSummary = getActiveBacklogScopes().map(function(scope) {
      var count = (hub.backlogItems || []).filter(function(item) { return item.scope === scope.key }).length
      if (!count) return null
      return count + ' ' + getBacklogScopeShortLabel(scope.key)
    }).filter(Boolean).join(' · ')
    heroMeta.textContent = focusedIds.length
      ? focusedIds.length + ' linked cards from the page you clicked. Clear focus to see the full queue.'
      : hub.backlogItems.length + ' live cards · workflow-first queue' + (scopeSummary ? ' · ' + scopeSummary : '')
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    if (focusedIds.length) {
      var heroActions = document.createElement('div')
      heroActions.className = 'foundation-hero-actions'
      heroActions.appendChild(createActionLink('Clear Focus', '/foundation#backlog', 'print-button'))
      hero.appendChild(heroActions)
    }
    container.appendChild(hero)

    var purposePanel = renderFoundationOperationsPurposePanel('backlog', hub)
    if (purposePanel) container.appendChild(purposePanel)

    container.appendChild(renderOperatorToolsDrawer(
      'Operator tools',
      'Create and edit controls live here when you need them. The queue itself stays front and center.',
      [renderAdminTokenPanel(), renderBacklogCreatePanel(hub)],
      false
    ))

    container.appendChild(renderActionReviewPanel(actionReview))

    var researchCurationPanel = renderResearchCurationPanel(hub.researchCuration)
    if (researchCurationPanel) container.appendChild(researchCurationPanel)

    var boardPanel = document.createElement('section')
    boardPanel.className = 'panel'

    var boardHeader = document.createElement('div')
    boardHeader.className = 'panel-header'

    var boardLeft = document.createElement('div')
    var boardEyebrow = document.createElement('div')
    boardEyebrow.className = 'eyebrow'
    boardEyebrow.textContent = 'Foundation Queue'
    boardLeft.appendChild(boardEyebrow)

    var boardTitle = document.createElement('h3')
    boardTitle.textContent = 'Work queue'
    boardLeft.appendChild(boardTitle)

    var boardIntro = document.createElement('p')
    boardIntro.className = 'section-intro'
    boardIntro.textContent = focusedIds.length
      ? 'This is the exact queue for the surface you clicked. Review workflow stage first, then priority.'
      : 'Review workflow stage first, then priority.'
    boardLeft.appendChild(boardIntro)

    boardHeader.appendChild(boardLeft)
    boardPanel.appendChild(boardHeader)

    var controls = document.createElement('div')
    controls.className = 'operations-toolbar'

    var searchField = document.createElement('div')
    searchField.className = 'operations-search'
    var searchInput = buildInput('search', 'Search cards by ID, title, owner, source, or closeout note')
    searchInput.value = backlogViewState.query
    searchField.appendChild(searchInput)
    controls.appendChild(searchField)

    var teamGroup = document.createElement('div')
    teamGroup.className = 'operations-filter-group'
    var teamLabel = document.createElement('span')
    teamLabel.className = 'operations-filter-label'
    teamLabel.textContent = 'Scope'
    teamGroup.appendChild(teamLabel)

    var teamButtons = []
    ;([{ key: 'all', label: 'All' }]).concat(getActiveBacklogScopes().map(function(scope) {
      return { key: scope.key, label: scope.label }
    })).forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'operations-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        backlogViewState.scope = option.key
        applyBacklogFilters()
      })
      teamButtons.push({ key: option.key, button: button })
      teamGroup.appendChild(button)
    })
    controls.appendChild(teamGroup)

    var priorityGroup = document.createElement('div')
    priorityGroup.className = 'operations-filter-group'
    var priorityLabel = document.createElement('span')
    priorityLabel.className = 'operations-filter-label'
    priorityLabel.textContent = 'Priority'
    priorityGroup.appendChild(priorityLabel)

    var priorityButtons = []
    ;[
      { key: 'all', label: 'All' },
      { key: 'P0', label: 'P0' },
      { key: 'P1', label: 'P1' },
      { key: 'P2', label: 'P2' },
      { key: 'P3', label: 'P3' },
    ].forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'operations-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        backlogViewState.priority = option.key
        applyBacklogFilters()
      })
      priorityButtons.push({ key: option.key, button: button })
      priorityGroup.appendChild(button)
    })
    controls.appendChild(priorityGroup)

    boardPanel.appendChild(controls)

    var backlogResults = document.createElement('p')
    backlogResults.className = 'operations-results-meta'
    boardPanel.appendChild(backlogResults)

    var boardWrap = document.createElement('div')
    boardWrap.className = 'backlog-stack-list'
    boardPanel.appendChild(boardWrap)
    container.appendChild(boardPanel)

    function syncTeamButtons() {
      teamButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', backlogViewState.scope === item.key)
      })
      priorityButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', backlogViewState.priority === item.key)
      })
    }

    function applyBacklogFilters() {
      syncTeamButtons()

      var filteredItems = filterBacklogItems(hub.backlogItems || [], backlogViewState)
      var scopeLabel = backlogViewState.scope === 'all'
        ? 'root rebuild backlog'
        : getBacklogScopeShortLabel(backlogViewState.scope) + ' items'
      var priorityLabel = backlogViewState.priority === 'all' ? 'all priorities' : backlogViewState.priority
      backlogResults.textContent = focusedIds.length
        ? 'Showing ' + filteredItems.length + ' linked cards grouped by workflow stage.'
        : 'Showing ' + filteredItems.length + ' ' + scopeLabel + ' · ' + priorityLabel + ' · grouped by workflow stage.'

      boardWrap.innerHTML = ''

      backlogWorkflowStages.forEach(function(group) {
        var groupItems = filteredItems.filter(function(item) {
          return group.lanes.indexOf(item.lane) !== -1
        })
        boardWrap.appendChild(renderBacklogWorkflowStack(group, groupItems))
      })
    }

    searchInput.addEventListener('input', function() {
      backlogViewState.query = searchInput.value
      applyBacklogFilters()
    })

    applyBacklogFilters()

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Backlog could not load. No cards were changed. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderDecisions() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading decisions.</p>'

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
    var supersededCount = hub.decisions.filter(function(item) { return item.status === 'superseded' }).length
    heroMeta.textContent = lockedCount + ' locked · ' + proposedCount + ' proposed · ' + supersededCount + ' superseded'
    heroInner.appendChild(heroMeta)

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'This is the Foundation decision ledger: system, rebuild, source, execution, and promoted strategy decisions. It is not yet a complete import of every old strategy-doc decision; that reconciliation belongs to the Strategy / Decision Truth System.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var purposePanel = renderFoundationOperationsPurposePanel('decisions', hub)
    if (purposePanel) container.appendChild(purposePanel)

    container.appendChild(renderOperatorToolsDrawer(
      'Operator Tools',
      'Write access, decision logging, and update utilities live here when you need them. The decision log stays readable first.',
      [renderAdminTokenPanel(), renderDecisionCreatePanel(hub)],
      false
    ))

    container.appendChild(renderDecisionReviewPanel(hub))

    var decisionAutoEmitPanel = renderDecisionAutoEmitPanel(hub.decisionAutoEmit)
    if (decisionAutoEmitPanel) container.appendChild(decisionAutoEmitPanel)

    /* decision cards */
    var decisionPanel = document.createElement('section')
    decisionPanel.className = 'panel'

    var decisionHeader = document.createElement('div')
    decisionHeader.className = 'panel-header'

    var decisionTitle = document.createElement('h3')
    decisionTitle.textContent = 'Decision Log'
    decisionHeader.appendChild(decisionTitle)

    decisionPanel.appendChild(decisionHeader)

    var decisionIntro = document.createElement('p')
    decisionIntro.className = 'section-intro'
    decisionIntro.textContent = 'One canonical decision log across strategy, system, execution, and people. Current agreements, review items, and history all live here, but they should not compete with each other.'
    decisionPanel.appendChild(decisionIntro)

    var controls = document.createElement('div')
    controls.className = 'decision-toolbar'

    var searchField = document.createElement('div')
    searchField.className = 'decision-search'
    var searchInput = buildInput('search', 'Search by ID, title, rationale, source, or superseded decision')
    searchInput.value = decisionViewState.query
    searchField.appendChild(searchInput)
    controls.appendChild(searchField)

    var viewGroup = document.createElement('div')
    viewGroup.className = 'decision-filter-group'
    var viewLabel = document.createElement('span')
    viewLabel.className = 'decision-filter-label'
    viewLabel.textContent = 'View'
    viewGroup.appendChild(viewLabel)

    var viewOptions = [
      { key: 'current', label: 'Current' },
      { key: 'all', label: 'All' },
      { key: 'proposed', label: 'Proposed' },
      { key: 'superseded', label: 'Superseded' },
    ]
    var viewButtons = []
    viewOptions.forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'decision-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        decisionViewState.view = option.key
        applyDecisionFilters()
      })
      viewButtons.push({ key: option.key, button: button })
      viewGroup.appendChild(button)
    })
    controls.appendChild(viewGroup)

    var categoryGroup = document.createElement('div')
    categoryGroup.className = 'decision-filter-group'
    var categoryLabel = document.createElement('span')
    categoryLabel.className = 'decision-filter-label'
    categoryLabel.textContent = 'Category'
    categoryGroup.appendChild(categoryLabel)

    var categoryButtons = []
    ;[{ key: 'all', label: 'All' }].concat((hub.meta && hub.meta.canonicalDecisionCategories || []).map(function(category) {
      return { key: category, label: category.charAt(0).toUpperCase() + category.slice(1) }
    })).forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'decision-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        decisionViewState.category = option.key
        applyDecisionFilters()
      })
      categoryButtons.push({ key: option.key, button: button })
      categoryGroup.appendChild(button)
    })
    controls.appendChild(categoryGroup)

    decisionPanel.appendChild(controls)

    var decisionResults = document.createElement('p')
    decisionResults.className = 'decision-results-meta'
    decisionPanel.appendChild(decisionResults)

    var decisionList = document.createElement('div')
    decisionList.className = 'decision-stack-list'
    var pendingDocUpdates = hub.pendingDocUpdates || []
    var sortedDecisions = sortDecisionsNewestFirst(hub.decisions || [])
    var replacementMap = buildDecisionReplacementMap(sortedDecisions)

    function syncFilterButtons() {
      viewButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', decisionViewState.view === item.key)
      })
      categoryButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', decisionViewState.category === item.key)
      })
    }

    function applyDecisionFilters() {
      syncFilterButtons()

      var filteredDecisions = filterDecisionItems(sortedDecisions, decisionViewState)
      var scopeLabel = decisionViewState.view === 'current'
        ? 'current agreements and review items'
        : decisionViewState.view === 'all'
          ? 'full decision record'
          : decisionViewState.view === 'proposed'
            ? 'review items'
            : 'superseded history'
      decisionResults.textContent = 'Showing ' + filteredDecisions.length + ' ' + scopeLabel + ' · newest first · all groups and decision records start collapsed'

      decisionList.innerHTML = ''

      if (!filteredDecisions.length) {
        var empty = document.createElement('div')
        empty.className = 'decision-empty-state'
        empty.textContent = 'No decisions match these filters yet.'
        decisionList.appendChild(empty)
        return
      }

      getDecisionStageGroups(filteredDecisions, decisionViewState.view).forEach(function(group) {
        decisionList.appendChild(renderDecisionStack(group, hub, pendingDocUpdates, replacementMap))
      })
    }

    searchInput.addEventListener('input', function() {
      decisionViewState.query = searchInput.value
      applyDecisionFilters()
    })

    applyDecisionFilters()
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

      var updatesList = document.createElement('details')
      updatesList.className = 'decision-stack'

      var updatesSummary = document.createElement('summary')
      updatesSummary.className = 'decision-stack-summary decision-stack-summary-review'

      var updatesSummaryLeft = document.createElement('div')
      updatesSummaryLeft.className = 'decision-stack-summary-left'

      var updatesSummaryTitle = document.createElement('div')
      updatesSummaryTitle.className = 'decision-stack-title'
      updatesSummaryTitle.textContent = 'Doc Update Review Queue'
      updatesSummaryLeft.appendChild(updatesSummaryTitle)

      var updatesSummaryIntro = document.createElement('div')
      updatesSummaryIntro.className = 'decision-stack-intro'
      updatesSummaryIntro.textContent = 'Decision-linked doc changes waiting for explicit review and apply.'
      updatesSummaryLeft.appendChild(updatesSummaryIntro)

      updatesSummary.appendChild(updatesSummaryLeft)

      var updatesCount = document.createElement('span')
      updatesCount.className = 'decision-stack-count'
      updatesCount.textContent = pendingDocUpdates.length
      updatesSummary.appendChild(updatesCount)

      updatesList.appendChild(updatesSummary)

      var updatesBody = document.createElement('div')
      updatesBody.className = 'decision-stack-body'
      pendingDocUpdates.forEach(function(item) {
        updatesBody.appendChild(renderPendingDocUpdateCard(item))
      })
      updatesList.appendChild(updatesBody)
      updatesPanel.appendChild(updatesList)
      container.appendChild(updatesPanel)
    }

    /* parking lot */
    if (hub.parkingLot && hub.parkingLot.length) {
      var parkingPanel = document.createElement('section')
      parkingPanel.className = 'panel'

      var parkingHeader = document.createElement('div')
      parkingHeader.className = 'panel-header'

      var parkingLeft = document.createElement('div')

      var parkingEyebrow = document.createElement('div')
      parkingEyebrow.className = 'eyebrow'
      parkingEyebrow.textContent = 'Needs Verification'
      parkingLeft.appendChild(parkingEyebrow)

      var parkingTitle = document.createElement('h3')
      parkingTitle.textContent = 'Unlocked Decision Signals'
      parkingLeft.appendChild(parkingTitle)

      var parkingIntro = document.createElement('p')
      parkingIntro.className = 'section-intro'
      parkingIntro.textContent = 'Possible agreements, policy ideas, or meeting signals that are not locked enough to become live decisions yet.'
      parkingLeft.appendChild(parkingIntro)

      parkingHeader.appendChild(parkingLeft)

      parkingPanel.appendChild(parkingHeader)

      var parkingList = document.createElement('details')
      parkingList.className = 'decision-stack'

      var parkingSummary = document.createElement('summary')
      parkingSummary.className = 'decision-stack-summary decision-stack-summary-history'

      var parkingSummaryLeft = document.createElement('div')
      parkingSummaryLeft.className = 'decision-stack-summary-left'

      var parkingSummaryTitle = document.createElement('div')
      parkingSummaryTitle.className = 'decision-stack-title'
      parkingSummaryTitle.textContent = 'Needs Clarification'
      parkingSummaryLeft.appendChild(parkingSummaryTitle)

      var parkingSummaryIntro = document.createElement('div')
      parkingSummaryIntro.className = 'decision-stack-intro'
      parkingSummaryIntro.textContent = 'Signals that still need review, confirmation, or a real decision record.'
      parkingSummaryLeft.appendChild(parkingSummaryIntro)

      parkingSummary.appendChild(parkingSummaryLeft)

      var parkingCount = document.createElement('span')
      parkingCount.className = 'decision-stack-count'
      parkingCount.textContent = hub.parkingLot.length
      parkingSummary.appendChild(parkingCount)

      parkingList.appendChild(parkingSummary)

      var parkingBody = document.createElement('div')
      parkingBody.className = 'decision-stack-body'
      hub.parkingLot.forEach(function(item) {
        parkingBody.appendChild(renderCaptureItem(item))
      })
      parkingList.appendChild(parkingBody)
      parkingPanel.appendChild(parkingList)
      container.appendChild(parkingPanel)
    }

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Decisions could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderOpenQuestions() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading open questions.</p>'

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

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'Only real unresolved Foundation blockers belong here. If the work is already scoped, it belongs in Backlog. If the answer is known, close the question.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var purposePanel = renderFoundationOperationsPurposePanel('open-questions', hub)
    if (purposePanel) container.appendChild(purposePanel)

    container.appendChild(renderOperatorToolsDrawer(
      'Operator Tools',
      'Write access and question capture live here when you need them. The active question list stays in front.',
      [renderAdminTokenPanel(), renderQuestionCreatePanel()],
      false
    ))

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
    title.textContent = 'Review Queue'
    left.appendChild(title)
    header.appendChild(left)
    panel.appendChild(header)

    var list = document.createElement('div')
    list.className = 'section-list'

    getOpenQuestionGroups(hub.openQuestions).forEach(function(group) {
      list.appendChild(renderOpenQuestionStack(group))
    })
    panel.appendChild(list)
    container.appendChild(panel)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Open Questions could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderSourceLifecycle() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading source lifecycle.</p>'

  fetchSourceLifecycle().then(function(lifecycle) {
    container.innerHTML = ''
    container.appendChild(renderSourceLifecycleHero(lifecycle))
    var summary = renderSourceLifecycleSummary(lifecycle)
    if (summary) container.appendChild(summary)
    var foundationUiComplete = renderFoundationUiCompletePanel(lifecycle.foundationUiComplete)
    if (foundationUiComplete) container.appendChild(foundationUiComplete)
    var maturityGrid = renderSourceMaturityGridPanel(lifecycle.sourceMaturityGrid)
    if (maturityGrid) container.appendChild(maturityGrid)
    var connectorMatrix = renderSourceConnectorMatrixPanel(lifecycle.sourceConnectorMatrix)
    if (connectorMatrix) container.appendChild(connectorMatrix)
    var hubRoutingMatrix = renderSourceHubRoutingMatrixPanel(lifecycle.sourceHubRoutingMatrix)
    if (hubRoutingMatrix) container.appendChild(hubRoutingMatrix)
    var extractionCoverage = renderSourceExtractionCoveragePanel(lifecycle.sourceExtractionCoverage)
    if (extractionCoverage) container.appendChild(extractionCoverage)
    var sourceCoverageCloseout = renderSourceCoverageCloseoutPanel(lifecycle.sourceCoverageCloseout)
    if (sourceCoverageCloseout) container.appendChild(sourceCoverageCloseout)
    var marketingSourceMap = renderMarketingSourceMapPanel(lifecycle.marketingSourceMap)
    if (marketingSourceMap) container.appendChild(marketingSourceMap)
    var brandStack = renderBrandStackPanel(lifecycle.brandStack)
    if (brandStack) container.appendChild(brandStack)
    var tierBehavioralCompletion = renderTierBehavioralCompletionPanel(lifecycle.tierBehavioralCompletion)
    if (tierBehavioralCompletion) container.appendChild(tierBehavioralCompletion)
    var verificationRuns = renderVerificationRunsPanel(lifecycle.verificationRuns)
    if (verificationRuns) container.appendChild(verificationRuns)
    var perUserChangelog = renderPerUserChangelogPanel(lifecycle.perUserChangelog)
    if (perUserChangelog) container.appendChild(perUserChangelog)
    var restrictedDecisionQueue = renderRestrictedDecisionQueuePanel(lifecycle.restrictedDecisionQueue)
    if (restrictedDecisionQueue) container.appendChild(restrictedDecisionQueue)
    container.appendChild(renderSourceLifecycleDefinitions(lifecycle.definitions || []))
    container.appendChild(renderSourceLifecycleLanes(lifecycle))
    container.appendChild(renderSourceLifecycleTargets(lifecycle))
    var parked = renderSourceLifecycleParked(lifecycle)
    if (parked) container.appendChild(parked)
    container.appendChild(renderSourceLifecycleScope(lifecycle))
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Source lifecycle could not load. Details: ' + error.message
    container.appendChild(msg)
  }).finally(function() {
    applySectionFocus()
  })
}

function renderSourceRegistry(section) {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading data sources...</p>'
  var focusIds = getSectionFocus().split(',').map(function(id) { return id.trim() }).filter(Boolean)
  var showOwnersGovernance = section === 'source-sheets' && focusIds.indexOf('SRC-OWNERS-001') !== -1

  fetchSourceOfTruth().then(function(data) {
    return data
  }).then(function(data) {
    container.innerHTML = ''

    var config = sourceSectionConfigs[section] || sourceSectionConfigs['source-overview']
    var sourceContracts = getSourceContractsForSection(data.sources || [], config)
    var sourceConnectors = data.connectors || []
    container.appendChild(renderSourceHero(config, sourceContracts, sourceConnectors))
    var purposePanel = renderDataSourcePurposePanel(section, config, sourceContracts, sourceConnectors, data.groupedSystems || [])
    if (purposePanel) container.appendChild(purposePanel)

    if (section === 'source-overview') {
      container.appendChild(renderOverviewStatusPanel(
        getSourceOverviewSnapshotItems(sourceContracts, sourceConnectors),
        {
          eyebrow: 'Right Now',
          title: 'What Is Actually Trusted',
          intro: 'A source can be readable before it is trusted.',
        }
      ))

      var groupedPanel = renderGroupedSourceSystemsPanel(data.groupedSystems || [], sourceContracts, sourceConnectors)
      if (groupedPanel) container.appendChild(groupedPanel)

      container.appendChild(renderFoundationShortcutPanel(
        'Open the right source view',
        'Use these links instead of scanning the whole source model every time.',
        [
          {
            title: 'Strategy inputs',
            body: 'Freedom Community, BHAG, Agent Engine, Owners, finance, FUB, and KPI are visible from the Foundation overview.',
            meta: 'Foundation overview',
            href: '/foundation#current-state',
            cta: 'Open Overview',
          },
        {
          title: 'FUB review',
          body: 'Lead-source taxonomy manager and the remaining parity work for SRC-FUB-001.',
            meta: 'Next source closeout',
            href: '/foundation#source-apis:fub-lead-source-taxonomy',
            cta: 'Open FUB Review',
          },
          {
            title: 'Connectors',
            body: 'Use this only when you need the pipes and access path view. Connector does not mean trusted source.',
            meta: 'Technical reach',
            href: '/foundation#source-connectors',
            cta: 'Open Connectors',
          },
          {
            title: 'Source lifecycle',
            body: 'See which lanes are connected, verified, extracted, reviewed, retried, or parked before approving more source work.',
            meta: 'Control layer',
            href: '/foundation#source-lifecycle',
            cta: 'Open Lifecycle',
          },
          {
            title: 'Foundation overview',
            body: 'If you want the shortest possible answer to what is ready, open, and later, start there first.',
            meta: 'Tight rebuild read',
            href: '/foundation#current-state',
            cta: 'Open Overview',
          },
        ]
      ))

      container.appendChild(renderOperatorToolsDrawer(
        'How to read this',
        'Definitions for source system, validation unit, connector layer, and trust state.',
        [renderSourceLegendPanel()],
        false
      ))
    }

    if (config.showSystems) {
      container.appendChild(renderSourceSystemsPanel(sourceContracts, {
        eyebrow: 'Live Source Layer',
        title: section === 'source-overview'
          ? 'Source systems and validation units'
          : config.title,
        intro: section === 'source-overview'
          ? 'Open each source system to see the exact tabs, ledgers, or units being validated.'
          : config.intro,
        showKindFilter: !!config.showKindFilter,
        allowedKinds: config.allowedKinds || null,
        fixedKindLabel: config.title.toLowerCase(),
        resultsLabel: 'source systems',
      }))
    }

    if (showOwnersGovernance) {
      var ownersGovernancePanel = document.createElement('section')
      ownersGovernancePanel.className = 'panel'

      var ownersGovernanceHeader = document.createElement('div')
      ownersGovernanceHeader.className = 'panel-header'

      var ownersGovernanceLeft = document.createElement('div')
      var ownersGovernanceEyebrow = document.createElement('div')
      ownersGovernanceEyebrow.className = 'eyebrow'
      ownersGovernanceEyebrow.textContent = 'Governed Dropdown Watch'
      ownersGovernanceLeft.appendChild(ownersGovernanceEyebrow)

      var ownersGovernanceTitle = document.createElement('h3')
      ownersGovernanceTitle.textContent = 'Owners lead-source list drift'
      ownersGovernanceLeft.appendChild(ownersGovernanceTitle)

      var ownersGovernanceIntro = document.createElement('p')
      ownersGovernanceIntro.className = 'section-intro'
      ownersGovernanceIntro.textContent = 'This protects the live Column N dropdown so Ops cannot keep choosing stale or retired values inside a “validated” field.'
      ownersGovernanceLeft.appendChild(ownersGovernanceIntro)

      ownersGovernanceHeader.appendChild(ownersGovernanceLeft)
      ownersGovernancePanel.appendChild(ownersGovernanceHeader)

      var ownersGovernanceBody = document.createElement('div')
      ownersGovernanceBody.innerHTML = '<p>Loading Owners dropdown drift…</p>'
      ownersGovernancePanel.appendChild(ownersGovernanceBody)
      container.appendChild(ownersGovernancePanel)

      fetchOwnersLeadSourceGovernance().then(function(governance) {
        ownersGovernanceBody.innerHTML = ''
        var panel = renderOwnersLeadSourceGovernancePanel(governance)
        if (panel) ownersGovernanceBody.appendChild(panel)
      }).catch(function(error) {
        ownersGovernanceBody.innerHTML = ''
        var message = document.createElement('p')
        message.textContent = 'Failed to load Owners dropdown drift: ' + error.message
        ownersGovernanceBody.appendChild(message)
      })
    }

    if (section === 'source-apis') {
      var kpiHealthPanel = renderKpiSupabaseHealthPanel(data.kpiHealth)
      if (kpiHealthPanel) container.appendChild(kpiHealthPanel)
      container.appendChild(renderFubLeadSourceManagerPanel())
    }

    if (config.showSystems && config.showConnectors) {
      var divider = document.createElement('div')
      divider.className = 'source-layer-divider'
      divider.textContent = 'Connector layer starts below.'
      container.appendChild(divider)
    }

    if (config.showConnectors) {
      container.appendChild(renderSourceConnectorsPanel(sourceConnectors, {
        eyebrow: 'Connector Layer',
        title: 'Connections and access paths',
        intro: 'These are access paths. A connector alone does not make a source trusted.',
      }))
    }

    if (config.showOperatorNotes) {
      container.appendChild(renderSourceOperatorNotesDrawer(data))
    }

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Data Sources could not load. Details: ' + error.message
    container.appendChild(msg)
  }).finally(function() {
    applySectionFocus()
  })
}

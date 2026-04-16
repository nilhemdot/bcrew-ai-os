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
  { key: 'done', label: 'Done' },
]

var backlogWorkflowStages = [
  { key: 'todo', label: 'To Do', lanes: ['research'], intro: 'Ideas and work that still need more proof, research, or shaping before they are ready.' },
  { key: 'todo-scoped', label: 'To Do Scoped', lanes: ['scoped', 'ranked'], intro: 'Work that is shaped enough to build, but is not in motion yet.' },
  { key: 'doing', label: 'Doing', lanes: ['executing'], intro: 'Live work actively being built or closed out right now.' },
  { key: 'waiting', label: 'Waiting / Parked', lanes: ['parked'], intro: 'Work intentionally held, blocked, or waiting on something outside the active build flow.' },
  { key: 'done', label: 'Done', lanes: ['done'], intro: 'Closed work that is already part of the live system.' },
]

var homeWorkboardStages = [
  { key: 'todo', label: 'To Do', lanes: ['research', 'scoped', 'ranked'], tone: 'todo', intro: 'Queued work that still needs shaping, ranking, or proof.' },
  { key: 'doing', label: 'Doing', lanes: ['executing'], tone: 'doing', intro: 'Live foundation work the system is actively moving right now.' },
  { key: 'done', label: 'Done', lanes: ['done'], tone: 'done', intro: 'Closed work that is now part of the live operating layer.' },
  { key: 'parked', label: 'Parked', lanes: ['parked'], tone: 'parked', intro: 'Work intentionally held back so it does not muddy the foundation pass.' },
]

var foundationCloseoutOrder = [
  'FOUNDATION-001',
  'FOUNDATION-002',
  'FOUNDATION-003',
  'FOUNDATION-VERIFY-001',
  'SECURITY-001',
  'MEMORY-002',
  'SLICE-001',
  'SCHEMA-001',
]

var foundationNowSequence = [
  {
    title: 'Make source trust visible',
    body: 'Turn the Data Sources section into a clear live source layer that separates source contracts, connector status, and sign-off state.',
  },
  {
    title: 'Close Owners Dashboard sign-off',
    body: 'Finish SRC-OWNERS-001 so the system stops reasoning on provisional Admin-tab truth and the signed-off boundary is explicit.',
  },
  {
    title: 'Close finance sign-off',
    body: 'Finish SRC-FINANCE-001 so partner-commission normalization and finance roll-up boundaries stop living in partial interpretation.',
  },
  {
    title: 'Add minimal verification',
    body: 'Put in the smallest smoke-check layer that proves Foundation reads, writes, and critical source checks still work after changes.',
  },
  {
    title: 'Prove the memory baseline',
    body: 'Enable the OpenClaw native memory baseline and prove one narrow trusted loop before scaling capabilities or agents.',
  },
]

var decisionViewState = {
  query: '',
  category: 'all',
  view: 'current',
}

var backlogViewState = {
  query: '',
  team: 'all',
  priority: 'all',
}

var sourceViewState = {
  query: '',
  kind: 'all',
  presence: 'all',
}

var fubLeadSourceViewState = {
  context: 'owner',
  query: '',
  marketing: 'all',
  ownership: 'all',
}

var FUB_SOURCE_GROUP_OPTIONS = [
  '',
  'Web Leads',
  'Ads Leads',
  'Offline Leads',
  'Phone Leads',
  'Social Media',
  'Referral / Sphere',
  'Other',
]

var sourceSectionConfigs = {
  'source-overview': {
    title: 'Data Sources',
    eyebrow: 'Source Layer',
    intro: 'This is the overview. It shows the full source map: source systems, validation units, and the connector layer underneath them.',
    showSystems: true,
    showConnectors: true,
    showKindFilter: true,
    showOperatorNotes: true,
  },
  'source-docs': {
    title: 'Docs',
    eyebrow: 'Data Sources',
    intro: 'Repo docs and markdown-backed truth only. Use this lane when you are checking durable written sources instead of workbook or API sources.',
    showSystems: true,
    showConnectors: false,
    showKindFilter: false,
    allowedKinds: ['docs'],
  },
  'source-sheets': {
    title: 'Spreadsheets',
    eyebrow: 'Data Sources',
    intro: 'Workbook-level sources and their validation units. This is the lane for sheet-by-sheet trust work.',
    showSystems: true,
    showConnectors: false,
    showKindFilter: false,
    allowedKinds: ['sheets'],
  },
  'source-apis': {
    title: 'APIs / Apps',
    eyebrow: 'Data Sources',
    intro: 'External systems, APIs, and app-backed business sources. Use this lane when the truth lives outside the repo and outside spreadsheets.',
    showSystems: true,
    showConnectors: false,
    showKindFilter: false,
    allowedKinds: ['api', 'apps'],
  },
  'source-connectors': {
    title: 'Connectors',
    eyebrow: 'Connector Layer',
    intro: 'Just the pipes. This lane is about access paths and technical reach, not whether the source itself is trusted.',
    showSystems: false,
    showConnectors: true,
    showKindFilter: false,
  },
}

var capabilityCatalog = {
  'capabilities-skills': {
    title: 'Skills',
    eyebrow: 'System Inventory',
    intro: 'Skills are reusable operating instructions layered on top of tools and plugins. They are not data sources.',
    items: [
      {
        id: 'SKILL-BFOUND-001',
        title: 'BCrew Foundation Skill',
        type: 'Repo skill',
        state: 'Working now',
        tone: 'connected',
        availableTo: 'Coding assistants working inside this repo',
        purpose: 'Keeps strategy, source-trust, and Foundation-accountability work routed to the right home instead of drifting into loose docs or fake live values.',
      },
    ],
    backlogIds: ['SYSTEM-004'],
    statusCards: [
      {
        label: 'Live now',
        status: 'connected',
        detail: 'The rebuild already uses a repo-specific Foundation skill for strategy and source-trust work.',
      },
      {
        label: 'Still open',
        status: 'pending',
        detail: 'There is no full live skill registry in Foundation yet. That surface still needs to be built from runtime truth.',
      },
    ],
  },
  'capabilities-plugins': {
    title: 'Plugins / MCPs',
    eyebrow: 'System Inventory',
    intro: 'These are runtime integration surfaces available to the coding stack. They are separate from business sources: a plugin can exist even when no business source is signed off yet.',
    items: [
      {
        id: 'PLUGIN-GDRIVE-001',
        title: 'Google Drive',
        type: 'Plugin / MCP surface',
        state: 'Working now',
        tone: 'connected',
        availableTo: 'Codex runtime in this rebuild',
        purpose: 'Drive, Docs, Sheets, and Slides access already used during source-validation and doc work.',
      },
      {
        id: 'PLUGIN-GMAIL-001',
        title: 'Gmail',
        type: 'Plugin / MCP surface',
        state: 'Installed / workflow validation pending',
        tone: 'pending',
        availableTo: 'Codex runtime in this rebuild',
        purpose: 'Email reads, triage, drafts, and mailbox workflows once BCrew boundaries and trust rules are signed off.',
      },
      {
        id: 'PLUGIN-GCAL-001',
        title: 'Google Calendar',
        type: 'Plugin / MCP surface',
        state: 'Installed / workflow validation pending',
        tone: 'pending',
        availableTo: 'Codex runtime in this rebuild',
        purpose: 'Scheduling, event reads, and meeting-context workflows after trust boundaries are defined.',
      },
      {
        id: 'PLUGIN-CANVA-001',
        title: 'Canva',
        type: 'Plugin / MCP surface',
        state: 'Installed / workflow validation pending',
        tone: 'pending',
        availableTo: 'Codex runtime in this rebuild',
        purpose: 'Design generation and editing once that workflow becomes part of the trusted operating stack.',
      },
    ],
    backlogIds: ['SYSTEM-004'],
    statusCards: [
      {
        label: 'Live now',
        status: 'connected',
        detail: 'The rebuild has real plugin-backed surfaces available in the coding/runtime layer today.',
      },
      {
        label: 'Still open',
        status: 'pending',
        detail: 'Foundation still needs the proper live capabilities surface so plugin and MCP state stops living in scattered tool context.',
      },
    ],
  },
  'capabilities-agents': {
    title: 'Agents',
    eyebrow: 'System Inventory',
    intro: 'Agents are not data sources. This lane is for the agent model, registry, and operations layer.',
    items: [
      {
        id: 'AGENT-STATE-001',
        title: 'Business Agents',
        type: 'Current state',
        state: 'Not live yet',
        tone: 'missing',
        availableTo: 'Nobody yet',
        purpose: 'No approved business-agent registry exists yet in this rebuild. That is deliberate until the franchise model and boundaries are locked.',
      },
      {
        id: 'TOOL-CODEX-001',
        title: 'Codex / Claude Code',
        type: 'Implementation tools',
        state: 'Working now',
        tone: 'connected',
        availableTo: 'Coding and system-maintenance work',
        purpose: 'These are implementation tools inside the system, not business agents inside the operating model.',
      },
    ],
    backlogIds: ['AGENT-005', 'AGENT-006', 'AGENT-007', 'AGENT-008', 'INFRA-003', 'SYSTEM-011'],
    statusCards: [
      {
        label: 'Live now',
        status: 'connected',
        detail: 'The boundary is now explicit: coding assistants are tools, not business agents.',
      },
      {
        label: 'Still open',
        status: 'pending',
        detail: 'The franchise model, Agent Registry, Agent Operations, and isolated deployment model still need to be built before business agents go live.',
      },
    ],
  },
}

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

function filterBacklogItems(items, viewState) {
  var query = String((viewState && viewState.query) || '').trim().toLowerCase()
  var team = (viewState && viewState.team) || 'all'
  var priority = (viewState && viewState.priority) || 'all'

  return sortBacklogItems(items).filter(function(item) {
    if (team !== 'all' && item.team !== team) return false
    if (priority !== 'all' && item.priority !== priority) return false
    if (!query) return true

    var haystack = [
      item.id,
      item.title,
      item.team,
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
    getBacklogTeamLabel(item.team),
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
    : 'Nothing in this stage right now.'
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
    empty.textContent = 'Nothing here yet.'
    body.appendChild(empty)
  } else {
    sortBacklogItems(items).forEach(function(item) {
      body.appendChild(renderBacklogAccordionItem(item))
    })
  }

  details.appendChild(body)
  return details
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

  var metaRow = document.createElement('div')
  metaRow.className = 'decision-memory-meta'

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

function getBacklogLaneLabel(laneKey) {
  var match = backlogLanes.find(function(lane) { return lane.key === laneKey })
  return match ? match.label : laneKey
}

function getBacklogTeamLabel(teamKey) {
  if (teamKey === 'dev') return 'Dev'
  if (teamKey === 'marketing') return 'Marketing'
  return teamKey || 'Unassigned'
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

function parseDecisionIdList(value) {
  var seen = {}
  return (value || '')
    .split(',')
    .map(function(part) { return part.trim().toUpperCase() })
    .filter(function(part) { return part })
    .filter(function(part) {
      if (seen[part]) return false
      seen[part] = true
      return true
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

/* ── data cache ──────────────────────────────────────────── */

var cache = {
  sourceOfTruth: null,
  foundationHub: null,
  systemInventory: null,
  fubLeadSources: {},
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

function fetchSystemInventory() {
  if (cache.systemInventory) return Promise.resolve(cache.systemInventory)

  return fetch('/api/system-inventory').then(function(res) {
    if (!res.ok) throw new Error('System inventory API failed.')
    return res.json()
  }).then(function(data) {
    cache.systemInventory = data
    return data
  })
}

function fetchFubLeadSources(contextKey) {
  var key = contextKey || 'owner'
  if (cache.fubLeadSources[key]) return Promise.resolve(cache.fubLeadSources[key])

  return fetch('/api/fub/lead-sources?context=' + encodeURIComponent(key)).then(function(res) {
    if (!res.ok) throw new Error('FUB lead-source API failed.')
    return res.json()
  }).then(function(data) {
    cache.fubLeadSources[key] = data
    return data
  })
}

function refreshFubLeadSources(contextKey) {
  var key = contextKey || 'owner'
  return foundationMutation('/api/fub/lead-sources/refresh', 'POST', {
    context: key,
  }).then(function(data) {
    cache.fubLeadSources[key] = data
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
  cache.sourceOfTruth = null
  cache.foundationHub = null
  cache.systemInventory = null
  cache.fubLeadSources = {}
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
  'system-strategy': 'docs/system-strategy.md',
}

var foundationDocPathToSection = {
  'docs/strategy/bhag-model.md': 'bhag-model',
  'docs/strategy/agent-engine.md': 'agent-engine',
  'docs/strategy/financial-model-and-assumptions.md': 'agent-engine',
  'docs/strategy/governance.md': 'governance',
  'docs/strategy/department-mandates.md': 'departments',
  'docs/strategy/core-values.md': 'core-values',
  'docs/strategy/marketmasters.md': 'marketmasters',
  'docs/source-registry.md': 'source-overview',
}

var strategicExecutionDocPathToSection = {
  'docs/strategy/quarterly-priorities.md': 'quarterly-priorities',
  'docs/strategy/strategic-issues.md': 'strategic-issues',
}

/* ── nav label map for breadcrumb ────────────────────────── */

var sectionLabels = {
  'home': 'Home',
  'overview': 'Strategy Packet',
  'bhag-model': 'BHAG Model',
  'agent-engine': 'Agent Engine',
  'governance': 'Governance',
  'departments': 'Department Mandates',
  'core-values': 'Core Values',
  'marketmasters': 'MarketMasters',
  'backlog': 'Backlog',
  'decisions': 'Decisions',
  'open-questions': 'Open Questions',
  'system-strategy': 'System Strategy',
  'system-activity': 'System Activity',
  'system-health': 'System Health',
  'data-health': 'System Health',
  'source-registry': 'Data Sources',
  'source-overview': 'Data Sources',
  'source-docs': 'Docs',
  'source-sheets': 'Spreadsheets',
  'source-apis': 'APIs / Apps',
  'source-connectors': 'Connectors',
  'inventory-docs': 'All Docs',
  'capabilities-skills': 'Skills',
  'capabilities-plugins': 'Plugins / MCPs',
  'capabilities-agents': 'Agents',
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

function getSystemHealthGroups(items) {
  return [
    {
      title: 'Live Components',
      intro: 'Components that are already wired and behaving as real parts of the Foundation trust layer.',
      items: (items || []).filter(function(item) { return item.status === 'live' }),
    },
    {
      title: 'Needs Work',
      intro: 'Components that matter now but are still incomplete, provisional, or not yet trusted.',
      items: (items || []).filter(function(item) { return item.status === 'pending' || item.status === 'risk' }),
    },
    {
      title: 'Later Layers',
      intro: 'Planned layers that should not be confused with current Foundation closeout work.',
      items: (items || []).filter(function(item) { return item.status === 'planned' }),
    },
  ].filter(function(group) {
    return group.items.length
  })
}

function createActionButton(label, handler, className) {
  var button = document.createElement('button')
  button.className = className || 'secondary-button'
  button.type = 'button'
  button.textContent = label
  button.addEventListener('click', handler)
  return button
}

function renderFoundationPurposeCard(config) {
  var article = document.createElement('article')
  article.className = 'foundation-purpose-card'

  var icon = document.createElement('div')
  icon.className = 'foundation-purpose-icon'
  icon.innerHTML = config.icon
  article.appendChild(icon)

  var title = document.createElement('h3')
  title.textContent = config.title
  article.appendChild(title)

  var body = document.createElement('p')
  body.textContent = config.body
  article.appendChild(body)

  return article
}

function renderFoundationModuleCard(section) {
  var article = document.createElement('article')
  article.className = 'foundation-module-card'

  var title = document.createElement('h4')
  title.textContent = section.title
  article.appendChild(title)

  var excerpt = document.createElement('p')
  excerpt.textContent = section.content.split('\n')[0]
  article.appendChild(excerpt)

  var actions = document.createElement('div')
  actions.className = 'foundation-module-actions'

  var openPacket = document.createElement('a')
  openPacket.className = 'secondary-button'
  openPacket.href = '/foundation#overview'
  openPacket.textContent = 'Open Packet'
  actions.appendChild(openPacket)

  var supportDoc = sectionSupportDocs[section.title]
  if (supportDoc) {
    var supportLink = document.createElement('a')
    supportLink.className = 'secondary-button'
    supportLink.href = buildDocHref(supportDoc.path, 'docs/business-strategy.md')
    supportLink.textContent = 'Supporting Doc'
    actions.appendChild(supportLink)
  }

  article.appendChild(actions)
  return article
}

function renderHomeWorkboardStage(stage, items) {
  var details = document.createElement('details')
  details.className = 'foundation-stage'

  var summary = document.createElement('summary')
  summary.className = 'foundation-stage-summary foundation-stage-summary-' + stage.tone

  var left = document.createElement('div')
  left.className = 'foundation-stage-summary-left'

  var title = document.createElement('div')
  title.className = 'foundation-stage-title'
  title.textContent = stage.label
  left.appendChild(title)

  var intro = document.createElement('div')
  intro.className = 'foundation-stage-intro'
  intro.textContent = stage.intro
  left.appendChild(intro)
  summary.appendChild(left)

  var count = document.createElement('span')
  count.className = 'foundation-stage-count'
  count.textContent = items.length
  summary.appendChild(count)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'foundation-stage-body'
  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'lane-empty'
    empty.textContent = 'Nothing in this stage right now.'
    body.appendChild(empty)
  } else {
    sortBacklogItems(items).slice(0, 10).forEach(function(item) {
      body.appendChild(renderBacklogAccordionItem(item))
    })

    if (items.length > 10) {
      var more = document.createElement('p')
      more.className = 'foundation-stage-more'
      more.textContent = 'Showing the first 10 items here. Open Backlog for the full stack.'
      body.appendChild(more)
    }
  }

  details.appendChild(body)
  return details
}

function getFoundationCloseoutItems(items) {
  var byId = {}
  ;(items || []).forEach(function(item) {
    byId[item.id] = item
  })

  var ordered = foundationCloseoutOrder
    .map(function(id) { return byId[id] })
    .filter(Boolean)

  var remainder = (items || []).filter(function(item) {
    return foundationCloseoutOrder.indexOf(item.id) === -1 &&
      /^FOUNDATION-|^SECURITY-|^MEMORY-|^SCHEMA-|^SLICE-/.test(item.id)
  })

  return ordered.concat(sortBacklogItems(remainder))
}

function renderStatusGroupPanel(titleText, introText, items) {
  if (!items || !items.length) return null

  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Live State'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = titleText
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = introText
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'status-grid'
  items.forEach(function(item) {
    grid.appendChild(renderStatusCard(item))
  })
  panel.appendChild(grid)

  return panel
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

  return article
}

function renderFoundationHome() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading Foundation...</p>'

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
    heroCopy.textContent = 'Foundation is the live operating layer behind Benson Crew strategy. It keeps the strategy modular, lets the system govern against it, and turns the strategy into something agents can actively work with instead of something leadership has to carry manually.'
    heroLeft.appendChild(heroCopy)
    hero.appendChild(heroLeft)

    var heroActions = document.createElement('div')
    heroActions.className = 'foundation-hero-actions'
    heroActions.appendChild(createActionButton('Download Strategy', function() {
      var link = document.createElement('a')
      link.href = '/foundation/export/strategy.pdf'
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }, 'print-button'))
    heroActions.appendChild(createActionButton('Open Strategy Packet', function() {
      window.location.hash = '#overview'
    }))
    hero.appendChild(heroActions)

    container.appendChild(hero)

    var purposePanel = document.createElement('section')
    purposePanel.className = 'panel'

    var purposeHeader = document.createElement('div')
    purposeHeader.className = 'panel-header'
    var purposeLeft = document.createElement('div')
    var purposeEyebrow = document.createElement('div')
    purposeEyebrow.className = 'eyebrow'
    purposeEyebrow.textContent = 'Why It Exists'
    purposeLeft.appendChild(purposeEyebrow)
    var purposeTitle = document.createElement('h3')
    purposeTitle.textContent = 'What Foundation Is Doing'
    purposeLeft.appendChild(purposeTitle)
    purposeHeader.appendChild(purposeLeft)
    purposePanel.appendChild(purposeHeader)

    var purposeGrid = document.createElement('div')
    purposeGrid.className = 'foundation-purpose-grid'
    ;[
      {
        title: 'Live Strategy',
        body: 'The strategy is meant to stay current, source-backed, and visible in the system instead of drifting into stale documents.',
        icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M12 4v16"/><circle cx="12" cy="12" r="9"/></svg>',
      },
      {
        title: 'Governed System',
        body: 'This is where the operating rules live so the system can prepare the room, surface drift, and keep accountability visible after the meeting.',
        icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z"/><path d="M9.5 12l1.8 1.8L15 10"/></svg>',
      },
      {
        title: 'Proactive Operator',
        body: 'The goal is not passive storage. Foundation should become the operating partner that keeps cadence, memory, follow-through, and escalation tight.',
        icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M5 9l7-7 7 7"/><path d="M5 15l7 7 7-7"/></svg>',
      },
      {
        title: 'Agent-Ready Modules',
        body: 'The strategy was broken into modules so agents can work on the right layer without muddying the whole system every time something changes.',
        icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
      },
    ].forEach(function(card) {
      purposeGrid.appendChild(renderFoundationPurposeCard(card))
    })
    purposePanel.appendChild(purposeGrid)
    container.appendChild(purposePanel)

    var liveNow = (data.systemStatus || []).filter(function(item) {
      return ['strategy-doc', 'supporting-strategy', 'foundation-memory'].indexOf(item.key) !== -1
    })
    var stillProving = (data.systemStatus || []).filter(function(item) {
      return ['source-trust', 'verification', 'assistant-loop'].indexOf(item.key) !== -1
    })

    var livePanel = renderStatusGroupPanel(
      'Live Now',
      'The pieces that are already wired and active inside Foundation.',
      liveNow
    )
    if (livePanel) container.appendChild(livePanel)

    var provingPanel = renderStatusGroupPanel(
      'Still Proving',
      'The gaps that still block Foundation from being fully trusted and closed out.',
      stillProving
    )
    if (provingPanel) container.appendChild(provingPanel)

    var modulesPanel = document.createElement('section')
    modulesPanel.className = 'panel'

    var modulesHeader = document.createElement('div')
    modulesHeader.className = 'panel-header'
    var modulesLeft = document.createElement('div')
    var modulesEyebrow = document.createElement('div')
    modulesEyebrow.className = 'eyebrow'
    modulesEyebrow.textContent = 'Strategic Modules'
    modulesLeft.appendChild(modulesEyebrow)
    var modulesTitle = document.createElement('h3')
    modulesTitle.textContent = 'What The System Governs Against'
    modulesLeft.appendChild(modulesTitle)
    modulesHeader.appendChild(modulesLeft)
    modulesPanel.appendChild(modulesHeader)

    var modulesGrid = document.createElement('div')
    modulesGrid.className = 'foundation-module-grid'
    data.foundation.businessStrategy.sections.forEach(function(section) {
      modulesGrid.appendChild(renderFoundationModuleCard(section))
    })
    modulesPanel.appendChild(modulesGrid)
    container.appendChild(modulesPanel)

    var sequencePanel = document.createElement('section')
    sequencePanel.className = 'panel'
    var sequenceHeader = document.createElement('div')
    sequenceHeader.className = 'panel-header'
    var sequenceLeft = document.createElement('div')
    var sequenceEyebrow = document.createElement('div')
    sequenceEyebrow.className = 'eyebrow'
    sequenceEyebrow.textContent = 'Current Sequence'
    sequenceLeft.appendChild(sequenceEyebrow)
    var sequenceTitle = document.createElement('h3')
    sequenceTitle.textContent = 'What We Work On Next'
    sequenceLeft.appendChild(sequenceTitle)
    var sequenceIntro = document.createElement('p')
    sequenceIntro.className = 'section-intro'
    sequenceIntro.textContent = 'This is the ordered closeout path, not a generic idea pile.'
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

    var workboardPanel = document.createElement('section')
    workboardPanel.className = 'panel'
    var workboardHeader = document.createElement('div')
    workboardHeader.className = 'panel-header'
    var workboardLeft = document.createElement('div')
    var workboardEyebrow = document.createElement('div')
    workboardEyebrow.className = 'eyebrow'
    workboardEyebrow.textContent = 'Foundation Closeout'
    workboardLeft.appendChild(workboardEyebrow)
    var workboardTitle = document.createElement('h3')
    workboardTitle.textContent = 'What Still Blocks Closure'
    workboardLeft.appendChild(workboardTitle)
    var workboardIntro = document.createElement('p')
    workboardIntro.className = 'section-intro'
    workboardIntro.textContent = 'This is the filtered Foundation closeout board, not the whole backlog.'
    workboardLeft.appendChild(workboardIntro)
    workboardHeader.appendChild(workboardLeft)
    workboardPanel.appendChild(workboardHeader)

    var workboardList = document.createElement('div')
    workboardList.className = 'foundation-stage-list'
    var closeoutItems = getFoundationCloseoutItems(hub.backlogItems || [])
    homeWorkboardStages.forEach(function(stage) {
      var stageItems = closeoutItems.filter(function(item) {
        return stage.lanes.indexOf(item.lane) !== -1
      })
      workboardList.appendChild(renderHomeWorkboardStage(stage, stageItems))
    })
    workboardPanel.appendChild(workboardList)
    container.appendChild(workboardPanel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load Foundation home: ' + error.message
    container.appendChild(msg)
  })
}

/* ── section renderers ───────────────────────────────────── */

function renderOverview() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading overview...</p>'

  fetchSourceOfTruth().then(function(data) {
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
    heroCopy.textContent = 'Canonical strategy document for Benson Crew. The six core sections live here. Supporting docs sit beside the packet in the nav so the strategy stays tight while the detail stays close.'
    heroLeft.appendChild(heroCopy)

    hero.appendChild(heroLeft)

    var printBtn = document.createElement('button')
    printBtn.className = 'print-button'
    printBtn.textContent = 'Download Strategy'
    printBtn.setAttribute('type', 'button')
    printBtn.addEventListener('click', function() {
      var link = document.createElement('a')
      link.href = '/foundation/export/strategy.pdf'
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
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

  var loader = sectionKey === 'system-strategy'
    ? Promise.all([fetchDoc(docPath), fetchSourceOfTruth()])
    : Promise.all([fetchDoc(docPath)])

  loader.then(function(results) {
    var data = results[0]
    var sourceData = results[1] || null
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
    var coreSystemCount = (hub.backlogItems || []).filter(function(item) { return item.team === 'dev' }).length
    var marketingCount = (hub.backlogItems || []).filter(function(item) { return item.team === 'marketing' }).length
    heroMeta.textContent = hub.backlogItems.length + ' active items · workflow-first queue · ' + coreSystemCount + ' foundation/system · ' + marketingCount + ' marketing placeholder'
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    container.appendChild(renderOperatorToolsDrawer(
      'Operator Tools',
      'Write access and backlog editing live here when you need them. The queue itself stays front and center.',
      [renderAdminTokenPanel(), renderBacklogCreatePanel(hub)],
      false
    ))

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
    boardTitle.textContent = 'How We Manage Work'
    boardLeft.appendChild(boardTitle)

    var boardIntro = document.createElement('p')
    boardIntro.className = 'section-intro'
    boardIntro.textContent = 'This is the temporary root rebuild queue. Workflow stages are the main view. Priority is a secondary filter. Foundation/system work belongs here; future hub work should move out as those surfaces come online.'
    boardLeft.appendChild(boardIntro)

    boardHeader.appendChild(boardLeft)
    boardPanel.appendChild(boardHeader)

    var controls = document.createElement('div')
    controls.className = 'operations-toolbar'

    var searchField = document.createElement('div')
    searchField.className = 'operations-search'
    var searchInput = buildInput('search', 'Search by ID, title, owner, source, or closeout note')
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
    ;[
      { key: 'all', label: 'All' },
      { key: 'dev', label: 'Foundation / System' },
      { key: 'marketing', label: 'Marketing' },
    ].forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'operations-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        backlogViewState.team = option.key
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
        item.button.classList.toggle('is-active', backlogViewState.team === item.key)
      })
      priorityButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', backlogViewState.priority === item.key)
      })
    }

    function applyBacklogFilters() {
      syncTeamButtons()

      var filteredItems = filterBacklogItems(hub.backlogItems || [], backlogViewState)
      var scopeLabel = backlogViewState.team === 'all'
        ? 'root rebuild backlog'
        : backlogViewState.team === 'dev'
          ? 'foundation/system items'
          : 'marketing items'
      var priorityLabel = backlogViewState.priority === 'all' ? 'all priorities' : backlogViewState.priority
      backlogResults.textContent = 'Showing ' + filteredItems.length + ' ' + scopeLabel + ' · ' + priorityLabel + ' · grouped as To Do, To Do Scoped, Doing, Waiting, and Done'

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
    var supersededCount = hub.decisions.filter(function(item) { return item.status === 'superseded' }).length
    heroMeta.textContent = lockedCount + ' locked · ' + proposedCount + ' proposed · ' + supersededCount + ' superseded'
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    container.appendChild(renderOperatorToolsDrawer(
      'Operator Tools',
      'Write access, decision logging, and update utilities live here when you need them. The decision log stays readable first.',
      [renderAdminTokenPanel(), renderDecisionCreatePanel(hub)],
      false
    ))

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
        empty.textContent = 'No decisions match this filter yet.'
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

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'Only real unresolved questions belong here. Once a question is answered, merged into a better question, or no longer matters, it should move out of the live queue.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

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
    msg.textContent = 'Failed to load open questions: ' + error.message
    container.appendChild(msg)
  })
}

function getSourceKind(contract) {
  var method = (contract.accessMethod || '').toLowerCase()

  if (method.indexOf('filesystem') !== -1 || method.indexOf('git') !== -1) return { key: 'docs', label: 'Docs' }
  if (method.indexOf('sheets') !== -1 || method.indexOf('spreadsheet') !== -1) return { key: 'sheets', label: 'Sheets' }
  if (method.indexOf('connector') !== -1) return { key: 'apps', label: 'Workspace App' }
  if (method.indexOf('api') !== -1) return { key: 'api', label: 'API' }
  if (method.indexOf('supabase') !== -1 || method.indexOf('database') !== -1) return { key: 'apps', label: 'App / DB' }
  return { key: 'other', label: 'Other' }
}

function getSourcePresence(contract) {
  if (contract.group === 'verified') {
    if ((contract.validation || contract.status) === 'Signed Off') {
      return { key: 'signed-off', label: 'Signed off', tone: 'connected' }
    }
    return { key: 'connected', label: 'Connected but provisional', tone: 'planned' }
  }
  if (contract.group === 'pending') {
    return { key: 'needs-verification', label: 'Needs verification', tone: 'pending' }
  }
  return { key: 'not-connected', label: 'Not connected', tone: 'missing' }
}

function getSourceTrust(contract) {
  var validation = contract.validation || contract.status || 'Unknown'

  if (validation === 'Signed Off') return { label: validation, tone: 'connected' }
  if (validation === 'In Review') return { label: validation, tone: 'pending' }
  if (validation === 'Partially Signed Off' || validation === 'Readable Only') {
    return { label: validation, tone: 'planned' }
  }
  return { label: validation, tone: 'missing' }
}

function getSourceSearchText(contract) {
  return [
    contract.sourceId,
    contract.title,
    contract.unitName,
    contract.owner,
    contract.location,
    contract.scope,
    contract.owns,
    contract.accessMethod,
    contract.status,
    contract.validation,
    contract.validationScope,
    contract.boundaryNote,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getSourceSystemName(contract) {
  return contract && contract.title ? contract.title : 'Unknown source'
}

function getSourceUnitName(contract) {
  return (contract && (contract.unitName || contract.tabName || contract.location)) || ''
}

function filterSourceContracts(contracts, options) {
  var opts = options || {}
  var query = String(opts.query != null ? opts.query : sourceViewState.query).trim().toLowerCase()
  var kindFilter = opts.kind != null ? opts.kind : sourceViewState.kind
  var presenceFilter = opts.presence != null ? opts.presence : sourceViewState.presence
  var allowedKinds = opts.allowedKinds || null

  return (contracts || []).filter(function(contract) {
    var kind = getSourceKind(contract)
    var presence = getSourcePresence(contract)

    if (allowedKinds && allowedKinds.indexOf(kind.key) === -1) return false
    if (kindFilter !== 'all' && kind.key !== kindFilter) return false
    if (presenceFilter !== 'all' && presence.key !== presenceFilter) return false
    if (!query) return true

    return getSourceSearchText(contract).indexOf(query) !== -1
  })
}

function sortSourceContracts(contracts) {
  var trustRank = {
    'Signed Off': 0,
    'In Review': 1,
    'Partially Signed Off': 2,
    'Readable Only': 3,
    'Not Signed Off': 4,
  }

  return (contracts || []).slice().sort(function(a, b) {
    var rankA = trustRank[a.validation] != null ? trustRank[a.validation] : 99
    var rankB = trustRank[b.validation] != null ? trustRank[b.validation] : 99
    if (rankA !== rankB) return rankA - rankB
    return a.sourceId.localeCompare(b.sourceId)
  })
}

function renderSourceTag(text, tone) {
  var tag = document.createElement('span')
  tag.className = 'source-tag source-tag-' + tone
  tag.textContent = text
  return tag
}

function renderSourceMetaItem(labelText, valueText) {
  var item = document.createElement('div')
  item.className = 'source-card-meta-item'

  var label = document.createElement('div')
  label.className = 'source-card-meta-label'
  label.textContent = labelText
  item.appendChild(label)

  var value = document.createElement('div')
  value.className = 'source-card-meta-value'
  value.textContent = valueText || 'Not set'
  item.appendChild(value)

  return item
}

function renderSourceContractCard(contract) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title = document.createElement('h4')
  title.textContent = getSourceUnitName(contract) || getSourceSystemName(contract)
  titleWrap.appendChild(title)

  var sourceId = document.createElement('div')
  sourceId.className = 'source-card-id'
  sourceId.textContent = [
    contract.sourceId,
    getSourceSystemName(contract) !== (getSourceUnitName(contract) || getSourceSystemName(contract))
      ? 'Tab in ' + getSourceSystemName(contract)
      : '',
  ].filter(Boolean).join(' · ')
  titleWrap.appendChild(sourceId)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  var kindTag = getSourceKind(contract)
  var trustTag = getSourceTrust(contract)
  tags.appendChild(renderSourceTag(kindTag.label, 'neutral'))
  tags.appendChild(renderSourceTag(trustTag.label, trustTag.tone))
  article.appendChild(tags)

  var metaGrid = document.createElement('div')
  metaGrid.className = 'source-card-meta-grid'
  metaGrid.appendChild(renderSourceMetaItem('Owner', contract.owner || 'System'))
  metaGrid.appendChild(renderSourceMetaItem('Access', contract.accessMethod || 'Unknown'))
  metaGrid.appendChild(renderSourceMetaItem('State', getSourcePresence(contract).label))
  metaGrid.appendChild(renderSourceMetaItem('Scope', contract.scope || 'Unknown'))
  if (contract.lastVerified) {
    metaGrid.appendChild(renderSourceMetaItem('Last Verified', contract.lastVerified))
  }
  article.appendChild(metaGrid)

  if (contract.owns) {
    article.appendChild(renderLabeledCopy('decision-meta', 'What this tab owns', contract.owns))
  }

  if (contract.validationScope) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Trust boundary', contract.validationScope))
  }

  if (contract.boundaryNote) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Boundary note', contract.boundaryNote))
  }

  appendSourceActions(article, contract.actions || [])
  return article
}

function renderSourceAccordionItem(contract) {
  var details = document.createElement('details')
  details.className = 'source-item'

  var summary = document.createElement('summary')
  summary.className = 'source-item-summary'

  var left = document.createElement('div')
  left.className = 'source-item-summary-left'

  var title = document.createElement('div')
  title.className = 'source-item-summary-title'
  title.textContent = getSourceUnitName(contract) || getSourceSystemName(contract)
  left.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-item-summary-meta'
  meta.textContent = [
    getSourceKind(contract).label,
    contract.owner || 'System',
  ].join(' · ')
  left.appendChild(meta)

  if (contract.scope || contract.owns) {
    var excerpt = document.createElement('div')
    excerpt.className = 'source-item-summary-copy'
    excerpt.textContent = contract.scope || contract.owns
    left.appendChild(excerpt)
  }

  summary.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-item-summary-right'
  var trustTag = getSourceTrust(contract)
  right.appendChild(renderSourceTag(trustTag.label, trustTag.tone))
  summary.appendChild(right)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-item-body'
  body.appendChild(renderSourceContractCard(contract))
  details.appendChild(body)

  return details
}

function renderSourceLegendPanel() {
  var panel = document.createElement('section')
  panel.className = 'panel'

  var grid = document.createElement('div')
  grid.className = 'source-legend-grid'

  ;[
    {
      title: 'Source System',
      copy: 'The big business source: a workbook, doc set, database, app, or platform the OS depends on.',
    },
    {
      title: 'Validation Unit',
      copy: 'The exact tab, range, ledger, or slice currently being validated inside the larger source system.',
    },
    {
      title: 'Connector Layer',
      copy: 'The technical path. It shows what connection exists, what it does, and who should be allowed to use it.',
    },
    {
      title: 'Trust State',
      copy: 'Whether the source is signed off, in review, readable only, partial, or still not trusted for live system use.',
    },
  ].forEach(function(item) {
    var card = document.createElement('article')
    card.className = 'section-card source-legend-card'

    var cardTitle = document.createElement('h4')
    cardTitle.textContent = item.title
    card.appendChild(cardTitle)

    var copy = document.createElement('p')
    copy.className = 'source-card-copy'
    copy.textContent = item.copy
    card.appendChild(copy)

    grid.appendChild(card)
  })

  panel.appendChild(grid)

  var colorLegend = document.createElement('div')
  colorLegend.className = 'source-color-legend'

  ;[
    { tone: 'connected', label: 'Signed off / working now' },
    { tone: 'planned', label: 'Current build focus / active review' },
    { tone: 'pending', label: 'Provisional / needs validation' },
    { tone: 'missing', label: 'Missing / blocked / not wired' },
  ].forEach(function(item) {
    var row = document.createElement('div')
    row.className = 'source-color-legend-item'

    var dot = document.createElement('span')
    dot.className = 'source-color-dot source-color-dot-' + item.tone
    row.appendChild(dot)

    var text = document.createElement('span')
    text.textContent = item.label
    row.appendChild(text)

    colorLegend.appendChild(row)
  })

  panel.appendChild(colorLegend)
  return panel
}

function getSourceSystemState(contracts) {
  if ((contracts || []).every(function(contract) {
    return getSourcePresence(contract).key === 'signed-off'
  })) {
    return { key: 'signed-off', label: 'Signed off', tone: 'connected' }
  }

  if ((contracts || []).some(function(contract) {
    return getSourcePresence(contract).key === 'connected'
  })) {
    return { key: 'active-review', label: 'Active review', tone: 'planned' }
  }

  if ((contracts || []).some(function(contract) {
    return getSourcePresence(contract).key === 'needs-verification'
  })) {
    return { key: 'needs-verification', label: 'Needs verification', tone: 'pending' }
  }

  return { key: 'not-connected', label: 'Not connected', tone: 'missing' }
}

function groupSourceContractsBySystem(contracts) {
  var grouped = {}
  ;(contracts || []).forEach(function(contract) {
    var key = getSourceSystemName(contract)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(contract)
  })

  return Object.keys(grouped).map(function(key) {
    return {
      name: key,
      contracts: sortSourceContracts(grouped[key]),
    }
  }).sort(function(a, b) {
    var order = {
      'active-review': 0,
      'needs-verification': 1,
      'not-connected': 2,
      'signed-off': 3,
    }
    var aState = getSourceSystemState(a.contracts).key
    var bState = getSourceSystemState(b.contracts).key
    var delta = (order[aState] != null ? order[aState] : 99) - (order[bState] != null ? order[bState] : 99)
    if (delta !== 0) return delta
    return a.name.localeCompare(b.name)
  })
}

function renderSourceSystemStack(group) {
  var contracts = group.contracts || []
  if (!contracts.length) return null

  var details = document.createElement('details')
  details.className = 'source-stack'
  var state = getSourceSystemState(contracts)
  var signedOffUnits = contracts.filter(function(contract) { return getSourcePresence(contract).key === 'signed-off' }).length
  var provisionalUnits = contracts.filter(function(contract) { return getSourcePresence(contract).key === 'connected' }).length
  var accessSummary = Array.from(new Set(contracts.map(function(contract) {
    return contract.accessMethod
  }).filter(Boolean))).join(' · ')
  var ownerSummary = Array.from(new Set(contracts.map(function(contract) {
    return contract.owner || 'System'
  }).filter(Boolean))).join(' · ')

  var summary = document.createElement('summary')
  summary.className = 'source-stack-summary source-stack-summary-' + state.key

  var left = document.createElement('div')
  left.className = 'source-stack-summary-left'

  var title = document.createElement('div')
  title.className = 'source-stack-title'
  title.textContent = group.name
  left.appendChild(title)

  var intro = document.createElement('div')
  intro.className = 'source-stack-intro'
  intro.textContent = [
    contracts.length + ' validation unit' + (contracts.length === 1 ? '' : 's'),
    signedOffUnits ? signedOffUnits + ' signed off' : '',
    provisionalUnits ? provisionalUnits + ' still provisional' : '',
  ].filter(Boolean).join(' · ')
  left.appendChild(intro)

  summary.appendChild(left)

  var count = document.createElement('span')
  count.className = 'source-stack-count'
  count.textContent = contracts.length
  summary.appendChild(count)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-stack-body'

  var systemCard = document.createElement('article')
  systemCard.className = 'section-card source-card'

  var systemCardTitleWrap = document.createElement('div')
  systemCardTitleWrap.className = 'source-card-title-wrap'

  var systemCardMeta = document.createElement('div')
  systemCardMeta.className = 'source-card-id'
  systemCardMeta.textContent = 'Source system'
  systemCardTitleWrap.appendChild(systemCardMeta)

  var systemCardTitle = document.createElement('h4')
  systemCardTitle.textContent = group.name
  systemCardTitleWrap.appendChild(systemCardTitle)
  systemCard.appendChild(systemCardTitleWrap)

  var systemCardTags = document.createElement('div')
  systemCardTags.className = 'source-card-tags'
  systemCardTags.appendChild(renderSourceTag(state.label, state.tone))
  systemCard.appendChild(systemCardTags)

  var systemCardCopy = document.createElement('p')
  systemCardCopy.className = 'source-card-copy'
  systemCardCopy.textContent = 'Review this workbook one tab at a time. The cards below are the exact validation units that still need trust work or sign-off.'
  systemCard.appendChild(systemCardCopy)

  var systemCardGrid = document.createElement('div')
  systemCardGrid.className = 'source-card-meta-grid'
  systemCardGrid.appendChild(renderSourceMetaItem('Tracked tabs', String(contracts.length)))
  if (ownerSummary) systemCardGrid.appendChild(renderSourceMetaItem('Owners', ownerSummary))
  if (accessSummary) systemCardGrid.appendChild(renderSourceMetaItem('Access', accessSummary))
  systemCardGrid.appendChild(renderSourceMetaItem('Signed off', String(signedOffUnits)))
  systemCard.appendChild(systemCardGrid)

  var actionSeen = {}
  var systemActions = []
  contracts.forEach(function(contract) {
    ;(contract.actions || []).forEach(function(action) {
      var key = action.href || action.label
      if (!key || actionSeen[key]) return
      actionSeen[key] = true
      systemActions.push(action)
    })
  })
  appendSourceActions(systemCard, systemActions.slice(0, 1))
  body.appendChild(systemCard)

  contracts.forEach(function(contract) {
    body.appendChild(renderSourceAccordionItem(contract))
  })

  details.appendChild(body)
  return details
}

function getConnectorState(connector) {
  if (connector.group === 'working') return { key: 'connected', label: 'Working now', tone: 'connected' }
  if (connector.group === 'available') return { key: 'needs-verification', label: 'Installed / needs validation', tone: 'pending' }
  return { key: 'not-connected', label: 'Not wired yet', tone: 'missing' }
}

function renderConnectorCard(connector) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title = document.createElement('h4')
  title.textContent = connector.title
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-card-id'
  meta.textContent = connector.connectorId
  titleWrap.appendChild(meta)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  var state = getConnectorState(connector)
  tags.appendChild(renderSourceTag(state.label, state.tone))
  article.appendChild(tags)

  var copy = document.createElement('p')
  copy.className = 'source-card-copy'
  copy.textContent = connector.purpose
  article.appendChild(copy)

  var grid = document.createElement('div')
  grid.className = 'source-card-meta-grid'
  grid.appendChild(renderSourceMetaItem('Who can use it', connector.availableTo || 'Not set'))
  grid.appendChild(renderSourceMetaItem('Current status', connector.status || 'Unknown'))
  grid.appendChild(renderSourceMetaItem('What it does', connector.powers || 'Not set'))
  article.appendChild(grid)

  return article
}

function renderConnectorStack(group, connectors) {
  if (!connectors.length) return null

  var details = document.createElement('details')
  details.className = 'source-stack'

  var summary = document.createElement('summary')
  summary.className = 'source-stack-summary source-stack-summary-' + group.key

  var left = document.createElement('div')
  left.className = 'source-stack-summary-left'

  var title = document.createElement('div')
  title.className = 'source-stack-title'
  title.textContent = group.title
  left.appendChild(title)

  var intro = document.createElement('div')
  intro.className = 'source-stack-intro'
  intro.textContent = group.intro
  left.appendChild(intro)

  summary.appendChild(left)

  var count = document.createElement('span')
  count.className = 'source-stack-count'
  count.textContent = connectors.length
  summary.appendChild(count)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-stack-body'
  connectors.forEach(function(connector) {
    body.appendChild(renderConnectorCard(connector))
  })
  details.appendChild(body)

  return details
}

function getSourceContractsForSection(contracts, config) {
  if (!config || !config.allowedKinds || !config.allowedKinds.length) return contracts || []

  return (contracts || []).filter(function(contract) {
    return config.allowedKinds.indexOf(getSourceKind(contract).key) !== -1
  })
}

function renderSourceHero(config, sourceContracts, sourceConnectors) {
  var signedOffCount = sourceContracts.filter(function(contract) { return getSourcePresence(contract).key === 'signed-off' }).length
  var connectedCount = sourceContracts.filter(function(contract) { return getSourcePresence(contract).key === 'connected' }).length
  var verificationCount = sourceContracts.filter(function(contract) { return getSourcePresence(contract).key === 'needs-verification' }).length
  var gapCount = sourceContracts.filter(function(contract) { return getSourcePresence(contract).key === 'not-connected' }).length
  var systemCount = groupSourceContractsBySystem(sourceContracts).length

  var hero = document.createElement('section')
  hero.className = 'hero'

  var heroInner = document.createElement('div')
  heroInner.className = 'hero-inner'

  var heroEyebrow = document.createElement('div')
  heroEyebrow.className = 'eyebrow'
  heroEyebrow.textContent = config.eyebrow
  heroInner.appendChild(heroEyebrow)

  var heroTitle = document.createElement('h1')
  heroTitle.textContent = config.title
  heroInner.appendChild(heroTitle)

  var heroMeta = document.createElement('p')
  heroMeta.className = 'hero-copy'
  if (config.showSystems && config.showConnectors) {
    heroMeta.textContent = systemCount + ' source systems · ' + sourceContracts.length + ' validation units · ' + sourceConnectors.length + ' connectors tracked'
  } else if (config.showSystems) {
    heroMeta.textContent = systemCount + ' source systems · ' + sourceContracts.length + ' validation units in this lane'
  } else {
    heroMeta.textContent = sourceConnectors.length + ' connectors tracked in this lane'
  }
  heroInner.appendChild(heroMeta)

  var heroNote = document.createElement('p')
  heroNote.className = 'hero-copy'
  heroNote.textContent = config.intro
  heroInner.appendChild(heroNote)

  if (config.title === 'Data Sources') {
    var trustNote = document.createElement('p')
    trustNote.className = 'hero-copy'
    trustNote.textContent = 'Trust right now: ' + signedOffCount + ' signed off · ' + connectedCount + ' provisional · ' + verificationCount + ' need rebuild verification · ' + gapCount + ' not connected.'
    heroInner.appendChild(trustNote)
  }

  hero.appendChild(heroInner)
  return hero
}

function renderSourceSystemsPanel(sourceContracts, options) {
  var opts = options || {}
  var panel = document.createElement('section')
  panel.className = 'panel source-zone-panel source-zone-panel-systems'

  var panelHeader = document.createElement('div')
  panelHeader.className = 'panel-header'

  var panelLeft = document.createElement('div')
  var panelEyebrow = document.createElement('div')
  panelEyebrow.className = 'eyebrow'
  panelEyebrow.textContent = opts.eyebrow || 'Live Source Layer'
  panelLeft.appendChild(panelEyebrow)

  var panelTitle = document.createElement('h3')
  panelTitle.textContent = opts.title || 'Source systems and validation units'
  panelLeft.appendChild(panelTitle)

  var panelIntro = document.createElement('p')
  panelIntro.className = 'section-intro'
  panelIntro.textContent = opts.intro || 'The big cards are the real source systems. Open each one to see the exact tabs, ledgers, or units being validated underneath it.'
  panelLeft.appendChild(panelIntro)

  panelHeader.appendChild(panelLeft)
  panel.appendChild(panelHeader)

  var controls = document.createElement('div')
  controls.className = 'operations-toolbar'

  var searchField = document.createElement('div')
  searchField.className = 'operations-search'
  var searchInput = buildInput('search', 'Search by source ID, source, owner, access, or what it owns')
  searchInput.value = sourceViewState.query
  searchField.appendChild(searchInput)
  controls.appendChild(searchField)

  var kindButtons = []
  if (opts.showKindFilter) {
    var kindGroup = document.createElement('div')
    kindGroup.className = 'operations-filter-group'
    var kindLabel = document.createElement('span')
    kindLabel.className = 'operations-filter-label'
    kindLabel.textContent = 'Type'
    kindGroup.appendChild(kindLabel)

    ;[
      { key: 'all', label: 'All' },
      { key: 'docs', label: 'Docs' },
      { key: 'sheets', label: 'Sheets' },
      { key: 'api', label: 'APIs' },
      { key: 'apps', label: 'Apps / Workspace' },
      { key: 'other', label: 'Other' },
    ].forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'operations-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        sourceViewState.kind = option.key
        applySourceFilters()
      })
      kindButtons.push({ key: option.key, button: button })
      kindGroup.appendChild(button)
    })
    controls.appendChild(kindGroup)
  }

  var presenceGroup = document.createElement('div')
  presenceGroup.className = 'operations-filter-group'
  var presenceLabel = document.createElement('span')
  presenceLabel.className = 'operations-filter-label'
  presenceLabel.textContent = 'State'
  presenceGroup.appendChild(presenceLabel)

  var presenceButtons = []
  ;[
    { key: 'all', label: 'All' },
    { key: 'signed-off', label: 'Signed Off' },
    { key: 'connected', label: 'Connected Provisional' },
    { key: 'needs-verification', label: 'Needs Verification' },
    { key: 'not-connected', label: 'Not Connected' },
  ].forEach(function(option) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'operations-filter-chip'
    button.textContent = option.label
    button.addEventListener('click', function() {
      sourceViewState.presence = option.key
      applySourceFilters()
    })
    presenceButtons.push({ key: option.key, button: button })
    presenceGroup.appendChild(button)
  })
  controls.appendChild(presenceGroup)

  panel.appendChild(controls)

  var results = document.createElement('p')
  results.className = 'operations-results-meta'
  panel.appendChild(results)

  var board = document.createElement('div')
  board.className = 'source-contract-stack'
  panel.appendChild(board)

  function syncSourceButtons() {
    kindButtons.forEach(function(item) {
      item.button.classList.toggle('is-active', sourceViewState.kind === item.key)
    })
    presenceButtons.forEach(function(item) {
      item.button.classList.toggle('is-active', sourceViewState.presence === item.key)
    })
  }

  function applySourceFilters() {
    syncSourceButtons()

    if (opts.showKindFilter && !kindButtons.some(function(item) { return item.key === sourceViewState.kind })) {
      sourceViewState.kind = 'all'
    }

    var filteredContracts = filterSourceContracts(sourceContracts, {
      allowedKinds: opts.allowedKinds || null,
      kind: opts.showKindFilter ? sourceViewState.kind : 'all',
      presence: sourceViewState.presence,
      query: sourceViewState.query,
    })
    var groupedSystems = groupSourceContractsBySystem(filteredContracts)
    var laneLabel = opts.resultsLabel || 'source systems'
    var kindLabelText = opts.showKindFilter
      ? (sourceViewState.kind === 'all'
        ? 'all source types'
        : kindButtons.filter(function(item) { return item.key === sourceViewState.kind })[0].button.textContent.toLowerCase())
      : (opts.fixedKindLabel || 'this lane')
    var stateLabelText = sourceViewState.presence === 'all'
      ? 'all operating states'
      : presenceButtons.filter(function(item) { return item.key === sourceViewState.presence })[0].button.textContent.toLowerCase()

    results.textContent = 'Showing ' + filteredContracts.length + ' validation units across ' + groupedSystems.length + ' ' + laneLabel + ' · ' + kindLabelText + ' · ' + stateLabelText + ' · groups and cards start collapsed'

    board.innerHTML = ''
    groupedSystems.forEach(function(group) {
      var groupPanel = renderSourceSystemStack(group)
      if (groupPanel) board.appendChild(groupPanel)
    })

    if (!board.childNodes.length) {
      var empty = document.createElement('div')
      empty.className = 'decision-empty-state'
      empty.textContent = 'No source contracts match this lane yet.'
      board.appendChild(empty)
    }
  }

  searchInput.addEventListener('input', function() {
    sourceViewState.query = searchInput.value
    applySourceFilters()
  })

  applySourceFilters()
  return panel
}

function renderSourceConnectorsPanel(sourceConnectors, options) {
  var opts = options || {}
  var connectorPanel = document.createElement('section')
  connectorPanel.className = 'panel source-zone-panel source-zone-panel-connectors'

  var connectorHeader = document.createElement('div')
  connectorHeader.className = 'panel-header'

  var connectorLeft = document.createElement('div')
  var connectorEyebrow = document.createElement('div')
  connectorEyebrow.className = 'eyebrow'
  connectorEyebrow.textContent = opts.eyebrow || 'Connector Layer'
  connectorLeft.appendChild(connectorEyebrow)

  var connectorTitle = document.createElement('h3')
  connectorTitle.textContent = opts.title || 'Connections and access paths'
  connectorLeft.appendChild(connectorTitle)

  var connectorIntro = document.createElement('p')
  connectorIntro.className = 'section-intro'
  connectorIntro.textContent = opts.intro || 'These are the pipes. They explain what connection exists, what it does, and who should be using it. Pipe does not equal trust.'
  connectorLeft.appendChild(connectorIntro)

  connectorHeader.appendChild(connectorLeft)
  connectorPanel.appendChild(connectorHeader)

  var connectorBoard = document.createElement('div')
  connectorBoard.className = 'source-contract-stack'

  ;[
    { key: 'connected', title: 'Working Now', intro: 'These connectors are live enough to use in the rebuild today.' },
    { key: 'needs-verification', title: 'Installed / Needs Validation', intro: 'These connectors or APIs are known paths, but their BCrew operating boundary is not trusted yet.' },
    { key: 'not-connected', title: 'Not Wired Yet', intro: 'These are known connector slots that still need setup, policy, or implementation work.' },
  ].forEach(function(group) {
    var groupConnectors = sourceConnectors.filter(function(connector) {
      return getConnectorState(connector).key === group.key
    })
    var groupPanel = renderConnectorStack(group, groupConnectors)
    if (groupPanel) connectorBoard.appendChild(groupPanel)
  })

  connectorPanel.appendChild(connectorBoard)
  return connectorPanel
}

function renderSourceOperatorNotesDrawer(data) {
  var notesPanel = document.createElement('section')
  notesPanel.className = 'panel'

  if (!data.foundation.sourceRegistry.meta.exists) {
    var notice = document.createElement('p')
    notice.textContent = 'Source registry not found. Create docs/source-registry.md.'
    notesPanel.appendChild(notice)
  } else {
    var notesHeader = document.createElement('div')
    notesHeader.className = 'panel-header'

    var notesLeft = document.createElement('div')
    var notesEyebrow = document.createElement('div')
    notesEyebrow.className = 'eyebrow'
    notesEyebrow.textContent = 'Operator Note'
    notesLeft.appendChild(notesEyebrow)

    var notesTitle = document.createElement('h3')
    notesTitle.textContent = 'Registry note and overlap history'
    notesLeft.appendChild(notesTitle)

    var notesIntro = document.createElement('p')
    notesIntro.className = 'section-intro'
    notesIntro.textContent = 'The structured cards above are the front door. The markdown note below keeps the deeper overlap rules, history, and audit context without turning the whole page into one giant note.'
    notesLeft.appendChild(notesIntro)

    notesHeader.appendChild(notesLeft)
    notesPanel.appendChild(notesHeader)

    var sectionList = document.createElement('div')
    sectionList.className = 'section-list'
    data.foundation.sourceRegistry.sections.forEach(function(section) {
      sectionList.appendChild(renderSection(section, data.foundation.sourceRegistry.meta.path))
    })
    notesPanel.appendChild(sectionList)
  }

  return renderOperatorToolsDrawer(
    'Operator Notes',
    'Deeper source notes, overlap rules, and audit context live here. Keep the live cards above as the default view.',
    [notesPanel],
    false
  )
}

function getFubMarketingTag(item) {
  if (item.marketingType === 'marketing') return { label: 'Marketing', tone: 'connected' }
  if (item.marketingType === 'non_marketing') return { label: 'Non-marketing', tone: 'neutral' }
  return { label: 'Unclassified', tone: 'pending' }
}

function getFubOwnershipTag(item) {
  if (item.ownershipType === 'company') return { label: 'Company', tone: 'planned' }
  if (item.ownershipType === 'agent') return { label: 'Agent', tone: 'neutral' }
  if (item.ownershipType === 'referral') return { label: 'Referral', tone: 'connected' }
  if (item.ownershipType === 'other') return { label: 'Other', tone: 'neutral' }
  return { label: 'Ownership open', tone: 'pending' }
}

function renderFubLeadSourceRuleItem(item, onSaved) {
  var details = document.createElement('details')
  details.className = 'source-item'

  var summary = document.createElement('summary')
  summary.className = 'source-item-summary'

  var left = document.createElement('div')
  left.className = 'source-item-summary-left'

  var title = document.createElement('div')
  title.className = 'source-item-summary-title'
  title.textContent = item.source
  left.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-item-summary-meta'
  meta.textContent = item.count + ' contact' + (item.count === 1 ? '' : 's') + (item.sourceGroup ? ' · ' + item.sourceGroup : '')
  left.appendChild(meta)

  if (item.notes) {
    var excerpt = document.createElement('div')
    excerpt.className = 'source-item-summary-copy'
    excerpt.textContent = item.notes
    left.appendChild(excerpt)
  }

  summary.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-item-summary-right'
  right.appendChild(renderSourceTag(String(item.count), 'neutral'))
  right.appendChild(renderSourceTag(getFubMarketingTag(item).label, getFubMarketingTag(item).tone))
  right.appendChild(renderSourceTag(getFubOwnershipTag(item).label, getFubOwnershipTag(item).tone))
  summary.appendChild(right)
  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-item-body'

  var grid = document.createElement('div')
  grid.className = 'memory-inline-grid'

  var marketingSelect = buildSelect([
    { value: 'unclassified', label: 'Unclassified', selected: item.marketingType === 'unclassified' },
    { value: 'marketing', label: 'Marketing', selected: item.marketingType === 'marketing' },
    { value: 'non_marketing', label: 'Non-marketing', selected: item.marketingType === 'non_marketing' },
  ])
  grid.appendChild(buildField('Marketing', marketingSelect))

  var ownershipSelect = buildSelect([
    { value: 'unclassified', label: 'Unclassified', selected: item.ownershipType === 'unclassified' },
    { value: 'company', label: 'Company', selected: item.ownershipType === 'company' },
    { value: 'agent', label: 'Agent', selected: item.ownershipType === 'agent' },
    { value: 'referral', label: 'Referral', selected: item.ownershipType === 'referral' },
    { value: 'other', label: 'Other', selected: item.ownershipType === 'other' },
  ])
  grid.appendChild(buildField('Ownership', ownershipSelect))

  var groupSelect = buildSelect(FUB_SOURCE_GROUP_OPTIONS.map(function(option) {
    return {
      value: option,
      label: option || 'No group',
      selected: (item.sourceGroup || '') === option,
    }
  }))
  grid.appendChild(buildField('Group', groupSelect))

  var notesInput = buildTextarea('Why this source is classified this way', 2)
  notesInput.value = item.notes || ''
  grid.appendChild(buildField('Notes', notesInput))
  body.appendChild(grid)

  var actions = document.createElement('div')
  actions.className = 'memory-form-actions'

  var save = document.createElement('button')
  save.type = 'button'
  save.className = 'memory-button'
  save.textContent = 'Save Rule'
  actions.appendChild(save)

  var stamp = document.createElement('span')
  stamp.className = 'source-card-id'
  stamp.textContent = item.updatedAt
    ? 'Last saved ' + formatDate(item.updatedAt) + (item.updatedBy ? ' · ' + item.updatedBy : '')
    : 'No saved rule yet'
  actions.appendChild(stamp)

  body.appendChild(actions)

  var status = document.createElement('p')
  status.className = 'form-status'
  body.appendChild(status)

  save.addEventListener('click', function() {
    save.disabled = true
    foundationMutation('/api/fub/lead-sources', 'PATCH', {
      source: item.source,
      marketingType: marketingSelect.value,
      ownershipType: ownershipSelect.value,
      sourceGroup: groupSelect.value || null,
      notes: notesInput.value.trim() || null,
    }).then(function(payload) {
      var rule = payload.rule || {}
      item.marketingType = rule.marketingType || marketingSelect.value
      item.ownershipType = rule.ownershipType || ownershipSelect.value
      item.sourceGroup = rule.sourceGroup || null
      item.notes = rule.notes || null
      item.updatedAt = rule.updatedAt || null
      item.updatedBy = rule.updatedBy || null
      setFormStatus(status, 'Saved.', 'success')
      stamp.textContent = item.updatedAt
        ? 'Last saved ' + formatDate(item.updatedAt) + (item.updatedBy ? ' · ' + item.updatedBy : '')
        : 'Saved'
      if (typeof onSaved === 'function') onSaved(item)
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to save rule.', 'error')
    }).finally(function() {
      save.disabled = false
    })
  })

  details.appendChild(body)
  return details
}

function renderFubLeadSourceManagerPanel() {
  var panel = document.createElement('details')
  panel.id = 'fub-lead-source-taxonomy'
  panel.className = 'source-stack'

  var summaryRow = document.createElement('summary')
  summaryRow.className = 'source-stack-summary source-stack-summary-connected'

  var summaryLeft = document.createElement('div')
  summaryLeft.className = 'source-stack-summary-left'

  var summaryTitle = document.createElement('div')
  summaryTitle.className = 'source-stack-title'
  summaryTitle.textContent = 'FUB lead-source taxonomy'
  summaryLeft.appendChild(summaryTitle)

  var summaryIntro = document.createElement('div')
  summaryIntro.className = 'source-stack-intro'
  summaryIntro.textContent = 'Classify lead sources once here, then let marketing reporting, source validation, and sheet rules read the same truth.'
  summaryLeft.appendChild(summaryIntro)
  summaryRow.appendChild(summaryLeft)

  var summaryRight = document.createElement('div')
  summaryRight.className = 'source-item-summary-right'
  summaryRight.appendChild(renderSourceTag('Loading', 'pending'))
  summaryRow.appendChild(summaryRight)
  panel.appendChild(summaryRow)

  var body = document.createElement('div')
  body.className = 'source-stack-body'

  var contextSelect = buildSelect([
    { value: 'owner', label: 'Owner / Support FUB', selected: fubLeadSourceViewState.context === 'owner' },
    { value: 'steve', label: 'Steve FUB', selected: fubLeadSourceViewState.context === 'steve' },
  ])
  var refreshButton = document.createElement('button')
  refreshButton.type = 'button'
  refreshButton.className = 'memory-button'
  refreshButton.textContent = 'Refresh Snapshot'

  var queryInput = buildInput('search', 'Search lead source')
  queryInput.value = fubLeadSourceViewState.query

  var marketingFilter = buildSelect([
    { value: 'all', label: 'All marketing states', selected: fubLeadSourceViewState.marketing === 'all' },
    { value: 'unclassified', label: 'Unclassified', selected: fubLeadSourceViewState.marketing === 'unclassified' },
    { value: 'marketing', label: 'Marketing', selected: fubLeadSourceViewState.marketing === 'marketing' },
    { value: 'non_marketing', label: 'Non-marketing', selected: fubLeadSourceViewState.marketing === 'non_marketing' },
  ])

  var ownershipFilter = buildSelect([
    { value: 'all', label: 'All ownership states', selected: fubLeadSourceViewState.ownership === 'all' },
    { value: 'unclassified', label: 'Unclassified', selected: fubLeadSourceViewState.ownership === 'unclassified' },
    { value: 'company', label: 'Company', selected: fubLeadSourceViewState.ownership === 'company' },
    { value: 'agent', label: 'Agent', selected: fubLeadSourceViewState.ownership === 'agent' },
    { value: 'referral', label: 'Referral', selected: fubLeadSourceViewState.ownership === 'referral' },
    { value: 'other', label: 'Other', selected: fubLeadSourceViewState.ownership === 'other' },
  ])

  var topGrid = document.createElement('div')
  topGrid.className = 'memory-form-grid'
  topGrid.appendChild(buildField('Context', contextSelect))
  topGrid.appendChild(buildField('Search', queryInput))
  topGrid.appendChild(buildField('Marketing filter', marketingFilter))
  topGrid.appendChild(buildField('Ownership filter', ownershipFilter))
  body.appendChild(topGrid)

  var actionRow = document.createElement('div')
  actionRow.className = 'memory-form-actions'
  actionRow.appendChild(refreshButton)

  var stamp = document.createElement('span')
  stamp.className = 'source-card-id'
  stamp.textContent = 'No saved snapshot yet'
  actionRow.appendChild(stamp)
  body.appendChild(actionRow)

  var summary = document.createElement('div')
  summary.className = 'source-layer-divider'
  summary.textContent = 'Loading lead-source snapshot...'
  body.appendChild(summary)

  var status = document.createElement('p')
  status.className = 'form-status'
  body.appendChild(status)

  var list = document.createElement('div')
  list.className = 'source-contract-stack'
  body.appendChild(list)

  var loaded = null

  function syncSummaryTags() {
    summaryRight.innerHTML = ''
    if (!loaded) {
      summaryRight.appendChild(renderSourceTag('Loading', 'pending'))
      return
    }

    var stats = loaded.stats || {}
    var snapshot = loaded.snapshot || {}
    summaryRight.appendChild(renderSourceTag((loaded.context && loaded.context.label) || 'FUB', 'neutral'))
    summaryRight.appendChild(renderSourceTag((stats.totalSources || 0) + ' sources', 'neutral'))
    summaryRight.appendChild(renderSourceTag((stats.unclassified || 0) + ' open', stats.unclassified ? 'pending' : 'connected'))
    summaryRight.appendChild(renderSourceTag(snapshot.available ? 'Snapshot ready' : 'Needs refresh', snapshot.available ? 'connected' : 'pending'))
  }

  function filteredSources() {
    if (!loaded) return []
    return (loaded.sources || []).filter(function(item) {
      if (fubLeadSourceViewState.marketing !== 'all' && item.marketingType !== fubLeadSourceViewState.marketing) return false
      if (fubLeadSourceViewState.ownership !== 'all' && item.ownershipType !== fubLeadSourceViewState.ownership) return false
      var query = fubLeadSourceViewState.query.trim().toLowerCase()
      if (!query) return true
      return [
        item.source,
        item.notes,
        item.sourceGroup,
        item.marketingType,
        item.ownershipType,
      ].filter(Boolean).join(' ').toLowerCase().indexOf(query) !== -1
    })
  }

  function renderLoaded() {
    var items = filteredSources()
    var stats = loaded.stats || {}
    var snapshot = loaded.snapshot || {}
    var scan = loaded.scan || {}
    syncSummaryTags()

    stamp.textContent = snapshot.available && snapshot.refreshedAt
      ? 'Snapshot updated ' + formatDate(snapshot.refreshedAt) + (snapshot.refreshedBy ? ' · ' + snapshot.refreshedBy : '')
      : 'No saved snapshot yet'

    summary.textContent =
      'Showing ' + items.length + ' of ' + (stats.totalSources || 0) + ' sources' +
      ' · ' + (stats.unclassified || 0) + ' marketing unclassified' +
      ' · ' + (scan.peopleScanned || 0) + ' contacts scanned across ' + (scan.pagesScanned || 0) + ' pages' +
      (scan.truncated ? ' · refresh hit the safety cap' : '')

    list.innerHTML = ''
    if (!items.length) {
      var empty = document.createElement('div')
      empty.className = 'section-card source-card'
      empty.textContent = snapshot.available
        ? 'No lead sources match the current filters.'
        : 'No saved lead-source snapshot yet. Save write access and run Refresh Snapshot.'
      list.appendChild(empty)
      return
    }

    items.forEach(function(item) {
      list.appendChild(renderFubLeadSourceRuleItem(item, function() {
        renderLoaded()
      }))
    })
  }

  function load(refresh) {
    var message = refresh ? 'Refreshing FUB lead-source snapshot...' : 'Loading saved FUB lead-source snapshot...'
    summary.textContent = message
    list.innerHTML = '<p>' + message + '</p>'
    refreshButton.disabled = true
    if (refresh) setFormStatus(status, 'Running a full Follow Up Boss lead-source scan. This can take a bit on the owner account.', '')

    var loader = refresh ? refreshFubLeadSources : fetchFubLeadSources
    loader(fubLeadSourceViewState.context).then(function(data) {
      loaded = data
      setFormStatus(status, refresh ? 'Snapshot refreshed.' : '', refresh ? 'success' : '')
      renderLoaded()
    }).catch(function(error) {
      syncSummaryTags()
      summary.textContent = refresh ? 'Failed to refresh lead-source snapshot.' : 'Failed to load lead-source snapshot.'
      list.innerHTML = ''
      var msg = document.createElement('div')
      msg.className = 'section-card source-card'
      msg.textContent = error.message || 'Failed to load lead-source snapshot.'
      list.appendChild(msg)
      setFormStatus(status, error.message || 'Lead-source request failed.', 'error')
    }).finally(function() {
      refreshButton.disabled = false
    })
  }

  contextSelect.addEventListener('change', function() {
    fubLeadSourceViewState.context = contextSelect.value
    load(false)
  })
  queryInput.addEventListener('input', function() {
    fubLeadSourceViewState.query = queryInput.value
    if (loaded) renderLoaded()
  })
  marketingFilter.addEventListener('change', function() {
    fubLeadSourceViewState.marketing = marketingFilter.value
    if (loaded) renderLoaded()
  })
  ownershipFilter.addEventListener('change', function() {
    fubLeadSourceViewState.ownership = ownershipFilter.value
    if (loaded) renderLoaded()
  })
  refreshButton.addEventListener('click', function() {
    load(true)
  })

  panel.appendChild(body)
  load(false)
  return panel
}

function renderCapabilityCard(item) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title = document.createElement('h4')
  title.textContent = item.title
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-card-id'
  meta.textContent = item.id
  titleWrap.appendChild(meta)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  if (item.type) tags.appendChild(renderSourceTag(item.type, 'neutral'))
  tags.appendChild(renderSourceTag(item.state, item.tone || 'pending'))
  article.appendChild(tags)

  var copy = document.createElement('p')
  copy.className = 'source-card-copy'
  copy.textContent = item.purpose
  article.appendChild(copy)

  var grid = document.createElement('div')
  grid.className = 'source-card-meta-grid'
  grid.appendChild(renderSourceMetaItem('Available to', item.availableTo || 'Not set'))
  article.appendChild(grid)

  return article
}

function getInventoryUsageTag(doc) {
  if (doc.usage === 'runtime') return { label: 'Used now', tone: 'connected' }
  if (doc.usage === 'private-local') return { label: 'Private local', tone: 'missing' }
  return { label: 'Reference', tone: 'pending' }
}

function renderInventoryDocCard(doc) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title
  if (doc.openHref) {
    title = document.createElement('a')
    title.className = 'inventory-doc-link'
    title.href = doc.openHref
    title.textContent = doc.title
  } else {
    title = document.createElement('h4')
    title.textContent = doc.title
  }
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-card-id'
  meta.textContent = doc.path
  titleWrap.appendChild(meta)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  tags.appendChild(renderSourceTag(doc.storageClass || 'Doc', 'neutral'))
  var usageTag = getInventoryUsageTag(doc)
  tags.appendChild(renderSourceTag(usageTag.label, usageTag.tone))
  if (doc.surfaceLabel) tags.appendChild(renderSourceTag('Surfaced', 'planned'))
  article.appendChild(tags)

  var copy = document.createElement('p')
  copy.className = 'source-card-copy'
  copy.textContent = doc.role
  article.appendChild(copy)

  var grid = document.createElement('div')
  grid.className = 'source-card-meta-grid'
  if (doc.surfaceLabel) grid.appendChild(renderSourceMetaItem('Surface', doc.surfaceLabel))
  grid.appendChild(renderSourceMetaItem('Edit mode', doc.editMode || 'Manual only'))
  if (doc.updatedAt) grid.appendChild(renderSourceMetaItem('Updated', formatDate(doc.updatedAt)))
  if (typeof doc.lines === 'number') grid.appendChild(renderSourceMetaItem('Lines', String(doc.lines)))
  article.appendChild(grid)

  if (doc.whyHidden) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Why hidden', doc.whyHidden))
  }

  var actions = []
  if (doc.openHref) actions.push({ label: 'Open Doc', href: doc.openHref })
  if (doc.surfaceHref) actions.push({ label: 'Open Surface', href: doc.surfaceHref })
  appendSourceActions(article, actions)

  return article
}

function renderInventoryGroupStack(groupTitle, introText, items) {
  if (!items || !items.length) return null

  var details = document.createElement('details')
  details.className = 'source-stack'

  var summary = document.createElement('summary')
  summary.className = 'source-stack-summary source-stack-summary-connected'

  var left = document.createElement('div')
  left.className = 'source-stack-summary-left'

  var title = document.createElement('div')
  title.className = 'source-stack-title'
  title.textContent = groupTitle
  left.appendChild(title)

  var intro = document.createElement('div')
  intro.className = 'source-stack-intro'
  intro.textContent = introText
  left.appendChild(intro)

  summary.appendChild(left)

  var count = document.createElement('span')
  count.className = 'source-stack-count'
  count.textContent = items.length
  summary.appendChild(count)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-stack-body'
  items.forEach(function(item) {
    body.appendChild(renderInventoryDocCard(item))
  })
  details.appendChild(body)
  return details
}

function renderInventoryDocs() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading docs inventory...</p>'

  fetchSystemInventory().then(function(inventory) {
    container.innerHTML = ''

    var trackedDocs = inventory.docs && inventory.docs.tracked ? inventory.docs.tracked : []
    var privateLocalDocs = inventory.docs && inventory.docs.privateLocal ? inventory.docs.privateLocal : []
    var runtimeDocs = trackedDocs.filter(function(doc) { return doc.usage === 'runtime' })
    var referenceDocs = trackedDocs.filter(function(doc) { return doc.usage !== 'runtime' })
    var surfacedDocs = trackedDocs.filter(function(doc) { return !!doc.surfaceHref })

    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroEyebrow = document.createElement('div')
    heroEyebrow.className = 'eyebrow'
    heroEyebrow.textContent = 'System Inventory'
    heroInner.appendChild(heroEyebrow)

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Docs / Storage'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = trackedDocs.length + ' tracked markdown docs · ' + privateLocalDocs.length + ' private local docs'
    heroInner.appendChild(heroMeta)

    var heroCopy = document.createElement('p')
    heroCopy.className = 'hero-copy'
    heroCopy.textContent = 'This is the file-level storage inventory. Data Sources owns business truth. This page makes every tracked markdown artifact visible so nothing silently hides in the repo without earning its place.'
    heroInner.appendChild(heroCopy)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var statusPanel = renderOverviewStatusPanel([
      {
        label: 'Live runtime docs',
        status: 'connected',
        detail: runtimeDocs.length + ' docs are part of the active operating system right now.',
      },
      {
        label: 'Reference docs',
        status: 'pending',
        detail: referenceDocs.length + ' docs are stored as audits, handoffs, research, specs, or history.',
      },
      {
        label: 'Surfaced in UI',
        status: 'connected',
        detail: surfacedDocs.length + ' docs are directly tied to a visible system surface today.',
      },
      {
        label: 'Private local docs',
        status: privateLocalDocs.length ? 'pending' : 'connected',
        detail: privateLocalDocs.length
          ? privateLocalDocs.length + ' local-private docs exist and are listed with a reason instead of being silently hidden.'
          : 'No private local markdown files detected.',
      },
    ], {
      eyebrow: 'Inventory State',
      title: 'Doc visibility',
      intro: 'The goal is explicitness: every doc should either be surfaced, inventoried, or deliberately private with a reason.',
    })
    if (statusPanel) container.appendChild(statusPanel)

    var groups = {}
    trackedDocs.forEach(function(doc) {
      if (!groups[doc.category]) groups[doc.category] = []
      groups[doc.category].push(doc)
    })

    var panel = document.createElement('section')
    panel.className = 'panel'

    var header = document.createElement('div')
    header.className = 'panel-header'

    var left = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Tracked Docs'
    left.appendChild(eyebrow)

    var title = document.createElement('h3')
    title.textContent = 'Repo docs and storage inventory'
    left.appendChild(title)

    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = 'Everything tracked in git is grouped below. Open the group you want and audit whether each file still deserves its slot in the system.'
    left.appendChild(intro)

    header.appendChild(left)
    panel.appendChild(header)

    var board = document.createElement('div')
    board.className = 'source-contract-stack'
    Object.keys(groups).sort().forEach(function(groupKey) {
      var stack = renderInventoryGroupStack(groupKey, 'Grouped by role so the system can show what is live doctrine versus stored history.', groups[groupKey])
      if (stack) board.appendChild(stack)
    })
    panel.appendChild(board)
    container.appendChild(panel)

    if (privateLocalDocs.length) {
      var privatePanel = document.createElement('section')
      privatePanel.className = 'panel'

      var privateHeader = document.createElement('div')
      privateHeader.className = 'panel-header'

      var privateLeft = document.createElement('div')
      var privateEyebrow = document.createElement('div')
      privateEyebrow.className = 'eyebrow'
      privateEyebrow.textContent = 'Local Private'
      privateLeft.appendChild(privateEyebrow)

      var privateTitle = document.createElement('h3')
      privateTitle.textContent = 'Docs intentionally kept out of the shared web surface'
      privateLeft.appendChild(privateTitle)

      var privateIntro = document.createElement('p')
      privateIntro.className = 'section-intro'
      privateIntro.textContent = 'These files still show up here so the hiding is explicit, but they are not exposed as openable docs in the shared UI by default.'
      privateLeft.appendChild(privateIntro)

      privateHeader.appendChild(privateLeft)
      privatePanel.appendChild(privateHeader)

      var privateBoard = document.createElement('div')
      privateBoard.className = 'source-contract-stack'
      privateLocalDocs.forEach(function(doc) {
        privateBoard.appendChild(renderInventoryDocCard(doc))
      })
      privatePanel.appendChild(privateBoard)
      container.appendChild(privatePanel)
    }
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load docs inventory: ' + error.message
    container.appendChild(msg)
  })
}

function renderCapabilitySection(section) {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading capabilities...</p>'

  Promise.all([fetchFoundationHub(), fetchSystemInventory()]).then(function(results) {
    var hub = results[0]
    var inventory = results[1]
    container.innerHTML = ''

    var config = capabilityCatalog[section]
    if (!config) {
      renderOverview()
      return
    }

    var liveItems = config.items || []
    var statusCards = config.statusCards || []

    if (section === 'capabilities-skills') {
      liveItems = (inventory.skills || []).map(function(skill) {
        return {
          id: skill.id,
          title: skill.title,
          type: skill.scope,
          state: 'Installed',
          tone: skill.scope === 'Workspace skill' ? 'connected' : 'pending',
          availableTo: 'Coding/runtime layer on this machine',
          purpose: skill.description || 'Skill inventory item',
        }
      })

      var workspaceSkills = liveItems.filter(function(item) { return item.type === 'Workspace skill' }).length
      statusCards = [
        {
          label: 'Workspace skills',
          status: workspaceSkills ? 'connected' : 'pending',
          detail: workspaceSkills + ' workspace-level skills are installed in this environment.',
        },
        {
          label: 'System skills',
          status: liveItems.length - workspaceSkills ? 'connected' : 'pending',
          detail: (liveItems.length - workspaceSkills) + ' built-in system skills are available in this environment.',
        },
      ]
    } else if (section === 'capabilities-plugins') {
      liveItems = (inventory.plugins || []).map(function(plugin) {
        return {
          id: plugin.id,
          title: plugin.title,
          type: plugin.type,
          state: plugin.status,
          tone: 'connected',
          availableTo: 'Coding/runtime layer on this machine',
          purpose: plugin.skillCount + ' plugin skill' + (plugin.skillCount === 1 ? '' : 's') + ' detected: ' + plugin.skills.map(function(skill) {
            return skill.title
          }).join(', '),
        }
      })

      statusCards = [
        {
          label: 'Installed plugins',
          status: liveItems.length ? 'connected' : 'pending',
          detail: liveItems.length + ' plugin or MCP surfaces are installed in this environment.',
        },
        {
          label: 'Still open',
          status: 'pending',
          detail: 'Foundation still needs the richer live capabilities registry so these surfaces stop living only as runtime context.',
        },
      ]
    }

    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroEyebrow = document.createElement('div')
    heroEyebrow.className = 'eyebrow'
    heroEyebrow.textContent = config.eyebrow
    heroInner.appendChild(heroEyebrow)

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = config.title
    heroInner.appendChild(heroTitle)

    var heroCopy = document.createElement('p')
    heroCopy.className = 'hero-copy'
    heroCopy.textContent = config.intro
    heroInner.appendChild(heroCopy)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var statusPanel = renderOverviewStatusPanel(statusCards, {
      eyebrow: 'Current State',
      title: config.title + ' state',
      intro: 'This lane is separate from Data Sources on purpose.',
    })
    if (statusPanel) container.appendChild(statusPanel)

    var catalogPanel = document.createElement('section')
    catalogPanel.className = 'panel'

    var catalogHeader = document.createElement('div')
    catalogHeader.className = 'panel-header'

    var catalogLeft = document.createElement('div')
    var catalogEyebrow = document.createElement('div')
    catalogEyebrow.className = 'eyebrow'
    catalogEyebrow.textContent = 'Current Surface'
    catalogLeft.appendChild(catalogEyebrow)

    var catalogTitle = document.createElement('h3')
    catalogTitle.textContent = 'What exists right now'
    catalogLeft.appendChild(catalogTitle)

    var catalogIntro = document.createElement('p')
    catalogIntro.className = 'section-intro'
    catalogIntro.textContent = 'This is the current lane-level view, not the final live registry.'
    catalogLeft.appendChild(catalogIntro)

    catalogHeader.appendChild(catalogLeft)
    catalogPanel.appendChild(catalogHeader)

    var catalogGrid = document.createElement('div')
    catalogGrid.className = 'source-contract-stack'
    ;(liveItems || []).forEach(function(item) {
      catalogGrid.appendChild(renderCapabilityCard(item))
    })
    catalogPanel.appendChild(catalogGrid)
    container.appendChild(catalogPanel)

    var backlogItems = (hub.backlogItems || []).filter(function(item) {
      return (config.backlogIds || []).indexOf(item.id) !== -1
    })

    if (backlogItems.length) {
      var backlogPanel = document.createElement('section')
      backlogPanel.className = 'panel'

      var backlogHeader = document.createElement('div')
      backlogHeader.className = 'panel-header'

      var backlogLeft = document.createElement('div')
      var backlogEyebrow = document.createElement('div')
      backlogEyebrow.className = 'eyebrow'
      backlogEyebrow.textContent = 'Next To Build'
      backlogLeft.appendChild(backlogEyebrow)

      var backlogTitle = document.createElement('h3')
      backlogTitle.textContent = 'Backlog already tied to this lane'
      backlogLeft.appendChild(backlogTitle)

      var backlogIntro = document.createElement('p')
      backlogIntro.className = 'section-intro'
      backlogIntro.textContent = 'These cards are the live work behind this lane.'
      backlogLeft.appendChild(backlogIntro)

      backlogHeader.appendChild(backlogLeft)
      backlogPanel.appendChild(backlogHeader)

      var backlogStack = document.createElement('div')
      backlogStack.className = 'backlog-stack-body'
      sortBacklogItems(backlogItems).forEach(function(item) {
        backlogStack.appendChild(renderBacklogAccordionItem(item))
      })
      backlogPanel.appendChild(backlogStack)
      container.appendChild(backlogPanel)
    }
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load capabilities: ' + error.message
    container.appendChild(msg)
  })
}

function renderSourceRegistry(section) {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading data sources...</p>'

  fetchSourceOfTruth().then(function(data) {
    return data
  }).then(function(data) {
    container.innerHTML = ''

    var config = sourceSectionConfigs[section] || sourceSectionConfigs['source-overview']
    var sourceContracts = getSourceContractsForSection(data.sources || [], config)
    var sourceConnectors = data.connectors || []
    container.appendChild(renderSourceHero(config, sourceContracts, sourceConnectors))

    if (section === 'source-overview') {
      container.appendChild(renderOperatorToolsDrawer(
        'How To Read This',
        'Definitions for source system, validation unit, connector layer, and trust state. Open this only when you need the model.',
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
          ? 'The big cards are the real source systems. Open each one to see the exact tabs, ledgers, or units being validated underneath it.'
          : config.intro,
        showKindFilter: !!config.showKindFilter,
        allowedKinds: config.allowedKinds || null,
        fixedKindLabel: config.title.toLowerCase(),
        resultsLabel: 'source systems',
      }))
    }

    if (section === 'source-apis') {
      container.appendChild(renderFubLeadSourceManagerPanel())
    }

    if (config.showSystems && config.showConnectors) {
      var divider = document.createElement('div')
      divider.className = 'source-layer-divider'
      divider.textContent = 'Below this line is the connector layer. Sources above tell you what truth the business depends on. Connectors below tell you how the OS reaches that truth.'
      container.appendChild(divider)
    }

    if (config.showConnectors) {
      container.appendChild(renderSourceConnectorsPanel(sourceConnectors, {
        eyebrow: 'Connector Layer',
        title: 'Connections and access paths',
        intro: 'These are the pipes. They explain what connection exists, what it does, and who should be using it. Pipe does not equal trust.',
      }))
    }

    if (config.showOperatorNotes) {
      container.appendChild(renderSourceOperatorNotesDrawer(data))
    }

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load data sources: ' + error.message
    container.appendChild(msg)
  })
}

function renderDataHealth() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading system health...</p>'

  fetchFoundationHub().then(function(hub) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'System Health'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = hub.memoryStatus.length + ' trust-layer components tracked'
    heroInner.appendChild(heroMeta)

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'Home shows the high-level closeout summary. System Health is the deeper operator view of the underlying memory, trust, and runtime components that drive that summary.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    getSystemHealthGroups(hub.memoryStatus || []).forEach(function(group) {
      var panel = renderStatusGroupPanel(
        group.title,
        group.intro,
        group.items.map(function(item) {
          return {
            label: item.label,
            status: item.status,
            detail: item.detail,
          }
        })
      )
      if (panel) container.appendChild(panel)
    })

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load system health: ' + error.message
    container.appendChild(msg)
  })
}

function renderSystemActivity() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading system activity...</p>'

  fetchFoundationHub().then(function(hub) {
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'System Activity'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = 'Latest ' + (hub.recentChanges || []).length + ' trust-layer events'
    heroInner.appendChild(heroMeta)

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'This page is the short audit feed: backlog mutations, decision updates, question changes, and doc-apply events. It is for operator review and debugging, not for the main strategy story.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var changesPanel = renderRecentChangesPanel(hub.recentChanges || [], {
      eyebrow: 'Internal Feed',
      title: 'Recent Changes',
      intro: 'Only the latest 20 events are shown here so the page stays readable. Older history still exists in the change-event log; a fuller searchable audit surface can come later.',
    })

    if (changesPanel) {
      container.appendChild(changesPanel)
      return
    }

    var empty = document.createElement('p')
    empty.textContent = 'No recent trust-layer events yet.'
    container.appendChild(empty)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load system activity: ' + error.message
    container.appendChild(msg)
  })
}

/* ── router ──────────────────────────────────────────────── */

function getSection() {
  var hash = window.location.hash.replace('#', '')
  return (hash.split(':')[0] || 'home') || 'home'
}

function getSectionFocus() {
  var hash = window.location.hash.replace('#', '')
  var parts = hash.split(':')
  return parts.length > 1 ? parts.slice(1).join(':') : ''
}

function applySectionFocus() {
  var focusId = getSectionFocus()
  if (!focusId) return

  window.requestAnimationFrame(function() {
    var target = document.getElementById(focusId)
    if (!target) return
    if (target.tagName === 'DETAILS') target.open = true
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
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

  var breadcrumbParent = document.getElementById('found-breadcrumb-parent')
  var breadcrumbParentSep = document.getElementById('found-breadcrumb-parent-sep')
  if (breadcrumbParent && breadcrumbParentSep) {
    var parent = null
    var strategySupportSections = ['bhag-model', 'core-values', 'agent-engine', 'departments', 'governance', 'marketmasters']
    var sourceSections = ['source-overview', 'source-docs', 'source-sheets', 'source-apis', 'source-connectors']
    var inventorySections = ['inventory-docs', 'capabilities-skills', 'capabilities-plugins', 'capabilities-agents']

    if (strategySupportSections.indexOf(section) !== -1) {
      parent = { label: 'Strategy Packet', href: '/foundation#overview' }
    } else if (['decisions', 'backlog', 'open-questions', 'system-activity', 'system-health'].indexOf(section) !== -1) {
      parent = { label: 'Foundation Operations', href: '/foundation#backlog' }
    } else if (sourceSections.indexOf(section) !== -1) {
      parent = { label: 'Data Sources', href: '/foundation#source-overview' }
    } else if (inventorySections.indexOf(section) !== -1) {
      parent = { label: 'System Inventory', href: '/foundation#inventory-docs' }
    }

    if (parent && section !== 'home') {
      breadcrumbParent.textContent = parent.label
      breadcrumbParent.href = parent.href
      breadcrumbParent.hidden = false
      breadcrumbParentSep.hidden = false
    } else {
      breadcrumbParent.hidden = true
      breadcrumbParentSep.hidden = true
    }
  }
}

function route() {
  var section = getSection()

  if (section === 'quarterly-priorities' || section === 'strategic-issues') {
    window.location.replace('/strategic-execution#' + section)
    return
  }

  if (section === 'data-health') {
    section = 'system-health'
    window.location.replace('/foundation#system-health')
    return
  }

  if (section === 'source-registry') {
    section = 'source-overview'
    window.location.replace('/foundation#source-overview')
    return
  }

  if (section === 'north-star') {
    window.location.replace('/foundation#bhag-model')
    return
  }

  if (section === 'financial-model') {
    window.location.replace('/foundation#agent-engine')
    return
  }

  updateNav(section)

  /* close mobile nav on route change */
  var nav = document.getElementById('found-nav')
  if (nav) nav.classList.remove('found-nav-open')

  /* scroll to top */
  var main = document.querySelector('.found-main')
  if (main) main.scrollTop = 0

  if (section === 'home') {
    renderFoundationHome()
  } else if (section === 'overview') {
    renderOverview()
  } else if (strategyDocPaths[section]) {
    renderStrategyDoc(section)
  } else if (section === 'backlog') {
    renderBacklog()
  } else if (section === 'decisions') {
    renderDecisions()
  } else if (section === 'open-questions') {
    renderOpenQuestions()
  } else if (sourceSectionConfigs[section]) {
    renderSourceRegistry(section)
  } else if (section === 'inventory-docs') {
    renderInventoryDocs()
  } else if (capabilityCatalog[section]) {
    renderCapabilitySection(section)
  } else if (section === 'system-health') {
    renderDataHealth()
  } else if (section === 'system-activity') {
    renderSystemActivity()
  } else {
    renderOverview()
  }

  applySectionFocus()
}

/* ── init ────────────────────────────────────────────────── */

function init() {
  /* default hash */
  if (!window.location.hash) {
    window.location.hash = '#home'
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

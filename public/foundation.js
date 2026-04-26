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
  flag: 'all',
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

function getFubSourceGroupOrder(groupName) {
  var normalized = groupName || 'Ungrouped'
  if (normalized === 'Ungrouped') return FUB_SOURCE_GROUP_OPTIONS.length + 1
  var idx = FUB_SOURCE_GROUP_OPTIONS.indexOf(normalized)
  return idx === -1 ? FUB_SOURCE_GROUP_OPTIONS.length : idx
}

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
    intro: 'Repo docs and markdown-backed truth only. Use this lane when you want to see which written packets are signed off, what those packets include, and what is still outside the closure.',
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

/* ── data cache ──────────────────────────────────────────── */

var cache = {
  sourceOfTruth: null,
  foundationHub: null,
  systemInventory: null,
  sheetStructureStatus: null,
  fubLeadSources: {},
  ownersLeadSourceGovernance: null,
  ownersReviewQueue: null,
  docs: {},
}
var FOUNDATION_ADMIN_TOKEN_KEY = 'BCREW_ADMIN_TOKEN'
var LEGACY_FOUNDATION_ADMIN_TOKEN_KEY = 'bcrew.foundation.adminToken'

var liveDocPaths = {
  'docs/strategy/bhag-model.md': true,
  'docs/strategy/agent-engine.md': true,
}

var strategyPacketDocPaths = [
  'docs/business-strategy.md',
  'docs/strategy/bhag-model.md',
  'docs/strategy/agent-engine.md',
  'docs/strategy/core-values.md',
  'docs/strategy/department-mandates.md',
  'docs/strategy/marketmasters.md',
  'docs/strategy/governance.md',
]

function isLiveDocPath(docPath) {
  return !!liveDocPaths[docPath]
}

function isStrategyPacketDocPath(docPath) {
  return strategyPacketDocPaths.indexOf(docPath) !== -1
}

function fetchSourceOfTruth() {
  if (cache.sourceOfTruth) return Promise.resolve(cache.sourceOfTruth)

  return foundationRead('/api/source-of-truth').then(function(res) {
    if (!res.ok) throw new Error('Source of truth API failed.')
    return res.json()
  }).then(function(data) {
    cache.sourceOfTruth = data
    return data
  })
}

function fetchFoundationHub() {
  if (cache.foundationHub) return Promise.resolve(cache.foundationHub)

  return foundationRead('/api/foundation-hub').then(function(res) {
    if (!res.ok) throw new Error('Foundation hub API failed.')
    return res.json()
  }).then(function(data) {
    cache.foundationHub = data
    return data
  })
}

function fetchSystemInventory() {
  if (cache.systemInventory) return Promise.resolve(cache.systemInventory)

  return foundationRead('/api/system-inventory').then(function(res) {
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

  return foundationRead('/api/fub/lead-sources?context=' + encodeURIComponent(key)).then(function(res) {
    if (!res.ok) throw new Error('FUB lead-source API failed.')
    return res.json()
  }).then(function(data) {
    cache.fubLeadSources[key] = data
    return data
  })
}

function fetchOwnersLeadSourceGovernance() {
  if (cache.ownersLeadSourceGovernance) return Promise.resolve(cache.ownersLeadSourceGovernance)

  return foundationRead('/api/owners/lead-source-governance').then(function(res) {
    if (!res.ok) throw new Error('Owners lead-source governance API failed.')
    return res.json()
  }).then(function(data) {
    cache.ownersLeadSourceGovernance = data
    return data
  })
}

function fetchOwnersReviewQueue() {
  if (cache.ownersReviewQueue) return Promise.resolve(cache.ownersReviewQueue)

  return foundationRead('/api/owners/review-queue').then(function(res) {
    if (!res.ok) throw new Error('Owners review queue API failed.')
    return res.json()
  }).then(function(data) {
    cache.ownersReviewQueue = data
    return data
  })
}

function fetchSheetStructureStatus() {
  if (cache.sheetStructureStatus) return Promise.resolve(cache.sheetStructureStatus)

  return foundationRead('/api/sheets/structure-status').then(function(res) {
    if (!res.ok) throw new Error('Sheet structure status API failed.')
    return res.json()
  }).then(function(data) {
    cache.sheetStructureStatus = data
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

  return foundationRead(requestUrl, requestOptions).then(function(res) {
    if (!res.ok) throw new Error('Document failed to load.')
    return res.json()
  }).then(function(data) {
    if (!isLiveDocPath(docPath)) cache.docs[docPath] = data
    return data
  })
}

function getStoredAdminToken() {
  try {
    return window.localStorage.getItem(FOUNDATION_ADMIN_TOKEN_KEY) ||
      window.localStorage.getItem(LEGACY_FOUNDATION_ADMIN_TOKEN_KEY) ||
      ''
  } catch {
    return ''
  }
}

function setStoredAdminToken(value) {
  try {
    window.localStorage.removeItem(LEGACY_FOUNDATION_ADMIN_TOKEN_KEY)
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
  cache.ownersLeadSourceGovernance = null
  cache.ownersReviewQueue = null
}

function parseApiErrorPayload(payload, fallbackMessage) {
  if (payload && payload.error && payload.error.message) return payload.error
  return { code: 'unknown_error', message: fallbackMessage || 'Request failed.' }
}

function foundationRead(url, options) {
  var requestOptions = Object.assign({}, options || {})
  var headers = Object.assign({}, requestOptions.headers || {})
  var token = getStoredAdminToken()
  if (token) headers['X-Admin-Token'] = token
  requestOptions.headers = headers
  return fetch(url, requestOptions)
}

function downloadStrategyPdf() {
  foundationRead('/foundation/export/strategy.pdf').then(function(res) {
    if (!res.ok) throw new Error('Strategy PDF failed.')
    return res.blob()
  }).then(function(blob) {
    var blobUrl = URL.createObjectURL(blob)
    var link = document.createElement('a')
    link.href = blobUrl
    link.download = 'benson-crew-business-strategy.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }).catch(function(error) {
    window.alert(error.message || 'Strategy PDF failed.')
  })
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

function controlFoundationJob(job, action, button) {
  var runtimeMode = action === 'pause'
    ? 'paused'
    : (job.scheduleEveryMinutes ? 'scheduled' : 'manual')
  var pauseReason = action === 'pause'
    ? 'Paused from Foundation dashboard.'
    : ''

  if (button) {
    button.disabled = true
    button.textContent = action === 'pause' ? 'Pausing...' : 'Resuming...'
  }

  return foundationMutation('/api/foundation/jobs/' + encodeURIComponent(job.key) + '/control', 'POST', {
    runtimeMode: runtimeMode,
    enabled: true,
    scheduleEveryMinutes: job.scheduleEveryMinutes || null,
    pauseReason: pauseReason,
    actor: 'foundation-dashboard',
  }).then(function() {
    cache.foundationHub = null
    renderDataHealth()
  }).catch(function(error) {
    window.alert('Job control failed: ' + (error.message || 'Unknown error'))
    if (button) {
      button.disabled = false
      button.textContent = action === 'pause' ? 'Pause' : 'Resume'
    }
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
  'current-state': 'docs/rebuild/current-state.md',
  'users': 'docs/users/README.md',
  'user-steve': 'docs/users/steve.md',
  'agents': 'docs/agents/README.md',
  'agent-harlan': 'docs/agents/harlan.md',
  'agent-crewbert': 'docs/agents/crewbert.md',
  'rebuild-plan': 'docs/rebuild/current-plan.md',
}

var foundationDocPathToSection = {
  'docs/strategy/bhag-model.md': 'bhag-model',
  'docs/strategy/agent-engine.md': 'agent-engine',
  'docs/strategy/financial-model-and-assumptions.md': 'agent-engine',
  'docs/strategy/governance.md': 'governance',
  'docs/strategy/department-mandates.md': 'departments',
  'docs/strategy/core-values.md': 'core-values',
  'docs/strategy/marketmasters.md': 'marketmasters',
  'docs/users/README.md': 'users',
  'docs/users/steve.md': 'user-steve',
  'docs/agents/README.md': 'agents',
  'docs/agents/harlan.md': 'agent-harlan',
  'docs/agents/crewbert.md': 'agent-crewbert',
  'docs/rebuild/current-state.md': 'current-state',
  'docs/rebuild/current-runtime-map.md': 'rebuild-plan',
  'docs/rebuild/agent-architecture.md': 'rebuild-plan',
  'docs/rebuild/current-plan.md': 'rebuild-plan',
  'docs/rebuild/rebuild-master-plan.md': 'rebuild-plan',
  'docs/rebuild-decisions.md': 'rebuild-plan',
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
  'current-state': 'Overview',
  'systems': 'Systems',
  'rebuild-plan': 'Rebuild Plan',
  'users': 'Users',
  'user-steve': 'Steve',
  'agents': 'Agents',
  'agent-harlan': 'Harlan',
  'agent-crewbert': 'Crewbert',
  'backlog': 'Backlog',
  'decisions': 'Decisions',
  'open-questions': 'Open Questions',
  'system-strategy': 'System Strategy',
  'system-activity': 'System Activity',
  'system-health': 'Runtime Health',
  'data-health': 'Runtime Health',
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

var sectionParents = {
  'bhag-model': { label: 'Strategy Packet', href: '/foundation#overview' },
  'core-values': { label: 'Strategy Packet', href: '/foundation#overview' },
  'agent-engine': { label: 'Strategy Packet', href: '/foundation#overview' },
  'departments': { label: 'Strategy Packet', href: '/foundation#overview' },
  'governance': { label: 'Strategy Packet', href: '/foundation#overview' },
  'marketmasters': { label: 'Strategy Packet', href: '/foundation#overview' },
  'systems': { label: 'Foundation', href: '/foundation#current-state' },
  'rebuild-plan': { label: 'System Strategy', href: '/foundation#system-strategy' },
  'user-steve': { label: 'Users', href: '/foundation#users' },
  'agent-harlan': { label: 'Agents', href: '/foundation#agents' },
  'agent-crewbert': { label: 'Agents', href: '/foundation#agents' },
  'decisions': { label: 'Foundation Operations', href: '/foundation#backlog' },
  'backlog': { label: 'Foundation Operations', href: '/foundation#backlog' },
  'open-questions': { label: 'Foundation Operations', href: '/foundation#backlog' },
  'system-activity': { label: 'Foundation Operations', href: '/foundation#backlog' },
  'system-health': { label: 'Foundation Operations', href: '/foundation#backlog' },
  'source-overview': { label: 'Data Sources', href: '/foundation#source-overview' },
  'source-docs': { label: 'Data Sources', href: '/foundation#source-overview' },
  'source-sheets': { label: 'Data Sources', href: '/foundation#source-overview' },
  'source-apis': { label: 'Data Sources', href: '/foundation#source-overview' },
  'source-connectors': { label: 'Data Sources', href: '/foundation#source-overview' },
  'inventory-docs': { label: 'System Inventory', href: '/foundation#inventory-docs' },
  'capabilities-skills': { label: 'System Inventory', href: '/foundation#inventory-docs' },
  'capabilities-plugins': { label: 'System Inventory', href: '/foundation#inventory-docs' },
  'capabilities-agents': { label: 'System Inventory', href: '/foundation#inventory-docs' },
}

var rebuildPlanBacklogGroups = [
  {
    key: 'truth-cleanup',
    title: 'Phase 1 · Truth Cleanup',
    intro: 'Stop truth drift between source contracts, notes, docs, and backlog state.',
    ids: ['FOUNDATION-002', 'DATA-004'],
  },
  {
    key: 'verification',
    title: 'Phase 2 · Verification Baseline',
    intro: 'Put one repeatable proof path under Foundation before more automation lands.',
    ids: ['FOUNDATION-VERIFY-001'],
  },
  {
    key: 'strategy-inputs',
    title: 'Phase 3A · Strategy Live Inputs',
    intro: 'Close the full strategy live-input boundary before calling the strategy input layer done.',
    ids: ['SOURCE-014'],
  },
  {
    key: 'source-trust',
    title: 'Phase 3B · Owners/FUB Source Trust',
    intro: 'Owners Admin and FUB source trust are closed for v1. Remaining row cleanup is routed through Ops findings instead of blocking the source package.',
    ids: ['SOURCE-008', 'DATA-005', 'DATA-006', 'DATA-018', 'DATA-019', 'DATA-020'],
  },
  {
    key: 'structure-hardening',
    title: 'Phase 4 · Foundation Structure Hardening',
    intro: 'Fix the root queue model before future hubs calcify around temporary shortcuts.',
    ids: ['SYSTEM-009', 'SYSTEM-006'],
  },
  {
    key: 'memory-baseline',
    title: 'Phase 5 · Memory Baseline',
    intro: 'Only after the trust layer is believable should the first agent-memory layer turn on.',
    ids: ['MEMORY-002'],
  },
  {
    key: 'agent-architecture-lock',
    title: 'Phase 6 · Agent Architecture Lock',
    intro: 'Lock where Harlan lives, where system agents live, and where repo-local coding agents live before live agent sprawl begins.',
    ids: ['AGENT-008', 'SYSTEM-011', 'AGENT-001', 'AGENT-005'],
  },
  {
    key: 'first-agent-loop',
    title: 'Phase 7 · First Agent Loop',
    intro: 'Prove one trusted assistant loop with visible supervision before any second agent loop starts.',
    ids: ['SLICE-001', 'UX-002', 'AGENT-006', 'AGENT-007', 'SYSTEM-010', 'INFRA-003'],
  },
]

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

function getStrategyChangeContext(hub, docPath) {
  var targetPaths = docPath ? [docPath] : strategyPacketDocPaths.slice()
  var targetPathSet = new Set(targetPaths)
  var updates = (hub && hub.pendingDocUpdates || []).filter(function(item) {
    return targetPathSet.has(item.targetDocPath)
  })
  var updateMap = new Map()
  updates.forEach(function(item) {
    updateMap.set(item.id, item)
  })

  var changes = (hub && hub.recentChanges || []).filter(function(item) {
    if (String(item.eventType || '').indexOf('doc_update_') !== 0) return false
    var targetDocPath = item.metadata && item.metadata.targetDocPath
    if (!targetDocPath) {
      var linked = updateMap.get(item.entityId)
      targetDocPath = linked ? linked.targetDocPath : null
    }
    return targetPathSet.has(targetDocPath)
  })

  var linkedDecisionIds = []
  updates.forEach(function(item) {
    if (!item.decisionId) return
    if (linkedDecisionIds.indexOf(item.decisionId) === -1) linkedDecisionIds.push(item.decisionId)
  })

  return {
    targetPaths: targetPaths,
    updates: updates,
    linkedDecisionIds: linkedDecisionIds,
    orphanUpdates: updates.filter(function(item) { return !item.decisionId }),
    openUpdates: updates.filter(function(item) {
      return item.status === 'pending' || item.status === 'approved' || item.status === 'failed'
    }),
    changes: changes,
    appliedChanges: changes.filter(function(item) {
      return item.eventType === 'doc_update_applied'
    }),
  }
}

function renderStrategyChangeWatchPanel(hub, docPath) {
  var context = getStrategyChangeContext(hub, docPath)
  var ledgerItems = buildStrategyLedgerItems(context)

  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Strategy Change Watch'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = docPath ? 'This doc change queue and history' : 'Strategy packet change queue and history'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Meaningful strategy edits should show up here instead of disappearing into silent doc changes. Pending proposals stay reviewable. Applied or rejected updates stay visible as history. Linked decision context should travel with the change.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var statusGrid = document.createElement('div')
  statusGrid.className = 'status-grid'
  statusGrid.appendChild(renderStatusCard({
    label: 'Open proposals',
    status: context.openUpdates.length ? 'pending' : 'connected',
    detail: context.openUpdates.length
      ? context.openUpdates.length + ' strategy doc update proposal' + (context.openUpdates.length === 1 ? '' : 's') + ' still need review / apply.'
      : 'No open strategy doc proposals right now.',
  }))
  statusGrid.appendChild(renderStatusCard({
    label: 'Recent applied',
    status: context.appliedChanges.length ? 'connected' : 'planned',
    detail: context.appliedChanges.length
      ? context.appliedChanges.length + ' applied strategy doc change event' + (context.appliedChanges.length === 1 ? '' : 's') + ' are visible in recent history.'
      : 'No applied strategy doc changes are in the current recent-history window.',
  }))
  statusGrid.appendChild(renderStatusCard({
    label: 'Scope',
    status: 'neutral',
    detail: docPath
      ? 'This panel is scoped to the current doc only.'
      : context.targetPaths.length + ' packet docs are being watched here.',
  }))
  statusGrid.appendChild(renderStatusCard({
    label: 'Decision links',
    status: context.orphanUpdates.length ? 'pending' : (context.linkedDecisionIds.length ? 'connected' : 'neutral'),
    detail: context.orphanUpdates.length
      ? context.orphanUpdates.length + ' proposal' + (context.orphanUpdates.length === 1 ? '' : 's') + ' still have no linked decision. ' + context.linkedDecisionIds.length + ' decision link' + (context.linkedDecisionIds.length === 1 ? '' : 's') + ' are already attached.'
      : context.linkedDecisionIds.length
        ? context.linkedDecisionIds.length + ' decision link' + (context.linkedDecisionIds.length === 1 ? '' : 's') + ' are attached to this watch scope.'
        : 'No linked decisions are in this watch scope yet.',
  }))
  panel.appendChild(statusGrid)

  if (context.openUpdates.length) {
    var queueWrap = document.createElement('details')
    queueWrap.className = 'decision-stack'

    var queueSummary = document.createElement('summary')
    queueSummary.className = 'decision-stack-summary decision-stack-summary-review'

    var queueSummaryLeft = document.createElement('div')
    queueSummaryLeft.className = 'decision-stack-summary-left'

    var queueTitle = document.createElement('div')
    queueTitle.className = 'decision-stack-title'
    queueTitle.textContent = 'Open Strategy Doc Proposals'
    queueSummaryLeft.appendChild(queueTitle)

    var queueIntro = document.createElement('div')
    queueIntro.className = 'decision-stack-intro'
    queueIntro.textContent = 'Review only the meaningful changes you want to promote into the strategy layer.'
    queueSummaryLeft.appendChild(queueIntro)

    queueSummary.appendChild(queueSummaryLeft)

    var queueCount = document.createElement('span')
    queueCount.className = 'decision-stack-count'
    queueCount.textContent = context.openUpdates.length
    queueSummary.appendChild(queueCount)

    queueWrap.appendChild(queueSummary)

    var queueBody = document.createElement('div')
    queueBody.className = 'decision-stack-body'
    context.openUpdates.forEach(function(item) {
      queueBody.appendChild(renderPendingDocUpdateCard(item))
    })
    queueWrap.appendChild(queueBody)
    panel.appendChild(queueWrap)
  }

  if (ledgerItems.length) {
    var historyWrap = document.createElement('details')
    historyWrap.className = 'decision-stack'

    var historySummary = document.createElement('summary')
    historySummary.className = 'decision-stack-summary decision-stack-summary-history'

    var historySummaryLeft = document.createElement('div')
    historySummaryLeft.className = 'decision-stack-summary-left'

    var historyTitle = document.createElement('div')
    historyTitle.className = 'decision-stack-title'
    historyTitle.textContent = docPath ? 'Doc-scoped change annotations' : 'Strategy packet change ledger'
    historySummaryLeft.appendChild(historyTitle)

    var historyIntro = document.createElement('div')
    historyIntro.className = 'decision-stack-intro'
    historyIntro.textContent = docPath
      ? 'These are the visible change annotations for this doc.'
      : 'This is the newest-first visible ledger for strategy changes and their linked decisions.'
    historySummaryLeft.appendChild(historyIntro)

    historySummary.appendChild(historySummaryLeft)

    var historyCount = document.createElement('span')
    historyCount.className = 'decision-stack-count'
    historyCount.textContent = ledgerItems.length
    historySummary.appendChild(historyCount)

    historyWrap.appendChild(historySummary)

    var historyBody = document.createElement('div')
    historyBody.className = 'decision-stack-body'
    ledgerItems.slice(0, 10).forEach(function(item) {
      historyBody.appendChild(renderStrategyLedgerCard(item))
    })
    historyWrap.appendChild(historyBody)
    panel.appendChild(historyWrap)
  }

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

function createActionLink(label, href, className) {
  var link = document.createElement('a')
  link.className = className || 'secondary-button'
  link.href = href
  link.textContent = label
  return link
}

function getSourceValidationCounts(sourceContracts) {
  return (sourceContracts || []).reduce(function(counts, contract) {
    var state = String(contract.validation || '').trim()
    var status = String(contract.status || '').trim()
    if (state === 'Signed Off' || state === 'Signed Off For Current Reality') counts.signedOff += 1
    else if (state === 'Readable Only' || status === 'Verified Readable') counts.readableOnly += 1
    else if (state === 'Partially Signed Off') counts.partial += 1
    else counts.notSignedOff += 1
    return counts
  }, {
    signedOff: 0,
    readableOnly: 0,
    partial: 0,
    notSignedOff: 0,
  })
}

function renderFoundationShortcutCard(item) {
  var article = document.createElement('article')
  article.className = 'section-card foundation-shortcut-card'

  var title = document.createElement('h4')
  title.textContent = item.title
  article.appendChild(title)

  var body = document.createElement('p')
  body.className = 'foundation-shortcut-copy'
  body.textContent = item.body
  article.appendChild(body)

  if (item.meta) {
    var meta = document.createElement('p')
    meta.className = 'foundation-shortcut-meta'
    meta.textContent = item.meta
    article.appendChild(meta)
  }

  var actions = document.createElement('div')
  actions.className = 'foundation-shortcut-actions'
  actions.appendChild(createActionLink(item.cta || 'Open', item.href))
  article.appendChild(actions)

  return article
}

function renderFoundationShortcutPanel(titleText, introText, items, options) {
  if (!items || !items.length) return null

  var opts = options || {}
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = opts.eyebrow || 'Start Here'
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
  grid.className = 'foundation-shortcut-grid'
  items.forEach(function(item) {
    grid.appendChild(renderFoundationShortcutCard(item))
  })
  panel.appendChild(grid)

  return panel
}

function getFoundationHomeSnapshotItems(sourceData, hub) {
  return [
    {
      label: 'Done',
      status: 'connected',
      detail: 'Strategy docs, source contracts, verifier, runtime visibility, subscription-routed LLM proof, extraction control substrate, and SRC-OWNERS-001 are real now.',
    },
    {
      label: 'Open now',
      status: 'pending',
      detail: 'Foundation closeout is paced miners, auth/tier/redaction, SYSTEM-010 controls, Action Router v1, and source trust closures before Strategy Hub.',
    },
    {
      label: 'Not part of closeout yet',
      status: 'risk',
      detail: 'Strategy Hub UI, trusted assistants, and autonomous agents stay blocked until the source-to-action loop and privacy gates are closed.',
    },
  ]
}

function getFoundationHomeWaitingItems() {
  return [
    {
      title: 'Use the active plan, not handoffs',
      body: 'Current Plan and Foundation Overview are the authority. Handoffs, audits, specs, and research are evidence unless promoted.',
      meta: 'Doc authority',
      href: '/doc?path=docs/rebuild/current-plan.md',
      cta: 'Open Current Plan',
    },
    {
      title: 'Close the privacy gate',
      body: 'Auth/tier middleware and subject-person redaction must land before broad hub, assistant, or query access to sensitive comms intelligence.',
      meta: 'P0 Foundation gate',
      href: '/doc?path=docs/specs/2026-04-23-auth-tiers-vault.md',
      cta: 'Open Auth Spec',
    },
    {
      title: 'Close the action loop',
      body: 'Synthesized items must route into decisions, tasks, questions, contradictions, ignore/snooze, or owner-bound actions with source evidence.',
      meta: 'Action Router v1',
      href: '/foundation#current-state',
      cta: 'Open Overview',
    },
    {
      title: 'Finish source trust in order',
      body: 'Owners, FUB, finance, KPI, and marketing source closeouts still matter, but they follow the active Foundation closeout order.',
      meta: 'Source trust',
      href: '/doc?path=docs/rebuild/owners-closeout.md',
      cta: 'Open Owners Closeout',
    },
  ]
}

function getFoundationHomeActionItems() {
  return [
    {
      title: 'Foundation Overview',
      body: 'Shortest read on trusted sources, live systems, open gaps, and next execution.',
      meta: 'Best first click',
      href: '/foundation#current-state',
      cta: 'Open Overview',
    },
    {
      title: 'Rebuild Plan',
      body: 'The active execution order and the locked direction.',
      meta: 'Canonical plan',
      href: '/foundation#rebuild-plan',
      cta: 'Open Plan',
    },
    {
      title: 'Data Sources',
      body: 'Source contracts, FUB review, and trust status.',
      meta: 'Source trust layer',
      href: '/foundation#source-overview',
      cta: 'Open Data Sources',
    },
    {
      title: 'Backlog',
      body: 'Live work queue after you know the state and plan.',
      meta: 'Execution queue',
      href: '/foundation#backlog',
      cta: 'Open Backlog',
    },
  ]
}

function getSourceOverviewSnapshotItems(sourceContracts, sourceConnectors) {
  var counts = getSourceValidationCounts(sourceContracts)

  return [
    {
      label: 'Signed off',
      status: 'connected',
      detail: counts.signedOff + ' validation units are signed off now, including current-reality source signoffs.',
    },
    {
      label: 'Strategy inputs',
      status: 'connected',
      detail: 'Freedom Community, BHAG, Agent Engine, and the strategy-used Owners slice are signed off for the current source package.',
    },
    {
      label: 'FUB',
      status: 'connected',
      detail: 'FUB is readable, the v1 lead-source taxonomy is locked, and remaining invalid-source or missing-link issues route through Ops findings.',
    },
    {
      label: 'Freshness',
      status: 'planned',
      detail: 'Level 3 freshness is not universal yet. ' + (sourceConnectors || []).length + ' connectors are tracked, but connector access does not mean fresh trusted data.',
    },
  ]
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

function renderFoundationJobsPanel(foundationJobs) {
  var jobs = foundationJobs && Array.isArray(foundationJobs.jobs) ? foundationJobs.jobs : []
  if (!jobs.length) return null
  var summary = 'Registered routines the system can run and track. '
    + (foundationJobs.scheduledJobs || 0) + ' scheduled, '
    + (foundationJobs.dueJobs || 0) + ' due, '
    + (foundationJobs.manualJobs || 0) + ' manual.'

  return renderStatusGroupPanel(
    'Foundation Jobs',
    summary,
    jobs.map(function(job) {
      var latest = job.latestRun || null
      var runLine = latest
        ? 'Last ' + latest.status + ' · ' + formatDate(latest.finishedAt || latest.startedAt || latest.createdAt)
        : 'No run recorded'
      var nextLine = job.nextRunAt
        ? ' Next ' + formatDate(job.nextRunAt) + '.'
        : ''
      var scheduleLine = job.scheduleStatus
        ? ' ' + job.scheduleStatus + '.'
        : ''
      var controlLine = job.controlUpdatedAt
        ? ' Control updated ' + formatDate(job.controlUpdatedAt) + (job.controlUpdatedBy ? ' by ' + job.controlUpdatedBy : '') + '.'
        : ''
      var actions = []
      if (job.runtimeMode === 'paused' || job.enabled === false) {
        actions.push({
          label: 'Resume',
          onClick: function(button) {
            controlFoundationJob(job, 'resume', button)
          },
        })
      } else {
        actions.push({
          label: 'Pause',
          secondary: true,
          onClick: function(button) {
            controlFoundationJob(job, 'pause', button)
          },
        })
      }
      return {
        label: job.title,
        status: job.status || 'pending',
        detail: runLine + '.' + nextLine + scheduleLine + controlLine + ' ' + (job.nextAction || job.statusDetail || ''),
        actions: actions,
      }
    })
  )
}

function renderLlmRuntimePanel(llmRuntime) {
  if (!llmRuntime) return null
  var routes = Array.isArray(llmRuntime.routes) ? llmRuntime.routes : []
  var credentials = Array.isArray(llmRuntime.credentials) ? llmRuntime.credentials : []
  if (!routes.length && !credentials.length) return null

  var summary = 'Policy-aware model access. '
    + ((llmRuntime.summary && llmRuntime.summary.availableCredentials) || 0) + '/'
    + ((llmRuntime.summary && llmRuntime.summary.credentialCount) || credentials.length) + ' credentials available, '
    + ((llmRuntime.summary && llmRuntime.summary.availableRoutes) || 0) + '/'
    + ((llmRuntime.summary && llmRuntime.summary.routeCount) || routes.length) + ' routes available.'

  var routeItems = routes.slice(0, 8).map(function(route) {
    var policy = route.policyClassification ? ' Policy: ' + route.policyClassification + '.' : ''
    var auth = route.provider + ' / ' + route.authPath + ' / ' + route.model
    var fallback = route.fallbackRouteKey ? ' Fallback: ' + route.fallbackRouteKey + '.' : ''
    return {
      label: route.routeKey,
      status: route.status === 'available' ? 'live' : route.status === 'blocked' ? 'risk' : 'planned',
      detail: auth + '.' + policy + fallback + ' ' + (route.notes || ''),
    }
  })

  return renderStatusGroupPanel(
    'LLM Runtime',
    summary,
    routeItems
  )
}

function renderExtractionControlPanel(extractionControl) {
  if (!extractionControl) return null
  var targets = Array.isArray(extractionControl.targets) ? extractionControl.targets : []
  if (!targets.length) return null

  var summary = 'Current-day and bounded-backfill crawl targets. '
    + ((extractionControl.summary && extractionControl.summary.currentDayTargets) || 0) + ' current-day, '
    + ((extractionControl.summary && extractionControl.summary.backfillTargets) || 0) + ' backfill, '
    + ((extractionControl.summary && extractionControl.summary.corpusMiningTargets) || 0) + ' corpus-mining, '
    + ((extractionControl.summary && extractionControl.summary.scheduledTargets) || 0) + ' scheduled, '
    + ((extractionControl.summary && extractionControl.summary.pausedTargets) || 0) + ' paused, '
    + ((extractionControl.summary && extractionControl.summary.recentItemFailures) || 0) + ' recent item failures.'

  var items = targets.slice(0, 10).map(function(target) {
    var budget = target.budget || {}
    var budgetParts = []
    if (budget.maxItemsPerRun) budgetParts.push('max ' + budget.maxItemsPerRun + ' items/run')
    if (budget.maxFoldersPerRun) budgetParts.push('max ' + budget.maxFoldersPerRun + ' folder/run')
    if (budget.maxFilesPerRun) budgetParts.push('max ' + budget.maxFilesPerRun + ' files/run')
    var counts = target.inspectedCount + ' inspected, ' + target.archivedCount + ' archived, ' + target.extractedCount + ' extracted.'
    var lastState = target.lastStatus ? ' Last run: ' + target.lastStatus + (target.lastError ? ' — ' + target.lastError : '') + '.' : ''
    var scheduler = target.scheduler || {}
    var schedulerMode = scheduler.runtimeMode || target.runtimeMode
    var schedulerSource = scheduler.source === 'foundation_job' && scheduler.foundationJobKey
      ? ' job ' + scheduler.foundationJobKey
      : ' target'
    var scheduleLine = scheduler.scheduleStatus
      ? ' Schedule: ' + scheduler.scheduleStatus + ' via' + schedulerSource
        + (scheduler.nextRunAt ? ', next ' + formatDate(scheduler.nextRunAt) : '')
        + (scheduler.scheduleDetail ? '. ' + scheduler.scheduleDetail : '.')
      : ''
    var detail = target.sourceId + ' · ' + target.lane + ' · ' + schedulerMode + '. ' + counts
      + (budgetParts.length ? ' Budget: ' + budgetParts.join(', ') + '.' : '')
      + lastState
      + scheduleLine
      + ' ' + (target.notes || '')
    var status = target.status === 'blocked' || target.lastStatus === 'failed' || target.lastStatus === 'partial'
      ? 'risk'
      : target.status === 'active'
        ? 'live'
        : 'planned'
    return {
      label: target.title,
      status: status,
      detail: detail,
    }
  })

  return renderStatusGroupPanel(
    'Extraction Control',
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
  nextIntro.textContent = 'Start here when deciding what to work on next. Closed source packages stay closed unless new evidence proves drift.'
  nextLeft.appendChild(nextIntro)
  nextHeader.appendChild(nextLeft)
  nextPanel.appendChild(nextHeader)

  nextPanel.appendChild(renderTable([
    '| Order | Work | Why it is next |',
    '| --- | --- | --- |',
    '| 1 | Keep source truth clean | Closed source packages stay closed unless new evidence proves drift. New questions route to Data Sources or Backlog. |',
    '| 2 | Monitor capture and extraction | Current-day and history missions should keep filing source-backed artifacts, candidates, skip reasons, and run evidence. |',
    '| 3 | Harden missing corpus lanes | Build the next Drive, email, video, browser, Mycro, Skool, Loom, Zoom, OCR, Slides, Sheets, and Office extraction slices in governed bites. |',
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
  container.innerHTML = '<p>Loading current state...</p>'

  Promise.all([
    fetchDoc('docs/rebuild/current-state.md'),
    fetchFoundationHub(),
    fetchSheetStructureStatus().catch(function() { return null }),
  ]).then(function(results) {
    var doc = results[0]
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

    var heroActions = document.createElement('div')
    heroActions.className = 'foundation-hero-actions'
    heroActions.appendChild(createActionLink('Open Systems', '/foundation#systems'))
    heroActions.appendChild(createActionLink('Open Runtime Health', '/foundation#system-health'))
    heroActions.appendChild(createActionLink('Open Data Sources', '/foundation#source-overview', 'print-button'))
    heroActions.appendChild(createActionLink('Open Ops Hub', '/ops', 'print-button'))
    heroActions.appendChild(createActionLink('Open Backlog', '/foundation#backlog', 'print-button'))
    hero.appendChild(heroActions)

    container.appendChild(hero)

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
        currentSummary: 'The review tool is live, FUB source drift is clear, and v1 source-lineage/company-agent rules are locked. The Lee FUBZahnd middleware repo is now captured as evidence for opportunity re-entry and LeadDate / LeadClaimedDate semantics.',
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
        title: 'KPI foundation system',
        surfaceType: 'Data source',
        sourceId: 'SRC-SUPABASE-001',
        statusKey: 'connected',
        statusLabel: 'Ready for read rules',
        levelLabel: 'Level 2 - read rules locked',
        currentSummary: 'SRC-SUPABASE-001 is readable, the Lee / zahnd-team-dashboard repo and Supabase audit checkpoint are captured, and AI OS has locked first-pass read rules for pipeline, Shopping List, executed deals, goals, competition, and usage.',
        packageParts: [
          {
            sourceId: 'SRC-SUPABASE-001',
            statusKey: 'connected',
            statusLabel: 'Level 2',
            body: 'KPI Supabase is readable and first-pass read rules are locked for pipeline, Shopping List, executed deals, goals, competition, and usage.',
            role: 'KPI source contract',
            next: 'Add visible freshness, schema/code drift review, and Sales Hub health checks before continuous dependency.',
          },
        ],
        next: 'No current-state source-signoff work remains.',
        later: 'Add KPI health checks, visible freshness, schema/code drift review, and future Sales Hub surfaces.',
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
    msg.textContent = 'Failed to load current state: ' + error.message
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
    msg.textContent = 'Failed to load Foundation home: ' + error.message
    container.appendChild(msg)
  })
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
    msg.textContent = 'Failed to load overview: ' + error.message
    container.appendChild(msg)
  })
}

function renderStrategyDoc(sectionKey) {
  var docPath = strategyDocPaths[sectionKey]
  if (!docPath) return

  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading document...</p>'

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
    msg.textContent = 'Failed to load document: ' + error.message
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
  title.textContent = 'Rebuild Plan ↔ Backlog'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'These backlog cards carry the rebuild. If the plan and cards disagree, fix the backlog.'
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

  rebuildPlanBacklogGroups.forEach(function(group) {
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
      empty.textContent = 'No live backlog cards are mapped to this phase yet.'
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
  container.innerHTML = '<p>Loading backlog...</p>'

  fetchFoundationHub().then(function(hub) {
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
      : hub.backlogItems.length + ' active items · workflow-first queue' + (scopeSummary ? ' · ' + scopeSummary : '')
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    if (focusedIds.length) {
      var heroActions = document.createElement('div')
      heroActions.className = 'foundation-hero-actions'
      heroActions.appendChild(createActionLink('Clear Focus', '/foundation#backlog', 'print-button'))
      hero.appendChild(heroActions)
    }
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
    boardIntro.textContent = focusedIds.length
      ? 'This is the exact queue for the surface you clicked. Workflow stage still comes first.'
      : 'Workflow stages are the main view. Priority is secondary.'
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
        ? 'Showing ' + filteredItems.length + ' linked cards · grouped as To Do, To Do Scoped, Doing, Waiting, and Done'
        : 'Showing ' + filteredItems.length + ' ' + scopeLabel + ' · ' + priorityLabel + ' · grouped as To Do, To Do Scoped, Doing, Waiting, and Done'

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

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'This is the Foundation decision ledger: system, rebuild, source, execution, and promoted strategy decisions. It is not yet a complete import of every old strategy-doc decision; that reconciliation belongs to the Strategy / Decision Truth System.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    container.appendChild(renderOperatorToolsDrawer(
      'Operator Tools',
      'Write access, decision logging, and update utilities live here when you need them. The decision log stays readable first.',
      [renderAdminTokenPanel(), renderDecisionCreatePanel(hub)],
      false
    ))

    container.appendChild(renderDecisionReviewPanel(hub))

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
    heroNote.textContent = 'Only real unresolved Foundation questions belong here. Legacy carry-forward questions should be reviewed, resolved, merged, or promoted into backlog so this page does not become a junk drawer.'
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
    if ((contract.validation || contract.status) === 'Signed Off For Current Reality') {
      return { key: 'signed-off', label: 'Signed off for current reality', tone: 'connected' }
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

  if (validation === 'Signed Off' || validation === 'Signed Off For Current Reality') return { label: validation, tone: 'connected' }
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
    Array.isArray(contract.signedOffTabs) ? contract.signedOffTabs.join(' ') : '',
    Array.isArray(contract.verifiedNonSourceTabs) ? contract.verifiedNonSourceTabs.map(function(item) {
      return [item && item.name, item && item.reason].filter(Boolean).join(' ')
    }).join(' ') : '',
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
    'Signed Off For Current Reality': 1,
    'In Review': 2,
    'Partially Signed Off': 3,
    'Readable Only': 4,
    'Not Signed Off': 5,
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

function areAllSourceContractsDocs(contracts) {
  return (contracts || []).length > 0 && (contracts || []).every(function(contract) {
    return getSourceKind(contract).key === 'docs'
  })
}

function renderSourceLinkGroup(labelText, items, currentPath) {
  if (!Array.isArray(items) || !items.length) return null

  var wrap = document.createElement('div')
  wrap.className = 'source-link-group'

  var label = document.createElement('div')
  label.className = 'source-link-group-label'
  label.textContent = labelText
  wrap.appendChild(label)

  var links = document.createElement('div')
  links.className = 'doc-source-actions'
  items.forEach(function(item) {
    if (!item || !item.href) return
    var link = document.createElement('a')
    link.className = 'doc-source-link'
    link.href = buildDocHref(item.href, currentPath || 'docs/business-strategy.md')
    link.textContent = item.label || item.href
    links.appendChild(link)
  })
  wrap.appendChild(links)

  return wrap
}

function renderSourceBulletGroup(labelText, items) {
  if (!Array.isArray(items) || !items.length) return null

  var wrap = document.createElement('div')
  wrap.className = 'source-link-group'

  var label = document.createElement('div')
  label.className = 'source-link-group-label'
  label.textContent = labelText
  wrap.appendChild(label)

  var list = document.createElement('ul')
  list.className = 'source-bullet-list'
  items.forEach(function(item) {
    var text = ''
    if (item && typeof item === 'object') {
      text = [item.name, item.reason].filter(Boolean).join(' — ')
    } else {
      text = String(item || '').trim()
    }
    if (!text) return
    var li = document.createElement('li')
    li.textContent = text
    list.appendChild(li)
  })
  wrap.appendChild(list)

  return wrap
}

function renderSourceContractCard(contract) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'
  var kind = getSourceKind(contract)
  var systemName = getSourceSystemName(contract)
  var unitName = getSourceUnitName(contract) || systemName

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title = document.createElement('h4')
  title.textContent = unitName
  titleWrap.appendChild(title)

  var sourceId = document.createElement('div')
  sourceId.className = 'source-card-id'
  var unitDescriptor = kind.key === 'docs'
    ? systemName
    : (Array.isArray(contract.signedOffTabs) && contract.signedOffTabs.length > 1 ? 'Validation unit in ' + systemName : 'Tab/range in ' + systemName)
  sourceId.textContent = [
    contract.sourceId,
    systemName !== unitName ? unitDescriptor : '',
  ].filter(Boolean).join(' · ')
  titleWrap.appendChild(sourceId)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  var kindTag = kind
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
  if (contract.updateMethod) {
    metaGrid.appendChild(renderSourceMetaItem('Update method', contract.updateMethod))
  }
  if (contract.refreshSchedule) {
    metaGrid.appendChild(renderSourceMetaItem('Schedule now', contract.refreshSchedule))
  }
  article.appendChild(metaGrid)

  if (kind.key === 'docs' && Array.isArray(contract.packetDocs) && contract.packetDocs.length) {
    article.appendChild(renderSourceLinkGroup('Docs in this packet', contract.packetDocs, 'docs/business-strategy.md'))
  }

  if (Array.isArray(contract.signedOffTabs) && contract.signedOffTabs.length) {
    article.appendChild(renderSourceBulletGroup('Signed-off tabs/ranges in this unit', contract.signedOffTabs))
  }

  if (Array.isArray(contract.verifiedNonSourceTabs) && contract.verifiedNonSourceTabs.length) {
    article.appendChild(renderSourceBulletGroup('Verified but not counted as source-owned sign-off', contract.verifiedNonSourceTabs))
  }

  if (contract.owns) {
    var ownsLabel = kind.key === 'docs'
      ? 'What this packet owns'
      : (Array.isArray(contract.signedOffTabs) && contract.signedOffTabs.length > 1 ? 'What this unit owns' : 'What this tab/range owns')
    article.appendChild(renderLabeledCopy('decision-meta', ownsLabel, contract.owns))
  }

  if (contract.validationScope) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Trust boundary', contract.validationScope))
  }

  if (contract.doneMeans) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Closed now', contract.doneMeans))
  }

  if (contract.stillOpen) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Still open', contract.stillOpen))
  }

  if (contract.boundaryNote) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Boundary note', contract.boundaryNote))
  }

  if (contract.manualRefresh) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Manual refresh', contract.manualRefresh))
  }

  appendSourceActions(article, contract.actions || [])
  return article
}

function renderSourceAccordionItem(contract) {
  var details = document.createElement('details')
  details.className = 'source-item'
  if (contract.sourceId) details.id = contract.sourceId

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
  var docsOnly = areAllSourceContractsDocs(contracts)
  var singleDocPacket = docsOnly && contracts.length === 1
  var state = getSourceSystemState(contracts)
  var signedOffUnits = contracts.filter(function(contract) { return getSourcePresence(contract).key === 'signed-off' }).length
  var provisionalUnits = contracts.filter(function(contract) { return getSourcePresence(contract).key === 'connected' }).length
  var signedOffCoverageCount = contracts.reduce(function(sum, contract) {
    return sum + (Array.isArray(contract.signedOffTabs) ? contract.signedOffTabs.length : 0)
  }, 0)
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
  title.textContent = singleDocPacket
    ? (getSourceUnitName(contracts[0]) || group.name)
    : group.name
  left.appendChild(title)

  var intro = document.createElement('div')
  intro.className = 'source-stack-intro'
  intro.textContent = singleDocPacket
    ? [
      group.name,
      state.label,
    ].filter(Boolean).join(' · ')
    : [
      contracts.length + ' ' + (docsOnly ? 'doc source' : 'validation unit') + (contracts.length === 1 ? '' : 's'),
      signedOffUnits ? signedOffUnits + ' signed off' : '',
      signedOffCoverageCount ? signedOffCoverageCount + ' signed-off tabs/ranges' : '',
      provisionalUnits ? provisionalUnits + ' still provisional' : '',
    ].filter(Boolean).join(' · ')
  left.appendChild(intro)

  summary.appendChild(left)

  if (!singleDocPacket) {
    var count = document.createElement('span')
    count.className = 'source-stack-count'
    count.textContent = contracts.length
    summary.appendChild(count)
  }

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-stack-body'

  if (singleDocPacket) {
    var singleContract = contracts[0]
    if (singleContract && singleContract.sourceId) details.id = singleContract.sourceId
    body.appendChild(renderSourceContractCard(singleContract))
    details.appendChild(body)
    return details
  }

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
  systemCardCopy.textContent = docsOnly
    ? 'This is a repo doc packet. Open it when you want to see which written docs are signed off and what is still outside that closure.'
    : (state.key === 'signed-off'
      ? 'This workbook is represented by validation units. Each card lists the actual tabs or ranges covered by that sign-off.'
      : 'Review this workbook by validation unit. A unit may be one tab, one range, or a signed-off group of related tabs.')
  systemCard.appendChild(systemCardCopy)

  var systemCardGrid = document.createElement('div')
  systemCardGrid.className = 'source-card-meta-grid'
  systemCardGrid.appendChild(renderSourceMetaItem(docsOnly ? 'Tracked docs' : 'Validation units', String(contracts.length)))
  if (signedOffCoverageCount) systemCardGrid.appendChild(renderSourceMetaItem('Signed-off tabs/ranges', String(signedOffCoverageCount)))
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
    trustNote.textContent = 'Trust now: ' + signedOffCount + ' signed off · ' + connectedCount + ' readable · ' + verificationCount + ' need verification · ' + gapCount + ' not connected.'
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
  panelIntro.textContent = opts.intro || 'Open each source system to see the exact units being validated underneath it.'
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

    results.textContent = 'Showing ' + filteredContracts.length + ' validation units across ' + groupedSystems.length + ' ' + laneLabel + ' · ' + kindLabelText + ' · ' + stateLabelText

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

function renderGroupedSourceSystemCard(system, sourceContractMap, connectorMap) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title = document.createElement('h4')
  title.textContent = system.title || system.systemId || 'Grouped source system'
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-card-id'
  meta.textContent = system.systemId || 'Grouped system'
  titleWrap.appendChild(meta)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  tags.appendChild(renderSourceTag(system.status || 'Mapped system', 'planned'))
  tags.appendChild(renderSourceTag(system.trustState || 'Cross-source map', 'neutral'))
  article.appendChild(tags)

  var copy = document.createElement('p')
  copy.className = 'source-card-copy'
  copy.textContent = system.purpose || ''
  article.appendChild(copy)

  var sourceIds = Array.isArray(system.sourceIds) ? system.sourceIds : []
  var connectorIds = Array.isArray(system.connectorIds) ? system.connectorIds : []
  var backlogIds = Array.isArray(system.backlogIds) ? system.backlogIds : []

  var grid = document.createElement('div')
  grid.className = 'source-card-meta-grid'
  grid.appendChild(renderSourceMetaItem('Source contracts', String(sourceIds.length)))
  grid.appendChild(renderSourceMetaItem('Connectors', String(connectorIds.length)))
  grid.appendChild(renderSourceMetaItem('Backlog cards', String(backlogIds.length)))
  if (system.trustState) grid.appendChild(renderSourceMetaItem('Boundary', system.trustState))
  article.appendChild(grid)

  var sourceNames = sourceIds.map(function(id) {
    var contract = sourceContractMap[id]
    return contract ? id + ' - ' + contract.title : id
  })
  if (sourceNames.length) {
    article.appendChild(renderSourceBulletGroup('Connected source contracts', sourceNames))
  }

  var connectorNames = connectorIds.map(function(id) {
    var connector = connectorMap[id]
    return connector ? id + ' - ' + connector.title : id
  })
  if (connectorNames.length) {
    article.appendChild(renderSourceBulletGroup('Connector layer', connectorNames))
  }

  if (Array.isArray(system.appliesTo) && system.appliesTo.length) {
    article.appendChild(renderSourceBulletGroup('Applies to', system.appliesTo))
  }

  if (backlogIds.length) {
    article.appendChild(renderSourceBulletGroup('Tracked work', backlogIds))
  }

  appendSourceActions(article, system.actions || [])
  return article
}

function renderGroupedSourceSystemsPanel(groupedSystems, sourceContracts, sourceConnectors) {
  var systems = Array.isArray(groupedSystems) ? groupedSystems : []
  if (!systems.length) return null

  var panel = document.createElement('section')
  panel.className = 'panel source-zone-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')

  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Grouped Systems'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'What these sources power'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'These maps show the big operating systems that cross individual connectors. They explain what each bundle is for and which source contracts feed it.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var sourceContractMap = {}
  ;(sourceContracts || []).forEach(function(contract) {
    if (contract.sourceId) sourceContractMap[contract.sourceId] = contract
  })

  var connectorMap = {}
  ;(sourceConnectors || []).forEach(function(connector) {
    if (connector.connectorId) connectorMap[connector.connectorId] = connector
  })

  var board = document.createElement('div')
  board.className = 'source-contract-stack'
  systems.forEach(function(system) {
    board.appendChild(renderGroupedSourceSystemCard(system, sourceContractMap, connectorMap))
  })
  panel.appendChild(board)
  return panel
}

function buildByKey(items, keyName) {
  var map = {}
  ;(items || []).forEach(function(item) {
    var key = item && item[keyName]
    if (key) map[key] = item
  })
  return map
}

function renderFoundationSystemLinkedList(titleText, items, className) {
  var wrap = document.createElement('div')
  wrap.className = className || 'foundation-system-detail-list'

  var title = document.createElement('div')
  title.className = 'foundation-system-detail-title'
  title.textContent = titleText
  wrap.appendChild(title)

  var list = document.createElement('div')
  list.className = 'foundation-system-detail-items'
  if (!items || !items.length) {
    var empty = document.createElement('span')
    empty.className = 'foundation-system-empty'
    empty.textContent = 'None mapped yet'
    list.appendChild(empty)
  } else {
    items.forEach(function(item) {
      if (item.href) {
        var link = document.createElement('a')
        link.className = 'foundation-system-pill'
        link.href = item.href
        link.textContent = item.label
        list.appendChild(link)
      } else {
        var pill = document.createElement('span')
        pill.className = 'foundation-system-pill'
        pill.textContent = item.label
        list.appendChild(pill)
      }
    })
  }
  wrap.appendChild(list)
  return wrap
}

function renderFoundationSystemBacklogItems(system, backlogMap) {
  var ids = Array.isArray(system.backlogIds) ? system.backlogIds : []
  var items = ids.map(function(id) { return backlogMap[id] || { id: id, title: 'Not in live backlog snapshot', lane: 'missing' } })

  var wrap = document.createElement('div')
  wrap.className = 'foundation-system-backlog'

  var title = document.createElement('div')
  title.className = 'foundation-system-detail-title'
  title.textContent = 'Tracked work'
  wrap.appendChild(title)

  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'foundation-system-empty'
    empty.textContent = 'No backlog cards mapped yet.'
    wrap.appendChild(empty)
    return wrap
  }

  items.forEach(function(item) {
    var row = document.createElement('a')
    row.className = 'foundation-system-backlog-row'
    row.href = item.id ? '/foundation#backlog:' + item.id : '/foundation#backlog'

    var top = document.createElement('div')
    top.className = 'foundation-system-backlog-top'
    var id = document.createElement('span')
    id.textContent = item.id || 'Unknown'
    top.appendChild(id)
    var lane = document.createElement('span')
    lane.textContent = [item.priority, item.lane].filter(Boolean).join(' · ') || 'Not classified'
    top.appendChild(lane)
    row.appendChild(top)

    var itemTitle = document.createElement('div')
    itemTitle.className = 'foundation-system-backlog-title'
    itemTitle.textContent = item.title || 'Untitled backlog item'
    row.appendChild(itemTitle)

    if (item.nextAction) {
      var next = document.createElement('div')
      next.className = 'foundation-system-backlog-next'
      next.textContent = item.nextAction
      row.appendChild(next)
    }

    wrap.appendChild(row)
  })

  return wrap
}

function renderFoundationSystemJobs(system, jobMap, latestRunMap) {
  var keys = Array.isArray(system.runtimeJobKeys) ? system.runtimeJobKeys : []
  var rows = keys.map(function(key) {
    var job = jobMap[key] || { key: key, title: key, runtimeMode: 'unmapped' }
    var run = latestRunMap[key]
    return {
      label: [
        job.key || key,
        job.title && job.title !== job.key ? job.title : '',
      ].filter(Boolean).join(' - '),
      meta: [
        job.enabled === false ? 'disabled' : 'enabled',
        job.runtimeMode || '',
        job.cadence || '',
        run && run.status ? 'latest ' + run.status : '',
      ].filter(Boolean).join(' · '),
    }
  })

  var wrap = document.createElement('div')
  wrap.className = 'foundation-system-jobs'
  var title = document.createElement('div')
  title.className = 'foundation-system-detail-title'
  title.textContent = 'Runtime jobs'
  wrap.appendChild(title)

  if (!rows.length) {
    var empty = document.createElement('p')
    empty.className = 'foundation-system-empty'
    empty.textContent = 'No runtime jobs mapped to this system yet.'
    wrap.appendChild(empty)
    return wrap
  }

  rows.forEach(function(row) {
    var item = document.createElement('div')
    item.className = 'foundation-system-job-row'
    var label = document.createElement('div')
    label.className = 'foundation-system-job-label'
    label.textContent = row.label
    item.appendChild(label)
    var meta = document.createElement('div')
    meta.className = 'foundation-system-job-meta'
    meta.textContent = row.meta || 'No runtime metadata'
    item.appendChild(meta)
    wrap.appendChild(item)
  })

  return wrap
}

function renderFoundationSystemFullCard(system, context) {
  var sourceContractMap = context.sourceContractMap || {}
  var connectorMap = context.connectorMap || {}
  var backlogMap = context.backlogMap || {}
  var jobMap = context.jobMap || {}
  var latestRunMap = context.latestRunMap || {}

  var details = document.createElement('details')
  details.className = 'foundation-system-stack-item'
  if (system.systemId) details.id = system.systemId

  var summary = document.createElement('summary')
  summary.className = 'foundation-system-summary'

  var left = document.createElement('div')
  left.className = 'foundation-system-summary-left'
  var title = document.createElement('div')
  title.className = 'foundation-system-summary-title'
  title.textContent = system.title || system.systemId
  left.appendChild(title)
  var meta = document.createElement('div')
  meta.className = 'foundation-system-summary-meta'
  meta.textContent = [system.systemId, system.maturityLevel, system.status].filter(Boolean).join(' · ')
  left.appendChild(meta)
  summary.appendChild(left)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags foundation-system-summary-tags'
  tags.appendChild(renderSourceTag(system.maturityLabel || system.maturityLevel || 'Mapped', 'neutral'))
  tags.appendChild(renderSourceTag(system.status || 'Mapped', system.status === 'Not built' ? 'missing' : 'planned'))
  summary.appendChild(tags)
  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'foundation-system-body'

  var purpose = document.createElement('p')
  purpose.className = 'foundation-system-purpose'
  purpose.textContent = system.purpose || ''
  body.appendChild(purpose)

  var statusGrid = document.createElement('div')
  statusGrid.className = 'foundation-system-status-grid'
  statusGrid.appendChild(renderSourceMetaItem('Current state', system.currentState || system.trustState || 'Not documented'))
  statusGrid.appendChild(renderSourceMetaItem('Next level plan', system.nextLevelPlan || 'Not documented'))
  statusGrid.appendChild(renderSourceMetaItem('Boundary', system.trustState || 'Not documented'))
  body.appendChild(statusGrid)

  var sourceItems = (system.sourceIds || []).map(function(id) {
    var contract = sourceContractMap[id]
    return {
      label: contract ? id + ' - ' + contract.title : id,
      href: '/foundation#source-overview:' + id,
    }
  })
  body.appendChild(renderFoundationSystemLinkedList('Source contracts', sourceItems))

  var connectorItems = (system.connectorIds || []).map(function(id) {
    var connector = connectorMap[id]
    return {
      label: connector ? id + ' - ' + connector.title : id,
      href: '/foundation#source-connectors:' + id,
    }
  })
  body.appendChild(renderFoundationSystemLinkedList('Connectors', connectorItems))

  if (Array.isArray(system.appliesTo) && system.appliesTo.length) {
    body.appendChild(renderSourceBulletGroup('Applies to', system.appliesTo))
  }

  body.appendChild(renderFoundationSystemJobs(system, jobMap, latestRunMap))
  body.appendChild(renderFoundationSystemBacklogItems(system, backlogMap))
  appendSourceActions(body, system.actions || [])

  details.appendChild(body)
  return details
}

function renderFoundationSystems() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading systems...</p>'

  Promise.all([fetchSourceOfTruth(), fetchFoundationHub()]).then(function(results) {
    var sourceData = results[0]
    var hub = results[1]
    var systems = sourceData.groupedSystems || []
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero'
    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'
    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Foundation Systems'
    heroInner.appendChild(heroTitle)
    var heroCopy = document.createElement('p')
    heroCopy.className = 'hero-copy'
    heroCopy.textContent = 'Full map of the major systems that come together: purpose, maturity level, source contracts, connectors, runtime jobs, notes, backlog, and next-level plan.'
    heroInner.appendChild(heroCopy)
    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = systems.length + ' systems mapped · ' + (sourceData.sources || []).length + ' source contracts · ' + ((hub.foundationJobs && hub.foundationJobs.jobs) || []).length + ' runtime jobs'
    heroInner.appendChild(heroMeta)
    hero.appendChild(heroInner)

    var actions = document.createElement('div')
    actions.className = 'foundation-hero-actions'
    actions.appendChild(createActionLink('Open Overview', '/foundation#current-state'))
    actions.appendChild(createActionLink('Open Runtime Health', '/foundation#system-health', 'print-button'))
    actions.appendChild(createActionLink('Open Data Sources', '/foundation#source-overview', 'print-button'))
    actions.appendChild(createActionLink('Open Menu Audit', '/doc?path=docs/audits/2026-04-26-foundation-menu-and-systems-audit.md', 'print-button'))
    hero.appendChild(actions)
    container.appendChild(hero)

    var statusPanel = renderOverviewStatusPanel([
      {
        label: 'Purpose',
        status: 'connected',
        detail: 'This page answers what each system is for and what has to happen before it reaches the next level.',
      },
      {
        label: 'Source Proof',
        status: 'connected',
        detail: 'Every system lists the source contracts and source notes that prove what AIOS understands.',
      },
      {
        label: 'Execution Path',
        status: 'pending',
        detail: 'Each system lists mapped jobs and backlog cards so next work does not disappear into chat.',
      },
    ], {
      eyebrow: 'How To Use This',
      title: 'Systems Are The Middle Layer',
      intro: 'Sources are the raw inputs. Systems are the operating bundles. Hubs use systems.',
    })
    if (statusPanel) container.appendChild(statusPanel)

    var sourceContractMap = buildByKey(sourceData.sources || [], 'sourceId')
    var connectorMap = buildByKey(sourceData.connectors || [], 'connectorId')
    var backlogMap = buildByKey(hub.backlogItems || [], 'id')
    var jobs = (hub.foundationJobs && hub.foundationJobs.jobs) || []
    var latestRuns = (hub.foundationJobs && hub.foundationJobs.latestRuns) || []
    var jobMap = buildByKey(jobs, 'key')
    var latestRunMap = buildByKey(latestRuns, 'jobKey')

    var panel = document.createElement('section')
    panel.className = 'panel foundation-systems-panel'
    var header = document.createElement('div')
    header.className = 'panel-header'
    var left = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'System Map'
    left.appendChild(eyebrow)
    var title = document.createElement('h3')
    title.textContent = 'Major Foundation Systems'
    left.appendChild(title)
    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = 'Open a system to see the same kind of source-backed detail as the source pages: what it does, what feeds it, which jobs run it, what notes prove it, and what backlog cards move it forward.'
    left.appendChild(intro)
    header.appendChild(left)
    panel.appendChild(header)

    var stack = document.createElement('div')
    stack.className = 'foundation-system-stack'
    systems.forEach(function(system) {
      stack.appendChild(renderFoundationSystemFullCard(system, {
        sourceContractMap,
        connectorMap,
        backlogMap,
        jobMap,
        latestRunMap,
      }))
    })
    panel.appendChild(stack)
    container.appendChild(panel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load systems: ' + error.message
    container.appendChild(msg)
  })
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
  connectorIntro.textContent = opts.intro || 'These are the pipes. Pipe does not equal trust.'
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

function getFubFlagTag(item) {
  if (item.flagState === 'needs_cleanup') return { label: 'Needs cleanup', tone: 'pending' }
  if (item.flagState === 'not_canonical') return { label: 'Invalid Lead Source', tone: 'missing' }
  if (item.flagState === 'merge_candidate') return { label: 'Merge candidate', tone: 'planned' }
  return null
}

function formatDriftAge(hours) {
  if (hours == null || !isFinite(hours)) return 'unknown age'
  if (hours < 1) return 'under 1 hour old'
  if (hours < 24) return Math.round(hours) + ' hour' + (Math.round(hours) === 1 ? '' : 's') + ' old'
  var days = Math.floor(hours / 24)
  return days + ' day' + (days === 1 ? '' : 's') + ' old'
}

function renderFubDriftBucket(titleText, tone, summaryText, items, formatter) {
  var card = document.createElement('article')
  card.className = 'source-drift-pill source-drift-pill-' + tone

  var top = document.createElement('div')
  top.className = 'source-drift-pill-top'

  var title = document.createElement('div')
  title.className = 'source-drift-pill-title'
  title.textContent = titleText
  top.appendChild(title)
  top.appendChild(renderSourceTag(String(items.length), tone))
  card.appendChild(top)

  if (items.length) {
    var list = document.createElement('ul')
    list.className = 'source-drift-list'
    items.slice(0, 8).forEach(function(item) {
      var row = document.createElement('li')
      row.textContent = formatter(item)
      list.appendChild(row)
    })
    if (items.length > 8) {
      var more = document.createElement('li')
      more.textContent = '…and ' + (items.length - 8) + ' more'
      list.appendChild(more)
    }
    card.appendChild(list)
  } else {
    var summary = document.createElement('div')
    summary.className = 'source-drift-pill-summary'
    summary.textContent = summaryText
    card.appendChild(summary)
  }

  return card
}

function renderFubLeadSourceDriftPanel(loaded) {
  var drift = loaded && loaded.drift ? loaded.drift : null
  if (!drift) return null

  var wrap = document.createElement('div')
  wrap.className = 'source-drift-wrap'

  var intro = document.createElement('div')
  intro.className = 'source-layer-divider'
  if (drift.status === 'no_snapshot') {
    intro.textContent = 'Drift watch is waiting on the first saved snapshot. Run Refresh Snapshot once, then this panel will show new names, legacy values, open classifications, and stale-state.'
    wrap.appendChild(intro)
    return wrap
  }

  var parts = []
  parts.push(drift.stats.reviewNow ? drift.stats.reviewNow + ' review item' + (drift.stats.reviewNow === 1 ? '' : 's') : 'No active review items')
  parts.push('Snapshot is ' + formatDriftAge(drift.stale.ageHours))
  if (drift.stale.isStale) parts.push('manual refresh is overdue')
  if (loaded.freshness && loaded.freshness.label) parts.push('review freshness: ' + loaded.freshness.label)
  intro.textContent = 'Drift watch: ' + parts.join(' · ')
  wrap.appendChild(intro)

  var actionableBuckets = [
    {
      title: 'New names with no rule',
      tone: drift.buckets.needsRules.length ? 'missing' : 'connected',
      summary: drift.buckets.needsRules.length
        ? 'These raw source names exist in FUB right now but are not yet governed.'
        : 'No raw source names are waiting for a first rule.',
      items: drift.buckets.needsRules,
      formatter: function(item) {
        var tail = item.defaultFlagState && item.defaultFlagState !== 'none'
          ? ' · default flag ' + item.defaultFlagState
          : ''
        return item.source + ' · ' + item.count + tail
      },
    },
    {
      title: 'Open classifications',
      tone: drift.buckets.openClassification.length ? 'pending' : 'connected',
      summary: drift.buckets.openClassification.length
        ? 'These names still leave marketing or ownership open.'
        : 'Marketing and ownership are classified for every current source.',
      items: drift.buckets.openClassification,
      formatter: function(item) {
        var gaps = []
        if (item.openMarketing) gaps.push('marketing')
        if (item.openOwnership) gaps.push('ownership')
        return item.source + ' · ' + item.count + ' · open ' + gaps.join(' + ')
      },
    },
    {
      title: 'Legacy or invalid names still live',
      tone: drift.buckets.legacyPresent.length ? 'missing' : 'connected',
      summary: drift.buckets.legacyPresent.length
        ? 'These names are still live and need cleanup.'
        : 'No flagged legacy names are showing up right now.',
      items: drift.buckets.legacyPresent,
      formatter: function(item) {
        return item.source + ' · ' + item.count + ' · ' + item.flagState
      },
    },
  ]

  var nonEmptyBuckets = actionableBuckets.filter(function(bucket) {
    return bucket.items.length
  })

  if (!nonEmptyBuckets.length) return wrap

  var reviewDetails = document.createElement('details')
  reviewDetails.className = 'source-drift-accordion'

  var reviewSummary = document.createElement('summary')
  reviewSummary.className = 'source-drift-accordion-summary'
  reviewSummary.textContent = 'Open review queue'
  reviewDetails.appendChild(reviewSummary)

  var grid = document.createElement('div')
  grid.className = 'source-drift-grid'
  nonEmptyBuckets.forEach(function(bucket) {
    grid.appendChild(renderFubDriftBucket(
      bucket.title,
      bucket.tone,
      bucket.summary,
      bucket.items,
      bucket.formatter
    ))
  })
  reviewDetails.appendChild(grid)
  wrap.appendChild(reviewDetails)
  return wrap
}

function renderOwnersLeadSourceGovernancePanel(loaded) {
  var drift = loaded && loaded.drift ? loaded.drift : null
  if (!drift) return null

  var wrap = document.createElement('div')
  wrap.className = 'source-drift-wrap'

  var intro = document.createElement('div')
  intro.className = 'source-layer-divider'
  if (drift.status === 'no_data') {
    intro.textContent = 'Owners governed dropdown watch could not read the live list yet.'
    wrap.appendChild(intro)
    return wrap
  }

  var parts = []
  parts.push(drift.stats.reviewNow ? drift.stats.reviewNow + ' review item' + (drift.stats.reviewNow === 1 ? '' : 's') : 'No active review items')
  parts.push(drift.stats.uniqueCurrentValues + ' live dropdown value' + (drift.stats.uniqueCurrentValues === 1 ? '' : 's'))
  parts.push(drift.stats.governedValues + ' governed value' + (drift.stats.governedValues === 1 ? '' : 's'))
  if (loaded.ownersList && loaded.ownersList.modifiedTime) {
    parts.push('list updated ' + formatAsOfDate(loaded.ownersList.modifiedTime))
  }
  if (loaded.freshness && loaded.freshness.label) parts.push('review freshness: ' + loaded.freshness.label)
  intro.textContent = 'Dropdown drift watch: ' + parts.join(' · ')
  wrap.appendChild(intro)

  var grid = document.createElement('div')
  grid.className = 'source-drift-grid'

  grid.appendChild(renderFubDriftBucket(
    'Unexpected values live in Owners',
    drift.buckets.unexpectedInOwnersList.length ? 'missing' : 'connected',
    drift.buckets.unexpectedInOwnersList.length
      ? 'These values are still in the live dropdown but are not approved in the governed taxonomy.'
      : 'The live dropdown contains only governed lead-source values.',
    drift.buckets.unexpectedInOwnersList,
    function(item) {
      return item.value + ' · ' + item.count
    }
  ))

  grid.appendChild(renderFubDriftBucket(
    'Approved values missing from Owners',
    drift.buckets.missingFromOwnersList.length ? 'pending' : 'connected',
    drift.buckets.missingFromOwnersList.length
      ? 'These approved taxonomy values are missing from the live dropdown.'
      : 'Every governed lead-source value is present in the live dropdown.',
    drift.buckets.missingFromOwnersList,
    function(item) {
      return item.value
    }
  ))

  grid.appendChild(renderFubDriftBucket(
    'Duplicate dropdown values',
    drift.buckets.duplicates.length ? 'pending' : 'connected',
    drift.buckets.duplicates.length
      ? 'These values appear more than once in the live dropdown.'
      : 'No duplicate values are present in the live dropdown.',
    drift.buckets.duplicates,
    function(item) {
      return item.value + ' · ' + item.count + ' copies'
    }
  ))

  var actions = document.createElement('div')
  actions.className = 'doc-source-actions'
  ;[
    { href: '/foundation#source-apis:fub-lead-source-taxonomy', label: 'Open FUB Review' },
    { href: '/foundation#rebuild-plan', label: 'Open Rebuild Plan' },
  ].forEach(function(action) {
    var link = document.createElement('a')
    link.className = 'doc-source-link'
    link.href = action.href
    link.textContent = action.label
    actions.appendChild(link)
  })

  wrap.appendChild(grid)
  wrap.appendChild(actions)
  return wrap
}

function renderFubLeadSourceRuleItem(item, onSaved, contextKey) {
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
  var flagTag = getFubFlagTag(item)
  if (flagTag) right.appendChild(renderSourceTag(flagTag.label, flagTag.tone))
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

  var flagSelect = buildSelect([
    { value: 'none', label: 'None', selected: !item.flagState || item.flagState === 'none' },
    { value: 'needs_cleanup', label: 'Needs cleanup', selected: item.flagState === 'needs_cleanup' },
    { value: 'not_canonical', label: 'Invalid Lead Source', selected: item.flagState === 'not_canonical' },
    { value: 'merge_candidate', label: 'Merge candidate', selected: item.flagState === 'merge_candidate' },
  ])
  grid.appendChild(buildField('Flag', flagSelect))

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
      context: contextKey || 'owner',
      source: item.source,
      marketingType: marketingSelect.value,
      ownershipType: ownershipSelect.value,
      flagState: flagSelect.value,
      sourceGroup: groupSelect.value || null,
      notes: notesInput.value.trim() || null,
    }).then(function(payload) {
      var rule = payload.rule || {}
      item.marketingType = rule.marketingType || marketingSelect.value
      item.ownershipType = rule.ownershipType || ownershipSelect.value
      item.flagState = rule.flagState || flagSelect.value || 'none'
      item.sourceGroup = rule.sourceGroup || null
      item.notes = rule.notes || null
      item.updatedAt = rule.updatedAt || null
      item.updatedBy = rule.updatedBy || null
      setFormStatus(status, 'Saved.', 'success')
      stamp.textContent = item.updatedAt
        ? 'Last saved ' + formatDate(item.updatedAt) + (item.updatedBy ? ' · ' + item.updatedBy : '')
        : 'Saved'
      if (typeof onSaved === 'function') onSaved(payload.current || null)
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

  var flagFilter = buildSelect([
    { value: 'all', label: 'All flag states', selected: fubLeadSourceViewState.flag === 'all' },
    { value: 'flagged', label: 'Flagged only', selected: fubLeadSourceViewState.flag === 'flagged' },
    { value: 'none', label: 'No flag', selected: fubLeadSourceViewState.flag === 'none' },
    { value: 'needs_cleanup', label: 'Needs cleanup', selected: fubLeadSourceViewState.flag === 'needs_cleanup' },
    { value: 'not_canonical', label: 'Invalid Lead Source', selected: fubLeadSourceViewState.flag === 'not_canonical' },
    { value: 'merge_candidate', label: 'Merge candidate', selected: fubLeadSourceViewState.flag === 'merge_candidate' },
  ])

  var topGrid = document.createElement('div')
  topGrid.className = 'memory-form-grid'
  topGrid.appendChild(buildField('Context', contextSelect))
  topGrid.appendChild(buildField('Search', queryInput))
  topGrid.appendChild(buildField('Marketing filter', marketingFilter))
  topGrid.appendChild(buildField('Ownership filter', ownershipFilter))
  topGrid.appendChild(buildField('Flag filter', flagFilter))
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

  var driftWrap = document.createElement('div')
  body.appendChild(driftWrap)

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
    summaryRight.appendChild(renderSourceTag((stats.openClassification || 0) + ' open', stats.openClassification ? 'pending' : 'connected'))
    summaryRight.appendChild(renderSourceTag((stats.flagged || 0) + ' flagged', stats.flagged ? 'missing' : 'connected'))
    summaryRight.appendChild(renderSourceTag(snapshot.available ? 'Snapshot ready' : 'Needs refresh', snapshot.available ? 'connected' : 'pending'))
  }

  function filteredSources() {
    if (!loaded) return []
    return (loaded.sources || []).filter(function(item) {
      if (fubLeadSourceViewState.marketing !== 'all' && item.marketingType !== fubLeadSourceViewState.marketing) return false
      if (fubLeadSourceViewState.ownership !== 'all' && item.ownershipType !== fubLeadSourceViewState.ownership) return false
      if (fubLeadSourceViewState.flag === 'flagged' && (!item.flagState || item.flagState === 'none')) return false
      if (fubLeadSourceViewState.flag !== 'all' && fubLeadSourceViewState.flag !== 'flagged' && (item.flagState || 'none') !== fubLeadSourceViewState.flag) return false
      var query = fubLeadSourceViewState.query.trim().toLowerCase()
      if (!query) return true
      return [
        item.source,
        item.notes,
        item.flagState,
        item.sourceGroup,
        item.marketingType,
        item.ownershipType,
      ].filter(Boolean).join(' ').toLowerCase().indexOf(query) !== -1
    }).sort(function(a, b) {
      var groupCompare = getFubSourceGroupOrder(a.sourceGroup || 'Ungrouped') - getFubSourceGroupOrder(b.sourceGroup || 'Ungrouped')
      if (groupCompare !== 0) return groupCompare
      if (b.count !== a.count) return b.count - a.count
      return a.source.localeCompare(b.source)
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
      ' · ' + (stats.unclassifiedMarketing || 0) + ' marketing open' +
      ' · ' + (stats.unclassifiedOwnership || 0) + ' ownership open' +
      ' · ' + (stats.flagged || 0) + ' flagged' +
      ' · ' + (scan.peopleScanned || 0) + ' contacts scanned across ' + (scan.pagesScanned || 0) + ' pages' +
      (scan.truncated ? ' · refresh hit the safety cap' : '')

    driftWrap.innerHTML = ''
    var driftPanel = renderFubLeadSourceDriftPanel(loaded)
    if (driftPanel) driftWrap.appendChild(driftPanel)

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

    var groupedItems = {}
    items.forEach(function(item) {
      var groupName = item.sourceGroup || 'Ungrouped'
      if (!groupedItems[groupName]) groupedItems[groupName] = []
      groupedItems[groupName].push(item)
    })

    Object.keys(groupedItems).sort(function(a, b) {
      return getFubSourceGroupOrder(a) - getFubSourceGroupOrder(b)
    }).forEach(function(groupName) {
      var sectionItems = groupedItems[groupName]
      var totalContacts = sectionItems.reduce(function(sum, item) {
        return sum + (Number(item.count) || 0)
      }, 0)

      var groupHeader = document.createElement('div')
      groupHeader.className = 'source-layer-divider'
      groupHeader.textContent =
        groupName +
        ' · ' + sectionItems.length + ' source' + (sectionItems.length === 1 ? '' : 's') +
        ' · ' + totalContacts + ' contact' + (totalContacts === 1 ? '' : 's')
      list.appendChild(groupHeader)

      sectionItems.forEach(function(item) {
        list.appendChild(renderFubLeadSourceRuleItem(item, function(nextPayload) {
          if (nextPayload) loaded = nextPayload
          renderLoaded()
        }, fubLeadSourceViewState.context))
      })
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
  flagFilter.addEventListener('change', function() {
    fubLeadSourceViewState.flag = flagFilter.value
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
    heroCopy.textContent = 'File-level inventory. Use this page when auditing what exists in the repo.'
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
      intro: 'Every doc should be surfaced, inventoried, or deliberately private with a reason.',
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
    intro.textContent = 'Everything tracked in git is grouped below.'
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
      privateIntro.textContent = 'These files are listed here on purpose, but not exposed in the shared UI by default.'
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
      eyebrow: 'Lane State',
      title: config.title + ' state',
      intro: 'This lane is separate from Data Sources.',
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
    catalogIntro.textContent = 'Current lane-level view.'
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

    if (section === 'source-overview') {
      container.appendChild(renderOverviewStatusPanel(
        getSourceOverviewSnapshotItems(sourceContracts, sourceConnectors),
        {
          eyebrow: 'Right Now',
          title: 'What Is Actually Trusted',
          intro: 'Signed off and fresh are not the same thing.',
        }
      ))

      var groupedPanel = renderGroupedSourceSystemsPanel(data.groupedSystems || [], sourceContracts, sourceConnectors)
      if (groupedPanel) container.appendChild(groupedPanel)

      container.appendChild(renderFoundationShortcutPanel(
        'Open The Right Source Surfaces',
        'Use these links instead of scanning the whole source model every time.',
        [
          {
            title: 'Strategy Inputs',
            body: 'Freedom Community, BHAG, Agent Engine, Owners, finance, FUB, and KPI are visible from the Foundation overview.',
            meta: 'Foundation overview',
            href: '/foundation#current-state',
            cta: 'Open Overview',
          },
        {
          title: 'FUB Review',
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
            title: 'Foundation Overview',
            body: 'If you want the shortest possible answer to what is ready, open, and later, start there first.',
            meta: 'Tight rebuild read',
            href: '/foundation#current-state',
            cta: 'Open Overview',
          },
        ]
      ))

      container.appendChild(renderOperatorToolsDrawer(
        'How To Read This',
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
      container.appendChild(renderFubLeadSourceManagerPanel())
    }

    if (config.showSystems && config.showConnectors) {
      var divider = document.createElement('div')
      divider.className = 'source-layer-divider'
      divider.textContent = 'Below this line is the connector layer.'
      container.appendChild(divider)
    }

    if (config.showConnectors) {
      container.appendChild(renderSourceConnectorsPanel(sourceConnectors, {
        eyebrow: 'Connector Layer',
        title: 'Connections and access paths',
        intro: 'These are the pipes. Pipe does not equal trust.',
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
  }).finally(function() {
    applySectionFocus()
  })
}

function renderDataHealth() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading runtime health...</p>'

  fetchFoundationHub().then(function(hub) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Runtime Health'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = hub.memoryStatus.length + ' trust-layer components tracked'
    heroInner.appendChild(heroMeta)

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'Operator view for jobs, LLM routes, extraction targets, source-crawl queues, and low-level runtime checks.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var jobsPanel = renderFoundationJobsPanel(hub.foundationJobs)
    if (jobsPanel) container.appendChild(jobsPanel)

    var intelligencePanel = renderIntelligencePipelinePanel(hub.sharedCommunicationsCoverage, hub.sharedCommunicationSynthesis)
    if (intelligencePanel) container.appendChild(intelligencePanel)

    var llmPanel = renderLlmRuntimePanel(hub.llmRuntime)
    if (llmPanel) container.appendChild(llmPanel)

    var extractionPanel = renderExtractionControlPanel(hub.extractionControl)
    if (extractionPanel) container.appendChild(extractionPanel)

    var driveCorpusPanel = renderDriveCorpusInventoryPanel(hub.driveCorpusInventory)
    if (driveCorpusPanel) container.appendChild(driveCorpusPanel)

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
    msg.textContent = 'Failed to load runtime health: ' + error.message
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
    heroNote.textContent = 'Short audit feed for operator review and debugging.'
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

  var attempts = 0

  function openDetailsChain(target) {
    var node = target
    while (node) {
      if (node.tagName === 'DETAILS') node.open = true
      node = node.parentElement
    }
  }

  function tryFocus() {
    var target = document.getElementById(focusId)
    if (target) {
      openDetailsChain(target)
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    attempts += 1
    if (attempts < 12) {
      window.setTimeout(tryFocus, 120)
    }
  }

  window.requestAnimationFrame(tryFocus)
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
    var parent = sectionParents[section] || null

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

  if (section === 'home') {
    window.location.replace('/foundation#current-state')
    return
  }

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

  if (section === 'ops-hub') {
    window.location.replace('/ops')
    return
  }

  updateNav(section)

  /* close mobile nav on route change */
  var nav = document.getElementById('found-nav')
  if (nav) nav.classList.remove('found-nav-open')

  /* scroll to top */
  var main = document.querySelector('.found-main')
  if (main) main.scrollTop = 0

  if (section === 'current-state') {
    renderCurrentState()
  } else if (section === 'systems') {
    renderFoundationSystems()
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
    window.location.hash = '#current-state'
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

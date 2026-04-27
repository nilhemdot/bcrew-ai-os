function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return date.toLocaleString()
}

function getSection() {
  var hash = window.location.hash.replace('#', '')
  return hash || 'overview'
}

function getAdminHeaders() {
  try {
    var token = window.localStorage && window.localStorage.getItem('BCREW_ADMIN_TOKEN')
    return token ? { 'X-Admin-Token': token } : {}
  } catch (error) {
    return {}
  }
}

function fetchWithAdmin(url) {
  return fetch(url, { headers: getAdminHeaders() })
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

var strategicDocPaths = {
  'quarterly-priorities': 'docs/strategy/quarterly-priorities.md',
  'strategic-issues': 'docs/strategy/strategic-issues.md',
}

var foundationDocPathToSection = {
  'docs/business-strategy.md': 'overview',
  'docs/strategy/bhag-model.md': 'bhag-model',
  'docs/strategy/core-values.md': 'core-values',
  'docs/strategy/agent-engine.md': 'agent-engine',
  'docs/strategy/marketmasters.md': 'marketmasters',
  'docs/strategy/governance.md': 'governance',
  'docs/strategy/department-mandates.md': 'departments',
  'docs/strategy/financial-model-and-assumptions.md': 'agent-engine',
  'docs/source-registry.md': 'source-registry',
}

var strategicExecutionDocPathToSection = {
  'docs/strategy/quarterly-priorities.md': 'quarterly-priorities',
  'docs/strategy/strategic-issues.md': 'strategic-issues',
}

var sectionSupportDocs = {
  'Current Quarter': {
    label: 'Open quarterly priorities',
    path: 'docs/strategy/quarterly-priorities.md',
  },
}

var STRATEGY_ADVISOR_MESSAGES_KEY = 'bcrew.strategyAdvisor.messages.v1'
var STRATEGY_ADVISOR_MODE_KEY = 'bcrew.strategyAdvisor.mode.v1'

var sectionLabels = {
  'overview': 'Overview',
  'advisor': 'Strategy Advisor',
  'evidence-packet': 'Evidence Packet',
  'quarterly-priorities': 'Quarterly Priorities',
  'strategic-issues': 'Strategic Issues',
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

function renderSupportingDocsCard() {
  var article = document.createElement('article')
  article.className = 'section-card'

  var title = document.createElement('h4')
  title.textContent = 'Supporting Docs'
  article.appendChild(title)

  var list = document.createElement('ul')
  ;[
    'Quarterly Priorities',
    'Strategic Issues',
  ].forEach(function(itemText) {
    var li = document.createElement('li')
    li.textContent = itemText
    list.appendChild(li)
  })
  article.appendChild(list)

  var prioritiesLink = document.createElement('a')
  prioritiesLink.className = 'section-support-link'
  prioritiesLink.href = '/strategic-execution#quarterly-priorities'
  prioritiesLink.textContent = 'Open quarterly priorities'

  var issuesLink = document.createElement('a')
  issuesLink.className = 'section-support-link'
  issuesLink.href = '/strategic-execution#strategic-issues'
  issuesLink.textContent = 'Open strategic issues'

  var actions = document.createElement('div')
  actions.className = 'section-support-actions'
  actions.appendChild(prioritiesLink)
  actions.appendChild(issuesLink)
  article.appendChild(actions)

  return article
}

var cache = {
  sourceOfTruth: null,
  docs: {},
  strategyEvidencePacket: null,
  strategyPreworkCoverage: null,
  strategyGoalTruth: null,
  strategyOperatingTruth: null,
  strategyAdvisorMessages: loadStrategyAdvisorMessages(),
  strategyAdvisorMode: loadStrategyAdvisorMode(),
}

var strategyAdvisorHelperReady = false

function normalizeStrategyAdvisorMode(mode) {
  return mode === 'deep' ? 'deep' : 'fast'
}

function getStrategyAdvisorModeLabel(mode) {
  return normalizeStrategyAdvisorMode(mode) === 'deep' ? 'Deep / XHigh' : 'Fast'
}

function loadStrategyAdvisorMode() {
  try {
    var saved = window.sessionStorage && window.sessionStorage.getItem(STRATEGY_ADVISOR_MODE_KEY)
    return normalizeStrategyAdvisorMode(saved)
  } catch (error) {
    return 'fast'
  }
}

function saveStrategyAdvisorMode(mode) {
  try {
    if (window.sessionStorage) {
      window.sessionStorage.setItem(STRATEGY_ADVISOR_MODE_KEY, normalizeStrategyAdvisorMode(mode))
    }
  } catch (error) {}
}

function loadStrategyAdvisorMessages() {
  try {
    var raw = window.sessionStorage && window.sessionStorage.getItem(STRATEGY_ADVISOR_MESSAGES_KEY)
    if (!raw) return []
    var parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(function(message) {
        return message && (message.role === 'user' || message.role === 'assistant') && typeof message.text === 'string'
      })
      .slice(-80)
      .map(function(message) {
        return {
          role: message.role,
          text: message.text,
          meta: typeof message.meta === 'string' ? message.meta : '',
        }
      })
  } catch (error) {
    return []
  }
}

function saveStrategyAdvisorMessages() {
  try {
    if (window.sessionStorage) {
      window.sessionStorage.setItem(
        STRATEGY_ADVISOR_MESSAGES_KEY,
        JSON.stringify(cache.strategyAdvisorMessages.slice(-80))
      )
    }
  } catch (error) {}
}

function ensureStrategyAdvisorWelcome() {
  if (cache.strategyAdvisorMessages.length) return
  cache.strategyAdvisorMessages.push({
    role: 'assistant',
    text: 'I am wired to the latest strategy evidence packet and live Foundation truth. Use Fast for live strategy conversation and Deep / XHigh when you want the smartest available subscription-route synthesis.',
    meta: 'Local thread saved for this browser session',
  })
  saveStrategyAdvisorMessages()
}

function pushStrategyAdvisorMessage(role, text, meta) {
  cache.strategyAdvisorMessages.push({ role: role, text: text, meta: meta || '' })
  cache.strategyAdvisorMessages = cache.strategyAdvisorMessages.slice(-80)
  saveStrategyAdvisorMessages()
  appendAdvisorMessage(role, text, meta || '')
}

function setStrategyAdvisorStatus(text, selectedStatus) {
  if (selectedStatus) selectedStatus.textContent = text
  var statuses = document.querySelectorAll('[data-strategy-advisor-status="true"]')
  statuses.forEach(function(status) {
    status.textContent = text
  })
}

function updateStrategyAdvisorModeControls() {
  var mode = normalizeStrategyAdvisorMode(cache.strategyAdvisorMode)
  var label = getStrategyAdvisorModeLabel(mode)
  document.querySelectorAll('[data-strategy-advisor-mode]').forEach(function(button) {
    var isActive = button.dataset.strategyAdvisorMode === mode
    button.classList.toggle('strategy-mode-button-active', isActive)
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
  })
  document.querySelectorAll('[data-strategy-advisor-mode-label]').forEach(function(node) {
    node.textContent = label + ' mode'
  })
}

function setStrategyAdvisorMode(mode) {
  cache.strategyAdvisorMode = normalizeStrategyAdvisorMode(mode)
  saveStrategyAdvisorMode(cache.strategyAdvisorMode)
  updateStrategyAdvisorModeControls()
}

function buildStrategyAdvisorModeControl() {
  var wrap = document.createElement('div')
  wrap.className = 'strategy-mode-toggle'
  wrap.setAttribute('role', 'group')
  wrap.setAttribute('aria-label', 'Strategy advisor answer mode')

  ;[
    ['fast', 'Fast', 'Live meeting mode with compact context and shorter answers'],
    ['deep', 'Deep / XHigh', 'Smartest available subscription-route synthesis with wider context'],
  ].forEach(function(option) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'strategy-mode-button'
    button.dataset.strategyAdvisorMode = option[0]
    button.title = option[2]
    button.textContent = option[1]
    button.addEventListener('click', function() {
      setStrategyAdvisorMode(option[0])
    })
    wrap.appendChild(button)
  })

  return wrap
}

function getStrategyAdvisorPrompts() {
  return [
    'Which departments are stuck, and what evidence proves it?',
    'What should tomorrow strategy session decide first?',
    'Map the biggest issues to Attract, Grow, Retain.',
    'What data is missing before we lock Q2 priorities?',
    'What are the top questions we should ask the team tomorrow?',
    'Where are we confusing symptoms with root causes?',
  ]
}

function fetchSourceOfTruth() {
  if (cache.sourceOfTruth) return Promise.resolve(cache.sourceOfTruth)

  return fetchWithAdmin('/api/source-of-truth').then(function(res) {
    if (!res.ok) throw new Error('Source of truth API failed.')
    return res.json()
  }).then(function(data) {
    cache.sourceOfTruth = data
    return data
  })
}

function fetchDoc(docPath) {
  if (cache.docs[docPath]) return Promise.resolve(cache.docs[docPath])

  return fetchWithAdmin('/api/doc?path=' + encodeURIComponent(docPath)).then(function(res) {
    if (!res.ok) throw new Error('Document failed to load.')
    return res.json()
  }).then(function(data) {
    cache.docs[docPath] = data
    return data
  })
}

function fetchStrategyEvidencePacket() {
  if (cache.strategyEvidencePacket) return Promise.resolve(cache.strategyEvidencePacket)

  return fetchWithAdmin('/api/shared-communications/synthesis?packetType=strategy_evidence_packet_v1&limit=1&itemLimit=30').then(function(res) {
    if (!res.ok) throw new Error('Strategy evidence packet API failed.')
    return res.json()
  }).then(function(data) {
    cache.strategyEvidencePacket = data
    return data
  })
}

function fetchStrategyPreworkCoverage() {
  if (cache.strategyPreworkCoverage) return Promise.resolve(cache.strategyPreworkCoverage)

  return fetchWithAdmin('/api/strategic-execution/prework-coverage').then(function(res) {
    if (!res.ok) throw new Error('Strategy pre-work coverage API failed.')
    return res.json()
  }).then(function(data) {
    cache.strategyPreworkCoverage = data
    return data
  })
}

function fetchStrategyGoalTruth() {
  if (cache.strategyGoalTruth) return Promise.resolve(cache.strategyGoalTruth)

  return fetchWithAdmin('/api/strategic-execution/goal-truth').then(function(res) {
    if (!res.ok) throw new Error('Strategy goal truth API failed.')
    return res.json()
  }).then(function(data) {
    cache.strategyGoalTruth = data
    return data
  })
}

function fetchStrategyOperatingTruth() {
  if (cache.strategyOperatingTruth) return Promise.resolve(cache.strategyOperatingTruth)

  return fetchWithAdmin('/api/strategic-execution/operating-truth').then(function(res) {
    if (!res.ok) throw new Error('Strategy operating truth API failed.')
    return res.json()
  }).then(function(data) {
    cache.strategyOperatingTruth = data
    return data
  })
}

function postStrategyAdvisorQuestion(question, mode) {
  return fetch('/api/strategic-execution/advisor', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, getAdminHeaders()),
    body: JSON.stringify({ question: question, mode: normalizeStrategyAdvisorMode(mode) }),
  }).then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) {
        throw new Error(data && data.message ? data.message : 'Strategy advisor failed.')
      }
      return data
    })
  })
}

function getPacketJson(packetData) {
  return packetData && packetData.latestRun && packetData.latestRun.metadata
    ? packetData.latestRun.metadata.packetJson || {}
    : {}
}

function getPacketInputSummary(packetData) {
  var run = packetData && packetData.latestRun
  return run && run.metadata ? run.metadata.inputSummary || {} : {}
}

function normalizePacketItem(item) {
  return {
    title: item.title || 'Untitled strategy item',
    status: item.status || 'open',
    itemType: item.itemType || item.item_type || 'strategy_item',
    oneLine: item.oneLine || item.one_line || item.currentReality || item.current_reality || '',
    evidenceSummary: item.evidenceSummary || item.evidence_summary || '',
    recommendedNextAction: item.recommendedNextAction || item.recommended_next_action || item.nextAction || item.next_action || '',
    ownerHint: item.ownerHint || item.owner_hint || '',
    sourceIds: item.sourceIds || item.source_ids || [],
    confidence: item.confidence || null,
  }
}

function classifyStrategyLens(item) {
  var text = [
    item.title,
    item.oneLine,
    item.evidenceSummary,
    item.recommendedNextAction,
    item.ownerHint,
    (item.sourceIds || []).join(' '),
  ].join(' ').toLowerCase()

  if (/cash|finance|actual|billable|runway|budget|reconciliation|spend/.test(text)) return 'Finance'
  if (/marketing|content|brand|publishing|campaign|review|socialpilot|youtube|recruit/.test(text)) return 'Attract'
  if (/production|agent|fub|mentorship|coaching|training|onboarding|shopping|kpi|floor|sales/.test(text)) return 'Grow'
  if (/retention|retain|engagement|at-risk|standard|support|overwhelm/.test(text)) return 'Retain'
  if (/foundation|runtime|router|source|system|memory|action router|extraction/.test(text)) return 'Foundation'
  return 'Company'
}

function inferMissingEvidence(item) {
  var text = [
    item.title,
    item.oneLine,
    item.evidenceSummary,
    item.recommendedNextAction,
  ].join(' ').toLowerCase()

  if (/cash|finance|actual|billable|budget/.test(text)) {
    return 'Need weekly reconciled actuals, billable aging, and cash scenario proof before locking spend decisions.'
  }
  if (/marketing|content|brand|publishing|socialpilot/.test(text)) {
    return 'Need content-performance, publishing reliability, and campaign-to-outcome data, not just activity volume.'
  }
  if (/production|floor|agent|fub|kpi|sales/.test(text)) {
    return 'Need live KPI/FUB compliance proof by agent: valid leads, appointment outcomes, Shopping List movement, and executed deals.'
  }
  if (/onboarding|training|skool|tool|pathway/.test(text)) {
    return 'Need training usage, onboarding completion, and role-owner evidence to prove this is not still leadership rescue.'
  }
  if (/system|foundation|runtime|router|memory|action/.test(text)) {
    return 'Need runtime success, source trust, retrieval, and Action Router proof before treating this as an operating dependency.'
  }
  return 'Need owner confirmation, source IDs, and a next proof point before promotion into quarterly execution.'
}

function buildReviewBoardItems(packetData) {
  var packetJson = getPacketJson(packetData)
  var rawItems = packetData && packetData.latestItems && packetData.latestItems.length
    ? packetData.latestItems
    : packetJson.strategic_issues || packetJson.strategicIssues || []

  return rawItems.map(normalizePacketItem)
}

function appendChip(parent, text, modifier) {
  var chip = document.createElement('span')
  chip.className = 'strategy-chip' + (modifier ? ' strategy-chip-' + modifier : '')
  chip.textContent = text
  parent.appendChild(chip)
}

function getGoalStatusModifier(status) {
  if (status === 'ahead') return 'grow'
  if (status === 'behind') return 'finance'
  return 'status'
}

function getGoalFactValue(group, label) {
  var fact = ((group && group.facts) || []).find(function(item) { return item.label === label })
  return fact ? fact.value : ''
}

function renderStrategyGoalTruthCard(goalTruth, options) {
  var compact = options && options.compact
  var article = document.createElement('article')
  article.className = 'section-card strategy-goal-truth-card'

  var title = document.createElement('h4')
  title.textContent = 'Live Goal Truth'
  article.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'strategy-packet-summary'
  intro.textContent = goalTruth
    ? 'Source-backed pace facts from BHAG, Agent Engine, Owners, and Freedom Community. These override packet summaries for behind/ahead claims.'
    : 'Live goal truth is not available yet.'
  article.appendChild(intro)

  if (!goalTruth) return article

  var list = document.createElement('div')
  list.className = 'strategy-goal-truth-list'
  ;(goalTruth.groups || []).forEach(function(group) {
    var row = document.createElement('div')
    row.className = 'strategy-goal-truth-row strategy-goal-truth-row-' + (group.status || 'neutral')

    var top = document.createElement('div')
    top.className = 'strategy-review-top'
    appendChip(top, group.statusLabel || group.status || 'Source-backed', getGoalStatusModifier(group.status))
    if (group.asOf) appendChip(top, formatDate(group.asOf), 'status')
    row.appendChild(top)

    var name = document.createElement('strong')
    name.textContent = group.title
    row.appendChild(name)

    var facts = document.createElement('p')
    if (group.key === 'team_volume') {
      facts.textContent = '2026 target ' + getGoalFactValue(group, '2026') + ' · Should be ' + getGoalFactValue(group, 'Should Be') + ' · Actual ' + getGoalFactValue(group, 'Actual')
    } else if (group.key === 'community_agents') {
      facts.textContent = '2026 target ' + getGoalFactValue(group, '2026') + ' · Should be ' + getGoalFactValue(group, 'Should Be') + ' · Actual ' + getGoalFactValue(group, 'Actual')
    } else {
      facts.textContent = 'Active agents ' + getGoalFactValue(group, 'Current Active Agents') + ' · Required this year ' + getGoalFactValue(group, 'Required Agents This Year') + ' · Recruiting pace ' + getGoalFactValue(group, 'Current Recruiting Pace') + ' vs ' + getGoalFactValue(group, 'Required Recruiting Pace')
    }
    row.appendChild(facts)

    if (!compact && group.rule) {
      var rule = document.createElement('p')
      rule.className = 'strategy-goal-rule'
      rule.textContent = group.rule
      row.appendChild(rule)
    }

    list.appendChild(row)
  })
  article.appendChild(list)

  if (!compact && goalTruth.rule) {
    var guardrail = document.createElement('p')
    guardrail.className = 'strategy-packet-gap'
    guardrail.textContent = goalTruth.rule
    article.appendChild(guardrail)
  }

  return article
}

function buildLiveGoalSummary(goalTruth) {
  if (!goalTruth || !goalTruth.groups) return ''
  var team = goalTruth.groups.find(function(group) { return group.key === 'team_volume' })
  var community = goalTruth.groups.find(function(group) { return group.key === 'community_agents' })
  var capacity = goalTruth.groups.find(function(group) { return group.key === 'agent_engine_capacity' })
  return [
    team ? 'Team volume: ' + team.statusLabel : '',
    community ? '10k community path: ' + community.statusLabel : '',
    capacity ? 'Agent Engine capacity: ' + capacity.statusLabel : '',
  ].filter(Boolean).join('. ') + '.'
}

function renderStrategyOperatingTruthCard(operatingTruth, options) {
  var compact = options && options.compact
  var article = document.createElement('article')
  article.className = 'section-card strategy-operating-truth-card'

  var title = document.createElement('h4')
  title.textContent = 'Live Operating Truth'
  article.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'strategy-packet-summary'
  intro.textContent = operatingTruth
    ? 'Owners, finance, FUB, KPI, BHAG, and Agent Engine source truth that strategy recommendations must check before trusting meeting chatter.'
    : 'Live operating truth is not available yet.'
  article.appendChild(intro)

  if (!operatingTruth) return article

  var list = document.createElement('div')
  list.className = 'strategy-goal-truth-list'
  ;(operatingTruth.sourceCards || []).slice(0, compact ? 4 : 8).forEach(function(card) {
    var row = document.createElement('div')
    row.className = 'strategy-goal-truth-row'

    var top = document.createElement('div')
    top.className = 'strategy-review-top'
    appendChip(top, card.sourceId || 'source', 'status')
    appendChip(top, card.validation || card.status || 'source-backed', card.validation && card.validation.indexOf('Signed') !== -1 ? 'grow' : 'status')
    row.appendChild(top)

    var name = document.createElement('strong')
    name.textContent = (card.title || card.sourceId || 'Source') + (card.unitName ? ' · ' + card.unitName : '')
    row.appendChild(name)

    var currentRead = document.createElement('p')
    currentRead.textContent = card.currentRead || card.owns || ''
    row.appendChild(currentRead)

    if (!compact && Array.isArray(card.facts) && card.facts.length) {
      var factText = document.createElement('p')
      factText.className = 'strategy-goal-rule'
      factText.textContent = card.facts
        .slice(0, 5)
        .map(function(fact) { return fact.label + ': ' + fact.value })
        .join(' · ')
      row.appendChild(factText)
    }

    list.appendChild(row)
  })
  article.appendChild(list)

  if (!compact && operatingTruth.rule) {
    var guardrail = document.createElement('p')
    guardrail.className = 'strategy-packet-gap'
    guardrail.textContent = operatingTruth.rule
    article.appendChild(guardrail)
  }

  return article
}

function renderStrategyHealthCard(packetData, goalTruth) {
  var article = document.createElement('article')
  article.className = 'section-card strategy-command-card'

  var title = document.createElement('h4')
  title.textContent = 'Strategy Command Center'
  article.appendChild(title)

  var run = packetData && packetData.latestRun
  var inputSummary = getPacketInputSummary(packetData)
  var readiness = run && run.metadata ? run.metadata.strategyReadiness || {} : {}

  var summary = document.createElement('p')
  summary.className = 'strategy-packet-summary'
  summary.textContent = buildLiveGoalSummary(goalTruth) || (run && run.metadata && run.metadata.executiveSummary
    ? run.metadata.executiveSummary
    : 'Use this hub to ask source-backed strategy questions, review Attract / Grow / Retain signals, and decide what needs owner review next.')
  article.appendChild(summary)

  var grid = document.createElement('div')
  grid.className = 'strategy-packet-meta-grid'
  ;[
    ['Evidence', (inputSummary.candidate_count || run?.candidatesRead || 0) + ' candidates · ' + (inputSummary.direct_artifact_count || 0) + ' artifacts'],
    ['Docs', (inputSummary.strategy_doc_count || 0) + ' strategy docs'],
    ['Readiness', readiness.readiness_label || 'Owner review ready'],
    ['Updated', run ? formatDate(run.generatedAt) : 'Not generated'],
  ].forEach(function(pair) {
    var pill = document.createElement('div')
    pill.className = 'strategy-packet-meta-pill'
    var label = document.createElement('span')
    label.textContent = pair[0]
    pill.appendChild(label)
    var value = document.createElement('strong')
    value.textContent = pair[1]
    pill.appendChild(value)
    grid.appendChild(pill)
  })
  article.appendChild(grid)

  if (readiness.most_important_gap) {
    var gap = document.createElement('p')
    gap.className = 'strategy-packet-gap'
    gap.textContent = 'Biggest caveat: ' + readiness.most_important_gap
    article.appendChild(gap)
  }

  return article
}

function getPreworkStatusModifier(status) {
  if (status === 'read') return 'grow'
  if (status === 'needs_visual_review') return 'finance'
  return 'status'
}

function compactPreworkExcerpt(excerpt) {
  var text = String(excerpt || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > 340 ? text.slice(0, 337).trim() + '...' : text
}

function renderStrategyPreworkCoverage(coverage, options) {
  var compact = options && options.compact
  var article = document.createElement('article')
  article.className = 'section-card strategy-prework-card'

  var title = document.createElement('h4')
  title.textContent = 'Pre-Strat Read Coverage'
  article.appendChild(title)

  var summary = coverage && coverage.summary ? coverage.summary : {}
  var intro = document.createElement('p')
  intro.className = 'strategy-packet-summary'
  intro.textContent = coverage
    ? summary.readCount + '/' + summary.expectedCount + ' expected notes have readable artifacts. ' + summary.artifactCount + ' pre-work artifacts are indexed with source links, extraction method, and read status.'
    : 'Pre-strat read coverage is not available yet.'
  article.appendChild(intro)

  if (!coverage) return article

  var metaGrid = document.createElement('div')
  metaGrid.className = 'strategy-packet-meta-grid'
  ;[
    ['Read', (summary.readCount || 0) + '/' + (summary.expectedCount || 0)],
    ['Missing', String(summary.missingCount || 0)],
    ['Needs Visual', String(summary.needsVisualReviewCount || 0)],
    ['Text', (summary.totalContentLength || 0).toLocaleString() + ' chars'],
  ].forEach(function(pair) {
    var pill = document.createElement('div')
    pill.className = 'strategy-packet-meta-pill'
    var label = document.createElement('span')
    label.textContent = pair[0]
    pill.appendChild(label)
    var value = document.createElement('strong')
    value.textContent = pair[1]
    pill.appendChild(value)
    metaGrid.appendChild(pill)
  })
  article.appendChild(metaGrid)

  var list = document.createElement('div')
  list.className = 'strategy-prework-list'
  var participants = coverage.participants || []
  participants.slice(0, compact ? 6 : participants.length).forEach(function(participant) {
    var row = document.createElement('div')
    row.className = 'strategy-prework-row strategy-prework-row-' + participant.status

    var top = document.createElement('div')
    top.className = 'strategy-review-top'
    appendChip(top, participant.statusLabel || participant.status, getPreworkStatusModifier(participant.status))
    appendChip(top, (participant.contentLength || 0).toLocaleString() + ' chars', 'status')
    row.appendChild(top)

    var name = document.createElement('strong')
    name.textContent = participant.name
    row.appendChild(name)

    var primary = participant.primaryArtifact
    var detail = document.createElement('p')
    detail.textContent = primary
      ? primary.title + ' · ' + primary.readMethod.replace(/_/g, ' ') + ' · ' + (primary.artifactCount || participant.artifactCount || 1) + ' artifact(s)'
      : participant.gap || 'No extracted pre-strat artifact found.'
    row.appendChild(detail)

    var proofExcerpt = primary && !compact ? compactPreworkExcerpt(primary.excerpt) : ''
    if (proofExcerpt) {
      var excerpt = document.createElement('p')
      excerpt.className = 'strategy-prework-excerpt'
      excerpt.textContent = proofExcerpt
      row.appendChild(excerpt)
    }

    if (primary && primary.sourceUrl) {
      var link = document.createElement('a')
      link.className = 'section-support-link'
      link.href = primary.sourceUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.textContent = 'Open source'
      row.appendChild(link)
    }

    list.appendChild(row)
  })
  article.appendChild(list)

  if (compact && participants.length > 6) {
    var note = document.createElement('p')
    note.className = 'strategy-review-sources'
    note.textContent = 'Open Evidence Packet for all participant rows.'
    article.appendChild(note)
  }

  if (coverage.unassignedArtifacts && coverage.unassignedArtifacts.length && !compact) {
    var unassigned = document.createElement('p')
    unassigned.className = 'strategy-packet-gap'
    unassigned.textContent = 'Other pre-work artifacts found: ' + coverage.unassignedArtifacts.slice(0, 4).map(function(item) { return item.title }).join(' · ')
    article.appendChild(unassigned)
  }

  return article
}

function renderStrategyReviewBoard(packetData, options) {
  var compact = options && options.compact
  var article = document.createElement('article')
  article.className = 'section-card strategy-review-board'

  var title = document.createElement('h4')
  title.textContent = 'Strategy Review Board'
  article.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'strategy-packet-summary'
  intro.textContent = 'Source-backed issues mapped into operating lenses. This is the meeting prep board: decide, ask for evidence, or promote to quarterly execution.'
  article.appendChild(intro)

  var items = buildReviewBoardItems(packetData)
  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'strategy-packet-gap'
    empty.textContent = 'No packet items available yet. Generate a strategy evidence packet after extraction runs.'
    article.appendChild(empty)
    return article
  }

  var groups = {}
  items.forEach(function(item) {
    var lens = classifyStrategyLens(item)
    if (!groups[lens]) groups[lens] = []
    groups[lens].push(item)
  })

  var lensRow = document.createElement('div')
  lensRow.className = 'strategy-lens-row'
  ;['Attract', 'Grow', 'Retain', 'Finance', 'Foundation', 'Company'].forEach(function(lens) {
    appendChip(lensRow, lens + ' ' + ((groups[lens] || []).length), lens.toLowerCase())
  })
  article.appendChild(lensRow)

  var list = document.createElement('div')
  list.className = 'strategy-review-list'
  items.slice(0, compact ? 6 : 18).forEach(function(item) {
    var lens = classifyStrategyLens(item)
    var row = document.createElement('div')
    row.className = 'strategy-review-item'

    var top = document.createElement('div')
    top.className = 'strategy-review-top'
    appendChip(top, lens, lens.toLowerCase())
    appendChip(top, item.status.replace(/_/g, ' '), 'status')
    if (item.confidence) appendChip(top, Math.round(Number(item.confidence) * 100) + '% confidence', 'status')
    row.appendChild(top)

    var itemTitle = document.createElement('strong')
    itemTitle.textContent = item.title
    row.appendChild(itemTitle)

    var read = document.createElement('p')
    read.textContent = item.oneLine || item.evidenceSummary || ''
    row.appendChild(read)

    if (item.recommendedNextAction) {
      var next = document.createElement('p')
      next.className = 'strategy-review-next'
      next.textContent = 'Move: ' + item.recommendedNextAction
      row.appendChild(next)
    }

    var gap = document.createElement('p')
    gap.className = 'strategy-review-gap'
    gap.textContent = 'Proof gap: ' + inferMissingEvidence(item)
    row.appendChild(gap)

    if (item.sourceIds && item.sourceIds.length) {
      var sourceLine = document.createElement('div')
      sourceLine.className = 'strategy-review-sources'
      sourceLine.textContent = 'Sources: ' + item.sourceIds.slice(0, 6).join(', ')
      row.appendChild(sourceLine)
    }

    list.appendChild(row)
  })
  article.appendChild(list)

  if (compact) {
    var link = document.createElement('a')
    link.className = 'section-support-link'
    link.href = '/strategic-execution#advisor'
    link.textContent = 'Open advisor board'
    article.appendChild(link)
  }

  return article
}

function renderRecommendedPriorities(packetData) {
  var packetJson = getPacketJson(packetData)
  var priorities = packetJson.recommended90DayPriorities || packetJson.recommended_90_day_priorities || []
  var article = document.createElement('article')
  article.className = 'section-card strategy-priority-card'

  var title = document.createElement('h4')
  title.textContent = 'AI-Suggested 90-Day Priorities'
  article.appendChild(title)

  if (!priorities.length) {
    var empty = document.createElement('p')
    empty.className = 'strategy-packet-summary'
    empty.textContent = 'No 90-day priority recommendations are available in the latest packet.'
    article.appendChild(empty)
    return article
  }

  var list = document.createElement('div')
  list.className = 'strategy-review-list'
  priorities.slice(0, 6).forEach(function(priority) {
    var row = document.createElement('div')
    row.className = 'strategy-review-item'

    var top = document.createElement('div')
    top.className = 'strategy-review-top'
    appendChip(top, 'Rank ' + (priority.rank || '?'), 'status')
    appendChip(top, priority.owner_hint || priority.ownerHint || 'Owner needed', 'status')
    row.appendChild(top)

    var name = document.createElement('strong')
    name.textContent = priority.priority || priority.title || 'Untitled priority'
    row.appendChild(name)

    var why = document.createElement('p')
    why.textContent = priority.why_this_matters || priority.whyThisMatters || priority.evidence_summary || priority.evidenceSummary || ''
    row.appendChild(why)

    var metrics = priority.leading_metrics || priority.leadingMetrics || []
    if (metrics.length) {
      var metricLine = document.createElement('p')
      metricLine.className = 'strategy-review-gap'
      metricLine.textContent = 'Leading metrics: ' + metrics.slice(0, 4).join(' · ')
      row.appendChild(metricLine)
    }

    list.appendChild(row)
  })
  article.appendChild(list)
  return article
}

function appendAdvisorMessageToList(list, role, text, meta) {
  var item = document.createElement('div')
  item.className = 'strategy-advisor-message strategy-advisor-message-' + role

  var label = document.createElement('div')
  label.className = 'strategy-advisor-label'
  label.textContent = role === 'user' ? 'Steve' : 'Strategy Advisor'
  item.appendChild(label)

  var body = document.createElement('div')
  body.className = 'strategy-advisor-body'
  if (role === 'assistant') {
    body.appendChild(renderMarkdownBlock(text || '', 'docs/strategy/quarterly-priorities.md'))
  } else {
    body.textContent = text || ''
  }
  item.appendChild(body)

  if (meta) {
    var metaLine = document.createElement('div')
    metaLine.className = 'strategy-advisor-meta'
    metaLine.textContent = meta
    item.appendChild(metaLine)
  }

  list.appendChild(item)
  list.scrollTop = list.scrollHeight
}

function renderAdvisorMessagesInto(list) {
  if (!list) return
  list.innerHTML = ''
  cache.strategyAdvisorMessages.forEach(function(message) {
    appendAdvisorMessageToList(list, message.role, message.text, message.meta)
  })
}

function appendAdvisorMessage(role, text, meta) {
  var lists = document.querySelectorAll('[data-strategy-advisor-messages="true"]')
  lists.forEach(function(list) {
    appendAdvisorMessageToList(list, role, text, meta)
  })
}

function submitStrategyAdvisorQuestion(question, options) {
  var input = options && options.input
  var submit = options && options.submit
  var status = options && options.status
  var mode = normalizeStrategyAdvisorMode(options && options.mode ? options.mode : cache.strategyAdvisorMode)
  var normalizedQuestion = String(question || '').trim()
  if (!normalizedQuestion) return

  if (input) input.value = ''
  if (submit) {
    if (!submit.dataset.defaultLabel) submit.dataset.defaultLabel = submit.textContent || 'Ask'
    submit.disabled = true
    submit.textContent = mode === 'deep' ? 'Deep read...' : 'Thinking...'
  }
  setStrategyAdvisorStatus('Calling Strategy Advisor in ' + getStrategyAdvisorModeLabel(mode) + ' mode...', status)

  pushStrategyAdvisorMessage('user', normalizedQuestion, getStrategyAdvisorModeLabel(mode) + ' mode')

  postStrategyAdvisorQuestion(normalizedQuestion, mode).then(function(result) {
    var latency = result.latencyMs ? (Number(result.latencyMs) / 1000).toFixed(1) + 's' : ''
    var meta = [
      getStrategyAdvisorModeLabel(result.mode || mode) + ' mode',
      result.modeProfile && result.modeProfile.requestedReasoningEffort
        ? 'effort ' + result.modeProfile.requestedReasoningEffort
        : '',
      latency,
      result.model,
      result.provider,
      result.authPath,
    ].filter(Boolean).join(' · ')
    pushStrategyAdvisorMessage('assistant', result.answer, meta)
    setStrategyAdvisorStatus(
      'Answered ' + formatDate(result.generatedAt) + (latency ? ' · ' + latency : ''),
      status
    )
  }).catch(function(error) {
    var message = 'Advisor failed: ' + error.message
    pushStrategyAdvisorMessage('assistant', message, '')
    setStrategyAdvisorStatus('Advisor failed', status)
  }).finally(function() {
    if (submit) {
      submit.disabled = false
      submit.textContent = submit.dataset.defaultLabel || 'Ask'
    }
  })
}

function renderStrategyAdvisorWorkspace(packetData, preworkCoverage, goalTruth, operatingTruth) {
  ensureStrategyAdvisorWelcome()

  var workspace = document.createElement('section')
  workspace.className = 'strategy-advisor-workspace'

  var chat = document.createElement('div')
  chat.className = 'strategy-advisor-chat-shell'

  var top = document.createElement('div')
  top.className = 'strategy-advisor-chat-top'

  var topCopy = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Live Advisor'
  topCopy.appendChild(eyebrow)

  var title = document.createElement('h4')
  title.textContent = 'Strategy Chat'
  topCopy.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'strategy-packet-summary'
  intro.textContent = 'Ask against live source truth, direct artifacts, the latest packet, strategy docs, backlog, decisions, runtime facts, and extraction context. Fast is for the room; Deep / XHigh is for harder synthesis.'
  topCopy.appendChild(intro)
  top.appendChild(topCopy)

  var topActions = document.createElement('div')
  topActions.className = 'strategy-advisor-top-actions'
  topActions.appendChild(buildStrategyAdvisorModeControl())

  var clear = document.createElement('button')
  clear.type = 'button'
  clear.className = 'strategy-advisor-clear'
  clear.textContent = 'Clear Thread'
  clear.addEventListener('click', function() {
    cache.strategyAdvisorMessages = []
    ensureStrategyAdvisorWelcome()
    renderAdvisorMessagesInto(messages)
  })
  topActions.appendChild(clear)
  top.appendChild(topActions)
  chat.appendChild(top)

  var messages = document.createElement('div')
  messages.className = 'strategy-advisor-messages strategy-advisor-thread'
  messages.id = 'strategy-advisor-workspace-messages'
  messages.dataset.strategyAdvisorMessages = 'true'
  chat.appendChild(messages)

  var form = document.createElement('form')
  form.className = 'strategy-advisor-form strategy-advisor-composer'

  var input = document.createElement('textarea')
  input.id = 'strategy-advisor-workspace-input'
  input.rows = 4
  input.placeholder = 'Ask what the evidence says, what to decide, which department is stuck, or what is missing.'
  form.appendChild(input)

  var footer = document.createElement('div')
  footer.className = 'strategy-advisor-form-footer'

  var status = document.createElement('div')
  status.className = 'strategy-advisor-status'
  status.id = 'strategy-advisor-workspace-status'
  status.dataset.strategyAdvisorStatus = 'true'
  status.textContent = packetData && packetData.latestRun
    ? getStrategyAdvisorModeLabel(cache.strategyAdvisorMode) + ' mode · packet ' + formatDate(packetData.latestRun.generatedAt)
    : 'No packet loaded yet'
  footer.appendChild(status)

  var submit = document.createElement('button')
  submit.type = 'submit'
  submit.className = 'strategy-advisor-submit'
  submit.textContent = 'Send'
  footer.appendChild(submit)

  form.appendChild(footer)
  chat.appendChild(form)
  workspace.appendChild(chat)

  var rail = document.createElement('aside')
  rail.className = 'strategy-advisor-context-rail'

  var promptCard = document.createElement('article')
  promptCard.className = 'strategy-advisor-rail-card'

  var promptTitle = document.createElement('h4')
  promptTitle.textContent = 'Good Prompts'
  promptCard.appendChild(promptTitle)

  var promptRow = document.createElement('div')
  promptRow.className = 'strategy-prompt-row strategy-prompt-stack'
  getStrategyAdvisorPrompts().forEach(function(prompt) {
    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'strategy-prompt-button'
    btn.textContent = prompt
    btn.addEventListener('click', function() {
      input.value = prompt
      input.focus()
    })
    promptRow.appendChild(btn)
  })
  promptCard.appendChild(promptRow)
  rail.appendChild(promptCard)

  rail.appendChild(renderStrategyGoalTruthCard(goalTruth, { compact: true }))
  rail.appendChild(renderStrategyOperatingTruthCard(operatingTruth, { compact: true }))
  rail.appendChild(renderStrategyPreworkCoverage(preworkCoverage, { compact: true }))
  rail.appendChild(renderStrategyPacketCard(packetData, { compact: true }))
  rail.appendChild(renderStrategyReviewBoard(packetData, { compact: true }))
  workspace.appendChild(rail)

  form.addEventListener('submit', function(event) {
    event.preventDefault()
    var question = input.value.trim()
    submitStrategyAdvisorQuestion(question, { input: input, submit: submit, status: status, mode: cache.strategyAdvisorMode })
  })

  renderAdvisorMessagesInto(messages)
  updateStrategyAdvisorModeControls()

  return workspace
}

function buildStrategyAdvisorHelperPanel(packetData) {
  var panel = document.getElementById('strategy-advisor-helper-panel')
  if (!panel) return
  panel.innerHTML = ''

  var header = document.createElement('div')
  header.className = 'ops-helper-header'

  var headerInfo = document.createElement('div')
  headerInfo.className = 'ops-helper-header-info'

  var title = document.createElement('h4')
  title.textContent = 'Strategy AI'
  headerInfo.appendChild(title)

  var subtitle = document.createElement('p')
  subtitle.textContent = packetData && packetData.latestRun
    ? 'Packet ' + formatDate(packetData.latestRun.generatedAt)
    : 'Evidence-backed advisor'
  headerInfo.appendChild(subtitle)
  header.appendChild(headerInfo)

  var close = document.createElement('button')
  close.type = 'button'
  close.className = 'ops-helper-close'
  close.setAttribute('aria-label', 'Close Strategy Advisor')
  close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
  close.addEventListener('click', closeStrategyAdvisorHelper)
  header.appendChild(close)
  panel.appendChild(header)

  var body = document.createElement('div')
  body.className = 'ops-helper-body'

  var messages = document.createElement('div')
  messages.className = 'ops-helper-messages'
  messages.dataset.strategyAdvisorMessages = 'true'
  body.appendChild(messages)

  var quick = document.createElement('div')
  quick.className = 'ops-helper-quick'
  getStrategyAdvisorPrompts().slice(1, 5).forEach(function(label) {
    var button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', function() {
      submitStrategyAdvisorQuestion(label, {
        input: panel.querySelector('input'),
        submit: panel.querySelector('form button'),
        status: panel.querySelector('[data-strategy-advisor-status="true"]'),
      })
    })
    quick.appendChild(button)
  })
  body.appendChild(quick)

  panel.appendChild(body)

  var form = document.createElement('form')
  form.className = 'ops-helper-form'

  var input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Ask Strategy AI...'
  input.setAttribute('aria-label', 'Ask Strategy AI')
  form.appendChild(input)

  var submit = document.createElement('button')
  submit.type = 'submit'
  submit.textContent = 'Ask'
  form.appendChild(submit)
  panel.appendChild(form)

  var status = document.createElement('div')
  status.className = 'strategy-advisor-meta strategy-advisor-helper-status'
  status.dataset.strategyAdvisorStatus = 'true'
  status.textContent = getStrategyAdvisorModeLabel(cache.strategyAdvisorMode) + ' mode · evidence-backed answers only'
  body.appendChild(status)

  form.addEventListener('submit', function(event) {
    event.preventDefault()
    submitStrategyAdvisorQuestion(input.value, { input: input, submit: submit, status: status })
  })

  renderAdvisorMessagesInto(messages)
  strategyAdvisorHelperReady = true
}

function openStrategyAdvisorHelper() {
  var panel = document.getElementById('strategy-advisor-helper-panel')
  var toggle = document.getElementById('strategy-advisor-helper-toggle')
  if (!panel) return
  fetchStrategyEvidencePacket().then(function(packetData) {
    if (!strategyAdvisorHelperReady) buildStrategyAdvisorHelperPanel(packetData)
    panel.classList.remove('ops-helper-hidden')
    if (toggle) toggle.style.display = 'none'
    var input = panel.querySelector('input')
    if (input) input.focus()
  }).catch(function() {
    if (!strategyAdvisorHelperReady) buildStrategyAdvisorHelperPanel(null)
    panel.classList.remove('ops-helper-hidden')
    if (toggle) toggle.style.display = 'none'
  })
}

function closeStrategyAdvisorHelper() {
  var panel = document.getElementById('strategy-advisor-helper-panel')
  var toggle = document.getElementById('strategy-advisor-helper-toggle')
  if (!panel) return
  panel.classList.add('ops-helper-hidden')
  if (toggle) toggle.style.display = ''
}

function initStrategyAdvisorHelper() {
  var toggle = document.getElementById('strategy-advisor-helper-toggle')
  if (!toggle || toggle.dataset.strategyAdvisorHelperBound) return
  toggle.dataset.strategyAdvisorHelperBound = 'true'
  toggle.addEventListener('click', openStrategyAdvisorHelper)
}

function renderStrategyPacketCard(packetData, options) {
  var compact = options && options.compact
  var article = document.createElement('article')
  article.className = 'section-card strategy-packet-card'

  var title = document.createElement('h4')
  title.textContent = 'Strategy Evidence Packet'
  article.appendChild(title)

  var run = packetData && packetData.latestRun
  if (!run) {
    var empty = document.createElement('p')
    empty.className = 'strategy-packet-summary'
    empty.textContent = 'No strategy evidence packet has been generated yet. Run the packet job after fresh extraction, then use this surface as the strategy prep cockpit.'
    article.appendChild(empty)
    return article
  }

  var metadata = run.metadata || {}
  var inputSummary = metadata.inputSummary || {}
  var readiness = metadata.strategyReadiness || {}

  var summary = document.createElement('p')
  summary.className = 'strategy-packet-summary'
  summary.textContent = metadata.executiveSummary || 'Latest source-backed strategy evidence packet is available.'
  article.appendChild(summary)

  var metaGrid = document.createElement('div')
  metaGrid.className = 'strategy-packet-meta-grid'

  ;[
    ['Generated', formatDate(run.generatedAt)],
    ['Readiness', readiness.readiness_label || 'Owner review ready'],
    ['Evidence', (inputSummary.candidate_count || run.candidatesRead || 0) + ' candidates · ' + (inputSummary.direct_artifact_count || 0) + ' artifacts'],
    ['Model', run.model || 'Not available'],
  ].forEach(function(pair) {
    var pill = document.createElement('div')
    pill.className = 'strategy-packet-meta-pill'

    var label = document.createElement('span')
    label.textContent = pair[0]
    pill.appendChild(label)

    var value = document.createElement('strong')
    value.textContent = pair[1]
    pill.appendChild(value)

    metaGrid.appendChild(pill)
  })

  article.appendChild(metaGrid)

  if (readiness.most_important_gap) {
    var gap = document.createElement('p')
    gap.className = 'strategy-packet-gap'
    gap.textContent = 'Gap: ' + readiness.most_important_gap
    article.appendChild(gap)
  }

  var items = packetData.latestItems || []
  if (items.length) {
    var listTitle = document.createElement('div')
    listTitle.className = 'strategy-packet-list-label'
    listTitle.textContent = compact ? 'Top Signals' : 'Packet Items'
    article.appendChild(listTitle)

    var list = document.createElement('div')
    list.className = 'strategy-packet-item-list'

    items.slice(0, compact ? 5 : 30).forEach(function(item) {
      var row = document.createElement('div')
      row.className = 'strategy-packet-item'

      var itemMeta = document.createElement('div')
      itemMeta.className = 'strategy-packet-item-meta'
      itemMeta.textContent = (item.itemType || 'item').replace(/_/g, ' ') + ' · ' + (item.status || 'open')
      row.appendChild(itemMeta)

      var itemTitle = document.createElement('strong')
      itemTitle.textContent = item.title || 'Untitled packet item'
      row.appendChild(itemTitle)

      var itemLine = document.createElement('p')
      itemLine.textContent = item.oneLine || item.recommendedNextAction || item.evidenceSummary || ''
      row.appendChild(itemLine)

      list.appendChild(row)
    })

    article.appendChild(list)
  }

  var actions = document.createElement('div')
  actions.className = 'section-support-actions'

  if (compact) {
    var packetLink = document.createElement('a')
    packetLink.className = 'section-support-link'
    packetLink.href = '/strategic-execution#evidence-packet'
    packetLink.textContent = 'Open packet'
    actions.appendChild(packetLink)
  }

  if (run.outputPath) {
    var docLink = document.createElement('a')
    docLink.className = 'section-support-link'
    docLink.href = buildDocHref(run.outputPath, 'docs/strategy/quarterly-priorities.md')
    docLink.textContent = 'Open packet doc'
    actions.appendChild(docLink)
  }

  if (actions.children.length) article.appendChild(actions)

  return article
}

function renderOverview() {
  var container = document.getElementById('strategic-execution-content')
  container.innerHTML = '<p>Loading overview...</p>'

  Promise.all([fetchSourceOfTruth(), fetchStrategyEvidencePacket(), fetchStrategyPreworkCoverage(), fetchStrategyGoalTruth(), fetchStrategyOperatingTruth()]).then(function(results) {
    var data = results[0]
    var packetData = results[1]
    var preworkCoverage = results[2]
    var goalTruth = results[3]
    var operatingTruth = results[4]
    var quarterlyDoc = (data.foundation.supportingStrategy || []).find(function(doc) {
      return doc.meta && doc.meta.path === strategicDocPaths['quarterly-priorities']
    })

    container.innerHTML = ''

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
    panelTitle.textContent = 'Strategic Execution'
    panelLeft.appendChild(panelTitle)
    panelHeader.appendChild(panelLeft)

    var panelMeta = document.createElement('div')
    panelMeta.className = 'doc-meta'
    var quarterMeta = quarterlyDoc && quarterlyDoc.meta ? quarterlyDoc.meta : data.foundation.businessStrategy.meta
    panelMeta.textContent = quarterMeta.lines + ' lines · updated ' + formatDate(quarterMeta.updatedAt)
    panelHeader.appendChild(panelMeta)

    panel.appendChild(panelHeader)

    var sectionList = document.createElement('div')
    sectionList.className = 'section-list'
    var currentQuarterSection = { title: 'Current Quarter', content: '' }
    var quarterPath = quarterlyDoc && quarterlyDoc.meta && quarterlyDoc.meta.path
      ? quarterlyDoc.meta.path
      : strategicDocPaths['quarterly-priorities']
    sectionList.appendChild(renderStrategyGoalTruthCard(goalTruth, { compact: true }))
    sectionList.appendChild(renderStrategyOperatingTruthCard(operatingTruth, { compact: true }))
    sectionList.appendChild(renderStrategyHealthCard(packetData, goalTruth))
    sectionList.appendChild(renderStrategyPreworkCoverage(preworkCoverage, { compact: true }))
    sectionList.appendChild(renderRecommendedPriorities(packetData))
    sectionList.appendChild(renderCurrentQuarterSection(currentQuarterSection, quarterPath, quarterlyDoc))
    sectionList.appendChild(renderStrategyPacketCard(packetData, { compact: true }))
    sectionList.appendChild(renderSupportingDocsCard())
    panel.appendChild(sectionList)
    container.appendChild(panel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load overview: ' + error.message
    container.appendChild(msg)
  })
}

function renderStrategyEvidencePacket() {
  var container = document.getElementById('strategic-execution-content')
  container.innerHTML = '<p>Loading strategy evidence packet...</p>'

  Promise.all([fetchStrategyEvidencePacket(), fetchStrategyPreworkCoverage(), fetchStrategyGoalTruth(), fetchStrategyOperatingTruth()]).then(function(results) {
    var packetData = results[0]
    var preworkCoverage = results[1]
    var goalTruth = results[2]
    var operatingTruth = results[3]
    container.innerHTML = ''

    var panel = document.createElement('section')
    panel.className = 'panel'

    var panelHeader = document.createElement('div')
    panelHeader.className = 'panel-header'

    var panelLeft = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Strategy Prep'
    panelLeft.appendChild(eyebrow)

    var title = document.createElement('h3')
    title.textContent = 'Evidence Packet'
    panelLeft.appendChild(title)
    panelHeader.appendChild(panelLeft)

    var meta = document.createElement('div')
    meta.className = 'doc-meta'
    meta.textContent = packetData.latestRun ? 'Updated ' + formatDate(packetData.latestRun.generatedAt) : 'Not generated'
    panelHeader.appendChild(meta)

    panel.appendChild(panelHeader)

    var list = document.createElement('div')
    list.className = 'section-list'
    list.appendChild(renderStrategyGoalTruthCard(goalTruth, { compact: false }))
    list.appendChild(renderStrategyOperatingTruthCard(operatingTruth, { compact: false }))
    list.appendChild(renderStrategyPreworkCoverage(preworkCoverage, { compact: false }))
    list.appendChild(renderStrategyPacketCard(packetData, { compact: false }))
    panel.appendChild(list)
    container.appendChild(panel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load strategy evidence packet: ' + error.message
    container.appendChild(msg)
  })
}

function renderStrategyAdvisor() {
  var container = document.getElementById('strategic-execution-content')
  container.innerHTML = '<p>Loading strategy advisor...</p>'

  Promise.all([fetchStrategyEvidencePacket(), fetchStrategyPreworkCoverage(), fetchStrategyGoalTruth(), fetchStrategyOperatingTruth()]).then(function(results) {
    var packetData = results[0]
    var preworkCoverage = results[1]
    var goalTruth = results[2]
    var operatingTruth = results[3]
    container.innerHTML = ''

    var panel = document.createElement('section')
    panel.className = 'panel'

    var panelHeader = document.createElement('div')
    panelHeader.className = 'panel-header'

    var panelLeft = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Source-Backed Strategy'
    panelLeft.appendChild(eyebrow)

    var title = document.createElement('h3')
    title.textContent = 'Strategy Advisor'
    panelLeft.appendChild(title)
    panelHeader.appendChild(panelLeft)

    var meta = document.createElement('div')
    meta.className = 'doc-meta'
    meta.textContent = packetData.latestRun ? 'Packet updated ' + formatDate(packetData.latestRun.generatedAt) : 'No packet generated'
    panelHeader.appendChild(meta)

    panel.appendChild(panelHeader)

    var list = document.createElement('div')
    list.className = 'section-list'
    list.appendChild(renderStrategyAdvisorWorkspace(packetData, preworkCoverage, goalTruth, operatingTruth))
    list.appendChild(renderRecommendedPriorities(packetData))
    panel.appendChild(list)
    container.appendChild(panel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load strategy advisor: ' + error.message
    container.appendChild(msg)
  })
}

function renderStrategyDoc(sectionKey) {
  var docPath = strategicDocPaths[sectionKey]
  if (!docPath) return

  var container = document.getElementById('strategic-execution-content')
  container.innerHTML = '<p>Loading document...</p>'

  fetchDoc(docPath).then(function(data) {
    container.innerHTML = ''

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
    container.appendChild(hero)

    var docPanel = document.createElement('section')
    docPanel.className = 'panel'

    var docContent = document.createElement('div')
    docContent.className = 'doc-content'
    docContent.appendChild(renderMarkdownBlock(data.content, data.meta.path))
    docPanel.appendChild(docContent)
    container.appendChild(docPanel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load document: ' + error.message
    container.appendChild(msg)
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
}

function route() {
  var section = getSection()
  updateNav(section)

  var nav = document.getElementById('found-nav')
  if (nav) nav.classList.remove('found-nav-open')

  var main = document.querySelector('.found-main')
  if (main) main.scrollTop = 0

  if (section === 'overview') {
    renderOverview()
  } else if (section === 'advisor') {
    renderStrategyAdvisor()
  } else if (section === 'evidence-packet') {
    renderStrategyEvidencePacket()
  } else if (strategicDocPaths[section]) {
    renderStrategyDoc(section)
  } else {
    renderOverview()
  }
}

function init() {
  if (!window.location.hash) {
    window.location.hash = '#overview'
  }

  var toggleBtn = document.getElementById('found-mobile-toggle')
  var nav = document.getElementById('found-nav')
  if (toggleBtn && nav) {
    toggleBtn.addEventListener('click', function() {
      nav.classList.toggle('found-nav-open')
    })
  }

  initStrategyAdvisorHelper()
  window.addEventListener('hashchange', route)
  route()
}

init()

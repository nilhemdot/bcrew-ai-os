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
  strategyAdvisorMessages: [],
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

function postStrategyAdvisorQuestion(question) {
  return fetch('/api/strategic-execution/advisor', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, getAdminHeaders()),
    body: JSON.stringify({ question: question }),
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

function renderStrategyHealthCard(packetData) {
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
  summary.textContent = run && run.metadata && run.metadata.executiveSummary
    ? run.metadata.executiveSummary
    : 'Use this hub to ask source-backed strategy questions, review Attract / Grow / Retain signals, and decide what needs owner review next.'
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

function appendAdvisorMessage(role, text, meta) {
  var list = document.getElementById('strategy-advisor-messages')
  if (!list) return

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

function renderStrategyAdvisorPanel(packetData) {
  var article = document.createElement('article')
  article.className = 'section-card strategy-advisor-card'

  var title = document.createElement('h4')
  title.textContent = 'Ask Strategy AI'
  article.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'strategy-packet-summary'
  intro.textContent = 'Ask against the latest evidence packet, strategy docs, source snapshots, backlog, decisions, runtime facts, and extraction context. Answers must separate evidence from inference.'
  article.appendChild(intro)

  var promptRow = document.createElement('div')
  promptRow.className = 'strategy-prompt-row'
  ;[
    'Which departments are stuck, and what evidence proves it?',
    'What should tomorrow strategy session decide first?',
    'Map the biggest issues to Attract, Grow, Retain.',
    'What data is missing before we lock Q2 priorities?',
  ].forEach(function(prompt) {
    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'strategy-prompt-button'
    btn.textContent = prompt
    btn.addEventListener('click', function() {
      var input = document.getElementById('strategy-advisor-input')
      if (input) {
        input.value = prompt
        input.focus()
      }
    })
    promptRow.appendChild(btn)
  })
  article.appendChild(promptRow)

  var messages = document.createElement('div')
  messages.className = 'strategy-advisor-messages'
  messages.id = 'strategy-advisor-messages'
  article.appendChild(messages)

  var form = document.createElement('form')
  form.className = 'strategy-advisor-form'

  var input = document.createElement('textarea')
  input.id = 'strategy-advisor-input'
  input.rows = 4
  input.placeholder = 'Ask what the evidence says, what to decide, which department is stuck, or what is missing.'
  form.appendChild(input)

  var footer = document.createElement('div')
  footer.className = 'strategy-advisor-form-footer'

  var status = document.createElement('div')
  status.className = 'strategy-advisor-status'
  status.id = 'strategy-advisor-status'
  status.textContent = packetData && packetData.latestRun
    ? 'Using packet from ' + formatDate(packetData.latestRun.generatedAt)
    : 'No packet loaded yet'
  footer.appendChild(status)

  var submit = document.createElement('button')
  submit.type = 'submit'
  submit.className = 'strategy-advisor-submit'
  submit.textContent = 'Ask'
  footer.appendChild(submit)

  form.appendChild(footer)
  article.appendChild(form)

  if (!cache.strategyAdvisorMessages.length) {
    cache.strategyAdvisorMessages.push({
      role: 'assistant',
      text: 'I am wired to the latest strategy evidence packet and Foundation context. Ask me for the sharp read, not a generic brainstorm.',
      meta: '',
    })
  }

  form.addEventListener('submit', function(event) {
    event.preventDefault()
    var question = input.value.trim()
    if (!question) return

    input.value = ''
    submit.disabled = true
    submit.textContent = 'Thinking...'
    status.textContent = 'Calling Strategy Advisor...'
    cache.strategyAdvisorMessages.push({ role: 'user', text: question, meta: '' })
    appendAdvisorMessage('user', question)

    postStrategyAdvisorQuestion(question).then(function(result) {
      var meta = [result.model, result.provider, result.authPath].filter(Boolean).join(' · ')
      cache.strategyAdvisorMessages.push({ role: 'assistant', text: result.answer, meta: meta })
      appendAdvisorMessage('assistant', result.answer, meta)
      status.textContent = 'Answered ' + formatDate(result.generatedAt)
    }).catch(function(error) {
      var message = 'Advisor failed: ' + error.message
      cache.strategyAdvisorMessages.push({ role: 'assistant', text: message, meta: '' })
      appendAdvisorMessage('assistant', message)
      status.textContent = 'Advisor failed'
    }).finally(function() {
      submit.disabled = false
      submit.textContent = 'Ask'
    })
  })

  setTimeout(function() {
    cache.strategyAdvisorMessages.forEach(function(message) {
      appendAdvisorMessage(message.role, message.text, message.meta)
    })
  }, 0)

  return article
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

  Promise.all([fetchSourceOfTruth(), fetchStrategyEvidencePacket()]).then(function(results) {
    var data = results[0]
    var packetData = results[1]
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
    sectionList.appendChild(renderStrategyHealthCard(packetData))
    sectionList.appendChild(renderStrategyReviewBoard(packetData, { compact: true }))
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

  fetchStrategyEvidencePacket().then(function(packetData) {
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

  fetchStrategyEvidencePacket().then(function(packetData) {
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
    list.appendChild(renderStrategyAdvisorPanel(packetData))
    list.appendChild(renderStrategyReviewBoard(packetData, { compact: false }))
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

  window.addEventListener('hashchange', route)
  route()
}

init()

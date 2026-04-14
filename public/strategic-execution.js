function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return date.toLocaleString()
}

function getSection() {
  var hash = window.location.hash.replace('#', '')
  return hash || 'overview'
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
  'docs/strategy/financial-model-and-assumptions.md': 'financial-model',
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
  'quarterly-priorities': 'Quarterly Priorities',
  'strategic-issues': 'Strategic Issues',
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

function fetchDoc(docPath) {
  if (cache.docs[docPath]) return Promise.resolve(cache.docs[docPath])

  return fetch('/api/doc?path=' + encodeURIComponent(docPath)).then(function(res) {
    if (!res.ok) throw new Error('Document failed to load.')
    return res.json()
  }).then(function(data) {
    cache.docs[docPath] = data
    return data
  })
}

function renderOverview() {
  var container = document.getElementById('strategic-execution-content')
  container.innerHTML = '<p>Loading overview...</p>'

  fetchSourceOfTruth().then(function(data) {
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
    var currentQuarterSection = data.foundation.businessStrategy.sections.find(function(section) {
      return section.title === 'Current Quarter'
    })
    if (currentQuarterSection) {
      sectionList.appendChild(renderCurrentQuarterSection(currentQuarterSection, data.foundation.businessStrategy.meta.path, quarterlyDoc))
    }
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

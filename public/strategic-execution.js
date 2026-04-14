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

var sectionLabels = {
  'overview': 'Overview',
  'quarterly-priorities': 'Quarterly Priorities',
  'strategic-issues': 'Strategic Issues',
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

  var foundationSection = foundationDocPathToSection[basePath]
  if (foundationSection) {
    return '/foundation#' + foundationSection
  }

  var strategicSection = strategicExecutionDocPathToSection[basePath]
  if (strategicSection) {
    return '/strategic-execution#' + strategicSection
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

    if (line.startsWith('# ')) {
      var h1 = document.createElement('h2')
      h1.className = 'doc-markdown-heading doc-markdown-heading-1'
      appendFormattedText(line.slice(2).trim(), h1, currentPath)
      container.appendChild(h1)
      i++
      continue
    }

    if (line.startsWith('## ')) {
      var h2 = document.createElement('h3')
      h2.className = 'doc-markdown-heading doc-markdown-heading-2'
      var h2Text = line.slice(3).trim()
      h2.id = slugify(h2Text)
      appendFormattedText(h2Text, h2, currentPath)
      container.appendChild(h2)
      i++
      continue
    }

    if (line.startsWith('### ')) {
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

function renderOverviewCard(titleText, copyText, href, ctaLabel) {
  var article = document.createElement('article')
  article.className = 'section-card'

  var title = document.createElement('h4')
  title.textContent = titleText
  article.appendChild(title)

  var copy = document.createElement('p')
  copy.textContent = copyText
  article.appendChild(copy)

  if (href && ctaLabel) {
    var link = document.createElement('a')
    link.className = 'section-support-link'
    link.href = href
    link.textContent = ctaLabel
    article.appendChild(link)
  }

  return article
}

var cache = {
  docs: {},
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
  container.innerHTML = ''

  var hero = document.createElement('section')
  hero.className = 'hero'

  var heroInner = document.createElement('div')
  heroInner.className = 'hero-inner'

  var heroTitle = document.createElement('h1')
  heroTitle.textContent = 'Strategic Execution'
  heroInner.appendChild(heroTitle)

  var heroCopy = document.createElement('p')
  heroCopy.className = 'hero-copy'
  heroCopy.textContent = 'Foundation sets durable truth. Strategic Execution turns that truth into annual priorities, quarterly sprints, monthly plans, and weekly follow-through.'
  heroInner.appendChild(heroCopy)

  hero.appendChild(heroInner)
  container.appendChild(hero)

  var cadencePanel = document.createElement('section')
  cadencePanel.className = 'panel'

  var cadenceHeader = document.createElement('div')
  cadenceHeader.className = 'panel-header'

  var cadenceLeft = document.createElement('div')
  var cadenceEyebrow = document.createElement('div')
  cadenceEyebrow.className = 'eyebrow'
  cadenceEyebrow.textContent = 'Execution Cadence'
  cadenceLeft.appendChild(cadenceEyebrow)

  var cadenceTitle = document.createElement('h3')
  cadenceTitle.textContent = 'How strategy moves into work'
  cadenceLeft.appendChild(cadenceTitle)

  var cadenceIntro = document.createElement('p')
  cadenceIntro.className = 'section-intro'
  cadenceIntro.textContent = 'This hub is the planning-and-follow-through layer that sits below Foundation and above department execution.'
  cadenceLeft.appendChild(cadenceIntro)

  cadenceHeader.appendChild(cadenceLeft)
  cadencePanel.appendChild(cadenceHeader)

  var cadenceList = document.createElement('div')
  cadenceList.className = 'section-list'
  cadenceList.appendChild(renderOverviewCard('Annual Priorities', 'Set the year’s biggest moves and define what the company must get right.', null, null))
  cadenceList.appendChild(renderOverviewCard('Quarterly Sprints', 'Turn the annual priorities into a focused 90-day push.', '/strategic-execution#quarterly-priorities', 'Open quarterly priorities'))
  cadenceList.appendChild(renderOverviewCard('Monthly Plans', 'Check sequencing, adjust plans, and keep leaders aligned on what matters now.', null, null))
  cadenceList.appendChild(renderOverviewCard('Weekly Execution', 'Follow through on owners, decisions, pace, and blockers week to week.', null, null))
  cadencePanel.appendChild(cadenceList)
  container.appendChild(cadencePanel)

  var docsPanel = document.createElement('section')
  docsPanel.className = 'panel'

  var docsHeader = document.createElement('div')
  docsHeader.className = 'panel-header'

  var docsLeft = document.createElement('div')
  var docsEyebrow = document.createElement('div')
  docsEyebrow.className = 'eyebrow'
  docsEyebrow.textContent = 'Active Docs'
  docsLeft.appendChild(docsEyebrow)

  var docsTitle = document.createElement('h3')
  docsTitle.textContent = 'Current strategic execution packet'
  docsLeft.appendChild(docsTitle)
  docsHeader.appendChild(docsLeft)
  docsPanel.appendChild(docsHeader)

  var docsList = document.createElement('div')
  docsList.className = 'section-list'
  docsList.appendChild(renderOverviewCard('Quarterly Priorities', 'What matters this quarter, what winning looks like, and what should trigger structural response.', '/strategic-execution#quarterly-priorities', 'Open quarterly priorities'))
  docsList.appendChild(renderOverviewCard('Strategic Issues', 'The structural problems that explain why the current priorities exist.', '/strategic-execution#strategic-issues', 'Open strategic issues'))
  docsPanel.appendChild(docsList)
  container.appendChild(docsPanel)
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

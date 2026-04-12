function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return date.toLocaleString()
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

    if (line.startsWith('# ')) {
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

function groupSourceSnapshot(rows) {
  var groups = {}

  rows.forEach(function(row) {
    if (!groups[row.groupTitle]) groups[row.groupTitle] = []
    groups[row.groupTitle].push(row)
  })

  return groups
}

function renderSourceSnapshot(rows) {
  if (!rows || !rows.length) return

  var panel = document.getElementById('doc-source-panel')
  var copy = document.getElementById('doc-source-copy')
  var groupsEl = document.getElementById('doc-source-groups')
  var groups = groupSourceSnapshot(rows)
  var asOfValues = rows
    .map(function(row) { return row.asOf })
    .filter(Boolean)
  var uniqueAsOfValues = Array.from(new Set(asOfValues))

  copy.textContent = uniqueAsOfValues.length
    ? 'Current snapshot as of ' + uniqueAsOfValues.join(', ')
    : 'Source-backed snapshot'

  Object.keys(groups).forEach(function(groupTitle) {
    var groupRows = groups[groupTitle]
    var card = document.createElement('section')
    card.className = 'doc-source-card'

    var cardTop = document.createElement('div')
    cardTop.className = 'doc-source-card-top'

    var titleWrap = document.createElement('div')
    var title = document.createElement('h5')
    title.textContent = groupTitle
    titleWrap.appendChild(title)

    var sourceId = document.createElement('div')
    sourceId.className = 'doc-source-id'
    sourceId.textContent = groupRows[0].sourceId
    titleWrap.appendChild(sourceId)
    cardTop.appendChild(titleWrap)
    card.appendChild(cardTop)

    var table = document.createElement('table')
    table.className = 'doc-source-table'

    var tbody = document.createElement('tbody')
    groupRows.forEach(function(row) {
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

    if (groupRows[0].detail) {
      var detail = document.createElement('p')
      detail.className = 'doc-source-detail'
      detail.textContent = groupRows[0].detail
      card.appendChild(detail)
    }

    groupsEl.appendChild(card)
  })

  panel.hidden = false
}

async function init() {
  var pathValue = getQueryParam('path')
  var anchor = getQueryParam('anchor')

  if (!pathValue) throw new Error('Missing document path.')

  var response = await fetch('/api/doc?path=' + encodeURIComponent(pathValue))
  if (!response.ok) throw new Error('Document failed to load.')

  var data = await response.json()

  document.title = data.title + ' · BCrew AI OS'
  document.getElementById('doc-title').textContent = data.title
  document.getElementById('doc-subtitle').textContent = data.meta.path
  document.getElementById('doc-meta').textContent =
    data.meta.lines + ' lines · updated ' + formatDate(data.meta.updatedAt)

  renderSourceSnapshot(data.sourceSnapshot)

  var content = document.getElementById('doc-content')
  content.appendChild(renderMarkdownBlock(data.content, data.meta.path))

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

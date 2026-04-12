function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return date.toLocaleString()
}

function renderMeta(meta) {
  if (!meta.exists) return 'Missing'
  return meta.path + ' \u00b7 ' + meta.lines + ' lines \u00b7 updated ' + formatDate(meta.updatedAt)
}

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

/* ── Inline formatting: **bold**, `code`, [link](url) ── */
function appendFormattedText(text, parent) {
  var re = /(\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g
  var last = 0
  var m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)))
    if (m[2]) {
      var s = document.createElement('strong')
      s.textContent = m[2]
      parent.appendChild(s)
    } else if (m[3]) {
      var c = document.createElement('code')
      c.textContent = m[3]
      parent.appendChild(c)
    } else if (m[4] && m[5]) {
      var a = document.createElement('a')
      a.textContent = m[4]
      a.setAttribute('href', m[5])
      a.className = 'md-link'
      parent.appendChild(a)
    }
    last = re.lastIndex
  }
  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)))
}

/* ── Table parser ── */
function isTableRow(line) {
  return line.trim().startsWith('|') && line.trim().endsWith('|')
}

function isSeparatorRow(line) {
  return /^\|[\s\-:|]+\|$/.test(line.trim())
}

function parseTableCells(line) {
  return line.split('|').slice(1, -1).map(function(cell) { return cell.trim() })
}

function renderTable(rows) {
  var table = document.createElement('table')
  table.className = 'md-table'

  var headerCells = parseTableCells(rows[0])
  var thead = document.createElement('thead')
  var headerRow = document.createElement('tr')
  headerCells.forEach(function(cell) {
    var th = document.createElement('th')
    appendFormattedText(cell, th)
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  for (var i = 2; i < rows.length; i++) {
    var cells = parseTableCells(rows[i])
    var tr = document.createElement('tr')
    cells.forEach(function(cell) {
      var td = document.createElement('td')
      appendFormattedText(cell, td)
      tr.appendChild(td)
    })
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)
  return table
}

/* ── Main markdown renderer ── */
function renderMarkdownBlock(markdown) {
  var container = document.createElement('div')
  container.className = 'markdown-block'

  var lines = markdown.split('\n')
  var i = 0

  while (i < lines.length) {
    var line = lines[i]

    // Skip empty lines
    if (line.trim() === '') { i++; continue }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      container.appendChild(document.createElement('hr'))
      i++
      continue
    }

    // Sub-heading (### inside a section)
    if (line.startsWith('### ')) {
      var h = document.createElement('h5')
      h.className = 'md-subheading'
      appendFormattedText(line.slice(4).trim(), h)
      container.appendChild(h)
      i++
      continue
    }

    // Table block
    if (isTableRow(line)) {
      var tableRows = []
      while (i < lines.length && isTableRow(lines[i])) {
        if (!isSeparatorRow(lines[i])) {
          tableRows.push(lines[i])
        } else {
          tableRows.splice(1, 0, lines[i]) // keep separator at position 1 for renderTable
        }
        i++
      }
      if (tableRows.length >= 2) {
        container.appendChild(renderTable(tableRows))
      }
      continue
    }

    // Numbered list (1. , 2. , etc.)
    if (/^\d+\.\s/.test(line)) {
      var ol = document.createElement('ol')
      ol.className = 'md-ol'
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        var oli = document.createElement('li')
        appendFormattedText(lines[i].replace(/^\d+\.\s/, ''), oli)
        ol.appendChild(oli)
        i++
      }
      container.appendChild(ol)
      continue
    }

    // Unordered list
    if (line.startsWith('- ')) {
      var ul = document.createElement('ul')
      while (i < lines.length && lines[i].startsWith('- ')) {
        var li = document.createElement('li')
        appendFormattedText(lines[i].slice(2), li)
        ul.appendChild(li)
        i++
      }
      container.appendChild(ul)
      continue
    }

    // Paragraph
    var p = document.createElement('p')
    appendFormattedText(line, p)
    container.appendChild(p)
    i++
  }

  return container
}

function renderSection(section) {
  var article = document.createElement('article')
  article.className = 'section-card'

  var title = document.createElement('h4')
  appendFormattedText(section.title, title)
  article.appendChild(title)
  article.appendChild(renderMarkdownBlock(section.content))

  return article
}

function renderDocCard(doc) {
  var article = document.createElement('article')
  article.className = 'section-card'

  var title = document.createElement('h4')
  title.textContent = doc.meta.path
  article.appendChild(title)

  var meta = document.createElement('p')
  meta.className = 'support-meta'
  meta.textContent = doc.meta.exists
    ? doc.meta.lines + ' lines \u00b7 updated ' + formatDate(doc.meta.updatedAt)
    : 'Missing'
  article.appendChild(meta)

  doc.sections.slice(0, 3).forEach(function(section) {
    var sub = document.createElement('div')
    sub.className = 'support-section'

    var subTitle = document.createElement('h5')
    appendFormattedText(section.title, subTitle)
    sub.appendChild(subTitle)
    sub.appendChild(renderMarkdownBlock(section.content))
    article.appendChild(sub)
  })

  return article
}

async function init() {
  var response = await fetch('/api/source-of-truth')
  var data = await response.json()

  document.getElementById('hero-copy').textContent =
    'Foundation layer of the BCrew AI OS. Strategy docs, system status, and data source connectivity.'

  var statusGrid = document.getElementById('status-grid')
  data.systemStatus.forEach(function(item) { statusGrid.appendChild(renderStatusCard(item)) })

  document.getElementById('business-meta').textContent = renderMeta(data.foundation.businessStrategy.meta)
  document.getElementById('registry-meta').textContent = renderMeta(data.foundation.sourceRegistry.meta)

  var businessSections = document.getElementById('business-sections')
  data.foundation.businessStrategy.sections.forEach(function(section) {
    businessSections.appendChild(renderSection(section))
  })

  var supporting = document.getElementById('supporting-strategy')
  data.foundation.supportingStrategy.forEach(function(doc) {
    supporting.appendChild(renderDocCard(doc))
  })

  var registrySections = document.getElementById('registry-sections')
  if (!data.foundation.sourceRegistry.meta.exists) {
    var notice = document.createElement('p')
    notice.textContent = 'Source registry not found. Create docs/source-registry.md.'
    registrySections.appendChild(notice)
    return
  }

  registrySections.className = 'section-list'
  data.foundation.sourceRegistry.sections.forEach(function(section) {
    registrySections.appendChild(renderSection(section))
  })
}

init().catch(function(error) {
  document.getElementById('hero-copy').textContent = 'Failed to load dashboard: ' + error.message
})

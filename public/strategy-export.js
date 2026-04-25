function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date) + ' ET'
}

function formatAsOfDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getAdminHeaders() {
  try {
    var token = window.localStorage && window.localStorage.getItem('BCREW_ADMIN_TOKEN')
    return token ? { 'X-Admin-Token': token } : {}
  } catch (error) {
    return {}
  }
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function appendFormattedText(text, parent) {
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
      var link = document.createElement('span')
      link.className = 'strategy-export-inline-link'
      link.textContent = m[4]
      parent.appendChild(link)
    }

    last = re.lastIndex
  }

  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)))
}

function renderMarkdownBlock(markdown) {
  var container = document.createElement('div')
  container.className = 'strategy-export-markdown'
  var lines = (markdown || '').split('\n')
  var i = 0

  while (i < lines.length) {
    var line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

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

    if (line.startsWith('- ')) {
      var ul = document.createElement('ul')
      ul.className = 'md-ul'
      while (i < lines.length && lines[i].startsWith('- ')) {
        var li = document.createElement('li')
        appendFormattedText(lines[i].slice(2), li)
        ul.appendChild(li)
        i++
      }
      container.appendChild(ul)
      continue
    }

    var p = document.createElement('p')
    appendFormattedText(line, p)
    container.appendChild(p)
    i++
  }

  return container
}

function fetchSourceOfTruth() {
  return fetch('/api/source-of-truth', { headers: getAdminHeaders() }).then(function(res) {
    if (!res.ok) throw new Error('Source of truth API failed.')
    return res.json()
  })
}

function downloadStrategyPdf() {
  fetch('/foundation/export/strategy.pdf', { headers: getAdminHeaders() }).then(function(res) {
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

function buildCover(meta, sections) {
  var cover = document.createElement('section')
  cover.className = 'strategy-export-cover'

  var top = document.createElement('div')
  top.className = 'strategy-export-cover-top'

  var logo = document.createElement('img')
  logo.src = '/assets/bc-logo.svg'
  logo.alt = 'Benson Crew logo'
  logo.className = 'strategy-export-logo'
  top.appendChild(logo)

  var kicker = document.createElement('div')
  kicker.className = 'strategy-export-kicker'
  kicker.textContent = 'BCrew AI OS · Foundation'
  top.appendChild(kicker)

  cover.appendChild(top)

  var title = document.createElement('h1')
  title.className = 'strategy-export-title'
  title.textContent = 'Benson Crew Business Strategy'
  cover.appendChild(title)

  var subtitle = document.createElement('p')
  subtitle.className = 'strategy-export-subtitle'
  subtitle.textContent = 'Durable business direction for Benson Crew. This export reflects the current live strategy packet in Foundation.'
  cover.appendChild(subtitle)

  var metaGrid = document.createElement('div')
  metaGrid.className = 'strategy-export-meta-grid'

  ;[
    ['Packet', 'Business Strategy'],
    ['Sections', String(sections.length)],
    ['Updated', formatDate(meta.updatedAt)],
    ['Exported', formatDate(new Date().toISOString())],
  ].forEach(function(entry) {
    var card = document.createElement('div')
    card.className = 'strategy-export-meta-card'

    var label = document.createElement('div')
    label.className = 'strategy-export-meta-label'
    label.textContent = entry[0]
    card.appendChild(label)

    var value = document.createElement('div')
    value.className = 'strategy-export-meta-value'
    value.textContent = entry[1]
    card.appendChild(value)

    metaGrid.appendChild(card)
  })

  cover.appendChild(metaGrid)

  var toc = document.createElement('div')
  toc.className = 'strategy-export-toc'

  var tocTitle = document.createElement('h2')
  tocTitle.textContent = 'Included Sections'
  toc.appendChild(tocTitle)

  var tocList = document.createElement('div')
  tocList.className = 'strategy-export-toc-list'
  sections.forEach(function(section, index) {
    var item = document.createElement('div')
    item.className = 'strategy-export-toc-item'

    var num = document.createElement('span')
    num.className = 'strategy-export-toc-num'
    num.textContent = String(index + 1).padStart(2, '0')
    item.appendChild(num)

    var name = document.createElement('span')
    name.className = 'strategy-export-toc-name'
    name.textContent = section.title
    item.appendChild(name)

    tocList.appendChild(item)
  })
  toc.appendChild(tocList)
  cover.appendChild(toc)

  var footer = document.createElement('div')
  footer.className = 'strategy-export-footer strategy-export-cover-footer'
  footer.textContent = 'Benson Crew Business Strategy · Live Foundation export · ' + formatAsOfDate(new Date().toISOString())
  cover.appendChild(footer)

  return cover
}

function buildSectionPage(section, index, total) {
  var page = document.createElement('section')
  page.className = 'strategy-export-page'
  page.id = slugify(section.title)

  var header = document.createElement('div')
  header.className = 'strategy-export-page-header'

  var num = document.createElement('div')
  num.className = 'strategy-export-section-num'
  num.textContent = String(index + 1).padStart(2, '0')
  header.appendChild(num)

  var titleWrap = document.createElement('div')

  var kicker = document.createElement('div')
  kicker.className = 'strategy-export-section-kicker'
  kicker.textContent = 'Business Strategy'
  titleWrap.appendChild(kicker)

  var title = document.createElement('h2')
  title.className = 'strategy-export-section-title'
  title.textContent = section.title
  titleWrap.appendChild(title)

  header.appendChild(titleWrap)
  page.appendChild(header)

  var body = document.createElement('div')
  body.className = 'strategy-export-page-body'
  body.appendChild(renderMarkdownBlock(section.content))
  page.appendChild(body)

  var footer = document.createElement('div')
  footer.className = 'strategy-export-footer'
  footer.textContent = 'Benson Crew Business Strategy · Section ' + String(index + 1).padStart(2, '0') + ' of ' + String(total).padStart(2, '0')
  page.appendChild(footer)

  return page
}

function buildToolbar() {
  var bar = document.createElement('div')
  bar.className = 'strategy-export-toolbar'

  var title = document.createElement('div')
  title.className = 'strategy-export-toolbar-title'
  title.textContent = 'Business Strategy PDF Export'
  bar.appendChild(title)

  var actions = document.createElement('div')
  actions.className = 'strategy-export-toolbar-actions'

  var print = document.createElement('button')
  print.className = 'secondary-button'
  print.type = 'button'
  print.textContent = 'Download PDF'
  print.addEventListener('click', function() {
    downloadStrategyPdf()
  })
  actions.appendChild(print)

  var close = document.createElement('button')
  close.className = 'secondary-button'
  close.type = 'button'
  close.textContent = 'Close'
  close.addEventListener('click', function() { window.close() })
  actions.appendChild(close)

  bar.appendChild(actions)
  return bar
}

fetchSourceOfTruth().then(function(data) {
  var root = document.getElementById('strategy-export-root')
  root.innerHTML = ''

  var packet = data.foundation.businessStrategy
  var sections = packet.sections || []

  root.appendChild(buildToolbar())
  root.appendChild(buildCover(packet.meta, sections))

  sections.forEach(function(section, index) {
    root.appendChild(buildSectionPage(section, index, sections.length))
  })
}).catch(function(error) {
  var root = document.getElementById('strategy-export-root')
  root.innerHTML = ''
  var msg = document.createElement('p')
  msg.textContent = 'Failed to prepare strategy export: ' + error.message
  root.appendChild(msg)
})

function formatDate(isoString) {
  if (!isoString) return 'Not available'
  const date = new Date(isoString)
  return date.toLocaleString()
}

function renderMeta(meta) {
  if (!meta.exists) return 'Missing'
  return `${meta.path} · ${meta.lines} lines · updated ${formatDate(meta.updatedAt)}`
}

function renderStatusCard(item) {
  const card = document.createElement('article')
  card.className = `status-card status-${item.status}`
  card.innerHTML = `
    <div class="status-top">
      <span class="status-label">${item.label}</span>
      <span class="status-pill">${item.status}</span>
    </div>
    <p>${item.detail}</p>
  `
  return card
}

function appendFormattedText(text, parent) {
  var re = /(\*\*(.+?)\*\*|`(.+?)`)/g
  var last = 0
  var m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)))
    if (m[2]) { var s = document.createElement('strong'); s.textContent = m[2]; parent.appendChild(s) }
    else if (m[3]) { var c = document.createElement('code'); c.textContent = m[3]; parent.appendChild(c) }
    last = re.lastIndex
  }
  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)))
}

function renderMarkdownBlock(markdown) {
  const container = document.createElement('div')
  container.className = 'markdown-block'

  const lines = markdown.split('\n').filter(Boolean)
  let list = null

  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (!list) {
        list = document.createElement('ul')
        container.appendChild(list)
      }
      const li = document.createElement('li')
      appendFormattedText(line.slice(2), li)
      list.appendChild(li)
      continue
    }

    list = null
    const p = document.createElement('p')
    appendFormattedText(line, p)
    container.appendChild(p)
  }

  return container
}

function renderSection(section) {
  const article = document.createElement('article')
  article.className = 'section-card'

  const title = document.createElement('h4')
  title.textContent = section.title
  article.appendChild(title)
  article.appendChild(renderMarkdownBlock(section.content))

  return article
}

function renderDocCard(doc) {
  const article = document.createElement('article')
  article.className = 'section-card'

  const title = document.createElement('h4')
  title.textContent = doc.meta.path
  article.appendChild(title)

  const meta = document.createElement('p')
  meta.className = 'support-meta'
  meta.textContent = doc.meta.exists
    ? `${doc.meta.lines} lines · updated ${formatDate(doc.meta.updatedAt)}`
    : 'Missing'
  article.appendChild(meta)

  doc.sections.slice(0, 2).forEach(section => {
    const sub = document.createElement('div')
    sub.className = 'support-section'

    const subTitle = document.createElement('h5')
    subTitle.textContent = section.title
    sub.appendChild(subTitle)
    sub.appendChild(renderMarkdownBlock(section.content))
    article.appendChild(sub)
  })

  return article
}

async function init() {
  const response = await fetch('/api/source-of-truth')
  const data = await response.json()

  document.getElementById('hero-copy').textContent =
    'This is the first visible slice of the rebuild: one live strategy source, clear system status, and obvious gaps.'

  const statusGrid = document.getElementById('status-grid')
  data.systemStatus.forEach(item => statusGrid.appendChild(renderStatusCard(item)))

  document.getElementById('business-meta').textContent = renderMeta(data.foundation.businessStrategy.meta)
  document.getElementById('registry-meta').textContent = renderMeta(data.foundation.sourceRegistry.meta)

  const businessSections = document.getElementById('business-sections')
  data.foundation.businessStrategy.sections.forEach(section => {
    businessSections.appendChild(renderSection(section))
  })

  const supporting = document.getElementById('supporting-strategy')
  data.foundation.supportingStrategy.forEach(doc => {
    supporting.appendChild(renderDocCard(doc))
  })

  const registrySections = document.getElementById('registry-sections')
  if (!data.foundation.sourceRegistry.meta.exists) {
    registrySections.innerHTML = `
      <p>The next foundation file should be <code>docs/source-registry.md</code>.</p>
      <p>It should list every source the system will read, the owner, the access method, and whether it is wired.</p>
    `
    return
  }

  registrySections.className = 'section-list'
  data.foundation.sourceRegistry.sections.forEach(section => {
    registrySections.appendChild(renderSection(section))
  })
}

init().catch(error => {
  document.getElementById('hero-copy').textContent = `Failed to load dashboard: ${error.message}`
})

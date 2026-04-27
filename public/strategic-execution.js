;(function() {
  var manifestPath = 'docs/specs/2026-04-27-strategy-hub-v2-source-to-gap-manifest.md'

  function appendText(parent, tagName, text, className) {
    var el = document.createElement(tagName)
    if (className) el.className = className
    el.textContent = text
    parent.appendChild(el)
    return el
  }

  function appendList(parent, items) {
    var list = document.createElement('ul')
    list.className = 'strategy-packet-item-list'
    items.forEach(function(item) {
      var row = document.createElement('li')
      row.className = 'strategy-packet-item'
      row.textContent = item
      list.appendChild(row)
    })
    parent.appendChild(list)
    return list
  }

  function appendCard(parent, title, items) {
    var card = document.createElement('article')
    card.className = 'section-card strategy-packet-card'
    appendText(card, 'h4', title)
    appendList(card, items)
    parent.appendChild(card)
    return card
  }

  function renderStub() {
    var container = document.getElementById('strategic-execution-content')
    if (!container) return
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero'
    appendText(hero, 'div', 'Phase 1 Safety Stub', 'eyebrow')
    appendText(hero, 'h1', 'Strategy Hub v2 in progress')
    appendText(
      hero,
      'p',
      'The old active strategy surface is disabled while the source-to-gap, memory, retrieval, synthesis-facts, and action-routing layers are rebuilt in the approved order.',
    )
    container.appendChild(hero)

    var panel = document.createElement('section')
    panel.className = 'panel'

    var header = document.createElement('div')
    header.className = 'panel-header'
    var headerCopy = document.createElement('div')
    appendText(headerCopy, 'div', 'Current State', 'eyebrow')
    appendText(headerCopy, 'h3', 'Unsafe recommendation surface is offline')
    header.appendChild(headerCopy)
    appendText(header, 'div', 'Awaiting next approved phase', 'doc-meta')
    panel.appendChild(header)

    var list = document.createElement('div')
    list.className = 'section-list'

    appendCard(list, 'What is disabled', [
      'Active strategy recommendations from the old packet surface.',
      'Live advisor-style synthesis on the Strategy Hub page.',
      'Any dashboard claim that is not tied to target, actual, gap, owner, source proof, and freshness.',
    ])

    appendCard(list, 'Approved next sequence', [
      'Keep this safety stub and verifier guard active.',
      'REPORT-MINING-001 is accepted and INTEL-ATOM-001 has the v1 report/atom/hit substrate.',
      'Build retrieval next, then synthesis facts, synthesis, and Action Router.',
    ])

    var manifestCard = appendCard(list, 'Trust gate artifact', [
      'Phase 0 source-to-gap manifest is the controlling artifact for the next build.',
      'Deterministic source snapshots and gap math are future Strategy Hub work, not the current build lane.',
      'LLM explanations, doctrine drilldowns, recommended actions, and routing remain blocked until their prerequisites are real.',
    ])
    var link = document.createElement('a')
    link.className = 'section-support-link'
    link.href = '/doc?path=' + encodeURIComponent(manifestPath)
    link.textContent = 'Open source-to-gap manifest'
    manifestCard.appendChild(link)

    panel.appendChild(list)
    container.appendChild(panel)
  }

  function init() {
    var navItem = document.querySelector('[data-section="overview"]')
    if (navItem) navItem.classList.add('found-nav-active')

    var breadcrumb = document.getElementById('found-breadcrumb-page')
    if (breadcrumb) breadcrumb.textContent = 'In Progress'

    var toggleBtn = document.getElementById('found-mobile-toggle')
    var nav = document.getElementById('found-nav')
    if (toggleBtn && nav) {
      toggleBtn.addEventListener('click', function() {
        nav.classList.toggle('found-nav-open')
      })
    }

    renderStub()
  }

  init()
})()

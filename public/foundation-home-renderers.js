/* Foundation legacy home renderer and sequence data. */

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

function renderFoundationHome() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading Foundation.</p>'

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
    msg.textContent = 'Foundation home could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

/* ── section renderers ───────────────────────────────────── */

/* Backlog route renderers. Loaded after foundation.js so this owns backlog loading. */

function getBacklogFocusIds() {
  return getSection() === 'backlog'
    ? getSectionFocus().split(',').map(function(id) { return id.trim() }).filter(Boolean)
    : []
}

function renderBacklogArchiveActions(summary) {
  var actions = document.createElement('div')
  actions.className = 'foundation-hero-actions'
  if (summary && Number(summary.archivedDoneItems || 0) > 0) {
    actions.appendChild(createActionLink('Done Archive', '/foundation#backlog-done-archive', 'print-button'))
  }
  return actions
}

function renderBacklog() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading live backlog.</p>'

  var focusedIds = getBacklogFocusIds()
  Promise.all([
    fetchFoundationBacklog({ ids: focusedIds }),
    fetchActionReview().catch(function(error) {
      return { error: error.message || 'Action Review could not load.' }
    }),
  ]).then(function(results) {
    var hub = results[0]
    var actionReview = results[1]
    var summary = hub.summary || {}
    backlogScopeRegistry = (hub.meta && hub.meta.backlogScopes && hub.meta.backlogScopes.length)
      ? hub.meta.backlogScopes.slice()
      : fallbackBacklogScopes.slice()
    backlogViewState.ids = focusedIds
    if (focusedIds.length) {
      backlogViewState.scope = 'all'
      backlogViewState.priority = 'all'
      backlogViewState.query = ''
    }

    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = focusedIds.length ? 'Focused Backlog View' : 'Foundation Backlog'
    heroInner.appendChild(heroTitle)

    var scopeSummary = getActiveBacklogScopes().map(function(scope) {
      var count = (hub.backlogItems || []).filter(function(item) { return item.scope === scope.key }).length
      if (!count) return null
      return count + ' ' + getBacklogScopeShortLabel(scope.key)
    }).filter(Boolean).join(' · ')
    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = focusedIds.length
      ? focusedIds.length + ' linked cards from the page you clicked. Clear focus to see the full queue.'
      : (summary.totalItems || hub.backlogItems.length) + ' live cards · ' + (summary.visibleItems || hub.backlogItems.length) + ' loaded now · ' + (summary.archivedDoneItems || 0) + ' older done behind archive' + (scopeSummary ? ' · ' + scopeSummary : '')
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    if (focusedIds.length) {
      var focusActions = document.createElement('div')
      focusActions.className = 'foundation-hero-actions'
      focusActions.appendChild(createActionLink('Clear Focus', '/foundation#backlog', 'print-button'))
      if (Number(summary.archivedDoneItems || 0) > 0) {
        focusActions.appendChild(createActionLink('Done Archive', '/foundation#backlog-done-archive', 'print-button'))
      }
      hero.appendChild(focusActions)
    } else {
      hero.appendChild(renderBacklogArchiveActions(summary))
    }
    container.appendChild(hero)

    var purposePanel = renderFoundationOperationsPurposePanel('backlog', hub)
    if (purposePanel) container.appendChild(purposePanel)

    container.appendChild(renderOperatorToolsDrawer(
      'Operator tools',
      'Create and edit controls live here when you need them. The queue itself stays front and center.',
      [renderAdminTokenPanel(), renderBacklogCreatePanel(hub)],
      false
    ))

    container.appendChild(renderActionReviewPanel(actionReview))

    var researchCurationPanel = renderResearchCurationPanel(hub.researchCuration)
    if (researchCurationPanel) container.appendChild(researchCurationPanel)

    var boardPanel = document.createElement('section')
    boardPanel.className = 'panel'

    var boardHeader = document.createElement('div')
    boardHeader.className = 'panel-header'

    var boardLeft = document.createElement('div')
    var boardEyebrow = document.createElement('div')
    boardEyebrow.className = 'eyebrow'
    boardEyebrow.textContent = 'Foundation Queue'
    boardLeft.appendChild(boardEyebrow)

    var boardTitle = document.createElement('h3')
    boardTitle.textContent = 'Work queue'
    boardLeft.appendChild(boardTitle)

    var boardIntro = document.createElement('p')
    boardIntro.className = 'section-intro'
    boardIntro.textContent = focusedIds.length
      ? 'This is the exact queue for the surface you clicked. Review workflow stage first, then priority.'
      : 'Review workflow stage first, then priority. Older done cards are available in the explicit done archive.'
    boardLeft.appendChild(boardIntro)

    boardHeader.appendChild(boardLeft)
    boardPanel.appendChild(boardHeader)

    var controls = document.createElement('div')
    controls.className = 'operations-toolbar'

    var searchField = document.createElement('div')
    searchField.className = 'operations-search'
    var searchInput = buildInput('search', 'Search cards by ID, title, owner, source, or closeout note')
    searchInput.value = backlogViewState.query
    searchField.appendChild(searchInput)
    controls.appendChild(searchField)

    var teamGroup = document.createElement('div')
    teamGroup.className = 'operations-filter-group'
    var teamLabel = document.createElement('span')
    teamLabel.className = 'operations-filter-label'
    teamLabel.textContent = 'Scope'
    teamGroup.appendChild(teamLabel)

    var teamButtons = []
    ;([{ key: 'all', label: 'All' }]).concat(getActiveBacklogScopes().map(function(scope) {
      return { key: scope.key, label: scope.label }
    })).forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'operations-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        backlogViewState.scope = option.key
        applyBacklogFilters()
      })
      teamButtons.push({ key: option.key, button: button })
      teamGroup.appendChild(button)
    })
    controls.appendChild(teamGroup)

    var priorityGroup = document.createElement('div')
    priorityGroup.className = 'operations-filter-group'
    var priorityLabel = document.createElement('span')
    priorityLabel.className = 'operations-filter-label'
    priorityLabel.textContent = 'Priority'
    priorityGroup.appendChild(priorityLabel)

    var priorityButtons = []
    ;[
      { key: 'all', label: 'All' },
      { key: 'P0', label: 'P0' },
      { key: 'P1', label: 'P1' },
      { key: 'P2', label: 'P2' },
      { key: 'P3', label: 'P3' },
    ].forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'operations-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        backlogViewState.priority = option.key
        applyBacklogFilters()
      })
      priorityButtons.push({ key: option.key, button: button })
      priorityGroup.appendChild(button)
    })
    controls.appendChild(priorityGroup)

    boardPanel.appendChild(controls)

    var backlogResults = document.createElement('p')
    backlogResults.className = 'operations-results-meta'
    boardPanel.appendChild(backlogResults)

    var boardWrap = document.createElement('div')
    boardWrap.className = 'backlog-stack-list'
    boardPanel.appendChild(boardWrap)
    container.appendChild(boardPanel)

    function syncTeamButtons() {
      teamButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', backlogViewState.scope === item.key)
      })
      priorityButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', backlogViewState.priority === item.key)
      })
    }

    function applyBacklogFilters() {
      syncTeamButtons()

      var filteredItems = filterBacklogItems(hub.backlogItems || [], backlogViewState)
      var scopeLabel = backlogViewState.scope === 'all'
        ? 'root rebuild backlog'
        : getBacklogScopeShortLabel(backlogViewState.scope) + ' items'
      var priorityLabel = backlogViewState.priority === 'all' ? 'all priorities' : backlogViewState.priority
      backlogResults.textContent = focusedIds.length
        ? 'Showing ' + filteredItems.length + ' linked cards grouped by workflow stage.'
        : 'Showing ' + filteredItems.length + ' loaded cards · ' + scopeLabel + ' · ' + priorityLabel + ' · grouped by workflow stage.'

      boardWrap.innerHTML = ''

      backlogWorkflowStages.forEach(function(group) {
        var groupItems = filteredItems.filter(function(item) {
          return group.lanes.indexOf(item.lane) !== -1
        })
        boardWrap.appendChild(renderBacklogWorkflowStack(group, groupItems))
      })
    }

    searchInput.addEventListener('input', function() {
      backlogViewState.query = searchInput.value
      applyBacklogFilters()
    })

    applyBacklogFilters()
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Backlog could not load. No cards were changed. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderBacklogDoneArchive() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading done archive.</p>'

  fetchFoundationBacklogDoneArchive().then(function(payload) {
    var summary = payload.summary || {}
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero'
    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'
    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Done Archive'
    heroInner.appendChild(heroTitle)
    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = (summary.archivedDoneItems || 0) + ' older done cards · ' + (summary.doneItems || 0) + ' total done · history preserved'
    heroInner.appendChild(heroMeta)
    hero.appendChild(heroInner)
    var actions = document.createElement('div')
    actions.className = 'foundation-hero-actions'
    actions.appendChild(createActionLink('Backlog', '/foundation#backlog', 'print-button'))
    hero.appendChild(actions)
    container.appendChild(hero)

    var panel = document.createElement('section')
    panel.className = 'panel'
    var header = document.createElement('div')
    header.className = 'panel-header'
    var left = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Backlog History'
    left.appendChild(eyebrow)
    var title = document.createElement('h3')
    title.textContent = 'Older done cards'
    left.appendChild(title)
    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = 'Recent Work remains the shipped-build timeline. This archive keeps older done backlog rows accessible without loading them into the default queue.'
    left.appendChild(intro)
    header.appendChild(left)
    panel.appendChild(header)

    var stack = renderBacklogWorkflowStack({
      key: 'done-archive',
      label: 'Done Archive',
      lanes: ['done'],
      intro: 'Closed work loaded only from the explicit done archive route.',
    }, payload.backlogItems || [])
    stack.open = true
    panel.appendChild(stack)
    container.appendChild(panel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Done archive could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

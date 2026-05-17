/* Foundation hash router and initialization extracted from public/foundation.js. */

/* ── router ──────────────────────────────────────────────── */

function getSection() {
  var hash = window.location.hash.replace('#', '')
  return (hash.split(':')[0] || 'home') || 'home'
}

function getSectionFocus() {
  var hash = window.location.hash.replace('#', '')
  var parts = hash.split(':')
  return parts.length > 1 ? parts.slice(1).join(':') : ''
}

function applySectionFocus() {
  var focusId = getSectionFocus()
  if (!focusId) return

  var attempts = 0

  function openDetailsChain(target) {
    var node = target
    while (node) {
      if (node.tagName === 'DETAILS') node.open = true
      node = node.parentElement
    }
  }

  function tryFocus() {
    var target = document.getElementById(focusId)
    if (target) {
      openDetailsChain(target)
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    attempts += 1
    if (attempts < 12) {
      window.setTimeout(tryFocus, 120)
    }
  }

  window.requestAnimationFrame(tryFocus)
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

  var breadcrumbParent = document.getElementById('found-breadcrumb-parent')
  var breadcrumbParentSep = document.getElementById('found-breadcrumb-parent-sep')
  if (breadcrumbParent && breadcrumbParentSep) {
    var parent = sectionParents[section] || null

    if (parent && section !== 'home') {
      breadcrumbParent.textContent = parent.label
      breadcrumbParent.href = parent.href
      breadcrumbParent.hidden = false
      breadcrumbParentSep.hidden = false
    } else {
      breadcrumbParent.hidden = true
      breadcrumbParentSep.hidden = true
    }
  }
}

function route() {
  var section = getSection()

  if (section === 'home') {
    window.location.replace('/foundation#current-state')
    return
  }

  if (section === 'quarterly-priorities' || section === 'strategic-issues') {
    window.location.replace('/strategic-execution#' + section)
    return
  }

  if (section === 'data-health') {
    section = 'system-health'
    window.location.replace('/foundation#system-health')
    return
  }

  if (section === 'source-registry') {
    section = 'source-overview'
    window.location.replace('/foundation#source-overview')
    return
  }

  if (section === 'north-star') {
    window.location.replace('/foundation#bhag-model')
    return
  }

  if (section === 'financial-model') {
    window.location.replace('/foundation#agent-engine')
    return
  }

  if (section === 'ops-hub') {
    window.location.replace('/ops')
    return
  }

  updateNav(section)

  /* close mobile nav on route change */
  var nav = document.getElementById('found-nav')
  if (nav) nav.classList.remove('found-nav-open')

  /* scroll to top */
  var main = document.querySelector('.found-main')
  if (main) main.scrollTop = 0

  if (section === 'current-state') {
    renderCurrentState()
  } else if (section === 'systems') {
    renderFoundationSystems()
  } else if (section === 'overview') {
    renderOverview()
  } else if (strategyDocPaths[section]) {
    renderStrategyDoc(section)
  } else if (section === 'backlog') {
    renderBacklog()
  } else if (section === 'backlog-done-archive') {
    renderBacklogDoneArchive()
  } else if (section === 'daily-summary') {
    renderDailySummary()
  } else if (section === 'decisions') {
    renderDecisions()
  } else if (section === 'open-questions') {
    renderOpenQuestions()
  } else if (section === 'build-log') {
    renderBuildLog()
  } else if (section === 'source-lifecycle') {
    renderSourceLifecycle()
  } else if (sourceSectionConfigs[section]) {
    renderSourceRegistry(section)
  } else if (section === 'inventory-docs') {
    renderInventoryDocs()
  } else if (section === 'inventory-archive-history') {
    renderInventoryArchiveHistory()
  } else if (capabilityCatalog[section]) {
    renderCapabilitySection(section)
  } else if (section === 'system-health') {
    renderDataHealth()
  } else if (section === 'system-activity') {
    renderSystemActivity()
  } else {
    renderOverview()
  }

  applySectionFocus()
}

/* ── init ────────────────────────────────────────────────── */

function init() {
  /* default hash */
if (!window.location.hash) {
    window.location.hash = '#current-state'
  }

  /* mobile toggle */
  var toggleBtn = document.getElementById('found-mobile-toggle')
  var nav = document.getElementById('found-nav')
  if (toggleBtn && nav) {
    toggleBtn.addEventListener('click', function() {
      nav.classList.toggle('found-nav-open')
    })
  }

  /* route on hash change */
  window.addEventListener('hashchange', route)

  /* initial render */
  route()
}

init()

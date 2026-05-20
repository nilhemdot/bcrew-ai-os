/* Foundation strategy packet and strategy document renderers. */

var sectionSupportDocs = {
  'North Star': {
    label: 'Open BHAG model',
    path: 'docs/strategy/bhag-model.md',
  },
  'Core Values': {
    label: 'Open core values doc',
    path: 'docs/strategy/core-values.md',
  },
  'The Engine': {
    label: 'Open agent engine doc',
    path: 'docs/strategy/agent-engine.md',
  },
  'Department Mandates': {
    label: 'Open department mandates doc',
    path: 'docs/strategy/department-mandates.md',
  },
  'Two Brands': {
    label: 'Open MarketMasters doc',
    path: 'docs/strategy/marketmasters.md',
  },
  'Governance': {
    label: 'Open governance doc',
    path: 'docs/strategy/governance.md',
  },
  'Current Quarter': {
    label: 'Open quarterly priorities doc',
    path: 'docs/strategy/quarterly-priorities.md',
  },
}

function renderSection(section, currentPath) {
  var article = document.createElement('article')
  article.className = 'section-card'

  var title = document.createElement('h4')
  appendFormattedText(section.title, title, currentPath)
  article.appendChild(title)
  article.appendChild(renderMarkdownBlock(section.content, currentPath))

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

function renderDocCard(doc) {
  var article = document.createElement('article')
  article.className = 'section-card'

  var title = document.createElement('h4')
  var titleLink = document.createElement('a')
  titleLink.className = 'section-link'
  titleLink.href = buildDocHref(doc.meta.path, doc.meta.path)
  titleLink.textContent = doc.meta.path
  title.appendChild(titleLink)
  article.appendChild(title)

  var meta = document.createElement('p')
  meta.className = 'support-meta'
  meta.textContent = doc.meta.exists
    ? doc.meta.lines + ' lines · updated ' + formatDate(doc.meta.updatedAt)
    : 'Missing'
  article.appendChild(meta)

  if (doc.meta.exists) {
    var openLink = document.createElement('a')
    openLink.className = 'support-open-link'
    openLink.href = buildDocHref(doc.meta.path, doc.meta.path)
    openLink.textContent = 'Open full doc'
    article.appendChild(openLink)
  }

  doc.sections.slice(0, 3).forEach(function(section) {
    var sub = document.createElement('div')
    sub.className = 'support-section'

    var subTitle = document.createElement('h5')
    appendFormattedText(section.title, subTitle, doc.meta.path)
    sub.appendChild(subTitle)
    sub.appendChild(renderMarkdownBlock(section.content, doc.meta.path))
    article.appendChild(sub)
  })

  return article
}

function getLiveSourceRows(doc, groupTitle) {
  return (doc && doc.sourceSnapshot || [])
    .filter(function(row) { return row.groupTitle === groupTitle })
    .sort(function(left, right) { return (left.sortOrder || 0) - (right.sortOrder || 0) })
}

function getLiveSourceRow(rows, label) {
  return (rows || []).find(function(row) { return row.label === label }) || null
}

function mergeLiveSourceContracts(docs) {
  var map = {}
  ;(docs || []).forEach(function(doc) {
    ;(doc && doc.sourceContracts || []).forEach(function(contract) {
      if (contract && contract.sourceId && !map[contract.sourceId]) map[contract.sourceId] = contract
    })
  })
  return map
}

function uniqueLiveSourceIds(values) {
  var seen = {}
  return (values || []).filter(function(value) {
    if (!value || seen[value]) return false
    seen[value] = true
    return true
  })
}

function buildLiveSourceValueCardModel(config, sourceContractMap) {
  var rows = config.rows || []
  var values = (config.labels || [])
    .map(function(label) { return getLiveSourceRow(rows, label) })
    .filter(Boolean)
  var sourceIds = uniqueLiveSourceIds(
    (config.sourceIds || []).concat(values.map(function(row) { return row.sourceId }))
  )
  return {
    title: config.title,
    summary: config.summary,
    href: buildDocHref(config.docPath, 'docs/business-strategy.md'),
    values: values,
    sourceIds: sourceIds,
    sourceActions: getSourceActionsForIds(sourceIds, sourceContractMap),
  }
}

function appendLiveSourceBadges(target, model) {
  var badgeRow = document.createElement('div')
  badgeRow.className = 'live-source-badge-row'

  model.sourceIds.forEach(function(sourceId) {
    var badge = document.createElement('span')
    badge.className = 'doc-source-id'
    badge.textContent = sourceId
    badgeRow.appendChild(badge)
  })

  target.appendChild(badgeRow)
  appendSourceActions(target, model.sourceActions)
}

function renderLiveSourceValueCard(model) {
  if (!model || !model.values || !model.values.length) return null

  var card = document.createElement('article')
  card.className = 'doc-source-card live-source-value-card'

  var top = document.createElement('div')
  top.className = 'doc-source-card-top'

  var titleWrap = document.createElement('div')
  var title = document.createElement('h5')
  var link = document.createElement('a')
  link.className = 'section-link'
  link.href = model.href
  link.textContent = model.title
  title.appendChild(link)
  titleWrap.appendChild(title)
  appendLiveSourceBadges(titleWrap, model)
  top.appendChild(titleWrap)

  var asOfValues = uniqueLiveSourceIds(
    model.values
      .map(function(row) { return row.asOf ? formatAsOfDate(row.asOf) : '' })
      .filter(Boolean)
  )
  if (asOfValues.length) {
    var asOf = document.createElement('div')
    asOf.className = 'doc-source-asof'
    asOf.textContent = 'As of ' + asOfValues.join(', ') + ' (Eastern Time)'
    top.appendChild(asOf)
  }

  card.appendChild(top)

  var table = document.createElement('table')
  table.className = 'doc-source-table'
  var tbody = document.createElement('tbody')
  model.values.forEach(function(row) {
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

  if (model.summary) {
    var summary = document.createElement('p')
    summary.className = 'doc-source-detail'
    summary.textContent = model.summary
    card.appendChild(summary)
  }

  return card
}

function renderLiveSourceBackedValuesPanel(bhagDoc, engineDoc) {
  if (!bhagDoc || !engineDoc) return null

  var sourceContractMap = mergeLiveSourceContracts([bhagDoc, engineDoc])
  var teamRows = getLiveSourceRows(bhagDoc, 'Team Goal: $2B')
  var communityRows = getLiveSourceRows(bhagDoc, 'Community Goal: 10,000 Agents')
  var engineInputRows = getLiveSourceRows(engineDoc, 'Engine Inputs')
  var engineRequirementRows = getLiveSourceRows(engineDoc, 'Current Requirement')
  var models = [
    buildLiveSourceValueCardModel({
      title: 'Team BHAG Pace',
      docPath: 'docs/strategy/bhag-model.md',
      rows: teamRows,
      labels: ['2026', 'Should Be', 'Actual', 'Pace'],
      sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-OWNERS-001'],
      summary: 'Team volume target and current pace come from BHAG Builder and Owners Dashboard source rows.',
    }, sourceContractMap),
    buildLiveSourceValueCardModel({
      title: 'Community BHAG Pace',
      docPath: 'docs/strategy/bhag-model.md',
      rows: communityRows,
      labels: ['2026', 'Should Be', 'Actual', 'Pace'],
      sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-COMMUNITY-001'],
      summary: 'Community count target and pace stay separate from Benson Crew active productive team capacity.',
    }, sourceContractMap),
    buildLiveSourceValueCardModel({
      title: 'Agent Engine Assumptions',
      docPath: 'docs/strategy/agent-engine.md',
      rows: engineInputRows.concat(engineRequirementRows),
      labels: ['Average Monthly GCI', 'Split to Team', 'Planning Attrition Assumption', 'Required Recruiting Pace', 'Current Recruiting Pace'],
      sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001'],
      summary: 'Capacity math uses source-owned assumptions instead of markdown-edited values.',
    }, sourceContractMap),
    buildLiveSourceValueCardModel({
      title: 'Agent Engine Capacity',
      docPath: 'docs/strategy/agent-engine.md',
      rows: engineRequirementRows,
      labels: ['Required Agents This Year', 'Current Active Agents', 'Gap This Year', 'Production Gap'],
      sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001'],
      summary: 'Active productive agent capacity and production gap are read from live Agent Engine rows.',
    }, sourceContractMap),
  ].filter(function(model) { return model.values && model.values.length })

  if (!models.length) return null

  var panel = document.createElement('section')
  panel.className = 'panel live-source-values-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Live Source Values'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Source-backed strategy numbers'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'These cards read the same live BHAG and Agent Engine source snapshots as the supporting docs. Markdown explains the model; source rows carry the numbers.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'live-source-value-grid'
  models.forEach(function(model) {
    var card = renderLiveSourceValueCard(model)
    if (card) grid.appendChild(card)
  })
  panel.appendChild(grid)

  return panel
}

function renderOverview() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading overview.</p>'

  Promise.all([
    fetchSourceOfTruth(),
    fetchFoundationHub(),
    fetchDoc('docs/strategy/bhag-model.md'),
    fetchDoc('docs/strategy/agent-engine.md'),
  ]).then(function(results) {
    var data = results[0]
    var hub = results[1]
    var bhagDoc = results[2]
    var engineDoc = results[3]
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroLeft = document.createElement('div')

    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Primary Source'
    heroLeft.appendChild(eyebrow)

    var heroTitle = document.createElement('h2')
    heroTitle.textContent = 'Business Strategy'
    heroLeft.appendChild(heroTitle)

    var heroCopy = document.createElement('p')
    heroCopy.textContent = 'Canonical strategy packet. Supporting docs stay separate so the core stays short.'
    heroLeft.appendChild(heroCopy)

    hero.appendChild(heroLeft)

    var printBtn = document.createElement('button')
    printBtn.className = 'print-button'
    printBtn.textContent = 'Download Strategy'
    printBtn.setAttribute('type', 'button')
    printBtn.addEventListener('click', function() {
      downloadStrategyPdf()
    })
    hero.appendChild(printBtn)

    container.appendChild(hero)

    var liveValuesPanel = renderLiveSourceBackedValuesPanel(bhagDoc, engineDoc)
    if (liveValuesPanel) container.appendChild(liveValuesPanel)

    /* strategy doc panel */
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
    panelTitle.textContent = 'Business Strategy'
    panelLeft.appendChild(panelTitle)
    panelHeader.appendChild(panelLeft)

    var panelMeta = document.createElement('div')
    panelMeta.className = 'doc-meta'
    var bsMeta = data.foundation.businessStrategy.meta
    var strategySectionCount = data.foundation.businessStrategy.sections.length
    panelMeta.textContent = 'Full strategy packet · ' + strategySectionCount + ' sections · updated ' + formatDate(bsMeta.updatedAt)
    panelHeader.appendChild(panelMeta)

    panel.appendChild(panelHeader)

    var sectionList = document.createElement('div')
    sectionList.className = 'section-list'
    data.foundation.businessStrategy.sections.forEach(function(section) {
      if (section.title === 'Current Quarter') {
        return
      }

      sectionList.appendChild(renderSection(section, data.foundation.businessStrategy.meta.path))
    })
    panel.appendChild(sectionList)
    container.appendChild(panel)

    var strategyChangePanel = renderStrategyChangeWatchPanel(hub, null)
    if (strategyChangePanel) container.appendChild(strategyChangePanel)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Overview could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderStrategyDoc(sectionKey) {
  var docPath = strategyDocPaths[sectionKey]
  if (!docPath) return

  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading document.</p>'

  var loader
  if (sectionKey === 'system-strategy') {
    loader = Promise.all([fetchDoc(docPath), fetchSourceOfTruth()])
  } else if (sectionKey === 'rebuild-plan') {
    loader = Promise.all([fetchDoc(docPath), Promise.resolve(null), fetchFoundationHub()])
  } else if (isStrategyPacketDocPath(docPath)) {
    loader = Promise.all([fetchDoc(docPath), Promise.resolve(null), fetchFoundationHub()])
  } else {
    loader = Promise.all([fetchDoc(docPath)])
  }

  loader.then(function(results) {
    var data = results[0]
    var sourceData = results[1] || null
    var hub = results[2] || null
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = data.title
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = (isLiveDocPath(docPath) ? 'Doc updated ' : 'Updated ') + formatDate(data.meta.updatedAt) + ' · ' + data.meta.lines + ' lines'
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)

    if (isLiveDocPath(docPath)) {
      var refreshBtn = document.createElement('button')
      refreshBtn.className = 'print-button'
      refreshBtn.textContent = 'Refresh Live Data'
      refreshBtn.setAttribute('type', 'button')
      refreshBtn.addEventListener('click', function() {
        delete cache.docs[docPath]
        renderStrategyDoc(sectionKey)
      })
      hero.appendChild(refreshBtn)
    }

    container.appendChild(hero)

    if (isLiveDocPath(docPath)) {
      var freshnessPanel = renderLiveDocFreshnessPanel(docPath, data.sourceSnapshot || [], data.sourceContracts || [])
      if (freshnessPanel) container.appendChild(freshnessPanel)
    }

    /* full markdown content */
    var docPanel = document.createElement('section')
    docPanel.className = 'panel'

    var docContent = document.createElement('div')
    docContent.className = 'doc-content'
    var sourceContractMap = buildSourceContractMap(data.sourceContracts || [])
    docContent.appendChild(renderDocMarkdownBlock(
      data.content,
      data.meta.path,
      groupSourceSnapshot(data.sourceSnapshot || []),
      sourceContractMap
    ))
    docPanel.appendChild(docContent)
    container.appendChild(docPanel)

    if (sectionKey === 'rebuild-plan' && hub) {
      container.appendChild(renderRebuildPlanBacklogPanel(hub))
    }

    if (hub && isStrategyPacketDocPath(docPath)) {
      var changeWatchPanel = renderStrategyChangeWatchPanel(hub, docPath)
      if (changeWatchPanel) container.appendChild(changeWatchPanel)
    }

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Document could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderRebuildPlanBacklogPanel(hub) {
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Execution Traceability'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Command Order ↔ Live Backlog'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'This is traceability, not a second priority queue. The Rebuild Plan keeps phase doctrine; this view shows the working order Steve should see.'
  left.appendChild(intro)

  header.appendChild(left)

  var action = document.createElement('a')
  action.className = 'inline-link'
  action.href = '/foundation#backlog'
  action.textContent = 'Open full backlog'
  header.appendChild(action)

  panel.appendChild(header)

  var itemsById = new Map()
  ;(hub.backlogItems || []).forEach(function(item) {
    itemsById.set(item.id, item)
  })

  rebuildPlanCommandOrderGroups.forEach(function(group) {
    var groupPanel = document.createElement('section')
    groupPanel.className = 'panel'

    var groupHeader = document.createElement('div')
    groupHeader.className = 'panel-header'

    var groupLeft = document.createElement('div')
    var groupTitle = document.createElement('h3')
    groupTitle.textContent = group.title
    groupLeft.appendChild(groupTitle)

    var groupIntro = document.createElement('p')
    groupIntro.className = 'section-intro'
    groupIntro.textContent = group.intro
    groupLeft.appendChild(groupIntro)

    groupHeader.appendChild(groupLeft)
    groupPanel.appendChild(groupHeader)

    var list = document.createElement('div')
    list.className = 'backlog-stack-list'

    var matched = group.ids
      .map(function(id) { return itemsById.get(id) || null })
      .filter(Boolean)

    if (!matched.length) {
      var empty = document.createElement('p')
      empty.className = 'section-intro'
      empty.textContent = 'No live backlog cards are mapped to this command-order step yet.'
      list.appendChild(empty)
    } else {
      matched.forEach(function(item) {
        list.appendChild(renderBacklogAccordionItem(item))
      })
    }

    groupPanel.appendChild(list)
    panel.appendChild(groupPanel)
  })

  return panel
}

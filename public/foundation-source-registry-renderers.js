// Source Registry, connector, and KPI source-health renderers split from public/foundation.js.
// Classic script globals are intentional; foundation.js route owners call these after script load.

function getSourceKind(contract) {
  var method = (contract.accessMethod || '').toLowerCase()

  if (method.indexOf('filesystem') !== -1 || method.indexOf('git') !== -1) return { key: 'docs', label: 'Docs' }
  if (method.indexOf('sheets') !== -1 || method.indexOf('spreadsheet') !== -1) return { key: 'sheets', label: 'Sheets' }
  if (method.indexOf('connector') !== -1) return { key: 'apps', label: 'Workspace App' }
  if (method.indexOf('api') !== -1) return { key: 'api', label: 'API' }
  if (method.indexOf('supabase') !== -1 || method.indexOf('database') !== -1) return { key: 'apps', label: 'App / DB' }
  return { key: 'other', label: 'Other' }
}

function getSourcePresence(contract) {
  if (contract.group === 'verified') {
    if ((contract.validation || contract.status) === 'Signed Off') {
      return { key: 'signed-off', label: 'Signed off', tone: 'connected' }
    }
    if ((contract.validation || contract.status) === 'Signed Off For Current Reality') {
      return { key: 'signed-off', label: 'Signed off for current reality', tone: 'connected' }
    }
    return { key: 'connected', label: 'Connected but provisional', tone: 'planned' }
  }
  if (contract.group === 'pending') {
    return { key: 'needs-verification', label: 'Needs verification', tone: 'pending' }
  }
  return { key: 'not-connected', label: 'Not connected', tone: 'missing' }
}

function getSourceTrust(contract) {
  var validation = contract.validation || contract.status || 'Unknown'

  if (validation === 'Signed Off' || validation === 'Signed Off For Current Reality') return { label: validation, tone: 'connected' }
  if (validation === 'Verified For Ops V1') return { label: validation, tone: 'connected' }
  if (validation === 'In Review') return { label: validation, tone: 'pending' }
  if (validation === 'Partially Signed Off' || validation === 'Readable Only') {
    return { label: validation, tone: 'planned' }
  }
  if (validation === 'Not Signed Off') {
    if (contract.group === 'verified' || contract.status === 'Verified Readable') {
      return { label: 'Readable, not signed off', tone: 'planned' }
    }
    if (contract.group === 'pending') return { label: 'Needs source sign-off', tone: 'pending' }
  }
  return { label: validation, tone: 'missing' }
}

function getSourceSearchText(contract) {
  return [
    contract.sourceId,
    contract.title,
    contract.unitName,
    contract.owner,
    contract.location,
    contract.scope,
    contract.owns,
    Array.isArray(contract.signedOffTabs) ? contract.signedOffTabs.join(' ') : '',
    Array.isArray(contract.verifiedNonSourceTabs) ? contract.verifiedNonSourceTabs.map(function(item) {
      return [item && item.name, item && item.reason].filter(Boolean).join(' ')
    }).join(' ') : '',
    contract.accessMethod,
    contract.status,
    contract.validation,
    contract.validationScope,
    contract.boundaryNote,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getSourceSystemName(contract) {
  return contract && contract.title ? contract.title : 'Unknown source'
}

function getSourceUnitName(contract) {
  return (contract && (contract.unitName || contract.tabName || contract.location)) || ''
}

function filterSourceContracts(contracts, options) {
  var opts = options || {}
  var query = String(opts.query != null ? opts.query : sourceViewState.query).trim().toLowerCase()
  var kindFilter = opts.kind != null ? opts.kind : sourceViewState.kind
  var presenceFilter = opts.presence != null ? opts.presence : sourceViewState.presence
  var allowedKinds = opts.allowedKinds || null

  return (contracts || []).filter(function(contract) {
    var kind = getSourceKind(contract)
    var presence = getSourcePresence(contract)

    if (allowedKinds && allowedKinds.indexOf(kind.key) === -1) return false
    if (kindFilter !== 'all' && kind.key !== kindFilter) return false
    if (presenceFilter !== 'all' && presence.key !== presenceFilter) return false
    if (!query) return true

    return getSourceSearchText(contract).indexOf(query) !== -1
  })
}

function sortSourceContracts(contracts) {
  var trustRank = {
    'Signed Off': 0,
    'Signed Off For Current Reality': 1,
    'In Review': 2,
    'Partially Signed Off': 3,
    'Readable Only': 4,
    'Not Signed Off': 5,
  }

  return (contracts || []).slice().sort(function(a, b) {
    var rankA = trustRank[a.validation] != null ? trustRank[a.validation] : 99
    var rankB = trustRank[b.validation] != null ? trustRank[b.validation] : 99
    if (rankA !== rankB) return rankA - rankB
    return a.sourceId.localeCompare(b.sourceId)
  })
}

function renderSourceTag(text, tone) {
  var tag = document.createElement('span')
  tag.className = 'source-tag source-tag-' + tone
  tag.textContent = text
  return tag
}

function renderSourceMetaItem(labelText, valueText) {
  var item = document.createElement('div')
  item.className = 'source-card-meta-item'

  var label = document.createElement('div')
  label.className = 'source-card-meta-label'
  label.textContent = labelText
  item.appendChild(label)

  var value = document.createElement('div')
  value.className = 'source-card-meta-value'
  value.textContent = valueText || 'Not set'
  item.appendChild(value)

  return item
}

function areAllSourceContractsDocs(contracts) {
  return (contracts || []).length > 0 && (contracts || []).every(function(contract) {
    return getSourceKind(contract).key === 'docs'
  })
}

function renderSourceLinkGroup(labelText, items, currentPath) {
  if (!Array.isArray(items) || !items.length) return null

  var wrap = document.createElement('div')
  wrap.className = 'source-link-group'

  var label = document.createElement('div')
  label.className = 'source-link-group-label'
  label.textContent = labelText
  wrap.appendChild(label)

  var links = document.createElement('div')
  links.className = 'doc-source-actions'
  items.forEach(function(item) {
    if (!item || !item.href) return
    var link = document.createElement('a')
    link.className = 'doc-source-link'
    link.href = buildDocHref(item.href, currentPath || 'docs/business-strategy.md')
    link.textContent = item.label || item.href
    links.appendChild(link)
  })
  wrap.appendChild(links)

  return wrap
}

function renderSourceBulletGroup(labelText, items) {
  if (!Array.isArray(items) || !items.length) return null

  var wrap = document.createElement('div')
  wrap.className = 'source-link-group'

  var label = document.createElement('div')
  label.className = 'source-link-group-label'
  label.textContent = labelText
  wrap.appendChild(label)

  var list = document.createElement('ul')
  list.className = 'source-bullet-list'
  items.forEach(function(item) {
    var text = ''
    if (item && typeof item === 'object') {
      text = [item.name, item.reason].filter(Boolean).join(' — ')
    } else {
      text = String(item || '').trim()
    }
    if (!text) return
    var li = document.createElement('li')
    li.textContent = text
    list.appendChild(li)
  })
  wrap.appendChild(list)

  return wrap
}

function renderSourceContractCard(contract) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'
  var kind = getSourceKind(contract)
  var systemName = getSourceSystemName(contract)
  var unitName = getSourceUnitName(contract) || systemName

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title = document.createElement('h4')
  title.textContent = unitName
  titleWrap.appendChild(title)

  var sourceId = document.createElement('div')
  sourceId.className = 'source-card-id'
  var unitDescriptor = kind.key === 'docs'
    ? systemName
    : (Array.isArray(contract.signedOffTabs) && contract.signedOffTabs.length > 1 ? 'Validation unit in ' + systemName : 'Tab/range in ' + systemName)
  sourceId.textContent = [
    contract.sourceId,
    systemName !== unitName ? unitDescriptor : '',
  ].filter(Boolean).join(' · ')
  titleWrap.appendChild(sourceId)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  var kindTag = kind
  var trustTag = getSourceTrust(contract)
  tags.appendChild(renderSourceTag(kindTag.label, 'neutral'))
  tags.appendChild(renderSourceTag(trustTag.label, trustTag.tone))
  article.appendChild(tags)

  var metaGrid = document.createElement('div')
  metaGrid.className = 'source-card-meta-grid'
  metaGrid.appendChild(renderSourceMetaItem('Owner', contract.owner || 'System'))
  metaGrid.appendChild(renderSourceMetaItem('Access', contract.accessMethod || 'Unknown'))
  metaGrid.appendChild(renderSourceMetaItem('State', getSourcePresence(contract).label))
  metaGrid.appendChild(renderSourceMetaItem('Scope', contract.scope || 'Unknown'))
  if (contract.lastVerified) {
    metaGrid.appendChild(renderSourceMetaItem('Last Verified', contract.lastVerified))
  }
  if (contract.updateMethod) {
    metaGrid.appendChild(renderSourceMetaItem('Update method', contract.updateMethod))
  }
  if (contract.refreshSchedule) {
    metaGrid.appendChild(renderSourceMetaItem('Schedule now', contract.refreshSchedule))
  }
  article.appendChild(metaGrid)

  if (kind.key === 'docs' && Array.isArray(contract.packetDocs) && contract.packetDocs.length) {
    article.appendChild(renderSourceLinkGroup('Docs in this packet', contract.packetDocs, 'docs/business-strategy.md'))
  }

  if (Array.isArray(contract.signedOffTabs) && contract.signedOffTabs.length) {
    article.appendChild(renderSourceBulletGroup('Signed-off tabs/ranges in this unit', contract.signedOffTabs))
  }

  if (Array.isArray(contract.verifiedNonSourceTabs) && contract.verifiedNonSourceTabs.length) {
    article.appendChild(renderSourceBulletGroup('Verified but not counted as source-owned sign-off', contract.verifiedNonSourceTabs))
  }

  if (contract.owns) {
    var ownsLabel = kind.key === 'docs'
      ? 'What this packet owns'
      : (Array.isArray(contract.signedOffTabs) && contract.signedOffTabs.length > 1 ? 'What this unit owns' : 'What this tab/range owns')
    article.appendChild(renderLabeledCopy('decision-meta', ownsLabel, contract.owns))
  }

  if (contract.validationScope) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Trust boundary', contract.validationScope))
  }

  if (contract.doneMeans) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Closed now', contract.doneMeans))
  }

  if (contract.stillOpen) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Still open', contract.stillOpen))
  }

  if (contract.boundaryNote) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Boundary note', contract.boundaryNote))
  }

  if (contract.manualRefresh) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Manual refresh', contract.manualRefresh))
  }

  appendSourceActions(article, contract.actions || [])
  return article
}

function renderSourceAccordionItem(contract) {
  var details = document.createElement('details')
  details.className = 'source-item'
  if (contract.sourceId) details.id = contract.sourceId

  var summary = document.createElement('summary')
  summary.className = 'source-item-summary'

  var left = document.createElement('div')
  left.className = 'source-item-summary-left'

  var title = document.createElement('div')
  title.className = 'source-item-summary-title'
  title.textContent = getSourceUnitName(contract) || getSourceSystemName(contract)
  left.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-item-summary-meta'
  meta.textContent = [
    getSourceKind(contract).label,
    contract.owner || 'System',
  ].join(' · ')
  left.appendChild(meta)

  if (contract.scope || contract.owns) {
    var excerpt = document.createElement('div')
    excerpt.className = 'source-item-summary-copy'
    excerpt.textContent = contract.scope || contract.owns
    left.appendChild(excerpt)
  }

  summary.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-item-summary-right'
  var trustTag = getSourceTrust(contract)
  right.appendChild(renderSourceTag(trustTag.label, trustTag.tone))
  summary.appendChild(right)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-item-body'
  body.appendChild(renderSourceContractCard(contract))
  details.appendChild(body)

  return details
}

function renderSourceLegendPanel() {
  var panel = document.createElement('section')
  panel.className = 'panel'

  var grid = document.createElement('div')
  grid.className = 'source-legend-grid'

  ;[
    {
      title: 'Source System',
      copy: 'The big business source: a workbook, doc set, database, app, or platform the OS depends on.',
    },
    {
      title: 'Validation Unit',
      copy: 'The exact tab, range, ledger, or slice currently being validated inside the larger source system.',
    },
    {
      title: 'Connector Layer',
      copy: 'The technical path. It shows what connection exists, what it does, and who should be allowed to use it.',
    },
    {
      title: 'Trust State',
      copy: 'Whether the source is signed off, in review, readable only, partial, or still not trusted for live system use.',
    },
  ].forEach(function(item) {
    var card = document.createElement('article')
    card.className = 'section-card source-legend-card'

    var cardTitle = document.createElement('h4')
    cardTitle.textContent = item.title
    card.appendChild(cardTitle)

    var copy = document.createElement('p')
    copy.className = 'source-card-copy'
    copy.textContent = item.copy
    card.appendChild(copy)

    grid.appendChild(card)
  })

  panel.appendChild(grid)

  var colorLegend = document.createElement('div')
  colorLegend.className = 'source-color-legend'

  ;[
    { tone: 'connected', label: 'Signed off / working now' },
    { tone: 'planned', label: 'Current build focus / active review' },
    { tone: 'pending', label: 'Provisional / needs validation' },
    { tone: 'missing', label: 'Missing / blocked / not wired' },
  ].forEach(function(item) {
    var row = document.createElement('div')
    row.className = 'source-color-legend-item'

    var dot = document.createElement('span')
    dot.className = 'source-color-dot source-color-dot-' + item.tone
    row.appendChild(dot)

    var text = document.createElement('span')
    text.textContent = item.label
    row.appendChild(text)

    colorLegend.appendChild(row)
  })

  panel.appendChild(colorLegend)
  return panel
}

function getSourceSystemState(contracts) {
  if ((contracts || []).every(function(contract) {
    return getSourcePresence(contract).key === 'signed-off'
  })) {
    return { key: 'signed-off', label: 'Signed off', tone: 'connected' }
  }

  if ((contracts || []).some(function(contract) {
    return getSourcePresence(contract).key === 'connected'
  })) {
    return { key: 'active-review', label: 'Active review', tone: 'planned' }
  }

  if ((contracts || []).some(function(contract) {
    return getSourcePresence(contract).key === 'needs-verification'
  })) {
    return { key: 'needs-verification', label: 'Needs verification', tone: 'pending' }
  }

  return { key: 'not-connected', label: 'Not connected', tone: 'missing' }
}

function groupSourceContractsBySystem(contracts) {
  var grouped = {}
  ;(contracts || []).forEach(function(contract) {
    var key = getSourceSystemName(contract)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(contract)
  })

  return Object.keys(grouped).map(function(key) {
    return {
      name: key,
      contracts: sortSourceContracts(grouped[key]),
    }
  }).sort(function(a, b) {
    var order = {
      'active-review': 0,
      'needs-verification': 1,
      'not-connected': 2,
      'signed-off': 3,
    }
    var aState = getSourceSystemState(a.contracts).key
    var bState = getSourceSystemState(b.contracts).key
    var delta = (order[aState] != null ? order[aState] : 99) - (order[bState] != null ? order[bState] : 99)
    if (delta !== 0) return delta
    return a.name.localeCompare(b.name)
  })
}

function renderSourceSystemStack(group) {
  var contracts = group.contracts || []
  if (!contracts.length) return null

  var details = document.createElement('details')
  details.className = 'source-stack'
  var docsOnly = areAllSourceContractsDocs(contracts)
  var singleDocPacket = docsOnly && contracts.length === 1
  var state = getSourceSystemState(contracts)
  var signedOffUnits = contracts.filter(function(contract) { return getSourcePresence(contract).key === 'signed-off' }).length
  var provisionalUnits = contracts.filter(function(contract) { return getSourcePresence(contract).key === 'connected' }).length
  var signedOffCoverageCount = contracts.reduce(function(sum, contract) {
    return sum + (Array.isArray(contract.signedOffTabs) ? contract.signedOffTabs.length : 0)
  }, 0)
  var accessSummary = Array.from(new Set(contracts.map(function(contract) {
    return contract.accessMethod
  }).filter(Boolean))).join(' · ')
  var ownerSummary = Array.from(new Set(contracts.map(function(contract) {
    return contract.owner || 'System'
  }).filter(Boolean))).join(' · ')

  var summary = document.createElement('summary')
  summary.className = 'source-stack-summary source-stack-summary-' + state.key

  var left = document.createElement('div')
  left.className = 'source-stack-summary-left'

  var title = document.createElement('div')
  title.className = 'source-stack-title'
  title.textContent = singleDocPacket
    ? (getSourceUnitName(contracts[0]) || group.name)
    : group.name
  left.appendChild(title)

  var intro = document.createElement('div')
  intro.className = 'source-stack-intro'
  intro.textContent = singleDocPacket
    ? [
      group.name,
      state.label,
    ].filter(Boolean).join(' · ')
    : [
      contracts.length + ' ' + (docsOnly ? 'doc source' : 'validation unit') + (contracts.length === 1 ? '' : 's'),
      signedOffUnits ? signedOffUnits + ' signed off' : '',
      signedOffCoverageCount ? signedOffCoverageCount + ' signed-off tabs/ranges' : '',
      provisionalUnits ? provisionalUnits + ' still provisional' : '',
    ].filter(Boolean).join(' · ')
  left.appendChild(intro)

  summary.appendChild(left)

  if (!singleDocPacket) {
    var count = document.createElement('span')
    count.className = 'source-stack-count'
    count.textContent = contracts.length
    summary.appendChild(count)
  }

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-stack-body'

  if (singleDocPacket) {
    var singleContract = contracts[0]
    if (singleContract && singleContract.sourceId) details.id = singleContract.sourceId
    body.appendChild(renderSourceContractCard(singleContract))
    details.appendChild(body)
    return details
  }

  var systemCard = document.createElement('article')
  systemCard.className = 'section-card source-card'

  var systemCardTitleWrap = document.createElement('div')
  systemCardTitleWrap.className = 'source-card-title-wrap'

  var systemCardMeta = document.createElement('div')
  systemCardMeta.className = 'source-card-id'
  systemCardMeta.textContent = 'Source system'
  systemCardTitleWrap.appendChild(systemCardMeta)

  var systemCardTitle = document.createElement('h4')
  systemCardTitle.textContent = group.name
  systemCardTitleWrap.appendChild(systemCardTitle)
  systemCard.appendChild(systemCardTitleWrap)

  var systemCardTags = document.createElement('div')
  systemCardTags.className = 'source-card-tags'
  systemCardTags.appendChild(renderSourceTag(state.label, state.tone))
  systemCard.appendChild(systemCardTags)

  var systemCardCopy = document.createElement('p')
  systemCardCopy.className = 'source-card-copy'
  systemCardCopy.textContent = docsOnly
    ? 'This is a repo doc packet. Open it when you want to see which written docs are signed off and what is still outside that closure.'
    : (state.key === 'signed-off'
      ? 'This workbook is represented by validation units. Each card lists the actual tabs or ranges covered by that sign-off.'
      : 'Review this workbook by validation unit. A unit may be one tab, one range, or a signed-off group of related tabs.')
  systemCard.appendChild(systemCardCopy)

  var systemCardGrid = document.createElement('div')
  systemCardGrid.className = 'source-card-meta-grid'
  systemCardGrid.appendChild(renderSourceMetaItem(docsOnly ? 'Tracked docs' : 'Validation units', String(contracts.length)))
  if (signedOffCoverageCount) systemCardGrid.appendChild(renderSourceMetaItem('Signed-off tabs/ranges', String(signedOffCoverageCount)))
  if (ownerSummary) systemCardGrid.appendChild(renderSourceMetaItem('Owners', ownerSummary))
  if (accessSummary) systemCardGrid.appendChild(renderSourceMetaItem('Access', accessSummary))
  systemCardGrid.appendChild(renderSourceMetaItem('Signed off', String(signedOffUnits)))
  systemCard.appendChild(systemCardGrid)

  var actionSeen = {}
  var systemActions = []
  contracts.forEach(function(contract) {
    ;(contract.actions || []).forEach(function(action) {
      var key = action.href || action.label
      if (!key || actionSeen[key]) return
      actionSeen[key] = true
      systemActions.push(action)
    })
  })
  appendSourceActions(systemCard, systemActions.slice(0, 1))
  body.appendChild(systemCard)

  contracts.forEach(function(contract) {
    body.appendChild(renderSourceAccordionItem(contract))
  })

  details.appendChild(body)
  return details
}

function getConnectorState(connector) {
  if (connector.group === 'working') return { key: 'connected', label: 'Working now', tone: 'connected' }
  if (connector.group === 'available') return { key: 'needs-verification', label: 'Installed / needs validation', tone: 'pending' }
  return { key: 'not-connected', label: 'Not wired yet', tone: 'missing' }
}

function renderConnectorCard(connector) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title = document.createElement('h4')
  title.textContent = connector.title
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-card-id'
  meta.textContent = connector.connectorId
  titleWrap.appendChild(meta)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  var state = getConnectorState(connector)
  tags.appendChild(renderSourceTag(state.label, state.tone))
  article.appendChild(tags)

  var copy = document.createElement('p')
  copy.className = 'source-card-copy'
  copy.textContent = connector.purpose
  article.appendChild(copy)

  var grid = document.createElement('div')
  grid.className = 'source-card-meta-grid'
  grid.appendChild(renderSourceMetaItem('Who can use it', connector.availableTo || 'Not set'))
  grid.appendChild(renderSourceMetaItem('Current status', connector.status || 'Unknown'))
  grid.appendChild(renderSourceMetaItem('What it does', connector.powers || 'Not set'))
  article.appendChild(grid)

  return article
}

function renderConnectorStack(group, connectors) {
  if (!connectors.length) return null

  var details = document.createElement('details')
  details.className = 'source-stack'

  var summary = document.createElement('summary')
  summary.className = 'source-stack-summary source-stack-summary-' + group.key

  var left = document.createElement('div')
  left.className = 'source-stack-summary-left'

  var title = document.createElement('div')
  title.className = 'source-stack-title'
  title.textContent = group.title
  left.appendChild(title)

  var intro = document.createElement('div')
  intro.className = 'source-stack-intro'
  intro.textContent = group.intro
  left.appendChild(intro)

  summary.appendChild(left)

  var count = document.createElement('span')
  count.className = 'source-stack-count'
  count.textContent = connectors.length
  summary.appendChild(count)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-stack-body'
  connectors.forEach(function(connector) {
    body.appendChild(renderConnectorCard(connector))
  })
  details.appendChild(body)

  return details
}

function getSourceContractsForSection(contracts, config) {
  if (!config || !config.allowedKinds || !config.allowedKinds.length) return contracts || []

  return (contracts || []).filter(function(contract) {
    return config.allowedKinds.indexOf(getSourceKind(contract).key) !== -1
  })
}

function renderSourceHero(config, sourceContracts, sourceConnectors) {
  var signedOffCount = sourceContracts.filter(function(contract) { return getSourcePresence(contract).key === 'signed-off' }).length
  var connectedCount = sourceContracts.filter(function(contract) { return getSourcePresence(contract).key === 'connected' }).length
  var verificationCount = sourceContracts.filter(function(contract) { return getSourcePresence(contract).key === 'needs-verification' }).length
  var gapCount = sourceContracts.filter(function(contract) { return getSourcePresence(contract).key === 'not-connected' }).length
  var systemCount = groupSourceContractsBySystem(sourceContracts).length

  var hero = document.createElement('section')
  hero.className = 'hero'

  var heroInner = document.createElement('div')
  heroInner.className = 'hero-inner'

  var heroEyebrow = document.createElement('div')
  heroEyebrow.className = 'eyebrow'
  heroEyebrow.textContent = config.eyebrow
  heroInner.appendChild(heroEyebrow)

  var heroTitle = document.createElement('h1')
  heroTitle.textContent = config.title
  heroInner.appendChild(heroTitle)

  var heroMeta = document.createElement('p')
  heroMeta.className = 'hero-copy'
  if (config.showSystems && config.showConnectors) {
    heroMeta.textContent = systemCount + ' source systems · ' + sourceContracts.length + ' validation units · ' + sourceConnectors.length + ' connectors tracked'
  } else if (config.showSystems) {
    heroMeta.textContent = systemCount + ' source systems · ' + sourceContracts.length + ' validation units in this lane'
  } else {
    heroMeta.textContent = sourceConnectors.length + ' connectors tracked in this lane'
  }
  heroInner.appendChild(heroMeta)

  var heroNote = document.createElement('p')
  heroNote.className = 'hero-copy'
  heroNote.textContent = config.intro
  heroInner.appendChild(heroNote)

  if (config.title === 'Data Sources') {
    var trustNote = document.createElement('p')
    trustNote.className = 'hero-copy'
    trustNote.textContent = 'Trust now: ' + signedOffCount + ' signed off · ' + connectedCount + ' readable · ' + verificationCount + ' need verification · ' + gapCount + ' not connected.'
    heroInner.appendChild(trustNote)
  }

  hero.appendChild(heroInner)
  return hero
}

function countSourcePresence(sourceContracts) {
  var counts = {
    signedOff: 0,
    connected: 0,
    needsVerification: 0,
    notConnected: 0,
  }

  ;(sourceContracts || []).forEach(function(contract) {
    var presence = getSourcePresence(contract).key
    if (presence === 'signed-off') counts.signedOff += 1
    else if (presence === 'connected') counts.connected += 1
    else if (presence === 'needs-verification') counts.needsVerification += 1
    else counts.notConnected += 1
  })

  return counts
}

function countConnectorStates(sourceConnectors) {
  var counts = {
    connected: 0,
    needsVerification: 0,
    notConnected: 0,
  }

  ;(sourceConnectors || []).forEach(function(connector) {
    var state = getConnectorState(connector).key
    if (state === 'connected') counts.connected += 1
    else if (state === 'needs-verification') counts.needsVerification += 1
    else counts.notConnected += 1
  })

  return counts
}

function renderDataSourcePurposePanel(section, config, sourceContracts, sourceConnectors, groupedSystems) {
  var sourceCounts = countSourcePresence(sourceContracts)
  var connectorCounts = countConnectorStates(sourceConnectors)
  var systemCount = Array.isArray(groupedSystems) ? groupedSystems.length : groupSourceContractsBySystem(sourceContracts).length
  var statusCards = []
  var title = config.title + ' Page Job'

  if (section === 'source-overview') {
    statusCards = [
      {
        label: 'Page job',
        status: 'connected',
        detail: 'Show the whole source layer: grouped systems, source contracts, validation units, and connector paths.',
      },
      {
        label: 'Live backing',
        status: 'connected',
        detail: systemCount + ' grouped systems, ' + sourceContracts.length + ' source contracts, and ' + sourceConnectors.length + ' connectors from /api/source-of-truth.',
      },
      {
        label: 'Boundary',
        status: 'pending',
        detail: 'Use Systems for how sources combine into operating systems, Runtime Health for job status, and Backlog for work ownership.',
      },
    ]
  } else if (section === 'source-docs') {
    statusCards = [
      {
        label: 'Page job',
        status: 'connected',
        detail: 'Show doc-backed source contracts only: strategy packets, rebuild doctrine, source notes, and file-backed truth units.',
      },
      {
        label: 'Live backing',
        status: 'connected',
        detail: sourceContracts.length + ' doc-backed validation units. ' + sourceCounts.signedOff + ' signed off, ' + sourceCounts.connected + ' connected/provisional.',
      },
      {
        label: 'Boundary',
        status: 'pending',
        detail: 'This is not the All Docs file inventory. It only shows docs that act as source contracts or trusted validation units.',
      },
    ]
  } else if (section === 'source-sheets') {
    statusCards = [
      {
        label: 'Page job',
        status: 'connected',
        detail: 'Show spreadsheet-backed source contracts at the workbook, tab, range, and validation-unit level.',
      },
      {
        label: 'Live backing',
        status: 'connected',
        detail: sourceContracts.length + ' spreadsheet validation units. Sheet access is separate from signed-off meaning.',
      },
      {
        label: 'Boundary',
        status: 'pending',
        detail: 'A Google Sheets connector proves reach. This page shows which sheet units are trusted and what each unit owns.',
      },
    ]
  } else if (section === 'source-apis') {
    statusCards = [
      {
        label: 'Page job',
        status: 'connected',
        detail: 'Show app, API, and database-backed business sources such as FUB, KPI Supabase, ClickUp, Gmail, Missive, Slack, meetings, and marketing systems.',
      },
      {
        label: 'Live backing',
        status: 'connected',
        detail: sourceContracts.length + ' app/API validation units. ' + sourceCounts.needsVerification + ' still need verification and ' + sourceCounts.notConnected + ' are explicit gaps.',
      },
      {
        label: 'Boundary',
        status: 'pending',
        detail: 'Do not treat API access as trust. Each app still needs a source contract, signed-off meaning, freshness, and write boundary.',
      },
    ]
  } else if (section === 'source-connectors') {
    statusCards = [
      {
        label: 'Page job',
        status: 'connected',
        detail: 'Show the connector layer only: access paths, installed apps, API paths, and connection status.',
      },
      {
        label: 'Live backing',
        status: 'connected',
        detail: sourceConnectors.length + ' connectors tracked: ' + connectorCounts.connected + ' working, ' + connectorCounts.needsVerification + ' need validation, ' + connectorCounts.notConnected + ' not wired.',
      },
      {
        label: 'Boundary',
        status: 'pending',
        detail: 'Connector does not equal trusted source. Trust lives on source contracts, source notes, grouped systems, and verifier checks.',
      },
    ]
  }

  if (!statusCards.length) return null
  return renderOverviewStatusPanel(statusCards, {
    eyebrow: 'Page Purpose',
    title: title,
    intro: 'Each Data Sources page must answer a specific Foundation trust question.',
  })
}

function renderSourceSystemsPanel(sourceContracts, options) {
  var opts = options || {}
  var panel = document.createElement('section')
  panel.className = 'panel source-zone-panel source-zone-panel-systems'

  var panelHeader = document.createElement('div')
  panelHeader.className = 'panel-header'

  var panelLeft = document.createElement('div')
  var panelEyebrow = document.createElement('div')
  panelEyebrow.className = 'eyebrow'
  panelEyebrow.textContent = opts.eyebrow || 'Live Source Layer'
  panelLeft.appendChild(panelEyebrow)

  var panelTitle = document.createElement('h3')
  panelTitle.textContent = opts.title || 'Source systems and validation units'
  panelLeft.appendChild(panelTitle)

  var panelIntro = document.createElement('p')
  panelIntro.className = 'section-intro'
  panelIntro.textContent = opts.intro || 'Open each source system to see the exact units being validated underneath it.'
  panelLeft.appendChild(panelIntro)

  panelHeader.appendChild(panelLeft)
  panel.appendChild(panelHeader)

  var controls = document.createElement('div')
  controls.className = 'operations-toolbar'

  var searchField = document.createElement('div')
  searchField.className = 'operations-search'
    var searchInput = buildInput('search', 'Search by source ID, source, owner, access, or what it owns')
  searchInput.value = sourceViewState.query
  searchField.appendChild(searchInput)
  controls.appendChild(searchField)

  var kindButtons = []
  if (opts.showKindFilter) {
    var kindGroup = document.createElement('div')
    kindGroup.className = 'operations-filter-group'
    var kindLabel = document.createElement('span')
    kindLabel.className = 'operations-filter-label'
    kindLabel.textContent = 'Type'
    kindGroup.appendChild(kindLabel)

    ;[
      { key: 'all', label: 'All' },
      { key: 'docs', label: 'Docs' },
      { key: 'sheets', label: 'Sheets' },
      { key: 'api', label: 'APIs' },
      { key: 'apps', label: 'Apps / Workspace' },
      { key: 'other', label: 'Other' },
    ].forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'operations-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        sourceViewState.kind = option.key
        applySourceFilters()
      })
      kindButtons.push({ key: option.key, button: button })
      kindGroup.appendChild(button)
    })
    controls.appendChild(kindGroup)
  }

  var presenceGroup = document.createElement('div')
  presenceGroup.className = 'operations-filter-group'
  var presenceLabel = document.createElement('span')
  presenceLabel.className = 'operations-filter-label'
  presenceLabel.textContent = 'State'
  presenceGroup.appendChild(presenceLabel)

  var presenceButtons = []
  ;[
    { key: 'all', label: 'All' },
    { key: 'signed-off', label: 'Signed Off' },
    { key: 'connected', label: 'Connected Provisional' },
    { key: 'needs-verification', label: 'Needs Verification' },
    { key: 'not-connected', label: 'Not Connected' },
  ].forEach(function(option) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'operations-filter-chip'
    button.textContent = option.label
    button.addEventListener('click', function() {
      sourceViewState.presence = option.key
      applySourceFilters()
    })
    presenceButtons.push({ key: option.key, button: button })
    presenceGroup.appendChild(button)
  })
  controls.appendChild(presenceGroup)

  panel.appendChild(controls)

  var results = document.createElement('p')
  results.className = 'operations-results-meta'
  panel.appendChild(results)

  var board = document.createElement('div')
  board.className = 'source-contract-stack'
  panel.appendChild(board)

  function syncSourceButtons() {
    kindButtons.forEach(function(item) {
      item.button.classList.toggle('is-active', sourceViewState.kind === item.key)
    })
    presenceButtons.forEach(function(item) {
      item.button.classList.toggle('is-active', sourceViewState.presence === item.key)
    })
  }

  function applySourceFilters() {
    syncSourceButtons()

    if (opts.showKindFilter && !kindButtons.some(function(item) { return item.key === sourceViewState.kind })) {
      sourceViewState.kind = 'all'
    }

    var filteredContracts = filterSourceContracts(sourceContracts, {
      allowedKinds: opts.allowedKinds || null,
      kind: opts.showKindFilter ? sourceViewState.kind : 'all',
      presence: sourceViewState.presence,
      query: sourceViewState.query,
    })
    var groupedSystems = groupSourceContractsBySystem(filteredContracts)
    var laneLabel = opts.resultsLabel || 'source systems'
    var kindLabelText = opts.showKindFilter
      ? (sourceViewState.kind === 'all'
        ? 'all source types'
        : kindButtons.filter(function(item) { return item.key === sourceViewState.kind })[0].button.textContent.toLowerCase())
      : (opts.fixedKindLabel || 'this lane')
    var stateLabelText = sourceViewState.presence === 'all'
      ? 'all operating states'
      : presenceButtons.filter(function(item) { return item.key === sourceViewState.presence })[0].button.textContent.toLowerCase()

    results.textContent = 'Showing ' + filteredContracts.length + ' validation units across ' + groupedSystems.length + ' ' + laneLabel + ' · ' + kindLabelText + ' · ' + stateLabelText

    board.innerHTML = ''
    groupedSystems.forEach(function(group) {
      var groupPanel = renderSourceSystemStack(group)
      if (groupPanel) board.appendChild(groupPanel)
    })

    if (!board.childNodes.length) {
      var empty = document.createElement('div')
      empty.className = 'decision-empty-state'
    empty.textContent = 'No source contracts match these filters yet.'
      board.appendChild(empty)
    }
  }

  searchInput.addEventListener('input', function() {
    sourceViewState.query = searchInput.value
    applySourceFilters()
  })

  applySourceFilters()
  return panel
}

function renderGroupedSourceSystemCard(system, sourceContractMap, connectorMap) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title = document.createElement('h4')
  title.textContent = system.title || system.systemId || 'Grouped source system'
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-card-id'
  meta.textContent = system.systemId || 'Grouped system'
  titleWrap.appendChild(meta)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  tags.appendChild(renderSourceTag(system.status || 'Mapped system', 'planned'))
  tags.appendChild(renderSourceTag(system.trustState || 'Cross-source map', 'neutral'))
  article.appendChild(tags)

  var copy = document.createElement('p')
  copy.className = 'source-card-copy'
  copy.textContent = system.purpose || ''
  article.appendChild(copy)

  var sourceIds = Array.isArray(system.sourceIds) ? system.sourceIds : []
  var supportingSourceIds = Array.isArray(system.supportingSourceIds) ? system.supportingSourceIds : []
  var connectorIds = Array.isArray(system.connectorIds) ? system.connectorIds : []
  var backlogIds = Array.isArray(system.backlogIds) ? system.backlogIds : []

  var grid = document.createElement('div')
  grid.className = 'source-card-meta-grid'
  grid.appendChild(renderSourceMetaItem('Source contracts', String(sourceIds.length)))
  if (supportingSourceIds.length) {
    grid.appendChild(renderSourceMetaItem('Supporting sources', String(supportingSourceIds.length)))
  }
  grid.appendChild(renderSourceMetaItem('Connectors', String(connectorIds.length)))
  grid.appendChild(renderSourceMetaItem('Backlog cards', String(backlogIds.length)))
  if (system.trustState) grid.appendChild(renderSourceMetaItem('Boundary', system.trustState))
  article.appendChild(grid)

  var sourceNames = sourceIds.map(function(id) {
    var contract = sourceContractMap[id]
    return contract ? id + ' - ' + contract.title : id
  })
  if (sourceNames.length) {
    article.appendChild(renderSourceBulletGroup('Connected source contracts', sourceNames))
  }

  var supportingSourceNames = supportingSourceIds.map(function(id) {
    var contract = sourceContractMap[id]
    return contract ? id + ' - ' + contract.title : id
  })
  if (supportingSourceNames.length) {
    article.appendChild(renderSourceBulletGroup('Supporting evidence sources', supportingSourceNames))
  }

  var connectorNames = connectorIds.map(function(id) {
    var connector = connectorMap[id]
    return connector ? id + ' - ' + connector.title : id
  })
  if (connectorNames.length) {
    article.appendChild(renderSourceBulletGroup('Connector layer', connectorNames))
  }

  if (Array.isArray(system.appliesTo) && system.appliesTo.length) {
    article.appendChild(renderSourceBulletGroup('Applies to', system.appliesTo))
  }

  if (backlogIds.length) {
    article.appendChild(renderSourceBulletGroup('Tracked work', backlogIds))
  }

  appendSourceActions(article, system.actions || [])
  return article
}

function renderGroupedSourceSystemsPanel(groupedSystems, sourceContracts, sourceConnectors) {
  var systems = Array.isArray(groupedSystems) ? groupedSystems : []
  if (!systems.length) return null

  var panel = document.createElement('section')
  panel.className = 'panel source-zone-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')

  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Grouped Systems'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'What these sources power'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'These maps show the big operating systems that cross individual connectors. They explain what each bundle is for and which source contracts feed it.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var sourceContractMap = {}
  ;(sourceContracts || []).forEach(function(contract) {
    if (contract.sourceId) sourceContractMap[contract.sourceId] = contract
  })

  var connectorMap = {}
  ;(sourceConnectors || []).forEach(function(connector) {
    if (connector.connectorId) connectorMap[connector.connectorId] = connector
  })

  var board = document.createElement('div')
  board.className = 'source-contract-stack'
  systems.forEach(function(system) {
    board.appendChild(renderGroupedSourceSystemCard(system, sourceContractMap, connectorMap))
  })
  panel.appendChild(board)
  return panel
}

function getKpiHealthTone(status) {
  if (status === 'healthy') return 'connected'
  if (status === 'warning') return 'pending'
  if (status === 'risk') return 'missing'
  return 'neutral'
}

function renderKpiHealthTableCard(table) {
  var article = document.createElement('article')
  article.className = 'source-card'

  var top = document.createElement('div')
  top.className = 'source-card-title-wrap'
  var title = document.createElement('h4')
  title.textContent = table.table || 'KPI table'
  top.appendChild(title)
  var id = document.createElement('div')
  id.className = 'source-card-id'
  id.textContent = table.readRule || 'KPI read rule'
  top.appendChild(id)
  article.appendChild(top)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  tags.appendChild(renderSourceTag(table.status || 'unknown', getKpiHealthTone(table.status)))
  tags.appendChild(renderSourceTag(table.freshnessStatus || 'freshness unknown', getKpiHealthTone(table.freshnessStatus === 'stale' ? 'warning' : table.freshnessStatus === 'fresh' ? 'healthy' : 'unknown')))
  article.appendChild(tags)

  var copy = document.createElement('p')
  copy.className = 'source-card-copy'
  copy.textContent = table.dashboardSurface || 'Load-bearing KPI dashboard table.'
  article.appendChild(copy)

  var meta = document.createElement('div')
  meta.className = 'source-card-meta-grid'
  meta.appendChild(renderSourceMetaItem('Rows', table.rowCount == null ? 'Unknown' : String(table.rowCount)))
  meta.appendChild(renderSourceMetaItem('Freshness window', (table.freshnessWindowDays || 0) + ' days'))
  meta.appendChild(renderSourceMetaItem('Latest field', table.freshnessColumn || 'None detected'))
  meta.appendChild(renderSourceMetaItem('Latest value', table.latestValue ? formatDate(table.latestValue) : 'Unknown'))
  article.appendChild(meta)

  if (table.freshnessFinding) {
    article.appendChild(renderSourceBulletGroup('Finding', [table.freshnessFinding]))
  }
  if (Array.isArray(table.missingColumns) && table.missingColumns.length) {
    article.appendChild(renderSourceBulletGroup('Missing columns', table.missingColumns))
  }
  return article
}

function renderKpiHealthRpcCard(rpc) {
  var article = document.createElement('article')
  article.className = 'source-card'

  var top = document.createElement('div')
  top.className = 'source-card-title-wrap'
  var title = document.createElement('h4')
  title.textContent = rpc.rpc || 'KPI RPC'
  top.appendChild(title)
  var id = document.createElement('div')
  id.className = 'source-card-id'
  id.textContent = rpc.readRule || 'KPI read rule'
  top.appendChild(id)
  article.appendChild(top)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  tags.appendChild(renderSourceTag(rpc.status || 'unknown', getKpiHealthTone(rpc.status)))
  tags.appendChild(renderSourceTag('Read-only probe', 'neutral'))
  article.appendChild(tags)

  var copy = document.createElement('p')
  copy.className = 'source-card-copy'
  copy.textContent = rpc.dashboardSurface || 'Load-bearing KPI dashboard RPC.'
  article.appendChild(copy)

  var meta = document.createElement('div')
  meta.className = 'source-card-meta-grid'
  meta.appendChild(renderSourceMetaItem('Rows returned', rpc.rowCount == null ? 'Unknown' : String(rpc.rowCount)))
  meta.appendChild(renderSourceMetaItem('Expected output fields', (rpc.expectedColumns || []).join(', ')))
  article.appendChild(meta)

  if (rpc.error) article.appendChild(renderSourceBulletGroup('Error', [rpc.error]))
  if (Array.isArray(rpc.missingColumns) && rpc.missingColumns.length) {
    article.appendChild(renderSourceBulletGroup('Missing output fields', rpc.missingColumns))
  }
  return article
}

function renderKpiSupabaseHealthPanel(kpiHealth) {
  if (!kpiHealth || !kpiHealth.summary) return null
  var summary = kpiHealth.summary || {}
  var panel = document.createElement('section')
  panel.className = 'panel source-zone-panel source-zone-panel-systems'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'KPI / Supabase Health'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Load-bearing KPI freshness and schema drift'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Read-only probe for the KPI tables and RPCs Steve relies on for Sales, finance, Owners pulse, competition, and usage dashboards.'
  left.appendChild(intro)
  header.appendChild(left)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  tags.appendChild(renderSourceTag(summary.status || 'unknown', getKpiHealthTone(summary.status)))
  tags.appendChild(renderSourceTag((summary.tableCount || 0) + ' tables', 'neutral'))
  tags.appendChild(renderSourceTag((summary.rpcCount || 0) + ' RPCs', 'neutral'))
  tags.appendChild(renderSourceTag((summary.staleTables || 0) + ' stale', summary.staleTables ? 'pending' : 'connected'))
  header.appendChild(tags)
  panel.appendChild(header)

  var meta = document.createElement('div')
  meta.className = 'source-card-meta-grid'
  meta.appendChild(renderSourceMetaItem('Project', kpiHealth.projectHost || 'Unknown'))
  meta.appendChild(renderSourceMetaItem('Checked', formatDate(kpiHealth.generatedAt)))
  meta.appendChild(renderSourceMetaItem('Schema drift', kpiHealth.schemaDrift?.status || 'Unknown'))
  meta.appendChild(renderSourceMetaItem('Lee repo', kpiHealth.leeRepo?.exists ? kpiHealth.leeRepo.repoPath : 'Missing'))
  panel.appendChild(meta)

  var findings = []
  ;(summary.riskFindings || []).forEach(function(item) { findings.push('Risk: ' + item) })
  ;(summary.warningFindings || []).forEach(function(item) { findings.push('Warning: ' + item) })
  if (findings.length) panel.appendChild(renderSourceBulletGroup('Current findings', findings))

  var driftItems = [
    'Live Supabase columns must match the locked KPI read rules.',
    'Lee zahnd-team-dashboard code/migrations must still reference the expected KPI tables and RPCs.',
    'Freshness windows are per source, not a generic table-exists check.',
  ]
  panel.appendChild(renderSourceBulletGroup('Drift checklist', driftItems))

  var tableStack = document.createElement('div')
  tableStack.className = 'source-contract-stack'
  ;(kpiHealth.tables || []).forEach(function(table) {
    tableStack.appendChild(renderKpiHealthTableCard(table))
  })
  panel.appendChild(tableStack)

  var rpcStack = document.createElement('div')
  rpcStack.className = 'source-contract-stack'
  ;(kpiHealth.rpcs || []).forEach(function(rpc) {
    rpcStack.appendChild(renderKpiHealthRpcCard(rpc))
  })
  panel.appendChild(rpcStack)

  return panel
}

function renderKpiHealthRuntimeWarning(kpiHealth) {
  if (!kpiHealth || !kpiHealth.summary || kpiHealth.summary.status === 'healthy') return null
  var summary = kpiHealth.summary
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'KPI Health Warning'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'KPI / Supabase needs attention'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Runtime Health only surfaces KPI here when freshness, schema drift, or the health probe itself is unhealthy. The full probe lives in Data Sources.'
  left.appendChild(intro)
  header.appendChild(left)
  header.appendChild(createActionLink('Open KPI Health', '/foundation#source-apis:kpi-supabase-health'))
  panel.appendChild(header)

  var findings = []
  ;(summary.riskFindings || []).forEach(function(item) { findings.push('Risk: ' + item) })
  ;(summary.warningFindings || []).forEach(function(item) { findings.push('Warning: ' + item) })
  panel.appendChild(renderSourceBulletGroup('Findings', findings.length ? findings : ['KPI status is ' + summary.status]))
  return panel
}
function renderSourceConnectorsPanel(sourceConnectors, options) {
  var opts = options || {}
  var connectorPanel = document.createElement('section')
  connectorPanel.className = 'panel source-zone-panel source-zone-panel-connectors'

  var connectorHeader = document.createElement('div')
  connectorHeader.className = 'panel-header'

  var connectorLeft = document.createElement('div')
  var connectorEyebrow = document.createElement('div')
  connectorEyebrow.className = 'eyebrow'
  connectorEyebrow.textContent = opts.eyebrow || 'Connector Layer'
  connectorLeft.appendChild(connectorEyebrow)

  var connectorTitle = document.createElement('h3')
  connectorTitle.textContent = opts.title || 'Connections and access paths'
  connectorLeft.appendChild(connectorTitle)

  var connectorIntro = document.createElement('p')
  connectorIntro.className = 'section-intro'
  connectorIntro.textContent = opts.intro || 'These are the pipes. Pipe does not equal trust.'
  connectorLeft.appendChild(connectorIntro)

  connectorHeader.appendChild(connectorLeft)
  connectorPanel.appendChild(connectorHeader)

  var connectorBoard = document.createElement('div')
  connectorBoard.className = 'source-contract-stack'

  ;[
    { key: 'connected', title: 'Working Now', intro: 'These connectors are live enough to use in the rebuild today.' },
    { key: 'needs-verification', title: 'Installed / Needs Validation', intro: 'These connectors or APIs are known paths, but their BCrew operating boundary is not trusted yet.' },
    { key: 'not-connected', title: 'Not Wired Yet', intro: 'These are known connector slots that still need setup, policy, or implementation work.' },
  ].forEach(function(group) {
    var groupConnectors = sourceConnectors.filter(function(connector) {
      return getConnectorState(connector).key === group.key
    })
    var groupPanel = renderConnectorStack(group, groupConnectors)
    if (groupPanel) connectorBoard.appendChild(groupPanel)
  })

  connectorPanel.appendChild(connectorBoard)
  return connectorPanel
}

function renderSourceOperatorNotesDrawer(data) {
  var notesPanel = document.createElement('section')
  notesPanel.className = 'panel'

  if (!data.foundation.sourceRegistry.meta.exists) {
    var notice = document.createElement('p')
    notice.textContent = 'Source registry not found. Create docs/source-registry.md.'
    notesPanel.appendChild(notice)
  } else {
    var notesHeader = document.createElement('div')
    notesHeader.className = 'panel-header'

    var notesLeft = document.createElement('div')
    var notesEyebrow = document.createElement('div')
    notesEyebrow.className = 'eyebrow'
    notesEyebrow.textContent = 'Operator Note'
    notesLeft.appendChild(notesEyebrow)

    var notesTitle = document.createElement('h3')
    notesTitle.textContent = 'Registry note and overlap history'
    notesLeft.appendChild(notesTitle)

    var notesIntro = document.createElement('p')
    notesIntro.className = 'section-intro'
    notesIntro.textContent = 'The structured cards above are the front door. The markdown note below keeps the deeper overlap rules, history, and audit context without turning the whole page into one giant note.'
    notesLeft.appendChild(notesIntro)

    notesHeader.appendChild(notesLeft)
    notesPanel.appendChild(notesHeader)

    var sectionList = document.createElement('div')
    sectionList.className = 'section-list'
    data.foundation.sourceRegistry.sections.forEach(function(section) {
      sectionList.appendChild(renderSection(section, data.foundation.sourceRegistry.meta.path))
    })
    notesPanel.appendChild(sectionList)
  }

  return renderOperatorToolsDrawer(
    'Operator Notes',
    'Deeper source notes, overlap rules, and audit context live here. Keep the live cards above as the default view.',
    [notesPanel],
    false
  )
}

var fubLeadSourceViewState = {
  context: 'owner',
  query: '',
  marketing: 'all',
  ownership: 'all',
  flag: 'all',
}

var FUB_SOURCE_GROUP_OPTIONS = [
  '',
  'Web Leads',
  'Ads Leads',
  'Offline Leads',
  'Phone Leads',
  'Social Media',
  'Referral / Sphere',
  'Other',
]

function getFubSourceGroupOrder(groupName) {
  var normalized = groupName || 'Ungrouped'
  if (normalized === 'Ungrouped') return FUB_SOURCE_GROUP_OPTIONS.length + 1
  var idx = FUB_SOURCE_GROUP_OPTIONS.indexOf(normalized)
  return idx === -1 ? FUB_SOURCE_GROUP_OPTIONS.length : idx
}

function getFubMarketingTag(item) {
  if (item.marketingType === 'marketing') return { label: 'Marketing', tone: 'connected' }
  if (item.marketingType === 'non_marketing') return { label: 'Non-marketing', tone: 'neutral' }
  return { label: 'Unclassified', tone: 'pending' }
}

function getFubOwnershipTag(item) {
  if (item.ownershipType === 'company') return { label: 'Company', tone: 'planned' }
  if (item.ownershipType === 'agent') return { label: 'Agent', tone: 'neutral' }
  if (item.ownershipType === 'referral') return { label: 'Referral', tone: 'connected' }
  if (item.ownershipType === 'other') return { label: 'Other', tone: 'neutral' }
  return { label: 'Ownership open', tone: 'pending' }
}

function getFubFlagTag(item) {
  if (item.flagState === 'needs_cleanup') return { label: 'Needs cleanup', tone: 'pending' }
  if (item.flagState === 'not_canonical') return { label: 'Invalid Lead Source', tone: 'missing' }
  if (item.flagState === 'merge_candidate') return { label: 'Merge candidate', tone: 'planned' }
  return null
}

function formatDriftAge(hours) {
  if (hours == null || !isFinite(hours)) return 'unknown age'
  if (hours < 1) return 'under 1 hour old'
  if (hours < 24) return Math.round(hours) + ' hour' + (Math.round(hours) === 1 ? '' : 's') + ' old'
  var days = Math.floor(hours / 24)
  return days + ' day' + (days === 1 ? '' : 's') + ' old'
}

function renderFubDriftBucket(titleText, tone, summaryText, items, formatter) {
  var card = document.createElement('article')
  card.className = 'source-drift-pill source-drift-pill-' + tone

  var top = document.createElement('div')
  top.className = 'source-drift-pill-top'

  var title = document.createElement('div')
  title.className = 'source-drift-pill-title'
  title.textContent = titleText
  top.appendChild(title)
  top.appendChild(renderSourceTag(String(items.length), tone))
  card.appendChild(top)

  if (items.length) {
    var list = document.createElement('ul')
    list.className = 'source-drift-list'
    items.slice(0, 8).forEach(function(item) {
      var row = document.createElement('li')
      row.textContent = formatter(item)
      list.appendChild(row)
    })
    if (items.length > 8) {
      var more = document.createElement('li')
      more.textContent = '…and ' + (items.length - 8) + ' more'
      list.appendChild(more)
    }
    card.appendChild(list)
  } else {
    var summary = document.createElement('div')
    summary.className = 'source-drift-pill-summary'
    summary.textContent = summaryText
    card.appendChild(summary)
  }

  return card
}

function renderFubLeadSourceDriftPanel(loaded) {
  var drift = loaded && loaded.drift ? loaded.drift : null
  if (!drift) return null

  var wrap = document.createElement('div')
  wrap.className = 'source-drift-wrap'

  var intro = document.createElement('div')
  intro.className = 'source-layer-divider'
  if (drift.status === 'no_snapshot') {
    intro.textContent = 'Drift watch is waiting on the first saved snapshot. Run Refresh Snapshot once, then this panel will show new names, legacy values, open classifications, and stale-state.'
    wrap.appendChild(intro)
    return wrap
  }

  var parts = []
  parts.push(drift.stats.reviewNow ? drift.stats.reviewNow + ' review item' + (drift.stats.reviewNow === 1 ? '' : 's') : 'No active review items')
  parts.push('Snapshot is ' + formatDriftAge(drift.stale.ageHours))
  if (drift.stale.isStale) parts.push('manual refresh is overdue')
  if (loaded.freshness && loaded.freshness.label) parts.push('review freshness: ' + loaded.freshness.label)
  intro.textContent = 'Drift watch: ' + parts.join(' · ')
  wrap.appendChild(intro)

  var actionableBuckets = [
    {
      title: 'New names with no rule',
      tone: drift.buckets.needsRules.length ? 'missing' : 'connected',
      summary: drift.buckets.needsRules.length
        ? 'These raw source names exist in FUB right now but are not yet governed.'
        : 'No raw source names are waiting for a first rule.',
      items: drift.buckets.needsRules,
      formatter: function(item) {
        var tail = item.defaultFlagState && item.defaultFlagState !== 'none'
          ? ' · default flag ' + item.defaultFlagState
          : ''
        return item.source + ' · ' + item.count + tail
      },
    },
    {
      title: 'Open classifications',
      tone: drift.buckets.openClassification.length ? 'pending' : 'connected',
      summary: drift.buckets.openClassification.length
        ? 'These names still leave marketing or ownership open.'
        : 'Marketing and ownership are classified for every current source.',
      items: drift.buckets.openClassification,
      formatter: function(item) {
        var gaps = []
        if (item.openMarketing) gaps.push('marketing')
        if (item.openOwnership) gaps.push('ownership')
        return item.source + ' · ' + item.count + ' · open ' + gaps.join(' + ')
      },
    },
    {
      title: 'Legacy or invalid names still live',
      tone: drift.buckets.legacyPresent.length ? 'missing' : 'connected',
      summary: drift.buckets.legacyPresent.length
        ? 'These names are still live and need cleanup.'
        : 'No flagged legacy names are showing up right now.',
      items: drift.buckets.legacyPresent,
      formatter: function(item) {
        return item.source + ' · ' + item.count + ' · ' + item.flagState
      },
    },
  ]

  var nonEmptyBuckets = actionableBuckets.filter(function(bucket) {
    return bucket.items.length
  })

  if (!nonEmptyBuckets.length) return wrap

  var reviewDetails = document.createElement('details')
  reviewDetails.className = 'source-drift-accordion'

  var reviewSummary = document.createElement('summary')
  reviewSummary.className = 'source-drift-accordion-summary'
  reviewSummary.textContent = 'Open review queue'
  reviewDetails.appendChild(reviewSummary)

  var grid = document.createElement('div')
  grid.className = 'source-drift-grid'
  nonEmptyBuckets.forEach(function(bucket) {
    grid.appendChild(renderFubDriftBucket(
      bucket.title,
      bucket.tone,
      bucket.summary,
      bucket.items,
      bucket.formatter
    ))
  })
  reviewDetails.appendChild(grid)
  wrap.appendChild(reviewDetails)
  return wrap
}

function renderOwnersLeadSourceGovernancePanel(loaded) {
  var drift = loaded && loaded.drift ? loaded.drift : null
  if (!drift) return null

  var wrap = document.createElement('div')
  wrap.className = 'source-drift-wrap'

  var intro = document.createElement('div')
  intro.className = 'source-layer-divider'
  if (drift.status === 'no_data') {
    intro.textContent = 'Owners governed dropdown watch could not read the live list yet.'
    wrap.appendChild(intro)
    return wrap
  }

  var parts = []
  parts.push(drift.stats.reviewNow ? drift.stats.reviewNow + ' review item' + (drift.stats.reviewNow === 1 ? '' : 's') : 'No active review items')
  parts.push(drift.stats.uniqueCurrentValues + ' live dropdown value' + (drift.stats.uniqueCurrentValues === 1 ? '' : 's'))
  parts.push(drift.stats.governedValues + ' governed value' + (drift.stats.governedValues === 1 ? '' : 's'))
  if (loaded.ownersList && loaded.ownersList.modifiedTime) {
    parts.push('list updated ' + formatAsOfDate(loaded.ownersList.modifiedTime))
  }
  if (loaded.freshness && loaded.freshness.label) parts.push('review freshness: ' + loaded.freshness.label)
  intro.textContent = 'Dropdown drift watch: ' + parts.join(' · ')
  wrap.appendChild(intro)

  var grid = document.createElement('div')
  grid.className = 'source-drift-grid'

  grid.appendChild(renderFubDriftBucket(
    'Unexpected values live in Owners',
    drift.buckets.unexpectedInOwnersList.length ? 'missing' : 'connected',
    drift.buckets.unexpectedInOwnersList.length
      ? 'These values are still in the live dropdown but are not approved in the governed taxonomy.'
      : 'The live dropdown contains only governed lead-source values.',
    drift.buckets.unexpectedInOwnersList,
    function(item) {
      return item.value + ' · ' + item.count
    }
  ))

  grid.appendChild(renderFubDriftBucket(
    'Approved values missing from Owners',
    drift.buckets.missingFromOwnersList.length ? 'pending' : 'connected',
    drift.buckets.missingFromOwnersList.length
      ? 'These approved taxonomy values are missing from the live dropdown.'
      : 'Every governed lead-source value is present in the live dropdown.',
    drift.buckets.missingFromOwnersList,
    function(item) {
      return item.value
    }
  ))

  grid.appendChild(renderFubDriftBucket(
    'Duplicate dropdown values',
    drift.buckets.duplicates.length ? 'pending' : 'connected',
    drift.buckets.duplicates.length
      ? 'These values appear more than once in the live dropdown.'
      : 'No duplicate values are present in the live dropdown.',
    drift.buckets.duplicates,
    function(item) {
      return item.value + ' · ' + item.count + ' copies'
    }
  ))

  var actions = document.createElement('div')
  actions.className = 'doc-source-actions'
  ;[
    { href: '/foundation#source-apis:fub-lead-source-taxonomy', label: 'Open FUB Review' },
    { href: '/foundation#rebuild-plan', label: 'Open Rebuild Plan' },
  ].forEach(function(action) {
    var link = document.createElement('a')
    link.className = 'doc-source-link'
    link.href = action.href
    link.textContent = action.label
    actions.appendChild(link)
  })

  wrap.appendChild(grid)
  wrap.appendChild(actions)
  return wrap
}

function renderFubLeadSourceRuleItem(item, onSaved, contextKey) {
  var details = document.createElement('details')
  details.className = 'source-item'

  var summary = document.createElement('summary')
  summary.className = 'source-item-summary'

  var left = document.createElement('div')
  left.className = 'source-item-summary-left'

  var title = document.createElement('div')
  title.className = 'source-item-summary-title'
  title.textContent = item.source
  left.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-item-summary-meta'
  meta.textContent = item.count + ' contact' + (item.count === 1 ? '' : 's') + (item.sourceGroup ? ' · ' + item.sourceGroup : '')
  left.appendChild(meta)

  if (item.notes) {
    var excerpt = document.createElement('div')
    excerpt.className = 'source-item-summary-copy'
    excerpt.textContent = item.notes
    left.appendChild(excerpt)
  }

  summary.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-item-summary-right'
  right.appendChild(renderSourceTag(String(item.count), 'neutral'))
  var flagTag = getFubFlagTag(item)
  if (flagTag) right.appendChild(renderSourceTag(flagTag.label, flagTag.tone))
  right.appendChild(renderSourceTag(getFubMarketingTag(item).label, getFubMarketingTag(item).tone))
  right.appendChild(renderSourceTag(getFubOwnershipTag(item).label, getFubOwnershipTag(item).tone))
  summary.appendChild(right)
  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-item-body'

  var grid = document.createElement('div')
  grid.className = 'memory-inline-grid'

  var marketingSelect = buildSelect([
    { value: 'unclassified', label: 'Unclassified', selected: item.marketingType === 'unclassified' },
    { value: 'marketing', label: 'Marketing', selected: item.marketingType === 'marketing' },
    { value: 'non_marketing', label: 'Non-marketing', selected: item.marketingType === 'non_marketing' },
  ])
  grid.appendChild(buildField('Marketing', marketingSelect))

  var ownershipSelect = buildSelect([
    { value: 'unclassified', label: 'Unclassified', selected: item.ownershipType === 'unclassified' },
    { value: 'company', label: 'Company', selected: item.ownershipType === 'company' },
    { value: 'agent', label: 'Agent', selected: item.ownershipType === 'agent' },
    { value: 'referral', label: 'Referral', selected: item.ownershipType === 'referral' },
    { value: 'other', label: 'Other', selected: item.ownershipType === 'other' },
  ])
  grid.appendChild(buildField('Ownership', ownershipSelect))

  var flagSelect = buildSelect([
    { value: 'none', label: 'None', selected: !item.flagState || item.flagState === 'none' },
    { value: 'needs_cleanup', label: 'Needs cleanup', selected: item.flagState === 'needs_cleanup' },
    { value: 'not_canonical', label: 'Invalid Lead Source', selected: item.flagState === 'not_canonical' },
    { value: 'merge_candidate', label: 'Merge candidate', selected: item.flagState === 'merge_candidate' },
  ])
  grid.appendChild(buildField('Flag', flagSelect))

  var groupSelect = buildSelect(FUB_SOURCE_GROUP_OPTIONS.map(function(option) {
    return {
      value: option,
      label: option || 'No group',
      selected: (item.sourceGroup || '') === option,
    }
  }))
  grid.appendChild(buildField('Group', groupSelect))

  var notesInput = buildTextarea('Why this source is classified this way', 2)
  notesInput.value = item.notes || ''
  grid.appendChild(buildField('Notes', notesInput))
  body.appendChild(grid)

  var actions = document.createElement('div')
  actions.className = 'memory-form-actions'

  var save = document.createElement('button')
  save.type = 'button'
  save.className = 'memory-button'
  save.textContent = 'Save Rule'
  actions.appendChild(save)

  var stamp = document.createElement('span')
  stamp.className = 'source-card-id'
  stamp.textContent = item.updatedAt
    ? 'Last saved ' + formatDate(item.updatedAt) + (item.updatedBy ? ' · ' + item.updatedBy : '')
    : 'No saved rule yet'
  actions.appendChild(stamp)

  body.appendChild(actions)

  var status = document.createElement('p')
  status.className = 'form-status'
  body.appendChild(status)

  save.addEventListener('click', function() {
    save.disabled = true
    foundationMutation('/api/fub/lead-sources', 'PATCH', {
      context: contextKey || 'owner',
      source: item.source,
      marketingType: marketingSelect.value,
      ownershipType: ownershipSelect.value,
      flagState: flagSelect.value,
      sourceGroup: groupSelect.value || null,
      notes: notesInput.value.trim() || null,
    }).then(function(payload) {
      var rule = payload.rule || {}
      item.marketingType = rule.marketingType || marketingSelect.value
      item.ownershipType = rule.ownershipType || ownershipSelect.value
      item.flagState = rule.flagState || flagSelect.value || 'none'
      item.sourceGroup = rule.sourceGroup || null
      item.notes = rule.notes || null
      item.updatedAt = rule.updatedAt || null
      item.updatedBy = rule.updatedBy || null
      setFormStatus(status, 'Saved.', 'success')
      stamp.textContent = item.updatedAt
        ? 'Last saved ' + formatDate(item.updatedAt) + (item.updatedBy ? ' · ' + item.updatedBy : '')
        : 'Saved'
      if (typeof onSaved === 'function') onSaved(payload.current || null)
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to save rule.', 'error')
    }).finally(function() {
      save.disabled = false
    })
  })

  details.appendChild(body)
  return details
}

function renderFubLeadSourceManagerPanel() {
  var panel = document.createElement('details')
  panel.id = 'fub-lead-source-taxonomy'
  panel.className = 'source-stack'

  var summaryRow = document.createElement('summary')
  summaryRow.className = 'source-stack-summary source-stack-summary-connected'

  var summaryLeft = document.createElement('div')
  summaryLeft.className = 'source-stack-summary-left'

  var summaryTitle = document.createElement('div')
  summaryTitle.className = 'source-stack-title'
  summaryTitle.textContent = 'FUB lead-source taxonomy'
  summaryLeft.appendChild(summaryTitle)

  var summaryIntro = document.createElement('div')
  summaryIntro.className = 'source-stack-intro'
  summaryIntro.textContent = 'Classify lead sources once here, then let marketing reporting, source validation, and sheet rules read the same truth.'
  summaryLeft.appendChild(summaryIntro)
  summaryRow.appendChild(summaryLeft)

  var summaryRight = document.createElement('div')
  summaryRight.className = 'source-item-summary-right'
  summaryRight.appendChild(renderSourceTag('Loading', 'pending'))
  summaryRow.appendChild(summaryRight)
  panel.appendChild(summaryRow)

  var body = document.createElement('div')
  body.className = 'source-stack-body'

  var contextSelect = buildSelect([
    { value: 'owner', label: 'Owner / Support FUB', selected: fubLeadSourceViewState.context === 'owner' },
    { value: 'steve', label: 'Steve FUB', selected: fubLeadSourceViewState.context === 'steve' },
  ])
  var refreshButton = document.createElement('button')
  refreshButton.type = 'button'
  refreshButton.className = 'memory-button'
  refreshButton.textContent = 'Refresh Snapshot'

  var queryInput = buildInput('search', 'Search lead source')
  queryInput.value = fubLeadSourceViewState.query

  var marketingFilter = buildSelect([
    { value: 'all', label: 'All marketing states', selected: fubLeadSourceViewState.marketing === 'all' },
    { value: 'unclassified', label: 'Unclassified', selected: fubLeadSourceViewState.marketing === 'unclassified' },
    { value: 'marketing', label: 'Marketing', selected: fubLeadSourceViewState.marketing === 'marketing' },
    { value: 'non_marketing', label: 'Non-marketing', selected: fubLeadSourceViewState.marketing === 'non_marketing' },
  ])

  var ownershipFilter = buildSelect([
    { value: 'all', label: 'All ownership states', selected: fubLeadSourceViewState.ownership === 'all' },
    { value: 'unclassified', label: 'Unclassified', selected: fubLeadSourceViewState.ownership === 'unclassified' },
    { value: 'company', label: 'Company', selected: fubLeadSourceViewState.ownership === 'company' },
    { value: 'agent', label: 'Agent', selected: fubLeadSourceViewState.ownership === 'agent' },
    { value: 'referral', label: 'Referral', selected: fubLeadSourceViewState.ownership === 'referral' },
    { value: 'other', label: 'Other', selected: fubLeadSourceViewState.ownership === 'other' },
  ])

  var flagFilter = buildSelect([
    { value: 'all', label: 'All flag states', selected: fubLeadSourceViewState.flag === 'all' },
    { value: 'flagged', label: 'Flagged only', selected: fubLeadSourceViewState.flag === 'flagged' },
    { value: 'none', label: 'No flag', selected: fubLeadSourceViewState.flag === 'none' },
    { value: 'needs_cleanup', label: 'Needs cleanup', selected: fubLeadSourceViewState.flag === 'needs_cleanup' },
    { value: 'not_canonical', label: 'Invalid Lead Source', selected: fubLeadSourceViewState.flag === 'not_canonical' },
    { value: 'merge_candidate', label: 'Merge candidate', selected: fubLeadSourceViewState.flag === 'merge_candidate' },
  ])

  var topGrid = document.createElement('div')
  topGrid.className = 'memory-form-grid'
  topGrid.appendChild(buildField('Context', contextSelect))
  topGrid.appendChild(buildField('Search', queryInput))
  topGrid.appendChild(buildField('Marketing filter', marketingFilter))
  topGrid.appendChild(buildField('Ownership filter', ownershipFilter))
  topGrid.appendChild(buildField('Flag filter', flagFilter))
  body.appendChild(topGrid)

  var actionRow = document.createElement('div')
  actionRow.className = 'memory-form-actions'
  actionRow.appendChild(refreshButton)

  var stamp = document.createElement('span')
  stamp.className = 'source-card-id'
  stamp.textContent = 'No saved snapshot yet'
  actionRow.appendChild(stamp)
  body.appendChild(actionRow)

  var summary = document.createElement('div')
  summary.className = 'source-layer-divider'
  summary.textContent = 'Loading lead-source snapshot...'
  body.appendChild(summary)

  var driftWrap = document.createElement('div')
  body.appendChild(driftWrap)

  var status = document.createElement('p')
  status.className = 'form-status'
  body.appendChild(status)

  var list = document.createElement('div')
  list.className = 'source-contract-stack'
  body.appendChild(list)

  var loaded = null

  function syncSummaryTags() {
    summaryRight.innerHTML = ''
    if (!loaded) {
      summaryRight.appendChild(renderSourceTag('Loading', 'pending'))
      return
    }

    var stats = loaded.stats || {}
    var snapshot = loaded.snapshot || {}
    summaryRight.appendChild(renderSourceTag((loaded.context && loaded.context.label) || 'FUB', 'neutral'))
    summaryRight.appendChild(renderSourceTag((stats.totalSources || 0) + ' sources', 'neutral'))
    summaryRight.appendChild(renderSourceTag((stats.openClassification || 0) + ' open', stats.openClassification ? 'pending' : 'connected'))
    summaryRight.appendChild(renderSourceTag((stats.flagged || 0) + ' flagged', stats.flagged ? 'missing' : 'connected'))
    summaryRight.appendChild(renderSourceTag(snapshot.available ? 'Snapshot ready' : 'Needs refresh', snapshot.available ? 'connected' : 'pending'))
  }

  function filteredSources() {
    if (!loaded) return []
    return (loaded.sources || []).filter(function(item) {
      if (fubLeadSourceViewState.marketing !== 'all' && item.marketingType !== fubLeadSourceViewState.marketing) return false
      if (fubLeadSourceViewState.ownership !== 'all' && item.ownershipType !== fubLeadSourceViewState.ownership) return false
      if (fubLeadSourceViewState.flag === 'flagged' && (!item.flagState || item.flagState === 'none')) return false
      if (fubLeadSourceViewState.flag !== 'all' && fubLeadSourceViewState.flag !== 'flagged' && (item.flagState || 'none') !== fubLeadSourceViewState.flag) return false
      var query = fubLeadSourceViewState.query.trim().toLowerCase()
      if (!query) return true
      return [
        item.source,
        item.notes,
        item.flagState,
        item.sourceGroup,
        item.marketingType,
        item.ownershipType,
      ].filter(Boolean).join(' ').toLowerCase().indexOf(query) !== -1
    }).sort(function(a, b) {
      var groupCompare = getFubSourceGroupOrder(a.sourceGroup || 'Ungrouped') - getFubSourceGroupOrder(b.sourceGroup || 'Ungrouped')
      if (groupCompare !== 0) return groupCompare
      if (b.count !== a.count) return b.count - a.count
      return a.source.localeCompare(b.source)
    })
  }

  function renderLoaded() {
    var items = filteredSources()
    var stats = loaded.stats || {}
    var snapshot = loaded.snapshot || {}
    var scan = loaded.scan || {}
    syncSummaryTags()

    stamp.textContent = snapshot.available && snapshot.refreshedAt
      ? 'Snapshot updated ' + formatDate(snapshot.refreshedAt) + (snapshot.refreshedBy ? ' · ' + snapshot.refreshedBy : '')
      : 'No saved snapshot yet'

    summary.textContent =
      'Showing ' + items.length + ' of ' + (stats.totalSources || 0) + ' sources' +
      ' · ' + (stats.unclassifiedMarketing || 0) + ' marketing open' +
      ' · ' + (stats.unclassifiedOwnership || 0) + ' ownership open' +
      ' · ' + (stats.flagged || 0) + ' flagged' +
      ' · ' + (scan.peopleScanned || 0) + ' contacts scanned across ' + (scan.pagesScanned || 0) + ' pages' +
      (scan.truncated ? ' · refresh hit the safety cap' : '')

    driftWrap.innerHTML = ''
    var driftPanel = renderFubLeadSourceDriftPanel(loaded)
    if (driftPanel) driftWrap.appendChild(driftPanel)

    list.innerHTML = ''
    if (!items.length) {
      var empty = document.createElement('div')
      empty.className = 'section-card source-card'
      empty.textContent = snapshot.available
        ? 'No lead sources match the current filters.'
        : 'No saved lead-source snapshot yet. Save write access and run Refresh Snapshot.'
      list.appendChild(empty)
      return
    }

    var groupedItems = {}
    items.forEach(function(item) {
      var groupName = item.sourceGroup || 'Ungrouped'
      if (!groupedItems[groupName]) groupedItems[groupName] = []
      groupedItems[groupName].push(item)
    })

    Object.keys(groupedItems).sort(function(a, b) {
      return getFubSourceGroupOrder(a) - getFubSourceGroupOrder(b)
    }).forEach(function(groupName) {
      var sectionItems = groupedItems[groupName]
      var totalContacts = sectionItems.reduce(function(sum, item) {
        return sum + (Number(item.count) || 0)
      }, 0)

      var groupHeader = document.createElement('div')
      groupHeader.className = 'source-layer-divider'
      groupHeader.textContent =
        groupName +
        ' · ' + sectionItems.length + ' source' + (sectionItems.length === 1 ? '' : 's') +
        ' · ' + totalContacts + ' contact' + (totalContacts === 1 ? '' : 's')
      list.appendChild(groupHeader)

      sectionItems.forEach(function(item) {
        list.appendChild(renderFubLeadSourceRuleItem(item, function(nextPayload) {
          if (nextPayload) loaded = nextPayload
          renderLoaded()
        }, fubLeadSourceViewState.context))
      })
    })
  }

  function load(refresh) {
    var message = refresh ? 'Refreshing FUB lead-source snapshot...' : 'Loading saved FUB lead-source snapshot...'
    summary.textContent = message
    list.innerHTML = '<p>' + message + '</p>'
    refreshButton.disabled = true
    if (refresh) setFormStatus(status, 'Running a full Follow Up Boss lead-source scan. This can take a bit on the owner account.', '')

    var loader = refresh ? refreshFubLeadSources : fetchFubLeadSources
    loader(fubLeadSourceViewState.context).then(function(data) {
      loaded = data
      setFormStatus(status, refresh ? 'Snapshot refreshed.' : '', refresh ? 'success' : '')
      renderLoaded()
    }).catch(function(error) {
      syncSummaryTags()
      summary.textContent = refresh ? 'Failed to refresh lead-source snapshot.' : 'Failed to load lead-source snapshot.'
      list.innerHTML = ''
      var msg = document.createElement('div')
      msg.className = 'section-card source-card'
      msg.textContent = error.message || 'Failed to load lead-source snapshot.'
      list.appendChild(msg)
      setFormStatus(status, error.message || 'Lead-source request failed.', 'error')
    }).finally(function() {
      refreshButton.disabled = false
    })
  }

  contextSelect.addEventListener('change', function() {
    fubLeadSourceViewState.context = contextSelect.value
    load(false)
  })
  queryInput.addEventListener('input', function() {
    fubLeadSourceViewState.query = queryInput.value
    if (loaded) renderLoaded()
  })
  marketingFilter.addEventListener('change', function() {
    fubLeadSourceViewState.marketing = marketingFilter.value
    if (loaded) renderLoaded()
  })
  ownershipFilter.addEventListener('change', function() {
    fubLeadSourceViewState.ownership = ownershipFilter.value
    if (loaded) renderLoaded()
  })
  flagFilter.addEventListener('change', function() {
    fubLeadSourceViewState.flag = flagFilter.value
    if (loaded) renderLoaded()
  })
  refreshButton.addEventListener('click', function() {
    load(true)
  })

  panel.appendChild(body)
  load(false)
  return panel
}

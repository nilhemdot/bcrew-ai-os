/* Action Route Review Inbox. Read-only page for proposed intelligence routes. */

function renderInboxMetric(label, value, detail) {
  var card = document.createElement('article')
  card.className = 'build-log-summary-metric'
  var number = document.createElement('strong')
  number.textContent = value
  card.appendChild(number)
  var title = document.createElement('span')
  title.textContent = label
  card.appendChild(title)
  if (detail) {
    var copy = document.createElement('p')
    copy.textContent = detail
    card.appendChild(copy)
  }
  return card
}

function renderInboxPill(text, tone) {
  var pill = document.createElement('span')
  pill.className = 'status-pill status-pill-static status-' + String(tone || text || 'unknown').replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  pill.textContent = text || 'Unknown'
  return pill
}

function renderInboxItem(item) {
  var details = document.createElement('details')
  details.className = 'action-review-card'
  if (item.reviewState === 'needs_review' || item.reviewState === 'backlog_candidate_review') details.open = true

  var summary = document.createElement('summary')
  summary.className = 'action-review-card-summary'
  var left = document.createElement('div')
  left.className = 'action-review-card-left'
  var title = document.createElement('h4')
  title.textContent = item.title || item.reviewItemId || 'Review item'
  left.appendChild(title)
  var meta = document.createElement('p')
  var age = item.ageDays === null || item.ageDays === undefined ? 'age unknown' : item.ageDays + ' days old'
  meta.textContent = [item.type, item.owner, age, item.destinationLabel].filter(Boolean).join(' · ')
  left.appendChild(meta)
  summary.appendChild(left)

  var pills = document.createElement('div')
  pills.className = 'action-review-card-pills'
  pills.appendChild(renderInboxPill(item.reviewState, item.reviewState))
  pills.appendChild(renderInboxPill(item.sourceKind, 'neutral'))
  summary.appendChild(pills)
  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'action-review-card-body'
  var copy = document.createElement('p')
  copy.textContent = item.summary || 'No summary provided.'
  body.appendChild(copy)

  var facts = document.createElement('div')
  facts.className = 'build-log-facts'
  ;[
    ['Route', item.routeId || 'not linked'],
    ['Backlog card', item.backlogCardId || 'not created'],
    ['Destination', [item.destinationTable, item.destinationRecordId].filter(Boolean).join(' / ') || item.destinationLabel],
    ['Source refs', (item.sourceRefs || []).slice(0, 6).join(', ') || 'missing'],
  ].forEach(function(row) {
    var line = document.createElement('div')
    line.className = 'build-log-fact'
    var label = document.createElement('strong')
    label.textContent = row[0]
    line.appendChild(label)
    var value = document.createElement('span')
    value.textContent = row[1]
    line.appendChild(value)
    facts.appendChild(line)
  })
  body.appendChild(facts)
  details.appendChild(body)
  return details
}

function renderActionRouteReviewInbox() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading Action Route Review Inbox.</p>'

  fetchActionRouteReviewInbox().then(function(payload) {
    var summary = payload.summary || {}
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero'
    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'
    var title = document.createElement('h1')
    title.textContent = 'Action Route Review Inbox'
    heroInner.appendChild(title)
    var copy = document.createElement('p')
    copy.className = 'hero-copy'
    copy.textContent = (summary.totalReviewItems || 0) + ' proposed findings · ' + (summary.needsReviewItems || 0) + ' need review · ' + (summary.backlogCandidateItems || 0) + ' separated from the normal backlog'
    heroInner.appendChild(copy)
    hero.appendChild(heroInner)
    var actions = document.createElement('div')
    actions.className = 'foundation-hero-actions'
    actions.appendChild(createActionLink('Backlog', '/foundation#backlog', 'print-button'))
    hero.appendChild(actions)
    container.appendChild(hero)

    var panel = document.createElement('section')
    panel.className = 'panel action-review-panel'
    var header = document.createElement('div')
    header.className = 'panel-header'
    var left = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Proposal Review'
    left.appendChild(eyebrow)
    var heading = document.createElement('h3')
    heading.textContent = 'Review items'
    left.appendChild(heading)
    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = 'These are proposed intelligence findings. They are not trusted sprint backlog until reviewed or promoted by the governed workflow.'
    left.appendChild(intro)
    header.appendChild(left)
    panel.appendChild(header)

    var metrics = document.createElement('div')
    metrics.className = 'build-log-summary-grid'
    metrics.appendChild(renderInboxMetric('Routes', summary.routeItems || 0, 'Action Router records'))
    metrics.appendChild(renderInboxMetric('Separated backlog', summary.backlogCandidateItems || 0, 'Route-derived rows'))
    metrics.appendChild(renderInboxMetric('Aged', summary.agedNeedsReviewItems || 0, 'Older than three days'))
    panel.appendChild(metrics)

    var stack = document.createElement('div')
    stack.className = 'action-review-stack'
    ;(payload.reviewItems || []).forEach(function(item) {
      stack.appendChild(renderInboxItem(item))
    })
    if (!stack.children.length) {
      var empty = document.createElement('p')
      empty.textContent = 'No review items are waiting.'
      stack.appendChild(empty)
    }
    panel.appendChild(stack)
    container.appendChild(panel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Action Route Review Inbox could not load. No routes were changed. Details: ' + error.message
    container.appendChild(msg)
  })
}

(function () {
  const root = document.getElementById('route-review-triage')
  const headStats = document.getElementById('route-review-triage-head-stats')

  function list(value) {
    return Array.isArray(value) ? value : []
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function compactNumber(value) {
    const number = Number(value || 0)
    return Number.isFinite(number) ? new Intl.NumberFormat('en-US').format(number) : '0'
  }

  function statusCopy(value = '') {
    return String(value || 'review')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  function renderMetric(label, value) {
    return `
      <article>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(compactNumber(value))}</strong>
      </article>
    `
  }

  function renderBucket(bucket = {}) {
    return `
      <article class="route-triage-bucket">
        <div>
          <span>${escapeHtml(bucket.label || bucket.bucketId || 'Review bucket')}</span>
          <p>${escapeHtml(bucket.action || 'Review before mutation.')}</p>
        </div>
        <strong>${escapeHtml(compactNumber(bucket.count || 0))}</strong>
      </article>
    `
  }

  function reasonText(item = {}) {
    const reasons = [
      ...list(item.hardBlocks),
      ...list(item.reviewReasons),
      ...list(item.riskReasons),
    ]
    return reasons.slice(0, 3).map(statusCopy).join(' · ') || 'Review required'
  }

  function renderRoute(row = {}) {
    return `
      <article class="route-triage-row">
        <span>${escapeHtml(statusCopy(row.safetyState || row.approvalStatus))}</span>
        <strong>${escapeHtml(row.title || row.routeId || 'Route review item')}</strong>
        <p>${escapeHtml(reasonText(row))}</p>
        <small>${escapeHtml(row.owner || 'owner pending')} · ${escapeHtml(row.destinationTable || 'destination pending')} · ${escapeHtml(row.ageDays === null || row.ageDays === undefined ? 'age unknown' : `${compactNumber(row.ageDays)}d old`)}</small>
      </article>
    `
  }

  function renderColumn(title, rows) {
    return `
      <article class="route-triage-column">
        <div class="route-triage-column-head">
          <span>${escapeHtml(title)}</span>
          <small>${escapeHtml(compactNumber(list(rows).length))}</small>
        </div>
        <div class="route-triage-list">
          ${list(rows).map(renderRoute).join('') || '<article class="route-triage-row"><strong>No routes returned.</strong></article>'}
        </div>
      </article>
    `
  }

  function renderRouteReviewTriage(snapshot = {}) {
    if (!root) return
    const triage = snapshot.routeReviewTriage || {}
    const summary = triage.summary || {}
    const queues = triage.queues || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.needsReviewItems || 0))}</b> waiting</span>
        <span><b>${escapeHtml(compactNumber(summary.ownerRequiredItems || 0))}</b> owner gaps</span>
        <span><b>${escapeHtml(compactNumber(summary.autoApplyAllowedItems || 0))}</b> auto-apply</span>
      `
    }

    if (!triage.ok) {
      root.innerHTML = `
        <article class="route-triage-empty blocked">
          <span>Fail closed</span>
          <h3>Route Review Triage is not healthy</h3>
          <p>${escapeHtml(list(triage.failures).slice(0, 4).join(' · ') || 'No route triage payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="route-triage-summary">
        ${renderMetric('Waiting', summary.needsReviewItems)}
        ${renderMetric('Owner Gaps', summary.ownerRequiredItems)}
        ${renderMetric('Sensitive', summary.sensitiveReviewItems)}
        ${renderMetric('Duplicate/Stale', summary.duplicateOrStaleReviewItems)}
        ${renderMetric('Ready Apply', summary.readyForConfirmedApplyItems)}
      </section>

      <section class="route-triage-boundary">
        <div>
          <span>Read-only review triage</span>
          <p>${escapeHtml(triage.plainEnglish || 'Routes are grouped for review without approving or applying anything.')}</p>
        </div>
      </section>

      <section class="route-triage-buckets">
        ${list(triage.triageBuckets).map(renderBucket).join('') || '<article class="route-triage-bucket"><span>No triage buckets returned.</span></article>'}
      </section>

      <section class="route-triage-grid">
        ${renderColumn('Ready apply', queues.readyForConfirmedApply)}
        ${renderColumn('Owner required', queues.ownerRequired)}
        ${renderColumn('Sensitive', queues.sensitiveReview)}
        ${renderColumn('Duplicate/stale', queues.duplicateOrStale)}
        ${renderColumn('Oldest', queues.oldest)}
      </section>
    `
  }

  function renderRouteReviewTriageError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Route Review Triage failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderRouteReviewTriage(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderRouteReviewTriageError(event.detail?.error || '')
  })
}())

(function () {
  const root = document.getElementById('intelligence-hygiene')
  const headStats = document.getElementById('intelligence-hygiene-head-stats')

  function list(value) {
    return Array.isArray(value) ? value : []
  }

  function text(value, fallback = '') {
    const normalized = String(value || '').trim()
    return normalized || fallback
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
    return text(value, 'review')
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
      <article class="hygiene-bucket">
        <div>
          <span>${escapeHtml(bucket.label || bucket.bucketId || 'Review bucket')}</span>
          <p>${escapeHtml(bucket.action || 'Review before mutation.')}</p>
        </div>
        <strong>${escapeHtml(compactNumber(bucket.count || 0))}</strong>
      </article>
    `
  }

  function renderSourceRow(row = {}) {
    return `
      <article class="hygiene-row">
        <span>${escapeHtml(statusCopy(row.firstGap || row.tone))}</span>
        <strong>${escapeHtml(row.title || row.sourceId || 'Source')}</strong>
        <p>${escapeHtml(row.detail || 'Pipeline gap visible.')}</p>
      </article>
    `
  }

  function renderRouteRow(row = {}) {
    return `
      <article class="hygiene-row">
        <span>${escapeHtml(statusCopy(row.stalenessSeverity || row.state))}</span>
        <strong>${escapeHtml(row.title || row.id || 'Route review item')}</strong>
        <p>${escapeHtml(compactNumber(row.duplicateClusterCount || 0))} duplicate cluster(s) · ${escapeHtml(row.owner || 'owner pending')}</p>
      </article>
    `
  }

  function renderScoperRow(row = {}) {
    return `
      <article class="hygiene-row">
        <span>${escapeHtml(statusCopy(row.sourceTraceStatus))}</span>
        <strong>${escapeHtml(row.title || 'Build recommendation')}</strong>
        <p>${escapeHtml(row.parkedReason || row.scoperStatus || 'Needs source trace.')}</p>
      </article>
    `
  }

  function renderFamilyRow(row = {}) {
    return `
      <article class="hygiene-row">
        <span>${escapeHtml(statusCopy(row.maturityState || row.freshnessStatus))}</span>
        <strong>${escapeHtml(row.label || row.familyId || 'Source family')}</strong>
        <p>${escapeHtml(row.nextBestAction || row.operatorBoundary || 'Review source boundary.')}</p>
      </article>
    `
  }

  function renderColumn(title, rows, renderer) {
    return `
      <article class="hygiene-column">
        <div class="hygiene-column-head">
          <span>${escapeHtml(title)}</span>
          <small>${escapeHtml(compactNumber(list(rows).length))}</small>
        </div>
        <div class="hygiene-list">
          ${list(rows).map(renderer).join('') || '<article class="hygiene-row"><strong>No rows returned.</strong></article>'}
        </div>
      </article>
    `
  }

  function renderHygiene(snapshot = {}) {
    if (!root) return
    const hygiene = snapshot.intelligenceHygieneReadback || {}
    const summary = hygiene.summary || {}
    const queues = hygiene.queues || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.totalCleanupPressure || 0))}</b> signals</span>
        <span><b>${escapeHtml(compactNumber(summary.atomizedGapSources || 0))}</b> atom gaps</span>
        <span><b>${escapeHtml(compactNumber(summary.routeReviewItems || 0))}</b> route reviews</span>
      `
    }

    if (!hygiene.ok) {
      root.innerHTML = `
        <article class="hygiene-empty blocked">
          <span>Fail closed</span>
          <h3>Intelligence Hygiene is not healthy</h3>
          <p>${escapeHtml(list(hygiene.failures).slice(0, 4).join(' · ') || 'No hygiene payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="hygiene-summary">
        ${renderMetric('Cleanup Signals', summary.totalCleanupPressure)}
        ${renderMetric('Atom Gaps', summary.atomizedGapSources)}
        ${renderMetric('Waiting Routes', summary.routeReviewItems)}
        ${renderMetric('Parked Scoper', summary.scoperParkedCandidates)}
      </section>

      <section class="hygiene-boundary">
        <div>
          <span>Read-only cleanup queue</span>
          <p>${escapeHtml(hygiene.plainEnglish || 'Ranks cleanup pressure without mutating the intelligence pipe.')}</p>
          ${hygiene.falseFreshnessWarning ? `<small>${escapeHtml(hygiene.falseFreshnessWarning)}</small>` : ''}
        </div>
      </section>

      <section class="hygiene-buckets">
        ${list(hygiene.nextBuckets).map(renderBucket).join('') || '<article class="hygiene-bucket"><span>No cleanup buckets returned.</span></article>'}
      </section>

      <section class="hygiene-grid">
        ${renderColumn('Source pipeline', queues.sourcePipeline, renderSourceRow)}
        ${renderColumn('Route noise', queues.routeNoise, renderRouteRow)}
        ${renderColumn('Scoper parked', queues.scoperParked, renderScoperRow)}
        ${renderColumn('Source families', queues.sourceFamilyBlockers, renderFamilyRow)}
      </section>
    `
  }

  function renderHygieneError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Intelligence Hygiene failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderHygiene(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderHygieneError(event.detail?.error || '')
  })
}())

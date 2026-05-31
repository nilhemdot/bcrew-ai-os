(function () {
  const root = document.getElementById('business-source-triage')
  const headStats = document.getElementById('business-source-head-stats')

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
    return String(value || 'missing')
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

  function renderFamily(bucket = {}) {
    return `
      <article class="business-source-family">
        <div>
          <span>${escapeHtml(statusCopy(bucket.status))}</span>
          <strong>${escapeHtml(bucket.label || bucket.familyId || 'Business source')}</strong>
          <p>${escapeHtml(bucket.action || 'Review source flow before promotion.')}</p>
        </div>
        <small>${escapeHtml(`${compactNumber(bucket.count)} sources · ${compactNumber(bucket.waitingRoutes)} waiting routes`)}</small>
      </article>
    `
  }

  function renderSource(row = {}) {
    return `
      <article class="business-source-row">
        <span>${escapeHtml(row.familyLabel || row.familyId || 'Business')}</span>
        <strong>${escapeHtml(row.title || row.sourceId || 'Business source')}</strong>
        <p>${escapeHtml(row.detail || statusCopy(row.businessStatus))}</p>
        <small>${escapeHtml(`${row.sourceId || 'source'} · ${statusCopy(row.businessStatus)} · ${compactNumber(row.waitingRoutes)} waiting routes`)}</small>
      </article>
    `
  }

  function renderColumn(title, rows) {
    return `
      <article class="business-source-column">
        <div class="business-source-column-head">
          <span>${escapeHtml(title)}</span>
          <small>${escapeHtml(compactNumber(list(rows).length))}</small>
        </div>
        <div class="business-source-list">
          ${list(rows).map(renderSource).join('') || '<article class="business-source-row"><strong>No rows returned.</strong></article>'}
        </div>
      </article>
    `
  }

  function renderBusinessSources(snapshot = {}) {
    if (!root) return
    const triage = snapshot.businessSourcePipelineTriage || {}
    const summary = triage.summary || {}
    const queues = triage.queues || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.businessSourceCount || 0))}</b> sources</span>
        <span><b>${escapeHtml(compactNumber(summary.staleAtomFlowCount || 0))}</b> stale</span>
        <span><b>${escapeHtml(compactNumber(summary.waitingRoutes || 0))}</b> waiting</span>
      `
    }

    if (!triage.ok) {
      root.innerHTML = `
        <article class="business-source-empty blocked">
          <span>Fail closed</span>
          <h3>Business source pipeline readback is not healthy</h3>
          <p>${escapeHtml(list(triage.failures).slice(0, 4).join(' · ') || 'No business source payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="business-source-summary">
        ${renderMetric('Sources', summary.businessSourceCount)}
        ${renderMetric('Stale Atoms', summary.staleAtomFlowCount)}
        ${renderMetric('Extracted Only', summary.extractedNotAtomizedCount)}
        ${renderMetric('Waiting Routes', summary.waitingRoutes)}
        ${renderMetric('Resolved', summary.resolvedCount)}
      </section>

      <section class="business-source-boundary">
        <div>
          <span>Read-only business source triage</span>
          <p>${escapeHtml(triage.plainEnglish || 'Business source readback reuses Foundation Done truth and does not sync, extract, write, promote, or send.')}</p>
        </div>
      </section>

      <section class="business-source-families">
        ${list(triage.familyBuckets).map(renderFamily).join('') || '<article class="business-source-family"><strong>No business families returned.</strong></article>'}
      </section>

      <section class="business-source-grid">
        ${renderColumn('Stale atom flow', queues.staleAtomFlow)}
        ${renderColumn('Extracted only', queues.extractedNotAtomized)}
        ${renderColumn('Waiting routes', queues.waitingRoutes)}
      </section>
    `
  }

  function renderBusinessSourceError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Business sources failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderBusinessSources(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderBusinessSourceError(event.detail?.error || '')
  })
}())

(function () {
  const root = document.getElementById('scoper-runtime-readback')
  const headStats = document.getElementById('scoper-runtime-head-stats')

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

  function shortDate(value) {
    const date = new Date(value || '')
    if (Number.isNaN(date.getTime())) return 'not scheduled'
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
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
      <article class="scoper-runtime-bucket">
        <div>
          <span>${escapeHtml(bucket.label || bucket.bucketId || 'Runtime bucket')}</span>
          <p>${escapeHtml(bucket.action || 'Review before mutation.')}</p>
        </div>
        <strong>${escapeHtml(compactNumber(bucket.count || 0))}</strong>
      </article>
    `
  }

  function renderJob(job = {}) {
    return `
      <article class="scoper-runtime-job">
        <span>${escapeHtml(statusCopy(job.status || job.latestRunStatus))}</span>
        <strong>${escapeHtml(job.title || job.key || 'Scoper job')}</strong>
        <p>${escapeHtml(`${statusCopy(job.runtimeMode || 'manual')} · ${job.cadence || 'cadence missing'}`)}</p>
        <small>${escapeHtml(`latest ${statusCopy(job.latestRunStatus)} · ${shortDate(job.latestRunAt)} · next ${shortDate(job.nextRunAt)}`)}</small>
      </article>
    `
  }

  function renderCandidate(candidate = {}) {
    return `
      <article class="scoper-runtime-candidate">
        <span>#${escapeHtml(compactNumber(candidate.rank || 0))} · ${escapeHtml(statusCopy(candidate.scoperStatus || candidate.sourceTraceStatus))}</span>
        <strong>${escapeHtml(candidate.title || 'Build recommendation')}</strong>
        <p>${escapeHtml(candidate.readyForPortfolio ? 'Ready for portfolio review only' : candidate.parkedReason || 'Parked until evidence trace is repaired')}</p>
        <small>${escapeHtml(candidate.sourceReportArtifactId || candidate.rawReportArtifactId || 'source proof pending')}</small>
      </article>
    `
  }

  function renderColumn(title, rows, renderer) {
    return `
      <article class="scoper-runtime-column">
        <div class="scoper-runtime-column-head">
          <span>${escapeHtml(title)}</span>
          <small>${escapeHtml(compactNumber(list(rows).length))}</small>
        </div>
        <div class="scoper-runtime-list">
          ${list(rows).map(renderer).join('') || '<article class="scoper-runtime-candidate"><strong>No rows returned.</strong></article>'}
        </div>
      </article>
    `
  }

  function renderScoperRuntime(snapshot = {}) {
    if (!root) return
    const readback = snapshot.scoperRuntimeReadback || {}
    const summary = readback.summary || {}
    const queues = readback.queues || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.scheduledScoperJobCount || 0))}</b> scheduled</span>
        <span><b>${escapeHtml(compactNumber(summary.readyForPortfolioCount || 0))}</b> ready</span>
        <span><b>${escapeHtml(compactNumber(summary.scheduleMutationsByReadback || 0))}</b> schedule writes</span>
      `
    }

    if (!readback.ok) {
      root.innerHTML = `
        <article class="scoper-runtime-empty blocked">
          <span>Fail closed</span>
          <h3>Scoper Runtime readback is not healthy</h3>
          <p>${escapeHtml(list(readback.failures).slice(0, 4).join(' · ') || 'No Scoper runtime payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="scoper-runtime-summary">
        ${renderMetric('Jobs', summary.scoperJobCount)}
        ${renderMetric('Scheduled', summary.scheduledScoperJobCount)}
        ${renderMetric('Ready', summary.readyForPortfolioCount)}
        ${renderMetric('Parked', summary.parkedCount)}
      </section>

      <section class="scoper-runtime-boundary">
        <div>
          <span>No schedule mutation</span>
          <p>${escapeHtml(readback.plainEnglish || 'Scoper runtime is read-only and does not promote recommendations.')}</p>
        </div>
      </section>

      <section class="scoper-runtime-buckets">
        ${list(readback.runtimeBuckets).map(renderBucket).join('') || '<article class="scoper-runtime-bucket"><span>No runtime buckets returned.</span></article>'}
      </section>

      <section class="scoper-runtime-grid">
        ${renderColumn('Runtime jobs', readback.jobs, renderJob)}
        ${renderColumn('Ready review', queues.readyForPortfolioReview, renderCandidate)}
        ${renderColumn('Parked evidence', queues.parkedByEvidence, renderCandidate)}
      </section>
    `
  }

  function renderScoperRuntimeError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Scoper Runtime failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderScoperRuntime(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderScoperRuntimeError(event.detail?.error || '')
  })
}())

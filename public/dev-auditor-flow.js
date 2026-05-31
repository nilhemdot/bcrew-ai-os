(function () {
  const root = document.getElementById('auditor-flow')
  const headStats = document.getElementById('auditor-flow-head-stats')

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

  function renderStage(stage = {}) {
    return `
      <article class="auditor-flow-stage">
        <span>${escapeHtml(statusCopy(stage.status))}</span>
        <strong>${escapeHtml(stage.label || stage.stageId || 'Flow stage')}</strong>
        <p>${escapeHtml(stage.detail || 'Review required.')}</p>
      </article>
    `
  }

  function renderBucket(bucket = {}) {
    return `
      <article class="auditor-flow-bucket">
        <div>
          <span>${escapeHtml(bucket.label || bucket.bucketId || 'Review bucket')}</span>
          <p>${escapeHtml(bucket.action || 'Review before mutation.')}</p>
        </div>
        <strong>${escapeHtml(compactNumber(bucket.count || 0))}</strong>
      </article>
    `
  }

  function renderJob(job = {}) {
    const latest = job.latestRunAt ? `${statusCopy(job.latestRunStatus)} · ${job.latestRunAt}` : statusCopy(job.latestRunStatus)
    return `
      <article class="auditor-flow-job">
        <span>${escapeHtml(statusCopy(job.outputChannel))}</span>
        <strong>${escapeHtml(job.title || job.key || 'Audit job')}</strong>
        <p>${escapeHtml(latest)}</p>
        <small>${escapeHtml(job.outputLandsIn || 'Output destination not classified.')}</small>
      </article>
    `
  }

  function renderSignal(signal = {}) {
    return `
      <article class="auditor-flow-signal">
        <span>${escapeHtml(statusCopy(signal.severity || 'review'))}</span>
        <strong>${escapeHtml(statusCopy(signal.signalId || 'signal'))}</strong>
        <p>${escapeHtml(signal.detail || 'Review before changing live work.')}</p>
      </article>
    `
  }

  function renderAuditorFlow(snapshot = {}) {
    if (!root) return
    const auditorFlow = snapshot.auditorFlowReadback || {}
    const summary = auditorFlow.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.scheduledAuditorJobs || 0))}</b> scheduled</span>
        <span><b>${escapeHtml(compactNumber(summary.reportOnlyJobs || 0))}</b> report-only</span>
        <span><b>${escapeHtml(compactNumber(summary.autoFindingPromotionCount || 0))}</b> auto-promote</span>
      `
    }

    if (!auditorFlow.ok) {
      root.innerHTML = `
        <article class="auditor-flow-empty blocked">
          <span>Fail closed</span>
          <h3>Auditor Flow is not healthy</h3>
          <p>${escapeHtml(list(auditorFlow.failures).slice(0, 4).join(' · ') || 'No auditor flow payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="auditor-flow-summary">
        ${renderMetric('Auditors', summary.auditorJobCount)}
        ${renderMetric('Latest Success', summary.succeededLatestRuns)}
        ${renderMetric('Waiting Routes', summary.waitingRouteReviewItems)}
        ${renderMetric('Review Pressure', summary.totalReviewPressure)}
      </section>

      <section class="auditor-flow-boundary">
        <div>
          <span>Report/check output only</span>
          <p>${escapeHtml(auditorFlow.plainEnglish || 'Auditor findings require separate approval before backlog, route, or Scoper movement.')}</p>
        </div>
      </section>

      <section class="auditor-flow-stages">
        ${list(auditorFlow.flowStages).map(renderStage).join('') || '<article class="auditor-flow-stage"><strong>No flow stages returned.</strong></article>'}
      </section>

      <section class="auditor-flow-buckets">
        ${list(auditorFlow.reviewBuckets).map(renderBucket).join('') || '<article class="auditor-flow-bucket"><span>No review buckets returned.</span></article>'}
      </section>

      <section class="auditor-flow-grid">
        <article class="auditor-flow-column">
          <div class="auditor-flow-column-head">
            <span>Auditor jobs</span>
            <small>${escapeHtml(compactNumber(list(auditorFlow.auditorJobs).length))}</small>
          </div>
          <div class="auditor-flow-list">
            ${list(auditorFlow.auditorJobs).map(renderJob).join('') || '<article class="auditor-flow-job"><strong>No auditor jobs returned.</strong></article>'}
          </div>
        </article>
        <article class="auditor-flow-column">
          <div class="auditor-flow-column-head">
            <span>Stuck signals</span>
            <small>${escapeHtml(compactNumber(list(auditorFlow.stuckSignals).length))}</small>
          </div>
          <div class="auditor-flow-list">
            ${list(auditorFlow.stuckSignals).map(renderSignal).join('') || '<article class="auditor-flow-signal"><strong>No stuck signals returned.</strong></article>'}
          </div>
        </article>
      </section>
    `
  }

  function renderAuditorFlowError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Auditor Flow failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderAuditorFlow(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderAuditorFlowError(event.detail?.error || '')
  })
}())

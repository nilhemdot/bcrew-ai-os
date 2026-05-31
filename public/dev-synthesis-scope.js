(function () {
  const root = document.getElementById('synthesis-scope')
  const headStats = document.getElementById('synthesis-scope-head-stats')

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

  function renderStage(stage = {}) {
    return `
      <article class="synthesis-scope-stage">
        <span>${escapeHtml(statusCopy(stage.status))}</span>
        <strong>${escapeHtml(stage.label || stage.stageId || 'Synthesis stage')}</strong>
        <p>${escapeHtml(stage.detail || 'Review required.')}</p>
      </article>
    `
  }

  function renderBucket(bucket = {}) {
    return `
      <article class="synthesis-scope-bucket">
        <div>
          <span>${escapeHtml(bucket.label || bucket.bucketId || 'Review bucket')}</span>
          <p>${escapeHtml(bucket.action || 'Review before mutation.')}</p>
        </div>
        <strong>${escapeHtml(compactNumber(bucket.count || 0))}</strong>
      </article>
    `
  }

  function renderSignal(signal = {}) {
    return `
      <article class="synthesis-scope-signal">
        <span>${escapeHtml(statusCopy(signal.severity || 'review'))}</span>
        <strong>${escapeHtml(statusCopy(signal.signalId || 'signal'))}</strong>
        <p>${escapeHtml(signal.detail || 'Review before changing live work.')}</p>
      </article>
    `
  }

  function renderSynthesisScope(snapshot = {}) {
    if (!root) return
    const readback = snapshot.synthesisScopeReadback || {}
    const summary = readback.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.proofItemLimit || 0))}</b> proof</span>
        <span><b>${escapeHtml(compactNumber(summary.refreshItemLimit || 0))}</b> refresh</span>
        <span><b>${escapeHtml(compactNumber(summary.refreshRunsStartedByReadback || 0))}</b> runs started</span>
      `
    }

    if (!readback.ok) {
      root.innerHTML = `
        <article class="synthesis-scope-empty blocked">
          <span>Fail closed</span>
          <h3>Synthesis Scope is not healthy</h3>
          <p>${escapeHtml(list(readback.failures).slice(0, 4).join(' · ') || 'No synthesis scope payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="synthesis-scope-summary">
        ${renderMetric('Proof Limit', summary.proofItemLimit)}
        ${renderMetric('Refresh Limit', summary.refreshItemLimit)}
        ${renderMetric('Source Inputs', summary.refreshSourceCount)}
        ${renderMetric('Readback Runs', summary.refreshRunsStartedByReadback)}
      </section>

      <section class="synthesis-scope-boundary">
        <div>
          <span>No-run scope proof</span>
          <p>${escapeHtml(readback.plainEnglish || 'Synthesis scope is visible without running refresh or model work.')}</p>
        </div>
      </section>

      <section class="synthesis-scope-pairs">
        <article>
          <span>Proof scope</span>
          <strong>${escapeHtml(summary.proofScopeKey || 'missing')}</strong>
          <p>${escapeHtml(compactNumber(summary.proofItemLimit || 0))} item deterministic lane</p>
        </article>
        <article>
          <span>Refresh scope</span>
          <strong>${escapeHtml(summary.refreshScopeKey || 'missing')}</strong>
          <p>${escapeHtml(compactNumber(summary.refreshItemLimit || 0))} item real-corpus lane</p>
        </article>
        <article>
          <span>Scheduled job</span>
          <strong>${escapeHtml(statusCopy(summary.scheduledRefreshLatestStatus || summary.scheduledRefreshJobStatus || 'missing'))}</strong>
          <p>${escapeHtml(summary.scheduledRefreshNextRunAt || 'No next run returned')}</p>
        </article>
      </section>

      <section class="synthesis-scope-stages">
        ${list(readback.flowStages).map(renderStage).join('') || '<article class="synthesis-scope-stage"><strong>No flow stages returned.</strong></article>'}
      </section>

      <section class="synthesis-scope-buckets">
        ${list(readback.reviewBuckets).map(renderBucket).join('') || '<article class="synthesis-scope-bucket"><span>No review buckets returned.</span></article>'}
      </section>

      <section class="synthesis-scope-signals">
        ${list(readback.stuckSignals).map(renderSignal).join('') || '<article class="synthesis-scope-signal"><strong>No stuck signals returned.</strong></article>'}
      </section>
    `
  }

  function renderSynthesisScopeError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Synthesis Scope failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderSynthesisScope(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderSynthesisScopeError(event.detail?.error || '')
  })
}())

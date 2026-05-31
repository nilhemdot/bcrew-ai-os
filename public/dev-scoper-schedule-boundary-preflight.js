(function () {
  const root = document.getElementById('scoper-schedule-boundary-preflight')
  const headStats = document.getElementById('scoper-schedule-boundary-preflight-head-stats')
  if (!root) return

  function list(value) {
    return Array.isArray(value) ? value : []
  }

  function text(value, fallback = '') {
    const output = String(value ?? '').trim()
    return output || fallback
  }

  function escapeHtml(value = '') {
    return text(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function compactNumber(value = 0) {
    const number = Number(value || 0)
    if (!Number.isFinite(number)) return '0'
    if (number >= 1000) return `${Math.round(number / 100) / 10}K`
    return String(number)
  }

  function renderMetric(label, value) {
    return `
      <article>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(compactNumber(value || 0))}</strong>
      </article>
    `
  }

  function renderSchedule(row = {}) {
    return `
      <article class="scoper-schedule-card">
        <div>
          <span>${escapeHtml(row.status || 'approval_required')}</span>
          <strong>${escapeHtml(row.title || row.proposedJobKey || 'Scoper schedule')}</strong>
          <p>${escapeHtml(row.currentSignal || row.proposedDone || '')}</p>
        </div>
        <dl>
          <div><dt>Job</dt><dd>${escapeHtml(row.proposedJobKey || '')}</dd></div>
          <div><dt>Cadence</dt><dd>${escapeHtml(row.cadence || '')}</dd></div>
          <div><dt>Posture</dt><dd>${escapeHtml(row.mutationPosture || '')}</dd></div>
          <div><dt>Command</dt><dd>${escapeHtml(row.command || '')}</dd></div>
        </dl>
        <p class="scoper-schedule-boundary-copy">${escapeHtml(row.operatorBoundary || '')}</p>
      </article>
    `
  }

  function renderScoperScheduleBoundary(snapshot = {}) {
    const readback = snapshot.scoperScheduleBoundaryPreflight || {}
    const summary = readback.summary || {}
    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.proposedScheduleCount || 0))}</b> proposed</span>
        <span><b>${escapeHtml(compactNumber(summary.readyForPortfolioCount || 0))}</b> ready</span>
        <span><b>${escapeHtml(compactNumber(summary.scheduleMutationsByReadback || 0))}</b> schedule writes</span>
      `
    }

    if (!readback.ok) {
      root.innerHTML = `
        <article class="loading-card error">
          <h3>Scoper schedule boundary is not healthy</h3>
          <p>${escapeHtml(list(readback.failures).slice(0, 4).join(' · ') || 'No Scoper schedule payload returned.')}</p>
        </article>
      `
      return
    }

    const proposedSchedules = list(readback.proposedSchedules)
    root.innerHTML = `
      <section class="scoper-schedule-summary">
        ${renderMetric('Schedule Proposals', summary.proposedScheduleCount)}
        ${renderMetric('Approval Required', summary.approvalRequiredCount)}
        ${renderMetric('Ready Candidates', summary.readyForPortfolioCount)}
        ${renderMetric('Parked', summary.parkedCount)}
      </section>

      <section class="scoper-schedule-boundary">
        <div>
          <span>${escapeHtml(readback.status || 'preflight')}</span>
          <p>${escapeHtml(readback.plainEnglish || 'Prepares a Scoper schedule contract without mutating the runtime.')}</p>
        </div>
      </section>

      <section class="scoper-schedule-list">
        ${proposedSchedules.map(renderSchedule).join('') || '<article class="scoper-schedule-empty"><strong>No schedule proposal</strong><p>Either a Scoper job is already visible or no current read-only schedule contract is ready.</p></article>'}
      </section>
    `
  }

  function renderScoperScheduleBoundaryError(error = '') {
    root.innerHTML = `<article class="loading-card error">Scoper schedule boundary failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderScoperScheduleBoundary(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderScoperScheduleBoundaryError(event.detail?.error || '')
  })
})()

(function () {
  const root = document.getElementById('route-autoclear-preflight')
  const headStats = document.getElementById('route-autoclear-preflight-head-stats')

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
    return String(value || 'preflight')
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

  function renderGroup(group = {}) {
    return `
      <article class="route-autoclear-group">
        <span>${escapeHtml(compactNumber(group.itemCount || 0))}</span>
        <strong>${escapeHtml(group.label || group.groupId || 'Preflight group')}</strong>
      </article>
    `
  }

  function renderPreflightRow(item = {}) {
    const sourceProof = item.sourceProof || {}
    return `
      <article class="route-autoclear-row ${escapeHtml(item.clearReadiness || 'review')}">
        <div class="route-autoclear-rank">#${escapeHtml(compactNumber(item.rank || 0))}</div>
        <div class="route-autoclear-copy">
          <span>${escapeHtml(item.routeId || 'route')} · ${escapeHtml(statusCopy(item.clearReadiness))} · ${escapeHtml(item.destinationTable || 'destination')}</span>
          <strong>${escapeHtml(item.title || item.routeId || 'Route auto-clear preflight item')}</strong>
          <p>${escapeHtml(item.proposedDisposition || 'Review this route without mutation.')}</p>
          <small>${escapeHtml(compactNumber(sourceProof.sourceRefCount || 0))} source refs · ${escapeHtml(compactNumber(sourceProof.duplicateClusterCount || 0))} duplicate links · ${escapeHtml(statusCopy(sourceProof.stalenessSeverity || 'none'))}</small>
          <small>${escapeHtml(item.mutationBoundary || 'Separate exact route-ID approval required before mutation.')}</small>
        </div>
      </article>
    `
  }

  function renderPreflight(snapshot = {}) {
    if (!root) return
    const preflight = snapshot.routeAutoClearPreflight || {}
    const summary = preflight.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.preflightItemCount || 0))}</b> rows</span>
        <span><b>${escapeHtml(compactNumber(summary.candidateAfterApprovalRows || 0))}</b> candidates</span>
        <span><b>${escapeHtml(compactNumber(summary.safeToAutoClearNowRows || 0))}</b> safe now</span>
      `
    }

    if (!preflight.ok) {
      root.innerHTML = `
        <article class="route-autoclear-empty blocked">
          <span>Fail closed</span>
          <h3>Route Auto-clear preflight is not healthy</h3>
          <p>${escapeHtml(list(preflight.failures).slice(0, 4).join(' · ') || 'No auto-clear preflight payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="route-autoclear-summary">
        ${renderMetric('Preflight Rows', summary.preflightItemCount)}
        ${renderMetric('Duplicate/Stale', summary.duplicateOrStaleReviewItems)}
        ${renderMetric('After Approval', summary.candidateAfterApprovalRows)}
        ${renderMetric('Owner Blocked', summary.blockedByOwnerRows)}
        ${renderMetric('Safe Now', summary.safeToAutoClearNowRows)}
      </section>

      <section class="route-autoclear-boundary">
        <div>
          <span>Auto-clear preflight</span>
          <p>${escapeHtml(preflight.plainEnglish || 'Names exact route IDs for later review without clearing, rejecting, snoozing, applying, rerouting, or sending.')}</p>
        </div>
      </section>

      <section class="route-autoclear-groups">
        ${list(preflight.groups).map(renderGroup).join('') || '<article class="route-autoclear-group"><strong>No groups returned.</strong></article>'}
      </section>

      <section class="route-autoclear-list">
        ${list(preflight.preflightRows).map(renderPreflightRow).join('') || '<article class="route-autoclear-row"><div class="route-autoclear-copy"><strong>No route auto-clear preflight rows returned.</strong></div></article>'}
      </section>
    `
  }

  function renderPreflightError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Route Auto-clear preflight failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderPreflight(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderPreflightError(event.detail?.error || '')
  })
}())

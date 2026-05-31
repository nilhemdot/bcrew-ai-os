(function () {
  const root = document.getElementById('route-blocker-preflight')
  const headStats = document.getElementById('route-blocker-preflight-head-stats')

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
    return String(value || 'blocked')
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
      <article class="route-blocker-group">
        <span>${escapeHtml(compactNumber(group.itemCount || 0))}</span>
        <strong>${escapeHtml(group.label || group.groupId || 'Blocker group')}</strong>
      </article>
    `
  }

  function renderBlockerRow(item = {}) {
    const sourceProof = item.sourceProof || {}
    return `
      <article class="route-blocker-row ${escapeHtml(item.decisionType || 'review')}">
        <div class="route-blocker-rank">#${escapeHtml(compactNumber(item.rank || 0))}</div>
        <div class="route-blocker-copy">
          <span>${escapeHtml(item.routeId || 'route')} · ${escapeHtml(statusCopy(item.decisionType))} · ${escapeHtml(item.destinationTable || 'destination')}</span>
          <strong>${escapeHtml(item.title || item.routeId || 'Route blocker item')}</strong>
          <p>${escapeHtml(item.operatorNextAction || 'Review this blocker without mutation.')}</p>
          <small>${escapeHtml(item.suggestedDecisionLane || 'Operator decision')} · ${escapeHtml(compactNumber(sourceProof.sourceRefCount || 0))} source refs · ${escapeHtml(compactNumber(sourceProof.duplicateClusterCount || 0))} duplicate links</small>
          <small>${escapeHtml(item.mutationBoundary || 'Separate exact route-ID approval required before mutation.')}</small>
        </div>
      </article>
    `
  }

  function renderBlockerPreflight(snapshot = {}) {
    if (!root) return
    const preflight = snapshot.routeBlockerPreflight || {}
    const summary = preflight.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.blockerItemCount || 0))}</b> blockers</span>
        <span><b>${escapeHtml(compactNumber(summary.ownerResolutionRows || 0))}</b> owner</span>
        <span><b>${escapeHtml(compactNumber(summary.sensitiveReviewRows || 0))}</b> sensitive</span>
      `
    }

    if (!preflight.ok) {
      root.innerHTML = `
        <article class="route-blocker-empty blocked">
          <span>Fail closed</span>
          <h3>Route Blocker Preflight is not healthy</h3>
          <p>${escapeHtml(list(preflight.failures).slice(0, 4).join(' · ') || 'No route blocker payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="route-blocker-summary">
        ${renderMetric('Blockers', summary.blockerItemCount)}
        ${renderMetric('Owner', summary.ownerResolutionRows)}
        ${renderMetric('Sensitive', summary.sensitiveReviewRows)}
        ${renderMetric('Assigned Now', summary.ownersAssignedByReadback)}
      </section>

      <section class="route-blocker-boundary">
        <div>
          <span>Route blocker preflight</span>
          <p>${escapeHtml(preflight.plainEnglish || 'Names exact owner and sensitive blockers without assigning owners, reviewing sensitive rows, or mutating routes.')}</p>
        </div>
      </section>

      <section class="route-blocker-groups">
        ${list(preflight.groups).map(renderGroup).join('') || '<article class="route-blocker-group"><strong>No groups returned.</strong></article>'}
      </section>

      <section class="route-blocker-list">
        ${list(preflight.blockerRows).map(renderBlockerRow).join('') || '<article class="route-blocker-row"><div class="route-blocker-copy"><strong>No route blocker rows returned.</strong></div></article>'}
      </section>
    `
  }

  function renderBlockerError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Route Blocker Preflight failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderBlockerPreflight(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderBlockerError(event.detail?.error || '')
  })
}())

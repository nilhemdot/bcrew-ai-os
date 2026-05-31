(function () {
  const root = document.getElementById('route-review-operator-packet')
  const headStats = document.getElementById('route-review-operator-packet-head-stats')

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

  function renderGroup(group = {}) {
    return `
      <article class="route-packet-group">
        <span>${escapeHtml(compactNumber(group.itemCount || 0))}</span>
        <strong>${escapeHtml(group.label || group.groupId || 'Review group')}</strong>
      </article>
    `
  }

  function renderPacketRow(item = {}) {
    return `
      <article class="route-packet-row">
        <div class="route-packet-rank">#${escapeHtml(compactNumber(item.rank || 0))}</div>
        <div class="route-packet-copy">
          <span>${escapeHtml(item.routeId || 'route')} · ${escapeHtml(statusCopy(item.groupId))} · ${escapeHtml(item.destinationTable || 'destination')}</span>
          <strong>${escapeHtml(item.title || item.routeId || 'Route review item')}</strong>
          <p>${escapeHtml(item.suggestedDecision || 'Review this route without mutation.')}</p>
          <small>${escapeHtml(item.mutationBoundary || 'Separate exact route-ID approval required before mutation.')}</small>
        </div>
      </article>
    `
  }

  function renderPacket(snapshot = {}) {
    if (!root) return
    const packet = snapshot.routeReviewOperatorPacket || {}
    const summary = packet.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.packetItemCount || 0))}</b> rows</span>
        <span><b>${escapeHtml(compactNumber(summary.exactRouteIdCount || 0))}</b> route IDs</span>
        <span><b>${escapeHtml(compactNumber(summary.routesMutatedByReadback || 0))}</b> mutated</span>
      `
    }

    if (!packet.ok) {
      root.innerHTML = `
        <article class="route-packet-empty blocked">
          <span>Fail closed</span>
          <h3>Route Review Operator Packet is not healthy</h3>
          <p>${escapeHtml(list(packet.failures).slice(0, 4).join(' · ') || 'No route packet payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="route-packet-summary">
        ${renderMetric('Packet Rows', summary.packetItemCount)}
        ${renderMetric('Owner', summary.ownerRequiredItems)}
        ${renderMetric('Sensitive', summary.sensitiveReviewItems)}
        ${renderMetric('Duplicate/Stale', summary.duplicateOrStaleItems)}
        ${renderMetric('Mutated', summary.routesMutatedByReadback)}
      </section>

      <section class="route-packet-boundary">
        <div>
          <span>Review-only route packet</span>
          <p>${escapeHtml(packet.plainEnglish || 'Prepares exact route IDs without approving, applying, rejecting, snoozing, rerouting, or sending.')}</p>
        </div>
      </section>

      <section class="route-packet-groups">
        ${list(packet.groups).map(renderGroup).join('') || '<article class="route-packet-group"><strong>No groups returned.</strong></article>'}
      </section>

      <section class="route-packet-list">
        ${list(packet.packetRows).map(renderPacketRow).join('') || '<article class="route-packet-row"><div class="route-packet-copy"><strong>No route review rows returned.</strong></div></article>'}
      </section>
    `
  }

  function renderPacketError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Route Review Operator Packet failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderPacket(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderPacketError(event.detail?.error || '')
  })
}())

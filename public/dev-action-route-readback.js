(function () {
  const root = document.getElementById('action-route-readback')
  const headStats = document.getElementById('action-route-head-stats')

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
    return text(value, 'needs source')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  function stateTone(value = '') {
    const normalized = text(value).toLowerCase()
    if (normalized.includes('ready_for_confirmed_internal_apply')) return 'ready'
    if (normalized.includes('operator_review')) return 'review'
    if (normalized.includes('blocked')) return 'blocked'
    if (normalized.includes('applied') || normalized.includes('resolved')) return 'applied'
    return 'review'
  }

  function reasonCopy(item = {}) {
    const reasons = [...list(item.hardBlocks), ...list(item.reviewReasons), ...list(item.riskReasons)]
    if (!reasons.length && item.wouldAllowConfirmedApply) return 'Separate confirmed apply eligible'
    if (!reasons.length) return 'No extra review reason returned'
    return reasons.slice(0, 3).map(statusCopy).join(' · ')
  }

  function renderMetric(label, value, tone = '') {
    return `
      <article class="action-route-metric ${escapeHtml(tone)}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(compactNumber(value))}</strong>
      </article>
    `
  }

  function renderDigestItem(item = {}) {
    return `
      <article class="action-route-review-item">
        <div>
          <span>${escapeHtml(statusCopy(item.reviewState || item.approvalStatus || 'review'))}</span>
          <strong>${escapeHtml(item.title || item.routeId || 'Action route')}</strong>
          <p>${escapeHtml(item.owner || 'Needs owner')} · ${escapeHtml(item.destinationLabel || item.type || 'Route')} · ${escapeHtml(item.ageDays === null || item.ageDays === undefined ? 'age unknown' : `${compactNumber(item.ageDays)}d old`)}</p>
        </div>
        <small>${escapeHtml(compactNumber(item.sourceRefCount || 0))} source refs · ${escapeHtml(compactNumber(item.evidenceRefCount || 0))} evidence refs</small>
      </article>
    `
  }

  function renderSafetyItem(item = {}) {
    return `
      <article class="action-route-safety-item ${escapeHtml(stateTone(item.safetyState))}">
        <div>
          <span>${escapeHtml(statusCopy(item.safetyState || 'review'))}</span>
          <strong>${escapeHtml(item.title || item.routeId || 'Route')}</strong>
          <p>${escapeHtml(reasonCopy(item))}</p>
        </div>
        <small>${escapeHtml(item.approvalStatus || 'missing')} · ${escapeHtml(item.destinationTable || 'destination missing')}</small>
      </article>
    `
  }

  function renderActionRouteReadback(snapshot = {}) {
    if (!root) return
    const readback = snapshot.actionRouteReadback || {}
    const summary = readback.summary || {}
    const digestItems = list(readback.harlanDigest?.items)
    const safetyItems = list(readback.applySafety?.items)

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.needsReviewItems || 0))}</b> waiting</span>
        <span><b>${escapeHtml(compactNumber(summary.readyForConfirmedApplyItems || 0))}</b> safe-review</span>
        <span><b>${escapeHtml(compactNumber(summary.appliedRoutes || 0))}</b> applied</span>
      `
    }

    if (!readback.ok) {
      root.innerHTML = `
        <article class="action-route-empty blocked">
          <span>Fail closed</span>
          <h3>Action-route readback is not healthy</h3>
          <p>${escapeHtml(list(readback.failures).slice(0, 4).join(' · ') || 'No readback payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="action-route-summary">
        ${renderMetric('Waiting review', summary.needsReviewItems || 0, summary.needsReviewItems ? 'review' : 'applied')}
        ${renderMetric('Ready for confirmed apply', summary.readyForConfirmedApplyItems || 0, 'ready')}
        ${renderMetric('Operator review', summary.operatorReviewRequiredItems || 0, 'review')}
        ${renderMetric('Blocked', summary.blockedItems || 0, summary.blockedItems ? 'blocked' : '')}
        ${renderMetric('Applied', summary.appliedRoutes || 0, 'applied')}
      </section>

      <section class="action-route-boundary">
        <div>
          <span>READBACK</span>
          <p>${escapeHtml(readback.plainEnglish || 'Action-route state is visible from Foundation.')}</p>
        </div>
        <div class="action-route-boundary-pills">
          <span>No auto-apply</span>
          <span>No Harlan send</span>
          <span>No route mutation</span>
        </div>
      </section>

      <section class="action-route-columns">
        <article class="action-route-column">
          <div class="action-route-column-head">
            <span>Harlan digest preview</span>
            <small>${escapeHtml(readback.harlanDigest?.textHash ? `hash ${readback.harlanDigest.textHash.slice(0, 8)}` : 'dry-run')}</small>
          </div>
          <pre>${escapeHtml(readback.harlanDigest?.messageText || 'No digest text returned.')}</pre>
          <div class="action-route-review-list">
            ${digestItems.map(renderDigestItem).join('') || '<article class="action-route-review-item"><strong>No route review items returned.</strong></article>'}
          </div>
        </article>

        <article class="action-route-column">
          <div class="action-route-column-head">
            <span>Apply safety</span>
            <small>${escapeHtml(readback.applySafety?.safetyHash ? `hash ${readback.applySafety.safetyHash.slice(0, 8)}` : 'preflight')}</small>
          </div>
          <p class="action-route-next">${escapeHtml(readback.applySafety?.nextHumanAction || 'Live apply remains parked.')}</p>
          <div class="action-route-safety-list">
            ${safetyItems.map(renderSafetyItem).join('') || '<article class="action-route-safety-item"><strong>No safety items returned.</strong></article>'}
          </div>
        </article>
      </section>
    `
  }

  function renderActionRouteError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Action-route readback failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderActionRouteReadback(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderActionRouteError(event.detail?.error || '')
  })
}())

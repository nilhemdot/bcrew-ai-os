(function () {
  const root = document.getElementById('scoper-evidence-trace')
  const headStats = document.getElementById('scoper-trace-head-stats')

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
    return text(value, 'missing')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  function shortId(value = '') {
    const normalized = text(value)
    if (!normalized) return 'missing'
    if (normalized.length <= 42) return normalized
    return `${normalized.slice(0, 20)}...${normalized.slice(-14)}`
  }

  function renderTracePill(label, ok) {
    return `<span class="${ok ? 'ok' : 'gap'}">${escapeHtml(label)}</span>`
  }

  function renderCandidate(candidate = {}) {
    const ready = candidate.readyForPortfolio === true
    const tone = ready ? 'ready' : candidate.scoperStatus === 'blocked_source_or_auth_boundary' ? 'blocked' : 'parked'
    return `
      <article class="scoper-trace-row ${escapeHtml(tone)}">
        <div class="scoper-trace-rank">${escapeHtml(compactNumber(candidate.rank || 0))}</div>
        <div class="scoper-trace-copy">
          <div class="scoper-trace-title-line">
            <strong>${escapeHtml(candidate.title || 'Build recommendation')}</strong>
            <span>${ready ? 'Ready for Portfolio review' : 'Parked'}</span>
          </div>
          <p>${escapeHtml(ready ? 'Raw source atom and hit are present.' : candidate.parkedReason || 'Needs more source trace before Scoper can call it ready.')}</p>
          <div class="scoper-trace-proof">
            ${renderTracePill('Director atom', Boolean(candidate.directorAtomId))}
            ${renderTracePill('Director hit', Boolean(candidate.directorHitId))}
            ${renderTracePill('Raw atom', Boolean(candidate.rawAtomId))}
            ${renderTracePill('Raw hit', Boolean(candidate.rawHitId))}
          </div>
        </div>
        <div class="scoper-trace-meta">
          <span>${escapeHtml(statusCopy(candidate.sourceTraceStatus))}</span>
          <span>${escapeHtml(statusCopy(candidate.scoperStatus))}</span>
          <span>${escapeHtml(candidate.portfolioDecision ? statusCopy(candidate.portfolioDecision) : 'No Portfolio decision')}</span>
          <small title="${escapeHtml(candidate.rawAtomId || '')}">${escapeHtml(shortId(candidate.rawAtomId))}</small>
          <small title="${escapeHtml(candidate.rawHitId || '')}">${escapeHtml(shortId(candidate.rawHitId))}</small>
        </div>
      </article>
    `
  }

  function renderScoperEvidenceTrace(snapshot = {}) {
    if (!root) return
    const readback = snapshot.scoperEvidenceTraceReadback || {}
    const summary = readback.summary || {}
    const candidates = list(readback.candidates)

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.readyForPortfolioCount || 0))}</b> ready</span>
        <span><b>${escapeHtml(compactNumber(summary.parkedCount || 0))}</b> parked</span>
        <span><b>${escapeHtml(compactNumber(summary.proposalOnlyCount || 0))}</b> proposal-only</span>
      `
    }

    if (!readback.ok) {
      root.innerHTML = `
        <article class="scoper-trace-empty blocked">
          <span>Fail closed</span>
          <h3>Scoper evidence trace is not healthy</h3>
          <p>${escapeHtml(list(readback.failures).slice(0, 4).join(' · ') || 'No Scoper trace payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="scoper-trace-summary">
        <article>
          <span>Reviewed</span>
          <strong>${escapeHtml(compactNumber(summary.reviewedCount || 0))}</strong>
        </article>
        <article>
          <span>Raw Trace Ready</span>
          <strong>${escapeHtml(compactNumber(summary.sourceTraceReadyCount || 0))}</strong>
        </article>
        <article>
          <span>Portfolio Ready</span>
          <strong>${escapeHtml(compactNumber(summary.readyForPortfolioCount || 0))}</strong>
        </article>
        <article>
          <span>Parked</span>
          <strong>${escapeHtml(compactNumber(summary.parkedCount || 0))}</strong>
        </article>
      </section>

      <section class="scoper-trace-boundary">
        <div>
          <span>Proposal-only</span>
          <p>${escapeHtml(readback.plainEnglish || 'Scoper trace is read-only and does not promote build cards.')}</p>
        </div>
        <div class="scoper-trace-boundary-pills">
          <span>Raw atom + hit required</span>
          <span>No auto-promotion</span>
          <span>No backlog write</span>
        </div>
      </section>

      <section class="scoper-trace-list">
        ${candidates.map(renderCandidate).join('') || '<article class="scoper-trace-empty"><strong>No candidates returned.</strong></article>'}
      </section>
    `
  }

  function renderScoperEvidenceTraceError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Scoper evidence trace failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderScoperEvidenceTrace(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderScoperEvidenceTraceError(event.detail?.error || '')
  })
}())

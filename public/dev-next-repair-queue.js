(function () {
  const root = document.getElementById('next-repair-queue')
  const headStats = document.getElementById('next-repair-head-stats')

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
    return String(value || 'proposal')
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

  function renderSignals(signals = []) {
    const rows = list(signals).slice(0, 4)
    if (!rows.length) return ''
    return `
      <ul>
        ${rows.map(signal => `<li>${escapeHtml(signal)}</li>`).join('')}
      </ul>
    `
  }

  function renderRepair(item = {}) {
    return `
      <article class="next-repair-card">
        <div class="next-repair-rank">#${escapeHtml(compactNumber(item.rank || 0))}</div>
        <div class="next-repair-copy">
          <span>${escapeHtml(statusCopy(item.suggestedCardType))} · ${escapeHtml(item.effort || 'M')} · ${escapeHtml(item.risk || 'medium')}</span>
          <strong>${escapeHtml(item.title || item.repairId || 'Repair proposal')}</strong>
          <p>${escapeHtml(item.problem || 'Pipeline repair proposal.')}</p>
          ${renderSignals(item.sourceSignals)}
          <small>${escapeHtml(item.operatorBoundary || 'Separate approval required before mutation.')}</small>
        </div>
      </article>
    `
  }

  function renderNextRepairQueue(snapshot = {}) {
    if (!root) return
    const queue = snapshot.nextRepairQueue || {}
    const summary = queue.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.proposedRepairCount || 0))}</b> proposed</span>
        <span><b>${escapeHtml(compactNumber(summary.approvalBoundCount || 0))}</b> approval-bound</span>
        <span><b>${escapeHtml(compactNumber(summary.cardsCreatedByReadback || 0))}</b> cards created</span>
      `
    }

    if (!queue.ok) {
      root.innerHTML = `
        <article class="next-repair-empty blocked">
          <span>Fail closed</span>
          <h3>Next Repair Queue is not healthy</h3>
          <p>${escapeHtml(list(queue.failures).slice(0, 4).join(' · ') || 'No repair queue payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="next-repair-summary">
        ${renderMetric('Proposals', summary.proposedRepairCount)}
        ${renderMetric('Approval Bound', summary.approvalBoundCount)}
        ${renderMetric('Internal Writes', summary.internalWriteRequiredCount)}
        ${renderMetric('Cards Created', summary.cardsCreatedByReadback)}
      </section>

      <section class="next-repair-boundary">
        <div>
          <span>Proposal-only repair queue</span>
          <p>${escapeHtml(queue.plainEnglish || 'Ranks next repairs without creating cards, promoting Scoper work, applying routes, or writing externally.')}</p>
        </div>
      </section>

      <section class="next-repair-list">
        ${list(queue.proposedRepairs).map(renderRepair).join('') || '<article class="next-repair-card"><div class="next-repair-copy"><strong>No repair proposals returned.</strong></div></article>'}
      </section>
    `
  }

  function renderNextRepairError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Next Repair Queue failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderNextRepairQueue(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderNextRepairError(event.detail?.error || '')
  })
}())

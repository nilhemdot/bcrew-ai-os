(function () {
  const root = document.getElementById('proposed-card-approval-preflight')
  const headStats = document.getElementById('proposed-card-approval-preflight-head-stats')

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

  function renderMetric(label, value) {
    return `
      <article>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(compactNumber(value))}</strong>
      </article>
    `
  }

  function renderRequired(fields = []) {
    const rows = list(fields).slice(0, 5)
    if (!rows.length) return ''
    return `<small>${rows.map(field => escapeHtml(field)).join(' · ')}</small>`
  }

  function renderRow(row = {}) {
    return `
      <article class="proposed-card-approval-row">
        <div class="proposed-card-approval-rank">#${escapeHtml(compactNumber(row.rank || 0))}</div>
        <div class="proposed-card-approval-copy">
          <span>${escapeHtml(row.proposedCardId || 'draft')} · ${escapeHtml(row.proposedPriority || 'P?')} · score ${escapeHtml(compactNumber(row.portfolioScore || 0))}</span>
          <strong>${escapeHtml(row.title || 'Proposed card approval')}</strong>
          <p>${escapeHtml(row.approvalPhrase || 'Exact Steve approval required before card creation.')}</p>
          <small>${escapeHtml(row.sourcePortfolioGroupId || 'portfolio group')} · ${escapeHtml(compactNumber(row.sourceLineageCount || 0))} source refs</small>
          ${renderRequired(row.requiredFields)}
          <small>${escapeHtml(row.status || 'approval_required')} · ${escapeHtml(row.proposedMutationAfterApproval || 'create only after approval')}</small>
        </div>
      </article>
    `
  }

  function renderPreflight(snapshot = {}) {
    if (!root) return
    const packet = snapshot.proposedCardApprovalPreflight || {}
    const summary = packet.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.approvalItemCount || 0))}</b> approvals</span>
        <span><b>${escapeHtml(compactNumber(summary.exactApprovalRequiredCount || 0))}</b> exact</span>
        <span><b>${escapeHtml(compactNumber(summary.cardsCreatedByReadback || 0))}</b> created</span>
      `
    }

    if (!packet.ok) {
      root.innerHTML = `
        <article class="proposed-card-approval-empty blocked">
          <span>Fail closed</span>
          <h3>Proposed Card Approval Preflight is not healthy</h3>
          <p>${escapeHtml(list(packet.failures).slice(0, 4).join(' · ') || 'No approval preflight payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="proposed-card-approval-summary">
        ${renderMetric('Approval Rows', summary.approvalItemCount)}
        ${renderMetric('Exact Approval', summary.exactApprovalRequiredCount)}
        ${renderMetric('Created', summary.cardsCreatedByReadback)}
        ${renderMetric('Builds', summary.buildAuthorizationsByReadback)}
      </section>

      <section class="proposed-card-approval-boundary">
        <div>
          <span>Approval preflight only</span>
          <p>${escapeHtml(packet.plainEnglish || 'Exact approval rows only; no card creation or build authorization happened.')}</p>
        </div>
      </section>

      <section class="proposed-card-approval-list">
        ${list(packet.approvalRows).map(renderRow).join('') || '<article class="proposed-card-approval-row"><div class="proposed-card-approval-copy"><strong>No approval rows returned.</strong></div></article>'}
      </section>
    `
  }

  function renderError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Proposed Card Approval Preflight failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderPreflight(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderError(event.detail?.error || '')
  })
}())

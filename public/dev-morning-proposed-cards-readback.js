(function () {
  const root = document.getElementById('morning-proposed-cards-readback')
  const headStats = document.getElementById('morning-proposed-cards-readback-head-stats')

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

  function renderCard(card = {}) {
    return `
      <article class="morning-card-proposal">
        <div class="morning-card-rank">#${escapeHtml(compactNumber(card.portfolioRank || 0))}</div>
        <div class="morning-card-copy">
          <span>${escapeHtml(card.proposedCardId || 'draft')} · ${escapeHtml(card.proposedPriority || 'P?')} · score ${escapeHtml(compactNumber(card.portfolioScore || 0))}</span>
          <strong>${escapeHtml(card.title || 'Draft proposed card')}</strong>
          <p>${escapeHtml(card.summary || 'Draft proposal only.')}</p>
          <small>${escapeHtml(card.sourcePortfolioGroupId || 'portfolio group')} · ${escapeHtml(compactNumber(card.sourceLineageCount || 0))} source refs</small>
          <small>${escapeHtml(card.approvalStatus || 'draft_requires_steve_approval')} · ${escapeHtml(card.proposedOwner || 'Dev Hub')}</small>
        </div>
      </article>
    `
  }

  function renderMorningCards(snapshot = {}) {
    if (!root) return
    const packet = snapshot.morningProposedCardsReadback || {}
    const summary = packet.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.proposedCardCount || 0))}</b> drafts</span>
        <span><b>${escapeHtml(compactNumber(summary.readyForSteveReviewCount || 0))}</b> review</span>
        <span><b>${escapeHtml(compactNumber(summary.createdCardsByReadback || 0))}</b> created</span>
      `
    }

    if (!packet.ok) {
      root.innerHTML = `
        <article class="morning-cards-empty blocked">
          <span>Fail closed</span>
          <h3>Morning Proposed Cards are not healthy</h3>
          <p>${escapeHtml(list(packet.failures).slice(0, 4).join(' · ') || 'No proposed-card payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="morning-cards-summary">
        ${renderMetric('Drafts', summary.proposedCardCount)}
        ${renderMetric('Review', summary.readyForSteveReviewCount)}
        ${renderMetric('Created', summary.createdCardsByReadback)}
        ${renderMetric('Builds', summary.buildAuthorizationsByReadback)}
      </section>

      <section class="morning-cards-boundary">
        <div>
          <span>Draft cards only</span>
          <p>${escapeHtml(packet.plainEnglish || 'Draft proposed cards only; no backlog or sprint writes were performed.')}</p>
        </div>
      </section>

      <section class="morning-cards-list">
        ${list(packet.proposedCards).map(renderCard).join('') || '<article class="morning-card-proposal"><div class="morning-card-copy"><strong>No proposed cards returned.</strong></div></article>'}
      </section>
    `
  }

  function renderError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Morning Proposed Cards failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderMorningCards(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderError(event.detail?.error || '')
  })
}())


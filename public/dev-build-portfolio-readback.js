(function () {
  const root = document.getElementById('build-portfolio-readback')
  const headStats = document.getElementById('build-portfolio-readback-head-stats')

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

  function label(value = '') {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  function renderMetric(name, value) {
    return `
      <article>
        <span>${escapeHtml(name)}</span>
        <strong>${escapeHtml(compactNumber(value))}</strong>
      </article>
    `
  }

  function renderGroup(group = {}) {
    return `
      <article class="build-portfolio-group ${escapeHtml(group.decision || 'proposal')}">
        <div class="build-portfolio-rank">#${escapeHtml(compactNumber(group.portfolioRank || 0))}</div>
        <div class="build-portfolio-copy">
          <span>${escapeHtml(label(group.decision || 'proposal'))} · ${escapeHtml(group.lane || 'general-aios')} · score ${escapeHtml(compactNumber(group.portfolioScore || 0))}</span>
          <strong>${escapeHtml(group.title || 'Portfolio group')}</strong>
          <p>${escapeHtml(group.reason || 'Proposal-only portfolio group.')}</p>
          <small>${escapeHtml(compactNumber(group.candidateCount || 0))} candidates · ${escapeHtml(compactNumber(group.sourceLineageCount || 0))} source refs</small>
          <small>${escapeHtml(group.promotionBoundary || 'Steve approval required before any promotion.')}</small>
        </div>
      </article>
    `
  }

  function renderCandidate(candidate = {}) {
    return `
      <article class="build-portfolio-candidate">
        <span>#${escapeHtml(compactNumber(candidate.rank || 0))} · ${escapeHtml(label(candidate.status || 'portfolio input'))}</span>
        <strong>${escapeHtml(candidate.title || candidate.candidateId || 'Candidate')}</strong>
        <small>${escapeHtml(candidate.rawAtomId || 'missing atom')} · ${escapeHtml(candidate.rawHitId || 'missing hit')}</small>
        <small>${escapeHtml(candidate.portfolioGroupId || 'parked')} · rank ${escapeHtml(compactNumber(candidate.portfolioRank || 0))}</small>
      </article>
    `
  }

  function renderPortfolio(snapshot = {}) {
    if (!root) return
    const portfolio = snapshot.buildPortfolioReadback || {}
    const summary = portfolio.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.portfolioGroupCount || 0))}</b> groups</span>
        <span><b>${escapeHtml(compactNumber(summary.mergedGroupCount || 0))}</b> merged</span>
        <span><b>${escapeHtml(compactNumber(summary.readyScopedCandidateCount || 0))}</b> ready</span>
      `
    }

    if (!portfolio.ok) {
      root.innerHTML = `
        <article class="build-portfolio-empty blocked">
          <span>Fail closed</span>
          <h3>Build Portfolio Readback is not healthy</h3>
          <p>${escapeHtml(list(portfolio.failures).slice(0, 4).join(' · ') || 'No portfolio payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="build-portfolio-summary">
        ${renderMetric('Groups', summary.portfolioGroupCount)}
        ${renderMetric('Merged', summary.mergedGroupCount)}
        ${renderMetric('Ready', summary.readyScopedCandidateCount)}
        ${renderMetric('Parked', summary.parkedForScoperCount)}
      </section>

      <section class="build-portfolio-boundary">
        <div>
          <span>Proposal-only portfolio</span>
          <p>${escapeHtml(portfolio.plainEnglish || 'Ranks merged build opportunities without promoting or building them.')}</p>
        </div>
      </section>

      <section class="build-portfolio-groups">
        ${list(portfolio.groups).map(renderGroup).join('') || '<article class="build-portfolio-group"><div class="build-portfolio-copy"><strong>No portfolio groups returned.</strong></div></article>'}
      </section>

      <section class="build-portfolio-candidates">
        ${list(portfolio.candidateRows).map(renderCandidate).join('') || '<article class="build-portfolio-candidate"><strong>No ready candidates returned.</strong></article>'}
      </section>
    `
  }

  function renderError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Build Portfolio Readback failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderPortfolio(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderError(event.detail?.error || '')
  })
}())


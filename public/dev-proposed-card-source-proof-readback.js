(function () {
  const root = document.getElementById('proposed-card-source-proof-readback')
  const headStats = document.getElementById('proposed-card-source-proof-readback-head-stats')

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

  function renderCandidates(candidates = []) {
    const rows = list(candidates).slice(0, 4)
    if (!rows.length) return ''
    return `
      <ul>
        ${rows.map(candidate => `
          <li>
            <b>${escapeHtml(candidate.title || candidate.candidateId || 'Candidate')}</b>
            <small>${escapeHtml(candidate.rawAtomId || 'atom?')} · ${escapeHtml(candidate.rawHitId || 'hit?')} · ${escapeHtml(candidate.sourceTraceStatus || 'trace?')}</small>
          </li>
        `).join('')}
      </ul>
    `
  }

  function renderRow(row = {}) {
    return `
      <article class="proposed-card-source-proof-row">
        <div class="proposed-card-source-proof-rank">#${escapeHtml(compactNumber(row.rank || 0))}</div>
        <div class="proposed-card-source-proof-copy">
          <span>${escapeHtml(row.proposedCardId || 'draft')} · ${escapeHtml(row.portfolioDecision || 'portfolio proof')} · score ${escapeHtml(compactNumber(row.portfolioScore || 0))}</span>
          <strong>${escapeHtml(row.title || 'Proposed card source proof')}</strong>
          <p>${escapeHtml(row.sourcePortfolioGroupId || 'Portfolio group missing')}</p>
          <small>${escapeHtml(compactNumber(row.candidateProofCount || 0))} candidates · ${escapeHtml(compactNumber(row.sourceLineageCount || 0))} source refs · ${escapeHtml(row.proofStatus || 'source_proof_ready')}</small>
          ${renderCandidates(row.candidateProofs)}
        </div>
      </article>
    `
  }

  function renderSourceProof(snapshot = {}) {
    if (!root) return
    const packet = snapshot.proposedCardSourceProofReadback || {}
    const summary = packet.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.proofItemCount || 0))}</b> proofs</span>
        <span><b>${escapeHtml(compactNumber(summary.candidateProofRowCount || 0))}</b> candidates</span>
        <span><b>${escapeHtml(compactNumber(summary.cardsCreatedByReadback || 0))}</b> created</span>
      `
    }

    if (!packet.ok) {
      root.innerHTML = `
        <article class="proposed-card-source-proof-empty blocked">
          <span>Fail closed</span>
          <h3>Proposed Card Source Proof is not healthy</h3>
          <p>${escapeHtml(list(packet.failures).slice(0, 4).join(' · ') || 'No source-proof payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="proposed-card-source-proof-summary">
        ${renderMetric('Proof Rows', summary.proofItemCount)}
        ${renderMetric('Candidate Proof', summary.candidateProofRowCount)}
        ${renderMetric('Lineage Refs', summary.sourceLineageRefCount)}
        ${renderMetric('Created', summary.cardsCreatedByReadback)}
      </section>

      <section class="proposed-card-source-proof-boundary">
        <div>
          <span>Source proof only</span>
          <p>${escapeHtml(packet.plainEnglish || 'Source proof rows only; no card creation or build authorization happened.')}</p>
        </div>
      </section>

      <section class="proposed-card-source-proof-list">
        ${list(packet.proofRows).map(renderRow).join('') || '<article class="proposed-card-source-proof-row"><div class="proposed-card-source-proof-copy"><strong>No source proof rows returned.</strong></div></article>'}
      </section>
    `
  }

  function renderError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Proposed Card Source Proof failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderSourceProof(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderError(event.detail?.error || '')
  })
}())

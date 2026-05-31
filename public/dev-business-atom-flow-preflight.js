(function () {
  const root = document.getElementById('business-atom-flow-preflight')
  const headStats = document.getElementById('business-atom-flow-preflight-head-stats')

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

  function renderGate(gate = {}) {
    return `
      <article class="atom-flow-gate ${escapeHtml(gate.status || 'ready')}">
        <span>${escapeHtml(statusCopy(gate.status))}</span>
        <strong>${escapeHtml(gate.label || gate.gateId || 'Gate')}</strong>
        <p>${escapeHtml(gate.detail || '')}</p>
      </article>
    `
  }

  function renderCandidate(candidate = {}) {
    return `
      <article class="atom-flow-candidate">
        <div class="atom-flow-rank">#${escapeHtml(compactNumber(candidate.rank || 0))}</div>
        <div class="atom-flow-copy">
          <span>${escapeHtml(candidate.sourceId || 'source')} · ${escapeHtml(statusCopy(candidate.businessStatus))} · ${escapeHtml(compactNumber(candidate.waitingRoutes || 0))} waiting routes</span>
          <strong>${escapeHtml(candidate.title || 'Business source')}</strong>
          <p>${escapeHtml(candidate.currentProblem || 'Atom flow needs repair preflight.')}</p>
          <small>${escapeHtml(candidate.operatorBoundary || 'Separate approval required before mutation.')}</small>
        </div>
      </article>
    `
  }

  function renderPreflight(snapshot = {}) {
    if (!root) return
    const preflight = snapshot.businessAtomFlowPreflight || {}
    const summary = preflight.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.candidateSourceCount || 0))}</b> candidates</span>
        <span><b>${escapeHtml(compactNumber(summary.readyForRepairCardCount || 0))}</b> ready</span>
        <span><b>${escapeHtml(compactNumber(summary.atomRowsWrittenByReadback || 0))}</b> atoms written</span>
      `
    }

    if (!preflight.ok) {
      root.innerHTML = `
        <article class="atom-flow-empty blocked">
          <span>Fail closed</span>
          <h3>Business atom-flow preflight is not healthy</h3>
          <p>${escapeHtml(list(preflight.failures).slice(0, 4).join(' · ') || 'No preflight payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="atom-flow-summary">
        ${renderMetric('Candidates', summary.candidateSourceCount)}
        ${renderMetric('Ready', summary.readyForRepairCardCount)}
        ${renderMetric('Approval Bound', summary.approvalBoundCandidateCount)}
        ${renderMetric('Atom Writes', summary.atomRowsWrittenByReadback)}
      </section>

      <section class="atom-flow-boundary">
        <div>
          <span>Read-only atom-flow repair preflight</span>
          <h3>${escapeHtml(summary.targetFamilyLabel || 'Business source')}</h3>
          <p>${escapeHtml(preflight.plainEnglish || 'Prepares source candidates without syncing, extracting, creating cards, or writing intelligence rows.')}</p>
        </div>
      </section>

      <section class="atom-flow-gates">
        ${list(preflight.repairGates).map(renderGate).join('') || '<article class="atom-flow-gate blocked"><strong>No gates returned.</strong></article>'}
      </section>

      <section class="atom-flow-candidates">
        ${list(preflight.candidates).map(renderCandidate).join('') || '<article class="atom-flow-candidate"><div class="atom-flow-copy"><strong>No candidate sources returned.</strong></div></article>'}
      </section>
    `
  }

  function renderPreflightError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Business atom-flow preflight failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderPreflight(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderPreflightError(event.detail?.error || '')
  })
}())

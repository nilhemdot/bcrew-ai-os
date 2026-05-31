(function () {
  const root = document.getElementById('sheets-atom-flow-blueprint')
  const headStats = document.getElementById('sheets-atom-flow-blueprint-head-stats')

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
      <article class="sheets-blueprint-gate ${escapeHtml(gate.status || 'ready')}">
        <span>${escapeHtml(statusCopy(gate.status))}</span>
        <strong>${escapeHtml(gate.label || gate.gateId || 'Gate')}</strong>
        <p>${escapeHtml(gate.detail || '')}</p>
      </article>
    `
  }

  function renderPhase(phase = {}) {
    return `
      <li>
        <span>${escapeHtml(statusCopy(phase.status))}</span>
        <strong>${escapeHtml(phase.label || phase.phaseId || 'Phase')}</strong>
      </li>
    `
  }

  function renderBlueprint(row = {}) {
    const contract = row.sourceContract || {}
    return `
      <article class="sheets-blueprint-row">
        <div class="sheets-blueprint-rank">#${escapeHtml(compactNumber(row.rank || 0))}</div>
        <div class="sheets-blueprint-copy">
          <span>${escapeHtml(row.sourceId || 'source')} · ${escapeHtml(contract.status || 'No contract')} · ${escapeHtml(compactNumber(row.waitingRoutes || 0))} waiting routes</span>
          <strong>${escapeHtml(row.title || contract.title || 'Sheets source')}</strong>
          <p>${escapeHtml(contract.owns || row.currentProblem || 'Source contract and atom-flow repair boundary are ready for review.')}</p>
          <small>${escapeHtml(contract.location || contract.unitName || row.operatorBoundary || '')}</small>
          <ul>${list(row.repairPhases).map(renderPhase).join('')}</ul>
        </div>
      </article>
    `
  }

  function renderBlueprintPanel(snapshot = {}) {
    if (!root) return
    const blueprint = snapshot.sheetsAtomFlowRepairBlueprint || {}
    const summary = blueprint.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.blueprintSourceCount || 0))}</b> sources</span>
        <span><b>${escapeHtml(compactNumber(summary.sourceContractMatchedCount || 0))}</b> contracts</span>
        <span><b>${escapeHtml(compactNumber(summary.atomRowsWrittenByReadback || 0))}</b> atoms written</span>
      `
    }

    if (!blueprint.ok) {
      root.innerHTML = `
        <article class="sheets-blueprint-empty blocked">
          <span>Fail closed</span>
          <h3>Sheets atom-flow blueprint is not healthy</h3>
          <p>${escapeHtml(list(blueprint.failures).slice(0, 4).join(' · ') || 'No blueprint payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="sheets-blueprint-summary">
        ${renderMetric('Sources', summary.blueprintSourceCount)}
        ${renderMetric('Contracts', summary.sourceContractMatchedCount)}
        ${renderMetric('Approval Bound', summary.approvalBoundBlueprintCount)}
        ${renderMetric('Sheet Reads', summary.sheetReadsStarted)}
      </section>

      <section class="sheets-blueprint-boundary">
        <div>
          <span>Sheets atom-flow repair blueprint</span>
          <h3>${escapeHtml(summary.targetFamilyLabel || 'Sheets / Owners')}</h3>
          <p>${escapeHtml(blueprint.plainEnglish || 'Blueprints exact source repair rows without reading sheets, creating cards, or writing intelligence rows.')}</p>
        </div>
      </section>

      <section class="sheets-blueprint-gates">
        ${list(blueprint.blueprintGates).map(renderGate).join('') || '<article class="sheets-blueprint-gate blocked"><strong>No gates returned.</strong></article>'}
      </section>

      <section class="sheets-blueprint-rows">
        ${list(blueprint.blueprintRows).map(renderBlueprint).join('') || '<article class="sheets-blueprint-row"><div class="sheets-blueprint-copy"><strong>No Sheets source blueprint rows returned.</strong></div></article>'}
      </section>
    `
  }

  function renderBlueprintError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Sheets atom-flow blueprint failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderBlueprintPanel(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderBlueprintError(event.detail?.error || '')
  })
}())

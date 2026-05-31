(function () {
  const root = document.getElementById('auditor-promotion-boundary-preflight')
  const headStats = document.getElementById('auditor-promotion-boundary-preflight-head-stats')
  if (!root) return

  function list(value) {
    return Array.isArray(value) ? value : []
  }

  function text(value, fallback = '') {
    const output = String(value ?? '').trim()
    return output || fallback
  }

  function escapeHtml(value = '') {
    return text(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function compactNumber(value = 0) {
    const number = Number(value || 0)
    if (!Number.isFinite(number)) return '0'
    if (number >= 1000) return `${Math.round(number / 100) / 10}K`
    return String(number)
  }

  function statusCopy(value = '') {
    return text(value, 'review')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  function renderMetric(label, value) {
    return `
      <article>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(compactNumber(value || 0))}</strong>
      </article>
    `
  }

  function renderList(title, items = []) {
    return `
      <article class="auditor-promotion-list">
        <span>${escapeHtml(title)}</span>
        <ul>
          ${list(items).slice(0, 4).map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>None listed.</li>'}
        </ul>
      </article>
    `
  }

  function renderLane(lane = {}) {
    return `
      <article class="auditor-promotion-lane">
        <span>${escapeHtml(statusCopy(lane.outputChannel || 'lane'))}</span>
        <strong>${escapeHtml(lane.title || lane.key || 'Auditor lane')}</strong>
        <p>${escapeHtml(lane.outputLandsIn || 'Review output before promotion.')}</p>
      </article>
    `
  }

  function renderContract(contract = {}) {
    return `
      <article class="auditor-promotion-contract">
        <div class="auditor-promotion-contract-main">
          <span>${escapeHtml(contract.status || 'approval_required')}</span>
          <strong>${escapeHtml(contract.title || contract.gateId || 'Audit promotion gate')}</strong>
          <p>${escapeHtml(contract.currentSignal || contract.operatorBoundary || '')}</p>
        </div>
        <dl>
          <div><dt>Gate</dt><dd>${escapeHtml(contract.gateId || '')}</dd></div>
          <div><dt>Posture</dt><dd>${escapeHtml(contract.mutationPosture || 'approval_required_internal_write_later')}</dd></div>
          <div><dt>Router</dt><dd>${escapeHtml(contract.existingRouterCardId || '')}</dd></div>
          <div><dt>Report lanes</dt><dd>${escapeHtml(compactNumber(contract.reportOnlyOutputCount || 0))}</dd></div>
        </dl>
        <section class="auditor-promotion-contract-grids">
          ${renderList('Allowed Later', contract.allowedWritesLaterOnlyAfterApproval)}
          ${renderList('Forbidden', contract.forbiddenWrites)}
        </section>
        <p class="auditor-promotion-boundary-copy">${escapeHtml(contract.operatorBoundary || '')}</p>
        <section class="auditor-promotion-lanes">
          ${list(contract.inputLanes).map(renderLane).join('') || '<article class="auditor-promotion-lane"><strong>No input lanes returned.</strong></article>'}
        </section>
      </article>
    `
  }

  function renderAuditorPromotionBoundary(snapshot = {}) {
    const readback = snapshot.auditorPromotionBoundaryPreflight || {}
    const summary = readback.summary || {}
    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.promotionContractCount || 0))}</b> contracts</span>
        <span><b>${escapeHtml(compactNumber(summary.reportOnlyOutputLanes || 0))}</b> report lanes</span>
        <span><b>${escapeHtml(compactNumber(summary.backlogRecordsWrittenByReadback || 0))}</b> backlog writes</span>
      `
    }

    if (!readback.ok) {
      root.innerHTML = `
        <article class="loading-card error">
          <h3>Auditor promotion boundary is not healthy</h3>
          <p>${escapeHtml(list(readback.failures).slice(0, 4).join(' · ') || 'No auditor promotion boundary payload returned.')}</p>
        </article>
      `
      return
    }

    const contracts = list(readback.promotionContracts)
    root.innerHTML = `
      <section class="auditor-promotion-summary">
        ${renderMetric('Contracts', summary.promotionContractCount)}
        ${renderMetric('Report Lanes', summary.reportOnlyOutputLanes)}
        ${renderMetric('Auto Promote', summary.autoFindingPromotionCount)}
        ${renderMetric('Backlog Writes', summary.backlogRecordsWrittenByReadback)}
      </section>

      <section class="auditor-promotion-boundary">
        <div>
          <span>${escapeHtml(readback.status || 'preflight')}</span>
          <p>${escapeHtml(readback.plainEnglish || 'Prepares an approval-required audit finding promotion boundary without mutating work.')}</p>
        </div>
      </section>

      <section class="auditor-promotion-contracts">
        ${contracts.map(renderContract).join('') || '<article class="auditor-promotion-empty"><strong>No promotion contract</strong><p>Either report-only auditor output is clear or no current promotion boundary proposal is ready.</p></article>'}
      </section>
    `
  }

  function renderAuditorPromotionBoundaryError(error = '') {
    root.innerHTML = `<article class="loading-card error">Auditor promotion boundary failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderAuditorPromotionBoundary(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderAuditorPromotionBoundaryError(event.detail?.error || '')
  })
})()

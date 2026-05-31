(function () {
  const root = document.getElementById('foundation-done-bar')
  const headStats = document.getElementById('foundation-done-head-stats')
  const stageLabels = {
    extracted: 'Extracted',
    atomized: 'Atomized',
    synthesized: 'Synthesized',
    routed: 'Routed',
    resolved: 'Resolved',
  }

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

  function percent(value, total) {
    const numerator = Number(value || 0)
    const denominator = Math.max(1, Number(total || 0))
    return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)))
  }

  function statusCopy(value = '') {
    return text(value, 'gap')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  function renderStage(stageKey, summary = {}) {
    const count = Number(summary.stageCounts?.[stageKey] || 0)
    const total = Number(summary.sourceCount || 0)
    const pct = percent(count, total)
    return `
      <article class="foundation-done-stage ${escapeHtml(stageKey)}">
        <div class="foundation-done-stage-top">
          <span>${escapeHtml(stageLabels[stageKey] || stageKey)}</span>
          <strong>${escapeHtml(compactNumber(count))}/${escapeHtml(compactNumber(total))}</strong>
        </div>
        <div class="foundation-done-track" aria-hidden="true">
          <span style="width: ${pct}%"></span>
        </div>
      </article>
    `
  }

  function renderGap(item = {}) {
    return `
      <article class="foundation-done-gap ${escapeHtml(item.tone || item.firstGap || 'gap')}">
        <div>
          <span>${escapeHtml(statusCopy(item.firstGap))}</span>
          <strong>${escapeHtml(item.title || item.sourceId || 'Source')}</strong>
          <p>${escapeHtml(item.detail || 'Pipeline gap visible.')}</p>
        </div>
        <small>${escapeHtml(compactNumber(item.waitingRoutes || 0))} waiting · ${escapeHtml(compactNumber(item.appliedRoutes || 0))} applied</small>
      </article>
    `
  }

  function renderSourceRow(row = {}) {
    const stages = row.pipelineStages || {}
    return `
      <article class="foundation-done-row ${escapeHtml(row.tone || 'gap')}">
        <div class="foundation-done-row-copy">
          <span>${escapeHtml(statusCopy(row.pipelineState || row.firstGap))}</span>
          <strong>${escapeHtml(row.title || row.sourceId || 'Source')}</strong>
          <p>${escapeHtml(row.detail || row.owner || row.group || 'Source pipeline state')}</p>
        </div>
        <div class="foundation-done-row-stages" aria-label="Pipeline stages">
          ${Object.keys(stageLabels).map(key => `
            <span class="${stages[key]?.ok ? 'ok' : 'gap'}" title="${escapeHtml(stageLabels[key])}">
              ${escapeHtml(stageLabels[key].slice(0, 1))}
            </span>
          `).join('')}
        </div>
      </article>
    `
  }

  function renderFoundationDoneBar(snapshot = {}) {
    if (!root) return
    const doneBar = snapshot.foundationDoneBar || {}
    const summary = doneBar.summary || {}
    const rows = list(doneBar.rows)
    const topGaps = list(doneBar.topGaps)
    const sourceCount = Number(summary.sourceCount || 0)

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.completeSources || 0))}</b> done</span>
        <span><b>${escapeHtml(compactNumber(summary.routedButUnresolvedSources || 0))}</b> routed-open</span>
        <span><b>${escapeHtml(compactNumber(summary.waitingRoutes || 0))}</b> waiting</span>
      `
    }

    if (!doneBar.ok) {
      root.innerHTML = `
        <article class="foundation-done-empty blocked">
          <span>Fail closed</span>
          <h3>Foundation Done bar is not healthy</h3>
          <p>${escapeHtml(list(doneBar.failures).slice(0, 4).join(' · ') || 'No pipeline payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="foundation-done-summary">
        ${list(doneBar.stageKeys).map(key => renderStage(key, summary)).join('')}
      </section>

      <section class="foundation-done-boundary">
        <div>
          <span>SOURCE PIPELINE</span>
          <p>${escapeHtml(doneBar.plainEnglish || 'Source pipeline truth is visible from Foundation.')}</p>
        </div>
        <div class="foundation-done-boundary-pills">
          <span>Source maturity truth</span>
          <span>Route pending is open</span>
          <span>Applied is resolved</span>
        </div>
      </section>

      <section class="foundation-done-columns">
        <article class="foundation-done-column">
          <div class="foundation-done-column-head">
            <span>Top gaps</span>
            <small>${escapeHtml(compactNumber(topGaps.length))} of ${escapeHtml(compactNumber(sourceCount))}</small>
          </div>
          <div class="foundation-done-gap-list">
            ${topGaps.map(renderGap).join('') || '<article class="foundation-done-gap done"><strong>No open pipeline gaps returned.</strong></article>'}
          </div>
        </article>

        <article class="foundation-done-column">
          <div class="foundation-done-column-head">
            <span>Source rows</span>
            <small>${escapeHtml(compactNumber(rows.length))} shown</small>
          </div>
          <div class="foundation-done-row-list">
            ${rows.slice(0, 12).map(renderSourceRow).join('') || '<article class="foundation-done-row"><strong>No source rows returned.</strong></article>'}
          </div>
        </article>
      </section>
    `
  }

  function renderFoundationDoneError(error = '') {
    if (!root) return
    root.innerHTML = `<article class="loading-card error">Foundation Done bar failed to load: ${escapeHtml(error || 'Unknown error')}</article>`
  }

  window.addEventListener('devhub:snapshot', event => {
    renderFoundationDoneBar(event.detail?.snapshot || {})
  })

  window.addEventListener('devhub:error', event => {
    renderFoundationDoneError(event.detail?.error || '')
  })
}())

function normalizeCheck(check = {}) {
  return {
    ok: check.ok === true,
    check: String(check.check || '').trim(),
    detail: String(check.detail || '').trim(),
  }
}

function formatCheckLine(check = {}) {
  const normalized = normalizeCheck(check)
  return `${normalized.ok ? 'PASS' : 'FAIL'} ${normalized.check}${normalized.detail ? ` -> ${normalized.detail}` : ''}`
}

export function buildFoundationVerifyCheckOutput(checks = [], { failuresOnly = false } = {}) {
  const normalizedChecks = (Array.isArray(checks) ? checks : []).map(normalizeCheck)
  return normalizedChecks
    .filter(check => failuresOnly ? !check.ok : true)
    .map(check => ({
      ok: check.ok,
      stream: check.ok ? 'stdout' : 'stderr',
      text: formatCheckLine(check),
    }))
}

export function buildFoundationVerifyJsonSummary(checks = [], { timingProfile = null } = {}) {
  const normalizedChecks = (Array.isArray(checks) ? checks : []).map(normalizeCheck)
  const failures = normalizedChecks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    totalChecks: normalizedChecks.length,
    passedChecks: normalizedChecks.length - failures.length,
    failedChecks: failures.length,
    failures,
    timingProfile,
  }
}

export function buildFoundationVerifyReporterDogfoodProof() {
  const syntheticChecks = [
    { ok: true, check: 'synthetic passing check', detail: 'should not appear in failures-only' },
    { ok: false, check: 'synthetic failing check', detail: 'expected blocker detail' },
  ]
  const defaultOutput = buildFoundationVerifyCheckOutput(syntheticChecks)
  const failuresOnlyOutput = buildFoundationVerifyCheckOutput(syntheticChecks, { failuresOnly: true })
  const jsonSummary = buildFoundationVerifyJsonSummary(syntheticChecks, {
    timingProfile: { totalMs: 12, sectionCount: 1 },
  })

  const defaultTexts = defaultOutput.map(line => line.text)
  const failuresOnlyTexts = failuresOnlyOutput.map(line => line.text)
  const ok =
    defaultTexts.some(line => line.includes('PASS synthetic passing check')) &&
    defaultTexts.some(line => line.includes('FAIL synthetic failing check')) &&
    failuresOnlyTexts.length === 1 &&
    failuresOnlyTexts[0].includes('FAIL synthetic failing check') &&
    !failuresOnlyTexts.some(line => line.includes('PASS synthetic passing check')) &&
    jsonSummary.ok === false &&
    jsonSummary.totalChecks === 2 &&
    jsonSummary.passedChecks === 1 &&
    jsonSummary.failedChecks === 1 &&
    jsonSummary.failures[0]?.check === 'synthetic failing check' &&
    jsonSummary.timingProfile?.sectionCount === 1

  return {
    ok,
    invariant: 'Failure-only output omits passing checks while JSON summary keeps totals and failing check detail.',
    defaultOutput,
    failuresOnlyOutput,
    jsonSummary,
  }
}

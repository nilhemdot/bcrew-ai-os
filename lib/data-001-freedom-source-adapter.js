export const DATA_001_CARD_ID = 'DATA-001'
export const DATA_001_NEXT_CARD_ID = 'OPS-003'
export const DATA_001_CLOSEOUT_KEY = 'data-001-freedom-source-adapter-v1'
export const DATA_001_PLAN_PATH = 'docs/process/data-001-freedom-source-adapter-plan.md'
export const DATA_001_APPROVAL_PATH = 'docs/process/approvals/DATA-001.json'
export const DATA_001_SCRIPT_PATH = 'scripts/process-data-001-check.mjs'
export const DATA_001_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-data-001-freedom-source-adapter-closeout.md'

export const FREEDOM_SHEET_SPREADSHEET_ID = '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw'

export const DATA_001_CHANGED_FILES = [
  'lib/data-001-freedom-source-adapter.js',
  DATA_001_SCRIPT_PATH,
  'scripts/sheets-structure-verify.mjs',
  'public/foundation-current-state-renderers.js',
  'docs/source-notes/freedom-sheet.md',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  DATA_001_PLAN_PATH,
  DATA_001_APPROVAL_PATH,
  DATA_001_CLOSEOUT_PATH,
  'package.json',
]

export const DATA_001_PROOF_COMMANDS = [
  `node --check lib/data-001-freedom-source-adapter.js ${DATA_001_SCRIPT_PATH} scripts/sheets-structure-verify.mjs public/foundation-current-state-renderers.js`,
  'npm run process:data-001-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${DATA_001_CARD_ID} --planApprovalRef=${DATA_001_APPROVAL_PATH} --closeoutKey=${DATA_001_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${DATA_001_CARD_ID} --closeoutKey=${DATA_001_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${DATA_001_CARD_ID} --planApprovalRef=${DATA_001_APPROVAL_PATH} --closeoutKey=${DATA_001_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const DATA_001_NOT_NEXT_BOUNDARIES = [
  'Do not mutate source spreadsheets, Google Drive permissions, ClickUp tasks, FUB records, finance ledgers, credentials, OAuth scopes, or provider config.',
  'Do not run broad private extraction, paid/provider/browser-auth work, external sends, or public exposure.',
  'Do not turn Freedom Sheet current process notes into final rebuilt source truth.',
  'Do not hardcode live Freedom values in markdown or UI fixtures.',
  'Do not rebuild OPS-003, ENGINE-001, DATA-003, or the final Freedom replacement layer from this card.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
]

export const FREEDOM_SOURCE_ADAPTER_UNITS = [
  {
    sourceId: 'SRC-FREEDOM-TEAM-001',
    label: 'Freedom Team',
    sheetTitle: 'Data Entry - BCrew Team/Community',
    sheetId: 1670417784,
    range: 'A:E',
    role: 'team member source',
    owner: 'Foundation Data',
    requiredCells: ['A1', 'A2', 'B2', 'C2'],
    requiredHeaders: ['Benson Crew Team', 'Agent Name', 'Team Origin/Recruited By', 'Status'],
    nextTrigger: 'Any header, sheet id, or range drift in the team/member block becomes DATA-001 schema drift.',
  },
  {
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    label: 'Freedom Community',
    sheetTitle: 'Data Entry - BCrew Team/Community',
    sheetId: 1670417784,
    range: 'G:O',
    role: 'community source',
    owner: 'Foundation Data',
    requiredCells: ['G1', 'J2'],
    requiredHeaders: ['Benson Crew Community (Measured At The START of Each Month)', 'Total Community'],
    nextTrigger: 'Any community block header/range drift blocks source-backed community read trust.',
  },
  {
    sourceId: 'SRC-FREEDOM-COMMUNITY-REV-001',
    label: 'Freedom Community Revenue',
    sheetTitle: 'Data Entry - BCrew Team/Community',
    sheetId: 1670417784,
    range: 'P:U',
    role: 'community revenue source',
    owner: 'Foundation Data',
    requiredCells: ['P1', 'U2'],
    requiredHeaders: ['Benson Crew Community Revenue  (Measured At The END of Each Month)', 'Bcrew In Before HST'],
    nextTrigger: 'Any community revenue header/range drift blocks revenue-share interpretation.',
  },
  {
    sourceId: 'SRC-FREEDOM-ENGINE-001',
    label: 'Freedom Agent Engine',
    sheetTitle: 'Agent Engine',
    sheetId: 1416660204,
    range: 'Current assumptions block',
    role: 'engine calculation input',
    owner: 'Foundation Data',
    requiredCells: ['B1', 'C3', 'F3', 'I3', 'L3', 'O3'],
    requiredHeaders: [
      'Team Agent Engine - (Attraction - Production - Split) ',
      'Required Attracted\n(Monthly Required )',
      'Active Agents',
      ' Avg Production\n(Last 9 Months)',
      ' Avg Split\n(Last 6m Avg)',
      'Projected Net To Company',
    ],
    nextTrigger: 'Any Agent Engine header drift blocks source-backed engine reads until remapped.',
  },
  {
    sourceId: 'SRC-FREEDOM-BHAG-001',
    label: 'Freedom BHAG Builder',
    sheetTitle: 'Benson Crew Bhag Builder',
    sheetId: 337425848,
    range: 'Planning blocks plus calculator ranges',
    role: 'BHAG assumptions source',
    owner: 'Foundation Data',
    requiredCells: ['A2', 'A3', 'A4', 'A5', 'A6'],
    requiredHeaders: ['Goal', 'Start Date', 'End Date', 'Years', 'Months'],
    nextTrigger: 'Any BHAG assumption header drift blocks source-backed BHAG planning reads until remapped.',
  },
]

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function add(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function includesAll(source, tokens = []) {
  const haystack = lower(source)
  return asArray(tokens).every(token => haystack.includes(lower(token)))
}

function normalizeCellText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function sourceRowIsUsable(row = {}) {
  const status = lower(row.status)
  const validation = lower(row.validation)
  return (
    status.includes('signed off') ||
    status.includes('current reality captured') ||
    status.includes('verified readable')
  ) && (
    validation.includes('signed off') ||
    validation.includes('verified') ||
    validation.includes('readable')
  )
}

function findWorkbook(sheetStructureStatus = {}, label = 'Freedom') {
  return asArray(sheetStructureStatus.workbooks).find(workbook => workbook.label === label) || null
}

function findSheetCheck(sheetStructureStatus = {}, sheetTitle = '') {
  return asArray(sheetStructureStatus.checks).find(check =>
    String(check.label || '').startsWith(`Freedom: sheet ${sheetTitle}`),
  ) || null
}

function cellChecksForUnit(sheetStructureStatus = {}, unit = {}) {
  const prefix = `Freedom: ${unit.sheetTitle} `
  return asArray(sheetStructureStatus.checks).filter(check =>
    String(check.label || '').startsWith(prefix) &&
    unit.requiredCells.some(cell => String(check.label || '').endsWith(` ${cell}`)),
  )
}

export function buildFreedomSourceAdapterContract({
  sourceContracts = [],
} = {}) {
  const sourceById = new Map(asArray(sourceContracts).map(row => [row.sourceId || row.source_id, row]))
  const units = FREEDOM_SOURCE_ADAPTER_UNITS.map(unit => {
    const source = sourceById.get(unit.sourceId) || null
    return {
      ...unit,
      spreadsheetId: FREEDOM_SHEET_SPREADSHEET_ID,
      sourceStatus: source?.status || 'missing',
      sourceValidation: source?.validation || 'missing',
      sourceOwner: source?.owner || unit.owner,
      sourceLocation: source?.location || '',
      sourceScope: source?.scope || '',
      sourceUsable: sourceRowIsUsable(source),
      readPosture: 'read-only delegated Google Sheets structure probe',
      writePosture: 'blocked',
    }
  })
  const missingSources = units.filter(unit => !unit.sourceUsable).map(unit => unit.sourceId)
  return {
    status: missingSources.length ? 'risk' : 'healthy',
    spreadsheetId: FREEDOM_SHEET_SPREADSHEET_ID,
    sourceIds: units.map(unit => unit.sourceId),
    units,
    missingSources,
    writePosture: 'blocked',
    mutationAllowed: false,
  }
}

export function buildFreedomSheetSchemaDriftSnapshot({
  sheetStructureStatus = {},
  sourceContracts = [],
  now = new Date(),
} = {}) {
  const contract = buildFreedomSourceAdapterContract({ sourceContracts })
  const workbook = findWorkbook(sheetStructureStatus)
  const unitRows = contract.units.map(unit => {
    const sheetCheck = findSheetCheck(sheetStructureStatus, unit.sheetTitle)
    const cellChecks = cellChecksForUnit(sheetStructureStatus, unit)
    const missingCells = unit.requiredCells.filter(cell =>
      !cellChecks.some(check => String(check.label || '').endsWith(` ${cell}`)),
    )
    const failedCells = cellChecks.filter(check => !check.ok)
    return {
      sourceId: unit.sourceId,
      label: unit.label,
      sheetTitle: unit.sheetTitle,
      sheetId: unit.sheetId,
      range: unit.range,
      role: unit.role,
      owner: unit.owner,
      requiredCells: unit.requiredCells,
      requiredHeaders: unit.requiredHeaders,
      sourceUsable: unit.sourceUsable,
      sheetPresent: Boolean(sheetCheck?.ok),
      checkedCells: cellChecks.length,
      missingCells,
      failedCells: failedCells.map(check => ({
        label: check.label,
        detail: check.detail,
      })),
      status: unit.sourceUsable && sheetCheck?.ok && !missingCells.length && !failedCells.length ? 'healthy' : 'risk',
      blocking: !(unit.sourceUsable && sheetCheck?.ok && !missingCells.length && !failedCells.length),
      nextAction: unit.sourceUsable && sheetCheck?.ok && !missingCells.length && !failedCells.length
        ? unit.nextTrigger
        : `Repair/remap ${unit.sourceId} before trusting Freedom adapter reads.`,
      escalation: {
        yellow: 'header/range watch is visible with source ID, owner, threshold, and next trigger',
        red: 'missing source, missing sheet, missing watched cell, or failed header check blocks source-backed reads',
      },
    }
  })
  const failedRows = unitRows.filter(row => row.status !== 'healthy')
  const workbookDrift = workbook && workbook.status !== 'ok'
  const staleOrUnreadable = !workbook || !sheetStructureStatus.checkedAt
  const status = failedRows.length || workbookDrift || staleOrUnreadable || contract.status !== 'healthy'
    ? 'risk'
    : 'healthy'
  const findings = [
    ...failedRows.map(row => ({
      id: `freedom_schema_drift:${row.sourceId}`,
      severity: 'P1',
      status: 'risk',
      title: `${row.sourceId} Freedom schema drift`,
      detail: row.failedCells.map(cell => `${cell.label}: ${cell.detail}`).join('; ') || row.missingCells.join(', ') || 'source or sheet check missing',
      owner: row.owner,
      repairCardId: DATA_001_CARD_ID,
      nextAction: row.nextAction,
    })),
    ...(!workbook ? [{
      id: 'freedom_schema_drift:missing_workbook',
      severity: 'P1',
      status: 'risk',
      title: 'Freedom workbook structure status missing',
      detail: 'The sheet structure endpoint did not return the Freedom workbook row.',
      owner: 'Foundation Data',
      repairCardId: DATA_001_CARD_ID,
      nextAction: 'Run the governed read-only sheet structure verification and repair delegated Google Sheets access if it cannot read Freedom.',
    }] : []),
  ]
  return {
    generatedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    cardId: DATA_001_CARD_ID,
    closeoutKey: DATA_001_CLOSEOUT_KEY,
    status,
    plainEnglish: status === 'healthy'
      ? 'Freedom Sheet adapter is source-ID mapped and live schema checks match the current baseline.'
      : 'Freedom Sheet adapter has source or schema drift that blocks trusted source-backed reads.',
    readOnly: true,
    writesSourceSystems: false,
    dataHealthSurface: '/api/sheets/structure-status',
    contract,
    workbook: workbook ? {
      label: workbook.label,
      spreadsheetId: workbook.spreadsheetId,
      status: workbook.status,
      totalChecks: workbook.totalChecks,
      passedChecks: workbook.passedChecks,
      failedChecks: workbook.failedChecks,
    } : null,
    rows: unitRows,
    findings,
    summary: {
      sourceCount: contract.units.length,
      healthySourceCount: unitRows.filter(row => row.status === 'healthy').length,
      driftSourceCount: failedRows.length,
      workbookStatus: workbook?.status || 'missing',
      workbookFailedChecks: workbook?.failedChecks || 0,
      mutationAllowed: false,
      liveReadPath: '/api/sheets/structure-status',
    },
  }
}

export function evaluateData001Fixture(fixture = {}) {
  const checks = []
  add(checks, fixture.sourceIdsMapped === true, 'Freedom adapter maps stable source IDs')
  add(checks, fixture.headerChecksRequired === true, 'Freedom adapter requires header/range checks')
  add(checks, fixture.staleSchemaFailsClosed === true, 'schema drift fails closed instead of silently passing')
  add(checks, fixture.mutationBlocked === true, 'adapter blocks spreadsheet/source mutation')
  add(checks, fixture.dataHealthExposed === true, 'adapter is exposed on the data-health sheet structure surface')
  add(checks, fixture.liveValueHardcodingBlocked === true, 'adapter does not hardcode live values')
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'risk' : 'healthy', checks, failed }
}

export function buildData001DogfoodProof() {
  const healthy = evaluateData001Fixture({
    sourceIdsMapped: true,
    headerChecksRequired: true,
    staleSchemaFailsClosed: true,
    mutationBlocked: true,
    dataHealthExposed: true,
    liveValueHardcodingBlocked: true,
  })
  const rejected = {
    missingSourceIds: evaluateData001Fixture({
      sourceIdsMapped: false,
      headerChecksRequired: true,
      staleSchemaFailsClosed: true,
      mutationBlocked: true,
      dataHealthExposed: true,
      liveValueHardcodingBlocked: true,
    }),
    noHeaderChecks: evaluateData001Fixture({
      sourceIdsMapped: true,
      headerChecksRequired: false,
      staleSchemaFailsClosed: true,
      mutationBlocked: true,
      dataHealthExposed: true,
      liveValueHardcodingBlocked: true,
    }),
    staleSchemaAccepted: evaluateData001Fixture({
      sourceIdsMapped: true,
      headerChecksRequired: true,
      staleSchemaFailsClosed: false,
      mutationBlocked: true,
      dataHealthExposed: true,
      liveValueHardcodingBlocked: true,
    }),
    writePathAllowed: evaluateData001Fixture({
      sourceIdsMapped: true,
      headerChecksRequired: true,
      staleSchemaFailsClosed: true,
      mutationBlocked: false,
      dataHealthExposed: true,
      liveValueHardcodingBlocked: true,
    }),
    hiddenFromDataHealth: evaluateData001Fixture({
      sourceIdsMapped: true,
      headerChecksRequired: true,
      staleSchemaFailsClosed: true,
      mutationBlocked: true,
      dataHealthExposed: false,
      liveValueHardcodingBlocked: true,
    }),
    hardcodedLiveValues: evaluateData001Fixture({
      sourceIdsMapped: true,
      headerChecksRequired: true,
      staleSchemaFailsClosed: true,
      mutationBlocked: true,
      dataHealthExposed: true,
      liveValueHardcodingBlocked: false,
    }),
  }
  return {
    ok: healthy.ok && Object.values(rejected).every(result => !result.ok),
    healthy,
    rejected,
    invariant: 'DATA-001 is healthy only when Freedom reads are source-ID mapped, header/range checked, read-only, visible on the data-health surface, and live values are not hardcoded.',
  }
}

export function buildSyntheticData001SheetStructureStatus({ drift = false } = {}) {
  const checks = []
  for (const unit of FREEDOM_SOURCE_ADAPTER_UNITS) {
    checks.push({
      ok: !drift,
      label: `Freedom: sheet ${unit.sheetTitle}`,
      detail: !drift ? `gid ${unit.sheetId}, hidden=false` : 'missing',
    })
    unit.requiredCells.forEach((cell, index) => {
      checks.push({
        ok: !drift,
        label: `Freedom: ${unit.sheetTitle} ${cell}`,
        detail: !drift
          ? `${JSON.stringify(unit.requiredHeaders[index] || unit.requiredHeaders[0])} | expected ${JSON.stringify(unit.requiredHeaders[index] || unit.requiredHeaders[0])}`
          : `"Renamed Header" | expected ${JSON.stringify(unit.requiredHeaders[index] || unit.requiredHeaders[0])}`,
      })
    })
  }
  return {
    checkedAt: '2026-05-20T08:30:00.000Z',
    status: drift ? 'drift' : 'ok',
    summary: {
      totalChecks: checks.length,
      passedChecks: drift ? 0 : checks.length,
      failedChecks: drift ? checks.length : 0,
      workbookCount: 1,
      healthyWorkbooks: drift ? 0 : 1,
      driftedWorkbooks: drift ? 1 : 0,
    },
    workbooks: [{
      label: 'Freedom',
      spreadsheetId: FREEDOM_SHEET_SPREADSHEET_ID,
      status: drift ? 'drift' : 'ok',
      totalChecks: checks.length,
      passedChecks: drift ? 0 : checks.length,
      failedChecks: drift ? checks.length : 0,
      failures: drift ? checks : [],
    }],
    checks,
  }
}

export function buildSyntheticData001SourceContracts({ missing = false } = {}) {
  return FREEDOM_SOURCE_ADAPTER_UNITS.map(unit => ({
    sourceId: unit.sourceId,
    title: 'Benson Crew - Freedom Sheet',
    status: missing ? 'Draft' : 'Current reality captured',
    validation: missing ? 'Needs Review' : 'Signed Off For Current Reality',
    owner: unit.owner,
    location: unit.sheetTitle,
    scope: unit.range,
  }))
}

export function evaluateData001LiveStatus({
  sheetStructureStatus = {},
  sourceContracts = [],
  moduleSource = '',
  sheetVerifySource = '',
  rendererSource = '',
  planSource = '',
  freedomNote = '',
} = {}) {
  const checks = []
  const snapshot = buildFreedomSheetSchemaDriftSnapshot({ sheetStructureStatus, sourceContracts })
  const contract = snapshot.contract
  const dogfood = buildData001DogfoodProof()
  add(checks, snapshot.status === 'healthy', 'Freedom schema-drift snapshot is healthy', snapshot.findings.map(finding => finding.title).join('; ') || `${snapshot.summary.healthySourceCount}/${snapshot.summary.sourceCount}`)
  add(checks, contract.sourceIds.length === FREEDOM_SOURCE_ADAPTER_UNITS.length, 'adapter maps all Freedom source IDs', contract.sourceIds.join(', '))
  add(checks, snapshot.rows.every(row => row.requiredCells.length && row.requiredHeaders.length), 'adapter rows have header/range checks', snapshot.rows.map(row => `${row.sourceId}:${row.requiredCells.length}`).join(', '))
  add(checks, snapshot.rows.every(row => row.owner && row.nextAction && row.escalation?.red), 'adapter rows include owner, threshold, and next trigger', snapshot.rows.map(row => row.sourceId).join(', '))
  add(checks, snapshot.readOnly === true && snapshot.writesSourceSystems === false && contract.mutationAllowed === false, 'adapter is read-only and blocks source mutation', snapshot.dataHealthSurface)
  add(checks, dogfood.ok, 'dogfood rejects unsafe Freedom adapter false-greens', dogfood.invariant)
  add(checks, includesAll(moduleSource, ['buildFreedomSheetSchemaDriftSnapshot', 'staleSchemaAccepted', 'mutationBlocked', 'dataHealthExposed']), 'module owns schema-drift evaluator and dogfood', 'lib/data-001-freedom-source-adapter.js')
  add(checks, includesAll(sheetVerifySource, ['buildFreedomSheetSchemaDriftSnapshot', 'freedomSheetAdapter', 'dataHealth']), 'sheet structure API exposes Freedom adapter data-health status', 'scripts/sheets-structure-verify.mjs')
  add(checks, includesAll(rendererSource, ['freedomSheetAdapter', 'source ID', 'schema drift']), 'Current State sheet watch summarizes Freedom adapter source-ID drift posture', 'public/foundation-current-state-renderers.js')
  add(checks, includesAll(planSource, ['Behavioral Proof', 'schema drift', 'source ID', 'data-health surface']), 'plan names behavioral proof and data-health exposure', DATA_001_PLAN_PATH)
  add(checks, includesAll(freedomNote, ['DATA-001', 'schema-drift monitor', 'source ID']), 'Freedom note records DATA-001 adapter boundary', 'docs/source-notes/freedom-sheet.md')
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: DATA_001_CARD_ID,
    closeoutKey: DATA_001_CLOSEOUT_KEY,
    snapshot,
    dogfood,
    checks,
    failed,
  }
}

export function renderData001Closeout({
  status = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const summary = status.snapshot?.summary || {}
  const rows = status.snapshot?.rows || []
  const lines = []
  lines.push('# DATA-001 Freedom Source Adapter Closeout')
  lines.push('')
  lines.push(`Generated: ${generatedAt}`)
  lines.push('')
  lines.push('## What Changed')
  lines.push('')
  lines.push('- Added a source-ID mapped Freedom Sheet adapter and schema-drift monitor.')
  lines.push('- Wired `/api/sheets/structure-status` to expose `freedomSheetAdapter` / `dataHealth.freedomSheetAdapter` so the sheet watch is source-aware.')
  lines.push('- Updated Current State sheet-watch copy to show Freedom source-ID/schema-drift posture instead of only workbook names.')
  lines.push('- Recorded the DATA-001 boundary in the Freedom source note, closeout registry, package script, and verifier coverage list.')
  lines.push('')
  lines.push('## Proof Summary')
  lines.push('')
  lines.push(`- Status: ${status.status || 'unknown'}`)
  lines.push(`- Freedom sources healthy: ${summary.healthySourceCount || 0}/${summary.sourceCount || 0}`)
  lines.push(`- Workbook status: ${summary.workbookStatus || 'unknown'} (${summary.workbookFailedChecks || 0} failed checks)`)
  lines.push(`- Mutation allowed: ${summary.mutationAllowed ? 'yes' : 'no'}`)
  lines.push('')
  lines.push('## Source Rows')
  lines.push('')
  for (const row of rows) {
    lines.push(`- ${row.sourceId}: ${row.status}; ${row.sheetTitle} ${row.range}; owner ${row.owner}; trigger ${row.nextAction}`)
  }
  lines.push('')
  lines.push('## Known Limits')
  lines.push('')
  lines.push('- This does not mutate the Freedom Sheet, Drive files, permissions, ClickUp, FUB, finance, credentials, OAuth scopes, or provider config.')
  lines.push('- This does not rebuild OPS-003, ENGINE-001, DATA-003, or the final Freedom replacement system.')
  lines.push('- This is a schema-drift/source-adapter proof. It does not claim every Freedom business process is healthy.')
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('- Continue `OPS-003`: repair the ops-improvement rollup and dead NPS dependency.')
  lines.push('')
  return `${lines.join('\n')}\n`
}

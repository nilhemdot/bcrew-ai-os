import { getSheetGridData, updateSheetValues } from './google-delegated.js'

export const OPS_003_CARD_ID = 'OPS-003'
export const OPS_003_NEXT_CARD_ID = 'ENGINE-001'
export const OPS_003_CLOSEOUT_KEY = 'ops-003-ops-improvement-rollup-v1'
export const OPS_003_PLAN_PATH = 'docs/process/ops-003-ops-improvement-rollup-plan.md'
export const OPS_003_APPROVAL_PATH = 'docs/process/approvals/OPS-003.json'
export const OPS_003_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-ops-003-ops-improvement-rollup-closeout.md'
export const OPS_003_SCRIPT_PATH = 'scripts/process-ops-003-check.mjs'
export const OPS_003_SPREADSHEET_ID = '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw'
export const OPS_003_GOOGLE_USER = 'service-account'

export const OPS_003_NOT_NEXT_BOUNDARIES = [
  'No Drive permission mutation.',
  'No ClickUp, FUB, finance, credential, OAuth, provider, or external send mutation.',
  'No broad Freedom rebuild or bonus-system redesign.',
  'No new dashboard surface beyond source-health/current-state wording already owned by this card.',
  'No paid/provider/browser-auth extraction work.',
]

export const OPS_003_PROOF_COMMANDS = [
  'node --check lib/ops-003-ops-improvement-rollup.js scripts/process-ops-003-check.mjs scripts/sheets-structure-verify.mjs public/foundation-current-state-renderers.js',
  'npm run process:ops-003-check -- --apply --json',
  'npm run process:ops-003-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=OPS-003 --planApprovalRef=docs/process/approvals/OPS-003.json --closeoutKey=ops-003-ops-improvement-rollup-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=OPS-003 --closeoutKey=ops-003-ops-improvement-rollup-v1',
  'npm run process:foundation-ship -- --card=OPS-003 --planApprovalRef=docs/process/approvals/OPS-003.json --closeoutKey=ops-003-ops-improvement-rollup-v1 --commitRef=HEAD',
]

export const OPS_003_CHANGED_FILES = [
  'lib/ops-003-ops-improvement-rollup.js',
  OPS_003_SCRIPT_PATH,
  'scripts/sheets-structure-verify.mjs',
  'public/foundation-current-state-renderers.js',
  'docs/source-notes/freedom-sheet.md',
  OPS_003_PLAN_PATH,
  OPS_003_APPROVAL_PATH,
  OPS_003_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

export const OPS_003_EXPECTED_FORMULAS = {
  opsSatisfactionF5: '=F3-F4',
  opsContK10: `=ARRAYFORMULA(
  MAP(A10:A,
    LAMBDA(m,
      IF(m="","",
        LET(
          s, SUMIFS(
               'ADMIN ONLY - Deal Data Entry'!$AI$3:$AI,
               'ADMIN ONLY - Deal Data Entry'!$G$3:$G, ">="&m,
               'ADMIN ONLY - Deal Data Entry'!$G$3:$G, "<"&EDATE(m,1)
             ),
          IF(s=0,"",s)
        )
      )
    )
  )
)`,
  opsContQ4: `=ARRAYFORMULA(
  IF(A4:A="","",
    MAP(A4:A,
      LAMBDA(m,
        LET(
          ms, EOMONTH(m,-1)+1,
          me, EOMONTH(m,0),
          rngA, 'Data Entry - Clients, Deals, NPS & GReviews'!$A$7:$A,
          rngN, 'Data Entry - Clients, Deals, NPS & GReviews'!$N$7:$N,
          rngO, 'Data Entry - Clients, Deals, NPS & GReviews'!$O$7:$O,
          IFERROR(
            AVERAGE(
              FILTER(
                VALUE(rngO),
                rngA>=ms,
                rngA<=me,
                REGEXMATCH(TO_TEXT(rngN), "(?i)^\\s*yes\\s*$"),
                REGEXMATCH(TO_TEXT(rngO), "^\\s*\\d+(?:\\.\\d+)?\\s*$")
              )
            ),
            ""
          )
        )
      )
    )
  )
)`,
}

const OPS_CONT_SHEET = 'Data Entry - Ops Cont Improvement'
const OPS_SATISFACTION_SHEET = 'Ops Satisfaction'
const DEAD_NPS_TAB = 'NPS Scores & Reviews'

const OPS_003_RANGES = [
  `'${OPS_CONT_SHEET}'!A1:X40`,
  `'${OPS_SATISFACTION_SHEET}'!A1:L6`,
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function normalizeFormula(value = '') {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/;+$/g, '')
    .toUpperCase()
}

function includesFormulaParts(formula = '', parts = []) {
  const text = String(formula || '')
  return parts.every(part => text.includes(part))
}

function columnLettersToIndex(letters = '') {
  let index = 0
  for (const ch of String(letters || '').toUpperCase()) index = index * 26 + (ch.charCodeAt(0) - 64)
  return index - 1
}

function parseA1(a1 = '') {
  const match = /^([A-Z]+)(\d+)$/i.exec(String(a1 || '').trim())
  if (!match) return null
  return {
    columnIndex: columnLettersToIndex(match[1]),
    rowIndex: Number(match[2]) - 1,
  }
}

function getCellFromSheet(sheet = {}, a1 = '') {
  const parsed = parseA1(a1)
  if (!parsed) return null
  const block = list(sheet.data)[0] || {}
  const startRow = block.startRow || 0
  const startColumn = block.startColumn || 0
  const row = parsed.rowIndex - startRow
  const column = parsed.columnIndex - startColumn
  return list(block.rowData)[row]?.values?.[column] || null
}

function cellSnapshot(sheet = {}, a1 = '') {
  const cell = getCellFromSheet(sheet, a1)
  return {
    a1,
    formattedValue: cell?.formattedValue ?? '',
    formula: cell?.userEnteredValue?.formulaValue ?? '',
    effectiveValue: cell?.effectiveValue || null,
  }
}

function collectFormulaCells(sheet = {}) {
  const sheetTitle = sheet.properties?.title || ''
  const formulas = []
  for (const block of list(sheet.data)) {
    const startRow = block.startRow || 0
    const startColumn = block.startColumn || 0
    list(block.rowData).forEach((row, rowOffset) => {
      list(row.values).forEach((cell, columnOffset) => {
        const formula = cell?.userEnteredValue?.formulaValue || ''
        if (!formula) return
        formulas.push({
          sheetTitle,
          rowIndex: startRow + rowOffset,
          columnIndex: startColumn + columnOffset,
          formula,
          formattedValue: cell?.formattedValue ?? '',
        })
      })
    })
  }
  return formulas
}

function readCell(cells = {}, key = '') {
  return cells[key] || { formula: '', formattedValue: '' }
}

function buildRepairList(snapshot = {}) {
  const cells = snapshot.cells || {}
  const repairs = []
  if (normalizeFormula(readCell(cells, 'Ops Satisfaction!F5').formula) !== normalizeFormula(OPS_003_EXPECTED_FORMULAS.opsSatisfactionF5)) {
    repairs.push({
      id: 'ops_satisfaction_agent_onboarding_gap_formula',
      range: `'${OPS_SATISFACTION_SHEET}'!F5`,
      values: [[OPS_003_EXPECTED_FORMULAS.opsSatisfactionF5]],
      reason: 'Agent-onboarding capture gap must subtract its own F4 target, not the signed-client D4 target.',
    })
  }

  const k10 = readCell(cells, 'Data Entry - Ops Cont Improvement!K10').formula
  if (
    k10.includes(DEAD_NPS_TAB) ||
    !includesFormulaParts(k10, ['ADMIN ONLY - Deal Data Entry', '$AI$3:$AI', '$G$3:$G', 'SUMIFS', 'EDATE(m,1)'])
  ) {
    repairs.push({
      id: 'ops_cont_deals_executed_dead_nps_dependency',
      range: `'${OPS_CONT_SHEET}'!K10`,
      values: [[OPS_003_EXPECTED_FORMULAS.opsContK10]],
      reason: 'Deals executed must roll up from the Owners-backed admin deal ledger instead of the removed NPS Scores & Reviews tab.',
    })
  }

  const q4 = readCell(cells, 'Data Entry - Ops Cont Improvement!Q4').formula
  if (
    q4.includes(DEAD_NPS_TAB) ||
    !includesFormulaParts(q4, ['Data Entry - Clients, Deals, NPS & GReviews', '$N$7:$N', '$O$7:$O', 'AVERAGE', 'FILTER'])
  ) {
    repairs.push({
      id: 'ops_cont_company_nps_score_source_formula',
      range: `'${OPS_CONT_SHEET}'!Q4`,
      values: [[OPS_003_EXPECTED_FORMULAS.opsContQ4]],
      reason: 'Company NPS score must average numeric NPS scores from the signed-off client/deal/NPS source rows.',
    })
  }
  return repairs
}

export async function readOps003LiveSnapshot({ fresh = true } = {}) {
  if (fresh) process.env.GOOGLE_SHEETS_CACHE_DISABLED = '1'
  const response = await getSheetGridData(
    OPS_003_GOOGLE_USER,
    OPS_003_SPREADSHEET_ID,
    OPS_003_RANGES,
    'sheets(properties(title),data(startRow,startColumn,rowData(values(formattedValue,userEnteredValue,effectiveValue))))',
  )
  const sheets = list(response.sheets)
  const opsCont = sheets.find(sheet => sheet.properties?.title === OPS_CONT_SHEET)
  const opsSatisfaction = sheets.find(sheet => sheet.properties?.title === OPS_SATISFACTION_SHEET)
  const formulas = sheets.flatMap(collectFormulaCells)
  const cells = {
    'Data Entry - Ops Cont Improvement!K10': cellSnapshot(opsCont, 'K10'),
    'Data Entry - Ops Cont Improvement!Q4': cellSnapshot(opsCont, 'Q4'),
    'Ops Satisfaction!C3': cellSnapshot(opsSatisfaction, 'C3'),
    'Ops Satisfaction!D3': cellSnapshot(opsSatisfaction, 'D3'),
    'Ops Satisfaction!E3': cellSnapshot(opsSatisfaction, 'E3'),
    'Ops Satisfaction!F3': cellSnapshot(opsSatisfaction, 'F3'),
    'Ops Satisfaction!J3': cellSnapshot(opsSatisfaction, 'J3'),
    'Ops Satisfaction!K3': cellSnapshot(opsSatisfaction, 'K3'),
    'Ops Satisfaction!L3': cellSnapshot(opsSatisfaction, 'L3'),
    'Ops Satisfaction!C5': cellSnapshot(opsSatisfaction, 'C5'),
    'Ops Satisfaction!D5': cellSnapshot(opsSatisfaction, 'D5'),
    'Ops Satisfaction!E5': cellSnapshot(opsSatisfaction, 'E5'),
    'Ops Satisfaction!F5': cellSnapshot(opsSatisfaction, 'F5'),
    'Ops Satisfaction!J5': cellSnapshot(opsSatisfaction, 'J5'),
    'Ops Satisfaction!K5': cellSnapshot(opsSatisfaction, 'K5'),
    'Ops Satisfaction!L5': cellSnapshot(opsSatisfaction, 'L5'),
  }
  const snapshot = {
    status: 'unknown',
    spreadsheetId: OPS_003_SPREADSHEET_ID,
    generatedAt: new Date().toISOString(),
    sheetsPresent: {
      opsCont: Boolean(opsCont),
      opsSatisfaction: Boolean(opsSatisfaction),
    },
    cells,
    formulas,
  }
  const repairs = buildRepairList(snapshot)
  return {
    ...snapshot,
    repairs,
    summary: {
      formulaCount: formulas.length,
      requiredRepairCount: repairs.length,
      deadNpsReferenceCount: formulas.filter(cell => String(cell.formula || '').includes(DEAD_NPS_TAB)).length,
    },
  }
}

export function evaluateOps003Snapshot(snapshot = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
  const cells = snapshot.cells || {}
  const formulas = list(snapshot.formulas)
  const deadNpsReferences = formulas.filter(cell => String(cell.formula || '').includes(DEAD_NPS_TAB))
  const repairs = buildRepairList(snapshot)

  add(snapshot.sheetsPresent?.opsCont === true, 'Data Entry - Ops Cont Improvement sheet is readable', OPS_CONT_SHEET)
  add(snapshot.sheetsPresent?.opsSatisfaction === true, 'Ops Satisfaction sheet is readable', OPS_SATISFACTION_SHEET)
  add(deadNpsReferences.length === 0, 'dead NPS Scores & Reviews formulas are gone', `${deadNpsReferences.length} references`)
  add(
    includesFormulaParts(readCell(cells, 'Data Entry - Ops Cont Improvement!K10').formula, ['ADMIN ONLY - Deal Data Entry', '$AI$3:$AI', '$G$3:$G', 'SUMIFS', 'EDATE(m,1)']),
    'Deals Executed K10 uses Owners-backed admin deal ledger formula',
    readCell(cells, 'Data Entry - Ops Cont Improvement!K10').formula || 'missing',
  )
  add(
    includesFormulaParts(readCell(cells, 'Data Entry - Ops Cont Improvement!Q4').formula, ['Data Entry - Clients, Deals, NPS & GReviews', '$N$7:$N', '$O$7:$O', 'AVERAGE', 'FILTER']),
    'Company NPS Q4 uses live client/deal/NPS rows',
    readCell(cells, 'Data Entry - Ops Cont Improvement!Q4').formula || 'missing',
  )

  const actualCells = [
    ['Ops Satisfaction!C3', 'Col2'],
    ['Ops Satisfaction!D3', 'Col8'],
    ['Ops Satisfaction!E3', 'Col13'],
    ['Ops Satisfaction!F3', 'Col23'],
    ['Ops Satisfaction!J3', 'Col7'],
    ['Ops Satisfaction!K3', 'Col16'],
    ['Ops Satisfaction!L3', 'Col21'],
  ]
  for (const [cellKey, columnRef] of actualCells) {
    const formula = readCell(cells, cellKey).formula
    add(
      includesFormulaParts(formula, ['QUERY', `select ${columnRef}`, `where Col`, 'is not null', 'order by Col1 desc', 'limit 1']),
      `${cellKey} latest-row formula ignores blank scaffold rows`,
      formula || 'missing',
    )
    const value = readCell(cells, cellKey).formattedValue
    add(!['#REF!', '#N/A', '#VALUE!'].includes(String(value || '').trim()), `${cellKey} does not render a sheet error`, value || 'blank')
  }

  const gapExpectations = {
    'Ops Satisfaction!C5': '=C3-C4',
    'Ops Satisfaction!D5': '=D3-D4',
    'Ops Satisfaction!E5': '=E3-E4',
    'Ops Satisfaction!F5': '=F3-F4',
    'Ops Satisfaction!J5': '=J3-$J$4',
    'Ops Satisfaction!K5': '=K3-$J$4',
    'Ops Satisfaction!L5': '=L3-$J$4',
  }
  for (const [cellKey, expected] of Object.entries(gapExpectations)) {
    add(
      normalizeFormula(readCell(cells, cellKey).formula) === normalizeFormula(expected),
      `${cellKey} gap formula uses its intended target`,
      readCell(cells, cellKey).formula || 'missing',
    )
  }

  add(repairs.length === 0, 'no OPS-003 sheet repairs remain', repairs.map(repair => repair.id).join(', ') || 'none')
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    checks,
    failed,
    repairs,
    summary: {
      checks: checks.length,
      failed: failed.length,
      deadNpsReferenceCount: deadNpsReferences.length,
      requiredRepairCount: repairs.length,
    },
  }
}

export async function applyOps003SheetRepairs(snapshot = {}) {
  const repairs = buildRepairList(snapshot)
  const applied = []
  for (const repair of repairs) {
    await updateSheetValues(OPS_003_GOOGLE_USER, OPS_003_SPREADSHEET_ID, repair.range, repair.values, 'USER_ENTERED')
    applied.push({
      id: repair.id,
      range: repair.range,
      reason: repair.reason,
    })
  }
  return {
    applied,
    appliedCount: applied.length,
  }
}

export function buildSyntheticOps003Proof() {
  const good = {
    sheetsPresent: { opsCont: true, opsSatisfaction: true },
    cells: {
      'Data Entry - Ops Cont Improvement!K10': { formula: OPS_003_EXPECTED_FORMULAS.opsContK10 },
      'Data Entry - Ops Cont Improvement!Q4': { formula: OPS_003_EXPECTED_FORMULAS.opsContQ4 },
      'Ops Satisfaction!C3': { formula: '=INDEX(QUERY({rollup},"select Col2 where Col1 is not null and Col2 is not null order by Col1 desc limit 1",0),1,1)', formattedValue: '8.8' },
      'Ops Satisfaction!D3': { formula: '=INDEX(QUERY({rollup},"select Col8 where Col1 is not null and Col8 is not null order by Col1 desc limit 1",0),1,1)', formattedValue: '75%' },
      'Ops Satisfaction!E3': { formula: '=INDEX(QUERY({rollup},"select Col13 where Col1 is not null and Col13 is not null order by Col1 desc limit 1",0),1,1)', formattedValue: '80%' },
      'Ops Satisfaction!F3': { formula: '=INDEX(QUERY({rollup},"select Col23 where Col1 is not null and Col23 is not null order by Col1 desc limit 1",0),1,1)', formattedValue: '85%' },
      'Ops Satisfaction!J3': { formula: '=INDEX(QUERY({rollup},"select Col7 where Col1 is not null and Col7 is not null order by Col1 desc limit 1",0),1,1)', formattedValue: '9' },
      'Ops Satisfaction!K3': { formula: '=INDEX(QUERY({rollup},"select Col16 where Col1 is not null and Col16 is not null order by Col1 desc limit 1",0),1,1)', formattedValue: '10' },
      'Ops Satisfaction!L3': { formula: '=INDEX(QUERY({rollup},"select Col21 where Col1 is not null and Col21 is not null order by Col1 desc limit 1",0),1,1)', formattedValue: '9' },
      'Ops Satisfaction!C5': { formula: '=C3-C4' },
      'Ops Satisfaction!D5': { formula: '=D3-D4' },
      'Ops Satisfaction!E5': { formula: '=E3-E4' },
      'Ops Satisfaction!F5': { formula: '=F3-F4' },
      'Ops Satisfaction!J5': { formula: '=J3-$J$4' },
      'Ops Satisfaction!K5': { formula: '=K3-$J$4' },
      'Ops Satisfaction!L5': { formula: '=L3-$J$4' },
    },
    formulas: [],
  }
  good.formulas = Object.entries(good.cells)
    .filter(([, cell]) => cell.formula)
    .map(([key, cell]) => ({ sheetTitle: key.split('!')[0], formula: cell.formula }))

  const deadReference = structuredClone(good)
  deadReference.cells['Data Entry - Ops Cont Improvement!K10'].formula = `=QUERY('NPS Scores & Reviews'!A:Z,"select *")`
  deadReference.formulas.push({ sheetTitle: OPS_CONT_SHEET, formula: `='NPS Scores & Reviews'!A1` })

  const wrongGap = structuredClone(good)
  wrongGap.cells['Ops Satisfaction!F5'].formula = '=F3-D4'

  const weakLatest = structuredClone(good)
  weakLatest.cells['Ops Satisfaction!E3'].formula = '=INDEX(QUERY({rollup},"select Col13 order by Col1 desc limit 1",0),1,1)'

  const goodEval = evaluateOps003Snapshot(good)
  const deadEval = evaluateOps003Snapshot(deadReference)
  const gapEval = evaluateOps003Snapshot(wrongGap)
  const latestEval = evaluateOps003Snapshot(weakLatest)
  return {
    ok: goodEval.ok && !deadEval.ok && !gapEval.ok && !latestEval.ok,
    invariant: 'OPS-003 dogfood accepts repaired rollup formulas and rejects dead NPS references, wrong gap targets, and latest-row formulas that can select scaffold rows.',
    good: { ok: goodEval.ok },
    deadReference: { ok: deadEval.ok, failed: deadEval.failed.map(check => check.check) },
    wrongGap: { ok: gapEval.ok, failed: gapEval.failed.map(check => check.check) },
    weakLatest: { ok: latestEval.ok, failed: latestEval.failed.map(check => check.check) },
  }
}

export function renderOps003Closeout({ live = {}, evaluation = {}, applyResult = {}, generatedAt = new Date().toISOString() } = {}) {
  const lines = []
  lines.push('# OPS-003 Ops Improvement Rollup Closeout')
  lines.push('')
  lines.push(`Card: \`${OPS_003_CARD_ID}\``)
  lines.push(`Closeout key: \`${OPS_003_CLOSEOUT_KEY}\``)
  lines.push(`Generated: ${generatedAt}`)
  lines.push('')
  lines.push('## What Changed')
  lines.push('')
  lines.push('- Added a governed OPS-003 rollup proof for the Freedom `Data Entry - Ops Cont Improvement` and `Ops Satisfaction` chain.')
  lines.push('- Repaired the live `Ops Satisfaction!F5` target formula when needed so agent-onboarding capture gap subtracts its own target.')
  lines.push('- Proved the removed `NPS Scores & Reviews` dependency is absent from watched formulas.')
  lines.push('- Proved the monthly dashboard actuals use latest nonblank month-row queries instead of blindly trusting scaffold rows.')
  lines.push('')
  lines.push('## Proof Summary')
  lines.push('')
  lines.push(`- Live status: \`${evaluation.status || 'unknown'}\``)
  lines.push(`- Failed checks: ${evaluation.summary?.failed ?? 'unknown'}`)
  lines.push(`- Dead NPS references: ${evaluation.summary?.deadNpsReferenceCount ?? live.summary?.deadNpsReferenceCount ?? 'unknown'}`)
  lines.push(`- Sheet repairs applied: ${applyResult.appliedCount ?? 0}`)
  for (const repair of applyResult.applied || []) lines.push(`  - ${repair.range}: ${repair.reason}`)
  lines.push('')
  lines.push('## Not Next')
  lines.push('')
  for (const boundary of OPS_003_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push(`Continue \`${OPS_003_NEXT_CARD_ID}\`.`)
  lines.push('')
  return `${lines.join('\n')}\n`
}

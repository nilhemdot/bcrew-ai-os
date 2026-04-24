#!/usr/bin/env node

import {
  GOOGLE_SCOPES,
  batchUpdateSheetValues,
  clearSheetValues,
  getSheetGridData,
  getSheetValues,
  googleJsonFetch,
} from '../lib/google-delegated.js'

const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const SOURCE_LISTS_SHEET_ID = '1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE'
const OWNER_ADMIN_GID = 533201019

const APPLY = process.argv.includes('--apply')
const USER = 'service-account'
const NO_EXTRA_LEAD_SOURCE = 'No Extra Lead Source'
const QUARANTINE_SOURCE = '<unspecified>'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function flattenColumn(response) {
  return (response.values || [])
    .map(row => String(row?.[0] ?? '').trim())
    .filter(Boolean)
}

function unique(values) {
  const seen = new Set()
  const out = []
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

function buildGovernedLeadSources(values) {
  const raw = unique(values).filter(value => value !== 'Lead Sources' && value !== 'Total List')
  const body = raw.filter(value => value !== QUARANTINE_SOURCE && value !== NO_EXTRA_LEAD_SOURCE)
  return [QUARANTINE_SOURCE, NO_EXTRA_LEAD_SOURCE, ...body]
}

function validationRequest(columnIndex, formula) {
  return {
    setDataValidation: {
      range: {
        sheetId: OWNER_ADMIN_GID,
        startRowIndex: 2,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_RANGE',
          values: [{ userEnteredValue: formula }],
        },
        inputMessage: '',
        strict: true,
        showCustomUi: true,
      },
    },
  }
}

async function setOwnerAdminValidations() {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(OWNERS_SHEET_ID)}` +
    ':batchUpdate'

  return googleJsonFetch(USER, url, {
    method: 'POST',
    scopes: [GOOGLE_SCOPES.sheets],
    body: {
      requests: [
        validationRequest(13, '=Lists!$J$3:$J'), // N: Lead Source
        validationRequest(15, '=Lists!$J$3:$J'), // P: Ground Zero
        validationRequest(18, '=Lists!$AA$2:$AA'), // S: Realtor
      ],
    },
  })
}

function getCell(sheet, dataIndex, rowOffset, columnOffset) {
  const block = sheet?.data?.[dataIndex]
  return block?.rowData?.[rowOffset]?.values?.[columnOffset] ?? null
}

async function verifyRepair() {
  const [ownerGrid, ownerJ, ownerRoster] = await Promise.all([
    getSheetGridData(
      USER,
      OWNERS_SHEET_ID,
      [
        "'Lists'!A1:AB5",
        "'ADMIN ONLY - Deal Data Entry'!N3:N3",
        "'ADMIN ONLY - Deal Data Entry'!P3:P3",
        "'ADMIN ONLY - Deal Data Entry'!S3:S3",
      ],
      'sheets(properties(title),data(startRow,startColumn,rowData(values(formattedValue,userEnteredValue,dataValidation))))',
    ),
    getSheetValues(USER, OWNERS_SHEET_ID, "'Lists'!J1:J8"),
    getSheetValues(USER, OWNERS_SHEET_ID, "'Lists'!AA1:AB4"),
  ])

  const listsSheet = ownerGrid.sheets?.find(sheet => sheet.properties?.title === 'Lists')
  const adminSheet = ownerGrid.sheets?.find(sheet => sheet.properties?.title === 'ADMIN ONLY - Deal Data Entry')
  const formula = getCell(listsSheet, 0, 0, 0)?.userEnteredValue?.formulaValue || ''
  const a1Value = getCell(listsSheet, 0, 0, 0)?.formattedValue || ''
  const validations = (adminSheet?.data || []).map(block => {
    const cell = block?.rowData?.[0]?.values?.[0]
    return cell?.dataValidation?.condition?.values?.[0]?.userEnteredValue || ''
  })

  const leadSourceValues = flattenColumn(ownerJ)
  const rosterValues = ownerRoster.values || []

  return {
    importedFormulaOk: formula.includes('IMPORTRANGE') && formula.includes(SOURCE_LISTS_SHEET_ID),
    importedValueOk: a1Value !== '#REF!',
    leadSourceOk:
      leadSourceValues.includes(QUARANTINE_SOURCE) &&
      leadSourceValues.includes(NO_EXTRA_LEAD_SOURCE),
    rosterOk: rosterValues?.[0]?.[0] === 'User' && rosterValues?.[0]?.[1] === 'Email',
    validations,
    validationOk:
      validations[0] === '=Lists!$J$3:$J' &&
      validations[1] === '=Lists!$J$3:$J' &&
      validations[2] === '=Lists!$AA$2:$AA',
    leadSourcePreview: leadSourceValues.slice(0, 8),
    rosterPreview: rosterValues.slice(0, 4),
  }
}

function isVerified(verification) {
  return (
    verification.importedFormulaOk &&
    verification.importedValueOk &&
    verification.leadSourceOk &&
    verification.rosterOk &&
    verification.validationOk
  )
}

async function main() {
  const [ownerGovernedSourceRes, sourceLeadSourceRes] = await Promise.all([
    getSheetValues(USER, OWNERS_SHEET_ID, "'Lists'!J3:J120"),
    getSheetValues(USER, SOURCE_LISTS_SHEET_ID, "'Lists'!J1:J120"),
  ])

  const ownerGovernedSources = flattenColumn(ownerGovernedSourceRes)
  const existingSourceSources = flattenColumn(sourceLeadSourceRes)
  const sourceValues = ownerGovernedSources.length >= 10 ? ownerGovernedSources : existingSourceSources
  const governedLeadSources = buildGovernedLeadSources(sourceValues)
  const rows = governedLeadSources.map(value => [value])

  console.log(`mode=${APPLY ? 'apply' : 'dry-run'}`)
  console.log(`governedLeadSources=${governedLeadSources.length}`)
  console.log(`first=${governedLeadSources.slice(0, 8).join(' | ')}`)
  console.log(`last=${governedLeadSources.slice(-5).join(' | ')}`)

  if (!APPLY) {
    console.log('dry-run only. Re-run with --apply to repair the source list, validations, and import blockers.')
    return
  }

  await clearSheetValues(USER, SOURCE_LISTS_SHEET_ID, "'Lists'!J3:J160")
  await batchUpdateSheetValues(USER, SOURCE_LISTS_SHEET_ID, [
    {
      range: `'Lists'!J3:J${rows.length + 2}`,
      values: rows,
    },
  ])

  await setOwnerAdminValidations()

  await clearSheetValues(USER, OWNERS_SHEET_ID, "'Lists'!J3:J160", {
    allowImportedRangeWrite: true,
  })
  await clearSheetValues(USER, OWNERS_SHEET_ID, "'Lists'!AA1:AB500", {
    allowImportedRangeWrite: true,
  })

  let verification = null
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    await sleep(3000)
    verification = await verifyRepair()
    if (isVerified(verification)) break
  }
  console.log(JSON.stringify(verification, null, 2))

  if (!isVerified(verification)) {
    throw new Error('Owners Dashboard Lists repair did not verify cleanly.')
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

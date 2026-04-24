#!/usr/bin/env node

import { getSheetGridData } from '../lib/google-delegated.js';

const SPREADSHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk';
const USER = 'service-account';

const args = process.argv.slice(2);
const arg = name => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
};

const hasFlag = name => args.includes(name);

function colToLetter(index) {
  let value = index + 1;
  let out = '';
  while (value > 0) {
    const rem = (value - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    value = Math.floor((value - 1) / 26);
  }
  return out;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function getCell(rowData, colIndex) {
  return rowData?.values?.[colIndex] ?? null;
}

function getDisplay(cell) {
  return cell?.formattedValue ?? '';
}

function getFormula(cell) {
  return cell?.userEnteredValue?.formulaValue ?? null;
}

function getNote(cell) {
  return cell?.note ?? null;
}

function getSheetSchema(sheetTitle) {
  const defaultSchema = {
    categoryId: 2,
    category: 3,
    subcategory: 4,
    detail: 5,
    tags: 6,
    catkey: 7,
    type: 8,
    activeStart: 28,
    activeEnd: 196,
  };

  const schemas = {
    '(Input) Weekly Actuals': defaultSchema,
    'Monthly Budget': {
      categoryId: 1,
      category: 2,
      subcategory: 3,
      detail: 4,
      tags: 5,
      catkey: 6,
      type: 7,
      activeStart: 26,
      activeEnd: 209,
    },
    'Budget Original': {
      categoryId: 2,
      category: 3,
      subcategory: 4,
      detail: 5,
      tags: 6,
      catkey: 7,
      type: 8,
      activeStart: 25,
      activeEnd: 208,
    },
    'Monthly Actuals (Roll Up)': {
      categoryId: 2,
      category: 3,
      subcategory: 4,
      detail: 5,
      tags: 6,
      catkey: 7,
      type: 8,
      activeStart: 25,
      activeEnd: 204,
    },
    'Annual Actuals (Roll Up)': {
      categoryId: 2,
      category: 3,
      subcategory: 4,
      detail: 5,
      tags: 6,
      catkey: 7,
      type: 8,
      activeStart: 25,
      activeEnd: 692,
    },
    'Annual Budget (Roll Up)': {
      categoryId: 2,
      category: 3,
      subcategory: 4,
      detail: 5,
      tags: 6,
      catkey: 7,
      type: 8,
      activeStart: 25,
      activeEnd: 692,
    },
  };

  return schemas[sheetTitle] ?? defaultSchema;
}

function buildRowSummary(rowData, rowIndex, schema) {
  const categoryId = getDisplay(getCell(rowData, schema.categoryId));
  const category = getDisplay(getCell(rowData, schema.category));
  const subcategory = getDisplay(getCell(rowData, schema.subcategory));
  const detail = getDisplay(getCell(rowData, schema.detail));
  const tags = getDisplay(getCell(rowData, schema.tags));
  const catkey = getDisplay(getCell(rowData, schema.catkey));
  const type = getDisplay(getCell(rowData, schema.type));

  const formulaCells = [];
  const noteCells = [];

  (rowData?.values ?? []).forEach((cell, colIndex) => {
    const formula = getFormula(cell);
    const note = getNote(cell);
    if (formula) {
      formulaCells.push({
        cell: `${colToLetter(colIndex)}${rowIndex + 1}`,
        formula,
      });
    }
    if (note) {
      noteCells.push({
        cell: `${colToLetter(colIndex)}${rowIndex + 1}`,
        note,
      });
    }
  });

  return {
    row: rowIndex + 1,
    categoryId,
    category,
    subcategory,
    detail,
    tags,
    catkey,
    type,
    formulaCount: formulaCells.length,
    noteCount: noteCells.length,
    formulaCells,
    noteCells,
  };
}

function buildActiveRowIssues(rowSummaries, schema) {
  const active = rowSummaries.filter(row => row.row >= schema.activeStart && row.row <= schema.activeEnd);
  const blankTypeActive = active.filter(
    row => (row.category || row.subcategory || row.detail || row.catkey) && !row.type,
  );

  const catkeyMap = new Map();
  for (const row of active) {
    const key = normalizeString(row.catkey);
    if (!key) continue;
    if (!catkeyMap.has(key)) catkeyMap.set(key, []);
    catkeyMap.get(key).push(row.row);
  }

  const duplicateCatkeys = [...catkeyMap.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([catkey, rows]) => ({ catkey, rows }));

  const whitespaceRows = active
    .filter(
      row =>
        (row.category && row.category !== row.category.trim()) ||
        (row.subcategory && row.subcategory !== row.subcategory.trim()) ||
        (row.detail && row.detail !== row.detail.trim()) ||
        (row.catkey && row.catkey !== row.catkey.trim()),
    )
    .map(row => ({
      row: row.row,
      category: row.category,
      subcategory: row.subcategory,
      detail: row.detail,
      catkey: row.catkey,
    }));

  return { blankTypeActive, duplicateCatkeys, whitespaceRows };
}

async function main() {
  const sheetTitle = arg('--sheet') ?? '(Input) Weekly Actuals';
  const sheetRange = `'${sheetTitle.replace(/'/g, "''")}'!A1:ZZZ5000`;

  const data = await getSheetGridData(
    USER,
    SPREADSHEET_ID,
    [sheetRange],
    'sheets(properties(title,sheetId,gridProperties(rowCount,columnCount)),data(startRow,startColumn,rowData(values(formattedValue,note,userEnteredValue,effectiveValue))))',
  );

  const sheet = data.sheets[0];
  const rowData = sheet.data?.[0]?.rowData ?? [];
  const schema = getSheetSchema(sheet.properties.title);
  const rowSummaries = rowData.map((row, index) => buildRowSummary(row, index, schema));

  if (hasFlag('--row')) {
    const rowNumber = Number(arg('--row'));
    const summary = rowSummaries.find(row => row.row === rowNumber);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (hasFlag('--range')) {
    const rangeArg = arg('--range');
    const [start, end] = rangeArg.split(':').map(Number);
    const slice = rowSummaries.filter(row => row.row >= start && row.row <= (end || start));
    console.log(JSON.stringify(slice, null, 2));
    return;
  }

  if (hasFlag('--find')) {
    const needle = (arg('--find') ?? '').toLowerCase().trim();
    const matches = rowSummaries.filter(row =>
      [row.categoryId, row.category, row.subcategory, row.detail, row.tags, row.catkey, row.type]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(needle)),
    );
    console.log(JSON.stringify(matches, null, 2));
    return;
  }

  const formulaRows = rowSummaries
    .filter(row => row.formulaCount > 0)
    .map(row => ({
      row: row.row,
      categoryId: row.categoryId,
      detail: row.detail,
      formulaCount: row.formulaCount,
    }));

  const noteRows = rowSummaries
    .filter(row => row.noteCount > 0)
    .map(row => ({
      row: row.row,
      categoryId: row.categoryId,
      detail: row.detail,
      noteCount: row.noteCount,
    }));

  const issues = buildActiveRowIssues(rowSummaries, schema);

  console.log(
    JSON.stringify(
      {
        sheet: {
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          rows: sheet.properties.gridProperties.rowCount,
          cols: sheet.properties.gridProperties.columnCount,
        },
        schema,
        formulaRows,
        noteRows,
        blankTypeActive: issues.blankTypeActive,
        duplicateCatkeys: issues.duplicateCatkeys,
        whitespaceRows: issues.whitespaceRows,
      },
      null,
      2,
    ),
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

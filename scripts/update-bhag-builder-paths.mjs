#!/usr/bin/env node

import { batchUpdateSheetValues, getSheetValues } from '../lib/google-delegated.js'

const spreadsheetId = '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw'
const sheet = "'Benson Crew Bhag Builder'"
const totalYears = 10

const plan = {
  team: {
    start: 310000000,
    end: 2000000000,
    rampRates: [0.10, 0.15, 0.20, 0.25],
    boundsRange: `${sheet}!K1:K2`,
    tableRange: `${sheet}!K4:M13`,
  },
  community: {
    start: 700,
    end: 10000,
    rampRates: [0.10, 0.15, 0.20, 0.25],
    boundsRange: `${sheet}!K17:K18`,
    tableRange: `${sheet}!K20:M29`,
  },
}

function buildCurve(start, end, rampRates) {
  const intervals = totalYears - 1
  const remainingIntervals = intervals - rampRates.length

  if (remainingIntervals <= 0) {
    throw new Error('Ramp rates are too long for the BHAG horizon.')
  }

  const rampProduct = rampRates.reduce((acc, rate) => acc * (1 + rate), 1)
  const flatRate = Math.pow(end / (start * rampProduct), 1 / remainingIntervals) - 1
  const rates = rampRates.concat(Array.from({ length: remainingIntervals }, () => flatRate))
  const targets = [start]

  let current = start
  rates.forEach(rate => {
    current = current * (1 + rate)
    targets.push(Math.round(current))
  })

  return { flatRate, rates, targets }
}

function buildTableRows(config, curve) {
  return Array.from({ length: totalYears }, (_, index) => {
    const row = config.tableRange.match(/!(?:[A-Z]+)(\d+):/)[1] * 1 + index
    const startRef = config.boundsRange.split('!')[1].split(':')[0]
    const endRef = config.boundsRange.split(':')[1]

    if (index === 0) {
      return [`=${startRef}`, '', `=${endRef}-K${row}`]
    }

    if (index === totalYears - 1) {
      return [
        `=${endRef}`,
        `=K${row}/K${row - 1}-1`,
        `=${endRef}-K${row}`,
      ]
    }

    return [
      `=ROUND(K${row - 1}*(1+L${row}),0)`,
      curve.rates[index - 1],
      `=${endRef}-K${row}`,
    ]
  })
}

function formatPercent(rate) {
  return `${(rate * 100).toFixed(2).replace(/\.00$/, '')}%`
}

async function main() {
  const teamCurve = buildCurve(plan.team.start, plan.team.end, plan.team.rampRates)
  const communityCurve = buildCurve(plan.community.start, plan.community.end, plan.community.rampRates)

  await batchUpdateSheetValues('service-account', spreadsheetId, [
    {
      range: plan.team.boundsRange,
      majorDimension: 'ROWS',
      values: [[plan.team.start], [plan.team.end]],
    },
    {
      range: plan.team.tableRange,
      majorDimension: 'ROWS',
      values: buildTableRows(plan.team, teamCurve),
    },
    {
      range: plan.community.boundsRange,
      majorDimension: 'ROWS',
      values: [[plan.community.start], [plan.community.end]],
    },
    {
      range: plan.community.tableRange,
      majorDimension: 'ROWS',
      values: buildTableRows(plan.community, communityCurve),
    },
  ])

  const [teamCheck, communityCheck] = await Promise.all([
    getSheetValues('service-account', spreadsheetId, `${sheet}!J1:M13`),
    getSheetValues('service-account', spreadsheetId, `${sheet}!J17:M29`),
  ])

  console.log('BHAG builder updated.')
  console.log(`Team flat growth after ramp: ${formatPercent(teamCurve.flatRate)}`)
  console.log(`Community flat growth after ramp: ${formatPercent(communityCurve.flatRate)}`)
  console.log(JSON.stringify({ team: teamCheck.values, community: communityCheck.values }, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})

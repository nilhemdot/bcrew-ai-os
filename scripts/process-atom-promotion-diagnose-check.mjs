#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'

const args = new Set(process.argv.slice(2))
const jsonMode = args.has('--json') || args.has('--json=true')
const LOOKBACK = "7 days"
const SCHEDULED_PROMOTION_SOURCE_IDS = [
  'SRC-GMAIL-001',
  'SRC-MISSIVE-001',
  'SRC-MEETINGS-001',
  'SRC-SLACK-001',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function sumRows(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0)
}

async function main() {
  const scriptSource = await readFile(new URL('./intelligence-synthesis-engine-proof.mjs', import.meta.url), 'utf8')
  assert(scriptSource.includes('SCHEDULED_PROMOTION_SOURCE_IDS'), 'Synthesis refresh must define scheduled fresh promotion source ids.')
  assert(scriptSource.includes('retrieval-fresh-candidate-promotion'), 'Synthesis refresh must record fresh candidate promotion runs.')
  assert(scriptSource.includes('freshPromotion'), 'Synthesis refresh must promote fresh shared-communication candidates.')
  assert(scriptSource.includes('candidateKeys: promotedCandidateKeys'), 'Synthesis refresh must embed newly promoted chunks by candidate key.')

  const pool = createPool()
  try {
    const [atomsResult, candidatesResult, artifactsResult, promotionRunResult, synthesisRunResult] = await Promise.all([
      pool.query(
        `
          SELECT source_id, COUNT(*)::int AS atoms, MAX(created_at) AS latest
          FROM intelligence_atoms
          WHERE created_at >= NOW() - INTERVAL '${LOOKBACK}'
          GROUP BY source_id
          ORDER BY atoms DESC, source_id ASC
        `,
      ),
      pool.query(
        `
          SELECT source_id, COUNT(*)::int AS candidates, MAX(created_at) AS latest
          FROM shared_communication_candidates
          WHERE created_at >= NOW() - INTERVAL '${LOOKBACK}'
          GROUP BY source_id
          ORDER BY candidates DESC, source_id ASC
        `,
      ),
      pool.query(
        `
          SELECT source_id, COUNT(*)::int AS artifacts, MAX(ingested_at) AS latest
          FROM shared_communication_artifacts
          WHERE ingested_at >= NOW() - INTERVAL '${LOOKBACK}'
          GROUP BY source_id
          ORDER BY artifacts DESC, source_id ASC
        `,
      ),
      pool.query(
        `
          SELECT run_id, requested_by, source_ids, candidates_read, atoms_promoted, chunks_upserted, created_at
          FROM intelligence_retrieval_runs
          WHERE run_type = 'candidate_promotion'
            AND requested_by = 'synthesis-engine-refresh'
            AND created_at >= NOW() - INTERVAL '${LOOKBACK}'
          ORDER BY created_at DESC
          LIMIT 5
        `,
      ),
      pool.query(
        `
          SELECT run_id, status, requested_by, item_count, metadata->'corpusDiversity' AS corpus_diversity, created_at
          FROM intelligence_synthesis_runs
          WHERE requested_by = 'synthesis-engine-refresh'
          ORDER BY created_at DESC
          LIMIT 1
        `,
      ),
    ])

    const atomsBySource = atomsResult.rows
    const candidatesBySource = candidatesResult.rows
    const artifactsBySource = artifactsResult.rows
    const promotionRuns = promotionRunResult.rows
    const latestPromotionRun = promotionRuns[0] || null
    const latestSynthesisRun = synthesisRunResult.rows[0] || null
    const recentAtomCount = sumRows(atomsBySource, 'atoms')
    const recentCandidateCount = sumRows(candidatesBySource, 'candidates')
    const recentArtifactCount = sumRows(artifactsBySource, 'artifacts')
    const sourceIntersection = new Set(
      promotionRuns.flatMap(run => Array.isArray(run.source_ids) ? run.source_ids : []),
    )

    assert(recentArtifactCount > 0, 'Atom-promotion diagnosis needs recent artifacts to prove the live pipe.')
    assert(recentCandidateCount > 0, 'Atom-promotion diagnosis needs recent candidates to prove extraction is still producing candidate work.')
    assert(recentAtomCount > 0, 'No intelligence_atoms were created in the last 7 days while artifacts/candidates exist.')
    assert(latestPromotionRun, 'No synthesis-engine-refresh candidate promotion run exists in the last 7 days.')
    assert(Number(latestPromotionRun.atoms_promoted || 0) > 0, 'Latest synthesis-engine-refresh promotion run did not promote atoms.')
    assert(Number(latestPromotionRun.chunks_upserted || 0) > 0, 'Latest synthesis-engine-refresh promotion run did not upsert retrieval chunks.')
    assert(SCHEDULED_PROMOTION_SOURCE_IDS.some(sourceId => sourceIntersection.has(sourceId)), 'Fresh promotion run did not use the scheduled shared-communication source ids.')
    assert(latestSynthesisRun?.status === 'succeeded', 'Latest synthesis refresh run did not persist a succeeded run.')
    assert(Number(latestSynthesisRun?.corpus_diversity?.freshPromoted || 0) > 0, 'Latest synthesis refresh metadata does not prove fresh promotion.')

    const report = {
      ok: true,
      card: 'ATOM-PROMOTION-DIAGNOSE-001',
      lookback: LOOKBACK,
      recentArtifactCount,
      recentCandidateCount,
      recentAtomCount,
      atomsBySource,
      candidatesBySource,
      artifactsBySource,
      latestPromotionRun,
      latestSynthesisRun,
      diagnosis: 'Scheduled synthesis refresh now promotes a bounded fresh candidate batch before synthesis; the previous zero-atom state was caused by the Gmail diversity threshold skipping promotion once 20+ retrieval chunks existed.',
    }

    if (jsonMode) console.log(JSON.stringify(report, null, 2))
    else {
      console.log('ATOM-PROMOTION-DIAGNOSE-001 OK')
      console.log(`recent artifacts=${recentArtifactCount} candidates=${recentCandidateCount} atoms=${recentAtomCount}`)
      console.log(`latest promotion=${latestPromotionRun.run_id} promoted=${latestPromotionRun.atoms_promoted} chunks=${latestPromotionRun.chunks_upserted}`)
    }
  } finally {
    await pool.end()
  }
}

main().catch(error => {
  if (jsonMode) console.log(JSON.stringify({ ok: false, card: 'ATOM-PROMOTION-DIAGNOSE-001', error: error.message }, null, 2))
  else console.error(error)
  process.exitCode = 1
})

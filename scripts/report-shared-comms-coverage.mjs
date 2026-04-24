#!/usr/bin/env node

import process from 'node:process';
import {
  closeFoundationDb,
  getSharedCommunicationCoverageSnapshot,
  initFoundationDb,
} from '../lib/foundation-db.js';

function formatDate(value) {
  if (!value) return 'unknown';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

function formatCandidateTypes(candidateTypes = {}) {
  const entries = Object.entries(candidateTypes);
  if (!entries.length) return 'none';
  return entries
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

function formatCoveragePercent(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0%';
  return `${Math.round(numeric * 10) / 10}%`;
}

async function main() {
  await initFoundationDb();
  const coverage = await getSharedCommunicationCoverageSnapshot();

  console.log('Shared communications coverage');
  console.log(`  Generated: ${coverage.generatedAt}`);
  console.log(`  Total artifacts: ${coverage.totalArtifacts}`);
  console.log(`  Total candidates: ${coverage.totalCandidates}`);
  if (coverage.latestSynthesisRun) {
    console.log(
      `  Latest synthesis: ${coverage.latestSynthesisRun.runId} (${coverage.latestSynthesisRun.candidatesRead} candidates)`,
    );
  }
  console.log('');

  for (const source of coverage.sources) {
    console.log(`${source.sourceId}`);
    console.log(`  Artifacts: ${source.totalArtifacts}`);
    console.log(
      `  Artifacts with candidates: ${source.artifactsWithCandidates || 0} (${formatCoveragePercent(source.extractionCoveragePercent)})`,
    );
    console.log(`  Artifacts still unmined: ${source.artifactsWithoutCandidates || 0}`);
    console.log(`  Candidates: ${source.totalCandidates}`);
    console.log(`  Oldest artifact: ${formatDate(source.oldestArtifactAt)}`);
    console.log(`  Newest artifact: ${formatDate(source.newestArtifactAt)}`);
    console.log(`  Candidate types: ${formatCandidateTypes(source.candidateTypes)}`);
    for (const [artifactType, summary] of Object.entries(source.artifactTypes || {})) {
      console.log(
        `  - ${artifactType}: ${summary.total} artifacts, ${summary.artifactsWithCandidates || 0} with candidates, ${summary.artifactsWithoutCandidates || 0} unmined, ${formatDate(summary.oldestArtifactAt)} -> ${formatDate(summary.newestArtifactAt)}`,
      );
    }
    console.log('');
  }
}

main()
  .catch(error => {
    console.error('Shared communications coverage report failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });

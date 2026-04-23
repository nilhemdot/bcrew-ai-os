#!/usr/bin/env node

import process from 'node:process';
import {
  closeFoundationDb,
  getSharedCommunicationArtifactsForProcessing,
  getSharedCommunicationCandidateSnapshot,
  initFoundationDb,
  upsertSharedCommunicationCandidate,
} from '../lib/foundation-db.js';

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function collectBulletBlocks(lines, startIndex) {
  const bullets = [];
  let current = '';
  let started = false;

  for (let index = startIndex; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    if (!started && !trimmed) continue;

    if (/^\*\s+/.test(trimmed)) {
      started = true;
      if (current) bullets.push(current.trim());
      current = trimmed.replace(/^\*\s+/, '').trim();
      continue;
    }

    if (!started) continue;

    if (!trimmed) {
      if (current) {
        bullets.push(current.trim());
        current = '';
      }
      continue;
    }

    if (/^[A-Z][\w\s/-]+$/.test(trimmed) && !current) {
      break;
    }

    if (current) {
      current += ` ${trimmed}`;
    }
  }

  if (current) bullets.push(current.trim());
  return bullets;
}

function parseTaskCandidate(bullet, artifact, index) {
  const structuredMatch = bullet.match(/^\[(.+?)\]\s+([^:]+):\s*(.+)$/);
  const plainMatch = bullet.match(/^([^:]+):\s*(.+)$/);

  let ownerHint = '';
  let title = '';
  let summary = bullet;
  let confidence = 0.75;

  if (structuredMatch) {
    ownerHint = structuredMatch[1].trim();
    title = structuredMatch[2].trim();
    summary = structuredMatch[3].trim();
    confidence = 0.95;
  } else if (plainMatch) {
    title = plainMatch[1].trim();
    summary = plainMatch[2].trim();
    confidence = 0.85;
  } else {
    title = bullet.slice(0, 80);
  }

  return {
    candidateKey: `${artifact.artifactId}:task:${index + 1}`,
    artifactId: artifact.artifactId,
    sourceId: artifact.sourceId,
    candidateType: 'task_candidate',
    title,
    summary,
    ownerHint,
    evidenceExcerpt: bullet.slice(0, 500),
    confidence,
    metadata: {
      extractionMethod: 'meeting_next_steps_v1',
      artifactTitle: artifact.title,
      artifactUpdatedAt: artifact.artifactUpdatedAt,
    },
  };
}

function extractCandidatesFromArtifact(artifact) {
  const lines = String(artifact.contentText || '').replace(/\r/g, '').split('\n');
  const nextStepsIndex = lines.findIndex(line => line.trim().toLowerCase() === 'next steps');
  if (nextStepsIndex === -1) return [];

  const bullets = collectBulletBlocks(lines, nextStepsIndex + 1);
  return bullets.map((bullet, index) => parseTaskCandidate(bullet, artifact, index));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(20, Math.max(1, Number(args.limit || 5)));

  console.log('Extract task candidates from archived meeting notes');
  console.log(`  Limit: ${limit}`);

  await initFoundationDb();

  const artifacts = await getSharedCommunicationArtifactsForProcessing({
    sourceId: 'SRC-MEETINGS-001',
    artifactType: 'meeting_note',
    limit,
  });

  console.log(`  Archived meeting notes scanned: ${artifacts.length}`);

  let upserted = 0;

  for (const artifact of artifacts) {
    const candidates = extractCandidatesFromArtifact(artifact);
    for (const candidate of candidates) {
      await upsertSharedCommunicationCandidate(candidate);
      upserted += 1;
    }
  }

  const snapshot = await getSharedCommunicationCandidateSnapshot({
    sourceId: 'SRC-MEETINGS-001',
    candidateType: 'task_candidate',
    status: 'pending',
    limit: Math.min(5, limit * 5),
    includeItems: true,
  });

  console.log(`  Task candidates upserted this run: ${upserted}`);
  console.log(`  Pending task candidates total: ${snapshot.totalCandidates}`);
  if (snapshot.items[0]) {
    console.log(
      `  Latest candidate: ${snapshot.items[0].candidateKey} (${snapshot.items[0].ownerHint || 'unassigned'} -> ${snapshot.items[0].title})`,
    );
  }
}

main()
  .catch(error => {
    console.error('Meeting-note task extraction failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });

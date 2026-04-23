import { createHash } from 'node:crypto';

const SPEAKER_LINE_PATTERN = /^[A-Z][A-Za-z.' -]+:\s+/;

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

export function transcriptTextHash(text) {
  return createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

export function normalizeMeetingArtifactKey(name) {
  return String(name || '')
    .replace(/\s+-\s+Notes by Gemini$/i, '')
    .replace(/\s+-\s+Transcript$/i, '')
    .replace(/\s+-\s+Recording$/i, '')
    .replace(/\s+-\s+Chat$/i, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

export function extractSpeakerNamesFromTranscript(text) {
  const speakers = new Set();
  const lines = normalizeWhitespace(text).split('\n');
  for (const line of lines) {
    const match = normalizeWhitespace(line).match(/^([A-Z][A-Za-z.' -]+):\s+/);
    if (match?.[1]) speakers.add(match[1].trim());
  }
  return [...speakers];
}

function countSpeakerLines(lines, startIndex, windowSize = 12) {
  let count = 0;
  const endIndex = Math.min(lines.length, startIndex + windowSize);
  for (let index = startIndex; index < endIndex; index += 1) {
    if (SPEAKER_LINE_PATTERN.test(lines[index])) count += 1;
  }
  return count;
}

export function findTranscriptStartIndex(text) {
  const lines = normalizeWhitespace(text)
    .split('\n')
    .map(line => line.trimEnd());

  for (let index = 0; index < lines.length; index += 1) {
    if (!SPEAKER_LINE_PATTERN.test(lines[index])) continue;
    if (countSpeakerLines(lines, index) >= 3) return index;
  }

  return -1;
}

export function extractTranscriptSection(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return null;

  const lines = normalized.split('\n').map(line => line.trimEnd());
  const startIndex = findTranscriptStartIndex(normalized);
  if (startIndex === -1) return null;

  const transcriptText = lines.slice(startIndex).join('\n').trim();
  const speakerNames = extractSpeakerNamesFromTranscript(transcriptText);

  return {
    transcriptText,
    transcriptLineCount: transcriptText ? transcriptText.split('\n').length : 0,
    speakerNames,
    startIndex,
  };
}

export function buildEmbeddedTranscriptExternalId(noteExternalId) {
  return `${noteExternalId}:embedded-transcript`;
}

export function buildEmbeddedTranscriptTitle(noteTitle) {
  const baseTitle = String(noteTitle || '').replace(/\s+Notes by Gemini$/i, '').trim();
  return baseTitle ? `${baseTitle} - Transcript` : 'Embedded transcript';
}

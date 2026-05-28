const EXECUTABLE_EXTENSIONS = new Set([
  'app',
  'appimage',
  'bat',
  'cmd',
  'deb',
  'dmg',
  'exe',
  'iso',
  'msi',
  'pkg',
  'ps1',
  'rpm',
  'sh',
])

const ARCHIVE_EXTENSIONS = new Set([
  '7z',
  'bz2',
  'gz',
  'rar',
  'tar',
  'tgz',
  'zip',
])

const DOCUMENT_EXTENSIONS = new Set([
  'csv',
  'doc',
  'docx',
  'md',
  'pdf',
  'ppt',
  'pptx',
  'rtf',
  'txt',
  'xls',
  'xlsx',
])

const CODE_RESOURCE_EXTENSIONS = new Set([
  'css',
  'html',
  'ipynb',
  'js',
  'json',
  'jsx',
  'mjs',
  'py',
  'sql',
  'ts',
  'tsx',
  'yaml',
  'yml',
])

const DOWNLOAD_PATH_RE = /(?:^|[/?#&=._-])(download|downloads|attachment|asset|file)(?:[/?#&=._-]|$)/i

function text(value) {
  return String(value || '').trim()
}

function parseUrl(value = '') {
  try {
    return new URL(text(value))
  } catch {
    return null
  }
}

function extensionOf(url = '') {
  const parsed = parseUrl(url)
  const pathname = parsed?.pathname || text(url).split(/[?#]/)[0] || ''
  const match = pathname.toLowerCase().match(/\.([a-z0-9]{1,12})$/)
  return match?.[1] || ''
}

function resourceKindForExtension(extension = '') {
  if (EXECUTABLE_EXTENSIONS.has(extension)) return 'executable_or_installer'
  if (ARCHIVE_EXTENSIONS.has(extension)) return 'archive'
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'document'
  if (CODE_RESOURCE_EXTENSIONS.has(extension)) return 'code_or_data_resource'
  return extension ? 'unknown_file_extension' : 'download_or_file_path'
}

function safetyForKind(kind = '') {
  if (kind === 'executable_or_installer') return 'unsafe_binary'
  if (kind === 'archive') return 'archive_requires_unpack_policy'
  if (kind === 'document') return 'metadata_only_until_document_reader_policy'
  if (kind === 'code_or_data_resource') return 'metadata_only_until_code_file_reader_policy'
  return 'metadata_only_until_file_type_review'
}

export function classifyFreeResourceFileLink(link = {}) {
  const url = text(link.url || link.href)
  const label = text(link.label || link.text)
  const extension = extensionOf(url)
  const hasDownloadPath = DOWNLOAD_PATH_RE.test(url)
  const hasKnownFileExtension = Boolean(extension) && (
    EXECUTABLE_EXTENSIONS.has(extension) ||
    ARCHIVE_EXTENSIONS.has(extension) ||
    DOCUMENT_EXTENSIONS.has(extension) ||
    CODE_RESOURCE_EXTENSIONS.has(extension)
  )

  if (!hasKnownFileExtension && !hasDownloadPath) {
    return {
      isFileResource: false,
      metadataOnlyCandidate: false,
      downloadAllowed: false,
    }
  }

  const resourceKind = resourceKindForExtension(extension)
  return {
    isFileResource: true,
    metadataOnlyCandidate: true,
    downloadAllowed: false,
    extension,
    resourceKind,
    safety: safetyForKind(resourceKind),
    label,
    reason: hasKnownFileExtension
      ? `Detected .${extension} file/resource link.`
      : 'Detected a download/file path with no trusted file-reader policy.',
    capturePolicy: 'capture_url_host_label_extension_and_context_only',
    nextAction: resourceKind === 'executable_or_installer'
      ? 'Keep blocked unless Steve explicitly approves a sandboxed binary/install review.'
      : 'Queue for a file/document reader policy; do not download or open from the browser runtime.',
  }
}

export function buildFreeResourceFileCandidates(linkDecisions = []) {
  return linkDecisions
    .filter(link => link.filePolicy?.metadataOnlyCandidate)
    .map(link => ({
      url: link.url,
      host: link.host,
      label: link.label,
      sourceFamily: link.sourceFamily || 'download_or_file',
      decision: link.decision,
      metadataOnly: true,
      downloadAllowed: false,
      extension: link.filePolicy.extension || '',
      resourceKind: link.filePolicy.resourceKind || 'download_or_file_path',
      safety: link.filePolicy.safety || 'metadata_only_until_file_type_review',
      nextAction: link.filePolicy.nextAction || 'Do not download; route to file/resource policy.',
    }))
}

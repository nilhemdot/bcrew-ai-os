import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { closeFoundationDb, getDocSourceSnapshot, getFoundationSnapshot, initFoundationDb } from './lib/foundation-db.js'
import { getSourceContracts, getSourceContractsByIds } from './lib/source-contracts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const port = process.env.PORT || 3000
app.disable('x-powered-by')

const docsDir = path.join(__dirname, 'docs')
const businessStrategyPath = path.join(docsDir, 'business-strategy.md')
const sourceRegistryPath = path.join(docsDir, 'source-registry.md')
const strategyDocs = [
  path.join(docsDir, 'strategy', 'bhag-model.md'),
  path.join(docsDir, 'strategy', 'agent-engine.md'),
  path.join(docsDir, 'strategy', 'financial-model-and-assumptions.md'),
  path.join(docsDir, 'strategy', 'quarterly-priorities.md'),
  path.join(docsDir, 'strategy', 'strategic-issues.md'),
  path.join(docsDir, 'strategy', 'governance.md'),
  path.join(docsDir, 'strategy', 'department-mandates.md'),
  path.join(docsDir, 'strategy', 'core-values.md'),
  path.join(docsDir, 'strategy', 'marketmasters.md'),
]

function setSecurityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  next()
}

function logApiRequest(req, res, next) {
  if (!req.path.startsWith('/api/')) {
    next()
    return
  }

  const startedAt = Date.now()
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt
    console.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`)
  })
  next()
}

function sendApiError(res, statusCode, code, message) {
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  })
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

app.use(setSecurityHeaders)
app.use(logApiRequest)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (/\.(js|css|html)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store')
    }
  },
}))

function isAllowedDocPath(filePath) {
  const normalizedDocsDir = path.resolve(docsDir) + path.sep
  const normalizedFilePath = path.resolve(filePath)
  return normalizedFilePath.startsWith(normalizedDocsDir) && normalizedFilePath.endsWith('.md')
}

function resolveRequestedDoc(requestedPath) {
  if (typeof requestedPath !== 'string' || !requestedPath.trim()) return null
  const resolvedPath = path.resolve(__dirname, requestedPath)
  return isAllowedDocPath(resolvedPath) ? resolvedPath : null
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function getDocMeta(filePath) {
  try {
    const stat = fs.statSync(filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    return {
      exists: true,
      path: path.relative(__dirname, filePath),
      lines: content.split('\n').length,
      updatedAt: stat.mtime.toISOString(),
      daysOld: Math.floor((Date.now() - stat.mtimeMs) / 86400000),
    }
  } catch {
    return {
      exists: false,
      path: path.relative(__dirname, filePath),
      lines: 0,
      updatedAt: null,
      daysOld: null,
    }
  }
}

function parseSections(markdown) {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const sections = []
  let current = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { title: line.slice(3).trim(), body: [] }
      continue
    }

    if (current) current.body.push(line)
  }

  if (current) sections.push(current)

  return sections
    .map(section => ({
      title: section.title,
      content: section.body.join('\n').trim(),
    }))
    .filter(section => section.content)
}

function getSupportingStrategyDocs() {
  return strategyDocs.map(filePath => {
    const meta = getDocMeta(filePath)
    const content = readFileSafe(filePath)
    return {
      meta,
      sections: parseSections(content),
    }
  })
}

function getDocTitle(markdown, filePath) {
  if (markdown) {
    const lines = markdown.split('\n')
    const heading = lines.find(line => line.startsWith('# '))
    if (heading) return heading.slice(2).trim()
  }

  return path.basename(filePath, '.md')
}

app.get('/api/source-of-truth', (_req, res) => {
  const businessStrategy = readFileSafe(businessStrategyPath)
  const sourceRegistry = readFileSafe(sourceRegistryPath)
  const sourceContracts = getSourceContracts()

  res.json({
    title: 'BCrew AI OS',
    foundation: {
      businessStrategy: {
        meta: getDocMeta(businessStrategyPath),
        sections: parseSections(businessStrategy),
      },
      sourceRegistry: {
        meta: getDocMeta(sourceRegistryPath),
        sections: parseSections(sourceRegistry),
      },
      supportingStrategy: getSupportingStrategyDocs(),
    },
    sources: sourceContracts,
    systemStatus: [
      {
        key: 'strategy-doc',
        label: 'Business Strategy',
        status: businessStrategy ? 'connected' : 'missing',
        detail: businessStrategy
          ? 'Primary strategy source is in the repo and rendered in the dashboard.'
          : 'Missing docs/business-strategy.md.',
      },
      {
        key: 'source-registry',
        label: 'Source Registry',
        status: sourceRegistry ? 'connected' : 'pending',
        detail: sourceRegistry
          ? `${sourceContracts.length} source contracts are tracked, with verified, pending, and gap states.`
          : 'Create the registry next so every business input has an owner and status.',
      },
      {
        key: 'supporting-strategy',
        label: 'Supporting Strategy',
        status: getSupportingStrategyDocs().every(doc => doc.meta.exists) ? 'connected' : 'pending',
        detail: 'BHAG model, Agent Engine, and department mandates are split into maintainable supporting docs.',
      },
      {
        key: 'decision-log',
        label: 'Decision Log',
        status: 'pending',
        detail: 'Not wired yet. Strategic decisions should become explicit records, not chat residue.',
      },
      {
        key: 'intel-engine',
        label: 'Strategic Intelligence Engine',
        status: 'pending',
        detail: 'Not wired yet. This layer will compare reality against strategy and detect drift.',
      },
    ],
  })
})

app.get('/api/foundation-hub', async (_req, res) => {
  try {
    const snapshot = await getFoundationSnapshot()
    res.json(snapshot)
  } catch (error) {
    sendApiError(
      res,
      500,
      'foundation_hub_load_failed',
      error instanceof Error ? error.message : 'Failed to load foundation hub data.'
    )
  }
})

app.get('/api/doc', async (req, res) => {
  const filePath = resolveRequestedDoc(req.query.path)

  if (!filePath) {
    sendApiError(res, 400, 'invalid_doc_path', 'Invalid doc path.')
    return
  }

  const content = readFileSafe(filePath)

  if (!content) {
    sendApiError(res, 404, 'document_not_found', 'Document not found.')
    return
  }

  try {
    if (path.relative(__dirname, filePath) === 'docs/strategy/bhag-model.md') {
      res.setHeader('Cache-Control', 'no-store')
    }

    const sourceSnapshot = await getDocSourceSnapshot(path.relative(__dirname, filePath))
    const sourceContracts = getSourceContractsByIds(
      Array.from(new Set(sourceSnapshot.map(row => row.sourceId)))
    )
    res.json({
      title: getDocTitle(content, filePath),
      meta: getDocMeta(filePath),
      content,
      sourceSnapshot,
      sourceContracts,
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'doc_snapshot_load_failed',
      error instanceof Error ? error.message : 'Failed to load document source snapshot.'
    )
  }
})

app.get('/doc', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'doc.html'))
})

app.get('/foundation', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'foundation.html'))
})

app.get('/strategic-execution', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'strategic-execution.html'))
})

app.use('/api', (_req, res) => {
  sendApiError(res, 404, 'api_not_found', 'API endpoint not found.')
})

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

async function start() {
  await initFoundationDb()

  const server = app.listen(port, () => {
    console.log(`BCrew AI OS dashboard listening on http://localhost:${port}`)
  })

  let isShuttingDown = false
  const shutdown = async () => {
    if (isShuttingDown) return
    isShuttingDown = true

    try {
      await closeServer(server)
      await closeFoundationDb()
      process.exit(0)
    } catch (error) {
      console.error('Failed to shut down BCrew AI OS dashboard cleanly:', error)
      process.exit(1)
    }
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch(error => {
  console.error('Failed to start BCrew AI OS dashboard:', error)
  process.exit(1)
})

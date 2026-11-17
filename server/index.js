import express from 'express'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  ROOT,
  UPLOAD_DIR,
  LIBRARY_FILE,
  readLibrary,
  mutate,
  ensureDirs,
  moveToTrash,
  restoreFromTrash
} from './store.js'
import {
  MAX_FILE_SIZE,
  resolveExtension,
  normalizeMime,
  detectDimensions
} from './dimensions.js'
import { buildBackup, restoreBackup } from './backup.js'

const app = express()
const PORT = Number(process.env.PORT || 3001)
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
const nowIso = () => new Date().toISOString()
const makeId = (prefix) => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`
const stripExt = (name = '') => name.replace(/\.[^./\\]+$/, '') || '未命名图标'
const isSafeFile = (file) => typeof file === 'string' && /^[a-zA-Z0-9._-]+$/.test(file)

app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 60 },
  fileFilter(req, file, cb) {
    if (!resolveExtension(file.mimetype, file.originalname)) {
      const err = new Error(`不支持的格式：${file.originalname}`)
      err.status = 400
      return cb(err)
    }
    cb(null, true)
  }
})

const archiveUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!/\.zip$/i.test(file.originalname || '')) {
      const err = new Error('请选择 .zip 备份包')
      err.status = 400
      return cb(err)
    }
    cb(null, true)
  }
})

ensureDirs()
readLibrary()

function formatLabel(mime) {
  const labels = {
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/webp': 'WEBP',
    'image/gif': 'GIF',
    'image/svg+xml': 'SVG'
  }
  return labels[mime] || String(mime || '').replace('image/', '').toUpperCase()
}

function stats(data) {
  return {
    total: data.icons.length,
    uncategorized: data.icons.filter((i) => !i.categoryId).length,
    bytes: data.icons.reduce((sum, i) => sum + (Number(i.bytes) || 0), 0),
    formats: [...new Set(data.icons.map((i) => formatLabel(i.mime)))].filter(Boolean).sort()
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'iconStack', time: nowIso() }))

app.get('/api/bootstrap', (req, res) => {
  const data = readLibrary()
  res.json({
    categories: [...data.categories].sort((a, b) => a.order - b.order),
    icons: data.icons,
    stats: stats(data)
  })
})

app.post(
  '/api/icons/upload',
  upload.array('files', 60),
  wrap(async (req, res) => {
    let items = []
    try {
      const meta = JSON.parse(req.body.meta || '{}')
      if (Array.isArray(meta.items)) items = meta.items
    } catch {
      items = []
    }
    const files = req.files || []
    if (!files.length) return res.status(400).json({ error: '没有收到文件' })

    const data = readLibrary()
    const validCategoryIds = new Set(data.categories.map((c) => c.id))
    const results = []

    for (let i = 0; i < files.length; i += 1) {
      const f = files[i]
      const hint = items[i] || {}
      const originalName = String(hint.originalName || f.originalname || 'icon').trim()
      const ext = resolveExtension(f.mimetype, originalName)
      if (!ext) {
        results.push({ ok: false, originalName, reason: '不支持的文件格式' })
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        results.push({ ok: false, originalName, reason: '超过 8 MB 上限' })
        continue
      }
      const dimensions = detectDimensions(f.buffer, ext, hint)
      const id = makeId('ic')
      const file = `${id}.${ext}`
      fs.writeFileSync(path.join(UPLOAD_DIR, file), f.buffer)
      const categoryId = validCategoryIds.has(hint.categoryId) ? hint.categoryId : null
      const time = nowIso()
      results.push({
        ok: true,
        record: {
          id,
          name: String(hint.name || '').trim() || stripExt(originalName),
          categoryId,
          file,
          mime: normalizeMime(ext),
          width: dimensions.width,
          height: dimensions.height,
          bytes: f.size,
          originalName,
          createdAt: time,
          updatedAt: time
        }
      })
    }

    const added = results.filter((r) => r.ok).map((r) => r.record)
    await mutate((d) => {
      d.icons.unshift(...added)
    })
    res.json({ results, added: added.length, stats: stats(readLibrary()) })
  })
)

app.patch(
  '/api/icons/:id',
  wrap(async (req, res) => {
    const { id } = req.params
    const patch = req.body || {}
    let updated = null
    await mutate((d) => {
      const icon = d.icons.find((i) => i.id === id)
      if (!icon) return
      if (patch.name !== undefined) {
        const name = String(patch.name).trim()
        if (name) icon.name = name
      }
      if (patch.categoryId !== undefined) {
        const target = patch.categoryId
        icon.categoryId = target && d.categories.some((c) => c.id === target) ? target : null
      }
      icon.updatedAt = nowIso()
      updated = { ...icon }
    })
    if (!updated) return res.status(404).json({ error: '图标不存在' })
    res.json({ icon: updated })
  })
)

app.post(
  '/api/icons/:id/replace',
  upload.single('file'),
  wrap(async (req, res) => {
    const { id } = req.params
    const f = req.file
    if (!f) return res.status(400).json({ error: '没有收到新文件' })
    const hint = (() => {
      try {
        return JSON.parse(req.body.meta || '{}')
      } catch {
        return {}
      }
    })()
    const originalName = String(hint.originalName || f.originalname || 'icon').trim()
    const ext = resolveExtension(f.mimetype, originalName)
    if (!ext) return res.status(400).json({ error: '不支持的文件格式' })

    const dimensions = detectDimensions(f.buffer, ext, hint)
    const file = `${id}_${Date.now()}.${ext}`
    fs.writeFileSync(path.join(UPLOAD_DIR, file), f.buffer)

    let updated = null
    await mutate((d) => {
      const icon = d.icons.find((i) => i.id === id)
      if (!icon) return
      moveToTrash(icon.file)
      Object.assign(icon, {
        file,
        mime: normalizeMime(ext),
        width: dimensions.width,
        height: dimensions.height,
        bytes: f.size,
        originalName,
        updatedAt: nowIso()
      })
      updated = { ...icon }
    })
    if (!updated) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, file))
      } catch {
        // ignore
      }
      return res.status(404).json({ error: '图标不存在' })
    }
    res.json({ icon: updated })
  })
)

function removeIcons(ids) {
  const idSet = new Set(Array.isArray(ids) ? ids : [])
  const data = readLibrary()
  const removed = data.icons.filter((i) => idSet.has(i.id)).map((i) => ({ ...i }))
  return mutate((d) => {
    d.icons = d.icons.filter((i) => !idSet.has(i.id))
    for (const icon of removed) moveToTrash(icon.file)
    return removed
  })
}

app.delete(
  '/api/icons/:id',
  wrap(async (req, res) => {
    const removed = await removeIcons([req.params.id])
    if (!removed.length) return res.status(404).json({ error: '图标不存在' })
    res.json({ deleted: removed })
  })
)

app.post(
  '/api/icons/batch-delete',
  wrap(async (req, res) => {
    const removed = await removeIcons(req.body.ids)
    res.json({ deleted: removed, removed: removed.length })
  })
)

app.post(
  '/api/icons/batch-move',
  wrap(async (req, res) => {
    const ids = new Set(Array.isArray(req.body.ids) ? req.body.ids : [])
    const target = req.body.categoryId || null
    let count = 0
    await mutate((d) => {
      if (target && !d.categories.some((c) => c.id === target)) return
      const time = nowIso()
      for (const icon of d.icons) {
        if (ids.has(icon.id)) {
          icon.categoryId = target
          icon.updatedAt = time
          count += 1
        }
      }
    })
    res.json({ updated: count })
  })
)

app.post(
  '/api/icons/restore',
  wrap(async (req, res) => {
    const records = Array.isArray(req.body.records) ? req.body.records : []
    let restored = 0
    await mutate((d) => {
      for (const record of records) {
        if (!record || !record.id || d.icons.some((i) => i.id === record.id)) continue
        if (!isSafeFile(record.file)) continue
        restoreFromTrash(record.file)
        d.icons.unshift({ ...record, updatedAt: nowIso() })
        restored += 1
      }
    })
    res.json({ restored })
  })
)

app.post(
  '/api/categories',
  wrap(async (req, res) => {
    const name = String(req.body.name || '').trim()
    if (!name) return res.status(400).json({ error: '分类名称不能为空' })
    const color = /^#[0-9a-fA-F]{6}$/.test(req.body.color || '') ? req.body.color : '#5B9DFF'
    let created = null
    await mutate((d) => {
      if (d.categories.some((c) => c.name === name)) return
      created = {
        id: makeId('cat'),
        name,
        color,
        order: d.categories.length ? Math.max(...d.categories.map((c) => c.order || 0)) + 1 : 0,
        createdAt: nowIso()
      }
      d.categories.push(created)
    })
    if (!created) return res.status(409).json({ error: '已存在同名分类' })
    res.json({ category: created })
  })
)

app.patch(
  '/api/categories/:id',
  wrap(async (req, res) => {
    const patch = req.body || {}
    let updated = null
    await mutate((d) => {
      const category = d.categories.find((c) => c.id === req.params.id)
      if (!category) return
      if (patch.name !== undefined) {
        const name = String(patch.name).trim()
        if (name && !d.categories.some((c) => c.id !== category.id && c.name === name)) category.name = name
      }
      if (patch.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(patch.color)) category.color = patch.color
      updated = { ...category }
    })
    if (!updated) return res.status(404).json({ error: '分类不存在' })
    res.json({ category: updated })
  })
)

app.delete(
  '/api/categories/:id',
  wrap(async (req, res) => {
    let moved = 0
    let found = false
    await mutate((d) => {
      found = d.categories.some((c) => c.id === req.params.id)
      if (!found) return
      d.categories = d.categories.filter((c) => c.id !== req.params.id)
      d.categories.forEach((c, i) => {
        c.order = i
      })
      const time = nowIso()
      for (const icon of d.icons) {
        if (icon.categoryId === req.params.id) {
          icon.categoryId = null
          icon.updatedAt = time
          moved += 1
        }
      }
    })
    if (!found) return res.status(404).json({ error: '分类不存在' })
    res.json({ moved })
  })
)

app.post(
  '/api/categories/reorder',
  wrap(async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : []
    await mutate((d) => {
      const rank = new Map(ids.map((id, index) => [id, index]))
      for (const category of d.categories) {
        category.order = rank.has(category.id) ? rank.get(category.id) : 999
      }
      d.categories.sort((a, b) => a.order - b.order)
      d.categories.forEach((c, i) => {
        c.order = i
      })
    })
    res.json({ ok: true })
  })
)

app.get(
  '/api/backup/export',
  wrap(async (req, res) => {
    const buffer = buildBackup(readLibrary(), UPLOAD_DIR)
    const stamp = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="iconstack-${stamp}.zip"`)
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  })
)

app.post(
  '/api/backup/import',
  archiveUpload.single('archive'),
  wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: '没有收到备份包' })
    const incoming = restoreBackup(req.file.buffer, UPLOAD_DIR, LIBRARY_FILE)
    await mutate((d) => {
      d.categories = incoming.categories
      d.icons = incoming.icons
      d.version = 1
    })
    res.json({ ok: true, stats: stats(readLibrary()) })
  })
)

app.use('/uploads', (req, res, next) => {
  if (req.path.includes('..') || req.path.startsWith('/.trash')) return res.status(403).end()
  next()
})
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, { index: false, maxAge: '1h', setHeaders(res) { res.setHeader('X-Content-Type-Options', 'nosniff') } })
)
app.use('/uploads', (req, res) => res.status(404).end())
app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }))

const distDir = path.join(ROOT, 'dist')
const hasBuild = fs.existsSync(distDir)
if (hasBuild) {
  app.use(express.static(distDir))
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.use((err, req, res, next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500)
  const message = err.code === 'LIMIT_FILE_SIZE' ? '单个文件超过 8 MB 上限' : err.message || '服务异常'
  if (status >= 500) console.error('[iconStack]', err)
  res.status(status).json({ error: message })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[iconStack] API ready at http://127.0.0.1:${PORT}`)
  console.log(`[iconStack] library: ${LIBRARY_FILE}`)
  if (hasBuild) {
    console.log(`[iconStack] 页面入口: http://127.0.0.1:${PORT}/  (npm run start 模式)`)
  } else {
    console.log('[iconStack] 未检测到 dist/，当前为纯 API 模式。看界面请运行 npm run dev，或先 npm run build')
  }
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n[iconStack] 端口 ${PORT} 已被占用，启动失败。`)
    console.error('[iconStack] 常见原因：已经运行过 npm run dev（它会同时启动后端），又单独执行了 npm run start。')
    console.error('[iconStack] 处理方式二选一：')
    console.error(`  1) 查出并停掉占用进程（PowerShell）：`)
    console.error(`     Get-NetTCPConnection -LocalPort ${PORT} -State Listen | Select-Object OwningProcess`)
    console.error(`     Stop-Process -Id <上一步查到的PID>`)
    console.error(`  2) 换一个端口启动（PowerShell）：$env:PORT=3101; npm run start`)
    console.error(`     cmd：set PORT=3101 && npm run start`)
    console.error(`     使用 npm run dev 时 Vite 代理会自动跟随 PORT。\n`)
  } else {
    console.error('[iconStack] 服务启动失败：', error)
  }
  process.exit(1)
})

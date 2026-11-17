import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSeed } from './seed.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(HERE, '..')
export const DATA_DIR = path.join(HERE, 'data')
export const UPLOAD_DIR = path.join(HERE, 'uploads')
export const TRASH_DIR = path.join(UPLOAD_DIR, '.trash')
export const LIBRARY_FILE = path.join(DATA_DIR, 'library.json')

let cache = null
let queue = Promise.resolve()

export function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  fs.mkdirSync(TRASH_DIR, { recursive: true })
}

function persist(data) {
  ensureDirs()
  const tmp = `${LIBRARY_FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, LIBRARY_FILE)
}

export function readLibrary() {
  if (cache) return cache
  ensureDirs()
  if (!fs.existsSync(LIBRARY_FILE)) {
    cache = createSeed()
    persist(cache)
    return cache
  }
  try {
    cache = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'))
  } catch {
    cache = { version: 1, categories: [], icons: [] }
  }
  if (!Array.isArray(cache.categories)) cache.categories = []
  if (!Array.isArray(cache.icons)) cache.icons = []
  return cache
}

export function mutate(fn) {
  const run = async () => {
    const data = readLibrary()
    const result = await fn(data)
    persist(data)
    return result
  }
  const next = queue.then(run, run)
  queue = next.catch(() => {})
  return next
}

export function replaceLibrary(incoming) {
  cache.categories = Array.isArray(incoming.categories) ? incoming.categories : []
  cache.icons = Array.isArray(incoming.icons) ? incoming.icons : []
  cache.version = 1
  return cache
}

export function moveToTrash(file) {
  if (!file || !/^[a-zA-Z0-9._-]+$/.test(file)) return
  try {
    const src = path.join(UPLOAD_DIR, file)
    const dst = path.join(TRASH_DIR, file)
    if (fs.existsSync(src)) fs.renameSync(src, dst)
  } catch {
    // 文件缺失不阻断元数据操作
  }
}

export function restoreFromTrash(file) {
  if (!file || !/^[a-zA-Z0-9._-]+$/.test(file)) return
  try {
    const src = path.join(TRASH_DIR, file)
    const dst = path.join(UPLOAD_DIR, file)
    if (fs.existsSync(src)) fs.renameSync(src, dst)
  } catch {
    // 忽略
  }
}

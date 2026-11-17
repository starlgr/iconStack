import path from 'node:path'
import * as imageSizeNS from 'image-size'

const sizeOf = imageSizeNS.imageSize || imageSizeNS.default || imageSizeNS

export const MAX_FILE_SIZE = 8 * 1024 * 1024

const EXT_ALIAS = { png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp', gif: 'gif', svg: 'svg' }
const MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
}
const EXT_TO_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml'
}

export function resolveExtension(mime, originalName) {
  const raw = path.extname(originalName || '').slice(1).toLowerCase()
  if (EXT_ALIAS[raw]) return EXT_ALIAS[raw]
  return MIME_TO_EXT[String(mime || '').toLowerCase()] || null
}

export function normalizeMime(ext) {
  return EXT_TO_MIME[ext] || 'application/octet-stream'
}

function toNumber(value) {
  if (value == null) return null
  const m = String(value).match(/-?\d*\.?\d+/)
  if (!m) return null
  const n = Number.parseFloat(m[0])
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseSvgDimensions(text) {
  const open = String(text).match(/<svg\b[^>]*>/i)
  if (!open) return { width: 0, height: 0 }
  const tag = open[0]
  const widthAttr = tag.match(/\bwidth\s*=\s*["']([^"']+)["']/i)
  const heightAttr = tag.match(/\bheight\s*=\s*["']([^"']+)["']/i)
  const viewBoxAttr = tag.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)

  let width = widthAttr && !widthAttr[1].includes('%') ? toNumber(widthAttr[1]) : null
  let height = heightAttr && !heightAttr[1].includes('%') ? toNumber(heightAttr[1]) : null

  if ((!width || !height) && viewBoxAttr) {
    const parts = viewBoxAttr[1].trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
      if (!width) width = parts[2]
      if (!height) height = parts[3]
    }
  }
  return { width: Math.round(width || 0), height: Math.round(height || 0) }
}

export function detectDimensions(buffer, ext, hint = {}) {
  if (ext === 'svg') {
    const parsed = parseSvgDimensions(buffer.toString('utf8'))
    return parsed.width && parsed.height ? parsed : { width: hint.width || 0, height: hint.height || 0 }
  }
  try {
    const result = typeof sizeOf === 'function' ? sizeOf(buffer) : null
    if (result && result.width > 0 && result.height > 0) {
      return { width: Math.round(result.width), height: Math.round(result.height) }
    }
  } catch {
    // 交给浏览器端解析出的尺寸兜底
  }
  return { width: Math.round(hint.width || 0), height: Math.round(hint.height || 0) }
}

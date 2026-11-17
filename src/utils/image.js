export const ACCEPTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']
export const ACCEPT_ATTRIBUTE = '.png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export function extensionOfName(name = '') {
  return String(name).split('.').pop().toLowerCase()
}

export function isAccepted(file) {
  return ACCEPTED_EXTENSIONS.includes(extensionOfName(file.name))
}

function parseSvg(text) {
  const open = String(text).match(/<svg\b[^>]*>/i)
  if (!open) return { width: 0, height: 0 }
  const tag = open[0]
  const number = (value) => {
    const match = String(value).match(/-?\d*\.?\d+/)
    return match ? Number.parseFloat(match[0]) : 0
  }
  const widthAttr = tag.match(/\bwidth\s*=\s*["']([^"']+)["']/i)
  const heightAttr = tag.match(/\bheight\s*=\s*["']([^"']+)["']/i)
  const viewBoxAttr = tag.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)
  let width = widthAttr && !widthAttr[1].includes('%') ? number(widthAttr[1]) : 0
  let height = heightAttr && !heightAttr[1].includes('%') ? number(heightAttr[1]) : 0
  if ((!width || !height) && viewBoxAttr) {
    const parts = viewBoxAttr[1].trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4) {
      if (!width) width = parts[2]
      if (!height) height = parts[3]
    }
  }
  return { width: Math.round(width), height: Math.round(height) }
}

export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

export function readImageSize(url) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({ width: 0, height: 0 })
    image.src = url
  })
}

export async function inspectFile(file) {
  const previewUrl = URL.createObjectURL(file)
  const base = {
    file,
    previewUrl,
    originalName: file.name,
    name: file.name.replace(/\.[^./\\]+$/, '') || '未命名图标',
    bytes: file.size,
    width: 0,
    height: 0,
    error: ''
  }
  if (!isAccepted(file)) {
    URL.revokeObjectURL(previewUrl)
    return { ...base, previewUrl: '', error: '仅支持 PNG / JPG / WebP / GIF / SVG' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    URL.revokeObjectURL(previewUrl)
    return { ...base, previewUrl: '', error: '文件超过 8 MB 上限' }
  }
  try {
    if (extensionOfName(file.name) === 'svg') {
      const dims = parseSvg(await readFileText(file))
      return { ...base, ...dims, error: dims.width && dims.height ? '' : '无法解析 SVG 尺寸（缺少 viewBox）' }
    }
    const dims = await readImageSize(previewUrl)
    return { ...base, ...dims, error: dims.width && dims.height ? '' : '无法读取图片尺寸' }
  } catch (error) {
    return { ...base, error: error.message || '解析失败' }
  }
}

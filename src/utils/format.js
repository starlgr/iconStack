export function formatBytes(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

export function formatDate(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function extensionOf(mime) {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  }
  return (map[mime] || 'unknown').toUpperCase()
}

export function dimensionLabel(width, height) {
  if (!width || !height) return '尺寸未知'
  return `${width} × ${height}`
}

export function stripExtension(name = '') {
  return name.replace(/\.[^./\\]+$/, '') || '未命名图标'
}

export function truncate(text, max = 26) {
  const value = String(text || '')
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function isSvg(icon) {
  return icon && (icon.mime === 'image/svg+xml' || /\.svg$/i.test(icon.file || ''))
}

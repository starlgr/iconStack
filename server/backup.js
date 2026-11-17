import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'

export function buildBackup(data, uploadsDir) {
  const zip = new AdmZip()
  zip.addFile('library.json', Buffer.from(JSON.stringify(data, null, 2), 'utf8'))
  zip.addFile(
    'manifest.json',
    Buffer.from(
      JSON.stringify(
        { app: 'iconStack', version: 1, exportedAt: new Date().toISOString(), iconCount: data.icons.length },
        null,
        2
      ),
      'utf8'
    )
  )
  for (const icon of data.icons) {
    if (!/^[a-zA-Z0-9._-]+$/.test(icon.file || '')) continue
    const filePath = path.join(uploadsDir, icon.file)
    if (fs.existsSync(filePath)) {
      zip.addFile(`uploads/${icon.file}`, fs.readFileSync(filePath))
    }
  }
  return zip.toBuffer()
}

export function restoreBackup(buffer, uploadsDir, libraryFile) {
  const zip = new AdmZip(buffer)
  const entry = zip.getEntry('library.json')
  if (!entry) throw new Error('备份包里没有 library.json，无法还原')

  let incoming
  try {
    incoming = JSON.parse(entry.getData().toString('utf8'))
  } catch {
    throw new Error('备份包里的 library.json 已损坏')
  }
  if (!Array.isArray(incoming.icons) || !Array.isArray(incoming.categories)) {
    throw new Error('备份包格式不正确')
  }

  fs.mkdirSync(uploadsDir, { recursive: true })
  if (fs.existsSync(libraryFile)) {
    fs.copyFileSync(libraryFile, `${libraryFile}.backup`)
  }

  for (const item of zip.getEntries()) {
    if (item.isDirectory || !item.entryName.startsWith('uploads/')) continue
    const name = path.basename(item.entryName)
    if (!name || !/^[a-zA-Z0-9._-]+$/.test(name)) continue
    fs.writeFileSync(path.join(uploadsDir, name), item.getData())
  }
  return incoming
}

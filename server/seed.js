import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(HERE, 'uploads')

const CATEGORIES = [
  { id: 'cat_basic', name: '基础界面', color: '#5B9DFF' },
  { id: 'cat_business', name: '业务模块', color: '#7FD1C1' },
  { id: 'cat_chart', name: '数据图表', color: '#D9A05B' },
  { id: 'cat_brand', name: '品牌标识', color: '#B79CED' }
]

const makeSvg = (size, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#1E2D3B" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

const SEEDS = [
  { name: '上传箭头', size: 24, cat: 'cat_basic', body: '<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>' },
  { name: '定位圆环', size: 32, cat: 'cat_basic', body: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/>' },
  { name: '搜索放大镜', size: 24, cat: 'cat_basic', body: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4.2-4.2"/>' },
  { name: '设置齿轮', size: 48, cat: 'cat_basic', body: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6m0 13.8v2.6M2.5 12h2.6m13.8 0h2.6M5.3 5.3l1.9 1.9m9.6 9.6 1.9 1.9M18.7 5.3l-1.9 1.9M7.2 16.8l-1.9 1.9"/>' },
  { name: '文件夹', size: 24, cat: 'cat_business', body: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>' },
  { name: '日历', size: 32, cat: 'cat_business', body: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4"/>' },
  { name: '下载托盘', size: 16, cat: 'cat_business', body: '<path d="M12 3v12m0 0 5-5m-5 5-5-5"/><path d="M4 19h16"/>' },
  { name: '警示三角', size: 24, cat: 'cat_business', body: '<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 9.5v4.8m0 3h.01"/>' },
  { name: '趋势折线', size: 48, cat: 'cat_chart', body: '<path d="M3 17.5 8.5 12l4 3 6.5-8"/><path d="M18.5 7H21v2.5"/><path d="M3 21h18"/>' },
  { name: '数据柱', size: 32, cat: 'cat_chart', body: '<path d="M4 20v-9m5 9V5m5 15v-7m5 7V8"/><path d="M2 21h20"/>' },
  { name: '图层叠加', size: 24, cat: 'cat_chart', body: '<rect x="4" y="7" width="12" height="12" rx="2"/><path d="M8 4h9a2 2 0 0 1 2 2v9"/>' },
  { name: '网格点阵', size: 64, cat: 'cat_brand', body: '<g fill="#1E2D3B" stroke="none"><circle cx="6" cy="6" r="1.5"/><circle cx="12" cy="6" r="1.5"/><circle cx="18" cy="6" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="6" cy="18" r="1.5"/><circle cx="12" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></g>' }
]

export function createSeed() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const base = Date.now()
  const createdAt = new Date(base).toISOString()

  const categories = CATEGORIES.map((c, i) => ({ ...c, order: i, createdAt }))

  const icons = SEEDS.map((s, i) => {
    const id = `seed-${String(i + 1).padStart(2, '0')}`
    const file = `${id}.svg`
    const content = makeSvg(s.size, s.body)
    fs.writeFileSync(path.join(UPLOAD_DIR, file), content, 'utf8')
    const time = new Date(base - i * 60_000).toISOString()
    return {
      id,
      name: s.name,
      categoryId: s.cat,
      file,
      mime: 'image/svg+xml',
      width: s.size,
      height: s.size,
      bytes: Buffer.byteLength(content, 'utf8'),
      originalName: `${s.name}.svg`,
      createdAt: time,
      updatedAt: time
    }
  })

  return { version: 1, categories, icons }
}

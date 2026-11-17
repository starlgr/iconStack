async function request(url, options = {}) {
  const response = await fetch(url, options)
  const type = response.headers.get('content-type') || ''
  let payload = null
  try {
    payload = type.includes('application/json') ? await response.json() : await response.text()
  } catch {
    payload = null
  }
  if (!response.ok) {
    throw new Error(payload && payload.error ? payload.error : `请求失败 (${response.status})`)
  }
  return payload
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})

export const api = {
  exportUrl: '/api/backup/export',
  assetUrl: (file) => `/uploads/${encodeURIComponent(file)}`,

  bootstrap: () => request('/api/bootstrap'),

  upload(files, items) {
    const form = new FormData()
    for (const file of files) form.append('files', file)
    form.append('meta', JSON.stringify({ items }))
    return request('/api/icons/upload', { method: 'POST', body: form })
  },

  patchIcon: (id, patch) => request(`/api/icons/${id}`, json('PATCH', patch)),

  replaceFile(id, file, meta) {
    const form = new FormData()
    form.append('file', file)
    form.append('meta', JSON.stringify(meta))
    return request(`/api/icons/${id}/replace`, { method: 'POST', body: form })
  },

  deleteIcon: (id) => request(`/api/icons/${id}`, { method: 'DELETE' }),
  batchDelete: (ids) => request('/api/icons/batch-delete', json('POST', { ids })),
  batchMove: (ids, categoryId) => request('/api/icons/batch-move', json('POST', { ids, categoryId })),
  restore: (records) => request('/api/icons/restore', json('POST', { records })),

  createCategory: (payload) => request('/api/categories', json('POST', payload)),
  patchCategory: (id, patch) => request(`/api/categories/${id}`, json('PATCH', patch)),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),
  reorderCategories: (ids) => request('/api/categories/reorder', json('POST', { ids })),

  importBackup(file) {
    const form = new FormData()
    form.append('archive', file)
    return request('/api/backup/import', { method: 'POST', body: form })
  },

  rawText: async (url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error('读取源文件失败')
    return response.text()
  }
}

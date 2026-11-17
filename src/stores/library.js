import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api/client.js'

export const useLibraryStore = defineStore('library', () => {
  const categories = ref([])
  const icons = ref([])
  const stats = ref({ total: 0, uncategorized: 0, bytes: 0, formats: [] })
  const loading = ref(false)
  const ready = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    try {
      const data = await api.bootstrap()
      categories.value = data.categories
      icons.value = data.icons
      stats.value = data.stats
      ready.value = true
      error.value = ''
    } catch (err) {
      error.value = err.message || '无法连接本地服务'
    } finally {
      loading.value = false
    }
  }

  async function refreshAfter(task) {
    const result = await task()
    await load()
    return result
  }

  const upload = (files, items) => refreshAfter(() => api.upload(files, items))
  const renameIcon = (id, name) => refreshAfter(() => api.patchIcon(id, { name }))
  const changeIconCategory = (id, categoryId) => refreshAfter(() => api.patchIcon(id, { categoryId }))
  const replaceFile = (id, file, meta) => refreshAfter(() => api.replaceFile(id, file, meta))
  const removeIcons = (ids) => refreshAfter(() => api.batchDelete(ids))
  const restoreIcons = (records) => refreshAfter(() => api.restore(records))
  const moveIcons = (ids, categoryId) => refreshAfter(() => api.batchMove(ids, categoryId))
  const createCategory = (payload) => refreshAfter(() => api.createCategory(payload))
  const updateCategory = (id, patch) => refreshAfter(() => api.patchCategory(id, patch))
  const removeCategory = (id) => refreshAfter(() => api.deleteCategory(id))
  const reorderCategories = (ids) => refreshAfter(() => api.reorderCategories(ids))
  const importBackup = (file) => refreshAfter(() => api.importBackup(file))

  function countFor(categoryId) {
    return icons.value.filter((icon) => icon.categoryId === categoryId).length
  }

  const categoryOptions = computed(() =>
    categories.value.map((c) => ({ id: c.id, name: c.name, color: c.color, count: countFor(c.id) }))
  )

  return {
    categories,
    icons,
    stats,
    loading,
    ready,
    error,
    load,
    upload,
    renameIcon,
    changeIconCategory,
    replaceFile,
    removeIcons,
    restoreIcons,
    moveIcons,
    createCategory,
    updateCategory,
    removeCategory,
    reorderCategories,
    importBackup,
    countFor,
    categoryOptions
  }
})

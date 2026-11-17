import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useLibraryStore } from './library.js'
import { extensionOf } from '../utils/format.js'

export const useWorkspaceStore = defineStore('workspace', () => {
  const library = useLibraryStore()

  const query = ref('')
  const categoryId = ref('all')
  const format = ref('all')
  const sizeMin = ref('')
  const sizeMax = ref('')
  const sort = ref('recent')
  const view = ref('grid')
  const selectedIds = ref([])
  const detailId = ref(null)
  const previewScale = ref('fit')
  const sidebarOpen = ref(false)
  const detailOpen = ref(true)
  const dialog = ref(null)
  const toasts = ref([])
  const searchInput = ref(null)

  let anchorIndex = -1
  let toastSeed = 0

  const categoryLabel = computed(() => {
    if (categoryId.value === 'all') return '全部图标'
    if (categoryId.value === 'uncategorized') return '未分类'
    const hit = library.categories.find((c) => c.id === categoryId.value)
    return hit ? hit.name : '全部图标'
  })

  const availableFormats = computed(() =>
    [...new Set(library.icons.map((icon) => extensionOf(icon.mime)))].sort()
  )

  const filteredIcons = computed(() => {
    let list = [...library.icons]
    if (categoryId.value === 'uncategorized') {
      list = list.filter((icon) => !icon.categoryId)
    } else if (categoryId.value !== 'all') {
      list = list.filter((icon) => icon.categoryId === categoryId.value)
    }

    const q = query.value.trim().toLowerCase()
    if (q) {
      list = list.filter((icon) =>
        [icon.name, icon.originalName, extensionOf(icon.mime), `${icon.width}x${icon.height}`]
          .some((value) => String(value || '').toLowerCase().includes(q))
      )
    }
    if (format.value !== 'all') {
      list = list.filter((icon) => extensionOf(icon.mime).toLowerCase() === format.value)
    }
    const min = Number(sizeMin.value) || 0
    const max = Number(sizeMax.value) || Infinity
    if (min > 0 || max !== Infinity) {
      list = list.filter((icon) => {
        const edge = Math.max(icon.width || 0, icon.height || 0)
        return edge >= min && edge <= max
      })
    }

    const collator = new Intl.Collator('zh-CN')
    switch (sort.value) {
      case 'name':
        list.sort((a, b) => collator.compare(a.name, b.name))
        break
      case 'size':
        list.sort((a, b) => (b.bytes || 0) - (a.bytes || 0))
        break
      case 'dimensions':
        list.sort((a, b) => b.width * b.height - a.width * a.height)
        break
      case 'oldest':
        list.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        break
      default:
        list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    }
    return list
  })

  const selectedSet = computed(() => new Set(selectedIds.value))
  const selectedIcons = computed(() => library.icons.filter((icon) => selectedSet.value.has(icon.id)))
  const allVisibleSelected = computed(
    () => filteredIcons.value.length > 0 && filteredIcons.value.every((icon) => selectedSet.value.has(icon.id))
  )
  const detailIcon = computed(() => library.icons.find((icon) => icon.id === detailId.value) || null)
  const hasFilters = computed(
    () => Boolean(query.value || format.value !== 'all' || sizeMin.value || sizeMax.value || sort.value !== 'recent')
  )

  function setCategory(id) {
    categoryId.value = id
    clearSelection()
    sidebarOpen.value = false
  }

  function toggleSelect(id, shiftKey = false) {
    const list = filteredIcons.value
    const index = list.findIndex((icon) => icon.id === id)
    if (shiftKey && anchorIndex >= 0) {
      const [from, to] = [anchorIndex, index].sort((a, b) => a - b)
      const range = list.slice(from, to + 1).map((icon) => icon.id)
      selectedIds.value = [...new Set([...selectedIds.value, ...range])]
    } else {
      const next = new Set(selectedIds.value)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      selectedIds.value = [...next]
      anchorIndex = index
    }
  }

  function toggleSelectAll() {
    if (allVisibleSelected.value) selectedIds.value = []
    else selectedIds.value = filteredIcons.value.map((icon) => icon.id)
    anchorIndex = -1
  }

  function clearSelection() {
    selectedIds.value = []
    anchorIndex = -1
  }

  function openDetail(id) {
    detailId.value = id
    detailOpen.value = true
    previewScale.value = 'fit'
  }

  function closeDetail() {
    detailOpen.value = false
    detailId.value = null
  }

  function openDialog(type, payload = {}) {
    dialog.value = { type, payload }
  }

  function closeDialog() {
    dialog.value = null
  }

  function resetFilters() {
    query.value = ''
    format.value = 'all'
    sizeMin.value = ''
    sizeMax.value = ''
    sort.value = 'recent'
  }

  function toast(message, type = 'info', action = null) {
    const id = ++toastSeed
    toasts.value.push({ id, message, type, action })
    window.setTimeout(() => dismissToast(id), action ? 9000 : 4600)
    return id
  }

  function dismissToast(id) {
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }

  return {
    query,
    categoryId,
    format,
    sizeMin,
    sizeMax,
    sort,
    view,
    selectedIds,
    detailId,
    previewScale,
    sidebarOpen,
    detailOpen,
    dialog,
    toasts,
    searchInput,
    categoryLabel,
    availableFormats,
    filteredIcons,
    selectedSet,
    selectedIcons,
    allVisibleSelected,
    detailIcon,
    hasFilters,
    setCategory,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    openDetail,
    closeDetail,
    openDialog,
    closeDialog,
    resetFilters,
    toast,
    dismissToast
  }
})

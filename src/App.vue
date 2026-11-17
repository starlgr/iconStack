<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useLibraryStore } from './stores/library.js'
import { useWorkspaceStore } from './stores/workspace.js'
import AppHeader from './components/AppHeader.vue'
import CategorySidebar from './components/CategorySidebar.vue'
import WorkspaceToolbar from './components/WorkspaceToolbar.vue'
import IconGrid from './components/IconGrid.vue'
import DetailPanel from './components/DetailPanel.vue'
import BatchBar from './components/BatchBar.vue'
import UploadDialog from './components/UploadDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import CategoryDialog from './components/CategoryDialog.vue'
import ToastStack from './components/ToastStack.vue'

const library = useLibraryStore()
const ws = useWorkspaceStore()

const showDetail = computed(() => ws.detailOpen && Boolean(ws.detailIcon))

watch(
  () => library.icons,
  (icons) => {
    if (ws.detailOpen && !ws.detailIcon && icons.length) {
      ws.detailId = ws.filteredIcons[0].id
    }
  },
  { immediate: true }
)

function isTypingTarget(target) {
  if (!target) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}

function openUpload() {
  ws.openDialog('upload', { categoryId: ws.categoryId })
}

function requestBatchDelete() {
  const ids = [...ws.selectedIds]
  if (!ids.length) return
  const names = library.icons.filter((icon) => ids.includes(icon.id)).map((icon) => icon.name)
  ws.openDialog('confirm', {
    title: `删除 ${ids.length} 枚图标？`,
    description: '删除后可在右下角提示条中撤销，图标文件会暂时保留以便恢复。',
    confirmText: `删除 ${ids.length} 枚`,
    tone: 'danger',
    items: names,
    onConfirm: () => performDelete(ids)
  })
}

function requestDeleteOne(icon) {
  ws.openDialog('confirm', {
    title: `删除「${icon.name}」？`,
    description: '删除后可在右下角提示条中撤销。',
    confirmText: '删除图标',
    tone: 'danger',
    items: [icon.name],
    onConfirm: () => performDelete([icon.id])
  })
}

async function performDelete(ids) {
  const result = await library.removeIcons(ids)
  const deleted = result.deleted || []
  ws.clearSelection()
  ws.toast(`已删除 ${deleted.length} 枚图标`, 'success', {
    label: '撤销',
    run: async () => {
      await library.restoreIcons(deleted)
      ws.toast(`已恢复 ${deleted.length} 枚图标`, 'success')
    }
  })
}

function handleImport(file) {
  ws.openDialog('confirm', {
    title: '用备份包替换当前图标库？',
    description: `将读取「${file.name}」中的分类与图标，覆盖当前列表。当前 library.json 会自动留存一份 .backup 副本。`,
    confirmText: '确认导入',
    tone: 'danger',
    onConfirm: async () => {
      await library.importBackup(file)
      ws.clearSelection()
      ws.closeDetail()
      ws.setCategory('all')
      ws.toast('备份已导入', 'success')
    }
  })
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    if (ws.dialog) ws.closeDialog()
    else if (ws.detailOpen) ws.closeDetail()
    else if (ws.selectedIds.length) ws.clearSelection()
    else if (ws.sidebarOpen) ws.sidebarOpen = false
    return
  }
  if (ws.dialog) return

  const typing = isTypingTarget(event.target)
  if (event.key === '/' && !typing) {
    event.preventDefault()
    ws.searchInput?.focus()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && !typing) {
    event.preventDefault()
    ws.selectedIds = ws.filteredIcons.map((icon) => icon.id)
    return
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && !typing && ws.selectedIds.length) {
    event.preventDefault()
    requestBatchDelete()
  }
}

onMounted(() => {
  library.load()
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="app-shell">
    <AppHeader @upload="openUpload" @import="handleImport" @toggle-sidebar="ws.sidebarOpen = !ws.sidebarOpen" />

    <div class="app-body" :class="{ 'with-detail': showDetail }">
      <CategorySidebar @close="ws.sidebarOpen = false" />

      <main class="workspace">
        <WorkspaceToolbar />
        <IconGrid @upload="openUpload" />
        <BatchBar v-if="ws.selectedIds.length" @request-delete="requestBatchDelete" />
      </main>

      <DetailPanel v-if="showDetail" @close="ws.closeDetail" @request-delete="requestDeleteOne" />
    </div>

    <div v-if="ws.sidebarOpen" class="mobile-scrim" @click="ws.sidebarOpen = false"></div>

    <UploadDialog v-if="ws.dialog?.type === 'upload'" :payload="ws.dialog.payload" @close="ws.closeDialog()" />
    <ConfirmDialog v-if="ws.dialog?.type === 'confirm'" :payload="ws.dialog.payload" @close="ws.closeDialog()" />
    <CategoryDialog v-if="ws.dialog?.type === 'category'" :payload="ws.dialog.payload" @close="ws.closeDialog()" />
    <ToastStack />
  </div>
</template>

<style scoped>
.app-shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.app-body {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr) 0;
  transition: grid-template-columns 0.2s ease;
}
.app-body.with-detail { grid-template-columns: var(--sidebar-w) minmax(0, 1fr) var(--detail-w); }
.workspace {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--ink-830);
}
.mobile-scrim { display: none; }
@media (max-width: 1280px) {
  .app-shell { --sidebar-w: 222px; --detail-w: 296px; }
}
@media (max-width: 1080px) {
  .app-body, .app-body.with-detail { grid-template-columns: var(--sidebar-w) minmax(0, 1fr); }
}
@media (max-width: 860px) {
  .app-body, .app-body.with-detail { grid-template-columns: minmax(0, 1fr); }
  .mobile-scrim {
    display: block;
    position: fixed;
    inset: var(--header-h) 0 0 0;
    z-index: 40;
    background: rgba(4, 9, 14, 0.6);
  }
}
</style>

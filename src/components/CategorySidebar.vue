<script setup>
import { computed, ref } from 'vue'
import { useLibraryStore } from '../stores/library.js'
import { useWorkspaceStore } from '../stores/workspace.js'
import { formatBytes } from '../utils/format.js'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['close'])
const library = useLibraryStore()
const ws = useWorkspaceStore()
const dragOverId = ref('')

const quickItems = computed(() => [
  { id: 'all', label: '全部图标', icon: 'grid', count: library.icons.length },
  { id: 'uncategorized', label: '未分类', icon: 'inbox', count: library.icons.filter((i) => !i.categoryId).length }
])

function onQuickDragOver(item) {
  if (item.id === 'uncategorized') dragOverId.value = item.id
}

function onCategoryDragOver(category) {
  dragOverId.value = category.id
}

function clearDragOver() {
  dragOverId.value = ''
}

function onCategoryDragStart(event, category) {
  event.dataTransfer.setData('application/x-iconstack-category', category.id)
  event.dataTransfer.effectAllowed = 'move'
}

function reorder(sourceId, targetId) {
  if (sourceId === targetId) return
  const ids = library.categories.map((c) => c.id)
  const from = ids.indexOf(sourceId)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0) return
  ids.splice(to, 0, ids.splice(from, 1)[0])
  library.reorderCategories(ids)
}

async function onDrop(event, targetId) {
  dragOverId.value = ''
  const categoryId = event.dataTransfer.getData('application/x-iconstack-category')
  if (categoryId && targetId !== 'all' && targetId !== 'uncategorized') {
    reorder(categoryId, targetId)
    return
  }
  const raw = event.dataTransfer.getData('application/x-iconstack-icons')
  if (!raw || (targetId !== 'uncategorized' && targetId !== 'all' && !library.categories.some((c) => c.id === targetId))) return
  if (targetId === 'all') return
  let ids = []
  try {
    ids = JSON.parse(raw)
  } catch {
    return
  }
  if (!ids.length) return
  const destination = targetId === 'uncategorized' ? null : targetId
  const label = destination ? library.categories.find((c) => c.id === destination)?.name : '未分类'
  try {
    await library.moveIcons(ids, destination)
    ws.clearSelection()
    ws.toast(`已将 ${ids.length} 枚图标移到「${label}」`, 'success')
  } catch (error) {
    ws.toast(error.message || '移动失败', 'error')
  }
}

function requestDeleteCategory(category) {
  ws.openDialog('confirm', {
    title: `删除分类「${category.name}」？`,
    description: `该分类下的 ${library.countFor(category.id)} 枚图标会转入「未分类」，图标本身不会被删除。`,
    confirmText: '删除分类',
    tone: 'danger',
    onConfirm: async () => {
      await library.removeCategory(category.id)
      if (ws.categoryId === category.id) ws.setCategory('all')
      ws.toast('分类已删除，图标已转入未分类', 'success')
    }
  })
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-open': ws.sidebarOpen }">
    <div class="side-head">
      <span class="eyebrow">分类</span>
      <div class="side-head-actions">
        <button class="icon-btn side-add" type="button" title="新建分类" @click="ws.openDialog('category', { mode: 'create' })">
          <AppIcon name="plus" :size="15" />
        </button>
        <button class="icon-btn side-close" type="button" aria-label="收起分类" @click="emit('close')">
          <AppIcon name="close" :size="15" />
        </button>
      </div>
    </div>

    <nav class="side-nav" aria-label="图标分类">
      <button
        v-for="item in quickItems"
        :key="item.id"
        class="nav-row"
        :class="{ 'is-active': ws.categoryId === item.id, 'is-drop': dragOverId === item.id }"
        type="button"
        @click="ws.setCategory(item.id)"
        @dragover.prevent="onQuickDragOver(item)"
        @dragleave="clearDragOver"
        @drop.prevent="onDrop($event, item.id)"
      >
        <AppIcon :name="item.icon" :size="15" />
        <span class="nav-label">{{ item.label }}</span>
        <span class="nav-count mono">{{ item.count }}</span>
      </button>

      <div class="side-divider"><span>自定义分类</span></div>

      <div
        v-for="category in library.categories"
        :key="category.id"
        class="nav-row cat-row"
        :class="{ 'is-active': ws.categoryId === category.id, 'is-drop': dragOverId === category.id }"
        draggable="true"
        role="button"
        tabindex="0"
        @click="ws.setCategory(category.id)"
        @keydown.enter="ws.setCategory(category.id)"
        @dragstart="onCategoryDragStart($event, category)"
        @dragover.prevent="onCategoryDragOver(category)"
        @dragleave="clearDragOver"
        @drop.prevent.stop="onDrop($event, category.id)"
      >
        <span class="cat-dot" :style="{ background: category.color }"></span>
        <span class="nav-label">{{ category.name }}</span>
        <span class="nav-count mono">{{ library.countFor(category.id) }}</span>
        <span class="cat-tools">
          <button class="icon-btn tiny" type="button" title="重命名与改色" @click.stop="ws.openDialog('category', { mode: 'edit', category })">
            <AppIcon name="edit" :size="13" />
          </button>
          <button class="icon-btn tiny" type="button" title="删除分类" @click.stop="requestDeleteCategory(category)">
            <AppIcon name="trash" :size="13" />
          </button>
        </span>
      </div>

      <button class="side-create" type="button" @click="ws.openDialog('category', { mode: 'create' })">
        <AppIcon name="plus" :size="14" /> 新建分类
      </button>
    </nav>

    <div class="side-foot">
      <div class="side-kv"><span>图标总数</span><b class="mono">{{ library.icons.length }}</b></div>
      <div class="side-kv"><span>占用空间</span><b class="mono">{{ formatBytes(library.stats.bytes) }}</b></div>
      <div class="side-kv"><span>文件格式</span><b class="mono">{{ (library.stats.formats || []).join(' · ') || '—' }}</b></div>
      <p class="side-hint"><AppIcon name="info" :size="12" /> 数据保存在本机服务目录，可用顶栏「导出」备份</p>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--ink-850);
  border-right: 1px solid var(--line);
  overflow: hidden;
}
.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 18px 10px 20px;
  flex: none;
}
.side-head-actions { display: flex; gap: 2px; }
.side-add { color: var(--blue); }
.side-close { display: none; }
.side-nav { padding: 0 10px 16px; overflow-y: auto; min-height: 0; flex: 1; }
.nav-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 37px;
  padding: 0 10px 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  color: var(--text-2);
  font-size: 12.5px;
  text-align: left;
  transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}
.nav-row:hover { background: var(--ink-750); color: var(--text); }
.nav-row.is-active {
  background: var(--blue-dim);
  border-color: rgba(91, 157, 255, 0.28);
  color: var(--text);
}
.nav-row.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  bottom: 7px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--blue);
}
.nav-row.is-drop { border-color: var(--blue); background: rgba(91, 157, 255, 0.16); }
.nav-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-count { font-size: 11px; color: var(--text-3); }
.nav-row.is-active .nav-count { color: var(--blue-soft); }
.cat-row { cursor: grab; }
.cat-row:active { cursor: grabbing; }
.cat-dot { width: 8px; height: 8px; border-radius: 3px; flex: none; margin-left: 3px; margin-right: 4px; }
.cat-tools {
  position: absolute;
  right: 6px;
  top: 4px;
  display: none;
  align-items: center;
  gap: 1px;
  padding-left: 6px;
  background: var(--ink-750);
  border-radius: 5px;
}
.cat-row:hover .cat-tools, .cat-row:focus-within .cat-tools { display: flex; }
.cat-row:hover .nav-count { visibility: hidden; }
.cat-row.is-active .cat-tools { background: var(--blue-dim); }
.icon-btn.tiny { width: 24px; height: 24px; }
.side-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 12px 8px;
  color: var(--text-3);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.side-divider::after { content: ''; flex: 1; height: 1px; background: var(--line-soft); }
.side-create {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  height: 34px;
  margin-top: 8px;
  padding: 0 12px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-sm);
  color: var(--text-3);
  font-size: 12px;
  transition: color 0.14s ease, border-color 0.14s ease, background 0.14s ease;
}
.side-create:hover { color: var(--blue); border-color: rgba(91, 157, 255, 0.5); background: var(--blue-wash); }
.side-foot {
  flex: none;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--line-soft);
  background: var(--ink-830);
}
.side-kv { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--text-3); padding: 3px 0; }
.side-kv b { color: var(--text-2); font-weight: 500; font-size: 11.5px; }
.side-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 12px 0 0;
  font-size: 11px;
  line-height: 1.55;
  color: var(--text-3);
}
.side-hint svg { flex: none; margin-top: 2px; }
@media (max-width: 860px) {
  .sidebar {
    position: fixed;
    top: var(--header-h);
    bottom: 0;
    left: 0;
    width: 268px;
    z-index: 45;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 16px 0 40px rgba(0, 0, 0, 0.4);
  }
  .sidebar.is-open { transform: none; }
  .side-close { display: inline-flex; }
}
</style>

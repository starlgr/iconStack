<script setup>
import { computed } from 'vue'
import { useLibraryStore } from '../stores/library.js'
import { useWorkspaceStore } from '../stores/workspace.js'
import AppIcon from './AppIcon.vue'

const library = useLibraryStore()
const ws = useWorkspaceStore()

const subtitle = computed(() => {
  const total = library.icons.length
  const shown = ws.filteredIcons.length
  if (ws.hasFilters || ws.categoryId !== 'all') return `共 ${total} 枚 · 当前显示 ${shown} 枚`
  return `共 ${total} 枚图标 · 按添加时间排列`
})

function toggleDetail() {
  if (ws.detailOpen) ws.closeDetail()
  else if (ws.filteredIcons.length) ws.openDetail(ws.filteredIcons[0].id)
  else ws.toast('当前没有可查看的图标', 'info')
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-top">
      <div class="title-group">
        <h1 class="view-title">{{ ws.categoryLabel }}</h1>
        <p class="view-subtitle">{{ subtitle }}</p>
      </div>
      <div class="top-actions">
        <button class="btn btn-sm btn-ghost select-all" type="button" @click="ws.toggleSelectAll()">
          <AppIcon :name="ws.allVisibleSelected ? 'checkCircle' : 'check'" :size="14" />
          {{ ws.allVisibleSelected ? '取消全选' : '全选' }}
        </button>
        <div class="segmented" role="group" aria-label="视图切换">
          <button class="segment" :class="{ 'is-on': ws.view === 'grid' }" type="button" title="网格视图" @click="ws.view = 'grid'">
            <AppIcon name="grid" :size="14" />
          </button>
          <button class="segment" :class="{ 'is-on': ws.view === 'list' }" type="button" title="列表视图" @click="ws.view = 'list'">
            <AppIcon name="list" :size="14" />
          </button>
        </div>
        <button class="icon-btn" :class="{ 'is-active': ws.detailOpen }" type="button" title="详情检视面板" @click="toggleDetail">
          <AppIcon name="panel" :size="16" />
        </button>
      </div>
    </div>

    <div class="toolbar-filters">
      <div class="filter-control">
        <AppIcon name="filter" :size="14" />
        <select v-model="ws.format" class="field" aria-label="按格式筛选">
          <option value="all">全部格式</option>
          <option v-for="item in ws.availableFormats" :key="item" :value="item.toLowerCase()">{{ item }}</option>
        </select>
      </div>

      <div class="size-control" title="按最长边像素筛选">
        <AppIcon name="ruler" :size="14" />
        <input v-model="ws.sizeMin" class="field size-input" type="number" min="0" placeholder="最小" aria-label="最小尺寸" />
        <span class="size-dash">–</span>
        <input v-model="ws.sizeMax" class="field size-input" type="number" min="0" placeholder="最大" aria-label="最大尺寸" />
        <span class="size-unit">px</span>
      </div>

      <div class="filter-control sort-control">
        <AppIcon name="sort" :size="14" />
        <select v-model="ws.sort" class="field" aria-label="排序方式">
          <option value="recent">最近添加</option>
          <option value="oldest">最早添加</option>
          <option value="name">名称 A–Z</option>
          <option value="dimensions">尺寸从大到小</option>
          <option value="size">文件从大到小</option>
        </select>
      </div>

      <button v-if="ws.hasFilters" class="btn btn-sm btn-ghost clear-btn" type="button" @click="ws.resetFilters()">
        <AppIcon name="close" :size="13" /> 清除筛选
      </button>

      <span class="filter-count mono">{{ ws.filteredIcons.length }} / {{ library.icons.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.toolbar { flex: none; padding: 22px 26px 0; }
.toolbar-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.title-group { min-width: 0; }
.view-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--text);
  line-height: 1.3;
}
.view-subtitle { margin: 3px 0 0; font-size: 11.5px; color: var(--text-3); }
.top-actions { display: flex; align-items: center; gap: 8px; }
.select-all { color: var(--text-3); }
.segmented {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--ink-850);
}
.segment {
  width: 27px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  color: var(--text-3);
  transition: background 0.14s ease, color 0.14s ease;
}
.segment:hover { color: var(--text); }
.segment.is-on { background: var(--ink-700); color: var(--blue); }
.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 18px 0 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line-soft);
}
.filter-control, .size-control { display: flex; align-items: center; gap: 7px; color: var(--text-3); }
.filter-control .field { width: 128px; height: 31px; background: var(--ink-850); }
.filter-control > svg, .size-control > svg { flex: none; }
.size-input { width: 68px; height: 31px; padding: 0 8px; text-align: center; }
.size-input::-webkit-inner-spin-button { appearance: none; }
.size-dash { color: var(--text-3); font-size: 12px; }
.size-unit { font-family: var(--font-mono); font-size: 11px; color: var(--text-3); }
.clear-btn { color: var(--blue); }
.filter-count { margin-left: auto; font-size: 11px; color: var(--text-3); white-space: nowrap; }
@media (max-width: 1000px) { .filter-count { display: none; } }
@media (max-width: 700px) {
  .toolbar { padding: 16px 14px 0; }
  .view-title { font-size: 18px; }
  .toolbar-filters { gap: 8px; margin-top: 14px; }
  .filter-control .field { width: 108px; }
}
</style>

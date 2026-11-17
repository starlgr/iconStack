<script setup>
import { markRaw, onMounted, ref } from 'vue'
import { useLibraryStore } from '../stores/library.js'
import { useWorkspaceStore } from '../stores/workspace.js'
import { api } from '../api/client.js'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['upload', 'import', 'toggle-sidebar'])
const library = useLibraryStore()
const ws = useWorkspaceStore()
const searchEl = ref(null)
const importEl = ref(null)

onMounted(() => {
  if (searchEl.value) ws.searchInput = markRaw(searchEl.value)
})

function onImportChange(event) {
  const file = event.target.files && event.target.files[0]
  if (file) emit('import', file)
  event.target.value = ''
}
</script>

<template>
  <header class="app-header">
    <div class="brand-block">
      <button class="mobile-menu icon-btn" type="button" aria-label="打开分类" @click="emit('toggle-sidebar')">
        <AppIcon name="menu" :size="18" />
      </button>
      <div class="brand-mark"><AppIcon name="layers" :size="17" /></div>
      <div class="brand-copy">
        <span class="brand-name">iconStack</span>
        <span class="brand-divider"></span>
        <span class="brand-sub">图标资产台</span>
      </div>
    </div>

    <div class="header-search">
      <AppIcon name="search" :size="15" />
      <input
        ref="searchEl"
        v-model="ws.query"
        class="search-input"
        type="search"
        placeholder="搜索名称、原文件名或尺寸…"
        aria-label="搜索图标"
      />
      <kbd class="kbd">/</kbd>
    </div>

    <div class="header-actions">
      <span class="header-stat mono" :title="`共 ${library.stats.total} 枚图标`">{{ library.stats.total }} 枚</span>
      <span class="header-sep"></span>
      <a class="btn btn-sm btn-ghost header-tool" :href="api.exportUrl" download title="导出整库 ZIP 备份">
        <AppIcon name="package" :size="15" /><span>导出</span>
      </a>
      <button class="btn btn-sm btn-ghost header-tool" type="button" title="导入 ZIP 备份" @click="importEl?.click()">
        <AppIcon name="import" :size="15" /><span>导入</span>
      </button>
      <input ref="importEl" class="sr-only" type="file" accept=".zip" @change="onImportChange" />
      <button class="btn btn-primary btn-sm upload-btn" type="button" @click="emit('upload')">
        <AppIcon name="plus" :size="15" /><span>上传图标</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 22px 0 20px;
  background: var(--ink-800);
  border-bottom: 1px solid var(--line);
  position: relative;
  z-index: 20;
}
.brand-block { display: flex; align-items: center; gap: 11px; flex: none; min-width: 216px; }
.brand-mark {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--blue);
  color: #081524;
}
.brand-copy { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.brand-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
}
.brand-divider { width: 1px; height: 14px; background: var(--line); }
.brand-sub { font-size: 11.5px; color: var(--text-3); }
.header-search {
  display: flex;
  align-items: center;
  gap: 9px;
  width: min(360px, 34vw);
  height: 34px;
  padding: 0 10px 0 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--ink-850);
  color: var(--text-3);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}
.header-search:focus-within { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(91, 157, 255, 0.1); }
.search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 12.5px;
}
.search-input::placeholder { color: var(--text-3); }
.search-input::-webkit-search-cancel-button { filter: invert(0.6); }
.header-actions { display: flex; align-items: center; gap: 7px; margin-left: auto; flex: none; }
.header-stat { font-size: 11.5px; color: var(--text-3); padding-right: 4px; }
.header-sep { width: 1px; height: 20px; background: var(--line); margin: 0 4px; }
.upload-btn { margin-left: 4px; }
.mobile-menu { display: none; }
@media (max-width: 1180px) {
  .brand-block { min-width: auto; }
  .brand-sub, .brand-divider, .header-stat { display: none; }
  .header-search { width: min(300px, 30vw); }
}
@media (max-width: 860px) {
  .app-header { gap: 12px; padding: 0 12px; }
  .mobile-menu { display: inline-flex; }
  .header-search { flex: 1; width: auto; }
  .header-tool span { display: none; }
  .header-tool { width: 30px; padding: 0; }
  .header-sep { display: none; }
}
@media (max-width: 560px) {
  .brand-name { display: none; }
  .header-search { min-width: 0; }
  .upload-btn span { display: none; }
  .upload-btn { width: 32px; padding: 0; }
}
</style>

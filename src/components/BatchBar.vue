<script setup>
import { ref } from 'vue'
import { useLibraryStore } from '../stores/library.js'
import { useWorkspaceStore } from '../stores/workspace.js'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['request-delete'])
const library = useLibraryStore()
const ws = useWorkspaceStore()
const target = ref('')
const busy = ref(false)

async function applyMove() {
  const ids = [...ws.selectedIds]
  if (!ids.length) return
  if (!target.value) {
    ws.toast('请先选择要移动到的分类', 'info')
    return
  }
  busy.value = true
  const destination = target.value === 'none' ? null : target.value
  const label = destination ? library.categories.find((c) => c.id === destination)?.name : '未分类'
  try {
    await library.moveIcons(ids, destination)
    ws.clearSelection()
    ws.toast(`已将 ${ids.length} 枚图标移到「${label}」`, 'success')
  } catch (error) {
    ws.toast(error.message || '移动失败', 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="batch-bar">
    <span class="batch-count"><b class="mono">{{ ws.selectedIds.length }}</b> 枚已选</span>
    <span class="batch-sep"></span>
    <button class="batch-link" type="button" @click="ws.toggleSelectAll()">全选当前</button>
    <button class="batch-link" type="button" @click="ws.clearSelection()">取消选择</button>
    <span class="batch-gap"></span>
    <label class="batch-label" for="batch-target">移动至</label>
    <select id="batch-target" v-model="target" class="field batch-select">
      <option value="" disabled>选择目标分类…</option>
      <option value="none">未分类</option>
      <option v-for="category in library.categories" :key="category.id" :value="category.id">{{ category.name }}</option>
    </select>
    <button class="btn btn-sm batch-move" type="button" :disabled="busy" @click="applyMove">
      <AppIcon name="move" :size="14" /> 移动
    </button>
    <button class="btn btn-sm btn-danger" type="button" @click="emit('request-delete')">
      <AppIcon name="trash" :size="14" /> 删除
    </button>
    <button class="icon-btn batch-close" type="button" aria-label="清空选择" @click="ws.clearSelection()">
      <AppIcon name="close" :size="15" />
    </button>
  </div>
</template>

<style scoped>
.batch-bar {
  position: absolute;
  left: 50%;
  bottom: 22px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(91, 157, 255, 0.46);
  border-radius: 12px;
  background: #1b3148;
  transform: translateX(-50%);
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.5);
  animation: slide-up 0.2s ease both;
  white-space: nowrap;
}
.batch-count { font-size: 12.5px; color: var(--text-2); }
.batch-count b { color: var(--blue); font-size: 14px; margin-right: 3px; }
.batch-sep { width: 1px; height: 20px; background: var(--line); }
.batch-link { color: var(--text-3); font-size: 11.5px; }
.batch-link:hover { color: var(--blue); }
.batch-gap { width: 6px; }
.batch-label { font-size: 11.5px; color: var(--text-3); }
.batch-select { width: 132px; height: 30px; font-size: 12px; background-color: var(--ink-850); }
.batch-move { color: var(--blue-soft); border-color: rgba(91, 157, 255, 0.4); }
.batch-close { width: 26px; height: 26px; }
@media (max-width: 1080px) {
  .batch-bar { gap: 7px; padding: 9px; }
  .batch-link, .batch-gap, .batch-close { display: none; }
}
@media (max-width: 700px) {
  .batch-bar { left: 12px; right: 12px; transform: none; animation: rise 0.2s ease both; flex-wrap: wrap; }
  .batch-select { width: 100px; }
  .batch-label { display: none; }
}
</style>

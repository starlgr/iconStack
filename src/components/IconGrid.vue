<script setup>
import { useLibraryStore } from '../stores/library.js'
import { useWorkspaceStore } from '../stores/workspace.js'
import AppIcon from './AppIcon.vue'
import IconCard from './IconCard.vue'

const emit = defineEmits(['upload'])
const library = useLibraryStore()
const ws = useWorkspaceStore()
</script>

<template>
  <div class="grid-scroll">
    <div v-if="library.loading && !library.ready" class="state-panel">
      <span class="state-mark"><AppIcon name="refresh" :size="22" /></span>
      <h2>正在读取图标库…</h2>
      <p>从本机服务加载分类与图标元数据</p>
    </div>

    <div v-else-if="library.error" class="state-panel">
      <span class="state-mark state-error"><AppIcon name="alert" :size="22" /></span>
      <h2>连接本地服务失败</h2>
      <p>{{ library.error }}</p>
      <button class="btn btn-sm" type="button" @click="library.load()"><AppIcon name="refresh" :size="14" /> 重试</button>
    </div>

    <div v-else-if="!library.icons.length" class="state-panel">
      <span class="state-mark"><AppIcon name="upload" :size="22" /></span>
      <h2>库里还没有图标</h2>
      <p>拖入 PNG、SVG 等图标文件，自定义命名后即可归档浏览</p>
      <button class="btn btn-primary btn-sm" type="button" @click="emit('upload')"><AppIcon name="plus" :size="14" /> 上传第一批图标</button>
    </div>

    <div v-else-if="!ws.filteredIcons.length" class="state-panel">
      <span class="state-mark"><AppIcon name="search" :size="22" /></span>
      <h2>没有匹配的图标</h2>
      <p>换个关键词，或清除当前筛选条件</p>
      <button class="btn btn-sm" type="button" @click="ws.resetFilters()"><AppIcon name="close" :size="14" /> 清除筛选</button>
    </div>

    <template v-else>
      <div v-if="ws.view === 'list'" class="list-head">
        <span></span><span></span><span>名称</span><span>分类</span><span>尺寸</span><span>体积</span><span>格式</span><span>添加于</span><span></span>
      </div>
      <div :class="ws.view === 'grid' ? 'card-grid' : 'card-list'">
        <IconCard
          v-for="icon in ws.filteredIcons"
          :key="icon.id"
          :icon="icon"
          :view="ws.view"
          :selected="ws.selectedSet.has(icon.id)"
          @select="ws.toggleSelect"
          @open="ws.openDetail"
        />
      </div>
      <p class="grid-foot mono">显示 {{ ws.filteredIcons.length }} 枚 · 共 {{ library.icons.length }} 枚</p>
    </template>
  </div>
</template>

<style scoped>
.grid-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 26px 26px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 14px; }
.card-list { display: flex; flex-direction: column; gap: 7px; }
.list-head {
  display: grid;
  grid-template-columns: 22px 42px minmax(120px, 1.7fr) minmax(90px, 1fr) 110px 90px 62px 92px 18px;
  gap: 12px;
  padding: 0 14px 8px;
  color: var(--text-3);
  font-size: 10.5px;
  letter-spacing: 0.08em;
}
.grid-foot { margin: 18px 0 0; text-align: center; font-size: 11px; color: var(--text-3); }
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 300px;
  height: 100%;
  text-align: center;
}
.state-mark {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--ink-800);
  color: var(--blue);
  margin-bottom: 6px;
}
.state-error { color: var(--danger); }
.state-panel h2 { margin: 0; font-family: var(--font-display); font-size: 16px; font-weight: 600; color: var(--text); }
.state-panel p { margin: 0 0 12px; font-size: 12.5px; color: var(--text-3); }
@media (max-width: 1080px) {
  .list-head { grid-template-columns: 22px 42px minmax(100px, 1.4fr) minmax(80px, 1fr) 100px 70px 18px; }
  .list-head span:nth-child(7), .list-head span:nth-child(8) { display: none; }
}
@media (max-width: 700px) {
  .grid-scroll { padding: 4px 14px 20px; }
  .card-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
  .list-head { display: none; }
}
</style>

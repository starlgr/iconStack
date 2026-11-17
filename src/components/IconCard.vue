<script setup>
import { computed } from 'vue'
import { useLibraryStore } from '../stores/library.js'
import { useWorkspaceStore } from '../stores/workspace.js'
import { api } from '../api/client.js'
import { extensionOf, formatBytes, formatDate } from '../utils/format.js'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  icon: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  view: { type: String, default: 'grid' }
})
const emit = defineEmits(['select', 'open'])

const library = useLibraryStore()
const ws = useWorkspaceStore()

const src = computed(() => api.assetUrl(props.icon.file))
const categoryName = computed(() => library.categories.find((c) => c.id === props.icon.categoryId)?.name || '未分类')

function onDragStart(event, id) {
  const ids = ws.selectedSet.has(id) ? ws.selectedIds : [id]
  event.dataTransfer.setData('application/x-iconstack-icons', JSON.stringify(ids))
  event.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <article
    v-if="view === 'grid'"
    class="icon-card"
    :class="{ 'is-selected': selected, 'is-active': ws.detailId === icon.id && ws.detailOpen }"
    draggable="true"
    tabindex="0"
    role="button"
    :aria-label="`查看 ${icon.name}`"
    @click="emit('open', icon.id)"
    @keydown.enter="emit('open', icon.id)"
    @dragstart="onDragStart($event, icon.id)"
  >
    <button
      class="card-check"
      :class="{ 'is-checked': selected }"
      type="button"
      :aria-label="selected ? '取消选中' : '选中'"
      @click.stop="emit('select', icon.id, $event.shiftKey)"
    >
      <AppIcon v-if="selected" name="check" :size="11" />
    </button>

    <div class="paper">
      <span class="corner corner-tl"></span>
      <span class="corner corner-br"></span>
      <img :src="src" :alt="icon.name" loading="lazy" draggable="false" />
      <span class="ruler"></span>
      <span class="paper-size mono">{{ icon.width }}×{{ icon.height }}</span>
    </div>

    <div class="card-meta">
      <span class="card-name" :title="icon.name">{{ icon.name }}</span>
      <div class="card-spec">
        <span class="tag">{{ extensionOf(icon.mime) }}</span>
        <span class="card-dim mono">{{ icon.width }} × {{ icon.height }}</span>
      </div>
    </div>
  </article>

  <article
    v-else
    class="icon-row"
    :class="{ 'is-selected': selected, 'is-active': ws.detailId === icon.id && ws.detailOpen }"
    draggable="true"
    tabindex="0"
    role="button"
    @click="emit('open', icon.id)"
    @keydown.enter="emit('open', icon.id)"
    @dragstart="onDragStart($event, icon.id)"
  >
    <button
      class="card-check row-check"
      :class="{ 'is-checked': selected }"
      type="button"
      :aria-label="selected ? '取消选中' : '选中'"
      @click.stop="emit('select', icon.id, $event.shiftKey)"
    >
      <AppIcon v-if="selected" name="check" :size="11" />
    </button>
    <div class="row-paper"><img :src="src" :alt="icon.name" loading="lazy" draggable="false" /></div>
    <span class="row-name" :title="icon.name">{{ icon.name }}</span>
    <span class="row-cat">{{ categoryName }}</span>
    <span class="row-dim mono">{{ icon.width }} × {{ icon.height }} px</span>
    <span class="row-bytes mono">{{ formatBytes(icon.bytes) }}</span>
    <span class="tag row-tag">{{ extensionOf(icon.mime) }}</span>
    <span class="row-date mono">{{ formatDate(icon.createdAt).slice(0, 10) }}</span>
    <AppIcon class="row-arrow" name="arrowRight" :size="14" />
  </article>
</template>

<style scoped>
.icon-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  background: var(--ink-800);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.16s ease, transform 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}
.icon-card:hover { border-color: var(--line-strong); transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28); }
.icon-card.is-selected, .icon-card.is-selected:hover { border-color: var(--blue); background: #16283a; }
.icon-card.is-active { border-color: rgba(91, 157, 255, 0.62); }
.card-check {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 2;
  width: 19px;
  height: 19px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(30, 45, 59, 0.42);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.72);
  color: #081524;
  opacity: 0.5;
  transition: opacity 0.14s ease, background 0.14s ease;
}
.icon-card:hover .card-check, .card-check.is-checked { opacity: 1; }
.card-check.is-checked { background: var(--blue); border-color: var(--blue); }
.paper {
  position: relative;
  height: 136px;
  margin: 8px 8px 0;
  border-radius: 6px;
  background: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.paper img { max-width: 62%; max-height: 62%; width: auto; height: auto; object-fit: contain; }
.corner { position: absolute; width: 12px; height: 12px; opacity: 0.75; pointer-events: none; }
.corner-tl { top: 9px; left: 9px; border-top: 1px solid var(--paper-line); border-left: 1px solid var(--paper-line); }
.corner-br { bottom: 15px; right: 9px; border-bottom: 1px solid var(--paper-line); border-right: 1px solid var(--paper-line); }
.ruler {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 6px;
  height: 5px;
  border-bottom: 1px solid rgba(30, 45, 59, 0.2);
  background: repeating-linear-gradient(90deg, rgba(30, 45, 59, 0.3) 0 1px, transparent 1px 10px);
  pointer-events: none;
}
.paper-size {
  position: absolute;
  right: 10px;
  top: 9px;
  font-size: 9.5px;
  color: #9a6c33;
  letter-spacing: 0.02em;
}
.card-meta { padding: 11px 12px 12px; min-width: 0; }
.card-name {
  display: block;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-spec { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 7px; }
.card-dim { font-size: 10.5px; color: var(--copper); white-space: nowrap; }

.icon-row {
  display: grid;
  grid-template-columns: 22px 42px minmax(120px, 1.7fr) minmax(90px, 1fr) 110px 90px 62px 92px 18px;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 0 14px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: var(--ink-800);
  cursor: pointer;
  color: var(--text-2);
  font-size: 12px;
  transition: border-color 0.14s ease, background 0.14s ease;
}
.icon-row:hover { border-color: var(--line-strong); background: var(--ink-750); }
.icon-row.is-selected { border-color: var(--blue); background: #16283a; }
.icon-row.is-active { border-color: rgba(91, 157, 255, 0.62); }
.row-check { position: static; opacity: 0.45; background: var(--ink-700); border-color: var(--line-strong); color: #081524; }
.icon-row:hover .row-check, .row-check.is-checked { opacity: 1; }
.row-check.is-checked { background: var(--blue); border-color: var(--blue); }
.row-paper { width: 42px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 5px; background: var(--paper); }
.row-paper img { max-width: 66%; max-height: 66%; object-fit: contain; }
.row-name { color: var(--text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-cat { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-dim { color: var(--copper); font-size: 11px; }
.row-bytes, .row-date { font-size: 11px; color: var(--text-3); }
.row-tag { justify-self: start; }
.row-arrow { color: var(--text-3); opacity: 0; }
.icon-row:hover .row-arrow { opacity: 1; }
@media (max-width: 1080px) {
  .icon-row { grid-template-columns: 22px 42px minmax(100px, 1.4fr) minmax(80px, 1fr) 100px 70px 18px; }
  .row-tag, .row-date { display: none; }
}
@media (max-width: 700px) {
  .icon-row { grid-template-columns: 22px 40px 1fr 90px 16px; gap: 8px; padding: 0 10px; }
  .row-cat, .row-bytes { display: none; }
}
</style>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useLibraryStore } from '../stores/library.js'
import { useWorkspaceStore } from '../stores/workspace.js'
import { api } from '../api/client.js'
import { dimensionLabel, extensionOf, formatBytes, formatDate, isSvg } from '../utils/format.js'
import { inspectFile } from '../utils/image.js'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['close', 'request-delete'])
const library = useLibraryStore()
const ws = useWorkspaceStore()

const icon = computed(() => ws.detailIcon)
const src = computed(() => (icon.value ? api.assetUrl(icon.value.file) : ''))
const isVector = computed(() => isSvg(icon.value))
const downloadName = computed(() =>
  icon.value ? `${icon.value.name}.${extensionOf(icon.value.mime).toLowerCase()}` : 'icon'
)
const categoryName = computed(
  () => library.categories.find((c) => c.id === icon.value?.categoryId)?.name || '未分类'
)

const editing = ref(false)
const nameDraft = ref('')
const nameInput = ref(null)
const replaceEl = ref(null)

watch(
  () => ws.detailId,
  () => {
    editing.value = false
    nameDraft.value = ''
  }
)

function startEdit() {
  if (!icon.value) return
  nameDraft.value = icon.value.name
  editing.value = true
  nextTick(() => nameInput.value?.focus())
}

async function saveName() {
  const name = nameDraft.value.trim()
  editing.value = false
  if (!icon.value || !name || name === icon.value.name) return
  try {
    await library.renameIcon(icon.value.id, name)
    ws.toast('名称已更新', 'success')
  } catch (error) {
    ws.toast(error.message || '重命名失败', 'error')
  }
}

async function copySource() {
  if (!icon.value) return
  try {
    const text = await api.rawText(src.value)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const holder = document.createElement('textarea')
      holder.value = text
      holder.style.position = 'fixed'
      holder.style.opacity = '0'
      document.body.appendChild(holder)
      holder.select()
      document.execCommand('copy')
      document.body.removeChild(holder)
    }
    ws.toast('SVG 源码已复制到剪贴板', 'success')
  } catch (error) {
    ws.toast(error.message || '复制失败', 'error')
  }
}

async function onReplace(event) {
  const file = event.target.files && event.target.files[0]
  event.target.value = ''
  if (!file || !icon.value) return
  const info = await inspectFile(file)
  if (info.error && !info.width) {
    if (info.previewUrl) URL.revokeObjectURL(info.previewUrl)
    ws.toast(info.error, 'error')
    return
  }
  try {
    await library.replaceFile(icon.value.id, file, {
      originalName: file.name,
      width: info.width,
      height: info.height
    })
    ws.toast('文件已替换，尺寸信息已更新', 'success')
  } catch (error) {
    ws.toast(error.message || '替换失败', 'error')
  }
  if (info.previewUrl) URL.revokeObjectURL(info.previewUrl)
}

async function onCategoryChange(event) {
  if (!icon.value) return
  try {
    await library.changeIconCategory(icon.value.id, event.target.value || null)
    ws.toast('分类已更新', 'success')
  } catch (error) {
    ws.toast(error.message || '移动失败', 'error')
  }
}

const imageStyle = computed(() => {
  if (!icon.value) return {}
  if (ws.previewScale === 'actual') {
    return { width: `${icon.value.width}px`, height: `${icon.value.height}px`, maxWidth: 'none', maxHeight: 'none' }
  }
  return {}
})
</script>

<template>
  <aside v-if="icon" class="detail-panel">
    <div class="detail-head">
      <div>
        <span class="eyebrow">详情检视</span>
        <p class="detail-hint">原始文件 · 完整规格</p>
      </div>
      <button class="icon-btn" type="button" aria-label="收起详情" @click="emit('close')">
        <AppIcon name="close" :size="16" />
      </button>
    </div>

    <div class="detail-scroll">
      <div class="preview-stage">
        <div class="preview-inner">
          <div class="preview-frame" :class="{ 'is-actual': ws.previewScale === 'actual' }">
            <img :src="src" :alt="icon.name" :style="imageStyle" />
          </div>
        </div>
        <span class="corner corner-tl"></span>
        <span class="corner corner-br"></span>
        <span v-if="ws.previewScale === 'actual'" class="stage-badge mono">1:1 · {{ icon.width }}×{{ icon.height }}</span>
      </div>

      <div class="scale-switch" role="group" aria-label="预览比例">
        <button :class="{ 'is-on': ws.previewScale === 'fit' }" type="button" @click="ws.previewScale = 'fit'">适应窗口</button>
        <button :class="{ 'is-on': ws.previewScale === 'actual' }" type="button" @click="ws.previewScale = 'actual'">原始大小 1:1</button>
      </div>

      <div class="spec-block">
        <div class="spec-row spec-name">
          <span class="spec-label">名称</span>
          <div v-if="editing" class="name-edit">
            <input
              ref="nameInput"
              v-model="nameDraft"
              class="field"
              type="text"
              maxlength="60"
              @keydown.enter="saveName"
              @keydown.esc="editing = false"
              @blur="saveName"
            />
          </div>
          <button v-else class="name-value" type="button" title="点击重命名" @click="startEdit">
            <span>{{ icon.name }}</span><AppIcon name="edit" :size="13" />
          </button>
        </div>
        <div class="spec-row"><span class="spec-label">格式</span><span class="spec-value tag">{{ extensionOf(icon.mime) }}</span></div>
        <div class="spec-row"><span class="spec-label">原始尺寸</span><span class="spec-value mono spec-accent">{{ dimensionLabel(icon.width, icon.height) }} px</span></div>
        <div class="spec-row"><span class="spec-label">文件大小</span><span class="spec-value mono">{{ formatBytes(icon.bytes) }}</span></div>
        <div class="spec-row"><span class="spec-label">原文件名</span><span class="spec-value mono spec-file" :title="icon.originalName">{{ icon.originalName }}</span></div>
        <div class="spec-row"><span class="spec-label">添加时间</span><span class="spec-value mono">{{ formatDate(icon.createdAt) }}</span></div>
        <div class="spec-row"><span class="spec-label">最近修改</span><span class="spec-value mono">{{ formatDate(icon.updatedAt) }}</span></div>
      </div>

      <div class="detail-category">
        <label class="detail-label" for="detail-cat">所属分类</label>
        <select id="detail-cat" class="field" :value="icon.categoryId || ''" @change="onCategoryChange">
          <option value="">未分类</option>
          <option v-for="category in library.categories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
      </div>

      <div class="detail-actions">
        <button class="btn btn-sm" type="button" :disabled="!isVector" :title="isVector ? '复制 SVG 源码' : '仅 SVG 支持复制源码'" @click="copySource">
          <AppIcon name="code" :size="14" /> 复制源码
        </button>
        <a class="btn btn-sm" :href="src" :download="downloadName"><AppIcon name="download" :size="14" /> 下载</a>
        <button class="btn btn-sm" type="button" @click="replaceEl?.click()"><AppIcon name="refresh" :size="14" /> 替换文件</button>
        <button class="btn btn-sm btn-danger" type="button" @click="emit('request-delete', icon)">
          <AppIcon name="trash" :size="14" /> 删除
        </button>
        <input ref="replaceEl" class="sr-only" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.svg" @change="onReplace" />
      </div>

      <p class="detail-footer mono">ID {{ icon.id }} · {{ categoryName }}</p>
    </div>
  </aside>
</template>

<style scoped>
.detail-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: var(--ink-800);
  border-left: 1px solid var(--line);
  animation: fade 0.18s ease both;
}
.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 14px;
  flex: none;
}
.detail-hint { margin: 4px 0 0; font-size: 11px; color: var(--text-3); }
.detail-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 0 20px 22px; }
.preview-stage {
  position: relative;
  height: 216px;
  border-radius: 8px;
  background: var(--paper);
  overflow: auto;
}
.preview-inner {
  min-width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
.preview-frame { display: inline-flex; align-items: center; justify-content: center; max-width: 100%; }
.preview-frame img { max-width: 168px; max-height: 168px; width: auto; height: auto; object-fit: contain; }
.preview-frame.is-actual { outline: 1px dashed rgba(30, 45, 59, 0.4); outline-offset: 0; }
.preview-frame.is-actual img { display: block; }
.corner { position: absolute; width: 13px; height: 13px; pointer-events: none; }
.corner-tl { top: 9px; left: 9px; border-top: 1px solid var(--paper-line); border-left: 1px solid var(--paper-line); }
.corner-br { bottom: 9px; right: 9px; border-bottom: 1px solid var(--paper-line); border-right: 1px solid var(--paper-line); }
.stage-badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(30, 45, 59, 0.8);
  color: #e8edf2;
  font-size: 10px;
}
.scale-switch {
  display: flex;
  gap: 3px;
  margin: 10px 0 18px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--ink-850);
}
.scale-switch button {
  flex: 1;
  height: 26px;
  border-radius: 5px;
  color: var(--text-3);
  font-size: 11.5px;
  transition: background 0.14s ease, color 0.14s ease;
}
.scale-switch button:hover { color: var(--text); }
.scale-switch button.is-on { background: var(--ink-700); color: var(--blue); }
.spec-block { border-top: 1px solid var(--line-soft); }
.spec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  padding: 5px 0;
  border-bottom: 1px solid var(--line-soft);
}
.spec-label { flex: none; font-size: 11.5px; color: var(--text-3); }
.spec-value { font-size: 11.5px; color: var(--text-2); text-align: right; min-width: 0; }
.spec-accent { color: var(--copper); }
.spec-file { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 190px; }
.spec-name { min-height: 42px; }
.name-value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 200px;
  color: var(--text);
  font-size: 12.5px;
  font-weight: 500;
}
.name-value span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name-value svg { flex: none; color: var(--text-3); opacity: 0; }
.name-value:hover svg { opacity: 1; color: var(--blue); }
.name-edit { width: 190px; }
.name-edit .field { height: 30px; font-size: 12px; }
.detail-category { margin: 18px 0 16px; }
.detail-label { display: block; margin-bottom: 7px; font-size: 11.5px; color: var(--text-3); }
.detail-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.detail-actions .btn { width: 100%; }
.detail-footer { margin: 16px 0 0; font-size: 10px; color: var(--text-3); text-align: center; }
@media (max-width: 1080px) {
  .detail-panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(360px, 92vw);
    z-index: 35;
    box-shadow: -16px 0 44px rgba(0, 0, 0, 0.44);
    animation: rise 0.2s ease both;
  }
}
</style>

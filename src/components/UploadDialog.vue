<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLibraryStore } from '../stores/library.js'
import { useWorkspaceStore } from '../stores/workspace.js'
import { formatBytes } from '../utils/format.js'
import { ACCEPT_ATTRIBUTE, inspectFile } from '../utils/image.js'
import AppIcon from './AppIcon.vue'
import ModalShell from './ModalShell.vue'

const props = defineProps({ payload: { type: Object, default: () => ({}) } })
const emit = defineEmits(['close'])
const library = useLibraryStore()
const ws = useWorkspaceStore()

const initialCategory = props.payload.categoryId && props.payload.categoryId !== 'all' && props.payload.categoryId !== 'uncategorized'
  ? props.payload.categoryId
  : ''

const items = ref([])
const bulkCategory = ref(initialCategory)
const dragActive = ref(false)
const busy = ref(false)
const fileEl = ref(null)

const validItems = computed(() => items.value.filter((item) => !item.error && item.name.trim()))
const invalidCount = computed(() => items.value.length - validItems.value.length)

async function addFiles(fileList) {
  const files = Array.from(fileList || [])
  for (const file of files) {
    const info = await inspectFile(file)
    items.value.push({ ...info, categoryId: bulkCategory.value || null, duplicate: false })
  }
  refreshDuplicates()
}

function refreshDuplicates() {
  for (const item of items.value) {
    item.duplicate =
      library.icons.some((icon) => icon.name === item.name.trim()) ||
      items.value.filter((other) => other !== item && other.name.trim() === item.name.trim()).length > 0
  }
}

function applyBulkCategory() {
  for (const item of items.value) item.categoryId = bulkCategory.value || null
}

function onDrop(event) {
  dragActive.value = false
  addFiles(event.dataTransfer.files)
}

function onPaste(event) {
  const files = event.clipboardData && event.clipboardData.files
  if (files && files.length) addFiles(files)
}

function removeItem(index) {
  const item = items.value[index]
  if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  items.value.splice(index, 1)
  refreshDuplicates()
}

onMounted(() => window.addEventListener('paste', onPaste))
onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste)
  for (const item of items.value) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  }
})

async function submit() {
  if (!validItems.value.length || busy.value) return
  busy.value = true
  try {
    const result = await library.upload(
      validItems.value.map((item) => item.file),
      validItems.value.map((item) => ({
        name: item.name.trim(),
        categoryId: item.categoryId || null,
        originalName: item.originalName,
        width: item.width,
        height: item.height
      }))
    )
    const failed = (result.results || []).filter((entry) => !entry.ok)
    ws.toast(
      failed.length ? `已保存 ${result.added} 枚，${failed.length} 枚未通过` : `已保存 ${result.added} 枚图标`,
      failed.length ? 'warning' : 'success'
    )
    ws.clearSelection()
    emit('close')
  } catch (error) {
    ws.toast(error.message || '上传失败', 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    title="上传图标"
    subtitle="支持 PNG / JPG / WebP / GIF / SVG，单文件不超过 8 MB"
    width="720px"
    :busy="busy"
    @close="emit('close')"
  >
    <div
      class="drop-zone"
      :class="{ 'is-dragging': dragActive }"
      @click="fileEl?.click()"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="onDrop"
    >
      <span class="drop-mark"><AppIcon name="upload" :size="22" /></span>
      <div class="drop-copy">
        <strong>把图标拖到这里，或点击选择文件</strong>
        <span>也可以直接粘贴剪贴板里的图片 · 一次可上传多个</span>
      </div>
      <input ref="fileEl" class="sr-only" type="file" multiple :accept="ACCEPT_ATTRIBUTE" @change="addFiles($event.target.files); $event.target.value = ''" />
    </div>

    <div v-if="items.length" class="upload-options">
      <label class="option-label" for="bulk-category">统一归入</label>
      <select id="bulk-category" v-model="bulkCategory" class="field option-select" @change="applyBulkCategory">
        <option value="">未分类</option>
        <option v-for="category in library.categories" :key="category.id" :value="category.id">{{ category.name }}</option>
      </select>
      <span class="option-tip">修改后会应用到下面所有文件，也可逐项单独指定</span>
    </div>

    <div v-if="items.length" class="upload-list">
      <div v-for="(item, index) in items" :key="`${item.originalName}-${index}`" class="upload-item" :class="{ 'has-error': item.error }">
        <div class="item-paper">
          <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.originalName" />
          <AppIcon v-else name="image" :size="20" />
        </div>
        <div class="item-fields">
          <div class="item-line">
            <input v-model="item.name" class="field item-name" type="text" maxlength="60" placeholder="自定义名称" @input="refreshDuplicates" />
            <select v-model="item.categoryId" class="field item-category">
              <option value="">未分类</option>
              <option v-for="category in library.categories" :key="category.id" :value="category.id">{{ category.name }}</option>
            </select>
          </div>
          <div class="item-meta mono">
            <span :title="item.originalName">{{ item.originalName }}</span>
            <span class="meta-dim">{{ item.width }} × {{ item.height }} px</span>
            <span>{{ formatBytes(item.bytes) }}</span>
          </div>
          <p v-if="item.error" class="item-error">{{ item.error }}</p>
          <p v-else-if="item.duplicate" class="item-warn">名称与已有图标重复，保存后仍可再改名</p>
        </div>
        <button class="icon-btn item-remove" type="button" aria-label="移除该文件" @click="removeItem(index)">
          <AppIcon name="close" :size="15" />
        </button>
      </div>
    </div>

    <template #footer>
      <span v-if="items.length" class="footer-note">
        共 {{ items.length }} 个文件<span v-if="invalidCount"> · {{ invalidCount }} 个将被跳过</span>
      </span>
      <span v-else class="footer-note">还没有选择文件</span>
      <button class="btn" type="button" :disabled="busy" @click="emit('close')">取消</button>
      <button class="btn btn-primary" type="button" :disabled="busy || !validItems.length" @click="submit">
        <AppIcon name="check" :size="15" /> {{ busy ? '保存中…' : `保存 ${validItems.length} 枚` }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 118px;
  padding: 18px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius);
  background: var(--ink-850);
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease;
}
.drop-zone:hover, .drop-zone.is-dragging { border-color: var(--blue); background: var(--blue-wash); }
.drop-mark {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--ink-750);
  color: var(--blue);
  flex: none;
}
.drop-copy { display: flex; flex-direction: column; gap: 3px; }
.drop-copy strong { font-size: 13px; font-weight: 500; color: var(--text); }
.drop-copy span { font-size: 11.5px; color: var(--text-3); }
.upload-options { display: flex; align-items: center; gap: 10px; margin: 18px 0 10px; flex-wrap: wrap; }
.option-label { font-size: 11.5px; color: var(--text-3); white-space: nowrap; }
.option-select { width: 150px; height: 30px; font-size: 12px; }
.option-tip { font-size: 11px; color: var(--text-3); }
.upload-list { display: flex; flex-direction: column; gap: 8px; max-height: 340px; overflow-y: auto; padding-right: 2px; }
.upload-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  background: var(--ink-850);
}
.upload-item.has-error { border-color: rgba(228, 117, 111, 0.45); }
.item-paper {
  width: 54px;
  height: 54px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--paper);
  color: var(--text-3);
}
.item-paper img { max-width: 68%; max-height: 68%; object-fit: contain; }
.item-fields { flex: 1; min-width: 0; }
.item-line { display: flex; gap: 8px; }
.item-name { flex: 1; min-width: 0; height: 30px; font-size: 12px; }
.item-category { width: 132px; height: 30px; font-size: 12px; flex: none; }
.item-meta { display: flex; gap: 12px; margin-top: 6px; font-size: 10.5px; color: var(--text-3); }
.item-meta span:first-child { max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta-dim { color: var(--copper); }
.item-error, .item-warn { margin: 5px 0 0; font-size: 11px; }
.item-error { color: var(--danger-soft); }
.item-warn { color: var(--copper); }
.item-remove { flex: none; }
.footer-note { margin-right: auto; font-size: 11.5px; color: var(--text-3); }
@media (max-width: 620px) {
  .drop-copy span, .option-tip { display: none; }
  .item-line { flex-direction: column; }
  .item-category { width: 100%; }
  .item-meta { flex-wrap: wrap; gap: 8px; }
}
</style>

<script setup>
import { computed, ref } from 'vue'
import { useLibraryStore } from '../stores/library.js'
import { useWorkspaceStore } from '../stores/workspace.js'
import ModalShell from './ModalShell.vue'

const props = defineProps({ payload: { type: Object, required: true } })
const emit = defineEmits(['close'])
const library = useLibraryStore()
const ws = useWorkspaceStore()

const COLORS = ['#5B9DFF', '#7FD1C1', '#D9A05B', '#B79CED', '#E4756F', '#9FB3C4']
const isEdit = computed(() => props.payload.mode === 'edit')
const name = ref(props.payload.category?.name || '')
const color = ref(props.payload.category?.color || COLORS[0])
const busy = ref(false)

async function save() {
  const value = name.value.trim()
  if (!value) {
    ws.toast('请填写分类名称', 'error')
    return
  }
  busy.value = true
  try {
    if (isEdit.value) {
      await library.updateCategory(props.payload.category.id, { name: value, color: color.value })
    } else {
      await library.createCategory({ name: value, color: color.value })
    }
    ws.toast(isEdit.value ? '分类已更新' : `已创建分类「${value}」`, 'success')
    emit('close')
  } catch (error) {
    ws.toast(error.message || '保存失败', 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :title="isEdit ? '编辑分类' : '新建分类'"
    subtitle="分类为单层结构，可拖拽调整顺序"
    width="440px"
    :busy="busy"
    @close="emit('close')"
  >
    <label class="form-label" for="cat-name">分类名称</label>
    <input
      id="cat-name"
      v-model="name"
      class="field"
      type="text"
      maxlength="24"
      placeholder="例如：导航图标"
      @keydown.enter="save"
    />

    <label class="form-label color-label">标记颜色</label>
    <div class="color-row">
      <button
        v-for="item in COLORS"
        :key="item"
        class="color-dot"
        :class="{ 'is-on': color === item }"
        type="button"
        :style="{ background: item }"
        :aria-label="`选择颜色 ${item}`"
        @click="color = item"
      ></button>
      <span class="color-value mono">{{ color }}</span>
    </div>

    <p class="form-hint">删除分类时，其下图标会自动转入「未分类」，不会丢失。</p>

    <template #footer>
      <button class="btn" type="button" :disabled="busy" @click="emit('close')">取消</button>
      <button class="btn btn-primary" type="button" :disabled="busy || !name.trim()" @click="save">
        {{ busy ? '保存中…' : isEdit ? '保存修改' : '创建分类' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form-label { display: block; margin-bottom: 8px; font-size: 11.5px; color: var(--text-3); }
.color-label { margin-top: 20px; }
.color-row { display: flex; align-items: center; gap: 10px; }
.color-dot {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 2px solid transparent;
  box-shadow: 0 0 0 1px var(--line);
  transition: transform 0.14s ease, box-shadow 0.14s ease;
}
.color-dot:hover { transform: translateY(-2px); }
.color-dot.is-on { box-shadow: 0 0 0 2px var(--ink-800), 0 0 0 4px var(--blue); }
.color-value { margin-left: 6px; font-size: 11px; color: var(--text-3); }
.form-hint { margin: 20px 0 0; font-size: 11.5px; color: var(--text-3); line-height: 1.6; }
</style>

<script setup>
import { computed, ref } from 'vue'
import { useWorkspaceStore } from '../stores/workspace.js'
import AppIcon from './AppIcon.vue'
import ModalShell from './ModalShell.vue'

const props = defineProps({ payload: { type: Object, required: true } })
const emit = defineEmits(['close'])
const ws = useWorkspaceStore()
const busy = ref(false)

const items = computed(() => (Array.isArray(props.payload.items) ? props.payload.items : []))
const shown = computed(() => items.value.slice(0, 6))

async function confirm() {
  if (busy.value) return
  busy.value = true
  try {
    await props.payload.onConfirm?.()
    emit('close')
  } catch (error) {
    ws.toast(error.message || '操作失败', 'error')
    busy.value = false
  }
}
</script>

<template>
  <ModalShell :title="payload.title" :busy="busy" width="460px" @close="emit('close')">
    <p class="confirm-desc">{{ payload.description }}</p>
    <div v-if="shown.length" class="confirm-list">
      <span v-for="(name, index) in shown" :key="`${name}-${index}`" class="confirm-chip">{{ name }}</span>
      <span v-if="items.length > shown.length" class="confirm-more mono">还有 {{ items.length - shown.length }} 枚…</span>
    </div>
    <template #footer>
      <button class="btn" type="button" :disabled="busy" @click="emit('close')">取消</button>
      <button class="btn" :class="payload.tone === 'danger' ? 'btn-danger' : 'btn-primary'" type="button" :disabled="busy" @click="confirm">
        <AppIcon :name="payload.tone === 'danger' ? 'trash' : 'check'" :size="14" />
        {{ busy ? '处理中…' : payload.confirmText || '确认' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.confirm-desc { margin: 0; font-size: 12.5px; line-height: 1.7; color: var(--text-2); }
.confirm-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.confirm-chip {
  padding: 3px 9px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--ink-850);
  color: var(--text-2);
  font-size: 11.5px;
}
.confirm-more { align-self: center; font-size: 11px; color: var(--text-3); }
</style>

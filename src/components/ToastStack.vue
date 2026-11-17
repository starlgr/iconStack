<script setup>
import { useWorkspaceStore } from '../stores/workspace.js'
import AppIcon from './AppIcon.vue'

const ws = useWorkspaceStore()

const ICON_BY_TYPE = { success: 'checkCircle', error: 'alert', info: 'info', warning: 'alert' }

async function runAction(toast) {
  if (!toast.action) return
  ws.dismissToast(toast.id)
  try {
    await toast.action.run()
  } catch (error) {
    ws.toast(error.message || '操作失败', 'error')
  }
}
</script>

<template>
  <div class="toast-stack" role="status" aria-live="polite">
    <div v-for="item in ws.toasts" :key="item.id" class="toast" :class="`toast-${item.type}`">
      <span class="toast-mark"><AppIcon :name="ICON_BY_TYPE[item.type] || 'info'" :size="16" /></span>
      <span class="toast-text">{{ item.message }}</span>
      <button v-if="item.action" class="toast-action" type="button" @click="runAction(item)">
        {{ item.action.label }}
      </button>
      <button class="toast-close" type="button" aria-label="关闭提示" @click="ws.dismissToast(item.id)">
        <AppIcon name="close" :size="13" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  max-width: 420px;
  padding: 9px 10px 9px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--ink-750);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.42);
  pointer-events: auto;
  animation: rise 0.2s ease both;
}
.toast-mark { display: inline-flex; color: var(--blue); flex: none; }
.toast-success .toast-mark { color: var(--success); }
.toast-error .toast-mark { color: var(--danger); }
.toast-warning .toast-mark { color: var(--copper); }
.toast-text { font-size: 12.5px; color: var(--text); white-space: nowrap; }
.toast-action {
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid rgba(91, 157, 255, 0.35);
  background: var(--blue-wash);
  color: var(--blue-soft);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.toast-action:hover { background: rgba(91, 157, 255, 0.22); }
.toast-close { display: inline-flex; color: var(--text-3); padding: 3px; }
.toast-close:hover { color: var(--text); }
@media (max-width: 640px) { .toast-stack { left: 12px; right: 12px; } .toast { max-width: none; } }
</style>

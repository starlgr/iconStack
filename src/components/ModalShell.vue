<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  width: { type: String, default: '560px' },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="!busy && emit('close')">
    <section class="modal-panel" :style="{ maxWidth: width }" role="dialog" aria-modal="true">
      <header class="modal-head">
        <div class="modal-heading">
          <h2 class="modal-title">{{ title }}</h2>
          <p v-if="subtitle" class="modal-subtitle">{{ subtitle }}</p>
        </div>
        <button class="icon-btn" type="button" aria-label="关闭弹窗" :disabled="busy" @click="emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </header>
      <div class="modal-body"><slot /></div>
      <footer v-if="$slots.footer" class="modal-foot"><slot name="footer" /></footer>
    </section>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(4, 9, 14, 0.74);
  animation: fade 0.16s ease both;
}
.modal-panel {
  width: 100%;
  max-height: min(860px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  background: var(--ink-800);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
  animation: rise 0.2s ease both;
  overflow: hidden;
}
.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--line-soft);
}
.modal-heading { min-width: 0; }
.modal-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
}
.modal-subtitle { margin: 4px 0 0; font-size: 12px; color: var(--text-3); }
.modal-body { padding: 20px 22px; overflow-y: auto; min-height: 0; }
.modal-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid var(--line-soft);
  background: var(--ink-850);
}
@media (max-width: 640px) {
  .modal-backdrop { padding: 12px; }
  .modal-head, .modal-body, .modal-foot { padding-left: 16px; padding-right: 16px; }
}
</style>

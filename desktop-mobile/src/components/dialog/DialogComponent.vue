<template>
  <q-dialog
    ref="dialogRef"
    :persistent="persistent"
    no-shake
    transition-show="slide-up"
    transition-hide="slide-down"
    :position="pos"
    @hide="handleDialogHide"
  >
    <component
      :is="componentToRender"
      class="dialog-shell pb-safe-1 rounded-xl w-100"
      v-bind="{
        onDialogOK,
        onDialogCancel,
        componentProps: { ...componentToRenderProps },
      }"
    />
  </q-dialog>
</template>

<script setup lang="ts">
import { type QDialogProps, useDialogPluginComponent, useQuasar } from 'quasar';
import { useDialog } from 'src/composables/useDialog';
import { computed, ref, onMounted } from 'vue';
import type { Component } from 'vue';

const { popDialog } = useDialog();

const props = defineProps<{
  componentToRender: Component;
  componentToRenderProps: Record<string, unknown>;
  dialogOptions: QDialogProps | undefined;
}>();

const $q = useQuasar();

type Position = 'standard' | 'top' | 'right' | 'bottom' | 'left' | undefined;

const pos = ref<Position>($q.screen.lt.sm ? 'bottom' : 'standard');
const persistent = ref<boolean | undefined>(true);

defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const dialogName = computed(() => props.componentToRender.name || 'dialog');

function syncDialogInUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('dialog', dialogName.value);
  window.history.replaceState(window.history.state, '', url.toString());
}

function clearDialogFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('dialog');
  window.history.replaceState(window.history.state, '', url.toString());
}

function handleDialogHide() {
  clearDialogFromUrl();
  popDialog(dialogName.value);
  onDialogHide();
}

onMounted(() => {
  if (props.dialogOptions) {
    if ('position' in props.dialogOptions) pos.value = props.dialogOptions.position;
    if ('persistent' in props.dialogOptions) persistent.value = props.dialogOptions.persistent;
  }

  syncDialogInUrl();
});
</script>

<style scoped>
:deep(.dialog-shell) {
  width: min(92vw, 720px);
  max-width: min(92vw, 720px);
  margin: 0 auto;
}

@media (max-width: 599px) {
  :deep(.dialog-shell) {
    width: calc(100vw - 12px) !important;
    max-width: calc(100vw - 12px) !important;
    min-width: 0 !important;
    margin: 0 6px 6px !important;
    border-radius: 14px !important;
    max-height: calc(100dvh - 20px);
    overflow-y: auto;
  }

  :deep(.dialog-shell.q-card) {
    min-width: 0 !important;
  }
}
</style>

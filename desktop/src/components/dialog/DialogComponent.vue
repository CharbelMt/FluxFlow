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
      class="pb-safe-1 rounded-xl! w-100%"
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

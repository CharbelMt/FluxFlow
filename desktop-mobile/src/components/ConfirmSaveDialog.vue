<template>
  <q-card flat class="dialog-shell confirm-save-dialog">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">{{ componentProps?.title || t('dialogs.confirm_save_title') }}</div>
      <div class="text-caption opacity-80">
        {{ componentProps?.message || t('dialogs.confirm_save_message') }}
      </div>
    </q-card-section>

    <q-card-section class="q-pa-lg">
      <div class="text-body2 text-grey-8">
        {{ componentProps?.details || t('dialogs.confirm_save_details') }}
      </div>
    </q-card-section>

    <q-card-actions align="right" class="q-pa-md q-pt-none">
      <q-btn
        flat
        color="grey-7"
        :label="componentProps?.cancelLabel || t('common.cancel')"
        @click="handleClose(onDialogCancel)"
      />
      <q-btn
        unelevated
        color="primary"
        :label="componentProps?.confirmLabel || t('common.save')"
        @click="handleConfirm"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface ComponentProps {
  title?: string;
  message?: string;
  details?: string;
  cancelLabel?: string;
  confirmLabel?: string;
}

const props = defineProps<{
  componentProps?: ComponentProps;
  onDialogOK?: () => void;
  onDialogCancel?: () => void;
}>();

const { t } = useI18n();

function handleClose(cancel?: () => void) {
  cancel?.();
}

function handleConfirm() {
  props.onDialogOK?.();
}
</script>

<style scoped>
.confirm-save-dialog {
  min-width: 320px;
}
</style>

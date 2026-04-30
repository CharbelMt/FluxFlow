<template>
  <q-card flat class="bg-white overflow-hidden print-card">
    <CardSectionTitle :title="componentProps?.title || ''" @close="handleClose(onDialogCancel)" />

    <q-card-section class="q-pa-lg flex flex-col gap-6 items-center justify-center">
      <!-- QR Code Display -->
      <div class="qr-container">
        <div class="qr-content">
          <div class="text-lg text-slate-500 text-center mb-2 font-semibold">
            {{ getContextLabel(componentProps?.context) }}
          </div>
          <div class="text-subtitle2 text-gray-700 text-center font-semibold">
            {{ componentProps?.subtitle }}
          </div>
          <div class="qr-code" v-html="componentProps?.qrMarkup" />
          <div class="text-caption text-gray-500 text-center mt-3">
            {{ componentProps?.metadata }}
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="row gap-3 justify-center w-full">
        <q-btn
          outline
          color="primary"
          :label="$t('common.print')"
          icon="print"
          @click="handlePrint"
          no-caps
        />
        <q-btn
          flat
          color="primary"
          :label="$t('common.close')"
          @click="handleClose(onDialogCancel)"
          no-caps
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import CardSectionTitle from './dialog/CardSectionTitle.vue';

interface ComponentProps {
  title: string;
  subtitle: string;
  qrMarkup: string;
  metadata: string;
  context?: 'asset' | 'room';
}

defineProps<{
  componentProps?: ComponentProps;
  onDialogOK?: () => void;
  onDialogCancel?: () => void;
}>();

const { t } = useI18n();

function handleClose(cancel?: () => void) {
  cancel?.();
}

function getContextLabel(context?: string) {
  return context === 'asset' ? t('common.model_type') : t('common.location');
}

function handlePrint() {
  window.print();
}
</script>

<style scoped>
:deep(.print-card) {
  min-width: 520px;
  max-width: 600px;
}

.qr-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.qr-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

:deep(.qr-code) {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 4px;
}

:deep(.qr-code svg) {
  max-width: 280px;
  height: auto;
}

/* Print styles */
@media print {
  :deep(.print-card) {
    min-width: 100%;
    max-width: 100%;
    margin: 0;
    box-shadow: none;
  }

  .qr-container {
    page-break-inside: avoid;
  }

  .row {
    display: none;
  }

  :deep(.q-card__section) {
    padding: 0;
  }

  :deep(.dialog-shell) {
    width: 100%;
    max-width: 100%;
    margin: 0;
  }

  :deep(.q-card) {
    box-shadow: none;
    border: none;
  }
}

@media (max-width: 599px) {
  :deep(.print-card) {
    min-width: 100%;
  }

  .qr-content {
    padding: 0.75rem;
  }
}
</style>

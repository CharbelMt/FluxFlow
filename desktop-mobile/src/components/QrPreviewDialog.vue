<template>
  <q-card flat class="bg-white overflow-hidden print-card">
    <div class="non-print">
      <CardSectionTitle :title="componentProps?.title || ''" @close="handleClose(onDialogCancel)" />
    </div>

    <q-card-section class="q-pa-lg flex flex-col gap-6 items-center justify-center print-section">
      <!-- QR Code Display -->
      <div class="qr-container">
        <div class="qr-content">
          <div class="text-lg text-slate-500 text-center mb-2 font-semibold non-print">
            {{ getContextLabel(componentProps?.context) }}
          </div>
          <div class="text-subtitle2 text-gray-700 text-center font-semibold non-print">
            {{ componentProps?.subtitle }}
          </div>
          <div class="qr-code" v-html="componentProps?.qrMarkup" />
          <div class="text-caption text-gray-500 text-center mt-3 non-print">
            {{ componentProps?.metadata }}
          </div>
          <div class="print-labels">
            <div class="print-label-row">
              <span class="print-label-key">{{ $t('qr_preview.model_label') }}</span>
              {{ model_name }}
            </div>
            <div class="print-label-row">
              <span class="print-label-key">{{ $t('qr_preview.serial_label') }}</span>
              {{ serial_number }}
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="row gap-3 justify-center w-full non-print">
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
  serialNumber?: string;
  modelName?: string;
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

function getContextLabel(context?: string) {
  return context === 'asset' ? t('common.model_type') : t('common.location');
}

const model_name = props.componentProps?.modelName || props.componentProps?.subtitle || '-';
const serial_number = props.componentProps?.serialNumber || '-';

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
  gap: 0.75rem;
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
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
}

:deep(.qr-code svg) {
  max-width: 280px;
  height: auto;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}

.print-labels {
  width: 100%;
  text-align: center;
  font-size: 0.76rem;
  color: #1f2937;
}

.print-label-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.print-label-key {
  font-weight: 700;
}

/* Print styles */
@media print {
  @page {
    size: 2in 2in;
    margin: 0;
  }

  :global(html),
  :global(body) {
    margin: 0 !important;
    padding: 0 !important;
    width: 2in;
    height: 2in;
    overflow: hidden;
    background: transparent !important;
  }

  :global(body *) {
    visibility: hidden !important;
  }

  :deep(.print-card),
  :deep(.print-card *),
  :deep(.qr-content),
  :deep(.qr-content *) {
    visibility: visible !important;
  }

  :deep(.print-card) {
    min-width: 2in !important;
    max-width: 2in !important;
    width: 2in !important;
    height: 2in !important;
    margin: 0 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    position: fixed;
    top: 0;
    left: 0;
  }

  .qr-container {
    width: 100%;
    height: 100%;
    page-break-inside: avoid;
  }

  .print-section {
    width: 2in !important;
    height: 2in !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .qr-content {
    width: 2in;
    height: 2in;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    padding: 0.08in 0.08in 0.06in !important;
    margin: 0 !important;
    gap: 0.03in;
    justify-content: center;
  }

  :deep(.qr-code) {
    width: 100%;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
  }

  :deep(.qr-code svg) {
    width: 1.34in !important;
    height: 1.34in !important;
    max-width: none !important;
    display: block;
    margin: 0 auto;
  }

  .print-labels {
    font-size: 8pt;
    line-height: 1.1;
    color: #000 !important;
    margin-top: 0.02in;
  }

  .non-print {
    display: none !important;
  }

  :deep(.q-dialog__backdrop),
  :deep(.q-dialog__inner),
  :deep(.dialog-shell),
  :deep(.q-card),
  :deep(.q-card__section) {
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
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

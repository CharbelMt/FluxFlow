<template>
  <div class="scanner-page q-pa-md">
    <div class="row items-start q-col-gutter-sm">
      <!-- Scanner Section -->
      <div class="col-12">
        <q-card class="sticky" style="top: 20px">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">{{ $t('scanner.title') }}</div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <!-- Scanner Input -->
            <div class="q-mb-md">
              <q-input
                ref="input_ref"
                v-model="scanner_input"
                :label="$t('scanner.input_label')"
                outlined
                dense
                @keydown.enter="handleScan"
                autofocus
                class="q-mb-md"
              >
                <template #prepend>
                  <q-icon name="qr_code_2" />
                </template>
                <template #append>
                  <q-icon
                    v-if="scanner_input"
                    name="close"
                    class="cursor-pointer"
                    @click="scanner_input = ''"
                  />
                </template>
              </q-input>

              <q-btn
                unelevated
                :label="$t('scanner.scan_button')"
                color="primary"
                class="full-width"
                :loading="useScanner_instance.is_loading.value"
                @click="handleScan"
              />
            </div>

            <!-- Recent Scans -->
            <div v-if="recent_scans.length > 0" class="q-mt-lg">
              <div class="text-subtitle2 q-mb-md">
                {{ $t('scanner.recent_scans') }}
              </div>
              <q-list bordered separator>
                <q-item
                  v-for="(scan, index) in recent_scans"
                  :key="index"
                  clickable
                  @click="
                    () => {
                      scanner_input = scan.uuid;
                      handleScan();
                    }
                  "
                >
                  <q-item-section avatar>
                    <q-icon
                      :name="scan.type === 'asset' ? 'inventory_2' : 'store'"
                      :color="scan.type === 'asset' ? 'blue' : 'orange'"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ scan.label }}</q-item-label>
                    <q-item-label caption>{{ scan.uuid }}</q-item-label>
                  </q-item-section>
                  <q-item-section side top>
                    <div class="text-grey text-xs">{{ formatTime(scan.timestamp) }}</div>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Detail View Section -->
      <div class="col-12">
        <ScannerDetailView
          :scanned_item="useScanner_instance.scanned_item.value"
          :is_loading="useScanner_instance.is_loading.value"
          :error_message="useScanner_instance.error_message.value"
          :has_error="useScanner_instance.has_error.value"
          @close="handleClose"
          @view-history="handleViewHistory"
          @clear="useScanner_instance.clearScannedItem()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useScanner } from 'src/composables/useScanner';
import ScannerDetailView from 'src/components/ScannerDetailView.vue';
import type { ScannedItem } from 'src/composables/useScanner';

interface RecentScan {
  uuid: string;
  label: string;
  type: 'asset' | 'room';
  timestamp: number;
}

const router = useRouter();
const { t } = useI18n();
const useScanner_instance = useScanner();

const scanner_input = ref('');
const input_ref = ref();
const recent_scans = ref<RecentScan[]>([]);

const MAX_RECENT_SCANS = 5;

onMounted(() => {
  // Load recent scans from localStorage
  const stored_scans = localStorage.getItem('scanner_recent_scans');
  if (stored_scans) {
    recent_scans.value = JSON.parse(stored_scans);
  }

  // Focus the input field
  if (input_ref.value) {
    input_ref.value.focus();
  }
});

const handleScan = async () => {
  const uuid = scanner_input.value.trim();
  if (!uuid) return;

  await useScanner_instance.processScanUuid(uuid);

  // Add to recent scans if successful
  if (useScanner_instance.scanned_item.value) {
    const scanned_item = useScanner_instance.scanned_item.value as ScannedItem;
    const label =
      scanned_item.type === 'asset'
        ? `${getSerialNumber(scanned_item.data)} - ${getModelName(scanned_item.data.type)}`
        : `${getRoomLabel(scanned_item.data)}`;

    const new_scan: RecentScan = {
      uuid,
      label,
      type: scanned_item.type,
      timestamp: Date.now(),
    };

    // Remove duplicates and add to front
    recent_scans.value = [new_scan, ...recent_scans.value.filter((s) => s.uuid !== uuid)].slice(
      0,
      MAX_RECENT_SCANS,
    );

    // Save to localStorage
    localStorage.setItem('scanner_recent_scans', JSON.stringify(recent_scans.value));

    // Clear input
    scanner_input.value = '';

    // Refocus input
    if (input_ref.value) {
      input_ref.value.focus();
    }
  }
};

const handleClose = () => {
  useScanner_instance.clearScannedItem();
  scanner_input.value = '';
  if (input_ref.value) {
    input_ref.value.focus();
  }
};

const handleViewHistory = (asset_id: string) => {
  router.push({
    name: 'assets',
    params: { asset_id },
  });
};

const formatTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return t('scanner.just_now');
  if (minutes < 60) return t('scanner.minutes_ago', { count: minutes });
  if (hours < 24) return t('scanner.hours_ago', { count: hours });
  return new Date(timestamp).toLocaleDateString();
};

// Helper functions
const getSerialNumber = (asset: any) => asset.serialNumber || asset.serial_number;
const getModelName = (asset_type: any) => asset_type.modelName || asset_type.model_name;
const getRoomLabel = (room: any) => room.roomLabel || room.room_label;
</script>

<style scoped lang="scss">
.scanner-page {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: calc(100vh - 64px);
  max-width: 560px;
  margin: 0 auto;

  .sticky {
    position: static;
  }

  :deep(.q-card) {
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .text-xs {
    font-size: 0.75rem;
  }
}

@media (min-width: 768px) {
  .scanner-page {
    max-width: 640px;
  }
}
</style>

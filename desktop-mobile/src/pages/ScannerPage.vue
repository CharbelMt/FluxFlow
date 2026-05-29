<template>
  <div class="scanner-page q-pa-md" :class="{ 'scanner-page--scanning': is_scanning }">
    <q-card class="scanner-card">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">{{ $t('scanner.title') }}</div>
        <div class="text-caption opacity-80">{{ $t('scanner.description') }}</div>
      </q-card-section>

      <q-card-section>
        <q-banner v-if="scan_status" class="bg-blue-1 text-blue-10 q-mb-md rounded-borders">
          {{ scan_status }}
        </q-banner>

        <q-btn
          v-if="!is_scanning"
          unelevated
          color="primary"
          class="full-width q-mb-sm"
          icon="qr_code_scanner"
          :label="$t('scanner.scan_button')"
          @click="startNativeScan"
        />

        <q-btn
          v-if="is_scanning"
          outline
          color="negative"
          class="full-width"
          icon="close"
          :label="$t('common.cancel')"
          @click="cancelNativeScan"
        />

        <div v-if="recent_scans.length > 0" class="q-mt-lg">
          <div class="text-subtitle2 q-mb-sm">{{ $t('scanner.recent_scans') }}</div>
          <q-list bordered separator>
            <q-item
              v-for="(scan, index) in recent_scans"
              :key="index"
              clickable
              @click="goToAssetDetail(scan.asset_id)"
            >
              <q-item-section avatar>
                <q-icon name="inventory_2" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ scan.label }}</q-item-label>
                <q-item-label caption>{{ scan.asset_id }}</q-item-label>
              </q-item-section>
              <q-item-section side top>
                <div class="text-grey text-xs">{{ formatTime(scan.timestamp) }}</div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card-section>
    </q-card>

    <div v-if="is_scanning" class="scan-overlay">
      <div class="scan-overlay-scrim" @click.stop />

      <div class="scan-overlay-content">
        <div class="camera-container">
          <QrcodeStream
            :constraints="{ facingMode: 'environment' }"
            :formats="['qr_code']"
            @detect="handleDetect"
            @error="scannerOnError"
            @camera-on="cameraOn"
          />
        </div>
        <q-card class="scan-overlay-card">
          <q-card-section class="row items-center no-wrap q-pa-sm">
            <q-icon name="camera_alt" color="white" class="q-mr-sm" />
            <div class="text-white text-caption">{{ $t('scanner.scanning_progress') }}</div>
            <q-space />
            <q-btn
              flat
              dense
              color="white"
              icon="close"
              :label="$t('common.cancel')"
              @click="cancelNativeScan"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { QrcodeStream } from 'vue-qrcode-reader';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useScanner } from '../composables/useScanner';

interface RecentScan {
  asset_id: string;
  label: string;
  timestamp: number;
}

const router_instance = useRouter();
const $q = useQuasar();
const { t } = useI18n();

const {
  onDetect: scannerOnDetect,
  onError: scannerOnError,
  onCameraOn: scannerOnCameraOn,
} = useScanner();

const recent_scans = ref<RecentScan[]>([]);
const is_scanning = ref(false);
const scan_status = ref('');

const MAX_RECENT_SCANS = 5;

onMounted(() => {
  const stored_scans_raw = localStorage.getItem('scanner_recent_scans');
  if (stored_scans_raw) {
    recent_scans.value = JSON.parse(stored_scans_raw) as RecentScan[];
  }
});

function extractAssetId(raw_qr_data: string) {
  const qr_payload = raw_qr_data.trim();

  if (!qr_payload) {
    return '';
  }

  try {
    const parsed_url = new URL(qr_payload);
    const query_asset_id = parsed_url.searchParams.get('asset_id');
    if (query_asset_id) {
      return query_asset_id.trim();
    }

    const path_parts = parsed_url.pathname.split('/').filter(Boolean);
    return path_parts.at(-1)?.trim() || qr_payload;
  } catch {
    const query_match = qr_payload.match(/[?&]asset_id=([^&]+)/i);
    if (query_match?.[1]) {
      return decodeURIComponent(query_match[1]).trim();
    }

    return qr_payload;
  }
}

function persistRecentScans(asset_id: string) {
  const new_scan: RecentScan = {
    asset_id,
    label: t('scanner.asset_label', { assetId: asset_id }),
    timestamp: Date.now(),
  };

  recent_scans.value = [
    new_scan,
    ...recent_scans.value.filter((scan) => scan.asset_id !== asset_id),
  ].slice(0, MAX_RECENT_SCANS);

  localStorage.setItem('scanner_recent_scans', JSON.stringify(recent_scans.value));
}

async function goToAssetDetail(asset_id: string) {
  await router_instance.push({
    name: 'asset-detail',
    params: { asset_id },
  });
}

function startNativeScan() {
  if (is_scanning.value) return;
  is_scanning.value = true;
  scan_status.value = t('scanner.scanning_prompt');
  document.body.classList.add('barcode-scanner-active');
}

async function handleDetect(results: Array<{ rawValue: string }>) {
  const raw_qr_data = await scannerOnDetect(results);
  if (!raw_qr_data) return;

  const asset_id = extractAssetId(raw_qr_data);
  if (!asset_id) {
    scan_status.value = t('scanner.invalid_asset_id');
    $q.notify({ type: 'negative', message: scan_status.value, position: 'top' });
    is_scanning.value = false;
    document.body.classList.remove('barcode-scanner-active');
    return;
  }

  persistRecentScans(asset_id);
  is_scanning.value = false;
  document.body.classList.remove('barcode-scanner-active');
  await goToAssetDetail(asset_id);
}

function cameraOn() {
  scan_status.value = '';
  scannerOnCameraOn();
}

function cancelNativeScan() {
  scan_status.value = t('scanner.scan_canceled');
  is_scanning.value = false;
  document.body.classList.remove('barcode-scanner-active');
}

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
</script>

<style scoped lang="scss">
.scanner-page {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: calc(100vh - 72px);
  max-width: 560px;
  margin: 0 auto;

  position: relative;

  :deep(.scanner-card) {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .text-xs {
    font-size: 0.75rem;
  }
}

.scanner-page--scanning {
  pointer-events: none;
  user-select: none;
}

.scanner-page--scanning .scan-overlay,
.scanner-page--scanning .scan-overlay * {
  pointer-events: auto;
}

.scan-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scan-overlay-scrim {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.45);
}

.scan-overlay-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  padding: 72px 12px 12px;
  box-sizing: border-box;
}

.scan-overlay-card {
  width: 100%;
  max-width: 560px;
  margin: 12px auto 0;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
}

.camera-container {
  flex: 1 1 auto;
  display: flex;
  width: 100%;
  min-height: 0;
  max-width: 1000px;
  margin: 0 auto;
}

/* Ensure the QrcodeStream and underlying video fill the container */
:deep(QrcodeStream) {
  flex: 1 1 auto;
  height: 100%;
  width: 100%;
}

:deep(video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

@media (min-width: 768px) {
  .scanner-page {
    max-width: 640px;
  }

  .scan-overlay-card {
    max-width: 640px;
  }
}
</style>

<style lang="scss">
body.barcode-scanner-active {
  background: transparent !important;
  --q-background: transparent !important;
  overflow: hidden !important;
}

body.barcode-scanner-active .q-layout,
body.barcode-scanner-active .q-page-container,
body.barcode-scanner-active .scanner-page {
  background: transparent !important;
}

body.barcode-scanner-active .q-layout > *:not(.q-page-container) {
  pointer-events: none;
}

body.barcode-scanner-active .q-layout > .q-page-container {
  pointer-events: none;
}

body.barcode-scanner-active .scanner-card {
  visibility: hidden;
}

body.barcode-scanner-active .scan-overlay {
  visibility: visible;
}
</style>

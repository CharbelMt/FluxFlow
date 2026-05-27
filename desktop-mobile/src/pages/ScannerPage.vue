<template>
  <div class="scanner-page q-pa-md">
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
          unelevated
          color="primary"
          class="full-width q-mb-sm"
          icon="qr_code_scanner"
          :label="$t('scanner.scan_button')"
          :loading="is_scanning"
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
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

interface RecentScan {
  asset_id: string;
  label: string;
  timestamp: number;
}

const router_instance = useRouter();
const $q = useQuasar();
const { t } = useI18n();

const recent_scans = ref<RecentScan[]>([]);
const is_scanning = ref(false);
const scan_status = ref('');
let active_scan_resolve: ((value: string | null) => void) | null = null;
let active_scan_reject: ((reason: unknown) => void) | null = null;
let active_scan_finished = false;

const MAX_RECENT_SCANS = 5;

onMounted(() => {
  const stored_scans_raw = localStorage.getItem('scanner_recent_scans');
  if (stored_scans_raw) {
    recent_scans.value = JSON.parse(stored_scans_raw) as RecentScan[];
  }
});

onBeforeUnmount(() => {
  void stopNativeScan();
});

function getPlatformName() {
  return Capacitor.getPlatform();
}

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

async function stopNativeScan() {
  await finishNativeScan(null);
}

async function cleanupNativeScan() {
  document.body.classList.remove('barcode-scanner-active');

  await BarcodeScanner.removeAllListeners();

  await BarcodeScanner.stopScan();

  is_scanning.value = false;
  active_scan_resolve = null;
  active_scan_reject = null;
  active_scan_finished = false;
}

async function finishNativeScan(scanned_value: string | null) {
  if (active_scan_finished) {
    return;
  }

  active_scan_finished = true;
  active_scan_resolve?.(scanned_value);
  await cleanupNativeScan();
}

async function failNativeScan(error: unknown) {
  if (active_scan_finished) {
    return;
  }

  active_scan_finished = true;
  active_scan_reject?.(error);
  await cleanupNativeScan();
}

async function startNativeScan() {
  if (is_scanning.value) {
    return;
  }

  scan_status.value = '';
  try {
    const platform_name = getPlatformName();
    if (platform_name === 'web') {
      scan_status.value = t('scanner.native_not_supported');
      $q.notify({ type: 'negative', message: scan_status.value, position: 'top' });
      return;
    }

    const supported = await BarcodeScanner.isSupported();
    if (!supported.supported) {
      scan_status.value = t('scanner.native_not_supported');
      $q.notify({ type: 'negative', message: scan_status.value, position: 'top' });
      return;
    }

    const permissions_before = await BarcodeScanner.checkPermissions();
    if (permissions_before.camera !== 'granted') {
      const permissions_after = await BarcodeScanner.requestPermissions();
      if (permissions_after.camera !== 'granted') {
        scan_status.value = t('scanner.camera_permission_required');
        $q.notify({ type: 'negative', message: scan_status.value, position: 'top' });
        return;
      }
    }

    is_scanning.value = true;
    scan_status.value = t('scanner.scanning_prompt');

    document.body.classList.add('barcode-scanner-active');

    try {
      const scan_result_promise = new Promise<string | null>((resolve, reject) => {
        active_scan_resolve = resolve;
        active_scan_reject = reject;
        active_scan_finished = false;
      });

      await BarcodeScanner.addListener('barcodesScanned', (event) => {
        const scanned_barcode = event.barcodes[0];
        const scanned_value = scanned_barcode?.rawValue?.trim() || '';
        void finishNativeScan(scanned_value || null);
      });

      await BarcodeScanner.addListener('scanError', (event) => {
        void failNativeScan(new Error(event.message));
      });

      try {
        await BarcodeScanner.startScan();
      } catch (error) {
        void failNativeScan(error);
      }

      const raw_qr_data = await scan_result_promise;

      if (!raw_qr_data) {
        scan_status.value = t('scanner.scan_canceled');
        $q.notify({ type: 'info', message: scan_status.value, position: 'top' });
        await stopNativeScan();
        return;
      }

      const asset_id = extractAssetId(raw_qr_data);
      if (!asset_id) {
        scan_status.value = t('scanner.invalid_asset_id');
        $q.notify({ type: 'negative', message: scan_status.value, position: 'top' });
        await stopNativeScan();
        return;
      }

      persistRecentScans(asset_id);
      await stopNativeScan();
      await goToAssetDetail(asset_id);
    } catch (error: unknown) {
      console.error('Unable to start native scan:', error);

      const message =
        error instanceof Error && /not implemented/i.test(error.message)
          ? t('scanner.plugin_not_implemented')
          : t('scanner.unable_to_start');

      scan_status.value = message;
      $q.notify({ type: 'negative', message: scan_status.value, position: 'top' });
      await stopNativeScan();
    }
  } catch (err: unknown) {
    console.error('Barcode scanner initialization failed:', err);
    const friendly =
      err instanceof Error && /not implemented/i.test(err.message)
        ? t('scanner.plugin_not_implemented')
        : t('scanner.unable_to_start');

    scan_status.value = friendly;
    $q.notify({ type: 'negative', message: scan_status.value, position: 'top' });
    await stopNativeScan();
  }
}

async function cancelNativeScan() {
  scan_status.value = t('scanner.scan_canceled');
  await stopNativeScan();
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

.scan-overlay {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4000;
  padding: 12px;
}

.scan-overlay-card {
  max-width: 560px;
  margin: 0 auto;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
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
}

body.barcode-scanner-active .q-layout,
body.barcode-scanner-active .q-page-container,
body.barcode-scanner-active .scanner-page {
  background: transparent !important;
}

body.barcode-scanner-active .scanner-card {
  visibility: hidden;
}

body.barcode-scanner-active .scan-overlay {
  visibility: visible;
}
</style>

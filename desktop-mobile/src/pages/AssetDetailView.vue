<template>
  <q-page class="asset-detail-page q-pa-md">
    <div class="content-shell">
      <q-card flat bordered class="asset-card">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">
            {{
              is_room
                ? $t('asset_detail.room_title', 'Room Audit')
                : $t('asset_detail.title', 'Asset Details')
            }}
          </div>
          <div class="text-caption opacity-80">
            {{
              is_room
                ? $t('asset_detail.room_subtitle', 'Verify location and condition')
                : $t('asset_detail.subtitle', 'Scanned asset overview')
            }}
          </div>
        </q-card-section>

        <q-card-section v-if="is_loading" class="flex flex-center q-pa-xl">
          <q-spinner color="primary" size="36px" />
        </q-card-section>

        <q-card-section v-else-if="is_room && room_record" class="q-pa-lg">
          <div class="info-block q-mb-md">
            <div class="info-label">{{ $t('asset_detail.room_name', 'Room Label') }}</div>
            <div class="info-value">{{ room_record.roomLabel || '-' }}</div>
          </div>
          <div class="info-block q-mb-lg">
            <div class="info-label">{{ $t('asset_detail.site_name', 'Site / Building') }}</div>
            <div class="info-value">{{ room_record.site?.name || '-' }}</div>
          </div>

          <q-separator class="q-my-lg" />

          <q-banner v-if="is_readonly" class="bg-info text-white rounded-borders q-mb-md">
            {{ $t('asset_detail.readonly_view', 'Read-only view from recent scans') }}
          </q-banner>

          <div v-if="!is_readonly" class="q-mb-md">
            <div class="text-subtitle1 text-weight-bold q-mb-xs">
              {{ $t('asset_detail.log_room_audit', 'Log Room Audit') }}
            </div>

            <div class="q-gutter-md q-mt-sm">
              <q-input
                v-model="room_location"
                outlined
                dense
                :label="$t('asset_detail.room_location', 'GPS Location / Coordinates (Optional)')"
                placeholder="e.g., 33.8938, 35.5018"
              />

              <q-select
                v-model="room_status"
                :options="room_status_options"
                outlined
                dense
                emit-value
                map-options
                :label="$t('asset_detail.room_status', 'Room Status')"
              />

              <q-input
                v-model="room_notes"
                type="textarea"
                outlined
                rows="3"
                dense
                :label="
                  $t(
                    'asset_detail.specific_location_notes',
                    'Specific Location Details / Landmarks',
                  )
                "
              />
            </div>
          </div>

          <q-btn
            v-if="!is_readonly"
            unelevated
            color="primary"
            class="full-width q-mb-sm"
            :label="$t('asset_detail.save', 'Save Log')"
            :loading="is_saving"
            @click="handleRoomSave"
          />
          <q-btn
            flat
            color="primary"
            class="full-width"
            :label="$t('asset_detail.back_to_scanner', 'Back to Scanner')"
            @click="goToScanner"
          />
        </q-card-section>

        <q-card-section v-else-if="!is_room && asset_record" class="q-pa-lg">
          <div class="info-block q-mb-md">
            <div class="info-label">{{ $t('asset_detail.model', 'Model') }}</div>
            <div class="info-value">{{ model_name }}</div>
          </div>
          <div class="info-block q-mb-md">
            <div class="info-label">{{ $t('asset_detail.serial', 'Serial') }}</div>
            <div class="info-value">{{ serial_number }}</div>
          </div>
          <div class="info-block q-mb-lg">
            <div class="info-label">{{ $t('asset_detail.status', 'Status') }}</div>
            <q-chip
              color="primary"
              text-color="white"
              size="sm"
              :label="getStatusLabel(asset_record.status)"
            />
          </div>

          <q-separator class="q-my-lg" />

          <q-banner v-if="is_readonly" class="bg-info text-white rounded-borders q-mb-md">
            {{ $t('asset_detail.readonly_view', 'Read-only view from recent scans') }}
          </q-banner>

          <div v-if="!is_readonly" class="q-mb-md">
            <div class="text-subtitle1 text-weight-bold q-mb-xs">
              {{ $t('asset_detail.log_usage', 'Log New Usage') }}
            </div>

            <div class="q-gutter-md q-mt-sm">
              <q-input
                v-model.number="usage_hours"
                type="number"
                outlined
                dense
                :label="$t('asset_detail.usage_hours', 'Added Runtime Hours')"
                min="0"
              />

              <q-select
                v-model="status_value"
                :options="asset_status_options"
                outlined
                dense
                emit-value
                map-options
                :label="$t('asset_detail.status', 'Current Status')"
              />

              <q-input
                v-model="update_notes"
                type="textarea"
                outlined
                autogrow
                dense
                :label="$t('asset_detail.notes', 'Field Notes')"
              />
            </div>
          </div>

          <q-btn
            v-if="!is_readonly"
            unelevated
            color="primary"
            class="full-width q-mb-sm"
            :label="$t('asset_detail.save', 'Save Log')"
            :loading="is_saving"
            @click="handleAssetSave"
          />
          <q-btn
            flat
            color="primary"
            class="full-width"
            :label="$t('asset_detail.back_to_scanner', 'Back to Scanner')"
            @click="goToScanner"
          />

          <q-separator class="q-my-lg" />

          <div class="q-mb-md">
            <div class="text-subtitle1 text-weight-bold q-mb-xs">
              {{ $t('assets.audit_history_title', 'Asset Audit History') }}
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              {{ $t('assets.audit_history_subtitle', { assetLabel: '' }) }}
            </div>

            <div v-if="is_loading_audit" class="flex flex-center q-pa-md">
              <q-spinner color="primary" size="24px" />
            </div>

            <q-list
              v-else-if="audit_logs.length > 0"
              bordered
              separator
              class="rounded-borders q-mb-md"
            >
              <q-item v-for="entry in audit_logs" :key="entry.id" class="q-py-sm">
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ getAuditActionLabel(entry.actionType) }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ formatAuditTimestamp(entry.clientCreatedAt) }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ $t('assets.audit_history_supervisor') }}: {{ getSupervisorLabel(entry) }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ $t('assets.audit_history_location') }}: {{ getLocationLabel(entry) }}
                  </q-item-label>
                  <q-item-label v-if="entry.actionNotes" caption class="q-mt-xs">
                    {{ $t('asset_detail.notes', 'Notes') }}: {{ entry.actionNotes }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-chip
                    color="primary"
                    text-color="white"
                    size="sm"
                    :label="
                      $t('assets.audit_history_hours_value', {
                        value: entry.hoursUsedIncrement ?? 0,
                      })
                    "
                  />
                </q-item-section>
              </q-item>
            </q-list>

            <q-banner v-else class="bg-grey-2 text-grey-8 rounded-borders">
              {{ $t('assets.audit_history_empty', 'There are no audit logs for this asset yet.') }}
            </q-banner>
          </div>
        </q-card-section>

        <q-card-section v-else class="q-pa-lg">
          <q-banner class="bg-negative text-white rounded-borders q-mb-md">
            {{ $t('asset_detail.not_found', 'Record not found.') }}
          </q-banner>
          <q-btn
            unelevated
            color="primary"
            class="full-width"
            :label="$t('asset_detail.back_to_scanner', 'Back to Scanner')"
            @click="goToScanner"
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAssetStore } from 'src/stores/asset-store';
import type { AssetInstance, MaintenanceRecord, StorageRoom } from 'src/utils/types';

interface AuditLogEntry {
  id: string | number;
  actionType: string | null;
  clientCreatedAt: string;
  hoursUsedIncrement?: number | null;
  actionNotes?: string | null;
  user?: {
    fullName?: string | null;
    email?: string | null;
  } | null;
  storageRoom?: {
    roomLabel?: string | null;
  } | null;
}

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const { t: $t } = useI18n();
const asset_store = useAssetStore();

const is_loading = ref(false);
const is_saving = ref(false);
const is_loading_maintenance = ref(false);
const is_loading_audit = ref(false);

const target_id = computed(() => String(route.params.asset_id || ''));
const is_room = computed(() => route.query.type === 'room');
const is_readonly = computed(() => route.query.readonly === 'true');

const asset_record = ref<AssetInstance | null>(null);
const usage_hours = ref(0);
const update_notes = ref('');
const status_value = ref('on_site');
const maintenance_records = ref<MaintenanceRecord[]>([]);
const audit_logs = ref<AuditLogEntry[]>([]);

const asset_status_options = [
  { label: $t('asset_detail.status_on_site', 'On Site'), value: 'on_site' },
  {
    label: $t('asset_detail.status_needs_maintenance', 'Needs Maintenance'),
    value: 'needs_maintenance',
  },
  { label: $t('asset_detail.status_offline', 'Offline'), value: 'offline' },
];

const model_name = computed(() => {
  if (!asset_record.value) return '-';
  return asset_record.value.type?.modelName || asset_record.value.type?.model_name || '-';
});

const serial_number = computed(() => {
  if (!asset_record.value) return '-';
  return asset_record.value.serialNumber || asset_record.value.serial_number || '-';
});

const room_record = ref<StorageRoom | null>(null);
const room_notes = ref('');
const room_status = ref('operational');
const room_location = ref('');

const room_status_options = [
  { label: $t('asset_detail.room_operational', 'Operational'), value: 'operational' },
  { label: $t('asset_detail.room_restricted', 'Restricted Access'), value: 'restricted' },
  { label: $t('asset_detail.room_hazard', 'Safety Hazard Present'), value: 'hazard' },
];

function getStatusLabel(status?: string | null) {
  switch (status) {
    case 'on_site':
      return $t('asset_detail.status_on_site', 'On Site');
    case 'needs_maintenance':
      return $t('asset_detail.status_needs_maintenance', 'Needs Maintenance');
    case 'offline':
      return $t('asset_detail.status_offline', 'Offline');
    default:
      return status || '-';
  }
}

async function goToScanner() {
  await router.push({ name: 'scanner' });
}

function createTimeout(ms: number) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms),
  );
}

async function loadDetail() {
  if (!target_id.value) return;
  is_loading.value = true;

  try {
    if (is_room.value) {
      await Promise.race([loadRoom(), createTimeout(10000)]);
    } else {
      await Promise.race([loadAsset(), createTimeout(10000)]);
    }
  } catch (error) {
    console.error('Load error:', error);
    $q.notify({
      type: 'negative',
      message: extractErrorMessage(error),
      position: 'top',
      timeout: 8000,
    });
  } finally {
    is_loading.value = false;
  }
}

async function loadAsset() {
  try {
    const response = await asset_store.fetchAssetById(target_id.value);
    asset_record.value = response.asset;

    status_value.value = asset_record.value?.status || 'on_site';
    usage_hours.value = 0;
    update_notes.value = '';

    await loadMaintenanceRecords();
    await loadAuditLogs();
  } catch (error) {
    console.error('Asset load error:', error);
    throw error;
  }
}

async function loadRoom() {
  try {
    const response = await asset_store.fetchRoomById(target_id.value);
    room_record.value = response.room;
  } catch (error) {
    console.error('Room load error:', error);
    throw error;
  }
}

async function loadMaintenanceRecords() {
  is_loading_maintenance.value = true;
  try {
    const response = await asset_store.fetchMaintenanceRecords(target_id.value);
    maintenance_records.value = response.maintenance_records;
  } catch (error) {
    console.error('Maintenance records error:', error);
    maintenance_records.value = [];
  } finally {
    is_loading_maintenance.value = false;
  }
}

function getAuditActionLabel(action_type: string | null) {
  switch (action_type) {
    case 'usage_update':
      return $t('assets.audit_history_usage_update', 'Usage Update');
    case 'usage_batch':
      return $t('assets.audit_history_usage_batch', 'Bulk Usage Sync');
    default:
      return $t('assets.audit_history_unknown_action', 'Unknown action');
  }
}

function getSupervisorLabel(entry: AuditLogEntry) {
  return entry.user?.fullName || entry.user?.email || $t('assets.audit_history_unknown', 'Unknown');
}

function getLocationLabel(entry: AuditLogEntry) {
  return entry.storageRoom?.roomLabel || $t('assets.audit_history_unknown', 'Unknown');
}

function formatAuditTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return $t('assets.audit_history_unknown', 'Unknown');
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

async function loadAuditLogs() {
  is_loading_audit.value = true;
  try {
    const response = await asset_store.fetchAssetAuditLogs(target_id.value);
    audit_logs.value = response.audit_logs;
  } catch (error) {
    console.error('Audit logs error:', error);
    audit_logs.value = [];
  } finally {
    is_loading_audit.value = false;
  }
}

async function handleAssetSave() {
  if (!target_id.value) return;

  is_saving.value = true;

  try {
    await asset_store.saveAssetUpdate({
      asset_id: target_id.value,
      usage_hours: usage_hours.value,
      update_notes: update_notes.value,
      status: status_value.value,
    });

    $q.notify({
      type: 'positive',
      message: $t('asset_detail.usage_update_saved', 'Asset log saved'),
    });

    await goToScanner();
  } catch (error) {
    console.error(error);

    $q.notify({
      type: 'negative',
      message: $t('asset_detail.failed_save_usage_update', 'Failed to save asset log'),
    });
  } finally {
    is_saving.value = false;
  }
}

async function handleRoomSave() {
  if (!target_id.value) return;

  await nextTick();

  is_saving.value = true;

  try {
    await asset_store.logRoomAudit({
      room_id: target_id.value,
      status: room_status.value,
      notes: room_notes.value,
      location_gps: room_location.value,
    });

    $q.notify({ type: 'positive', message: $t('asset_detail.room_saved', 'Room audit saved') });

    await goToScanner();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: extractErrorMessage(error), timeout: 8000 });
  } finally {
    is_saving.value = false;
  }
}

function extractErrorMessage(error: unknown): string {
  try {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as Record<string, unknown>).response;
      if (response && typeof response === 'object' && 'data' in response) {
        const data = response.data as Record<string, unknown>;
        if (data?.details) return `${String(data.error)} — ${data.details as string}`;
        if (data?.error) return data.error as string;
      }
    }
    if (error instanceof Error) return error.message;
    return String(error);
  } catch {
    return 'Unknown error occurred';
  }
}

onMounted(() => {
  void loadDetail();
});
</script>

<style scoped lang="scss">
.asset-detail-page {
  min-height: calc(100vh - 64px);
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
}

.content-shell {
  max-width: 520px;
  margin: 0 auto;
}

.asset-card {
  border-radius: 16px;
  overflow: hidden;
}

.info-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.35rem;
}

.info-value {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  word-break: break-word;
}

.q-gutter-md > * + * {
  margin-top: 0.75rem;
}

@media (max-width: 599px) {
  .asset-detail-page {
    padding: 12px;
  }
}
</style>

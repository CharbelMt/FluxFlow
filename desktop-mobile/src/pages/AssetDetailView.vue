<template>
  <q-page class="asset-detail-page q-pa-md">
    <div class="content-shell">
      <q-card flat bordered class="asset-card">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">{{ $t('asset_detail.title') }}</div>
          <div class="text-caption opacity-80">{{ $t('asset_detail.subtitle') }}</div>
        </q-card-section>

        <q-card-section v-if="is_loading" class="flex flex-center q-pa-xl">
          <q-spinner color="primary" size="36px" />
        </q-card-section>

        <q-card-section v-else-if="asset_record" class="q-pa-lg">
          <div class="info-block q-mb-md">
            <div class="info-label">{{ $t('asset_detail.model') }}</div>
            <div class="info-value">{{ model_name }}</div>
          </div>

          <div class="info-block q-mb-md">
            <div class="info-label">{{ $t('asset_detail.serial') }}</div>
            <div class="info-value">{{ serial_number }}</div>
          </div>

          <div class="info-block q-mb-lg">
            <div class="info-label">{{ $t('asset_detail.status') }}</div>
            <q-chip color="primary" text-color="white" size="sm" :label="status_text" />
          </div>

          <q-separator class="q-my-lg" />

          <div class="q-mb-md">
            <div class="text-subtitle1 text-weight-bold q-mb-xs">
              {{ $t('asset_detail.log_usage') }}
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              {{ $t('asset_detail.log_usage_hint') }}
            </div>

            <div class="q-gutter-md">
              <q-input
                v-model.number="usage_hours"
                type="number"
                outlined
                dense
                :label="$t('asset_detail.usage_hours')"
                min="0"
              />

              <q-select
                v-model="status_value"
                :options="status_options"
                outlined
                dense
                emit-value
                map-options
                :label="$t('asset_detail.status')"
              />

              <q-input
                v-model="update_notes"
                type="textarea"
                outlined
                autogrow
                dense
                :label="$t('asset_detail.notes')"
              />
            </div>
          </div>

          <q-btn
            unelevated
            color="primary"
            class="full-width q-mb-sm"
            :label="$t('asset_detail.save')"
            :loading="is_saving"
            @click="handleSave"
          />

          <q-btn
            flat
            color="primary"
            class="full-width"
            :label="$t('asset_detail.back_to_scanner')"
            @click="goToScanner"
          />

          <q-separator class="q-my-lg" />

          <div class="q-mb-md">
            <div class="text-subtitle1 text-weight-bold q-mb-xs">
              {{ $t('asset_detail.maintenance_title') }}
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              {{ $t('asset_detail.maintenance_hint') }}
            </div>

            <div v-if="is_loading_maintenance" class="flex flex-center q-pa-md">
              <q-spinner color="primary" size="24px" />
            </div>

            <q-list
              v-else-if="maintenance_records.length > 0"
              bordered
              separator
              class="rounded-borders q-mb-md"
            >
              <q-item v-for="record in maintenance_records" :key="record.id" class="q-py-sm">
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ formatServiceDate(record.serviceDate || record.service_date) }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ record.technicianNotes || record.technician_notes || '-' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip
                    color="primary"
                    text-color="white"
                    size="sm"
                    :label="getStatusLabel(record.status)"
                  />
                </q-item-section>
              </q-item>
            </q-list>

            <q-banner v-else class="bg-grey-2 text-grey-8 rounded-borders q-mb-md">
              {{ $t('asset_detail.maintenance_empty') }}
            </q-banner>

            <div class="q-gutter-md q-mb-sm">
              <q-input
                v-model="maintenance_form.service_date"
                type="date"
                outlined
                dense
                :label="$t('asset_detail.maintenance_date')"
              />

              <q-select
                v-model="maintenance_form.status"
                :options="status_options"
                outlined
                dense
                emit-value
                map-options
                :label="$t('asset_detail.maintenance_status')"
              />

              <q-input
                v-model="maintenance_form.notes"
                type="textarea"
                outlined
                autogrow
                dense
                :label="$t('asset_detail.maintenance_notes')"
              />
            </div>

            <q-btn
              unelevated
              color="secondary"
              class="full-width"
              :label="$t('asset_detail.maintenance_add')"
              :loading="is_saving_maintenance"
              @click="saveMaintenanceRecord"
            />
          </div>
        </q-card-section>

        <q-card-section v-else class="q-pa-lg">
          <q-banner class="bg-negative text-white rounded-borders q-mb-md">
            {{ $t('asset_detail.not_found') }}
          </q-banner>

          <q-btn
            unelevated
            color="primary"
            class="full-width"
            :label="$t('asset_detail.back_to_scanner')"
            @click="goToScanner"
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAssetStore } from 'src/stores/asset-store';
import { useDialog } from 'src/composables/useDialog';
import ConfirmSaveDialog from 'components/ConfirmSaveDialog.vue';
import type { AssetInstance, MaintenanceRecord } from 'src/utils/types';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const { t: $t } = useI18n();
const asset_store = useAssetStore();
const { pushDialog } = useDialog();

const is_loading = ref(false);
const is_saving = ref(false);
const asset_record = ref<AssetInstance | null>(null);
const usage_hours = ref(0);
const update_notes = ref('');
const status_value = ref('');
const maintenance_records = ref<MaintenanceRecord[]>([]);
const is_loading_maintenance = ref(false);
const is_saving_maintenance = ref(false);
const maintenance_form = ref({
  service_date: new Date().toISOString().slice(0, 10),
  status: 'maintenance',
  notes: '',
});

const status_options = [
  { label: $t('asset_detail.status_on_site'), value: 'on_site' },
  { label: $t('asset_detail.status_in_transit'), value: 'in_transit' },
  { label: $t('asset_detail.status_maintenance'), value: 'maintenance' },
  { label: $t('asset_detail.status_offline'), value: 'offline' },
];

const asset_id = computed(() => String(route.params.asset_id || ''));

const model_name = computed(() => {
  if (!asset_record.value) return '-';
  return asset_record.value.type?.modelName || asset_record.value.type?.model_name || '-';
});

const serial_number = computed(() => {
  if (!asset_record.value) return '-';
  return asset_record.value.serialNumber || asset_record.value.serial_number || '-';
});

const status_text = computed(() => {
  if (!asset_record.value) return '-';
  return getStatusLabel(asset_record.value.status);
});

function getStatusLabel(status?: string | null) {
  switch (status) {
    case 'on_site':
      return $t('asset_detail.status_on_site');
    case 'in_transit':
      return $t('asset_detail.status_in_transit');
    case 'maintenance':
      return $t('asset_detail.status_maintenance');
    case 'offline':
      return $t('asset_detail.status_offline');
    default:
      return status || '-';
  }
}

function syncFormState() {
  status_value.value = asset_record.value?.status || 'on_site';
  usage_hours.value =
    asset_record.value?.totalHoursUsed || asset_record.value?.total_hours_used || 0;
  update_notes.value = '';
}

async function loadAssetDetail() {
  if (!asset_id.value) {
    asset_record.value = null;
    return;
  }

  is_loading.value = true;
  try {
    const response = await asset_store.fetchAssetById(asset_id.value);
    asset_record.value = response.asset;
    syncFormState();
    await loadMaintenanceRecords();
  } catch (error) {
    console.error(error);
    asset_record.value = null;
    $q.notify({ type: 'negative', message: $t('asset_detail.failed_load_asset') });
  } finally {
    is_loading.value = false;
  }
}

async function loadMaintenanceRecords() {
  if (!asset_id.value) {
    maintenance_records.value = [];
    return;
  }

  is_loading_maintenance.value = true;

  try {
    const response = await asset_store.fetchMaintenanceRecords(asset_id.value);
    maintenance_records.value = response.maintenance_records;
  } catch (error) {
    console.error(error);
    maintenance_records.value = [];
    $q.notify({ type: 'negative', message: $t('asset_detail.failed_load_maintenance') });
  } finally {
    is_loading_maintenance.value = false;
  }
}

function formatServiceDate(service_date?: string | null) {
  if (!service_date) {
    return '-';
  }

  const parsed_date = new Date(service_date);
  if (Number.isNaN(parsed_date.getTime())) {
    return service_date;
  }

  return parsed_date.toLocaleDateString();
}

async function saveMaintenanceRecord() {
  if (!asset_id.value) {
    return;
  }

  if (!maintenance_form.value.service_date || !maintenance_form.value.status) {
    $q.notify({ type: 'warning', message: $t('errors.field_required') });
    return;
  }

  is_saving_maintenance.value = true;

  try {
    await asset_store.createMaintenanceRecord({
      asset_id: asset_id.value,
      service_date: maintenance_form.value.service_date,
      status: maintenance_form.value.status,
      notes: maintenance_form.value.notes,
    });

    maintenance_form.value.notes = '';
    maintenance_form.value.status = 'maintenance';
    maintenance_form.value.service_date = new Date().toISOString().slice(0, 10);

    await loadMaintenanceRecords();

    $q.notify({ type: 'positive', message: $t('asset_detail.maintenance_saved') });
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: $t('asset_detail.failed_save_maintenance') });
  } finally {
    is_saving_maintenance.value = false;
  }
}

async function goToScanner() {
  await router.push({ name: 'scanner' });
}

function handleSave() {
  pushDialog(ConfirmSaveDialog, {
    title: $t('asset_detail.confirm_usage_log_title'),
    message: $t('asset_detail.confirm_usage_log_message'),
    details: $t('asset_detail.confirm_usage_log_details', {
      hours: usage_hours.value,
      status: getStatusLabel(status_value.value),
    }),
    cancelLabel: $t('common.cancel'),
    confirmLabel: $t('asset_detail.save'),
  }).onOk(() => {
    void saveAssetUpdate();
  });
}

async function saveAssetUpdate() {
  if (!asset_id.value) {
    return;
  }

  is_saving.value = true;
  try {
    const result = await asset_store.saveAssetUpdate({
      asset_id: asset_id.value,
      usage_hours: usage_hours.value,
      update_notes: update_notes.value,
      status: status_value.value,
    });

    if (result.queued) {
      return;
    }

    $q.notify({ type: 'positive', message: $t('asset_detail.usage_update_saved') });
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: $t('asset_detail.failed_save_usage_update') });
  } finally {
    is_saving.value = false;
  }
}

onMounted(() => {
  void loadAssetDetail();
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

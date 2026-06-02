<template>
  <div class="scanner-detail-view">
    <q-card v-if="scanned_item" class="q-pa-lg">
      <!-- Asset Detail View -->
      <template v-if="scanned_item.type === 'asset'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ $t('scanner_detail.title') }}</div>
          <q-space />
          <q-icon name="close" class="cursor-pointer" @click="emit('close')" />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="q-mb-md">
                <div class="text-overline text-grey">{{ $t('scanner_detail.asset_id') }}</div>
                <div class="text-body2 text-weight-bold">{{ scanned_item.data.id }}</div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">{{ $t('scanner_detail.serial_number') }}</div>
                <div class="text-body2 text-weight-bold">
                  {{ getSerialNumber(scanned_item.data) }}
                </div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">{{ $t('scanner_detail.status') }}</div>
                <q-select
                  :model-value="scanned_item.data.status || ''"
                  :options="status_options"
                  outlined
                  dense
                  emit-value
                  map-options
                  option-value="value"
                  option-label="label"
                  disable
                />
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">{{ $t('scanner_detail.hours_used') }}</div>
                <div class="text-body2">
                  {{ getTotalHoursUsed(scanned_item.data) }}
                </div>
              </div>
            </div>

            <div class="col-12 col-md-6" v-if="scanned_item.data.type">
              <div class="q-mb-md">
                <div class="text-overline text-grey">{{ $t('scanner_detail.model') }}</div>
                <div class="text-body2 text-weight-bold">
                  {{ getModelName(scanned_item.data.type) }}
                </div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">{{ $t('scanner_detail.manufacturer') }}</div>
                <div class="text-body2">{{ scanned_item.data.type.manufacturer }}</div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">
                  {{ $t('scanner_detail.maintenance_interval') }}
                </div>
                <div class="text-body2">
                  {{ getMaintenanceInterval(scanned_item.data.type) }}
                  {{ $t('scanner_detail.hours_suffix') }}
                </div>
              </div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6" v-if="scanned_item.data.site">
              <div class="text-overline text-grey">{{ $t('scanner_detail.assigned_site') }}</div>
              <div class="text-body2 text-weight-bold">
                {{ scanned_item.data.site.name }}
              </div>
              <div class="text-caption text-grey" v-if="scanned_item.data.site.location_gps">
                {{ scanned_item.data.site.location_gps }}
              </div>
            </div>

            <div class="col-12 col-md-6" v-if="scanned_item.data.room">
              <div class="text-overline text-grey">{{ $t('scanner_detail.current_room') }}</div>
              <div class="text-body2 text-weight-bold">
                {{ getRoomLabel(scanned_item.data.room) }}
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('scanner_detail.close')" color="primary" @click="emit('close')" />
          <q-btn
            unelevated
            :label="$t('scanner_detail.view_history')"
            color="primary"
            @click="emit('view-history', scanned_item.data.id)"
          />
        </q-card-actions>
      </template>

      <template v-else-if="scanned_item.type === 'room'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ $t('scanner_detail.storage_room_title') }}</div>
          <q-space />
          <q-icon name="close" class="cursor-pointer" @click="emit('close')" />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="q-mb-md">
                <div class="text-overline text-grey">{{ $t('scanner_detail.room_id') }}</div>
                <div class="text-body2 text-weight-bold">{{ scanned_item.data.id }}</div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">{{ $t('scanner_detail.room_label') }}</div>
                <div class="text-body2 text-weight-bold">
                  {{ getRoomLabel(scanned_item.data) }}
                </div>
              </div>
            </div>

            <div class="col-12 col-md-6" v-if="scanned_item.data.site">
              <div class="q-mb-md">
                <div class="text-overline text-grey">{{ $t('scanner_detail.site') }}</div>
                <div class="text-body2 text-weight-bold">
                  {{ scanned_item.data.site.name }}
                </div>
              </div>

              <div class="q-mb-md" v-if="scanned_item.data.site.location_gps">
                <div class="text-overline text-grey">{{ $t('scanner_detail.gps_location') }}</div>
                <div class="text-body2">{{ scanned_item.data.site.location_gps }}</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('scanner_detail.close')" color="primary" @click="emit('close')" />
        </q-card-actions>
      </template>
    </q-card>

    <q-banner v-else-if="!is_loading && !has_error" class="bg-grey-2">
      <div class="text-center text-grey">{{ $t('scanner_detail.empty_state') }}</div>
    </q-banner>

    <q-banner v-else-if="has_error" class="bg-negative text-white">
      <div class="row items-center">
        <q-icon name="error" size="md" class="q-mr-md" />
        <div class="col">{{ error_message }}</div>
        <q-space />
        <q-btn
          unelevated
          :label="$t('scanner_detail.dismiss')"
          color="white"
          text-color="negative"
          @click="emit('clear')"
        />
      </div>
    </q-banner>

    <q-linear-progress v-if="is_loading" indeterminate color="primary" class="q-mt-md" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ScannedAssetData, ScannedItem, ScannedRoomData } from 'src/utils/types';

interface Props {
  scanned_item: ScannedItem | null;
  is_loading: boolean;
  error_message: string | null;
  has_error: boolean;
}

defineProps<Props>();

const { t: $t } = useI18n();

const status_options = [
  { label: $t('scanner_detail.status_on_site', 'On Site'), value: 'on_site' },
  {
    label: $t('scanner_detail.status_needs_maintenance', 'Needs Maintenance'),
    value: 'needs_maintenance',
  },
  { label: $t('scanner_detail.status_offline', 'Offline'), value: 'offline' },
];

const emit = defineEmits<{
  close: [];
  'view-history': [asset_id: string];
  clear: [];
}>();

const getSerialNumber = (asset: ScannedAssetData) =>
  asset.serialNumber || asset.serial_number || '';

const getTotalHoursUsed = (asset: ScannedAssetData) =>
  asset.totalHoursUsed || asset.total_hours_used || 0;

const getModelName = (assetType?: ScannedAssetData['type']) =>
  assetType?.modelName || assetType?.model_name || '';

const getMaintenanceInterval = (assetType?: ScannedAssetData['type']) =>
  assetType?.maintenanceIntervalHrs || assetType?.maintenance_interval_hrs || 0;

const getRoomLabel = (room: ScannedRoomData) => room.roomLabel || room.room_label || '';
</script>

<style scoped lang="scss">
.scanner-detail-view {
  max-width: 900px;
  margin: 0 auto;

  :deep(.q-card) {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .text-overline {
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
  }
}
</style>

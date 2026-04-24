<template>
  <div class="scanner-detail-view">
    <q-card v-if="scanned_item" class="q-pa-lg">
      <!-- Asset Detail View -->
      <template v-if="scanned_item.type === 'asset'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Asset Details</div>
          <q-space />
          <q-icon name="close" class="cursor-pointer" @click="emit('close')" />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="row q-col-gutter-md">
            <!-- Left Column: Asset Information -->
            <div class="col-12 col-md-6">
              <div class="q-mb-md">
                <div class="text-overline text-grey">Asset ID</div>
                <div class="text-body2 text-weight-bold">{{ scanned_item.data.id }}</div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">Serial Number</div>
                <div class="text-body2 text-weight-bold">
                  {{ getSerialNumber(scanned_item.data) }}
                </div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">Status</div>
                <q-chip
                  :label="scanned_item.data.status"
                  :color="getStatusColor(scanned_item.data.status)"
                  text-color="white"
                  size="sm"
                />
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">Hours Used</div>
                <div class="text-body2">
                  {{ getTotalHoursUsed(scanned_item.data) }}
                </div>
              </div>
            </div>

            <!-- Right Column: Type Information -->
            <div class="col-12 col-md-6" v-if="scanned_item.data.type">
              <div class="q-mb-md">
                <div class="text-overline text-grey">Model</div>
                <div class="text-body2 text-weight-bold">
                  {{ getModelName(scanned_item.data.type) }}
                </div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">Manufacturer</div>
                <div class="text-body2">{{ scanned_item.data.type.manufacturer }}</div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">Category</div>
                <div class="text-body2">{{ scanned_item.data.type.category }}</div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">Maintenance Interval</div>
                <div class="text-body2">
                  {{ getMaintenanceInterval(scanned_item.data.type) }} hrs
                </div>
              </div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- Location Information -->
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6" v-if="scanned_item.data.site">
              <div class="text-overline text-grey">Assigned Site</div>
              <div class="text-body2 text-weight-bold">
                {{ scanned_item.data.site.name }}
              </div>
              <div class="text-caption text-grey" v-if="scanned_item.data.site.location_gps">
                {{ scanned_item.data.site.location_gps }}
              </div>
            </div>

            <div class="col-12 col-md-6" v-if="scanned_item.data.room">
              <div class="text-overline text-grey">Current Room</div>
              <div class="text-body2 text-weight-bold">
                {{ getRoomLabel(scanned_item.data.room) }}
              </div>
              <div class="text-caption text-grey">
                {{ getRoomTagUid(scanned_item.data.room) }}
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- Action Buttons -->
        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" @click="emit('close')" />
          <q-btn
            unelevated
            label="View History"
            color="primary"
            @click="emit('view-history', scanned_item.data.id)"
          />
        </q-card-actions>
      </template>

      <!-- Room Detail View -->
      <template v-else-if="scanned_item.type === 'room'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Storage Room Details</div>
          <q-space />
          <q-icon name="close" class="cursor-pointer" @click="emit('close')" />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="q-mb-md">
                <div class="text-overline text-grey">Room ID</div>
                <div class="text-body2 text-weight-bold">{{ scanned_item.data.id }}</div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">Room Label</div>
                <div class="text-body2 text-weight-bold">
                  {{ getRoomLabel(scanned_item.data) }}
                </div>
              </div>

              <div class="q-mb-md">
                <div class="text-overline text-grey">Room Tag UID</div>
                <div class="text-body2">{{ getRoomTagUid(scanned_item.data) }}</div>
              </div>
            </div>

            <div class="col-12 col-md-6" v-if="scanned_item.data.site">
              <div class="q-mb-md">
                <div class="text-overline text-grey">Site</div>
                <div class="text-body2 text-weight-bold">
                  {{ scanned_item.data.site.name }}
                </div>
              </div>

              <div class="q-mb-md" v-if="scanned_item.data.site.location_gps">
                <div class="text-overline text-grey">GPS Location</div>
                <div class="text-body2">{{ scanned_item.data.site.location_gps }}</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- Action Buttons -->
        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" @click="emit('close')" />
        </q-card-actions>
      </template>
    </q-card>

    <!-- Empty State -->
    <q-banner v-else-if="!is_loading && !has_error" class="bg-grey-2">
      <div class="text-center text-grey">Scan a QR code to view details</div>
    </q-banner>

    <!-- Error State -->
    <q-banner v-else-if="has_error" class="bg-negative text-white">
      <div class="row items-center">
        <q-icon name="error" size="md" class="q-mr-md" />
        <div class="col">{{ error_message }}</div>
        <q-space />
        <q-btn
          unelevated
          label="Dismiss"
          color="white"
          text-color="negative"
          @click="emit('clear')"
        />
      </div>
    </q-banner>

    <!-- Loading State -->
    <q-linear-progress v-if="is_loading" indeterminate color="primary" class="q-mt-md" />
  </div>
</template>

<script setup lang="ts">
import type { ScannedItem } from 'src/composables/useScanner';

interface Props {
  scanned_item: ScannedItem | null;
  is_loading: boolean;
  error_message: string | null;
  has_error: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'view-history': [asset_id: string];
  clear: [];
}>();

// Helper functions to handle both snake_case and camelCase fields
const getSerialNumber = (asset: any) => asset.serialNumber || asset.serial_number;
const getTotalHoursUsed = (asset: any) => asset.totalHoursUsed || asset.total_hours_used || 0;
const getModelName = (asset_type: any) => asset_type.modelName || asset_type.model_name;
const getMaintenanceInterval = (asset_type: any) =>
  asset_type.maintenanceIntervalHrs || asset_type.maintenance_interval_hrs;
const getRoomLabel = (room: any) => room.roomLabel || room.room_label;
const getRoomTagUid = (room: any) => room.roomTagUid || room.room_tag_uid;

const getStatusColor = (status: string) => {
  const status_colors: Record<string, string> = {
    on_site: 'positive',
    in_transit: 'warning',
    offline: 'negative',
    maintenance: 'info',
  };
  return status_colors[status] || 'grey';
};
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

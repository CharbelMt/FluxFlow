import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'boot/axios';
import type { AxiosError } from 'axios';

export interface ScannedAsset {
  type: 'asset';
  data: {
    id: string;
    type_id: string;
    serial_number: string;
    assigned_site_id: string;
    current_room_id: string;
    status: string;
    version_clock: number;
    total_hours_used: number;
    serialNumber?: string;
    assignedSiteId?: string;
    currentRoomId?: string;
    versionClock?: number;
    totalHoursUsed?: number;
    type?: {
      id: string;
      model_name: string;
      manufacturer: string;
      category: string;
      maintenance_interval_hrs: number;
      modelName?: string;
      maintenanceIntervalHrs?: number;
    };
    site?: {
      id: string;
      name: string;
      location_gps?: string;
      locationGps?: string;
      manager_id: string;
    };
    room?: {
      id: string;
      site_id: string;
      room_label: string;
      room_tag_uid: string;
      roomLabel?: string;
      roomTagUid?: string;
    };
  };
}

export interface ScannedRoom {
  type: 'room';
  data: {
    id: string;
    site_id: string;
    room_label: string;
    room_tag_uid: string;
    roomLabel?: string;
    roomTagUid?: string;
    site?: {
      id: string;
      name: string;
      location_gps?: string;
      locationGps?: string;
      manager_id: string;
    };
  };
}

export type ScannedItem = ScannedAsset | ScannedRoom;

interface ApiErrorBody {
  error?: string;
}

export const useScanner = () => {
  const $q = useQuasar();
  const scanned_item = ref<ScannedItem | null>(null);
  const is_loading = ref(false);
  const error_message = ref<string | null>(null);

  const is_asset = computed(() => scanned_item.value?.type === 'asset');
  const is_room = computed(() => scanned_item.value?.type === 'room');
  const has_error = computed(() => error_message.value !== null);

  const processScanUuid = async (uuid: string) => {
    is_loading.value = true;
    error_message.value = null;
    scanned_item.value = null;

    try {
      // First, try to fetch as an asset
      try {
        const asset_response = await api.get<{
          success: boolean;
          asset: ScannedAsset['data'];
        }>(`/assets/${uuid}`);

        if (asset_response.data.success) {
          scanned_item.value = {
            type: 'asset',
            data: asset_response.data.asset,
          };
          return;
        }
      } catch (asset_error) {
        const axios_error = asset_error as AxiosError<ApiErrorBody>;
        if (axios_error.response?.status !== 404) {
          throw asset_error;
        }
      }

      try {
        const room_response = await api.get<{
          success: boolean;
          room: ScannedRoom['data'];
        }>(`/storage-rooms/${uuid}`);

        if (room_response.data.success) {
          scanned_item.value = {
            type: 'room',
            data: room_response.data.room,
          };
          return;
        }
      } catch (room_error) {
        const axios_error = room_error as AxiosError<ApiErrorBody>;
        if (axios_error.response?.status !== 404) {
          throw room_error;
        }
      }

      error_message.value = `No asset or room found with UUID: ${uuid}`;
      $q.notify({
        type: 'negative',
        message: error_message.value ?? 'Scanned code was not found.',
        position: 'top',
        timeout: 2000,
      });
    } catch (error) {
      const axios_error = error as AxiosError<ApiErrorBody>;
      const error_text =
        axios_error.response?.data?.error || axios_error.message || 'Failed to scan item';
      error_message.value = error_text;

      $q.notify({
        type: 'negative',
        message: error_message.value ?? 'Failed to scan item',
        position: 'top',
        timeout: 2000,
      });

      console.error('Scanner error:', error);
    } finally {
      is_loading.value = false;
    }
  };

  const clearScannedItem = () => {
    scanned_item.value = null;
    error_message.value = null;
  };

  return {
    scanned_item,
    is_loading,
    error_message,
    is_asset,
    is_room,
    has_error,
    processScanUuid,
    clearScannedItem,
  };
};

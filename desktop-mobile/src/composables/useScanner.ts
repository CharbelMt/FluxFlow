import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'boot/axios';
import { useI18n } from 'vue-i18n';
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
      roomLabel?: string;
    };
  };
}

export interface ScannedRoom {
  type: 'room';
  data: {
    id: string;
    site_id: string;
    room_label: string;
    roomLabel?: string;
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
  const { t } = useI18n();
  const scanned_item = ref<ScannedItem | null>(null);
  const is_loading = ref(false);
  const error_message = ref<string | null>(null);
  const is_camera_on = ref(false);

  const is_asset = computed(() => scanned_item.value?.type === 'asset');
  const is_room = computed(() => scanned_item.value?.type === 'room');
  const has_error = computed(() => error_message.value !== null);

  let active_scan_finished = false;

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

      error_message.value = t('scanner.no_asset_or_room_found', { uuid });
      $q.notify({
        type: 'negative',
        message: error_message.value ?? t('scanner.scanned_code_not_found'),
        position: 'top',
        timeout: 2000,
      });
    } catch (error) {
      const axios_error = error as AxiosError<ApiErrorBody>;
      const error_text =
        axios_error.response?.data?.error ||
        axios_error.message ||
        t('scanner.failed_to_scan_item');
      error_message.value = error_text;

      $q.notify({
        type: 'negative',
        message: error_message.value ?? t('scanner.failed_to_scan_item'),
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

  const onDetect = (
    results: Array<{ rawValue?: string; displayValue?: string }>,
  ): Promise<string> | null | string => {
    if (active_scan_finished) return null;
    active_scan_finished = true;

    const first = results?.[0];
    const raw = first?.rawValue ?? first?.displayValue ?? '';
    const trimmed = raw.trim();

    if (!trimmed) {
      error_message.value = t('scanner.scanned_data_empty');
      $q.notify({ type: 'negative', message: error_message.value, position: 'top' });
      setTimeout(() => (active_scan_finished = false), 1000);
      return null;
    }

    void processScanUuid(trimmed);

    setTimeout(() => (active_scan_finished = false), 1500);

    return trimmed;
  };

  const onError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    error_message.value = message;
    $q.notify({ type: 'negative', message: message || t('scanner.camera_error'), position: 'top' });
  };

  const onCameraOn = () => {
    is_camera_on.value = true;
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
    // new handlers for vue-qrcode-reader
    onDetect,
    onError,
    onCameraOn,
    is_camera_on,
  };
};

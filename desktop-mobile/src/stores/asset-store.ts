import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import { submitUsageLog, syncPendingLogs } from 'src/services/usage_service';
import type { AssetInstance, AssetType, Site } from 'src/utils/types';

export interface AssetWithDetails extends AssetInstance {
  type: AssetType;
  site: Site;
}

export interface PendingAssetUpdate {
  asset_id: string;
  usage_hours: number;
  update_notes: string;
  status: string;
  queued_at: string;
  retry_count: number;
}

export interface SaveAssetUpdatePayload {
  asset_id: string;
  usage_hours: number;
  update_notes: string;
  status: string;
}

const pending_updates_storage_key = 'fluxflow_pending_asset_updates';

function readPendingUpdates() {
  if (typeof window === 'undefined') {
    return [] as PendingAssetUpdate[];
  }

  try {
    const stored_pending_updates = localStorage.getItem(pending_updates_storage_key);
    if (!stored_pending_updates) {
      return [] as PendingAssetUpdate[];
    }

    return JSON.parse(stored_pending_updates) as PendingAssetUpdate[];
  } catch (error) {
    console.error('Failed to read pending asset updates.', error);
    return [] as PendingAssetUpdate[];
  }
}

function writePendingUpdates(pending_updates: PendingAssetUpdate[]) {
  if (typeof window === 'undefined') {
    return;
  }

  if (pending_updates.length === 0) {
    localStorage.removeItem(pending_updates_storage_key);
    return;
  }

  localStorage.setItem(pending_updates_storage_key, JSON.stringify(pending_updates));
}

function isNetworkFailure(error: unknown) {
  const axios_error = error as { code?: string; message?: string; response?: unknown };

  return (
    axios_error.code === 'ERR_NETWORK' ||
    axios_error.message === 'Network Error' ||
    axios_error.response === undefined
  );
}

export const useAssetStore = defineStore('assets', {
  state: () => ({
    assets: [] as AssetWithDetails[],
    assetTypes: [] as AssetType[],
    loading: false,
    pending_updates: readPendingUpdates() as PendingAssetUpdate[],
  }),

  actions: {
    async fetchAssets() {
      this.loading = true;
      try {
        const response = await api.get('/assets');
        this.assets = response.data;
      } finally {
        this.loading = false;
      }
    },

    async fetchAssetTypes() {
      const response = await api.get('/assets/types');
      this.assetTypes = response.data;
    },

    async fetchAssetById(asset_id: string) {
      const response = await api.get(`/assets/${asset_id}`);
      return response.data as { success: true; asset: AssetWithDetails };
    },

    async saveAssetUpdate(update_data: SaveAssetUpdatePayload) {
      const result = await submitUsageLog({
        asset_id: update_data.asset_id,
        runtime_hours: update_data.usage_hours,
        update_notes: update_data.update_notes,
        status: update_data.status,
      });
      return result;
    },

    async syncPendingUpdates() {
      return await syncPendingLogs();
    },

    async bulkCreateAssets(payload: {
      site_id: string;
      room_id: string;
      type_id?: string;
      new_type?: {
        model_name: string;
        manufacturer: string;
        category: string;
        maintenance_interval_hrs: number;
      };
      serial_numbers: string[];
    }) {
      this.loading = true;
      try {
        const response = await api.post('/assets/bulk', payload);
        await Promise.all([
          this.fetchAssets(), // Refresh the table
          this.fetchAssetTypes(),
        ]);
        return response.data;
      } finally {
        this.loading = false;
      }
    },

    async fetchAssetQrCode(assetId: string) {
      const response = await api.get(`/assets/${assetId}/qr`);
      return response.data as { success: true; qrSvg: string; qrPayload: string };
    },

    async deleteAsset(assetId: string) {
      this.loading = true;
      try {
        await api.delete(`/assets/${assetId}`);
        await this.fetchAssets();
      } finally {
        this.loading = false;
      }
    },

    async createAssetType(payload: {
      model_name: string;
      manufacturer: string;
      category: string;
      maintenance_interval_hrs: number;
    }) {
      const response = await api.post('/assets/types', payload);
      await this.fetchAssetTypes();
      return response.data;
    },

    async updateAssetType(
      typeId: string,
      payload: {
        model_name: string;
        manufacturer: string;
        category: string;
        maintenance_interval_hrs: number;
      },
    ) {
      const response = await api.put(`/assets/types/${typeId}`, payload);
      await this.fetchAssetTypes();
      return response.data;
    },

    async deleteAssetType(typeId: string) {
      await api.delete(`/assets/types/${typeId}`);
      await this.fetchAssetTypes();
    },
  },
});

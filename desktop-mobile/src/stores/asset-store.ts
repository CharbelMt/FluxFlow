import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import type { AssetInstance, AssetType, Site } from 'src/utils/types';

export interface AssetWithDetails extends AssetInstance {
  type: AssetType;
  site: Site;
}

export const useAssetStore = defineStore('assets', {
  state: () => ({
    assets: [] as AssetWithDetails[],
    assetTypes: [] as AssetType[],
    loading: false,
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

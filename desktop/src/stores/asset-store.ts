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
        await this.fetchAssets(); // Refresh the table
        return response.data;
      } finally {
        this.loading = false;
      }
    },

    async fetchAssetQrCode(assetId: string) {
      const response = await api.get(`/assets/${assetId}/qr`);
      return response.data as { success: true; qrSvg: string; qrPayload: string };
    },
  },
});

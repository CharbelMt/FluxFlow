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
  },
});

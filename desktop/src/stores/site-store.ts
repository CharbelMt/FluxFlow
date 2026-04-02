import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import type { Site, StorageRoom } from 'src/utils/types';

// We create an extended type for the UI
export interface SiteWithRooms extends Site {
  rooms: StorageRoom[];
}

export const useSiteStore = defineStore('sites', {
  state: () => ({
    sites: [] as SiteWithRooms[],
    loading: false,
  }),

  actions: {
    async fetchSites() {
      this.loading = true;
      try {
        const response = await api.get('/sites');
        this.sites = response.data;
      } catch (error) {
        console.error('The signal is lost:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});

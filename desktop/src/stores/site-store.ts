import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import type { Site, StorageRoom } from 'src/utils/types';

export interface SiteWithRooms extends Site {
  storageRooms: StorageRoom[];
}

export const useSiteStore = defineStore('sites', {
  state: () => ({
    sites: [] as SiteWithRooms[],
    loading: false,
    activeSiteId: null as string | null,
  }),

  getters: {
    getSiteById: (state) => {
      return (id: string) => state.sites.find((site) => site.id === id);
    },

    totalSites: (state) => state.sites.length,
  },

  actions: {
    async fetchSites() {
      this.loading = true;
      try {
        const response = await api.get<SiteWithRooms[]>('/sites');
        this.sites = response.data;
      } catch (error) {
        console.error('The signal is lost:', error);
      } finally {
        this.loading = false;
      }
    },

    async createSite(payload: { name: string; location_gps?: string; manager_id: string }) {
      try {
        const response = await api.post('/sites', payload);
        if (response.data.success) {
          await this.fetchSites();
          return response.data.site;
        }
      } catch (error) {
        console.error('Failed to expand the empire:', error);
        throw error;
      }
    },

    async updateSite(
      siteId: string,
      payload: { name: string; location_gps?: string; manager_id: string },
    ) {
      try {
        const response = await api.put(`/sites/${siteId}`, payload);
        if (response.data.success) {
          await this.fetchSites();
          return response.data.site;
        }
      } catch (error) {
        console.error('Site update failed:', error);
        throw error;
      }
    },
  },
});

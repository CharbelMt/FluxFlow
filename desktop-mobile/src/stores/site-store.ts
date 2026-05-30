import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import type { Site, StorageRoom } from 'src/utils/types';

export interface SiteWithRooms extends Site {
  storageRooms: StorageRoom[];
}

function getSiteCreatedAt(site: SiteWithRooms) {
  return site.createdAt || site.created_at || '';
}

function sortSitesByCreatedAt(sites: SiteWithRooms[]) {
  return [...sites].sort((firstSite, secondSite) => {
    const firstCreatedAt = getSiteCreatedAt(firstSite);
    const secondCreatedAt = getSiteCreatedAt(secondSite);

    if (!firstCreatedAt && !secondCreatedAt) {
      return firstSite.id.localeCompare(secondSite.id);
    }

    if (!firstCreatedAt) return 1;
    if (!secondCreatedAt) return -1;

    const timeDifference = new Date(firstCreatedAt).getTime() - new Date(secondCreatedAt).getTime();

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return firstSite.id.localeCompare(secondSite.id);
  });
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
        this.sites = sortSitesByCreatedAt(response.data);
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

    async createStorageRoom(siteId: string, payload: { room_label: string }) {
      try {
        const response = await api.post('/storage-rooms', {
          site_id: siteId,
          ...payload,
        });
        if (response.data.success) {
          await this.fetchSites();
          return response.data.room;
        }
      } catch (error) {
        console.error('Failed to create storage room:', error);
        throw error;
      }
    },

    async updateStorageRoom(roomId: string, payload: { room_label: string }) {
      try {
        const response = await api.put(`/storage-rooms/${roomId}`, payload);
        if (response.data.success) {
          await this.fetchSites();
          return response.data.room;
        }
      } catch (error) {
        console.error('Failed to update storage room:', error);
        throw error;
      }
    },

    async fetchStorageRoomQrCode(roomId: string) {
      const response = await api.get(`/storage-rooms/${roomId}/qr`);
      return response.data as { success: true; qrSvg: string; qrPayload: string };
    },

    async deleteSite(siteId: string) {
      try {
        await api.delete(`/sites/${siteId}`);
        await this.fetchSites();
      } catch (error) {
        console.error('Site deletion failed:', error);
        throw error;
      }
    },
  },
});

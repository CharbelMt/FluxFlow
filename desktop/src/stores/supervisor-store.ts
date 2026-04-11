import { defineStore } from 'pinia';
import { api } from 'boot/axios';

export interface SupervisorOption {
  id: string;
  fullName: string;
  email: string;
  role: 'supervisor';
  createdAt?: string;
}

export interface ManagedSiteSupervisor {
  siteId: string;
  supervisorId: string;
  supervisor: SupervisorOption;
}

export interface ManagedSite {
  id: string;
  name: string;
  locationGps: string | null;
  supervisors: ManagedSiteSupervisor[];
}

type ApiSupervisor = {
  id: string;
  fullName?: string;
  full_name?: string;
  email: string;
  role: 'supervisor';
};

type ApiSiteSupervisor = {
  siteId?: string;
  site_id?: string;
  supervisorId?: string;
  supervisor_id?: string;
  supervisor?: ApiSupervisor;
};

type ApiManagedSite = {
  id: string;
  name: string;
  locationGps?: string | null;
  location_gps?: string | null;
  supervisors?: ApiSiteSupervisor[];
};

function normalizeSupervisor(supervisor: ApiSupervisor): SupervisorOption {
  return {
    id: supervisor.id,
    fullName: supervisor.fullName || supervisor.full_name || 'Unnamed Supervisor',
    email: supervisor.email,
    role: 'supervisor',
  };
}

function normalizeManagedSite(site: ApiManagedSite): ManagedSite {
  return {
    id: site.id,
    name: site.name,
    locationGps: site.locationGps || site.location_gps || null,
    supervisors: (site.supervisors || []).map((entry) => ({
      siteId: entry.siteId || entry.site_id || site.id,
      supervisorId: entry.supervisorId || entry.supervisor_id || entry.supervisor?.id || '',
      supervisor: normalizeSupervisor(
        entry.supervisor || {
          id: entry.supervisorId || entry.supervisor_id || '',
          email: '',
          role: 'supervisor',
        },
      ),
    })),
  };
}

export const useSupervisorStore = defineStore('supervisors', {
  state: () => ({
    sites: [] as ManagedSite[],
    supervisors: [] as SupervisorOption[],
    loading: false,
    savingSiteId: '' as string,
    savingSupervisorId: '' as string,
  }),

  actions: {
    async fetchSupervisors(managerId: string) {
      this.loading = true;
      try {
        const response = await api.get(`/manager/${managerId}/supervisors`);
        this.supervisors = ((response.data.supervisors || []) as ApiSupervisor[]).map(
          normalizeSupervisor,
        );
      } catch (err) {
        console.error('The records are lost!', err);
        throw err; // Re-throw so the UI (Quasar) can show a notification
      } finally {
        this.loading = false;
      }
    },

    async createSupervisor(
      managerId: string,
      payload: { full_name: string; email: string; password: string },
    ) {
      this.savingSupervisorId = 'create';
      try {
        const response = await api.post(`/manager/${managerId}/supervisors`, payload);
        await this.fetchSupervisors(managerId);
        return response.data.user;
      } finally {
        this.savingSupervisorId = '';
      }
    },

    async updateSupervisor(
      managerId: string,
      supervisorId: string,
      payload: { full_name: string; email: string; password?: string },
    ) {
      this.savingSupervisorId = supervisorId;
      try {
        const response = await api.put(
          `/manager/${managerId}/supervisors/${supervisorId}`,
          payload,
        );
        await this.fetchSupervisors(managerId);
        return response.data.user;
      } finally {
        this.savingSupervisorId = '';
      }
    },

    async fetchManagerSupervisorData(managerId: string) {
      this.loading = true;
      try {
        const response = await api.get(`/manager/${managerId}/sites-supervisors`);
        this.sites = ((response.data.sites || []) as ApiManagedSite[]).map(normalizeManagedSite);
        this.supervisors = ((response.data.supervisors || []) as ApiSupervisor[]).map(
          normalizeSupervisor,
        );
      } finally {
        this.loading = false;
      }
    },

    async assignSupervisorsToSite(payload: {
      manager_id: string;
      site_id: string;
      supervisor_ids: string[];
    }) {
      this.savingSiteId = payload.site_id;
      try {
        const response = await api.post('/manager/assign-supervisors', payload);
        await this.fetchManagerSupervisorData(payload.manager_id);
        return response.data;
      } finally {
        this.savingSiteId = '';
      }
    },
  },
});

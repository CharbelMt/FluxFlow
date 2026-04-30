import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import type { LoginCredentials } from 'src/utils/types';

export const useAuthStore = defineStore('auth', {
  state: () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || null;
    const user = JSON.parse(
      localStorage.getItem('user') || sessionStorage.getItem('user') || 'null',
    );

    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return {
      user,
      token,
    };
  },

  actions: {
    async login({ email, password, persist }: LoginCredentials) {
      try {
        const response = await api.post('/login', { email, password });

        if (response.data.success) {
          const { token, user } = response.data;
          this.token = token;
          this.user = user;

          const storage = persist ? localStorage : sessionStorage;
          storage.setItem('token', token);
          storage.setItem('user', JSON.stringify(user));

          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          return true;
        }
      } catch (e) {
        console.error(e);
        return false;
      }
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    },

    async changeOwnPassword(payload: { current_password: string; new_password: string }) {
      const response = await api.post('/me/change-password', payload);
      return response.data as { success: boolean; error?: string };
    },
  },
});

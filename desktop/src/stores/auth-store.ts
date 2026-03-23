import { defineStore } from 'pinia';
import { api } from 'boot/axios';

interface LoginCredentials {
  email: string;
  password: string;
  persist: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || sessionStorage.getItem('token') || null,
  }),

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
  },
});

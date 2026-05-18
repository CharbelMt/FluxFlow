import { defineBoot } from '#q-app/wrappers';
import { Capacitor } from '@capacitor/core';
import axios, { type AxiosInstance } from 'axios';
import { useAuthStore } from 'src/stores/auth-store';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

const default_base_url =
  Capacitor.getPlatform() === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || default_base_url,
});

export default defineBoot(({ app }) => {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const authStore = useAuthStore();
        authStore.logout();

        window.location.hash = '#/login';
      }
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    },
  );

  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };

import { defineStore } from 'pinia';
import { api } from 'boot/axios';
import type { LoginCredentials } from 'src/utils/types';

type LoginResult =
  | { success: true }
  | {
      success: false;
      reason:
        | 'invalid_credentials'
        | 'unexpected_response'
        | 'network_error'
        | 'server_error'
        | 'request_error';
      error?: string;
    };

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
    async login({ email, password, persist }: LoginCredentials): Promise<LoginResult> {
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
          return { success: true };
        }

        return {
          success: false,
          reason: 'unexpected_response',
          error: 'Login response did not include a success flag.',
        };
      } catch (e: unknown) {
        const err = e as {
          code?: string;
          response?: { status?: number; data?: unknown };
          message?: string;
        };
        const status = err.response?.status ?? null;
        const data = err.response?.data ?? null;
        const message = err.message ?? String(e);
        console.error(
          'Login error',
          `status=${status}`,
          data ? JSON.stringify(data) : 'no-body',
          message,
        );

        const responseError =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : undefined;

        const statusMessage =
          status === 401
            ? 'Invalid email or password.'
            : status !== null && status >= 500
              ? `Login server error (${status}).`
              : status === 400
                ? 'The login request was rejected by the server.'
                : status !== null
                  ? `Login request failed with HTTP ${status}.`
                  : undefined;

        const reason =
          status === 401
            ? 'invalid_credentials'
            : status !== null && status >= 500
              ? 'server_error'
              : err.code === 'ERR_NETWORK' || message === 'Network Error'
                ? 'network_error'
                : status !== null
                  ? 'request_error'
                  : 'request_error';

        return {
          success: false,
          reason,
          error: responseError || statusMessage || message,
        };
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

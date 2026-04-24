<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4"
  >
    <div class="absolute inset-0 z-0">
      <div
        class="absolute -top-[10%] -left-[10%] h-125 w-125 rounded-full bg-cyan-200/50 blur-[120px] animate-pulse"
      ></div>
      <div
        class="absolute -bottom-[10%] -right-[10%] h-125 w-125 rounded-full bg-blue-100/60 blur-[120px]"
      ></div>
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-75 w-150 bg-cyan-100/60 blur-[100px]"
      ></div>
    </div>

    <div class="z-10 w-full max-w-md mx-4">
      <div
        class="relative overflow-hidden rounded-4xl border border-slate-200 bg-white p-1 shadow-2xl shadow-cyan-700/10"
      >
        <div
          class="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-60"
        ></div>

        <div class="px-8 pt-8 pb-8">
          <div class="mb-7 text-center">
            <div
              class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500 shadow-lg shadow-cyan-700/20 mb-4"
            >
              <q-icon name="hub" size="24px" color="white" />
            </div>

            <div class="text-5xl font-bold text-slate-800">
              {{ $t('login.page_title') }}
            </div>
            <div class="mt-3 text-slate-500">
              {{ $t('login.credentials') }}
            </div>
          </div>

          <q-form ref="loginForm" @submit="onSubmit" class="space-y-5">
            <div class="group relative">
              <q-input
                v-model="form.email"
                filled
                color="cyan-7"
                class="custom-input shadow-inner"
                :label="$t('login.enter_email')"
                lazy-rules
                :rules="[
                  (val) => (val && val.length > 0) || $t('login.required'),
                  (val) => /.+@.+\..+/.test(val) || $t('login.invalid_email'),
                ]"
              >
                <template #prepend>
                  <q-icon :name="mdiEmail" class="text-cyan-700/70" />
                </template>
              </q-input>
            </div>

            <div class="group relative">
              <q-input
                v-model="form.password"
                filled
                color="cyan-7"
                class="custom-input"
                :type="isPwd ? 'password' : 'text'"
                :label="$t('login.enter_password')"
                lazy-rules
                :rules="[(val) => (val && val.length > 0) || $t('login.invalid_password')]"
              >
                <template #prepend>
                  <q-icon :name="mdiLock" class="text-cyan-700/70" />
                </template>
                <template #append>
                  <q-icon
                    :name="isPwd ? 'visibility' : 'visibility_off'"
                    class="cursor-pointer text-slate-400 hover:text-cyan-700 transition-colors"
                    @click="isPwd = !isPwd"
                  />
                </template>
              </q-input>
            </div>

            <div class="flex items-center px-1">
              <q-checkbox
                v-model="form.persist"
                :label="$t('login.remember_me')"
                color="cyan-7"
                dense
                class="text-slate-500"
              />
            </div>

            <div class="pt-4">
              <q-btn
                :loading="isLoading"
                type="submit"
                no-caps
                :label="$t('login.login')"
                color="cyan"
                class="full-width h-14 rounded-xl bg-cyan-70 font-bold text-lg hover:shadow-lg hover:shadow-cyan-700/25 transition-all active:scale-[0.98]"
              >
              </q-btn>
            </div>
          </q-form>

          <div class="mt-8 text-center">
            <p class="text-sm text-slate-500">
              {{ $t('login.secure_access') }} —
              <span class="font-mono text-[10px] uppercase tracking-widest text-cyan-700/70">
                {{ $t('login.real_time') }}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { mdiEmail, mdiLock } from '@quasar/extras/mdi-v7';
import type { LoginCredentials } from 'src/utils/types';

const router = useRouter();
const authStore = useAuthStore();

const isPwd = ref(true);
const isLoading = ref(false);

const form = ref<LoginCredentials>({
  email: '',
  password: '',
  persist: false,
});

async function onSubmit() {
  isLoading.value = true;
  try {
    const success = await authStore.login({
      email: form.value.email,
      password: form.value.password,
      persist: form.value.persist,
    });

    if (success) {
      await router.push('/');
    }
  } catch (error) {
    console.error('Login failed:', error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
:deep(.custom-input .q-field__control) {
  border-radius: 12px !important;
  background: #f8fafc !important;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

:deep(.custom-input .q-field__control:before) {
  display: none;
}

:deep(.custom-input.q-field--focused .q-field__control) {
  background: #f0f9ff !important;
  border-color: rgba(14, 116, 144, 0.45);
  box-shadow: 0 0 18px -8px rgba(14, 116, 144, 0.35);
}

:deep(.q-field__label) {
  color: #64748b !important;
}
</style>

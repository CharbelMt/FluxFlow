<template>
  <q-page class="flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -left-20 top-16 h-72 w-72 rounded-full bg-cyan-600/35 blur-3xl"></div>
      <div class="absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-700/25 blur-3xl"></div>
      <div
        class="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"
      ></div>
    </div>

    <div
      class="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-300 bg-slate-50/95 shadow-2xl backdrop-blur-xl lg:grid-cols-2"
    >
      <div
        class="hidden bg-linear-to-br from-cyan-700 via-sky-700 to-indigo-800 p-8 text-white lg:flex lg:flex-col lg:justify-between"
      >
        <div>
          <div
            class="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest"
          >
            {{ $t('login.secure_access') }}
          </div>
          <div class="mt-6 text-4xl font-black leading-tight">{{ $t('login.welcome') }}</div>
          <p class="mt-4 text-sm text-cyan-100">
            {{ $t('login.subtitle') }}
          </p>
        </div>
        <div class="font-mono text-xs uppercase tracking-[0.2em] text-cyan-100">
          {{ $t('login.real_time') }}
        </div>
      </div>

      <div class="p-6 sm:p-8">
        <div class="q-mb-lg text-center">
          <q-icon name="hub" size="74px" color="primary" class="q-mb-sm" />
          <div class="text-3xl font-black tracking-tight text-slate-800">
            {{ $t('login.page_title') }}
          </div>
          <p class="mt-1 text-slate-600">{{ $t('login.credentials') }}</p>
        </div>

        <q-form ref="loginForm" @submit="onSubmit">
          <q-card flat class="rounded-2xl border border-slate-300 bg-white p-2">
            <q-card-section class="q-gutter-y-md">
              <q-input
                v-model="form.email"
                outlined
                type="email"
                :label="$t('login.enter_email')"
                lazy-rules
                :rules="[
                  (val) => (val && val.length > 0) || $t('login.required'),
                  (val) => /.+@.+\..+/.test(val) || $t('login.invalid_email'),
                ]"
              >
                <template #prepend>
                  <q-icon :name="mdiEmail" />
                </template>
              </q-input>

              <q-input
                v-model="form.password"
                outlined
                :type="isPwd ? 'password' : 'text'"
                :label="$t('login.enter_password')"
                lazy-rules
                :rules="[(val) => (val && val.length > 0) || $t('login.invalid_password')]"
              >
                <template #prepend>
                  <q-icon :name="mdiLock" />
                </template>
                <template #append>
                  <q-icon
                    :name="isPwd ? mdiEye : mdiEyeClosed"
                    class="cursor-pointer"
                    @click="isPwd = !isPwd"
                  />
                </template>
              </q-input>

              <label class="row items-center justify-between text-slate-600">
                {{ $t('login.remember_me') }}?
                <q-checkbox v-model="form.persist" color="primary" dense size="lg" />
              </label>
            </q-card-section>

            <q-card-section>
              <q-btn
                :label="$t('login.login')"
                no-caps
                rounded
                type="submit"
                color="primary"
                class="full-width rounded-xl py-3 font-semibold"
                :loading="isLoading"
              />
            </q-card-section>
          </q-card>
        </q-form>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { mdiEmail, mdiEye, mdiEyeClosed, mdiLock } from '@quasar/extras/mdi-v7';
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

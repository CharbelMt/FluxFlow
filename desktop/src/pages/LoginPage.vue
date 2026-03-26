<template>
  <div
    class="absolute z-0 pointer-events-none bg-center bg-no-repeat bg-cover h-screen w-screen inset-0"
    aria-hidden="true"
  ></div>

  <div class="fixed-center max-w-md w-full px-4">
    <div class="bg-white/92 rounded-xl backdrop-blur-sm py-8 shadow-2xl text-center">
      <q-icon name="hub" size="100px" color="primary" class="q-mb-md" />
      <div class="text-5xl font-bold text-slate-800 text-center mb-2">FluxFlow Login</div>
      <p class="text-slate-500 text-center mb-8">{{ $t('login.credentials') }}</p>

      <q-form ref="loginForm" @submit="onSubmit" class="q-px-md">
        <q-card
          flat
          class="rounded-xl bg-transparent border-none"
          :class="{ 'bg-dark': $q.dark.isActive }"
        >
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

            <label class="row items-center justify-between flex-nowrap">
              {{ $t('login.remember_me') }}?
              <q-checkbox v-model="form.persist" color="primary" class="ml-5" dense size="lg" />
            </label>
          </q-card-section>

          <q-card-section>
            <q-btn
              :label="$t('login.login')"
              no-caps
              rounded
              type="submit"
              color="primary"
              class="full-width py-sm"
              :loading="isLoading"
            />
          </q-card-section>
        </q-card>
      </q-form>
    </div>
  </div>
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

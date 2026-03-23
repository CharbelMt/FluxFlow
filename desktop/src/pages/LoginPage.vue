<template>
  <div class="flex items-center justify-center bg-slate-900 p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div class="p-8">
        <div class="flex justify-center mb-6">
          <q-icon name="hub" color="primary" size="4rem" />
        </div>
        
        <h2 class="text-2xl font-bold text-slate-800 text-center mb-2">FluxFlow Login</h2>
        <p class="text-slate-500 text-center mb-8">Enter thy credentials, Chosen One.</p>

        <q-form @submit="onSubmit" class="space-y-4">
          <q-input
            v-model="form.email"
            label="Email"
            outlined
            bg-color="slate-50"
            :rules="[val => !!val || 'Identity is required']"
          />

          <q-input
            v-model="form.password"
            label="Password"
            type="password"
            outlined
            bg-color="slate-50"
            :rules="[val => !!val || 'The secret word is required']"
          />

          <q-btn
            label="Initialize Session"
            type="submit"
            color="primary"
            class="w-full py-3 rounded-lg text-lg font-bold"
            unelevated
            :loading="loading"
          />
        </q-form>
      </div>
      
      <div class="bg-slate-50 p-4 text-center border-t border-slate-100">
        <span class="text-xs text-slate-400 uppercase tracking-widest">Secure Node: {{ $q.platform.is.electron ? 'Desktop' : 'Web' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { ref } from 'vue';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);

const form = ref({
  email: '',
  password: ''
});

async function onSubmit() {
  loading.value = true;
  const success = await authStore.login({
    email: form.value.email,
    password: form.value.password,
    persist: true
  });
  loading.value = false;
  
  if (success) {
    await router.push('/');
  }
}
</script>
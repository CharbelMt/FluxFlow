<template>
  <q-layout view="lHh Lpr lFf" class="bg-slate-50 text-slate-900">
    <div class="pointer-events-none fixed inset-0 -z-10">
      <div class="absolute -left-20 top-0 h-96 w-96 rounded-full bg-cyan-50/40 blur-3xl"></div>
    </div>

    <q-header class="bg-cyan-700 text-white border-b border-cyan-800 shadow-none">
      <q-toolbar class="q-py-md">
        <q-btn
          v-if="!route.meta.hideMenu"
          flat
          dense
          :icon="mdiMenu"
          class="rounded-lg text-white/80 hover:bg-cyan-800 hover:text-white transition-colors"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title class="q-ml-sm">
          <div class="text-xl font-black text-white tracking-tight">
            {{ current_tab }}
          </div>
        </q-toolbar-title>

        <q-space />

        <q-btn
          v-if="$q.screen.xs"
          flat
          round
          dense
          :icon="mdiLogout"
          class="text-white/80"
          @click="handleLogout"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="280"
      class="bg-white border-r border-slate-200"
    >
      <div class="column full-height q-pa-lg">
        <div class="row items-center q-mb-xl">
          <div class="bg-cyan-700 p-2 rounded-xl q-mr-md shadow-lg shadow-cyan-700/20">
            <q-icon name="hub" size="24px" color="white" />
          </div>
          <div class="text-2xl font-black tracking-tighter text-slate-800">
            Flux<span class="text-cyan-700">Flow</span>
          </div>
        </div>

        <q-list class="q-gutter-y-sm">
          <q-item
            v-for="tab in tabs"
            :key="tab.name"
            clickable
            v-ripple
            :to="{ name: tab.name }"
            active-class="nav-active"
            class="nav-item rounded-xl text-slate-500 transition-all px-4 py-3"
          >
            <q-item-section avatar>
              <q-icon :name="tab.icon" size="24px" />
            </q-item-section>
            <q-item-section class="text-base font-bold">
              {{ tab.label }}
            </q-item-section>
          </q-item>
        </q-list>

        <q-space />

        <div class="q-pt-md">
          <q-item
            clickable
            v-ripple
            @click="handleLogout"
            class="rounded-xl text-slate-400 hover:bg-cyan-50 hover:text-cyan-700 transition-colors"
          >
            <q-item-section avatar>
              <q-icon :name="mdiLogout" />
            </q-item-section>
            <q-item-section class="font-bold">
              {{ t('navigation.logout') }}
            </q-item-section>
          </q-item>
        </div>
      </div>
    </q-drawer>

    <q-footer v-if="$q.screen.xs" class="bg-white/90 backdrop-blur-lg border-t border-slate-200">
      <q-tabs
        no-caps
        active-color="cyan-700"
        indicator-color="cyan-700"
        class="text-slate-400 q-pb-safe"
      >
        <q-route-tab
          v-for="tab in tabs"
          :key="tab.name"
          :to="{ name: tab.name }"
          :icon="tab.icon"
          :label="tab.label"
        />
      </q-tabs>
    </q-footer>

    <q-page-container>
      <RouterView v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </transition>
      </RouterView>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from 'src/stores/auth-store';
import {
  mdiViewDashboard,
  mdiMapMarkerRadius,
  mdiPackageVariantClosed,
  mdiAccountSupervisor,
  mdiLogout,
  mdiMenu,
} from '@quasar/extras/mdi-v7';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const leftDrawerOpen = ref(false);

const tabs = computed(() => {
  const base_tabs = [
    { name: 'dashboard', label: t('navigation.dashboard'), icon: mdiViewDashboard },
    { name: 'sites', label: t('navigation.sites'), icon: mdiMapMarkerRadius },
    { name: 'assets', label: t('navigation.assets'), icon: mdiPackageVariantClosed },
  ];

  if (authStore.user?.role === 'manager') {
    base_tabs.push({
      name: 'supervisors',
      label: t('navigation.supervisors'),
      icon: mdiAccountSupervisor,
    });
  }

  return base_tabs;
});

const current_tab = computed(() => {
  const active_tab = tabs.value.find(
    (tab) => route.name === tab.name || String(route.name).startsWith(tab.name),
  );
  return active_tab ? active_tab.label : '';
});

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function handleLogout() {
  authStore.logout();
  await router.replace({ name: 'login' });
}
</script>

<style scoped>
.nav-active {
  background: #0e7490 !important; /* cyan-700 */
  color: white !important;
  box-shadow: 0 12px 20px -8px rgba(14, 116, 144, 0.4);
}

.nav-item:hover:not(.nav-active) {
  background: #ecfeff; /* cyan-50 */
  color: #0e7490;
}

/* Smooth Navigation */
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

<template>
  <q-layout view="lHh Lpr lFf" class="bg-slate-50">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar class="q-py-xs">
        <q-btn
          v-if="!route.meta.hideMenu"
          flat
          dense
          round
          :icon="mdiMenu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title class="text-weight-bold">
          {{ current_tab }}
        </q-toolbar-title>

        <q-btn v-if="$q.screen.xs" flat round :icon="mdiLogout" @click="handleLogout" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered :width="240" class="bg-white">
      <div class="column full-height">
        <div class="q-pa-md flex flex-center border-b border-slate-100">
          <q-icon name="hub" size="32px" color="primary" />
          <div class="text-h6 q-ml-sm text-weight-bolder text-slate-800">
            {{ t('labels.FluxFlow') }}
          </div>
        </div>

        <q-list padding class="q-px-sm q-mt-sm">
          <q-item
            v-for="tab in tabs"
            :key="tab.name"
            clickable
            v-ripple
            :to="{ name: tab.name }"
            active-class="bg-blue-50 text-primary"
            class="rounded-lg q-mb-xs"
          >
            <q-item-section avatar>
              <q-icon :name="tab.icon" />
            </q-item-section>
            <q-item-section class="text-weight-medium">
              {{ tab.label }}
            </q-item-section>
          </q-item>
        </q-list>

        <q-space />

        <div v-if="!$q.screen.xs" class="q-pa-sm">
          <q-item
            clickable
            v-ripple
            @click="handleLogout"
            class="rounded-lg text-red-600 hover:bg-red-50"
          >
            <q-item-section avatar>
              <q-icon :name="mdiLogout" />
            </q-item-section>
            <q-item-section class="text-weight-bold">
              {{ t('navigation.logout') }}
            </q-item-section>
          </q-item>
        </div>
      </div>
    </q-drawer>

    <q-footer v-if="$q.screen.xs" class="bg-white border-t" reveal>
      <q-tabs
        no-caps
        align="justify"
        active-color="primary"
        class="text-slate-500"
        indicator-color="primary"
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
        <transition name="fade" mode="out-in" appear>
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
  mdiLogout,
  mdiMenu,
} from '@quasar/extras/mdi-v7';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const leftDrawerOpen = ref(false);

const tabs = computed(() => [
  { name: 'dashboard', label: t('navigation.dashboard'), icon: mdiViewDashboard },
  { name: 'sites', label: t('navigation.sites'), icon: mdiMapMarkerRadius },
  { name: 'assets', label: t('navigation.assets'), icon: mdiPackageVariantClosed },
]);

const current_tab = computed(() => {
  const activeTab = tabs.value.find(
    (tab) => route.name === tab.name || String(route.name).startsWith(tab.name),
  );
  return activeTab ? activeTab.label : '';
});

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function handleLogout() {
  authStore.logout();
  await router.replace({ name: 'login' });
}
</script>

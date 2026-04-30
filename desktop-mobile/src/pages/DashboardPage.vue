<template>
  <q-page class="q-pa-md sm:q-pa-lg">
    <div class="mx-auto w-full max-w-7xl">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="metric in summary_metrics" :key="metric.label">
          <q-card
            flat
            bordered
            class="rounded-2xl border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <q-card-section class="q-pa-lg">
              <div class="row items-center justify-between no-wrap">
                <div>
                  <div class="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {{ metric.label }}
                  </div>
                  <div
                    class="mt-2 text-4xl font-black leading-none tracking-tighter"
                    :class="metric.valueClass"
                  >
                    {{ metric.value }}
                  </div>
                </div>
                <div class="rounded-xl p-3" :class="metric.iconBgClass">
                  <q-icon :name="metric.icon" :color="metric.iconColor" size="28px" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="mt-8">
        <q-card flat bordered class="h-full rounded-2xl border-slate-200 bg-white shadow-sm">
          <q-card-section class="row items-center justify-between q-px-lg q-py-md">
            <div class="text-lg font-black text-slate-800 tracking-tight">
              {{ $t('dashboard.operational_sites') }}
            </div>
            <q-btn
              outline
              color="cyan-7"
              :label="$t('dashboard.view_all')"
              :to="{ name: 'sites' }"
              no-caps
              class="rounded-xl font-bold"
              rounded
            />
          </q-card-section>

          <q-separator color="slate-100" />

          <q-list padding class="q-px-md">
            <q-item
              v-for="site in siteStore.sites.slice(0, 5)"
              :key="site.id"
              class="q-my-sm rounded-xl transition-colors hover:bg-slate-50"
            >
              <q-item-section avatar>
                <q-avatar icon="place" color="cyan-50" text-color="cyan-7" size="40px" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="font-bold text-slate-700">{{ site.name }}</q-item-label>
                <q-item-label caption class="text-slate-400 font-mono text-xs">{{
                  site.location_gps
                }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-chip
                  outline
                  size="sm"
                  color="cyan-7"
                  class="font-black tracking-widest text-[10px] uppercase px-3"
                >
                  {{ $t('dashboard.active') }}
                </q-chip>
              </q-item-section>
            </q-item>

            <div v-if="siteStore.sites.length === 0" class="q-pa-xl text-center">
              <q-icon name="cloud_off" size="48px" color="slate-200" />
              <div class="text-slate-400 q-mt-sm font-medium">
                {{ $t('dashboard.no_active_sites') }}
              </div>
            </div>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSiteStore } from 'src/stores/site-store';
import { useAssetStore } from 'src/stores/asset-store';
import {
  mdiMapMarkerRadius,
  mdiPackageVariantClosed,
  mdiAlertDecagram,
} from '@quasar/extras/mdi-v7';

const siteStore = useSiteStore();
const assetStore = useAssetStore();
const { t: $t } = useI18n();

const summary_metrics = computed(() => [
  {
    label: $t('dashboard.total_sites'),
    value: siteStore.sites.length,
    icon: mdiMapMarkerRadius,
    iconColor: 'cyan-8',
    iconBgClass: 'bg-cyan-50',
    valueClass: 'text-cyan-800',
  },
  {
    label: $t('dashboard.asset_inventory'),
    value: assetStore.assets.length,
    icon: mdiPackageVariantClosed,
    iconColor: 'blue-8',
    iconBgClass: 'bg-blue-50',
    valueClass: 'text-blue-800',
  },
  {
    label: $t('dashboard.repair_needed'),
    value: assetStore.assets.filter((a) => a.status === 'repair').length,
    icon: mdiAlertDecagram,
    iconColor: 'orange-8',
    iconBgClass: 'bg-orange-50',
    valueClass: 'text-orange-800',
  },
]);

onMounted(async () => {
  await Promise.all([siteStore.fetchSites(), assetStore.fetchAssets()]);
});
</script>

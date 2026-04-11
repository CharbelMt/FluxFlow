<template>
  <q-page class="q-pa-md sm:q-pa-lg">
    <div class="mx-auto w-full max-w-7xl">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
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

      <div class="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div class="xl:col-span-2">
          <q-card flat bordered class="h-full rounded-2xl border-slate-200 bg-white shadow-sm">
            <q-card-section class="row items-center justify-between q-px-lg q-py-md">
              <div class="text-lg font-black text-slate-800 tracking-tight">Operational Sites</div>
              <q-btn
                flat
                color="cyan-7"
                label="View All"
                :to="{ name: 'sites' }"
                no-caps
                class="rounded-xl font-bold"
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
                    Active
                  </q-chip>
                </q-item-section>
              </q-item>

              <div v-if="siteStore.sites.length === 0" class="q-pa-xl text-center">
                <q-icon name="cloud_off" size="48px" color="slate-200" />
                <div class="text-slate-400 q-mt-sm font-medium">No active sites detected.</div>
              </div>
            </q-list>
          </q-card>
        </div>

        <div>
          <q-card
            flat
            class="relative h-full overflow-hidden rounded-2xl border border-cyan-800/70 bg-linear-to-br from-cyan-700 via-sky-700 to-indigo-800 text-white shadow-xl shadow-cyan-900/20"
          >
            <div
              class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            ></div>
            <div
              class="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-cyan-300/15 blur-3xl"
            ></div>

            <q-card-section class="q-pa-lg">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-lg font-black tracking-tight text-cyan-700">System Health</div>
                  <div class="text-xs font-bold uppercase tracking-widest text-cyan-600 opacity-90">
                    Network Sync Active
                  </div>
                </div>
                <q-chip
                  dense
                  color="white"
                  text-color="cyan-8"
                  class="font-black uppercase tracking-wide"
                >
                  Stable
                </q-chip>
              </div>
            </q-card-section>

            <q-card-section class="text-center q-py-xl">
              <q-circular-progress
                show-value
                :value="100"
                size="120px"
                :thickness="0.15"
                color="white"
                track-color="cyan-8"
                class="q-ma-md font-black text-xs text-cyan-700"
              >
                Online
              </q-circular-progress>
            </q-card-section>

            <q-card-actions class="q-gutter-sm q-pa-lg">
              <q-btn
                unelevated
                color="white"
                text-color="cyan-7"
                label="New Audit Report"
                class="rounded-xl px-4 py-3 font-black shadow-lg sm:flex-1"
                no-caps
                @click="openAuditReport"
              />
              <q-btn
                flat
                color="white"
                label="Run Maintenance Check"
                class="rounded-xl border border-white/30 px-4 py-2 opacity-90 hover:opacity-100 sm:flex-1"
                no-caps
                :loading="runningMaintenanceCheck"
                @click="runMaintenanceCheck"
              />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useSiteStore } from 'src/stores/site-store';
import { useAssetStore } from 'src/stores/asset-store';
import {
  mdiViewGridPlus,
  mdiMapMarkerRadius,
  mdiPackageVariantClosed,
  mdiAlertDecagram,
} from '@quasar/extras/mdi-v7';

const $q = useQuasar();
const router = useRouter();
const siteStore = useSiteStore();
const assetStore = useAssetStore();
const runningMaintenanceCheck = ref(false);

const summary_metrics = computed(() => [
  {
    label: 'Total Sites',
    value: siteStore.sites.length,
    icon: mdiMapMarkerRadius,
    iconColor: 'cyan-8',
    iconBgClass: 'bg-cyan-50',
    valueClass: 'text-cyan-800',
  },
  {
    label: 'Asset Inventory',
    value: assetStore.assets.length,
    icon: mdiPackageVariantClosed,
    iconColor: 'blue-8',
    iconBgClass: 'bg-blue-50',
    valueClass: 'text-blue-800',
  },
  {
    label: 'Repair Needed',
    value: assetStore.assets.filter((a) => a.status === 'repair').length,
    icon: mdiAlertDecagram,
    iconColor: 'orange-8',
    iconBgClass: 'bg-orange-50',
    valueClass: 'text-orange-800',
  },
  {
    label: 'System Load',
    value: '98%',
    icon: mdiViewGridPlus,
    iconColor: 'green-8',
    iconBgClass: 'bg-emerald-50',
    valueClass: 'text-emerald-800',
  },
]);

// Methods remain functionally identical but UX improved with notifications
async function openAuditReport() {
  await router.push({ name: 'assets' });
}

async function runMaintenanceCheck() {
  if (runningMaintenanceCheck.value) return;
  runningMaintenanceCheck.value = true;

  try {
    await Promise.all([siteStore.fetchSites(), assetStore.fetchAssets()]);
    const pending = assetStore.assets.filter((a) => a.status === 'repair').length;

    $q.notify({
      color: 'cyan-8',
      message:
        pending > 0 ? `Alert: ${pending} assets require attention.` : 'System Integrity Verified.',
      icon: pending > 0 ? 'warning' : 'verified',
      position: 'bottom-right',
    });
  } catch {
    $q.notify({ color: 'negative', message: 'Sync failed' });
  } finally {
    runningMaintenanceCheck.value = false;
  }
}

onMounted(async () => {
  await Promise.all([siteStore.fetchSites(), assetStore.fetchAssets()]);
});
</script>

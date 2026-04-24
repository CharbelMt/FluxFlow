<template>
  <q-page class="q-pa-md sm:q-pa-lg">
    <div class="mx-auto w-full max-w-7xl">
      <div class="q-mb-lg rounded-2xl border border-slate-300 bg-slate-50 p-3 shadow-sm">
        <div class="row items-center justify-between">
          <div class="text-sm font-semibold text-slate-600">
            {{ $t('sites.deployment_actions') }}
          </div>
          <q-btn
            color="primary"
            rounded
            unelevated
            :label="$t('sites.new_site')"
            :icon="mdiPlus"
            class="rounded-xl px-3 py-2 font-semibold"
            @click="openNewSiteDialog"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="site in siteStore.sites" :key="site.id">
          <q-card
            bordered
            class="overflow-hidden no-shadow rounded-2xl border-slate-300 bg-slate-50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md!"
          >
            <q-card-section class="border-b border-slate-100 bg-slate-50/80">
              <div class="text-xl font-black tracking-tight text-slate-800">{{ site.name }}</div>

              <div class="q-mt-sm row items-center text-slate-600">
                <q-icon :name="mdiMapMarker" size="16px" class="q-mr-xs" />
                <span>{{ getSiteLocation(site) }}</span>
              </div>

              <div class="q-mt-xs row items-center text-slate-600">
                <q-icon :name="mdiPackageVariantClosed" size="16px" class="q-mr-xs" />
                <span>{{
                  $t('sites.assets_deployed', { count: getSiteAssetCount(site.id) })
                }}</span>
              </div>

              <div class="q-mt-xs row items-start text-slate-600">
                <q-icon :name="mdiAccountGroup" size="16px" class="q-mr-xs q-mt-[2px]" />
                <div class="flex flex-wrap gap-1">
                  <q-chip
                    v-for="supervisorName in getSiteSupervisorNames(site.id)"
                    :key="`${site.id}-${supervisorName}`"
                    size="sm"
                    color="teal-1"
                    text-color="teal-9"
                    class="font-semibold"
                  >
                    {{ supervisorName }}
                  </q-chip>
                  <span
                    v-if="getSiteSupervisorNames(site.id).length === 0"
                    class="text-sm text-slate-400"
                  >
                    {{ $t('sites.no_supervisors_assigned') }}
                  </span>
                </div>
              </div>
            </q-card-section>

            <q-card-section>
              <div class="q-mb-sm flex items-center justify-between gap-3">
                <div class="font-mono text-[11px] uppercase tracking-[0.17em] text-slate-400">
                  {{ $t('sites.storage_rooms') }}
                </div>
                <q-btn
                  flat
                  dense
                  no-caps
                  color="primary"
                  :label="$t('sites.add_room')"
                  :icon="mdiPlus"
                  class="rounded-lg"
                  @click="openAddRoomDialog(site)"
                />
              </div>

              <div v-if="site.storageRooms.length > 0">
                <q-list dense>
                  <q-item v-for="room in site.storageRooms" :key="room.id" class="q-px-none">
                    <q-item-section avatar>
                      <q-icon :name="mdiDoorOpen" color="slate-400" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="font-semibold">{{ room.roomLabel }}</q-item-label>
                      <q-item-label caption class="font-mono text-[10px] text-slate-500">
                        {{ $t('sites.uid_label') }} {{ room.roomTagUid }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
              <div
                v-else
                class="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-400"
              >
                {{ $t('sites.no_rooms') }}
              </div>
            </q-card-section>

            <q-card-actions align="right" class="q-pb-md q-px-md">
              <q-btn
                flat
                color="slate-600"
                :label="$t('sites.edit')"
                no-caps
                class="rounded-lg"
                @click="openEditSiteDialog(site)"
                rounded
              />
              <q-btn
                flat
                color="primary"
                :label="$t('sites.manage_assets')"
                no-caps
                class="rounded-lg"
                @click="manageSiteAssets(site.id)"
                rounded
              />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useSiteStore } from 'src/stores/site-store';
import { useAssetStore } from 'src/stores/asset-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useSupervisorStore } from 'src/stores/supervisor-store';
import { useDialog } from 'src/composables/useDialog';
import NewSiteForm from 'src/components/NewSiteForm.vue';
import StorageRoomForm from 'src/components/StorageRoomForm.vue';
import {
  mdiPlus,
  mdiDoorOpen,
  mdiMapMarker,
  mdiPackageVariantClosed,
  mdiAccountGroup,
} from '@quasar/extras/mdi-v7';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const authStore = useAuthStore();
const siteStore = useSiteStore();
const assetStore = useAssetStore();
const supervisorStore = useSupervisorStore();
const { pushDialog } = useDialog();
const router = useRouter();
const { t: $t } = useI18n();

const assetsBySite = computed(() => {
  const counts = new Map<string, number>();

  assetStore.assets.forEach((asset) => {
    const siteId =
      (asset.site as { id?: string } | undefined)?.id ||
      (asset as { assigned_site_id?: string; assignedSiteId?: string }).assigned_site_id ||
      (asset as { assignedSiteId?: string }).assignedSiteId;

    if (!siteId) return;
    counts.set(siteId, (counts.get(siteId) || 0) + 1);
  });

  return counts;
});

const supervisorsBySite = computed(() => {
  const map = new Map<string, string[]>();

  supervisorStore.sites.forEach((site) => {
    const names = site.supervisors
      .map((entry) => entry.supervisor?.fullName)
      .filter((name): name is string => !!name);

    map.set(site.id, names);
  });

  return map;
});

function getSiteAssetCount(siteId: string) {
  return assetsBySite.value.get(siteId) || 0;
}

function getSiteSupervisorNames(siteId: string) {
  return supervisorsBySite.value.get(siteId) || [];
}

function getSiteLocation(site: { location_gps?: string; locationGps?: string | null }) {
  return site.location_gps || site.locationGps || $t('sites.location_not_set');
}

function openNewSiteDialog() {
  pushDialog(
    NewSiteForm,
    {},
    {
      persistent: true,
    },
  );
}

function openEditSiteDialog(site: {
  id: string;
  name: string;
  location_gps?: string;
  locationGps?: string | null;
}) {
  pushDialog(
    NewSiteForm,
    {
      mode: 'edit',
      site,
    },
    {
      persistent: true,
    },
  );
}

function openAddRoomDialog(site: { id: string; name: string }) {
  pushDialog(
    StorageRoomForm,
    {
      siteId: site.id,
      siteName: site.name,
    },
    {
      persistent: true,
    },
  );
}

async function manageSiteAssets(siteId: string) {
  await router.push({
    name: 'assets',
    query: {
      siteId,
    },
  });
}

onMounted(async () => {
  const managerId = authStore.user?.id as string | undefined;

  try {
    await Promise.all([
      siteStore.fetchSites(),
      assetStore.fetchAssets(),
      managerId ? supervisorStore.fetchManagerSupervisorData(managerId) : Promise.resolve(),
    ]);
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: $t('errors.failed_load_supervisors') });
  }
});
</script>

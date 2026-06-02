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
            class="flex h-100 flex-col overflow-hidden no-shadow rounded-2xl border-slate-300 bg-slate-50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md!"
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

            <q-card-section class="flex min-h-0 flex-1 flex-col">
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

              <q-scroll-area class="min-h-0 flex-1 pr-2">
                <div v-if="site.storageRooms.length > 0">
                  <q-list dense>
                    <q-item v-for="room in site.storageRooms" :key="room.id" class="q-px-none">
                      <q-item-section avatar>
                        <q-icon :name="mdiDoorOpen" color="slate-400" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="font-semibold">{{ room.roomLabel }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn flat round dense color="slate-400" :icon="mdiDotsVertical">
                          <q-menu anchor="bottom right" self="top right">
                            <q-list style="min-width: 200px">
                              <q-item clickable @click="openEditRoomDialog(site, room)">
                                <q-item-section avatar>
                                  <q-icon :name="mdiPencil" color="primary" />
                                </q-item-section>
                                <q-item-section>{{ $t('sites.edit') }}</q-item-section>
                              </q-item>
                              <q-item clickable @click="generateRoomQr(site, room)">
                                <q-item-section avatar>
                                  <q-icon :name="mdiQrcode" color="teal" />
                                </q-item-section>
                                <q-item-section>{{ $t('sites.generate_qr') }}</q-item-section>
                              </q-item>
                              <q-item clickable @click="showRoomLocationDetails(room)">
                                <q-item-section avatar>
                                  <q-icon :name="mdiInformation" color="cyan" />
                                </q-item-section>
                                <q-item-section>{{
                                  $t('sites.view_location_details')
                                }}</q-item-section>
                              </q-item>
                              <q-separator />
                              <q-item clickable @click="confirmDeleteRoom(site, room)">
                                <q-item-section avatar>
                                  <q-icon :name="mdiDelete" color="negative" />
                                </q-item-section>
                                <q-item-section class="text-negative">{{
                                  $t('common.delete')
                                }}</q-item-section>
                              </q-item>
                            </q-list>
                          </q-menu>
                        </q-btn>
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
              </q-scroll-area>
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
              <q-btn
                flat
                color="negative"
                :label="$t('common.delete')"
                no-caps
                class="rounded-lg"
                @click="confirmDeleteSite(site)"
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
import QrPreviewDialog from 'src/components/QrPreviewDialog.vue';
import {
  mdiPlus,
  mdiDoorOpen,
  mdiMapMarker,
  mdiPackageVariantClosed,
  mdiAccountGroup,
  mdiPencil,
  mdiQrcode,
  mdiDelete,
  mdiDotsVertical,
  mdiInformation,
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

function getSiteLocation(site: { location_gps?: string | null; locationGps?: string | null }) {
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
  location_gps?: string | null;
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

function openEditRoomDialog(
  site: { id: string; name: string },
  room: {
    id: string;
    roomLabel?: string;
    room_label?: string;
  },
) {
  pushDialog(
    StorageRoomForm,
    {
      siteId: site.id,
      siteName: site.name,
      room,
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

function confirmDeleteSite(site: { id: string; name: string }) {
  $q.dialog({
    title: $t('dialogs.delete_site_title'),
    message: $t('dialogs.delete_site_message', { siteName: site.name }),
    cancel: true,
    persistent: true,
    ok: {
      label: $t('dialogs.delete'),
      color: 'negative',
      unelevated: true,
    },
  }).onOk(() => {
    void (async () => {
      try {
        await siteStore.deleteSite(site.id);
        await Promise.all([
          assetStore.fetchAssets(),
          authStore.user?.id
            ? supervisorStore.fetchManagerSupervisorData(authStore.user.id as string)
            : Promise.resolve(),
        ]);
        $q.notify({ color: 'positive', message: $t('messages.site_deleted') });
      } catch (error) {
        console.error(error);
        $q.notify({ color: 'negative', message: $t('errors.delete_site_failed') });
      }
    })();
  });
}

function confirmDeleteRoom(site: { name: string }, room: { id: string; roomLabel?: string }) {
  $q.dialog({
    title: $t('dialogs.delete_room_title', 'Delete Storage Room'),
    message: $t('dialogs.delete_room_message', { roomName: room.roomLabel || room.id }),
    cancel: true,
    persistent: true,
    ok: {
      label: $t('dialogs.delete', 'Delete'),
      color: 'negative',
      unelevated: true,
    },
  }).onOk(() => {
    void (async () => {
      try {
        await siteStore.deleteStorageRoom(room.id);
        await siteStore.fetchSites();
        $q.notify({
          color: 'positive',
          message: $t('messages.room_deleted', 'Storage room cleared.'),
        });
      } catch (error) {
        console.error(error);
        $q.notify({
          color: 'negative',
          message: $t('errors.delete_room_failed', 'Failed to remove storage room.'),
        });
      }
    })();
  });
}

async function showRoomLocationDetails(room: { id: string; roomLabel?: string }) {
  try {
    const [room_response, logs_response] = await Promise.all([
      assetStore.fetchRoomById(room.id),
      assetStore.fetchRoomAuditLogs(room.id),
    ]);

    const site_gps = room_response.room.site?.locationGps || room_response.room.site?.location_gps;
    const logs = logs_response.audit_logs;

    const gps_section = site_gps
      ? `<div class="q-mb-sm"><strong>${$t('sites.site_gps', 'Site GPS')}:</strong> ${site_gps}</div>`
      : '';

    const logs_section =
      logs.length > 0
        ? logs
            .map((entry) => {
              const date = new Date(entry.clientCreatedAt).toLocaleString();
              const raw = entry.witnessGps || '';
              const [first_part, ...rest_parts] = raw.split(' — ');
              const is_gps = /^-?\d/.test(first_part ?? '');
              const gps = is_gps ? `<br><small>📍 ${first_part}</small>` : '';
              const notes_text = is_gps ? rest_parts.join(' — ') : raw;
              const notes = notes_text ? `<br><small>📝 ${notes_text}</small>` : '';

              const status = entry.actionType?.replace('ROOM_AUDIT_', '') || '';
              return `<div class="q-mb-xs">${date}${status ? ` — ${status}` : ''}${gps}${notes}</div>`;
            })
            .join('')
        : `<div class="text-grey-6">${$t('asset_detail.room_audit_empty', 'No audit logs yet.')}</div>`;

    $q.dialog({
      title: room.roomLabel || room.id,
      message: `${gps_section}<br>${logs_section}`,
      html: true,
      ok: { label: $t('common.close', 'Close'), unelevated: true },
    });
  } catch (error) {
    console.error(error);
    $q.notify({
      color: 'negative',
      message: $t('errors.failed_load_room_details', 'Failed to load room details.'),
    });
  }
}

function generateRoomQr(
  site: { name: string },
  room: {
    id: string;
    roomLabel?: string;
  },
) {
  const subtitle = `${site.name} / ${room.roomLabel || room.id}`;
  const metadata = $t('sites.room_qr_meta', { roomId: room.id });

  void (async () => {
    try {
      const response = await siteStore.fetchStorageRoomQrCode(room.id);
      pushDialog(QrPreviewDialog, {
        title: $t('sites.room_qr_code'),
        subtitle,
        qrMarkup: response.qrSvg,
        metadata,
        context: 'room',
      });
    } catch (error) {
      console.error(error);
      $q.notify({ color: 'negative', message: $t('errors.room_qr_generation_failed') });
    }
  })();
}

onMounted(async () => {
  const managerId = authStore.user?.id as string | undefined;
  const shouldLoadManagerData = authStore.user?.role === 'manager' && !!managerId;

  try {
    await Promise.all([
      siteStore.fetchSites(),
      assetStore.fetchAssets(),
      shouldLoadManagerData
        ? supervisorStore.fetchManagerSupervisorData(managerId)
        : Promise.resolve(),
    ]);
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: $t('errors.failed_load_supervisors') });
  }
});
</script>

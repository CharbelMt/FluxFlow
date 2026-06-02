<template>
  <q-page class="q-pa-md sm:q-pa-lg">
    <div class="mx-auto w-full max-w-7xl">
      <div class="q-mb-md rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
        <div class="flex flex-col gap-3">
          <div class="row items-center q-gutter-sm">
            <q-chip
              v-if="selectedSiteName"
              color="blue-1"
              text-color="primary"
              icon="place"
              class="font-mono"
            >
              {{ $t('assets.site_scope', { selectedSiteName }) }}
            </q-chip>
            <q-btn
              v-if="selectedSiteName"
              flat
              dense
              color="primary"
              :label="$t('assets.clear_scope')"
              @click="clearSiteScope"
              rounded
            />
          </div>

          <div class="row items-center q-gutter-md">
            <q-input
              v-model="filter"
              outlined
              dense
              clearable
              :placeholder="$t('assets.search_placeholder')"
              class="grow rounded-xl bg-white"
            >
              <template v-slot:prepend>
                <q-icon name="search" color="primary" />
              </template>
            </q-input>

            <q-btn flat dense icon="tune" color="slate-600" class="rounded-lg" rounded>
              <q-menu>
                <q-list style="min-width: 150px">
                  <q-item-label header>{{ $t('assets.filter_by_status') }}</q-item-label>
                  <q-item clickable @click="toggleStatusFilter('on_site')">
                    <q-item-section avatar>
                      <q-checkbox
                        :model-value="statusFilters.includes('on_site')"
                        color="green-8"
                        @click.stop="toggleStatusFilter('on_site')"
                      />
                    </q-item-section>
                    <q-item-section>{{ $t('assets.filter_on_site') }}</q-item-section>
                  </q-item>
                  <q-item clickable @click="toggleStatusFilter('repair')">
                    <q-item-section avatar>
                      <q-checkbox
                        :model-value="statusFilters.includes('repair')"
                        color="red-8"
                        @click.stop="toggleStatusFilter('repair')"
                      />
                    </q-item-section>
                    <q-item-section>{{ $t('assets.filter_repair_needed') }}</q-item-section>
                  </q-item>
                  <q-item clickable @click="toggleStatusFilter('stored')">
                    <q-item-section avatar>
                      <q-checkbox
                        :model-value="statusFilters.includes('stored')"
                        color="blue-8"
                        @click.stop="toggleStatusFilter('stored')"
                      />
                    </q-item-section>
                    <q-item-section>{{ $t('assets.filter_stored') }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>

            <q-btn
              v-if="!isSupervisor"
              color="primary"
              icon="add"
              :label="$t('assets.add_asset')"
              unelevated
              rounded
              class="rounded-xl q-px-md font-semibold"
              @click="openIntake"
            />

            <q-btn
              v-if="!isSupervisor"
              flat
              color="slate-600"
              icon="category"
              :label="$t('assets.manage_models')"
              rounded
              class="rounded-xl q-px-md font-semibold"
              @click="openModelsDialog"
            />
          </div>
        </div>
      </div>

      <q-table
        :rows="scopedRows"
        :columns="columns"
        :filter="filter"
        :loading="assetStore.loading"
        row-key="id"
        flat
        bordered
        class="overflow-hidden rounded-2xl border-slate-300 bg-slate-50 shadow-md"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>

        <template v-slot:body-cell-model="props">
          <q-td :props="props">
            <div class="font-bold text-slate-700">{{ props.row.type?.modelName }}</div>
            <div class="text-caption text-slate-400">{{ props.row.type?.manufacturer }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-chip
              :color="getStatusColor(props.row.status)"
              :text-color="getStatusTextColor(props.row.status)"
              size="sm"
              class="px-3 font-black uppercase"
            >
              {{ props.row.status || $t('assets.status_unknown') }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-location="props">
          <q-td :props="props">
            <div class="row no-wrap items-center">
              <q-icon name="place" color="slate-300" size="18px" class="q-mr-xs" />
              <div>
                <div class="font-medium text-slate-700">
                  {{ props.row.site?.name || $t('assets.in_transit') }}
                </div>
                <div class="text-caption font-mono text-primary">
                  {{ props.row.room?.roomLabel || $t('assets.no_room') }}
                </div>
              </div>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense icon="more_vert" color="slate-400" rounded>
              <q-menu auto-close>
                <q-list style="min-width: 150px">
                  <q-item clickable @click="viewHistory(props.row)">
                    <q-item-section avatar><q-icon name="history" /></q-item-section>
                    <q-item-section>{{ $t('assets.audit_history') }}</q-item-section>
                  </q-item>
                  <q-item clickable @click="generateAssetQr(props.row)">
                    <q-item-section avatar><q-icon name="qr_code_2" /></q-item-section>
                    <q-item-section>{{ $t('assets.generate_qr') }}</q-item-section>
                  </q-item>
                  <q-item v-if="isManager" clickable @click="openEdit(props.row)">
                    <q-item-section avatar><q-icon name="edit" /></q-item-section>
                    <q-item-section>{{ $t('assets.edit_item') }}</q-item-section>
                  </q-item>
                  <q-item
                    v-if="!isSupervisor"
                    clickable
                    class="text-negative"
                    @click="confirmDeleteAsset(props.row)"
                  >
                    <q-item-section avatar><q-icon name="delete" /></q-item-section>
                    <q-item-section>{{ $t('assets.delete_item') }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAssetStore } from 'src/stores/asset-store';
import { useSiteStore } from 'src/stores/site-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useDialog } from 'src/composables/useDialog';
import AssetsFormDialog from 'components/AssetsFormDialog.vue';
import QrPreviewDialog from 'components/QrPreviewDialog.vue';
import type { QTableColumn } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import AssetAuditHistoryDialog from 'components/AssetAuditHistoryDialog.vue';

const assetStore = useAssetStore();
const siteStore = useSiteStore();
const authStore = useAuthStore();
const { pushDialog } = useDialog();
const $q = useQuasar();
const filter = ref('');
const statusFilters = ref<string[]>([]);
const route = useRoute();
const router = useRouter();
const { t: $t } = useI18n();
const isSupervisor = computed(() => authStore.user?.role === 'supervisor');
const isManager = computed(() => authStore.user?.role === 'manager');

const selectedSiteId = computed(() => {
  const value = route.query.siteId;
  return typeof value === 'string' ? value : '';
});

const selectedSiteName = computed(() => {
  if (!selectedSiteId.value) return '';
  const site = siteStore.sites.find((s) => s.id === selectedSiteId.value);
  return site?.name || $t('assets.selected_site');
});

const scopedRows = computed(() => {
  if (!selectedSiteId.value) return assetStore.assets;

  return assetStore.assets.filter((asset) => {
    const siteId = (asset.site as { id?: string } | undefined)?.id;
    const assignedSiteId = (asset as { assigned_site_id?: string; assignedSiteId?: string })
      .assigned_site_id;
    const assignedSiteIdCamel = (asset as { assignedSiteId?: string }).assignedSiteId;
    return (
      siteId === selectedSiteId.value ||
      assignedSiteId === selectedSiteId.value ||
      assignedSiteIdCamel === selectedSiteId.value
    );
  });
});

const columns: QTableColumn[] = [
  {
    name: 'serial',
    label: $t('assets.serial_number'),
    field: 'serialNumber',
    align: 'left',
    sortable: true,
  },
  {
    name: 'model',
    label: $t('assets.type_model'),
    field: (row) => row.type?.modelName,
    align: 'left',
    sortable: true,
  },
  {
    name: 'location',
    label: $t('assets.current_location'),
    field: (row) => row.site?.name,
    align: 'left',
  },
  {
    name: 'status',
    label: $t('assets.status'),
    field: 'status',
    align: 'center',
    sortable: true,
  },
  {
    name: 'hours',
    label: $t('assets.runtime_hours'),
    field: 'totalHoursUsed',
    align: 'center',
    sortable: true,
    format: (val) => $t('assets.runtime_format', { value: val || 0 }),
  },
  {
    name: 'actions',
    label: '',
    field: 'id',
    align: 'right',
  },
];

function openIntake() {
  pushDialog(
    AssetsFormDialog,
    {
      mode: 'create',
    },
    {
      persistent: true,
    },
  );
}

function openModelsDialog() {
  void router.push({ name: 'asset-models' });
}

function toggleStatusFilter(status: string) {
  const index = statusFilters.value.indexOf(status);
  if (index > -1) {
    statusFilters.value.splice(index, 1);
  } else {
    statusFilters.value.push(status);
  }
}

async function clearSiteScope() {
  const query = { ...route.query };
  delete query.siteId;
  await router.replace({ query });
}

function getStatusColor(status: string) {
  switch (status) {
    case 'on_site':
      return 'green-1';
    case 'repair':
      return 'red-1';
    case 'stored':
      return 'blue-1';
    default:
      return 'slate-100';
  }
}

function getStatusTextColor(status: string) {
  switch (status) {
    case 'on_site':
      return 'green-8';
    case 'repair':
      return 'red-8';
    case 'stored':
      return 'blue-8';
    default:
      return 'slate-500';
  }
}

function viewHistory(asset: { id: string; serialNumber?: string; serial_number?: string }) {
  const assetLabel = asset.serialNumber || asset.serial_number || asset.id;

  pushDialog(AssetAuditHistoryDialog, {
    assetId: asset.id,
    assetLabel,
  });
}

function openEdit(asset: { id: string }) {
  if (!isManager.value) {
    $q.notify({ color: 'negative', message: $t('errors.unauthorized') });
    return;
  }

  pushDialog(
    AssetsFormDialog,
    {
      mode: 'edit',
      asset,
    },
    { persistent: true },
  );
}

async function generateAssetQr(asset: {
  id: string;
  serialNumber: string;
  type?: { modelName?: string };
}) {
  const subtitle = asset.type?.modelName || asset.serialNumber;
  const metadata = $t('assets.qr_meta', { assetId: asset.id, serialNumber: asset.serialNumber });

  try {
    const response = await assetStore.fetchAssetQrCode(asset.id);
    pushDialog(QrPreviewDialog, {
      title: $t('assets.qr_code'),
      subtitle,
      qrMarkup: response.qrSvg,
      metadata,
      modelName: subtitle,
      serialNumber: asset.serialNumber,
      context: 'asset',
    });
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: $t('errors.qr_generation_failed') });
  }
}

function confirmDeleteAsset(asset: { id: string; serialNumber?: string; serial_number?: string }) {
  const serial = asset.serialNumber || asset.serial_number || asset.id;
  $q.dialog({
    title: $t('dialogs.delete_asset_title'),
    message: $t('dialogs.delete_asset_message', { serial }),
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
        await assetStore.deleteAsset(asset.id);
        $q.notify({ color: 'positive', message: $t('messages.asset_deleted') });
      } catch (error) {
        console.error(error);
        $q.notify({ color: 'negative', message: $t('errors.delete_asset_failed') });
      }
    })();
  });
}

onMounted(async () => {
  await Promise.all([
    assetStore.fetchAssets(),
    assetStore.fetchAssetTypes(),
    siteStore.fetchSites(),
  ]);
});
</script>

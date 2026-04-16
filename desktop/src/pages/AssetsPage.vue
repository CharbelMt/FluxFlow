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
              color="primary"
              icon="add"
              :label="$t('assets.bulk_intake')"
              unelevated
              rounded
              class="rounded-xl q-px-md font-semibold"
              @click="openIntake"
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
                  <q-item clickable @click="viewHistory(props.row.id)">
                    <q-item-section avatar><q-icon name="history" /></q-item-section>
                    <q-item-section>{{ $t('assets.audit_history') }}</q-item-section>
                  </q-item>
                  <q-item clickable class="text-negative">
                    <q-item-section avatar><q-icon name="report_problem" /></q-item-section>
                    <q-item-section>{{ $t('assets.flag_issue') }}</q-item-section>
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
import { useDialog } from 'src/composables/useDialog';
import BulkIntakeForm from 'components/BulkIntakeForm.vue';
import type { QTableColumn } from 'quasar';
import { useRoute, useRouter } from 'vue-router';

const assetStore = useAssetStore();
const siteStore = useSiteStore();
const { pushDialog } = useDialog();
const filter = ref('');
const statusFilters = ref<string[]>([]);
const route = useRoute();
const router = useRouter();
const { t: $t } = useI18n();

const selectedSiteId = computed(() => {
  const value = route.query.siteId;
  return typeof value === 'string' ? value : '';
});

const selectedSiteName = computed(() => {
  if (!selectedSiteId.value) return '';
  const site = siteStore.sites.find((s) => s.id === selectedSiteId.value);
  return site?.name || 'Selected Site';
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
    BulkIntakeForm,
    {},
    {
      persistent: true,
    },
  );
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

function viewHistory(assetId: string) {
  console.log(`Navigating to history for ${assetId}`);
}

onMounted(async () => {
  await Promise.all([assetStore.fetchAssets(), siteStore.fetchSites()]);
});
</script>

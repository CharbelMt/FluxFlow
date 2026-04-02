<template>
  <q-page class="q-pa-lg">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="text-h4 text-weight-bold text-slate-800 tracking-tight">Asset Registry</div>
        <div class="text-subtitle2 text-slate-400">
          Inventory of all physical instances within the network.
        </div>
      </div>

      <q-input
        v-model="filter"
        outlined
        dense
        placeholder="Search Assets..."
        class="bg-white shadow-sm rounded-lg w-64"
      >
        <template v-slot:prepend>
          <q-icon name="search" color="primary" />
        </template>
      </q-input>
    </div>

    <q-table
      :rows="assetStore.assets"
      :columns="columns"
      :filter="filter"
      :loading="assetStore.loading"
      row-key="id"
      flat
      bordered
      class="rounded-xl border-slate-200"
      :pagination="{ rowsPerPage: 10 }"
    >
      <template v-slot:loading>
        <q-inner-loading showing color="primary" />
      </template>

      <template v-slot:body-cell-model="props">
        <q-td :props="props">
          <div class="text-weight-bold text-slate-700">{{ props.row.type?.modelName }}</div>
          <div class="text-caption text-slate-400">{{ props.row.type?.manufacturer }}</div>
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-chip
            :color="getStatusColor(props.row.status)"
            :text-color="getStatusTextColor(props.row.status)"
            size="sm"
            class="text-weight-bolder uppercase px-3"
          >
            {{ props.row.status || 'Unknown' }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-location="props">
        <q-td :props="props">
          <div class="row no-wrap items-center">
            <q-icon name="place" color="slate-300" size="18px" class="q-mr-xs" />
            <div>
              <div class="text-weight-medium text-slate-700">
                {{ props.row.site?.name || 'In Transit' }}
              </div>
              <div class="text-caption text-primary font-mono">
                {{ props.row.room?.roomLabel || 'No Room' }}
              </div>
            </div>
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense icon="more_vert" color="slate-400">
            <q-menu auto-close>
              <q-list style="min-width: 150px">
                <q-item clickable @click="viewHistory(props.row.id)">
                  <q-item-section avatar><q-icon name="history" /></q-item-section>
                  <q-item-section>Audit History</q-item-section>
                </q-item>
                <q-item clickable class="text-negative">
                  <q-item-section avatar><q-icon name="report_problem" /></q-item-section>
                  <q-item-section>Flag Issue</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAssetStore } from 'src/stores/asset-store';
import type { QTableColumn } from 'quasar';

const assetStore = useAssetStore();
const filter = ref('');

const columns: QTableColumn[] = [
  {
    name: 'serial',
    label: 'Serial Number',
    field: 'serialNumber',
    align: 'left',
    sortable: true,
  },
  {
    name: 'model',
    label: 'Type / Model',
    field: (row) => row.type?.modelName,
    align: 'left',
    sortable: true,
  },
  {
    name: 'location',
    label: 'Current Location',
    field: (row) => row.site?.name,
    align: 'left',
  },
  {
    name: 'status',
    label: 'Status',
    field: 'status',
    align: 'center',
    sortable: true,
  },
  {
    name: 'hours',
    label: 'Runtime (Hrs)',
    field: 'totalHoursUsed',
    align: 'center',
    sortable: true,
    format: (val) => `${val || 0} h`,
  },
  {
    name: 'actions',
    label: '',
    field: 'id',
    align: 'right',
  },
];

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
  await assetStore.fetchAssets();
});
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="row items-center justify-between q-mb-lg">
      <div class="text-xl font-black text-slate-900 tracking-tight">
        {{ $t('assets.manage_models') }}
      </div>

      <!-- Add Model Button -->
      <q-btn
        color="primary"
        icon="add"
        :label="$t('assets.add_model')"
        unelevated
        rounded
        class="rounded-xl q-px-md font-semibold"
        @click="openAddModelDialog"
      />
    </div>

    <!-- Models Table -->
    <q-table
      :rows="asset_store.assetTypes"
      :columns="table_columns"
      row-key="id"
      flat
      bordered
      class="overflow-hidden rounded-xl border-slate-300 bg-slate-50"
      :pagination="{ rowsPerPage: 10 }"
    >
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn
            flat
            round
            dense
            icon="edit"
            color="primary"
            size="sm"
            @click="editModel(props.row)"
          />
          <q-btn
            flat
            round
            dense
            icon="delete"
            color="negative"
            size="sm"
            @click="deleteModel(props.row)"
          />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAssetStore } from 'src/stores/asset-store';
import { useQuasar } from 'quasar';
import type { QTableColumn } from 'quasar';
import type { AssetType } from 'src/utils/types';
import AssetModelFormDialog from 'components/AssetModelFormDialog.vue';
import { useDialog } from 'src/composables/useDialog';

const asset_store = useAssetStore();
const { t: $t } = useI18n();
const $q = useQuasar();
const { pushDialog } = useDialog();

onMounted(() => {
  void asset_store.fetchAssetTypes();
});

const table_columns: QTableColumn[] = [
  {
    name: 'modelName',
    label: $t('assets.model_name'),
    field: 'modelName',
    align: 'left',
  },
  {
    name: 'manufacturer',
    label: $t('assets.manufacturer'),
    field: 'manufacturer',
    align: 'left',
  },
  {
    name: 'category',
    label: $t('assets.category'),
    field: 'category',
    align: 'left',
  },
  {
    name: 'maintenanceIntervalHrs',
    label: $t('assets.maintenance_interval'),
    field: 'maintenanceIntervalHrs',
    align: 'center',
  },
  {
    name: 'actions',
    label: '',
    field: 'id',
    align: 'right',
  },
];

function openAddModelDialog() {
  pushDialog(AssetModelFormDialog, {
    mode: 'create',
    onOk: () => {
      void asset_store.fetchAssetTypes();
    },
  });
}

function editModel(model_data: AssetType) {
  pushDialog(AssetModelFormDialog, {
    mode: 'edit',
    model: model_data,
    onOk: () => {
      void asset_store.fetchAssetTypes();
    },
  });
}

function deleteModel(model_data: AssetType) {
  $q.dialog({
    title: $t('assets.delete_model'),
    message: $t('dialogs.delete_model_message', { modelName: model_data.modelName }),
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
        await asset_store.deleteAssetType(model_data.id);
        $q.notify({ color: 'positive', message: $t('assets.model_deleted') });
      } catch (err: unknown) {
        const error_message =
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof err.response === 'object' &&
          err.response !== null &&
          'data' in err.response &&
          typeof err.response.data === 'object' &&
          err.response.data !== null &&
          'error' in err.response.data &&
          typeof err.response.data.error === 'string'
            ? err.response.data.error
            : $t('errors.delete_asset_failed');
        $q.notify({ color: 'negative', message: error_message });
      }
    })();
  });
}
</script>

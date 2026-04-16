<template>
  <q-page class="q-pa-md sm:q-pa-lg">
    <div class="mx-auto w-full max-w-7xl">
      <div class="q-mb-lg rounded-2xl border border-slate-300 bg-slate-50 p-3 shadow-sm">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="text-sm font-semibold text-slate-600">
            {{ $t('supervisors.user_actions') }}
          </div>
          <div class="row items-center q-gutter-sm">
            <q-input
              v-model="filter"
              outlined
              dense
              :placeholder="$t('supervisors.search_placeholder')"
              class="w-full rounded-xl bg-white sm:w-72"
            >
              <template v-slot:prepend>
                <q-icon :name="mdiMagnify" color="primary" />
              </template>
            </q-input>

            <q-btn
              color="primary"
              rounded
              unelevated
              :icon="mdiPlus"
              :label="$t('supervisors.add_supervisor')"
              class="rounded-xl font-semibold"
              @click="openCreateDialog"
            />
          </div>
        </div>
      </div>

      <q-table
        :rows="filteredSupervisors"
        :columns="columns"
        :loading="supervisorStore.loading"
        row-key="id"
        flat
        bordered
        class="overflow-hidden rounded-2xl border-slate-300 bg-slate-50 shadow-sm"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>

        <template v-slot:body-cell-name="props">
          <q-td :props="props">
            <div class="font-bold text-slate-700">{{ props.row.fullName }}</div>
            <div class="text-caption text-slate-500">{{ props.row.email }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-role="props">
          <q-td :props="props">
            <q-chip size="sm" color="blue-1" text-color="primary" class="font-black uppercase">
              {{ props.row.role }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn
              flat
              color="primary"
              :label="$t('supervisors.edit')"
              no-caps
              class="rounded-lg"
              @click="openEditDialog(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from 'src/stores/auth-store';
import { useSupervisorStore } from 'src/stores/supervisor-store';
import { useDialog } from 'src/composables/useDialog';
import SupervisorFormDialog from 'src/components/SupervisorFormDialog.vue';
import { mdiMagnify, mdiPlus } from '@quasar/extras/mdi-v7';
import type { QTableColumn } from 'quasar';

const $q = useQuasar();
const authStore = useAuthStore();
const supervisorStore = useSupervisorStore();
const { pushDialog } = useDialog();
const filter = ref('');
const { t: $t } = useI18n();

const columns: QTableColumn[] = [
  {
    name: 'name',
    label: $t('supervisors.supervisor_column'),
    field: 'fullName',
    align: 'left',
    sortable: true,
  },
  {
    name: 'role',
    label: $t('supervisors.role_column'),
    field: 'role',
    align: 'left',
    sortable: true,
  },
  { name: 'actions', label: '', field: 'id', align: 'right' },
];

const filteredSupervisors = computed(() => {
  const term = filter.value.trim().toLowerCase();
  if (!term) return supervisorStore.supervisors;

  return supervisorStore.supervisors.filter((supervisor) => {
    return (
      supervisor.fullName.toLowerCase().includes(term) ||
      supervisor.email.toLowerCase().includes(term)
    );
  });
});

function openCreateDialog() {
  pushDialog(
    SupervisorFormDialog,
    {
      mode: 'create',
    },
    {
      persistent: true,
    },
  ).onOk(() => {
    void loadSupervisors();
  });
}

function openEditDialog(supervisor: { id: string; fullName: string; email: string }) {
  pushDialog(
    SupervisorFormDialog,
    {
      mode: 'edit',
      supervisor,
    },
    {
      persistent: true,
    },
  ).onOk(() => {
    void loadSupervisors();
  });
}

async function loadSupervisors() {
  const managerId = authStore.user?.id as string | undefined;
  if (!managerId) {
    $q.notify({ color: 'negative', message: $t('supervisors.unable_resolve_manager') });
    return;
  }

  try {
    await supervisorStore.fetchSupervisors(managerId);
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: $t('supervisors.failed_load_supervisors') });
  }
}

onMounted(async () => {
  await loadSupervisors();
});
</script>

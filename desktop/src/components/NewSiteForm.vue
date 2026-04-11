<template>
  <q-card flat class="bg-white overflow-hidden">
    <CardSectionTitle
      :title="isEditMode ? 'Edit Deployment Zone' : 'Create Deployment Zone'"
      @close="props.onDialogCancel"
    />

    <q-card-section class="q-pa-lg q-gutter-y-lg">
      <div class="column q-gutter-sm">
        <div class="text-overline text-primary font-bold">Site Details</div>
        <q-input v-model="form.name" label="Site Name" outlined autofocus :disable="submitting" />
        <q-input
          v-model="form.location_gps"
          label="Location (GPS)"
          outlined
          :disable="submitting"
          hint="Optional. Example: 14.5995,120.9842"
        />

        <q-select
          v-model="selectedSupervisorIds"
          :options="supervisorOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          multiple
          use-chips
          outlined
          label="Assigned Supervisors"
          :disable="submitting || loadingSupervisors"
        />
      </div>
    </q-card-section>

    <q-card-actions align="right" class="q-pa-lg bg-slate-50">
      <q-btn
        flat
        label="Discard"
        color="slate-400"
        :disable="submitting"
        @click="props.onDialogCancel"
      />
      <q-btn
        unelevated
        rounded
        color="primary"
        :label="isEditMode ? 'Save Changes' : 'Create Site'"
        class="q-px-xl"
        :loading="submitting"
        @click="handleSubmission"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import CardSectionTitle from 'components/dialog/CardSectionTitle.vue';
import { useAuthStore } from 'src/stores/auth-store';
import { useSiteStore } from 'src/stores/site-store';
import { useSupervisorStore } from 'src/stores/supervisor-store';

type SiteDialogPayload = {
  mode?: 'create' | 'edit';
  site?: {
    id: string;
    name: string;
    location_gps?: string;
    locationGps?: string | null;
  };
};

const props = defineProps<{
  onDialogOK: (payload: unknown) => void;
  onDialogCancel: () => void;
  componentProps?: SiteDialogPayload;
}>();

const $q = useQuasar();
const authStore = useAuthStore();
const siteStore = useSiteStore();
const supervisorStore = useSupervisorStore();
const submitting = ref(false);
const loadingSupervisors = ref(false);
const selectedSupervisorIds = ref<string[]>([]);

const isEditMode = computed(
  () => props.componentProps?.mode === 'edit' && !!props.componentProps?.site?.id,
);

const editedSiteId = computed(() => props.componentProps?.site?.id || '');

const form = ref({
  name: props.componentProps?.site?.name || '',
  location_gps:
    props.componentProps?.site?.location_gps || props.componentProps?.site?.locationGps || '',
});

const supervisorOptions = computed(() =>
  supervisorStore.supervisors.map((supervisor) => ({
    label: `${supervisor.fullName} (${supervisor.email})`,
    value: supervisor.id,
  })),
);

async function loadSupervisorOptions(managerId: string) {
  loadingSupervisors.value = true;
  try {
    await supervisorStore.fetchManagerSupervisorData(managerId);

    if (isEditMode.value && editedSiteId.value) {
      const targetSite = supervisorStore.sites.find((site) => site.id === editedSiteId.value);
      selectedSupervisorIds.value =
        targetSite?.supervisors
          .map((entry) => entry.supervisor?.id || entry.supervisorId)
          .filter(Boolean) || [];
    }
  } finally {
    loadingSupervisors.value = false;
  }
}

async function handleSubmission() {
  const name = form.value.name.trim();
  const locationGps = form.value.location_gps.trim();
  const managerId = authStore.user?.id as string | undefined;

  if (!name) {
    $q.notify({ color: 'negative', message: 'Site name is required.' });
    return;
  }

  if (!managerId) {
    $q.notify({
      color: 'negative',
      message: 'Unable to resolve manager profile. Please sign in again.',
    });
    return;
  }

  submitting.value = true;
  try {
    const sitePayload = {
      name,
      manager_id: managerId,
      ...(locationGps ? { location_gps: locationGps } : {}),
    };

    const result = isEditMode.value
      ? await siteStore.updateSite(editedSiteId.value, sitePayload)
      : await siteStore.createSite(sitePayload);

    const targetSiteId =
      (result as { id?: string } | undefined)?.id || (isEditMode.value ? editedSiteId.value : '');

    if (targetSiteId) {
      await supervisorStore.assignSupervisorsToSite({
        manager_id: managerId,
        site_id: targetSiteId,
        supervisor_ids: selectedSupervisorIds.value,
      });
    }

    $q.notify({
      color: 'positive',
      message: isEditMode.value ? 'Deployment zone updated.' : 'Deployment zone created.',
    });
    props.onDialogOK(result);
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: 'Failed to create deployment zone.' });
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  const managerId = authStore.user?.id as string | undefined;
  if (!managerId) return;

  try {
    await loadSupervisorOptions(managerId);
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: 'Failed to load supervisors.' });
  }
});
</script>

<style scoped>
.font-bold {
  font-weight: 700;
}
</style>

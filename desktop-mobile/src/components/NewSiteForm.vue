<template>
  <q-card flat class="bg-white overflow-hidden" style="min-width: 500px">
    <CardSectionTitle
      :title="isEditMode ? $t('forms.new_site.title_edit') : $t('forms.new_site.title_create')"
      @close="props.onDialogCancel"
    />

    <q-card-section class="q-pa-lg flex flex-col gap-4">
      <div class="column gap-2">
        <div class="text-overline text-primary font-bold">{{ $t('forms.new_site.details') }}</div>
        <q-input
          v-model="form.name"
          :label="$t('forms.new_site.site_name')"
          outlined
          autofocus
          :disable="submitting"
        />
        <q-input
          v-model="form.location_gps"
          :label="$t('forms.new_site.location_gps')"
          outlined
          :disable="submitting"
          :hint="$t('forms.new_site.location_hint')"
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
          :label="$t('forms.new_site.assigned_supervisors')"
          :disable="submitting || loadingSupervisors"
        />
      </div>
    </q-card-section>

    <q-card-actions align="right" class="q-pa-lg">
      <q-btn
        flat
        rounded
        :label="$t('forms.new_site.discard')"
        color="negative"
        :disable="submitting"
        @click="props.onDialogCancel"
      />
      <q-btn
        unelevated
        rounded
        color="primary"
        :label="isEditMode ? $t('forms.new_site.save_changes') : $t('forms.new_site.create_site')"
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
import { useI18n } from 'vue-i18n';
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
const { t: $t } = useI18n();
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
    $q.notify({ color: 'negative', message: $t('errors.site_name_required') });
    return;
  }

  if (!managerId) {
    $q.notify({
      color: 'negative',
      message: $t('errors.manager_error'),
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
      message: isEditMode.value
        ? $t('messages.deploy_zone_updated')
        : $t('messages.deploy_zone_created'),
    });
    props.onDialogOK(result);
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: $t('errors.deploy_zone_failed') });
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
    $q.notify({ color: 'negative', message: $t('errors.failed_load_supervisors') });
  }
});
</script>

<style scoped>
.font-bold {
  font-weight: 700;
}
</style>

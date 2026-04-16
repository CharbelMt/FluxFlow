<template>
  <q-card flat class="bg-white overflow-hidden" style="min-width: 450px">
    <CardSectionTitle
      :title="isEditMode ? $t('forms.supervisor.title_edit') : $t('forms.supervisor.title_create')"
      @close="props.onDialogCancel"
    />

    <q-card-section class="q-pa-lg flex flex-col gap-3">
      <q-input
        v-model="form.full_name"
        :label="$t('forms.supervisor.full_name')"
        outlined
        autofocus
        :disable="submitting"
      />

      <q-input
        v-model="form.email"
        :label="$t('forms.supervisor.email')"
        outlined
        type="email"
        :disable="submitting"
      />

      <q-input
        v-model="form.password"
        :label="
          isEditMode ? $t('forms.supervisor.password_edit') : $t('forms.supervisor.password_create')
        "
        outlined
        type="password"
        :disable="submitting"
      />
    </q-card-section>

    <q-card-actions align="right" class="q-pa-lg">
      <q-btn
        flat
        rounded
        :label="$t('forms.supervisor.discard')"
        color="negative"
        :disable="submitting"
        @click="props.onDialogCancel"
      />
      <q-btn
        unelevated
        rounded
        color="primary"
        :label="
          isEditMode
            ? $t('forms.supervisor.save_changes')
            : $t('forms.supervisor.create_supervisor')
        "
        class="q-px-xl"
        :loading="submitting"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import CardSectionTitle from 'components/dialog/CardSectionTitle.vue';
import { useAuthStore } from 'src/stores/auth-store';
import { useSupervisorStore } from 'src/stores/supervisor-store';

type SupervisorDialogPayload = {
  mode?: 'create' | 'edit';
  supervisor?: {
    id: string;
    fullName?: string;
    full_name?: string;
    email: string;
  };
};

const props = defineProps<{
  onDialogOK: (payload: unknown) => void;
  onDialogCancel: () => void;
  componentProps?: SupervisorDialogPayload;
}>();

const $q = useQuasar();
const authStore = useAuthStore();
const supervisorStore = useSupervisorStore();
const submitting = ref(false);
const { t: $t } = useI18n();

const isEditMode = computed(
  () => props.componentProps?.mode === 'edit' && !!props.componentProps?.supervisor?.id,
);

const editingSupervisorId = computed(() => props.componentProps?.supervisor?.id || '');

const form = ref({
  full_name:
    props.componentProps?.supervisor?.fullName || props.componentProps?.supervisor?.full_name || '',
  email: props.componentProps?.supervisor?.email || '',
  password: '',
});

async function handleSubmit() {
  const managerId = authStore.user?.id as string | undefined;
  const fullName = form.value.full_name.trim();
  const email = form.value.email.trim();
  const password = form.value.password.trim();

  if (!managerId) {
    $q.notify({ color: 'negative', message: $t('errors.manager_error') });
    return;
  }

  if (!fullName || !email) {
    $q.notify({ color: 'negative', message: $t('errors.name_email_required') });
    return;
  }

  if (!isEditMode.value && !password) {
    $q.notify({ color: 'negative', message: $t('errors.temp_password_required') });
    return;
  }

  submitting.value = true;
  try {
    const basePayload = {
      full_name: fullName,
      email,
    };

    const result = isEditMode.value
      ? await supervisorStore.updateSupervisor(managerId, editingSupervisorId.value, {
          ...basePayload,
          ...(password ? { password } : {}),
        })
      : await supervisorStore.createSupervisor(managerId, {
          ...basePayload,
          password,
        });

    $q.notify({
      color: 'positive',
      message: isEditMode.value
        ? $t('messages.supervisor_updated')
        : $t('messages.supervisor_created'),
    });
    props.onDialogOK(result);
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: $t('errors.save_supervisor_failed') });
  } finally {
    submitting.value = false;
  }
}
</script>

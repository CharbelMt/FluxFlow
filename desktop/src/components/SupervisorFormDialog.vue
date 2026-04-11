<template>
  <q-card flat class="bg-white overflow-hidden">
    <CardSectionTitle
      :title="isEditMode ? 'Edit Supervisor' : 'Add Supervisor'"
      @close="props.onDialogCancel"
    />

    <q-card-section class="q-pa-lg q-gutter-y-md">
      <q-input
        v-model="form.full_name"
        label="Full Name"
        outlined
        autofocus
        :disable="submitting"
      />

      <q-input v-model="form.email" label="Email" outlined type="email" :disable="submitting" />

      <q-input
        v-model="form.password"
        :label="isEditMode ? 'Password (optional to change)' : 'Temporary Password'"
        outlined
        type="password"
        :disable="submitting"
      />
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
        :label="isEditMode ? 'Save Changes' : 'Create Supervisor'"
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
    $q.notify({ color: 'negative', message: 'Unable to resolve manager profile.' });
    return;
  }

  if (!fullName || !email) {
    $q.notify({ color: 'negative', message: 'Name and email are required.' });
    return;
  }

  if (!isEditMode.value && !password) {
    $q.notify({ color: 'negative', message: 'Temporary password is required.' });
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
      message: isEditMode.value ? 'Supervisor updated.' : 'Supervisor created.',
    });
    props.onDialogOK(result);
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: 'Failed to save supervisor.' });
  } finally {
    submitting.value = false;
  }
}
</script>

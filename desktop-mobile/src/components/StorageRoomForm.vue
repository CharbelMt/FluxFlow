<template>
  <q-card flat class="bg-white overflow-hidden" style="min-width: 460px">
    <CardSectionTitle
      :title="
        is_edit_mode ? $t('forms.storage_room.title_edit') : $t('forms.storage_room.title_create')
      "
      @close="props.onDialogCancel"
    />

    <q-card-section class="q-pa-lg flex flex-col gap-4">
      <div class="text-sm text-slate-500">
        {{ $t('forms.storage_room.site_context', { siteName }) }}
      </div>

      <q-input
        v-model="form.room_label"
        :label="$t('forms.storage_room.room_label')"
        outlined
        autofocus
        :disable="submitting"
      />
    </q-card-section>

    <q-card-actions align="right" class="q-pa-lg">
      <q-btn
        flat
        rounded
        :label="$t('forms.storage_room.discard')"
        color="negative"
        :disable="submitting"
        @click="props.onDialogCancel"
      />
      <q-btn
        unelevated
        rounded
        color="primary"
        :label="
          is_edit_mode ? $t('forms.storage_room.save_room') : $t('forms.storage_room.create_room')
        "
        class="q-px-xl"
        :loading="submitting"
        :disable="submitting || !hasChanges"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import CardSectionTitle from 'components/dialog/CardSectionTitle.vue';
import { useSiteStore } from 'src/stores/site-store';

const props = defineProps<{
  onDialogOK: (payload: unknown) => void;
  onDialogCancel: () => void;
  componentProps?: {
    siteId?: string;
    siteName?: string;
    room?: {
      id: string;
      roomLabel?: string;
      room_label?: string;
    };
  };
}>();

const $q = useQuasar();
const siteStore = useSiteStore();
const { t: $t } = useI18n();

const submitting = ref(false);
const siteId = computed(() => props.componentProps?.siteId || '');
const siteName = computed(() => props.componentProps?.siteName || '');
const editingRoomId = computed(() => props.componentProps?.room?.id || '');
const is_edit_mode = computed(() => Boolean(editingRoomId.value));
const form = ref({
  room_label: props.componentProps?.room?.roomLabel || props.componentProps?.room?.room_label || '',
});

const initialForm = {
  room_label: form.value.room_label.trim(),
};

const hasChanges = computed(() => {
  return form.value.room_label.trim() !== initialForm.room_label;
});

async function handleSubmit() {
  const roomLabel = form.value.room_label.trim();

  if (!siteId.value) {
    $q.notify({ color: 'negative', message: $t('errors.incomplete_data') });
    return;
  }

  if (!roomLabel) {
    $q.notify({ color: 'negative', message: $t('errors.room_details_required') });
    return;
  }

  submitting.value = true;
  try {
    const room = is_edit_mode.value
      ? await siteStore.updateStorageRoom(editingRoomId.value, {
          room_label: roomLabel,
        })
      : await siteStore.createStorageRoom(siteId.value, {
          room_label: roomLabel,
        });

    $q.notify({
      color: 'positive',
      message: is_edit_mode.value ? $t('messages.room_updated') : $t('messages.room_created'),
    });
    props.onDialogOK(room);
  } catch (error) {
    console.error(error);
    $q.notify({
      color: 'negative',
      message: is_edit_mode.value
        ? $t('errors.room_update_failed')
        : $t('errors.room_create_failed'),
    });
  } finally {
    submitting.value = false;
  }
}
</script>

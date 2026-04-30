<template>
  <q-card flat class="bg-white overflow-hidden" style="min-width: 460px">
    <CardSectionTitle
      :title="$t('forms.storage_room.title_create')"
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

      <q-input
        v-model="form.room_tag_uid"
        :label="$t('forms.storage_room.room_tag_uid')"
        outlined
        :disable="submitting"
      >
        <template #append>
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            :label="$t('forms.storage_room.generate_uid')"
            @click="generateRoomTagUid"
          />
        </template>
      </q-input>
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
        :label="$t('forms.storage_room.create_room')"
        class="q-px-xl"
        :loading="submitting"
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
  };
}>();

const $q = useQuasar();
const siteStore = useSiteStore();
const { t: $t } = useI18n();

const submitting = ref(false);
const siteId = computed(() => props.componentProps?.siteId || '');
const siteName = computed(() => props.componentProps?.siteName || '');
const form = ref({
  room_label: '',
  room_tag_uid: '',
});

function generateRoomTagUid() {
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  form.value.room_tag_uid = `ROOM-${suffix}`;
}

async function handleSubmit() {
  const roomLabel = form.value.room_label.trim();
  const roomTagUid = form.value.room_tag_uid.trim();

  if (!siteId.value) {
    $q.notify({ color: 'negative', message: $t('errors.incomplete_data') });
    return;
  }

  if (!roomLabel || !roomTagUid) {
    $q.notify({ color: 'negative', message: $t('errors.room_details_required') });
    return;
  }

  submitting.value = true;
  try {
    const room = await siteStore.createStorageRoom(siteId.value, {
      room_label: roomLabel,
      room_tag_uid: roomTagUid,
    });

    $q.notify({ color: 'positive', message: $t('messages.room_created') });
    props.onDialogOK(room);
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: $t('errors.room_create_failed') });
  } finally {
    submitting.value = false;
  }
}
</script>

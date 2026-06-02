<template>
  <q-card flat class="bg-white overflow-hidden" style="min-width: 550px">
    <CardSectionTitle
      :title="isEdit ? $t('forms.edit_asset.title') : $t('forms.add_asset.title')"
      @close="onDialogCancel"
    />

    <q-card-section class="q-pa-lg flex flex-col gap-4">
      <div class="column gap-2">
        <div class="text-overline text-primary font-bold">{{ $t('forms.add_asset.step1') }}</div>
        <div class="row gap-3">
          <q-select
            v-model="form.site_id"
            :label="$t('forms.add_asset.target_site')"
            :options="siteStore.sites"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            outlined
            class="flex-1"
          />
          <q-select
            v-model="form.room_id"
            :label="$t('forms.add_asset.target_room')"
            :options="availableRooms"
            option-value="id"
            option-label="roomLabel"
            emit-value
            map-options
            outlined
            :disable="!form.site_id"
            class="flex-1"
          />
        </div>
      </div>

      <div class="column gap-2">
        <div class="row items-center justify-between">
          <div class="text-overline text-primary font-bold">
            {{ $t('forms.add_asset.step2') }}
          </div>
        </div>

        <div>
          <q-select
            v-model="form.type_id"
            :label="$t('forms.add_asset.select_existing_model')"
            :options="typeOptions"
            outlined
            emit-value
            map-options
          />
        </div>
      </div>

      <div class="column gap-2">
        <div class="text-overline text-primary font-bold">
          {{ isEdit ? $t('forms.edit_asset.details') : $t('forms.add_asset.step3') }}
        </div>
        <template v-if="!isEdit">
          <q-input
            v-model="serial_input"
            type="textarea"
            outlined
            :placeholder="$t('forms.add_asset.serial_placeholder')"
            :hint="$t('forms.add_asset.serial_hint')"
            rows="5"
          />
        </template>
        <template v-else>
          <q-input
            v-model="form.serial_number"
            outlined
            :label="$t('forms.add_asset.serial_placeholder')"
          />
        </template>
      </div>
    </q-card-section>

    <q-card-actions align="right" class="q-pa-lg">
      <q-btn
        flat
        rounded
        :label="$t('forms.add_asset.discard')"
        color="negative"
        @click="onDialogCancel"
      />
      <q-btn
        unelevated
        rounded
        color="primary"
        :label="isEdit ? $t('forms.edit_asset.save') : $t('forms.add_asset.finalize')"
        class="q-px-xl"
        :loading="submitting"
        :disable="submitting || !hasChanges"
        @click="handleSubmission"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAssetStore } from 'src/stores/asset-store';
import { useSiteStore } from 'src/stores/site-store';
import { useQuasar } from 'quasar';
import CardSectionTitle from 'components/dialog/CardSectionTitle.vue';
import type { AssetInstance } from 'src/utils/types';

interface ComponentProps {
  mode?: 'create' | 'edit';
  asset?: AssetInstance;
}

const props = defineProps<{
  mode?: 'create' | 'edit';
  asset?: AssetInstance;
  componentProps?: ComponentProps;
  onDialogOK: (payload: unknown) => void;
  onDialogCancel: () => void;
}>();

const $q = useQuasar();
const assetStore = useAssetStore();
const siteStore = useSiteStore();
const { t: $t } = useI18n();

const submitting = ref(false);
const serial_input = ref('');

const form = ref({
  site_id: '',
  room_id: '',
  type_id: undefined as string | undefined,
  serial_number: '' as string,
});

const initialState = ref({
  serial_input: '',
  site_id: '',
  room_id: '',
  type_id: undefined as string | undefined,
  serial_number: '',
});

const editingAsset = computed(() => props.asset || props.componentProps?.asset);
const dialogMode = computed(
  () => props.mode || props.componentProps?.mode || (editingAsset.value ? 'edit' : 'create'),
);
const isEdit = computed(() => dialogMode.value === 'edit');

const hasChanges = computed(() => {
  if (isEdit.value) {
    return (
      form.value.serial_number !== initialState.value.serial_number ||
      form.value.site_id !== initialState.value.site_id ||
      form.value.room_id !== initialState.value.room_id ||
      form.value.type_id !== initialState.value.type_id
    );
  }

  return (
    serial_input.value !== initialState.value.serial_input ||
    form.value.site_id !== initialState.value.site_id ||
    form.value.room_id !== initialState.value.room_id ||
    form.value.type_id !== initialState.value.type_id
  );
});

const typeOptions = computed(() => {
  const types_map = new Map();
  assetStore.assetTypes.forEach((type) => {
    types_map.set(type.id, {
      label: type.modelName || type.model_name,
      value: type.id,
    });
  });
  return Array.from(types_map.values());
});

const availableRooms = computed(() => {
  const site = siteStore.sites.find((s) => s.id === form.value.site_id);
  return site ? site.storageRooms : [];
});

watch(
  editingAsset,
  (val) => {
    if (val) {
      form.value.site_id = val.site?.id || (val.assigned_site_id as string) || '';
      form.value.room_id = val.room?.id || (val.current_room_id as string) || '';
      form.value.type_id = val.type?.id || (val.type_id as string) || undefined;
      form.value.serial_number = val.serialNumber || val.serial_number || '';

      initialState.value = {
        serial_input: '',
        site_id: form.value.site_id,
        room_id: form.value.room_id,
        type_id: form.value.type_id,
        serial_number: form.value.serial_number,
      };
    } else {
      // reset for create mode
      form.value.site_id = '';
      form.value.room_id = '';
      form.value.type_id = undefined;
      form.value.serial_number = '';
      serial_input.value = '';
      initialState.value = {
        serial_input: '',
        site_id: '',
        room_id: '',
        type_id: undefined,
        serial_number: '',
      };
    }
  },
  { immediate: true },
);

async function handleSubmission() {
  if (isEdit.value) {
    // Prepare update payload
    const editing = editingAsset.value;
    if (!editing) return;

    submitting.value = true;
    try {
      const payload = {
        serial_number: form.value.serial_number || null,
        type_id: form.value.type_id || null,
        assigned_site_id: form.value.site_id || null,
        current_room_id: form.value.room_id || null,
      };

      const result = await assetStore.updateAsset(editing.id, payload);
      $q.notify({ color: 'positive', message: $t('messages.asset_updated') });
      props.onDialogOK(result);
    } catch (err) {
      console.error(err);
      $q.notify({ color: 'negative', message: $t('errors.update_asset_failed') });
    } finally {
      submitting.value = false;
    }
    return;
  }

  // Create mode
  const serials = serial_input.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  if (serials.length === 0 || !form.value.site_id || !form.value.room_id || !form.value.type_id) {
    $q.notify({ color: 'negative', message: $t('errors.incomplete_data') });
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      site_id: form.value.site_id,
      room_id: form.value.room_id,
      serial_numbers: serials,
      type_id: form.value.type_id,
    };

    const result = await assetStore.bulkCreateAssets(payload);
    $q.notify({
      color: 'positive',
      message: $t('messages.assets_integrated', { count: result.count }),
    });
    props.onDialogOK(result);
  } catch (err) {
    console.error(err);
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  if (assetStore.assetTypes.length === 0) {
    await assetStore.fetchAssetTypes();
  }
});
</script>

<style scoped>
.font-bold {
  font-weight: 700;
}
</style>

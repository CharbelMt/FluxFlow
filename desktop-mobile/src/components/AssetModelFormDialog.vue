<template>
  <q-card flat class="bg-white overflow-hidden">
    <q-card-section class="q-pb-sm">
      <div class="row items-center">
        <div class="text-h6">{{ getTitle }}</div>
        <q-btn flat dense class="q-ml-auto" icon="close" size="md" @click="handleClose" rounded />
      </div>
    </q-card-section>

    <q-card-section class="q-pa-lg flex flex-col gap-4">
      <q-input
        v-model="form.modelName"
        outlined
        :label="$t('assets.model_name')"
        class="rounded-lg"
      />

      <q-input
        v-model="form.manufacturer"
        outlined
        :label="$t('assets.manufacturer')"
        class="rounded-lg"
      />

      <q-input v-model="form.category" outlined :label="$t('assets.category')" class="rounded-lg" />

      <q-input
        v-model.number="form.maintenanceIntervalHrs"
        outlined
        type="number"
        :label="$t('assets.maintenance_interval')"
        class="rounded-lg"
      />

      <div class="row gap-3 justify-end q-mt-lg">
        <q-btn
          flat
          color="primary"
          :label="$t('common.cancel')"
          @click="handleClose"
          no-caps
          class="rounded-lg"
        />
        <q-btn
          color="primary"
          unelevated
          :label="isEditMode ? $t('common.update') : $t('common.save')"
          :loading="submitting"
          :disable="submitting || !hasChanges"
          @click="saveModel"
          no-caps
          class="rounded-lg q-px-lg"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAssetStore } from 'src/stores/asset-store';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';

interface AssetModelInput {
  id: string;
  modelName?: string;
  manufacturer?: string;
  category?: string;
  maintenanceIntervalHrs?: number;
}

interface Props {
  mode: 'create' | 'edit';
  model?: AssetModelInput;
  onDialogOK?: () => void;
  onDialogCancel?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
});

const asset_store = useAssetStore();
const { t: $t } = useI18n();
const $q = useQuasar();
const submitting = ref(false);

const isEditMode = computed(() => props.mode === 'edit');

const form = ref({
  modelName: props.model?.modelName || '',
  manufacturer: props.model?.manufacturer || '',
  category: props.model?.category || '',
  maintenanceIntervalHrs: props.model?.maintenanceIntervalHrs || 0,
});

const initialForm = {
  modelName: form.value.modelName.trim(),
  manufacturer: form.value.manufacturer.trim(),
  category: form.value.category.trim(),
  maintenanceIntervalHrs: Number(form.value.maintenanceIntervalHrs) || 0,
};

const hasChanges = computed(() => {
  return (
    form.value.modelName.trim() !== initialForm.modelName ||
    form.value.manufacturer.trim() !== initialForm.manufacturer ||
    form.value.category.trim() !== initialForm.category ||
    (Number(form.value.maintenanceIntervalHrs) || 0) !== initialForm.maintenanceIntervalHrs
  );
});

const getTitle = computed(() => {
  return isEditMode.value ? $t('assets.edit_model') : $t('assets.add_model');
});

function handleClose() {
  props.onDialogCancel?.();
}

async function saveModel() {
  if (!hasChanges.value || submitting.value) return;

  submitting.value = true;
  try {
    const payload = {
      model_name: form.value.modelName,
      manufacturer: form.value.manufacturer,
      category: form.value.category,
      maintenance_interval_hrs: form.value.maintenanceIntervalHrs,
    };

    if (isEditMode.value) {
      await asset_store.updateAssetType(props.model!.id, payload);
      $q.notify({ color: 'positive', message: $t('assets.model_updated') });
    } else {
      await asset_store.createAssetType(payload);
      $q.notify({ color: 'positive', message: $t('assets.model_created') });
    }

    props.onDialogOK?.();
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: $t('errors.save_asset_failed') });
  } finally {
    submitting.value = false;
  }
}
</script>

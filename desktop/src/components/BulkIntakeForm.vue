<template>
  <q-card flat class="bg-white overflow-hidden">
    <CardSectionTitle :title="$t('forms.bulk_intake.title')" @close="onDialogCancel" />

    <q-card-section class="q-pa-lg q-gutter-y-lg">
      <div class="column q-gutter-sm">
        <div class="text-overline text-primary font-bold">{{ $t('forms.bulk_intake.step1') }}</div>
        <div class="row q-col-gutter-md">
          <q-select
            v-model="form.site_id"
            :label="$t('forms.bulk_intake.target_site')"
            :options="siteStore.sites"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            outlined
            class="col-12 col-sm-6"
          />
          <q-select
            v-model="form.room_id"
            :label="$t('forms.bulk_intake.target_room')"
            :options="availableRooms"
            option-value="id"
            option-label="roomLabel"
            emit-value
            map-options
            outlined
            :disable="!form.site_id"
            class="col-12 col-sm-6"
          />
        </div>
      </div>

      <q-separator />

      <div class="column q-gutter-sm">
        <div class="row items-center justify-between">
          <div class="text-overline text-primary font-bold">
            {{ $t('forms.bulk_intake.step2') }}
          </div>
          <q-toggle
            v-model="is_new_type"
            :label="$t('forms.bulk_intake.create_new_model')"
            dense
            color="primary"
          />
        </div>

        <div v-if="!is_new_type">
          <q-select
            v-model="form.type_id"
            :label="$t('forms.bulk_intake.select_existing_model')"
            :options="typeOptions"
            outlined
            emit-value
            map-options
          />
        </div>

        <div
          v-else
          class="q-pa-md bg-slate-50 rounded-lg border border-dashed border-slate-300 q-gutter-sm"
        >
          <q-input
            v-model="form.new_type.model_name"
            :label="$t('forms.bulk_intake.model_name')"
            dense
            outlined
          />
          <q-input
            v-model="form.new_type.manufacturer"
            :label="$t('forms.bulk_intake.manufacturer')"
            dense
            outlined
          />
          <div class="row q-col-gutter-sm">
            <q-input
              v-model="form.new_type.category"
              :label="$t('forms.bulk_intake.category')"
              dense
              outlined
              class="col-6"
            />
            <q-input
              v-model.number="form.new_type.maintenance_interval_hrs"
              type="number"
              :label="$t('forms.bulk_intake.interval_hours')"
              dense
              outlined
              class="col-6"
            />
          </div>
        </div>
      </div>

      <q-separator />

      <div class="column q-gutter-sm">
        <div class="text-overline text-primary font-bold">{{ $t('forms.bulk_intake.step3') }}</div>
        <q-input
          v-model="serial_input"
          type="textarea"
          outlined
          :placeholder="$t('forms.bulk_intake.serial_placeholder')"
          :hint="$t('forms.bulk_intake.serial_hint')"
          rows="5"
        />
      </div>
    </q-card-section>

    <q-card-actions align="right" class="q-pa-lg bg-slate-50">
      <q-btn
        flat
        :label="$t('forms.bulk_intake.discard')"
        color="slate-400"
        @click="onDialogCancel"
      />
      <q-btn
        unelevated
        rounded
        color="primary"
        :label="$t('forms.bulk_intake.finalize')"
        class="q-px-xl"
        :loading="submitting"
        @click="handleSubmission"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAssetStore } from 'src/stores/asset-store';
import { useSiteStore } from 'src/stores/site-store';
import { useQuasar } from 'quasar';
import CardSectionTitle from 'components/dialog/CardSectionTitle.vue';

const props = defineProps<{
  onDialogOK: (payload: unknown) => void;
  onDialogCancel: () => void;
}>();

const $q = useQuasar();
const assetStore = useAssetStore();
const siteStore = useSiteStore();
const { t: $t } = useI18n();

const is_new_type = ref(false);
const submitting = ref(false);
const serial_input = ref('');

const form = ref({
  site_id: '',
  room_id: '',
  type_id: undefined as string | undefined,
  new_type: {
    model_name: '',
    manufacturer: '',
    category: '',
    maintenance_interval_hrs: 0,
  },
});

const typeOptions = computed(() => {
  const types_map = new Map();
  assetStore.assets.forEach((a) => {
    if (a.type) types_map.set(a.type.id, { label: a.type.model_name, value: a.type.id });
  });
  return Array.from(types_map.values());
});

const availableRooms = computed(() => {
  const site = siteStore.sites.find((s) => s.id === form.value.site_id);
  return site ? site.storageRooms : [];
});

async function handleSubmission() {
  const serials = serial_input.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  if (serials.length === 0 || !form.value.site_id || !form.value.room_id) {
    $q.notify({ color: 'negative', message: $t('errors.incomplete_data') });
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      site_id: form.value.site_id,
      room_id: form.value.room_id,
      serial_numbers: serials,
      ...(is_new_type.value
        ? { new_type: form.value.new_type }
        : form.value.type_id
          ? { type_id: form.value.type_id }
          : {}),
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
</script>

<style scoped>
.font-bold {
  font-weight: 700;
}
</style>

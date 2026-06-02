<template>
  <q-card flat class="dialog-shell audit-history-dialog bg-white overflow-hidden">
    <CardSectionTitle :title="title" @close="handleClose(onDialogCancel)" />

    <q-card-section class="q-pt-none q-px-lg q-pb-lg">
      <div class="text-caption text-grey-7 q-mb-md">
        {{ subtitle }}
      </div>

      <div v-if="is_loading" class="flex flex-center q-pa-xl">
        <q-spinner color="primary" size="32px" />
      </div>

      <q-banner v-else-if="load_error" class="bg-negative text-white rounded-borders q-mb-md">
        {{ load_error }}
      </q-banner>

      <q-banner v-else-if="audit_logs.length === 0" class="bg-grey-2 text-grey-8 rounded-borders">
        {{ $t('assets.audit_history_empty') }}
      </q-banner>

      <q-list v-else bordered separator class="rounded-borders audit-history-list">
        <q-item v-for="entry in audit_logs" :key="entry.id" class="q-py-sm">
          <q-item-section>
            <q-item-label class="text-weight-medium">
              {{ getActionLabel(entry.actionType) }}
            </q-item-label>
            <q-item-label caption>
              {{ formatTimestamp(entry.clientCreatedAt) }}
            </q-item-label>
            <q-item-label caption>
              {{ $t('assets.audit_history_supervisor') }}: {{ getSupervisorLabel(entry) }}
            </q-item-label>
            <q-item-label caption>
              {{ $t('assets.audit_history_location') }}: {{ getLocationLabel(entry) }}
            </q-item-label>
          </q-item-section>

          <q-item-section side top>
            <q-chip color="primary" text-color="white" size="sm" class="font-semibold">
              {{ $t('assets.audit_history_hours_value', { value: entry.hoursUsedIncrement ?? 0 }) }}
            </q-chip>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <q-card-actions align="right" class="q-pa-md q-pt-none">
      <q-btn
        flat
        color="primary"
        :label="$t('common.close')"
        @click="handleClose(onDialogCancel)"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CardSectionTitle from './dialog/CardSectionTitle.vue';
import { useAssetStore, type AuditLogEntry } from 'src/stores/asset-store';

interface ComponentProps {
  assetId: string;
  assetLabel?: string;
}

const props = defineProps<{
  componentProps?: ComponentProps;
  onDialogOK?: () => void;
  onDialogCancel?: () => void;
}>();

const { t: $t } = useI18n();
const assetStore = useAssetStore();

const is_loading = ref(false);
const audit_logs = ref<AuditLogEntry[]>([]);
const load_error = ref('');

const title = computed(() => $t('assets.audit_history_title'));

const subtitle = computed(() => {
  const asset_label = props.componentProps?.assetLabel || props.componentProps?.assetId || '';
  return $t('assets.audit_history_subtitle', { assetLabel: asset_label });
});

async function loadAuditLogs() {
  const asset_id = props.componentProps?.assetId;

  if (!asset_id) {
    load_error.value = $t('assets.audit_history_invalid_asset');
    return;
  }

  is_loading.value = true;
  load_error.value = '';

  try {
    const response = await assetStore.fetchAssetAuditLogs(asset_id);
    audit_logs.value = response.audit_logs;
  } catch (error) {
    console.error(error);
    load_error.value = $t('assets.audit_history_failed');
  } finally {
    is_loading.value = false;
  }
}

function handleClose(cancel?: () => void) {
  cancel?.();
}

function getActionLabel(actionType: string | null) {
  switch (actionType) {
    case 'usage_update':
      return $t('assets.audit_history_usage_update');
    case 'usage_batch':
      return $t('assets.audit_history_usage_batch');
    default:
      return $t('assets.audit_history_unknown_action');
  }
}

function getSupervisorLabel(entry: AuditLogEntry) {
  return entry.user?.fullName || entry.user?.email || $t('assets.audit_history_unknown');
}

function getLocationLabel(entry: AuditLogEntry) {
  return entry.storageRoom?.roomLabel || $t('assets.audit_history_unknown');
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return $t('assets.audit_history_unknown');
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

onMounted(() => {
  void loadAuditLogs();
});
</script>

<style scoped>
.audit-history-dialog {
  min-width: min(92vw, 760px);
}

.audit-history-list {
  max-height: min(60vh, 520px);
  overflow-y: auto;
}
</style>

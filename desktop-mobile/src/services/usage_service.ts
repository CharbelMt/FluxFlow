import { Capacitor } from '@capacitor/core';
import { Network, type ConnectionStatus } from '@capacitor/network';
import { api } from 'boot/axios';
import { i18n } from 'boot/i18n';
import { Notify } from 'quasar';
import {
  deleteLocalLog,
  getPendingLogs,
  initDatabase,
  saveLocalLog,
  markAsSynced,
} from './database_service';

export interface UsageLogSubmission {
  asset_id: string;
  runtime_hours: number;
  update_notes: string;
  status: string;
  supervisor_id?: string;
  timestamp?: string;
}

export interface UsageLogSyncResult {
  success: boolean;
  queued: boolean;
  synced: boolean;
  local_id: number | null;
  reason?: 'network' | 'validation' | 'server' | 'local';
}

type SyncablePendingLog = {
  local_id?: number;
  asset_id: string;
  runtime_hours: number;
  timestamp: string;
  sync_status: 'pending' | 'synced';
};

let network_listener: { remove: () => Promise<void> } | null = null;
let sync_in_progress = false;
let engine_initialized = false;
let network_warning_logged = false;

const t = i18n.global.t.bind(i18n.global);

function logNetworkFallbackOnce(error: unknown) {
  if (network_warning_logged) {
    return;
  }

  network_warning_logged = true;
  console.warn('Network plugin unavailable; falling back to browser online status.', error);
}

async function getConnectionStatusSafe() {
  if (!Capacitor.isPluginAvailable('Network')) {
    return { connected: navigator.onLine };
  }

  try {
    const status = await Network.getStatus();
    return { connected: status.connected };
  } catch (error) {
    logNetworkFallbackOnce(error);
    return { connected: navigator.onLine };
  }
}

async function registerNetworkListenerSafe() {
  if (!Capacitor.isPluginAvailable('Network')) {
    return;
  }

  try {
    network_listener = await Network.addListener(
      'networkStatusChange',
      (network_status: ConnectionStatus) => {
        if (network_status.connected) {
          void syncPendingLogs();
        }
      },
    );
  } catch (error) {
    logNetworkFallbackOnce(error);
  }
}

function isNetworkFailure(error: unknown) {
  const axios_error = error as { code?: string; message?: string; response?: unknown };

  return (
    axios_error.code === 'ERR_NETWORK' ||
    axios_error.message === 'Network Error' ||
    axios_error.response === undefined
  );
}

function isValidationFailure(error: unknown) {
  const axios_error = error as { response?: { status?: number } };
  const status = axios_error.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

function resolveSupervisorId(supervisor_id?: string) {
  if (supervisor_id) {
    return supervisor_id;
  }

  const stored_user = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!stored_user) {
    return '';
  }

  try {
    const parsed_user = JSON.parse(stored_user) as { id?: string };
    return parsed_user.id || '';
  } catch {
    return '';
  }
}

export async function submitUsageLog(log_data: UsageLogSubmission): Promise<UsageLogSyncResult> {
  await initDatabase();

  const supervisor_id = resolveSupervisorId(log_data.supervisor_id);
  const timestamp = log_data.timestamp || new Date().toISOString();

  if (!supervisor_id) {
    throw new Error(t('errors.supervisor_required_for_usage_logs'));
  }

  const local_result = await saveLocalLog({
    asset_id: log_data.asset_id,
    runtime_hours: log_data.runtime_hours,
    supervisor_id,
    timestamp,
    sync_status: 'pending',
  });

  const local_id = local_result.local_id;

  try {
    await api.post(`/assets/${log_data.asset_id}/usage`, {
      asset_id: log_data.asset_id,
      runtime_hours: log_data.runtime_hours,
      update_notes: log_data.update_notes,
      status: log_data.status,
      supervisor_id,
      timestamp,
    });

    if (local_id !== null) {
      try {
        await markAsSynced([local_id]);
      } catch (error) {
        console.error('Failed to mark local usage log as synced.', error);
        await deleteLocalLog(local_id);
      }
    }

    return {
      success: true,
      queued: false,
      synced: true,
      local_id,
    };
  } catch (error) {
    if (isNetworkFailure(error)) {
      Notify.create({
        type: 'warning',
        message: t('messages.usage_saved_locally'),
        position: 'top',
        timeout: 2500,
      });

      return {
        success: true,
        queued: true,
        synced: false,
        local_id,
        reason: 'network',
      };
    }

    if (isValidationFailure(error)) {
      if (local_id !== null) {
        await deleteLocalLog(local_id);
      }

      Notify.create({
        type: 'negative',
        message: t('messages.usage_update_rejected'),
        position: 'top',
        timeout: 3000,
      });

      return {
        success: false,
        queued: false,
        synced: false,
        local_id,
        reason: 'validation',
      };
    }

    return {
      success: false,
      queued: true,
      synced: false,
      local_id,
      reason: 'server',
    };
  }
}

export async function syncPendingLogs() {
  await initDatabase();

  if (sync_in_progress) {
    return { success: true, synced_count: 0, failed_count: 0, pending_count: 0 };
  }

  const pending_logs = (await getPendingLogs()) as SyncablePendingLog[];
  if (pending_logs.length === 0) {
    return { success: true, synced_count: 0, failed_count: 0, pending_count: 0 };
  }

  sync_in_progress = true;

  let synced_count = 0;
  let failed_count;

  try {
    const network_status = await getConnectionStatusSafe();
    if (!network_status.connected) {
      return {
        success: true,
        synced_count: 0,
        failed_count: 0,
        pending_count: pending_logs.length,
      };
    }

    const response = await api.post(
      '/usage/batch',
      pending_logs.map((pending_log) => ({
        local_id: pending_log.local_id,
        asset_id: pending_log.asset_id,
        runtime_hours: pending_log.runtime_hours,
        timestamp: pending_log.timestamp,
      })),
    );

    const status_items = response.data as Array<{
      localId?: number | null;
      success?: boolean;
      reason?: string | null;
    }>;

    const synced_local_ids = status_items
      .filter((item) => item.success && typeof item.localId === 'number')
      .map((item) => item.localId as number);

    if (synced_local_ids.length > 0) {
      await markAsSynced(synced_local_ids);
      synced_count = synced_local_ids.length;
    }

    const failed_local_ids = status_items
      .filter((item) => !item.success && typeof item.localId === 'number')
      .map((item) => item.localId as number);

    for (const local_id of failed_local_ids) {
      await deleteLocalLog(local_id);
    }

    failed_count = failed_local_ids.length;

    if (synced_count > 0) {
      const synced_message =
        synced_count === 1
          ? t('messages.pending_usage_log_synced', { count: synced_count })
          : t('messages.pending_usage_logs_synced', { count: synced_count });
      Notify.create({
        type: 'positive',
        message: synced_message,
        position: 'top',
        timeout: 2000,
      });
    }

    return {
      success: true,
      synced_count,
      failed_count,
      pending_count: pending_logs.length - synced_count - failed_count,
    };
  } finally {
    sync_in_progress = false;
  }
}

export async function initUsageSyncEngine() {
  await initDatabase();

  if (engine_initialized) {
    return;
  }

  const status = await getConnectionStatusSafe();
  if (status.connected) {
    void syncPendingLogs();
  }

  await registerNetworkListenerSafe();

  engine_initialized = true;
}

export async function disposeUsageSyncEngine() {
  if (network_listener) {
    await network_listener.remove();
    network_listener = null;
  }

  engine_initialized = false;
}

import { type PluginListenerHandle } from '@capacitor/core';
import { Network, type ConnectionStatus } from '@capacitor/network';
import { api } from 'boot/axios';
import { Notify } from 'quasar';
import {
  deleteLocalLog,
  getPendingLogs,
  initDatabase,
  saveLocalLog,
  updateLocalLogStatus,
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
  supervisor_id: string;
  timestamp: string;
  sync_status: 'pending' | 'synced' | 'failed';
  update_notes?: string;
  status?: string;
};

let network_listener: PluginListenerHandle | null = null;
let sync_in_progress = false;
let engine_initialized = false;

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
    throw new Error('A supervisor account is required to submit usage logs.');
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
        await updateLocalLogStatus(local_id, 'synced');
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
        message: 'Saved Locally. It will sync when the connection is restored.',
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
        await updateLocalLogStatus(local_id, 'failed');
      }

      Notify.create({
        type: 'negative',
        message: 'Usage update was rejected by the server and will not be retried.',
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
  let failed_count = 0;

  try {
    const network_status = await Network.getStatus();
    if (!network_status.connected) {
      return {
        success: true,
        synced_count: 0,
        failed_count: 0,
        pending_count: pending_logs.length,
      };
    }

    for (const pending_log of pending_logs) {
      try {
        await api.post(`/assets/${pending_log.asset_id}/usage`, {
          asset_id: pending_log.asset_id,
          runtime_hours: pending_log.runtime_hours,
          update_notes: pending_log.update_notes || '',
          status: pending_log.status || 'on_site',
          supervisor_id: pending_log.supervisor_id,
          timestamp: pending_log.timestamp,
        });

        if (pending_log.local_id !== undefined && pending_log.local_id !== null) {
          try {
            await updateLocalLogStatus(pending_log.local_id, 'synced');
          } catch (error) {
            console.error('Failed to mark synced log locally, deleting row instead.', error);
            await deleteLocalLog(pending_log.local_id);
          }
        }

        synced_count += 1;
      } catch (error) {
        if (isNetworkFailure(error)) {
          break;
        }

        if (isValidationFailure(error)) {
          if (pending_log.local_id !== undefined && pending_log.local_id !== null) {
            await updateLocalLogStatus(pending_log.local_id, 'failed');
          }

          failed_count += 1;
          continue;
        }
      }
    }

    if (synced_count > 0) {
      Notify.create({
        type: 'positive',
        message: `${synced_count} pending usage log${synced_count === 1 ? '' : 's'} synced.`,
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

  const status = await Network.getStatus();
  if (status.connected) {
    void syncPendingLogs();
  }

  network_listener = await Network.addListener(
    'networkStatusChange',
    (network_status: ConnectionStatus) => {
      if (network_status.connected) {
        void syncPendingLogs();
      }
    },
  );

  engine_initialized = true;
}

export async function disposeUsageSyncEngine() {
  if (network_listener) {
    await network_listener.remove();
    network_listener = null;
  }

  engine_initialized = false;
}

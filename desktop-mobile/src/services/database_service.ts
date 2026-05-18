import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';

export interface OfflineUsageLog {
  local_id?: number;
  asset_id: string;
  runtime_hours: number;
  supervisor_id: string;
  timestamp: string;
  sync_status: 'pending' | 'synced' | 'failed';
}

const database_name = 'fluxflow_offline_logs';
const table_name = 'offline_usage_logs';
const is_web = Capacitor.getPlatform() === 'web';

let db_connection: SQLiteDBConnection | null = null;
let is_initialized = false;
let is_unavailable = false;
let initialization_error_logged = false;
const sqlite_connection = new SQLiteConnection(CapacitorSQLite);

function logUnavailableOnce(error: unknown) {
  if (initialization_error_logged) {
    return;
  }

  initialization_error_logged = true;
  console.warn('SQLite storage is unavailable; offline usage logs will be skipped.', error);
}

async function getDbConnection() {
  if (is_unavailable) {
    throw new Error('SQLite storage is unavailable.');
  }

  if (db_connection) {
    return db_connection;
  }

  if (is_web) {
    try {
      await sqlite_connection.initWebStore();
    } catch (error) {
      is_unavailable = true;
      logUnavailableOnce(error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  try {
    const connection = await sqlite_connection.createConnection(
      database_name,
      false,
      'no-encryption',
      1,
      false,
    );
    await connection.open();
    db_connection = connection;
    return connection;
  } catch (error) {
    is_unavailable = true;
    logUnavailableOnce(error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function initDatabase() {
  if (is_initialized) {
    return;
  }

  if (is_unavailable) {
    is_initialized = true;
    return;
  }

  let connection: SQLiteDBConnection;

  try {
    connection = await getDbConnection();
  } catch {
    is_initialized = true;
    return;
  }

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ${table_name} (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id TEXT NOT NULL,
        runtime_hours REAL NOT NULL,
        supervisor_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK(sync_status IN ('pending', 'synced', 'failed'))
      );
    `);
  } catch (error) {
    is_unavailable = true;
    logUnavailableOnce(error);
    is_initialized = true;
    return;
  }

  is_initialized = true;
}

export async function saveLocalLog(
  log_data: Omit<OfflineUsageLog, 'local_id' | 'sync_status'> & {
    sync_status?: OfflineUsageLog['sync_status'];
  },
) {
  await initDatabase();

  if (is_unavailable) {
    return { success: true, local_id: null };
  }

  const connection = await getDbConnection();
  const sync_status = log_data.sync_status || 'pending';

  const result = await connection.run(
    `
      INSERT INTO ${table_name} (
        asset_id,
        runtime_hours,
        supervisor_id,
        timestamp,
        sync_status
      ) VALUES (?, ?, ?, ?, ?);
    `,
    [
      log_data.asset_id,
      log_data.runtime_hours,
      log_data.supervisor_id,
      log_data.timestamp,
      sync_status,
    ],
  );

  return {
    success: true,
    local_id: result.changes?.lastId ?? null,
  };
}

export async function updateLocalLogStatus(
  local_id: number,
  sync_status: OfflineUsageLog['sync_status'],
) {
  await initDatabase();

  if (is_unavailable) {
    return { success: true };
  }

  const connection = await getDbConnection();
  await connection.run(
    `
      UPDATE ${table_name}
      SET sync_status = ?
      WHERE local_id = ?;
    `,
    [sync_status, local_id],
  );

  return { success: true };
}

export async function deleteLocalLog(local_id: number) {
  await initDatabase();

  if (is_unavailable) {
    return { success: true };
  }

  const connection = await getDbConnection();
  await connection.run(
    `
      DELETE FROM ${table_name}
      WHERE local_id = ?;
    `,
    [local_id],
  );

  return { success: true };
}

export async function getPendingLogs() {
  await initDatabase();

  if (is_unavailable) {
    return [] as OfflineUsageLog[];
  }

  const connection = await getDbConnection();
  const result = await connection.query(`
      SELECT local_id, asset_id, runtime_hours, supervisor_id, timestamp, sync_status
      FROM ${table_name}
      WHERE sync_status = 'pending'
      ORDER BY local_id ASC;
    `);

  return (result.values || []) as OfflineUsageLog[];
}

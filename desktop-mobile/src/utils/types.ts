export interface LoginCredentials {
  email: string;
  password: string;
  persist: boolean;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'supervisor';
  created_at: string;
}

export interface Site {
  id: string;
  name: string;
  location_gps?: string | null;
  locationGps?: string | null;
  manager_id?: string | null;
  managerId?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface StorageRoom {
  id: string;
  site_id?: string | null;
  siteId?: string | null;
  room_label?: string;
  room_tag_uid?: string;
  roomLabel?: string;
  roomTagUid?: string;
  site?: Site;
}

export interface AssetType {
  id: string;
  model_name?: string;
  modelName?: string;
  manufacturer?: string | null;
  category?: string | null;
  maintenance_interval_hrs?: number | null;
  maintenanceIntervalHrs?: number;
}

export interface AssetInstance {
  id: string;
  type_id?: string | null;
  serial_number?: string;
  assigned_site_id?: string | null;
  current_room_id?: string | null;
  status?: string | null;
  version_clock?: number | null;
  total_hours_used?: number | null;
  serialNumber?: string;
  assignedSiteId?: string;
  currentRoomId?: string;
  versionClock?: number;
  totalHoursUsed?: number;
  type?: AssetType;
  site?: Site;
  room?: StorageRoom;
}

export interface AuditLog {
  id: string;
  asset_id: string;
  room_id: string | null;
  supervisor_id: string;
  client_created_at: string;
  action_type: string;
  witness_gps: string;
  condition_score: number;
  hours_used_increment: number;
}

export interface MaintenanceRecord {
  id: string;
  asset_id?: string | null;
  service_date?: string | null;
  status?: string | null;
  technician_notes?: string | null;
  assetId?: string;
  serviceDate?: string;
  technicianNotes?: string;
}

export interface ScannedAssetData extends AssetInstance {
  type?: AssetType;
  site?: Site;
  room?: StorageRoom;
}

export interface ScannedRoomData extends StorageRoom {
  site?: Site;
}

export interface ScannedAsset {
  type: 'asset';
  data: ScannedAssetData;
}

export interface ScannedRoom {
  type: 'room';
  data: ScannedRoomData;
}

export type ScannedItem = ScannedAsset | ScannedRoom;

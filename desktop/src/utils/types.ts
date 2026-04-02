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
  location_gps: string;
  manager_id: string;
  created_at: string;
}

export interface StorageRoom {
  id: string;
  site_id: string;
  room_label: string;
  room_tag_uid: string;
}

export interface AssetType {
  id: string;
  model_name: string;
  manufacturer: string;
  category: string;
  maintenance_interval_hrs: number;
}

export interface AssetInstance {
  id: string;
  type_id: string;
  serial_number: string;
  assigned_site_id: string;
  current_room_id: string;
  status: string;
  version_clock: number;
  total_hours_used: number;
  type?: AssetType;
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

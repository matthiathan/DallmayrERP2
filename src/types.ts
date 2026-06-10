export type UserRole = 'admin' | 'manager' | 'warehouse_staff' | 'road_technician';

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string;
  name: string;
}

export interface CustomerBranch {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  region: 'kzn' | 'jhb' | 'cpt';
}

export interface Asset {
  id: string;
  qr_code: string;
  serial_number: string;
  name: string;
  category: string;
  status: 'active' | 'maintenance' | 'retired';
  branch_id: string; // references CustomerBranch.id
  last_serviced_at: string;
}

export interface RouteStop {
  id: string;
  order: number;
  customer_name: string;
  address: string;
  latitude: number;
  longitude: number;
  task_id: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface TechnicianRoute {
  id: string;
  technician_id: string; // UserProfile.id
  date: string; // YYYY-MM-DD (local date to prevent UTC discrepancy)
  stops: RouteStop[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string; // UserProfile.id
  collaborators: string[]; // UserProfile.id list
  qr_code: string;
  machine_photo_url?: string;
  verification_latitude?: number;
  verification_longitude?: number;
  completed_at?: string;
  created_at: string;
}

export interface StockItem {
  id: string;
  item_name: string;
  sku: string;
  quantity: number;
  warehouse_location: string;
  min_stock_level: number;
}

export interface SyncPayload {
  id: string;
  type: 'UPDATE_TASK' | 'CREATE_TASK' | 'UPDATE_ROUTE' | 'UPDATE_STOCK';
  table: string;
  key: string;
  data: any;
  timestamp: string;
}

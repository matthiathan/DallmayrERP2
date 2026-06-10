import { createClient } from '@supabase/supabase-js';
import { CustomerBranch, Asset, Task, TechnicianRoute, StockItem, UserProfile } from './types';

// Read config
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Check if we have real credentials
const hasRealCredentials =
  supabaseUrl &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
  supabaseAnonKey.trim() !== '';

export const isMock = !hasRealCredentials;

// Initialize real client if we have credentials
export const realSupabase = hasRealCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mock database initial structures
const DEFAULTS = {
  user_roles: [
    { id: 'user-admin-uuid', role: 'admin', email: 'admin@dallmayr.com', name: 'Alice Admin' },
    { id: 'user-dispatcher-uuid', role: 'manager', email: 'manager@dallmayr.com', name: 'Diana Dispatcher' },
    { id: 'user-tech-uuid', role: 'road_technician', email: 'tech@dallmayr.com', name: 'Bob Tech' },
    { id: 'user-warehouse-uuid', role: 'warehouse_staff', email: 'warehouse@dallmayr.com', name: 'Charlie Warehouse' },
  ] as UserProfile[],

  customers_kzn: [
    { id: 'kzn-01', name: 'Durban Beachfront Cafe', address: '12 Marine Parade, Durban', latitude: -29.8512, longitude: 31.0392, contact_number: '+27 31 555 1021', region: 'kzn' },
    { id: 'kzn-02', name: 'Umhlanga Espresso Hub', address: '44 Lagoon Dr, Umhlanga', latitude: -29.7258, longitude: 31.0894, contact_number: '+27 31 555 3044', region: 'kzn' },
    { id: 'kzn-03', name: 'Pietermaritzburg Bistro', address: '22 Chief Albert Luthuli St, PMB', latitude: -29.6006, longitude: 30.3794, contact_number: '+27 33 555 8080', region: 'kzn' }
  ] as CustomerBranch[],

  customers_jhb: [
    { id: 'jhb-01', name: 'Sandton Corporate Office', address: '150 West St, Sandton, Johannesburg', latitude: -26.1032, longitude: 28.0561, contact_number: '+27 11 555 9001', region: 'jhb' },
    { id: 'jhb-02', name: 'Roserose Coffee Lounge', address: 'Craddock Ave, Rosebank', latitude: -26.1458, longitude: 28.0431, contact_number: '+27 11 555 1234', region: 'jhb' },
    { id: 'jhb-03', name: 'Pretoria Square Coffee', address: 'Helen Joseph St, Pretoria', latitude: -25.7461, longitude: 28.1881, contact_number: '+27 12 555 4321', region: 'jhb' }
  ] as CustomerBranch[],

  customers_cpt: [
    { id: 'cpt-01', name: 'Waterfront Dallmayr Lounge', address: 'Breakwater Blvd, V&A Waterfront, Cape Town', latitude: -33.9036, longitude: 18.4211, contact_number: '+27 21 555 9991', region: 'cpt' },
    { id: 'cpt-02', name: 'Stellenbosch Roastry', address: '48 Dorp St, Stellenbosch', latitude: -33.9382, longitude: 18.8581, contact_number: '+27 21 555 2211', region: 'cpt' },
    { id: 'cpt-03', name: 'Constantia Garden Cafe', address: 'Alphen Dr, Constantia', latitude: -34.0125, longitude: 18.4551, contact_number: '+27 21 555 7766', region: 'cpt' }
  ] as CustomerBranch[],

  assets: [
    { id: 'asset-01', qr_code: 'DL-001', serial_number: 'SN-DL-98402', name: 'Dallmayr Promatic Espresso', category: 'Espresso Machine', status: 'active', branch_id: 'cpt-01', last_serviced_at: '2026-04-10' },
    { id: 'asset-02', qr_code: 'DL-002', serial_number: 'SN-DL-48192', name: 'Dallmayr Barista Pro v4', category: 'Bean to Cup', status: 'active', branch_id: 'jhb-01', last_serviced_at: '2026-05-15' },
    { id: 'asset-03', qr_code: 'DL-003', serial_number: 'SN-DL-11029', name: 'Dallmayr Promatic Twin', category: 'Twin Brewer', status: 'maintenance', branch_id: 'kzn-01', last_serviced_at: '2026-06-01' },
    { id: 'asset-04', qr_code: 'DL-004', serial_number: 'SN-DL-38102', name: 'Dallmayr Compact Granular', category: 'Vending', status: 'active', branch_id: 'jhb-02', last_serviced_at: '2026-03-20' },
    { id: 'asset-05', qr_code: 'DL-005', serial_number: 'SN-DL-19251', name: 'Dallmayr Executive Royal', category: 'Espresso Machine', status: 'retired', branch_id: 'cpt-02', last_serviced_at: '2025-12-05' }
  ] as Asset[],

  tasks: [
    { id: 'task-a', title: 'Espresso extraction tuning', description: 'Calibrate grind size and extraction timers for Promatic Espresso.', status: 'pending', assigned_to: 'user-tech-uuid', collaborators: ['user-warehouse-uuid'], qr_code: 'DL-001', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'task-b', title: 'Monthly pressure valve check', description: 'Inspect and deep clean pressure safety valves core.', status: 'in_progress', assigned_to: 'user-tech-uuid', collaborators: [], qr_code: 'DL-003', created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: 'task-c', title: 'Seal replacement & descaling', description: 'Standard C-class scale removal and grouphead gasket swap.', status: 'completed', assigned_to: 'user-tech-uuid', collaborators: [], qr_code: 'DL-002', machine_photo_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400', verification_latitude: -26.1032, verification_longitude: 28.0561, completed_at: new Date().toISOString(), created_at: new Date(Date.now() - 259200000).toISOString() }
  ] as Task[],

  technician_routes: [
    {
      id: 'route-today-uuid',
      technician_id: 'user-tech-uuid',
      date: new Date().toLocaleDateString('en-CA'), // ensures strict local date code
      stops: [
        { id: 'stop-01', order: 1, customer_name: 'Sandton Corporate Office', address: '150 West St, Sandton, Johannesburg', latitude: -26.1032, longitude: 28.0561, task_id: 'task-b', status: 'in_progress' },
        { id: 'stop-02', order: 2, customer_name: 'Roserose Coffee Lounge', address: 'Craddock Ave, Rosebank', latitude: -26.1458, longitude: 28.0431, task_id: 'task-a', status: 'pending' }
      ]
    }
  ] as TechnicianRoute[],

  stocks: [
    { id: 'st-01', item_name: 'Dallmayr Crema d’Oro Beans (1kg)', sku: 'COF-CRM-01', quantity: 240, warehouse_location: 'A-12-B', min_stock_level: 50 },
    { id: 'st-02', item_name: 'Dallmayr Prodomo Ground (500g)', sku: 'COF-PRD-02', quantity: 180, warehouse_location: 'A-14-D', min_stock_level: 40 },
    { id: 'st-03', item_name: 'Silicon O-Ring Seal 42mm', sku: 'PRT-OR-42', quantity: 14, warehouse_location: 'B-02-A', min_stock_level: 25 }, // low stock
    { id: 'st-04', item_name: 'Heavy-Duty Brass Pressure Valve 1.5 Bar', sku: 'PRT-VALV-15', quantity: 8, warehouse_location: 'B-04-C', min_stock_level: 10 }, // low stock
    { id: 'st-05', item_name: 'Organic Descaling Powder (Tabs x50)', sku: 'CLN-DSC-50', quantity: 95, warehouse_location: 'C-01-A', min_stock_level: 20 },
    { id: 'st-06', item_name: 'Bio Milk System Frother Cleaner (1L)', sku: 'CLN-MLK-01', quantity: 42, warehouse_location: 'C-02-B', min_stock_level: 15 }
  ] as StockItem[],

  locations: [
    { id: 'loc-01', name: 'Johannesburg Corporate Branch', address: '150 West St, Sandton, Johannesburg' },
    { id: 'loc-02', name: 'Waterfront Dallmayr Lounge', address: 'Breakwater Blvd, V&A Waterfront, Cape Town' },
    { id: 'loc-03', name: 'Durban Beachfront Depot', address: '12 Marine Parade, Durban' },
    { id: 'loc-04', name: 'Central Spares Warehouse JHB', address: 'Industrial Area Phase II, Johannesburg' }
  ],

  stock_items: [
    { id: 'st-01', item_name: 'Dallmayr Crema d’Oro Beans (1kg)', sku: 'COF-CRM-01', quantity: 240, current_quantity: 240, warehouse_location: 'A-12-B', min_stock_level: 50 },
    { id: 'st-02', item_name: 'Dallmayr Prodomo Ground (500g)', sku: 'COF-PRD-02', quantity: 180, current_quantity: 180, warehouse_location: 'A-14-D', min_stock_level: 40 },
    { id: 'st-03', item_name: 'Silicon O-Ring Seal 42mm', sku: 'PRT-OR-42', quantity: 14, current_quantity: 14, warehouse_location: 'B-02-A', min_stock_level: 25 },
    { id: 'st-04', item_name: 'Heavy-Duty Brass Pressure Valve 1.5 Bar', sku: 'PRT-VALV-15', quantity: 8, current_quantity: 8, warehouse_location: 'B-04-C', min_stock_level: 10 },
    { id: 'st-05', item_name: 'Organic Descaling Powder (Tabs x50)', sku: 'CLN-DSC-50', quantity: 95, current_quantity: 95, warehouse_location: 'C-01-A', min_stock_level: 20 },
    { id: 'st-06', item_name: 'Bio Milk System Frother Cleaner (1L)', sku: 'CLN-MLK-01', quantity: 42, current_quantity: 42, warehouse_location: 'C-02-B', min_stock_level: 15 }
  ],

  stock_transactions: [] as any[],
  asset_movements: [] as any[],

  tickets: [
    { id: 't-01', customer_id: 'jhb-01', customer_name: 'Sandton Corporate Office', address: '150 West St, Sandton, Johannesburg', region: 'jhb', issue_description: 'Grinder is making a high-pitched squealing sound. No espresso coming out.', status: 'open', priority: 'high', created_at: new Date(Date.now() - 36000000).toISOString() },
    { id: 't-02', customer_id: 'jhb-02', customer_name: 'Roserose Coffee Lounge', address: 'Craddock Ave, Rosebank', region: 'jhb', issue_description: 'Grouphead water dispenser gasket leak during brewing.', status: 'open', priority: 'medium', created_at: new Date(Date.now() - 72000000).toISOString() },
    { id: 't-03', customer_id: 'cpt-01', customer_name: 'Waterfront Dallmayr Lounge', address: 'Breakwater Blvd, V&A Waterfront, Cape Town', region: 'cpt', issue_description: 'Automatic descaling cycle keeps requesting to repeat. Blocked valve alert.', status: 'open', priority: 'high', created_at: new Date(Date.now() - 18000000).toISOString() },
    { id: 't-04', customer_id: 'kzn-01', customer_name: 'Durban Beachfront Cafe', address: '12 Marine Parade, Durban', region: 'kzn', issue_description: 'Milk frothing system fails to draw steam. Needs frother head check.', status: 'open', priority: 'low', created_at: new Date(Date.now() - 86400000).toISOString() }
  ] as any[],

  scheduled_call_logs: [
    { id: 'sc-01', ticket_id: 't-01', customer_id: 'jhb-01', customer_name: 'Sandton Corporate Office', address: '150 West St, Sandton, Johannesburg', region: 'jhb', scheduled_date: new Date().toLocaleDateString('en-CA'), notes: 'Schedule for immediate gasket reset and calibration.', assigned_to: 'user-tech-uuid', status: 'pending', created_at: new Date().toISOString() }
  ] as any[]
};

// Local storage helpers
function getMockData(): typeof DEFAULTS {
  const data = localStorage.getItem('dallmayr_mock_db');
  if (!data) {
    localStorage.setItem('dallmayr_mock_db', JSON.stringify(DEFAULTS));
    return DEFAULTS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULTS;
  }
}

function saveMockData(data: typeof DEFAULTS) {
  localStorage.setItem('dallmayr_mock_db', JSON.stringify(data));
  
  // Triggers window storage event for simple local realtime binding
  window.dispatchEvent(new Event('storage'));
}

// Simple Mock Event Listener registry for realtime simulations
const realtimeListeners: (() => void)[] = [];
export function registerRealtimeCallback(cb: () => void) {
  realtimeListeners.push(cb);
  window.addEventListener('storage', cb);
  return () => {
    const idx = realtimeListeners.indexOf(cb);
    if (idx !== -1) realtimeListeners.splice(idx, 1);
    window.removeEventListener('storage', cb);
  };
}

// Trigger all local listeners manually (e.g., when route updates locally)
export function notifyRealtimeListeners() {
  realtimeListeners.forEach(cb => cb());
}

/**
 * Highly capable Mock builder mimicking Supabase Client query API so the identical codebase compiles 
 * and handles operations flawlessly in either mode.
 */
class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderCol: string | null = null;
  private orderAscending: boolean = true;
  private isSingleElement: boolean = false;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(projection?: string) {
    this.operation = 'select';
    return this;
  }

  insert(newData: any) {
    this.operation = 'insert';
    this.payload = newData;
    return this;
  }

  update(updateData: any) {
    this.operation = 'update';
    this.payload = updateData;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => {
      if (column === 'technician_id' || column === 'assigned_to') {
        return item[column] === value;
      }
      return item[column] == value;
    });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push((item) => values.includes(item[column]));
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.orderCol = column;
    this.orderAscending = ascending;
    return this;
  }

  single() {
    this.isSingleElement = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const db = getMockData();
      const tableData = (db as any)[this.tableName];
      if (!tableData) {
        throw new Error(`Table ${this.tableName} not found`);
      }

      let result = { data: null as any, error: null as any, count: 0 };

      if (this.operation === 'select') {
        let rows = [...tableData];
        for (const filter of this.filters) {
          rows = rows.filter(filter);
        }
        if (this.orderCol) {
          rows.sort((a, b) => {
            const valA = a[this.orderCol!];
            const valB = b[this.orderCol!];
            if (valA === undefined || valB === undefined) return 0;
            if (valA < valB) return this.orderAscending ? -1 : 1;
            if (valA > valB) return this.orderAscending ? 1 : -1;
            return 0;
          });
        }
        result.data = this.isSingleElement ? (rows[0] || null) : rows;
      } 
      else if (this.operation === 'insert') {
        const formatted = Array.isArray(this.payload) ? this.payload : [this.payload];
        const itemsToAdd = formatted.map(item => ({
          id: item.id || `mock-id-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          ...item
        }));
        (db as any)[this.tableName] = [...tableData, ...itemsToAdd];
        saveMockData(db);
        result.data = Array.isArray(this.payload) ? itemsToAdd : itemsToAdd[0];
      }
      else if (this.operation === 'update') {
        let affectedCount = 0;
        const updatedTable = tableData.map((item: any) => {
          const matches = this.filters.every(f => f(item));
          if (matches) {
            affectedCount++;
            return { ...item, ...this.payload };
          }
          return item;
        });
        (db as any)[this.tableName] = updatedTable;
        saveMockData(db);
        result.data = updatedTable.filter((item: any) => this.filters.every(f => f(item)));
        result.count = affectedCount;
      }
      else if (this.operation === 'delete') {
        const remainingTable = tableData.filter((item: any) => !this.filters.every(f => f(item)));
        (db as any)[this.tableName] = remainingTable;
        saveMockData(db);
        result.data = null;
      }

      if (onfulfilled) {
        return Promise.resolve(result).then(onfulfilled);
      }
      return result;
    } catch (e: any) {
      if (onrejected) return Promise.reject({ data: null, error: e }).catch(onrejected);
      return { data: null, error: e };
    }
  }
}


// Unified client proxy
export const supabase: any = {
  from(tableName: string) {
    if (!isMock && realSupabase) {
      return realSupabase.from(tableName);
    }
    return new MockQueryBuilder(tableName);
  },

  // Auth mimic
  auth: {
    async getUser() {
      if (!isMock && realSupabase) {
        return realSupabase.auth.getUser();
      }
      const loggedUser = localStorage.getItem('dallmayr_logged_user');
      if (loggedUser) {
        const user = JSON.parse(loggedUser);
        return { data: { user }, error: null };
      }
      return { data: { user: null }, error: null };
    },

    async signInWithPassword({ email }: { email: string; password?: string }) {
      if (!isMock && realSupabase) {
        return realSupabase.auth.signInWithPassword({ email, password: arguments[0].password || '' });
      }

      const db = getMockData();
      const matched = db.user_roles.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (matched) {
        const userPayload = {
          id: matched.id,
          email: matched.email,
          user_metadata: { name: matched.name },
          app_metadata: {}
        };
        localStorage.setItem('dallmayr_logged_user', JSON.stringify(userPayload));
        return { data: { user: userPayload }, error: null };
      }

      return {
        data: { user: null },
        error: new Error(`User role not pre-allocated for ${email}. Please use admin@dallmayr.com, manager@dallmayr.com, tech@dallmayr.com, or warehouse@dallmayr.com`)
      };
    },

    async signOut() {
      if (!isMock && realSupabase) {
        return realSupabase.auth.signOut();
      }
      localStorage.removeItem('dallmayr_logged_user');
      return { error: null };
    },

    // Simulation of registering a user mapping directly to user_roles
    async signUp({ email, password, options }: any) {
      if (!isMock && realSupabase) {
        return realSupabase.auth.signUp({ email, password, options });
      }

      const db = getMockData();
      const exists = db.user_roles.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) return { data: null, error: new Error('User already exists') };

      const newId = `user-${Math.random().toString(36).substr(2, 9)}`;
      const name = options?.data?.name || email.split('@')[0];
      const role = options?.data?.role || 'road_technician';

      const newUser: UserProfile = { id: newId, role, email, name };
      db.user_roles.push(newUser);
      saveMockData(db);

      const userPayload = {
        id: newId,
        email,
        user_metadata: { name }
      };

      return { data: { user: userPayload }, error: null };
    }
  },

  // Storage mock
  storage: {
    from(bucketName: string) {
      if (!isMock && realSupabase) {
        return realSupabase.storage.from(bucketName);
      }
      return {
        async upload(filePath: string, file: Blob) {
          // generate mock object URI of image and keep in standard path
          const reader = new FileReader();
          const p = new Promise<string>((resolve) => {
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
          });
          reader.readAsDataURL(file);
          const dataUrl = await p;
          
          // save loaded photo into a global memory index or mock string
          const savedPhotos = JSON.parse(localStorage.getItem('dallmayr_mock_storage') || '{}');
          savedPhotos[filePath] = dataUrl;
          localStorage.setItem('dallmayr_mock_storage', JSON.stringify(savedPhotos));

          return { data: { path: filePath }, error: null };
        },

        getPublicUrl(filePath: string) {
          if (!isMock && realSupabase) {
            return realSupabase.storage.from(bucketName).getPublicUrl(filePath);
          }
          const savedPhotos = JSON.parse(localStorage.getItem('dallmayr_mock_storage') || '{}');
          const dataUrl = savedPhotos[filePath] || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400';
          return { data: { publicUrl: dataUrl } };
        }
      };
    }
  },

  // Real-time channel listener proxy
  channel(channelName: string) {
    if (!isMock && realSupabase) {
      return realSupabase.channel(channelName);
    }
    return {
      on(eventType: string, filter: any, callback: (payload: any) => void) {
        registerRealtimeCallback(() => {
          // Simply call with dummy event updates 
          const db = getMockData();
          callback({
            new: db.technician_routes,
            table: 'technician_routes',
            eventType: 'UPDATE'
          });
        });
        return this;
      },
      subscribe() {
        return this;
      },
      unsubscribe() {
        return this;
      }
    };
  }
};

// Seeder tool to completely reset mock database to default state
export function resetMockDatabase() {
  localStorage.setItem('dallmayr_mock_db', JSON.stringify(DEFAULTS));
  notifyRealtimeListeners();
}

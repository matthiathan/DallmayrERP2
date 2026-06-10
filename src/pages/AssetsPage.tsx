import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Asset, CustomerBranch } from '../types';
import { 
  Wrench, 
  Search, 
  Plus, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  FileText,
  Building,
  QrCode,
  Coins
} from 'lucide-react';

export default function AssetsPage() {
  const isOnline = useNetworkStatus();
  const { queuePayload } = useOfflineSync();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Search and filter parameters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'retired'>('all');

  // Add Asset modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [newAsset, setNewAsset] = useState({
    qr_code: '',
    serial_number: '',
    name: '',
    category: 'Espresso Machine',
    status: 'active' as Asset['status'],
    branch_id: ''
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initial queries
  const loadData = async () => {
    setLoading(true);
    try {
      // Query assets
      const { data: dbAssets } = await supabase.from('assets').order('name');
      setAssets((dbAssets as Asset[]) || []);

      // Compile branches across regions to link correctly
      let allBranches: CustomerBranch[] = [];
      try {
        const { data: kzn } = await supabase.from('customers_kzn');
        const { data: jhb } = await supabase.from('customers_jhb');
        const { data: cpt } = await supabase.from('customers_cpt');
        
        allBranches = [
          ...(kzn || []),
          ...(jhb || []),
          ...(cpt || [])
        ];
        setBranches(allBranches);
        if (allBranches.length > 0 && !newAsset.branch_id) {
          setNewAsset(prev => ({ ...prev, branch_id: allBranches[0].id }));
        }
      } catch (err) {
        console.error('Regional branch fetch error:', err);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSuccessMsg(null);

    const errors: { [key: string]: string } = {};
    if (!newAsset.qr_code.trim()) errors.qr = 'QR Code identifier is required.';
    if (!newAsset.serial_number.trim()) errors.serial = 'Serial Number is required.';
    if (!newAsset.name.trim()) errors.name = 'Machine Name is required.';
    if (!newAsset.branch_id) errors.branch = 'Please assign to an active branch.';

    // Check unique locally
    const qrExists = assets.some(a => a.qr_code.toUpperCase() === newAsset.qr_code.trim().toUpperCase());
    if (qrExists) {
      errors.qr = 'An active machine already registers this QR code.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const payload: Asset = {
        id: `asset-${Math.random().toString(36).substr(2, 9)}`,
        qr_code: newAsset.qr_code.trim().toUpperCase(),
        serial_number: newAsset.serial_number.trim().toUpperCase(),
        name: newAsset.name.trim(),
        category: newAsset.category,
        status: newAsset.status,
        branch_id: newAsset.branch_id,
        last_serviced_at: new Date().toISOString().split('T')[0]
      };

      const { data, error } = await supabase.from('assets').insert(payload);
      if (error) {
        queuePayload('UPDATE_TASK', 'assets', payload.id, payload); // or use a raw CREATE_ASSET mock if database differs
        setSuccessMsg('Asset queued locally in offline sync cache!');
      } else {
        setSuccessMsg('Machine Asset cataloged and verified successfully!');
      }

      setNewAsset({
        qr_code: '',
        serial_number: '',
        name: '',
        category: 'Espresso Machine',
        status: 'active',
        branch_id: branches[0]?.id || ''
      });
      
      setModalOpen(false);
      loadData();
      
      // Clear toast after 5s
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve branch name helpers
  const getBranchName = (branchId: string) => {
    const found = branches.find(b => b.id === branchId);
    return found ? found.name : 'Central Warehouse / Unknown';
  };

  // Filter list
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.qr_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      case 'maintenance':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      default:
        return 'bg-rose-50 text-rose-800 border-rose-100';
    }
  };

  return (
    <div className="space-y-6" id="assets-management-root">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Regional Coffee Asset Tracking</h2>
          <p className="text-xs text-slate-500">Monitor Dallmayr Promatics and bean-to-cup machine, log technical state cycles, and deploy new hardware.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all sm:self-center"
          id="add-asset-btn"
        >
          <Plus className="h-4 w-4" /> Catalog New Machine
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Query Bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        
        {/* Keyword Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Machine Name, Serial Number or QR tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white transition-colors"
            id="assets-search-input"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 border-l border-slate-100 pl-0 sm:pl-3">
          <Filter className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white cursor-pointer"
            id="assets-status-filter"
          >
            <option value="all">All States</option>
            <option value="active">Active Only</option>
            <option value="maintenance">Under Maintenance</option>
            <option value="retired">Retired/Out-of-Service</option>
          </select>
        </div>

      </div>

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-52 bg-white border border-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-150 p-6 flex flex-col items-center justify-center">
          <Wrench className="h-10 w-10 text-slate-300 mb-3" />
          <p className="font-bold text-slate-700 text-sm">No machine assets found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">Try tweaking your filters or registering a new Dallmayr coffee machine asset.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="assets-cards-grid">
          {filteredAssets.map(asset => (
            <div 
              key={asset.id} 
              className="bg-white border border-slate-100 hover:border-slate-205 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              id={`asset-card-${asset.id}`}
            >
              
              <div className="space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${getStatusBadge(asset.status)}`}>
                    {asset.status}
                  </span>
                  <span className="font-mono text-slate-400 text-[10px] uppercase font-bold tracking-wider">S/N: {asset.serial_number}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm pt-2 line-clamp-1">{asset.name}</h4>
                <p className="text-[10px] text-slate-400 font-medium">Category: {asset.category} | Serviced: {asset.last_serviced_at}</p>
              </div>

              {/* Branch link details */}
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1 text-xs">
                <p className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" /> Active Placement Branch
                </p>
                <p className="font-bold text-slate-700 truncate">{getBranchName(asset.branch_id)}</p>
              </div>

              {/* Footer qr tracking key */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium lowercase">
                  <QrCode className="h-3.5 w-3.5 text-slate-400 shrink-0" /> validation qr:
                </span>
                <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-indigo-700 uppercase">
                  {asset.qr_code}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Register Asset Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" id="add-asset-modal">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-mono text-[9px] font-bold uppercase tracking-wider block mb-1">
                  Hardware Directory
                </span>
                <h3 className="font-bold text-slate-800 text-sm">Catalog Machine Asset</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-650 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-5 space-y-4 text-xs">
              
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                  Machine Model Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dallmayr Promatic Super-Twin"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-xs"
                />
                {formErrors.name && <p className="text-[10px] text-rose-600 font-semibold pl-1 mt-1">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                    Serial Number (SN) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SN-DL-77301"
                    value={newAsset.serial_number}
                    onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-xs font-mono uppercase"
                  />
                  {formErrors.serial && <p className="text-[10px] text-rose-600 font-semibold pl-1 mt-1">{formErrors.serial}</p>}
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                    QR Tag Identifier *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DL-006"
                    value={newAsset.qr_code}
                    onChange={(e) => setNewAsset({ ...newAsset, qr_code: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-xs font-mono uppercase"
                  />
                  {formErrors.qr && <p className="text-[10px] text-rose-600 font-semibold pl-1 mt-1">{formErrors.qr}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                    Category Tag
                  </label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer text-xs"
                  >
                    <option value="Espresso Machine">Espresso Machine</option>
                    <option value="Bean to Cup">Bean to Cup</option>
                    <option value="Twin Brewer">Twin Brewer</option>
                    <option value="Vending machine">Vending machine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                    Initial state status
                  </label>
                  <select
                    value={newAsset.status}
                    onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer text-xs"
                  >
                    <option value="active">Active On-Site</option>
                    <option value="maintenance">Maintenance Core</option>
                    <option value="retired">Retired/Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                  Assign to client branch *
                </label>
                <select
                  value={newAsset.branch_id}
                  onChange={(e) => setNewAsset({ ...newAsset, branch_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer text-xs"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.region.toUpperCase()})</option>
                  ))}
                </select>
                {formErrors.branch && <p className="text-[10px] text-rose-600 font-semibold pl-1 mt-1">{formErrors.branch}</p>}
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-2xl text-[10px] text-indigo-800 leading-relaxed">
                <strong>Attention:</strong> Registering assets when offline queues them into your local sync database. They compile onto today's technician timeline dynamically upon server synchronization.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3.5">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-500 font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Save Machine Asset
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

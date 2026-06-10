import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Cpu, 
  QrCode, 
  Tag, 
  Calendar, 
  Navigation, 
  Move, 
  History, 
  Wrench, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  User,
  Clock
} from 'lucide-react';
import { Asset, Location, AssetMovement } from '../types';

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [movements, setMovements] = useState<AssetMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Asset movement modal
  const [movementModalOpen, setMovementModalOpen] = useState<boolean>(false);
  const [toLocationId, setToLocationId] = useState<string>('');
  const [movementNotes, setMovementNotes] = useState<string>('');

  const loadAssetDetails = async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch asset
      const { data: assetData, error: assetErr } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();
      
      if (assetErr || !assetData) {
        throw new Error('Machine asset could not be located in directory database.');
      }
      setAsset(assetData as Asset);

      // 2. Fetch locations for the mover
      const { data: locData } = await supabase.from('locations').select('*');
      const loadedLocs = (locData as Location[]) || [];
      setLocations(loadedLocs);
      if (loadedLocs.length > 0) {
        // Find one different from current
        const currentLocId = assetData.location_id || assetData.branch_id;
        const defaultTo = loadedLocs.find(l => l.id !== currentLocId) || loadedLocs[0];
        setToLocationId(defaultTo?.id || '');
      }

      // 3. Fetch movements history
      const { data: movesData } = await supabase
        .from('asset_movements')
        .select('*')
        .eq('asset_id', id)
        .order('moved_at', { ascending: false });
      setMovements((movesData as AssetMovement[]) || []);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error pulling machine logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssetDetails();
  }, [id]);

  const handleAssetMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !toLocationId) return;

    setActionLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const fromLocId = asset.location_id || asset.branch_id || 'unknown-warehouse';

    try {
      const movementPayload = {
        id: `move-${Math.random().toString(36).substr(2, 9)}`,
        asset_id: asset.id,
        from_location_id: fromLocId,
        to_location_id: toLocationId,
        moved_by: profile?.name || profile?.email || 'Authorized Operator',
        moved_at: new Date().toISOString(),
        notes: movementNotes.trim()
      };

      // 1. Log the movement
      const { error: moveErr } = await supabase
        .from('asset_movements')
        .insert(movementPayload);

      if (moveErr) throw moveErr;

      // 2. Update the asset location properties (both location_id & branch_id for seamless layout compatibility)
      const { error: updateErr } = await supabase
        .from('assets')
        .update({ 
          location_id: toLocationId,
          branch_id: toLocationId // keeps branch fallback operational
        })
        .eq('id', asset.id);

      if (updateErr) throw updateErr;

      setSuccessMsg('Asset routing location updated and movement logs compiled successfully!');
      setMovementNotes('');
      setMovementModalOpen(false);
      
      // Reload assets
      await loadAssetDetails();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Deployment error writing to location database.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: Asset['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-800 border-emerald-250';
      case 'maintenance':
        return 'bg-amber-50 text-amber-800 border-amber-250';
      default:
        return 'bg-rose-50 text-rose-800 border-rose-250';
    }
  };

  const resolveLocationName = (locId?: string) => {
    if (!locId) return 'Central Spares Warehouse (Fallback)';
    const found = locations.find(l => l.id === locId);
    return found ? found.name : locId;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-20">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Compiling machine configuration spec...</p>
      </div>
    );
  }

  if (errorMsg && !asset) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Link to="/assets" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold mb-4">
          <ArrowLeft className="h-4 w-4" /> Go back
        </Link>
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-center">
          <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-sm">{errorMsg}</h4>
          <p className="text-xs text-slate-400 mt-2">Please make sure the assets table has valid data records.</p>
        </div>
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6" id="asset-detail-container">
      
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to="/assets" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold">
          <ArrowLeft className="h-4 w-4" /> Return to Assets Directory
        </Link>

        {/* Action Button: Trigger Movement modal */}
        <button
          type="button"
          onClick={() => setMovementModalOpen(true)}
          className="px-4 py-2 bg-slate-900 text-amber-500 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
          id="btn-move-asset"
        >
          <Move className="h-4 w-4" /> Relocate Machine
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2 font-semibold animate-fade-in">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Asset Spec Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Visual machine identifier */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between items-center text-center space-y-6 md:col-span-1">
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 w-full flex items-center justify-center">
            <Cpu className="h-16 w-16 text-slate-400" />
          </div>
          <div className="w-full space-y-2">
            <span className={`px-2.5 py-0.5 rounded-full inline-block text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(asset.status)}`}>
              {asset.status}
            </span>
            <h3 className="font-bold text-slate-900 text-base leading-snug">{asset.name}</h3>
            <span className="text-[10px] text-slate-400 font-medium block">Category: {asset.category}</span>
          </div>

          <div className="w-full pt-4 border-t border-slate-100 space-y-2 text-left">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400 font-medium font-sans">Serial Number:</span>
              <span className="font-mono text-slate-800 font-bold uppercase">{asset.serial_number}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400 font-medium font-sans">QR Validation:</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-indigo-700 uppercase">{asset.qr_code}</span>
            </div>
          </div>
        </div>

        {/* Technical parameters */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 md:col-span-2">
          <h3 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider">Operational Parameters & Placement</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Current Placement Location</span>
              <p className="font-bold text-slate-800 text-sm">{resolveLocationName(asset.location_id || asset.branch_id)}</p>
              <p className="text-[10px] text-slate-400 mt-1">Status: Active location sync profile</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Last Inspection Cycle</span>
              <p className="font-bold text-slate-800 text-sm">{asset.last_serviced_at || 'Never inspected'}</p>
              <p className="text-[10px] text-slate-400 mt-1">Recalibrated on route sequence</p>
            </div>

          </div>

          <div className="p-5 border border-amber-100 bg-amber-50/20 rounded-2xl space-y-1">
            <h4 className="font-bold text-xs text-amber-800 flex items-center gap-1">
              <Wrench className="h-4 w-4 text-amber-600" /> Promatics Configuration Protocol
            </h4>
            <p className="text-xs text-amber-700 leading-relaxed pl-5">
              This terminal is configured to fetch directly from Supabase. Any technician task completed (e.g., within the daily route compilation itinerary) updates the inspection timeline dynamically without mock data helpers.
            </p>
          </div>

        </div>

      </div>

      {/* Placement Movement Logs History */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden" id="asset-movement-history-log">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <History className="h-4 w-4 text-slate-400" /> Warehouse & Placement Move Logs
          </h3>
          <span className="text-slate-400 text-[10px]">{movements.length} logged relocations</span>
        </div>

        {movements.length === 0 ? (
          <div className="p-10 text-center font-sans text-slate-400">
            <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium">No prior asset moves discovered for this active machine</p>
            <p className="text-[10px] text-slate-400 mt-1">Deploy this machine to a new terminal to initialize movement records.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {movements.map((move, index) => (
              <div key={move.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">{resolveLocationName(move.from_location_id)}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-indigo-700">{resolveLocationName(move.to_location_id)}</span>
                  </div>
                  {move.notes && (
                    <p className="text-slate-500 italic text-[11px] pl-2 border-l-2 border-slate-100">" {move.notes} "</p>
                  )}
                </div>

                <div className="text-left sm:text-right text-[10px] text-slate-400 font-medium font-sans">
                  <p className="flex items-center gap-1 sm:justify-end">
                    <User className="h-3 w-3 text-slate-400" /> Moved by: {move.moved_by}
                  </p>
                  <p className="flex items-center gap-1 sm:justify-end mt-0.5">
                    <Clock className="h-3 w-3 text-slate-400" /> {new Date(move.moved_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Relocate Asset Movement Modal Dialog */}
      {movementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" id="movement-asset-modal">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-mono text-[9px] font-bold uppercase tracking-wider block mb-1">
                  Logistics Protocol
                </span>
                <h3 className="font-bold text-slate-800 text-sm">Relocate Machine Asset</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setMovementModalOpen(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-650 cursor-pointer"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleAssetMoveSubmit} className="p-5 space-y-4 text-xs font-sans">
              
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                  Machine Model
                </label>
                <input
                  type="text"
                  disabled
                  value={`${asset.name} (S/N: ${asset.serial_number})`}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-xs text-slate-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                  From Location (Source)
                </label>
                <input
                  type="text"
                  disabled
                  value={resolveLocationName(asset.location_id || asset.branch_id)}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-xs text-slate-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                  To Target Location *
                </label>
                <select
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer text-xs"
                  required
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                  {locations.length === 0 && (
                    <option value="">No targets configured on Supabase</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                  Movement Notes / Transfer Reason
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Swapped under routing campaign for quarterly gasket replacement..."
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3.5">
                <button 
                  type="button" 
                  onClick={() => setMovementModalOpen(false)} 
                  className="px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-500 font-semibold cursor-pointer"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-slate-900 text-amber-500 font-bold hover:bg-slate-800 rounded-xl shadow-md cursor-pointer transition-colors"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deploying relocations...' : 'Execute Relocation'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

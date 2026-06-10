import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { CustomerBranch, Asset, UserProfile, RouteStop, Task } from '../types';
import { 
  Search, 
  MapPin, 
  Wrench, 
  UserPlus, 
  ListPlus, 
  ArrowRight, 
  Trash2, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Save, 
  CheckCircle, 
  AlertCircle,
  QrCode,
  CalendarCheck
} from 'lucide-react';

export default function AdminRoutingPage() {
  const isOnline = useNetworkStatus();
  const { queuePayload } = useOfflineSync();

  // Selected region
  const [region, setRegion] = useState<'kzn' | 'jhb' | 'cpt'>('jhb');
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [searchBranchQuery, setSearchBranchQuery] = useState<string>('');
  
  // Asset lookup
  const [searchAssetQuery, setSearchAssetQuery] = useState<string>('');
  const [matchedAsset, setMatchedAsset] = useState<Asset | null>(null);
  const [assetLookupError, setAssetLookupError] = useState<string | null>(null);

  // Lists
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [routeDate, setRouteDate] = useState<string>(new Date().toLocaleDateString('en-CA')); // Bug prevention standard

  // Compiled Route Stops builder
  const [compiledStops, setCompiledStops] = useState<RouteStop[]>([]);
  const [dispatchTasks, setDispatchTasks] = useState<{ [stopId: string]: { title: string; desc: string; assetQr: string } }>({});

  // Feedback states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    async function initData() {
      try {
        // Query correct regional branches
        const tableName = `customers_${region}`;
        const { data: dbBranches } = await supabase.from(tableName);
        setBranches(dbBranches || []);

        // Load Road Technicians only
        const { data: dbUsers } = await supabase.from('user_roles');
        if (dbUsers) {
          const techs = dbUsers.filter((u: any) => u.role === 'road_technician');
          setTechnicians(techs as UserProfile[]);
          if (techs.length > 0 && !selectedTechId) {
            setSelectedTechId(techs[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading route setup data:', err);
      }
    }

    initData();
  }, [region, selectedTechId]);

  // Handle asset validation lookup
  const handleAssetLookup = async () => {
    if (!searchAssetQuery.trim()) return;
    setAssetLookupError(null);
    setMatchedAsset(null);

    try {
      const { data, error } = await supabase
        .from('assets')
        .eq('qr_code', searchAssetQuery.trim());
      
      if (data && data.length > 0) {
        setMatchedAsset(data[0] as Asset);
      } else {
        // Try serial number fallback
        const { data: bySerial } = await supabase
          .from('assets')
          .eq('serial_number', searchAssetQuery.trim());
        
        if (bySerial && bySerial.length > 0) {
          setMatchedAsset(bySerial[0] as Asset);
        } else {
          setAssetLookupError('No asset matched that QR code or Serial Number. Please double check.');
        }
      }
    } catch (e) {
      setAssetLookupError('System error validating asset.');
    }
  };

  // Add a branch to the itinerary
  const addStopToItinerary = (branch: CustomerBranch) => {
    const newStopId = `stop-${Math.random().toString(36).substr(2, 9)}`;
    const stopOrder = compiledStops.length + 1;

    const stopItem: RouteStop = {
      id: newStopId,
      order: stopOrder,
      customer_name: branch.name,
      address: branch.address,
      latitude: branch.latitude,
      longitude: branch.longitude,
      task_id: `task-${Math.random().toString(36).substr(2, 9)}`, // auto generator task id
      status: 'pending'
    };

    setCompiledStops([...compiledStops, stopItem]);
    
    // Setup blank task forms linked to this stop
    setDispatchTasks(prev => ({
      ...prev,
      [stopItem.id]: {
        title: `Service call at ${branch.name}`,
        desc: `Perform Dallmayr preventive maintenance procedure on active coffee assets.`,
        assetQr: matchedAsset?.qr_code || ''
      }
    }));
  };

  const removeStop = (id: string) => {
    const updated = compiledStops.filter(s => s.id !== id).map((s, idx) => ({
      ...s,
      order: idx + 1
    }));
    setCompiledStops(updated);
    
    const copyTasks = { ...dispatchTasks };
    delete copyTasks[id];
    setDispatchTasks(copyTasks);
  };

  // Up and down ordering sequence
  const moveStopOrder = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === compiledStops.length - 1) return;

    const nextIdx = direction === 'up' ? index - 1 : index + 1;
    const items = [...compiledStops];
    
    // Swap
    const temp = items[index];
    items[index] = items[nextIdx];
    items[nextIdx] = temp;

    // Correct ordering indices
    const updated = items.map((item, idx) => ({ ...item, order: idx + 1 }));
    setCompiledStops(updated);
  };

  // Final Dispatch compiling
  const handleSaveRoute = async () => {
    if (!selectedTechId) {
      showNotice('error', 'Operational assignment requires an active Road Technician.');
      return;
    }
    if (compiledStops.length === 0) {
      showNotice('error', 'Please compile at least one client stop.');
      return;
    }

    setSubmitting(true);
    setNotification(null);

    try {
      // 1. Create linked task records
      for (const stop of compiledStops) {
        const taskDetails = dispatchTasks[stop.id];
        const taskObject: Task = {
          id: stop.task_id,
          title: taskDetails.title,
          description: taskDetails.desc,
          status: 'pending',
          assigned_to: selectedTechId,
          collaborators: [],
          qr_code: taskDetails.assetQr || 'DL-GENERIC',
          created_at: new Date().toISOString()
        };

        // Attempt live write
        const { error: taskErr } = await supabase.from('tasks').insert(taskObject);
        if (taskErr) {
          // If network error occurred, write to standard offline sync queue automatically
          queuePayload('CREATE_TASK', 'tasks', taskObject.id, taskObject);
        }
      }

      // 2. Compile technician route
      const newRouteId = `route-${Math.random().toString(36).substr(2, 9)}`;
      const routePayload = {
        id: newRouteId,
        technician_id: selectedTechId,
        date: routeDate,
        stops: compiledStops
      };

      const { error: routeErr } = await supabase.from('technician_routes').insert(routePayload);
      if (routeErr) {
        // Queue route insertion offline
        queuePayload('UPDATE_ROUTE', 'technician_routes', newRouteId, routePayload);
        showNotice('success', 'Route queued offline! Job structures safely recorded in local sync cache.');
      } else {
        showNotice('success', 'Dispatcher Route finalized successfully! Dispatched to Technician Timeline.');
      }

      // Clear builder
      setCompiledStops([]);
      setDispatchTasks({});
      setMatchedAsset(null);
      setSearchAssetQuery('');
    } catch (err) {
      showNotice('error', 'General dispatch compiling failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const showNotice = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchBranchQuery.toLowerCase()) ||
    b.address.toLowerCase().includes(searchBranchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="logistics-dispatcher-root">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Logistics Dispatch & Route Compiler</h2>
          <p className="text-xs text-slate-500">Search branches, specify asset telemetries, and sequence technician stops.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 bg-white border border-slate-100 p-2 rounded-xl">
          <CalendarCheck className="h-4 w-4 text-amber-600" />
          <span>Active Context Date:</span>
          <input 
            type="date"
            value={routeDate}
            onChange={(e) => setRouteDate(e.target.value)}
            className="outline-none bg-slate-50 border border-slate-200 px-2 py-1 rounded"
            title="Local YYYY-MM-DD preventing timezone mismatches"
            id="dispatcher-date-selector"
          />
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-slide-up ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`} id="dispatcher-notification">
          {notification.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <span className="text-xs font-semibold">{notification.msg}</span>
        </div>
      )}

      {/* Compiler Hub Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="dispatcher-hub-grid">
        
        {/* LEFT COLUMN: Schedule Builder & Directory search (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* Step 1: Asset qr diagnostic validator */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <QrCode className="h-4 w-4 text-amber-600" /> Core Asset lookup (Optional)
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scan QR or code (e.g. DL-001 or SN-DL-98402)..."
                  value={searchAssetQuery}
                  onChange={(e) => setSearchAssetQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAssetLookup()}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  id="asset-scan-look"
                />
              </div>
              <button
                type="button"
                onClick={handleAssetLookup}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                id="asset-validate-btn"
              >
                Validate ID
              </button>
            </div>

            {assetLookupError && (
              <p className="text-[10px] text-rose-600 font-semibold pl-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {assetLookupError}
              </p>
            )}

            {matchedAsset && (
              <div className="p-4 rounded-2xl border border-amber-100 bg-amber-500/5 flex items-center justify-between text-xs animate-slide-up">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-amber-700 block">Validated Coffee Asset matched</span>
                  <p className="font-bold text-slate-800">{matchedAsset.name}</p>
                  <p className="text-[10px] text-slate-500">Category: {matchedAsset.category} | S/N: {matchedAsset.serial_number}</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-mono text-[10px] rounded-lg font-bold">
                  QR: {matchedAsset.qr_code}
                </span>
              </div>
            )}
          </div>

          {/* Step 2: Customer Directory Queries */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                Client Branch Lookup Directory
              </h3>
              
              {/* Region selection */}
              <div className="flex p-0.5 bg-slate-100 rounded-xl" id="region-pill-box">
                {(['jhb', 'kzn', 'cpt'] as const).map(reg => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setRegion(reg)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      region === reg ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {reg} Region
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Search client branches catalog in ${region.toUpperCase()} region...`}
                value={searchBranchQuery}
                onChange={(e) => setSearchBranchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white transition-all"
                id="branch-search-query"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1" id="branches-list-scroller">
              {filteredBranches.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No customer outlets found. Try clearing keywords.</div>
              ) : (
                filteredBranches.map(branch => {
                  const alreadyAdded = compiledStops.some(s => s.customer_name === branch.name);
                  return (
                    <div 
                      key={branch.id} 
                      className={`p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                        alreadyAdded ? 'bg-indigo-50/20 opacity-75' : 'bg-slate-50/40 hover:bg-slate-50'
                      }`}
                      id={`branch-item-${branch.id}`}
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-amber-500" /> {branch.name}
                        </p>
                        <p className="text-[10px] text-slate-500 pl-5">{branch.address}</p>
                        <p className="text-[10px] text-slate-400 font-mono pl-5">Coord: {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)} | {branch.contact_number}</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => addStopToItinerary(branch)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 cursor-pointer transition-all ${
                          alreadyAdded 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-amber-600 text-slate-950 font-bold hover:bg-amber-500'
                        }`}
                        disabled={alreadyAdded}
                      >
                        <Plus className="h-3 w-3" /> Route Stop
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Itinerary Order Compiler (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-5 flex flex-col min-h-[500px]">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">
                Itinerary Route Output Order
              </h3>
              <p className="text-[10px] text-slate-400 pl-1">Choose an operating tech and position sequence stops sequence.</p>
            </div>

            {/* Step A: Tech mapping */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5 pl-1">
                Assign technician
              </label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white font-semibold"
                id="assign-tech"
              >
                {technicians.length === 0 ? (
                  <option value="">No active technicians logged</option>
                ) : (
                  technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                  ))
                )}
              </select>
            </div>

            {/* Sequence block list */}
            <div className="flex-1 space-y-4" id="itinerary-stops-builder">
              {compiledStops.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center my-6">
                  <ListPlus className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-slate-500 font-medium text-xs">Itinerary compiler empty</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1">Select are outlets from the directory left to build an operational order timeline.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {compiledStops.map((stop, index) => {
                    const task = dispatchTasks[stop.id] || { title: '', desc: '', assetQr: '' };
                    return (
                      <div 
                        key={stop.id} 
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 relative group animate-slide-up"
                        id={`itinerary-stop-${stop.id}`}
                      >
                        {/* Header sequence bar */}
                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                          <div className="flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-slate-800 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                              {stop.order}
                            </span>
                            <span className="font-bold text-slate-700">{stop.customer_name}</span>
                          </div>
                          
                          {/* Arrange sequences button sets */}
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveStopOrder(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                              title="Move Stop Up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStopOrder(index, 'down')}
                              disabled={index === compiledStops.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                              title="Move Stop Down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStop(stop.id)}
                              className="p-1 text-slate-450 hover:text-rose-600 rounded cursor-pointer"
                              title="Remove Stop"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Linked form input parameters for job creation */}
                        <div className="space-y-2 text-xs">
                          <div>
                            <input
                              type="text"
                              placeholder="Job Assignment Title..."
                              value={task.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDispatchTasks(prev => {
                                  const copy = { ...prev };
                                  copy[stop.id] = { ...copy[stop.id], title: val };
                                  return copy;
                                });
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none"
                              required
                            />
                          </div>

                          <div>
                            <textarea
                              placeholder="Operational dispatch logs/instructions..."
                              value={task.desc}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDispatchTasks(prev => {
                                  const copy = { ...prev };
                                  copy[stop.id] = { ...copy[stop.id], desc: val };
                                  return copy;
                                });
                              }}
                              rows={2}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] outline-none resize-none leading-relaxed"
                            />
                          </div>

                          {/* Quick machine asset code identifier */}
                          <div>
                            <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Asset Machine Attachment</label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder="QR Serial (e.g. DL-001)..."
                                value={task.assetQr}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDispatchTasks(prev => {
                                    const copy = { ...prev };
                                    copy[stop.id] = { ...copy[stop.id], assetQr: val };
                                    return copy;
                                  });
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-mono w-full"
                              />
                              {matchedAsset && task.assetQr === matchedAsset.qr_code && (
                                <span className="px-1.5 py-1 bg-amber-500/10 text-amber-700 text-[8px] font-bold rounded flex items-center shrink-0 uppercase tracking-widest">
                                  Linked
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Panel submitters */}
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleSaveRoute}
                disabled={compiledStops.length === 0 || submitting}
                className="w-full py-3 bg-slate-900 border border-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-slate-800 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer transition-all"
                id="submit-route-dispatch-btn"
              >
                <Save className="h-4 w-4" />
                {submitting ? 'Dispatching schedules...' : 'Finalize Dispatch Itinerary'}
              </button>
            </div>
            
          </div>

        </div>

      </div>

    </div>
  );
}

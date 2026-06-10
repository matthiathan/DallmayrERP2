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
  CalendarCheck,
  Calendar,
  User,
  Clock,
  PlusCircle,
  X,
  FileText,
  Activity
} from 'lucide-react';

export default function AdminRoutingPage() {
  const isOnline = useNetworkStatus();
  const { queuePayload } = useOfflineSync();

  // Active Tab for high density layout segments
  const [activeTab, setActiveTab] = useState<'tickets' | 'schedules' | 'compiler'>('tickets');

  // Selected region for branch search
  const [region, setRegion] = useState<'kzn' | 'jhb' | 'cpt'>('jhb');
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [searchBranchQuery, setSearchBranchQuery] = useState<string>('');
  
  // Asset lookup in compiler
  const [searchAssetQuery, setSearchAssetQuery] = useState<string>('');
  const [matchedAsset, setMatchedAsset] = useState<Asset | null>(null);
  const [assetLookupError, setAssetLookupError] = useState<string | null>(null);

  // Users lists
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [routeDate, setRouteDate] = useState<string>(new Date().toLocaleDateString('en-CA')); // Strict local YYYY-MM-DD

  // Pools states
  const [tickets, setTickets] = useState<any[]>([]);
  const [scheduledCalls, setScheduledCalls] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Ticket creation form state
  const [selectedBranchForTicket, setSelectedBranchForTicket] = useState<CustomerBranch | null>(null);
  const [ticketIssue, setTicketIssue] = useState<string>('');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [creatingTicket, setCreatingTicket] = useState<boolean>(false);

  // Call scheduling state
  const [ticketToSchedule, setTicketToSchedule] = useState<any | null>(null);
  const [scheduleNotes, setScheduleNotes] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [scheduleAssignee, setScheduleAssignee] = useState<string>('');
  const [schedulingCall, setSchedulingCall] = useState<boolean>(false);

  // Compiled Route Stops builder state
  const [compiledStops, setCompiledStops] = useState<RouteStop[]>([]);
  const [dispatchTasks, setDispatchTasks] = useState<{ [stopId: string]: { title: string; desc: string; assetQr: string } }>({});

  // Feedback states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Load all pools and regional customer directory
  const fetchAllData = async () => {
    setLoadingData(true);
    try {
      // 1. Fetch tickets table
      const { data: dbTickets } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      setTickets(dbTickets || []);

      // 2. Fetch scheduled calls
      const { data: dbCalls } = await supabase
        .from('scheduled_call_logs')
        .select('*')
        .order('created_at', { ascending: false });
      setScheduledCalls(dbCalls || []);

    } catch (err) {
      console.error('Error synchronizing admin logistical telemetry:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Load Road Technicians on mount
  useEffect(() => {
    async function loadTechnicians() {
      try {
        const { data: techs, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('role', 'road_technician');
        if (error) throw error;
        if (techs) {
          setTechnicians(techs as UserProfile[]);
          if (techs.length > 0 && !selectedTechId) {
            setSelectedTechId(techs[0].id);
            setScheduleAssignee(techs[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading technicians:', err);
      }
    }
    loadTechnicians();
  }, []);

  // Fetch regional branches reactively with live fuzzy search via ilike
  useEffect(() => {
    async function fetchBranches() {
      try {
        const tableName = `customers_${region}`;
        let query = supabase.from(tableName).select('*');
        
        if (searchBranchQuery.trim()) {
          const searchPattern = `%${searchBranchQuery.trim()}%`;
          query = query.or(`name.ilike.${searchPattern},address.ilike.${searchPattern}`);
        }
        
        const { data: dbBranches, error } = await query.limit(100);
        if (error) throw error;
        setBranches(dbBranches || []);
      } catch (err) {
        console.error('Error loading regional branches:', err);
      }
    }

    const handler = setTimeout(() => {
      fetchBranches();
    }, 250);

    return () => clearTimeout(handler);
  }, [region, searchBranchQuery]);

  useEffect(() => {
    fetchAllData();
  }, [routeDate, region]);

  useEffect(() => {
    fetchAllData();
  }, [routeDate]);

  // Asset validation lookup helper
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
          setAssetLookupError('No coffee machine asset matched that QR code or Serial Number.');
        }
      }
    } catch (e) {
      setAssetLookupError('System error validating asset info.');
    }
  };

  // Create service ticket
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchForTicket) return;

    setCreatingTicket(true);
    setNotification(null);

    const ticketPayload = {
      id: `t-${Math.random().toString(36).substr(2, 9)}`,
      customer_id: selectedBranchForTicket.id,
      customer_name: selectedBranchForTicket.name,
      address: selectedBranchForTicket.address,
      region: selectedBranchForTicket.region || region,
      issue_description: ticketIssue.trim(),
      status: 'open',
      priority: ticketPriority,
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('tickets').insert(ticketPayload);
      if (error) throw error;

      showNotice('success', `Live ticket generated for ${selectedBranchForTicket.name}!`);
      
      // Clear forms and refresh
      setTicketIssue('');
      setSelectedBranchForTicket(null);
      await fetchAllData();
    } catch (err: any) {
      console.error(err);
      showNotice('error', `Error inserting ticket: ${err.message}`);
    } finally {
      setCreatingTicket(false);
    }
  };

  // Schedule Open Ticket as Call Log
  const handleScheduleCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToSchedule) return;

    setSchedulingCall(true);
    setNotification(null);

    const callPayload = {
      id: `sc-${Math.random().toString(36).substr(2, 9)}`,
      ticket_id: ticketToSchedule.id,
      customer_id: ticketToSchedule.customer_id,
      customer_name: ticketToSchedule.customer_name,
      address: ticketToSchedule.address,
      region: ticketToSchedule.region || region,
      scheduled_date: scheduledDate, // YYYY-MM-DD
      notes: scheduleNotes.trim() || `Urgent dispatch: ${ticketToSchedule.issue_description}`,
      assigned_to: scheduleAssignee || selectedTechId,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    try {
      // 1. Insert call log record
      const { error: insertErr } = await supabase
        .from('scheduled_call_logs')
        .insert(callPayload);
      if (insertErr) throw insertErr;

      // 2. Complete status transition on main ticket pool
      const { error: updateErr } = await supabase
        .from('tickets')
        .update({ status: 'scheduled' })
        .eq('id', ticketToSchedule.id);
      if (updateErr) throw updateErr;

      showNotice('success', `Call sequence logged for ${ticketToSchedule.customer_name} on ${scheduledDate}!`);
      setTicketToSchedule(null);
      setScheduleNotes('');
      
      await fetchAllData();
    } catch (err: any) {
      console.error(err);
      showNotice('error', `Error writing scheduled call data: ${err.message}`);
    } finally {
      setSchedulingCall(false);
    }
  };

  // Quick draft direct customer stop into compiler
  const addDirectStopToCompiler = (branch: CustomerBranch) => {
    const newStopId = `stop-${Math.random().toString(36).substr(2, 9)}`;
    const stopOrder = compiledStops.length + 1;

    const stopItem: RouteStop = {
      id: newStopId,
      order: stopOrder,
      customer_name: branch.name,
      address: branch.address,
      latitude: branch.latitude,
      longitude: branch.longitude,
      task_id: `task-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending'
    };

    setCompiledStops([...compiledStops, stopItem]);
    
    setDispatchTasks(prev => ({
      ...prev,
      [stopItem.id]: {
        title: `Service call at ${branch.name}`,
        desc: `Perform Dallmayr preventive maintenance on active espresso systems.`,
        assetQr: matchedAsset?.qr_code || ''
      }
    }));
  };

  // Draft Scheduled Call item into routing compiler
  const draftScheduledCallIntoRoute = (call: any) => {
    const alreadyExists = compiledStops.some(s => s.customer_name === call.customer_name);
    if (alreadyExists) {
      showNotice('error', 'This customer outlet stop has already been added to the compiler timeline.');
      return;
    }

    const newStopId = `stop-${Math.random().toString(36).substr(2, 9)}`;
    const stopOrder = compiledStops.length + 1;

    // Resolve matched customer coordinates if available from default list, else fallback
    const matchedCoords = branches.find(b => b.id === call.customer_id);
    const stopItem: RouteStop = {
      id: newStopId,
      order: stopOrder,
      customer_name: call.customer_name,
      address: call.address,
      latitude: matchedCoords?.latitude || -26.1032,
      longitude: matchedCoords?.longitude || 28.0561,
      task_id: `task-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending'
    };

    setCompiledStops([...compiledStops, stopItem]);
    
    setDispatchTasks(prev => ({
      ...prev,
      [stopItem.id]: {
        title: `Service Call: ${call.notes || 'Espresso system error resolution'}`,
        desc: `Resolve ticket: ${call.notes || 'Routine preventative check.'}`,
        assetQr: ''
      }
    }));
    
    showNotice('success', `Drafted ${call.customer_name} into routing itinerary!`);
  };

  // Move stops order sequence
  const moveStopOrder = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === compiledStops.length - 1) return;

    const nextIdx = direction === 'up' ? index - 1 : index + 1;
    const items = [...compiledStops];
    
    const temp = items[index];
    items[index] = items[nextIdx];
    items[nextIdx] = temp;

    const updated = items.map((item, idx) => ({ ...item, order: idx + 1 }));
    setCompiledStops(updated);
  };

  // Remove stop from current draft compiler
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

  // Save compiled sequence to Supabase
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
      // 1. Create linked tasks in table
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

        const { error: taskErr } = await supabase.from('tasks').insert(taskObject);
        if (taskErr) {
          queuePayload('CREATE_TASK', 'tasks', taskObject.id, taskObject);
        }
      }

      // 2. Query if active route already compiled for this tech + date to avoid duplicate profiles
      const { data: existingRoutes } = await supabase
        .from('technician_routes')
        .select('*')
        .eq('technician_id', selectedTechId)
        .eq('route_date', routeDate);

      let existingRoute = existingRoutes && existingRoutes.length > 0 ? existingRoutes[0] : null;
      if (!existingRoute && existingRoutes) {
        // Fallback checks for 'date' field
        const { data: fbRoutes } = await supabase
          .from('technician_routes')
          .select('*')
          .eq('technician_id', selectedTechId)
          .eq('date', routeDate);
        if (fbRoutes && fbRoutes.length > 0) {
          existingRoute = fbRoutes[0];
        }
      }

      const routeId = existingRoute ? existingRoute.id : `route-${Math.random().toString(36).substr(2, 9)}`;
      const routePayload = {
        id: routeId,
        technician_id: selectedTechId,
        route_date: routeDate,
        date: routeDate, // Backwards compatible columns helper
        optimized_sequence: compiledStops, // Physical table JSONB row
        stops: compiledStops // Backwards compatible stops array
      };

      // Live Route Saving: UPSERT into public.technician_routes
      const { error: upsertErr } = await supabase
        .from('technician_routes')
        .upsert(routePayload, { onConflict: 'id' });

      if (upsertErr) {
        queuePayload('UPDATE_ROUTE', 'technician_routes', routeId, routePayload);
        showNotice('success', 'Offline dispatch queue activated: Route compiling cached safely in framework!');
      } else {
        showNotice('success', 'Technician Dispatch Itinerary compiled & upserted successfully!');
      }

      // Reset sequence draft
      setCompiledStops([]);
      setDispatchTasks({});
      setMatchedAsset(null);
      setSearchAssetQuery('');
    } catch (err) {
      console.error(err);
      showNotice('error', 'Error writing logistics dispatch route to Supabase.');
    } finally {
      setSubmitting(false);
    }
  };

  // Flash UI notification
  const showNotice = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 6000);
  };

  const filteredBranches = branches;

  const resolveTechName = (techId?: string) => {
    if (!techId) return 'Unassigned';
    const found = technicians.find(t => t.id === techId);
    return found ? found.name : techId;
  };

  // Helper date formatter
  const formatDatePretty = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6" id="logistics-router-workspace">
      
      {/* Dynamic Header Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
        <div>
          <span className="text-[10px] text-amber-600 font-mono font-bold tracking-widest uppercase block mb-1">
            Dispatch Terminal Control
          </span>
          <h2 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
            Logistics Dispatch & Route Compiler
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Log service tickets, schedule customer calls, and compile sequenced daily routes live to Supabase.
          </p>
        </div>

        {/* Global Date Selection (Strict context) */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-2xl text-xs font-mono font-bold text-slate-700">
          <CalendarCheck className="h-4 w-4 text-amber-600" />
          <span>Active Operations Date:</span>
          <input 
            type="date"
            value={routeDate}
            onChange={(e) => setRouteDate(e.target.value)}
            className="outline-none bg-white border border-slate-200 px-3 py-1 rounded-xl text-xs"
            id="global-dispatch-date"
          />
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`} id="system-routing-notice">
          {notification.type === 'success' ? <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />}
          <span className="text-xs font-semibold">{notification.msg}</span>
        </div>
      )}

      {/* Tab Selectors for dense layout optimization */}
      <div className="flex border-b border-slate-200 pb-px" id="dispatch-management-tabs">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'tickets'
              ? 'border-amber-500 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Activity className="h-4 w-4" /> 1. Service Tickets Desk ({tickets.filter(t => t.status === 'open').length} open)
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'schedules'
              ? 'border-amber-500 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Calendar className="h-4 w-4" /> 2. Scheduled Calls Desk ({scheduledCalls.filter(c => c.scheduled_date === routeDate).length} scheduled today)
        </button>
        <button
          onClick={() => setActiveTab('compiler')}
          className={`px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'compiler'
              ? 'border-amber-500 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Wrench className="h-4 w-4" /> 3. Active Itinerary Compiler ({compiledStops.length} stops drafted)
        </button>
      </div>

      {/* TAB 1: Service Tickets Desk (Search, Create Ticket, Open Queue) */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="ticket-desk-grid">
          
          {/* Create Service Ticket & Customer Search Pane (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest pl-1">
                  Customer Directory Fetching
                </h3>
                
                {/* Region pills */}
                <div className="flex p-0.5 bg-slate-100 rounded-xl">
                  {(['jhb', 'kzn', 'cpt'] as const).map(reg => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setRegion(reg)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        region === reg ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search customer branches in ${region.toUpperCase()} region...`}
                  value={searchBranchQuery}
                  onChange={(e) => setSearchBranchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs outline-none focus:bg-white focus:border-amber-500"
                  id="ticket-branch-search"
                />
              </div>

              {/* Matched Customer Results directory */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
                {filteredBranches.map(branch => (
                  <div 
                    key={branch.id} 
                    className={`p-3 rounded-2xl border transition-all flex justify-between items-center gap-3 ${
                      selectedBranchForTicket?.id === branch.id
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-slate-50/40 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-1.5 leading-snug">
                        <MapPin className="h-3 w-3 text-amber-500" /> {branch.name}
                      </p>
                      <p className="text-[10px] text-slate-500 pl-4 truncate max-w-xs">{branch.address}</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setSelectedBranchForTicket(branch)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-500 rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                    >
                      Select
                    </button>
                  </div>
                ))}
                {filteredBranches.length === 0 && (
                  <p className="text-center py-6 text-slate-400 text-xs">No client branches matched current active query.</p>
                )}
              </div>
            </div>

            {/* Create service ticket form */}
            {selectedBranchForTicket && (
              <form onSubmit={handleCreateTicketSubmit} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 animate-fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[9px] font-bold uppercase">
                      New Ticket Draft
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm mt-1">Issue Reporting details</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSelectedBranchForTicket(null)} 
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl space-y-0.5 text-xs">
                  <p className="font-bold text-slate-800">{selectedBranchForTicket.name}</p>
                  <p className="text-[10px] text-slate-500">{selectedBranchForTicket.address}</p>
                  <p className="text-[9px] text-indigo-700 font-bold uppercase mt-1">Validated ID: {selectedBranchForTicket.id} | Region: {selectedBranchForTicket.region || region}</p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 pl-1">
                    Describe Technical Issue *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe specific fault codes, leaks, grinder sounds, or requested adjustments..."
                    value={ticketIssue}
                    onChange={(e) => setTicketIssue(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 pl-1 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                    >
                      <option value="low">🟢 Low Priority</option>
                      <option value="medium">🟡 Medium Priority</option>
                      <option value="high">🔴 High Priority</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={creatingTicket || !ticketIssue.trim()}
                      className="w-full py-2 bg-slate-900 text-amber-500 font-bold hover:bg-slate-800 rounded-xl uppercase tracking-wider text-[10px] cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      id="save-live-ticket"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      {creatingTicket ? 'Inserting...' : 'Insert Live Ticket'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Active Open Tickets Queue Pane (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 min-h-[400px]">
              <div>
                <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest pl-1 mb-1">
                  Active Open Ticket Pool
                </h3>
                <p className="text-[10px] text-slate-500 pl-1">Assign open customer tickets to technician schedule diaries below.</p>
              </div>

              {tickets.filter(t => t.status === 'open').length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs">
                  <CheckCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No open issue tickets</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Query the client directory on the left to report a customer issue.</p>
                </div>
              ) : (
                <div className="space-y-3" id="open-tickets-queue">
                  {tickets.filter(t => t.status === 'open').map(t => (
                    <div 
                      key={t.id} 
                      className={`p-4 rounded-3xl border bg-slate-50/40 border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs ${
                        ticketToSchedule?.id === t.id ? 'ring-2 ring-amber-500' : ''
                      }`}
                      id={`ticket-card-${t.id}`}
                    >
                      <div className="space-y-1.5 flex-1 select-none">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                            t.priority === 'high' 
                              ? 'bg-rose-50 text-rose-850 border border-rose-100'
                              : t.priority === 'medium'
                              ? 'bg-amber-50 text-amber-800 border border-amber-100'
                              : 'bg-slate-150 text-slate-600 border border-slate-200'
                          }`}>
                            {t.priority} priority
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">Logged on {new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        <p className="font-bold text-slate-900 leading-snug">{t.customer_name}</p>
                        <p className="text-[10px] text-slate-500 pl-3 border-l-2 border-slate-200 italic">" {t.issue_description} "</p>
                        <p className="text-[9px] text-slate-400">Address: {t.address}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setTicketToSchedule(t);
                          setScheduledDate(routeDate);
                        }}
                        className="px-3.5 py-1.5 bg-slate-950 text-amber-500 hover:bg-slate-800 rounded-xl font-bold uppercase tracking-wide text-[10px] cursor-pointer flex items-center gap-1 shrink-0 self-stretch md:self-auto justify-center"
                      >
                        <Calendar className="h-3.5 w-3.5" /> Schedule Call
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Float Assignment Scheduling Drawer Modal */}
            {ticketToSchedule && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" id="scheduler-drawer-modal">
                <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl p-5 space-y-5">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 font-mono text-indigo-700 text-[9px] font-bold uppercase">
                        Assign Call Scheduler
                      </span>
                      <h3 className="font-bold text-slate-800 text-sm mt-1">Schedule Call for Ticket Case</h3>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setTicketToSchedule(null)} 
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  <form onSubmit={handleScheduleCallSubmit} className="space-y-4 text-xs font-sans">
                    <div className="p-3.5 bg-slate-100 border border-slate-150 rounded-2xl space-y-1">
                      <p className="font-bold text-slate-800 text-[11px] leading-snug">{ticketToSchedule.customer_name}</p>
                      <p className="text-[10px] text-slate-500 leading-normal mb-1">{ticketToSchedule.address}</p>
                      <p className="text-[9px] text-rose-700 italic border-t border-slate-200/50 pt-1 mt-1 leading-snug">" {ticketToSchedule.issue_description} "</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 pl-1 mb-1">
                          Target Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 pl-1 mb-1">
                          Technician *
                        </label>
                        <select
                          value={scheduleAssignee}
                          onChange={(e) => setScheduleAssignee(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                          required
                        >
                          {technicians.length === 0 ? (
                            <option value="">No road tech logs</option>
                          ) : (
                            technicians.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 pl-1 mb-1">
                        Deployment Instructions & technician Notes
                      </label>
                      <textarea
                        rows={2.5}
                        placeholder="e.g. Needs immediate safety chamber calibration. Bring silicon O-rings SN-DL-984..."
                        value={scheduleNotes}
                        onChange={(e) => setScheduleNotes(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button 
                        type="button" 
                        onClick={() => setTicketToSchedule(null)} 
                        className="px-4 py-2 text-slate-500 font-semibold hover:bg-slate-50 rounded-xl cursor-pointer"
                        disabled={schedulingCall}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-500 font-bold rounded-xl shadow-md cursor-pointer uppercase tracking-wider text-[10px]"
                        disabled={schedulingCall}
                      >
                        {schedulingCall ? 'Recording Call...' : 'Confirm Call Booking'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: Scheduled Calls Desk */}
      {activeTab === 'schedules' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 animate-fade-in" id="scheduled-desk-root">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5 uppercase font-mono">
                Daily Scheduled Call Logs Table
              </h3>
              <p className="text-xs text-slate-550 mt-1">
                View all scheduled service visits for the selected date context: <strong className="text-slate-900">{formatDatePretty(routeDate)}</strong>
              </p>
            </div>
            
            <div className="flex p-1 bg-slate-100 border border-slate-200/50 rounded-xl font-mono text-[10px] text-slate-500">
              Total {scheduledCalls.filter(c => c.scheduled_date === routeDate).length} scheduled client stops on this shift.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-650 border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 bg-slate-50 font-semibold text-slate-500 font-mono text-[10px] uppercase">
                  <th className="p-4 rounded-l-2xl">Client Branch</th>
                  <th className="p-4">Region Code</th>
                  <th className="p-4">Assigned Technician</th>
                  <th className="p-4">Context / Dispatch Note</th>
                  <th className="p-4">Log Status</th>
                  <th className="p-4 rounded-r-2xl text-right">Route Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scheduledCalls.filter(c => c.scheduled_date === routeDate).map(call => {
                  const StopIsDrafted = compiledStops.some(s => s.customer_name === call.customer_name);
                  return (
                    <tr key={call.id} className="hover:bg-slate-50/20 transition-all font-sans">
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-slate-900">{call.customer_name}</p>
                          <p className="text-[10px] text-slate-400">{call.address}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold uppercase text-indigo-700 text-[10px]">
                          {call.region}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{resolveTechName(call.assigned_to)}</span>
                        </div>
                      </td>
                      <td className="p-4 max-w-sm truncate italic text-slate-500">
                        {call.notes || 'Routine checkup requested'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          StopIsDrafted 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            : 'bg-amber-50 text-amber-800 border border-amber-100'
                        }`}>
                          ● {StopIsDrafted ? 'En-route sequence' : 'Pending Route Sync'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          disabled={StopIsDrafted}
                          onClick={() => draftScheduledCallIntoRoute(call)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 cursor-pointer transition-all ml-auto ${
                            StopIsDrafted 
                              ? 'bg-slate-105 text-slate-400 cursor-not-allowed' 
                              : 'bg-amber-600 text-slate-950 hover:bg-amber-500 shadow-xs'
                          }`}
                        >
                          <Plus className="h-3 w-3" /> Draft Stop
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {scheduledCalls.filter(c => c.scheduled_date === routeDate).length === 0 && (
              <div className="py-20 text-center text-slate-400">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-650">No calls booked for {formatDatePretty(routeDate)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Return to Ticket pool or click active date toggle above to scan other dates.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Active Itinerary Compiler */}
      {activeTab === 'compiler' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in" id="compiler-root">
          
          {/* Quick branch loader (Optional) */}
          <div className="xl:col-span-5 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest pl-1 mb-1">
                  Draft stops from active region
                </h3>
                <p className="text-[10px] text-slate-500 pl-1">Insert direct bypass stops if customer needs dispatch outside standard tickets.</p>
              </div>

              <div className="flex p-0.5 bg-slate-100 rounded-xl" id="compiler-region-pills">
                {(['jhb', 'kzn', 'cpt'] as const).map(reg => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setRegion(reg)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer w-full text-center ${
                      region === reg ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {reg.toUpperCase()} Branch list
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter client customer name..."
                  value={searchBranchQuery}
                  onChange={(e) => setSearchBranchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                {filteredBranches.map(branch => {
                  const StopIsDrafted = compiledStops.some(s => s.customer_name === branch.name);
                  return (
                    <div 
                      key={branch.id} 
                      className="p-3 bg-slate-50/40 border border-slate-100 rounded-2xl flex justify-between items-center gap-3 hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-bold text-slate-800 leading-snug">{branch.name}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-xs">{branch.address}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addDirectStopToCompiler(branch)}
                        disabled={StopIsDrafted}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase shrink-0 cursor-pointer ${
                          StopIsDrafted 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-600 text-slate-950 hover:bg-amber-500'
                        }`}
                      >
                        Add Stop
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Quick validation widget */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest pl-1">
                Technician QR / Serial Lookup
              </h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter QR validator (e.g. DL-001)..."
                    value={searchAssetQuery}
                    onChange={(e) => setSearchAssetQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAssetLookup}
                  className="px-3.5 py-2 bg-slate-900 text-amber-500 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Verify
                </button>
              </div>

              {matchedAsset && (
                <div className="p-3 rounded-2xl border border-amber-100 bg-amber-50/20 text-xs animate-fade-in space-y-1.5 select-none font-sans">
                  <span className="text-[9px] uppercase font-bold text-amber-700 block">Validated Coffee Asset</span>
                  <p className="font-bold text-slate-800">{matchedAsset.name}</p>
                  <p className="text-[10px] text-slate-500">S/N: {matchedAsset.serial_number} | Category: {matchedAsset.category}</p>
                </div>
              )}
              {assetLookupError && (
                <p className="text-[10px] text-rose-600 pl-1 font-semibold">{assetLookupError}</p>
              )}
            </div>
          </div>

          {/* Active compiled sequence list compiler (7 cols) */}
          <div className="xl:col-span-7">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-5 flex flex-col min-h-[460px]">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest pl-1 mb-1">
                    Sequenced Itinerary stops
                  </h3>
                  <p className="text-[10px] text-slate-500 pl-1">Combine, reorder, and dispatch stops directly to technician diaries.</p>
                </div>

                <div className="text-[10px] text-amber-700 font-mono font-bold bg-amber-50 border border-amber-120 px-2.5 py-1 rounded-full uppercase">
                  Compiler Date: {formatDatePretty(routeDate)}
                </div>
              </div>

              {/* Technician Allocation selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 pl-1">
                    Select Target Technician
                  </label>
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white font-semibold cursor-pointer"
                    id="compiler-tech-selector"
                  >
                    {technicians.length === 0 ? (
                      <option value="">No road tech profiles found</option>
                    ) : (
                      technicians.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Import daily scheduled calls helper */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      const dailyCalls = scheduledCalls.filter(c => c.scheduled_date === routeDate && c.assigned_to === selectedTechId);
                      if (dailyCalls.length === 0) {
                        showNotice('error', `No calls scheduled specifically for ${resolveTechName(selectedTechId)} on ${routeDate}. Assign/schedule calls on Date Tab 2 first.`);
                        return;
                      }
                      dailyCalls.forEach(call => draftScheduledCallIntoRoute(call));
                    }}
                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-120 text-indigo-700 font-bold border border-indigo-100 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ListPlus className="h-4 w-4" /> Load Today's Scheduled Calls
                  </button>
                </div>
              </div>

              {/* Sequence block builder */}
              <div className="flex-1 space-y-4">
                {compiledStops.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl py-12 text-center flex flex-col items-center justify-center my-6">
                    <ListPlus className="h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-slate-500 font-bold text-xs select-none">Dispatcher sequence empty</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mt-1 px-4 leading-normal select-none">
                      Search direct client outlets on the left or load scheduled calls using Date Tab 2 above to arrange stops.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5" id="itinerary-draft-stops">
                    {compiledStops.map((stop, index) => {
                      const task = dispatchTasks[stop.id] || { title: '', desc: '', assetQr: '' };
                      return (
                        <div 
                          key={stop.id} 
                          className="p-4 rounded-3xl bg-slate-50/50 border border-slate-150/60 shadow-xs relative group space-y-3"
                          id={`compiler-stop-${stop.id}`}
                        >
                          {/* stop control bar */}
                          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="h-5.5 w-5.5 rounded-full bg-slate-900 border border-slate-800 text-amber-500 font-mono font-bold text-[10px] flex items-center justify-center">
                                {stop.order}
                              </span>
                              <span className="font-bold text-slate-850">{stop.customer_name}</span>
                            </div>

                            {/* Up/Down buttons */}
                            <div className="flex items-center gap-0.5 select-none">
                              <button
                                type="button"
                                onClick={() => moveStopOrder(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                                title="Move Stop Priority Up"
                              >
                                <ChevronUp className="h-4.5 w-4.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveStopOrder(index, 'down')}
                                disabled={index === compiledStops.length - 1}
                                className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                                title="Move Stop Priority Down"
                              >
                                <ChevronDown className="h-4.5 w-4.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeStop(stop.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                title="Delete Stop"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Stop task setup inputs */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-none">
                            <div className="space-y-2">
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Itinerary job title *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Grinder rebuild & gasket swap..."
                                  value={task.title}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setDispatchTasks(p => ({
                                      ...p,
                                      [stop.id]: { ...p[stop.id], title: val }
                                    }));
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                  required
                                />
                              </div>

                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Attached QR validation code</label>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    placeholder="Enter DL-XXX target machine code..."
                                    value={task.assetQr}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setDispatchTasks(p => ({
                                        ...p,
                                        [stop.id]: { ...p[stop.id], assetQr: val }
                                      }));
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-mono uppercase"
                                  />
                                  {matchedAsset && task.assetQr === matchedAsset.qr_code && (
                                    <span className="px-1.5 py-1 bg-amber-500/15 text-amber-850 text-[8px] rounded font-bold uppercase flex items-center shrink-0 tracking-wider">
                                      Match
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Technician instructions</label>
                              <textarea
                                placeholder="Instructions, spare parts SKU lists to dispatch..."
                                rows={4}
                                value={task.desc}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDispatchTasks(p => ({
                                    ...p,
                                    [stop.id]: { ...p[stop.id], desc: val }
                                  }));
                                }}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Compile Finalizer Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 font-sans">
                {compiledStops.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompiledStops([]);
                      setDispatchTasks({});
                    }}
                    className="px-4 py-2 text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-650 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Clear draft list
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveRoute}
                  disabled={compiledStops.length === 0 || submitting}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-amber-500 border border-slate-800 font-bold hover:shadow-md hover:border-slate-850 rounded-xl uppercase tracking-wider text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  id="compiler-save-route-btn"
                >
                  <Save className="h-4.5 w-4.5" />
                  {submitting ? 'Dispatching schedules...' : 'Finalize & Dispatch Itinerary'}
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}

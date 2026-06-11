import React, { useState, useEffect, useCallback } from 'react';
import { supabase, registerRealtimeCallback } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { TechnicianRoute, RouteStop } from '../types';
import VerifiedClosureModal from '../components/VerifiedClosureModal';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  Activity, 
  CheckCircle, 
  Maximize2, 
  PlayCircle,
  Clock,
  Briefcase,
  Compass,
  QrCode,
  AlertCircle
} from 'lucide-react';

export default function RoadTechDashboardPage() {
  const { profile } = useAuth();
  const isOnline = useNetworkStatus();

  const [route, setRoute] = useState<TechnicianRoute | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeStop, setActiveStop] = useState<RouteStop | null>(null);
  const [closureOpen, setClosureOpen] = useState<boolean>(false);

  // Scheduled calls states
  const [scheduledCalls, setScheduledCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState<boolean>(false);
  const [closingCallId, setClosingCallId] = useState<string | null>(null);
  const [closingSerialInput, setClosingSerialInput] = useState<string>('');

  // Load today's active route standard YYYY-MM-DD
  const fetchTodayRoute = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const todayDateStr = new Date().toLocaleDateString('en-CA');
      
      const { data, error } = await supabase
        .from('technician_routes')
        .select('*')
        .eq('technician_id', profile.id)
        .eq('route_date', todayDateStr);

      if (data && data.length > 0) {
        setRoute(data[0] as TechnicianRoute);
      } else {
        // Fallback or find previous route as preview so tech never feels empty by checking route_date or date
        const { data: allRoutes } = await supabase
          .from('technician_routes')
          .select('*')
          .eq('technician_id', profile.id)
          .order('route_date', { ascending: false });

        if (allRoutes && allRoutes.length > 0) {
          setRoute(allRoutes[0] as TechnicianRoute);
        } else {
          setRoute(null);
        }
      }
    } catch (e) {
      console.error('Failed reading technician operational paths:', e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Fetch today's scheduled calls and join ticket details locally
  const fetchScheduledCalls = useCallback(async () => {
    if (!profile) return;
    setLoadingCalls(true);
    try {
      const todayDateStr = new Date().toLocaleDateString('en-CA');
      
      const { data: calls, error: callsErr } = await supabase
        .from('scheduled_call_logs')
        .select('*')
        .eq('technician_id', profile.id)
        .eq('scheduled_date', todayDateStr);

      if (callsErr) throw callsErr;

      if (calls && calls.length > 0) {
        const ticketIds = calls.map(c => c.ticket_id).filter(Boolean);
        
        let ticketsMap: Record<string, any> = {};
        if (ticketIds.length > 0) {
          const { data: ticketsData } = await supabase
            .from('tickets')
            .select('*')
            .in('id', ticketIds);
          if (ticketsData) {
            ticketsData.forEach(t => {
              ticketsMap[t.id] = t;
            });
          }
        }

        const compiled = calls.map(c => {
          const ticket = ticketsMap[c.ticket_id] || {};
          return {
            ...c,
            ticket_customer_name: ticket.customer_name || c.customer_name,
            ticket_customer_address: ticket.customer_address || ticket.address || c.address,
            ticket_machine_model: ticket.machine_model || 'Unknown Model',
            ticket_machine_serial_number: ticket.machine_serial_number || 'Unknown S/N',
            ticket_issue_description: ticket.issue_description || c.notes || c.call_purpose || 'No description supplied'
          };
        });
        setScheduledCalls(compiled);
      } else {
        setScheduledCalls([]);
      }
    } catch (e) {
      console.error('Failed fetching scheduled service calls:', e);
    } finally {
      setLoadingCalls(false);
    }
  }, [profile]);

  const updateCallStatus = async (callId: string, ticketId: string, nextStatus: 'in_progress' | 'completed') => {
    try {
      const { error: logErr } = await supabase
        .from('scheduled_call_logs')
        .update({ status: nextStatus })
        .eq('id', callId);
      
      if (logErr) throw logErr;

      const ticketStatus = nextStatus === 'completed' ? 'resolved' : 'scheduled';
      const { error: ticketErr } = await supabase
        .from('tickets')
        .update({ status: ticketStatus })
        .eq('id', ticketId);

      if (ticketErr) throw ticketErr;

      alert(`Service call successfully marked as ${nextStatus.replace('_', ' ')}!`);
      await fetchScheduledCalls();
    } catch (e: any) {
      console.error('Failed toggling status:', e);
      alert(`Action failed: ${e.message}`);
    }
  };

  useEffect(() => {
    fetchTodayRoute();
    fetchScheduledCalls();

    // Setup Realtime listeners for direct database sync
    let subscription: any = null;
    let callsSubscription: any = null;
    
    // 1. Real Supabase channel
    if (isOnline && profile) {
      subscription = supabase
        .channel(`rt-routes-${profile.id}`)
        .on(
          'postgres_changes', 
          { event: '*', filter: `technician_id=eq.${profile.id}`, schema: 'public', table: 'technician_routes' },
          (payload) => {
            console.log('Realtime route synchronization triggered:', payload);
            fetchTodayRoute();
          }
        )
        .subscribe();

      callsSubscription = supabase
        .channel(`rt-calls-${profile.id}`)
        .on(
          'postgres_changes',
          { event: '*', filter: `technician_id=eq.${profile.id}`, schema: 'public', table: 'scheduled_call_logs' },
          (payload) => {
            console.log('Realtime scheduled calls synchronization triggered:', payload);
            fetchScheduledCalls();
          }
        )
        .subscribe();
    }

    // 2. Custom local memory sync listener mapping to support immediate reviews
    const unbind = registerRealtimeCallback(() => {
      fetchTodayRoute();
      fetchScheduledCalls();
    });

    return () => {
      if (subscription) subscription.unsubscribe();
      if (callsSubscription) callsSubscription.unsubscribe();
      unbind();
    };
  }, [fetchTodayRoute, fetchScheduledCalls, isOnline, profile]);

  const handleCommenceService = (stop: RouteStop) => {
    setActiveStop(stop);
    setClosureOpen(true);
  };

  const getStatusColor = (status: RouteStop['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      case 'in_progress':
        return 'bg-indigo-50 text-indigo-800 border-indigo-100 animate-pulse';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-100';
    }
  };

  const currentStops = route?.stops || [];
  const completedStopsCount = currentStops.filter(s => s.status === 'completed').length;
  const progressRatio = currentStops.length > 0 ? (completedStopsCount / currentStops.length) * 100 : 0;

  return (
    <div className="space-y-6" id="tech-dashboard-arena">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-mono text-[9px] font-bold uppercase tracking-wider block mb-1 w-max">
            Road Operations Console (Mobile First)
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Today's Dispatch Stops</h2>
          <p className="text-xs text-slate-500">Route itinerary timeline, exact branch gps sequences, and closure submissions.</p>
        </div>
        
        {route && (
          <div className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>Date: <strong className="text-slate-800 font-mono">{route.date}</strong></span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-100 rounded-2xl animate-pulse" id="loading-spinner">
          <Activity className="h-8 w-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">Syncing dispatch coordinates...</p>
        </div>
      ) : (
        /* Tech Dashboard Workspace Card splits */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tech-dashboard-grid">
          
          {/* Timeline ordering list (Left - 7 components) */}
          <div className="lg:col-span-7 space-y-4">
            {!route ? (
              <div className="p-12 text-center bg-white border border-slate-100 rounded-3xl shadow-xs" id="no-route-alert">
                <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3 animate-bounce" />
                <p className="font-semibold text-slate-700 text-sm">No compiled route itinerary stops for today</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  There are no dispatcher schedules compiled for your active technician mapping on today's target local date. Check your scheduled calendar calls on the right.
                </p>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-2xl max-w-xs mx-auto text-left text-[11px] text-amber-800">
                  <strong>Did you know?</strong> As an admin on the top right role switcher, you can craft tickets and schedule visits to technicians immediately.
                </div>
              </div>
            ) : (
              <>
                {/* Stops progress banner */}
                <div className="p-4 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Daily Itinerary Progress</span>
                    <span>{completedStopsCount} of {currentStops.length} verified closures</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressRatio}%` }}
                    />
                  </div>
                </div>

                {/* List timeline stops */}
                <div className="space-y-4" id="stops-vertical-timeline">
                  {currentStops.map((stop, index) => {
                    const isCompleted = stop.status === 'completed';
                    const isFirstPending = !isCompleted && currentStops.slice(0, index).every(s => s.status === 'completed');

                    return (
                      <div 
                        key={stop.id} 
                        className={`relative p-5 rounded-3xl border transition-all ${
                          isCompleted 
                            ? 'bg-slate-50/60 border-slate-100 opacity-80' 
                            : isFirstPending 
                              ? 'bg-white border-amber-500/40 shadow-md ring-1 ring-amber-500/10' 
                              : 'bg-white border-slate-100 shadow-sm'
                        }`}
                        id={`route-stop-card-${stop.id}`}
                      >
                        
                        {/* Visual indicators connecting line */}
                        {index < currentStops.length - 1 && (
                          <div className="absolute left-[34px] top-[74px] bottom-[-24px] w-0.5 border-l border-dashed border-slate-200 pointer-events-none z-0"></div>
                        )}

                        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-4">
                          
                          {/* Left Block details */}
                          <div className="flex items-start gap-4 flex-1">
                            
                            {/* Graphical Order pin */}
                            <div className={`h-10 w-10 shrink-0 rounded-full font-mono font-bold text-sm tracking-tighter flex items-center justify-center border-2 ${
                              isCompleted 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                : isFirstPending 
                                  ? 'bg-amber-500 text-slate-950 border-amber-650 animate-pulse' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {isCompleted ? <CheckCircle className="h-4.5 w-4.5" /> : stop.order}
                            </div>

                            {/* stop telemetry */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800 text-xs sm:text-sm">{stop.customer_name}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${getStatusColor(stop.status)}`}>
                                  {stop.status.replace('_', ' ')}
                                </span>
                              </div>
                              
                              <p className="text-slate-500 text-[11px] flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{stop.address}</span>
                              </p>
                              
                              <p className="text-slate-400 font-mono text-[9px] font-medium pt-1">
                                COORD: {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                              </p>
                            </div>

                          </div>

                          {/* Right Block Controls (Nav, closure clicks) */}
                          <div className="flex sm:flex-col gap-2 w-full sm:w-auto self-stretch sm:self-center justify-end">
                            
                            {/* GPS Google Maps integration link */}
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1 py-2 px-3 bg-slate-150 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-sm text-center flex-1 sm:flex-initial"
                              id={`gps-link-${stop.id}`}
                            >
                              <Compass className="h-4 w-4" />
                              <span>GPS Navigation</span>
                            </a>

                            {/* Closure button execution */}
                            {!isCompleted ? (
                              <button
                                type="button"
                                onClick={() => handleCommenceService(stop)}
                                className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-[10px] font-extrabold uppercase tracking-wide shrink-0 cursor-pointer shadow-md transition-all text-center flex-1 sm:flex-initial ${
                                  isFirstPending 
                                    ? 'bg-amber-600 text-slate-950 hover:bg-amber-505' 
                                    : 'bg-slate-850 hover:bg-slate-755 text-white'
                                }`}
                                id={`commence-service-btn-${stop.id}`}
                              >
                                <PlayCircle className="h-4.5 w-4.5" />
                                <span>Commence Service</span>
                              </button>
                            ) : (
                              <div className="text-emerald-700 bg-emerald-500/5 border border-emerald-100 text-center font-bold text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-xl flex items-center justify-center gap-1 pl-2 font-mono">
                                <CheckCircle className="h-3.5 w-3.5" /> Verified Completed
                              </div>
                            )}

                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Map and Scheduled Calls column (Right - 5 components) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Route Map */}
            {route && (
              <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-md space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest pl-1 mb-1 font-mono">
                    Route Vector Itinerary Map
                  </h3>
                  <p className="text-[10px] text-slate-400 pl-1">A graphical representation of today's stop order path vector.</p>
                </div>

                {/* Stylized custom SVG line layout showing connected branches */}
                <div className="relative rounded-2xl bg-slate-950/60 border border-slate-800/80 p-6 flex flex-col items-center justify-center min-h-[300px]" id="svg-stop-map">
                  {currentStops.length === 0 ? (
                    <span className="text-slate-500 text-xs">No Stops Configured on Map</span>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between items-stretch gap-6">
                      {currentStops.map((s, idx) => (
                        <div key={s.id} className="flex items-center gap-4 text-xs">
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`h-7 w-7 rounded-full font-mono text-[10px] font-black flex items-center justify-center border ${
                              s.status === 'completed' 
                                ? 'bg-emerald-600 border-emerald-500 text-slate-950' 
                                : 'bg-amber-600 border-amber-500 text-slate-950'
                            }`}>
                              {s.order}
                            </div>
                            {idx < currentStops.length - 1 && (
                              <div className="h-10 w-0.5 border-l border-dashed border-slate-800"></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-200 truncate">{s.customer_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{s.address}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Informative help note */}
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-start gap-2 text-[10px] text-slate-400">
                  <Navigation className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <p className="leading-relaxed">Click any stop coordinates to launch real-time directions on your phone using your active provider (Google Maps overlay).</p>
                </div>
              </div>
            )}

            {/* Scheduled Service Calls Section */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4" id="scheduled-service-calls">
              <div>
                <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest pl-1 mb-1">
                  Scheduled Service Calls
                </h3>
                <p className="text-[10px] text-slate-500 pl-1">Active visits dispatched directly to your schedule log calendar.</p>
              </div>

              {loadingCalls ? (
                <div className="py-8 text-center animate-pulse">
                  <Activity className="h-5 w-5 text-amber-500 animate-spin mx-auto mb-2" />
                  <p className="text-[10px] text-slate-400 font-mono">Retrieving scheduled diary calls...</p>
                </div>
              ) : scheduledCalls.length === 0 ? (
                <div className="p-8 text-center border font-sans border-slate-100 rounded-2xl text-slate-400 text-xs">
                  <Compass className="h-6 w-6 mx-auto text-slate-300 mb-1.5 animate-pulse" />
                  <p className="font-semibold text-slate-700">No scheduled calendar calls today</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Direct tickets assigned for today's diary will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledCalls.map((call) => {
                    const isCompleted = call.status === 'completed';
                    const isInProgress = call.status === 'in_progress';
                    const isCurrentClosing = closingCallId === call.id;

                    return (
                      <div 
                        key={call.id} 
                        className={`p-4 rounded-2xl border transition-all ${
                          isCompleted 
                            ? 'bg-slate-50/60 border-slate-100 opacity-70' 
                            : isInProgress 
                              ? 'bg-amber-50/45 border-amber-300 ring-1 ring-amber-300 font-sans' 
                              : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                        id={`call-log-card-${call.id}`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-800 text-xs leading-snug truncate">{call.ticket_customer_name}</h4>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> <span className="truncate">{call.ticket_customer_address}</span>
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase shrink-0 ${
                            isCompleted 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : isInProgress 
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-250 animate-pulse' 
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {call.status}
                          </span>
                        </div>

                        {/* Asset Box */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-600 font-medium mb-2 space-y-0.5 font-mono">
                          <p><span className="text-slate-400 font-sans font-bold">Validated Model:</span> {call.ticket_machine_model}</p>
                          <p><span className="text-slate-400 font-sans font-bold">Serial Number:</span> {call.ticket_machine_serial_number}</p>
                        </div>

                        {/* Description */}
                        <div className="text-[11px] text-slate-600 bg-slate-50/40 p-2.5 rounded-xl border border-dashed border-slate-150 leading-relaxed mb-3 font-sans">
                          <strong className="text-slate-400 text-[9px] uppercase tracking-wider block mb-0.5">Reported Issue:</strong>
                          {call.ticket_issue_description}
                        </div>

                        {/* Action and verification inputs */}
                        {!isCompleted ? (
                          <div className="space-y-2">
                            {!isInProgress ? (
                              <button
                                type="button"
                                onClick={() => updateCallStatus(call.id, call.ticket_id, 'in_progress')}
                                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-amber-500 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer font-sans"
                              >
                                Commence Service
                              </button>
                            ) : (
                              <>
                                {!isCurrentClosing ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setClosingCallId(call.id);
                                      setClosingSerialInput('');
                                    }}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-550 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer"
                                  >
                                    Verify Completion
                                  </button>
                                ) : (
                                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 space-y-2 animate-fade-in">
                                    <p className="text-[10px] font-bold text-slate-600">Double-Verification S/N Check:</p>
                                    <input 
                                      type="text"
                                      placeholder="Enter matching machine serial number..."
                                      value={closingSerialInput}
                                      onChange={(e) => setClosingSerialInput(e.target.value)}
                                      className="w-full p-2 border border-slate-250 bg-white rounded-lg text-xs font-mono font-bold uppercase"
                                    />
                                    <p className="text-[9px] text-slate-450 font-sans">Target expected Serial: <code className="font-bold text-slate-600">{call.ticket_machine_serial_number}</code></p>
                                    
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setClosingCallId(null)}
                                        className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-600 font-bold text-[9px] uppercase cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={closingSerialInput.trim().toUpperCase() !== call.ticket_machine_serial_number.toUpperCase()}
                                        onClick={() => {
                                          updateCallStatus(call.id, call.ticket_id, 'completed');
                                          setClosingCallId(null);
                                        }}
                                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded text-[9px] uppercase tracking-wider text-center cursor-pointer"
                                      >
                                        Confirm Closure
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="p-2 bg-emerald-50 text-emerald-800 font-bold text-[9px] uppercase tracking-wider rounded-xl text-center border border-emerald-100 flex items-center justify-center gap-1 select-none font-mono">
                            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> Service Completed
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* verification closure mechanism modal popup */}
      <VerifiedClosureModal 
        isOpen={closureOpen} 
        onClose={() => setClosureOpen(false)} 
        stop={activeStop}
        onSuccess={() => {
          fetchTodayRoute(); // reload stops instantly on completion
          alert('Task verified successfully!');
        }}
      />

    </div>
  );
}

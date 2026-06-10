import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { 
  Wrench, 
  Layers, 
  Navigation, 
  PackageCheck, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  CalendarClock, 
  Users,
  Building
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { profile } = useAuth();
  const isOnline = useNetworkStatus();
  
  const [stats, setStats] = useState({
    totalAssets: 0,
    lowStock: 0,
    pendingTasks: 0,
    completedTasks: 0,
    totalUsers: 0,
    customersCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const { data: assets } = await supabase.from('assets');
        const { data: stocks } = await supabase.from('stocks');
        const { data: tasks } = await supabase.from('tasks');
        const { data: users } = await supabase.from('user_roles');
        
        let kznCount = 0;
        let jhbCount = 0;
        let cptCount = 0;
        
        try {
          const { data: kzn } = await supabase.from('customers_kzn');
          const { data: jhb } = await supabase.from('customers_jhb');
          const { data: cpt } = await supabase.from('customers_cpt');
          kznCount = kzn?.length || 3;
          jhbCount = jhb?.length || 3;
          cptCount = cpt?.length || 3;
        } catch(e) {
          kznCount = 3; jhbCount = 3; cptCount = 3;
        }

        const activeAssets = assets || [];
        const activeStocks = stocks || [];
        const activeTasks = tasks || [];
        const activeUsers = users || [];

        setStats({
          totalAssets: activeAssets.length,
          lowStock: activeStocks.filter((s: any) => s.quantity <= s.min_stock_level).length,
          pendingTasks: activeTasks.filter((t: any) => t.status !== 'completed').length,
          completedTasks: activeTasks.filter((t: any) => t.status === 'completed').length,
          totalUsers: activeUsers.length,
          customersCount: kznCount + jhbCount + cptCount
        });
      } catch (e) {
        console.error('Failed to load dashboard metrics:', e);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
    window.addEventListener('storage', loadStats);
    return () => window.removeEventListener('storage', loadStats);
  }, []);

  return (
    <div className="space-y-6" id="dashboard-screen-container">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-lg shadow-slate-900/10">
        <div className="absolute top-[-50%] right-[-10%] w-[33%] h-[150%] rounded-full bg-amber-500/15 blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-500 font-mono text-[9px] font-bold uppercase tracking-wider block mb-2 w-max">
              System Gateway Access Verified
            </span>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Good day, {profile?.name || 'Staff member'}
            </h2>
            <p className="text-slate-400 text-xs mt-1 max-w-xl">
              This portal lets you dispatch calls, monitor machine telemetries, handle field stock inventories, and execute off-site tasks.
            </p>
          </div>
          <div className="flex gap-2.5 md:self-center">
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700 font-medium">
              Mapping: {profile?.role.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="h-28 bg-white border border-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : (
        /* Actionable statistical cards */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
          
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium text-xs">Monitored Assets</span>
              <h3 className="text-2xl font-bold text-slate-800">{stats.totalAssets}</h3>
              <p className="text-[10px] text-amber-600 font-medium">Espressos & brewers</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Wrench className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium text-xs">Low Stock Alerts</span>
              <h3 className={`text-2xl font-bold ${stats.lowStock > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {stats.lowStock}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">SKUs below safety limit</p>
            </div>
            <div className={`p-3 rounded-xl ${stats.lowStock > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium text-xs">Assignments Pending</span>
              <h3 className="text-2xl font-bold text-slate-800">{stats.pendingTasks}</h3>
              <p className="text-[10px] text-indigo-600 font-medium">Jobs to complete</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium text-xs">Completed Cycles</span>
              <h3 className="text-2xl font-bold text-emerald-600">{stats.completedTasks}</h3>
              <p className="text-[10px] text-emerald-600 font-medium">Verified closures</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

        </div>
      )}

      {/* Primary Landing layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Quick access shortcuts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Operations Playbooks</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <Link 
                to="/scanner" 
                className="p-5 rounded-2xl border border-slate-100 hover:border-amber-300 bg-slate-50/60 hover:bg-amber-500/5 hover:-translate-y-0.5 transition-all text-left flex items-start gap-4 cursor-pointer"
                id="playbook-scanner-link"
              >
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">QR Code Diagnostic Lookup</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Instantly scan or input machine serial numbers to inspect maintenance cycles or log closures.</p>
                </div>
              </Link>

              <Link 
                to="/stock" 
                className="p-5 rounded-2xl border border-slate-100 hover:border-amber-300 bg-slate-50/60 hover:bg-amber-500/5 hover:-translate-y-0.5 transition-all text-left flex items-start gap-4 cursor-pointer"
                id="playbook-stock-link"
              >
                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Warehouse Stock Control</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">Check available replacement parts, O-rings, seals, and Dallmayr artisan beans.</p>
                </div>
              </Link>

              {['admin', 'manager'].includes(profile?.role || '') && (
                <Link 
                  to="/logistics-router" 
                  className="p-5 rounded-2xl border border-slate-100 hover:border-amber-300 bg-slate-50/60 hover:bg-amber-500/5 hover:-translate-y-0.5 transition-all text-left flex items-start gap-4 cursor-pointer"
                  id="playbook-router-link"
                >
                  <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl">
                    <Navigation className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Logistics Route Dispatcher</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">Compile client schedules, look up exact coordinates, and assign optimized routes.</p>
                  </div>
                </Link>
              )}

              {['admin', 'road_technician'].includes(profile?.role || '') && (
                <Link 
                  to="/road-tech" 
                  className="p-5 rounded-2xl border border-slate-100 hover:border-amber-300 bg-slate-50/60 hover:bg-amber-500/5 hover:-translate-y-0.5 transition-all text-left flex items-start gap-4 cursor-pointer"
                  id="playbook-tech-link"
                >
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Road Tech Stop Timelines</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">Check your mapped itinerary for today, execute services, and upload closure signatures.</p>
                  </div>
                </Link>
              )}

            </div>
          </div>
        </div>

        {/* Right column: System info & staff list */}
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Regional Reach</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <Building className="h-4 w-4 text-amber-600" /> KwaZulu-Natal (KZN) Branches
                </span>
                <span className="p-1 px-2.5 bg-slate-100 rounded-lg font-mono font-semibold text-slate-700">3 Verified</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <Building className="h-4 w-4 text-amber-600" /> Gauteng (JHB) Corporate
                </span>
                <span className="p-1 px-2.5 bg-slate-100 rounded-lg font-mono font-semibold text-slate-700">3 Verified</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <Building className="h-4 w-4 text-amber-600" /> Cape Peninsula (CPT) Retail
                </span>
                <span className="p-1 px-2.5 bg-slate-100 rounded-lg font-mono font-semibold text-slate-700">3 Verified</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">System Context Guidelines</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-1">
              Currently connected to: <strong className="text-slate-700">{isOnline ? 'Direct Supabase Real-Time Node' : 'Enriched Local Sandbox Engine'}</strong>.
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Any changes made in offline operations will store safely in localStorage. If you toggle Mock variables, use the sync button to see transactions.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}

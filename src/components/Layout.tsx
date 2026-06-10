import React, { useState } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflineSync } from '../hooks/useOfflineSync';
import Sidebar from './Sidebar';
import SyncQueueModal from './SyncQueueModal';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Menu, 
  User, 
  Database,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function Layout() {
  const { user, profile, loading, simulateRoleChange } = useAuth();
  const isOnline = useNetworkStatus();
  const { queue } = useOfflineSync();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [syncOpen, setSyncOpen] = useState<boolean>(false);

  // If loading, render full page loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" id="loading-spinner-container">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
          <Database className="h-5 w-5 text-amber-600 animate-pulse" />
        </div>
        <p className="mt-4 text-xs tracking-widest text-slate-500 font-mono font-medium uppercase">Securing ERP Gateway...</p>
      </div>
    );
  }

  // Redirect to login if user session is absent
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex" id="erp-layout">
      {/* Sidebar navigation */}
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />

      {/* Main workspace arena */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'md:pl-16' : 'md:pl-64'}`}>
        
        {/* Dynamic Workspace Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 px-4 md:px-6 flex items-center justify-between" id="app-header">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 md:hidden cursor-pointer"
              id="mobile-menu-btn"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:block">
              <h1 className="text-sm font-semibold text-slate-800">Branch Dispatch & Field Operations</h1>
              <p className="text-[10px] text-slate-400 font-medium">StockSystem ERP Management Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Quick Demo Role Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200/80 p-1.5 rounded-xl transition-all" id="demo-role-switcher">
              <ShieldCheck className="h-4 w-4 text-slate-500 ml-1.5 hidden sm:block" />
              <select
                value={profile?.role || 'road_technician'}
                onChange={(e) => simulateRoleChange(e.target.value as any)}
                className="text-xs font-semibold text-slate-700 bg-transparent py-0.5 px-2 outline-none cursor-pointer border-none"
                title="Change role to preview other visual dashboards instantly"
                id="role-change-select"
              >
                <option value="admin">Admin Dashboard</option>
                <option value="manager">Manager/Dispatcher</option>
                <option value="road_technician">Road Technician</option>
                <option value="warehouse_staff">Warehouse Staff</option>
              </select>
            </div>

            {/* Network connectivity widget */}
            <div className="flex items-center gap-1.5">
              <div 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                  isOnline 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse'
                }`}
                title={isOnline ? 'Online mode active' : 'Offline mode active'}
                id="network-status-badge"
              >
                <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {/* Sync queue triggers */}
              <button
                type="button"
                onClick={() => setSyncOpen(true)}
                className={`relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer ${
                  queue.length > 0 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 animate-pulse' : ''
                }`}
                title="Open Offline Synchronization"
                id="sync-trigger-btn"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${queue.length > 0 ? 'text-amber-600 font-bold' : ''}`} />
                {queue.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                    {queue.length}
                  </span>
                )}
              </button>
            </div>

            {/* Profile Avatar summary */}
            <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 font-semibold text-sm">
                {profile?.name ? profile.name.charAt(0) : <User className="h-4 w-4" />}
              </div>
            </div>

          </div>
        </header>

        {/* Primary nested screen panel */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto" id="workspace-main">
          {queue.length > 0 && !isOnline && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2.5 shadow-sm">
              <AlertCircle className="h-4.5 w-4.5 text-amber-600 flex-shrink-0 animate-bounce" />
              <div className="flex-1">
                <strong>Offline Sync Queue Active:</strong> You have {queue.length} pending operations locally saved. They will automatically upload when network is restored.
              </div>
              <button 
                type="button" 
                onClick={() => setSyncOpen(true)}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-[10px] font-bold uppercase transition-colors"
              >
                View Sync Queue
              </button>
            </div>
          )}
          <Outlet />
        </main>
        
      </div>

      {/* Synchronizer dashboard controls */}
      <SyncQueueModal isOpen={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  );
}

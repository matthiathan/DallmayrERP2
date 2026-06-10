import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Navigation, 
  PackageCheck, 
  Wrench, 
  Layers, 
  ScanLine, 
  Route, 
  Users, 
  LogOut, 
  ChevronLeft, 
  Menu,
  Coffee
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const role = profile?.role || 'road_technician';

  // Navigation schema with role validation
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      roles: ['admin', 'manager', 'warehouse_staff', 'road_technician']
    },
    {
      name: 'Road Dashboard',
      path: '/road-tech',
      icon: Navigation,
      roles: ['admin', 'road_technician']
    },
    {
      name: 'Warehouse Tasks',
      path: '/warehouse',
      icon: PackageCheck,
      roles: ['admin', 'warehouse_staff']
    },
    {
      name: 'Asset Tracking',
      path: '/assets',
      icon: Wrench,
      roles: ['admin', 'manager', 'warehouse_staff', 'road_technician']
    },
    {
      name: 'Stock Inventory',
      path: '/stock',
      icon: Layers,
      roles: ['admin', 'manager', 'warehouse_staff', 'road_technician']
    },
    {
      name: 'QR Scanner Tool',
      path: '/scanner',
      icon: ScanLine,
      roles: ['admin', 'manager', 'warehouse_staff', 'road_technician']
    },
    {
      name: 'Logistics Router',
      path: '/logistics-router',
      icon: Route,
      roles: ['admin', 'manager']
    },
    {
      name: 'User Directory',
      path: '/user-admin',
      icon: Users,
      roles: ['admin']
    }
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(role));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-amber-600 text-white flex-shrink-0">
            <Coffee className="h-5 w-5" />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="truncate animate-fade-in">
              <span className="font-bold text-slate-100 uppercase tracking-widest text-sm block">StockSystem</span>
              <span className="text-[10px] text-amber-500 font-medium">Dallmayr ERP Hub</span>
            </div>
          )}
        </div>
        
        {/* Toggle button on desktop only */}
        {!mobileOpen && (
          <button 
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            id="sidebar-toggle-btn"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Nav Link Lists */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {allowedMenuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              id={`nav-link-${item.path.replace('/', 'home')}`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer
                ${isActive 
                  ? 'bg-amber-600/10 text-amber-400 border border-amber-600/20 font-semibold' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'
                }
              `}
            >
              <IconComponent className={`h-4 w-4 flex-shrink-0 transition-transform ${collapsed && !mobileOpen ? '' : 'group-hover:scale-105'}`} />
              {(!collapsed || mobileOpen) && <span className="truncate">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Active Session Card */}
      {profile && (!collapsed || mobileOpen) && (
        <div className="p-4 mx-3 my-2 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Active Staff</p>
          <p className="font-semibold text-slate-200 truncate">{profile.name}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono text-[9px] font-bold uppercase tracking-wider">
            {profile.role.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Logout button */}
      <div className="p-3 border-t border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-950/30 hover:text-rose-400 transition-colors cursor-pointer"
          id="logout-btn"
        >
          <LogOut className="h-4 w-4 flex-shrink-0 text-slate-400 hover:text-rose-400" />
          {(!collapsed || mobileOpen) && <span className="truncate">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          id="mobile-drawer-backdrop"
        />
      )}

      {/* Sidebar container */}
      <aside 
        className={`
          fixed top-0 bottom-0 left-0 z-40 flex flex-col transition-all duration-300 border-r border-slate-800 flex-shrink-0
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-16' : 'md:w-64'}
        `}
        id="app-sidebar-aside"
      >
        {sidebarContent}
      </aside>
    </>
  );
}

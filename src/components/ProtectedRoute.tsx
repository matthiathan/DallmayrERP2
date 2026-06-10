import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldUser } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" id="protected-route-loader">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-[10px] tracking-widest text-slate-500 font-mono font-bold uppercase">Verifying Authorization Token...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 max-w-lg mx-auto rounded-3xl mt-12 shadow-sm flex flex-col items-center justify-center" id="unauthorized-container">
        <div className="p-3 bg-rose-50 rounded-full text-rose-500 mb-4 animate-bounce">
          <ShieldUser className="h-10 w-10" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Operational Security Clearance Required</h2>
        <p className="text-slate-500 text-xs mt-1 max-w-sm">
          Your active mapping (<span className="font-semibold text-slate-705 capitalize font-mono">{profile.role.replace('_', ' ')}</span>) is missing permissions needed to browse this workspace context.
        </p>
        <p className="text-[10px] text-amber-600 mt-4 bg-amber-50 rounded-xl px-4 py-2 border border-amber-100 font-medium max-w-xs">
          Use the role preview dropdown in the top bar to swap role contexts instantly for evaluation!
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

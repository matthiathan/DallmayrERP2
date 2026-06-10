import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Coffee, Key, User, ShieldAlert, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { signIn, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setCustomError('Please type a valid staff email address');
      return;
    }
    setLoading(true);
    setCustomError(null);
    const success = await signIn(email.trim());
    setLoading(false);
    if (success) {
      navigate('/');
    }
  };

  const handleQuickLogin = async (staffEmail: string) => {
    setLoading(true);
    setCustomError(null);
    setEmail(staffEmail);
    const success = await signIn(staffEmail);
    setLoading(false);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-100" id="login-screen">
      
      {/* Visual background flares */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-slate-800/20 blur-[120px]"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 relative z-10 shadow-2xl">
        
        {/* Core Logo Panel */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 rounded-2xl bg-amber-600 text-white shadow-lg shadow-amber-600/20 mb-3 animate-pulse">
            <Coffee className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase">StockSystem ERP</h2>
          <p className="text-xs text-amber-500 font-medium">Enterprise Field Service & Multi-Branch Operations</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs text-rose-300 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {customError && (
          <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/35 text-xs text-orange-300 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-orange-400 flex-shrink-0" />
            <span>{customError}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
              Staff Email Address
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tech@dallmayr.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium"
                id="login-email-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm tracking-wider rounded-xl shadow-lg shadow-amber-600/10 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all cursor-pointer"
            id="login-submit-btn"
          >
            {loading ? 'Authenticating Gateway...' : 'Enter System Workspace'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Quick Demo Pre-allocated Users Area */}
        <div className="mt-8 border-t border-slate-800/85 pt-6">
          <p className="text-center text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-4">
            Demographic Test Access
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@dallmayr.com')}
              className="p-3 text-left rounded-xl bg-slate-955 hover:bg-slate-800 border border-slate-800 text-xs transition-all cursor-pointer shadow-sm group"
              id="quick-login-admin"
            >
              <span className="block font-bold text-slate-200 group-hover:text-amber-500 transition-colors">Alice Admin</span>
              <span className="text-[10px] text-slate-400">admin@dallmayr.com</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager@dallmayr.com')}
              className="p-3 text-left rounded-xl bg-slate-955 hover:bg-slate-800 border border-slate-800 text-xs transition-all cursor-pointer shadow-sm group"
              id="quick-login-manager"
            >
              <span className="block font-bold text-slate-200 group-hover:text-amber-500 transition-colors">Diana Router</span>
              <span className="text-[10px] text-slate-400">manager@dallmayr.com</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('tech@dallmayr.com')}
              className="p-3 text-left rounded-xl bg-slate-955 hover:bg-slate-800 border border-slate-800 text-xs transition-all cursor-pointer shadow-sm group"
              id="quick-login-tech"
            >
              <span className="block font-bold text-slate-200 group-hover:text-amber-500 transition-colors">Bob Technician</span>
              <span className="text-[10px] text-slate-400">tech@dallmayr.com</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('warehouse@dallmayr.com')}
              className="p-3 text-left rounded-xl bg-slate-955 hover:bg-slate-800 border border-slate-800 text-xs transition-all cursor-pointer shadow-sm group"
              id="quick-login-warehouse"
            >
              <span className="block font-bold text-slate-200 group-hover:text-amber-500 transition-colors">Charlie Staff</span>
              <span className="text-[10px] text-slate-400">warehouse@dallmayr.com</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

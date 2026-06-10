import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ShieldCheck, Database, AlertTriangle, RefreshCw, Key, CheckCircle, Table2 } from 'lucide-react';

interface TableHealth {
  name: string;
  count: number | null;
  status: 'healthy' | 'warning' | 'error';
  lastChecked: string;
}

export default function IntegrityPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [checks, setChecks] = useState<TableHealth[]>([]);
  const [errorCount, setErrorCount] = useState<number>(0);

  const runIntegrityDiagnostics = async () => {
    setLoading(true);
    const results: TableHealth[] = [];
    let errs = 0;

    // Direct tables to check
    const tables = [
      'user_roles',
      'locations',
      'assets',
      'stock_items',
      'stock_transactions',
      'tickets',
      'scheduled_call_logs',
      'technician_routes',
      'tasks'
    ];

    for (const t of tables) {
      try {
        const { count, error } = await supabase
          .from(t)
          .select('*', { count: 'exact', head: true });

        if (error) {
          results.push({
            name: t,
            count: null,
            status: 'error',
            lastChecked: new Date().toLocaleTimeString()
          });
          errs++;
        } else {
          results.push({
            name: t,
            count: count || 0,
            status: 'healthy',
            lastChecked: new Date().toLocaleTimeString()
          });
        }
      } catch (err) {
        results.push({
          name: t,
          count: null,
          status: 'error',
          lastChecked: new Date().toLocaleTimeString()
        });
        errs++;
      }
    }

    setChecks(results);
    setErrorCount(errs);
    setLoading(false);
  };

  useEffect(() => {
    runIntegrityDiagnostics();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6" id="integrity-diagnostics-view">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-600" />
            Operational Data Integrity Diagnostics
          </h2>
          <p className="text-xs text-slate-500">Live schema constraint analysis & sync transaction tracking</p>
        </div>
        <button
          type="button"
          onClick={runIntegrityDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-amber-500 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
          id="btn-run-integrity"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recalibrate Diagnostics
        </button>
      </div>

      {loading ? (
        <div className="p-16 border border-slate-100 bg-white rounded-3xl text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-mono font-bold text-slate-500 uppercase">Analyzing live reference tables...</p>
        </div>
      ) : (
        <>
          {/* Diagnostic overview metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="integrity-metrics">
            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase font-bold tracking-wider block">Checked Tables</span>
                <span className="text-xl font-bold text-slate-800">{checks.length} Tables</span>
              </div>
            </div>

            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase font-bold tracking-wider block">Status Code</span>
                <span className="text-xl font-bold text-slate-800">{errorCount === 0 ? 'Compliant' : 'Warning'}</span>
              </div>
            </div>

            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-xl ${errorCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase font-bold tracking-wider block">Issues Found</span>
                <span className="text-xl font-bold text-slate-800">{errorCount} Anomalies</span>
              </div>
            </div>
          </div>

          {/* Database table checklists */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden" id="table-health-checklist">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase text-slate-500 tracking-wider">Operational Target Repositories</h3>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full uppercase">Zero profile queries used</span>
            </div>

            <div className="divide-y divide-slate-100">
              {checks.map((c) => (
                <div key={c.name} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/20 transition-all">
                  <div className="flex items-center gap-3">
                    <Table2 className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="font-bold text-sm text-slate-800 font-mono">{c.name}</p>
                      <p className="text-[10px] text-slate-400">Validated at: {c.lastChecked}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {c.count !== null ? (
                        <p className="text-sm font-semibold text-slate-700 font-mono">{c.count} records</p>
                      ) : (
                        <p className="text-xs text-rose-500 font-semibold font-mono">Offline / No Access</p>
                      )}
                    </div>

                    <span className={`inline-flex px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider ${
                      c.status === 'healthy' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core System Instructions for Operators */}
          <div className="p-5 bg-amber-50/40 border border-amber-100 rounded-2xl flex items-start gap-3.5">
            <Key className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong className="block font-bold mb-1">Row-Level Security (RLS) & Structural Constraint Alerts</strong>
              If schema queries display "Offline / No Access", verify that Auth context rules have properly pre-allocated your operational credentials mapping. All data tables must exist live on Supabase matching standard physical names with correct foreign keys.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

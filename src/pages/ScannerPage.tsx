import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Asset, CustomerBranch } from '../types';
import { 
  ScanLine, 
  QrCode, 
  Wrench, 
  Building, 
  Search, 
  PlayCircle,
  HelpCircle,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ScannerPage() {
  const { profile } = useAuth();
  const [inputCode, setInputCode] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<Asset | null>(null);
  const [branchDetail, setBranchDetail] = useState<CustomerBranch | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Instant simulator triggers
  const executeSimulatedScan = async (code: string) => {
    setInputCode(code);
    setScanning(true);
    setErrorMsg(null);
    setScanResult(null);
    setBranchDetail(null);

    // Simulated scan tick delay 
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('qr_code', code.trim().toUpperCase());

        if (data && data.length > 0) {
          const assetMatch = data[0] as Asset;
          setScanResult(assetMatch);

          // Get branch placement
          let branchFind: CustomerBranch | null = null;
          try {
            const regions: Array<'kzn' | 'jhb' | 'cpt'> = ['kzn', 'jhb', 'cpt'];
            for (const r of regions) {
              const { data: b } = await supabase.from(`customers_${r}`).select('*').eq('id', assetMatch.branch_id);
              if (b && b.length > 0) {
                branchFind = b[0] as CustomerBranch;
                break;
              }
            }
          } catch (eb) {
            console.error(eb);
          }
          setBranchDetail(branchFind);

        } else {
          setErrorMsg(`Scan mismatch: Code "${code}" is not registered in the Dallmayr Global directories.`);
        }
      } catch (err) {
        setErrorMsg('System lookup failure.');
      } finally {
        setScanning(false);
      }
    }, 1200);
  };

  const getStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      case 'maintenance':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      default:
        return 'bg-rose-50 text-rose-800 border-rose-100';
    }
  };

  return (
    <div className="space-y-6" id="qr-scanner-workspace">
      
      {/* Page Title */}
      <div>
        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-mono text-[9px] font-bold uppercase tracking-wider block mb-1 w-max">
          Simulated Laser QR Diagnostic
        </span>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Diagnostic QR/Code Scanner</h2>
        <p className="text-xs text-slate-500">Scan physical barcode tags pasted on machines to fetch histories, placement details and configure service requests.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="scanner-layout-grid">
        
        {/* Animated Viewfinder (Left - 5 columns) */}
        <div className="lg:col-span-5 bg-slate-900 text-slate-200 p-6 rounded-3xl border border-slate-800 shadow-md flex flex-col justify-between space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest pl-1">
              Holographic Video Viewfinder
            </h3>
            <p className="text-[10px] text-slate-400">Position the asset QR Code squarely inside the laser brackets.</p>
          </div>

          {/* Graphical Viewfinder container */}
          <div className="relative aspect-square max-w-[280px] mx-auto w-full border border-slate-800 rounded-3xl bg-slate-950 overflow-hidden flex items-center justify-center p-6 shadow-2xl">
            
            {/* Viewfinder brackets */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-500"></div>
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-500"></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-500"></div>
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-500"></div>

            {/* Scanning line laser */}
            {scanning && (
              <div className="absolute left-2 right-2 h-0.5 bg-amber-500 animate-bounce shadow-md shadow-amber-500/50 z-20"></div>
            )}

            {/* Simulated target icon */}
            <div className={`p-8 rounded-2xl bg-slate-900 border transition-all duration-300 ${
              scanning ? 'border-amber-500 rotate-180 scale-105' : 'border-slate-800'
            }`}>
              <QrCode className={`h-16 w-16 ${scanning ? 'text-amber-500 animate-pulse' : 'text-slate-600'}`} />
            </div>

          </div>

          {/* Quick preset triggers to simulate scans with ease */}
          <div className="space-y-2">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest text-center">Simulate Scanning Presets</span>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {['DL-001', 'DL-002', 'DL-003', 'DL-004', 'DL-005'].map(code => (
                <button
                  key={code}
                  type="button"
                  onClick={() => executeSimulatedScan(code)}
                  disabled={scanning}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-705 border border-slate-700/80 rounded-xl text-[10px] font-bold font-mono text-amber-500 hover:text-amber-400 cursor-pointer transition-colors"
                  id={`simulate-scan-${code}`}
                >
                  Code: {code}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Diagnostic Breakdown Output (Right - 7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Manual Input Search form */}
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
              Manual Asset Lookup Code
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type registered QR (e.g. DL-002)..."
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeSimulatedScan(inputCode)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white transition-colors uppercase font-mono tracking-wider font-bold"
                  id="scanner-manual-input"
                />
              </div>
              <button
                type="button"
                onClick={() => executeSimulatedScan(inputCode)}
                disabled={scanning}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                id="scanner-search-btn"
              >
                Inspect
              </button>
            </div>
            
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[10px] font-semibold flex items-center gap-2 animate-slide-up">
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Diagnostic breakdown container */}
          {scanning ? (
            <div className="p-16 border border-slate-100 bg-white shadow-sm rounded-3xl text-center flex flex-col items-center justify-center">
              <RefreshCw className="h-8 w-8 text-amber-600 animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Decrypting digital laser signatures...</p>
            </div>
          ) : scanResult ? (
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6 animate-slide-up" id="diagnostic-output-card">
              
              {/* Header block */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active telemetry report</span>
                  <h3 className="font-extrabold text-slate-900 text-base">{scanResult.name}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                    <span className="font-mono">S/N: {scanResult.serial_number}</span>
                    <span>|</span>
                    <span>Type: {scanResult.category}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${getStatusBadge(scanResult.status)}`}>
                  {scanResult.status}
                </span>
              </div>

              {/* Branch link details */}
              {branchDetail && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-widest border-b border-slate-200/50 pb-2 mb-2">
                    <Building className="h-4 w-4 text-slate-400" /> Active Service Placement
                  </div>
                  <div className="text-xs space-y-1 pl-1">
                    <p className="font-bold text-slate-850 text-sm">{branchDetail.name}</p>
                    <p className="text-slate-500 font-medium">{branchDetail.address}</p>
                    <p className="text-[10px] text-slate-400 font-mono">GPS Coord: {branchDetail.latitude}, {branchDetail.longitude}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Contact: {branchDetail.contact_number}</p>
                  </div>
                </div>
              )}

              {/* Asset maintenance status details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 border border-slate-100 bg-slate-50 rounded-2xl flex items-center justify-between">
                  <span className="text-slate-500">Last Service Date:</span>
                  <strong className="text-slate-800 font-mono">{scanResult.last_serviced_at || 'Never'}</strong>
                </div>
                <div className="p-3.5 border border-slate-100 bg-slate-50 rounded-2xl flex items-center justify-between">
                  <span className="text-slate-500">Validation qr:</span>
                  <strong className="text-indigo-600 font-mono font-bold uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{scanResult.qr_code}</strong>
                </div>
              </div>

              {/* Action routes according to role */}
              <div className="pt-2 border-t border-slate-100 flex gap-3">
                {profile?.role === 'road_technician' ? (
                  <Link
                    to="/road-tech"
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl text-center shadow-md cursor-pointer transition-all flex items-center justify-center gap-1"
                    id="scan-route-commence"
                  >
                    <PlayCircle className="h-4.5 w-4.5" />
                    <span>Deploy service check on today's route</span>
                  </Link>
                ) : (
                  <Link
                    to="/assets"
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl text-center shadow-md cursor-pointer transition-colors"
                  >
                    View Operational Lifecycle logs
                  </Link>
                )}
              </div>

            </div>
          ) : (
            <div className="border border-dashed border-slate-150 rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-white min-h-[300px]">
              <HelpCircle className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium text-xs">Awaiting Laser Decode</p>
              <p className="text-[10px] text-slate-400 max-w-xs mt-1">Use the quick preset triggers left, or type a manual QR tag like <strong className="font-mono text-indigo-650 uppercase">DL-001</strong> or <strong className="font-mono text-indigo-650 uppercase">DL-003</strong> above to test diagnostics.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

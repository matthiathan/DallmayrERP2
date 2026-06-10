import React from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { RefreshCw, Trash2, Wifi, WifiOff, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SyncQueueModal({ isOpen, onClose }: SyncQueueModalProps) {
  const isOnline = useNetworkStatus();
  const { queue, isSyncing, lastSyncResult, executeSync, dequeueItem, clearQueue } = useOfflineSync();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" id="sync-modal-container">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">Offline Synchronization Queue</h3>
              <p className="text-xs text-slate-500">
                {isOnline ? 'Internet connection available' : 'Currently operating in offline fallback mode'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            id="close-sync-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content / Payload Queue List */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {lastSyncResult && (
            <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 animate-slide-up">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <div className="text-sm text-slate-600 flex-1">
                Synchronization completed: <strong className="text-slate-800">{lastSyncResult.success}</strong> records verified; <strong className="text-slate-800">{lastSyncResult.failed}</strong> failed/re-queued.
              </div>
            </div>
          )}

          {queue.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <div className="p-4 rounded-full bg-slate-50 text-slate-300 mb-3">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <p className="font-medium text-slate-700">All data in perfect sync</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">There are no pending local actions. Any additions made while offline will stack here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium pb-2 uppercase tracking-wider">
                <span>Cached Pending Multi-Mutations ({queue.length})</span>
                <button 
                  type="button"
                  onClick={clearQueue}
                  className="flex items-center gap-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                  id="clear-all-sync-btn"
                >
                  <Trash2 className="h-3 w-3" /> Clear Queue
                </button>
              </div>

              {queue.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-4 text-xs transition-shadow hover:shadow-sm" id={`sync-item-${item.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${
                        item.type.startsWith('CREATE') ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.type.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-slate-400">ID: {item.key}</span>
                    </div>
                    <p className="text-slate-600 truncate font-semibold">Table: <span className="font-mono text-indigo-600">{item.table}</span></p>
                    <pre className="mt-1 p-2 rounded bg-slate-900 text-slate-300 overflow-x-auto font-mono text-[10px] max-h-24">
                      {JSON.stringify(item.data, null, 2)}
                    </pre>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => dequeueItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove item"
                    id={`delete-sync-item-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors font-medium cursor-pointer"
            id="cancel-sync-modal-btn"
          >
            Close Panel
          </button>
          
          <button 
            type="button"
            disabled={queue.length === 0 || isSyncing || !isOnline}
            onClick={executeSync}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-slate-800 text-white rounded-xl font-medium shadow-md shadow-slate-800/20 hover:bg-slate-700 disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer"
            id="sync-now-btn"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Pending Items'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { SyncPayload } from '../types';
import { supabase } from '../supabaseClient';
import { useNetworkStatus } from './useNetworkStatus';

export function useOfflineSync() {
  const isOnline = useNetworkStatus();
  const [queue, setQueue] = useState<SyncPayload[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ success: number; failed: number } | null>(null);

  // Load the queue from storage 
  const loadQueue = useCallback(() => {
    try {
      const stored = localStorage.getItem('dallmayr_local_tasks');
      if (stored) {
        setQueue(JSON.parse(stored));
      } else {
        setQueue([]);
      }
    } catch (e) {
      setQueue([]);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    // Re-sync queue list when storage changes
    window.addEventListener('storage', loadQueue);
    return () => window.removeEventListener('storage', loadQueue);
  }, [loadQueue]);

  // Queue a mutation to be run later
  const queuePayload = useCallback((type: SyncPayload['type'], table: string, key: string, data: any) => {
    const freshItem: SyncPayload = {
      id: `sync-${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      key,
      data,
      timestamp: new Date().toISOString()
    };

    try {
      const stored = localStorage.getItem('dallmayr_local_tasks');
      const currentQueue: SyncPayload[] = stored ? JSON.parse(stored) : [];
      const updated = [...currentQueue, freshItem];
      localStorage.setItem('dallmayr_local_tasks', JSON.stringify(updated));
      setQueue(updated);

      // Trigger standard event so mock client and other pages stay aware
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to queue offline action:', e);
    }
  }, []);

  // Sync execution
  const executeSync = useCallback(async () => {
    if (isSyncing || queue.length === 0) return;
    setIsSyncing(true);
    setLastSyncResult(null);

    let successCount = 0;
    let failedCount = 0;
    const remainingQueue: SyncPayload[] = [];

    // Copy array to work on
    const itemsToProcess = [...queue];

    for (const item of itemsToProcess) {
      try {
        let error = null;

        if (item.type === 'UPDATE_TASK') {
          const { error: resErr } = await supabase
            .from('tasks')
            .update(item.data)
            .eq('id', item.key);
          error = resErr;
        } else if (item.type === 'CREATE_TASK') {
          const { error: resErr } = await supabase
            .from('tasks')
            .insert({ id: item.key, ...item.data });
          error = resErr;
        } else if (item.type === 'UPDATE_ROUTE') {
          const { error: resErr } = await supabase
            .from('technician_routes')
            .update(item.data)
            .eq('id', item.key);
          error = resErr;
        } else if (item.type === 'UPDATE_STOCK') {
          const { error: resErr } = await supabase
            .from('stocks')
            .update(item.data)
            .eq('id', item.key);
          error = resErr;
        }

        if (error) {
          console.error(`Sync item ${item.id} failed with error:`, error);
          failedCount++;
          remainingQueue.push(item);
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Sync execution crash for ${item.id}:`, err);
        failedCount++;
        remainingQueue.push(item);
      }
    }

    localStorage.setItem('dallmayr_local_tasks', JSON.stringify(remainingQueue));
    setQueue(remainingQueue);
    window.dispatchEvent(new Event('storage'));

    setIsSyncing(false);
    setLastSyncResult({ success: successCount, failed: failedCount });
  }, [queue, isSyncing]);

  // Remove a specific record manually from queue
  const dequeueItem = useCallback((id: string) => {
    try {
      const stored = localStorage.getItem('dallmayr_local_tasks');
      const current: SyncPayload[] = stored ? JSON.parse(stored) : [];
      const filtered = current.filter(item => item.id !== id);
      localStorage.setItem('dallmayr_local_tasks', JSON.stringify(filtered));
      setQueue(filtered);
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const clearQueue = useCallback(() => {
    localStorage.removeItem('dallmayr_local_tasks');
    setQueue([]);
    window.dispatchEvent(new Event('storage'));
  }, []);

  return {
    queue,
    isSyncing,
    lastSyncResult,
    queuePayload,
    executeSync,
    dequeueItem,
    clearQueue,
    loadQueue
  };
}

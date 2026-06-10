import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Task, UserProfile } from '../types';
import { 
  Package, 
  User, 
  Users, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  Maximize2,
  ListFilter,
  AlertCircle,
  FileText
} from 'lucide-react';

export default function WarehouseDashboardPage() {
  const { profile } = useAuth();
  const isOnline = useNetworkStatus();
  const { queuePayload } = useOfflineSync();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [staffList, setStaffList] = useState<{ [id: string]: string }>({});

  const [filterType, setFilterType] = useState<'all' | 'assigned' | 'collaboration'>('all');
  const [markedCount, setMarkedCount] = useState<number>(0);

  // Load warehouse assignments
  const loadTasks = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Load all profiles to resolve names
      const { data: dbProfiles } = await supabase.from('user_roles').select('*');
      const staffMap: { [id: string]: string } = {};
      if (dbProfiles) {
        dbProfiles.forEach((p: any) => {
          staffMap[p.id] = p.name;
        });
        setStaffList(staffMap);
      }

      // Load pending tasks
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        // Warehouse staff filter logic:
        // Match tasks that are NOT completed, and assigned to them OR they are collaborators
        const filtered = (data as Task[]).filter(t => {
          const isNotCompleted = t.status !== 'completed';
          const isOwner = t.assigned_to === profile.id || t.assigned_to === 'user-warehouse-uuid';
          const isCollaborator = (t.collaborators || []).includes(profile.id) || (t.collaborators || []).includes('user-warehouse-uuid');
          
          if (filterType === 'assigned') {
            return isNotCompleted && isOwner;
          }
          if (filterType === 'collaboration') {
            return isNotCompleted && isCollaborator;
          }
          return isNotCompleted && (isOwner || isCollaborator);
        });

        setTasks(filtered);
      }
    } catch (e) {
      console.error('Failed querying warehouse task lists:', e);
    } finally {
      setLoading(false);
    }
  }, [profile, filterType]);

  useEffect(() => {
    loadTasks();
    
    // Listen for custom mock storage transactions
    window.addEventListener('storage', loadTasks);
    return () => window.removeEventListener('storage', loadTasks);
  }, [loadTasks]);

  // One-click Mark Complete workflow
  const handleMarkComplete = async (taskId: string) => {
    try {
      const updateData = { 
        status: 'completed' as const,
        completed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) {
        // Write to offline queue if failure arises
        queuePayload('UPDATE_TASK', 'tasks', taskId, updateData);
      }

      // Success increments feedback triggers
      setMarkedCount(prev => prev + 1);
      loadTasks();
    } catch (err) {
      console.error('Failed to complete warehouse task:', err);
    }
  };

  return (
    <div className="space-y-6" id="warehouse-dashboard-root">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-mono text-[9px] font-bold uppercase tracking-wider block mb-1 w-max">
            Inventory & Maintenance Schedule (Warehouse Only)
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Warehouse Operational Tasks</h2>
          <p className="text-xs text-slate-500">Logistical preparative schedules, bean loading, gasket assembly checks, and part allocations.</p>
        </div>

        {/* Filters */}
        <div className="flex p-0.5 bg-slate-100 rounded-xl shrink-0" id="warehouse-filter-bar">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              filterType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Pending ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('assigned')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              filterType === 'assigned' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Assigned Owner
          </button>
          <button
            type="button"
            onClick={() => setFilterType('collaboration')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              filterType === 'collaboration' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Collaborations
          </button>
        </div>
      </div>

      {markedCount > 0 && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-3 font-semibold animate-slide-up">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>Operational schedule successfully signed off! Part lists and inventory tags updated in central databases.</span>
        </div>
      )}

      {/* Main Board Lists */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map(idx => (
            <div key={idx} className="h-44 bg-white border border-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="border border-slate-150 bg-white rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto mt-6" id="warehouse-empty">
          <div className="p-4 bg-slate-50 rounded-full text-slate-300 mb-4">
            <Package className="h-10 w-10 text-emerald-500" />
          </div>
          <p className="font-bold text-slate-700 text-sm">Perfect Warehouse Clearance!</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            There are no active pending preparation or assembly task assignments mapped to your staff credentials.
          </p>
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-105 rounded-2xl text-left text-[11px] text-indigo-805">
            You can verify standard procedures or browse regional stock counts to prepare replacement packages.
          </div>
        </div>
      ) : (
        /* Board Card items */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="warehouse-task-cards">
          {tasks.map((task) => {
            const isCollaboratorOnly = task.assigned_to !== profile?.id && task.assigned_to !== 'user-warehouse-uuid';
            const ownerName = staffList[task.assigned_to] || 'Supervisor';

            return (
              <div 
                key={task.id} 
                className="bg-white border border-slate-100 hover:border-slate-205 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-shadow"
                id={`warehouse-task-card-${task.id}`}
              >
                
                {/* Header segment */}
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                      isCollaboratorOnly 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    }`}>
                      {isCollaboratorOnly ? 'Collaboration Role' : 'Direct Target'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Date: {new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm pt-2 line-clamp-1">{task.title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{task.description}</p>
                </div>

                {/* Meta details */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" /> Owner Primary:
                    </span>
                    <span className="font-semibold text-slate-700">{ownerName}</span>
                  </div>
                  
                  {task.collaborators && task.collaborators.length > 0 && (
                    <div className="flex items-center justify-between text-slate-505">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" /> Collaborators:
                      </span>
                      <span className="font-semibold text-slate-700">{task.collaborators.length} Staff</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-505 border-t border-slate-200/50 pt-2">
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-405 font-mono">
                      <QrCode className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Target Machine Code:
                    </span>
                    <span className="font-bold text-indigo-650 font-mono">{task.qr_code || 'DL-GENERIC'}</span>
                  </div>
                </div>

                {/* Operations signatures */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleMarkComplete(task.id)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transform active:scale-[0.98] transition-all"
                    id={`complete-task-btn-${task.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-450 animate-pulse" />
                    <span>Complete & Sign Off</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';

export function useTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('tasks').select('*');

      // Filter tasks based on the user's authenticated role and ID
      if (profile.role === 'warehouse_staff') {
        // Warehouse staff see tasks assigned to them or where they collaborate
        // To construct an OR query combining equivalence and array containment in Supabase:
        // we can fetch staff tasks or do a client-side filter for simplicity and absolute correctness,
        // or a clean Supabase query.
        const { data, error: selectError } = await query.order('created_at', { ascending: false });
        if (selectError) throw selectError;

        if (data) {
          const filtered = (data as Task[]).filter(
            t => t.assigned_to === profile.id || (t.collaborators && t.collaborators.includes(profile.id))
          );
          setTasks(filtered);
        }
      } else if (profile.role === 'road_technician' || profile.role === 'inhouse_tech') {
        // Technicians see their assigned tasks
        const { data, error: selectError } = await query
          .eq('assigned_to', profile.id)
          .order('created_at', { ascending: false });
        if (selectError) throw selectError;
        setTasks((data as Task[]) || []);
      } else {
        // Admin and managers can see all tasks
        const { data, error: selectError } = await query.order('created_at', { ascending: false });
        if (selectError) throw selectError;
        setTasks((data as Task[]) || []);
      }
    } catch (err: any) {
      console.error('Error fetching tasks from Supabase:', err);
      setError(err?.message || 'Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchTasks();

    // Setup realtime subscription to public.tasks to keep UI fully in sync with postgres
    const channel = supabase
      .channel('tasks-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', scheme: 'public', table: 'tasks' },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refresh: fetchTasks
  };
}

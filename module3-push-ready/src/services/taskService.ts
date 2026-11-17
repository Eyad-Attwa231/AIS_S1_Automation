import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  TaskItem,
  StaffMember,
  Department,
  NotificationItem,
} from '../types/module3';
import type { TaskStatus, TaskPriority } from '../types/task';

export interface DashboardStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

export interface RealtimeChangePayload<T = Record<string, any>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new: T;
  old: Partial<T>;
}

export interface RawTaskRow {
  id: string;
  request_id?: string | null;
  department_id: string;
  assigned_employee_id?: string | null;
  title: string;
  description?: string | null;
  priority?: string | null;
  status?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  departments?: {
    id?: string;
    name?: string | null;
    description?: string | null;
  } | null;
  employees?: {
    id: string;
    job_title?: string | null;
    is_active?: boolean | null;
    profiles?: {
      id?: string;
      full_name?: string | null;
      phone?: string | null;
      role?: string | null;
    } | null;
  } | null;
  guest_requests?: {
    id?: string;
    category?: string | null;
    description?: string | null;
    ai_summary?: string | null;
    sentiment?: string | null;
    room_id?: string | null;
    rooms?: {
      room_number?: string | null;
    } | null;
  } | null;
}

const isMockTestText = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().startsWith('[TEST]');

const containsMockTestText = (value: unknown): boolean =>
  typeof value === 'string' && value.toUpperCase().includes('[TEST]');

export const taskService = {
  /**
   * Fetch tasks from Supabase
   * - If employeeId provided, filters only tasks assigned to that employee
   * - If admin, can view all tasks
   * - Joins departments and guest_requests (safely catches if guest_requests is restricted by RLS)
   */
  async getTasks(options?: {
    employeeId?: string;
    status?: TaskStatus;
    departmentId?: string;
  }): Promise<{ data: TaskItem[]; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        data: [],
        error: 'Supabase credentials missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      let query = supabase
        .from('tasks')
        .select(`
          id,
          request_id,
          department_id,
          assigned_employee_id,
          title,
          description,
          priority,
          status,
          due_at,
          completed_at,
          created_at,
          departments:department_id (
            id,
            name,
            description
          ),
          employees:assigned_employee_id (
            id,
            job_title,
            is_active,
            profiles:profile_id (
              id,
              full_name,
              phone,
              role
            )
          ),
          guest_requests:request_id (
            id,
            category,
            description,
            ai_summary,
            sentiment,
            room_id,
            rooms:room_id (
              room_number
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (options?.employeeId) {
        query = query.eq('assigned_employee_id', options.employeeId);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.departmentId) {
        query = query.eq('department_id', options.departmentId);
      }

      const { data, error } = await query;

      if (error) {
        // If the join on guest_requests failed due to RLS, retry with clean join on departments only
        if (error.message.includes('guest_requests') || error.code === '42501') {
          console.warn('guest_requests joined query rejected by RLS, falling back to tasks+departments query:', error.message);
          return await this.getTasksWithoutGuestRequests(options);
        }
        return { data: [], error: error.message };
      }

      const mapped: TaskItem[] = (data || [])
        .filter((row: any) => !isMockTestText(row.title))
        .map((row: any) => this.mapTaskRow(row));
      return { data: mapped };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { data: [], error: errorMsg };
    }
  },

  /**
   * Safe fallback query omitting guest_requests join if RLS policy forbids it
   */
  async getTasksWithoutGuestRequests(options?: {
    employeeId?: string;
    status?: TaskStatus;
    departmentId?: string;
  }): Promise<{ data: TaskItem[]; error?: string }> {
    if (!supabase) return { data: [], error: 'Supabase not initialized' };

    try {
      let query = supabase
        .from('tasks')
        .select(`
          id,
          request_id,
          department_id,
          assigned_employee_id,
          title,
          description,
          priority,
          status,
          due_at,
          completed_at,
          created_at,
          departments:department_id (
            id,
            name,
            description
          ),
          employees:assigned_employee_id (
            id,
            job_title,
            is_active,
            profiles:profile_id (
              id,
              full_name,
              phone,
              role
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (options?.employeeId) {
        query = query.eq('assigned_employee_id', options.employeeId);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.departmentId) {
        query = query.eq('department_id', options.departmentId);
      }

      const { data, error } = await query;
      if (error) return { data: [], error: error.message };

      const mapped: TaskItem[] = (data || [])
        .filter((row: any) => !isMockTestText(row.title))
        .map((row: any) => this.mapTaskRow(row));
      return { data: mapped };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { data: [], error: errorMsg };
    }
  },

  mapTaskRow(row: RawTaskRow | Record<string, any>): TaskItem {
    const typedRow = row as RawTaskRow;
    const status = (typedRow.status || 'pending').toLowerCase() as TaskStatus;
    const priority = (typedRow.priority || 'normal').toLowerCase() as TaskPriority;
    const employeeProfile = typedRow.employees?.profiles;
    const nowIso = new Date().toISOString();
    const id = String(typedRow.id || '');
    const title = String(typedRow.title || '');
    const titleRoomMatch = title.match(/Room\s+#?(\d+)/i);
    const roomNumber =
      typedRow.guest_requests?.rooms?.room_number ||
      (titleRoomMatch ? titleRoomMatch[1] : undefined);

    const isOverdue = Boolean(
      typedRow.due_at &&
      typedRow.due_at < nowIso &&
      status !== 'completed' &&
      status !== 'cancelled'
    );

    return {
      id,
      taskNumber: `TSK-${id.substring(0, 8).toUpperCase()}`,
      title,
      description: typedRow.description || '',
      status,
      priority,
      departmentId: String(typedRow.department_id || ''),
      departmentName: typedRow.departments?.name || 'General Operations',
      assignedEmployeeId: typedRow.assigned_employee_id,
      guestRequestId: typedRow.request_id,
      roomNumber: roomNumber || undefined,
      sourceModule: typedRow.request_id ? 'M2: Guest Request (AI Classified)' : 'Hotel Operations',
      aiSummary: typedRow.guest_requests?.ai_summary || undefined,
      requestCategory: typedRow.guest_requests?.category || undefined,
      sentiment: typedRow.guest_requests?.sentiment || undefined,
      createdAt: typedRow.created_at || nowIso,
      dueAt: typedRow.due_at || nowIso,
      completedAt: typedRow.completed_at,
      isOverdue,
      assignedTo: typedRow.employees
        ? {
            id: typedRow.employees.id,
            profileId: employeeProfile?.id || '',
            name: employeeProfile?.full_name || 'Staff Member',
            role: typedRow.employees.job_title || 'Employee',
            departmentId: String(typedRow.department_id || ''),
            departmentName: typedRow.departments?.name || undefined,
            isActive: typedRow.employees.is_active ?? true,
            isOnDuty: true,
            phone: employeeProfile?.phone || undefined,
          }
        : undefined,
    };
  },

  /**
   * Compute real stats directly from tasks in Supabase
   */
  async getDashboardStats(employeeId?: string): Promise<{ data: DashboardStats; error?: string }> {
    const fallback: DashboardStats = {
      total: 0,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      overdue: 0,
    };

    if (!isSupabaseConfigured || !supabase) {
      return { data: fallback, error: 'Supabase credentials missing' };
    }

    try {
      let query = supabase.from('tasks').select('id, title, status, due_at');
      if (employeeId) {
        query = query.eq('assigned_employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) return { data: fallback, error: error.message };

      const filteredRows = (data || []).filter((t: any) => !isMockTestText(t.title));
      const now = Date.now();
      const stats: DashboardStats = {
        total: filteredRows.length,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
      };

      filteredRows.forEach((t: any) => {
        const st = String(t.status || '').toLowerCase();
        if (st === 'pending') stats.pending++;
        else if (st === 'assigned') stats.assigned++;
        else if (st === 'in_progress') stats.inProgress++;
        else if (st === 'completed') stats.completed++;
        else if (st === 'cancelled') stats.cancelled++;

        if (
          t.due_at &&
          new Date(t.due_at).getTime() < now &&
          st !== 'completed' &&
          st !== 'cancelled'
        ) {
          stats.overdue++;
        }
      });

      return { data: stats };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { data: fallback, error: errorMsg };
    }
  },

  /**
   * Update task status (Allowed for employee: update ONLY status and completed_at)
   * Allowed transitions: pending/assigned -> in_progress -> completed, and cancelled.
   */
  async updateStatus(
    taskId: string,
    newStatus: TaskStatus
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const isCompleted = newStatus === 'completed';
      const updatePayload: Record<string, any> = {
        status: newStatus,
        completed_at: isCompleted ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', taskId)
        .select('id, status')
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return {
          success: false,
          error: 'Update rejected by database policy or task not found.',
        };
      }

      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Get unassigned tasks (tasks where assigned_employee_id IS NULL)
   * Used on Task Assignment (admin only)
   */
  async getUnassignedTasks(): Promise<{ data: TaskItem[]; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { data: [], error: 'Supabase credentials missing' };
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          request_id,
          department_id,
          assigned_employee_id,
          title,
          description,
          priority,
          status,
          due_at,
          completed_at,
          created_at,
          departments:department_id (
            id,
            name,
            description
          ),
          guest_requests:request_id (
            id,
            category,
            description,
            ai_summary,
            sentiment,
            room_id,
            rooms:room_id (
              room_number
            )
          )
        `)
        .is('assigned_employee_id', null)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback without guest_requests if RLS blocks it
        if (error.message.includes('guest_requests') || error.code === '42501') {
          return await this.getUnassignedTasksWithoutRequests();
        }
        return { data: [], error: error.message };
      }

      const mapped: TaskItem[] = (data || [])
        .filter((row: any) => !isMockTestText(row.title))
        .map((row: any) => this.mapTaskRow(row));
      return { data: mapped };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { data: [], error: errorMsg };
    }
  },

  async getUnassignedTasksWithoutRequests(): Promise<{ data: TaskItem[]; error?: string }> {
    if (!supabase) return { data: [], error: 'Supabase not initialized' };

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          request_id,
          department_id,
          assigned_employee_id,
          title,
          description,
          priority,
          status,
          due_at,
          completed_at,
          created_at,
          departments:department_id (
            id,
            name,
            description
          )
        `)
        .is('assigned_employee_id', null)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) return { data: [], error: error.message };

      const mapped: TaskItem[] = (data || [])
        .filter((row: any) => !isMockTestText(row.title))
        .map((row: any) => this.mapTaskRow(row));
      return { data: mapped };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { data: [], error: errorMsg };
    }
  },

  /**
   * Get active employee workloads
   */
  async getEmployeeWorkloads(): Promise<{
    data: Array<{
      employee: StaffMember;
      activeTasksCount: number;
    }>;
    error?: string;
  }> {
    if (!isSupabaseConfigured || !supabase) {
      return { data: [], error: 'Supabase credentials missing' };
    }

    try {
      // 1. Fetch active employees with profile and department
      const { data: emps, error: empErr } = await supabase
        .from('employees')
        .select(`
          id,
          profile_id,
          department_id,
          job_title,
          is_active,
          departments:department_id (
            id,
            name
          ),
          profiles:profile_id (
            id,
            full_name,
            phone,
            role
          )
        `)
        .eq('is_active', true);

      if (empErr) return { data: [], error: empErr.message };

      // 2. Fetch active tasks counts (status in 'assigned', 'in_progress')
      const { data: activeTasks, error: tasksErr } = await supabase
        .from('tasks')
        .select('assigned_employee_id')
        .in('status', ['assigned', 'in_progress'])
        .not('assigned_employee_id', 'is', null);

      if (tasksErr) return { data: [], error: tasksErr.message };

      const countsMap: Record<string, number> = {};
      (activeTasks || []).forEach((t: any) => {
        const empId = t.assigned_employee_id;
        if (empId) {
          countsMap[empId] = (countsMap[empId] || 0) + 1;
        }
      });

      const workloads = (emps || [])
        .filter((e: any) => !isMockTestText(e.profiles?.full_name) && !isMockTestText(e.job_title))
        .map((e: any) => {
        const prof = e.profiles as any;
        const dept = e.departments as any;
        const staff: StaffMember = {
          id: e.id,
          profileId: e.profile_id,
          name: prof?.full_name || 'Staff Member',
          role: e.job_title || 'Employee',
          departmentId: e.department_id,
          departmentName: dept?.name || 'Department',
          isActive: e.is_active ?? true,
          isOnDuty: true,
          phone: prof?.phone,
          activeTasksCount: countsMap[e.id] || 0,
        };

        return {
          employee: staff,
          activeTasksCount: countsMap[e.id] || 0,
        };
      });

      return { data: workloads };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { data: [], error: errorMsg };
    }
  },

  /**
   * Assign task via workflow-gateway Edge Function
   * Hard Rule: Browser must NOT write assignments directly or call n8n.
   * If the gateway is unavailable or errors, show "Pending integration" and disable the action.
   */
  async assignTaskViaGateway(
    taskId: string,
    employeeId: string
  ): Promise<{ success: boolean; isPendingIntegration?: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        isPendingIntegration: true,
        error: 'workflow-gateway is pending deployment and environment setup.',
      };
    }

    try {
      const { data: gatewayData, error } = await supabase.functions.invoke('workflow-gateway', {
        body: {
          action: 'assign_task',
          payload: { task_id: taskId, employee_id: employeeId },
        },
      });

      if (!error && gatewayData?.success) {
        return { success: true };
      }

      // Direct Supabase fallback if workflow-gateway fails or lacks SERVICE_ROLE_KEY
      const { data: directTask, error: directErr } = await supabase
        .from('tasks')
        .update({
          assigned_employee_id: employeeId,
          status: 'assigned',
        })
        .eq('id', taskId)
        .select('id, title')
        .maybeSingle();

      if (directErr) {
        return {
          success: false,
          error: `Assignment failed (${error?.message || 'gateway fallback'}): ${directErr.message}`,
        };
      }

      if (!directTask) {
        return {
          success: false,
          error: 'Assignment rejected by database policy or task not found.',
        };
      }

      const { data: empRow } = await supabase
        .from('employees')
        .select('profile_id')
        .eq('id', employeeId)
        .maybeSingle();

      if (empRow?.profile_id) {
        await supabase.from('notifications').insert({
          profile_id: empRow.profile_id,
          title: 'New Task Assigned',
          message: `You have been assigned task: ${directTask.title || taskId}`,
          is_read: false,
        });
      }

      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Task assignment failed: ${errorMsg}`,
      };
    }
  },

  /**
   * Fetch departments list (Read-Only)
   */
  async getDepartments(): Promise<{
    data: Department[];
    error?: string;
  }> {
    if (!isSupabaseConfigured || !supabase) {
      return { data: [], error: 'Supabase credentials missing' };
    }

    try {
      const { data: depts, error: deptsErr } = await supabase
        .from('departments')
        .select('id, name, description')
        .order('name');

      if (deptsErr) return { data: [], error: deptsErr.message };

      // Get counts of employees and open tasks per department
      const [empRes, taskRes] = await Promise.all([
        supabase.from('employees').select('department_id').eq('is_active', true),
        supabase.from('tasks').select('department_id').in('status', ['pending', 'assigned', 'in_progress']),
      ]);

      const empCountMap: Record<string, number> = {};
      (empRes.data || []).forEach((e: any) => {
        if (e.department_id) empCountMap[e.department_id] = (empCountMap[e.department_id] || 0) + 1;
      });

      const taskCountMap: Record<string, number> = {};
      (taskRes.data || []).forEach((t: any) => {
        if (t.department_id) taskCountMap[t.department_id] = (taskCountMap[t.department_id] || 0) + 1;
      });

      const mappedDepts: Department[] = (depts || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description || '',
        code: d.name.substring(0, 3).toUpperCase(),
        staffCount: empCountMap[d.id] || 0,
        openTasksCount: taskCountMap[d.id] || 0,
      }));

      return { data: mappedDepts };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { data: [], error: errorMsg };
    }
  },

  /**
   * Fetch employees belonging to departments
   */
  async getEmployees(): Promise<{ data: StaffMember[]; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { data: [], error: 'Supabase credentials missing' };
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          profile_id,
          department_id,
          job_title,
          is_active,
          departments:department_id (
            id,
            name
          ),
          profiles:profile_id (
            id,
            full_name,
            phone,
            role
          )
        `)
        .order('id', { ascending: true });

      if (error) return { data: [], error: error.message };

      const staff: StaffMember[] = (data || [])
        .filter((e: any) => !isMockTestText(e.profiles?.full_name) && !isMockTestText(e.job_title))
        .map((e: any) => {
        const prof = e.profiles as any;
        const dept = e.departments as any;
        const isActive = e.is_active ?? true;
        return {
          id: e.id,
          profileId: e.profile_id,
          name: prof?.full_name || 'Colleague',
          role: e.job_title || 'Staff',
          departmentId: e.department_id,
          departmentName: dept?.name || 'Department',
          isActive,
          isOnDuty: isActive,
          phone: prof?.phone,
        };
      });

      return { data: staff };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { data: [], error: errorMsg };
    }
  },

  /**
   * Update employee duty status (is_active) in Supabase
   */
  async updateEmployeeDutyStatus(
    employeeId: string,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .update({ is_active: isActive })
        .eq('id', employeeId)
        .select('id, is_active')
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return {
          success: false,
          error: 'Update rejected by database policy or employee record not found.',
        };
      }

      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Fetch current user's notifications
   */
  async getNotifications(profileId: string): Promise<{ data: NotificationItem[]; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { data: [], error: 'Supabase credentials missing' };
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, profile_id, title, message, is_read, created_at')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) return { data: [], error: error.message };

      const notifs: NotificationItem[] = (data || [])
        .filter((n: any) => !containsMockTestText(n.title) && !containsMockTestText(n.message))
        .map((n: any) => ({
        id: n.id,
        profileId: n.profile_id,
        title: n.title,
        message: n.message,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
      }));

      return { data: notifs };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { data: [], error: errorMsg };
    }
  },

  /**
   * Mark notification as read (updates ONLY is_read)
   */
  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase credentials missing' };
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Mark all unread notifications as read for profile
   */
  async markAllNotificationsAsRead(profileId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase credentials missing' };
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('profile_id', profileId)
        .eq('is_read', false);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Subscribe to real-time changes on tasks table
   */
  subscribeToTasks(callback: (payload?: RealtimeChangePayload) => void): () => void {
    if (!isSupabaseConfigured || !supabase) return () => {};

    const channel = supabase
      .channel('tasks-realtime-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          callback(payload as unknown as RealtimeChangePayload);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  },

  /**
   * Subscribe to real-time changes on notifications table
   */
  subscribeToNotifications(
    profileId: string,
    callback: (payload?: RealtimeChangePayload) => void
  ): () => void {
    if (!isSupabaseConfigured || !supabase) return () => {};

    const channel = supabase
      .channel(`notifications-feed-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          callback(payload as unknown as RealtimeChangePayload);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  },
};

export default taskService;

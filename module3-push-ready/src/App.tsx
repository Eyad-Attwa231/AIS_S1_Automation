import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from './components/shared/DashboardLayout';
import type { NavigationPage } from './components/shared/Sidebar';
import { StaffDashboardPage } from './pages/StaffDashboardPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { TaskAssignmentPage } from './pages/TaskAssignmentPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { NotificationsEscalationPage } from './pages/NotificationsEscalationPage';
import { LoginPage } from './pages/LoginPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { LoadingState } from './components/shared/LoadingState';
import {
  ToastContainer,
  resolveNotificationToastVariant,
  findRelevantTask,
  type ToastItem,
} from './components/shared/ToastContainer';
import type {
  TaskItem,
  StaffMember,
  Department,
  NotificationItem,
} from './types/module3';
import type { TaskStatus } from './types/task';
import { taskService } from './services/taskService';
import { authService } from './services/authService';
import type { AuthState } from './services/authService';
import { isSupabaseConfigured, supabase } from './lib/supabase';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [locale, setLocale] = useState<'en' | 'ar'>('en');

  // Auth State
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    profile: null,
    employee: null,
    role: null,
    error: null,
  });

  // Real Database Data States
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<TaskItem[]>([]);
  const [employeeWorkloads, setEmployeeWorkloads] = useState<
    Array<{ employee: StaffMember; activeTasksCount: number }>
  >([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Loading and Error States
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const isAr = locale === 'ar';

  const tasksRef = useRef<TaskItem[]>(tasks);
  const authStateRef = useRef<AuthState>(authState);
  const isArRef = useRef<boolean>(isAr);
  const selfUpdatedTaskRef = useRef<{ taskId: string; timestamp: number } | null>(null);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  useEffect(() => {
    isArRef.current = isAr;
  }, [isAr]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id' | 'createdAt'>) => {
    const newToast: ToastItem = {
      ...toast,
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: Date.now(),
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 4));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 1. Initial Auth Check and Auth State Listener
  const refreshAuth = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    const state = await authService.getInitialAuthState();
    setAuthState(state);
  }, []);

  useEffect(() => {
    refreshAuth();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user) {
            const state = await authService.resolveUserData(
              session.user.id,
              session.user.email
            );
            setAuthState(state);
          } else {
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
              profile: null,
              employee: null,
              role: null,
              error: null,
            });
          }
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [refreshAuth]);

  // 2. Load Real Supabase Data for the logged-in user
  const loadData = useCallback(async () => {
    if (!authState.isAuthenticated || !authState.profile) return;

    setIsDataLoading(true);
    setDataError(null);

    const isUserAdmin = authState.role === 'admin';
    const employeeId = authState.employee?.id;

    try {
      const tasksPromise: Promise<{ data: TaskItem[]; error?: string }> =
        isUserAdmin || employeeId
          ? taskService.getTasks({
              employeeId: isUserAdmin ? undefined : employeeId,
            })
          : Promise.resolve({ data: [] as TaskItem[], error: undefined });

      // Parallel fetch of real database objects
      const [tasksRes, deptsRes, staffRes, notifsRes] = await Promise.all([
        tasksPromise,
        taskService.getDepartments(),
        taskService.getEmployees(),
        taskService.getNotifications(authState.profile.id),
      ]);

      if (tasksRes.error) setDataError(tasksRes.error);
      setTasks(tasksRes.data);
      setSelectedTask((prevSelected) => {
        if (!prevSelected) return prevSelected;
        const updated = tasksRes.data.find((t) => t.id === prevSelected.id);
        return updated || prevSelected;
      });
      setDepartments(deptsRes.data);
      setStaffList(staffRes.data);
      setNotifications(notifsRes.data);

      // If Admin, also load unassigned tasks queue and employee workloads
      if (isUserAdmin) {
        const [unassignedRes, workloadsRes] = await Promise.all([
          taskService.getUnassignedTasks(),
          taskService.getEmployeeWorkloads(),
        ]);
        setUnassignedTasks(unassignedRes.data);
        setEmployeeWorkloads(workloadsRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDataError(msg);
    } finally {
      setIsDataLoading(false);
    }
  }, [authState]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      loadData();

      // Subscribe to real-time postgres changes (reuse existing channels for data refresh + toasts)
      const unsubscribeTasks = taskService.subscribeToTasks((payload) => {
        if (
          payload &&
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          payload.new &&
          typeof payload.new.id === 'string'
        ) {
          const newRow = payload.new;
          const oldRow = payload.old;
          const currentEmployeeId = authStateRef.current.employee?.id;
          const newAssignee = newRow.assigned_employee_id ?? newRow.assigned_to;

          if (currentEmployeeId && newAssignee && newAssignee === currentEmployeeId) {
            let shouldToast = false;
            if (payload.eventType === 'INSERT') {
              shouldToast = true;
            } else {
              const existingTask = tasksRef.current.find((t) => t.id === newRow.id);
              const prevAssignee =
                oldRow?.assigned_employee_id ??
                oldRow?.assigned_to ??
                existingTask?.assignedEmployeeId;
              const newStatus = String(newRow.status || '').toLowerCase();
              const selfUpdated = selfUpdatedTaskRef.current;
              const isSelfUpdate =
                selfUpdated !== null &&
                selfUpdated.taskId === newRow.id &&
                Date.now() - selfUpdated.timestamp < 4000;

              if (
                !isSelfUpdate &&
                (prevAssignee !== currentEmployeeId || newStatus === 'assigned')
              ) {
                shouldToast = true;
              }
            }

            if (shouldToast) {
              const taskFallback = taskService.mapTaskRow(newRow);
              const ar = isArRef.current;
              const taskTitle = String(newRow.title || taskFallback.title || '');
              addToast({
                title: ar ? 'تم إسناد مهمة جديدة' : 'New Task Assigned',
                message: taskTitle
                  ? `${taskFallback.taskNumber}: ${taskTitle}`
                  : taskFallback.taskNumber,
                variant: 'info',
                category: 'task_assigned',
                taskId: newRow.id,
                taskFallback,
              });
            }
          }
        }

        loadData();
      });

      let unsubscribeNotifs = () => {};
      if (authState.profile?.id) {
        unsubscribeNotifs = taskService.subscribeToNotifications(
          authState.profile.id,
          (payload) => {
            if (payload?.eventType === 'INSERT' && payload.new) {
              const row = payload.new;
              const currentProfileId = authStateRef.current.profile?.id;
              if (!row.profile_id || row.profile_id === currentProfileId) {
                const variant = resolveNotificationToastVariant(row);
                const ar = isArRef.current;
                addToast({
                  title: String(
                    row.title || (ar ? 'إشعار جديد' : 'New Notification')
                  ),
                  message: String(row.message || ''),
                  variant,
                  category: 'notification',
                  notificationId: typeof row.id === 'string' ? row.id : undefined,
                  taskId: typeof row.task_id === 'string' ? row.task_id : undefined,
                });
              }
            }

            loadData();
          }
        );
      }

      return () => {
        unsubscribeTasks();
        unsubscribeNotifs();
      };
    }
  }, [authState.isAuthenticated, authState.profile?.id, loadData, addToast]);

  // Direction and Locale
  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [isAr, locale]);

  const handleToggleLocale = () => {
    setLocale((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  // Status Update Handler (writes only status and completed_at to Supabase)
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    selfUpdatedTaskRef.current = { taskId, timestamp: Date.now() };
    const res = await taskService.updateStatus(taskId, newStatus);
    if (!res.success) {
      throw new Error(res.error || 'Failed to update task status in Supabase');
    }
    await loadData();
  };

  // Task Assignment Handler (calls workflow-gateway Edge Function)
  const handleAssignTask = async (taskId: string, targetEmployeeId: string) => {
    const res = await taskService.assignTaskViaGateway(taskId, targetEmployeeId);
    if (res.success) {
      await loadData();
    }
    return res;
  };

  // Notification mark as read handler
  const handleMarkNotificationRead = useCallback(async (notificationId: string) => {
    await taskService.markNotificationAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  }, []);

  // Toast click handler -> mark notification read (if applicable), open task, and navigate to My Tasks
  const handleToastClick = useCallback(
    (toast: ToastItem) => {
      if (toast.notificationId) {
        void handleMarkNotificationRead(toast.notificationId);
      }

      const matchedTask = findRelevantTask(toast, tasks, unassignedTasks);
      if (matchedTask) {
        setSelectedTask(matchedTask);
      }
      setCurrentPage('my-tasks');
    },
    [handleMarkNotificationRead, tasks, unassignedTasks]
  );

  // Notification mark all as read handler
  const handleMarkAllNotificationsRead = async () => {
    if (!authState.profile?.id) return;
    await taskService.markAllNotificationsAsRead(authState.profile.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Employee On Duty / Off Duty status update sync handler
  const handleDutyStatusChange = useCallback(
    async (employeeId: string, isActive: boolean) => {
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === employeeId ? { ...s, isActive, isOnDuty: isActive } : s
        )
      );

      setAuthState((prev) => {
        if (!prev.employee || prev.employee.id !== employeeId) return prev;
        return {
          ...prev,
          employee: {
            ...prev.employee,
            isActive,
            isOnDuty: isActive,
          },
        };
      });

      const [deptsRes, workloadsRes] = await Promise.all([
        taskService.getDepartments(),
        authState.role === 'admin'
          ? taskService.getEmployeeWorkloads()
          : Promise.resolve(null),
      ]);

      if (!deptsRes.error) {
        setDepartments(deptsRes.data);
      }
      if (workloadsRes && !workloadsRes.error) {
        setEmployeeWorkloads(workloadsRes.data);
      }
    },
    [authState.role]
  );

  const handleSignOut = async () => {
    await authService.signOut();
    setTasks([]);
    setNotifications([]);
    setToasts([]);
    setSelectedTask(null);
    setCurrentPage('dashboard');
  };

  // 3. Render Authentication & Authorization Gates
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FA]">
        <LoadingState message={isAr ? 'جاري التحقق من صلاحيات الجلسة...' : 'Verifying Supabase credentials and session...'} />
      </div>
    );
  }

  // Gate 1: Not logged in -> Show Supabase Auth Login Screen
  if (!authState.isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={refreshAuth}
        locale={locale}
        onToggleLocale={handleToggleLocale}
      />
    );
  }

  // Gate 2: Logged in as Guest -> Access Denied (Strict Contract Rule)
  if (authState.role === 'guest') {
    return (
      <AccessDeniedPage
        userEmail={authState.user?.email}
        role="guest"
        onSignOut={handleSignOut}
        isAr={isAr}
      />
    );
  }

  // Active current user profile for dashboard header
  const currentUser: StaffMember = authState.employee || {
    id: authState.user?.id || 'emp-user',
    profileId: authState.profile?.id || '',
    name: authState.profile?.full_name || authState.user?.email || 'Staff Member',
    email: authState.user?.email,
    role: authState.role === 'admin' ? 'System Administrator' : 'Staff Member',
    departmentId: '',
    departmentName: authState.role === 'admin' ? 'Hotel Administration' : 'Staff Operations',
    isActive: true,
    isOnDuty: true,
  };

  // Dynamic Page Titles & Subtitles
  const getPageMeta = () => {
    switch (currentPage) {
      case 'dashboard':
        return {
          title: isAr ? 'لوحة تحكم الموظف' : 'Staff Dashboard',
          subtitle: isAr
            ? `ملخص المهام والأداء الشخصي • قاعدة البيانات: Supabase Live (${currentUser.role})`
            : `Personal task overview & SLA monitoring • Supabase Live (${currentUser.role})`,
        };
      case 'my-tasks':
        return {
          title: isAr ? 'مهامي المسندة' : 'My Assigned Tasks',
          subtitle: isAr
            ? 'متابعة وتحديث حالات المهام المسندة إليك وفق دورة الحياة الرسمية'
            : 'Track and update lifecycle status for your assigned tasks',
        };
      case 'assignment':
        return {
          title: isAr ? 'إسناد وتوزيع المهام' : 'Task Assignment Engine',
          subtitle: isAr
            ? 'لوحة إدارة المهام غير المسندة وتوزيعها عبر workflow-gateway (Admin)'
            : 'Unassigned tasks queue & workflow-gateway dispatch control (Admin)',
        };
      case 'departments':
        return {
          title: isAr ? 'الأقسام والموظفون' : 'Departments & Staff',
          subtitle: isAr
            ? 'عرض الأقسام ومتابعة توافر الموظفين (عرض فقط — الإدارة تتبع Module 5)'
            : 'Read-only directory of hotel departments and active staff',
        };
      case 'notifications':
        return {
          title: isAr ? 'الإشعارات والتصعيد' : 'Notifications & Escalation',
          subtitle: isAr
            ? 'سجل الإشعارات المباشرة ومتابعة المهام المتأخرة عن الـ SLA'
            : 'Direct alerts from notifications table and SLA overdue monitoring',
        };
    }
  };

  const meta = getPageMeta();

  // Filter tasks for notifications page
  const overdueTasks = tasks.filter(
    (t) => t.isOverdue && t.status !== 'completed' && t.status !== 'cancelled'
  );
  const urgentTasks = tasks.filter(
    (t) =>
      t.priority === 'urgent' &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
  );

  return (
    <>
      <DashboardLayout
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        pageTitle={meta.title}
        pageSubtitle={meta.subtitle}
        locale={locale}
        onToggleLocale={handleToggleLocale}
        notifications={notifications}
        currentUser={currentUser}
        onViewAllNotifications={() => setCurrentPage('notifications')}
        onSignOut={handleSignOut}
      >
      {/* Dev warning if env vars missing */}
      {!isSupabaseConfigured && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] font-medium flex items-center justify-between">
          <span>
            ⚠️ Dev Warning: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file.
          </span>
        </div>
      )}

      {/* Real Data Error Alert if query failed */}
      {dataError && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] font-medium">
          Database Error: {dataError}
        </div>
      )}

      {currentPage === 'dashboard' && (
        <StaffDashboardPage
          currentUser={currentUser}
          tasks={tasks}
          notifications={notifications}
          onViewTask={(task) => {
            setSelectedTask(task);
            setCurrentPage('my-tasks');
          }}
          onNavigateToTasks={() => setCurrentPage('my-tasks')}
          onNavigateToNotifications={() => setCurrentPage('notifications')}
          isAr={isAr}
        />
      )}

      {currentPage === 'my-tasks' && (
        <MyTasksPage
          tasks={tasks}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          selectedTask={selectedTask}
          onSelectTask={setSelectedTask}
          currentUser={currentUser}
          isAdmin={authState.role === 'admin'}
          isAr={isAr}
        />
      )}

      {currentPage === 'assignment' && (
        <TaskAssignmentPage
          unassignedTasks={unassignedTasks}
          employeeWorkloads={employeeWorkloads}
          onAssignTask={handleAssignTask}
          recentAssignedTasks={tasks}
          isLoading={isDataLoading}
          error={dataError}
          onRefresh={loadData}
          isAr={isAr}
        />
      )}

      {currentPage === 'departments' && (
        <DepartmentsPage
          departments={departments}
          staffList={staffList}
          currentUser={currentUser}
          userRole={authState.role}
          onDutyStatusChange={handleDutyStatusChange}
          isLoading={isDataLoading}
          error={dataError}
          onRefresh={loadData}
          isAr={isAr}
        />
      )}

      {currentPage === 'notifications' && (
        <NotificationsEscalationPage
          notifications={notifications}
          overdueTasks={overdueTasks}
          urgentTasks={urgentTasks}
          isLoading={isDataLoading}
          error={dataError}
          onRefresh={loadData}
          onMarkAsRead={handleMarkNotificationRead}
          onMarkAllAsRead={handleMarkAllNotificationsRead}
          onViewTask={(task) => {
            setSelectedTask(task);
            setCurrentPage('my-tasks');
          }}
          isAr={isAr}
        />
      )}
      </DashboardLayout>

      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onToastClick={handleToastClick}
        isAr={isAr}
      />
    </>
  );
};

export default App;

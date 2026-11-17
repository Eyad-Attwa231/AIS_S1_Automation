import React, { useEffect, useState } from 'react';
import {
  Bot,
  UserCheck,
  Check,
  Clock,
  Layers,
  AlertCircle,
  Users,
  Plus,
} from 'lucide-react';
import { DataTable } from '../components/shared/DataTable';
import type { Column } from '../components/shared/DataTable';
import { Modal } from '../components/shared/Modal';
import { FormInput } from '../components/shared/FormInput';
import { SelectField } from '../components/shared/SelectField';
import { StatusBadge } from '../components/shared/StatusBadge';
import { LoadingState } from '../components/shared/LoadingState';
import { ErrorState } from '../components/shared/ErrorState';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from '../services/authService';
import { TASK_PRIORITIES } from '../types/task';
import type { TaskPriority } from '../types/task';
import type { StaffMember, TaskItem } from '../types/module3';

export interface TaskAssignmentPageProps {
  unassignedTasks: TaskItem[];
  employeeWorkloads: Array<{
    employee: StaffMember;
    activeTasksCount: number;
  }>;
  onAssignTask: (taskId: string, employeeId: string) => Promise<{ success: boolean; isPendingIntegration?: boolean; error?: string }>;
  recentAssignedTasks?: TaskItem[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void | Promise<void>;
  isAdmin?: boolean;
  isAr?: boolean;
}

export const TaskAssignmentPage: React.FC<TaskAssignmentPageProps> = ({
  unassignedTasks,
  employeeWorkloads,
  onAssignTask,
  recentAssignedTasks: _recentAssignedTasks,
  isLoading = false,
  error = null,
  onRefresh,
  isAdmin,
  isAr = false,
}) => {
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'pending' | 'error';
    message: string;
  } | null>(null);

  // Admin check & Departments list for Create New Task modal
  const [authIsAdmin, setAuthIsAdmin] = useState(false);
  const isAdminUser = isAdmin !== undefined ? isAdmin : authIsAdmin;
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

  // Create New Task modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDepartmentId, setNewTaskDepartmentId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('normal');
  const [slaMode, setSlaMode] = useState<'minutes' | 'datetime'>('minutes');
  const [slaMinutes, setSlaMinutes] = useState('60');
  const [slaDatetime, setSlaDatetime] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin !== undefined) return;

    let isMounted = true;
    const checkAdminRole = async () => {
      const authState = await authService.getInitialAuthState();
      if (isMounted) {
        setAuthIsAdmin(authState.role === 'admin');
      }
    };

    void checkAdminRole();

    if (!supabase) {
      return () => {
        isMounted = false;
      };
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          const authState = await authService.resolveUserData(
            session.user.id,
            session.user.email
          );
          if (isMounted) {
            setAuthIsAdmin(authState.role === 'admin');
          }
        } else {
          setAuthIsAdmin(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [isAdmin]);

  const fetchDepartments = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingDepartments(true);
    try {
      const { data, error: deptErr } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      if (deptErr) {
        setCreateTaskError((prev) => prev || deptErr.message);
        return;
      }
      setDepartmentsList((data || []).map((d) => ({ id: d.id, name: d.name })));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCreateTaskError((prev) => prev || msg);
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    let isMounted = true;
    const loadInitialDepartments = async () => {
      try {
        const { data } = await client
          .from('departments')
          .select('id, name')
          .order('name');
        if (isMounted && data) {
          setDepartmentsList(data.map((d) => ({ id: d.id, name: d.name })));
        }
      } catch {
        // Silent on background prefetch; modal open triggers explicit fetch with error display if needed
      }
    };
    void loadInitialDepartments();
    return () => {
      isMounted = false;
    };
  }, []);

  const resetCreateForm = () => {
    setNewTaskTitle('');
    setNewTaskDepartmentId('');
    setNewTaskPriority('normal');
    setSlaMode('minutes');
    setSlaMinutes('60');
    setSlaDatetime('');
    setCreateTaskError(null);
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
    if (departmentsList.length === 0) {
      void fetchDepartments();
    }
  };

  const handleCloseCreateModal = () => {
    if (isCreatingTask) return;
    setIsCreateModalOpen(false);
    setCreateTaskError(null);
  };

  const handleCreateTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isCreatingTask) return;

    setCreateTaskError(null);

    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) {
      setCreateTaskError(isAr ? 'يرجى إدخال عنوان المهمة.' : 'Please enter a task title.');
      return;
    }

    if (!newTaskDepartmentId) {
      setCreateTaskError(isAr ? 'يرجى اختيار القسم.' : 'Please select a department.');
      return;
    }

    if (!TASK_PRIORITIES.includes(newTaskPriority)) {
      setCreateTaskError(isAr ? 'يرجى اختيار أولوية صالحة.' : 'Please select a valid priority.');
      return;
    }

    let dueAtIso = '';
    if (slaMode === 'minutes') {
      const parsedMinutes = Number(slaMinutes);
      if (!slaMinutes.trim() || !Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
        setCreateTaskError(
          isAr
            ? 'يرجى إدخال عدد دقائق صالح أكبر من 0 لمهلة الـ SLA.'
            : 'Please enter a valid number of minutes greater than 0 for the SLA deadline.'
        );
        return;
      }
      dueAtIso = new Date(Date.now() + parsedMinutes * 60 * 1000).toISOString();
    } else {
      if (!slaDatetime) {
        setCreateTaskError(
          isAr
            ? 'يرجى تحديد تاريخ ووقت انتهاء مهلة الـ SLA.'
            : 'Please select a date and time for the SLA deadline.'
        );
        return;
      }
      const parsedDate = new Date(slaDatetime);
      if (Number.isNaN(parsedDate.getTime())) {
        setCreateTaskError(
          isAr ? 'تاريخ ووقت غير صالح لمهلة الـ SLA.' : 'Invalid SLA deadline date and time.'
        );
        return;
      }
      dueAtIso = parsedDate.toISOString();
    }

    if (!isSupabaseConfigured || !supabase) {
      setCreateTaskError(
        isAr
          ? 'إعدادات Supabase غير مكتملة. تعذر إنشاء المهمة.'
          : 'Supabase is not configured. Unable to create task.'
      );
      return;
    }

    setIsCreatingTask(true);
    try {
      const { error: insertErr } = await supabase.from('tasks').insert({
        title: trimmedTitle,
        department_id: newTaskDepartmentId,
        priority: newTaskPriority,
        status: 'pending',
        due_at: dueAtIso,
      });

      if (insertErr) {
        setCreateTaskError(insertErr.message);
        return;
      }

      resetCreateForm();
      setIsCreateModalOpen(false);
      setFeedbackNotice({
        type: 'success',
        message: isAr
          ? `تم إنشاء المهمة "${trimmedTitle}" بنجاح بحالة pending لتفعيل سير العمل HOTEL_M3_TASK_ASSIGNMENT.`
          : `Task "${trimmedTitle}" created with status "pending" and queued for HOTEL_M3_TASK_ASSIGNMENT.`,
      });

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCreateTaskError(msg);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleOpenAssignModal = (task: TaskItem) => {
    setSelectedTask(task);
    // Suggest candidate with lowest workload in same department if any
    const candidates = employeeWorkloads.filter(
      (w) => !task.departmentId || w.employee.departmentId === task.departmentId
    );
    candidates.sort((a, b) => a.activeTasksCount - b.activeTasksCount);
    if (candidates.length > 0) {
      setSelectedStaffId(candidates[0].employee.id);
    } else if (employeeWorkloads.length > 0) {
      setSelectedStaffId(employeeWorkloads[0].employee.id);
    } else {
      setSelectedStaffId('');
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedTask || !selectedStaffId || isSubmitting) return;

    setIsSubmitting(true);
    setFeedbackNotice(null);
    try {
      const result = await onAssignTask(selectedTask.id, selectedStaffId);

      if (result.isPendingIntegration) {
        setFeedbackNotice({
          type: 'pending',
          message: isAr
            ? 'وظيفة الربط workflow-gateway في انتظار النشر على Supabase. تم تعطيل العملية لعدم تزييف النجاح.'
            : 'Edge Function workflow-gateway is pending integration. Action safely prevented per contract rules.',
        });
      } else if (!result.success) {
        setFeedbackNotice({
          type: 'error',
          message: result.error || (isAr ? 'فشلت عملية الإسناد' : 'Failed to assign task'),
        });
      } else {
        setFeedbackNotice({
          type: 'success',
          message: isAr
            ? `تم إسناد المهمة ${selectedTask.taskNumber} بنجاح.`
            : `Task ${selectedTask.taskNumber} assigned successfully via workflow gateway.`,
        });
        setSelectedTask(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackNotice({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message={isAr ? 'جاري تحميل المهام غير المسندة وأعباء الموظفين...' : 'Loading unassigned tasks and workloads...'} />;
  }

  if (error) {
    return (
      <ErrorState
        title={isAr ? 'تعذر تحميل بيانات الإسناد' : 'Failed to load assignment data'}
        message={error}
        onRetry={onRefresh}
      />
    );
  }

  const unassignedColumns: Column<TaskItem>[] = [
    {
      key: 'taskNumber',
      header: isAr ? 'رقم المهمة' : 'Task #',
      render: (t) => (
        <span className="font-mono text-xs font-bold text-[#16324F]">
          {t.taskNumber}
        </span>
      ),
    },
    {
      key: 'title',
      header: isAr ? 'تفاصيل المهمة والموقع' : 'Title & Location',
      render: (t) => (
        <div>
          <div className="font-semibold text-xs text-[#263445]">
            {isAr ? (t.titleAr || t.title) : t.title}
          </div>
          <div className="text-[11px] text-[#64748B] flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-[#267C83] font-medium">{t.departmentName}</span>
            {t.roomNumber && (
              <span className="font-bold text-[#16324F]">
                • {isAr ? `غرفة ${t.roomNumber}` : `Room ${t.roomNumber}`}
              </span>
            )}
            {t.guestRequestId && t.requestCategory && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-[10px] font-semibold">
                M2: {t.requestCategory}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'priority',
      header: isAr ? 'الأولوية' : 'Priority',
      render: (t) => <StatusBadge status={t.priority} locale={isAr ? 'ar' : 'en'} size="sm" />,
    },
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      render: (t) => <StatusBadge status={t.status} locale={isAr ? 'ar' : 'en'} size="sm" />,
    },
    {
      key: 'actions',
      header: isAr ? 'إجراء الإسناد' : 'Assignment',
      align: 'end',
      render: (t) => (
        <button
          type="button"
          onClick={() => handleOpenAssignModal(t)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16324F] text-white hover:bg-[#16324F]/90 transition-colors cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>{isAr ? 'إسناد المهمة' : 'Assign Task'}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Contract & Automated Workflows Notice */}
      <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#16324F] text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#16324F]">
                {isAr
                  ? 'إدارة وتوزيع المهام (Task Assignment — Admin Control)'
                  : 'Task Assignment Management & Automated Workflow Engine'}
              </h3>
              <p className="text-xs text-[#64748B]">
                {isAr
                  ? 'المهام تنشأ آلياً عبر سير العمل HOTEL_M3_TASK_CREATION وتسند عبر HOTEL_M3_TASK_ASSIGNMENT'
                  : 'Tasks are created automatically by HOTEL_M3_TASK_CREATION and assigned via HOTEL_M3_TASK_ASSIGNMENT'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {isAdminUser && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#16324F] text-white hover:bg-[#16324F]/90 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إنشاء مهمة جديدة' : 'Create New Task'}</span>
              </button>
            )}

            <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-full">
              Gateway: assign_task
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#64748B]">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="font-bold text-[#16324F] block mb-0.5">
              1. Creation Automation (HOTEL_M3_TASK_CREATION)
            </span>
            <span>
              {isAr
                ? 'ينشئ المهام في جدول tasks فور تصنيف طلب الضيف (Module 2) أو تسجيل خروج غرفة (Module 4).'
                : 'Inserts unassigned tasks upon M2 request classification or M4 room check-out event.'}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="font-bold text-[#16324F] block mb-0.5">
              2. Assignment via Gateway (HOTEL_M3_TASK_ASSIGNMENT)
            </span>
            <span>
              {isAr
                ? 'يتم الإسناد من خلال استدعاء دالة Edge Function باسم workflow-gateway لمنع الاتصال المباشر من المتصفح.'
                : 'Assignments invoke the workflow-gateway Edge Function. Direct browser-to-n8n calls are strictly forbidden.'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackNotice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
            feedbackNotice.type === 'success'
              ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]'
              : feedbackNotice.type === 'pending'
              ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
              : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626]'
          }`}
        >
          {feedbackNotice.type === 'success' && <Check className="w-4 h-4 shrink-0 text-[#16A34A] mt-0.5" />}
          {feedbackNotice.type === 'pending' && <Clock className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />}
          {feedbackNotice.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />}
          <div className="font-medium leading-relaxed">{feedbackNotice.message}</div>
        </div>
      )}

      {/* Unassigned Tasks Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#16324F]">
              {isAr ? 'المهام غير المسندة (Unassigned Tasks)' : 'Unassigned Tasks Queue'}
            </h3>
            <p className="text-xs text-[#64748B]">
              {isAr
                ? 'مهام في جدول tasks بدون موظف مسند (assigned_employee_id is null)'
                : 'Tasks in Supabase where assigned_employee_id is null'}
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-[#FEF3C7] text-[#D97706] rounded-full">
            {unassignedTasks.length} {isAr ? 'مهمة' : 'unassigned'}
          </span>
        </div>

        <DataTable
          columns={unassignedColumns}
          data={unassignedTasks}
          keyExtractor={(t) => t.id}
          emptyTitle={isAr ? 'لا توجد مهام غير مسندة' : 'No unassigned tasks'}
          emptyDescription={
            isAr
              ? 'جميع المهام المنشأة في النظام تم إسنادها بنجاح إلى الموظفين.'
              : 'All current tasks have been assigned to active staff members.'
          }
        />
      </div>

      {/* Active Staff Workloads Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#16324F] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#267C83]" />
              <span>{isAr ? 'أعباء عمل الموظفين النشطين (Employee Workloads)' : 'Active Employee Workloads'}</span>
            </h4>
            <p className="text-[11px] text-[#64748B]">
              {isAr
                ? 'عدد المهام المفتوحة (Assigned + In Progress) لكل موظف نشط في الفندق'
                : 'Current open task count (Assigned + In Progress) per active employee'}
            </p>
          </div>
          <span className="text-xs text-[#64748B]">
            {employeeWorkloads.length} {isAr ? 'موظفين نشطين' : 'active staff'}
          </span>
        </div>

        {employeeWorkloads.length === 0 ? (
          <div className="p-6 bg-white rounded-xl border border-[#E2E8F0] text-center text-xs text-[#64748B]">
            {isAr ? 'لم يتم العثور على موظفين نشطين في جدول employees.' : 'No active employees found in the employees table.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {employeeWorkloads.map(({ employee, activeTasksCount }) => (
              <div
                key={employee.id}
                className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs text-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#16324F] truncate">{employee.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTasksCount === 0
                          ? 'bg-[#DCFCE7] text-[#16A34A]'
                          : activeTasksCount < 3
                          ? 'bg-[#EFF6FF] text-[#2563EB]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}
                    >
                      {activeTasksCount} {isAr ? 'مهام مفتوحة' : 'active'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B] block mt-0.5">{employee.role}</span>
                </div>
                <div className="pt-2 border-t border-[#F1F5F9] text-[10px] text-[#94A3B8]">
                  {employee.departmentName}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Assignment Modal via Gateway */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={isAr ? 'إسناد المهمة عبر الـ Gateway' : 'Assign Task via Gateway'}
          subtitle={`Task #${selectedTask.taskNumber} • ${selectedTask.departmentName}`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                disabled={!selectedStaffId || isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#16324F] text-white hover:bg-[#16324F]/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تأكيد الإسناد' : 'Execute Assignment'}</span>
                  </>
                )}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs space-y-1">
              <div className="font-semibold text-[#16324F]">
                {isAr ? (selectedTask.titleAr || selectedTask.title) : selectedTask.title}
              </div>
              <div className="text-[#64748B]">
                {selectedTask.description || (isAr ? 'لا يوجد وصف إضافي.' : 'No description provided.')}
              </div>
            </div>

            <SelectField
              label={isAr ? 'اختر الموظف المراد إسناد المهمة له' : 'Select Target Employee'}
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              options={employeeWorkloads.map(({ employee, activeTasksCount }) => ({
                value: employee.id,
                label: `${employee.name} (${employee.role} - ${employee.departmentName}) • ${activeTasksCount} active tasks`,
              }))}
            />

            <div className="p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE] text-xs text-[#1E40AF] flex items-start gap-2">
              <Layers className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? 'يقوم النظام باستدعاء Edge Function: workflow-gateway لتنفيذ الإسناد وتسجيله في سجل التدقيق.'
                  : 'Invokes Edge Function workflow-gateway {action: "assign_task", payload: {task_id, employee_id}}.'}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Create New Task Modal (Admin Only) */}
      {isAdminUser && isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          title={isAr ? 'إنشاء مهمة جديدة' : 'Create New Task'}
          subtitle={
            isAr
              ? 'إضافة مهمة جديدة بحالة pending لتفعيل الإسناد التلقائي عبر n8n'
              : 'Insert a pending task into public.tasks to trigger HOTEL_M3_TASK_ASSIGNMENT'
          }
          footer={
            <>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                disabled={isCreatingTask}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-50 cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void handleCreateTask()}
                disabled={isCreatingTask}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#16324F] text-white hover:bg-[#16324F]/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isCreatingTask ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isAr ? 'جاري الإنشاء...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إنشاء المهمة' : 'Create Task'}</span>
                  </>
                )}
              </button>
            </>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateTask();
            }}
            className="space-y-4"
            noValidate
          >
            {createTaskError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{createTaskError}</span>
              </div>
            )}

            <FormInput
              label={isAr ? 'عنوان المهمة' : 'Title'}
              name="title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder={isAr ? 'مثال: إصلاح التكييف في غرفة 204' : 'e.g., Fix AC in Room 204'}
              required
              disabled={isCreatingTask}
            />

            <SelectField
              label={isAr ? 'القسم' : 'Department'}
              value={newTaskDepartmentId}
              onChange={setNewTaskDepartmentId}
              placeholder={
                isLoadingDepartments
                  ? isAr
                    ? 'جاري تحميل الأقسام...'
                    : 'Loading departments...'
                  : isAr
                  ? 'اختر القسم...'
                  : 'Select department...'
              }
              options={departmentsList.map((dept) => ({
                value: dept.id,
                label: dept.name,
              }))}
              disabled={isCreatingTask || isLoadingDepartments}
            />

            <SelectField
              label={isAr ? 'الأولوية' : 'Priority'}
              value={newTaskPriority}
              onChange={(val) => setNewTaskPriority(val as TaskPriority)}
              options={[
                { value: 'urgent', label: isAr ? 'عاجلة (urgent)' : 'Urgent (urgent)' },
                { value: 'high', label: isAr ? 'عالية (high)' : 'High (high)' },
                { value: 'normal', label: isAr ? 'عادية (normal)' : 'Normal (normal)' },
                { value: 'low', label: isAr ? 'منخفضة (low)' : 'Low (low)' },
              ]}
              disabled={isCreatingTask}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[#263445]">
                  {isAr ? 'مهلة الـ SLA (موعد الاستحقاق)' : 'SLA Deadline'}
                  <span className="text-[#DC2626] ms-1">*</span>
                </label>

                <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    disabled={isCreatingTask}
                    onClick={() => setSlaMode('minutes')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      slaMode === 'minutes'
                        ? 'bg-[#16324F] text-white shadow-xs'
                        : 'text-[#64748B] hover:text-[#16324F]'
                    }`}
                  >
                    {isAr ? 'دقائق من الآن' : 'Minutes from now'}
                  </button>
                  <button
                    type="button"
                    disabled={isCreatingTask}
                    onClick={() => setSlaMode('datetime')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      slaMode === 'datetime'
                        ? 'bg-[#16324F] text-white shadow-xs'
                        : 'text-[#64748B] hover:text-[#16324F]'
                    }`}
                  >
                    {isAr ? 'تاريخ ووقت محدد' : 'Date & time'}
                  </button>
                </div>
              </div>

              {slaMode === 'minutes' ? (
                <FormInput
                  type="number"
                  name="slaMinutes"
                  value={slaMinutes}
                  onChange={(e) => setSlaMinutes(e.target.value)}
                  placeholder="60"
                  required
                  disabled={isCreatingTask}
                  helperText={
                    isAr
                      ? 'سيتم حساب due_at بإضافة هذه الدقائق إلى الوقت الحالي.'
                      : 'Computes due_at as current time plus the specified minutes.'
                  }
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <input
                    type="datetime-local"
                    name="slaDatetime"
                    value={slaDatetime}
                    onChange={(e) => setSlaDatetime(e.target.value)}
                    required
                    disabled={isCreatingTask}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3.5 py-2 text-sm text-[#263445] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#267C83]/30 focus:border-[#267C83] transition-colors disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-[#64748B]">
                    {isAr
                      ? 'اختر التاريخ والوقت الدقيق لموعد الاستحقاق (due_at).'
                      : 'Select the exact local date and time for due_at.'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE] text-xs text-[#1E40AF] flex items-start gap-2">
              <Layers className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? 'عند الحفظ يتم إدراج صف في public.tasks بحالة pending لتشغيل Supabase Webhook الخاص بـ HOTEL_M3_TASK_ASSIGNMENT.'
                  : 'Submits an INSERT to public.tasks with status "pending", triggering the HOTEL_M3_TASK_ASSIGNMENT DB webhook.'}
              </span>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TaskAssignmentPage;

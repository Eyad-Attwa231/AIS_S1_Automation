import React, { useState } from 'react';
import {
  CheckCircle2,
  Play,
  RotateCcw,
  Ban,
  Clock,
  Layers,
  Calendar,
  AlertCircle,
  LayoutGrid,
  List,
  ArrowRight,
  User,
  Building2,
} from 'lucide-react';
import { StatusBadge } from '../components/shared/StatusBadge';
import { SlaBadge } from '../components/shared/SlaBadge';
import { DataTable } from '../components/shared/DataTable';
import type { Column } from '../components/shared/DataTable';
import { FilterBar } from '../components/shared/FilterBar';
import { SearchInput } from '../components/shared/SearchInput';
import { SelectField } from '../components/shared/SelectField';
import { Modal } from '../components/shared/Modal';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import type { StaffMember, TaskItem } from '../types/module3';
import { TASK_STATUSES, TASK_PRIORITIES, TASK_STATUS_CONFIG } from '../types/task';
import type { TaskStatus } from '../types/task';

type TaskViewMode = 'table' | 'kanban';

const VIEW_MODE_STORAGE_KEY = 'hms_m3_tasks_view_mode';

const getSentimentBadgeClass = (sentiment: string): string => {
  const normalized = sentiment.toLowerCase();
  if (normalized === 'negative') {
    return 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]';
  }
  if (normalized === 'positive') {
    return 'bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]';
  }
  return 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]';
};

interface KanbanColumnConfig {
  status: TaskStatus;
  nextStatus: TaskStatus | null;
  nextLabelEn: string;
  nextLabelAr: string;
  buttonClassName: string;
}

const KANBAN_COLUMNS: readonly KanbanColumnConfig[] = [
  {
    status: 'pending',
    nextStatus: 'assigned',
    nextLabelEn: 'Move to Assigned',
    nextLabelAr: 'نقل إلى تم الإسناد',
    buttonClassName:
      'border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]',
  },
  {
    status: 'assigned',
    nextStatus: 'in_progress',
    nextLabelEn: 'Move to In Progress',
    nextLabelAr: 'بدء التنفيذ',
    buttonClassName:
      'border-[#93C5FD] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE]',
  },
  {
    status: 'in_progress',
    nextStatus: 'completed',
    nextLabelEn: 'Move to Completed',
    nextLabelAr: 'تحديد كمكتملة',
    buttonClassName:
      'border-[#86EFAC] bg-[#DCFCE7] text-[#16A34A] hover:bg-[#BBF7D0]',
  },
  {
    status: 'completed',
    nextStatus: null,
    nextLabelEn: '',
    nextLabelAr: '',
    buttonClassName: '',
  },
] as const;

export interface MyTasksPageProps {
  tasks: TaskItem[];
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  selectedTask?: TaskItem | null;
  onSelectTask: (task: TaskItem | null) => void;
  currentUser?: StaffMember;
  isAdmin?: boolean;
  isAr?: boolean;
}

export const MyTasksPage: React.FC<MyTasksPageProps> = ({
  tasks,
  onUpdateTaskStatus,
  selectedTask,
  onSelectTask,
  currentUser,
  isAdmin,
  isAr = false,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [cancelDialogTask, setCancelDialogTask] = useState<TaskItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<TaskViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return saved === 'kanban' || saved === 'table' ? saved : 'table';
    } catch {
      return 'table';
    }
  });

  const handleViewModeChange = (mode: TaskViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore storage write errors
    }
  };

  // Scope tasks by role: Admin sees all; Staff see only their own assigned tasks
  const isUserAdmin =
    isAdmin ??
    (currentUser
      ? currentUser.role === 'admin' || currentUser.role === 'System Administrator'
      : true);

  const scopedTasks =
    isUserAdmin || !currentUser
      ? tasks
      : tasks.filter(
          (t) =>
            t.assignedEmployeeId === currentUser.id ||
            t.assignedTo?.id === currentUser.id ||
            t.assignedTo?.profileId === currentUser.profileId
        );

  // Filter tasks
  const filteredTasks = scopedTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.taskNumber.toLowerCase().includes(search.toLowerCase()) ||
      (task.roomNumber && task.roomNumber.includes(search)) ||
      task.description.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ? true : task.status === statusFilter;

    const matchesPriority =
      priorityFilter === 'ALL' ? true : task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!selectedTask || isUpdating) return;
    if (newStatus === 'cancelled') {
      setCancelDialogTask(selectedTask);
      return;
    }

    setUpdateError(null);
    setIsUpdating(true);
    try {
      await onUpdateTaskStatus(selectedTask.id, newStatus);
      // update local reference
      onSelectTask({
        ...selectedTask,
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : selectedTask.completedAt,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUpdateError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAdvanceStage = async (task: TaskItem, nextStatus: TaskStatus) => {
    if (updatingTaskId || isUpdating) return;
    setUpdateError(null);
    setUpdatingTaskId(task.id);
    try {
      await onUpdateTaskStatus(task.id, nextStatus);
      if (selectedTask?.id === task.id) {
        onSelectTask({
          ...selectedTask,
          status: nextStatus,
          completedAt:
            nextStatus === 'completed' ? new Date().toISOString() : selectedTask.completedAt,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUpdateError(msg);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelDialogTask || isUpdating) return;
    setUpdateError(null);
    setIsUpdating(true);
    try {
      await onUpdateTaskStatus(cancelDialogTask.id, 'cancelled');
      if (selectedTask?.id === cancelDialogTask.id) {
        onSelectTask({ ...selectedTask, status: 'cancelled' });
      }
      setCancelDialogTask(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUpdateError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: Column<TaskItem>[] = [
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
      header: isAr ? 'المهمة والموقع' : 'Title & Location',
      render: (t) => (
        <div>
          <div className="font-semibold text-xs text-[#263445]">
            {isAr ? (t.titleAr || t.title) : t.title}
          </div>
          <div className="text-[11px] text-[#64748B] flex flex-wrap items-center gap-1.5 mt-0.5">
            <span>{t.departmentName}</span>
            {t.roomNumber && (
              <span className="font-bold text-[#16324F]">
                • {isAr ? `غرفة ${t.roomNumber}` : `Room ${t.roomNumber}`}
              </span>
            )}
            {t.requestCategory && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-[10px] font-semibold">
                M2: {t.requestCategory}
              </span>
            )}
            {t.sentiment && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold ${getSentimentBadgeClass(
                  t.sentiment
                )}`}
              >
                {t.sentiment}
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
      header: isAr ? 'الحالة الحالية' : 'Status',
      render: (t) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={t.status} locale={isAr ? 'ar' : 'en'} size="sm" />
          {t.isOverdue && t.status !== 'completed' && t.status !== 'cancelled' && (
            <span className="text-[10px] text-[#DC2626] font-bold">
              {isAr ? 'متأخرة عن وقت الـ SLA' : 'Overdue SLA'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'dueAt',
      header: isAr ? 'موعد الاستحقاق' : 'Due Date',
      render: (t) => (
        <div className="flex flex-col gap-1 items-start">
          <div className="text-xs text-[#64748B] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>
              {new Date(t.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <SlaBadge
            dueAt={t.dueAt}
            createdAt={t.createdAt}
            status={t.status}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      header: isAr ? 'إجراءات' : 'Actions',
      align: 'end',
      render: (t) => (
        <button
          type="button"
          onClick={() => onSelectTask(t)}
          className="text-xs font-semibold text-[#16324F] hover:bg-[#16324F] hover:text-white px-3 py-1.5 rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer"
        >
          {isAr ? 'التفاصيل وتحديث الحالة' : 'Details & Status'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <FilterBar
        onReset={() => {
          setSearch('');
          setStatusFilter('ALL');
          setPriorityFilter('ALL');
        }}
        resetLabel={isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={isAr ? 'بحث برقم المهمة أو الغرفة أو العنوان...' : 'Search by task #, room, or title...'}
          className="w-72"
        />

        <SelectField
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'ALL', label: isAr ? 'كل الحالات' : 'All Statuses' },
            ...TASK_STATUSES.map((st) => ({ value: st, label: st })),
          ]}
          className="w-40"
        />

        <SelectField
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: 'ALL', label: isAr ? 'كل الأولويات' : 'All Priorities' },
            ...TASK_PRIORITIES.map((pr) => ({ value: pr, label: pr })),
          ]}
          className="w-40"
        />
      </FilterBar>

      {/* View Toggle & Scope Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <span className="font-semibold text-[#16324F]">
            {filteredTasks.length}{' '}
            {isAr ? 'مهمة' : filteredTasks.length === 1 ? 'task' : 'tasks'}
          </span>
          {currentUser && (
            <>
              <span>•</span>
              <span>
                {isUserAdmin
                  ? isAr
                    ? 'عرض جميع المهام (Admin)'
                    : 'All tasks (Admin)'
                  : isAr
                  ? 'مهامك المسندة فقط (Staff)'
                  : 'Assigned to you (Staff)'}
              </span>
            </>
          )}
        </div>

        <div
          role="group"
          aria-label={isAr ? 'تبديل طريقة العرض' : 'View mode toggle'}
          className="inline-flex items-center bg-white p-1 rounded-xl border border-[#E2E8F0] shadow-xs"
        >
          <button
            type="button"
            onClick={() => handleViewModeChange('table')}
            aria-pressed={viewMode === 'table'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'table'
                ? 'bg-[#16324F] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#16324F] hover:bg-[#F8FAFC]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>{isAr ? 'عرض الجدول' : 'Table View'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewModeChange('kanban')}
            aria-pressed={viewMode === 'kanban'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-[#16324F] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#16324F] hover:bg-[#F8FAFC]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{isAr ? 'عرض كانبان' : 'Kanban View'}</span>
          </button>
        </div>
      </div>

      {/* Inline error banner for board stage transitions */}
      {updateError && !selectedTask && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      {viewMode === 'table' ? (
        /* Tasks DataTable */
        <DataTable
          columns={columns}
          data={filteredTasks}
          keyExtractor={(t) => t.id}
          emptyTitle={isAr ? 'لا توجد مهام مسندة إليك' : 'No tasks match your filters'}
          emptyDescription={
            isAr
              ? 'لا توجد مهام مسندة لك حالياً أو تطابق شروط الفلترة.'
              : 'No tasks currently assigned to you or matching current filter criteria.'
          }
        />
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const statusMeta = TASK_STATUS_CONFIG[col.status];
            const columnTasks = filteredTasks.filter((t) => t.status === col.status);

            return (
              <div
                key={col.status}
                className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-col min-h-[260px]"
              >
                {/* Column Header */}
                <div className="px-3.5 py-3 bg-white rounded-t-xl border-b border-[#E2E8F0] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: statusMeta.dotColor }}
                      aria-hidden="true"
                    />
                    <h3 className="text-xs font-bold text-[#16324F] truncate">
                      {isAr ? statusMeta.labelAr : statusMeta.labelEn}
                    </h3>
                  </div>

                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0"
                    style={{
                      backgroundColor: statusMeta.bgColor,
                      color: statusMeta.textColor,
                      borderColor: statusMeta.borderColor,
                    }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="p-3 space-y-3 flex-1">
                  {columnTasks.length === 0 ? (
                    <div className="h-32 rounded-lg border border-dashed border-[#CBD5E1] flex items-center justify-center p-4 text-center text-xs text-[#94A3B8]">
                      {isAr ? 'لا توجد مهام في هذه المرحلة' : 'No tasks in this stage'}
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const isCardUpdating = updatingTaskId === task.id;
                      const assigneeName =
                        task.assignedTo?.name || (isAr ? 'غير مسند' : 'Unassigned');

                      return (
                        <div
                          key={task.id}
                          className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-xs hover:border-[#CBD5E1] hover:shadow-sm transition-all space-y-3"
                        >
                          {/* Top Meta Strip */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-[11px] font-bold text-[#16324F]">
                                {task.taskNumber}
                              </span>
                              {task.roomNumber && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#16324F]">
                                  {isAr ? `غرفة ${task.roomNumber}` : `Rm ${task.roomNumber}`}
                                </span>
                              )}
                            </div>

                            <StatusBadge
                              status={task.priority}
                              locale={isAr ? 'ar' : 'en'}
                              size="sm"
                            />
                          </div>

                          {/* Task Title (click opens details modal) */}
                          <button
                            type="button"
                            onClick={() => onSelectTask(task)}
                            className="text-start w-full group cursor-pointer"
                          >
                            <h4 className="text-xs font-bold text-[#263445] group-hover:text-[#267C83] transition-colors line-clamp-2">
                              {isAr ? task.titleAr || task.title : task.title}
                            </h4>
                          </button>

                          {/* Module 2 Classification & Sentiment Badges */}
                          {(task.requestCategory || task.sentiment) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {task.requestCategory && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-[10px] font-semibold">
                                  M2: {task.requestCategory}
                                </span>
                              )}
                              {task.sentiment && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold ${getSentimentBadgeClass(
                                    task.sentiment
                                  )}`}
                                >
                                  {task.sentiment}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Department & Assignee */}
                          <div className="space-y-1.5 text-[11px] text-[#64748B]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                              <span className="truncate">{task.departmentName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <User className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                              <span className="truncate font-medium text-[#263445]">
                                {assigneeName}
                              </span>
                            </div>
                          </div>

                          {/* Overdue indicator if applicable */}
                          {task.isOverdue &&
                            task.status !== 'completed' &&
                            task.status !== 'cancelled' && (
                              <div className="text-[10px] text-[#DC2626] font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>
                                  {isAr ? 'متأخرة عن وقت الـ SLA' : 'Overdue SLA'}
                                </span>
                              </div>
                            )}

                          {/* Card Footer: One-click Advance Button + Details */}
                          <div className="pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                            {col.nextStatus ? (
                              <button
                                type="button"
                                disabled={isCardUpdating || isUpdating}
                                onClick={() =>
                                  col.nextStatus && handleAdvanceStage(task, col.nextStatus)
                                }
                                className={`flex-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 ${col.buttonClassName}`}
                              >
                                {isCardUpdating ? (
                                  <span className="inline-block w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <span>
                                      {isAr ? col.nextLabelAr : col.nextLabelEn}
                                    </span>
                                    <ArrowRight className="w-3 h-3 rtl:rotate-180 shrink-0" />
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>{isAr ? 'مكتملة' : 'Done'}</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => onSelectTask(task)}
                              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#16324F] hover:bg-[#F8FAFC] transition-colors cursor-pointer shrink-0"
                            >
                              {isAr ? 'التفاصيل' : 'Details'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Details & Status Update Modal with Real Timeline */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => {
            onSelectTask(null);
            setUpdateError(null);
          }}
          title={`${isAr ? 'تفاصيل المهمة' : 'Task Details'} • ${selectedTask.taskNumber}`}
          subtitle={`${selectedTask.departmentName} • ${selectedTask.sourceModule || 'Hotel Operations'}`}
          maxWidth="lg"
          footer={
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#64748B]">
                {isAr
                  ? 'دورة الحياة الرسمية: Pending/Assigned ➔ In Progress ➔ Completed'
                  : 'Official Status Flow: Pending/Assigned ➔ In Progress ➔ Completed'}
              </span>

              <button
                type="button"
                onClick={() => {
                  onSelectTask(null);
                  setUpdateError(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Error banner if update fails */}
            {updateError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            {/* Top metadata strip */}
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge status={selectedTask.status} locale={isAr ? 'ar' : 'en'} size="md" />
                <StatusBadge status={selectedTask.priority} locale={isAr ? 'ar' : 'en'} size="md" />
                <SlaBadge
                  dueAt={selectedTask.dueAt}
                  createdAt={selectedTask.createdAt}
                  status={selectedTask.status}
                  size="md"
                />
              </div>

              {selectedTask.roomNumber && (
                <div className="text-xs font-bold text-[#16324F] bg-white px-3 py-1 rounded-md border border-[#E2E8F0]">
                  {isAr ? `الغرفة: ${selectedTask.roomNumber}` : `Room: #${selectedTask.roomNumber}`}
                </div>
              )}
            </div>

            {/* Task Description */}
            <div>
              <h4 className="text-sm font-bold text-[#16324F] mb-1">
                {isAr ? (selectedTask.titleAr || selectedTask.title) : selectedTask.title}
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                {selectedTask.description || (isAr ? 'لا يوجد وصف إضافي للمهمة.' : 'No detailed description provided.')}
              </p>
            </div>

            {/* Origin & Module 2 AI Classification Summary */}
            <div className="p-3.5 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] text-xs text-[#1E40AF] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{isAr ? 'المصدر: ' : 'Integration Origin: '}</span>
                  <span>{selectedTask.sourceModule}</span>
                  {selectedTask.guestRequestId && (
                    <span className="font-mono bg-white px-2 py-0.5 rounded text-[11px] border border-[#BFDBFE]">
                      Ref ID: {selectedTask.guestRequestId}
                    </span>
                  )}
                </div>
                <Layers className="w-4 h-4 text-[#2563EB] shrink-0" />
              </div>

              {(selectedTask.aiSummary || selectedTask.requestCategory || selectedTask.sentiment) && (
                <div className="pt-2.5 border-t border-[#BFDBFE] space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[#1E3A8A]">
                    {isAr ? 'تصنيف وتحليل الذكاء الاصطناعي (Module 2)' : 'Module 2 AI Classification & Analysis'}
                  </div>
                  {selectedTask.aiSummary && (
                    <div className="bg-white/90 rounded-lg border border-[#BFDBFE] px-3 py-2 text-[#1E293B]">
                      <span className="font-semibold text-[#1E40AF]">
                        {isAr ? 'ملخص AI: ' : 'AI Summary: '}
                      </span>
                      <span>{selectedTask.aiSummary}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedTask.requestCategory && (
                      <span className="inline-flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-md border border-[#BFDBFE] text-[11px] font-semibold text-[#1E40AF]">
                        <span>{isAr ? 'التصنيف:' : 'Category:'}</span>
                        <span className="uppercase">{selectedTask.requestCategory}</span>
                      </span>
                    )}
                    {selectedTask.sentiment && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${getSentimentBadgeClass(
                          selectedTask.sentiment
                        )}`}
                      >
                        <span>{isAr ? 'تحليل المشاعر:' : 'Sentiment:'}</span>
                        <span className="capitalize">{selectedTask.sentiment}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status Update Interaction Controls */}
            <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] space-y-3">
              <label className="text-xs font-bold text-[#16324F] block">
                {isAr ? 'تحديث حالة المهمة (Allowed Lifecycle Transitions):' : 'Update Task Status:'}
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={selectedTask.status === 'assigned' || isUpdating}
                  onClick={() => handleStatusChange('assigned')}
                  className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Assigned</span>
                </button>

                <button
                  type="button"
                  disabled={selectedTask.status === 'in_progress' || isUpdating}
                  onClick={() => handleStatusChange('in_progress')}
                  className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-[#93C5FD] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE] disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>In Progress</span>
                </button>

                <button
                  type="button"
                  disabled={selectedTask.status === 'completed' || isUpdating}
                  onClick={() => handleStatusChange('completed')}
                  className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-[#86EFAC] bg-[#DCFCE7] text-[#16A34A] hover:bg-[#BBF7D0] disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Completed</span>
                </button>

                <button
                  type="button"
                  disabled={selectedTask.status === 'cancelled' || isUpdating}
                  onClick={() => handleStatusChange('cancelled')}
                  className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-[#FCA5A5] bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA] disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>

            {/* REAL Task Lifecycle Timeline (Built strictly from real DB fields) */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <h5 className="text-xs font-bold text-[#16324F] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                <span>{isAr ? 'سجل دورة حياة المهمة (Real Database Lifecycle)' : 'Task Lifecycle Timeline'}</span>
              </h5>

              <div className="space-y-2">
                {/* Event 1: Creation */}
                <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#16324F] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{isAr ? 'إنشاء المهمة في النظام' : 'Task Created in Database'}</span>
                    </div>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">
                      {isAr ? 'سُجلت عبر ' : 'Triggered via '}{selectedTask.sourceModule}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748B] font-mono">
                    {new Date(selectedTask.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                {/* Event 2: SLA Target Deadline */}
                <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#16324F] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>{isAr ? 'مهلة الإنجاز المحددة (SLA Target)' : 'SLA Target Due Time'}</span>
                    </div>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">
                      {selectedTask.isOverdue && selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' ? (
                        <span className="text-[#DC2626] font-semibold">{isAr ? 'تجاوزت وقت الـ SLA' : 'SLA Breached'}</span>
                      ) : (
                        <span>{isAr ? 'ضمن المهلة المحددة' : 'Within SLA target window'}</span>
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748B] font-mono">
                    {new Date(selectedTask.dueAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                {/* Event 3: Completion Timestamp (if exists) */}
                {selectedTask.completedAt && (
                  <div className="p-2.5 bg-[#DCFCE7]/40 rounded-lg border border-[#86EFAC] text-xs flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#16A34A] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isAr ? 'تم إكمال المهمة وتوثيق الوقت' : 'Task Completed (completed_at stamped)'}</span>
                      </div>
                      <span className="text-[11px] text-[#166534] block mt-0.5">
                        {isAr ? 'تم تحديث حالة المهمة بنجاح في قاعدة البيانات' : 'Status updated to completed in Supabase'}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#166534] font-mono">
                      {new Date(selectedTask.completedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog for Destructive Action (Cancel Task) */}
      <ConfirmDialog
        isOpen={!!cancelDialogTask}
        onClose={() => setCancelDialogTask(null)}
        onConfirm={handleConfirmCancel}
        title={isAr ? 'إلغاء المهمة' : 'Cancel Task Confirmation'}
        message={
          isAr
            ? `هل أنت متأكد من رغبتك في إلغاء المهمة (${cancelDialogTask?.taskNumber})؟ سيتم تحديث حالتها في قاعدة البيانات إلى cancelled.`
            : `Are you sure you want to cancel task (${cancelDialogTask?.taskNumber})? This will set its database status to cancelled.`
        }
        confirmLabel={isAr ? 'تأكيد الإلغاء' : 'Confirm Cancellation'}
        cancelLabel={isAr ? 'تراجع' : 'Keep Active'}
        isDestructive={true}
        isLoading={isUpdating}
      />
    </div>
  );
};

export default MyTasksPage;

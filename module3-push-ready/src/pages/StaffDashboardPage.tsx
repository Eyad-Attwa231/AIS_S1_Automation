import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  ArrowRight,
  Flame,
  XCircle,
  Layers,
  Download,
  BarChart3,
  Calendar,
  Award,
} from 'lucide-react';
import { StatCard } from '../components/shared/StatCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { SlaBadge } from '../components/shared/SlaBadge';
import { DataTable } from '../components/shared/DataTable';
import type { Column } from '../components/shared/DataTable';
import { authService } from '../services/authService';
import type { TaskItem, StaffMember, NotificationItem } from '../types/module3';

type PerformanceDateRange = 'today' | '7d' | '30d';

interface DepartmentPerformanceRow {
  department: string;
  totalCompleted: number;
  avgResolutionMs: number | null;
  avgResolutionFormatted: string;
  slaCompliantCount: number;
  slaEvaluatedCount: number;
  slaComplianceRate: number;
}

const formatResolutionTime = (avgMs: number | null, isAr: boolean): string => {
  if (avgMs === null || Number.isNaN(avgMs)) {
    return '—';
  }
  if (avgMs < 60_000) {
    return isAr ? 'أقل من دقيقة' : '< 1m';
  }
  const totalMinutes = Math.round(avgMs / 60_000);
  if (totalMinutes < 60) {
    return isAr ? `${totalMinutes} دقيقة` : `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins > 0) {
    return isAr ? `${hours} س ${mins} د` : `${hours}h ${mins}m`;
  }
  return isAr ? `${hours} س` : `${hours}h`;
};

const escapeCsvCell = (value: string | number | null | undefined): string => {
  const str = value == null ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const extractTaskMetricsFields = (task: TaskItem, isAr: boolean) => {
  const raw = task as unknown as Record<string, unknown>;
  const createdAt =
    task.createdAt || (typeof raw.created_at === 'string' ? raw.created_at : '');
  const completedAt =
    task.completedAt || (typeof raw.completed_at === 'string' ? raw.completed_at : null);
  const dueAt =
    task.dueAt || (typeof raw.due_at === 'string' ? raw.due_at : '');
  const department =
    task.departmentName ||
    (typeof raw.department === 'string' ? raw.department : '') ||
    (isAr ? 'العمليات العامة' : 'General Operations');

  return { createdAt, completedAt, dueAt, department };
};

export interface StaffDashboardPageProps {
  currentUser: StaffMember;
  tasks: TaskItem[];
  notifications: NotificationItem[];
  onViewTask: (task: TaskItem) => void;
  onNavigateToTasks: () => void;
  onNavigateToNotifications?: () => void;
  isAdmin?: boolean;
  isAr?: boolean;
}

export const StaffDashboardPage: React.FC<StaffDashboardPageProps> = ({
  currentUser,
  tasks,
  notifications,
  onViewTask,
  onNavigateToTasks,
  onNavigateToNotifications,
  isAdmin,
  isAr = false,
}) => {
  const [authIsAdmin, setAuthIsAdmin] = useState(false);
  const [dateRange, setDateRange] = useState<PerformanceDateRange>('30d');
  const [referenceNow, setReferenceNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (isAdmin !== undefined) return;
    let isMounted = true;
    authService.getInitialAuthState().then((state) => {
      if (isMounted) {
        setAuthIsAdmin(state.role === 'admin');
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setReferenceNow(Date.now());
    }, 60_000);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Real stats calculated directly from tasks
  const roleStr = (currentUser.role || '').toLowerCase();
  const isUserAdmin =
    isAdmin !== undefined
      ? isAdmin
      : authIsAdmin ||
        roleStr === 'admin' ||
        roleStr === 'system administrator' ||
        roleStr === 'administrator';

  const filteredTasks = isUserAdmin
    ? tasks
    : tasks.filter(
        (t) =>
          t.assignedEmployeeId === currentUser.id ||
          t.assignedTo?.id === currentUser.id ||
          t.assignedTo?.profileId === currentUser.profileId
      );

  const totalCount = filteredTasks.length;
  const pendingCount = filteredTasks.filter((t) => t.status === 'pending').length;
  const assignedCount = filteredTasks.filter((t) => t.status === 'assigned').length;
  const inProgressCount = filteredTasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = filteredTasks.filter((t) => t.status === 'completed').length;
  const cancelledCount = filteredTasks.filter((t) => t.status === 'cancelled').length;
  const overdueCount = filteredTasks.filter(
    (t) => t.isOverdue && t.status !== 'completed' && t.status !== 'cancelled'
  ).length;

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  // Real completion rate calculation (no fabricated metrics)
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Recent task activity: latest open or updated tasks
  const recentTasks = filteredTasks.slice(0, 6);

  // Admin-only per-department performance metrics
  const performanceRows = useMemo<DepartmentPerformanceRow[]>(() => {
    if (!isUserAdmin) return [];

    const nowDate = new Date(referenceNow);
    let cutoffMs: number;
    if (dateRange === 'today') {
      cutoffMs = new Date(
        nowDate.getFullYear(),
        nowDate.getMonth(),
        nowDate.getDate(),
        0,
        0,
        0,
        0
      ).getTime();
    } else if (dateRange === '7d') {
      cutoffMs = referenceNow - 7 * 24 * 60 * 60 * 1000;
    } else {
      cutoffMs = referenceNow - 30 * 24 * 60 * 60 * 1000;
    }

    const deptBuckets = new Map<
      string,
      {
        totalCompleted: number;
        resolutionSumMs: number;
        resolutionCount: number;
        slaCompliantCount: number;
        slaEvaluatedCount: number;
      }
    >();

    for (const task of tasks) {
      if (String(task.status || '').toLowerCase() !== 'completed') {
        continue;
      }

      const { createdAt, completedAt, dueAt, department } = extractTaskMetricsFields(
        task,
        isAr
      );

      const filterTimestamp = completedAt || createdAt;
      const filterMs = filterTimestamp ? new Date(filterTimestamp).getTime() : NaN;
      if (Number.isNaN(filterMs) || filterMs < cutoffMs) {
        continue;
      }

      const bucket = deptBuckets.get(department) ?? {
        totalCompleted: 0,
        resolutionSumMs: 0,
        resolutionCount: 0,
        slaCompliantCount: 0,
        slaEvaluatedCount: 0,
      };

      bucket.totalCompleted += 1;

      const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
      const completedMs = completedAt ? new Date(completedAt).getTime() : NaN;
      const dueMs = dueAt ? new Date(dueAt).getTime() : NaN;

      if (!Number.isNaN(createdMs) && !Number.isNaN(completedMs)) {
        bucket.resolutionSumMs += Math.max(0, completedMs - createdMs);
        bucket.resolutionCount += 1;
      }

      if (!Number.isNaN(completedMs) && !Number.isNaN(dueMs)) {
        bucket.slaEvaluatedCount += 1;
        if (completedMs <= dueMs) {
          bucket.slaCompliantCount += 1;
        }
      }

      deptBuckets.set(department, bucket);
    }

    const rows: DepartmentPerformanceRow[] = [];
    for (const [department, bucket] of deptBuckets.entries()) {
      const avgResolutionMs =
        bucket.resolutionCount > 0
          ? bucket.resolutionSumMs / bucket.resolutionCount
          : null;
      const slaComplianceRate =
        bucket.totalCompleted > 0
          ? Math.round((bucket.slaCompliantCount / bucket.totalCompleted) * 100)
          : 0;

      rows.push({
        department,
        totalCompleted: bucket.totalCompleted,
        avgResolutionMs,
        avgResolutionFormatted: formatResolutionTime(avgResolutionMs, isAr),
        slaCompliantCount: bucket.slaCompliantCount,
        slaEvaluatedCount: bucket.slaEvaluatedCount,
        slaComplianceRate,
      });
    }

    rows.sort(
      (a, b) =>
        b.totalCompleted - a.totalCompleted ||
        a.department.localeCompare(b.department)
    );
    return rows;
  }, [tasks, dateRange, referenceNow, isAr, isUserAdmin]);

  const handleExportCsv = () => {
    if (performanceRows.length === 0) return;

    const headers = [
      'Department',
      'Average Resolution Time',
      'SLA Compliance Rate (%)',
      'Total Tasks Completed',
    ];

    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...performanceRows.map((row) =>
        [
          row.department,
          row.avgResolutionFormatted,
          `${row.slaComplianceRate}%`,
          row.totalCompleted,
        ]
          .map(escapeCsvCell)
          .join(',')
      ),
    ];

    const csvContent = `\uFEFF${csvLines.join('\r\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `department-performance-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const performanceColumns: Column<DepartmentPerformanceRow>[] = [
    {
      key: 'department',
      header: isAr ? 'القسم' : 'Department',
      render: (row) => (
        <span className="font-semibold text-xs text-[#16324F]">
          {row.department}
        </span>
      ),
    },
    {
      key: 'avgResolutionFormatted',
      header: isAr ? 'متوسط وقت الإنجاز' : 'Avg. Resolution Time',
      render: (row) => (
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#263445]">
          <Clock className="w-3.5 h-3.5 text-[#64748B]" />
          <span>{row.avgResolutionFormatted}</span>
        </div>
      ),
    },
    {
      key: 'slaComplianceRate',
      header: isAr ? 'نسبة الالتزام بالـ SLA' : 'SLA Compliance Rate',
      render: (row) => {
        const badgeStyle =
          row.slaComplianceRate >= 80
            ? 'bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]'
            : row.slaComplianceRate >= 50
            ? 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]'
            : 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]';

        const barColor =
          row.slaComplianceRate >= 80
            ? 'bg-[#16A34A]'
            : row.slaComplianceRate >= 50
            ? 'bg-[#D97706]'
            : 'bg-[#DC2626]';

        return (
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}
            >
              <Award className="w-3 h-3 shrink-0" />
              <span>{row.slaComplianceRate}%</span>
            </span>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-20 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.min(100, Math.max(0, row.slaComplianceRate))}%` }}
                />
              </div>
              <span className="text-[11px] text-[#64748B]">
                ({row.slaCompliantCount}/{row.totalCompleted})
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'totalCompleted',
      header: isAr ? 'إجمالي المهام المكتملة' : 'Total Tasks Completed',
      align: 'end',
      render: (row) => (
        <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#16324F] text-xs font-bold">
          {row.totalCompleted}
        </span>
      ),
    },
  ];

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
      header: isAr ? 'تفاصيل المهمة' : 'Task Details',
      render: (t) => (
        <div>
          <div className="font-semibold text-xs text-[#263445]">
            {isAr ? (t.titleAr || t.title) : t.title}
          </div>
          <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
            <span>{t.departmentName}</span>
            {t.roomNumber && (
              <span className="font-semibold text-[#16324F]">
                • {isAr ? `غرفة ${t.roomNumber}` : `Room ${t.roomNumber}`}
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
      key: 'sla',
      header: isAr ? 'مهلة الـ SLA' : 'SLA',
      render: (t) => (
        <SlaBadge
          dueAt={t.dueAt}
          createdAt={t.createdAt}
          status={t.status}
        />
      ),
    },
    {
      key: 'actions',
      header: isAr ? 'إجراء' : 'Action',
      align: 'end',
      render: (t) => (
        <button
          type="button"
          onClick={() => onViewTask(t)}
          className="text-xs font-semibold text-[#267C83] hover:text-[#16324F] px-2.5 py-1 rounded-md border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
        >
          {isAr ? 'عرض وتحديث' : 'View & Update'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* SLA Alert Banner if overdue tasks exist */}
      {overdueCount > 0 && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#991B1B]">
                {isAr
                  ? `تنبيه تأخير: يوجد ${overdueCount} مهمة تجاوزت مهلة الـ SLA المحددة!`
                  : `SLA Alert: ${overdueCount} task(s) currently past SLA deadline!`}
              </h4>
              <p className="text-xs text-[#B91C1C] mt-0.5">
                {isAr
                  ? 'يتم رصد المهام المتأخرة لتصعيدها آلياً عبر سير العمل HOTEL_M3_NOTIFICATIONS_ESCALATION.'
                  : 'Overdue tasks are monitored for automated escalation via workflow HOTEL_M3_NOTIFICATIONS_ESCALATION.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToTasks}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors shrink-0 cursor-pointer"
          >
            {isAr ? 'عرض المهام المتأخرة' : 'View Delayed'}
          </button>
        </div>
      )}

      {/* Real Stat Cards Grid covering all M3 contract states */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title={isAr ? 'إجمالي المهام' : 'Total Tasks'}
          value={totalCount}
          subtitle={isAr ? 'في نطاق صلاحيتك' : 'In your scope'}
          icon={<Layers className="w-4 h-4" />}
          accentColor="#16324F"
        />

        <StatCard
          title={isAr ? 'قيد الانتظار' : 'Pending'}
          value={pendingCount}
          subtitle={isAr ? 'في انتظار الإسناد' : 'Awaiting assignment'}
          icon={<Clock className="w-4 h-4" />}
          accentColor="#D97706"
        />

        <StatCard
          title={isAr ? 'تم الإسناد' : 'Assigned'}
          value={assignedCount}
          subtitle={isAr ? 'جاهزة للبدء' : 'Ready to start'}
          icon={<Zap className="w-4 h-4" />}
          accentColor="#2563EB"
        />

        <StatCard
          title={isAr ? 'قيد التنفيذ' : 'In Progress'}
          value={inProgressCount}
          subtitle={isAr ? 'جاري العمل عليها' : 'Currently active'}
          icon={<Flame className="w-4 h-4" />}
          accentColor="#1D4ED8"
        />

        <StatCard
          title={isAr ? 'المكتملة' : 'Completed'}
          value={completedCount}
          subtitle={isAr ? 'تم إنجازها بنجاح' : 'Successfully done'}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="#16A34A"
        />

        <StatCard
          title={isAr ? 'الملغية' : 'Cancelled'}
          value={cancelledCount}
          subtitle={isAr ? 'تم إلغاؤها' : 'Cancelled tasks'}
          icon={<XCircle className="w-4 h-4" />}
          accentColor="#DC2626"
        />
      </div>

      {/* Staff Activity & Summary Card */}
      <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#267C83]/10 text-[#267C83] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#16324F]">
                {isAr ? 'ملخص النشاط وحالة النظام' : 'Staff Activity & System Overview'}
              </h3>
              <p className="text-xs text-[#64748B]">
                {isAr
                  ? `الحساب: ${currentUser.name} (${currentUser.role}) • القسم: ${currentUser.departmentName || 'General'}`
                  : `Logged in as: ${currentUser.name} (${currentUser.role}) • Department: ${currentUser.departmentName || 'General'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadNotifsCount > 0 && onNavigateToNotifications && (
              <button
                type="button"
                onClick={onNavigateToNotifications}
                className="text-xs font-semibold px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] rounded-full transition-colors cursor-pointer"
              >
                {unreadNotifsCount} {isAr ? 'إشعار غير مقروء' : 'unread notifications'}
              </button>
            )}

            <span className="text-xs font-semibold px-2.5 py-1 bg-[#F1F5F9] text-[#16324F] rounded-full">
              {isAr ? `نسبة الإنجاز: ${completionRate}%` : `Completion: ${completionRate}%`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="text-xs text-[#64748B] block mb-1">
              {isAr ? 'المهام النشطة حالياً' : 'Active Open Tasks'}
            </span>
            <span className="text-xl font-bold text-[#16324F]">
              {assignedCount + inProgressCount}
            </span>
            <span className="text-[10px] text-[#2563EB] block mt-0.5">
              {isAr ? 'Assigned + In Progress' : 'Assigned + In Progress'}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="text-xs text-[#64748B] block mb-1">
              {isAr ? 'المهام المتأخرة عن الوقت' : 'Overdue SLA Breaches'}
            </span>
            <span className={`text-xl font-bold ${overdueCount > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
              {overdueCount}
            </span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">
              {isAr ? 'due_at < now()' : 'due_at < now()'}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="text-xs text-[#64748B] block mb-1">
              {isAr ? 'إجمالي المنجز بنجاح' : 'Resolved & Completed'}
            </span>
            <span className="text-xl font-bold text-[#16A34A]">
              {completedCount}
            </span>
            <span className="text-[10px] text-[#16A34A] block mt-0.5">
              {isAr ? 'completed_at مسجل' : 'completed_at timestamped'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin-only Department Performance Section */}
      {isUserAdmin && (
        <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#16324F]/10 text-[#16324F] flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#16324F]">
                  {isAr ? 'الأداء حسب القسم' : 'Performance'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {isAr
                    ? 'متوسط وقت الإنجاز ونسبة الالتزام بمهلة الـ SLA وإجمالي المهام المكتملة لكل قسم'
                    : 'Department average resolution time, SLA compliance rate, and completed task volume'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] p-0.5 bg-[#F8FAFC]"
                role="group"
                aria-label={isAr ? 'فلتر الفترة الزمنية' : 'Date range filter'}
              >
                <Calendar className="w-3.5 h-3.5 text-[#64748B] ms-2 me-1 shrink-0" />
                {(
                  [
                    { key: 'today', labelEn: 'Today', labelAr: 'اليوم' },
                    { key: '7d', labelEn: '7 days', labelAr: '7 أيام' },
                    { key: '30d', labelEn: '30 days', labelAr: '30 يوم' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setDateRange(option.key);
                      setReferenceNow(Date.now());
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      dateRange === option.key
                        ? 'bg-white text-[#16324F] shadow-xs'
                        : 'text-[#64748B] hover:text-[#16324F]'
                    }`}
                  >
                    {isAr ? option.labelAr : option.labelEn}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={performanceRows.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16324F] text-white hover:bg-[#16324F]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          <DataTable
            columns={performanceColumns}
            data={performanceRows}
            keyExtractor={(row) => row.department}
            emptyTitle={
              isAr
                ? 'لا توجد بيانات أداء في هذه الفترة'
                : 'No completed tasks in this period'
            }
            emptyDescription={
              isAr
                ? 'لم يتم العثور على مهام مكتملة ضمن النطاق الزمني المحدد. جرّب اختيار فترة أخرى مثل 7 أيام أو 30 يوم.'
                : 'No completed tasks match the selected date range. Try selecting 7 days or 30 days.'
            }
            className="shadow-none"
          />
        </div>
      )}

      {/* Recent Task Activity Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#16324F]">
            {isAr ? 'آخر النشاطات والمهام الفورية' : 'Recent Task Activity'}
          </h3>
          <button
            type="button"
            onClick={onNavigateToTasks}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#267C83] hover:text-[#16324F] transition-colors cursor-pointer"
          >
            <span>{isAr ? 'عرض كافة المهام' : 'View all tasks'}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>

        <DataTable
          columns={columns}
          data={recentTasks}
          keyExtractor={(t) => t.id}
          emptyTitle={isAr ? 'لا توجد مهام مسجلة' : 'No tasks found'}
          emptyDescription={
            isAr
              ? 'لم يتم إنشاء أي مهام في النظام حتى الآن. ستظهر هنا فور إنشائها عبر طلبات النزلاء أو تنظيف الغرف.'
              : 'No tasks currently exist in the database. Tasks will populate here as requests or checkout events occur.'
          }
        />
      </div>
    </div>
  );
};

export default StaffDashboardPage;

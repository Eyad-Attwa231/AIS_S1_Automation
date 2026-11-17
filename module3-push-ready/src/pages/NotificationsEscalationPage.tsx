import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Flame,
  Check,
  RotateCw,
} from 'lucide-react';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';
import { LoadingState } from '../components/shared/LoadingState';
import { ErrorState } from '../components/shared/ErrorState';
import type { NotificationItem, TaskItem } from '../types/module3';

export interface NotificationsEscalationPageProps {
  notifications: NotificationItem[];
  overdueTasks: TaskItem[];
  urgentTasks: TaskItem[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onMarkAllAsRead?: () => Promise<void>;
  onViewTask: (task: TaskItem) => void;
  isAr?: boolean;
}

export const NotificationsEscalationPage: React.FC<NotificationsEscalationPageProps> = ({
  notifications,
  overdueTasks,
  urgentTasks,
  isLoading = false,
  error = null,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onViewTask,
  isAr = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    try {
      setProcessingId(id);
      await onMarkAsRead(id);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <LoadingState message={isAr ? 'جاري تحميل الإشعارات ومهام التصعيد...' : 'Loading notifications and escalation queues...'} />;
  }

  if (error) {
    return (
      <ErrorState
        title={isAr ? 'تعذر تحميل الإشعارات' : 'Failed to load notifications'}
        message={error}
        onRetry={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Integration Banner: Escalation Workflow */}
      <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#92400E]">
                {isAr ? 'نظام التصعيد التلقائي (Automated Escalation Engine)' : 'Automated Task Escalation Engine'}
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D]">
                Pending integration
              </span>
            </div>
            <p className="text-xs text-[#B45309] mt-0.5">
              {isAr
                ? 'مجدول عبر n8n باسم HOTEL_M3_NOTIFICATIONS_ESCALATION كل 15 دقيقة لفحص المهام المتأخرة وتصعيدها للمشرفين.'
                : 'Scheduled via n8n (HOTEL_M3_NOTIFICATIONS_ESCALATION) every 15 minutes to monitor SLA breaches.'}
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#FCD34D] text-[#92400E] hover:bg-[#FEF3C7] transition-colors cursor-pointer shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isAr ? 'تحديث السجل' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {/* Critical SLA Overdue & Urgent Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Overdue Tasks Alert Panel */}
        <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#16324F]">
                {isAr ? 'مهام متأخرة تجاوزت الـ SLA' : 'SLA Overdue Escalation Queue'}
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626]">
              {overdueTasks.length} {isAr ? 'متأخرة' : 'overdue'}
            </span>
          </div>

          {overdueTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#64748B]">
              <CheckCircle2 className="w-7 h-7 text-[#16A34A] mx-auto mb-1.5 opacity-80" />
              <span>{isAr ? 'ممتاز! لا توجد أي مهام متأخرة حالياً.' : 'Great! No tasks currently past their SLA deadline.'}</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {overdueTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-[#FEF2F2] rounded-lg border border-[#FCA5A5] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-[#991B1B]">{t.taskNumber}</span>
                      <StatusBadge status={t.status} size="sm" locale={isAr ? 'ar' : 'en'} />
                      <StatusBadge status={t.priority} size="sm" locale={isAr ? 'ar' : 'en'} />
                    </div>
                    <p className="font-semibold text-[#16324F] truncate">{isAr ? (t.titleAr || t.title) : t.title}</p>
                    <span className="text-[11px] text-[#DC2626]">
                      {isAr ? 'المطلوب إنجازها: ' : 'Due: '}
                      {new Date(t.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewTask(t)}
                    className="p-1.5 rounded-lg bg-white border border-[#FCA5A5] text-[#991B1B] hover:bg-[#FEE2E2] transition-colors cursor-pointer shrink-0"
                    title={isAr ? 'عرض المهمة' : 'View Task'}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Tasks Queue Panel */}
        <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#16324F]">
                {isAr ? 'المهام ذات الأولوية العاجلة (Urgent Priority)' : 'Urgent Priority Action Items'}
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
              {urgentTasks.length} {isAr ? 'عاجل' : 'urgent'}
            </span>
          </div>

          {urgentTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#64748B]">
              <span>{isAr ? 'لا توجد مهام ذات أولوية قصوى مفتوحة حالياً.' : 'No open urgent priority tasks at the moment.'}</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {urgentTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-[#16324F]">{t.taskNumber}</span>
                      <StatusBadge status={t.status} size="sm" locale={isAr ? 'ar' : 'en'} />
                      <StatusBadge status={t.priority} size="sm" locale={isAr ? 'ar' : 'en'} />
                    </div>
                    <p className="font-semibold text-[#16324F] truncate">{isAr ? (t.titleAr || t.title) : t.title}</p>
                    <span className="text-[11px] text-[#64748B]">
                      {t.departmentName} {t.roomNumber ? `• Room ${t.roomNumber}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewTask(t)}
                    className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#16324F] hover:bg-[#F1F5F9] transition-colors cursor-pointer shrink-0"
                    title={isAr ? 'عرض المهمة' : 'View Task'}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notifications List Section */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#16324F] text-white flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#16324F]">
                {isAr ? 'سجل الإشعارات والتنبيهات المباشرة' : 'Direct Staff Notifications'}
              </h3>
              <p className="text-xs text-[#64748B]">
                {isAr ? 'الإشعارات الرسمية المخزنة في جدول notifications' : 'Real-time database alerts stored in the notifications table'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#E2E8F0] p-0.5 bg-[#F8FAFC]">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === 'all'
                    ? 'bg-white text-[#16324F] shadow-xs'
                    : 'text-[#64748B] hover:text-[#16324F]'
                }`}
              >
                {isAr ? 'الكل' : 'All'} ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === 'unread'
                    ? 'bg-white text-[#16324F] shadow-xs'
                    : 'text-[#64748B] hover:text-[#16324F]'
                }`}
              >
                {isAr ? 'غير مقروءة' : 'Unread'} ({unreadCount})
              </button>
            </div>

            {onMarkAllAsRead && unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] transition-colors cursor-pointer"
              >
                {isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              </button>
            )}
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={isAr ? 'لا توجد إشعارات' : 'No notifications'}
              description={
                filter === 'unread'
                  ? isAr
                    ? 'لقد قرأت جميع الإشعارات الواردة.'
                    : 'You have read all pending notifications.'
                  : isAr
                  ? 'لم يتم إرسال أي إشعارات لك حتى الآن.'
                  : 'No notification records exist for your account yet.'
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                  !n.isRead ? 'bg-[#EFF6FF]/30' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      !n.isRead ? 'bg-[#2563EB]' : 'bg-transparent'
                    }`}
                  />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#16324F]">
                      {isAr ? (n.titleAr || n.title) : n.title}
                    </h4>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                      {isAr ? (n.messageAr || n.message) : n.message}
                    </p>
                    <span className="text-[10px] text-[#94A3B8] block mt-1.5 font-mono">
                      {new Date(n.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    type="button"
                    disabled={processingId === n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-white border border-[#BFDBFE] px-2.5 py-1 rounded-lg hover:bg-[#EFF6FF] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تمت القراءة' : 'Mark Read'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsEscalationPage;

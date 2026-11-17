import React, { useEffect, useRef } from 'react';
import {
  Info,
  AlertTriangle,
  AlertOctagon,
  ClipboardList,
  X,
  ExternalLink,
} from 'lucide-react';
import type { TaskItem } from '../../types/module3';

export type ToastVariant = 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
  category?: 'notification' | 'task_assigned';
  taskId?: string;
  taskFallback?: TaskItem;
  notificationId?: string;
  createdAt: number;
}

const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE_TOASTS = 4;

const ERROR_KEYWORDS = [
  'breach',
  'escalation',
  'escalated',
  'error',
  'critical',
  'failed',
  'urgent sla',
  'تصعيد',
  'خرق',
  'خطأ',
];

const WARNING_KEYWORDS = [
  'warning',
  'overdue',
  'delayed',
  'sla',
  'urgent',
  'تحذير',
  'متأخر',
  'عاجل',
];

const VARIANT_STYLES: Record<
  ToastVariant,
  {
    container: string;
    iconWrapper: string;
    title: string;
    message: string;
    action: string;
    accentBar: string;
  }
> = {
  info: {
    container: 'bg-[#EFF6FF] border-[#BFDBFE] shadow-lg shadow-[#2563EB]/10',
    iconWrapper: 'bg-white text-[#2563EB] border border-[#BFDBFE]',
    title: 'text-[#16324F]',
    message: 'text-[#1E40AF]',
    action: 'text-[#2563EB]',
    accentBar: 'bg-[#2563EB]',
  },
  warning: {
    container: 'bg-[#FEF3C7] border-[#FCD34D] shadow-lg shadow-[#D97706]/10',
    iconWrapper: 'bg-white text-[#D97706] border border-[#FCD34D]',
    title: 'text-[#92400E]',
    message: 'text-[#B45309]',
    action: 'text-[#D97706]',
    accentBar: 'bg-[#D97706]',
  },
  error: {
    container: 'bg-[#FEE2E2] border-[#FCA5A5] shadow-lg shadow-[#DC2626]/10',
    iconWrapper: 'bg-white text-[#DC2626] border border-[#FCA5A5]',
    title: 'text-[#991B1B]',
    message: 'text-[#B91C1C]',
    action: 'text-[#DC2626]',
    accentBar: 'bg-[#DC2626]',
  },
};

/**
 * Determine toast visual variant from a Supabase `notifications` row.
 * Uses `row.type` when provided, and falls back to title/message keyword matching
 * because the base `notifications` schema only stores title and message.
 */
export function resolveNotificationToastVariant(
  row: Record<string, unknown>
): ToastVariant {
  const rawType = typeof row.type === 'string' ? row.type.trim().toLowerCase() : '';

  if (
    rawType === 'error' ||
    rawType === 'escalation' ||
    rawType === 'danger' ||
    rawType === 'critical' ||
    rawType === 'urgent'
  ) {
    return 'error';
  }

  if (
    rawType === 'warning' ||
    rawType === 'warn' ||
    rawType === 'overdue' ||
    rawType === 'delayed'
  ) {
    return 'warning';
  }

  if (rawType === 'info' || rawType === 'assignment' || rawType === 'normal') {
    return 'info';
  }

  const combined = `${String(row.title ?? '')} ${String(row.message ?? '')}`.toLowerCase();

  if (ERROR_KEYWORDS.some((kw) => combined.includes(kw))) {
    return 'error';
  }

  if (WARNING_KEYWORDS.some((kw) => combined.includes(kw))) {
    return 'warning';
  }

  return 'info';
}

/**
 * Resolve the TaskItem associated with a toast by explicit taskId,
 * embedded UUID / taskNumber references, or matching task title.
 */
export function findRelevantTask(
  toast: ToastItem,
  tasks: TaskItem[],
  unassignedTasks: TaskItem[] = []
): TaskItem | null {
  const pool = [...tasks, ...unassignedTasks];

  if (toast.taskId) {
    const byId = pool.find((t) => t.id === toast.taskId);
    if (byId) return byId;
  }

  const text = `${toast.title} ${toast.message}`;

  const uuidMatches = text.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
  );
  if (uuidMatches) {
    for (const uuid of uuidMatches) {
      const normalized = uuid.toLowerCase();
      const byUuid = pool.find((t) => t.id.toLowerCase() === normalized);
      if (byUuid) return byUuid;
    }
  }

  const taskNumberMatches = text.match(/TSK-[A-Z0-9]{4,8}/gi);
  if (taskNumberMatches) {
    for (const taskNum of taskNumberMatches) {
      const normalized = taskNum.toUpperCase();
      const byTaskNumber = pool.find(
        (t) => t.taskNumber.toUpperCase() === normalized
      );
      if (byTaskNumber) return byTaskNumber;
    }
  }

  const lowerText = text.toLowerCase();
  const byTitle = pool.find((t) => {
    const titleEn = t.title.trim().toLowerCase();
    const titleAr = t.titleAr?.trim().toLowerCase();
    return (
      (titleEn.length > 0 && lowerText.includes(titleEn)) ||
      (titleAr && titleAr.length > 0 && lowerText.includes(titleAr))
    );
  });
  if (byTitle) return byTitle;

  return toast.taskFallback ?? null;
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  onToastClick: (toast: ToastItem) => void;
  isAr: boolean;
}

const ToastCard: React.FC<ToastCardProps> = ({
  toast,
  onDismiss,
  onToastClick,
  isAr,
}) => {
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      dismissRef.current(toast.id);
    }, AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast.id]);

  const style = VARIANT_STYLES[toast.variant];

  const renderIcon = () => {
    if (toast.category === 'task_assigned') {
      return <ClipboardList className="w-4 h-4" />;
    }
    if (toast.variant === 'error') {
      return <AlertOctagon className="w-4 h-4" />;
    }
    if (toast.variant === 'warning') {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return <Info className="w-4 h-4" />;
  };

  const handleActivate = () => {
    onToastClick(toast);
    onDismiss(toast.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
      className={`pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 transition-all hover:brightness-98 cursor-pointer animate-toast-slide-in ${style.container}`}
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
    >
      <div className={`absolute inset-y-0 start-0 w-1 ${style.accentBar}`} />

      <div className="flex items-start gap-3 ps-1">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${style.iconWrapper}`}
        >
          {renderIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-xs font-bold leading-snug ${style.title}`}>
              {toast.title}
            </h4>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
              }}
              className="p-0.5 rounded-md text-[#64748B] hover:text-[#16324F] hover:bg-white/70 transition-colors cursor-pointer shrink-0"
              aria-label={isAr ? 'إغلاق الإشعار' : 'Dismiss notification'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {toast.message && (
            <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${style.message}`}>
              {toast.message}
            </p>
          )}

          <div
            className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${style.action}`}
          >
            <ExternalLink className="w-3 h-3" />
            <span>{isAr ? 'اضغط لعرض المهمة' : 'Click to view task'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onToastClick: (toast: ToastItem) => void;
  isAr?: boolean;
}

/**
 * Top-right stackable toast overlay displaying up to 4 live notifications.
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onToastClick,
  isAr = false,
}) => {
  const visibleToasts = toasts.slice(0, MAX_VISIBLE_TOASTS);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0"
      aria-label={isAr ? 'التنبيهات الفورية' : 'Real-time notifications'}
    >
      {visibleToasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onToastClick={onToastClick}
          isAr={isAr}
        />
      ))}
    </div>
  );
};

export default ToastContainer;

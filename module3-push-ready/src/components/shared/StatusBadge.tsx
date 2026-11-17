import React from 'react';
import type { TaskStatus } from '../../types/task';
import { TASK_STATUS_CONFIG } from '../../types/task';

export interface StatusBadgeProps {
  status: TaskStatus | string;
  locale?: 'en' | 'ar';
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

// Global extended colors from 02_Shared_Contract.md
const EXTENDED_STATUS_MAP: Record<
  string,
  { labelEn: string; labelAr: string; textColor: string; bgColor: string; borderColor: string; dotColor: string }
> = {
  // Green (#16A34A): completed, confirmed, ready, resolved, available, checked_out
  completed: { labelEn: 'Completed', labelAr: 'مكتملة', textColor: '#16A34A', bgColor: '#DCFCE7', borderColor: '#86EFAC', dotColor: '#16A34A' },
  confirmed: { labelEn: 'Confirmed', labelAr: 'مؤكد', textColor: '#16A34A', bgColor: '#DCFCE7', borderColor: '#86EFAC', dotColor: '#16A34A' },
  ready: { labelEn: 'Ready', labelAr: 'جاهزة', textColor: '#16A34A', bgColor: '#DCFCE7', borderColor: '#86EFAC', dotColor: '#16A34A' },
  resolved: { labelEn: 'Resolved', labelAr: 'تم الحل', textColor: '#16A34A', bgColor: '#DCFCE7', borderColor: '#86EFAC', dotColor: '#16A34A' },
  available: { labelEn: 'Available', labelAr: 'متاحة', textColor: '#16A34A', bgColor: '#DCFCE7', borderColor: '#86EFAC', dotColor: '#16A34A' },
  checked_out: { labelEn: 'Checked Out', labelAr: 'تمت المغادرة', textColor: '#16A34A', bgColor: '#DCFCE7', borderColor: '#86EFAC', dotColor: '#16A34A' },

  // Amber (#D97706): pending, new
  pending: { labelEn: 'Pending', labelAr: 'قيد الانتظار', textColor: '#D97706', bgColor: '#FEF3C7', borderColor: '#FCD34D', dotColor: '#D97706' },
  new: { labelEn: 'New', labelAr: 'جديد', textColor: '#D97706', bgColor: '#FEF3C7', borderColor: '#FCD34D', dotColor: '#D97706' },

  // Blue (#2563EB): in_progress, processing, assigned, classified, cleaning, checked_in
  in_progress: { labelEn: 'In Progress', labelAr: 'قيد التنفيذ', textColor: '#1D4ED8', bgColor: '#DBEAFE', borderColor: '#93C5FD', dotColor: '#1D4ED8' },
  processing: { labelEn: 'Processing', labelAr: 'قيد المعالجة', textColor: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', dotColor: '#2563EB' },
  assigned: { labelEn: 'Assigned', labelAr: 'تم الإسناد', textColor: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', dotColor: '#2563EB' },
  classified: { labelEn: 'Classified', labelAr: 'تم التصنيف', textColor: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', dotColor: '#2563EB' },
  cleaning: { labelEn: 'Cleaning', labelAr: 'جاري التنظيف', textColor: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', dotColor: '#2563EB' },
  checked_in: { labelEn: 'Checked In', labelAr: 'تم الوصول', textColor: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', dotColor: '#2563EB' },

  // Priorities
  urgent: { labelEn: 'Urgent', labelAr: 'عاجل', textColor: '#DC2626', bgColor: '#FEE2E2', borderColor: '#FCA5A5', dotColor: '#DC2626' },
  high: { labelEn: 'High', labelAr: 'مرتفع', textColor: '#D97706', bgColor: '#FEF3C7', borderColor: '#FCD34D', dotColor: '#D97706' },
  normal: { labelEn: 'Normal', labelAr: 'عادي', textColor: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', dotColor: '#2563EB' },
  low: { labelEn: 'Low', labelAr: 'منخفض', textColor: '#64748B', bgColor: '#F1F5F9', borderColor: '#CBD5E1', dotColor: '#64748B' },

  // Red (#DC2626): cancelled, urgent, maintenance
  cancelled: { labelEn: 'Cancelled', labelAr: 'ملغية', textColor: '#DC2626', bgColor: '#FEE2E2', borderColor: '#FCA5A5', dotColor: '#DC2626' },
  maintenance: { labelEn: 'Maintenance', labelAr: 'صيانة', textColor: '#DC2626', bgColor: '#FEE2E2', borderColor: '#FCA5A5', dotColor: '#DC2626' },

  // Dark Amber / Orange (#C2410C): dirty
  dirty: { labelEn: 'Dirty', labelAr: 'بحاجة لتنظيف', textColor: '#C2410C', bgColor: '#FFEDD5', borderColor: '#FDBA74', dotColor: '#C2410C' },

  // Primary Navy (#16324F): occupied
  occupied: { labelEn: 'Occupied', labelAr: 'مشغولة', textColor: '#16324F', bgColor: '#E2E8F0', borderColor: '#CBD5E1', dotColor: '#16324F' },
};

const UNKNOWN_CONFIG = {
  labelEn: 'Unknown',
  labelAr: 'غير معروف',
  textColor: '#64748B',
  bgColor: '#F1F5F9',
  borderColor: '#CBD5E1',
  dotColor: '#64748B',
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  locale = 'en',
  size = 'md',
  showDot = true,
  className = '',
}) => {
  // Normalize string to match lowercase enums (e.g. "In Progress" -> "in_progress")
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const config = EXTENDED_STATUS_MAP[normalized] || TASK_STATUS_CONFIG[normalized as TaskStatus] || UNKNOWN_CONFIG;
  const label = locale === 'ar' ? config.labelAr : config.labelEn;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors border ${SIZE_CLASSES[size]} ${className}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        borderColor: config.borderColor,
      }}
      title={`Status: ${label}`}
    >
      {showDot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: config.dotColor }}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;

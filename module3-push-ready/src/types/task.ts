/**
 * Task Status definition for Hotel Management System - Module 3 (Staff & Task Management)
 * Strict requirement from 02_Shared_Contract.md:
 * Enums in DB are EXACT lowercase: pending, assigned, in_progress, completed, cancelled
 */

export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export const TASK_STATUSES: readonly TaskStatus[] = [
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export const TASK_PRIORITIES: readonly TaskPriority[] = [
  'low',
  'normal',
  'high',
  'urgent',
] as const;

export interface TaskStatusMetadata {
  key: TaskStatus;
  labelEn: string;
  labelAr: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

/**
 * Agreed status colors based on UI Standards & 02_Shared_Contract.md:
 * - Green: completed, confirmed, ready, resolved, available, checked_out (#16A34A)
 * - Amber: pending, new (#D97706)
 * - Blue: in_progress, processing, assigned, classified, cleaning, checked_in (#2563EB)
 * - Red: cancelled, urgent, maintenance (#DC2626)
 * - Orange/Amber-dark: dirty (#C2410C)
 * - Primary Navy: occupied (#16324F)
 * - Gray: unknown, inactive (#64748B)
 */
export const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusMetadata> = {
  pending: {
    key: 'pending',
    labelEn: 'Pending',
    labelAr: 'قيد الانتظار',
    textColor: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FCD34D',
    dotColor: '#D97706',
  },
  assigned: {
    key: 'assigned',
    labelEn: 'Assigned',
    labelAr: 'تم الإسناد',
    textColor: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    dotColor: '#2563EB',
  },
  in_progress: {
    key: 'in_progress',
    labelEn: 'In Progress',
    labelAr: 'قيد التنفيذ',
    textColor: '#1D4ED8',
    bgColor: '#DBEAFE',
    borderColor: '#93C5FD',
    dotColor: '#1D4ED8',
  },
  completed: {
    key: 'completed',
    labelEn: 'Completed',
    labelAr: 'مكتملة',
    textColor: '#16A34A',
    bgColor: '#DCFCE7',
    borderColor: '#86EFAC',
    dotColor: '#16A34A',
  },
  cancelled: {
    key: 'cancelled',
    labelEn: 'Cancelled',
    labelAr: 'ملغية',
    textColor: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    dotColor: '#DC2626',
  },
};

import type { TaskStatus, TaskPriority } from './task';

export interface Profile {
  id: string; // matches auth.uid()
  full_name: string;
  phone?: string;
  role: 'guest' | 'employee' | 'admin';
}

export interface StaffMember {
  id: string; // employees.id
  profileId: string;
  name: string;
  nameAr?: string;
  email?: string;
  role: string; // job_title
  departmentId: string;
  departmentName?: string;
  isActive: boolean;
  isOnDuty?: boolean;
  activeTasksCount?: number;
  phone?: string;
}

export interface Department {
  id: string;
  name: string;
  nameAr?: string;
  code?: string;
  description: string;
  descriptionAr?: string;
  managerName?: string;
  staffCount?: number;
  openTasksCount?: number;
}

export interface NotificationItem {
  id: string;
  profileId?: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  type?: 'assignment' | 'warning' | 'escalation' | 'info';
  isRead: boolean;
  createdAt: string;
}

export interface TaskLifecycleEvent {
  id: string;
  taskId: string;
  eventType: 'Created' | 'Assigned' | 'StatusChanged' | 'Escalated' | 'CommentAdded';
  fromStatus?: TaskStatus | string;
  toStatus?: TaskStatus | string;
  actor: string;
  timestamp: string;
  notes?: string;
}

export interface TaskItem {
  id: string; // UUID
  taskNumber: string;
  title: string;
  titleAr?: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  departmentId: string;
  departmentName: string;
  assignedEmployeeId?: string | null;
  assignedTo?: StaffMember;
  roomNumber?: string;
  guestRequestId?: string | null;
  sourceModule?: string;
  aiSummary?: string;
  requestCategory?: string;
  sentiment?: string;
  slaDeadlineMinutes?: number;
  createdAt: string;
  dueAt: string;
  completedAt?: string | null;
  isOverdue?: boolean;
  events?: TaskLifecycleEvent[];
}

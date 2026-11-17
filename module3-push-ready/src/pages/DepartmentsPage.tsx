import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  Phone,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { SearchInput } from '../components/shared/SearchInput';
import { EmptyState } from '../components/shared/EmptyState';
import { LoadingState } from '../components/shared/LoadingState';
import { ErrorState } from '../components/shared/ErrorState';
import { taskService } from '../services/taskService';
import { authService } from '../services/authService';
import type { Department, StaffMember } from '../types/module3';

export interface DepartmentsPageProps {
  departments: Department[];
  staffList: StaffMember[];
  currentUser?: StaffMember | null;
  userRole?: 'employee' | 'admin' | 'guest' | null;
  onDutyStatusChange?: (employeeId: string, isActive: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  isAr?: boolean;
}

export const DepartmentsPage: React.FC<DepartmentsPageProps> = ({
  departments,
  staffList,
  currentUser,
  userRole,
  onDutyStatusChange,
  isLoading = false,
  error = null,
  onRefresh,
  isAr = false,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [localStaffList, setLocalStaffList] = useState<StaffMember[]>(staffList);
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [fallbackUser, setFallbackUser] = useState<StaffMember | null>(null);
  const [fallbackRole, setFallbackRole] = useState<'employee' | 'admin' | 'guest' | null>(null);

  useEffect(() => {
    setLocalStaffList(staffList);
  }, [staffList]);

  useEffect(() => {
    if (currentUser !== undefined && userRole !== undefined) return;
    let isMounted = true;
    authService.getInitialAuthState().then((auth) => {
      if (!isMounted) return;
      setFallbackUser(auth.employee);
      setFallbackRole(auth.role);
    });
    return () => {
      isMounted = false;
    };
  }, [currentUser, userRole]);

  const effectiveUser = currentUser ?? fallbackUser;
  const effectiveRole = userRole ?? fallbackRole;
  const isAdmin =
    effectiveRole === 'admin' ||
    effectiveUser?.role === 'admin' ||
    effectiveUser?.role === 'System Administrator';

  const canToggleStaff = (staff: StaffMember): boolean => {
    if (isAdmin) return true;
    if (!effectiveUser) return false;
    return Boolean(
      (effectiveUser.id && staff.id === effectiveUser.id) ||
        (effectiveUser.profileId && staff.profileId === effectiveUser.profileId)
    );
  };

  const handleToggleDuty = async (staff: StaffMember) => {
    if (!canToggleStaff(staff) || togglingIds[staff.id]) return;

    const previousIsActive = staff.isActive;
    const nextIsActive = !previousIsActive;

    setToggleError(null);
    setTogglingIds((prev) => ({ ...prev, [staff.id]: true }));

    // Instant optimistic UI update
    setLocalStaffList((prev) =>
      prev.map((item) =>
        item.id === staff.id
          ? { ...item, isActive: nextIsActive, isOnDuty: nextIsActive }
          : item
      )
    );

    const res = await taskService.updateEmployeeDutyStatus(staff.id, nextIsActive);

    setTogglingIds((prev) => ({ ...prev, [staff.id]: false }));

    if (!res.success) {
      // Roll back on failure
      setLocalStaffList((prev) =>
        prev.map((item) =>
          item.id === staff.id
            ? { ...item, isActive: previousIsActive, isOnDuty: previousIsActive }
            : item
        )
      );
      const staffDisplayName = isAr ? (staff.nameAr || staff.name) : staff.name;
      setToggleError(
        isAr
          ? `فشل تحديث حالة الدوام للموظف (${staffDisplayName}): ${res.error || 'خطأ غير معروف'}`
          : `Failed to update duty status for ${staffDisplayName}: ${res.error || 'Unknown error'}`
      );
      return;
    }

    onDutyStatusChange?.(staff.id, nextIsActive);
  };

  const filteredStaff = localStaffList.filter((s) => {
    const matchesDept =
      selectedDeptId === 'ALL' ? true : s.departmentId === selectedDeptId;
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nameAr ? s.nameAr.includes(searchTerm) : false) ||
      s.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  if (isLoading) {
    return <LoadingState message={isAr ? 'جاري تحميل الأقسام وقوائم الموظفين...' : 'Loading departments and employee directory...'} />;
  }

  if (error) {
    return (
      <ErrorState
        title={isAr ? 'تعذر تحميل بيانات الأقسام' : 'Failed to load department directory'}
        message={error}
        onRetry={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Read-only Boundary Notice */}
      <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1E40AF]">
              {isAr
                ? 'واجهة عرض فقط (Read-Only) — إدارة وإضافة الأقسام تتبع Module 5'
                : 'Read-Only Directory: Department Management belongs to Module 5 (Admin)'}
            </h4>
            <p className="text-[11px] text-[#3B82F6] mt-0.5">
              {isAr
                ? 'تُستخدم هذه الشاشة لمراجعة الأقسام ومتابعة توافر زملاء العمل لتنسيق إسناد المهام.'
                : 'Used by Module 3 to view departments and colleague availability for task routing.'}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono bg-white px-2.5 py-1 rounded border border-[#BFDBFE] text-[#1E40AF] shrink-0">
          Module 5 Authority
        </span>
      </div>

      {/* Departments Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {departments.length === 0 ? (
          <div className="col-span-full p-6 bg-white rounded-xl border border-[#E2E8F0] text-center text-xs text-[#64748B]">
            {isAr ? 'لم يتم العثور على أقسام في قاعدة البيانات.' : 'No departments found in the departments table.'}
          </div>
        ) : (
          departments.map((dept) => {
            const isSelected = selectedDeptId === dept.id;
            return (
              <div
                key={dept.id}
                onClick={() =>
                  setSelectedDeptId((prev) => (prev === dept.id ? 'ALL' : dept.id))
                }
                className={`p-4 bg-white rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#267C83] ring-2 ring-[#267C83]/20 bg-[#F4F7FA]/40'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#16324F] text-white">
                      {dept.code || dept.name.substring(0, 3).toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-[#267C83]">
                      {dept.openTasksCount ?? 0} {isAr ? 'مهام نشطة' : 'open tasks'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#16324F] mb-1">
                    {isAr ? (dept.nameAr || dept.name) : dept.name}
                  </h4>
                  <p className="text-[11px] text-[#64748B] line-clamp-2">
                    {isAr ? (dept.descriptionAr || dept.description) : dept.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{dept.staffCount ?? 0} {isAr ? 'موظفين' : 'staff'}</span>
                  </span>

                  <span className="text-[10px] text-[#267C83] font-semibold">
                    {isSelected ? (isAr ? '✓ المختار' : 'Selected') : (isAr ? 'تصفية' : 'Filter')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Staff Directory per Department */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <h3 className="text-sm font-bold text-[#16324F]">
              {isAr ? 'دليل موظفي الفندق والزملاء' : 'Hotel Staff & Colleague Directory'}
            </h3>
            <p className="text-xs text-[#64748B]">
              {selectedDeptId === 'ALL'
                ? isAr
                  ? 'عرض جميع الموظفين في كافة الأقسام'
                  : 'Showing all employees across all departments'
                : isAr
                ? `عرض موظفي القسم المختار (${departments.find((d) => d.id === selectedDeptId)?.name || ''})`
                : `Filtered by department: ${departments.find((d) => d.id === selectedDeptId)?.name || ''}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={isAr ? 'بحث بالاسم أو المسمى الوظيفي...' : 'Search staff by name or job title...'}
              className="w-64"
            />
          </div>
        </div>

        {toggleError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#DC2626] flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{toggleError}</span>
            </div>
            <button
              type="button"
              onClick={() => setToggleError(null)}
              className="text-[11px] font-semibold underline hover:no-underline cursor-pointer shrink-0"
            >
              {isAr ? 'إغلاق' : 'Dismiss'}
            </button>
          </div>
        )}

        {filteredStaff.length === 0 ? (
          <EmptyState
            title={isAr ? 'لم يتم العثور على موظفين' : 'No staff found'}
            description={
              isAr
                ? 'لا يوجد موظفون يطابقون القسم المختار أو كلمة البحث الحالية.'
                : 'No employees match the selected department or current search keyword.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStaff.map((staff) => {
              const canToggle = canToggleStaff(staff);
              const isToggling = Boolean(togglingIds[staff.id]);
              const isSelf = Boolean(
                effectiveUser &&
                  ((effectiveUser.id && staff.id === effectiveUser.id) ||
                    (effectiveUser.profileId && staff.profileId === effectiveUser.profileId))
              );
              const staffDisplayName = isAr ? (staff.nameAr || staff.name) : staff.name;

              return (
                <div
                  key={staff.id}
                  className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 hover:bg-white hover:border-[#CBD5E1] transition-all text-xs space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-[#16324F] truncate">
                        {staffDisplayName}
                        {isSelf && (
                          <span className="ms-1.5 text-[10px] font-medium text-[#267C83]">
                            {isAr ? '(أنت)' : '(You)'}
                          </span>
                        )}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                          staff.isActive
                            ? 'bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]'
                            : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            staff.isActive ? 'bg-[#16A34A]' : 'bg-[#64748B]'
                          }`}
                          aria-hidden="true"
                        />
                        {staff.isActive
                          ? isAr
                            ? 'في الخدمة (On Duty)'
                            : 'On Duty'
                          : isAr
                          ? 'خارج الخدمة (Off Duty)'
                          : 'Off Duty'}
                      </span>
                    </div>

                    <div className="text-[#64748B] flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>{staff.role}</span>
                    </div>

                    <div className="text-[11px] text-[#267C83] font-medium mt-1">
                      {staff.departmentName}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                    {staff.phone ? (
                      <div className="text-[11px] text-[#64748B] flex items-center gap-1 font-mono truncate">
                        <Phone className="w-3 h-3 text-[#94A3B8] shrink-0" />
                        <span className="truncate">{staff.phone}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#94A3B8]">
                        {isAr ? 'حالة الدوام' : 'Duty Status'}
                      </span>
                    )}

                    <div className="flex items-center gap-2 shrink-0 ms-auto">
                      <span className="text-[10px] font-medium text-[#64748B]">
                        {isToggling
                          ? isAr
                            ? 'جاري الحفظ...'
                            : 'Saving...'
                          : staff.isActive
                          ? isAr
                            ? 'في الخدمة'
                            : 'On Duty'
                          : isAr
                          ? 'خارج الخدمة'
                          : 'Off Duty'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={staff.isActive}
                        aria-label={
                          isAr
                            ? `تبديل حالة الدوام للموظف ${staffDisplayName}`
                            : `Toggle duty status for ${staffDisplayName}`
                        }
                        title={
                          canToggle
                            ? isAr
                              ? 'تبديل بين في الخدمة / خارج الخدمة'
                              : 'Toggle On Duty / Off Duty'
                            : isAr
                            ? 'يمكن للمدير أو الموظف نفسه فقط تعديل حالة الدوام'
                            : 'Only admins or the employee themselves can change duty status'
                        }
                        disabled={!canToggle || isToggling}
                        onClick={() => handleToggleDuty(staff)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#267C83]/30 ${
                          staff.isActive ? 'bg-[#16A34A]' : 'bg-[#CBD5E1]'
                        } ${
                          canToggle && !isToggling
                            ? 'cursor-pointer'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                            staff.isActive
                              ? 'translate-x-4 rtl:-translate-x-4'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentsPage;

import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  UserCheck,
  Building2,
  Bell,
  Hotel,
  X,
} from 'lucide-react';

export type NavigationPage =
  | 'dashboard'
  | 'my-tasks'
  | 'assignment'
  | 'departments'
  | 'notifications';

export interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isAr?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  isAr = false,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationPage,
      labelEn: 'Staff Dashboard',
      labelAr: 'لوحة تحكم الموظف',
      icon: <LayoutDashboard className="w-5 h-5" />,
      badge: undefined,
    },
    {
      id: 'my-tasks' as NavigationPage,
      labelEn: 'My Assigned Tasks',
      labelAr: 'مهامي المسندة',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: '2',
    },
    {
      id: 'assignment' as NavigationPage,
      labelEn: 'Task Assignment',
      labelAr: 'إسناد وتوزيع المهام',
      icon: <UserCheck className="w-5 h-5" />,
      badge: '3',
    },
    {
      id: 'departments' as NavigationPage,
      labelEn: 'Departments & Staff',
      labelAr: 'الأقسام والموظفون',
      icon: <Building2 className="w-5 h-5" />,
      badge: undefined,
    },
    {
      id: 'notifications' as NavigationPage,
      labelEn: 'Notifications & Escalation',
      labelAr: 'الإشعارات والتصعيد',
      icon: <Bell className="w-5 h-5" />,
      badge: undefined,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#16324F] text-white select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#263445]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#267C83] flex items-center justify-center text-white shadow-xs">
            <Hotel className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide block leading-tight">
              GRAND LUXE HOTEL
            </span>
            <span className="text-[11px] text-[#64748B] block">
              {isAr ? 'موديول 3: المهام والموظفون' : 'Module 3: Staff & Tasks'}
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1 text-[#64748B] hover:text-white rounded cursor-pointer"
          aria-label="Close Sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
          {isAr ? 'القائمة الرئيسية' : 'Operations'}
        </div>

        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#267C83] text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-[#64748B]'}>
                  {item.icon}
                </span>
                <span>{isAr ? item.labelAr : item.labelEn}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white text-[#16324F]'
                      : 'bg-[#263445] text-[#94A3B8]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Status / Owner Footer */}
      <div className="p-4 border-t border-[#263445] bg-[#0E2033]/60 text-xs text-[#94A3B8]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
          <span className="text-[11px] font-medium text-white">
            {isAr ? 'متصل بنظام الفندق' : 'System Online'}
          </span>
        </div>
        <p className="text-[11px] text-[#64748B]">
          {isAr
            ? 'المسؤول: زياد وليد (Module 3)'
            : 'Module Owner: Ziad Walid'}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 fixed inset-y-0 start-0 z-30 shadow-md">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 start-0 z-50 w-72 lg:hidden transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;

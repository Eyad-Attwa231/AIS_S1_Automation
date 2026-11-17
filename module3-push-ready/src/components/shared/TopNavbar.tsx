import React, { useState } from 'react';
import { Menu, Bell, Globe, User, Check, AlertTriangle } from 'lucide-react';
import type { NotificationItem, StaffMember } from '../../types/module3';

export interface TopNavbarProps {
  title: string;
  subtitle?: string;
  onOpenMobileSidebar: () => void;
  locale: 'en' | 'ar';
  onToggleLocale: () => void;
  notifications: NotificationItem[];
  currentUser: StaffMember;
  onNotificationClick?: (notification: NotificationItem) => void;
  onViewAllNotifications?: () => void;
  onSignOut?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  title,
  subtitle,
  onOpenMobileSidebar,
  locale,
  onToggleLocale,
  notifications,
  currentUser,
  onNotificationClick,
  onViewAllNotifications,
  onSignOut,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const isAr = locale === 'ar';
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-[#64748B] hover:text-[#16324F] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#16324F] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#64748B] hidden sm:block mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Actions, Language Switch, Notifications, Staff User */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Language Switch Button */}
        <button
          type="button"
          onClick={onToggleLocale}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E8F0] text-[#16324F] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          title={isAr ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}
        >
          <Globe className="w-3.5 h-3.5 text-[#267C83]" />
          <span>{isAr ? 'English' : 'عربي'}</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            className="p-2 text-[#64748B] hover:text-[#16324F] hover:bg-[#F1F5F9] rounded-lg transition-colors relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-[#DC2626] rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Modal Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute end-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#16324F]">
                    {isAr ? 'الإشعارات والتنبيهات' : 'Notifications & Alerts'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] font-semibold rounded-full">
                    {unreadCount} {isAr ? 'جديد' : 'new'}
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#F1F5F9]">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#64748B]">
                      {isAr ? 'لا توجد إشعارات جديدة' : 'No new notifications'}
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (onNotificationClick) onNotificationClick(notif);
                          setShowNotifications(false);
                        }}
                        className={`p-3.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer flex items-start gap-3 ${
                          !notif.isRead ? 'bg-[#F4F7FA]/70' : ''
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            notif.type === 'escalation'
                              ? 'bg-[#FEE2E2] text-[#DC2626]'
                              : notif.type === 'assignment'
                              ? 'bg-[#EFF6FF] text-[#2563EB]'
                              : 'bg-[#FEF3C7] text-[#D97706]'
                          }`}
                        >
                          {notif.type === 'escalation' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#16324F] leading-tight">
                            {isAr ? notif.titleAr : notif.title}
                          </p>
                          <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-2">
                            {isAr ? notif.messageAr : notif.message}
                          </p>
                          <span className="text-[10px] text-[#94A3B8] block mt-1">
                            {notif.createdAt}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {onViewAllNotifications && (
                  <div className="p-2 border-t border-[#E2E8F0] bg-[#F8FAFC] text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        onViewAllNotifications();
                      }}
                      className="text-xs font-semibold text-[#267C83] hover:text-[#16324F] transition-colors cursor-pointer"
                    >
                      {isAr ? 'عرض كافة الإشعارات وصفحة التصعيد' : 'View All Notifications & Escalation'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Staff User Card */}
        <div className="flex items-center gap-2.5 ps-2 border-s border-[#E2E8F0]">
          <div className="w-8 h-8 rounded-full bg-[#16324F] text-white flex items-center justify-center text-xs font-bold shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-start">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#16324F] leading-none">
                {isAr ? (currentUser.nameAr || currentUser.name) : currentUser.name}
              </span>
              <span
                className="w-2 h-2 rounded-full bg-[#16A34A]"
                title="Active"
              />
            </div>
            <span className="text-[10px] text-[#64748B] block mt-0.5">
              {currentUser.role}
            </span>
          </div>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="text-xs px-2 py-1 rounded border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2]/30 transition-colors cursor-pointer"
              title={isAr ? 'تسجيل الخروج' : 'Sign out'}
            >
              {isAr ? 'خروج' : 'Logout'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;

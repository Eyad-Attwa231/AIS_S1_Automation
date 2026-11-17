import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import type { NavigationPage } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import type { NotificationItem, StaffMember } from '../../types/module3';

export interface DashboardLayoutProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  pageTitle: string;
  pageSubtitle?: string;
  locale: 'en' | 'ar';
  onToggleLocale: () => void;
  notifications: NotificationItem[];
  currentUser: StaffMember;
  onViewAllNotifications?: () => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPage,
  onNavigate,
  pageTitle,
  pageSubtitle,
  locale,
  onToggleLocale,
  notifications,
  currentUser,
  onViewAllNotifications,
  onSignOut,
  children,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const isAr = locale === 'ar';

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#263445] flex">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        isAr={isAr}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:ms-64 min-w-0 flex flex-col min-h-screen">
        <TopNavbar
          title={pageTitle}
          subtitle={pageSubtitle}
          onOpenMobileSidebar={() => setIsOpenMobile(true)}
          locale={locale}
          onToggleLocale={onToggleLocale}
          notifications={notifications}
          currentUser={currentUser}
          onViewAllNotifications={onViewAllNotifications}
          onSignOut={onSignOut}
        />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

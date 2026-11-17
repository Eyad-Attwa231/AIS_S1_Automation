import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';

export interface AccessDeniedPageProps {
  userEmail?: string;
  role?: string;
  onSignOut: () => void;
  isAr?: boolean;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  userEmail,
  role = 'guest',
  onSignOut,
  isAr = false,
}) => {
  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#FCA5A5] shadow-lg p-6 sm:p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#16324F]">
            {isAr ? 'تم رفض الوصول (Access Denied)' : 'Access Restricted'}
          </h2>
          <p className="text-xs text-[#64748B] leading-relaxed">
            {isAr
              ? `حسابك الحالي (${userEmail}) مسجل بالدور "${role}". موديول 3 مخصص فقط للموظفين (Employee) والمسؤولين (Admin).`
              : `Your account (${userEmail}) is assigned the "${role}" role. Module 3 is strictly restricted to staff and administrators.`}
          </p>
        </div>

        <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] text-xs text-[#991B1B]">
          {isAr
            ? 'بصفتك نزيلاً، يرجى استخدام بوابة النزلاء (موديول 1) للحجز والخدمات، أو موديول 2 لإرسال الطلبات.'
            : 'As a guest, please use Module 1 (Guest Experience & Booking) or Module 2 (Guest Requests & Feedback).'}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full py-2.5 px-4 rounded-xl bg-[#16324F] text-white font-semibold text-xs hover:bg-[#16324F]/90 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>{isAr ? 'تسجيل الخروج والعودة' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );
};

export default AccessDeniedPage;

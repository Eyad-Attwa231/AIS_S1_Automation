import React, { useState } from 'react';
import { Hotel, AlertCircle, ArrowRight, Globe } from 'lucide-react';
import { FormInput } from '../components/shared/FormInput';
import { authService } from '../services/authService';

export interface LoginPageProps {
  onLoginSuccess: () => void;
  locale: 'en' | 'ar';
  onToggleLocale: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  locale,
  onToggleLocale,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAr = locale === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage(
        isAr
          ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
          : 'Please enter both email and password'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.signIn(email, password);
      if (!res.success) {
        setErrorMessage(res.error || (isAr ? 'بيانات الدخول غير صحيحة' : 'Invalid login credentials'));
        return;
      }
      onLoginSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col justify-center items-center p-4">
      {/* Top Bar with Language Toggle */}
      <div className="w-full max-w-md flex justify-end mb-4">
        <button
          type="button"
          onClick={onToggleLocale}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E2E8F0] text-[#16324F] hover:bg-[#F8FAFC] transition-colors cursor-pointer shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-[#267C83]" />
          <span>{isAr ? 'English' : 'عربي'}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-md p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#16324F] text-white flex items-center justify-center mx-auto shadow-sm">
            <Hotel className="w-8 h-8 text-[#267C83]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#16324F] tracking-tight">
            GRAND LUXE HOTEL
          </h2>
          <p className="text-xs text-[#64748B] font-medium">
            {isAr
              ? 'بوابة تسجيل دخول الموظفين والإدارة (موديول 3)'
              : 'Staff & Task Operations Management Portal (Module 3)'}
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3.5 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label={isAr ? 'البريد الإلكتروني' : 'Email Address'}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isAr ? 'employee@grandhotel.com' : 'employee@grandhotel.com'}
            required
            disabled={isLoading}
            autoComplete="email"
          />

          <FormInput
            label={isAr ? 'كلمة المرور' : 'Password'}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#16324F] text-white font-semibold text-sm hover:bg-[#16324F]/90 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isAr ? 'تسجيل الدخول' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Access Guidance */}
        <div className="pt-4 border-t border-[#F1F5F9] text-center space-y-1">
          <p className="text-[11px] text-[#64748B]">
            {isAr
              ? 'مخصص لحسابات الموظفين والمديرين فقط (Employee & Admin)'
              : 'Restricted to authenticated employee and administrator profiles.'}
          </p>
          <p className="text-[10px] text-[#94A3B8]">
            {isAr
              ? 'يتم تحديد الصلاحيات ديناميكياً من جدول profiles.role'
              : 'Roles and permissions are dynamically resolved from Supabase Auth & profiles.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

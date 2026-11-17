import React from 'react';

export function TopNavbar({ activeTab, setActiveTab, lang, setLang, user, profile, onLogout, t }) {
  const isStaff = profile?.role === 'admin' || profile?.role === 'employee';

  return (
    <header className="sticky top-0 z-40 bg-[#16324F] text-white shadow-md border-b border-[#16324F]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#267C83] flex items-center justify-center font-bold text-white shadow-inner">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                {t.hotelName}
                <span className="text-xs bg-[#267C83]/70 text-white px-2 py-0.5 rounded font-normal">
                  M2
                </span>
              </div>
              <div className="text-xs text-slate-300">
                {t.portalTitle}
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1 rtl:space-x-reverse">
            {!isStaff && (<button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-[#267C83] text-white shadow'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t.nav.createRequest}
            </button>)}
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'my-requests'
                  ? 'bg-[#267C83] text-white shadow'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t.nav.myRequests}
            </button>
            <button
              onClick={() => setActiveTab('complaints')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'complaints'
                  ? 'bg-[#267C83] text-white shadow'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t.nav.complaints}
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'feedback'
                  ? 'bg-[#267C83] text-white shadow'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t.nav.feedback}
            </button>
          </nav>

          <div className="flex items-center gap-2">
            
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 border border-white/20"
              title="Toggle Language / تغيير اللغة"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2 ps-2 border-s border-white/20">
                <div className="text-right rtl:text-left hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-teal-300 font-medium uppercase">
                    {profile?.role === 'admin' ? t.nav.roleAdmin : profile?.role === 'employee' ? t.nav.roleEmployee : t.nav.roleGuest}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-300 hover:text-rose-300 hover:bg-white/10 rounded transition"
                  title={t.nav.logout}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>

        </div>

        <div className="md:hidden flex items-center justify-around py-2 border-t border-white/10 text-xs">
          {!isStaff && (<button
            onClick={() => setActiveTab('create')}
            className={`py-1 px-2 rounded ${activeTab === 'create' ? 'bg-[#267C83] text-white font-medium' : 'text-slate-300'}`}
          >
            {t.nav.createRequest}
          </button>)}
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`py-1 px-2 rounded ${activeTab === 'my-requests' ? 'bg-[#267C83] text-white font-medium' : 'text-slate-300'}`}
          >
            {t.nav.myRequests}
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`py-1 px-2 rounded ${activeTab === 'complaints' ? 'bg-[#267C83] text-white font-medium' : 'text-slate-300'}`}
          >
            {t.nav.complaints}
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-1 px-2 rounded ${activeTab === 'feedback' ? 'bg-[#267C83] text-white font-medium' : 'text-slate-300'}`}
          >
            {t.nav.feedback}
          </button>
        </div>

      </div>
    </header>
  );
}

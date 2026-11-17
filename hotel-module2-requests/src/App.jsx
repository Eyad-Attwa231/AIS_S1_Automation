import React, { useState, useEffect } from 'react';
import { translations } from './i18n.js';
import { getSupabase, resolveGuestId, fetchUserProfile } from './supabaseClient.js';
import { TopNavbar } from './components/TopNavbar.jsx';
import { CreateRequest } from './components/CreateRequest.jsx';
import { MyRequests } from './components/MyRequests.jsx';
import { Complaints } from './components/Complaints.jsx';
import { FeedbackRating } from './components/FeedbackRating.jsx';
import { AuthModal } from './components/AuthModal.jsx';

export function App() {
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('my-requests');
  const [createInitialType, setCreateInitialType] = useState('housekeeping');
  
  const [supabase, setSupabase] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [guestId, setGuestId] = useState(null);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const t = translations[lang];
  const isStaff = profile?.role === 'admin' || profile?.role === 'employee';

  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    if (lang === 'ar') {
      document.body.style.fontFamily = "'Cairo', sans-serif";
    } else {
      document.body.style.fontFamily = "'Inter', sans-serif";
    }
  }, [lang]);

  const initClient = async () => {
    const client = getSupabase();
    setSupabase(client);

    if (!client) {
      setInitLoading(false);
      return;
    }

    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        await handleUserSession(client, session.user);
      } else {
        setUser(null);
        setProfile(null);
        setGuestId(null);
        setIsAuthModalOpen(true);
      }
    } catch (err) {
      console.error("Session check error:", err);
      setIsAuthModalOpen(true);
    } finally {
      setInitLoading(false);
    }
  };

  const handleUserSession = async (client, currentUser) => {
    setUser(currentUser);
    setIsAuthModalOpen(false);

    const prof = await fetchUserProfile(client, currentUser.id);
    setProfile(prof);

    const gid = await resolveGuestId(client, currentUser.id);
    setGuestId(gid);
  };

  useEffect(() => {
    initClient();
  }, []);

  useEffect(() => {
    if (isStaff && activeTab === 'create') setActiveTab('my-requests');
  }, [isStaff, activeTab]);

  useEffect(() => {
    if (!supabase) return;
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await handleUserSession(supabase, session.user);
      } else {
        setUser(null);
        setProfile(null);
        setGuestId(null);
        setIsAuthModalOpen(true);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setGuestId(null);
    setIsAuthModalOpen(true);
  };

  const handleRequestCreated = () => {
    setActiveTab('my-requests');
  };

  const handleNewComplaintClick = () => {
    setCreateInitialType('complaint');
    setActiveTab('create');
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#263445] flex flex-col">
      
      <TopNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        user={user}
        profile={profile}
        onLogout={handleLogout}
        t={t}
      />

      <main className="flex-1">
        {isStaff && supabase && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs text-center py-2 px-4">
            {t.nav.staffView}
          </div>
        )}
        {initLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <svg className="animate-spin w-10 h-10 text-[#267C83] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm font-medium text-[#64748B]">{t.myRequests.loadingTitle}</p>
            </div>
          </div>
        ) : !supabase ? (
          <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-xl shadow-sm border border-[#E2E8F0] text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="font-bold text-lg text-[#16324F] mb-1">{t.common.errorTitle}</h3>
            <p className="text-xs text-[#64748B]">{t.common.serviceUnavailable}</p>
          </div>
        ) : (
          <>
            {activeTab === 'create' && !isStaff && (
              <CreateRequest
                supabase={supabase}
                guestId={guestId}
                onSuccess={handleRequestCreated}
                t={t}
                initialType={createInitialType}
              />
            )}

            {activeTab === 'my-requests' && (
              <MyRequests
                supabase={supabase}
                guestId={guestId}
                userProfile={profile}
                t={t}
                lang={lang}
                translations={translations}
              />
            )}

            {activeTab === 'complaints' && (
              <Complaints
                supabase={supabase}
                guestId={guestId}
                userProfile={profile}
                t={t}
                lang={lang}
                translations={translations}
                onNewComplaint={handleNewComplaintClick}
                isStaff={isStaff}
              />
            )}

            {activeTab === 'feedback' && (
              <FeedbackRating
                isStaff={isStaff}
                supabase={supabase}
                guestId={guestId}
                userProfile={profile}
                t={t}
                lang={lang}
                translations={translations}
              />
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-[#E2E8F0] py-4 text-center text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} {t.hotelName} — Module 2: Guest Requests & Feedback (Eyad Mostafa)
          </div>
        </div>
      </footer>

      {!user && (
        <AuthModal
          supabase={supabase}
          onAuthSuccess={async (u) => {
            if (supabase) await handleUserSession(supabase, u);
          }}
          t={t}
          isOpen={isAuthModalOpen}
        />
      )}

    </div>
  );
}

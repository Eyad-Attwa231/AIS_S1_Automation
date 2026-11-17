import React, { useState, useEffect } from 'react';
import { StatusBadge } from './StatusBadge.jsx';

export function Complaints({ supabase, guestId, userProfile, t, lang, translations, onNewComplaint, isStaff }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchComplaints = async () => {
    if (!supabase) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      let query = supabase
        .from('guest_requests')
        .select('id, guest_id, room_id, category, description, priority, status, ai_summary, sentiment, created_at')
        .eq('category', 'complaint')
        .order('created_at', { ascending: false });

      if (userProfile?.role === 'guest' && guestId) {
        query = query.eq('guest_id', guestId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      setComplaints(data || []);
    } catch (err) {
      console.error("Error loading complaints:", err);
      setErrorMsg(err.message || "Failed to load complaints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [supabase, guestId, userProfile]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#16324F]">
            {t.complaints.title}
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            {t.complaints.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isStaff && (<button
            onClick={onNewComplaint}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t.complaints.fileComplaintBtn}</span>
          </button>)}
          <button
            onClick={fetchComplaints}
            className="p-2 border border-[#E2E8F0] rounded-lg bg-white hover:bg-slate-50 text-[#16324F] transition shadow-sm"
            title={t.common.refresh}
          >
            <svg className="w-4 h-4 text-[#267C83]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-12 text-center text-[#64748B]">
          <svg className="animate-spin w-8 h-8 text-[#267C83] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-medium">{t.myRequests.loadingTitle}</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-[#16324F]">{t.complaints.emptyTitle}</h3>
          <p className="text-sm text-[#64748B] mt-1 max-w-sm mx-auto">{t.complaints.emptyDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {complaints.map(complaint => (
            <div key={complaint.id} className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-5 flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={complaint.status} type="status" lang={lang} translations={translations} />
                    <StatusBadge status={complaint.priority} type="priority" lang={lang} translations={translations} />
                  </div>
                  <div>
                    {complaint.sentiment ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-[#64748B]">{t.complaints.sentimentLabel}:</span>
                        <StatusBadge status={complaint.sentiment} type="sentiment" lang={lang} translations={translations} />
                      </div>
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {t.myRequests.analysisPending}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[#263445] text-sm font-medium whitespace-pre-wrap mb-3">
                  {complaint.description}
                </p>

                {complaint.ai_summary && (
                  <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg text-xs text-[#16324F] mb-3">
                    <span className="font-bold text-[#267C83] uppercase tracking-wider block mb-0.5 text-[10px]">
                      {t.myRequests.aiClassified}:
                    </span>
                    {complaint.ai_summary}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
                <span>ID: {complaint.id.slice(0, 8)}...</span>
                <span>
                  {new Date(complaint.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { StatusBadge } from './StatusBadge.jsx';

export function FeedbackRating({ isStaff, supabase, guestId, userProfile, t, lang, translations }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [bookings, setBookings] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadData = async () => {
    if (!supabase) return;
    setLoadingHistory(true);
    setErrorMsg(null);

    try {
      if (guestId) {
        const { data: bData, error: bErr } = await supabase
          .from('bookings')
          .select('id, room_id, check_in, check_out, status')
          .order('check_in', { ascending: false });

        if (!bErr && bData) {
          setBookings(bData);
        }
      }

      let query = supabase
        .from('feedback')
        .select('id, guest_id, booking_id, rating, comment, sentiment, created_at')
        .order('created_at', { ascending: false });

      if (userProfile?.role === 'guest' && guestId) {
        query = query.eq('guest_id', guestId);
      }

      const { data: fData, error: fErr } = await query;
      if (fErr) throw new Error(fErr.message);

      setFeedbacks(fData || []);
    } catch (err) {
      console.error("Error loading feedback data:", err);
      setErrorMsg(err.message || "Failed to load feedback records.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [supabase, guestId, userProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!guestId) {
      setErrorMsg("Guest identity could not be resolved. Please log in first.");
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg("Please select a rating between 1 and 5 stars.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        guest_id: guestId,
        booking_id: bookingId || null,
        rating: Number(rating),
        comment: comment.trim() || null
      };

      const { error } = await supabase
        .from('feedback')
        .insert([payload])
        .select()
        .single();

      if (error) throw new Error(error.message);

      setSuccessMsg(t.feedback.successMsg);
      setComment('');
      setBookingId('');
      setRating(5);
      
      loadData();
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setErrorMsg(err.message || "Failed to submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#16324F]">
          {t.feedback.title}
        </h2>
        <p className="text-sm text-[#64748B] mt-1">
          {t.feedback.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {!isStaff && (
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
            <h3 className="text-base font-bold text-[#16324F] mb-4 border-b border-[#E2E8F0] pb-3">
              {t.feedback.formTitle}
            </h3>

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-[#263445] mb-1.5">
                  {t.feedback.ratingLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 text-2xl transition hover:scale-110 focus:outline-none"
                    >
                      <span className={star <= rating ? "text-amber-400" : "text-slate-200"}>
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-[#267C83] ms-2">
                    {rating} / 5 {t.feedback.starUnit}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="booking_select" className="block text-sm font-semibold text-[#263445] mb-1">
                  {t.feedback.bookingLabel}
                </label>
                <select
                  id="booking_select"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#267C83]"
                >
                  <option value="">{t.feedback.noBooking}</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.check_in} → {b.check_out} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="fb_comment" className="block text-sm font-semibold text-[#263445] mb-1">
                  {t.feedback.commentLabel}
                </label>
                <textarea
                  id="fb_comment"
                  rows="3"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t.feedback.commentPlaceholder}
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#267C83]"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#16324F] hover:bg-[#16324F]/90 text-white font-medium text-sm rounded-lg transition shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t.feedback.submitting}</span>
                  </>
                ) : (
                  <span>{t.feedback.submitBtn}</span>
                )}
              </button>

            </form>
          </div>
        </div>

        )}

        <div className={isStaff ? 'lg:col-span-12' : 'lg:col-span-7'}>
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
            
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#16324F]">
                {t.feedback.historyTitle}
              </h3>
              <button
                onClick={loadData}
                className="text-xs font-semibold text-[#267C83] hover:underline"
              >
                {t.common.refresh}
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-[#64748B]">
                <svg className="animate-spin w-6 h-6 text-[#267C83] mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs">{t.myRequests.loadingTitle}</span>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="p-8 text-center text-[#64748B]">
                <p className="text-sm">{t.feedback.emptyHistory}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbacks.map(item => (
                  <div key={item.id} className="p-4 rounded-lg border border-[#E2E8F0] bg-slate-50/50 hover:bg-slate-50 transition">
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(st => (
                          <span key={st} className={`text-base ${st <= item.rating ? 'text-amber-400' : 'text-slate-200'}`}>
                            ★
                          </span>
                        ))}
                        <span className="text-xs font-bold text-[#16324F] ms-1">
                          {item.rating}/5
                        </span>
                      </div>

                      <div>
                        {item.sentiment ? (
                          <StatusBadge status={item.sentiment} type="sentiment" lang={lang} translations={translations} />
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {t.feedback.analysisPending}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.comment ? (
                      <p className="text-sm text-[#263445] mb-2 whitespace-pre-wrap">
                        {item.comment}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic mb-2">
                        (No written comment)
                      </p>
                    )}

                    <div className="text-[11px] text-[#64748B] flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span>ID: {item.id.slice(0, 8)}...</span>
                      <span>
                        {new Date(item.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
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
        </div>

      </div>

    </div>
  );
}

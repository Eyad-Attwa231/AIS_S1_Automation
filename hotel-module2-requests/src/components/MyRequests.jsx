import React, { useState, useEffect, useMemo } from 'react';
import { StatusBadge } from './StatusBadge.jsx';

export function MyRequests({ supabase, guestId, userProfile, t, lang, translations }) {
  const [requests, setRequests] = useState([]);
  const [roomsMap, setRoomsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchRequests = async () => {
    if (!supabase) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: rooms } = await supabase.from('rooms').select('id, room_number, room_type');
      if (rooms) {
        const map = {};
        rooms.forEach(r => { map[r.id] = r; });
        setRoomsMap(map);
      }

      let query = supabase
        .from('guest_requests')
        .select('id, guest_id, room_id, category, description, priority, status, ai_summary, sentiment, created_at')
        .order('created_at', { ascending: false });

      if (userProfile?.role === 'guest' && guestId) {
        query = query.eq('guest_id', guestId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      setRequests(data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setErrorMsg(err.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [supabase, guestId, userProfile]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inDesc = (req.description || '').toLowerCase().includes(q);
        const inSummary = (req.ai_summary || '').toLowerCase().includes(q);
        if (!inDesc && !inSummary) return false;
      }
      if (filterStatus !== 'all' && req.status !== filterStatus) {
        return false;
      }
      if (filterCategory !== 'all' && req.category !== filterCategory) {
        return false;
      }
      if (filterPriority !== 'all' && req.priority !== filterPriority) {
        return false;
      }
      return true;
    });
  }, [requests, searchQuery, filterStatus, filterCategory, filterPriority]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#16324F]">
            {t.myRequests.title}
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            {t.myRequests.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRequests}
            className="px-3.5 py-2 border border-[#E2E8F0] rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-[#16324F] transition flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4 text-[#267C83]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{t.common.refresh}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchRequests}
            className="text-xs font-semibold underline text-rose-800 hover:text-rose-900"
          >
            {t.common.retry}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder={t.myRequests.searchPlaceholder}
              className="w-full ps-9 pe-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#267C83] focus:border-[#267C83]"
            />
            <svg className="w-4 h-4 text-slate-400 absolute top-2.5 start-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#267C83]"
            >
              <option value="all">{t.myRequests.allStatuses}</option>
              <option value="new">{t.badges.status.new}</option>
              <option value="classified">{t.badges.status.classified}</option>
              <option value="processing">{t.badges.status.processing}</option>
              <option value="resolved">{t.badges.status.resolved}</option>
              <option value="cancelled">{t.badges.status.cancelled}</option>
            </select>
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#267C83]"
            >
              <option value="all">{t.myRequests.allCategories}</option>
              <option value="housekeeping">{t.badges.category.housekeeping}</option>
              <option value="maintenance">{t.badges.category.maintenance}</option>
              <option value="room_service">{t.badges.category.room_service}</option>
              <option value="complaint">{t.badges.category.complaint}</option>
              <option value="other">{t.badges.category.other}</option>
            </select>
          </div>

          <div>
            <select
              value={filterPriority}
              onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#267C83]"
            >
              <option value="all">{t.myRequests.allPriorities}</option>
              <option value="urgent">{t.badges.priority.urgent}</option>
              <option value="high">{t.badges.priority.high}</option>
              <option value="normal">{t.badges.priority.normal}</option>
              <option value="low">{t.badges.priority.low}</option>
            </select>
          </div>

        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#64748B]">
            <svg className="animate-spin w-8 h-8 text-[#267C83] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-medium">{t.myRequests.loadingTitle}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#16324F]">{t.myRequests.emptyTitle}</h3>
            <p className="text-sm text-[#64748B] mt-1">{t.myRequests.emptyDesc}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0]">
              <thead className="bg-slate-50 text-start text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-start">{t.myRequests.tableHeaders.description}</th>
                  <th scope="col" className="px-4 py-3.5 text-start">{t.myRequests.tableHeaders.category}</th>
                  <th scope="col" className="px-4 py-3.5 text-start">{t.myRequests.tableHeaders.priority}</th>
                  <th scope="col" className="px-4 py-3.5 text-start">{t.myRequests.tableHeaders.status}</th>
                  <th scope="col" className="px-4 py-3.5 text-start">{t.myRequests.tableHeaders.created}</th>
                  <th scope="col" className="px-4 py-3.5 text-end">{t.myRequests.tableHeaders.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white text-sm">
                {paginatedRequests.map((req) => {
                  const room = req.room_id ? roomsMap[req.room_id] : null;
                  const isPending = req.status === 'new' && !req.category;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition">
                      
                      <td className="px-4 py-4 max-w-sm">
                        <div className="font-medium text-[#263445] line-clamp-2">
                          {req.description}
                        </div>
                        {req.ai_summary && (
                          <div className="mt-1 flex items-start gap-1 text-xs text-[#267C83] bg-[#267C83]/5 p-1.5 rounded">
                            <span className="font-semibold flex-shrink-0 text-[10px] uppercase tracking-wider border border-[#267C83]/30 px-1 rounded bg-white">
                              {t.myRequests.aiClassified}
                            </span>
                            <span className="italic line-clamp-1">{req.ai_summary}</span>
                          </div>
                        )}
                        {room && (
                          <div className="text-[11px] text-[#64748B] mt-1">
                            {t.common.roomPrefix} {room.room_number} ({room.room_type})
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            {t.myRequests.classificationPending}
                          </span>
                        ) : req.category ? (
                          <StatusBadge status={req.category} type="category" lang={lang} translations={translations} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {req.priority ? (
                          <StatusBadge status={req.priority} type="priority" lang={lang} translations={translations} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={req.status} type="status" lang={lang} translations={translations} />
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-xs text-[#64748B]">
                        {new Date(req.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-end">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-2.5 py-1 text-xs font-semibold rounded text-[#267C83] hover:bg-[#267C83]/10 transition"
                        >
                          {t.myRequests.detailsBtn}
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredRequests.length > pageSize && (
          <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRequests.length)} of {filteredRequests.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-2 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-[#16324F]">
                  {t.myRequests.detailDrawer.title}
                </h3>
                <StatusBadge status={selectedRequest.status} type="status" lang={lang} translations={translations} />
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              
              <div>
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                  {t.myRequests.detailDrawer.description}
                </label>
                <div className="p-3 bg-slate-50 rounded-lg text-[#263445] whitespace-pre-wrap border border-slate-200">
                  {selectedRequest.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                    {t.myRequests.detailDrawer.category}
                  </label>
                  {selectedRequest.category ? (
                    <StatusBadge status={selectedRequest.category} type="category" lang={lang} translations={translations} />
                  ) : (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {t.myRequests.classificationPending}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                    {t.myRequests.detailDrawer.priority}
                  </label>
                  {selectedRequest.priority ? (
                    <StatusBadge status={selectedRequest.priority} type="priority" lang={lang} translations={translations} />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
              </div>

              {selectedRequest.ai_summary && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#267C83] text-white px-1.5 py-0.5 rounded">
                      {t.myRequests.aiClassified}
                    </span>
                    <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      {t.myRequests.detailDrawer.aiSummary}
                    </label>
                  </div>
                  <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-lg text-[#16324F] font-medium">
                    {selectedRequest.ai_summary}
                  </div>
                </div>
              )}

              {selectedRequest.category === 'complaint' && (
                <div>
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                    {t.myRequests.detailDrawer.sentiment}
                  </label>
                  {selectedRequest.sentiment ? (
                    <StatusBadge status={selectedRequest.sentiment} type="sentiment" lang={lang} translations={translations} />
                  ) : (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {t.myRequests.analysisPending}
                    </span>
                  )}
                </div>
              )}

              <div className="pt-2 text-xs text-slate-400 flex justify-between border-t border-slate-100">
                <span>ID: {selectedRequest.id}</span>
                <span>
                  {new Date(selectedRequest.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                </span>
              </div>

            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition"
              >
                {t.myRequests.detailDrawer.close}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

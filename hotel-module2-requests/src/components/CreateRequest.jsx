import React, { useState, useEffect } from 'react';

export function CreateRequest({ supabase, guestId, onSuccess, t, initialType = 'housekeeping' }) {
  const [requestType, setRequestType] = useState(initialType);
  const [roomId, setRoomId] = useState('');
  const [rooms, setRooms] = useState([]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeBookingRoom, setActiveBookingRoom] = useState(null);

  const typeMap = {
    housekeeping: 'Housekeeping',
    maintenance: 'Maintenance',
    roomService: 'Room Service',
    complaint: 'Complaint',
    other: 'Other'
  };

  useEffect(() => {
    if (!supabase) return;

    async function loadRoomsAndBooking() {
      try {
        const { data: roomList, error: roomError } = await supabase
          .from('rooms')
          .select('id, room_number, room_type, status')
          .order('room_number', { ascending: true });

        if (roomError) {
          console.warn("Could not load rooms list:", roomError.message);
        } else if (roomList) {
          setRooms(roomList);
        }

        if (guestId) {
          const today = new Date().toISOString().split('T')[0];
          const { data: bookings, error: bError } = await supabase
            .from('bookings')
            .select('id, room_id, check_in, check_out, status')
            .in('status', ['confirmed', 'checked_in'])
            .lte('check_in', today)
            .gt('check_out', today)
            .limit(1);

          if (!bError && bookings && bookings.length > 0 && bookings[0].room_id) {
            setRoomId(bookings[0].room_id);
            setActiveBookingRoom(bookings[0].room_id);
          }
        }
      } catch (err) {
        console.error("Error loading rooms / bookings:", err);
      }
    }

    loadRoomsAndBooking();
  }, [supabase, guestId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanText = description.trim();
    if (!cleanText || cleanText.length < 5) {
      setErrorMsg(t.create.validationError);
      return;
    }

    if (!guestId) {
      setErrorMsg("Guest identity could not be resolved. Please ensure you are logged in as a registered guest.");
      return;
    }

    setIsSubmitting(true);

    try {
      const typeEn = typeMap[requestType] || 'Other';
      const formattedDescription = `[Guest selected: ${typeEn}] ${cleanText}`;

      const payload = {
        guest_id: guestId,
        room_id: roomId || null,
        description: formattedDescription
      };

      const { data, error } = await supabase
        .from('guest_requests')
        .insert([payload])
        .select('id, status, created_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setDescription('');
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      console.error("Failed to insert request:", err);
      setErrorMsg(err.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 sm:p-8">
        
        <div className="mb-6 border-b border-[#E2E8F0] pb-4">
          <h2 className="text-2xl font-bold text-[#16324F]">
            {t.create.title}
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            {t.create.subtitle}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-semibold">{t.common.errorTitle}</div>
              <div className="mt-0.5">{errorMsg}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-semibold text-[#263445] mb-2">
              {t.create.typeLabel} <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'housekeeping', label: t.create.types.housekeeping, icon: '🧹' },
                { key: 'maintenance', label: t.create.types.maintenance, icon: '🔧' },
                { key: 'roomService', label: t.create.types.roomService, icon: '🍽️' },
                { key: 'complaint', label: t.create.types.complaint, icon: '⚠️' },
                { key: 'other', label: t.create.types.other, icon: '🛎️' }
              ].map(item => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setRequestType(item.key)}
                  className={`p-3 rounded-lg border text-start transition flex items-center gap-2.5 ${
                    requestType === item.key
                      ? 'border-[#267C83] bg-[#267C83]/5 text-[#16324F] font-semibold ring-2 ring-[#267C83]/20'
                      : 'border-[#E2E8F0] hover:border-slate-300 text-[#263445]'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs sm:text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="room_select" className="block text-sm font-semibold text-[#263445]">
                {t.create.roomLabel}
              </label>
              {activeBookingRoom && activeBookingRoom === roomId && (
                <span className="text-xs text-[#267C83] bg-[#267C83]/10 font-medium px-2 py-0.5 rounded-full">
                  ✓ {t.create.currentBookingBadge}
                </span>
              )}
            </div>
            <select
              id="room_select"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-lg bg-white text-[#263445] text-sm focus:outline-none focus:ring-2 focus:ring-[#267C83] focus:border-[#267C83]"
            >
              <option value="">{t.create.noRoom}</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {t.common.roomPrefix} {room.room_number} ({room.room_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="req_description" className="block text-sm font-semibold text-[#263445] mb-2">
              {t.create.descLabel} <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="req_description"
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.create.descPlaceholder}
              className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-lg text-sm text-[#263445] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#267C83] focus:border-[#267C83]"
              required
            ></textarea>
            <p className="text-xs text-[#64748B] mt-1.5">
              {t.create.descHelp}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-[#16324F] hover:bg-[#16324F]/90 text-white font-medium text-sm transition shadow-sm disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t.create.submitting}</span>
                </>
              ) : (
                <>
                  <span>{t.create.submitBtn}</span>
                  <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

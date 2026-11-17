import React from 'react';

export function StatusBadge({ status, type = 'status', labelOverride, lang = 'en', translations }) {
  if (!status) return null;
  const s = String(status).toLowerCase().trim();

  let bgClass = "bg-slate-100 text-slate-700 border-slate-300";

  const greenStatuses = ['completed', 'confirmed', 'ready', 'resolved', 'available', 'checked_out', 'positive'];
  const amberStatuses = ['pending', 'new', 'high'];
  const blueStatuses = ['in_progress', 'processing', 'assigned', 'classified', 'cleaning', 'checked_in', 'normal', 'neutral'];
  const redStatuses = ['cancelled', 'urgent', 'maintenance', 'negative'];
  const darkOrangeStatuses = ['dirty'];
  const navyStatuses = ['occupied'];

  if (greenStatuses.includes(s)) {
    bgClass = "bg-emerald-50 text-emerald-700 border-emerald-300";
  } else if (amberStatuses.includes(s)) {
    bgClass = "bg-amber-50 text-amber-700 border-amber-300";
  } else if (blueStatuses.includes(s)) {
    bgClass = "bg-blue-50 text-blue-700 border-blue-300";
  } else if (redStatuses.includes(s)) {
    bgClass = "bg-rose-50 text-rose-700 border-rose-300 font-semibold";
  } else if (darkOrangeStatuses.includes(s)) {
    bgClass = "bg-orange-100 text-orange-800 border-orange-300";
  } else if (navyStatuses.includes(s)) {
    bgClass = "bg-[#16324F]/10 text-[#16324F] border-[#16324F]/30";
  }

  let displayLabel = labelOverride;
  if (!displayLabel) {
    const t = translations ? translations[lang] : null;
    if (t && t.badges && t.badges[type] && t.badges[type][s]) {
      displayLabel = t.badges[type][s];
    } else {
      displayLabel = s.charAt(0).toUpperCase() + s.slice(1);
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bgClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      <span>{displayLabel}</span>
    </span>
  );
}

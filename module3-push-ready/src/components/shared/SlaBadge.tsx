import React, { useEffect, useState } from 'react';
import type { TaskStatus } from '../../types/task';

export interface SlaBadgeProps {
  dueAt?: string | null;
  createdAt?: string | null;
  status: TaskStatus | string;
  now?: number;
  size?: 'sm' | 'md';
  className?: string;
}

type SlaVariant = 'green' | 'amber' | 'red';

const VARIANT_CLASSES: Record<SlaVariant, string> = {
  green: 'bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]',
  amber: 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]',
  red: 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]',
};

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

// Module-level shared 1-second ticker so all mounted SLA countdowns share a single interval
let sharedNow = Date.now();
let sharedIntervalId: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<(nextNow: number) => void>();

function ensureSharedTicker() {
  if (sharedIntervalId !== null) return;
  sharedNow = Date.now();
  sharedIntervalId = setInterval(() => {
    sharedNow = Date.now();
    clockListeners.forEach((listener) => listener(sharedNow));
  }, 1000);
}

function cleanupSharedTicker() {
  if (clockListeners.size === 0 && sharedIntervalId !== null) {
    clearInterval(sharedIntervalId);
    sharedIntervalId = null;
  }
}

/**
 * Subscribe to the shared 1-second SLA clock.
 * All components using this hook share one global interval that cleans up when no subscribers remain.
 */
function useSlaClock(enabled = true): number {
  const [now, setNow] = useState<number>(() =>
    sharedIntervalId === null ? Date.now() : sharedNow
  );

  useEffect(() => {
    if (!enabled) return;

    const handleTick = (nextNow: number) => {
      setNow(nextNow);
    };

    clockListeners.add(handleTick);
    ensureSharedTicker();

    return () => {
      clockListeners.delete(handleTick);
      cleanupSharedTicker();
    };
  }, [enabled]);

  return now;
}

function formatSlaDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (totalMinutes > 0) {
    return `${totalMinutes}m`;
  }
  return `${totalSeconds}s`;
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({
  dueAt,
  createdAt,
  status,
  now,
  size = 'sm',
  className = '',
}) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const isClosed = normalizedStatus === 'completed' || normalizedStatus === 'cancelled';

  const fallbackNow = useSlaClock(now === undefined && !isClosed && Boolean(dueAt));
  const currentNow = now ?? fallbackNow;

  if (isClosed || !dueAt) {
    return null;
  }

  const dueMs = new Date(dueAt).getTime();
  if (Number.isNaN(dueMs)) {
    return null;
  }

  const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
  const remainingMs = dueMs - currentNow;

  let variant: SlaVariant;
  let label: string;

  if (remainingMs <= 0) {
    variant = 'red';
    label = `⚠️ Overdue by ${formatSlaDuration(Math.abs(remainingMs))}`;
  } else {
    const totalMs =
      !Number.isNaN(createdMs) && dueMs > createdMs ? dueMs - createdMs : remainingMs;
    const ratioRemaining = totalMs > 0 ? remainingMs / totalMs : 1;

    variant = ratioRemaining > 0.5 ? 'green' : 'amber';
    label = `⏳ ${formatSlaDuration(remainingMs)} remaining`;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border whitespace-nowrap transition-colors ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      title={label}
    >
      {label}
    </span>
  );
};

export default SlaBadge;

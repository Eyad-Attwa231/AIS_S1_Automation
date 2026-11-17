import React from 'react';

export interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  onReset,
  resetLabel = 'Reset Filters',
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-xl p-3.5 border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1">
        {children}
      </div>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-[#64748B] hover:text-[#DC2626] transition-colors px-2 py-1.5 rounded cursor-pointer"
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
};

export default FilterBar;

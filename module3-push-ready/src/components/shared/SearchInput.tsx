import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  disabled = false,
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        className="w-4 h-4 text-[#64748B] absolute start-3 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full ps-9 pe-8 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#263445] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#267C83]/30 focus:border-[#267C83] transition-colors disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute end-2.5 p-1 text-[#94A3B8] hover:text-[#263445] rounded-full focus:outline-none cursor-pointer"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;

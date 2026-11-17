import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  isAr?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  isAr = false,
  className = '',
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : null;
  const endItem =
    totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-[#E2E8F0] text-xs text-[#64748B] ${className}`}
    >
      <div>
        {startItem && endItem && totalItems ? (
          <span>
            {isAr ? (
              <>
                عرض <strong className="text-[#263445]">{startItem}</strong> إلى{' '}
                <strong className="text-[#263445]">{endItem}</strong> من أصل{' '}
                <strong className="text-[#263445]">{totalItems}</strong> عنصر
              </>
            ) : (
              <>
                Showing <strong className="text-[#263445]">{startItem}</strong> to{' '}
                <strong className="text-[#263445]">{endItem}</strong> of{' '}
                <strong className="text-[#263445]">{totalItems}</strong> entries
              </>
            )}
          </span>
        ) : (
          <span>
            {isAr
              ? `صفحة ${currentPage} من ${totalPages}`
              : `Page ${currentPage} of ${totalPages}`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-[#E2E8F0] text-[#263445] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Previous Page"
        >
          {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`min-w-8 h-8 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              currentPage === page
                ? 'bg-[#16324F] text-white'
                : 'border border-[#E2E8F0] text-[#263445] hover:bg-[#F8FAFC]'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-[#E2E8F0] text-[#263445] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Next Page"
        >
          {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default Pagination;

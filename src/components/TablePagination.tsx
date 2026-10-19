import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { ALLOWED_PAGE_SIZES, PageSizeOption } from '../utils/pagination';

interface TablePaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  itemLabel?: string;
  idPrefix: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'records',
  idPrefix,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(totalItems, currentPage * pageSize);

  // According to user request: add pagination arrows when rows exceed 20 (or totalPages > 1)
  const showPaginationArrows = totalItems > 20 || totalPages > 1;

  return (
    <div
      id={`${idPrefix}-pagination-container`}
      className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-base"
    >
      {/* Items count summary */}
      <div className="text-slate-700 font-medium whitespace-nowrap text-base">
        {totalItems === 0 ? (
          <span>No {itemLabel} found</span>
        ) : (
          <span>
            Showing <strong className="text-slate-950 font-black font-mono tabular-nums text-base">{startIndex}</strong> to{' '}
            <strong className="text-slate-950 font-black font-mono tabular-nums text-base">{endIndex}</strong> of{' '}
            <strong className="text-slate-950 font-black font-mono tabular-nums text-base">{totalItems}</strong> {itemLabel}
          </span>
        )}
      </div>

      {/* Right side controls: Rows per page selector + Pagination arrows */}
      <div className="flex flex-wrap items-center justify-end gap-4 w-full sm:w-auto">
        {/* Rows per page selector */}
        <div className="flex items-center gap-2.5">
          <label
            htmlFor={`${idPrefix}-page-size-select`}
            className="text-slate-700 font-bold text-sm whitespace-nowrap"
          >
            Show per page:
          </label>
          <select
            id={`${idPrefix}-page-size-select`}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSizeOption)}
            className="px-3.5 py-2 text-base font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 focus:outline-none focus:border-slate-400 focus:bg-white cursor-pointer transition-colors shadow-2xs"
          >
            {ALLOWED_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} rows
              </option>
            ))}
          </select>
        </div>

        {/* Pagination arrows (rendered when rows exceed 30) */}
        {showPaginationArrows && (
          <div
            id={`${idPrefix}-pagination-arrows-group`}
            className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200"
          >
            {/* First page */}
            <button
              id={`${idPrefix}-btn-page-first`}
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1}
              title="Jump to first page"
              className="p-2 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>

            {/* Previous page arrow */}
            <button
              id={`${idPrefix}-btn-page-prev`}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              title="Previous page"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-slate-800 font-bold hover:text-slate-950 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden md:inline">Prev</span>
            </button>

            {/* Page number badge */}
            <div className="px-3.5 py-1.5 text-slate-800 font-semibold text-sm sm:text-base select-none whitespace-nowrap">
              Page <span className="font-black text-slate-950 font-mono tabular-nums text-base">{currentPage}</span> of{' '}
              <span className="font-black text-slate-950 font-mono tabular-nums text-base">{totalPages}</span>
            </div>

            {/* Next page arrow */}
            <button
              id={`${idPrefix}-btn-page-next`}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              title="Next page"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-slate-800 font-bold hover:text-slate-950 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
            >
              <span className="hidden md:inline">Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Last page */}
            <button
              id={`${idPrefix}-btn-page-last`}
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages}
              title="Jump to last page"
              className="p-2 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

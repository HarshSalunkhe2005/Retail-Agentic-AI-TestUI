interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const showing = Math.min(itemsPerPage, totalItems - (currentPage - 1) * itemsPerPage);

  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-medium
          hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ← Previous
      </button>
      <span className="text-xs text-slate-400">
        Page {currentPage} of {totalPages} &nbsp;|&nbsp; Showing {showing} of {totalItems} items
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-medium
          hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </div>
  );
}

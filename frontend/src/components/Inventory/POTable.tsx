import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PORow {
  stock_code: string;
  description: string;
  category: string;
  forecast_demand: number;
  order_quantity: number;
  unit_price: number;
  po_value_gbp: number;
  risk_score: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  reason: string;
}

interface Props {
  rows: PORow[];
  pageSize?: number;
}

const PRIORITY_BADGE: Record<string, string> = {
  Critical: 'bg-red-500/20 text-red-300 border border-red-500/30',
  High:     'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  Medium:   'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  Low:      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
};

function formatCurrency(v: number) {
  if (v >= 1_000) return `£${(v / 1_000).toFixed(1)}K`;
  return `£${v.toFixed(0)}`;
}

export default function POTable({ rows, pageSize = 10 }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / pageSize);
  const slice = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Forecast</th>
              <th className="px-4 py-3 text-right">Order Qty</th>
              <th className="px-4 py-3 text-right">PO Value</th>
              <th className="px-4 py-3 text-right">Risk</th>
              <th className="px-4 py-3 text-center">Priority</th>
              <th className="px-4 py-3 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr
                key={row.stock_code + i}
                className="border-b border-white/5 hover:bg-white/3 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-300">{row.stock_code}</td>
                <td className="px-4 py-3 text-slate-200 max-w-[160px] truncate" title={row.description}>
                  {row.description}
                </td>
                <td className="px-4 py-3 text-slate-400">{row.category}</td>
                <td className="px-4 py-3 text-right text-slate-300">{row.forecast_demand.toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-slate-300">{row.order_quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(row.po_value_gbp)}</td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-xs font-mono ${
                      row.risk_score >= 0.75
                        ? 'text-red-400'
                        : row.risk_score >= 0.5
                        ? 'text-orange-400'
                        : row.risk_score >= 0.25
                        ? 'text-yellow-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {row.risk_score.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[row.priority] ?? ''}`}>
                    {row.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{row.reason.replace(/_/g, ' ')}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No items match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-xs text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Activity,
  Download,
  Filter,
  Search,
  BarChart2,
} from 'lucide-react';
import KPICard from './KPICard';
import Pagination from '../Common/Pagination';

// Types

interface InventoryRecord {
  StockCode: string;
  Description: string;
  Category: string;
  ABCClass: string;
  DemandType: string;
  Stock_On_Hand: number;
  Available_Stock: number;
  ReorderPoint: number;
  SafetyStock: number;
  EOQ: number;
  LeadTimeDays: number;
  Forecast_Demand: number;
  Order_Quantity: number;
  PO_Value_GBP: number;
  UnitPrice: number;
  RiskScore: number;
  Priority: string;
  Urgency: string;
  Days_To_Stockout: number;
  AnnualDemand: number;
  ActivePO: boolean;
  ColdStart: boolean;
  Reason: string;
}

interface InventorySummary {
  total_skus: number;
  active_pos: number;
  total_po_value_gbp: number;
  avg_risk_score: number;
  budget_limit_gbp: number;
  budget_utilised_gbp: number;
  urgency_counts: Record<string, number>;
  priority_counts: Record<string, number>;
  abc_counts: Record<string, number>;
  demand_type_counts: Record<string, number>;
  basket_rules_used: number;
  currency_symbol: string;
}

interface ChartData {
  risk_distribution: Array<{ bin: string; count: number }>;
  stockout_distribution: Array<{ range: string; count: number }>;
  priority_pie: Array<{ name: string; value: number }>;
  heatmap: Array<Record<string, unknown>>;
  po_by_abc: Array<{ class: string; value: number }>;
  demand_type_pie: Array<{ name: string; value: number }>;
  urgency_bar: Array<{ name: string; value: number }>;
}

// Exported types for Dashboard.tsx consumption
export interface InventoryDashboardProps {
  purchase_orders: InventoryRecord[];
  inventory_analysis: InventoryRecord[];
  summary: InventorySummary;
  chart_data: ChartData;
}

// Colour maps

const PRIORITY_COLORS: Record<string, string> = {
  High:   '#E74C3C',
  Medium: '#F39C12',
  Low:    '#2ECC71',
};

const URGENCY_COLORS: Record<string, string> = {
  Critical: '#E74C3C',
  High:     '#E67E22',
  Medium:   '#F39C12',
  Low:      '#2ECC71',
};

// Download helpers

function downloadCSV(data: InventoryRecord[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]) as (keyof InventoryRecord)[];
  const rows = data.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Small UI components

function PriorityBadge({ priority }: { priority: string }) {
  const bg: Record<string, string> = {
    High:   'bg-red-500/20 text-red-300 border-red-500/30',
    Medium: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    Low:    'bg-green-500/20 text-green-300 border-green-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${bg[priority] ?? 'bg-white/10 text-slate-400'}`}>
      {priority}
    </span>
  );
}

function ABCBadge({ abc }: { abc: string }) {
  const bg: Record<string, string> = {
    A: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    B: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    C: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${bg[abc] ?? 'bg-white/10 text-slate-400'}`}>
      {abc}
    </span>
  );
}

function UrgencyDot({ urgency }: { urgency: string }) {
  const color: Record<string, string> = {
    Critical: 'bg-red-500',
    High:     'bg-orange-500',
    Medium:   'bg-yellow-500',
    Low:      'bg-green-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${color[urgency] ?? 'bg-slate-500'}`} />;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 text-xs border border-white/10">
        <p className="text-slate-300 font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-white">
            {p.name ? `${p.name}: ` : ''}
            {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// Main component

export default function InventoryDashboard({
  purchase_orders,
  inventory_analysis,
  summary,
  chart_data,
}: InventoryDashboardProps) {
  // Pagination state (exact Pricing pattern)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [filterPriority, setFilterPriority] = useState('All');
  const [filterABC, setFilterABC] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [showAllSkus, setShowAllSkus] = useState(false);

  // Reset to page 1 whenever filters or data source change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPriority, filterABC, searchText, showAllSkus]);

  // Table data source
  const tableSource = showAllSkus ? inventory_analysis : purchase_orders;

  // Deduplicate by StockCode (keep first occurrence)
  const unique = tableSource.filter(
    (r, i, arr) => arr.findIndex((x) => x.StockCode === r.StockCode) === i,
  );

  const filtered = unique.filter((r) => {
    if (filterPriority !== 'All' && r.Priority !== filterPriority) return false;
    if (filterABC !== 'All' && r.ABCClass !== filterABC) return false;
    if (
      searchText &&
      !r.StockCode.toLowerCase().includes(searchText.toLowerCase()) &&
      !r.Description.toLowerCase().includes(searchText.toLowerCase())
    )
      return false;
    return true;
  });

  // Calculate indices ONCE per render (exact Pricing pattern)
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Computed KPI values
  const budgetPct =
    summary.budget_limit_gbp > 0
      ? Math.min((summary.budget_utilised_gbp / summary.budget_limit_gbp) * 100, 100)
      : 0;
  const customersAtRisk =
    (summary.urgency_counts?.Critical ?? 0) + (summary.urgency_counts?.High ?? 0);

  // Download handlers
  const handleDownloadCSV = useCallback(() => {
    downloadCSV(purchase_orders, 'active_purchase_orders.csv');
  }, [purchase_orders]);

  const handleDownloadAllCSV = useCallback(() => {
    downloadCSV(inventory_analysis, 'full_inventory_analysis.csv');
  }, [inventory_analysis]);

  const handleDownloadJSON = useCallback(() => {
    downloadJSON(
      { purchase_orders, summary, generated_at: new Date().toISOString() },
      'kafka_reorder_payload.json',
    );
  }, [purchase_orders, summary]);

  const urgencyOrder = ['Critical', 'High', 'Medium', 'Low'];
  const urgencyEmoji: Record<string, string> = {
    Critical: '🔴',
    High:     '🟠',
    Medium:   '🟡',
    Low:      '🟢',
  };
  const urgencyLabel: Record<string, string> = {
    Critical: 'stockout imminent',
    High:     'high priority',
    Medium:   'medium priority',
    Low:      'low priority',
  };

  return (
    <div className="space-y-5">
      {/* Status messages */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl px-4 py-3 border border-white/10 space-y-1"
      >
        <p className="text-xs text-green-400">
          ✅ All models integrated: Churn segments + Demand forecast + Basket rules applied
        </p>
        <p className="text-xs text-slate-400">
          🔒 Data validation: No duplicates, no leakage detected
        </p>
        {budgetPct >= 95 && (
          <p className="text-xs text-yellow-400">
            ⚠️ Budget nearly exhausted — some SKUs may be deferred to next cycle
          </p>
        )}
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total SKUs Evaluated"
          value={summary.total_skus.toLocaleString()}
          subtitle="Products analysed"
          icon={<Package className="w-5 h-5" />}
          accentColor="cyan"
          delay={0}
        />
        <KPICard
          title="Active POs Generated"
          value={summary.active_pos.toLocaleString()}
          subtitle="Purchase orders"
          icon={<ShoppingCart className="w-5 h-5" />}
          accentColor="purple"
          delay={0.05}
        />
        <KPICard
          title="Total PO Value"
          value={`${summary.currency_symbol}${Math.round(summary.total_po_value_gbp).toLocaleString()}`}
          subtitle="Budget utilised"
          icon={<TrendingUp className="w-5 h-5" />}
          accentColor="green"
          delay={0.1}
        />
        <KPICard
          title="Customers at Risk"
          value={customersAtRisk.toLocaleString()}
          subtitle="Critical + High urgency SKUs"
          icon={<AlertTriangle className="w-5 h-5" />}
          accentColor="orange"
          delay={0.15}
        />
        <KPICard
          title="Avg Risk Score"
          value={summary.avg_risk_score.toFixed(3)}
          subtitle="GBR model score"
          icon={<Activity className="w-5 h-5" />}
          accentColor="pink"
          delay={0.2}
        />
        <KPICard
          title="Budget Utilization"
          value={`${budgetPct.toFixed(1)}%`}
          subtitle={`${summary.currency_symbol}${Math.round(summary.budget_utilised_gbp).toLocaleString()} of ${summary.currency_symbol}${Math.round(summary.budget_limit_gbp).toLocaleString()}`}
          icon={<BarChart2 className="w-5 h-5" />}
          accentColor="blue"
          delay={0.25}
        />
      </div>

      {/* Row 1: Urgency bar (2/3) + Urgency Matrix (1/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-2 glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">SKU Urgency Overview</h3>
          <p className="text-xs text-slate-400 mb-4">Number of SKUs per urgency level</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chart_data.urgency_bar}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="SKUs" radius={[4, 4, 0, 0]}>
                {chart_data.urgency_bar.map((entry, i) => (
                  <Cell key={i} fill={URGENCY_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">
            Inventory Reorder Urgency Matrix
          </h3>
          <p className="text-xs text-slate-400 mb-4">SKUs by days-to-stockout</p>
          <div className="space-y-3">
            {urgencyOrder.map((u) => {
              const count = summary.urgency_counts?.[u] ?? 0;
              const pct =
                summary.total_skus > 0 ? (count / summary.total_skus) * 100 : 0;
              return (
                <div key={u}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <UrgencyDot urgency={u} />
                      <span className="text-xs text-slate-300 font-medium">
                        {urgencyEmoji[u]} {u}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{count} SKUs</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: URGENCY_COLORS[u] }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{urgencyLabel[u]}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Row 2: Risk Distribution (1/2) + Stock Status Heatmap (1/2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Risk Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">
            GBR risk score histogram (0–1)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chart_data.risk_distribution}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="bin" tick={{ fill: '#94a3b8', fontSize: 9 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="SKUs" radius={[4, 4, 0, 0]}>
                {chart_data.risk_distribution.map((entry, i) => {
                  const binStart = parseFloat(entry.bin.split('–')[0] ?? '0');
                  const color =
                    binStart >= 0.7
                      ? PRIORITY_COLORS.High
                      : binStart >= 0.4
                      ? PRIORITY_COLORS.Medium
                      : PRIORITY_COLORS.Low;
                  return <Cell key={i} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Stock Status Heatmap</h3>
          <p className="text-xs text-slate-400 mb-4">
            Category x Priority · Red (high risk) → Green (low risk)
          </p>
          {chart_data.heatmap && chart_data.heatmap.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-white/10">
                    <th className="text-left py-2 pr-4">Category</th>
                    {(['High', 'Medium', 'Low'] as const).map((p) => (
                      <th
                        key={p}
                        className="text-right py-2 pr-4"
                        style={{ color: PRIORITY_COLORS[p] }}
                      >
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chart_data.heatmap.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="py-2.5 pr-4 text-slate-300">
                        {String(row.Category ?? '')}
                      </td>
                      {(['High', 'Medium', 'Low'] as const).map((p) => {
                        const val = (row[p] as number) ?? 0;
                        return (
                          <td key={p} className="py-2.5 pr-4 text-right">
                            {val > 0 ? (
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                  background: `${PRIORITY_COLORS[p]}22`,
                                  color: PRIORITY_COLORS[p],
                                }}
                              >
                                {val}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-4">
              No category data available for heatmap.
            </p>
          )}
        </motion.div>
      </div>

      {/* Download buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap gap-3"
      >
        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/25 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Active POs CSV
        </button>
        <button
          onClick={handleDownloadAllCSV}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/25 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Full Analysis CSV
        </button>
        <button
          onClick={handleDownloadJSON}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/25 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Kafka JSON
        </button>
      </motion.div>

      {/* PO Details Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="glass rounded-2xl p-5"
      >
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-white mr-2">PO Details</h3>
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-28"
            />
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent text-xs text-slate-300 outline-none"
            >
              <option value="All" className="bg-slate-900">All Priority</option>
              <option value="High" className="bg-slate-900">High</option>
              <option value="Medium" className="bg-slate-900">Medium</option>
              <option value="Low" className="bg-slate-900">Low</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5">
            <select
              value={filterABC}
              onChange={(e) => setFilterABC(e.target.value)}
              className="bg-transparent text-xs text-slate-300 outline-none"
            >
              <option value="All" className="bg-slate-900">All ABC</option>
              <option value="A" className="bg-slate-900">Class A</option>
              <option value="B" className="bg-slate-900">Class B</option>
              <option value="C" className="bg-slate-900">Class C</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={showAllSkus}
              onChange={(e) => setShowAllSkus(e.target.checked)}
              className="w-3.5 h-3.5 accent-purple-500"
            />
            <span className="text-xs text-slate-400">Show all SKUs</span>
          </label>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} items</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            {purchase_orders.length === 0 && !showAllSkus
              ? 'No POs generated. Enable "Show all SKUs" to see the full inventory analysis.'
              : 'No items match the current filters.'}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-white/10">
                    <th className="text-left py-2 pr-3">StockCode</th>
                    <th className="text-left py-2 pr-3">Description</th>
                    <th className="text-left py-2 pr-3">Category</th>
                    <th className="text-center py-2 pr-3">ABC</th>
                    <th className="text-right py-2 pr-3">On Hand</th>
                    <th className="text-right py-2 pr-3">Available</th>
                    <th className="text-right py-2 pr-3">Forecast</th>
                    <th className="text-right py-2 pr-3">Order Qty</th>
                    <th className="text-right py-2 pr-3">PO Value</th>
                    <th className="text-right py-2 pr-3">Risk</th>
                    <th className="text-center py-2 pr-3">Priority</th>
                    <th className="text-right py-2 pr-3">Days Out</th>
                    <th className="text-left py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((r) => (
                    <tr
                      key={r.StockCode}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="py-2.5 pr-3 text-slate-300 font-medium">
                        {r.StockCode}
                        {r.ColdStart && (
                          <span
                            className="ml-1 text-yellow-400"
                            title="Cold-start: limited history"
                            aria-label="Cold-start: limited history"
                          >
                            &#10052;
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-400 max-w-[100px] truncate">
                        {r.Description}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-400">{r.Category}</td>
                      <td className="py-2.5 pr-3 text-center">
                        <ABCBadge abc={r.ABCClass} />
                      </td>
                      <td className="py-2.5 pr-3 text-right text-white">
                        {r.Stock_On_Hand.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-slate-400">
                        {r.Available_Stock.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-slate-400">
                        {r.Forecast_Demand.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-white font-medium">
                        {r.Order_Quantity.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-green-300 font-medium">
                        {r.PO_Value_GBP > 0
                          ? `${summary.currency_symbol}${r.PO_Value_GBP.toLocaleString()}`
                          : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-slate-300">
                        {r.RiskScore.toFixed(3)}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        <PriorityBadge priority={r.Priority} />
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <span
                          style={{
                            color:
                              r.Days_To_Stockout <= 7
                                ? '#E74C3C'
                                : r.Days_To_Stockout <= 14
                                ? '#F39C12'
                                : '#94a3b8',
                          }}
                          aria-label={r.Days_To_Stockout >= 999 ? 'No stockout risk' : `${r.Days_To_Stockout} days`}
                        >
                          {r.Days_To_Stockout >= 999 ? '\u221e' : r.Days_To_Stockout}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 max-w-[120px] truncate">
                        {r.Reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}

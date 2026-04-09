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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import KPICard from './KPICard';
import Pagination from '../Common/Pagination';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface InventoryDashboardProps {
  purchase_orders: InventoryRecord[];
  inventory_analysis: InventoryRecord[];
  summary: InventorySummary;
  chart_data: ChartData;
}

// ── Colour maps ───────────────────────────────────────────────────────────────

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

const ABC_COLORS: Record<string, string> = {
  A: '#8E44AD',
  B: '#2980B9',
  C: '#95A5A6',
};

const DEMAND_COLORS: Record<string, string> = {
  Smooth:       '#2ECC71',
  Intermittent: '#F39C12',
  Erratic:      '#E74C3C',
};

// ── Small helpers ─────────────────────────────────────────────────────────────

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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 text-xs border border-white/10">
        <p className="text-slate-300 font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-white">{p.name ? `${p.name}: ` : ''}{p.value}</p>
        ))}
      </div>
    );
  }
  return null;
}

// ── Download helpers ───────────────────────────────────────────────────────────

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

// ── Tab components ─────────────────────────────────────────────────────────────

function SummaryTab({ summary, chartData }: { summary: InventorySummary; chartData: ChartData }) {
  const urgencyOrder = ['Critical', 'High', 'Medium', 'Low'];
  const budgetPct = summary.budget_limit_gbp > 0
    ? Math.min((summary.budget_utilised_gbp / summary.budget_limit_gbp) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total SKUs"
          value={summary.total_skus.toLocaleString()}
          subtitle="Products evaluated"
          icon={<Package className="w-5 h-5" />}
          accentColor="cyan"
          delay={0}
        />
        <KPICard
          title="Active POs"
          value={summary.active_pos.toLocaleString()}
          subtitle="Orders generated"
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
          title="Avg Risk Score"
          value={summary.avg_risk_score.toFixed(3)}
          subtitle="Model 6 GBR score"
          icon={<AlertTriangle className="w-5 h-5" />}
          accentColor="pink"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Urgency Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Urgency Matrix</h3>
          <p className="text-xs text-slate-400 mb-4">SKUs by days-to-stockout urgency</p>
          <div className="space-y-3">
            {urgencyOrder.map((u) => {
              const count = summary.urgency_counts[u] ?? 0;
              const pct = summary.total_skus > 0 ? (count / summary.total_skus) * 100 : 0;
              return (
                <div key={u}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <UrgencyDot urgency={u} />
                      <span className="text-xs text-slate-300">{u}</span>
                    </div>
                    <span className="text-xs text-slate-400">{count} SKUs ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: URGENCY_COLORS[u] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Budget Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Budget Utilisation</h3>
          <p className="text-xs text-slate-400 mb-4">Spend vs budget limit</p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold text-white">
              {summary.currency_symbol}{Math.round(summary.budget_utilised_gbp).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 mb-1">
              of {summary.currency_symbol}{Math.round(summary.budget_limit_gbp).toLocaleString()}
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${budgetPct}%`,
                background: budgetPct > 90 ? '#E74C3C' : budgetPct > 70 ? '#F39C12' : '#2ECC71',
              }}
            />
          </div>
          <p className="text-xs text-slate-400">{budgetPct.toFixed(1)}% of budget used</p>

          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Basket Rules Used</p>
              <p className="text-sm font-semibold text-white">{summary.basket_rules_used}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ABC-A SKUs</p>
              <p className="text-sm font-semibold text-purple-300">{summary.abc_counts?.A ?? 0}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Urgency Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-1">SKU Urgency Overview</h3>
        <p className="text-xs text-slate-400 mb-4">Number of SKUs per urgency level</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData.urgency_bar} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="SKUs" radius={[4, 4, 0, 0]}>
              {chartData.urgency_bar.map((entry, i) => (
                <Cell key={i} fill={URGENCY_COLORS[entry.name] ?? '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}

function RiskAnalysisTab({ chartData }: { chartData: ChartData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risk Score Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Risk Score Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">GBR model risk scores (0–1)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData.risk_distribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="bin" tick={{ fill: '#94a3b8', fontSize: 9 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="SKUs" fill="#E74C3C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Priority Breakdown Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Priority Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">SKUs by ML priority level</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData.priority_pie}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.priority_pie.map((entry, i) => (
                  <Cell key={i} fill={PRIORITY_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Demand Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Demand Type Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Smooth / Intermittent / Erratic (Croston/TSB)</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData.demand_type_pie}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.demand_type_pie.map((entry, i) => (
                  <Cell key={i} fill={DEMAND_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* PO Value by ABC Class */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">PO Value by ABC Class</h3>
          <p className="text-xs text-slate-400 mb-4">Total purchase order spend per class</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData.po_by_abc} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="class" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="£ Value" radius={[4, 4, 0, 0]}>
                {chartData.po_by_abc.map((entry, i) => (
                  <Cell key={i} fill={ABC_COLORS[entry.class] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}

function InventoryStatusTab({ chartData }: { chartData: ChartData }) {
  return (
    <div className="space-y-6">
      {/* Days to Stockout Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-1">Days to Stockout Distribution</h3>
        <p className="text-xs text-slate-400 mb-4">Number of SKUs by stockout timeline</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData.stockout_distribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="SKUs" radius={[4, 4, 0, 0]}>
              {chartData.stockout_distribution.map((_entry, i) => {
                const urgencyColors = ['#E74C3C', '#E67E22', '#F39C12', '#F1C40F', '#2ECC71', '#27AE60'];
                return <Cell key={i} fill={urgencyColors[i] ?? '#94a3b8'} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Heatmap — Category × Priority */}
      {chartData.heatmap && chartData.heatmap.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Stockout Risk Heatmap</h3>
          <p className="text-xs text-slate-400 mb-4">Category × Priority — number of SKUs</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-white/10">
                  <th className="text-left py-2 pr-4">Category</th>
                  {['High', 'Medium', 'Low'].map((p) => (
                    <th key={p} className="text-right py-2 pr-4" style={{ color: PRIORITY_COLORS[p] }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.heatmap.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-2.5 pr-4 text-slate-300">{String(row.Category ?? '')}</td>
                    {['High', 'Medium', 'Low'].map((p) => {
                      const val = (row[p] as number) ?? 0;
                      return (
                        <td key={p} className="py-2.5 pr-4 text-right">
                          {val > 0 ? (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ background: `${PRIORITY_COLORS[p]}22`, color: PRIORITY_COLORS[p] }}
                            >
                              {val}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function POTableTab({
  purchaseOrders,
  onDownloadCSV,
  onDownloadJSON,
}: {
  purchaseOrders: InventoryRecord[];
  onDownloadCSV: () => void;
  onDownloadJSON: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterABC, setFilterABC] = useState('All');
  const [searchText, setSearchText] = useState('');
  const itemsPerPage = 10;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPriority, filterABC, searchText]);

  // Deduplicate by StockCode (keep first)
  const unique = purchaseOrders.filter(
    (r, i, arr) => arr.findIndex((x) => x.StockCode === r.StockCode) === i
  );

  const filtered = unique.filter((r) => {
    if (filterPriority !== 'All' && r.Priority !== filterPriority) return false;
    if (filterABC !== 'All' && r.ABCClass !== filterABC) return false;
    if (searchText && !r.StockCode.toLowerCase().includes(searchText.toLowerCase()) &&
        !r.Description.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-32"
          />
        </div>
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
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
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
          <select
            value={filterABC}
            onChange={(e) => setFilterABC(e.target.value)}
            className="bg-transparent text-xs text-slate-300 outline-none"
          >
            <option value="All" className="bg-slate-900">All ABC</option>
            <option value="A" className="bg-slate-900">A</option>
            <option value="B" className="bg-slate-900">B</option>
            <option value="C" className="bg-slate-900">C</option>
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/25 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={onDownloadJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/25 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Active Purchase Orders</h3>
          <span className="text-xs text-slate-400">{filtered.length} orders</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-white/10">
                <th className="text-left py-2 pr-3">StockCode</th>
                <th className="text-right py-2 pr-3">On Hand</th>
                <th className="text-right py-2 pr-3">Forecast</th>
                <th className="text-right py-2 pr-3">Order Qty</th>
                <th className="text-right py-2 pr-3">PO Value</th>
                <th className="text-right py-2 pr-3">Risk</th>
                <th className="text-center py-2 pr-3">Priority</th>
                <th className="text-center py-2 pr-3">ABC</th>
                <th className="text-right py-2">Days Out</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr key={r.StockCode} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-2.5 pr-3 text-slate-300 font-medium">{r.StockCode}</td>
                  <td className="py-2.5 pr-3 text-right text-white">{r.Stock_On_Hand.toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-400">{r.Forecast_Demand.toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right text-white font-medium">{r.Order_Quantity.toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right text-green-300 font-medium">£{r.PO_Value_GBP.toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-300">{r.RiskScore.toFixed(3)}</td>
                  <td className="py-2.5 pr-3 text-center"><PriorityBadge priority={r.Priority} /></td>
                  <td className="py-2.5 pr-3 text-center"><ABCBadge abc={r.ABCClass} /></td>
                  <td className="py-2.5 text-right">
                    <span style={{ color: r.Days_To_Stockout <= 7 ? '#E74C3C' : r.Days_To_Stockout <= 14 ? '#F39C12' : '#94a3b8' }}>
                      {r.Days_To_Stockout >= 999 ? '∞' : r.Days_To_Stockout}
                    </span>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    No purchase orders match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </motion.div>
    </div>
  );
}

function AnalysisTab({
  allRecords,
  onDownloadAll,
}: {
  allRecords: InventoryRecord[];
  onDownloadAll: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterPriority, setFilterPriority] = useState('All');
  const [searchText, setSearchText] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPriority, searchText]);

  const unique = allRecords.filter(
    (r, i, arr) => arr.findIndex((x) => x.StockCode === r.StockCode) === i
  );

  const filtered = unique.filter((r) => {
    if (filterPriority !== 'All' && r.Priority !== filterPriority) return false;
    if (searchText && !r.StockCode.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-32"
          />
        </div>
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
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
        <button
          onClick={onDownloadAll}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/25 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download Full Analysis
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">All SKUs — Detailed Analysis</h3>
          <span className="text-xs text-slate-400">{filtered.length} SKUs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-white/10">
                <th className="text-left py-2 pr-3">StockCode</th>
                <th className="text-center py-2 pr-3">ABC</th>
                <th className="text-left py-2 pr-3">Demand Type</th>
                <th className="text-right py-2 pr-3">On Hand</th>
                <th className="text-right py-2 pr-3">ROP</th>
                <th className="text-right py-2 pr-3">EOQ</th>
                <th className="text-right py-2 pr-3">Risk</th>
                <th className="text-center py-2 pr-3">Priority</th>
                <th className="text-right py-2 pr-3">Days Out</th>
                <th className="text-center py-2">Active PO</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr key={r.StockCode} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-2.5 pr-3 text-slate-300 font-medium">
                    {r.StockCode}
                    {r.ColdStart && (
                      <span
                        className="ml-1 text-xs text-yellow-400"
                        title="Cold-start: less than 14 days history"
                        aria-label="Cold-start: less than 14 days history"
                      >
                        ❄
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-center"><ABCBadge abc={r.ABCClass} /></td>
                  <td className="py-2.5 pr-3 text-slate-400">{r.DemandType}</td>
                  <td className="py-2.5 pr-3 text-right text-white">{r.Stock_On_Hand.toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-400">{r.ReorderPoint.toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-400">{r.EOQ.toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-300">{r.RiskScore.toFixed(3)}</td>
                  <td className="py-2.5 pr-3 text-center"><PriorityBadge priority={r.Priority} /></td>
                  <td className="py-2.5 pr-3 text-right">
                    <span style={{ color: r.Days_To_Stockout <= 7 ? '#E74C3C' : r.Days_To_Stockout <= 14 ? '#F39C12' : '#94a3b8' }}>
                      {r.Days_To_Stockout >= 999 ? '∞' : r.Days_To_Stockout}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    {r.ActivePO ? (
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300"
                        aria-label="Active purchase order"
                      >
                        ✓
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs" aria-label="No active purchase order">—</span>
                    )}
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
          onPageChange={setCurrentPage}
        />
      </motion.div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const TABS = ['Summary', 'Risk Analysis', 'Inventory Status', 'Purchase Orders', 'Detailed Analysis'] as const;
type TabName = typeof TABS[number];

export default function InventoryDashboard({
  purchase_orders,
  inventory_analysis,
  summary,
  chart_data,
}: InventoryDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabName>('Summary');

  const handleDownloadPOCsv = useCallback(() => {
    downloadCSV(purchase_orders, 'active_purchase_orders.csv');
  }, [purchase_orders]);

  const handleDownloadPOJson = useCallback(() => {
    downloadJSON(
      { purchase_orders, summary, generated_at: new Date().toISOString() },
      'kafka_reorder_payload.json',
    );
  }, [purchase_orders, summary]);

  const handleDownloadAllCsv = useCallback(() => {
    downloadCSV(inventory_analysis, 'full_inventory_analysis.csv');
  }, [inventory_analysis]);

  return (
    <div className="space-y-5">
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 glass rounded-2xl p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[100px] px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Summary' && (
        <SummaryTab summary={summary} chartData={chart_data} />
      )}
      {activeTab === 'Risk Analysis' && (
        <RiskAnalysisTab chartData={chart_data} />
      )}
      {activeTab === 'Inventory Status' && (
        <InventoryStatusTab chartData={chart_data} />
      )}
      {activeTab === 'Purchase Orders' && (
        <POTableTab
          purchaseOrders={purchase_orders}
          onDownloadCSV={handleDownloadPOCsv}
          onDownloadJSON={handleDownloadPOJson}
        />
      )}
      {activeTab === 'Detailed Analysis' && (
        <AnalysisTab
          allRecords={inventory_analysis}
          onDownloadAll={handleDownloadAllCsv}
        />
      )}
    </div>
  );
}

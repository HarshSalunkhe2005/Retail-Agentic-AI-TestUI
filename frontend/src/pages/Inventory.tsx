import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, FileDown, FileJson } from 'lucide-react';
import { useWizardStore } from '../store/wizardStore';
import { useShallow } from 'zustand/react/shallow';

import InventoryKPIs from '../components/Inventory/InventoryKPIs';
import DemandForecastChart from '../components/Inventory/DemandForecastChart';
import PriorityMatrix from '../components/Inventory/PriorityMatrix';
import RiskDistributionChart from '../components/Inventory/RiskDistributionChart';
import POTable from '../components/Inventory/POTable';
import InventoryFilters from '../components/Inventory/InventoryFilters';
import type { PORow } from '../components/Inventory/POTable';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InventoryKPIData {
  total_skus: number;
  active_pos: number;
  total_po_value: number;
  avg_risk_score: number;
  critical_items: number;
  budget_utilization: number;
}

interface Charts {
  risk_distribution: Array<{ range: string; count: number }>;
  priority_breakdown: { Critical: number; High: number; Medium: number; Low: number };
  demand_forecast_chart: Array<{ date: string; forecast: number; actual: number | null }>;
}

interface InventoryData {
  kpis: InventoryKPIData;
  po_table: PORow[];
  charts: Charts;
  currency?: string;
}

// ── Download helpers ───────────────────────────────────────────────────────────

function downloadCSV(rows: PORow[], filename = 'inventory_po_recommendations.csv') {
  const headers = ['stock_code', 'description', 'category', 'forecast_demand', 'order_quantity', 'unit_price', 'po_value', 'risk_score', 'priority', 'reason'];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = r[h as keyof PORow];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val);
      }).join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data: unknown, filename = 'inventory_po_recommendations.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { inventoryResult } = useWizardStore(
    useShallow((s) => ({ inventoryResult: s.inventoryResult }))
  );

  const [filters, setFilters] = useState({ priority: 'All', category: 'All', activeOnly: false });

  const data = inventoryResult.data as unknown as InventoryData | null;

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const filteredRows = useMemo<PORow[]>(() => {
    if (!data?.po_table) return [];
    let rows = data.po_table;
    if (filters.priority !== 'All') rows = rows.filter((r) => r.priority === filters.priority);
    if (filters.category !== 'All') rows = rows.filter((r) => r.category === filters.category);
    if (filters.activeOnly) rows = rows.filter((r) => r.priority === 'Critical' || r.priority === 'High');
    return rows;
  }, [data, filters]);

  const categories = useMemo<string[]>(() => {
    if (!data?.po_table) return [];
    return [...new Set(data.po_table.map((r) => r.category))].sort();
  }, [data]);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (inventoryResult.status === 'idle') {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-xl font-semibold text-white mb-2">Inventory Dashboard</h2>
        <p className="text-slate-400 text-sm text-center max-w-md">
          Run all 4 models (Churn, Demand, Basket, Pricing) through the Wizard to generate
          Purchase Order recommendations.
        </p>
      </div>
    );
  }

  if (inventoryResult.status === 'running') {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Running Inventory Reorder model…</p>
      </div>
    );
  }

  if (inventoryResult.status === 'error' || !data) {
    const errMsg = (inventoryResult.data as Record<string, unknown> | null)?.message as string | undefined;
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-white mb-2">Inventory Model Error</h2>
        <p className="text-slate-400 text-sm text-center max-w-md">
          {errMsg ?? 'An error occurred while generating inventory recommendations. Please re-run the Wizard.'}
        </p>
      </div>
    );
  }

  const { kpis, charts } = data;
  const currency = data.currency ?? '₹';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">📦 Inventory Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Purchase Order Optimization Results</p>
      </motion.div>

      {/* KPI Cards */}
      <InventoryKPIs kpis={kpis} currency={currency} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DemandForecastChart data={charts.demand_forecast_chart} />
        <PriorityMatrix data={charts.priority_breakdown} />
      </div>

      {/* Risk distribution — full width */}
      <RiskDistributionChart data={charts.risk_distribution} />

      {/* Download buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Download:</span>
        <button
          onClick={() => downloadCSV(data.po_table)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
        <button
          onClick={() => downloadCSV(data.po_table, 'inventory_po_recommendations.tsv')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
        >
          <FileDown className="w-3.5 h-3.5" /> Excel (CSV)
        </button>
        <button
          onClick={() => downloadJSON({ kpis, po_table: data.po_table, charts })}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
        >
          <FileJson className="w-3.5 h-3.5" /> JSON
        </button>
      </div>

      {/* Filters + Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-white">PO Recommendations</h2>
          <InventoryFilters filters={filters} categories={categories} onChange={setFilters} />
        </div>
        <POTable rows={filteredRows} pageSize={10} currency={currency} />
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Package, ShoppingBag, DollarSign, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';

interface KPIData {
  total_skus: number;
  active_pos: number;
  total_po_value: number;
  avg_risk_score: number;
  critical_items: number;
  budget_utilization: number;
}

interface Props {
  kpis: KPIData;
  currency?: string;
}

function formatCurrency(value: number, symbol: string): string {
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}K`;
  return `${symbol}${value.toFixed(0)}`;
}

export default function InventoryKPIs({ kpis, currency = '₹' }: Props) {
  const CARDS = [
    {
      key: 'total_skus' as keyof KPIData,
      label: 'Total SKUs',
      icon: Package,
      color: 'text-purple-400',
      bg: 'from-purple-500/10 to-purple-600/5',
      border: 'border-purple-500/20',
      format: (v: number) => v.toLocaleString(),
    },
    {
      key: 'active_pos' as keyof KPIData,
      label: 'Active POs',
      icon: ShoppingBag,
      color: 'text-cyan-400',
      bg: 'from-cyan-500/10 to-cyan-600/5',
      border: 'border-cyan-500/20',
      format: (v: number) => v.toLocaleString(),
    },
    {
      key: 'total_po_value' as keyof KPIData,
      label: 'Total PO Value',
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'from-emerald-500/10 to-emerald-600/5',
      border: 'border-emerald-500/20',
      format: (v: number) => formatCurrency(v, currency),
    },
    {
      key: 'avg_risk_score' as keyof KPIData,
      label: 'Avg Risk Score',
      icon: TrendingUp,
      color: 'text-orange-400',
      bg: 'from-orange-500/10 to-orange-600/5',
      border: 'border-orange-500/20',
      format: (v: number) => v.toFixed(2),
    },
    {
      key: 'critical_items' as keyof KPIData,
      label: 'Critical Items',
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'from-red-500/10 to-red-600/5',
      border: 'border-red-500/20',
      format: (v: number) => v.toLocaleString(),
    },
    {
      key: 'budget_utilization' as keyof KPIData,
      label: 'Budget Utilization',
      icon: BarChart2,
      color: 'text-yellow-400',
      bg: 'from-yellow-500/10 to-yellow-600/5',
      border: 'border-yellow-500/20',
      format: (v: number) => `${v.toFixed(1)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {CARDS.map(({ key, label, icon: Icon, color, bg, border, format }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className={`glass rounded-2xl p-4 bg-gradient-to-br ${bg} border ${border}`}
        >
          <div className="flex items-center justify-between mb-3">
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <p className="text-2xl font-bold text-white">{format(kpis[key])}</p>
          <p className="text-xs text-slate-400 mt-1">{label}</p>
        </motion.div>
      ))}
    </div>
  );
}

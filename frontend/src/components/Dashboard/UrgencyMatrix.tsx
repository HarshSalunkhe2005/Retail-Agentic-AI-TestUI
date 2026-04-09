import { motion } from 'framer-motion';
import type { InventoryItem } from '../../store/wizardStore';
import { URGENCY_COLORS } from '../../utils/chartUtils';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface UrgencyMatrixProps {
  items: InventoryItem[];
  delay?: number;
}

const urgencyIcons = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle,
};

const urgencyBg: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/30',
  high: 'bg-orange-500/10 border-orange-500/30',
  medium: 'bg-yellow-500/10 border-yellow-500/30',
  low: 'bg-green-500/10 border-green-500/30',
};

const urgencyLabel: Record<string, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

export default function UrgencyMatrix({ items, delay = 0 }: UrgencyMatrixProps) {
  const grouped = {
    critical: items.filter((i) => i.urgency === 'critical'),
    high: items.filter((i) => i.urgency === 'high'),
    medium: items.filter((i) => i.urgency === 'medium'),
    low: items.filter((i) => i.urgency === 'low'),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass rounded-2xl p-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Inventory Reorder Urgency Matrix</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {items.filter((i) => i.urgency === 'critical').length} critical · {' '}
          {items.filter((i) => i.urgency === 'high').length} high priority items
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
          const Icon = urgencyIcons[level];
          return (
            <div key={level} className={`rounded-xl p-2.5 border ${urgencyBg[level]} text-center`}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: URGENCY_COLORS[level] }} />
              <p className="text-lg font-bold text-white">{grouped[level].length}</p>
              <p className="text-xs font-semibold" style={{ color: URGENCY_COLORS[level] }}>
                {urgencyLabel[level]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Items list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items
          .sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return order[a.urgency] - order[b.urgency];
          })
          .map((item, i) => {
            const Icon = urgencyIcons[item.urgency];
            const stockPct = Math.min(100, (item.stockLevel / item.reorderPoint) * 100);
            return (
              <motion.div
                key={item.sku}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${urgencyBg[item.urgency]}`}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: URGENCY_COLORS[item.urgency] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-400 shrink-0 ml-2">{item.sku}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${stockPct}%`, background: URGENCY_COLORS[item.urgency] }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {item.daysToStockout}d left
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>
    </motion.div>
  );
}

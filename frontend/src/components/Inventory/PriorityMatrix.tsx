import { motion } from 'framer-motion';

interface PriorityBreakdown {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}

interface Props {
  data: PriorityBreakdown;
}

const PRIORITY_CONFIG = [
  { key: 'Critical' as keyof PriorityBreakdown, emoji: '🔴', color: 'border-red-500/40 bg-red-500/10', label: 'Critical', textColor: 'text-red-400' },
  { key: 'High' as keyof PriorityBreakdown, emoji: '🟠', color: 'border-orange-500/40 bg-orange-500/10', label: 'High', textColor: 'text-orange-400' },
  { key: 'Medium' as keyof PriorityBreakdown, emoji: '🟡', color: 'border-yellow-500/40 bg-yellow-500/10', label: 'Medium', textColor: 'text-yellow-400' },
  { key: 'Low' as keyof PriorityBreakdown, emoji: '🟢', color: 'border-emerald-500/40 bg-emerald-500/10', label: 'Low', textColor: 'text-emerald-400' },
];

export default function PriorityMatrix({ data }: Props) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <h3 className="text-sm font-semibold text-white mb-4">🎯 Priority Matrix</h3>
      <div className="grid grid-cols-2 gap-3">
        {PRIORITY_CONFIG.map(({ key, emoji, color, label, textColor }, i) => {
          const count = data[key] ?? 0;
          const pct = Math.round((count / total) * 100);
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-xl border p-3 ${color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{emoji}</span>
                <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
              </div>
              <p className="text-xl font-bold text-white">{count}</p>
              <p className="text-xs text-slate-500">{pct}% of SKUs</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

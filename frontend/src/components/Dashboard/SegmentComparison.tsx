import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SegmentData } from '../../store/wizardStore';
import { CHART_COLORS } from '../../utils/chartUtils';

interface SegmentComparisonProps {
  data: SegmentData[];
  delay?: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 text-xs border border-white/10">
        <p className="font-bold text-white mb-2">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}:</span>
            <span className="text-white font-bold">
              ${(p.value / 1000).toFixed(0)}K
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SegmentComparison({ data, delay = 0 }: SegmentComparisonProps) {
  const chartData = data.map((d) => ({
    segment: d.segment,
    'Old Segments': Math.round(d.oldRevenue),
    'New Segments': Math.round(d.newRevenue),
    change: ((d.newRevenue - d.oldRevenue) / d.oldRevenue) * 100,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Revenue Forecast — Segment Comparison</h3>
          <p className="text-xs text-slate-400 mt-0.5">Old segments vs new revenue-based segmentation</p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.purple }} />
            Old
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.cyan }} />
            New
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="segment"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={45}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="Old Segments" fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]} opacity={0.7} />
          <Bar dataKey="New Segments" fill={CHART_COLORS.cyan} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Change indicators */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {data.slice(0, 3).map((d) => {
          const change = ((d.newRevenue - d.oldRevenue) / d.oldRevenue) * 100;
          return (
            <div key={d.segment} className="bg-white/5 rounded-xl p-2.5">
              <p className="text-xs text-slate-400 truncate">{d.segment}</p>
              <p className={`text-sm font-bold mt-0.5 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

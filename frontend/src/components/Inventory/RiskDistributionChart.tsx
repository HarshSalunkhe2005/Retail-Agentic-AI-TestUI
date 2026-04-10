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

interface RiskBucket {
  range: string;
  count: number;
}

interface Props {
  data: RiskBucket[];
}

// Gradient from green (low risk) → red (high risk)
const BUCKET_COLORS = [
  '#22d3ee', '#34d399', '#86efac', '#fde68a',
  '#fbbf24', '#fb923c', '#f87171', '#ef4444', '#dc2626', '#b91c1c',
];

export default function RiskDistributionChart({ data }: Props) {
  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <h3 className="text-sm font-semibold text-white mb-4">📊 Risk Score Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: '#e2e8f0' }}
            itemStyle={{ color: '#94a3b8' }}
            formatter={(value) => [value, 'SKUs']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={BUCKET_COLORS[i] ?? '#a78bfa'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-2 text-center">Risk Score (0 = low, 1 = high)</p>
    </div>
  );
}

import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Users, AlertTriangle, Activity, TrendingDown } from 'lucide-react';
import KPICard from './KPICard';

interface ChurnRecord {
  customer_id: string;
  segment: string;
  churn_risk: number;
  health_score: number;
  recommendation: string;
  recency_days: number;
  frequency: number;
  monetary: number;
}

interface ChurnSummary {
  total_customers: number;
  segment_distribution: Record<string, number>;
  avg_churn_risk: number;
  high_risk_count: number;
}

interface ChurnDashboardProps {
  data: ChurnRecord[];
  summary: ChurnSummary;
}

const PIE_COLORS = ['#a855f7', '#06b6d4', '#f97316', '#22c55e', '#ec4899', '#eab308'];

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 text-xs border border-white/10">
        <p className="font-semibold text-white">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.fill }}>{payload[0].value} customers</p>
      </div>
    );
  }
  return null;
};

export default function ChurnDashboard({ data, summary }: ChurnDashboardProps) {
  const segmentPieData = Object.entries(summary.segment_distribution).map(
    ([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] })
  );

  // Risk distribution bucketed into 0-20, 20-40, 40-60, 60-80, 80-100
  const riskBuckets = [
    { range: '0-20%', count: 0, fill: '#22c55e' },
    { range: '20-40%', count: 0, fill: '#eab308' },
    { range: '40-60%', count: 0, fill: '#f97316' },
    { range: '60-80%', count: 0, fill: '#ef4444' },
    { range: '80-100%', count: 0, fill: '#dc2626' },
  ];
  data.forEach((r) => {
    const idx = Math.min(Math.floor(Math.min(r.churn_risk, 99.99) / 20), 4);
    riskBuckets[idx].count++;
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Customers"
          value={summary.total_customers.toLocaleString()}
          subtitle="In analysis"
          icon={<Users className="w-5 h-5" />}
          accentColor="cyan"
          delay={0}
        />
        <KPICard
          title="High Risk"
          value={summary.high_risk_count.toLocaleString()}
          subtitle="Churn risk > 60%"
          icon={<AlertTriangle className="w-5 h-5" />}
          accentColor="orange"
          delay={0.05}
        />
        <KPICard
          title="Avg Churn Risk"
          value={`${summary.avg_churn_risk.toFixed(1)}%`}
          subtitle="Across all customers"
          icon={<TrendingDown className="w-5 h-5" />}
          accentColor="pink"
          delay={0.1}
        />
        <KPICard
          title="Segments"
          value={String(Object.keys(summary.segment_distribution).length)}
          subtitle="RFM clusters"
          icon={<Activity className="w-5 h-5" />}
          accentColor="purple"
          delay={0.15}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Segment Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Segment Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Customers by RFM segment</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={segmentPieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {segmentPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Risk Distribution Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Churn Risk Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Customers per risk band</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskBuckets} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                formatter={(v) => [v, 'Customers']}
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {riskBuckets.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Top at-risk customers table */}
      {data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Top At-Risk Customers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-white/10">
                  <th className="text-left py-2 pr-4">Customer ID</th>
                  <th className="text-left py-2 pr-4">Segment</th>
                  <th className="text-right py-2 pr-4">Churn Risk</th>
                  <th className="text-right py-2 pr-4">Health Score</th>
                  <th className="text-left py-2">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {[...data]
                  .sort((a, b) => b.churn_risk - a.churn_risk)
                  .slice(0, 10)
                  .map((r) => (
                    <tr key={r.customer_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-2 pr-4 text-white font-mono">{r.customer_id}</td>
                      <td className="py-2 pr-4 text-slate-300">{r.segment}</td>
                      <td className="py-2 pr-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium ${
                            r.churn_risk > 60
                              ? 'bg-red-500/20 text-red-300'
                              : r.churn_risk > 30
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}
                        >
                          {r.churn_risk.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-300">{r.health_score.toFixed(1)}</td>
                      <td className="py-2 text-slate-400 max-w-xs truncate">{r.recommendation}</td>
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

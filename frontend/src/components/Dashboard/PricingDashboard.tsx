import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Tag, Target } from 'lucide-react';
import KPICard from './KPICard';
import Pagination from '../Common/Pagination';

interface PricingRecord {
  product_id: string;
  product_name: string;
  current_price: number;
  competitor_price: number;
  recommended_action: string;
  recommended_price: number;
  confidence: number;
}

interface PricingSummary {
  total_products: number;
  increase_count: number;
  decrease_count: number;
  discount_count: number;
  hold_count: number;
  avg_confidence: number;
}

interface PricingDashboardProps {
  data: PricingRecord[];
  summary: PricingSummary;
}

const ACTION_COLORS: Record<string, string> = {
  increase: '#22c55e',
  decrease: '#ef4444',
  discount: '#f97316',
  hold: '#06b6d4',
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 text-xs border border-white/10">
        <p className="font-semibold" style={{ color: payload[0].payload.fill }}>
          {payload[0].name}
        </p>
        <p className="text-white">{payload[0].value} products</p>
      </div>
    );
  }
  return null;
};

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    increase: 'bg-green-500/20 text-green-300',
    decrease: 'bg-red-500/20 text-red-300',
    discount: 'bg-orange-500/20 text-orange-300',
    hold: 'bg-cyan-500/20 text-cyan-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[action] ?? 'bg-white/10 text-slate-400'}`}>
      {action}
    </span>
  );
}

export default function PricingDashboard({ data, summary }: PricingDashboardProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  const pieData = [
    { name: 'Increase', value: summary.increase_count, fill: ACTION_COLORS.increase },
    { name: 'Decrease', value: summary.decrease_count, fill: ACTION_COLORS.decrease },
    { name: 'Hold', value: summary.hold_count, fill: ACTION_COLORS.hold },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Products"
          value={summary.total_products.toLocaleString()}
          subtitle="Analyzed"
          icon={<Tag className="w-5 h-5" />}
          accentColor="purple"
          delay={0}
        />
        <KPICard
          title="Increase"
          value={summary.increase_count.toLocaleString()}
          subtitle={`${((summary.increase_count / summary.total_products) * 100).toFixed(0)}% of products`}
          icon={<TrendingUp className="w-5 h-5" />}
          accentColor="green"
          delay={0.05}
        />
        <KPICard
          title="Decrease"
          value={summary.decrease_count.toLocaleString()}
          subtitle={`${((summary.decrease_count / summary.total_products) * 100).toFixed(0)}% of products`}
          icon={<TrendingDown className="w-5 h-5" />}
          accentColor="pink"
          delay={0.1}
        />
        <KPICard
          title="Avg Confidence"
          value={`${(summary.avg_confidence * 100).toFixed(1)}%`}
          subtitle="Model confidence"
          icon={<Target className="w-5 h-5" />}
          accentColor="cyan"
          delay={0.15}
        />
      </div>

      {/* Charts + Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Action Breakdown Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">Action Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">Recommended pricing actions</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Action summary cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Action Summary</h3>
          <div className="space-y-3">
            {(['increase', 'hold', 'decrease'] as const).map((action) => {
              const countKey = `${action}_count` as keyof PricingSummary;
              const count = summary[countKey] as number;
              const pct = summary.total_products > 0
                ? (count / summary.total_products) * 100
                : 0;
              return (
                <div key={action}>
                  <div className="flex justify-between items-center mb-1">
                    <ActionBadge action={action} />
                    <span className="text-xs text-slate-400">{count} products ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: ACTION_COLORS[action] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Pricing Recommendations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-white/10">
                  <th className="text-left py-2 pr-4">Product</th>
                  <th className="text-right py-2 pr-4">Current Price</th>
                  <th className="text-right py-2 pr-4">Competitor</th>
                  <th className="text-right py-2 pr-4">Recommended</th>
                  <th className="text-center py-2 pr-4">Action</th>
                  <th className="text-right py-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((r) => (
                  <tr key={r.product_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-2.5 pr-4 text-slate-300">{r.product_name}</td>
                    <td className="py-2.5 pr-4 text-right text-white">${r.current_price.toFixed(2)}</td>
                    <td className="py-2.5 pr-4 text-right text-slate-400">${r.competitor_price.toFixed(2)}</td>
                    <td className="py-2.5 pr-4 text-right text-white font-medium">${r.recommended_price.toFixed(2)}</td>
                    <td className="py-2.5 pr-4 text-center">
                      <ActionBadge action={r.recommended_action} />
                    </td>
                    <td className="py-2.5 text-right text-slate-400">{(r.confidence * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={data.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </motion.div>
      )}
    </div>
  );
}

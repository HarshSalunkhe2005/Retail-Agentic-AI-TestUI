import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart2 } from 'lucide-react';
import KPICard from './KPICard';

interface ForecastPoint {
  date: string;
  forecast: number;
  lower: number;
  upper: number;
  actual: number | null;
}

interface DemandSummary {
  training_periods: number;
  forecast_periods: number;
  trend: string;
  seasonality: string;
}

interface DemandDashboardProps {
  forecastData: ForecastPoint[];
  summary: DemandSummary;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'upward') return <TrendingUp className="w-5 h-5" />;
  if (trend === 'downward') return <TrendingDown className="w-5 h-5" />;
  return <Minus className="w-5 h-5" />;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 text-xs border border-white/10">
        <p className="font-semibold text-white mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
            <span>{p.name}:</span>
            <span className="font-bold">{typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DemandDashboard({ forecastData, summary }: DemandDashboardProps) {
  // Compute peak and average from actual data
  const actuals = forecastData.filter((d) => d.actual !== null).map((d) => d.actual as number);
  const peakDemand = actuals.length > 0 ? Math.max(...actuals) : 0;
  const avgDemand = actuals.length > 0 ? actuals.reduce((a, b) => a + b, 0) / actuals.length : 0;

  // Downsample for chart performance if needed
  const chartData = forecastData.length > 60
    ? forecastData.filter((_, i) => i % Math.ceil(forecastData.length / 60) === 0)
    : forecastData;

  const trendColor =
    summary.trend === 'upward' ? 'green' : summary.trend === 'downward' ? 'pink' : 'cyan';

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Trend"
          value={summary.trend.charAt(0).toUpperCase() + summary.trend.slice(1)}
          subtitle="Forecast direction"
          icon={<TrendIcon trend={summary.trend} />}
          accentColor={trendColor}
          delay={0}
        />
        <KPICard
          title="Training Periods"
          value={String(summary.training_periods)}
          subtitle="Historical data points"
          icon={<Calendar className="w-5 h-5" />}
          accentColor="purple"
          delay={0.05}
        />
        <KPICard
          title="Forecast Periods"
          value={String(summary.forecast_periods)}
          subtitle="Weeks ahead"
          icon={<BarChart2 className="w-5 h-5" />}
          accentColor="orange"
          delay={0.1}
        />
        <KPICard
          title="Peak Demand"
          value={peakDemand.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          subtitle={`Avg: ${avgDemand.toFixed(0)}`}
          icon={<TrendingUp className="w-5 h-5" />}
          accentColor="cyan"
          delay={0.15}
        />
      </div>

      {/* Forecast Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-1">Demand Forecast</h3>
        <p className="text-xs text-slate-400 mb-4">
          Actual sales vs. forecast with confidence bands · Seasonality: {summary.seasonality}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={Math.ceil(chartData.length / 8)}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
            {/* Confidence band */}
            <Area
              type="monotone"
              dataKey="upper"
              name="Upper Bound"
              stroke="#3b82f620"
              fill="#3b82f615"
              strokeWidth={1}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="lower"
              name="Lower Bound"
              stroke="#3b82f620"
              fill="#0f172a"
              strokeWidth={1}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="#06b6d4"
              fill="#06b6d420"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#a855f7"
              fill="#a855f720"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}

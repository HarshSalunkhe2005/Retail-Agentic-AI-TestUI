import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { CHART_COLORS } from '../../utils/chartUtils';

interface MetricsChartProps {
  title: string;
  subtitle?: string;
  data: Record<string, unknown>[];
  type?: 'line' | 'bar' | 'area';
  dataKeys: { key: string; color: string; name: string }[];
  xDataKey: string;
  delay?: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 text-xs border border-white/10">
        <p className="font-semibold text-white mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
            <span>{p.name}:</span>
            <span className="font-bold">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MetricsChart({
  title,
  subtitle,
  data,
  type = 'line',
  dataKeys,
  xDataKey,
  delay = 0,
}: MetricsChartProps) {
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 10, left: 0, bottom: 5 },
    };

    const axes = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey={xDataKey}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={{ stroke: '#1e293b' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
        />
      </>
    );

    if (type === 'area') {
      return (
        <AreaChart {...commonProps}>
          {axes}
          {dataKeys.map((dk) => (
            <Area
              key={dk.key}
              type="monotone"
              dataKey={dk.key}
              name={dk.name}
              stroke={dk.color}
              fill={`${dk.color}20`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
          <ReferenceLine y={0} stroke="#334155" />
        </AreaChart>
      );
    }

    if (type === 'bar') {
      return (
        <BarChart {...commonProps}>
          {axes}
          {dataKeys.map((dk) => (
            <Bar key={dk.key} dataKey={dk.key} name={dk.name} fill={dk.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        {axes}
        {dataKeys.map((dk) => (
          <Line
            key={dk.key}
            type="monotone"
            dataKey={dk.key}
            name={dk.name}
            stroke={dk.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass rounded-2xl p-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        {renderChart() as React.ReactElement}
      </ResponsiveContainer>
    </motion.div>
  );
}

export { CHART_COLORS };

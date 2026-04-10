import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DemandPoint {
  date: string;
  forecast: number;
  actual: number | null;
}

interface Props {
  data: DemandPoint[];
}

export default function DemandForecastChart({ data }: Props) {
  // Shorten date labels to MMM-YY
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: d.date ? d.date.slice(0, 7) : '',
  }));

  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <h3 className="text-sm font-semibold text-white mb-4">📈 Demand Forecast</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: '#e2e8f0' }}
            itemStyle={{ color: '#94a3b8' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={false}
            name="Actual"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#a78bfa"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            name="Forecast"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

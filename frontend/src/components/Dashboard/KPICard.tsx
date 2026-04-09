import { motion } from 'framer-motion';
import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon: ReactNode;
  accentColor?: string;
  delay?: number;
}

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  accentColor = 'purple',
  delay = 0,
}: KPICardProps) {
  const colorMap: Record<string, string> = {
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/20',
    cyan: 'from-cyan-600/20 to-cyan-600/5 border-cyan-500/20',
    orange: 'from-orange-600/20 to-orange-600/5 border-orange-500/20',
    green: 'from-green-600/20 to-green-600/5 border-green-500/20',
    pink: 'from-pink-600/20 to-pink-600/5 border-pink-500/20',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',
  };

  const iconColorMap: Record<string, string> = {
    purple: 'from-purple-600 to-purple-400',
    cyan: 'from-cyan-600 to-cyan-400',
    orange: 'from-orange-600 to-orange-400',
    green: 'from-green-600 to-green-400',
    pink: 'from-pink-600 to-pink-400',
    blue: 'from-blue-600 to-blue-400',
  };

  const gradient = colorMap[accentColor] ?? colorMap.purple;
  const iconGrad = iconColorMap[accentColor] ?? iconColorMap.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-gradient-to-br ${gradient} border rounded-2xl p-5 backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconGrad} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
      </div>

      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(trend).toFixed(1)}% vs last period</span>
        </div>
      )}
    </motion.div>
  );
}

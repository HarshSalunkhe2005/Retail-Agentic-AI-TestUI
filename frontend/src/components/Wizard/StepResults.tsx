import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import KPICard from '../Dashboard/KPICard';
import MetricsChart from '../Dashboard/MetricsChart';
import SegmentComparison from '../Dashboard/SegmentComparison';
import UrgencyMatrix from '../Dashboard/UrgencyMatrix';
import Button from '../Common/Button';
import {
  Activity,
  RotateCcw,
  TrendingUp,
  Users,
  AlertTriangle,
  DollarSign,
  ShoppingBag,
  Package,
} from 'lucide-react';
import {
  formatCurrency,
  formatNumber,
  CHART_COLORS,
} from '../../utils/chartUtils';
import { exportAsCSV, exportAsJSON } from '../../utils/csvParser';
import { SkeletonKPI, SkeletonChart } from '../Common/SkeletonCard';

type Tab = 'overview' | 'segments' | 'inventory' | 'demand' | 'pricing';

export default function StepResults() {
  const { kpiMetrics, segmentData, inventoryItems, reset } = useWizardStore(
    useShallow((s) => ({
      kpiMetrics: s.kpiMetrics,
      segmentData: s.segmentData,
      inventoryItems: s.inventoryItems,
      reset: s.reset,
    }))
  );
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showingSkeletons] = useState(false);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'segments', label: 'Segments' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'demand', label: 'Demand' },
    { id: 'pricing', label: 'Pricing' },
  ];

  const handleExportCSV = () => {
    if (segmentData.length > 0) exportAsCSV(segmentData as never, 'segment-results.csv');
  };

  const handleExportJSON = () => {
    exportAsJSON({ kpiMetrics, segmentData, inventoryItems }, 'results.json');
  };

  const handleReset = () => {
    reset();
    navigate('/wizard');
  };

  if (!kpiMetrics) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonKPI key={i} />
        ))}
        <div className="col-span-3">
          <SkeletonChart className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h2 className="text-2xl font-bold text-white">Results Dashboard</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Analysis complete — {new Date().toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportJSON}>
            Export JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw className="w-4 h-4" />}>
            New Analysis
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === t.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* KPI grid */}
          {showingSkeletons ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonKPI key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <KPICard
                title="Total Revenue"
                value={formatCurrency(kpiMetrics.totalRevenue)}
                subtitle="Forecasted period revenue"
                trend={8.4}
                icon={<DollarSign className="w-5 h-5" />}
                accentColor="purple"
                delay={0}
              />
              <KPICard
                title="Fill Rate"
                value={`${kpiMetrics.fillRate.toFixed(1)}%`}
                subtitle="Orders fulfilled on time"
                trend={2.1}
                icon={<Activity className="w-5 h-5" />}
                accentColor="green"
                delay={0.05}
              />
              <KPICard
                title="Inventory Turns"
                value={kpiMetrics.inventoryTurns.toFixed(1)}
                subtitle="Turns per year"
                trend={-0.8}
                icon={<Package className="w-5 h-5" />}
                accentColor="cyan"
                delay={0.1}
              />
              <KPICard
                title="Active Customers"
                value={formatNumber(kpiMetrics.activeCustomers)}
                subtitle="In analysis period"
                trend={12.3}
                icon={<Users className="w-5 h-5" />}
                accentColor="orange"
                delay={0.15}
              />
              <KPICard
                title="Avg Order Value"
                value={`$${kpiMetrics.avgOrderValue}`}
                subtitle="Per transaction"
                trend={5.7}
                icon={<ShoppingBag className="w-5 h-5" />}
                accentColor="pink"
                delay={0.2}
              />
              <KPICard
                title="Stockout Rate"
                value={`${kpiMetrics.stockoutRate.toFixed(1)}%`}
                subtitle="Items out of stock"
                trend={-3.2}
                icon={<AlertTriangle className="w-5 h-5" />}
                accentColor="blue"
                delay={0.25}
              />
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4">
            <MetricsChart
              title="Demand Forecast"
              subtitle="Actual vs predicted (last 12 months)"
              data={[]}
              type="area"
              xDataKey="month"
              dataKeys={[
                { key: 'actual', color: CHART_COLORS.purple, name: 'Actual' },
                { key: 'forecast', color: CHART_COLORS.cyan, name: 'Forecast' },
              ]}
              delay={0.3}
            />
            <SegmentComparison data={segmentData} delay={0.35} />
          </div>
        </motion.div>
      )}

      {activeTab === 'segments' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <SegmentComparison data={segmentData} />
          <div className="grid grid-cols-2 gap-4">
            {segmentData.map((seg, i) => (
              <motion.div
                key={seg.segment}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-sm font-semibold text-white">{seg.segment}</h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${seg.churnRisk > 60 ? 'bg-red-500/20 text-red-300' : seg.churnRisk > 30 ? 'bg-orange-500/20 text-orange-300' : 'bg-green-500/20 text-green-300'}`}
                  >
                    {seg.churnRisk}% churn risk
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Customers</p>
                    <p className="text-white font-bold text-lg">{seg.customers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Revenue Change</p>
                    <p className={`font-bold text-lg ${seg.newRevenue > seg.oldRevenue ? 'text-green-400' : 'text-red-400'}`}>
                      {seg.newRevenue > seg.oldRevenue ? '+' : ''}
                      {(((seg.newRevenue - seg.oldRevenue) / seg.oldRevenue) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${100 - seg.churnRisk}%`,
                      background: seg.churnRisk > 60 ? CHART_COLORS.red : seg.churnRisk > 30 ? CHART_COLORS.orange : CHART_COLORS.green,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'inventory' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <UrgencyMatrix items={inventoryItems} />
        </motion.div>
      )}

      {activeTab === 'demand' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <MetricsChart
            title="Demand Forecast — 12-Month View"
            subtitle="Historical actuals with forecast bands"
            data={[]}
            type="area"
            xDataKey="month"
            dataKeys={[
              { key: 'actual', color: CHART_COLORS.purple, name: 'Actual Sales' },
              { key: 'forecast', color: CHART_COLORS.cyan, name: 'Forecast' },
              { key: 'lower', color: CHART_COLORS.blue, name: 'Lower Bound' },
              { key: 'upper', color: CHART_COLORS.orange, name: 'Upper Bound' },
            ]}
          />
          <MetricsChart
            title="Sales Volume Trend"
            subtitle="Monthly comparison"
            data={[]}
            type="bar"
            xDataKey="month"
            dataKeys={[
              { key: 'actual', color: CHART_COLORS.purple, name: 'Actual' },
              { key: 'forecast', color: CHART_COLORS.cyan, name: 'Forecast' },
            ]}
          />
        </motion.div>
      )}

      {activeTab === 'pricing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <MetricsChart
            title="Current vs Optimal Pricing by Category"
            subtitle="Recommendations from pricing intelligence model"
            data={[]}
            type="bar"
            xDataKey="category"
            dataKeys={[
              { key: 'currentPrice', color: CHART_COLORS.purple, name: 'Current Price ($)' },
              { key: 'optimalPrice', color: CHART_COLORS.cyan, name: 'Optimal Price ($)' },
            ]}
          />
          <MetricsChart
            title="Revenue by Category"
            subtitle="Estimated revenue after pricing optimization"
            data={[]}
            type="bar"
            xDataKey="category"
            dataKeys={[
              { key: 'revenue', color: CHART_COLORS.orange, name: 'Revenue ($)' },
            ]}
          />
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Price Elasticity by Category</h3>
            <div className="space-y-3">
              {[].map((item: { category: string; elasticity: number }) => (
                <div key={item.category} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-24 shrink-0">{item.category}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.abs(item.elasticity) * 40)}%`,
                        background: Math.abs(item.elasticity) > 1.5 ? CHART_COLORS.red : Math.abs(item.elasticity) > 1 ? CHART_COLORS.orange : CHART_COLORS.green,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-300 w-14 text-right">
                    {item.elasticity.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex justify-between items-center"
      >
        <p className="text-xs text-slate-500">
          💡 Head to Dashboard for live metrics and deeper analysis
        </p>
        <Button
          onClick={() => navigate('/dashboard')}
          icon={<TrendingUp className="w-4 h-4" />}
        >
          Open Dashboard
        </Button>
      </motion.div>
    </div>
  );
}

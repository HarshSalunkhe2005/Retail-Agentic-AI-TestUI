import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../store/wizardStore';
import { useShallow } from 'zustand/react/shallow';
import KPICard from '../components/Dashboard/KPICard';
import MetricsChart from '../components/Dashboard/MetricsChart';
import SegmentComparison from '../components/Dashboard/SegmentComparison';
import UrgencyMatrix from '../components/Dashboard/UrgencyMatrix';
import InventoryDashboard from '../components/Dashboard/InventoryDashboard';
import type { InventoryDashboardProps } from '../components/Dashboard/InventoryDashboard';
import Button from '../components/Common/Button';
import { SkeletonKPI, SkeletonChart } from '../components/Common/SkeletonCard';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  DollarSign,
  Users,
  Package,
  ShoppingBag,
  AlertTriangle,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import {
  formatCurrency,
  formatNumber,
  CHART_COLORS,
} from '../utils/chartUtils';

export default function Dashboard() {
  const { kpiMetrics, segmentData, inventoryItems, modelResults } = useWizardStore(
    useShallow((s) => ({
      kpiMetrics: s.kpiMetrics,
      segmentData: s.segmentData,
      inventoryItems: s.inventoryItems,
      modelResults: s.modelResults,
    })),
  );
  const navigate = useNavigate();
  const [isLive] = useState(true);

  // Show Inventory Reorder Dashboard when Model 6 results are available
  const inventoryResult = modelResults?.inventory;
  const hasInventoryResults =
    inventoryResult?.status === 'done' && inventoryResult?.data != null;

  // Use wizard data if available, else show zeros/empty
  const kpi = kpiMetrics;
  const segments = segmentData;
  const inventory = inventoryItems;

  const showSkeleton = !kpi;

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-screen-xl mx-auto px-6 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            {hasInventoryResults ? (
              <>
                <h1 className="text-3xl font-black text-white">Inventory Reorder Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Real-time inventory analytics • Updated{' '}
                  {new Date().toLocaleTimeString()}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-black text-white">Live Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Real-time retail analytics • Updated{' '}
                  {new Date().toLocaleTimeString()}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!hasInventoryResults && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium glass border ${isLive ? 'border-green-500/30 text-green-400' : 'border-slate-500/30 text-slate-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                {isLive ? 'Live' : 'Paused'}
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<Wand2 className="w-4 h-4" />}
              onClick={() => navigate('/wizard')}
            >
              Run Analysis
            </Button>
            {!hasInventoryResults && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Refresh
              </Button>
            )}
          </div>
        </motion.div>

        {/* Inventory Reorder Dashboard — shown when Model 6 results are available */}
        {hasInventoryResults ? (
          <InventoryDashboard
            {...(inventoryResult!.data as InventoryDashboardProps)}
          />
        ) : (
          <>
            {/* KPI Row */}
            {showSkeleton ? (
          <div className="grid grid-cols-6 gap-4 mb-8">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonKPI key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-4 mb-8">
            <KPICard
              title="Revenue"
              value={formatCurrency(kpi.totalRevenue)}
              trend={8.4}
              icon={<DollarSign className="w-5 h-5" />}
              accentColor="purple"
              delay={0}
            />
            <KPICard
              title="Fill Rate"
              value={`${kpi.fillRate.toFixed(1)}%`}
              trend={2.1}
              icon={<Activity className="w-5 h-5" />}
              accentColor="green"
              delay={0.05}
            />
            <KPICard
              title="Inv. Turns"
              value={kpi.inventoryTurns.toFixed(1)}
              trend={-0.8}
              icon={<Package className="w-5 h-5" />}
              accentColor="cyan"
              delay={0.1}
            />
            <KPICard
              title="Customers"
              value={formatNumber(kpi.activeCustomers)}
              trend={12.3}
              icon={<Users className="w-5 h-5" />}
              accentColor="orange"
              delay={0.15}
            />
            <KPICard
              title="Average Order Value"
              value={`$${kpi.avgOrderValue}`}
              trend={5.7}
              icon={<ShoppingBag className="w-5 h-5" />}
              accentColor="pink"
              delay={0.2}
            />
            <KPICard
              title="Stockout"
              value={`${kpi.stockoutRate.toFixed(1)}%`}
              trend={-3.2}
              icon={<AlertTriangle className="w-5 h-5" />}
              accentColor="blue"
              delay={0.25}
            />
          </div>
        )}

        {/* Charts grid */}
        {showSkeleton ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonChart key={i} />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <MetricsChart
                  title="Demand Forecast"
                  subtitle="12-month historical + forecast"
                  data={[]}
                  type="area"
                  xDataKey="month"
                  dataKeys={[
                    { key: 'actual', color: CHART_COLORS.purple, name: 'Actual' },
                    { key: 'forecast', color: CHART_COLORS.cyan, name: 'Forecast' },
                  ]}
                  delay={0.3}
                />
              </div>
              <UrgencyMatrix items={inventory} delay={0.35} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SegmentComparison data={segments} delay={0.4} />
              <MetricsChart
                title="Sales Volume by Month"
                subtitle="Actual vs forecast comparison"
                data={[]}
                type="bar"
                xDataKey="month"
                dataKeys={[
                  { key: 'actual', color: CHART_COLORS.purple, name: 'Actual' },
                  { key: 'forecast', color: CHART_COLORS.cyan, name: 'Forecast' },
                ]}
                delay={0.45}
              />
            </div>
          </>
        )}

        {/* Footer note */}
        {!kpiMetrics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 glass rounded-xl p-4 border border-purple-500/20 flex items-center justify-between"
          >
            <p className="text-sm text-slate-400">
              📊 No analysis data yet — run the wizard to see your actual results
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/wizard')}
              icon={<Wand2 className="w-4 h-4" />}
            >
              Start Analysis
            </Button>
          </motion.div>
        )}
          </>
        )}
      </div>
    </div>
  );
}

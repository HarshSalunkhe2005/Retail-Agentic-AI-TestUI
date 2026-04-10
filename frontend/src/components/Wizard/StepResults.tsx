import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import Button from '../Common/Button';
import ChurnDashboard from '../Dashboard/ChurnDashboard';
import DemandDashboard from '../Dashboard/DemandDashboard';
import BasketDashboard from '../Dashboard/BasketDashboard';
import PricingDashboard from '../Dashboard/PricingDashboard';
import { RotateCcw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { exportAsJSON } from '../../utils/csvParser';
import type { ModelKey } from '../../store/wizardStore';

// ── Section header ─────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  emoji: string;
  subtitle: string;
  children: React.ReactNode;
  accentClass: string;
}

function ResultSection({ title, emoji, subtitle, children, accentClass }: SectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${accentClass} overflow-hidden`}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/3 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </button>
      {!collapsed && <div className="px-5 pb-5">{children}</div>}
    </motion.div>
  );
}

// ── Error card ─────────────────────────────────────────────────────────────────

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ── Section order ─────────────────────────────────────────────────────────────

const RESULT_ORDER: ModelKey[] = ['churn', 'demand', 'basket', 'pricing'];

const SECTION_META: Record<string, { emoji: string; title: string; subtitle: string; accentClass: string }> = {
  churn: {
    emoji: '👥',
    title: 'Customer Health & Churn',
    subtitle: 'RFM segmentation · Churn risk · Recommendations',
    accentClass: 'border-cyan-500/20 bg-cyan-500/3',
  },
  demand: {
    emoji: '📊',
    title: 'Demand Forecasting',
    subtitle: 'Prophet model · Actual vs forecast · Trend analysis',
    accentClass: 'border-orange-500/20 bg-orange-500/3',
  },
  basket: {
    emoji: '🛒',
    title: 'Market Basket Analysis',
    subtitle: 'Association rules · Product affinity analysis',
    accentClass: 'border-green-500/20 bg-green-500/3',
  },
  pricing: {
    emoji: '📈',
    title: 'Pricing Intelligence',
    subtitle: 'Price optimization · Competitor analysis',
    accentClass: 'border-purple-500/20 bg-purple-500/3',
  },
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function StepResults() {
  const { modelResults, selectedModels, reset } = useWizardStore(
    useShallow((s) => ({
      modelResults: s.modelResults,
      selectedModels: s.selectedModels,
      reset: s.reset,
    }))
  );
  const navigate = useNavigate();

  const handleExportJSON = () => {
    const exportData: Record<string, unknown> = {};
    selectedModels.forEach((m) => {
      if (modelResults[m]?.status === 'done') exportData[m] = modelResults[m].data;
    });
    exportAsJSON(exportData, 'results.json');
  };

  const handleReset = () => {
    reset();
    navigate('/wizard');
  };

  // Show results in defined order, only for models that were selected and have results
  const orderedModels = RESULT_ORDER.filter((m) => selectedModels.includes(m));

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
          <Button variant="secondary" size="sm" onClick={handleExportJSON}>
            Export JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw className="w-4 h-4" />}>
            New Analysis
          </Button>
        </div>
      </motion.div>

      {/* Model result sections in order */}
      <div className="space-y-4">
        {orderedModels.map((modelKey) => {
          const result = modelResults[modelKey];
          const meta = SECTION_META[modelKey];

          if (!result || result.status === 'idle') return null;

          if (result.status === 'error') {
            return (
              <ResultSection key={modelKey} {...meta}>
                <ErrorCard
                  message={
                    (result.data as { message?: string } | null)?.message ??
                    (result.data as { error?: string } | null)?.error ??
                    'An error occurred while running this model.'
                  }
                />
              </ResultSection>
            );
          }

          if (result.status !== 'done' || !result.data) return null;

          const apiData = result.data as Record<string, unknown>;

          if (modelKey === 'churn') {
            return (
              <ResultSection key={modelKey} {...meta}>
                <ChurnDashboard
                  data={apiData.data as Parameters<typeof ChurnDashboard>[0]['data']}
                  summary={apiData.summary as Parameters<typeof ChurnDashboard>[0]['summary']}
                />
              </ResultSection>
            );
          }

          if (modelKey === 'demand') {
            return (
              <ResultSection key={modelKey} {...meta}>
                <DemandDashboard
                  forecastData={apiData.forecast_data as Parameters<typeof DemandDashboard>[0]['forecastData']}
                  summary={apiData.summary as Parameters<typeof DemandDashboard>[0]['summary']}
                />
              </ResultSection>
            );
          }

          if (modelKey === 'basket') {
            return (
              <ResultSection key={modelKey} {...meta}>
                <BasketDashboard
                  rules={apiData.rules as Parameters<typeof BasketDashboard>[0]['rules']}
                  summary={apiData.summary as Parameters<typeof BasketDashboard>[0]['summary']}
                />
              </ResultSection>
            );
          }

          if (modelKey === 'pricing') {
            return (
              <ResultSection key={modelKey} {...meta}>
                <PricingDashboard
                  data={apiData.data as Parameters<typeof PricingDashboard>[0]['data']}
                  summary={apiData.summary as Parameters<typeof PricingDashboard>[0]['summary']}
                />
              </ResultSection>
            );
          }

          return null;
        })}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex justify-end"
      >
        <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw className="w-4 h-4" />}>
          New Analysis
        </Button>
      </motion.div>
    </div>
  );
}

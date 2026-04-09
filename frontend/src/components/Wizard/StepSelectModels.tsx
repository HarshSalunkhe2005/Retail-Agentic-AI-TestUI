import { motion } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import { useShallow } from 'zustand/react/shallow';
import type { ModelKey } from '../../store/wizardStore';
import Button from '../Common/Button';
import { TrendingUp, Users, BarChart2, ShoppingCart, Package, Check } from 'lucide-react';

interface ModelOption {
  key: ModelKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  features: string[];
  estimatedTime: string;
}

const MODELS: ModelOption[] = [
  {
    key: 'pricing',
    label: 'Pricing Intelligence',
    description: 'Dynamic pricing optimization with demand elasticity analysis',
    icon: TrendingUp,
    color: 'purple',
    features: ['Price elasticity', 'Revenue optimization', 'Competitor analysis'],
    estimatedTime: '~2s',
  },
  {
    key: 'churn',
    label: 'Customer Health & Churn',
    description: 'RFM segmentation with churn probability prediction',
    icon: Users,
    color: 'cyan',
    features: ['RFM scoring', 'Churn probability', 'Segment migration'],
    estimatedTime: '~3s',
  },
  {
    key: 'demand',
    label: 'Demand Forecasting',
    description: 'Prophet-based time series demand prediction',
    icon: BarChart2,
    color: 'orange',
    features: ['Prophet model', 'Seasonality detection', '12-month forecast'],
    estimatedTime: '~3.5s',
  },
  {
    key: 'basket',
    label: 'Market Basket Analysis',
    description: 'Association rules for cross-sell and upsell opportunities',
    icon: ShoppingCart,
    color: 'green',
    features: ['Apriori algorithm', 'Association rules', 'Cross-sell maps'],
    estimatedTime: '~2.5s',
  },
  {
    key: 'inventory',
    label: 'Inventory Reorder',
    description: 'ABC classification and reorder point optimization',
    icon: Package,
    color: 'pink',
    features: ['ABC/XYZ analysis', 'Reorder points', 'Safety stock'],
    estimatedTime: '~2s',
  },
];

const colorConfig: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  purple: {
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    text: 'text-purple-300',
    badge: 'bg-purple-500/20 text-purple-300',
  },
  cyan: {
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-300',
    badge: 'bg-cyan-500/20 text-cyan-300',
  },
  orange: {
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
    text: 'text-orange-300',
    badge: 'bg-orange-500/20 text-orange-300',
  },
  green: {
    border: 'border-green-500/40',
    bg: 'bg-green-500/10',
    text: 'text-green-300',
    badge: 'bg-green-500/20 text-green-300',
  },
  pink: {
    border: 'border-pink-500/40',
    bg: 'bg-pink-500/10',
    text: 'text-pink-300',
    badge: 'bg-pink-500/20 text-pink-300',
  },
};

export default function StepSelectModels() {
  const { selectedModels, toggleModel, nextStep, prevStep, setSelectedModels } = useWizardStore(
    useShallow((s) => ({
      selectedModels: s.selectedModels,
      toggleModel: s.toggleModel,
      nextStep: s.nextStep,
      prevStep: s.prevStep,
      setSelectedModels: s.setSelectedModels,
    }))
  );

  const toggleAll = () => {
    if (selectedModels.length === MODELS.length) {
      setSelectedModels([]);
    } else {
      setSelectedModels(MODELS.map((m) => m.key));
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Choose Models to Run</h2>
        <p className="text-slate-400">Select which AI models to execute on your data</p>
      </motion.div>

      {/* Select all toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">
          {selectedModels.length} of {MODELS.length} models selected
        </p>
        <button
          onClick={toggleAll}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          {selectedModels.length === MODELS.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Model cards */}
      <div className="space-y-3">
        {MODELS.map((model, i) => {
          const selected = selectedModels.includes(model.key);
          const cfg = colorConfig[model.color];
          const Icon = model.icon;

          return (
            <motion.div
              key={model.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => toggleModel(model.key)}
              className={`relative flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200
                ${selected ? `${cfg.border} ${cfg.bg}` : 'border-white/10 bg-white/3 hover:bg-white/5'}`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                ${selected ? `${cfg.bg} border ${cfg.border}` : 'bg-white/5 border border-white/10'}`}>
                <Icon className={`w-5 h-5 ${selected ? cfg.text : 'text-slate-400'}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`font-semibold text-sm ${selected ? 'text-white' : 'text-slate-300'}`}>
                    {model.label}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${selected ? cfg.badge : 'bg-white/5 text-slate-500'}`}>
                    {model.estimatedTime}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{model.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {model.features.map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Checkbox */}
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all
                ${selected ? `${cfg.bg} ${cfg.border}` : 'border-white/20 bg-white/5'}`}>
                {selected && <Check className={`w-3 h-3 ${cfg.text}`} />}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="secondary" onClick={prevStep}>
          ← Back
        </Button>
        <Button onClick={nextStep} disabled={selectedModels.length === 0}>
          Run {selectedModels.length} Model{selectedModels.length !== 1 ? 's' : ''} →
        </Button>
      </div>
    </div>
  );
}

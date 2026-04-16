import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import Button from '../Common/Button';
import ChurnDashboard from '../Dashboard/ChurnDashboard';
import DemandDashboard from '../Dashboard/DemandDashboard';
import BasketDashboard from '../Dashboard/BasketDashboard';
import PricingDashboard from '../Dashboard/PricingDashboard';
import { RotateCcw, AlertCircle, ChevronDown, ChevronUp, Sparkles, MessageSquare } from 'lucide-react';
import { exportAsJSON } from '../../utils/csvParser';
import type { ModelKey } from '../../store/wizardStore';
import { getAIInsights } from '../../utils/api';

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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

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
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [aiModelName, setAIModelName] = useState('mistral');
  const messageCounterRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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

  const aiPayloadBase = {
    churn_results: modelResults.churn?.status === 'done' ? modelResults.churn.data : null,
    demand_results: modelResults.demand?.status === 'done' ? modelResults.demand.data : null,
    pricing_results: modelResults.pricing?.status === 'done' ? modelResults.pricing.data : null,
    basket_results: modelResults.basket?.status === 'done' ? modelResults.basket.data : null,
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAskingAI]);

  const handleAskAI = async () => {
    const userQuestion = question.trim();
    if (!userQuestion || isAskingAI) return;
    const nextId = (suffix: string) => {
      messageCounterRef.current += 1;
      return `${Date.now()}-${messageCounterRef.current}-${suffix}`;
    };

    setAIError(null);
    setQuestion('');
    setChatHistory((prev) => [...prev, { id: nextId('user'), role: 'user', content: userQuestion }]);
    setIsAskingAI(true);

    try {
      const result = await getAIInsights({
        ...aiPayloadBase,
        user_question: userQuestion,
      });
      setAIModelName(result.model_used || 'mistral');
      setChatHistory((prev) => [
        ...prev,
        { id: nextId('assistant'), role: 'assistant', content: result.response },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch AI insights.';
      setAIError(message);
      setChatHistory((prev) => [
        ...prev,
        {
          id: nextId('assistant-error'),
          role: 'assistant',
          content: 'I could not reach the local AI service. Please try again.',
        },
      ]);
    } finally {
      setIsAskingAI(false);
    }
  };

  return (
    <div className={`mx-auto ${isAIOpen ? 'max-w-7xl' : 'max-w-5xl'}`}>
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
          <Button
            variant={isAIOpen ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIsAIOpen((v) => !v)}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {isAIOpen ? 'Hide AI Insights' : 'AI Insights'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportJSON}>
            Export JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw className="w-4 h-4" />}>
            New Analysis
          </Button>
        </div>
      </motion.div>

      <div className={isAIOpen ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]' : ''}>
        <div>
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

        {isAIOpen && (
          <motion.aside
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-purple-500/20 bg-purple-500/5 h-fit lg:sticky lg:top-6"
          >
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-300" />
              <h3 className="text-sm font-semibold text-white">AI Chat ({aiModelName} local)</h3>
            </div>

            <div className="p-4 space-y-3 h-80 overflow-y-auto" role="log" aria-label="Chat history">
              {chatHistory.length === 0 && (
                <div className="text-sm text-slate-400">
                  Ask a question about your model outputs. Example: Why should I increase prices?
                </div>
              )}

              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/15 border border-cyan-500/25 text-cyan-100'
                      : 'bg-slate-900/70 border border-white/10 text-slate-100'
                  }`}
                >
                  <p className="font-medium mb-1 text-xs uppercase tracking-wide opacity-70">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-white/10 space-y-2">
              {aiError && <p className="text-xs text-red-400">{aiError}</p>}
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a follow-up question..."
                aria-label="Ask AI a question"
                rows={3}
                className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleAskAI}
                loading={isAskingAI}
                disabled={!question.trim() || isAskingAI}
                className="w-full justify-center"
              >
                {isAskingAI ? 'Thinking...' : 'Ask AI'}
              </Button>
            </div>
          </motion.aside>
        )}
      </div>
    </div>
  );
}

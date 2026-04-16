import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import Button from '../Common/Button';
import { useAIInsights } from '../../hooks/useAIInsights';

interface AIChatProps {
  churnResults: Record<string, unknown> | null;
  demandResults: Record<string, unknown> | null;
  pricingResults: Record<string, unknown> | null;
  basketResults: Record<string, unknown> | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChat({
  churnResults,
  demandResults,
  pricingResults,
  basketResults,
}: AIChatProps) {
  const { askAI } = useAIInsights();
  const [question, setQuestion] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [aiModelName, setAIModelName] = useState('mistral');
  const messageCounterRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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
      const result = await askAI({
        churn_results: churnResults,
        demand_results: demandResults,
        pricing_results: pricingResults,
        basket_results: basketResults,
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
    } finally {
      setIsAskingAI(false);
    }
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl border border-purple-500/20 bg-purple-500/5 h-fit lg:sticky lg:top-6"
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-300" />
          <h3 className="text-sm font-semibold text-white">AI Insights Chat</h3>
        </div>
        <span className="text-[11px] text-purple-200/90">Powered by Mistral ({aiModelName})</span>
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

        {isAskingAI && (
          <div className="rounded-xl p-3 text-sm bg-slate-900/70 border border-white/10 text-slate-100">
            <p className="font-medium mb-1 text-xs uppercase tracking-wide opacity-70">AI</p>
            <p className="animate-pulse">Typing...</p>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-white/10 space-y-2">
        {aiError && <p className="text-xs text-red-400">{aiError}</p>}
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleAskAI();
            }
          }}
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
  );
}

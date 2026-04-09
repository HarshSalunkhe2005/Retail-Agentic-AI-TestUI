import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Common/Button';
import {
  BarChart2,
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  Wand2,
  LayoutDashboard,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: TrendingUp,
    title: 'Pricing Intelligence',
    desc: 'Dynamic pricing with demand elasticity analysis',
    color: 'purple',
  },
  {
    icon: Users,
    title: 'Customer Churn',
    desc: 'RFM segmentation and churn probability scoring',
    color: 'cyan',
  },
  {
    icon: BarChart2,
    title: 'Demand Forecasting',
    desc: 'Prophet-based time series prediction',
    color: 'orange',
  },
  {
    icon: ShoppingCart,
    title: 'Market Basket',
    desc: 'Association rules for cross-sell opportunities',
    color: 'green',
  },
  {
    icon: Package,
    title: 'Inventory Reorder',
    desc: 'ABC classification and safety stock optimization',
    color: 'pink',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-300', icon: 'from-purple-600 to-purple-400' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-300', icon: 'from-cyan-600 to-cyan-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-300', icon: 'from-orange-600 to-orange-400' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-300', icon: 'from-green-600 to-green-400' },
  pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-300', icon: 'from-pink-600 to-pink-400' },
};

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-8 py-24">
        {/* Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-purple-500/30 text-purple-300 text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Retail Agentic AI — Production UI
          </motion.div>

          {/* Title */}
          <h1 className="text-6xl font-black text-white mb-6 leading-tight">
            Intelligent Retail
            <br />
            <span className="gradient-text">Analytics Platform</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your retail data, run AI-powered models, and get actionable insights on pricing,
            churn, demand forecasting, basket analysis, and inventory.
          </p>

          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/wizard')}
              icon={<Wand2 className="w-5 h-5" />}
            >
              Start Analysis
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
              icon={<LayoutDashboard className="w-5 h-5" />}
            >
              View Dashboard
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-8 py-16 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-3">5 AI Models, One Platform</h2>
          <p className="text-slate-400">
            Each model solves a specific retail challenge with production-grade ML
          </p>
        </motion.div>

        <div className="grid grid-cols-5 gap-4">
          {features.map(({ icon: Icon, title, desc, color }, i) => {
            const cfg = colorMap[color];
            return (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.07 }}
                className={`glass ${cfg.bg} ${cfg.border} border rounded-2xl p-5 hover:scale-105 transition-transform duration-200`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.icon} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Workflow */}
      <section className="px-8 py-16 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="glass rounded-3xl p-8 border border-white/10"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">How It Works</h2>
          <div className="flex items-center gap-4">
            {[
              { n: '1', label: 'Upload CSV', color: 'purple' },
              { n: '2', label: 'Preview Data', color: 'cyan' },
              { n: '3', label: 'Select Models', color: 'orange' },
              { n: '4', label: 'Execute', color: 'green' },
              { n: '5', label: 'View Results', color: 'pink' },
            ].map(({ n, label, color }, i) => {
              const cfg = colorMap[color];
              return (
                <div key={n} className="flex items-center gap-4 flex-1">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.icon} flex items-center justify-center text-white font-bold text-lg`}>
                      {n}
                    </div>
                    <p className="text-xs text-slate-300 font-medium text-center">{label}</p>
                  </div>
                  {i < 4 && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-center mt-8">
            <Button onClick={() => navigate('/wizard')} icon={<Wand2 className="w-4 h-4" />}>
              Get Started
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

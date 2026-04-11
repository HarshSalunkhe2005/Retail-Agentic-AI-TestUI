import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Wand2,
  TrendingUp,
  Users,
  ShoppingCart,
  BarChart2,
  Package,
} from 'lucide-react';
import { useWizardStore } from '../../store/wizardStore';
import { useShallow } from 'zustand/react/shallow';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/wizard', icon: Wand2, label: 'Wizard' },
];

const modelItems = [
  { icon: TrendingUp, label: 'Pricing', color: 'text-purple-400' },
  { icon: Users, label: 'Churn', color: 'text-cyan-400' },
  { icon: BarChart2, label: 'Demand', color: 'text-orange-400' },
  { icon: ShoppingCart, label: 'Basket', color: 'text-green-400' },
];

export default function Sidebar() {
  const location = useLocation();
  const { inventoryReady } = useWizardStore(
    useShallow((s) => ({ inventoryReady: s.inventoryResult.status === 'done' }))
  );

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-56 glass border-r border-white/10 flex flex-col py-6 px-3 z-40">
      {/* Navigation */}
      <div className="space-y-1">
        <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Navigation
        </p>
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                  ${active
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </motion.div>
            </Link>
          );
        })}

        {/* Inventory — only shown after all 4 models complete */}
        {inventoryReady && (
          <Link to="/inventory">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ x: 2 }}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                ${location.pathname === '/inventory'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Package className="w-4 h-4 text-emerald-400" />
              Inventory
            </motion.div>
          </Link>
        )}
      </div>

      {/* Models */}
      <div className="mt-6 space-y-1">
        <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Models
        </p>
        {modelItems.map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 cursor-default transition-all"
          >
            <Icon className={`w-4 h-4 ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto px-3">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400">Retail Agentic AI</p>
          <p className="text-xs text-slate-600 mt-0.5">Team 18</p>
        </div>
      </div>
    </aside>
  );
}
